# toCsv 동작 명세 (notes-example)

대상: `C:/rea-labs/notes-example` (디렉터리 SHA-256 `0ee325d4…f56f7bb`)

표기:
- **[REA]**: REA Evidence로 확인 (정적 분석, 실행 관찰 아님)
- **[SRC]**: 소스를 직접 읽어 확인
- **[추론]**: 위 두 가지에서 도출한 해석

## 1. 연결 구조

| 사실 | 근거 |
|---|---|
| `package.json`의 `main`이 `main.js`이고 Electron main 엔트리포인트로 해석됨 | [REA] `ev_b24bf238…` (edge `loads`/`maps_to`, 추론·high) |
| `main.js` 4행에서 `require("./csv.js")`로 `csv.js`를 가져오고, 바인딩 이름은 `toCsv` | [REA] trace `ev_704be4f9…`, import edge (`imported_name: "toCsv"`, `main.js` 4:6–4:37) |
| `csv.js`는 CommonJS 모듈이고 import는 0개, export 관계는 1개 (11행 `module.exports`) | [REA] 모듈 항목 `ev_9f86db15…`, `ev_f964146c…` |
| REA는 CommonJS export를 `default`라는 이름으로 기록함. 실제로는 `module.exports = { toCsv }` 객체이고 `toCsv`는 그 객체의 멤버임 | [REA] + [SRC]: 이름 표기만 다르고 모순은 아님 |
| `ipcMain.handle("notes:export")` 핸들러가 `toCsv(notes)`를 호출해 결과를 `downloads/notes.csv`에 `writeFileSync(..., "utf8")`로 저장함 | [REA] IPC 핸들러 1개·리터럴 채널 1개 집계 / 호출 위치와 저장 방식은 [SRC] |

## 2. 입력 규칙

- 인자 하나 `notes`를 받는 배열(`.map`을 가진 객체). [SRC]
- 각 원소에서 읽는 속성은 `id`와 `title` 두 개뿐이고, 나머지 속성은 무시함. [SRC]
- 입력 검증은 하지 않음. `notes`가 배열이 아니면 `.map`을 호출할 때 TypeError가 발생함. [SRC]

## 3. 출력 규칙

1. 반환값은 문자열 하나이고 부작용은 없음. [SRC]
2. 첫 줄은 항상 헤더 `id,title`. [SRC]
3. 입력 원소마다 한 줄씩, 입력 순서대로 출력함. [SRC]
4. 각 줄은 `<id>,<quoted title>` 형식임. [SRC]
   - `id`: 문자열로 바꿔서(템플릿 리터럴 보간, 즉 ToString) 그대로 넣음. **따옴표로 감싸지 않고 이스케이프도 하지 않음.** 쉼표, 따옴표, 줄바꿈이 들어 있어도 그대로 출력됨. `undefined`는 `undefined`, `null`은 `null`로 출력됨.
   - `title`: `String(title)`로 바꾼 뒤 모든 `"`를 `""`로 바꾸고 **항상** 양쪽을 `"`로 감쌈. 쉼표나 줄바꿈 같은 다른 문자는 손대지 않음. 줄바꿈(`\n`, `\r`)은 따옴표 안에 그대로 남음. `undefined`/`null`은 각각 `"undefined"`/`"null"`로 출력됨.
5. 줄 구분자는 `\n`(LF)이고 CRLF는 쓰지 않음. 마지막 줄 뒤에도 `\n`이 하나 붙음. [SRC]
6. 빈 배열이면 `"id,title\n"`를 반환함. [SRC → 3·5에서 도출]
7. 유니코드(한글 등)는 변환하지 않음. BOM은 `toCsv`가 추가하지 않고, 파일 저장 시 `writeFileSync`의 `"utf8"`도 BOM을 추가하지 않음. [SRC]

## 4. 미확인 / 한계

- REA 결과는 inert 정적 분석이며 앱을 실행하지 않았음. 런타임 동작은 compare.mjs에서 같은 입력을 넣어 비교하는 방식으로만 확인함.
- REA 모듈 뷰에서는 `toCsv` 함수 본문의 문자열 연산(이스케이프, 결합)이 노출되지 않았음. 그래서 3절의 세부 규칙은 소스 확인([SRC]) 결과임.
- `id`에 Symbol 같은 특이 값을 넣었을 때의 예외 동작은 명세 범위 밖임.
