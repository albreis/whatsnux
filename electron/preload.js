const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSessions:    ()                    => ipcRenderer.invoke('get-sessions'),
  saveSessions:   (sessions)            => ipcRenderer.invoke('save-sessions', sessions),
  showSession:    (id)                  => ipcRenderer.invoke('show-session', id),
  createSession:  (id, name)            => ipcRenderer.invoke('create-session', id, name),
  removeSession:  (id)                  => ipcRenderer.invoke('remove-session', id),
  renameSession:  (id, name)            => ipcRenderer.invoke('rename-session', id, name),
  reloadSession:  (id)                  => ipcRenderer.invoke('reload-session', id),
  hideActiveView: ()                    => ipcRenderer.invoke('hide-active-view'),
  showActiveView: ()                    => ipcRenderer.invoke('show-active-view'),

  onTitleUpdated: (callback) => {
    ipcRenderer.on('session-title-updated', (_event, sessionId, title) => {
      callback(sessionId, title);
    });
  },
});
