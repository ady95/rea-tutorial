# 3장. AI 코딩 에이전트와 REA 연결

검증 환경: REA(rea-agents) 6.8.0 · Windows 11 · Node.js 24.22.1 · Claude Code 2.1.299 (claude-opus-5-5) · Codex CLI 0.162.1 (gpt-6-astra) · 2026-11-13

| 파일 | 본문 |
|---|---|
| prompts/03-3_connection-test.txt | 03-3 연결 시험 |
| prompts/03-4_feature-trace.txt | 03-4 Claude Code·Codex CLI 비교 |
| prompts/03-5_short-prompt.txt | 03-5 짧은 프롬프트 비교 |

## Codex CLI 비대화형 실행 (03-2)

REA 6.8.0에서는 `codex exec`가 `analyze_javascript_application` 호출을
"MCP tool call requires approval, but approval policy is never"로 거부합니다.
03-4의 비교 실험은 대상을 실행하지 않는 정적 분석 도구 세 개만 승인해서 실행했습니다.

```powershell
$ok = 'approval_mode="approve"'
codex exec --skip-git-repo-check -C C:/rea-labs `
  -c "mcp_servers.rea.tools.analyze_javascript_application.$ok" `
  -c "mcp_servers.rea.tools.trace_application_feature.$ok" `
  -c "mcp_servers.rea.tools.inspect_analysis_view.$ok" `
  "<프롬프트>"
```

셸 명령이 "setup refresh had errors"로 실패하면(첫판 실측 때 겪은 Codex 샌드박스 문제) 다음 옵션을 더해 시험합니다.

```powershell
-c 'windows.sandbox="unelevated"'
```

실습 폴더(C:/rea-labs)에는 예제만 두세요. 예전 분석 결과 파일이 있으면 REA 호출이 거부됐을 때 에이전트가 그 파일을 근거로 답할 수 있습니다.
