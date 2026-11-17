const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('grauqueApi', {
  // Quick Prompt IPC
  submitQuickPrompt: (prompt) => ipcRenderer.send('quick-prompt:submit', prompt),
  closeQuickPrompt: () => ipcRenderer.send('quick-prompt:close'),
  onPromptFromQuickBox: (callback) => {
    ipcRenderer.on('prompt:from-quick-box', (_event, data) => callback(data));
  },
  onQuickPromptFocus: (callback) => {
    ipcRenderer.on('quick-prompt:focus', (_event, data) => callback(data));
  },

  // Settings IPC
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  testGroqKey: (key) => ipcRenderer.invoke('groq:test-key', key),

  // Permissions IPC
  checkAccessibility: (prompt) => ipcRenderer.invoke('system:check-accessibility', prompt),
  openAccessibilitySettings: () => ipcRenderer.invoke('system:open-accessibility-settings'),
  requestMicPermission: () => ipcRenderer.invoke('system:request-mic-permission'),

  // PDF Extraction IPC
  parsePdf: (options) => ipcRenderer.invoke('pdf:parse', options),
  pickPdfFile: () => ipcRenderer.invoke('pdf:pick-file'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // System info & URL Opening
  openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  platform: process.platform,
  arch: process.arch
});
