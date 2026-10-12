# 7장. .NET 애플리케이션 역공학

검증 환경: REA 6.4.0 · Windows 11 · .NET SDK 10.0.401 · Claude Code 2.1.296 (claude-opus-5-5) · 2026-10-13

| 경로 | 내용 | 본문 |
|---|---|---|
| dotnet-sample/ | 배송비 계산기 예제 소스 (저자 작성) | 07-2 |
| 07-5_prompt.txt | 소스 없이 DLL만으로 규칙 복원 프롬프트 | 07-5 |
| agent-output/ | 에이전트가 만든 SPEC.md, fee.mjs, compare.mjs (경로만 책 기준으로 바꿈) | 07-5 |

```powershell
cd C:/rea-labs/dotnet-sample
dotnet build -c Release -o out
mkdir C:/rea-labs/dotnet-bin
Copy-Item ./out/ShippingFee.dll, ./out/ShippingFee.runtimeconfig.json, ./out/ShippingFee.deps.json C:/rea-labs/dotnet-bin/
Copy-Item <이 폴더>/agent-output/* C:/rea-labs/dotnet-bin/
cd C:/rea-labs/dotnet-bin
node compare.mjs   # 저자 결과: 93/93 cases match
```
