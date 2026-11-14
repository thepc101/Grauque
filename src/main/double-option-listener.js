const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let listenerProcess = null;
let isTrusted = false;

function getHelperBinaryPath() {
  const prodPath = path.join(process.resourcesPath, 'bin', 'opt-tap-listener');
  const devPath = path.join(__dirname, '..', '..', 'bin', 'opt-tap-listener');
  
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  return null;
}

function startDoubleOptionListener(onDoubleOption, options = {}) {
  const helperPath = getHelperBinaryPath();
  if (!helperPath) {
    console.warn('[Grauque] Native opt-tap-listener helper not found at', helperPath);
    return false;
  }

  // Ensure helper is executable
  try {
    fs.chmodSync(helperPath, 0o755);
  } catch (err) {
    // ignore
  }

  const args = [];
  if (options.promptAx) {
    args.push('--prompt-ax');
  }

  try {
    listenerProcess = spawn(helperPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    listenerProcess.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line === 'DOUBLE_OPTION') {
          if (typeof onDoubleOption === 'function') {
            onDoubleOption();
          }
        } else if (line.startsWith('STATUS:')) {
          isTrusted = line === 'STATUS:TRUSTED';
          console.log('[Grauque] Accessibility status:', isTrusted ? 'Trusted' : 'Untrusted');
        } else if (line.startsWith('LISTENER_RUNNING:')) {
          console.log('[Grauque] Option listener running mode:', line.replace('LISTENER_RUNNING:', ''));
        }
      }
    });

    listenerProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text.includes('NOT_TRUSTED')) {
        isTrusted = false;
      } else if (text.includes('TRUSTED')) {
        isTrusted = true;
      }
    });

    listenerProcess.on('error', (err) => {
      console.warn('[Grauque] Failed to run opt-tap-listener:', err.message);
    });

    listenerProcess.on('exit', (code) => {
      console.log('[Grauque] opt-tap-listener exited with code', code);
      listenerProcess = null;
    });

    return true;
  } catch (err) {
    console.error('[Grauque] Error spawning opt-tap-listener:', err);
    return false;
  }
}

function stopDoubleOptionListener() {
  if (listenerProcess) {
    try {
      listenerProcess.kill('SIGTERM');
    } catch (e) {
      // ignore
    }
    listenerProcess = null;
  }
}

function getAccessibilityStatus() {
  return isTrusted;
}

module.exports = {
  startDoubleOptionListener,
  stopDoubleOptionListener,
  getAccessibilityStatus
};
