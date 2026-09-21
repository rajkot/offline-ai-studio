const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Offline AI Studio",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    backgroundColor: '#090d16'
  });

  // Attempt to load the Next.js server, fallback to local offline HTML
  const targetUrl = process.env.APP_URL || 'http://localhost:3000';
  
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.log('Failed to load live server, falling back to offline screen:', err);
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  // Create native menu
  const template = [
    {
      label: 'Application',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
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
          label: 'Open Dev Server',
          click: async () => {
            await shell.openExternal('http://localhost:3000');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://ai.studio/build');
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

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
