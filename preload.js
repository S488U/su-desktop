const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Action: Start Update
    updateApp: () => ipcRenderer.send('update-app'),

    // Action: Close/Later
    updateLater: () => ipcRenderer.send('update-later'),

    // Action: Open Browser Link
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Listener: Receive Status
    onUpdateStatus: (callback) => {
        const subscription = (event, message) => callback(message);
        ipcRenderer.on('update-status', subscription);

        // Return cleanup function to avoid memory leaks
        return () => ipcRenderer.removeListener('update-status', subscription);
    }
});