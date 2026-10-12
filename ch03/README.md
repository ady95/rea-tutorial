# 3장. AI 코딩 에이전트와 REA 연결

| 파일 | 본문 |
|---|---|
| prompts/03-3_connection-test.txt | 03-3 연결 시험 |
| prompts/03-4_feature-trace.txt | 03-4 Claude Code·Codex CLI 비교 |
| prompts/03-5_short-prompt.txt | 03-5 짧은 프롬프트 비교 |

Codex CLI를 Windows에서 비대화형으로 실행할 때 셸 명령이 "setup refresh had errors"로 실패하면 03-2를 참고해 다음처럼 실행합니다.

```powershell
codex exec --skip-git-repo-check -C C:/rea-labs -c 'windows.sandbox="unelevated"' "<프롬프트>"
```
