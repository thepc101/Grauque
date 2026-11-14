const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('grauqueApi', {
  // Quick Prompt IPC
  submitQuickPrompt: (prompt) => ipcRenderer.send('quick-prompt:submit', prompt),
  closeQuickPrompt: () => ipcRenderer.send('quick-prompt:close'),
  onPromptFromQuickBox: (callback) => {
    ipcRenderer.on('prompt:from-quick-box', (_event, data) => callback(data));
  },

  // Settings IPC
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  testGroqKey: (key) => ipcRenderer.invoke('groq:test-key', key),

  // Accessibility IPC
  checkAccessibility: (prompt) => ipcRenderer.invoke('system:check-accessibility', prompt),
  openAccessibilitySettings: () => ipcRenderer.invoke('system:open-accessibility-settings'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System info
  platform: process.platform,
  arch: process.arch
});
