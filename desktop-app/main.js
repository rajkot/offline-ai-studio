const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
let activePort = parseInt(process.env.PORT, 10) || 3000;
let isQuitting = false;

// Discover folder from CLI or File Explorer Right-Click (%V or %1)
function getFolderFromArgs(args) {
  if (!args || !Array.isArray(args)) return null;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && typeof arg === 'string' && !arg.startsWith('-') && !arg.startsWith('--') && arg !== '.') {
      try {
        const resolved = path.resolve(arg);
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          return resolved;
        }
      } catch (e) {}
    }
  }
  return null;
}

let initialTargetFolder = getFolderFromArgs(process.argv);
console.log('[MAIN] Initial target folder from CLI:', initialTargetFolder);

// Enforce single instance lock for smooth Windows context menu folder opening
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[MAIN] Another instance is already running. Forwarding request and exiting secondary instance.');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[MAIN] second-instance event received with commandLine:', commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const folder = getFolderFromArgs(commandLine) || (workingDirectory && fs.existsSync(workingDirectory) ? workingDirectory : null);
      if (folder) {
        console.log('[MAIN] Switching workspace to second-instance folder:', folder);
        initialTargetFolder = folder;
        if (mainWindow.webContents && !mainWindow.webContents.isLoading()) {
          mainWindow.webContents.send('open-folder', folder);
        }
        navigateToIDE(folder);
      }
    }
  });
}

function sendStatus(msg) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('engine-status', msg);
  }
}

// Check if a local HTTP server is listening and responding
function checkServerHealthy(port, host = '127.0.0.1', timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: host,
        port: port,
        path: '/',
        timeout: timeoutMs,
        headers: { 'User-Agent': 'OfflineAIStudio-Desktop' }
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on('error', () => {
      // Also try localhost in case 127.0.0.1 resolves differently
      if (host === '127.0.0.1') {
        checkServerHealthy(port, 'localhost', timeoutMs).then(resolve);
      } else {
        resolve(false);
      }
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Locate standalone server.js
function findServerJs() {
  const candidatePaths = [
    // 1. Packaged electron app resources directory
    path.join(process.resourcesPath, 'server', 'server.js'),
    path.join(process.resourcesPath, 'app', 'server', 'server.js'),
    path.join(process.resourcesPath, '.next', 'standalone', 'server.js'),
    // 2. Relative to __dirname
    path.join(__dirname, 'server', 'server.js'),
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
    // 3. Current working directory
    path.join(process.cwd(), '.next', 'standalone', 'server.js'),
    path.join(process.cwd(), 'server', 'server.js')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      console.log('[ENGINE] Located server.js at:', p);
      return p;
    }
  }
  return null;
}

// Safely kill child process and all child sub-processes
function stopServerProcess() {
  if (!serverProcess) return;
  console.log('[ENGINE] Stopping server process PID:', serverProcess.pid);
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
    } else {
      serverProcess.kill('SIGTERM');
    }
  } catch (err) {
    // Process might have already terminated
  }
  serverProcess = null;
}

function getNodeBinary() {
  try {
    const test = execSync('node -v', { stdio: 'pipe' }).toString();
    if (test && test.startsWith('v')) {
      console.log('[ENGINE] Detected system node runtime:', test.trim());
      return 'node';
    }
  } catch (e) {
    // System node not in path
  }
  console.log('[ENGINE] Using embedded Electron Node runtime:', process.execPath);
  return process.execPath;
}

// Start standalone Next.js server in the background
async function launchEmbeddedServer() {
  const serverJs = findServerJs();

  if (serverJs) {
    sendStatus('Launching self-contained engine...');
    const serverDir = path.dirname(serverJs);

    const nodeBinary = getNodeBinary();
    console.log('[ENGINE] Spawning server via runtime:', nodeBinary);
    console.log('[ENGINE] Target script:', serverJs);
    console.log('[ENGINE] Target port:', activePort);

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(activePort),
      HOSTNAME: '0.0.0.0',
      NEXT_TELEMETRY_DISABLED: '1'
    };

    serverProcess = spawn(nodeBinary, [serverJs], {
      cwd: serverDir,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (d) => {
      const line = d.toString();
      console.log('[SERVER STDOUT]', line.trim());
      if (line.includes('Ready') || line.includes('started') || line.includes('Local:')) {
        sendStatus('Server engine ready, opening workbench...');
      }
    });

    serverProcess.stderr.on('data', (d) => {
      console.warn('[SERVER STDERR]', d.toString().trim());
    });

    serverProcess.on('exit', (code, signal) => {
      console.log(`[ENGINE] Server process exited with code ${code}, signal ${signal}`);
      serverProcess = null;
    });

    return true;
  }

  // Fallback for development if standalone has not yet been built:
  const rootPackageJson = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(rootPackageJson)) {
    sendStatus('Running development server (npm run dev)...');
    console.log('[ENGINE] Fallback: launching npm run dev in parent directory');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    serverProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    serverProcess.stdout.on('data', (d) => {
      console.log('[DEV STDOUT]', d.toString().trim());
    });

    serverProcess.stderr.on('data', (d) => {
      console.warn('[DEV STDERR]', d.toString().trim());
    });

    return true;
  }

  console.warn('[ENGINE] Could not find server.js or package.json to spawn');
  return false;
}

