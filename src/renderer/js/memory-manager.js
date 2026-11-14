class MemoryManager {
  constructor(app) {
    this.app = app;
  }

  getMemories() {
    const settings = this.app?.settings || {};
    if (!Array.isArray(settings.memories)) {
      settings.memories = [];
    }
    return settings.memories;
  }

  isMemoryEnabled() {
    const settings = this.app?.settings || {};
    return settings.enableMemory !== false;
  }

  async setMemoryEnabled(enabled) {
    if (!this.app.settings) this.app.settings = {};
    this.app.settings.enableMemory = Boolean(enabled);
    if (window.grauqueApi && window.grauqueApi.saveSettings) {
      await window.grauqueApi.saveSettings(this.app.settings);
    }
    this.updateMemoryBadge();
  }

  async addMemory(text, category = 'general') {
    if (!text || !text.trim()) return null;
    const cleanText = text.trim().replace(/^[-*•\s]+/, '');

    const memories = this.getMemories();
    // Check for duplicate
    const exists = memories.some(m => m.text.toLowerCase() === cleanText.toLowerCase());
    if (exists) return null;

    const newMem = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: cleanText,
      category: category || 'general',
      createdAt: Date.now()
    };

    memories.unshift(newMem);
    this.app.settings.memories = memories;

    if (window.grauqueApi && window.grauqueApi.saveSettings) {
      await window.grauqueApi.saveSettings(this.app.settings);
    }

    this.updateMemoryBadge();
    this.showToast(`🧠 Saved to memory: "${cleanText}"`);
    return newMem;
  }

  async removeMemory(id) {
    let memories = this.getMemories();
    memories = memories.filter(m => m.id !== id);
    this.app.settings.memories = memories;

    if (window.grauqueApi && window.grauqueApi.saveSettings) {
      await window.grauqueApi.saveSettings(this.app.settings);
    }

    this.updateMemoryBadge();
  }

  async clearAllMemories() {
    this.app.settings.memories = [];
    if (window.grauqueApi && window.grauqueApi.saveSettings) {
      await window.grauqueApi.saveSettings(this.app.settings);
    }
    this.updateMemoryBadge();
    this.showToast('Cleared all persistent memories.');
  }

  /**
   * Intelligently detects if user prompt expresses a personal fact to remember
   * Examples:
   * "Remember that my major is computer science"
   * "Don't forget that I prefer short bullet answers"
   * "Note that I am studying for the MCAT"
   * "Keep in mind that my name is Alex"
   */
  detectAndSaveFromPrompt(prompt) {
    if (!prompt || !this.isMemoryEnabled()) return null;
    const text = prompt.trim();

    // Regex for explicit memory commands
    const patterns = [
      /^(?:please\s+)?remember\s+(?:that\s+)?(.+)$/i,
      /^(?:please\s+)?don'?t\s+forget\s+(?:that\s+)?(.+)$/i,
      /^(?:please\s+)?keep\s+in\s+mind\s+(?:that\s+)?(.+)$/i,
      /^(?:please\s+)?note\s+that\s+(?:I\s+|my\s+|we\s+)?(.+)$/i,
      /^(?:by\s+the\s+way,\s+)?my\s+name\s+is\s+([A-Za-z\s]+)$/i,
      /^(?:I\s+am|I'm)\s+taking\s+([A-Za-z0-9\s,]+(?:class|course|exam|finals|prep)?)$/i,
      /^(?:I\s+am|I'm)\s+a\s+([A-Za-z\s]+(?:student|major|developer|engineer|researcher))$/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Clean up punctuation at end
        extracted = extracted.replace(/[.!?]+$/, '');

        // Format into a natural 3rd/1st person memory note
        if (/^my name is/i.test(text) || pattern.source.includes('my\\s+name')) {
          extracted = `User's name is ${extracted}`;
        } else if (/^I am taking/i.test(text) || /^I'm taking/i.test(text)) {
          extracted = `Currently taking ${extracted}`;
        } else if (/^I am a/i.test(text) || /^I'm a/i.test(text)) {
          extracted = `User is a ${extracted}`;
        } else {
          // Normalize "I " or "my " in remember statements
          extracted = extracted.replace(/\bmy\b/gi, 'user\'s').replace(/\bI\b/g, 'User');
        }

        if (extracted.length >= 4 && extracted.length <= 250) {
          this.addMemory(extracted);
          return extracted;
        }
      }
    }
    return null;
  }

  updateMemoryBadge() {
    const badge = document.getElementById('memory-badge-count');
    const memories = this.getMemories();
    if (badge) {
      if (memories.length > 0) {
        badge.textContent = `Memory (${memories.length})`;
      } else {
        badge.textContent = 'Memory';
      }
    }
  }

  renderMemoryList(container) {
    if (!container) return;
    const memories = this.getMemories();
    container.innerHTML = '';

    if (memories.length === 0) {
      container.innerHTML = `
        <div class="memory-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted); margin-bottom:8px;">
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
            <line x1="9" y1="21" x2="15" y2="21"></line>
          </svg>
          <div style="font-size:13.5px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">No Memories Saved Yet</div>
          <div style="font-size:12px; color:var(--text-muted); max-width:320px; line-height:1.4;">
            Grauque will automatically remember facts and preferences as you chat (e.g. "Remember that I'm taking Organic Chemistry"), or you can add them manually above.
          </div>
        </div>
      `;
      return;
    }

    memories.forEach(mem => {
      const item = document.createElement('div');
      item.className = 'memory-item-row';
      item.innerHTML = `
        <div class="memory-item-content">
          <span class="memory-item-icon">🧠</span>
          <span class="memory-item-text">${this.escapeHtml(mem.text)}</span>
        </div>
        <button class="memory-delete-btn" data-id="${mem.id}" title="Forget this memory">&times;</button>
      `;

      item.querySelector('.memory-delete-btn').addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await this.removeMemory(id);
        this.renderMemoryList(container);
      });

      container.appendChild(item);
    });
  }

  showToast(message) {
    let toast = document.getElementById('grauque-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'grauque-toast';
      toast.className = 'grauque-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.MemoryManager = MemoryManager;
