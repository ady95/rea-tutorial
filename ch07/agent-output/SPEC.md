# ShippingFee.dll 동작 명세

대상: `ShippingFee.dll` (SHA-256 `c81bf845ca43cd229434663e07657da58f9757c710ba3b543c13218e07003663`,
MVID `8a946d53-b272-4ce6-b61e-b89b3fddc14d`, `.NETCoreApp,Version=v10.0`, IL-only)

## 근거 표기

| 표기 | 의미 |
|---|---|
| **[REA]** | REA Evidence로 직접 확인함. `inspect_managed_artifact` = `ev_867543fd…`, `inspect_managed_members` = `ev_ef83bcfe…` |
| **[IL]** | REA가 보고한 파일 오프셋(Main 592, CalculateFee 716)의 CIL 바이트와 `#US` 문자열 힙을 직접 디코딩해서 확인함. REA 도구가 아니라 보조 스크립트로 읽었지만, 모든 분기 오프셋·상수·opcode 개수가 REA anchor/`opcode_counts`와 일치함 |
| **[추론]** | CLR 의미론이나 메타데이터 정황에서 추론함. 정적 근거로는 확정되지 않음 |

REA deep provider(Ghidra/IDA)는 이 호스트에서 쓸 수 없었습니다(Ghidra 미설정, Windows Ghidra P0는 managed PE를 지원하지 않음, IDA 미설정). 그래서 C# 디컴파일은 하지 않았습니다.

## 1. 계산 메서드

- **[REA]** `ReaLab.Shipping.ShippingCalculator.CalculateFee(int32, string, bool) : int32`, 토큰 `0x06000003`, static(flags 150), 소속 타입은 abstract sealed(정적 클래스, flags 1048961)
- **[REA]** 파라미터 이름 이전의 시그니처만 확인됨. 파라미터 이름 `weightGrams`/`zone`/`express`는 **[IL]** 예외 인수 문자열과 Main 사용법 문자열에서 가져옴
- **[REA]** 필드 접근이 없고(`field_accesses: []`), 외부 호출은 `String.op_Equality`, `Math.Max`(이름: `Max(i4,i4)`), 예외 생성자 두 개뿐임 → 상태가 없는 순수 함수

## 2. 규칙

### R1. 무게 검증
- **[REA]** IL_0002 `bgt.s` 분기: `weightGrams > 0`이면 계속 진행함. 그렇지 않으면 IL_0009에서 `newobj 0x0a000016`(`.ctor(string)`) 후 `throw`
- **[IL]** 생성자 인수는 `"weightGrams"`
- **[추론]** 예외 타입은 `System.ArgumentOutOfRangeException(paramName)`. REA는 TypeRef 이름을 풀어서 보여 주지 않았고, 단일 string 생성자와 파라미터 이름 인수 패턴으로 추정함
- 규칙: `weightGrams <= 0` → 예외

### R2. 지역별 기본 요금
- **[REA]** `op_Equality`를 3회 연달아 호출하고, 각각 `brtrue.s`로 IL_0056/0064/0072로 분기함. 각 분기의 상수는 `3000`, `6000`, `15000`. 어느 것도 아니면 IL_0080 → `newobj 0x0a000017`(`.ctor(string,string)`) 후 `throw`
- **[IL]** 비교 문자열 순서: `"domestic"` → 3000, `"jeju"` → 6000, `"overseas"` → 15000. 예외 인수는 `("unknown zone", "zone")`
- **[추론]** `String.op_Equality`는 ordinal 비교이므로 대소문자와 공백을 구분함(`"Jeju"`, `" jeju"`는 알 수 없는 지역). `zone == null`이면 세 비교가 모두 false라서 같은 예외가 남
- **[추론]** 예외 타입은 `System.ArgumentException(message, paramName)`
- 확인 순서: 무게 검증(R1)이 지역 검증보다 먼저 일어남 **[REA]**(IL_0002가 IL_0015보다 앞섬)

### R3. 무게 추가 요금
- **[IL]** `extraUnits = Math.Max(0, (weightGrams - 1) / 1000)`, `fee = base + extraUnits * 1000`
- **[REA]** 상수 `1000`이 두 번 나옴(IL_0101, IL_0114). `Max(i4,i4)` 호출 1회, `sub` 1회, `div` 2회, `mul` 2회, `add` 1회
- **[추론]** `div`는 int32 나눗셈이고 0 방향으로 버림함. R1 때문에 `weightGrams >= 1`이므로 `Max(0, …)`는 실제로 효과가 없음
- 의미: 1~1000g은 추가 요금 없음, 1001~2000g은 +1000, … 즉 1000g 초과분에 대해 **1kg마다(올림) 1000원**
- **[추론]** `add`/`mul`은 `.ovf`가 붙지 않은 opcode이므로(**[REA]** opcode 목록에 `add.ovf` 없음) 오버플로 시 int32로 wrap-around됨. 예: `overseas`에서 무게 ≥ 2,147,469,001이면(`floor((w-1)/1000)*1000 + 15000 > 2^31-1`) 결과가 음수가 됨. 런타임에서 2,147,483,647g overseas → `fee=-2147469296`로 확인함

### R4. 특급(express) 할증
- **[REA]** IL_0123 `brfalse.s`: `express == false`이면 그대로 반환함. **[REA]** `ldc.i4.3` 1회, `ldc.i4.2` 1회, `mul`, `div`
- **[IL]** `fee = fee * 3 / 2`(곱셈 먼저, 그다음 int32 나눗셈)
- **[추론]** 1.5배, 소수점 이하 버림(0 방향). `fee * 3`도 unchecked라서 fee > 715,827,882이면 wrap됨
- 결과를 int32로 반환함

## 3. 진입점(`Program.<Main>$`) — CLI

- **[REA]** 진입점 토큰은 `0x06000001`이고 `CalculateFee`를 호출함(call edge)
- **[IL]** `args.Length < 2` → `"usage: ShippingFee <weightGrams> <zone> [express]"`를 출력하고 종료 코드 1
- **[IL]** `weight = int.Parse(args[0])`, `zone = args[1]`, `express = args.Length > 2 && args[2] == "express"`. 네 번째 이후 인수는 무시함
- **[IL]** 출력은 보간 문자열 `$"fee={fee}"` → `WriteLine`, 종료 코드 0
- **[추론]** `int.Parse`는 `NumberStyles.Integer`와 현재 culture를 사용함. 앞뒤 공백과 앞쪽 부호를 허용하고, 숫자가 아니면 `FormatException`, int32 범위를 벗어나면 `OverflowException`
- **[추론]** `CalculateFee`의 예외는 처리하지 않으므로 런타임의 unhandled exception이 됨(stderr에 `Unhandled exception. <Type>: …`, 0이 아닌 종료 코드)
- **[추론]** `express`도 ordinal 비교이므로 `"Express"`는 일반 배송으로 처리함

## 4. 남은 불확실성과 런타임 대조
- 예외 타입 이름(R1, R2, int.Parse)은 정적 근거로는 확정되지 않았습니다. `compare.mjs`로 원본을 실행해 보니(REA Evidence가 아닌 런타임 관찰) 예외는 `ArgumentOutOfRangeException`, `ArgumentException`, `FormatException`, `OverflowException`으로, 추론과 일치했습니다.
- 대소문자 구분, express 플래그 처리, int32 wrap-around도 런타임에서 같은 결과를 확인했습니다(93/93).
- `int.Parse`의 culture 의존성(음수 부호 문자 등)은 실행 환경에 따라 달라질 수 있습니다. 테스트는 이 호스트의 culture에서만 했습니다.
