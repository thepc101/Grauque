# Grauque

> Ultra-fast desktop AI assistant for macOS powered by Groq, featuring editorial-grade typography, interactive quizzes, and a double-tap Option spotlight search.

[![macOS](https://img.shields.io/badge/macOS-Intel%20(x64)-black?logo=apple)](release/Grauque-1.0.0-mac-x64.dmg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

### [⬇️ Download Grauque for macOS (Intel DMG)](release/Grauque-1.0.0-mac-x64.dmg)

---

## Overview

Grauque is a native desktop application designed for macOS running on Intel processors. It connects directly to Groq's low-latency inference API to deliver high-speed conversational responses, comprehensive quiz generation, and system-wide accessibility via global shortcut invocation.

### Key Capabilities

- **Ultra-Fast Inference**: Streams tokens instantly via Groq API models including Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1 70B, Mixtral 8x7B, and Gemma 2 9B.
- **Editorial Interface**: Minimalist aesthetic with warm ivory backgrounds, collapsible conversation history, code syntax highlighting, and responsive Markdown rendering.
- **Interactive Quiz Generator**: Generates structured multiple-choice learning assessments with real-time score tracking, instant option verification, and educational explanations.
- **System-Wide Quick Prompt**: Double-tap the `Option` (`⌥`) key from any application to bring up a centered search bar. Pressing `Enter` automatically shifts focus to the main application and streams the response.
- **Complete Preferences Configuration**: In-app management of your Groq API credentials, model parameters (temperature, max tokens), custom system prompts, and shortcut toggles.
- **Intel Mac Native**: Packaged as a 64-bit (`x86_64`) `.dmg` disk image installer.

---

## Installation

1. Download **[Grauque-1.0.0-mac-x64.dmg](release/Grauque-1.0.0-mac-x64.dmg)**.
2. Double-click the downloaded disk image.
3. Drag the **Grauque** icon into your **Applications** folder.
4. Launch the application and enter your Groq API key in the Settings panel.

---

## Landing Page

A minimalist landing page with zero bloat and a direct download link is available at [`index.html`](index.html).

---

## Build from Source

```bash
# Clone repository
git clone https://github.com/thepc101/grauque.git
cd grauque

# Install dependencies
npm install

# Compile native keyboard helper
npm run compile-helper

# Build macOS DMG
npm run dist
```

---

## License

MIT
