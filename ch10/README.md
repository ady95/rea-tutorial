# 10장. REA를 이용한 소프트웨어 기능 재구현 프로젝트

검증 환경: REA 6.8.0 · Windows 11 · Node.js 24.22.1 · esbuild 0.25.10 · @electron/asar 3.4.1 · Claude Code 2.1.299 (claude-opus-5-5) · 2026-11-13
(빌드 명령은 macOS 26.6.2에서도 확인. 첫판(REA 6.4.0)의 결과물은 태그 book-rea-6.4.0에 있습니다.)

| 경로 | 내용 | 본문 |
|---|---|---|
| memo-stats/ | Memo Stats 앱 소스 (저자 작성) | 10-1 |
| 10-1_prompt.txt | 종합 프로젝트 프롬프트 | 10-1 |
| memo-reimpl/ | 실행 1(프롬프트 그대로): REQUIREMENTS.md, summarize.mjs, harness.mjs, compare.test.mjs | 10-2 ~ 10-5 |
| 10-3_prompt_separated.txt | 실행 2: 2단계를 하위 에이전트에게 맡기도록 한 문장을 더한 프롬프트 | 10-3 |
| memo-reimpl-separated/ | 실행 2의 결과물 | 10-3 |
| AUDIT-10-3.md | 실행 1·2의 도구 호출 감사 요약 (하위 에이전트 호출 목록, 원시 기록 해시) | 10-3 |
| mutate10.mjs | 저자의 변이 검증 스크립트 (summarize.mjs를 하나씩 틀리게 바꿔 테스트 실행) | 10-5 |

Windows (PowerShell):

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
node --test   # 저자 결과: tests 51, pass 51
node ../mutate10.mjs .   # 저자 결과: 13/14 caught (코드 포인트 정렬 변이를 놓침)
```

macOS (bash):

```bash
cd ~/rea-labs/memo-stats
mkdir dist
npx -y esbuild@0.25.10 src/main.js --bundle --platform=node --format=cjs \
  --external:electron --minify --outfile=dist/main.js
cp src/preload.js src/renderer.js src/index.html dist/
echo '{ "name": "memo-stats", "version": "1.0.0", "main": "main.js" }' > dist/package.json
mkdir release
npx -y @electron/asar@3.4.1 pack dist release/app.asar
mkdir -p ~/rea-labs/memo-bin && cp release/app.asar ~/rea-labs/memo-bin/
```

참고:

- harness.mjs는 기본으로 memo-reimpl 옆의 ../memo-bin/app.asar를 읽습니다. 다른 위치는 MEMO_ASAR 환경 변수로 지정하세요.
- compare.test.mjs의 첫 테스트는 저자가 분석한 빌드의 SHA-256을 확인합니다. 직접 빌드한 ASAR의 해시가 분석한 빌드와 다르면 이 테스트 하나가 실패합니다(main.js가 855바이트로 같다면 나머지 50개는 통과). Windows에서 이 저장소를 git으로 받아 빌드하면 분석한 3,189바이트 빌드와 같아 모두 통과할 수 있고, 책의 코드를 직접 입력하거나 macOS에서 빌드하면 해시가 다릅니다. mutate10.mjs는 이 기준 실패 수를 빼고 판정합니다.
- memo-reimpl/의 REQUIREMENTS.md에 적힌 경로는 책의 기준 경로(C:/rea-labs)로 바꿨습니다.
