const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { summarize } = require("./summarize.js");

ipcMain.handle("memo:summarize", (_event, text) => summarize(String(text ?? "")));

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 640,
    height: 480,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  window.loadFile(path.join(__dirname, "index.html"));
});
