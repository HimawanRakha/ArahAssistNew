// Jembatan aman antara halaman /notch dan proses utama Electron (lihat src/lib/desktop.ts)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arahDesktop", {
  setLevel: (level) => ipcRenderer.send("notch:set-level", String(level)),
  openExternal: (url) => ipcRenderer.send("notch:open-external", String(url)),
  openLogin: () => ipcRenderer.send("notch:open-login"),
  onCommand: (callback) => {
    const handler = (_event, command) => callback(command);
    ipcRenderer.on("notch:command", handler);
    return () => ipcRenderer.removeListener("notch:command", handler);
  },
  getSettings: () => ipcRenderer.invoke("notch:get-settings"),
  setDock: (dock) => ipcRenderer.send("notch:set-dock", String(dock)),
  dragStart: () => ipcRenderer.send("notch:drag-start"),
  dragEnd: () => ipcRenderer.send("notch:drag-end"),
  onDock: (callback) => {
    const handler = (_event, dock) => callback(dock);
    ipcRenderer.on("notch:dock", handler);
    return () => ipcRenderer.removeListener("notch:dock", handler);
  },
});
