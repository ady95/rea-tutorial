# 10장. REA를 이용한 소프트웨어 기능 재구현 프로젝트

검증 환경: REA 6.4.0 · Windows 11 · Node.js 24.20.0 · esbuild 0.25.10 · @electron/asar 3.4.1 · Claude Code 2.1.296 (claude-opus-5-5) · 2026-10-13

| 경로 | 내용 | 본문 |
|---|---|---|
| memo-stats/ | Memo Stats 앱 소스 (저자 작성) | 10-1 |
| 10-1_prompt.txt | 종합 프로젝트 프롬프트 | 10-1 |
| memo-reimpl/ | 에이전트가 만든 REQUIREMENTS.md, summarize.mjs(클린룸 재구현), harness.mjs, compare.test.mjs | 10-2 ~ 10-5 |

```powershell
cd C:/rea-labs/memo-stats
mkdir dist
npx -y esbuild@0.25.10 src/main.js --bundle --platform=node --format=cjs --external:electron --minify --outfile=dist/main.js
Copy-Item src/preload.js, src/renderer.js, src/index.html dist/
Set-Content -Path dist/package.json -Encoding ascii -Value '{ "name": "memo-stats", "version": "1.0.0", "main": "main.js" }'
mkdir release
npx -y @electron/asar@3.4.1 pack dist release/app.asar
mkdir C:/rea-labs/memo-bin
Copy-Item release/app.asar C:/rea-labs/memo-bin/

cd <이 폴더>/memo-reimpl
node --test   # 저자 결과: tests 351, pass 351
```

harness.mjs는 기본으로 C:/rea-labs/memo-bin/app.asar를 읽습니다. 다른 위치는 MEMO_ASAR 환경 변수로 지정하세요.
