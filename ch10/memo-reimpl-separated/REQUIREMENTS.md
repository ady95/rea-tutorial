# Memo Stats — 메모 통계 기능 요구사항

대상: `C:/rea-labs/memo-bin/app.asar` (SHA-256 `a4cf334833b8b363f95df9a83a373366291c61edf84251c2585902ab09eefcc6`)

이 문서는 재구현자가 원본 코드를 보지 않고도 동일한 동작을 만들 수 있도록 **동작 규칙만** 기술한다.
원본 코드 조각은 의도적으로 싣지 않았다.

## 근거 표기

| 표기 | 의미 |
|---|---|
| **[REA]** | REA 정적 분석 Evidence로 관측된 사실 (Evidence ID 병기) |
| **[CODE]** | REA `extract_artifact`로 꺼낸 번들(압축) 코드를 사람이 직접 읽어 확인한 사실 |
| **[INF]** | 위 사실들로부터의 추론 (실행으로 검증 전) |

주요 Evidence:
- `ev_c62e5d8c…776c0` — `analyze_javascript_application` (앱 그래프, 원본 분석)
- `ev_c5eef170…1d50f` — 위 Evidence의 `javascript-facts` 뷰 (IPC/브리지 관측 행)
- `ev_7918598e…7b476` — `extract_artifact` (asar 내 파일 5개 추출, 무결성 검증 완료)

---

## 1. 호출 경로 (IPC)

| ID | 요구사항 | 근거 |
|---|---|---|
| R1.1 | 통계 기능은 IPC 채널 **`memo:summarize`** 하나로 제공된다. 앱 전체에서 리터럴 IPC 채널은 이것 하나뿐이다. | [REA] `ev_c62e5d8c…`: `literal_channels: 1`, `main_handlers: 1`, `paired_renderer_transmissions: 1` |
| R1.2 | main 프로세스(`main.js`)가 `ipcMain.handle("memo:summarize", …)`로 처리기를 등록한다 (main.js 1:676–1:699). | [REA] `ev_c5eef170…` 행 `kind: ipc-handler`, `operation: handle`, `channel: memo:summarize` |
| R1.3 | preload(`preload.js`)가 `contextBridge`로 `window.memo.summarize(text)`를 노출하며, 이는 `ipcRenderer.invoke("memo:summarize", text)`를 호출한다. | [REA] `ev_c5eef170…` 행 `kind: context-bridge-api`, `ipc-channel operation: invoke` (preload.js 4:23–4:65) |
| R1.4 | 처리기는 두 번째 인자(렌더러가 보낸 값) 하나만 사용하고 첫 번째 인자(IPC event)는 사용하지 않는다. | [CODE] |
| R1.5 | 처리기는 결과 객체를 **동기적으로** 반환한다(내부에 await/Promise 없음). 렌더러 측은 Electron `invoke` 특성상 Promise로 받는다. | [CODE] / [INF] 렌더러 쪽 Promise는 Electron 동작 |
| R1.6 | 계산 로직은 번들 내부 CommonJS 모듈 하나에 `summarize` 라는 이름으로 내보내져 있으며, 처리기는 이를 호출만 한다. 외부 패키지 의존성은 없다(`electron`, `node:path`만 require). | [REA] 모듈 해석 행 `require:electron`, `require:node:path` / [CODE] |

## 2. 입력

| ID | 요구사항 | 근거 |
|---|---|---|
| R2.1 | 처리기가 받은 값이 `null` 또는 `undefined`이면 빈 문자열 `""`로 취급한다. | [CODE] |
| R2.2 | 그 외의 값은 JavaScript `String(value)` 변환 결과를 텍스트로 사용한다 (예: 숫자 `42` → `"42"`). | [CODE] |
| R2.3 | 재구현 함수 시그니처: `summarize(text: string) → Stats`. R2.1/R2.2의 변환은 IPC 처리기 계층의 책임이며, `summarize` 자체는 문자열을 받는다고 가정한다. (재구현에서 `summarize`가 문자열이 아닌 값을 받으면 같은 변환을 적용해도 무방하다.) | [CODE] / [INF] |

## 3. 출력

반환값은 다음 키를 **이 순서로** 가진 일반 객체이다. [CODE]

```
{
  lines:          number,   // 정수 ≥ 0
  words:          number,   // 정수 ≥ 0
  readingMinutes: number,   // 정수 ≥ 1
  tags:           Array<{ tag: string, count: number }>  // 길이 0~3
}
```

렌더러는 이를 `"{lines}줄 · {words}단어 · 약 {readingMinutes}분 · #tag(count) …"` 형태로 표시한다. [CODE] (renderer.js — 표시용이며 재구현 범위 밖)

## 4. 계산 규칙

### 4.1 lines — 비어 있지 않은 줄 수

