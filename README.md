<p align="center">
  <img src="build/icon.png" width="96" height="96" alt="Grauque Logo" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(2,132,199,0.25);" />
</p>

<h1 align="center">Grauque</h1>

<p align="center">
  <strong>Ultra-fast, intelligent macOS desktop assistant powered by Groq.</strong><br>
  Featuring native Apple PDFKit document analysis, persistent AI memory, Groq Whisper voice dictation, LaTeX math rendering, an interactive student study suite, and a double-tap Option spotlight search.
</p>

<p align="center">
  <a href="https://github.com/thepc101/grauque/releases/download/v1.0.1/Grauque-1.0.1.dmg"><img src="https://img.shields.io/badge/Download-macOS%20Intel%20(DMG)-8B5CF6?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS DMG" /></a>
  <a href="https://github.com/thepc101/grauque/releases/latest"><img src="https://img.shields.io/github/v/release/thepc101/grauque?style=for-the-badge&label=Latest%20Release&color=A855F7" alt="Latest Release" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-10.15+%20(Intel%20x86__64)-black?logo=apple" alt="macOS Version" />
  <img src="https://img.shields.io/badge/Engine-Groq%20LPU%20Inference-f55036?logo=speedtest&logoColor=white" alt="Groq Inference" />
  <img src="https://img.shields.io/badge/PDF-Apple%20PDFKit%20Native-0071e3?logo=apple" alt="Apple PDFKit" />
  <img src="https://img.shields.io/badge/Speech-Whisper%20Large%20v3-00a67e" alt="Whisper Voice" />
  <img src="https://img.shields.io/badge/Math-KaTeX%20LaTeX-3298dc" alt="KaTeX Math" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [Apple Dark Obsidian Brand Aesthetic](#apple-dark-obsidian-brand-aesthetic)
  - [Clean, Uncrammed Workspace & Study Tools Menu](#clean-uncrammed-workspace--study-tools-menu)
  - [Native Apple PDFKit Document Intelligence](#native-apple-pdfkit-document-intelligence)
  - [Persistent AI Memory](#persistent-ai-memory)
  - [Student Study Suite](#student-study-suite)
  - [Groq Whisper Voice-to-Text](#groq-whisper-voice-to-text)
  - [Mathematical LaTeX & Chemistry (KaTeX)](#mathematical-latex--chemistry-katex)
  - [Global Double-Tap Option (⌥⌥) Quick Prompt](#global-double-tap-option--quick-prompt)
  - [Multimodal Vision with Grauque Image](#multimodal-vision-with-grauque-image)
  - [Real-Time Streaming & Productivity](#real-time-streaming--productivity)
- [Supported Models](#supported-models)
- [Installation](#installation)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Building from Source](#building-from-source)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [License](#license)

---

## Overview

**Grauque** (pronounced */ɡʁok/*) is a native macOS desktop assistant built specifically for Intel Macs (`x86_64`) that connects directly to Groq's low-latency inference engine. Delivering responses at up to **250+ tokens per second**, Grauque features an Apple dark obsidian aesthetic with subtle gradient accents, typography powered by SF Pro, and high-productivity tools tailored for students, researchers, and developers.

---

## Key Features

### Apple Dark Obsidian Brand Aesthetic
- **Minimalist Vector Identity**: A modern, geometric levitation glyph combining an upward quantum trajectory with an orbital loop, styled with electric cyan, vibrant azure, and deep indigo.
- **Refined Dark Surfaces**: Solid obsidian panels (`#14141A`), subtle 1px border framing, and a soft feathered bloom around the prompt area.
- **San Francisco Typography**: Native Apple SF Pro typography with smooth antialiasing and proportional font metrics.

---

### Clean, Uncrammed Workspace & Study Tools Menu
- **3-Line Study Tools Menu**: All student learning features are neatly organized into a floating popup menu next to the input box—keeping your chat workspace clean, spacious, and distraction-free.
- **Under-Prompt Model Selector**: Switch AI models effortlessly right from the bottom bar directly underneath the prompt box.
- **Unified Attachment Button**: A single intuitive attachment button that seamlessly accepts both images (diagrams, homework, photos) and PDF documents.
- **Minimalist Voice Dictation Button**: A clean, circular microphone button right inside the prompt box with live audio-waveform pulsation.
- **Unobstructed macOS Window Controls**: Traffic light buttons (close, minimize, fullscreen) are fully spaced and never collide with sidebar or header buttons.

---

### Native Apple PDFKit Document Intelligence
- **Hardware-Accelerated Extraction**: Uses macOS's native `PDFKit.framework` compiled via Objective-C (`bin/pdf-extract`) to parse lecture slides, research papers, syllabi, and textbooks in milliseconds with 100% unicode and layout fidelity.
- **Zero Cloud Leakage**: PDF extraction happens 100% locally on your Mac—no third-party cloud parsing services.
- **Drag-and-Drop & Attach**: Click the PDF attachment button, paste from your clipboard, or drag and drop any `.pdf` file directly onto the chat input.
- **Interactive Action Pills**: Attached documents display page and word counts, with instant 1-click workflows:
  - **Summarize**: Generates a high-yield executive summary highlighting core takeaways.
  - **Flashcards**: Instantly creates a 3D study deck based on the PDF.
  - **Quiz**: Builds a multiple-choice knowledge check from the document.
- **Smart Token Preservation**: Automatically caps historical turn context to prevent exceeding Groq output tokens per minute (OTPM) limits.

---

### Persistent AI Memory
- **Conversational Memory Detection**: Simply chat naturally (e.g. *"Remember that my name is thepc101"*, *"Remember that I'm taking Organic Chemistry and prefer concise explanations"*, *"Note that I use Python and PyTorch"*). Grauque automatically detects the intent, updates your personal memory profile, and confirms with a toast notification.
- **Permanent Context Injection**: Your saved background, courses, and preferences are automatically injected into the system prompt across all current and future chats.
- **Dedicated Memory Modal**: Click the Memory button in the top bar to inspect, manually add, delete, or clear memories at any time.

---

### Student Study Suite

Built to optimize learning, active recall, and focus:

1. **Flashcard Deck Studio**:
   - Generates interactive 3D flip-cards with front/back views.
   - Self-grading Leitner difficulty ratings (**Again**, **Hard**, **Good**, **Easy**) with real-time mastery counters.
   - **1-Click Export to Anki (`.txt`)**: Seamlessly import your generated decks into Anki desktop or mobile.
2. **Exam Study Guide & Cram Sheet Generator**:
   - Distills lecture notes and syllabus outlines into concise, high-yield exam cheat sheets with formulas, definitions, and common test pitfalls.
3. **Socratic Step-by-Step Problem Solver**:
   - Offers guided STEM tutoring with two modes: full step-by-step solutions or hint-only progressive assistance so you learn without spoiling answers.
4. **Pomodoro Study Focus Timer**:
   - Built-in 25-minute focus intervals and 5-minute break timers right in the header bar with completion audio chime.
5. **Interactive Multiple-Choice Quiz Studio**:
   - Custom quiz generator with instant answer validation, scoring metrics, and deep explanations.

---

### Groq Whisper Voice-to-Text
- Click the microphone button in the prompt toolbar to speak your prompts.
- Audio is transcribed directly through Groq's high-speed `whisper-large-v3-turbo` model with near-zero latency.
- Visual live pulsing dot and transcription banner.

---

### Mathematical LaTeX & Chemistry (KaTeX)
- Full local rendering for inline math (`$...$`) and display equation blocks (`$$...$$`).
- Chemistry equation support via `mhchem` (e.g. $\ce{6CO2 + 6H2O -> C6H12O6 + 6O2}$).
- Cleans and formats all line breaks without raw `<br>` tags.
- Price protection prevents dollar amounts like `$50` from falsely rendering as LaTeX.

---

### Global Double-Tap Option (`⌥⌥`) Quick Prompt
- Tap the `Option` (`⌥`) key twice from any application in macOS to summon a spotlight-style floating quick prompt.
- Press `Enter` to automatically switch focus to Grauque and begin streaming the response immediately.
- Includes global fallback shortcut (`⌥Space`) that works with or without macOS Accessibility permissions.

---

### Multimodal Vision with Grauque Image
- Upload diagrams, handwritten homework, textbook figures, or UI mockups via file picker, paste, or drag-and-drop.
- Automatically selects the vision model (`Grauque Image` / `qwen/qwen3.8-27b`).
- Built-in dynamic image compressor downscales large images to keep you well under Groq OTPM caps.

---

### Real-Time Streaming & Productivity
- Real-time token streaming speed indicator (e.g. `240 tokens/s • 0.8s`).
- Collapsible reasoning/thinking analysis accordion for models that emit chain-of-thought tokens.
- Message action bars: 1-click Copy, Read Aloud (TTS), Retry turn, and Export to Markdown.
- User message editing with inline prompt modification and branching re-generation.
- Slash command menu (`/quiz`, `/flashcards`, `/cram`, `/tutor`, `/code`, `/summarize`, `/explain`, `/math`).
- Real-time conversation search and pin support.
- Deep research mode toggle and AI persona switcher.

---

## Supported Models

| Rebranded Name | Underlying Engine | Best For | Context |
| :--- | :--- | :--- | :--- |
| **Grauque Max** | `openai/gpt-oss-120b` | **Default Reasoning**: Deep thinking, math, coding, study guides, and complex analysis | 131k |
| **Grauque Image** | `qwen/qwen3.8-27b` | **Multimodal Vision**: Image inspection, homework diagrams, visual charts, and diagrams | 131k |
| **Grauque Medium** | `openai/gpt-oss-20b` | **Ultra-Fast Everyday**: Quick questions and rapid conversational assistance | 131k |
| **Grauque Low** | `allam-2-7b` | **Lightweight Inference**: Minimal latency for straightforward queries | 8k |
| **Whisper** | `whisper-large-v3-turbo` | **Voice Dictation**: Instant audio-to-text transcription | Audio |

*You can also click **Fetch Latest Models** in Settings to dynamically discover newly released models on your Groq account.*

---

## Installation

1. Download the latest installer: **[Grauque-1.0.1-mac-x64.dmg](https://github.com/thepc101/grauque/releases/download/v1.0.1/Grauque-1.0.1.dmg)** (or grab the latest DMG from [Releases](https://github.com/thepc101/grauque/releases/latest)).
2. Double-click the DMG to open the installer window.
3. Drag **Grauque** into your **Applications** folder.
4. Launch **Grauque** from Applications or Spotlight (`⌘Space`).
5. Open **Settings** (`⌘,`) and paste your Groq API key (get one for free at [console.groq.com/keys](https://console.groq.com/keys)).

> **macOS Accessibility Permission**: To enable global double-tap Option (`⌥⌥`) invocation, grant accessibility permission in **System Settings > Privacy & Security > Accessibility** when prompted.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`⌥ ⌥`** *(Double-tap Option)* | Summon floating quick prompt from anywhere in macOS |
| **`⌥ Space`** | Universal global spotlight fallback |
| **`⌘ K`** | Start a new conversation |
| **`⌘ B`** | Toggle sidebar collapse |
| **`⌘ ,`** | Open Settings |
| **`Enter`** | Send prompt |
| **`Shift + Enter`** | Insert new line |

---

## Building from Source

### Prerequisites
- macOS 10.15 Catalina or newer (Intel `x86_64`)
- Node.js 18+ and `npm`
- Clang / Xcode Command Line Tools (`xcode-select --install`)

```bash
# 1. Clone the repository
git clone https://github.com/thepc101/grauque.git
cd grauque

# 2. Install dependencies
npm install

# 3. Compile native helpers (double-tap listener and PDFKit extractor)
npm run compile-helper

# 4. Run in development mode
npm start

# 5. Build production DMG installer
npm run dist
```

---

## Architecture & Tech Stack

```
Grauque/
├── bin/
│   ├── opt-tap-listener       # Native C/Cocoa event tap for ⌥⌥ detection
│   └── pdf-extract            # Native Apple PDFKit hardware-accelerated text extractor
├── src/
│   ├── main/
│   │   ├── main.js            # Electron main process, window management, IPC handlers
│   │   ├── preload.js         # Secure contextBridge IPC bridge
│   │   ├── pdf-parser.js      # Dual-engine PDF service (PDFKit + Node stream fallback)
│   │   └── native/            # Objective-C source files for native compilation
│   └── renderer/
│       ├── index.html         # Editorial UI structure and modals
│       ├── css/claude.css     # Typography, themes, animations, KaTeX styling
│       └── js/
│           ├── app.js                 # App coordinator, event orchestration, state
│           ├── groq-client.js         # Low-latency streaming SSE client & Whisper API
│           ├── memory-manager.js      # Persistent AI memory & intent detection
│           ├── student-studio.js      # Flashcards, Cram sheets, Tutor, Focus timer
│           ├── quiz-manager.js        # Multiple-choice active recall engine
│           └── markdown-renderer.js   # Markdown-it + KaTeX math rendering
└── release/
    └── Grauque-1.0.1-mac-x64.dmg     # Ultra-compressed distributable disk image
```

---

## License

This project is licensed under the [MIT License](LICENSE).
