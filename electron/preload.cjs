const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  getUpdateInfo: () => ipcRenderer.invoke("update:getInfo"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  openUpdateDownload: () => ipcRenderer.invoke("update:openDownload"),
  onUpdateStatus: (cb) => {
    const handler = (_e, info) => cb(info);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  },
  bubbleDragStart: () => ipcRenderer.send("bubble:dragStart"),
  bubbleDragEnd: () => ipcRenderer.send("bubble:dragEnd"),
  bubbleClick: () => ipcRenderer.send("bubble:click"),
  showContextMenu: () => ipcRenderer.send("bubble:contextMenu"),
  showBubble: () => ipcRenderer.send("bubble:show"),
  hideBubble: () => ipcRenderer.send("bubble:hide"),
  openProvider: (which) => ipcRenderer.send("provider:open", which),
  quit: () => ipcRenderer.send("app:quit"),
  collapsePanel: () => ipcRenderer.send("panel:collapse"),
  openExternal: (url) => ipcRenderer.send("open:external", url),
  setLoginItem: (enabled) => ipcRenderer.send("settings:login", enabled),
  setAlwaysOnTop: (enabled) => ipcRenderer.send("settings:alwaysOnTop", enabled),
  setCloseOnBlur: (enabled) => ipcRenderer.send("settings:closeOnBlur", enabled),
  setShowBubbleOnStartup: (enabled) => ipcRenderer.send("settings:showBubbleOnStartup", enabled),
  setRememberPosition: (enabled) => ipcRenderer.send("settings:rememberPosition", enabled),
  setSnapToEdge: (enabled) => ipcRenderer.send("settings:snapToEdge", enabled),
  setPerformanceMode: (mode) => ipcRenderer.send("settings:performance", mode),
  reportUnread: (provider, count) => ipcRenderer.send("notifications:unread", provider, count),
  onUnread: (cb) => {
    const handler = (_e, counts) => cb(counts);
    ipcRenderer.on("notifications:unread", handler);
    return () => ipcRenderer.removeListener("notifications:unread", handler);
  },
  clearSession: (provider) => ipcRenderer.send("session:clear", provider),
  openSessionStorage: () => ipcRenderer.send("session:openStorage"),
  onNavigate: (cb) => {
    const handler = (_e, which) => cb(which);
    ipcRenderer.on("panel:navigate", handler);
    return () => ipcRenderer.removeListener("panel:navigate", handler);
  },
  onPerformance: (cb) => {
    const handler = (_e, mode) => cb(mode);
    ipcRenderer.on("settings:performance", handler);
    return () => ipcRenderer.removeListener("settings:performance", handler);
  },
});
