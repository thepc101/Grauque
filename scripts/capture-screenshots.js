const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, '../assets/screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Register IPC handlers so renderer doesn't error out
ipcMain.handle('settings:get', () => ({
  apiKey: 'gsk_mock_valid_groq_key_demo',
  model: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 800,
  systemPrompt: 'You are Grauque, an exceptionally capable and efficient AI assistant powered by Groq.',
  enableDoubleOption: true,
  enableOptionSpace: true,
  enableMemory: true,
  memories: [
    'Majoring in Biochemistry & Computational Biology',
    'Prefers interactive recall quizzes with KaTeX formulas',
    'Study schedule: Final exam in 2 weeks'
  ],
  theme: 'dark'
}));

ipcMain.handle('settings:save', () => ({ success: true }));
ipcMain.handle('system:check-accessibility', () => true);
ipcMain.handle('system:open-accessibility-settings', () => true);
ipcMain.handle('system:open-external', () => true);
ipcMain.handle('system:request-mic-permission', async () => true);
ipcMain.handle('pdf:parse', async () => ({ text: 'Oxidative phosphorylation lecture slides', numPages: 24 }));
ipcMain.handle('pdf:pick-file', async () => null);

app.whenReady().then(async () => {
  const mockConversations = [
    {
      id: 'demo-respiration',
      title: 'Cellular Respiration & Chemiosmosis',
      pinned: true,
      updatedAt: Date.now(),
      messages: [
        {
          role: 'user',
          content: 'Can you analyze our biology lecture on oxidative phosphorylation, summarize the core electrochemical equations with KaTeX, and generate an interactive exam-grade assessment?',
          pdf: {
            title: 'Bio_Lecture_08_Respiration.pdf',
            totalPages: 24,
            wordCount: 8420
          },
          timestamp: Date.now() - 7200000
        },
        {
          role: 'assistant',
          model: 'Grauque Max',
          reasoning: 'Synthesizing 24 lecture slides on chemiosmosis and Complex I-IV stoichiometry across the inner mitochondrial membrane. Formulating governing chemical equations and proton motive force ($\\Delta p = \\Delta \\Psi - \\frac{2.3 RT}{F} \\Delta \\text{pH}$). Generating an interactive 3-question active recall assessment with instant grading and grounding.',
          content: `### Cellular Respiration & Oxidative Phosphorylation

Oxidative phosphorylation couples the exergonic transfer of electrons from $\\text{NADH}$ and $\\text{FADH}_2$ to molecular oxygen ($\\text{O}_2$) with the endergonic synthesis of $\\text{ATP}$.

#### 1. Governing Bioenergetic Equation
$$\\ce{NADH + H+ + 1/2 O2 + 3 ADP + 3 Pi -> NAD+ + H2O + 3 ATP}$$

#### 2. Mitchell Chemiosmotic Hypothesis & Proton Motive Force
As electrons cascade through Complexes I, III, and IV, protons ($\\text{H}^+$) are pumped from the matrix into the intermembrane space, generating an electrochemical **proton motive force** ($\\Delta p$):
$$\\Delta p = \\Delta \\Psi - \\frac{2.303 RT}{F} \\Delta \\text{pH}$$

Where:
- $\\Delta \\Psi \\approx 160-180\\text{ mV}$ (membrane electrical potential)
- $\\Delta \\text{pH} \\approx 0.5-1.0$ (chemical proton concentration gradient)
- Protons flowing back through the $\\text{F}_0$ rotor of **ATP Synthase (Complex V)** drive rotational catalysis in $\\text{F}_1$ to produce $\\text{ATP}$.

\`\`\`quiz-json
{
  "title": "Oxidative Phosphorylation Active Recall",
  "difficulty": "STEM Exam Grade",
  "questions": [
    {
      "question": "Which enzyme complex in the electron transport chain is also an integral component of the Citric Acid (Krebs) Cycle?",
      "options": [
        "Complex I (NADH Dehydrogenase)",
        "Complex II (Succinate Dehydrogenase)",
        "Complex III (Cytochrome bc1 Complex)",
        "Complex IV (Cytochrome c Oxidase)"
      ],
      "answerIndex": 1,
      "explanation": "Succinate dehydrogenase oxidizes succinate to fumarate in the Krebs cycle while transferring electrons directly to FAD and ubiquinone (Q) within the inner membrane."
    },
    {
      "question": "What is the primary thermodynamic consequence of 2,4-Dinitrophenol (DNP) on mitochondria?",
      "options": [
        "Direct competitive inhibition of Complex IV binding to O2",
        "Proton uncoupling that dissipates Δp without halting electron flow",
        "Irreversible phosphorylation of ATP synthase beta subunits",
        "Blockade of pyruvate transport across the outer membrane"
      ],
      "answerIndex": 1,
      "explanation": "DNP is a lipid-soluble proton ionophore that shuttles protons across the inner membrane, collapsing the proton gradient and releasing energy as heat."
    },
    {
      "question": "What is the theoretical maximum net ATP yield from one molecule of glucose in eukaryotic cells?",
      "options": [
        "2 ATP",
        "12 to 14 ATP",
        "30 to 32 ATP",
        "36 to 38 ATP"
      ],
      "answerIndex": 2,
      "explanation": "Modern stoichiometric ratios (2.5 ATP per NADH, 1.5 ATP per FADH2) yield 30 to 32 ATP depending on shuttle usage."
    }
  ]
}
\`\`\`
`,
          metrics: {
            tokensPerSec: 312,
            elapsedSec: '0.9'
          },
          timestamp: Date.now() - 7100000
        },
        {
          role: 'user',
          content: 'Now build an interactive 3D flashcard study deck with Leitner spaced repetition, plus a NotebookLM spoken audio overview deep dive.',
          timestamp: Date.now() - 3600000
        },
        {
          role: 'assistant',
          model: 'Grauque Max',
          reasoning: 'Structuring 3 high-yield flashcards with front/back cues, category badges, and keyboard shortcuts. Compiling a NotebookLM-style 2-minute spoken study briefing on chemiosmosis and ATP synthase rotor dynamics.',
          content: `### NotebookLM Audio Overview: Cellular Respiration Deep Dive
Welcome to your 2-minute high-yield exam briefing on Cellular Respiration. Today we break down chemiosmosis, how Complex I through IV pump protons to create the proton motive force, and the rotational mechanics of ATP synthase.

\`\`\`flashcard-json
{
  "title": "Oxidative Phosphorylation Mastery Deck",
  "subject": "Biochemistry & Biophysics",
  "cards": [
    {
      "id": 1,
      "front": "What directly drives the rotation of the c-ring rotor in ATP Synthase (Complex V)?",
      "back": "Protons binding to Asp61 residues in the c-ring as they traverse the two half-channels of the a-subunit, causing conformational rotation.",
      "category": "Molecular Mechanics"
    },
    {
      "id": 2,
      "front": "Why does cytosolic NADH produce 1.5 ATP via the glycerol-3-phosphate shuttle vs 2.5 ATP via the malate-aspartate shuttle?",
      "back": "The glycerol-3-phosphate shuttle transfers electrons to mitochondrial FAD (bypassing Complex I), whereas malate-aspartate shuttles electrons directly to mitochondrial NAD+.",
      "category": "Metabolic Stoichiometry"
    },
    {
      "id": 3,
      "front": "Which respiratory complex does Cyanide (CN-) inhibit, and what is its specific molecular target?",
      "back": "Complex IV (Cytochrome c Oxidase), by binding to the heme a3-CuB binuclear center and halting terminal electron transfer to oxygen.",
      "category": "Pharmacology & Toxicology"
    }
  ]
}
\`\`\`
`,
          metrics: {
            tokensPerSec: 284,
            elapsedSec: '1.1'
          },
          timestamp: Date.now() - 3500000
        }
      ]
    },
    {
      id: 'demo-quantum',
      title: 'Quantum Harmonic Oscillator & Hermite Polynomials',
      pinned: true,
      updatedAt: Date.now() - 86400000,
      messages: []
    },
    {
      id: 'demo-ochem',
      title: 'Organic Chemistry II Diels-Alder Stereochemistry',
      pinned: false,
      updatedAt: Date.now() - 172800000,
      messages: []
    },
    {
      id: 'demo-ml',
      title: 'Transformer Attention & FlashAttention-2',
      pinned: false,
      updatedAt: Date.now() - 259200000,
      messages: []
    }
  ];

  // 1. Create Main Window
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    show: false,
    backgroundColor: '#0E0E12',
    webPreferences: {
      preload: path.join(__dirname, '../src/main/preload.js'),
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, '../src/renderer/index.html'));

  // Pre-seed mock data and force render
  await win.webContents.executeJavaScript(`
    (async () => {
      try {
        const mockData = ${JSON.stringify(mockConversations)};
        localStorage.setItem('grauque_conversations', JSON.stringify(mockData));
        localStorage.setItem('grauque_active_id', 'demo-respiration');
        if (window.app) {
          window.app.conversations = mockData;
          window.app.setActiveConversation('demo-respiration');
        }
      } catch (e) {
        console.error('Seed error:', e);
      }
    })();
  `);

  await new Promise(r => setTimeout(r, 1200));

  // Interact with Question 1 on the quiz to show the correct feedback green state & explanation
  await win.webContents.executeJavaScript(`
    try {
      const qCard = document.querySelector('.quiz-q-card');
      if (qCard) {
        const btns = qCard.querySelectorAll('.quiz-opt-btn');
        if (btns && btns[1]) {
          btns[1].click();
        }
      }
    } catch(e) {}
  `);

  await new Promise(r => setTimeout(r, 300));

  // Scroll to top of chat to capture Main Overview
  await win.webContents.executeJavaScript(`
    const container = document.getElementById('messages-container');
    if (container) container.scrollTop = 0;
  `);
  await new Promise(r => setTimeout(r, 400));

  const imgMain = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'grauque-main.png'), imgMain.toPNG());
  console.log('[Capture] Saved grauque-main.png (' + imgMain.getSize().width + 'x' + imgMain.getSize().height + ')');

  // Scroll to show Flashcards & NotebookLM Audio Overview
  await win.webContents.executeJavaScript(`
    const audioCard = document.querySelector('.notebooklm-audio-widget');
    if (audioCard) {
      audioCard.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      const flashcardEl = document.querySelector('.flashcard-deck-widget');
      if (flashcardEl) flashcardEl.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  `);
  await new Promise(r => setTimeout(r, 400));

  const imgStudy = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'grauque-study-suite.png'), imgStudy.toPNG());
  console.log('[Capture] Saved grauque-study-suite.png (' + imgStudy.getSize().width + 'x' + imgStudy.getSize().height + ')');

  // 2. Capture Quick Prompt Window
  const quickWin = new BrowserWindow({
    width: 820,
    height: 340,
    show: false,
    backgroundColor: '#0c0d12',
    webPreferences: {
      preload: path.join(__dirname, '../src/main/preload.js'),
      contextIsolation: true
    }
  });

  await quickWin.loadFile(path.join(__dirname, '../src/renderer/quick-prompt.html'));

  await quickWin.webContents.executeJavaScript(`
    try {
      document.body.style.background = 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.15) 0%, rgba(12, 13, 18, 0.98) 75%)';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';
      document.body.style.height = '100vh';
      document.body.style.margin = '0';
      document.body.style.padding = '30px';

      const input = document.getElementById('prompt-input');
      if (input) {
        input.value = 'Generate an active recall assessment on ATP Synthase Complex V';
      }
    } catch(e) {}
  `);

  await new Promise(r => setTimeout(r, 300));

  const imgQuick = await quickWin.webContents.capturePage();
  fs.writeFileSync(path.join(outputDir, 'grauque-quick-prompt.png'), imgQuick.toPNG());
  console.log('[Capture] Saved grauque-quick-prompt.png (' + imgQuick.getSize().width + 'x' + imgQuick.getSize().height + ')');

  app.quit();
});
