const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("memo", {
  summarize: (text) => ipcRenderer.invoke("memo:summarize", text),
});
