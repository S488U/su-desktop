const { contextBridge, ipcRenderer, shell, remote } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        
        const validChannels = ['update-app', 'update-later'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['update-status']; 
        if (validChannels.includes(channel)) {
            
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    shell: shell,
    remote: remote
});
