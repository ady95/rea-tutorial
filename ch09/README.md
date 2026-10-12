# 9장. 네이티브 바이너리 역공학

검증 환경: REA 6.4.0 · Windows 11 · Ghidra 12.1.4 · JDK 21 · Zig 0.17.0 · Claude Code 2.1.296 (claude-opus-5-5) · 2026-10-13

| 경로 | 내용 | 본문 |
|---|---|---|
| native/tagcode.c | 태그 코드 계산기 예제 소스 (저자 작성) | 09-2 |
| 09-5_prompt.txt | 실행 파일만으로 로직 복원 프롬프트 | 09-5 |
| agent-output/ | 에이전트가 만든 tagcode_re.c, compare.mjs | 09-5 |

```powershell
$env:GHIDRA_INSTALL_DIR = "C:/tools/ghidra_12.1.4_PUBLIC"
$env:JAVA_HOME = "C:/tools/jdk-21.0.12.1+1"
$env:REA_ANALYSIS_PROVIDER = "ghidra"
cd C:/rea-labs/native
C:/tools/zig-x86_64-windows-0.17.0/zig.exe cc -O2 -target x86_64-windows-gnu -s -o tagcode.exe tagcode.c
mkdir C:/rea-labs/native-bin
Copy-Item tagcode.exe C:/rea-labs/native-bin/
Copy-Item <이 폴더>/agent-output/* C:/rea-labs/native-bin/
cd C:/rea-labs/native-bin
C:/tools/zig-x86_64-windows-0.17.0/zig.exe cc -O2 -target x86_64-windows-gnu -o tagcode_re.exe tagcode_re.c
node compare.mjs   # 저자 결과: 75/75 cases identical
```

컴파일러나 옵션이 다르면 실행 파일의 주소와 디컴파일 결과가 책과 달라집니다.
