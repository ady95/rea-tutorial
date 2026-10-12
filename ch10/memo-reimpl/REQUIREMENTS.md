# Memo Stats — 메모 통계 기능 요구사항

대상: `C:/rea-labs/memo-bin/app.asar` (SHA-256 `9a1a05402f8ab8bf7fecc6ecd21c71eb27eed208f6e014c5346d1dbe072ffa5a`)

이 문서는 재구현(`summarize.mjs`)의 유일한 입력입니다. 원본 코드 조각은 싣지 않고, 관찰된 동작을 말로 기술합니다.

## 근거 표기

| 표기 | 의미 |
|---|---|
| **[REA]** | REA 정적 분석 Evidence에서 관찰한 사실. Evidence ID와 graph node/observation을 함께 적음 |
| **[CODE]** | REA가 추출한 압축 코드를 직접 읽고 확인한 사실. 위치는 `파일:행:컬럼범위`(0-based 컬럼) |
| **[INFER]** | 위 두 근거와 JavaScript/Electron 의미론에서 이끌어 낸 추론. 비교 테스트로 검증할 대상 |

주요 REA Evidence

- `ev_4ed3b5a1…abf5d` — `analyze_javascript_application` 전체 분석 (parent)
- `ev_7f1e8f0c…1b442` — `extract_artifact` (asar 구성 파일 5개 추출, 무결성 불일치 없음)
- 분석 범위: 관련 파일 5개, JS 파싱 3개, 파싱 실패 0, IPC 연산 2개(리터럴 채널 1개, 동적 채널 0개)

## 1. 앱 구성

| ID | 요구사항 | 근거 |
|---|---|---|
| A-1 | 앱은 `main.js`(855 B, 번들·압축됨), `preload.js`, `renderer.js`, `index.html`, `package.json`(`main: "main.js"`)으로 구성된다. | [REA] `ev_7f1e8f0c…` 추출 목록 |
| A-2 | 통계 계산은 main 프로세스(`main.js`) 안의 번들된 내부 모듈에 있고, 그 모듈은 `summarize` 하나를 export한다. | [CODE] `main.js:1:78-332`(내부 모듈), 객체 export는 `main.js:1:620` 부근 · [REA] semantic node `destructure:/summarize`(`main.js:1:643-644`). 단, REA semantic 분석은 이 binding의 값을 `unknown-value`로 남김(unknown `jsrg_unknown_67302f2c…`) → 함수 본문은 [CODE]로만 확인 |

## 2. IPC 계약

| ID | 요구사항 | 근거 |
|---|---|---|
| I-1 | 채널 이름은 정확히 `memo:summarize`이다. | [REA] `ev_4ed3b5a1…` observation `observe-ipc-handler`(main.js:1:676-699, `channel: "memo:summarize"`, `mode: handle`) |
| I-2 | main 쪽은 `ipcMain.handle`(요청/응답형)로 등록한다. `ipcMain.on`/`send` 계열이 아니다. | [REA] 같은 observation `operation: "handle"`, edge `map-ipc-handler-registration`(main.js:1:650-700) |
| I-3 | preload는 `contextBridge`로 `window.memo` 객체를 노출하고, 멤버는 `summarize` 하나다. `memo.summarize(text)`는 `ipcRenderer.invoke("memo:summarize", text)`를 그대로 돌려준다(Promise). | [REA] node `context-bridge-api`(preload.js:3:0-5:2, `api_key: memo`, `members: ["summarize"]`), observation `observe-ipc-channel-expression`(preload.js:4:23-65, `operation: invoke`) |
| I-4 | renderer → main 송신과 main 처리기는 리터럴 채널 일치로 짝지어진다(유일 매칭). | [REA] edge `pair-ipc-literal-channel`(`pairing_basis: unique-exact-literal-channel`, `handler_path: main.js`). REA 한계: 정적 일치이며 런타임 등록을 증명하지 않음 |
| I-5 | renderer는 `#memo` 입력값(문자열)을 보내고, 응답의 `lines`, `words`, `readingMinutes`, `tags[].tag`, `tags[].count`를 읽어 `"{lines}줄 · {words}단어 · 약 {readingMinutes}분 · #tag(count) …"` 형식으로 표시한다. | [CODE] `renderer.js:4-8` · [REA] semantic node `read:/memo/summarize`(renderer.js:5:22-43) |
| I-6 | 처리기는 첫 인자(event)를 쓰지 않는다. 발신자 검증이 없다. | [CODE] `main.js:1:676-699` · [REA] summary `sender_validation_observations: 0` |
| I-7 | 처리기는 동기적으로 결과 객체를 돌려준다. Electron의 `handle`이 이를 Promise로 감싸 renderer에 구조화 복제(structured clone)된 값으로 전달한다. | [CODE] 처리기 본문에 `await`/Promise 없음 · [INFER] Electron `ipcMain.handle` 의미론 |

