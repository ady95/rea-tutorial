// ShippingFee.dll 의 ReaLab.Shipping.ShippingCalculator.CalculateFee(int, string, bool) 재구현.
// 명세(REA Evidence 기반)만 보고 작성했다. C# int(32비트, unchecked) 산술을 그대로 흉내 낸다.

const BASE_FEE = { domestic: 3000, jeju: 6000, overseas: 15000 };

const toInt32 = (n) => n | 0;
// CIL div: 0 방향으로 버림
const idiv = (a, b) => toInt32(Math.trunc(a / b));

export class ArgumentOutOfRangeError extends Error {
  constructor(paramName) {
    super(`Specified argument was out of the range of valid values. (Parameter '${paramName}')`);
    this.name = 'ArgumentOutOfRangeException';
    this.paramName = paramName;
  }
}

export class ArgumentError extends Error {
  constructor(message, paramName) {
    super(`${message} (Parameter '${paramName}')`);
    this.name = 'ArgumentException';
    this.paramName = paramName;
  }
}

export function calculateFee(weightGrams, zone, express) {
  const w = toInt32(weightGrams);
  if (!(w > 0)) throw new ArgumentOutOfRangeError('weightGrams');

  // string.op_Equality: 대소문자 구분, 서수 비교
  if (!Object.hasOwn(BASE_FEE, zone)) throw new ArgumentError('unknown zone', 'zone');
  const base = BASE_FEE[zone];

  const extraUnits = Math.max(0, idiv(w - 1, 1000));
  let fee = toInt32(base + toInt32(extraUnits * 1000));
  if (express) fee = idiv(toInt32(fee * 3), 2);
  return fee;
}

// Program.<Main>$ 의 명령줄 동작 재구현. { exitCode, stdout, error } 를 돌려준다.
export function runCli(args) {
  if (args.length < 2) {
    return { exitCode: 1, stdout: 'usage: ShippingFee <weightGrams> <zone> [express]', error: null };
  }
  try {
    const weight = parseInt32(args[0]);
    const express = args.length > 2 && args[2] === 'express';
    const fee = calculateFee(weight, args[1], express);
    return { exitCode: 0, stdout: `fee=${fee}`, error: null };
  } catch (e) {
    return { exitCode: null, stdout: '', error: e.name };
  }
}

// int.Parse(string) 근사: 앞뒤 공백, 선행 부호, 10진 숫자만 허용 (NumberStyles.Integer)
export function parseInt32(s) {
  const m = /^[\s]*([+-]?)(\d+)[\s]*$/.exec(s);
  if (!m) {
    const err = new Error('The input string was not in a correct format.');
    err.name = 'FormatException';
    throw err;
  }
  const v = BigInt(m[1] + m[2]);
  if (v > 2147483647n || v < -2147483648n) {
    const err = new Error('Value was either too large or too small for an Int32.');
    err.name = 'OverflowException';
    throw err;
  }
  return Number(v);
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const r = runCli(process.argv.slice(2));
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(r.stdout);
  process.exit(r.exitCode);
}
