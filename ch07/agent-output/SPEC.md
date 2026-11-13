# 동작 명세 (에이전트 답변)

07-5 프롬프트에 대한 Claude Code(claude-opus-5-5) 답변을 그대로 옮겼습니다. 경로만 책 기준(C:/rea-labs)으로 바꿨습니다. 6.8.0 재실측에서는 에이전트가 명세를 파일이 아니라 답변으로 냈습니다.

세 가지 모두 끝났고, 원본과 재구현 결과가 33개 입력 모두에서 같습니다(**33/33 일치**).

## 1. 동작 명세: `ReaLab.Shipping.ShippingCalculator.CalculateFee(int weightGrams, string zone, bool express) : int`

REA `inspect_managed_members`로 DLL을 정적으로만 분석했습니다. 대상 파일의 SHA-256은 `c81bf845…7003663`, MVID는 `8a946d53-…`입니다. 쓴 Evidence는 다음과 같습니다.
- 메서드 본문의 CIL 명령어 목록: `ev_14eac301…`
- 문자열 리터럴: `ev_ccc9db41…`
- 외부 메서드 참조: `ev_025f9bfe…`
- 위 셋의 원본 분석: `ev_4d465e47…`

표의 구분은 이렇습니다.
- **[확인]**: CIL 명령어, 상수, 문자열, 호출 대상을 Evidence에서 직접 읽은 내용입니다.
- **[추론]**: 그 Evidence를 해석했거나 .NET 런타임이 어떻게 동작하는지에 기댄 내용입니다.

| # | 규칙 | 근거 |
|---|---|---|
| R1 | `weightGrams > 0`이 아니면 `ArgumentOutOfRangeException("weightGrams")`를 던집니다. | **[확인]** IL_0000 `ldarg.0; ldc.i4.0; bgt.s`, 이어서 `ldstr "weightGrams"; newobj ArgumentOutOfRangeException(string); throw` |
| R2 | 지역별 기본요금은 `"domestic"` 3000, `"jeju"` 6000, `"overseas"` 15000입니다. | **[확인]** `string.op_Equality`로 세 번 비교한 뒤 `ldc.i4 3000/6000/15000`, `stloc.2` |
| R3 | 세 지역이 아니면 `ArgumentException("unknown zone", "zone")`을 던집니다. | **[확인]** IL_0050 `ldstr "unknown zone"; ldstr "zone"; newobj ArgumentException(string,string); throw` |
| R3a | 지역 이름은 대소문자를 구분해 정확히 일치해야 합니다(`"Domestic"`은 오류). | **[추론]** `string.op_Equality`가 서수 비교라는 .NET의 의미에서 나온 해석입니다. |
| R4 | 추가 단위 수는 `Math.Max(0, (weightGrams - 1) / 1000)`입니다. | **[확인]** `ldc.i4.0; ldarg.0; ldc.i4.1; sub; ldc.i4 1000; div; call Math.Max(int,int)` |
| R4a | 결과적으로 1~1000g은 기본요금만 받고, 1000g을 넘을 때마다 1000g 단위로 한 칸씩 붙습니다(올림). | **[추론]** R1, R4와 정수 나눗셈의 버림 성질에서 이끌어 낸 해석입니다. |
| R5 | 요금은 `기본요금 + 추가단위 × 1000`입니다. | **[확인]** `ldloc.0; ldc.i4 1000; mul; add; stloc.1` |
| R6 | `express`가 참이면 `요금 × 3 / 2`이고, 정수 나눗셈이라 소수점 아래를 버립니다. | **[확인]** `ldarg.2; brfalse.s`, 이어서 `ldloc.1; ldc.i4.3; mul; ldc.i4.2; div` |
| R7 | 산술은 32비트 int이고 오버플로를 검사하지 않습니다(값이 넘치면 음수로 돌아감). | **[확인]** 오버플로 검사 명령(`.ovf`)이 없고 `add`/`mul`/`sub`만 있습니다. **[추론]** 그래서 실제로 값이 넘쳐 음수가 됩니다. |
| R8 | 결과는 `int` 하나로 반환합니다. | **[확인]** 시그니처 `i4(i4, string, bool)`, 마지막이 `ldloc.1; ret` |

