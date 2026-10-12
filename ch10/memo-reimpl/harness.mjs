// 원본 Memo Stats의 main 프로세스 코드를 Electron 없이 실행하는 하네스.
//
// - app.asar 를 직접 파싱해 package.json 의 main 엔트리(main.js)를 읽는다.
// - require("electron") 만 가짜 모듈로 바꾸고, 나머지 require 는 Node 에 맡긴다.
// - 원본이 ipcMain.handle 로 등록한 처리기를 모아 invoke() 로 호출할 수 있게 한다.
// - invoke() 는 Electron IPC 처럼 인자와 결과를 structuredClone 으로 복제한다.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";

export const DEFAULT_ASAR = process.env.MEMO_ASAR ?? "C:/rea-labs/memo-bin/app.asar";

// asar 형식: [u32 4][u32 headerPickleSize] + header pickle([u32 payload][u32 jsonLen][json]) + 파일 데이터
export function readAsar(asarPath) {
  const buf = readFileSync(asarPath);
  const headerPickleSize = buf.readUInt32LE(4);
  const jsonLen = buf.readUInt32LE(12);
  const header = JSON.parse(buf.toString("utf8", 16, 16 + jsonLen));
  const dataBase = 8 + headerPickleSize;

  function entry(relPath) {
    let node = header;
    for (const part of relPath.split("/")) {
      node = node.files?.[part];
      if (!node) throw new Error(`asar에 ${relPath} 가 없습니다: ${asarPath}`);
    }
    return node;
  }

  return {
    header,
    readFile(relPath) {
      const e = entry(relPath);
      if (e.unpacked) {
        return readFileSync(path.join(`${asarPath}.unpacked`, relPath), "utf8");
      }
      const start = dataBase + Number(e.offset);
      return buf.toString("utf8", start, start + e.size);
    },
  };
}

function createFakeElectron() {
  const handlers = new Map();
  const windows = [];

  const ipcMain = {
    handle(channel, listener) {
      if (handlers.has(channel)) {
        // 실제 Electron 과 같은 동작: 같은 채널에 두 번째 handle 은 오류
        throw new Error(`Attempted to register a second handler for '${channel}'`);
      }
      handlers.set(channel, listener);
    },
    handleOnce(channel, listener) {
      ipcMain.handle(channel, listener);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    },
    on() {},
    once() {},
  };

  class BrowserWindow {
    constructor(options) {
      this.options = options;
      this.loaded = null;
      windows.push(this);
    }
    loadFile(file) {
      this.loaded = file;
      return Promise.resolve();
    }
    loadURL(url) {
      this.loaded = url;
      return Promise.resolve();
    }
  }

  const app = {
    // 창 생성 경로까지 실행되도록 즉시 resolve 한다. BrowserWindow 는 기록만 하는 가짜다.
    whenReady: () => Promise.resolve(),
    on() {},
    quit() {},
  };

  const electron = { app, BrowserWindow, ipcMain };
  return { electron, handlers, windows };
}

/**
 * 원본 main 엔트리를 가짜 electron 으로 실행하고 등록된 IPC 처리기를 돌려준다.
 * @param {{ asarPath?: string }} [options]
 */
export function loadOriginal({ asarPath = DEFAULT_ASAR } = {}) {
  const asar = readAsar(asarPath);
  const pkg = JSON.parse(asar.readFile("package.json"));
  const mainRel = (pkg.main ?? "index.js").replace(/^\.\//, "");
  const source = asar.readFile(mainRel);

  // Electron 이 asar 안 파일에 주는 것과 같은 가상 경로
  const filename = path.join(asarPath, mainRel);
  const dirname = path.dirname(filename);

  const { electron, handlers, windows } = createFakeElectron();
  const nodeRequire = createRequire(filename);
  const requests = [];
  const fakeRequire = (id) => {
    requests.push(id);
    if (id === "electron") return electron;
    return nodeRequire(id);
  };

  const module = { exports: {} };
  const wrapper = vm.compileFunction(
    source,
    ["exports", "require", "module", "__filename", "__dirname"],
    { filename },
  );
  wrapper.call(module.exports, module.exports, fakeRequire, module, filename, dirname);

  // renderer 의 ipcRenderer.invoke 에 대응하는 호출
  async function invoke(channel, ...args) {
    const listener = handlers.get(channel);
    if (!listener) throw new Error(`No handler registered for '${channel}'`);
    const event = { sender: { id: 1 }, senderFrame: null, processId: 0, frameId: 0 };
    const result = await listener(event, ...structuredClone(args));
    return structuredClone(result);
  }

  return {
    asarPath,
    mainEntry: mainRel,
    channels: () => [...handlers.keys()],
    handlers,
    windows,
    requests,
    invoke,
  };
}
