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

  async streamChat({ messages, onChunk, onMetrics, onDone, onError }) {
    this.cancelActiveRequest();

    const settings = this.getSettings();
    const apiKey = (settings.apiKey || '').trim();

    if (!apiKey) {
      if (onError) {
        onError(new Error('Groq API Key is not set. Please click Settings to configure your key.'));
      }
      return;
    }

    const model = settings.model || 'openai/gpt-oss-120b';
    const temperature = parseFloat(settings.temperature) ?? 0.7;
    const isVision = this.isVisionModel(model);

    // Enforce efficient token caps to prevent OTPM limit exhaustion (e.g. Qwen 1000 OTPM limit)
    let maxTokens = parseInt(settings.maxTokens, 10) || 800;
    if (isVision) {
      maxTokens = Math.min(maxTokens, 550); // safe cap for Qwen 1000 OTPM limit
    } else {
      maxTokens = Math.min(maxTokens, 1000); // concise answers for text models
    }

    const systemPrompt = settings.systemPrompt || 
      'You are Grauque, an exceptionally capable and efficient AI assistant. Be direct, concise, and focused. Avoid unnecessary filler, repetition, or overly verbose preamble. Provide thorough depth only when explicitly asked.';

    // Keep only the most recent 6 messages to minimize token usage and latency
    const recentMessages = messages.slice(-6);

    const payloadMessages = [];
    if (systemPrompt) {
      payloadMessages.push({ role: 'system', content: systemPrompt });
    }

    const lastMsgIndex = recentMessages.length - 1;

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];
      const isCurrentTurn = (i === lastMsgIndex);

      if (msg.role === 'user' && msg.imageUrl && isCurrentTurn && isVision) {
        const parts = [];
        const textContent = (msg.content && msg.content.trim()) ? msg.content.trim() : 'Describe and analyze this image concisely.';
        parts.push({ type: 'text', text: textContent });
        parts.push({
          type: 'image_url',
          image_url: { url: msg.imageUrl }
        });
        payloadMessages.push({ role: 'user', content: parts });
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
}

window.GroqClient = GroqClient;
