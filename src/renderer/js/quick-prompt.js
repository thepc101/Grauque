const input = document.getElementById('prompt-input');

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

// Auto focus whenever shown
window.addEventListener('focus', () => {
  input.focus();
  input.select();
});
