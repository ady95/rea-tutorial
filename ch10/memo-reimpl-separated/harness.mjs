// Loads the original main-process bundle straight out of app.asar, with a fake
// `electron` module, and exposes the handlers it registers via ipcMain.handle.
// The original code is read from the asar at runtime; nothing is copied here.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ASAR = path.resolve(here, "../memo-bin/app.asar");

// Minimal ASAR reader: [u32 4][u32 headerPickleSize][u32 payloadSize][u32 jsonLen][json...]
// File data begins at 8 + headerPickleSize; entries hold { offset: "<string>", size }.
export function readAsarFile(asarPath, entryPath) {
  const buf = readFileSync(asarPath);
  const headerPickleSize = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const header = JSON.parse(buf.toString("utf8", 16, 16 + jsonLen));
  let node = header;
  for (const part of entryPath.split("/")) {
    node = node.files?.[part];
    if (!node) throw new Error(`asar entry not found: ${entryPath}`);
  }
  if (node.unpacked) throw new Error(`asar entry is unpacked: ${entryPath}`);
  const start = 8 + headerPickleSize + Number(node.offset);
  return buf.toString("utf8", start, start + node.size);
}

function createFakeElectron() {
  const handlers = new Map();
  const calls = [];
  const fake = {
    ipcMain: {
      handle(channel, fn) {
        if (handlers.has(channel)) throw new Error(`duplicate handler: ${channel}`);
        handlers.set(channel, fn);
      },
      removeHandler(channel) {
        handlers.delete(channel);
      },
      on() {},
    },
    app: {
      // Never resolves: window creation is outside the comparison scope.
      whenReady: () => new Promise(() => {}),
      on() {},
      quit() {},
    },
    BrowserWindow: class {
      constructor(opts) { calls.push(["BrowserWindow", opts]); }
      loadFile(f) { calls.push(["loadFile", f]); return Promise.resolve(); }
    },
  };
  return { fake, handlers, calls };
}

// Runs main.js (CommonJS) in this process with `require("electron")` replaced.
export function loadOriginal({ asarPath = DEFAULT_ASAR, entry = "main.js" } = {}) {
  const source = readAsarFile(asarPath, entry);
  const { fake, handlers, calls } = createFakeElectron();
  const filename = path.join(asarPath, entry);
  const realRequire = createRequire(filename);
  const fakeRequire = (id) => (id === "electron" ? fake : realRequire(id));
  const module = { exports: {} };
  const fn = vm.compileFunction(
    source,
    ["exports", "require", "module", "__filename", "__dirname"],
    { filename },
  );
  fn(module.exports, fakeRequire, module, filename, path.dirname(filename));

  const fakeEvent = { sender: null, senderFrame: null, processId: 0, frameId: 0 };
  return {
    channels: [...handlers.keys()],
    handlers,
    calls,
    // Mirrors ipcRenderer.invoke: the handler result is delivered as a Promise.
    async invoke(channel, ...args) {
      const h = handlers.get(channel);
      if (!h) throw new Error(`no handler for ${channel}`);
      return h(fakeEvent, ...args);
    },
  };
}

// CLI: node harness.mjs "some memo text"
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const orig = loadOriginal();
  console.log("registered channels:", orig.channels);
  const text = process.argv[2] ?? "hello #World\n#world #메모\r\n  \n";
  console.log(JSON.stringify(await orig.invoke("memo:summarize", text), null, 2));
}