| ID | 요구사항 | 근거 |
|---|---|---|
| R4.1.1 | 텍스트를 줄바꿈으로 나눈다. 줄 구분자는 **LF(`\n`)** 와 **CRLF(`\r\n`)** 두 가지뿐이다. 단독 CR(`\r`)은 줄 구분자가 **아니다**. 그 외 유니코드 줄 구분자(U+2028 등)도 줄 구분자가 아니다. | [CODE] |
| R4.1.2 | 나뉜 각 조각에서 앞뒤 공백을 제거(JavaScript `String.prototype.trim()`과 동일한 공백 정의: 일반 공백, 탭, NBSP, U+3000 전각 공백, BOM 등 포함)한 결과가 빈 문자열이 아닌 조각의 개수가 `lines`이다. | [CODE] |
| R4.1.3 | 따라서 빈 줄, 공백·탭만 있는 줄은 세지 않는다. 빈 입력 `""`의 `lines`는 0이다. 마지막 줄 끝의 줄바꿈은 결과에 영향을 주지 않는다. | [INF] R4.1.1~2로부터 |

### 4.2 words — 단어 수

| ID | 요구사항 | 근거 |
|---|---|---|
| R4.2.1 | 텍스트 전체를 **공백 문자 1개 이상의 연속**을 구분자로 나눈다. 공백 문자의 정의는 JavaScript 정규식 `\s`와 동일하다(스페이스, 탭, LF, CR, VT, FF, NBSP, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF). | [CODE] |
| R4.2.2 | 나뉜 조각 중 빈 문자열이 아닌 것의 개수가 `words`이다 (앞뒤 공백으로 생기는 빈 조각은 제외). | [CODE] |
| R4.2.3 | 문장부호는 별도 처리하지 않는다. `"a,b"`는 1단어, `"#태그"`도 1단어이다. 한글 어절도 공백 기준으로만 센다. | [INF] R4.2.1로부터 |

### 4.3 readingMinutes — 예상 읽기 시간(분)

| ID | 요구사항 | 근거 |
|---|---|---|
| R4.3.1 | `readingMinutes = max(1, ceil(words / 200))`. 분당 200단어, 올림, 최소 1분. | [CODE] |
| R4.3.2 | 예: words 0 → 1, 200 → 1, 201 → 2, 400 → 2, 401 → 3. | [INF] |

### 4.4 tags — 상위 해시태그

| ID | 요구사항 | 근거 |
|---|---|---|
| R4.4.1 | 태그는 `#` 바로 뒤에 오는 **유니코드 문자(Letter, 일반 범주 L*), 유니코드 숫자(Number, 일반 범주 N*), 밑줄 `_`** 의 최대 길이 연속(1자 이상)이다. 태그 이름에 `#`은 포함하지 않는다. | [CODE] |
| R4.4.2 | `#` 앞에 무엇이 오든 상관없다(단어 경계 조건 없음). 예: `"a#b"` 에서 `b`가 태그. | [CODE] / [INF] |
| R4.4.3 | `-`, `.`, 공백, 이모지, 결합 문자(Mark, M*) 등 R4.4.1 집합 밖의 문자를 만나면 태그가 끝난다. 예: `#foo-bar` → `foo`. `#` 뒤에 바로 집합 밖 문자가 오면 태그가 아니다. | [CODE] / [INF] |
| R4.4.4 | 텍스트를 왼쪽부터 겹치지 않게 탐색한다. `##abc` → 첫 `#`은 실패, 두 번째 `#`에서 `abc` 매치. `#a#b` → `a`, `b` 두 개. | [INF] 전역 정규식 매칭 의미론 |
| R4.4.5 | 태그 이름은 JavaScript `String.prototype.toLowerCase()`(로캘 무관)로 소문자화한 뒤 집계한다. 따라서 `#Foo`, `#FOO`, `#foo`는 같은 태그 `foo`로 합산된다. 한글은 대소문자가 없으므로 그대로이다. | [CODE] |
| R4.4.6 | 소문자화된 태그별 등장 횟수를 센다. | [CODE] |
| R4.4.7 | 정렬: ① `count` 내림차순, ② 동점이면 `tag` 오름차순. 문자열 비교는 JavaScript `<`/`>` 연산자와 동일한 **UTF-16 코드 유닛 순서**이다(`localeCompare` 아님). 따라서 숫자·영문 소문자 태그가 한글 태그보다 앞선다. | [CODE] |
| R4.4.8 | 정렬 후 **앞에서 3개까지만** 반환한다. 태그가 없으면 빈 배열. | [CODE] |
| R4.4.9 | 각 원소는 `{ tag, count }` (키 순서 동일), `tag`는 소문자화된 이름(`#` 없음)이다. | [CODE] |

## 5. 부수 효과 / 오류

| ID | 요구사항 | 근거 |
|---|---|---|
| R5.1 | 계산은 순수 함수이다. 파일·네트워크·전역 상태를 사용하지 않는다. | [REA] request/resource/configuration 추출 결과 0건 (`ev_c62e5d8c…` semantic families) / [CODE] |
| R5.2 | 입력 검증·길이 제한·예외 처리가 없다. 어떤 문자열이든 결과를 반환한다. | [CODE] |

## 6. 범위 밖 / 미확인

- 런타임 실행 관측은 하지 않았다. REA 결과는 정적 분석이며 실행을 증명하지 않는다(Evidence limitations). 실제 동작 일치는 harness.mjs + compare.test.mjs로 검증한다.
- 렌더러 표시 형식, 창 생성(BrowserWindow 640×480, preload 지정)은 재구현 범위 밖이다. [REA] `browser-window` 관측
- 매우 큰 입력에서의 성능 특성은 확인하지 않았다.