// Supervise the full boot cycle: check port -> start if needed -> wait healthy -> navigate
async function startApplicationEngine() {
  sendStatus('Inspecting local port ' + activePort + '...');
  
  // 1. Is the server already alive?
  let isAlive = await checkServerHealthy(activePort);
  if (isAlive) {
    console.log('[ENGINE] Server already alive on port', activePort);
    navigateToIDE();
    return;
  }

  // 2. Not alive, launch embedded background server
  sendStatus('Spinning up background server on port ' + activePort + '...');
  const launched = await launchEmbeddedServer();

  // 3. Poll until healthy
  const maxAttempts = 60; // 30 seconds max
  let attempts = 0;

  const pollInterval = setInterval(async () => {
    if (isQuitting || !mainWindow || mainWindow.isDestroyed()) {
      clearInterval(pollInterval);
      return;
    }

    attempts++;
    sendStatus(`Initializing core engine (attempt ${attempts}/${maxAttempts})...`);
    
    const healthy = await checkServerHealthy(activePort);
    if (healthy) {
      clearInterval(pollInterval);
      sendStatus('Engine online! Loading Offline AI Studio...');
      setTimeout(() => {
        navigateToIDE();
      }, 400);
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      console.error('[ENGINE] Server failed to become healthy within timeout.');
      mainWindow.loadFile(path.join(__dirname, 'offline.html'));
    }
  }, 500);
}

function navigateToIDE(customFolder) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const folder = customFolder || initialTargetFolder;
  let targetUrl = process.env.APP_URL || `http://127.0.0.1:${activePort}`;
  if (folder) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl += `${separator}folder=${encodeURIComponent(folder)}`;
  }
  console.log('[NAVIGATE] Loading IDE workbench at:', targetUrl);
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.warn('[NAVIGATE] Load error, falling back to offline screen:', err);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Offline AI Studio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    backgroundColor: '#090d16',
    show: false
  });

  // Display window once ready to show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Start with beautiful splash screen while server spins up
  mainWindow.loadFile(path.join(__dirname, 'splash.html')).then(() => {
    startApplicationEngine();
  });

  // Setup application menu
  const template = [
    {
      label: 'Offline AI Studio',
      submenu: [
        { label: 'Reload Workbench', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Restart Engine',
          click: () => {
            stopServerProcess();
            mainWindow.loadFile(path.join(__dirname, 'splash.html')).then(() => {
              startApplicationEngine();
            });
          }
        },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CommandOrControl+Q', click: () => { app.quit(); } }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Open in External Browser',
          click: async () => {
            await shell.openExternal(`http://127.0.0.1:${activePort}`);
          }
        },
        {
          label: 'API Health Check',
          click: async () => {
            await shell.openExternal(`http://127.0.0.1:${activePort}/api/catalog/status`);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('retry-engine', () => {
  stopServerProcess();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'splash.html')).then(() => {
      startApplicationEngine();
    });
  }
});

ipcMain.on('open-devtools', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.openDevTools();
  }
});

// Windows Context Menu IPC Handlers
const CONTEXT_MENU_KEYS = [
  'HKCU\\Software\\Classes\\Directory\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Directory\\Background\\shell\\OfflineAIStudio',
  'HKCU\\Software\\Classes\\Drive\\shell\\OfflineAIStudio'
];

ipcMain.handle('get-target-folder', () => initialTargetFolder);

ipcMain.handle('get-context-menu-status', () => {
  if (process.platform !== 'win32') return { registered: false };
  try {
    const out = execSync(`reg.exe query "${CONTEXT_MENU_KEYS[0]}\\command" /ve`, { stdio: 'pipe' }).toString();
    return { registered: true, details: out.trim() };
  } catch {
    return { registered: false };
  }
});

ipcMain.handle('register-context-menu', () => {
  if (process.platform !== 'win32') return { success: false, error: 'Not Windows' };
  const exePath = process.execPath;
  const iconPath = path.join(__dirname, 'icon.ico');
  const commandStr = `\\"${exePath}\\" \\"%V\\"`;

  try {
    for (const key of CONTEXT_MENU_KEYS) {
      execSync(`reg.exe add "${key}" /ve /t REG_SZ /d "Open with Offline AI Studio" /f`, { stdio: 'ignore' });
      if (fs.existsSync(iconPath)) {
        execSync(`reg.exe add "${key}" /v "Icon" /t REG_SZ /d "\\"${iconPath}\\",0" /f`, { stdio: 'ignore' });
      }
      execSync(`reg.exe add "${key}\\command" /ve /t REG_SZ /d "${commandStr}" /f`, { stdio: 'ignore' });
    }
    return { success: true, registered: true, exePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('unregister-context-menu', () => {
  if (process.platform !== 'win32') return { success: false, error: 'Not Windows' };
  try {
    for (const key of CONTEXT_MENU_KEYS) {
      try {
        execSync(`reg.exe delete "${key}" /f`, { stdio: 'ignore' });
      } catch {}
    }
    return { success: true, registered: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// App Lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopServerProcess();
});

app.on('window-all-closed', () => {
  isQuitting = true;
  stopServerProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
