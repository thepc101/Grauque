class MarkdownRenderer {
  constructor() {
    this.md = window.markdownit({
      html: false, // safer
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        // If it's quiz-json, we wrap it in a special hidden marker
        if (lang === 'quiz-json') {
          return `<pre class="hidden-quiz-data" style="display:none;"><code>${this.escapeHtml(str)}</code></pre>`;
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
    return this.md.render(markdownText);
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
