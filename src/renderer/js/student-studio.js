class StudentStudio {
  constructor(appInstance) {
    this.app = appInstance;
    this.activeDecks = new Map(); // deckId -> deckState
    this.timerInterval = null;
    this.timerSeconds = 25 * 60;
    this.timerTotalSeconds = 25 * 60;
    this.timerMode = 'focus'; // focus, shortBreak, longBreak
    this.timerRunning = false;
    this.sessionsCompleted = 0;

    // Audio Overview synthesis state
    this.activeAudioUtterance = null;
    this.audioOverviewPlaying = false;
    this.audioPlaybackRate = 1.05;
  }

  // --- Flashcard Generator & Engine ---
  getFlashcardPrompt(topic, count = 6, focus = 'High-Yield Concepts', attachedDocTitle = '') {
    let groundingClause = '';
    if (attachedDocTitle) {
      groundingClause = `\nThe cards must be strictly grounded in and directly extract key concepts, terms, and principles from the attached document: "${attachedDocTitle}".`;
    }

    return `Generate an interactive flashcard study deck about "${topic}".
Focus: ${focus}.
Number of cards: ${count}.${groundingClause}

Please format the response in two parts:
1. First, provide a concise high-yield summary of key principles for "${topic}".
2. Second, provide the flashcard deck structured inside the following exact JSON code block so the interactive 3D flashcard runner can render it:

\`\`\`flashcard-json
{
  "title": "${topic} Flashcards",
  "subject": "${topic}",
  "cards": [
    {
      "id": 1,
      "front": "Front of card: concept, question, or term to define",
      "back": "Back of card: clear, high-yield explanation or definition",
      "category": "${focus}"
    }
  ]
}
\`\`\`

3. Finally, list 2 high-yield exam tips to remember when studying ${topic}.`;
  }

  getStudyGuidePrompt(topic, notes = '', attachedDocTitle = '') {
    let p = `Generate a comprehensive NotebookLM-style Exam Study Guide and High-Yield Cram Sheet for: "${topic}".\n`;
    if (attachedDocTitle) {
      p += `\nGround this guide directly on the attached source document: "${attachedDocTitle}".\n`;
    }
    if (notes && notes.trim()) {
      p += `\nReference lecture notes & materials:\n"""\n${notes.trim()}\n"""\n`;
    }
    p += `\nPlease structure the guide with:
1. Executive Briefing & Core Theory
2. High-Yield Key Concepts Glossary
3. Essential Equations, Laws, & Principles Reference Table
4. Common Exam Traps & Tricky Distinctions to Avoid
5. Rapid-Fire Self-Check Practice Questions with Answers`;
    return p;
  }

  getTutorPrompt(problem, approach = 'step-by-step', attachedDocTitle = '') {
    let styleInstruction = 'Provide a step-by-step solution walkthrough explaining each step clearly.';
    if (approach === 'socratic-hint') {
      styleInstruction = 'Do NOT give away the final answer immediately. Provide Socratic guiding questions and 2 progressive hints to guide the student to the solution.';
    } else if (approach === 'conceptual-analogy') {
      styleInstruction = 'Explain the underlying concept using an intuitive real-world analogy first, then show how the mathematics/logic connects to it.';
    }

    let docGrounding = '';
    if (attachedDocTitle) {
      docGrounding = `\nContext: Grounded on problem set / chapter from "${attachedDocTitle}".\n`;
    }

    return `I need help solving this problem as my academic tutor:${docGrounding}
"""
${problem}
"""

Tutoring Approach: ${styleInstruction}

Please include:
1. Problem breakdown (given information & target)
2. Governing laws, formulas, or theorems
3. Step-by-step resolution with clear explanations of *why* each step is taken
4. Key takeaway or pattern to recognize on exams
5. One similar practice problem for me to try`;
  }

  cleanAndParseJson(str) {
    if (!str) return null;
    const trimmed = str.trim();
    try {
      return JSON.parse(trimmed);
    } catch (e1) {
      try {
        let cleaned = trimmed
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        return JSON.parse(cleaned);
      } catch (e2) {
        return null;
      }
    }
  }

  // Resilient Flashcard Extraction (JSON code blocks or markdown fallback)
  extractFlashcardData(text) {
    if (!text) return null;

    // 1. Try finding JSON code blocks
    const codeBlockRegex = /```(?:flashcard-json|json)?\s*([\s\S]*?)\s*```/gi;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.startsWith('{') && (candidate.includes('"cards"') || candidate.includes('cards'))) {
        const parsed = this.cleanAndParseJson(candidate);
        if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          return this.normalizeFlashcardData(parsed);
        }
      }
    }

    // Check raw un-fenced JSON
    const rawJsonMatch = text.match(/(\{\s*"title"[\s\S]*?"cards"\s*:\s*\[[\s\S]*?\]\s*\})/i);
    if (rawJsonMatch) {
      const parsed = this.cleanAndParseJson(rawJsonMatch[1]);
      if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return this.normalizeFlashcardData(parsed);
      }
    }

    // 2. Fallback: Parse markdown flashcards
    const markdownCards = this.parseMarkdownFlashcards(text);
    if (markdownCards && markdownCards.cards.length >= 2) {
      return this.normalizeFlashcardData(markdownCards);
    }

    return null;
  }

  parseMarkdownFlashcards(text) {
    if (!text) return null;
    const cards = [];

    // Pattern 1: Front: ... Back: ... or Q: ... A: ...
    const p1 = /(?:^|\n)\s*(?:\d+[\.\)]\s*)?(?:Front|Q|Question)\s*[:\-]\s*([^\n]+)\s*\n\s*(?:Back|A|Answer|Definition)\s*[:\-]\s*([^\n]+)/gi;
    let m1;
    while ((m1 = p1.exec(text)) !== null) {
      cards.push({
        id: cards.length + 1,
        front: m1[1].replace(/[*_~`#]/g, '').trim(),
        back: m1[2].replace(/[*_~`#]/g, '').trim(),
        category: 'Core Recall'
      });
    }

    if (cards.length >= 2) {
      return {
        title: 'Study Flashcards',
        subject: 'General Study',
        cards: cards
      };
    }

    // Pattern 2: Term: ... Definition: ...
    const p2 = /(?:^|\n)\s*(?:\d+[\.\)]\s*)?(?:Term|Concept)\s*[:\-]\s*([^\n]+)\s*\n\s*(?:Definition|Meaning|Explanation)\s*[:\-]\s*([^\n]+)/gi;
    let m2;
    while ((m2 = p2.exec(text)) !== null) {
      cards.push({
        id: cards.length + 1,
        front: m2[1].replace(/[*_~`#]/g, '').trim(),
        back: m2[2].replace(/[*_~`#]/g, '').trim(),
        category: 'Definitions'
      });
    }

    if (cards.length >= 2) {
      return {
        title: 'Study Flashcards',
        subject: 'Definitions',
        cards: cards
      };
    }

    // Pattern 3: Numbered bold terms: 1. **Term**: Definition or - **Term**: Definition
    const p3 = /(?:^|\n)\s*(?:\d+[\.\)]|\-|\*)\s*\*\*([^\*]+)\*\*\s*[:\-–]\s*([^\n]+)/g;
    let m3;
    while ((m3 = p3.exec(text)) !== null) {
      cards.push({
        id: cards.length + 1,
        front: m3[1].trim(),
        back: m3[2].trim(),
        category: 'High-Yield Concept'
      });
    }

    if (cards.length >= 2) {
      return {
        title: 'High-Yield Study Cards',
        subject: 'Core Concepts',
        cards: cards
      };
    }

    return null;
  }

  normalizeFlashcardData(data) {
    const cards = (data.cards || []).map((c, idx) => ({
      id: c.id || (idx + 1),
      front: String(c.front || c.question || c.term || `Card ${idx + 1}`).trim(),
      back: String(c.back || c.answer || c.definition || 'No definition provided.').trim(),
      category: String(c.category || data.subject || 'High-Yield').trim()
    }));

    return {
      title: data.title || 'Flashcard Deck',
      subject: data.subject || 'General Study',
      cards: cards
    };
  }

  createFlashcardWidget(deckData, widgetId) {
    const deckId = widgetId || ('deck_' + Math.random().toString(36).substring(2, 9));
    const cards = deckData.cards || [];
    if (!cards.length) return null;

    this.activeDecks.set(deckId, {
      title: deckData.title || 'Study Deck',
      subject: deckData.subject || 'General Study',
      cards: cards,
      currentIndex: 0,
      flipped: false,
      mastered: new Set(),
      needsReview: new Set()
    });

    const wrap = document.createElement('div');
    wrap.className = 'flashcard-deck-widget';
    wrap.id = deckId;

    wrap.innerHTML = `
      <div class="deck-header">
        <div class="deck-title-row">
          <span class="deck-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            Interactive Flashcard Deck
          </span>
          <span class="deck-title-text">${this.escape(deckData.title || 'Flashcards')}</span>
        </div>
        <div class="deck-header-actions">
          <span class="deck-counter" id="${deckId}-counter">Card 1 / ${cards.length}</span>
          <button class="deck-tool-btn" id="${deckId}-btn-shuffle" title="Shuffle deck cards">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
            <span>Shuffle</span>
          </button>
          <button class="deck-tool-btn" id="${deckId}-btn-anki" title="Export Deck to Anki format (.txt)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export Anki</span>
          </button>
        </div>
      </div>

      <div class="deck-progress-bar">
        <div class="deck-progress-fill" id="${deckId}-progress" style="width: ${(1 / cards.length) * 100}%;"></div>
      </div>

      <!-- 3D Card Scene -->
      <div class="card-scene" id="${deckId}-scene" tabindex="0" title="Click or press Space to flip">
        <div class="card-flipper" id="${deckId}-flipper">
          <!-- Front -->
          <div class="card-face card-front">
            <div class="card-face-header">
              <span class="card-category-tag" id="${deckId}-cat-front">${this.escape(cards[0].category || 'Prompt')}</span>
              <span class="card-flip-hint">Click or Space to flip</span>
            </div>
            <div class="card-body-text" id="${deckId}-text-front">${this.escape(cards[0].front)}</div>
          </div>
          <!-- Back -->
          <div class="card-face card-back">
            <div class="card-face-header">
              <span class="card-category-tag" id="${deckId}-cat-back">High-Yield Answer</span>
              <span class="card-flip-hint">Click or Space to flip back</span>
            </div>
            <div class="card-body-text" id="${deckId}-text-back">${this.escape(cards[0].back)}</div>
          </div>
        </div>
      </div>

      <!-- Rating & Navigation Controls -->
      <div class="deck-controls">
        <div class="deck-nav-buttons">
          <button class="deck-ctrl-btn" id="${deckId}-btn-prev" title="Previous card (←)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <button class="deck-flip-trigger-btn" id="${deckId}-btn-flip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Flip (Space)</span>
          </button>
          <button class="deck-ctrl-btn" id="${deckId}-btn-next" title="Next card (→)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        <div class="deck-rating-buttons">
          <button class="rate-btn rate-again" id="${deckId}-rate-again" title="Mark for review (Again)">
            <span>Again</span>
          </button>
          <button class="rate-btn rate-hard" id="${deckId}-rate-hard" title="Hard to recall">
            <span>Hard</span>
          </button>
          <button class="rate-btn rate-good" id="${deckId}-rate-good" title="Good recall">
            <span>Good</span>
          </button>
          <button class="rate-btn rate-easy" id="${deckId}-rate-easy" title="Mastered effortlessly">
            <span>Easy</span>
          </button>
        </div>
      </div>

      <div class="deck-mastery-stats" id="${deckId}-stats">
        <span>Mastered: <b id="${deckId}-stat-mastered" style="color:#10b981;">0</b></span>
        <span>Needs Review: <b id="${deckId}-stat-review" style="color:#f59e0b;">0</b></span>
      </div>
    `;

    setTimeout(() => {
      this.bindDeckEvents(deckId);
    }, 10);

    return wrap;
  }

  bindDeckEvents(deckId) {
    const state = this.activeDecks.get(deckId);
    if (!state) return;

    const scene = document.getElementById(`${deckId}-scene`);
    const flipper = document.getElementById(`${deckId}-flipper`);
    const btnFlip = document.getElementById(`${deckId}-btn-flip`);
    const btnPrev = document.getElementById(`${deckId}-btn-prev`);
    const btnNext = document.getElementById(`${deckId}-btn-next`);
    const btnShuffle = document.getElementById(`${deckId}-btn-shuffle`);
    const btnAnki = document.getElementById(`${deckId}-btn-anki`);

    const rateAgain = document.getElementById(`${deckId}-rate-again`);
    const rateHard = document.getElementById(`${deckId}-rate-hard`);
    const rateGood = document.getElementById(`${deckId}-rate-good`);
    const rateEasy = document.getElementById(`${deckId}-rate-easy`);

    const flipCard = () => {
      state.flipped = !state.flipped;
      if (flipper) {
        flipper.style.transform = state.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
      }
    };

    scene?.addEventListener('click', flipCard);
    btnFlip?.addEventListener('click', flipCard);

    // Keyboard navigation when scene is focused
    scene?.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      }
    });

    const updateCardView = () => {
      state.flipped = false;
      if (flipper) flipper.style.transform = 'rotateY(0deg)';

      const card = state.cards[state.currentIndex];
      const textFront = document.getElementById(`${deckId}-text-front`);
      const textBack = document.getElementById(`${deckId}-text-back`);
      const catFront = document.getElementById(`${deckId}-cat-front`);
      const counter = document.getElementById(`${deckId}-counter`);
      const progress = document.getElementById(`${deckId}-progress`);

      if (textFront) textFront.textContent = card.front;
      if (textBack) textBack.textContent = card.back;
      if (catFront) catFront.textContent = card.category || 'High-Yield';
      if (counter) counter.textContent = `Card ${state.currentIndex + 1} / ${state.cards.length}`;
      if (progress) progress.style.width = `${((state.currentIndex + 1) / state.cards.length) * 100}%`;

      const statMastered = document.getElementById(`${deckId}-stat-mastered`);
      const statReview = document.getElementById(`${deckId}-stat-review`);
      if (statMastered) statMastered.textContent = state.mastered.size;
      if (statReview) statReview.textContent = state.needsReview.size;
    };

    const nextCard = () => {
      if (state.currentIndex < state.cards.length - 1) {
        state.currentIndex++;
      } else {
        state.currentIndex = 0; // loop
      }
      updateCardView();
    };

    const prevCard = () => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
      } else {
        state.currentIndex = state.cards.length - 1;
      }
      updateCardView();
    };

    btnNext?.addEventListener('click', nextCard);
    btnPrev?.addEventListener('click', prevCard);

    btnShuffle?.addEventListener('click', () => {
      for (let i = state.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.cards[i], state.cards[j]] = [state.cards[j], state.cards[i]];
      }
      state.currentIndex = 0;
      updateCardView();
    });

    const rateCurrentCard = (type) => {
      const cardId = state.cards[state.currentIndex].id;
      if (type === 'easy' || type === 'good') {
        state.mastered.add(cardId);
        state.needsReview.delete(cardId);
      } else {
        state.needsReview.add(cardId);
        state.mastered.delete(cardId);
      }
      nextCard();
    };

    rateAgain?.addEventListener('click', () => rateCurrentCard('again'));
    rateHard?.addEventListener('click', () => rateCurrentCard('hard'));
    rateGood?.addEventListener('click', () => rateCurrentCard('good'));
    rateEasy?.addEventListener('click', () => rateCurrentCard('easy'));

    btnAnki?.addEventListener('click', () => {
      this.exportDeckToAnki(deckId);
    });
  }

  exportDeckToAnki(deckId) {
    const deck = this.activeDecks.get(deckId);
    if (!deck) return;

    let tsv = `#separator:tab\n#html:true\n#tags column:3\n`;
    deck.cards.forEach(card => {
      const front = card.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      const back = card.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
      tsv += `${front}\t${back}\t${card.category || ''}\n`;
    });

    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(deck.title || 'flashcards').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_anki.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- NotebookLM Audio Overview Deep Dive Widget ---
  createAudioOverviewWidget(title, summaryScript, widgetId) {
    const audioId = widgetId || ('audio_' + Math.random().toString(36).substring(2, 9));
    const container = document.createElement('div');
    container.className = 'notebooklm-audio-widget';
    container.id = audioId;

    container.innerHTML = `
      <div class="audio-overview-card">
        <div class="audio-card-header">
          <div class="audio-icon-pulse">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </div>
          <div class="audio-title-meta">
            <span class="audio-badge">NotebookLM Audio Overview</span>
            <h4 class="audio-main-title">${this.escape(title || 'Study Deep Dive Briefing')}</h4>
          </div>
        </div>

        <div class="audio-waveform-container" id="${audioId}-waveform">
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
        </div>

        <div class="audio-player-controls">
          <button class="audio-play-btn" id="${audioId}-play" title="Play / Pause Audio Deep Dive">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" id="${audioId}-play-icon">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span id="${audioId}-play-label">Play Deep Dive</span>
          </button>

          <button class="audio-stop-btn" id="${audioId}-stop" title="Stop Audio">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"></rect>
            </svg>
          </button>

          <div class="audio-rate-picker">
            <button class="audio-speed-btn active" data-speed="1.0" id="${audioId}-speed-1">1.0x</button>
            <button class="audio-speed-btn" data-speed="1.25" id="${audioId}-speed-125">1.25x</button>
            <button class="audio-speed-btn" data-speed="1.5" id="${audioId}-speed-15">1.5x</button>
          </div>
        </div>

        <details class="audio-transcript-details">
          <summary>Show Audio Overview Transcript</summary>
          <div class="audio-transcript-text">${this.escape(summaryScript)}</div>
        </details>
      </div>
    `;

    setTimeout(() => {
      this.bindAudioWidgetEvents(audioId, summaryScript);
    }, 10);

    return container;
  }

  bindAudioWidgetEvents(audioId, scriptText) {
    const playBtn = document.getElementById(`${audioId}-play`);
    const stopBtn = document.getElementById(`${audioId}-stop`);
    const playIcon = document.getElementById(`${audioId}-play-icon`);
    const playLabel = document.getElementById(`${audioId}-play-label`);
    const waveform = document.getElementById(`${audioId}-waveform`);
    const speedButtons = document.querySelectorAll(`#${audioId} .audio-speed-btn`);

    let currentRate = 1.05;

    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRate = parseFloat(btn.getAttribute('data-speed')) || 1.0;
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          // Restart with new rate
          window.speechSynthesis.cancel();
          startSpeaking();
        }
      });
    });

    const cleanScript = scriptText
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\$\$[\s\S]*?\$\$/g, '')
      .replace(/[*_~`#>-]/g, ' ')
      .trim();

    const startSpeaking = () => {
      if (!window.speechSynthesis) {
        alert('Speech synthesis is not supported on this device.');
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanScript);
      utterance.rate = currentRate;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Samantha') || v.name.includes('Alex')));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        this.audioOverviewPlaying = true;
        waveform?.classList.add('active');
        if (playIcon) playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
        if (playLabel) playLabel.textContent = 'Pause';
      };

      utterance.onend = () => {
        this.audioOverviewPlaying = false;
        waveform?.classList.remove('active');
        if (playIcon) playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        if (playLabel) playLabel.textContent = 'Play Deep Dive';
      };

      utterance.onerror = () => {
        this.audioOverviewPlaying = false;
        waveform?.classList.remove('active');
        if (playIcon) playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        if (playLabel) playLabel.textContent = 'Play Deep Dive';
      };

      window.speechSynthesis.speak(utterance);
    };

    playBtn?.addEventListener('click', () => {
      if (!window.speechSynthesis) return;

      if (window.speechSynthesis.speaking) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          waveform?.classList.add('active');
          if (playIcon) playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>';
          if (playLabel) playLabel.textContent = 'Pause';
        } else {
          window.speechSynthesis.pause();
          waveform?.classList.remove('active');
          if (playIcon) playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
          if (playLabel) playLabel.textContent = 'Resume';
        }
      } else {
        startSpeaking();
      }
    });

    stopBtn?.addEventListener('click', () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      waveform?.classList.remove('active');
      if (playIcon) playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      if (playLabel) playLabel.textContent = 'Play Deep Dive';
    });
  }

  // --- Pomodoro Focus Timer ---
  initTimerUI() {
    this.timerPill = document.getElementById('pomodoro-timer-pill');
    this.timerDisplay = document.getElementById('pomodoro-time-text');
    this.timerBtnToggle = document.getElementById('btn-timer-toggle');
    this.timerBtnReset = document.getElementById('btn-timer-reset');

    this.timerBtnToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTimer();
    });

    this.timerBtnReset?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetTimer();
    });

    this.updateTimerDisplay();
  }

  toggleTimer() {
    if (this.timerRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    if (this.timerRunning) return;
    this.timerRunning = true;
    this.timerPill?.classList.add('timer-active');
    if (this.timerBtnToggle) {
      this.timerBtnToggle.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
      this.timerBtnToggle.title = 'Pause Focus Timer';
    }

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        this.updateTimerDisplay();
      } else {
        this.handleTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
    this.timerPill?.classList.remove('timer-active');
    if (this.timerBtnToggle) {
      this.timerBtnToggle.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      this.timerBtnToggle.title = 'Start Focus Timer';
    }
  }

  resetTimer(mode = 'focus') {
    this.pauseTimer();
    this.timerMode = mode;
    if (mode === 'focus') {
      this.timerSeconds = 25 * 60;
    } else if (mode === 'shortBreak') {
      this.timerSeconds = 5 * 60;
    } else if (mode === 'longBreak') {
      this.timerSeconds = 15 * 60;
    }
    this.timerTotalSeconds = this.timerSeconds;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (this.timerDisplay) {
      this.timerDisplay.textContent = formatted;
    }
  }

  handleTimerComplete() {
    this.pauseTimer();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // ignore
    }

    if (this.timerMode === 'focus') {
      this.sessionsCompleted++;
      const nextMode = (this.sessionsCompleted % 4 === 0) ? 'longBreak' : 'shortBreak';
      const breakMins = nextMode === 'longBreak' ? 15 : 5;
      
      const proceed = confirm(`Focus session completed!\nTime for a ${breakMins}-minute break. Switch to break timer?`);
      if (proceed) {
        this.resetTimer(nextMode);
        this.startTimer();
      } else {
        this.resetTimer('focus');
      }
    } else {
      alert(`Break is over. Ready to return to studying?`);
      this.resetTimer('focus');
    }
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.StudentStudio = StudentStudio;
