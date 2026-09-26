const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  onEngineStatus: (callback) => {
    ipcRenderer.on('engine-status', (_event, value) => callback(value));
  },
  retryEngine: () => {
    ipcRenderer.send('retry-engine');
  },
  openDevTools: () => {
    ipcRenderer.send('open-devtools');
  }
});