명령줄 진입점 `Program.<Main>$`은 이렇게 동작합니다.

| # | 규칙 | 근거 |
|---|---|---|
| M1 | 인자가 2개보다 적으면 사용법 문자열을 출력하고 종료코드 1로 끝납니다. | **[확인]** `ldlen; ldc.i4.2; bge.s`, `ldstr "usage: …"; Console.WriteLine`, `ldc.i4.1; ret` |
| M2 | 무게는 `int.Parse(args[0])`, 지역은 `args[1]`입니다. | **[확인]** `call Int32.Parse(string)` |
| M2a | 무게 문자열은 앞뒤 공백과 `+`/`-` 부호를 허용합니다. 숫자가 아니면 FormatException, int 범위를 넘으면 OverflowException이 납니다. | **[추론]** `int.Parse`의 기본 동작에 기댄 내용입니다. |
| M3 | 세 번째 인자가 있고 정확히 `"express"`일 때만 특송으로 계산합니다. | **[확인]** `ldlen > 2`이면 `args[2] == "express"`, 아니면 `false` |
| M4 | `fee={요금}`을 출력하고 종료코드 0으로 끝납니다. | **[확인]** `"fee="` 리터럴, `AppendFormatted`, `WriteLine`, `ldc.i4.0; ret` |
| M4a | `AppendFormatted<T>`의 T는 `int`로 보았습니다. | **[추론]** 제네릭 인스턴스 토큰(`0x2b000001`)의 실제 타입까지는 풀지 않았습니다. |
| M5 | `CalculateFee`가 던진 예외는 아무도 잡지 않아 프로세스가 비정상 종료합니다. | **[확인]** 메서드에 예외 처리 구간이 0개입니다. **[추론]** 그래서 런타임이 "Unhandled exception"을 출력하고 종료합니다. |

## 2. 재구현: `C:/rea-labs/dotnet-bin/fee.mjs`
- `calculateFee(weightGrams, zone, express)`가 R1~R8을 구현합니다. 32비트 정수가 넘쳐 음수로 돌아가는 동작은 `|0`로, 0 방향 버림 나눗셈은 `Math.trunc`로 흉내 냈습니다.
- `runCli(args)`가 M1~M5를 구현합니다. `int.Parse`는 정규식으로 근사했습니다.

## 3. 비교: `C:/rea-labs/dotnet-bin/compare.mjs`
33개 입력에서 원본(`dotnet.exe ShippingFee.dll …`)과 재구현의 출력, 종료코드, 예외 종류를 비교했습니다.

| 분류 | 확인한 입력 |
|---|---|
| 무게 구간 경계 | 1000g과 1001g, 2000g과 2001g, 10000g과 10001g |
| 세 지역 | domestic, jeju, overseas 모두 |
| 특송과 버림 | `1 domestic express` → 4500, `1001 jeju express` → 10500 |
| `"Express"`·`"fast"` | 특송으로 인정되지 않고 일반 요금 |
| 예외 4종 | 무게 0·음수, 알 수 없는 지역, 숫자가 아닌 무게, int 범위 초과 |
| 인자 부족 | 사용법 출력, 종료코드 1 |
| int 오버플로 | `2147483647 overseas` → `fee=-2147469296` |
| `int.Parse` 허용 형식 | `" 1500 "`, `"+1500"` |

결과는 **33/33 일치**입니다.

**한계:**
- 비교는 예외 메시지 전문이 아니라 예외 타입 이름까지만 했습니다.
- `int.Parse`의 문화권별 형식(예: 전각 숫자)은 재구현에 넣지 않았습니다.