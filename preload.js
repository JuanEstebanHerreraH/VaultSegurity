const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    saveDB: (payload) => ipcRenderer.invoke('save-db', payload),
    readDB: (password) => ipcRenderer.invoke('read-db', password),
    destroyDB: () => ipcRenderer.invoke('destroy-db'),
    exportFile: (payload) => ipcRenderer.invoke('export-file', payload),
    changeIcon: (dataURL) => ipcRenderer.invoke('change-icon', dataURL),
    pickFile: (options) => ipcRenderer.invoke('pick-file', options),
    previewDoc: (payload) => ipcRenderer.invoke('preview-doc', payload),
    fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url)
});
