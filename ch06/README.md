# 6장. 웹 애플리케이션과 네트워크 분석

검증 환경: REA 6.8.0 · Windows 11 · Chrome 157 · macOS 26.6.2 Chrome 156 · 2026-11-13

대상: REA 공식 Notes 웹 예제 https://rea.tools/examples/notes-web/

| 파일 | 본문 |
|---|---|
| notes-web-scenario.json | 06-3 capture-browser-scenario 입력 (Export 버튼 클릭 + 네트워크 기록) |
| make-har.cjs | 06-4 REA 내장 playwright-core로 HAR 만들기 |
| 06-5_prompt.txt | 06-5 HAR로 기능 재구성 프롬프트 |

```powershell
New-Item -ItemType Directory -Force C:/rea-labs/web
cd C:/rea-labs/web
cmd /c "rea capture-browser-scenario notes-web-scenario.json --json > scenario.json 2> scenario.log"
node make-har.cjs "$(npm root -g)/rea-agents/node_modules/playwright-core"
rea inspect-web-network-capture C:/rea-labs/web/notes-web.har har --record 8
```

macOS에서는 `notes-web-scenario.json`의 `executable_path`와 `make-har.cjs`의 `executablePath`를
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` 으로 바꾸고, 결과는 그대로 리디렉션해 저장합니다.

```bash
mkdir -p ~/rea-labs/web && cd ~/rea-labs/web
rea capture-browser-scenario notes-web-scenario.json --json > scenario.json 2> scenario.log
node make-har.cjs "$(npm root -g)/rea-agents/node_modules/playwright-core"
rea inspect-web-network-capture ~/rea-labs/web/notes-web.har har --record 8
```

HAR 파일에는 헤더와 응답 본문이 그대로 들어 있습니다. 로그인한 사이트의 HAR는 공유하지 마세요.