## 3. 입력

| ID | 요구사항 | 근거 |
|---|---|---|
| IN-1 | 처리기는 두 번째 인자(renderer가 보낸 값)를 문자열로 바꾼 뒤 계산한다. 값이 `null` 또는 `undefined`이면 빈 문자열 `""`로, 그 밖에는 `String(값)`으로 바꾼다(예: `123` → `"123"`, `["a","b"]` → `"a,b"`, 일반 객체 → `"[object Object]"`). | [CODE] `main.js:1:685-698` (nullish 병합 후 `String` 변환) |
| IN-2 | 재구현 모듈의 `summarize(input)`도 IN-1과 같은 변환을 먼저 적용한다. 문자열 입력이면 변환은 아무것도 바꾸지 않는다. | 설계 결정(재구현을 처리기와 같은 경계로 맞춤) |

## 4. 출력

| ID | 요구사항 | 근거 |
|---|---|---|
| O-1 | 결과는 일반 객체이며 키는 이 순서로 정확히 4개다: `lines`, `words`, `readingMinutes`, `tags`. | [CODE] `main.js:1:475` 부근 객체 리터럴 |
| O-2 | `lines`, `words`, `readingMinutes`는 0 이상의 정수(number)다. `readingMinutes`는 1 이상이다. | [CODE] 아래 규칙에서 도출 |
| O-3 | `tags`는 배열이며 원소는 키 순서 `tag`(string), `count`(number)인 객체다. 원소는 0~3개다. | [CODE] `main.js:1:78-332` |

## 5. 계산 규칙

### 5.1 lines — 내용이 있는 줄 수

| ID | 요구사항 | 근거 |
|---|---|---|
| L-1 | 텍스트를 줄바꿈으로 나눈다. 줄바꿈은 `\n`(LF) 또는 `\r\n`(CRLF)이며, 둘이 섞여 있어도 각각 줄바꿈 하나로 본다. | [CODE] `main.js:1:355-369` |
| L-2 | 단독 `\r`(옛 Mac 방식 CR)은 줄바꿈으로 보지 않는다. `U+2028`/`U+2029`도 줄바꿈이 아니다. | [INFER] L-1의 패턴이 `\r` 뒤에 `\n`이 올 때만 소비함 |
| L-3 | 나눈 조각 중 앞뒤 공백을 제거(JavaScript `String.prototype.trim` 기준)했을 때 빈 문자열이 아닌 것만 센다. 공백·탭만 있는 줄, `U+3000`(전각 공백), `U+00A0`(NBSP)만 있는 줄은 세지 않는다. 남은 단독 `\r`도 trim 대상이므로 `"\r"`만 있는 조각은 세지 않는다. | [CODE] `main.js:1:370-393` · [INFER] trim의 공백 집합(WhiteSpace + LineTerminator) |
| L-4 | 빈 문자열의 `lines`는 0이다. 끝에 줄바꿈이 있어도 빈 조각은 세지 않는다. | [INFER] L-1, L-3에서 도출 |

### 5.2 words — 단어 수

| ID | 요구사항 | 근거 |
|---|---|---|
| W-1 | 텍스트 전체를 공백 문자 1개 이상의 연속으로 나누고, 빈 조각을 버린 뒤 그 개수를 센다. 공백 문자는 JavaScript 정규식 `\s`의 집합(탭, LF, CR, 공백, NBSP, `U+3000`, `U+2028`, `U+FEFF` 등 유니코드 공백 포함)이다. | [CODE] `main.js:1:406-437` |
| W-2 | 단어는 공백 외 문자의 연속이다. 구두점만 있는 토큰(예: `—`, `...`)과 태그(`#foo`)도 단어 1개로 센다. 한글 어절도 공백 기준으로 센다(형태소 분리 없음). | [INFER] W-1에서 도출 |
| W-3 | 빈 문자열과 공백만 있는 문자열의 `words`는 0이다. | [INFER] W-1에서 도출 |

### 5.3 readingMinutes — 예상 읽기 시간(분)

