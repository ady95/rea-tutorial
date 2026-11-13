# Memo Stats — 메모 통계 기능 요구사항

분석 대상: `C:/rea-labs/memo-bin/app.asar`
(SHA-256 `a4cf334833b8b363f95df9a83a373366291c61edf84251c2585902ab09eefcc6`)

이 문서는 배포된 ASAR만 보고 작성했다. 원본 소스 저장소는 참고하지 않았다.

## 근거 표기

| 표기 | 의미 |
|---|---|
| **[REA]** | REA 정적 분석이 반환한 Evidence. Evidence ID를 함께 적는다. |
| **[코드]** | REA가 ASAR에서 꺼낸 압축(minified) 코드를 직접 읽고 확인한 것. 실행해서 관찰한 것은 아니다. |
| **[추론]** | 위 두 가지에서 끌어낸 해석. 코드에 직접 쓰여 있지 않다. |

### 사용한 REA Evidence

| ID | 작업 | 내용 |
|---|---|---|
| `ev_c62e5d8c0bb4583e57569d192a16861fcaf27b62cc5b0aeb750d58522da776c0` | `analyze_javascript_application` | 앱 그래프 전체(부모 Evidence). JS 3개를 파싱했고 파싱 실패는 0건 |
| `ev_f0f9e03954a820cb29d5a714851f69ca00b380832b13399831f4ecfde09df7a1` | summary view | IPC 작업 2건, 리터럴 채널 1개, main handler 1개, 짝이 맞는 renderer 송신 1건, 짝 없는 송신 0건, BrowserWindow 1개, preload 1개, contextBridge API 1개(노출 멤버 1개) |
| `ev_b27cc69786c00b3a494393fa52310b13d13180c77c36cdb0c26d30f298ec4e6f` | javascript-facts view | 노드 `jag_node_1edf616f…` (kind `ipc-channel`, channel `memo:summarize`, operation `invoke`와 `handle`), 노드 `jag_node_7fae7c8f…` (kind `ipc-handler`, channel `memo:summarize`, operation `handle`) |
| `ev_034807a7754212bffd399b9c4fa6d78182937790469c3b1886c8e7d4906af1ff` | modules view | 모듈 `main.js`, `preload.js`, `renderer.js`. 외부 의존성은 `electron`과 `node:path`뿐 |
| `ev_e4dedfbb14dd07ee0c38f6e481ce04822a7599ac9ed9009d9de8e97b4b38e29e` | `extract_artifact` | 추출한 파일과 해시: `main.js` `3e02cf38…1ccf`(855 B), `preload.js` `ef7321e7…b246`, `renderer.js` `d1688701…7209`, `index.html`, `package.json` |

REA 한계(Evidence에 명시): 정적 분석 결과일 뿐이며 런타임 등록이나 실행을 증명하지 않는다. 시맨틱 그래프의 커버리지 상태는 `unknown`이고 미해결 항목이 134개 있다. 통계 계산 규칙(R-3 이하)은 REA가 의미 단위로 추출해 주지 않았으므로 **[코드]** 근거에 의존한다.

---

## R-1. 호출 경로(IPC)

| ID | 요구사항 | 근거 |
|---|---|---|
| R-1.1 | 통계 기능은 IPC 채널 **`memo:summarize`** 하나로 제공된다. | [REA] `ev_b27cc697…` `ipc-channel` 노드. [REA] `ev_f0f9e039…` 리터럴 채널 1개 |
| R-1.2 | main 프로세스는 `ipcMain.handle("memo:summarize", handler)`로 처리기를 등록한다(요청/응답 방식). | [REA] `ipc-handler` 노드, operation `handle`. [코드] `main.js` |
| R-1.3 | preload가 `contextBridge.exposeInMainWorld("memo", { summarize })`로 렌더러에 `window.memo.summarize(text)`를 노출한다. 이 함수는 `ipcRenderer.invoke("memo:summarize", text)`를 호출하고 그 Promise를 그대로 돌려준다. | [REA] contextBridge API 1개, invoke 송신 1건이 handler와 짝을 이룸. [코드] `preload.js` |
| R-1.4 | 렌더러는 `#analyze` 버튼을 클릭하면 `#memo` textarea의 값(문자열)을 넘긴다. | [코드] `renderer.js`, `index.html` |
| R-1.5 | 처리기는 동기 함수이고 이벤트 객체(첫 인자)를 쓰지 않는다. 발신자(sender)도 검증하지 않는다. | [코드] `main.js`. [REA] sender validation 관찰 0건 |

## R-2. 입력

| ID | 요구사항 | 근거 |
|---|---|---|
| R-2.1 | 입력은 처리기의 두 번째 인자 하나다. | [코드] |
| R-2.2 | 입력이 `null` 또는 `undefined`이면 빈 문자열 `""`로 바꾼다. 그 밖의 값은 `String(value)`로 문자열화한다(예: 숫자 `42` → `"42"`). | [코드] `String(e ?? "")` |
| R-2.3 | 실제 UI에서는 textarea 값이 들어가므로 입력은 항상 문자열이다. R-2.2는 다른 호출자에 대한 방어적 처리다. | [추론] |

## R-3. 출력

