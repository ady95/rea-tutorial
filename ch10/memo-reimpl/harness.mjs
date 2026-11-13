// Runs the original Memo Stats main-process code without Electron.
//
// main.js is read straight out of app.asar (no extraction, no copy on disk),
// evaluated as a CommonJS module whose `require("electron")` returns a fake.
// The fake ipcMain records every ipcMain.handle registration so tests can call
// the original handler directly.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { builtinModules, createRequire, Module } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_ASAR_PATH =
  process.env.MEMO_ASAR ?? path.resolve(here, "../memo-bin/app.asar");

/**
 * Read one file from an ASAR archive.
 * Layout: [u32 4][u32 headerPickleSize] then a pickle holding
 * [u32 payload][u32 jsonLength][json…]; file data starts at 8 + headerPickleSize.
 */
export function readAsarEntry(asarPath, entryPath) {
  const archive = readFileSync(asarPath);
  const headerPickleSize = archive.readUInt32LE(4);
  const jsonLength = archive.readUInt32LE(12);
  const header = JSON.parse(archive.toString("utf8", 16, 16 + jsonLength));

  let node = header;
  for (const part of entryPath.split("/")) {
    node = node.files?.[part];
    if (!node) throw new Error(`${entryPath} not found in ${asarPath}`);
  }
  if (node.unpacked) throw new Error(`${entryPath} is unpacked; not inside the archive`);
  if (node.offset === undefined) throw new Error(`${entryPath} is not a regular file`);

  const start = 8 + headerPickleSize + Number(node.offset);
  return archive.subarray(start, start + node.size);
}

function createFakeElectron() {
  const handlers = new Map();
  const windows = [];

  const ipcMain = {
    handle(channel, listener) {
      if (handlers.has(channel)) {
        // Electron throws on a second handler for the same channel.
        throw new Error(`Attempted to register a second handler for '${channel}'`);
      }
      handlers.set(channel, listener);
    },
    handleOnce(channel, listener) {
      this.handle(channel, (...args) => {
        handlers.delete(channel);
        return listener(...args);
      });
    },
    removeHandler(channel) {
      handlers.delete(channel);
    },
    on() {},
    once() {},
    removeListener() {},
  };

  class BrowserWindow {
    constructor(options = {}) {
      this.options = options;
      this.loaded = null;
      windows.push(this);
    }
    loadFile(file) {
      this.loaded = { file };
      return Promise.resolve();
    }
    loadURL(url) {
      this.loaded = { url };
      return Promise.resolve();
    }
    on() {}
  }

  const app = {
    whenReady: () => Promise.resolve(),
    isReady: () => true,
    on() {},
    quit() {},
  };

  return { electron: { app, BrowserWindow, ipcMain }, handlers, windows };
}

/**
 * Evaluate the original main.js against a fake electron module.
 * @returns {Promise<{invoke: (channel: string, ...args: unknown[]) => Promise<unknown>,
 *                    channels: string[], windows: object[], mainSha256: string,
 *                    asarSha256: string}>}
 */
export async function loadOriginalMain({ asarPath = DEFAULT_ASAR_PATH } = {}) {
  const source = readAsarEntry(asarPath, "main.js");
  const { electron, handlers, windows } = createFakeElectron();

  // Virtual location inside the archive so __dirname-based paths look like Electron's.
  const filename = path.join(asarPath, "main.js");
  const nodeRequire = createRequire(filename);
  const sandboxedRequire = (id) => {
    if (id === "electron") return electron;
    if (id.startsWith("node:") || builtinModules.includes(id)) return nodeRequire(id);
    throw new Error(`harness: main.js required unexpected module '${id}'`);
  };

  // Same realm as the tests, so deepStrictEqual sees ordinary Object/Array prototypes.
  const wrapper = vm.runInThisContext(Module.wrap(source.toString("utf8")), { filename });
  const module = { exports: {} };
  wrapper.call(module.exports, module.exports, sandboxedRequire, module, filename, path.dirname(filename));

  // Let app.whenReady().then(...) run so window creation errors surface here.
  await new Promise((resolve) => setImmediate(resolve));

  const fakeEvent = { sender: { id: 1, send() {} }, senderFrame: null, processId: 0, frameId: 0 };

  return {
    async invoke(channel, ...args) {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler registered for '${channel}'`);
      // ipcMain.handle resolves the handler's return value (sync or async).
      return handler(fakeEvent, ...args);
    },
    channels: [...handlers.keys()],
    windows,
    mainSha256: createHash("sha256").update(source).digest("hex"),
    asarSha256: createHash("sha256").update(readFileSync(asarPath)).digest("hex"),
  };
}
