# 8장. Android 애플리케이션 역공학

검증 환경: REA 6.4.0 · Windows 11 · Microsoft OpenJDK 21.0.12.1 · jadx-headless-mcp 0.7.1 · 2026-10-13

대상: Appium ApiDemos 6.0.18 (Apache-2.0) — https://github.com/appium/android-apidemos/releases/download/v6.0.18/ApiDemos-debug.apk
SHA-256 A9EECF37B26CD084855C530DB81C2BB1B91F4C1B095A04F47AA7C20E2791F686

```powershell
$env:JAVA_HOME = "C:/tools/jdk-21.0.12.1+1"
$env:REA_JADX_MCP_JAR = "C:/tools/jadx-headless-mcp-0.7.1-all.jar"
rea inspect-android-package C:/rea-labs/android/ApiDemos-debug.apk --filter-output normalized_result.package_name
```

| 파일 | 본문 |
|---|---|
| 08-5_prompt.txt | 첫 화면 목록 추적 프롬프트 |
