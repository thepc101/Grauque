class GrauqueApp {
  constructor() {
    this.conversations = [];
    this.activeConversationId = null;
    this.settings = {};
    this.isGenerating = false;

    this.mdRenderer = new MarkdownRenderer();
    this.quizManager = new QuizManager(this);
    this.groqClient = new GroqClient(() => this.settings);

    this.initElements();
    this.bindEvents();
    this.init();
  }

  initElements() {
    // Sidebar
    this.sidebar = document.getElementById('sidebar');
    this.btnCollapseSidebar = document.getElementById('btn-collapse-sidebar');
    this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    this.btnNewChat = document.getElementById('btn-new-chat');
    this.btnOpenQuizStudio = document.getElementById('btn-open-quiz-studio');
    this.chatHistoryList = document.getElementById('chat-history-list');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.sidebarApiDot = document.getElementById('sidebar-api-dot');

    // Main
    this.chatTitleDisplay = document.getElementById('chat-title-display');
    this.topModelSelect = document.getElementById('top-model-select');
    this.btnExportChat = document.getElementById('btn-export-chat');
    this.messagesContainer = document.getElementById('messages-container');
    this.welcomeScreen = document.getElementById('welcome-screen');

    // Input
    this.chatInput = document.getElementById('chat-input');
    this.btnQuickQuiz = document.getElementById('btn-quick-quiz');
    this.btnSend = document.getElementById('btn-send');
    this.btnStop = document.getElementById('btn-stop');
    this.liveSpeedLabel = document.getElementById('live-speed-label');

    // Settings Modal
    this.settingsModal = document.getElementById('settings-modal');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnCancelSettings = document.getElementById('btn-cancel-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.settingApiKey = document.getElementById('setting-api-key');
    this.btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
    this.btnTestGroqKey = document.getElementById('btn-test-groq-key');
    this.apiTestBadge = document.getElementById('api-test-badge');
    this.settingDefaultModel = document.getElementById('setting-default-model');
    this.settingTemperature = document.getElementById('setting-temperature');
    this.labelTempVal = document.getElementById('label-temp-val');
    this.settingMaxTokens = document.getElementById('setting-max-tokens');
    this.labelTokensVal = document.getElementById('label-tokens-val');
    this.settingSystemPrompt = document.getElementById('setting-system-prompt');
    this.settingEnableDoubleOpt = document.getElementById('setting-enable-double-opt');
    this.settingEnableOptSpace = document.getElementById('setting-enable-opt-space');
    this.btnRequestAx = document.getElementById('btn-request-ax');
    this.axStatusDesc = document.getElementById('ax-status-desc');
    this.settingTheme = document.getElementById('setting-theme');

    // Quiz Studio Modal
    this.quizStudioModal = document.getElementById('quiz-studio-modal');
    this.btnCloseQuizStudio = document.getElementById('btn-close-quiz-studio');
    this.btnCancelQuiz = document.getElementById('btn-cancel-quiz');
    this.btnGenerateQuiz = document.getElementById('btn-generate-quiz');
    this.quizTopic = document.getElementById('quiz-topic');
    this.quizDifficulty = document.getElementById('quiz-difficulty');
    this.quizCount = document.getElementById('quiz-count');
  }

  async init() {
    await this.loadSettings();
    this.loadConversations();

    // Listen for prompt submitted from the double-tap Option quick-box!
    if (window.grauqueApi && window.grauqueApi.onPromptFromQuickBox) {
      window.grauqueApi.onPromptFromQuickBox(({ prompt }) => {
        if (prompt && prompt.trim()) {
          this.handleQuickBoxPrompt(prompt.trim());
        }
      });
    }

    // Check accessibility status
    this.refreshAccessibilityStatus();
  }

  async loadSettings() {
    if (window.grauqueApi) {
      this.settings = await window.grauqueApi.getSettings();
    } else {
      this.settings = {
        apiKey: '',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        maxTokens: 4096,
        theme: 'system'
      };
    }
    this.applySettingsToUI();
  }

  applySettingsToUI() {
    // Theme
    const theme = this.settings.theme || 'system';
    document.documentElement.setAttribute('data-theme', theme);

    // API Key status indicator
    const hasKey = Boolean(this.settings.apiKey && this.settings.apiKey.trim());
    if (this.sidebarApiDot) {
      if (hasKey) {
        this.sidebarApiDot.classList.add('connected');
        this.sidebarApiDot.title = 'Groq API Key Configured';
      } else {
        this.sidebarApiDot.classList.remove('connected');
        this.sidebarApiDot.title = 'Groq API Key Missing - Click Settings to add';
      }
    }

    // Top Model Select
    if (this.topModelSelect && this.settings.model) {
      this.topModelSelect.value = this.settings.model;
    }
  }

  bindEvents() {
    // Sidebar Collapse
    this.btnCollapseSidebar?.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
    });
    this.btnToggleSidebar?.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
    });

    // New Chat
    this.btnNewChat?.addEventListener('click', () => {
      this.createNewConversation();
    });

    // Top Model Select change
    this.topModelSelect?.addEventListener('change', (e) => {
      this.settings.model = e.target.value;
      if (window.grauqueApi) {
        window.grauqueApi.saveSettings(this.settings);
      }
    });

    // Input auto-expand & send
    this.chatInput?.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 200) + 'px';
    });

    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.btnSend?.addEventListener('click', () => this.handleSend());
    this.btnStop?.addEventListener('click', () => this.handleStop());

    // Suggestion cards
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          this.chatInput.value = prompt;
          this.handleSend();
        }
      });
    });

    // Quick Quiz button in input toolbar
    this.btnQuickQuiz?.addEventListener('click', () => {
      this.openQuizStudio();
    });

    // Quiz Studio Modal
    this.btnOpenQuizStudio?.addEventListener('click', () => this.openQuizStudio());
    this.btnCloseQuizStudio?.addEventListener('click', () => this.closeQuizStudio());
    this.btnCancelQuiz?.addEventListener('click', () => this.closeQuizStudio());
    this.btnGenerateQuiz?.addEventListener('click', () => this.handleGenerateQuiz());

    // Settings Modal
    this.btnOpenSettings?.addEventListener('click', () => this.openSettings());
    this.btnCloseSettings?.addEventListener('click', () => this.closeSettings());
    this.btnCancelSettings?.addEventListener('click', () => this.closeSettings());
    this.btnSaveSettings?.addEventListener('click', () => this.handleSaveSettings());

    this.btnToggleKeyVisibility?.addEventListener('click', () => {
      const type = this.settingApiKey.getAttribute('type');
      if (type === 'password') {
        this.settingApiKey.setAttribute('type', 'text');
        this.btnToggleKeyVisibility.textContent = 'Hide';
      } else {
        this.settingApiKey.setAttribute('type', 'password');
        this.btnToggleKeyVisibility.textContent = 'Show';
      }
    });

    this.btnTestGroqKey?.addEventListener('click', () => this.handleTestKey());

    this.settingTemperature?.addEventListener('input', (e) => {
      this.labelTempVal.textContent = e.target.value;
    });

    this.settingMaxTokens?.addEventListener('input', (e) => {
      this.labelTokensVal.textContent = e.target.value;
    });

    this.btnRequestAx?.addEventListener('click', async () => {
      if (window.grauqueApi) {
        await window.grauqueApi.openAccessibilitySettings();
      }
    });

    // Export Chat
    this.btnExportChat?.addEventListener('click', () => this.exportCurrentChat());

    // Global Key shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.createNewConversation();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        this.sidebar.classList.toggle('collapsed');
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        this.openSettings();
      }
    });
  }

  async refreshAccessibilityStatus() {
    if (window.grauqueApi && window.grauqueApi.checkAccessibility) {
      const trusted = await window.grauqueApi.checkAccessibility(false);
      if (this.axStatusDesc) {
        if (trusted) {
          this.axStatusDesc.innerHTML = '<span style="color:#10b981; font-weight:600;">✓ Granted</span> — Double-tap Option is active everywhere.';
        } else {
          this.axStatusDesc.innerHTML = '<span style="color:#f59e0b; font-weight:600;">Not enabled</span> — Grant access in Privacy Settings for global double Option.';
        }
      }
    }
  }

  // Conversation Management
  loadConversations() {
    try {
      const saved = localStorage.getItem('grauque_conversations');
      if (saved) {
        this.conversations = JSON.parse(saved);
      }
    } catch (e) {
      this.conversations = [];
    }

    if (!Array.isArray(this.conversations)) {
      this.conversations = [];
    }

    if (this.conversations.length > 0) {
      this.setActiveConversation(this.conversations[0].id);
    } else {
      this.createNewConversation();
    }

    this.renderHistoryList();
  }

  saveConversations() {
    try {
      localStorage.setItem('grauque_conversations', JSON.stringify(this.conversations));
    } catch (e) {
      console.warn('Failed to save conversations:', e);
    }
  }

  createNewConversation() {
    const newChat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.conversations.unshift(newChat);
    this.saveConversations();
    this.setActiveConversation(newChat.id);
    this.renderHistoryList();
    this.chatInput?.focus();
  }

  setActiveConversation(id) {
    this.activeConversationId = id;
    const chat = this.conversations.find(c => c.id === id);
    if (!chat) return;

    this.chatTitleDisplay.textContent = chat.title || 'New Conversation';
    this.renderMessages(chat.messages);
    this.renderHistoryList();
  }

  deleteConversation(id, event) {
    if (event) event.stopPropagation();
    this.conversations = this.conversations.filter(c => c.id !== id);
    this.saveConversations();
    if (this.activeConversationId === id) {
      if (this.conversations.length > 0) {
        this.setActiveConversation(this.conversations[0].id);
      } else {
        this.createNewConversation();
      }
    } else {
      this.renderHistoryList();
    }
  }

  renderHistoryList() {
    if (!this.chatHistoryList) return;
    this.chatHistoryList.innerHTML = '<div class="history-section-title">Conversations</div>';

    this.conversations.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'history-item' + (chat.id === this.activeConversationId ? ' active' : '');
      item.innerHTML = `
        <span class="history-title" title="${this.escapeHtml(chat.title)}">${this.escapeHtml(chat.title)}</span>
        <div class="history-actions">
          <button class="history-action-btn delete-btn" title="Delete conversation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      item.addEventListener('click', () => {
        this.setActiveConversation(chat.id);
      });

      const delBtn = item.querySelector('.delete-btn');
      delBtn.addEventListener('click', (e) => this.deleteConversation(chat.id, e));

      this.chatHistoryList.appendChild(item);
    });
  }

  renderMessages(messages) {
    this.messagesContainer.innerHTML = '';
    if (!messages || messages.length === 0) {
      this.messagesContainer.appendChild(this.welcomeScreen);
      this.welcomeScreen.style.display = 'flex';
      return;
    }

    this.welcomeScreen.style.display = 'none';

    messages.forEach((msg, idx) => {
      this.appendMessageElement(msg, idx);
    });

    this.scrollToBottom();
  }

  appendMessageElement(msg, idx) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = `msg-${idx}`;

    if (msg.role === 'user') {
      row.innerHTML = `<div class="user-bubble">${this.escapeHtml(msg.content)}</div>`;
    } else {
      const formattedContent = this.mdRenderer.render(msg.content);
      const metricsHtml = msg.metrics
        ? `<span class="meta-speed-badge">⚡ ${msg.metrics.tokensPerSec || 0} t/s • ${msg.metrics.elapsedSec || 0}s</span>`
        : '';

      row.innerHTML = `
        <div class="assistant-container">
          <div class="assistant-avatar">G</div>
          <div class="assistant-content-wrapper">
            <div class="assistant-meta">
              <span class="meta-brand">Grauque</span>
              <span>${msg.model || this.settings.model || 'Groq'}</span>
              ${metricsHtml}
            </div>
            <div class="assistant-body" id="body-${idx}">${formattedContent}</div>
          </div>
        </div>
      `;

      // Check if there is structured quiz data to render an interactive quiz
      const quizData = this.quizManager.extractQuizData(msg.content);
      if (quizData) {
        const bodyEl = row.querySelector(`#body-${idx}`);
        const interactiveQuiz = this.quizManager.renderInteractiveQuiz(quizData, `quiz-widget-${idx}`);
        bodyEl.appendChild(interactiveQuiz);
      }
    }

    this.messagesContainer.appendChild(row);
  }

  // Handle Quick Box Input from Option double-tap popup
  handleQuickBoxPrompt(prompt) {
    let activeChat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!activeChat || (activeChat.messages && activeChat.messages.length > 0)) {
      // Start fresh chat if current has content
      this.createNewConversation();
      activeChat = this.conversations.find(c => c.id === this.activeConversationId);
    }

    this.chatInput.value = prompt;
    this.handleSend();
  }

  // Send Message Logic
  async handleSend() {
    const text = this.chatInput.value.trim();
    if (!text || this.isGenerating) return;

    const apiKey = (this.settings.apiKey || '').trim();
    if (!apiKey) {
      this.openSettings();
      alert('Please enter your Groq API key in Settings to begin using Grauque.');
      return;
    }

    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';

    let chat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!chat) {
      this.createNewConversation();
      chat = this.conversations.find(c => c.id === this.activeConversationId);
    }

    // Auto-title conversation on first message
    if (chat.messages.length === 0) {
      chat.title = text.length > 36 ? text.substring(0, 36) + '...' : text;
      this.chatTitleDisplay.textContent = chat.title;
      this.renderHistoryList();
    }

    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    chat.messages.push(userMsg);
    this.welcomeScreen.style.display = 'none';
    this.appendMessageElement(userMsg, chat.messages.length - 1);
    this.scrollToBottom();

    // Prepare assistant message
    const assistantIndex = chat.messages.length;
    const assistantMsg = {
      role: 'assistant',
      content: '',
      model: this.settings.model || 'llama-3.3-70b-versatile',
      timestamp: Date.now()
    };
    chat.messages.push(assistantMsg);

    // Render assistant placeholder
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = `msg-${assistantIndex}`;
    row.innerHTML = `
      <div class="assistant-container">
        <div class="assistant-avatar">G</div>
        <div class="assistant-content-wrapper">
          <div class="assistant-meta">
            <span class="meta-brand">Grauque</span>
            <span>${assistantMsg.model}</span>
            <span class="meta-speed-badge" id="speed-badge-${assistantIndex}">Streaming...</span>
          </div>
          <div class="assistant-body" id="body-${assistantIndex}">
            <span class="typing-cursor">▊</span>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    this.scrollToBottom();

    this.setGenerating(true);

    const bodyEl = document.getElementById(`body-${assistantIndex}`);
    const speedBadgeEl = document.getElementById(`speed-badge-${assistantIndex}`);

    await this.groqClient.streamChat({
      messages: chat.messages.slice(0, -1),
      onChunk: (chunk, fullText) => {
        assistantMsg.content = fullText;
        bodyEl.innerHTML = this.mdRenderer.render(fullText) + '<span class="typing-cursor">▊</span>';
        this.scrollToBottom();
      },
      onMetrics: (metrics) => {
        if (speedBadgeEl) {
          speedBadgeEl.textContent = `⚡ ${metrics.tokensPerSec} t/s • ${metrics.elapsedSec}s`;
        }
        if (this.liveSpeedLabel) {
          this.liveSpeedLabel.textContent = `${metrics.tokensPerSec} tokens/s`;
        }
      },
      onDone: (fullText, finalMetrics) => {
        assistantMsg.content = fullText;
        assistantMsg.metrics = finalMetrics;
        bodyEl.innerHTML = this.mdRenderer.render(fullText);

        // Render interactive quiz if structured quiz detected!
        const quizData = this.quizManager.extractQuizData(fullText);
        if (quizData) {
          const interactiveQuiz = this.quizManager.renderInteractiveQuiz(quizData, `quiz-widget-${assistantIndex}`);
          bodyEl.appendChild(interactiveQuiz);
        }

        if (speedBadgeEl) {
          speedBadgeEl.textContent = `⚡ ${finalMetrics.tokensPerSec} t/s • ${finalMetrics.elapsedSec}s`;
        }

        this.setGenerating(false);
        this.saveConversations();
        this.scrollToBottom();
      },
      onError: (err) => {
        bodyEl.innerHTML = `<div style="color:#ef4444; background:rgba(239,68,68,0.1); padding:10px 14px; border-radius:8px;">
          <strong>Error:</strong> ${this.escapeHtml(err.message)}
        </div>`;
        this.setGenerating(false);
        this.saveConversations();
      }
    });
  }

  handleStop() {
    this.groqClient.cancelActiveRequest();
    this.setGenerating(false);
  }

  setGenerating(isGen) {
    this.isGenerating = isGen;
    if (this.btnSend && this.btnStop) {
      if (isGen) {
        this.btnSend.style.display = 'none';
        this.btnStop.style.display = 'flex';
      } else {
        this.btnSend.style.display = 'flex';
        this.btnStop.style.display = 'none';
        if (this.liveSpeedLabel) this.liveSpeedLabel.textContent = '';
      }
    }
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  // Quiz Studio Modal Handlers
  openQuizStudio() {
    this.quizStudioModal.classList.add('open');
    this.quizTopic.focus();
  }

  closeQuizStudio() {
    this.quizStudioModal.classList.remove('open');
  }

  handleGenerateQuiz() {
    const topic = this.quizTopic.value.trim();
    if (!topic) {
      alert('Please enter a quiz topic.');
      return;
    }

    const count = parseInt(this.quizCount.value, 10) || 5;
    const difficulty = this.quizDifficulty.value || 'Intermediate';

    const prompt = this.quizManager.getQuizPrompt(topic, count, difficulty);
    this.closeQuizStudio();

    this.chatInput.value = prompt;
    this.handleSend();
  }

  // Settings Modal Handlers
  openSettings() {
    this.settingApiKey.value = this.settings.apiKey || '';
    this.settingDefaultModel.value = this.settings.model || 'llama-3.3-70b-versatile';
    this.settingTemperature.value = this.settings.temperature ?? 0.7;
    this.labelTempVal.textContent = this.settingTemperature.value;
    this.settingMaxTokens.value = this.settings.maxTokens ?? 4096;
    this.labelTokensVal.textContent = this.settingMaxTokens.value;
    this.settingSystemPrompt.value = this.settings.systemPrompt || '';
    this.settingEnableDoubleOpt.checked = this.settings.enableDoubleOption !== false;
    this.settingEnableOptSpace.checked = this.settings.enableOptionSpace !== false;
    this.settingTheme.value = this.settings.theme || 'system';

    this.apiTestBadge.textContent = '';
    this.refreshAccessibilityStatus();
    this.settingsModal.classList.add('open');
  }

  closeSettings() {
    this.settingsModal.classList.remove('open');
  }

  async handleTestKey() {
    const key = this.settingApiKey.value.trim();
    if (!key) {
      this.apiTestBadge.innerHTML = '<span style="color:#ef4444;">Please enter an API key first.</span>';
      return;
    }

    this.btnTestGroqKey.textContent = 'Testing...';
    this.btnTestGroqKey.disabled = true;

    try {
      if (window.grauqueApi) {
        const result = await window.grauqueApi.testGroqKey(key);
        if (result.success) {
          this.apiTestBadge.innerHTML = `<span style="color:#10b981; font-weight:600;">✓ Connected (${result.modelCount} models available)</span>`;
        } else {
          this.apiTestBadge.innerHTML = `<span style="color:#ef4444;">✗ Failed: ${this.escapeHtml(result.error)}</span>`;
        }
      }
    } catch (e) {
      this.apiTestBadge.innerHTML = `<span style="color:#ef4444;">✗ Error: ${this.escapeHtml(e.message)}</span>`;
    } finally {
      this.btnTestGroqKey.textContent = 'Test Key';
      this.btnTestGroqKey.disabled = false;
    }
  }

  async handleSaveSettings() {
    this.settings.apiKey = this.settingApiKey.value.trim();
    this.settings.model = this.settingDefaultModel.value;
    this.settings.temperature = parseFloat(this.settingTemperature.value) || 0.7;
    this.settings.maxTokens = parseInt(this.settingMaxTokens.value, 10) || 4096;
    this.settings.systemPrompt = this.settingSystemPrompt.value.trim();
    this.settings.enableDoubleOption = this.settingEnableDoubleOpt.checked;
    this.settings.enableOptionSpace = this.settingEnableOptSpace.checked;
    this.settings.theme = this.settingTheme.value;

    if (window.grauqueApi) {
      await window.grauqueApi.saveSettings(this.settings);
    }

    this.applySettingsToUI();
    this.closeSettings();
  }

  exportCurrentChat() {
    const chat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!chat || !chat.messages || chat.messages.length === 0) {
      alert('No messages to export.');
      return;
    }

    let md = `# ${chat.title || 'Grauque Chat'}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    chat.messages.forEach(msg => {
      const sender = msg.role === 'user' ? '### User' : '### Grauque';
      md += `${sender}\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(chat.title || 'grauque-chat').replace(/[^a-z0-9_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new GrauqueApp();
});