| ID | 요구사항 | 근거 |
|---|---|---|
| R-3.1 | 출력은 일반 객체 `{ lines, words, readingMinutes, tags }`이며 키 순서도 이와 같다. | [코드] |
| R-3.2 | `lines`, `words`, `readingMinutes`는 0 이상의 정수다(`readingMinutes`는 1 이상). | [코드] |
| R-3.3 | `tags`는 `{ tag: string, count: number }` 객체의 배열이고 원소는 최대 3개다. 각 객체의 키 순서는 `tag`, `count`다. | [코드] |
| R-3.4 | 렌더러는 이를 `"{lines}줄 · {words}단어 · 약 {readingMinutes}분 · #tag(count) …"` 형식으로 표시한다. 이 표시는 재구현 범위에 포함하지 않는다. | [코드] `renderer.js` |

## R-4. 계산 규칙 (`text`는 R-2 적용 후의 문자열)

### R-4.1 `lines` — 내용이 있는 줄 수

| ID | 요구사항 | 근거 |
|---|---|---|
| R-4.1.1 | 정규식 `/\r?\n/`로 나눈다. 따라서 LF와 CRLF 모두 줄바꿈이고, **단독 CR(`\r`)은 줄바꿈이 아니다.** | [코드] |
| R-4.1.2 | 나눈 조각 중 `String.prototype.trim()` 결과가 빈 문자열이 아닌 것만 센다. 공백만 있는 줄(스페이스, 탭, NBSP, 전각 공백 U+3000 등 JS가 공백으로 보는 문자)은 세지 않는다. | [코드] |
| R-4.1.3 | 빈 문자열의 `lines`는 0이다. 끝에 붙은 줄바꿈 때문에 생기는 빈 조각도 세지 않는다. | [코드] + [추론](R-4.1.2에서 따라 나옴) |

### R-4.2 `words` — 단어 수

| ID | 요구사항 | 근거 |
|---|---|---|
| R-4.2.1 | 정규식 `/\s+/`(JS 공백 문자 클래스, 유니코드 공백 포함)로 나눈 뒤 빈 조각을 버린 개수다. 즉 **공백이 아닌 문자가 연속된 덩어리의 수**와 같다. | [코드] + [추론](두 정의가 동치) |
| R-4.2.2 | 구두점이나 `#태그`도 단어로 센다(예: `"#a,b"`는 1단어). 한글도 공백으로만 구분한다. | [추론] |

### R-4.3 `readingMinutes` — 예상 읽기 시간(분)

| ID | 요구사항 | 근거 |
|---|---|---|
| R-4.3.1 | `max(1, ceil(words / 200))`. 분당 200단어로 계산한다. | [코드] |
| R-4.3.2 | 0~200단어는 1분, 201~400단어는 2분, 401단어는 3분이다. | [추론](R-4.3.1에서 계산) |

### R-4.4 `tags` — 상위 3개 태그

| ID | 요구사항 | 근거 |
|---|---|---|
| R-4.4.1 | 태그는 정규식 `/#([\p{L}\p{N}_]+)/gu`에 맞는 부분이다. `#` 뒤에 유니코드 문자(L), 숫자(N), `_`가 하나 이상 이어진다. 한글과 영문 모두 태그가 된다. | [코드] |
| R-4.4.2 | 태그 본문은 허용되지 않는 첫 문자(공백, `-`, `.`, `#`, 결합 문자 M 등)에서 끝난다. 예: `#todo-list` → `todo`, `#a#b` → `a`와 `b`. | [코드] + [추론] |
| R-4.4.3 | `#` 앞 문자는 제한이 없다. `mail#tag`의 `tag`, `##x`의 `x`도 태그다. `#` 뒤에 허용 문자가 없으면(`# ` 또는 끝의 `#`) 태그가 아니다. | [코드] + [추론] |
| R-4.4.4 | 태그 이름은 `String.prototype.toLowerCase()`로 소문자화해서 집계한다(대소문자 구분 없음). `#Work`, `#WORK`, `#work`는 모두 `work`다. 출력 `tag`에는 `#`이 붙지 않은 소문자 이름이 들어간다. | [코드] |
| R-4.4.5 | 정렬 1순위는 `count` 내림차순이다. | [코드] |
| R-4.4.6 | 정렬 2순위(동점)는 `tag` 오름차순이며 **UTF-16 코드 단위 비교**(`<`, `>` 연산자)를 쓴다. `localeCompare`는 쓰지 않는다. 따라서 순서는 코드 값 순서인 `0-9`(0x30~) < `_`(0x5F) < `a-z`(0x61~) < 한글 음절(0xAC00~)이다. | [코드] + [추론](순서 예시) |
| R-4.4.7 | 정렬한 뒤 앞의 3개만 남긴다. 태그가 없으면 빈 배열이다. | [코드] |

## R-5. 범위 밖 / 미확인

| ID | 내용 | 근거 |
|---|---|---|
| U-1 | 원본은 메모를 저장하거나 파일·네트워크에 접근하지 않는다. 통계 함수는 순수 함수다. | [코드] + [REA] request/resource/config 관계 0건(정적 결과이므로 부재를 증명하지는 않음) |
| U-2 | 실제 Electron 런타임에서 IPC 직렬화(structured clone)를 거친 뒤 렌더러가 받는 값의 동일성은 관찰하지 않았다. 반환값이 일반 객체와 숫자, 문자열로만 이루어져 있으므로 바뀌지 않을 것으로 본다. | [추론] |
| U-3 | `toLowerCase`의 특수 매핑(예: `İ` → `i̇`)과 `\p{L}`/`\p{N}`의 범위는 실행하는 JS 엔진의 유니코드 버전을 따른다. 재구현도 같은 내장 기능을 쓰므로 같은 엔진에서는 결과가 일치한다. | [추론] |
