const input = document.getElementById('prompt-input');
const modelTag = document.getElementById('quick-model-tag');

function getModelDisplayName(modelId) {
  if (!modelId) return 'Grauque Max';
  const id = String(modelId).toLowerCase();
  if (id.includes('120b') || id.includes('max')) return 'Grauque Max';
  if (id.includes('qwen') || id.includes('image')) return 'Grauque Image';
  if (id.includes('20b') || id.includes('medium')) return 'Grauque Medium';
  if (id.includes('allam') || id.includes('low')) return 'Grauque Low';
  return 'Grauque Max';
}

async function refreshActiveModel() {
  if (!modelTag || !window.grauqueApi?.getSettings) return;
  try {
    const settings = await window.grauqueApi.getSettings();
    const activeModel = settings?.model || 'openai/gpt-oss-120b';
    const displayName = getModelDisplayName(activeModel);
    modelTag.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
      ${displayName}
    `;
  } catch (err) {
    // Keep default display
  }
}

function submit() {
  const text = input.value.trim();
  if (text) {
    window.grauqueApi.submitQuickPrompt(text);
    input.value = '';
  } else {
    window.grauqueApi.closeQuickPrompt();
  }
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submit();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    input.value = '';
    window.grauqueApi.closeQuickPrompt();
  }
});

// Auto focus and refresh model info whenever shown or focused
window.addEventListener('focus', () => {
  refreshActiveModel();
  input.focus();
  input.select();
});

if (window.grauqueApi?.onQuickPromptFocus) {
  window.grauqueApi.onQuickPromptFocus(() => {
    refreshActiveModel();
    input.focus();
    input.select();
  });
}

// Initial model refresh
refreshActiveModel();
