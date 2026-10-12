// Re-implementation of ReaLab.Shipping.ShippingCalculator.CalculateFee, written from SPEC.md only.
// All arithmetic emulates unchecked .NET int32 semantics.
import { pathToFileURL } from 'node:url';

export class DotNetError extends Error {
  constructor(type, message, paramName) {
    super(message);
    this.type = type; // .NET exception type name (SPEC: inferred)
    this.paramName = paramName ?? null;
  }
}

const BASE_FEE = { domestic: 3000, jeju: 6000, overseas: 15000 }; // R2

const i32 = (x) => x | 0;
const idiv = (a, b) => i32(Math.trunc(a / b)); // int32 div, truncates toward zero

export function calculateFee(weightGrams, zone, express) {
  weightGrams = i32(weightGrams);

  // R1: weight must be positive (checked before zone)
  if (!(weightGrams > 0)) {
    throw new DotNetError('System.ArgumentOutOfRangeException', 'Specified argument was out of the range of valid values.', 'weightGrams');
  }

  // R2: ordinal, case-sensitive zone lookup
  if (typeof zone !== 'string' || !Object.hasOwn(BASE_FEE, zone)) {
    throw new DotNetError('System.ArgumentException', 'unknown zone', 'zone');
  }
  const base = BASE_FEE[zone];

  // R3: +1000 per started kg above the first 1000 g
  const extraUnits = Math.max(0, idiv(i32(weightGrams - 1), 1000));
  let fee = i32(base + Math.imul(extraUnits, 1000));

  // R4: express = fee * 3 / 2 (unchecked multiply, truncating divide)
  if (express) fee = idiv(Math.imul(fee, 3), 2);

  return fee;
}

// int.Parse(string) with NumberStyles.Integer, invariant-like culture (SPEC §3, inferred).
export function parseInt32(s) {
  const m = /^[\t\n\v\f\r ]*([+-]?)([0-9]+)[\t\n\v\f\r ]*\0*$/.exec(s);
  if (!m) throw new DotNetError('System.FormatException', `The input string '${s}' was not in a correct format.`);
  const v = BigInt(m[1] + m[2]);
  if (v < -2147483648n || v > 2147483647n) {
    throw new DotNetError('System.OverflowException', 'Value was either too large or too small for an Int32.');
  }
  return Number(v);
}

// Program.<Main>$ equivalent. Returns { stdout, exitCode, error } instead of touching the process.
export function runCli(args) {
  if (args.length < 2) {
    return { stdout: 'usage: ShippingFee <weightGrams> <zone> [express]', exitCode: 1, error: null };
  }
  try {
    const weight = parseInt32(args[0]);
    const zone = args[1];
    const express = args.length > 2 && args[2] === 'express';
    const fee = calculateFee(weight, zone, express);
    return { stdout: `fee=${fee}`, exitCode: 0, error: null };
  } catch (e) {
    if (e instanceof DotNetError) return { stdout: '', exitCode: null, error: e.type };
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = runCli(process.argv.slice(2));
  if (r.error) { console.error(`Unhandled exception. ${r.error}`); process.exit(1); }
  console.log(r.stdout);
  process.exit(r.exitCode);
}
