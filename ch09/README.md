# 9장. 네이티브 바이너리 역공학

검증 환경

- Windows (첫판): REA 6.4.0 · Windows 11 · Ghidra 12.1.4 · JDK 21 · Zig 0.17.0 · Claude Code 2.1.296 (claude-opus-5-5) · 2026-10-13
- macOS (6.8.0 개정판): REA 6.8.0 · macOS 26.6.2 (Apple M1) · Ghidra 12.1.4 (buildNatives로 디컴파일러 빌드) · JDK 21 · Apple clang 21.0.0 · Claude Code 2.1.323 (claude-opus-5-5) · 2026-11-13

6.8.0 개정 때 저자의 Windows PC는 스마트 앱 컨트롤이 직접 빌드한 tagcode.exe 실행을 막아, 09-5의 실행 비교는 macOS에서 다시 실측했습니다(본문 09-2, 09-2-1, 09-5).

| 경로 | 내용 | 본문 |
|---|---|---|
| native/tagcode.c | 태그 코드 계산기 예제 소스 (저자 작성) | 09-2 |
| 09-5_prompt.txt | 실행 파일만으로 로직 복원 프롬프트 | 09-5 |
| agent-output/ | 첫판 Windows: 에이전트가 만든 tagcode_re.c, compare.mjs | 09-5 |
| 09-5_prompt_macos.txt | macOS용 프롬프트 (6.8.0) | 09-5 |
| agent-output-macos/ | macOS: 에이전트가 만든 SPEC.md, tagcode_re.c, compare.mjs | 09-5 |

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

macOS (Apple silicon):

```bash
export GHIDRA_INSTALL_DIR="$HOME/tools/ghidra_12.1.4_PUBLIC"
export JAVA_HOME="$HOME/tools/jdk-21.0.13.0.2+1/Contents/Home"
export REA_ANALYSIS_PROVIDER=ghidra
(cd "$GHIDRA_INSTALL_DIR/support/gradle" && ./gradlew buildNatives)
mkdir -p ~/rea-labs/native ~/rea-labs/native-bin
cp native/tagcode.c ~/rea-labs/native/
clang -O2 -o ~/rea-labs/native/tagcode ~/rea-labs/native/tagcode.c
cp ~/rea-labs/native/tagcode agent-output-macos/* ~/rea-labs/native-bin/
cd ~/rea-labs/native-bin
clang -O2 -o tagcode_re tagcode_re.c
node compare.mjs   # 저자 결과: 총 220건: 일치 220, 불일치 0
```
