import { bytesFrom, fromLatin1Bytes, type ByteInput } from "./latin1";

const OFFSET = 0x40;
const RADIX = 64;

export function encodeHabboBase64(value: number, width: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Habbo Base64 value must be a non-negative integer: ${value}`);
  }

  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`Habbo Base64 width must be positive: ${width}`);
  }

  const max = RADIX ** width;
  if (value >= max) {
    throw new Error(`Habbo Base64 value ${value} does not fit in ${width} bytes`);
  }

  const output = new Uint8Array(width);
  let remaining = value;
  for (let index = width - 1; index >= 0; index--) {
    output[index] = OFFSET + (remaining % RADIX);
    remaining = Math.floor(remaining / RADIX);
  }

  return output;
}

export function encodeHabboBase64String(value: number, width: number): string {
  return fromLatin1Bytes(encodeHabboBase64(value, width));
}

export function decodeHabboBase64(input: ByteInput): number {
  const bytes = bytesFrom(input);
  if (bytes.length === 0) {
    throw new Error("Cannot decode empty Habbo Base64 input");
  }

  let value = 0;
  for (const byte of bytes) {
    const digit = byte - OFFSET;
    if (digit < 0 || digit >= RADIX) {
      throw new Error(`Invalid Habbo Base64 byte: ${byte}`);
    }

    value = value * RADIX + digit;
  }

  return value;
}
