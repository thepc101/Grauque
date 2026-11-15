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
  }

  // --- Flashcard Generator & Engine ---
  getFlashcardPrompt(topic, count = 5, focus = 'High-Yield Concepts') {
    return `Generate an interactive flashcard study deck about "${topic}".
Focus: ${focus}.
Number of cards: ${count}.

Please format the response in two parts:
1. First, provide a concise high-yield summary of key principles for "${topic}".
2. Second, provide the flashcard deck structured in the following exact JSON code block so the interactive 3D flashcard runner can render it:

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

  getStudyGuidePrompt(topic, notes = '') {
    let p = `Generate a comprehensive Exam Study Guide and High-Yield Cram Sheet for: "${topic}".\n`;
    if (notes && notes.trim()) {
      p += `\nHere are my lecture notes and reference material to synthesize:\n"""\n${notes.trim()}\n"""\n`;
    }
    p += `\nPlease structure the guide with:
1. Core Definitions & Fundamental Concepts
2. High-Yield Exam Topics (Frequently tested concepts)
3. Essential Formulas, Rules & Principles Table
4. Common Exam Traps & Tricky Distinctions to Avoid
5. 3 Rapid-Fire Concept Check Questions`;
    return p;
  }

  getTutorPrompt(problem, approach = 'step-by-step') {
    let styleInstruction = 'Provide a step-by-step solution walkthrough explaining each step clearly.';
    if (approach === 'socratic-hint') {
      styleInstruction = 'Do NOT give away the final answer immediately. Provide Socratic guiding questions and 2 progressive hints to guide the student to the solution.';
    } else if (approach === 'conceptual-analogy') {
      styleInstruction = 'Explain the underlying concept using an intuitive real-world analogy first, then show how the mathematics/logic connects to it.';
    }

    return `I need help solving this problem as my academic tutor:
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

  extractFlashcardData(text) {
    if (!text) return null;
    const match = text.match(/```(?:flashcard-json|json)\s*([\s\S]*?)\s*```/);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      if (data && Array.isArray(data.cards) && data.cards.length > 0) {
        return data;
      }
    } catch (e) {
      // not valid flashcard json
    }
    return null;
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
            Flashcard Deck
          </span>
          <span class="deck-title-text">${this.escape(deckData.title || 'Flashcards')}</span>
        </div>
        <div class="deck-header-actions">
          <span class="deck-counter" id="${deckId}-counter">Card 1 / ${cards.length}</span>
          <button class="deck-tool-btn" id="${deckId}-btn-anki" title="Export Deck to Anki format (.txt)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      <div class="card-scene" id="${deckId}-scene">
        <div class="card-flipper" id="${deckId}-flipper">
          <!-- Front -->
          <div class="card-face card-front">
            <div class="card-face-header">
              <span class="card-category-tag" id="${deckId}-cat-front">${this.escape(cards[0].category || 'Prompt')}</span>
              <span class="card-flip-hint">Click card to reveal answer</span>
            </div>
            <div class="card-body-text" id="${deckId}-text-front">${this.escape(cards[0].front)}</div>
          </div>
          <!-- Back -->
          <div class="card-face card-back">
            <div class="card-face-header">
              <span class="card-category-tag" id="${deckId}-cat-back">Explanation & Answer</span>
              <span class="card-flip-hint">Click card to flip back</span>
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
            <span>Flip Card (Space)</span>
          </button>
          <button class="deck-ctrl-btn" id="${deckId}-btn-next" title="Next card (→)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

        <div class="deck-rating-buttons">
          <button class="rate-btn rate-again" id="${deckId}-rate-again" title="Mark for review">
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
    `;

    setTimeout(() => {
      this.bindDeckEvents(deckId);
    }, 10);

    return wrap;
  }

  getStudyGuideSystemPrompt() {
    return `You are Grauque Study Guide Studio, an expert academic tutor. Create a comprehensive, beautifully structured Exam Study Guide and High-Yield Cram Sheet.
Use crisp GitHub-flavored Markdown formatted with:
# [Subject / Topic Title] — Exam Master Guide

## 1. High-Yield Summary & Core Theory
A concise conceptual breakdown of the fundamental principles.

## 2. Essential Vocabulary & Definitions
A table or bullet list of bulletproof definitions and distinctions.

## 3. Key Formulas, Laws, & Theorems
Step-by-step formulas with variable definitions and units.

## 4. Common Exam Traps & Tricky Distinctions
Pitfalls professors love to test and how to avoid getting tripped up.

## 5. Quick Check Self-Test
3 rapid-fire concept questions to test active recall.

Be direct, insightful, and prioritize high-retention learning.`;
  }

  getTutorSystemPrompt() {
    return `You are Grauque Socratic Tutor, a world-class university tutor in STEM and Humanities. When helping a student solve a problem:
1. Clarify the problem statement and identify the given variables / known facts.
2. State the governing formulas, principles, or theorems needed.
3. Provide a clear, step-by-step walkthrough of the solution with clear explanations for *why* each step is taken.
4. Highlight the key takeaway or general problem-solving pattern.
5. Provide one identical-structure "Test Yourself" practice problem for the student to try.
Format with clean KaTeX-ready math and bold step markers.`;
  }

  // Render an interactive 3D Flashcard Deck Widget inside a chat message
  renderFlashcardDeck(deckData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const deckId = 'deck_' + Math.random().toString(36).substring(2, 9);
    const cards = deckData.cards || [];
    if (!cards.length) return;

    this.activeDecks.set(deckId, {
      title: deckData.title || 'Study Deck',
      subject: deckData.subject || 'General Study',
      cards: cards,
      currentIndex: 0,
      flipped: false,
      mastered: new Set(),
      needsReview: new Set()
    });

    container.innerHTML = `
      <div class="flashcard-deck-widget" id="${deckId}">
        <div class="deck-header">
          <div class="deck-title-row">
            <span class="deck-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              Flashcard Deck
            </span>
            <span class="deck-title-text">${this.escape(deckData.title || 'Flashcards')}</span>
          </div>
          <div class="deck-header-actions">
            <span class="deck-counter" id="${deckId}-counter">Card 1 / ${cards.length}</span>
            <button class="deck-tool-btn" id="${deckId}-btn-anki" title="Export Deck to Anki format (.txt)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <div class="card-scene" id="${deckId}-scene">
          <div class="card-flipper" id="${deckId}-flipper">
            <!-- Front -->
            <div class="card-face card-front">
              <div class="card-face-header">
                <span class="card-category-tag" id="${deckId}-cat-front">${this.escape(cards[0].category || 'Prompt')}</span>
                <span class="card-flip-hint">Click card to reveal answer</span>
              </div>
              <div class="card-body-text" id="${deckId}-text-front">${this.escape(cards[0].front)}</div>
            </div>
            <!-- Back -->
            <div class="card-face card-back">
              <div class="card-face-header">
                <span class="card-category-tag" id="${deckId}-cat-back">Explanation & Answer</span>
                <span class="card-flip-hint">Click card to flip back</span>
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
              <span>Flip Card (Space)</span>
            </button>
            <button class="deck-ctrl-btn" id="${deckId}-btn-next" title="Next card (→)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>

          <div class="deck-rating-buttons">
            <button class="rate-btn rate-again" id="${deckId}-rate-again" title="Mark for review">
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
      </div>
    `;

    this.bindDeckEvents(deckId);
  }

  bindDeckEvents(deckId) {
    const deck = this.activeDecks.get(deckId);
    if (!deck) return;

    const sceneEl = document.getElementById(`${deckId}-scene`);
    const flipperEl = document.getElementById(`${deckId}-flipper`);
    const btnFlip = document.getElementById(`${deckId}-btn-flip`);
    const btnPrev = document.getElementById(`${deckId}-btn-prev`);
    const btnNext = document.getElementById(`${deckId}-btn-next`);
    const btnAnki = document.getElementById(`${deckId}-btn-anki`);

    const flipAction = () => {
      deck.flipped = !deck.flipped;
      flipperEl.classList.toggle('is-flipped', deck.flipped);
    };

    sceneEl?.addEventListener('click', flipAction);
    btnFlip?.addEventListener('click', (e) => {
      e.stopPropagation();
      flipAction();
    });

    const updateCardView = () => {
      const card = deck.cards[deck.currentIndex];
      deck.flipped = false;
      flipperEl.classList.remove('is-flipped');

      document.getElementById(`${deckId}-counter`).textContent = `Card ${deck.currentIndex + 1} / ${deck.cards.length}`;
      document.getElementById(`${deckId}-progress`).style.width = `${((deck.currentIndex + 1) / deck.cards.length) * 100}%`;
      document.getElementById(`${deckId}-cat-front`).textContent = card.category || 'Concept';
      document.getElementById(`${deckId}-text-front`).textContent = card.front;
      document.getElementById(`${deckId}-text-back`).textContent = card.back;
    };

    btnPrev?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (deck.currentIndex > 0) {
        deck.currentIndex--;
        updateCardView();
      }
    });

    btnNext?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (deck.currentIndex < deck.cards.length - 1) {
        deck.currentIndex++;
        updateCardView();
      }
    });

    // Rating handlers
    ['again', 'hard', 'good', 'easy'].forEach(rating => {
      document.getElementById(`${deckId}-rate-${rating}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = deck.cards[deck.currentIndex].id || deck.currentIndex;
        if (rating === 'again' || rating === 'hard') {
          deck.needsReview.add(cardId);
          deck.mastered.delete(cardId);
        } else {
          deck.mastered.add(cardId);
          deck.needsReview.delete(cardId);
        }

        // Auto advance to next card if not at end
        if (deck.currentIndex < deck.cards.length - 1) {
          deck.currentIndex++;
          updateCardView();
        } else {
          this.showDeckSummary(deckId);
        }
      });
    });

    btnAnki?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exportDeckToAnki(deck);
    });
  }

  showDeckSummary(deckId) {
    const deck = this.activeDecks.get(deckId);
    if (!deck) return;
    const widget = document.getElementById(deckId);
    if (!widget) return;

    widget.innerHTML = `
      <div class="deck-summary-view">
        <div class="summary-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 class="summary-heading">Deck Review Completed!</h3>
        <p class="summary-desc">You practiced all ${deck.cards.length} flashcards in <strong>${this.escape(deck.title)}</strong>.</p>
        
        <div class="summary-stats-row">
          <div class="stat-box stat-mastered">
            <span class="stat-number">${deck.mastered.size}</span>
            <span class="stat-label">Mastered</span>
          </div>
          <div class="stat-box stat-review">
            <span class="stat-number">${deck.needsReview.size}</span>
            <span class="stat-label">Need Review</span>
          </div>
          <div class="stat-box stat-total">
            <span class="stat-number">${deck.cards.length}</span>
            <span class="stat-label">Total Cards</span>
          </div>
        </div>

        <div class="summary-actions">
          <button class="btn-primary" id="${deckId}-btn-restart">Study Deck Again</button>
          <button class="btn-secondary" id="${deckId}-btn-anki-export">Export to Anki (.txt)</button>
        </div>
      </div>
    `;

    document.getElementById(`${deckId}-btn-restart`)?.addEventListener('click', () => {
      deck.currentIndex = 0;
      deck.mastered.clear();
      deck.needsReview.clear();
      this.renderFlashcardDeck({
        title: deck.title,
        subject: deck.subject,
        cards: deck.cards
      }, deckId + '-parent');
    });

    document.getElementById(`${deckId}-btn-anki-export`)?.addEventListener('click', () => {
      this.exportDeckToAnki(deck);
    });
  }

  exportDeckToAnki(deck) {
    let tsv = `#separator:tab\n#html:false\n#tags:${deck.subject || 'Grauque'}\n`;
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
    // Play subtle audio tone using Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
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
      
      const proceed = confirm(`Focus session completed!\nGreat job staying in the zone. Time for a ${breakMins}-minute break. Switch to break timer?`);
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
