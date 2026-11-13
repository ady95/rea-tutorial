# toCsv 동작 명세 (notes-example)

대상: `C:/rea-labs/notes-example` (디렉터리 SHA-256 `97540263…8b08e0`),
`csv.js` SHA-256 `6875aeec…bd0018`.

확인 근거 구분:

- **[REA]** REA Evidence로 확인한 사실 (Evidence ID 표기)
- **[소스]** `csv.js` / `main.js` 소스를 직접 읽어 확인한 사실
- **[실행]** 원본 `csv.js`를 node v24.22.1로 직접 호출한 탐침 결과.
  REA `capture_process_scenario`가 Windows에서 지원되지 않아(`capability_unavailable`)
  REA Evidence가 아닌 일반 실행 관찰이다.

## 1. 모듈·호출 구조

| 사실 | 근거 |
|---|---|
| `csv.js`는 CommonJS 소스 모듈이며 내보내기 관계 1개(`default` = `module.exports`)를 가진다 | [REA] `ev_f1ecf182…db567` (부모 `ev_b363fbc3…d8ae`) |
| `main.js`는 1개의 main IPC 핸들러를 가지며, 렌더러 전송 1건과 짝지어진다 | [REA] 요약 `ev_5b1a69ef…c4420a` (main_handlers 1, paired_renderer_transmissions 1) |
| `module.exports = { toCsv }` — 내보내는 이름은 `toCsv` | [소스] csv.js:11 |
| `main.js`는 `ipcMain.handle("notes:export", …)` 안에서 `toCsv(notes)`를 호출하고 결과를 `downloads/notes.csv`에 `"utf8"`(BOM 없음)로 쓴다 | [소스] main.js:8-11 |
| main.js가 실제로 넘기는 입력은 `[{ id: 1, title: "First note" }]` | [소스] main.js:6 |

REA 한계: 문자열 리터럴 `"id,title"`로 `trace_application_feature` / `trace_javascript_semantics`를
시도했으나 매칭 0건(`ev_1ef17e03…a26`, `ev_6aada865…501`). 그래프 커버리지가 partial이므로
이는 부재 증거가 아니며, 아래 출력 규칙은 REA가 관찰하지 못했다.

## 2. 입력

- `notes`: `.map`을 가진 배열. 각 원소에서 `id`, `title` 속성만 읽는다. [소스][실행]
- 배열이 아니면(`undefined`, `null`, `{}`) `TypeError`가 던져진다. [실행]

## 3. 출력 규칙

반환값은 JS 문자열(호출자가 UTF-8로 인코딩).

1. 첫 줄은 정확히 `id,title`. [소스][실행]
2. 각 note마다 한 줄, 입력 순서 유지: `<id>,<quoted title>`. [소스][실행]
3. **id**: `String(id)` 그대로, 인용·이스케이프 없음 (`"1,2"` → `1,2`, `a"b` → `a"b`). [실행]
4. **title**: `String(title)`로 변환 후 모든 `"`를 `""`로 바꾸고 전체를 `"`로 감싼다.
   쉼표·줄바꿈 여부와 무관하게 **항상** 인용. [소스][실행]
   - `null` → `"null"`, `undefined`/누락 → `"undefined"`, `42` → `"42"`, `""` → `""`. [실행]
   - 제목 안의 `\n`, `\r\n`은 변환 없이 그대로 유지. [실행]
   - 한글 등 비ASCII는 변환 없이 그대로. [실행]
5. 줄 구분자는 `\n`(LF). 마지막 줄 뒤에도 `\n` 하나가 붙는다. [소스][실행]
6. 빈 배열 → `"id,title\n"`. [실행]

## 4. 관찰 예시 [실행]

| 입력 | 출력 (JSON 표기) |
|---|---|
| `[]` | `"id,title\n"` |
| `[{id:3,title:'say "hi"'}]` | `"id,title\n3,\"say \"\"hi\"\"\"\n"` |
| `[{id:4,title:"line1\nline2"}]` | `"id,title\n4,\"line1\nline2\"\n"` |
| `[{id:6,title:"한글 제목"}]` | `"id,title\n6,\"한글 제목\"\n"` |
| `[{id:1,title:"a"},{id:2,title:"b"}]` | `"id,title\n1,\"a\"\n2,\"b\"\n"` |
