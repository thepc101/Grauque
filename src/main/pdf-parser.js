const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const zlib = require('zlib');

class PdfParserService {
  constructor() {
    this.binaryPath = this.resolveBinaryPath();
  }

  resolveBinaryPath() {
    // 1. Packaged app: process.resourcesPath/bin/pdf-extract
    if (process.resourcesPath) {
      const prodPath = path.join(process.resourcesPath, 'bin', 'pdf-extract');
      if (fs.existsSync(prodPath)) return prodPath;
    }
    // 2. Dev mode: <project-root>/bin/pdf-extract
    const devPath = path.join(__dirname, '..', '..', 'bin', 'pdf-extract');
    if (fs.existsSync(devPath)) return devPath;

    // 3. Fallback search
    const localPath = path.join(__dirname, 'native', 'pdf-extract');
    if (fs.existsSync(localPath)) return localPath;

    return null;
  }

  /**
   * Parse PDF from file path or buffer
   * @param {Object} options
   * @param {string} [options.filePath] - Absolute path to PDF
   * @param {Buffer|ArrayBuffer|string} [options.fileData] - Binary buffer or base64 string
   * @param {number} [options.maxPages=50] - Maximum pages to extract
   * @returns {Promise<Object>}
   */
  async extractText({ filePath, fileData, maxPages = 50 }) {
    let tempPath = null;
    let targetPath = filePath;

    try {
      if (!targetPath && fileData) {
        // Write buffer to temporary file
        let buf;
        if (Buffer.isBuffer(fileData)) {
          buf = fileData;
        } else if (typeof fileData === 'string') {
          // Check if base64 data url
          const match = fileData.match(/^data:application\/pdf;base64,(.+)$/);
          buf = Buffer.from(match ? match[1] : fileData, 'base64');
        } else if (fileData instanceof ArrayBuffer) {
          buf = Buffer.from(fileData);
        }

        if (buf) {
          tempPath = path.join(os.tmpdir(), `grauque_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`);
          fs.writeFileSync(tempPath, buf);
          targetPath = tempPath;
        }
      }

      if (!targetPath || !fs.existsSync(targetPath)) {
        throw new Error('PDF file not found or data is invalid.');
      }

      // Try native PDFKit extractor first
      const bin = this.resolveBinaryPath();
      if (bin && fs.existsSync(bin)) {
        try {
          const result = await this.runNativeExtract(bin, targetPath, maxPages);
          if (result && result.success) {
            return this.formatResult(result, path.basename(filePath || 'Document.pdf'));
          }
        } catch (nativeErr) {
          console.warn('[PdfParserService] Native extractor failed, using JS fallback:', nativeErr.message);
        }
      }

      // Fallback: Pure Node.js PDF stream extractor
      return await this.extractWithNodeFallback(targetPath, maxPages);
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    }
  }

  runNativeExtract(binaryPath, filePath, maxPages) {
    return new Promise((resolve, reject) => {
      execFile(binaryPath, [filePath, String(maxPages || 50)], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message));
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Failed to parse pdf-extract output: ${parseErr.message}`));
        }
      });
    });
  }

  extractWithNodeFallback(filePath, maxPages = 50) {
    return new Promise((resolve) => {
      try {
        const buffer = fs.readFileSync(filePath);
        const textChunks = [];
        
        // Scan for streams in the PDF
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let match;
        let pagesFound = 0;

        while ((match = streamRegex.exec(buffer.toString('binary'))) !== null) {
          let streamData = match[1];
          let decoded = '';

          // Attempt FlateDecode decompression
          try {
            const rawBytes = Buffer.from(streamData, 'binary');
            const unzipped = zlib.inflateSync(rawBytes);
            decoded = unzipped.toString('utf8');
          } catch (e) {
            // Not compressed or invalid zlib
            decoded = streamData;
          }

          // Extract text literals from Tj and TJ operators
          const extractedPageText = [];
          
          // Pattern for (Text) Tj
          const tjRegex = /\(([^)]+)\)\s*Tj/g;
          let tjMatch;
          while ((tjMatch = tjRegex.exec(decoded)) !== null) {
            extractedPageText.push(tjMatch[1]);
          }

          // Pattern for [(T) 10 (ext)] TJ
          const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
          let arrayMatch;
          while ((arrayMatch = tjArrayRegex.exec(decoded)) !== null) {
            const inner = arrayMatch[1];
            const innerMatches = inner.match(/\(([^)]+)\)/g);
            if (innerMatches) {
              const joined = innerMatches.map(s => s.slice(1, -1)).join('');
              extractedPageText.push(joined);
            }
          }

          if (extractedPageText.length > 0) {
            pagesFound++;
            textChunks.push({
              page: pagesFound,
              text: extractedPageText.join(' ')
            });
            if (pagesFound >= maxPages) break;
          }
        }

        const fullText = textChunks.map(c => `--- PAGE ${c.page} ---\n${c.text}`).join('\n\n');
        resolve({
          success: true,
          title: path.basename(filePath),
          totalPages: pagesFound,
          processedPages: pagesFound,
          characterCount: fullText.length,
          text: fullText,
          pages: textChunks,
          isFallback: true
        });
      } catch (err) {
        resolve({
          success: false,
          error: `JS PDF fallback failed: ${err.message}`,
          text: '',
          pages: []
        });
      }
    });
  }

  formatResult(rawResult, defaultTitle) {
    const totalPages = rawResult.totalPages || 0;
    const processedPages = rawResult.processedPages || totalPages;
    const rawText = rawResult.text || '';

    // Smart token and length preservation
    // Groq models have fast OTPM limits; limit to ~24,000 characters (~6,000 words / tokens)
    // to prevent OTPM errors while giving abundant context for the LLM
    const MAX_SAFE_CHARS = 28000;
    let safeText = rawText;
    let isTruncated = false;

    if (rawText.length > MAX_SAFE_CHARS) {
      safeText = rawText.slice(0, MAX_SAFE_CHARS) + `\n\n[... Note: PDF content truncated after ${MAX_SAFE_CHARS} characters to stay within Groq fast-inference context limits ...]`;
      isTruncated = true;
    }

    const wordCount = safeText.split(/\s+/).filter(Boolean).length;

    return {
      success: true,
      title: rawResult.title || defaultTitle,
      author: rawResult.author || '',
      totalPages,
      processedPages,
      wordCount,
      characterCount: rawResult.characterCount || rawText.length,
      isTruncated,
      text: safeText,
      pages: rawResult.pages || []
    };
  }
}

module.exports = new PdfParserService();
