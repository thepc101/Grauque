const { app, BrowserWindow, ipcMain, globalShortcut, screen, shell, net, session, systemPreferences, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const pdfParser = require('./pdf-parser');
const {
  startDoubleOptionListener,
  stopDoubleOptionListener,
  getAccessibilityStatus
} = require('./double-option-listener');

let mainWindow = null;
let quickPromptWindow = null;

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const defaultSettings = {
  apiKey: '',
  model: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 800,
  systemPrompt: 'You are Grauque, an exceptionally capable and efficient AI assistant powered by Groq. Be direct, concise, and focused. Avoid unnecessary filler or overly verbose preamble. Provide thorough depth only when explicitly requested. For mathematical or scientific formulas, format using standard LaTeX math ($ for inline, $$ for block formulas). Never output raw <br> tags.',
  enableDoubleOption: true,
  enableOptionSpace: true,
  enableMemory: true,
  memories: [],
  theme: 'dark'
};

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      // Migrate deprecated models automatically if present
      if (parsed.model && (
        parsed.model.includes('llama') ||
        parsed.model.includes('deepseek') ||
        parsed.model.includes('gemma') ||
        parsed.model.includes('mixtral')
      )) {
        parsed.model = 'openai/gpt-oss-120b';
      }
      return { ...defaultSettings, ...parsed };
    }
  } catch (err) {
    console.warn('[Grauque] Error loading settings:', err);
  }
  return { ...defaultSettings };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Grauque] Error saving settings:', err);
    return false;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 840,
    minHeight: 600,
    title: 'Grauque',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    },
    show: false
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickPromptWindow() {
  quickPromptWindow = new BrowserWindow({
    width: 680,
    height: 190,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  quickPromptWindow.loadFile(path.join(__dirname, '../renderer/quick-prompt.html'));

  quickPromptWindow.on('blur', () => {
    quickPromptWindow.hide();
  });
}

function showQuickPrompt() {
  if (!quickPromptWindow || quickPromptWindow.isDestroyed()) {
    createQuickPromptWindow();
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { x, y, width, height } = activeDisplay.bounds;

  const windowWidth = 680;
  const windowHeight = 190;
  const posX = Math.round(x + (width - windowWidth) / 2);
  const posY = Math.round(y + height * 0.22);

  quickPromptWindow.setBounds({
    x: posX,
    y: posY,
    width: windowWidth,
    height: windowHeight
  });

  quickPromptWindow.show();
  quickPromptWindow.focus();
  quickPromptWindow.webContents.send('quick-prompt:focus');
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const currentSettings = loadSettings();

  if (currentSettings.enableOptionSpace !== false) {
    try {
      const registered = globalShortcut.register('Alt+Space', () => {
        showQuickPrompt();
      });
      if (!registered) {
        globalShortcut.register('CommandOrControl+Shift+G', () => {
          showQuickPrompt();
        });
      }
    } catch (e) {
      console.warn('[Grauque] Failed to register Alt+Space:', e);
    }
  }

  if (currentSettings.enableDoubleOption !== false) {
    stopDoubleOptionListener();
    startDoubleOptionListener(() => {
      showQuickPrompt();
    });
  }
}

app.whenReady().then(() => {
  // Set macOS Dock Icon dynamically
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath);
    }
  }

  // Allow microphone access for voice transcription
  if (session && session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        callback(true);
        return;
      }
      callback(true);
    });
  }

  createMainWindow();
  createQuickPromptWindow();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopDoubleOptionListener();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Event Handlers
ipcMain.on('quick-prompt:submit', (_event, prompt) => {
  if (quickPromptWindow) {
    quickPromptWindow.hide();
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('prompt:from-quick-box', { prompt });
});

ipcMain.on('quick-prompt:close', () => {
  if (quickPromptWindow) {
    quickPromptWindow.hide();
  }
});

ipcMain.handle('settings:get', () => {
  return loadSettings();
});

ipcMain.handle('settings:save', (_event, newSettings) => {
  const result = saveSettings(newSettings);
  registerShortcuts();
  return result;
});

// Test API Key and fetch live models
ipcMain.handle('groq:test-key', async (_event, apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key is empty.' };
  }

  try {
    const response = await net.fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, status: response.status, error: errText || `HTTP ${response.status}` };
    }

    const data = await response.json();
    const rawModels = data.data || [];
    
    // Filter to active chat & vision models (exclude audio/whisper/guard/decommissioned)
    const validChatModels = rawModels
      .map(m => m.id)
      .filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('llama') && !id.includes('deepseek'));

    return {
      success: true,
      modelCount: validChatModels.length,
      models: validChatModels
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:check-accessibility', (_event, shouldPrompt) => {
  const trusted = getAccessibilityStatus();
  if (!trusted && shouldPrompt) {
    startDoubleOptionListener(() => {
      showQuickPrompt();
    }, { promptAx: true });
  }
  return trusted;
});

ipcMain.handle('system:open-accessibility-settings', () => {
  const url = 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
  shell.openExternal(url).catch(() => {
    exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
  });
  return true;
});

ipcMain.handle('system:open-external', (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url).catch(() => {});
    return true;
  }
  return false;
});

ipcMain.handle('system:request-mic-permission', async () => {
  if (process.platform === 'darwin' && systemPreferences && systemPreferences.askForMediaAccess) {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      if (status === 'not-determined') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        return { status: granted ? 'granted' : 'denied' };
      }
      return { status };
    } catch (e) {
      return { status: 'granted' };
    }
  }
  return { status: 'granted' };
});

// PDF Extraction Handlers
ipcMain.handle('pdf:parse', async (_event, options) => {
  try {
    return await pdfParser.extractText(options || {});
  } catch (err) {
    console.error('[Grauque] PDF extraction error:', err);
    return { success: false, error: err.message, text: '' };
  }
});

ipcMain.handle('pdf:pick-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF Document',
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const filePath = result.filePaths[0];
  const extracted = await pdfParser.extractText({ filePath });
  return {
    filePath,
    ...extracted
  };
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});
