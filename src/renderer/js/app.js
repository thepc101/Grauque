class GrauqueApp {
  constructor() {
    this.conversations = [];
    this.activeConversationId = null;
    this.settings = {};
    this.isGenerating = false;
    this.currentAttachedImage = null; // base64 data url
    this.currentPersona = 'general';
    this.isDeepSearchMode = false;
    this.searchFilterQuery = '';
    this.activeSpeakingIndex = null;

    // Voice dictation state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecordingVoice = false;
    this.voiceStream = null;

    this.mdRenderer = new MarkdownRenderer();
    this.quizManager = new QuizManager(this);
    this.studentStudio = new StudentStudio(this);
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
    this.sidebarSearchInput = document.getElementById('sidebar-search-input');
    this.btnClearSearch = document.getElementById('btn-clear-search');
    this.btnOpenQuizStudio = document.getElementById('btn-open-quiz-studio');
    this.btnOpenFlashcards = document.getElementById('btn-open-flashcards');
    this.btnOpenStudyGuide = document.getElementById('btn-open-study-guide');
    this.btnOpenTutor = document.getElementById('btn-open-tutor');
    this.chatHistoryList = document.getElementById('chat-history-list');
    this.btnOpenSettings = document.getElementById('btn-open-settings');
    this.sidebarApiDot = document.getElementById('sidebar-api-dot');

    // Main
    this.chatTitleDisplay = document.getElementById('chat-title-display');
    this.personaSelect = document.getElementById('persona-select');
    this.bottomModelSelect = document.getElementById('bottom-model-select');
    this.topModelSelect = document.getElementById('top-model-select') || this.bottomModelSelect;
    this.btnExportChat = document.getElementById('btn-export-chat');
    this.messagesContainer = document.getElementById('messages-container');
    this.welcomeScreen = document.getElementById('welcome-screen');

    // Input & Tools
    this.inputBoxCard = document.getElementById('input-box-card');
    this.chatInput = document.getElementById('chat-input');
    this.slashCommandsPopup = document.getElementById('slash-commands-popup');
    this.slashItemsList = document.getElementById('slash-items-list');
    this.btnDeepResearch = document.getElementById('btn-deep-research');
    this.imagePreviewStrip = document.getElementById('image-preview-strip');
    this.imagePreviewImg = document.getElementById('image-preview-img');
    this.btnRemoveImage = document.getElementById('btn-remove-image');
    this.btnAttachImage = document.getElementById('btn-attach-image');
    this.imageFileInput = document.getElementById('image-file-input');

    // Combined Attachment Elements (Image & PDF)
    this.btnAttachFile = document.getElementById('btn-attach-file');
    this.unifiedFileInput = document.getElementById('unified-file-input');

    // Study Tools 3-Line Menu & Popup
    this.btnStudyToolsMenu = document.getElementById('btn-study-tools-menu');
    this.studyToolsPopup = document.getElementById('study-tools-popup');
    this.menuItemFlashcards = document.getElementById('menu-item-flashcards');
    this.menuItemStudyGuide = document.getElementById('menu-item-study-guide');
    this.menuItemQuiz = document.getElementById('menu-item-quiz');
    this.menuItemTutor = document.getElementById('menu-item-tutor');
    this.menuItemPomodoro = document.getElementById('menu-item-pomodoro');

    // PDF Elements
    this.btnAttachPdf = document.getElementById('btn-attach-pdf');
    this.pdfFileInput = document.getElementById('pdf-file-input');
    this.pdfPreviewStrip = document.getElementById('pdf-preview-strip');
    this.pdfFileName = document.getElementById('pdf-file-name');
    this.pdfMetaBadge = document.getElementById('pdf-meta-badge');
    this.btnRemovePdf = document.getElementById('btn-remove-pdf');
    this.btnPdfQuickSummarize = document.getElementById('btn-pdf-quick-summarize');
    this.btnPdfQuickFlashcards = document.getElementById('btn-pdf-quick-flashcards');
    this.btnPdfQuickQuiz = document.getElementById('btn-pdf-quick-quiz');
    this.currentAttachedPdf = null;

    // Voice Dictation Elements
    this.btnMicPrompt = document.getElementById('btn-mic-prompt');
    this.micStatusLabel = document.getElementById('mic-status-label');
    this.voiceRecordingBanner = document.getElementById('voice-recording-banner');
    this.voiceBannerText = document.getElementById('voice-banner-text');
    this.btnStopVoice = document.getElementById('btn-stop-voice');

    // Quick Action Pills
    this.btnQuickQuiz = document.getElementById('btn-quick-quiz');
    this.btnQuickFlashcards = document.getElementById('btn-quick-flashcards');
    this.btnQuickStudyGuide = document.getElementById('btn-quick-study-guide');
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
    this.btnFetchModels = document.getElementById('btn-fetch-models');
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

    // Flashcard Modal
    this.flashcardModal = document.getElementById('flashcard-modal');
    this.btnCloseFlashcards = document.getElementById('btn-close-flashcards');
    this.btnCancelFlashcards = document.getElementById('btn-cancel-flashcards');
    this.btnGenerateFlashcards = document.getElementById('btn-generate-flashcards');
    this.flashcardTopic = document.getElementById('flashcard-topic');
    this.flashcardCount = document.getElementById('flashcard-count');
    this.flashcardFocus = document.getElementById('flashcard-focus');

    // Study Guide Modal
    this.studyGuideModal = document.getElementById('study-guide-modal');
    this.btnCloseStudyGuide = document.getElementById('btn-close-study-guide');
    this.btnCancelStudyGuide = document.getElementById('btn-cancel-study-guide');
    this.btnGenerateStudyGuide = document.getElementById('btn-generate-study-guide');
    this.studyGuideTopic = document.getElementById('study-guide-topic');
    this.studyGuideNotes = document.getElementById('study-guide-notes');

    // Socratic Tutor Modal
    this.tutorModal = document.getElementById('tutor-modal');
    this.btnCloseTutor = document.getElementById('btn-close-tutor');
    this.btnCancelTutor = document.getElementById('btn-cancel-tutor');
    this.btnGenerateTutor = document.getElementById('btn-generate-tutor');
    this.tutorProblem = document.getElementById('tutor-problem');
    this.tutorStyle = document.getElementById('tutor-style');

    // Memory Modal Elements
    this.memoryManager = new MemoryManager(this);
    this.btnOpenMemory = document.getElementById('btn-open-memory');
    this.memoryModal = document.getElementById('memory-modal');
    this.btnCloseMemory = document.getElementById('btn-close-memory');
    this.btnDoneMemory = document.getElementById('btn-done-memory');
    this.settingEnableMemory = document.getElementById('setting-enable-memory');
    this.inputNewMemory = document.getElementById('input-new-memory');
    this.btnAddMemory = document.getElementById('btn-add-memory');
    this.btnClearMemories = document.getElementById('btn-clear-memories');
    this.memoryItemsContainer = document.getElementById('memory-items-container');
  }

  async init() {
    await this.loadSettings();
    this.loadConversations();
    this.memoryManager.updateMemoryBadge();

    // Listen for prompt submitted from the double-tap Option quick-box!
    if (window.grauqueApi && window.grauqueApi.onPromptFromQuickBox) {
      window.grauqueApi.onPromptFromQuickBox(({ prompt }) => {
        if (prompt && prompt.trim()) {
          this.handleQuickBoxPrompt(prompt.trim());
        }
      });
    }

    this.refreshAccessibilityStatus();
  }

  async loadSettings() {
    if (window.grauqueApi) {
      this.settings = await window.grauqueApi.getSettings();
    } else {
      this.settings = {
        apiKey: '',
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 4096,
        theme: 'dark'
      };
    }

    this.settings.theme = 'dark';

    // Default to gpt-oss-120b if old deprecated model was saved
    if (!this.settings.model || this.settings.model.includes('llama') || this.settings.model.includes('gemma') || this.settings.model.includes('mixtral')) {
      this.settings.model = 'openai/gpt-oss-120b';
    }

    // Listen for macOS system color scheme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.settings && this.settings.theme === 'system') {
          this.applySettingsToUI();
        }
      });
    }

    this.applySettingsToUI();
  }

  applySettingsToUI() {
    this.settings.theme = 'dark';
    document.documentElement.setAttribute('data-theme', 'dark');

    // Update brand logos
    const sidebarLogo = document.getElementById('sidebar-logo-img');
    if (sidebarLogo) sidebarLogo.src = 'assets/icon.png';
    const welcomeLogo = document.getElementById('welcome-logo-img');
    if (welcomeLogo) welcomeLogo.src = 'assets/icon.png';

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

    const activeModel = this.settings.model || 'openai/gpt-oss-120b';
    if (this.bottomModelSelect) {
      this.ensureModelInDropdown(this.bottomModelSelect, activeModel);
      this.bottomModelSelect.value = activeModel;
    }
    if (this.topModelSelect && this.topModelSelect !== this.bottomModelSelect) {
      this.ensureModelInDropdown(this.topModelSelect, activeModel);
      this.topModelSelect.value = activeModel;
    }
  }

  getModelDisplayName(modelId, isSettings = false) {
    if (modelId === 'openai/gpt-oss-120b') {
      return isSettings ? 'Grauque Max (Reasoning • Default)' : 'Grauque Max';
    }
    if (modelId === 'qwen/qwen3.8-27b') {
      return isSettings ? 'Grauque Image (Vision Support)' : 'Grauque Image';
    }
    if (modelId === 'openai/gpt-oss-20b') {
      return isSettings ? 'Grauque Medium (Fast)' : 'Grauque Medium';
    }
    if (modelId === 'allam-2-7b') {
      return 'Grauque Low';
    }
    return modelId;
  }

  ensureModelInDropdown(selectEl, modelId) {
    if (!selectEl) return;
    let exists = false;
    for (let i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === modelId) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = modelId;
      const isSettings = selectEl.id === 'setting-default-model';
      opt.textContent = this.getModelDisplayName(modelId, isSettings);
      selectEl.appendChild(opt);
    }
  }

  bindEvents() {
    // Sidebar
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

    // Real-time Conversation Search
    this.sidebarSearchInput?.addEventListener('input', (e) => {
      this.searchFilterQuery = e.target.value;
      if (this.btnClearSearch) {
        this.btnClearSearch.style.display = this.searchFilterQuery ? 'block' : 'none';
      }
      this.renderHistoryList();
    });

    this.btnClearSearch?.addEventListener('click', () => {
      if (this.sidebarSearchInput) this.sidebarSearchInput.value = '';
      this.searchFilterQuery = '';
      if (this.btnClearSearch) this.btnClearSearch.style.display = 'none';
      this.renderHistoryList();
    });

    // Persona Mode Switcher
    this.personaSelect?.addEventListener('change', (e) => {
      this.currentPersona = e.target.value;
      const personaName = this.personaSelect.options[this.personaSelect.selectedIndex]?.text || 'General Assistant';
      this.showToast(`AI Persona: ${personaName}`);
    });

    // Deep Research / Search Grounding toggle
    this.btnDeepResearch?.addEventListener('click', () => {
      this.isDeepSearchMode = !this.isDeepSearchMode;
      this.btnDeepResearch.classList.toggle('active', this.isDeepSearchMode);
      if (this.isDeepSearchMode) {
        this.showToast('Deep Research & Search Grounding enabled');
      } else {
        this.showToast('Standard direct mode');
      }
    });

    // Slash command item clicks
    this.slashItemsList?.addEventListener('click', (e) => {
      const item = e.target.closest('.slash-item');
      if (item) {
        const prompt = item.getAttribute('data-prompt');
        if (prompt) {
          this.applySlashCommand(prompt);
        }
      }
    });

    // Close slash popup when clicking outside
    window.addEventListener('click', (e) => {
      if (this.slashCommandsPopup && this.slashCommandsPopup.style.display !== 'none') {
        if (!this.slashCommandsPopup.contains(e.target) && e.target !== this.chatInput) {
          this.slashCommandsPopup.style.display = 'none';
        }
      }
    });

    // Model Select change (Bottom Bar & Top Bar)
    const onModelChange = (e) => {
      this.settings.model = e.target.value;
      if (this.bottomModelSelect && this.bottomModelSelect !== e.target) {
        this.bottomModelSelect.value = e.target.value;
      }
      if (this.topModelSelect && this.topModelSelect !== e.target) {
        this.topModelSelect.value = e.target.value;
      }
      if (window.grauqueApi) {
        window.grauqueApi.saveSettings(this.settings);
      }
    };
    if (this.bottomModelSelect) {
      this.bottomModelSelect.addEventListener('change', onModelChange);
    }
    if (this.topModelSelect && this.topModelSelect !== this.bottomModelSelect) {
      this.topModelSelect.addEventListener('change', onModelChange);
    }

    // Combined Attachment Events (Images & PDFs)
    this.btnAttachFile?.addEventListener('click', () => {
      this.unifiedFileInput?.click();
    });

    this.unifiedFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          this.handlePdfSelected(file);
        } else {
          this.handleFileSelected(file);
        }
      }
      this.unifiedFileInput.value = '';
    });

    // Study Tools 3-Line Menu & Popup Events
    this.btnStudyToolsMenu?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = !this.studyToolsPopup || this.studyToolsPopup.style.display === 'none';
      if (this.studyToolsPopup) {
        this.studyToolsPopup.style.display = isHidden ? 'flex' : 'none';
      }
    });

    window.addEventListener('click', (e) => {
      if (this.studyToolsPopup && this.studyToolsPopup.style.display !== 'none') {
        if (!this.studyToolsPopup.contains(e.target) && !this.btnStudyToolsMenu?.contains(e.target)) {
          this.studyToolsPopup.style.display = 'none';
        }
      }
    });

    this.menuItemFlashcards?.addEventListener('click', () => {
      if (this.studyToolsPopup) this.studyToolsPopup.style.display = 'none';
      this.openFlashcardModal();
    });

    this.menuItemStudyGuide?.addEventListener('click', () => {
      if (this.studyToolsPopup) this.studyToolsPopup.style.display = 'none';
      this.openStudyGuideModal();
    });

    this.menuItemQuiz?.addEventListener('click', () => {
      if (this.studyToolsPopup) this.studyToolsPopup.style.display = 'none';
      this.openQuizStudio();
    });

    this.menuItemTutor?.addEventListener('click', () => {
      if (this.studyToolsPopup) this.studyToolsPopup.style.display = 'none';
      this.openTutorModal();
    });

    this.menuItemPomodoro?.addEventListener('click', () => {
      if (this.studyToolsPopup) this.studyToolsPopup.style.display = 'none';
      this.studentStudio.toggleTimer();
    });

    // Input auto-expand, slash menu & send
    this.chatInput?.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 200) + 'px';
      this.handleSlashMenuInput();
    });

    this.chatInput?.addEventListener('keydown', (e) => {
      // Check if slash menu is open
      if (this.slashCommandsPopup && this.slashCommandsPopup.style.display === 'block') {
        const visibleItems = Array.from(this.slashItemsList?.querySelectorAll('.slash-item') || []).filter(el => el.style.display !== 'none');
        const activeIdx = visibleItems.findIndex(el => el.classList.contains('active'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (activeIdx + 1) % visibleItems.length;
          visibleItems.forEach((el, idx) => el.classList.toggle('active', idx === nextIdx));
          visibleItems[nextIdx]?.scrollIntoView({ block: 'nearest' });
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = (activeIdx - 1 + visibleItems.length) % visibleItems.length;
          visibleItems.forEach((el, idx) => el.classList.toggle('active', idx === prevIdx));
          visibleItems[prevIdx]?.scrollIntoView({ block: 'nearest' });
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          const selected = (activeIdx >= 0 ? visibleItems[activeIdx] : null) || visibleItems[0];
          if (selected) {
            e.preventDefault();
            this.applySlashCommand(selected.getAttribute('data-prompt'));
            return;
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.slashCommandsPopup.style.display = 'none';
          return;
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.btnSend?.addEventListener('click', () => this.handleSend());
    this.btnStop?.addEventListener('click', () => this.handleStop());

    // Image Attachment Events
    this.btnAttachImage?.addEventListener('click', () => {
      this.imageFileInput?.click();
    });

    this.imageFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
      this.imageFileInput.value = '';
    });

    this.btnRemoveImage?.addEventListener('click', () => {
      this.clearAttachedImage();
    });

    // PDF Attachment Events
    this.btnAttachPdf?.addEventListener('click', async () => {
      if (window.grauqueApi && window.grauqueApi.pickPdfFile) {
        try {
          const picked = await window.grauqueApi.pickPdfFile();
          if (picked && picked.success) {
            this.handleParsedPdfResult(picked);
            return;
          }
        } catch (e) {
          console.warn('Native PDF picker fallback to file input:', e);
        }
      }
      this.pdfFileInput?.click();
    });

    this.pdfFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.handlePdfSelected(file);
      }
      this.pdfFileInput.value = '';
    });

    this.btnRemovePdf?.addEventListener('click', () => {
      this.clearAttachedPdf();
    });

    this.btnPdfQuickSummarize?.addEventListener('click', () => {
      if (!this.currentAttachedPdf) return;
      this.chatInput.value = `Provide a comprehensive, high-yield summary of this document (${this.currentAttachedPdf.title}), organized by key concepts, formulas/definitions, and main exam takeaways.`;
      this.handleSend();
    });

    this.btnPdfQuickFlashcards?.addEventListener('click', () => {
      this.openFlashcardModal();
    });

    this.btnPdfQuickQuiz?.addEventListener('click', () => {
      this.openQuizStudio();
    });

    // Paste Image or PDF from Clipboard
    window.addEventListener('paste', (e) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
            e.preventDefault();
            this.handlePdfSelected(file);
            return;
          } else if (file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|ico)$/i.test(file.name)) {
            e.preventDefault();
            this.handleFileSelected(file);
            return;
          }
        }
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type === 'application/pdf') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.handlePdfSelected(file);
            break;
          }
        } else if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.handleFileSelected(file);
            break;
          }
        }
      }
    });

    // Drag and drop image or PDF
    this.inputBoxCard?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.inputBoxCard.style.borderColor = 'var(--accent)';
    });

    this.inputBoxCard?.addEventListener('dragleave', () => {
      this.inputBoxCard.style.borderColor = '';
    });

    this.inputBoxCard?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.inputBoxCard.style.borderColor = '';
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
            this.handlePdfSelected(file);
            break;
          } else if (file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|ico)$/i.test(file.name)) {
            this.handleFileSelected(file);
            break;
          }
        }
      }
    });

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

    // Welcome Screen GitHub Link
    const welcomeGithubLink = document.getElementById('link-welcome-github');
    welcomeGithubLink?.addEventListener('click', (e) => {
      e.preventDefault();
      const url = welcomeGithubLink.getAttribute('href') || 'https://github.com/thepc101/grauque';
      if (window.grauqueApi && window.grauqueApi.openExternal) {
        window.grauqueApi.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    });

    // Global External Link Interceptor
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href && (anchor.href.startsWith('http://') || anchor.href.startsWith('https://'))) {
        e.preventDefault();
        if (window.grauqueApi && window.grauqueApi.openExternal) {
          window.grauqueApi.openExternal(anchor.href);
        } else {
          window.open(anchor.href, '_blank');
        }
      }
    });

    // Voice Dictation (Groq Whisper Large v3)
    this.btnMicPrompt?.addEventListener('click', () => this.toggleVoiceRecording());
    this.btnStopVoice?.addEventListener('click', () => this.stopVoiceRecording());

    // Quick Action toolbar buttons
    this.btnQuickQuiz?.addEventListener('click', () => this.openQuizStudio());
    this.btnQuickFlashcards?.addEventListener('click', () => this.openFlashcardModal());
    this.btnQuickStudyGuide?.addEventListener('click', () => this.openStudyGuideModal());

    // Flashcard Studio Modal
    this.btnOpenFlashcards?.addEventListener('click', () => this.openFlashcardModal());
    this.btnCloseFlashcards?.addEventListener('click', () => this.closeFlashcardModal());
    this.btnCancelFlashcards?.addEventListener('click', () => this.closeFlashcardModal());
    this.btnGenerateFlashcards?.addEventListener('click', () => this.handleGenerateFlashcards());

    // Study Guide Modal
    this.btnOpenStudyGuide?.addEventListener('click', () => this.openStudyGuideModal());
    this.btnCloseStudyGuide?.addEventListener('click', () => this.closeStudyGuideModal());
    this.btnCancelStudyGuide?.addEventListener('click', () => this.closeStudyGuideModal());
    this.btnGenerateStudyGuide?.addEventListener('click', () => this.handleGenerateStudyGuide());

    // Socratic Tutor Modal
    this.btnOpenTutor?.addEventListener('click', () => this.openTutorModal());
    this.btnCloseTutor?.addEventListener('click', () => this.closeTutorModal());
    this.btnCancelTutor?.addEventListener('click', () => this.closeTutorModal());
    this.btnGenerateTutor?.addEventListener('click', () => this.handleGenerateTutor());

    // Pomodoro Focus Timer
    this.studentStudio.initTimerUI();

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
    this.btnFetchModels?.addEventListener('click', () => this.handleFetchLiveModels());

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

    // Memory Modal Events
    this.btnOpenMemory?.addEventListener('click', () => this.openMemoryModal());
    this.btnCloseMemory?.addEventListener('click', () => this.closeMemoryModal());
    this.btnDoneMemory?.addEventListener('click', () => this.closeMemoryModal());

    this.btnAddMemory?.addEventListener('click', () => this.handleAddManualMemory());
    this.inputNewMemory?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAddManualMemory();
      }
    });

    this.settingEnableMemory?.addEventListener('change', (e) => {
      this.memoryManager.setMemoryEnabled(e.target.checked);
    });

    this.btnClearMemories?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all remembered facts?')) {
        await this.memoryManager.clearAllMemories();
        this.memoryManager.renderMemoryList(this.memoryItemsContainer);
      }
    });

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

  async handleFileSelected(file) {
    if (!file) return;
    try {
      const optimizedDataUrl = await this.compressAndResizeImage(file);
      this.setAttachedImage(optimizedDataUrl);
    } catch (err) {
      console.warn('Image optimization fallback:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.setAttachedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  // Heavily downscale and compress images to stay well within Groq OTPM/token limits
  compressAndResizeImage(fileOrDataUrl, maxDimension = 640, quality = 0.70) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale proportionally if either dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Groq requires at least 32 pixels in each dimension
        width = Math.max(32, width || 64);
        height = Math.max(32, height || 64);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let result = canvas.toDataURL('image/jpeg', quality);

        // Secondary pass if still over 150KB
        if (result.length > 200000) {
          const passCanvas = document.createElement('canvas');
          passCanvas.width = Math.max(32, Math.round(width * 0.7));
          passCanvas.height = Math.max(32, Math.round(height * 0.7));
          const passCtx = passCanvas.getContext('2d');
          passCtx.fillStyle = '#FFFFFF';
          passCtx.fillRect(0, 0, passCanvas.width, passCanvas.height);
          passCtx.drawImage(canvas, 0, 0, passCanvas.width, passCanvas.height);
          result = passCanvas.toDataURL('image/jpeg', 0.65);
        }

        resolve(result);
      };

      img.onerror = (err) => reject(err);

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  }

  setAttachedImage(dataUrl) {
    this.currentAttachedImage = dataUrl;
    if (this.imagePreviewStrip && this.imagePreviewImg) {
      this.imagePreviewImg.src = dataUrl;
      this.imagePreviewStrip.style.display = 'flex';
    }
    if (this.btnAttachImage) {
      this.btnAttachImage.classList.add('has-image');
    }
    if (this.btnAttachFile) {
      this.btnAttachFile.classList.add('has-file');
    }

    // Auto-switch to vision model (qwen/qwen3.8-27b) when image is attached!
    const modelSelect = this.bottomModelSelect || this.topModelSelect;
    if (modelSelect && modelSelect.value !== 'qwen/qwen3.8-27b') {
      this.ensureModelInDropdown(modelSelect, 'qwen/qwen3.8-27b');
      modelSelect.value = 'qwen/qwen3.8-27b';
      if (this.topModelSelect && this.topModelSelect !== modelSelect) {
        this.ensureModelInDropdown(this.topModelSelect, 'qwen/qwen3.8-27b');
        this.topModelSelect.value = 'qwen/qwen3.8-27b';
      }
      this.settings.model = 'qwen/qwen3.8-27b';
      if (window.grauqueApi) {
        window.grauqueApi.saveSettings(this.settings);
      }
    }
  }

  clearAttachedImage() {
    this.currentAttachedImage = null;
    if (this.imagePreviewStrip) {
      this.imagePreviewStrip.style.display = 'none';
    }
    if (this.imagePreviewImg) {
      this.imagePreviewImg.src = '';
    }
    if (this.btnAttachImage) {
      this.btnAttachImage.classList.remove('has-image');
    }
    if (this.btnAttachFile && !this.currentAttachedPdf) {
      this.btnAttachFile.classList.remove('has-file');
    }
  }

  // Handle PDF Attachment and Extraction
  async handlePdfSelected(file) {
    if (!file) return;

    const fileName = file.name || 'Document.pdf';
    if (this.pdfPreviewStrip) {
      this.pdfPreviewStrip.style.display = 'flex';
      if (this.pdfFileName) this.pdfFileName.textContent = fileName;
      if (this.pdfMetaBadge) this.pdfMetaBadge.textContent = 'Extracting document text...';
    }
    if (this.btnAttachPdf) {
      this.btnAttachPdf.classList.add('has-file');
    }
    if (this.btnAttachFile) {
      this.btnAttachFile.classList.add('has-file');
    }

    try {
      let filePath = file.path;
      let fileData = null;

      // Fallback if path is empty (e.g. web drag & drop)
      if (!filePath) {
        const arrayBuf = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileData = btoa(binary);
      }

      if (window.grauqueApi && window.grauqueApi.parsePdf) {
        const result = await window.grauqueApi.parsePdf({ filePath, fileData });
        if (result && result.success && result.text) {
          result.title = result.title || fileName;
          this.handleParsedPdfResult(result);
        } else {
          throw new Error(result?.error || 'No readable text content found in PDF.');
        }
      } else {
        throw new Error('PDF extraction service is unavailable.');
      }
    } catch (err) {
      console.error('PDF parsing error:', err);
      if (this.pdfMetaBadge) {
        this.pdfMetaBadge.textContent = `Error: ${err.message || 'Could not parse PDF'}`;
      }
    }
  }

  handleParsedPdfResult(result) {
    if (!result || !result.success) return;

    this.currentAttachedPdf = {
      title: result.title || 'Document.pdf',
      totalPages: result.totalPages || 1,
      wordCount: result.wordCount || 0,
      characterCount: result.characterCount || (result.text ? result.text.length : 0),
      text: result.text || '',
      isTruncated: Boolean(result.isTruncated)
    };

    if (this.pdfPreviewStrip) {
      this.pdfPreviewStrip.style.display = 'flex';
    }
    if (this.pdfFileName) {
      this.pdfFileName.textContent = this.currentAttachedPdf.title;
    }
    if (this.pdfMetaBadge) {
      const wordStr = this.currentAttachedPdf.wordCount ? ` • ${this.currentAttachedPdf.wordCount.toLocaleString()} words` : '';
      const truncStr = this.currentAttachedPdf.isTruncated ? ' (truncated for fast inference)' : '';
      this.pdfMetaBadge.textContent = `Ready • ${this.currentAttachedPdf.totalPages} page${this.currentAttachedPdf.totalPages === 1 ? '' : 's'}${wordStr}${truncStr}`;
    }
    if (this.btnAttachPdf) {
      this.btnAttachPdf.classList.add('has-file');
    }
  }

  clearAttachedPdf() {
    this.currentAttachedPdf = null;
    if (this.pdfPreviewStrip) {
      this.pdfPreviewStrip.style.display = 'none';
    }
    if (this.pdfFileInput) {
      this.pdfFileInput.value = '';
    }
    if (this.btnAttachPdf) {
      this.btnAttachPdf.classList.remove('has-file');
    }
    if (this.btnAttachFile && !this.currentAttachedImage) {
      this.btnAttachFile.classList.remove('has-file');
    }
  }

  async refreshAccessibilityStatus() {
    if (window.grauqueApi && window.grauqueApi.checkAccessibility) {
      const trusted = await window.grauqueApi.checkAccessibility(false);
      if (this.axStatusDesc) {
        if (trusted) {
          this.axStatusDesc.innerHTML = '<span style="color:#10b981; font-weight:600;">Granted</span> — Double-tap Option is active everywhere.';
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
        // Sanitize historical conversations from oversized raw images
        if (Array.isArray(this.conversations)) {
          this.conversations.forEach(c => {
            if (Array.isArray(c.messages)) {
              c.messages.forEach(m => {
                if (m.imageUrl && m.imageUrl.length > 400000) {
                  m.imageUrl = null; // strip bloated historical raw images
                }
              });
            }
          });
        }
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
    this.clearAttachedImage();
    this.clearAttachedPdf();
    this.chatInput?.focus();
  }

  setActiveConversation(id) {
    this.activeConversationId = id;
    const chat = this.conversations.find(c => c.id === id);
    if (!chat) return;

    this.clearAttachedPdf();
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

    let filtered = this.conversations;
    if (this.searchFilterQuery && this.searchFilterQuery.trim()) {
      const q = this.searchFilterQuery.trim().toLowerCase();
      filtered = this.conversations.filter(chat => {
        if (chat.title && chat.title.toLowerCase().includes(q)) return true;
        if (Array.isArray(chat.messages) && chat.messages.some(m => m.content && typeof m.content === 'string' && m.content.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Sort: pinned first, then by updatedAt/createdAt
    const sorted = [...filtered].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });

    this.chatHistoryList.innerHTML = `<div class="history-section-title">${this.searchFilterQuery ? 'Matching Conversations' : 'Conversations'}</div>`;

    if (sorted.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'padding:14px; font-size:12px; color:var(--text-muted); text-align:center;';
      emptyEl.textContent = this.searchFilterQuery ? 'No matching conversations' : 'No conversations yet';
      this.chatHistoryList.appendChild(emptyEl);
      return;
    }

    sorted.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'history-item' + (chat.id === this.activeConversationId ? ' active' : '') + (chat.pinned ? ' pinned' : '');
      item.innerHTML = `
        <span class="history-title" id="title-${chat.id}" title="${this.escapeHtml(chat.title)}">${this.escapeHtml(chat.title)}</span>
        <div class="history-actions">
          <button class="history-action-btn pin-btn" title="${chat.pinned ? 'Unpin' : 'Pin to top'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${chat.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-2l-3-4V4h1V2H7v2h1v7l-3 4v2z"></path>
            </svg>
          </button>
          <button class="history-action-btn rename-btn" title="Rename conversation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <button class="history-action-btn delete-btn" title="Delete conversation">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.history-action-btn') || e.target.closest('.history-rename-input')) return;
        this.setActiveConversation(chat.id);
      });

      const pinBtn = item.querySelector('.pin-btn');
      pinBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        chat.pinned = !chat.pinned;
        this.saveConversations();
        this.renderHistoryList();
      });

      const renameBtn = item.querySelector('.rename-btn');
      const titleSpan = item.querySelector(`#title-${chat.id}`);
      renameBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startInlineRename(chat, titleSpan);
      });

      titleSpan?.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startInlineRename(chat, titleSpan);
      });

      const delBtn = item.querySelector('.delete-btn');
      delBtn?.addEventListener('click', (e) => this.deleteConversation(chat.id, e));

      this.chatHistoryList.appendChild(item);
    });
  }

  startInlineRename(chat, titleSpan) {
    if (!titleSpan) return;
    const oldTitle = chat.title;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'history-rename-input';
    input.value = oldTitle;

    const commitRename = () => {
      const val = input.value.trim();
      chat.title = val || oldTitle;
      chat.updatedAt = Date.now();
      this.saveConversations();
      if (this.activeConversationId === chat.id) {
        this.chatTitleDisplay.textContent = chat.title;
      }
      this.renderHistoryList();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.renderHistoryList();
      }
    });

    input.addEventListener('blur', () => {
      commitRename();
    });

    titleSpan.replaceWith(input);
    input.focus();
    input.select();
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
      let imageHtml = '';
      if (msg.imageUrl) {
        imageHtml = `<img src="${msg.imageUrl}" class="msg-attached-image" alt="Attached image" />`;
      }
      let pdfHtml = '';
      if (msg.pdf) {
        pdfHtml = `
          <div class="msg-attached-pdf">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span class="msg-pdf-name">${this.escapeHtml(msg.pdf.title || 'Document.pdf')}</span>
            <span class="msg-pdf-pages">(${msg.pdf.totalPages || 1} pg${msg.pdf.totalPages === 1 ? '' : 's'})</span>
          </div>
        `;
      }

      row.innerHTML = `
        <div class="user-bubble-container" id="user-container-${idx}">
          <div class="user-bubble" id="user-bubble-${idx}">
            ${imageHtml}
            ${pdfHtml}
            <div class="user-text" id="user-text-${idx}">${this.escapeHtml(msg.content)}</div>
          </div>
          <div class="user-actions-bar">
            <button class="msg-action-btn btn-edit-user" data-idx="${idx}" title="Edit prompt">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button class="msg-action-btn btn-copy-user" data-idx="${idx}" title="Copy prompt">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
      `;

      const editBtn = row.querySelector('.btn-edit-user');
      editBtn?.addEventListener('click', () => this.handleEditUserMessage(idx));

      const copyBtn = row.querySelector('.btn-copy-user');
      copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.content);
        const span = copyBtn.querySelector('span');
        if (span) span.textContent = 'Copied!';
        setTimeout(() => { if (span) span.textContent = 'Copy'; }, 1800);
      });
    } else {
      let reasoningHtml = '';
      if (msg.reasoning && msg.reasoning.trim()) {
        reasoningHtml = `
          <details class="reasoning-details">
            <summary>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:5px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Reasoning Analysis
            </summary>
            <div class="reasoning-content">${this.escapeHtml(msg.reasoning)}</div>
          </details>
        `;
      }

      const formattedContent = this.mdRenderer.render(msg.content);
      const metricsHtml = msg.metrics
        ? `<span class="meta-speed-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>${msg.metrics.tokensPerSec || 0} t/s • ${msg.metrics.elapsedSec || 0}s</span>`
        : '';

      row.innerHTML = `
        <div class="assistant-container">
          <img src="assets/icon.png" class="assistant-avatar" width="28" height="28" alt="Grauque" />
          <div class="assistant-content-wrapper">
            <div class="assistant-meta">
              <span class="meta-brand">Grauque</span>
              <span>${msg.model || this.settings.model || 'Groq'}</span>
              ${metricsHtml}
            </div>
            ${reasoningHtml}
            <div class="assistant-body" id="body-${idx}">${formattedContent}</div>
            <div class="assistant-actions-bar" id="actions-${idx}">
              <button class="msg-action-btn btn-copy-response" data-idx="${idx}" title="Copy full response to clipboard">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              </button>
              <button class="msg-action-btn btn-speak-response" data-idx="${idx}" title="Read aloud using speech synthesis">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                <span>Read</span>
              </button>
              <button class="msg-action-btn btn-retry-response" data-idx="${idx}" title="Regenerate this response">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Retry</span>
              </button>
              <button class="msg-action-btn btn-export-response" data-idx="${idx}" title="Export response as Markdown">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      `;

      this.wireAssistantActionButtons(row, idx, msg);

      // Check for structured quiz data
      const quizData = this.quizManager.extractQuizData(msg.content);
      if (quizData) {
        const bodyEl = row.querySelector(`#body-${idx}`);
        const interactiveQuiz = this.quizManager.renderInteractiveQuiz(quizData, `quiz-widget-${idx}`);
        bodyEl.appendChild(interactiveQuiz);
      }

      // Check for structured flashcard deck
      const flashcardData = this.studentStudio.extractFlashcardData(msg.content);
      if (flashcardData) {
        const bodyEl = row.querySelector(`#body-${idx}`);
        const flashcardWidget = this.studentStudio.createFlashcardWidget(flashcardData, `flashcard-widget-${idx}`);
        if (flashcardWidget) bodyEl.appendChild(flashcardWidget);
      }
    }

    this.messagesContainer.appendChild(row);
  }

  wireAssistantActionButtons(row, idx, msg) {
    const copyBtn = row.querySelector(`.btn-copy-response[data-idx="${idx}"]`);
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
      const span = copyBtn.querySelector('span');
      if (span) span.textContent = 'Copied!';
      setTimeout(() => { if (span) span.textContent = 'Copy'; }, 1800);
    });

    const speakBtn = row.querySelector(`.btn-speak-response[data-idx="${idx}"]`);
    speakBtn?.addEventListener('click', () => {
      this.toggleSpeakMessage(msg.content, idx, speakBtn);
    });

    const retryBtn = row.querySelector(`.btn-retry-response[data-idx="${idx}"]`);
    retryBtn?.addEventListener('click', () => {
      this.handleRetryResponse(idx);
    });

    const exportBtn = row.querySelector(`.btn-export-response[data-idx="${idx}"]`);
    exportBtn?.addEventListener('click', () => {
      this.exportSingleMessage(msg);
    });
  }

  renderAssistantActionBar(row, idx, msg) {
    let actionsEl = row.querySelector(`#actions-${idx}`);
    if (!actionsEl) {
      const wrapper = row.querySelector('.assistant-content-wrapper');
      if (wrapper) {
        actionsEl = document.createElement('div');
        actionsEl.className = 'assistant-actions-bar';
        actionsEl.id = `actions-${idx}`;
        wrapper.appendChild(actionsEl);
      }
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="msg-action-btn btn-copy-response" data-idx="${idx}" title="Copy full response to clipboard">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
        <button class="msg-action-btn btn-speak-response" data-idx="${idx}" title="Read aloud using speech synthesis">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          <span>Read</span>
        </button>
        <button class="msg-action-btn btn-retry-response" data-idx="${idx}" title="Regenerate this response">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Retry</span>
        </button>
        <button class="msg-action-btn btn-export-response" data-idx="${idx}" title="Export response as Markdown">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Save</span>
        </button>
      `;
      this.wireAssistantActionButtons(row, idx, msg);
    }
  }

  toggleSpeakMessage(text, idx, btn) {
    if (!window.speechSynthesis) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }

    if (window.speechSynthesis.speaking && this.activeSpeakingIndex === idx) {
      window.speechSynthesis.cancel();
      this.activeSpeakingIndex = null;
      btn.classList.remove('speaking');
      btn.querySelector('span').textContent = 'Read';
      return;
    }

    window.speechSynthesis.cancel();
    document.querySelectorAll('.btn-speak-response').forEach(b => {
      b.classList.remove('speaking');
      const s = b.querySelector('span');
      if (s) s.textContent = 'Read';
    });

    const clean = text
      .replace(/```[\s\S]*?```/g, ' [code block omitted] ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' [math formula] ')
      .replace(/\$[^\$]+\$/g, ' [formula] ')
      .replace(/[#*_~`>-]/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Samantha') || v.name.includes('Alex')));
    if (englishVoice) utterance.voice = englishVoice;

    btn.classList.add('speaking');
    btn.querySelector('span').textContent = 'Stop';
    this.activeSpeakingIndex = idx;

    utterance.onend = () => {
      btn.classList.remove('speaking');
      btn.querySelector('span').textContent = 'Read';
      this.activeSpeakingIndex = null;
    };
    utterance.onerror = () => {
      btn.classList.remove('speaking');
      btn.querySelector('span').textContent = 'Read';
      this.activeSpeakingIndex = null;
    };

    window.speechSynthesis.speak(utterance);
  }

  async handleRetryResponse(assistantIndex) {
    if (this.isGenerating) return;
    const chat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!chat || assistantIndex <= 0 || assistantIndex >= chat.messages.length) return;

    chat.messages = chat.messages.slice(0, assistantIndex);
    this.saveConversations();
    this.renderMessages(chat.messages);

    await this.runGenerationForChat(chat);
  }

  handleEditUserMessage(userIndex) {
    const chat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!chat || !chat.messages[userIndex]) return;

    const userMsg = chat.messages[userIndex];
    const container = document.getElementById(`user-container-${userIndex}`);
    if (!container) return;

    container.innerHTML = `
      <div class="user-inline-edit-box">
        <textarea class="user-inline-edit-textarea" id="inline-edit-${userIndex}">${this.escapeHtml(userMsg.content)}</textarea>
        <div class="user-inline-edit-actions">
          <button class="btn-inline-cancel" id="btn-cancel-edit-${userIndex}">Cancel</button>
          <button class="btn-inline-submit" id="btn-submit-edit-${userIndex}">Save & Submit</button>
        </div>
      </div>
    `;

    const textarea = container.querySelector(`#inline-edit-${userIndex}`);
    const cancelBtn = container.querySelector(`#btn-cancel-edit-${userIndex}`);
    const submitBtn = container.querySelector(`#btn-submit-edit-${userIndex}`);

    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);

    cancelBtn?.addEventListener('click', () => {
      this.renderMessages(chat.messages);
    });

    submitBtn?.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      if (!newText) return;

      userMsg.content = newText;
      chat.messages = chat.messages.slice(0, userIndex + 1);
      this.saveConversations();
      this.renderMessages(chat.messages);

      await this.runGenerationForChat(chat);
    });
  }

  exportSingleMessage(msg) {
    const text = `# Response from Grauque (${msg.model || 'Groq'})\n\n${msg.content}\n\n---\n*Generated by Grauque on ${new Date(msg.timestamp || Date.now()).toLocaleString()}*`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grauque-response-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a);
    this.showToast('Response saved as Markdown');
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
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2400);
  }

  applySlashCommand(promptText) {
    if (!promptText) return;
    this.chatInput.value = promptText;
    if (this.slashCommandsPopup) this.slashCommandsPopup.style.display = 'none';
    this.chatInput.focus();
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 200) + 'px';
  }

  handleSlashMenuInput() {
    const val = this.chatInput.value.trim();
    if (val.startsWith('/')) {
      const q = val.toLowerCase();
      const items = this.slashItemsList?.querySelectorAll('.slash-item');
      let visibleCount = 0;
      let firstVisible = null;

      items?.forEach(item => {
        const cmd = item.getAttribute('data-cmd') || '';
        const desc = item.querySelector('.slash-desc')?.textContent.toLowerCase() || '';
        if (cmd.startsWith(q) || desc.includes(q.slice(1)) || q === '/') {
          item.style.display = 'flex';
          visibleCount++;
          if (!firstVisible) firstVisible = item;
        } else {
          item.style.display = 'none';
        }
      });

      if (visibleCount > 0 && this.slashCommandsPopup) {
        this.slashCommandsPopup.style.display = 'block';
        const curActive = this.slashItemsList?.querySelector('.slash-item.active');
        if (!curActive || curActive.style.display === 'none') {
          items?.forEach(i => i.classList.remove('active'));
          firstVisible?.classList.add('active');
        }
      } else if (this.slashCommandsPopup) {
        this.slashCommandsPopup.style.display = 'none';
      }
    } else if (this.slashCommandsPopup) {
      this.slashCommandsPopup.style.display = 'none';
    }
  }

  handleQuickBoxPrompt(prompt) {
    let activeChat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!activeChat || (activeChat.messages && activeChat.messages.length > 0)) {
      this.createNewConversation();
      activeChat = this.conversations.find(c => c.id === this.activeConversationId);
    }

    this.chatInput.value = prompt;
    this.handleSend();
  }

  async handleSend() {
    const text = this.chatInput.value.trim();
    const attachedImage = this.currentAttachedImage;
    const attachedPdf = this.currentAttachedPdf;

    if ((!text && !attachedImage && !attachedPdf) || this.isGenerating) return;

    const apiKey = (this.settings.apiKey || '').trim();
    if (!apiKey) {
      this.openSettings();
      alert('Please enter your Groq API key in Settings to begin.');
      return;
    }

    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    this.clearAttachedImage();
    this.clearAttachedPdf();

    let chat = this.conversations.find(c => c.id === this.activeConversationId);
    if (!chat) {
      this.createNewConversation();
      chat = this.conversations.find(c => c.id === this.activeConversationId);
    }

    if (chat.messages.length === 0) {
      let titleSource = text;
      if (!titleSource && attachedPdf) titleSource = attachedPdf.title;
      if (!titleSource && attachedImage) titleSource = 'Image Analysis';
      titleSource = titleSource || 'New Conversation';
      chat.title = titleSource.length > 36 ? titleSource.substring(0, 36) + '...' : titleSource;
      this.chatTitleDisplay.textContent = chat.title;
      this.renderHistoryList();
    }

    // Add user message
    const userMsg = {
      role: 'user',
      content: text || (attachedPdf ? `Please analyze and summarize this attached document: ${attachedPdf.title}` : ''),
      imageUrl: attachedImage || null,
      pdf: attachedPdf || null,
      timestamp: Date.now()
    };
    chat.messages.push(userMsg);
    this.welcomeScreen.style.display = 'none';
    this.appendMessageElement(userMsg, chat.messages.length - 1);
    this.scrollToBottom();

    // Automatic Memory Detection: check if prompt expresses a personal fact or preference to remember
    if (text) {
      this.memoryManager?.detectAndSaveFromPrompt(text);
    }

    await this.runGenerationForChat(chat);
  }

  async runGenerationForChat(chat) {
    if (this.isGenerating) return;

    const lastUserMsg = chat.messages[chat.messages.length - 1];
    const attachedImage = lastUserMsg?.imageUrl;

    // Determine model
    const hasImageInChat = Boolean(attachedImage || chat.messages.some(m => Boolean(m.imageUrl)));
    let modelToUse = this.settings.model || 'openai/gpt-oss-120b';
    if (hasImageInChat) {
      modelToUse = 'qwen/qwen3.8-27b';
      const modelSelect = this.bottomModelSelect || this.topModelSelect;
      if (modelSelect && modelSelect.value !== 'qwen/qwen3.8-27b') {
        this.ensureModelInDropdown(modelSelect, 'qwen/qwen3.8-27b');
        modelSelect.value = 'qwen/qwen3.8-27b';
        if (this.topModelSelect && this.topModelSelect !== modelSelect) {
          this.ensureModelInDropdown(this.topModelSelect, 'qwen/qwen3.8-27b');
          this.topModelSelect.value = 'qwen/qwen3.8-27b';
        }
        this.settings.model = 'qwen/qwen3.8-27b';
        if (window.grauqueApi) {
          window.grauqueApi.saveSettings(this.settings);
        }
      }
    }

    const assistantIndex = chat.messages.length;
    const assistantMsg = {
      role: 'assistant',
      content: '',
      reasoning: '',
      model: modelToUse,
      timestamp: Date.now()
    };
    chat.messages.push(assistantMsg);

    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = `msg-${assistantIndex}`;
    row.innerHTML = `
      <div class="assistant-container">
        <img src="assets/icon.png" class="assistant-avatar" width="28" height="28" alt="Grauque" />
        <div class="assistant-content-wrapper">
          <div class="assistant-meta">
            <span class="meta-brand">Grauque</span>
            <span>${assistantMsg.model}</span>
            <span class="meta-speed-badge" id="speed-badge-${assistantIndex}">Streaming...</span>
          </div>
          <div id="reasoning-wrapper-${assistantIndex}"></div>
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
    const reasoningWrapEl = document.getElementById(`reasoning-wrapper-${assistantIndex}`);
    const speedBadgeEl = document.getElementById(`speed-badge-${assistantIndex}`);

    // High-performance streaming render scheduler to eliminate DOM thrashing and lag
    let renderPending = false;
    let pendingText = '';
    let pendingReasoning = '';
    let lastRenderTime = 0;
    const RENDER_THROTTLE_MS = 32;

    const updateRender = () => {
      renderPending = false;
      lastRenderTime = performance.now();

      if (pendingReasoning && reasoningWrapEl) {
        reasoningWrapEl.innerHTML = `
          <details class="reasoning-details" open>
            <summary>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:5px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Reasoning Analysis
            </summary>
            <div class="reasoning-content">${this.escapeHtml(pendingReasoning)}</div>
          </details>
        `;
      }

      if (pendingText) {
        bodyEl.innerHTML = this.mdRenderer.render(pendingText) + '<span class="typing-cursor">▊</span>';
      } else {
        bodyEl.innerHTML = '<span class="typing-cursor">▊</span>';
      }
      this.scrollToBottom();
    };

    const scheduleRender = () => {
      if (renderPending) return;
      const now = performance.now();
      const elapsed = now - lastRenderTime;
      renderPending = true;
      if (elapsed >= RENDER_THROTTLE_MS) {
        requestAnimationFrame(updateRender);
      } else {
        setTimeout(() => {
          requestAnimationFrame(updateRender);
        }, RENDER_THROTTLE_MS - elapsed);
      }
    };

    await this.groqClient.streamChat({
      messages: chat.messages.slice(0, -1),
      model: modelToUse,
      persona: this.currentPersona,
      isDeepSearch: this.isDeepSearchMode,
      onChunk: (chunkContent, fullText, chunkReasoning, fullReasoning) => {
        assistantMsg.content = fullText;
        assistantMsg.reasoning = fullReasoning;
        pendingText = fullText;
        pendingReasoning = fullReasoning;
        scheduleRender();
      },
      onMetrics: (metrics) => {
        if (speedBadgeEl) {
          speedBadgeEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>${metrics.tokensPerSec} t/s • ${metrics.elapsedSec}s`;
        }
        if (this.liveSpeedLabel) {
          this.liveSpeedLabel.textContent = `${metrics.tokensPerSec} tokens/s`;
        }
      },
      onDone: (fullText, fullReasoning, finalMetrics) => {
        renderPending = false;
        assistantMsg.content = fullText;
        assistantMsg.reasoning = fullReasoning;
        assistantMsg.metrics = finalMetrics;

        if (fullReasoning && reasoningWrapEl) {
          reasoningWrapEl.innerHTML = `
            <details class="reasoning-details">
              <summary>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:5px;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Reasoning Analysis (Completed)
              </summary>
              <div class="reasoning-content">${this.escapeHtml(fullReasoning)}</div>
            </details>
          `;
        }

        bodyEl.innerHTML = this.mdRenderer.render(fullText);

        const quizData = this.quizManager.extractQuizData(fullText);
        if (quizData) {
          const interactiveQuiz = this.quizManager.renderInteractiveQuiz(quizData, `quiz-widget-${assistantIndex}`);
          bodyEl.appendChild(interactiveQuiz);
        }

        const flashcardData = this.studentStudio.extractFlashcardData(fullText);
        if (flashcardData) {
          const flashcardWidget = this.studentStudio.createFlashcardWidget(flashcardData, `flashcard-widget-${assistantIndex}`);
          if (flashcardWidget) bodyEl.appendChild(flashcardWidget);
        }

        if (speedBadgeEl) {
          speedBadgeEl.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>${finalMetrics.tokensPerSec} t/s • ${finalMetrics.elapsedSec}s`;
        }

        // Render Action Bar beneath completed assistant message
        this.renderAssistantActionBar(row, assistantIndex, assistantMsg);

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
    if (this.currentAttachedPdf && (!this.quizTopic.value || !this.quizTopic.value.trim())) {
      this.quizTopic.value = this.currentAttachedPdf.title.replace(/\.pdf$/i, '');
    }
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

  // Voice Dictation (Groq Whisper Large v3 Turbo)
  async toggleVoiceRecording() {
    if (this.isRecordingVoice) {
      await this.stopVoiceRecording();
    } else {
      await this.startVoiceRecording();
    }
  }

  async startVoiceRecording() {
    const apiKey = (this.settings.apiKey || '').trim();
    if (!apiKey) {
      this.openSettings();
      alert('Please enter your Groq API key in Settings to use Voice Dictation.');
      return;
    }

    try {
      if (window.grauqueApi && window.grauqueApi.requestMicPermission) {
        await window.grauqueApi.requestMicPermission();
      }

      this.audioChunks = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.voiceStream = stream;

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecordingVoice = true;
        this.btnMicPrompt?.classList.add('recording');
        if (this.micStatusLabel) this.micStatusLabel.textContent = 'Listening...';
        if (this.voiceRecordingBanner) this.voiceRecordingBanner.style.display = 'flex';
        if (this.voiceBannerText) this.voiceBannerText.textContent = 'Listening... Speak your prompt clearly';
      };

      this.mediaRecorder.start(250);
    } catch (err) {
      console.error('[Grauque] Microphone recording error:', err);
      alert(`Could not start microphone recording: ${err.message || err}. Please ensure microphone permission is granted in macOS System Settings > Privacy & Security > Microphone.`);
      this.resetVoiceUI();
    }
  }

  async stopVoiceRecording() {
    if (!this.mediaRecorder || !this.isRecordingVoice) return;

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        if (this.voiceStream) {
          this.voiceStream.getTracks().forEach(t => t.stop());
          this.voiceStream = null;
        }

        if (this.voiceBannerText) {
          this.voiceBannerText.textContent = 'Transcribing with Groq Whisper Large v3 Turbo...';
        }

        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        this.resetVoiceUI();

        if (audioBlob.size < 1000) {
          resolve();
          return;
        }

        try {
          const transcribedText = await this.groqClient.transcribeAudio(audioBlob);
          if (transcribedText && transcribedText.trim()) {
            const current = this.chatInput.value.trim();
            this.chatInput.value = current ? `${current} ${transcribedText.trim()}` : transcribedText.trim();
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 180) + 'px';
            this.chatInput.focus();
          }
        } catch (transcribeErr) {
          console.error('[Grauque] Transcription error:', transcribeErr);
          alert(`Voice transcription error: ${transcribeErr.message || transcribeErr}`);
        }
        resolve();
      };

      this.mediaRecorder.stop();
    });
  }

  resetVoiceUI() {
    this.isRecordingVoice = false;
    this.btnMicPrompt?.classList.remove('recording');
    if (this.micStatusLabel) this.micStatusLabel.textContent = 'Voice';
    if (this.voiceRecordingBanner) this.voiceRecordingBanner.style.display = 'none';
  }

  // Flashcard Modal
  openFlashcardModal() {
    if (this.flashcardModal) this.flashcardModal.classList.add('open');
    if (this.currentAttachedPdf && this.flashcardTopic && (!this.flashcardTopic.value || !this.flashcardTopic.value.trim())) {
      this.flashcardTopic.value = this.currentAttachedPdf.title.replace(/\.pdf$/i, '');
    }
    setTimeout(() => this.flashcardTopic?.focus(), 50);
  }

  closeFlashcardModal() {
    if (this.flashcardModal) this.flashcardModal.classList.remove('open');
  }

  handleGenerateFlashcards() {
    const topic = this.flashcardTopic?.value.trim();
    if (!topic) {
      alert('Please enter a subject or topic for your flashcard deck.');
      return;
    }

    const count = parseInt(this.flashcardCount?.value, 10) || 5;
    const focus = this.flashcardFocus?.value || 'High-Yield Concepts';

    let prompt = this.studentStudio.getFlashcardPrompt(topic, count, focus);
    if (this.currentAttachedPdf && this.currentAttachedPdf.text) {
      prompt += `\n\nGenerate cards specifically covering the key points from the attached PDF ("${this.currentAttachedPdf.title}").`;
    }
    this.closeFlashcardModal();

    this.chatInput.value = prompt;
    this.handleSend();
  }

  // Study Guide Modal
  openStudyGuideModal() {
    if (this.studyGuideModal) this.studyGuideModal.classList.add('open');
    if (this.currentAttachedPdf) {
      if (this.studyGuideTopic && (!this.studyGuideTopic.value || !this.studyGuideTopic.value.trim())) {
        this.studyGuideTopic.value = this.currentAttachedPdf.title.replace(/\.pdf$/i, '');
      }
      if (this.studyGuideNotes && (!this.studyGuideNotes.value || !this.studyGuideNotes.value.trim())) {
        this.studyGuideNotes.value = this.currentAttachedPdf.text ? this.currentAttachedPdf.text.slice(0, 10000) : '';
      }
    }
    setTimeout(() => this.studyGuideTopic?.focus(), 50);
  }

  closeStudyGuideModal() {
    if (this.studyGuideModal) this.studyGuideModal.classList.remove('open');
  }

  handleGenerateStudyGuide() {
    const topic = this.studyGuideTopic?.value.trim();
    if (!topic) {
      alert('Please enter a course or topic for your study guide.');
      return;
    }
    const notes = this.studyGuideNotes?.value.trim() || '';

    const prompt = this.studentStudio.getStudyGuidePrompt(topic, notes);
    this.closeStudyGuideModal();

    this.chatInput.value = prompt;
    this.handleSend();
  }

  // Socratic Tutor Modal
  openTutorModal() {
    if (this.tutorModal) this.tutorModal.classList.add('open');
    setTimeout(() => this.tutorProblem?.focus(), 50);
  }

  closeTutorModal() {
    if (this.tutorModal) this.tutorModal.classList.remove('open');
  }

  handleGenerateTutor() {
    const problem = this.tutorProblem?.value.trim();
    if (!problem) {
      alert('Please enter your homework problem or conceptual question.');
      return;
    }
    const style = this.tutorStyle?.value || 'step-by-step';

    const prompt = this.studentStudio.getTutorPrompt(problem, style);
    this.closeTutorModal();

    this.chatInput.value = prompt;
    this.handleSend();
  }

  // Memory Modal Handlers
  openMemoryModal() {
    if (this.settingEnableMemory) {
      this.settingEnableMemory.checked = this.memoryManager.isMemoryEnabled();
    }
    if (this.memoryItemsContainer) {
      this.memoryManager.renderMemoryList(this.memoryItemsContainer);
    }
    this.memoryModal?.classList.add('open');
    setTimeout(() => this.inputNewMemory?.focus(), 50);
  }

  closeMemoryModal() {
    this.memoryModal?.classList.remove('open');
  }

  async handleAddManualMemory() {
    const text = this.inputNewMemory?.value.trim();
    if (!text) return;
    const added = await this.memoryManager.addMemory(text);
    if (added) {
      this.inputNewMemory.value = '';
      this.memoryManager.renderMemoryList(this.memoryItemsContainer);
    }
  }

  // Settings Modal Handlers
  openSettings() {
    this.settingApiKey.value = this.settings.apiKey || '';
    this.ensureModelInDropdown(this.settingDefaultModel, this.settings.model || 'openai/gpt-oss-120b');
    this.settingDefaultModel.value = this.settings.model || 'openai/gpt-oss-120b';
    this.settingTemperature.value = this.settings.temperature ?? 0.7;
    this.labelTempVal.textContent = this.settingTemperature.value;
    this.settingMaxTokens.value = this.settings.maxTokens ?? 4096;
    this.labelTokensVal.textContent = this.settingMaxTokens.value;
    this.settingSystemPrompt.value = this.settings.systemPrompt || '';
    this.settingEnableDoubleOpt.checked = this.settings.enableDoubleOption !== false;
    this.settingEnableOptSpace.checked = this.settings.enableOptionSpace !== false;
    if (this.settingTheme) {
      this.settingTheme.value = 'dark';
    }

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
          this.apiTestBadge.innerHTML = `<span style="color:#10b981; font-weight:600;">Connected (${result.modelCount} models verified)</span>`;
          if (Array.isArray(result.models) && result.models.length > 0) {
            this.updateModelDropdowns(result.models);
          }
        } else {
          this.apiTestBadge.innerHTML = `<span style="color:#ef4444;">Failed: ${this.escapeHtml(result.error)}</span>`;
        }
      }
    } catch (e) {
      this.apiTestBadge.innerHTML = `<span style="color:#ef4444;">Error: ${this.escapeHtml(e.message)}</span>`;
    } finally {
      this.btnTestGroqKey.textContent = 'Test Key';
      this.btnTestGroqKey.disabled = false;
    }
  }

  async handleFetchLiveModels() {
    const key = this.settingApiKey.value.trim();
    if (!key) {
      alert('Please enter your Groq API key first.');
      return;
    }
    this.btnFetchModels.textContent = 'Fetching...';
    this.btnFetchModels.disabled = true;

    try {
      if (window.grauqueApi) {
        const result = await window.grauqueApi.testGroqKey(key);
        if (result.success && Array.isArray(result.models)) {
          this.updateModelDropdowns(result.models);
          alert(`Successfully fetched ${result.models.length} active models from Groq.`);
        } else {
          alert('Failed to fetch models: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (e) {
      alert('Error fetching models: ' + e.message);
    } finally {
      this.btnFetchModels.textContent = 'Fetch Latest Models';
      this.btnFetchModels.disabled = false;
    }
  }

  updateModelDropdowns(modelsList) {
    const dropdowns = [this.bottomModelSelect, this.topModelSelect, this.settingDefaultModel];
    // Filter out decommissioned models
    const filteredModels = modelsList.filter(m => !m.includes('llama') && !m.includes('deepseek'));
    dropdowns.forEach(selectEl => {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      selectEl.innerHTML = '';
      const isSettings = selectEl.id === 'setting-default-model';

      filteredModels.forEach(modelId => {
        const opt = document.createElement('option');
        opt.value = modelId;
        opt.textContent = this.getModelDisplayName(modelId, isSettings);
        selectEl.appendChild(opt);
      });

      if (filteredModels.includes(currentVal)) {
        selectEl.value = currentVal;
      } else {
        selectEl.value = 'openai/gpt-oss-120b';
      }
    });
  }

  async handleSaveSettings() {
    this.settings.apiKey = this.settingApiKey.value.trim();
    this.settings.model = this.settingDefaultModel.value;
    this.settings.temperature = parseFloat(this.settingTemperature.value) || 0.7;
    this.settings.maxTokens = parseInt(this.settingMaxTokens.value, 10) || 4096;
    this.settings.systemPrompt = this.settingSystemPrompt.value.trim();
    this.settings.enableDoubleOption = this.settingEnableDoubleOpt.checked;
    this.settings.enableOptionSpace = this.settingEnableOptSpace.checked;
    this.settings.theme = 'dark';

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
