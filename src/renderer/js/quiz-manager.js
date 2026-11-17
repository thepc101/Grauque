class QuizManager {
  constructor(app) {
    this.app = app;
  }

  getQuizPrompt(topic, count = 5, difficulty = 'Intermediate', attachedDocTitle = '') {
    let groundingClause = '';
    if (attachedDocTitle) {
      groundingClause = `Base every question on the attached document "${attachedDocTitle}". Only mention page numbers when they are present in the source text.\n`;
    }

    return `Create exactly ${count} ${difficulty.toLowerCase()} multiple-choice questions about "${topic}".
${groundingClause}
Return only one \`\`\`quiz-json code block. Do not add an introduction, conclusion, or text outside the block. Make every question self-contained, provide exactly four distinct options, use a zero-based answerIndex, and include a concise explanation. Ensure the JSON is valid and complete.

\`\`\`quiz-json
{
  "title": "Knowledge Check",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Why the correct answer is right."
    }
  ]
}
\`\`\`
`;
  }

  // Sanitize and safely parse potentially malformed JSON (e.g. trailing commas, unescaped chars)
  cleanAndParseJson(str) {
    if (!str) return null;
    const trimmed = str.trim();
    try {
      return JSON.parse(trimmed);
    } catch (e1) {
      try {
        // Strip trailing commas before closing } or ]
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

  // Extract quiz data from JSON code block OR fallback to markdown multiple-choice parsing
  extractQuizData(text) {
    if (!text) return null;

    // 1. Try finding JSON code block (quiz-json, json, or raw json object)
    const codeBlockRegex = /```(?:quiz-json|json)?\s*([\s\S]*?)\s*```/gi;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.startsWith('{') && (candidate.includes('"questions"') || candidate.includes('questions'))) {
        const parsed = this.cleanAndParseJson(candidate);
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          const normalized = this.normalizeQuizData(parsed);
          if (normalized.questions.length > 0) return normalized;
        }
      }
    }

    // Check for raw un-fenced JSON object with "questions"
    const rawJsonMatch = text.match(/(\{\s*"title"[\s\S]*?"questions"\s*:\s*\[[\s\S]*?\]\s*\})/i);
    if (rawJsonMatch) {
      const parsed = this.cleanAndParseJson(rawJsonMatch[1]);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const normalized = this.normalizeQuizData(parsed);
        if (normalized.questions.length > 0) return normalized;
      }
    }

    // 2. Fallback: Parse standard Markdown multiple-choice quizzes
    const markdownQuiz = this.parseMarkdownQuiz(text);
    if (markdownQuiz && markdownQuiz.questions.length >= 1) {
      return this.normalizeQuizData(markdownQuiz);
    }

    return null;
  }

  // Parse markdown multiple-choice format (e.g. 1. Question? A) ... B) ... Answer: B)
  parseMarkdownQuiz(text) {
    if (!text) return null;

    const hasOptions = /[A-Da-d][\)\.]\s+[^\n]+/.test(text);
    const hasAnswer = /(?:Answer|Correct Answer|Correct|Key)\s*[:\-]/i.test(text);
    if (!hasOptions && !hasAnswer) return null;

    const questions = [];
    // Split by question numbers: e.g. '1. ', '2. ', 'Q1.', '**1.**', '## Question 1'
    const blocks = text.split(/\n(?=(?:(?:\*\*|\b)?(?:Q\d+|\d+)[\.\)]|\#\#\s*Question\s*\d+))/i);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      // Extract question text
      const qMatch = trimmed.match(/^(?:(?:\*\*|\b)?(?:Q\d+|\d+)[\.\)]|\#\#\s*Question\s*\d+[:\.]?)\s*([^\n]+)/i);
      if (!qMatch) continue;
      const questionText = qMatch[1].replace(/[*_~`#]/g, '').trim();

      // Extract options: A) ..., B) ..., etc.
      const optRegex = /(?:^|\n)\s*[-*]?\s*[\(\[]?([A-Da-d])[\)\.\:]\s*([^\n]+)/g;
      const options = [];
      const letters = [];
      let optMatch;
      while ((optMatch = optRegex.exec(trimmed)) !== null) {
        letters.push(optMatch[1].toUpperCase());
        options.push(optMatch[2].replace(/[*_~`]/g, '').trim());
      }

      if (options.length < 2) continue;

      // Extract correct answer: Answer: B, **Answer:** B, Answer: (B)
      const ansMatch = trimmed.match(/(?:Answer|Correct Answer|Correct|Key)\s*[:\-]?\s*[\*\*_]*\s*[\(\[]?([A-Da-d])[\)\]]?/i);
      let answerIndex = -1;
      if (ansMatch) {
        const letter = ansMatch[1].toUpperCase();
        const foundIdx = letters.indexOf(letter);
        if (foundIdx !== -1) {
          answerIndex = foundIdx;
        } else {
          const charCode = letter.charCodeAt(0) - 65;
          if (charCode >= 0 && charCode < options.length) answerIndex = charCode;
        }
      }
      if (answerIndex < 0) continue;

      // Extract explanation
      const expMatch = trimmed.match(/(?:Explanation|Rationale|Note|Why)\s*[:\-]?\s*[\*\*_]*\s*([^\n]+(?:\n(?!\n|\d+\.)[^\n]+)*)/i);
      const explanation = expMatch ? expMatch[1].replace(/[*_~`]/g, '').trim() : 'Review the concept breakdown above for full context.';

      questions.push({
        question: questionText,
        options: options,
        answerIndex: answerIndex,
        explanation: explanation
      });
    }

    if (questions.length >= 1) {
      return {
        title: 'Interactive Knowledge Assessment',
        difficulty: 'Comprehensive',
        questions: questions
      };
    }

    return null;
  }

  // Ensure clean uniform question attributes
  normalizeQuizData(data) {
    const questions = (Array.isArray(data.questions) ? data.questions : [])
      .map((q, idx) => {
        const optionSource = q.options ?? q.choices ?? q.answers;
        const rawOptions = Array.isArray(optionSource)
          ? optionSource
          : (optionSource && typeof optionSource === 'object'
            ? Object.keys(optionSource).sort().map(key => optionSource[key])
            : []);
        const options = rawOptions.map(option => String(option ?? '').trim()).filter(Boolean);
        const answer = q.answer ?? q.correctAnswer ?? q.correct_answer;
        let ansIdx = Number.parseInt(q.answerIndex, 10);

        if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx >= options.length) {
          if (typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < options.length) {
            ansIdx = answer;
          } else if (typeof answer === 'string') {
            const letter = answer.trim().match(/^([A-F])(?:[\).:]|\s|$)/i)?.[1]?.toUpperCase();
            const letterIndex = letter ? letter.charCodeAt(0) - 65 : -1;
            const textIndex = options.findIndex(option => option.toLowerCase() === answer.trim().toLowerCase());
            ansIdx = letterIndex >= 0 && letterIndex < options.length ? letterIndex : textIndex;
          }
        }

        return {
          id: idx + 1,
          question: String(q.question || q.prompt || '').trim(),
          options,
          answerIndex: ansIdx,
          explanation: String(q.explanation || q.rationale || 'Review the source material for more context.').trim()
        };
      })
      .filter(q => q.question && q.options.length >= 2 &&
        Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length);

    return {
      title: data.title || 'Knowledge Assessment',
      difficulty: data.difficulty || 'Intermediate',
      questions: questions
    };
  }

  // Play subtle feedback chime using Web Audio API
  playAudioChime(type = 'correct') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        osc.frequency.exponentialRampToValueAtTime(220.00, ctx.currentTime + 0.2); // A3
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio not permitted or available
    }
  }

  // Render an interactive HTML widget for the quiz
  renderInteractiveQuiz(quizData, containerId) {
    const container = document.createElement('div');
    container.className = 'interactive-quiz-container';
    container.id = containerId || `quiz-${Date.now()}`;

    let score = 0;
    let answeredCount = 0;
    const totalQuestions = quizData.questions.length;
    const missedQuestions = [];

    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = `
      <div class="quiz-title-row">
        <span class="quiz-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Active Recall Assessment
        </span>
        <span class="quiz-difficulty">${this.escapeHtml(quizData.difficulty || 'Comprehensive')}</span>
      </div>
      <h3 class="quiz-main-title">${this.escapeHtml(quizData.title || 'Knowledge Assessment')}</h3>
      <div class="quiz-score-bar" id="${container.id}-score-bar">
        <span>Progress: <b id="${container.id}-answered">0</b> / ${totalQuestions} answered</span>
        <span>Score: <b id="${container.id}-score" style="color:var(--accent);">0</b> / ${totalQuestions}</span>
      </div>
      <div class="quiz-progress-track">
        <div class="quiz-progress-fill" id="${container.id}-progress-fill" style="width:0%;"></div>
      </div>
    `;
    container.appendChild(header);

    const questionsList = document.createElement('div');
    questionsList.className = 'quiz-questions-list';

    quizData.questions.forEach((q, qIndex) => {
      const qCard = document.createElement('div');
      qCard.className = 'quiz-q-card';
      qCard.id = `${container.id}-q-${qIndex}`;

      const qTitle = document.createElement('div');
      qTitle.className = 'quiz-q-title';
      qTitle.innerHTML = `
        <span class="q-number-pill">Q${qIndex + 1}</span>
        <span class="q-text-content">${this.escapeHtml(q.question)}</span>
      `;
      qCard.appendChild(qTitle);

      const optionsGrid = document.createElement('div');
      optionsGrid.className = 'quiz-options-grid';

      const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
      let questionAnswered = false;

      q.options.forEach((optText, optIndex) => {
        const optBtn = document.createElement('button');
        optBtn.className = 'quiz-opt-btn';
        optBtn.innerHTML = `
          <span class="opt-letter">${optionLetters[optIndex] || (optIndex + 1)}</span>
          <span class="opt-text">${this.escapeHtml(optText)}</span>
          <span class="opt-result-icon"></span>
        `;

        optBtn.addEventListener('click', () => {
          if (questionAnswered) return;
          questionAnswered = true;
          answeredCount++;

          const isCorrect = (optIndex === q.answerIndex);
          if (isCorrect) {
            score++;
            optBtn.classList.add('correct');
            const icon = optBtn.querySelector('.opt-result-icon');
            if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            this.playAudioChime('correct');
          } else {
            optBtn.classList.add('incorrect');
            const icon = optBtn.querySelector('.opt-result-icon');
            if (icon) icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            missedQuestions.push({
              question: q.question,
              correctAnswer: q.options[q.answerIndex] || 'Correct choice',
              explanation: q.explanation
            });
            const buttons = optionsGrid.querySelectorAll('.quiz-opt-btn');
            if (buttons[q.answerIndex]) {
              buttons[q.answerIndex].classList.add('correct-revealed');
              const revIcon = buttons[q.answerIndex].querySelector('.opt-result-icon');
              if (revIcon) revIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            }
            this.playAudioChime('incorrect');
          }

          optionsGrid.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
          explanationBox.style.display = 'block';

          // Update header stats
          const answeredEl = document.getElementById(`${container.id}-answered`);
          const scoreEl = document.getElementById(`${container.id}-score`);
          const fillEl = document.getElementById(`${container.id}-progress-fill`);
          if (answeredEl) answeredEl.textContent = answeredCount;
          if (scoreEl) scoreEl.textContent = score;
          if (fillEl) fillEl.style.width = `${Math.round((answeredCount / totalQuestions) * 100)}%`;

          // If all answered, show assessment report card
          if (answeredCount === totalQuestions) {
            summaryBox.style.display = 'block';
            const pct = Math.round((score / totalQuestions) * 100);
            
            let grade = 'A+';
            let feedback = 'Outstanding mastery of the subject matter. You have thoroughly internalized these concepts.';
            let badgeClass = 'grade-a';

            if (pct >= 90) {
              grade = 'A';
              badgeClass = 'grade-a';
              feedback = 'Exceptional understanding! You are in great shape for exams on this topic.';
            } else if (pct >= 80) {
              grade = 'B';
              badgeClass = 'grade-b';
              feedback = 'Solid comprehension. Review the explanations for missed concepts above.';
            } else if (pct >= 70) {
              grade = 'C';
              badgeClass = 'grade-c';
              feedback = 'Good foundation. Focus on the core explanations and try retaking the test to reinforce memory.';
            } else {
              grade = 'Review Needed';
              badgeClass = 'grade-needs-review';
              feedback = 'These concepts need reinforcement. Review the explanations above or generate flashcards below.';
            }

            summaryScore.innerHTML = `
              <span class="quiz-grade-badge ${badgeClass}">${grade}</span>
              <span class="quiz-score-num">${score} / ${totalQuestions} (${pct}%)</span>
            `;
            summaryFeedback.textContent = feedback;

            // Show Missed Questions button if any
            if (missedQuestions.length > 0 && btnMakeFlashcardsFromMissed) {
              btnMakeFlashcardsFromMissed.style.display = 'inline-flex';
            }
          }
        });

        optionsGrid.appendChild(optBtn);
      });

      qCard.appendChild(optionsGrid);

      const explanationBox = document.createElement('div');
      explanationBox.className = 'quiz-explanation-box';
      explanationBox.style.display = 'none';
      explanationBox.innerHTML = `
        <div class="exp-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Concept Explanation & Grounding:
        </div>
        <div class="exp-text">${this.escapeHtml(q.explanation || 'Review source material for full context.')}</div>
      `;
      qCard.appendChild(explanationBox);

      questionsList.appendChild(qCard);
    });

    container.appendChild(questionsList);

    // Summary Assessment Box
    const summaryBox = document.createElement('div');
    summaryBox.className = 'quiz-summary-box';
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = `
      <div class="summary-congrats">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px; margin-right:6px; color:#10b981;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        Assessment Completed
      </div>
      <div class="summary-score-large" id="${container.id}-final-score"></div>
      <div class="summary-feedback" id="${container.id}-feedback"></div>
      <div class="quiz-summary-actions">
        <button class="retake-quiz-btn" id="${container.id}-retake">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:5px;">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          Retake Assessment
        </button>
        <button class="retake-quiz-btn" id="${container.id}-export" style="background:var(--bg-app); border-color:var(--border-color); color:var(--text-secondary);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:5px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Questions (.md)
        </button>
        <button class="retake-quiz-btn" id="${container.id}-missed-flashcards" style="display:none; background:rgba(168, 85, 247, 0.12); border-color:rgba(168,85,247,0.3); color:var(--accent);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:5px;">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          Flashcards for Missed
        </button>
      </div>
    `;
    container.appendChild(summaryBox);

    const summaryScore = summaryBox.querySelector(`#${container.id}-final-score`);
    const summaryFeedback = summaryBox.querySelector(`#${container.id}-feedback`);
    const retakeBtn = summaryBox.querySelector(`#${container.id}-retake`);
    const exportBtn = summaryBox.querySelector(`#${container.id}-export`);
    const btnMakeFlashcardsFromMissed = summaryBox.querySelector(`#${container.id}-missed-flashcards`);

    retakeBtn.addEventListener('click', () => {
      const newEl = this.renderInteractiveQuiz(quizData, containerId);
      container.replaceWith(newEl);
    });

    exportBtn?.addEventListener('click', () => {
      let md = `# ${quizData.title || 'Quiz'}\n\n`;
      quizData.questions.forEach((q, idx) => {
        md += `### ${idx + 1}. ${q.question}\n`;
        q.options.forEach((opt, oIdx) => {
          const letter = ['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || (oIdx + 1);
          const isCorrect = oIdx === q.answerIndex ? ' (Correct Answer)' : '';
          md += `- **${letter}**: ${opt}${isCorrect}\n`;
        });
        md += `\n**Explanation**: ${q.explanation}\n\n---\n\n`;
      });

      navigator.clipboard.writeText(md).then(() => {
        exportBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied Questions!`;
        setTimeout(() => {
          exportBtn.innerHTML = `Export Questions (.md)`;
        }, 2000);
      });
    });

    btnMakeFlashcardsFromMissed?.addEventListener('click', () => {
      if (missedQuestions.length === 0 || !this.app) return;
      const prompt = `Create an interactive flashcard study deck focusing specifically on these concepts I missed on the quiz:\n` +
        missedQuestions.map((m, i) => `${i + 1}. Concept: ${m.question}\nCorrect Answer: ${m.correctAnswer}\nWhy: ${m.explanation}`).join('\n\n');
      
      this.app.chatInput.value = prompt;
      this.app.handleSend();
    });

    return container;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.QuizManager = QuizManager;
