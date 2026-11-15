class GroqClient {
  constructor(getSettingsFn) {
    this.getSettings = getSettingsFn;
    this.activeController = null;
  }

  cancelActiveRequest() {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
  }

  isVisionModel(model) {
    if (!model) return false;
    const lower = model.toLowerCase();
    return lower.includes('qwen') || lower.includes('vision');
  }

  async streamChat({ messages, model: modelOverride, persona, isDeepSearch, onChunk, onMetrics, onDone, onError }) {
    this.cancelActiveRequest();

    const settings = this.getSettings();
    const apiKey = (settings.apiKey || '').trim();

    if (!apiKey) {
      if (onError) {
        onError(new Error('Groq API Key is not set. Please click Settings to configure your key.'));
      }
      return;
    }

    // Auto-detect if conversation contains images and ensure vision model is used
    const hasAnyImage = messages.some(m => Boolean(m.imageUrl));
    let model = modelOverride || settings.model || 'openai/gpt-oss-120b';
    if (hasAnyImage && !this.isVisionModel(model)) {
      model = 'qwen/qwen3.8-27b';
    }
    const temperature = parseFloat(settings.temperature) ?? 0.7;
    const isVision = this.isVisionModel(model);

    // Dynamic token cap: safe limit for Qwen vision OTPM, full 4k-8k capacity for text models
    let maxTokens = parseInt(settings.maxTokens, 10) || 4096;
    if (isVision) {
      maxTokens = Math.min(maxTokens, 600); // safe cap for Qwen 1000 OTPM limit
    } else {
      maxTokens = Math.min(Math.max(maxTokens, 1024), 8192); // full depth for reasoning and code
    }

    let personaModifier = '';
    const activePersona = persona || settings.persona || 'general';
    if (activePersona === 'coder') {
      personaModifier = '\n\n[Active Persona: Software Engineer]\nWrite production-ready, robust code with clear variable names, type annotations, error handling, and unit test suggestions. Avoid conversational fluff and focus on technical accuracy and architecture.';
    } else if (activePersona === 'tutor') {
      personaModifier = '\n\n[Active Persona: Socratic Tutor]\nGuide the student through problems using progressive hints and the Socratic method. Break complex concepts into manageable chunks, ask guiding questions to test comprehension, and use intuitive analogies.';
    } else if (activePersona === 'analyst') {
      personaModifier = '\n\n[Active Persona: Executive Analyst]\nProvide structured executive briefings. Lead with the core bottom line (TL;DR), followed by crisp bullet points, quantitative data analysis, risk assessments, and concrete next steps.';
    } else if (activePersona === 'writer') {
      personaModifier = '\n\n[Active Persona: Creative Writer]\nAdopt an evocative, stylish, and engaging literary voice. Use vivid sensory details, compelling narrative tension, and expressive language.';
    }

    let searchModifier = '';
    if (isDeepSearch) {
      searchModifier = '\n\n[Deep Grounding & Research Mode Activated]\nAdopt a comprehensive, evidence-grounded research synthesis. Provide in-depth analysis, structured sections with bold headers, cross-checked factual claims, citation tags like [1] and [2], and conclude with a Critical Evaluation & Key Takeaways summary.';
    }

    let finalSystemPrompt = (settings.systemPrompt || 
      'You are Grauque, an exceptionally capable, intelligent, and efficient AI assistant. Be direct, clear, and comprehensive. Provide thorough depth, insightful reasoning, and elegant formatting. For math and scientific equations, format using clean LaTeX ($ for inline, $$ for block formulas). Never output raw <br> tags.') + personaModifier + searchModifier;

    // Inject User Memories if enabled
    const memories = Array.isArray(settings.memories) ? settings.memories.filter(m => m && m.text && m.enabled !== false) : [];
    if (settings.enableMemory !== false && memories.length > 0) {
      finalSystemPrompt += '\n\n[User Profile & Persistent Memory]\nGrauque remembers these facts and preferences about the user:\n' + 
        memories.map(m => `- ${m.text}`).join('\n') + 
        '\nNaturally adapt your answers, tone, and examples according to these remembered preferences.';
    }

    // Keep the most recent 8 messages to minimize token usage and latency
    const recentMessages = messages.slice(-8);

    const payloadMessages = [];
    if (finalSystemPrompt) {
      payloadMessages.push({ role: 'system', content: finalSystemPrompt });
    }

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];

      if (msg.role === 'user' && msg.imageUrl && isVision) {
        const parts = [];
        parts.push({
          type: 'image_url',
          image_url: { url: msg.imageUrl }
        });
        const textContent = (msg.content && msg.content.trim()) ? msg.content.trim() : 'Describe and analyze this image in detail.';
        parts.push({ type: 'text', text: textContent });
        payloadMessages.push({ role: 'user', content: parts });
      } else if (msg.role === 'user' && msg.pdf) {
        const isLatestUserTurn = (i >= recentMessages.length - 2);
        const userPrompt = (typeof msg.content === 'string' && msg.content.trim()) 
          ? msg.content.trim() 
          : 'Please analyze and summarize this attached document.';

        if (isLatestUserTurn && msg.pdf.text) {
          const docContext = `[Attached PDF Document: "${msg.pdf.title || 'Document.pdf'}" (${msg.pdf.totalPages || 1} pages)]\n\n--- DOCUMENT CONTENT ---\n${msg.pdf.text}\n--- END OF DOCUMENT ---\n\nUser Question/Instruction:\n${userPrompt}`;
          payloadMessages.push({
            role: 'user',
            content: docContext
          });
        } else {
          payloadMessages.push({
            role: 'user',
            content: `[Referenced Document: "${msg.pdf.title || 'Document.pdf'}"]\n${userPrompt}`
          });
        }
      } else {
        const textContent = (typeof msg.content === 'string') ? msg.content : (msg.content?.[0]?.text || '');
        payloadMessages.push({
          role: msg.role,
          content: textContent || (msg.imageUrl ? '[Attached image analyzed above]' : '')
        });
      }
    }

    this.activeController = new AbortController();
    const startTime = performance.now();
    let tokenCount = 0;
    let fullText = '';
    let fullReasoning = '';

    const payloadBody = {
      model: model,
      messages: payloadMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true
    };

    const payloadJson = JSON.stringify(payloadBody);
    console.log(`[Grauque] Sending Groq request for ${model}. Max tokens: ${maxTokens}, Payload size: ${payloadJson.length} bytes`);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: payloadJson,
        signal: this.activeController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Groq API Error (${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error && parsed.error.message) {
            message = parsed.error.message;
          }
        } catch (e) {
          if (errorText) message += `: ${errorText}`;
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;

            let chunkContent = '';
            let chunkReasoning = '';

            if (delta.reasoning) {
              chunkReasoning = delta.reasoning;
              fullReasoning += chunkReasoning;
              tokenCount += Math.max(1, Math.round(chunkReasoning.length / 4));
            }

            if (delta.content) {
              chunkContent = delta.content;
              fullText += chunkContent;
              tokenCount += Math.max(1, Math.round(chunkContent.length / 4));
            }

            if (chunkContent || chunkReasoning) {
              const elapsedSec = (performance.now() - startTime) / 1000;
              const tokensPerSec = elapsedSec > 0.05 ? Math.round(tokenCount / elapsedSec) : 0;

              if (onChunk) {
                onChunk(chunkContent, fullText, chunkReasoning, fullReasoning);
              }
              if (onMetrics) {
                onMetrics({
                  tokenCount,
                  elapsedSec: elapsedSec.toFixed(1),
                  tokensPerSec,
                  model
                });
              }
            }
          } catch (err) {
            // ignore non-json SSE lines
          }
        }
      }

      const totalElapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
      const finalTokensPerSec = totalElapsedSec > 0 ? Math.round(tokenCount / totalElapsedSec) : 0;

      if (onDone) {
        onDone(fullText, fullReasoning, {
          tokenCount,
          elapsedSec: totalElapsedSec,
          tokensPerSec: finalTokensPerSec,
          model
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        const totalElapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
        if (onDone) {
          onDone(fullText, fullReasoning, {
            tokenCount,
            elapsedSec: totalElapsedSec,
            tokensPerSec: 0,
            model,
            stopped: true
          });
        }
      } else {
        if (onError) onError(err);
      }
    } finally {
      this.activeController = null;
    }
  }

  async transcribeAudio(audioBlob) {
    const settings = this.getSettings();
    const apiKey = (settings.apiKey || '').trim();

    if (!apiKey) {
      throw new Error('Groq API Key is not set. Please click Settings to configure your key.');
    }

    const formData = new FormData();
    const fileName = audioBlob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm';
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    formData.append('temperature', '0');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Transcription failed (${response.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) msg = parsed.error.message;
      } catch (e) {
        if (errText) msg += `: ${errText}`;
      }
      throw new Error(msg);
    }

    const data = await response.json();
    return data.text || '';
  }
}

window.GroqClient = GroqClient;