| ID | 요구사항 | 근거 |
|---|---|---|
| R-1 | `readingMinutes = max(1, ceil(words / 200))`. 분당 200단어 기준이며 최소 1분이다. | [CODE] `main.js:1:446-474` |
| R-2 | 따라서 words 0 → 1, 200 → 1, 201 → 2, 400 → 2, 401 → 3. | [INFER] R-1에서 도출 |

### 5.4 tags — 상위 태그

| ID | 요구사항 | 근거 |
|---|---|---|
| T-1 | 태그는 `#` 바로 뒤에 오는, 다음 문자 1개 이상의 가장 긴 연속이다: 유니코드 문자(General Category `L*`: 한글·한자·라틴 등), 유니코드 숫자(`N*`: `Nd`, `Nl`, `No` — 예 `２`, `Ⅻ`, `①`), 밑줄 `_`. 유니코드(코드 포인트) 단위로 판정한다(서로게이트 쌍 문자도 한 문자). | [CODE] `main.js:1:121-162` (유니코드 플래그가 있는 전역 정규식) |
| T-2 | `#` 앞 문자에는 제약이 없다(단어 경계 없음). `a#b`에서 `b`, `##x`에서 `x`, URL의 `page#top`에서 `top`이 태그다. | [INFER] T-1 패턴에 앞쪽 조건 없음 |
| T-3 | 하이픈·마침표·작은따옴표·공백·결합 문자(`M*`, 예: 분해형 악센트 `U+0301`) 등은 태그를 끝낸다. `#tag-name` → `tag`. `#` 뒤에 허용 문자가 없으면 태그가 아니다. 전각 `＃`(`U+FF03`)는 `#`이 아니다. | [INFER] T-1에서 도출 |
| T-4 | 검색은 왼쪽부터 겹치지 않게 진행한다. 줄 구분과 관계없이 텍스트 전체를 대상으로 한다. | [CODE] 전역 `matchAll` · [INFER] |
| T-5 | 각 태그를 `String.prototype.toLowerCase()`(로캘 무관)로 소문자화한 값을 키로 개수를 센다. 따라서 `#Foo`, `#FOO`, `#foo`는 같은 태그 `foo`다. 한글은 대소문자가 없어 그대로다. 소문자화로 길이가 바뀌는 경우(예: `İ` → `i̇`)도 그 결과를 그대로 키로 쓴다. | [CODE] `main.js:1:165-178` |
| T-6 | 정렬: `count` 내림차순, 같으면 `tag` 오름차순. `tag` 비교는 JavaScript 문자열 `<`/`>` 비교, 즉 **UTF-16 코드 단위 순서**다. `localeCompare`나 코드 포인트 순서가 아니다(예: 서로게이트 쌍 문자 `𝒜`(D835…)가 `ｱ`(FF71)보다 앞선다). | [CODE] `main.js:1:258-320` |
| T-7 | 정렬 후 앞에서 최대 3개만 반환한다. 태그가 없으면 빈 배열이다. | [CODE] `main.js:1:321-331` |
| T-8 | 반환되는 `tag`는 `#`을 뺀 소문자화된 문자열이고, `count`는 등장 횟수다. | [CODE] `main.js:1:78-332` |

## 6. 범위 밖 / 미확인

| ID | 내용 | 근거 |
|---|---|---|
| U-1 | 창 생성(640×480, preload 지정)과 `index.html` 로드는 통계 기능과 무관하므로 재구현하지 않는다. | [CODE] `main.js:1:701-` · [REA] summary `browser_windows: 1`, `preload_entrypoints: 1` |
| U-2 | 정적 분석은 처리기가 런타임에 실제 등록·호출되는지 증명하지 않는다. 이는 `harness.mjs`로 원본 main 코드를 실행해 확인한다. | [REA] limitation "Electron relationships are derived from inert syntax…" |
| U-3 | 구조화 복제가 불가능한 값(함수, Symbol 등)을 renderer가 보내면 Electron이 IPC 전송 단계에서 거부하므로 처리기에 도달하지 않는다. 재구현은 이 경우를 다루지 않는다. | [INFER] Electron IPC 의미론 |
| U-4 | 매우 긴 입력에 대한 크기 제한이나 잘라내기는 없다. | [CODE] 길이 검사 없음 |

## 7. 재구현 모듈 인터페이스

- 파일: `summarize.mjs` (ES module, 외부 의존성 없음)
- `export function summarize(input)` — IN-1/IN-2 변환 후 5장의 규칙으로 O-1~O-3 형태의 객체를 반환
- `export const CHANNEL = "memo:summarize"` — I-1
