# 5장. JavaScript와 Electron 애플리케이션 역공학

검증 환경: REA(rea-agents) 6.8.0 · Windows 11 · Node.js 24.22.1 · Claude Code 2.1.299 (claude-opus-5-5) · 2026-11-13

## 분석 대상

REA 공식 Notes 예제(MIT License, Copyright (c) 2026 morluto)를 사용합니다. 이 저장소에는 예제를 넣지 않았으니 공식 사이트에서 받으세요.

Windows (PowerShell):

```powershell
cd C:/rea-labs
Invoke-WebRequest -Uri https://rea.tools/examples/notes-example.zip -OutFile notes-example.zip -UseBasicParsing
Expand-Archive notes-example.zip -DestinationPath .
(Get-FileHash notes-example.zip -Algorithm SHA256).Hash
# 9330AFF104EDE33E4E1517B1C50B479F0432B66EADA4E01E4F3F3587E7A6EE5B (2026-11-13)
# 첫판(2026-10-13)의 해시는 646EC1EE…였습니다. 그 뒤 renderer.js만 바뀌었습니다(209 → 396바이트).
```

macOS (터미널):

```bash
mkdir -p ~/rea-labs && cd ~/rea-labs
curl -LO https://rea.tools/examples/notes-example.zip
unzip notes-example.zip
shasum -a 256 notes-example.zip
```

## 폴더

| 경로 | 내용 | 본문 |
|---|---|---|
| prompts/ | 실습에 쓴 프롬프트 원문 | 05-5 |
| scripts/try-csv.js | toCsv 출력 확인 (C:/rea-labs에 복사해 실행, 예제 폴더 안에 두지 말 것) | 05-2 |
| scripts/make-trace-input.js | CLI trace 입력 JSON 생성 | 05-4 |
| csv-reimpl/ | 재구현 맛보기 결과 (Claude Code가 생성) | 05-5 실습 3 |

## 재구현 비교 테스트 실행

`csv-reimpl` 폴더를 `C:/rea-labs/csv-reimpl` 로 복사하면 `compare.mjs` 가 `../notes-example/csv.js` 를 찾을 수 있습니다.

```powershell
Copy-Item -Recurse csv-reimpl C:/rea-labs/
cd C:/rea-labs/csv-reimpl
node compare.mjs
# 19/19 matched
```

`csv-reimpl/` 의 파일은 Claude Code(claude-opus-5-5)가 05-5 실습 3 프롬프트로 생성한 결과를 경로만 바꿔 그대로 실었습니다. 에이전트가 스스로 밝혔듯 엄밀한 클린룸 구현은 아닙니다.
