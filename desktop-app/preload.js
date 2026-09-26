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
  },
  onOpenFolder: (callback) => {
    ipcRenderer.on('open-folder', (_event, folder) => callback(folder));
  },
  getTargetFolder: () => ipcRenderer.invoke('get-target-folder'),
  registerContextMenu: () => ipcRenderer.invoke('register-context-menu'),
  unregisterContextMenu: () => ipcRenderer.invoke('unregister-context-menu'),
  getContextMenuStatus: () => ipcRenderer.invoke('get-context-menu-status')
});
