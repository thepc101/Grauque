class QuizManager {
  constructor(app) {
    this.app = app;
  }

  getQuizPrompt(topic, count = 5, difficulty = 'Intermediate') {
    return `Generate a comprehensive interactive multiple-choice quiz about "${topic}".
Difficulty: ${difficulty}.
Number of questions: ${count}.

Please format the response in two parts:
1. First, provide an engaging educational introduction to the topic.
2. Second, provide the quiz structured in the following exact JSON code block so the interactive quiz runner can render it for the student:

\`\`\`quiz-json
{
  "title": "${topic} Quiz",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "answerIndex": 0,
      "explanation": "Clear explanation of why this answer is correct."
    }
  ]
}
\`\`\`

3. Finally, provide 2-3 key takeaways or study tips related to ${topic}.`;
  }

  // Parse structured quiz JSON from markdown code block
  extractQuizData(text) {
    if (!text) return null;
    const match = text.match(/```(?:quiz-json|json)\s*([\s\S]*?)\s*```/);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        return data;
      }
    } catch (e) {
      // not valid quiz json
    }
    return null;
  }

  // Render an interactive HTML widget for the quiz
  renderInteractiveQuiz(quizData, containerId) {
    const container = document.createElement('div');
    container.className = 'interactive-quiz-container';
    container.id = containerId || `quiz-${Date.now()}`;

    let score = 0;
    let answeredCount = 0;
    const totalQuestions = quizData.questions.length;

    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = `
      <div class="quiz-title-row">
        <span class="quiz-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Assessment
        </span>
        <span class="quiz-difficulty">${quizData.difficulty || 'General'}</span>
      </div>
      <h3 class="quiz-main-title">${this.escapeHtml(quizData.title || 'Knowledge Check')}</h3>
      <div class="quiz-score-bar" id="${container.id}-score-bar">
        <span>Answered: <b id="${container.id}-answered">0</b> / ${totalQuestions}</span>
        <span>Score: <b id="${container.id}-score">0</b></span>
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
      qTitle.innerHTML = `<strong>Q${qIndex + 1}.</strong> ${this.escapeHtml(q.question)}`;
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
        `;

        optBtn.addEventListener('click', () => {
          if (questionAnswered) return;
          questionAnswered = true;
          answeredCount++;

          const isCorrect = optIndex === q.answerIndex;
          if (isCorrect) {
            score++;
            optBtn.classList.add('correct');
          } else {
            optBtn.classList.add('incorrect');
            const buttons = optionsGrid.querySelectorAll('.quiz-opt-btn');
            if (buttons[q.answerIndex]) {
              buttons[q.answerIndex].classList.add('correct-revealed');
            }
          }

          optionsGrid.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
          explanationBox.style.display = 'block';

          const answeredEl = document.getElementById(`${container.id}-answered`);
          const scoreEl = document.getElementById(`${container.id}-score`);
          if (answeredEl) answeredEl.textContent = answeredCount;
          if (scoreEl) scoreEl.textContent = score;

          if (answeredCount === totalQuestions) {
            summaryBox.style.display = 'block';
            const pct = Math.round((score / totalQuestions) * 100);
            summaryScore.textContent = `${score} / ${totalQuestions} (${pct}%)`;
            if (pct >= 80) {
              summaryFeedback.textContent = 'Outstanding mastery of the subject matter.';
            } else if (pct >= 60) {
              summaryFeedback.textContent = 'Solid understanding. Review the explanations above for missed concepts.';
            } else {
              summaryFeedback.textContent = 'Review the key takeaways and try the assessment again to reinforce learning.';
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
          Explanation:
        </div>
        <div class="exp-text">${this.escapeHtml(q.explanation || 'No explanation provided.')}</div>
      `;
      qCard.appendChild(explanationBox);

      questionsList.appendChild(qCard);
    });

    container.appendChild(questionsList);

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
      <button class="retake-quiz-btn" id="${container.id}-retake">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:5px;">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        Retake Assessment
      </button>
    `;
    container.appendChild(summaryBox);

    const summaryScore = summaryBox.querySelector(`#${container.id}-final-score`);
    const summaryFeedback = summaryBox.querySelector(`#${container.id}-feedback`);
    const retakeBtn = summaryBox.querySelector(`#${container.id}-retake`);

    retakeBtn.addEventListener('click', () => {
      const newEl = this.renderInteractiveQuiz(quizData, containerId);
      container.replaceWith(newEl);
    });

    return container;
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

window.QuizManager = QuizManager;
