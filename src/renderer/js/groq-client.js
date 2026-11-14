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
    const maxTokens = parseInt(settings.maxTokens, 10) || 4096;
    const systemPrompt = settings.systemPrompt || '';

    // Build payload messages with multimodal vision support
    const payloadMessages = [];
    if (systemPrompt) {
      payloadMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'user' && msg.imageUrl) {
        // Multimodal image payload for vision models (e.g. qwen/qwen3.8-27b)
        const parts = [];
        if (msg.content && msg.content.trim()) {
          parts.push({ type: 'text', text: msg.content.trim() });
        } else {
          parts.push({ type: 'text', text: 'Analyze and describe this image.' });
        }
        parts.push({
          type: 'image_url',
          image_url: { url: msg.imageUrl }
        });
        payloadMessages.push({ role: 'user', content: parts });
      } else {
        payloadMessages.push({ role: msg.role, content: msg.content });
      }
    }

    this.activeController = new AbortController();
    const startTime = performance.now();
    let tokenCount = 0;
    let fullText = '';
    let fullReasoning = '';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: payloadMessages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: true
        }),
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
        buffer = lines.pop(); // keep partial line for next iteration

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

            // Handle internal reasoning/thinking stream (e.g. gpt-oss-120b)
            if (delta.reasoning) {
              chunkReasoning = delta.reasoning;
              fullReasoning += chunkReasoning;
              tokenCount += Math.max(1, Math.round(chunkReasoning.length / 4));
            }

            // Handle primary response stream
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
