class MarkdownRenderer {
  constructor() {
    this.katexCache = new Map();
    this.md = window.markdownit({
      html: false, // safer
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        // If it's structured JSON (quiz or flashcards), hide raw JSON code block
        if (lang === 'quiz-json' || lang === 'flashcard-json' || (lang === 'json' && (str.includes('"questions"') || str.includes('"cards"')))) {
          return `<pre class="hidden-structured-data" style="display:none;"><code>${this.escapeHtml(str)}</code></pre>`;
        }

        // If code block is labeled latex, math, or tex, render directly with KaTeX if available
        if ((lang === 'latex' || lang === 'math' || lang === 'tex') && window.katex) {
          try {
            const mathHtml = window.katex.renderToString(str.trim(), {
              displayMode: true,
              throwOnError: false
            });
            return `<div class="katex-display-container">${mathHtml}</div>`;
          } catch (e) {
            // fallback to code block
          }
        }

        let highlighted = '';
        const validLang = lang && window.Prism && window.Prism.languages[lang];
        if (validLang) {
          try {
            highlighted = window.Prism.highlight(str, window.Prism.languages[lang], lang);
          } catch (e) {
            highlighted = this.escapeHtml(str);
          }
        } else {
          highlighted = this.escapeHtml(str);
        }

        const displayLang = (lang || 'code').toUpperCase();
        return `<div class="code-block-container">
          <div class="code-block-header">
            <span class="code-lang-label">${displayLang}</span>
            <button class="code-copy-btn" onclick="MarkdownRenderer.copyCode(this)">Copy</button>
          </div>
          <pre class="language-${lang || 'text'}"><code>${highlighted}</code></pre>
        </div>`;
      }
    });
  }

  render(markdownText) {
    if (!markdownText) return '';

    // 1. Clean raw and escaped <br> tags so they don't show as literal text on the screen
    let text = markdownText
      .replace(/&lt;br\s*\/?&gt;/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    // 2. Render LaTeX math formulas if KaTeX is available
    if (window.katex) {
      const mathPlaceholders = [];
      const createPlaceholder = (latex, displayMode) => {
        const trimmed = latex.trim();
        const cacheKey = `${displayMode ? 'D' : 'I'}:${trimmed}`;
        let rendered = this.katexCache.get(cacheKey);

        if (!rendered) {
          try {
            rendered = window.katex.renderToString(trimmed, {
              displayMode: displayMode,
              throwOnError: false
            });
            if (this.katexCache.size > 800) {
              const firstKey = this.katexCache.keys().next().value;
              this.katexCache.delete(firstKey);
            }
            this.katexCache.set(cacheKey, rendered);
          } catch (e) {
            rendered = `<code>${this.escapeHtml(latex)}</code>`;
          }
        }

        const id = `%%%KATEX_FORMULA_${mathPlaceholders.length}%%%`;
        mathPlaceholders.push({ id, html: rendered });
        return id;
      };

      // Block math: $$ ... $$
      text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        return createPlaceholder(formula, true);
      });

      // Block math: \[ ... \]
      text = text.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
        return createPlaceholder(formula, true);
      });

      // Inline math: \( ... \)
      text = text.replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
        return createPlaceholder(formula, false);
      });

      // Inline math: $ ... $ (excluding escaped \$ and currency like $50 or $10.99)
      text = text.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (match, prefix, formula) => {
        // Skip if formula looks like a price (e.g. 50 or 10.99)
        if (/^\d+(\.\d{1,2})?$/.test(formula.trim())) {
          return match;
        }
        return prefix + createPlaceholder(formula, false);
      });

      // Render markdown
      let html = this.md.render(text);

      // Restore KaTeX math
      for (const item of mathPlaceholders) {
        html = html.split(item.id).join(item.html);
      }

      return html;
    }

    return this.md.render(text);
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static copyCode(btn) {
    const container = btn.closest('.code-block-container');
    if (!container) return;
    const codeEl = container.querySelector('pre code');
    if (!codeEl) return;

    const text = codeEl.innerText || codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 1800);
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  }
}

window.MarkdownRenderer = MarkdownRenderer;
