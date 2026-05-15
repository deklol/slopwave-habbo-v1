import { bytesFrom, fromLatin1Bytes, type ByteInput } from "./latin1";

export interface Vl64DecodeResult {
  readonly value: number;
  readonly bytesRead: number;
}

const OFFSET = 0x40;
const LOW_BITS_MASK = 0x03;
const NEGATIVE_FLAG = 0x04;
const LENGTH_SHIFT = 3;
const LENGTH_MASK = 0x07;
const PAYLOAD_MASK = 0x3f;
const MAX_BYTES = 6;

export function encodeVl64(value: number): Uint8Array {
  if (!Number.isInteger(value)) {
    throw new Error(`VL64 value must be an integer: ${value}`);
  }

  const negative = value < 0;
  let remaining = Math.abs(value);
  const bytes: number[] = [OFFSET + (remaining & LOW_BITS_MASK)];

  remaining = Math.floor(remaining / 4);
  while (remaining > 0) {
    bytes.push(OFFSET + (remaining & PAYLOAD_MASK));
    remaining = Math.floor(remaining / 64);
  }

  if (bytes.length > MAX_BYTES) {
    throw new Error(`VL64 value uses ${bytes.length} bytes; max supported is ${MAX_BYTES}`);
  }

  const first = bytes[0];
  if (first === undefined) {
    throw new Error("VL64 encoder produced no bytes");
  }

  bytes[0] = first | (bytes.length << LENGTH_SHIFT) | (negative ? NEGATIVE_FLAG : 0);
  return Uint8Array.from(bytes);
}

export function encodeVl64String(value: number): string {
  return fromLatin1Bytes(encodeVl64(value));
}

export function decodeVl64(input: ByteInput): Vl64DecodeResult {
  const bytes = bytesFrom(input);
  const first = bytes[0];
  if (first === undefined) {
    throw new Error("Cannot decode empty VL64 input");
  }

  const totalBytes = (first >> LENGTH_SHIFT) & LENGTH_MASK;
  if (totalBytes <= 0 || totalBytes > MAX_BYTES) {
    throw new Error(`Invalid VL64 byte count: ${totalBytes}`);
  }

  if (bytes.length < totalBytes) {
    throw new Error(`VL64 input needs ${totalBytes} bytes but only has ${bytes.length}`);
  }

  let value = first & LOW_BITS_MASK;
  let shift = 2;
  for (let index = 1; index < totalBytes; index++) {
    const byte = bytes[index];
    if (byte === undefined) {
      throw new Error(`Missing VL64 byte at index ${index}`);
    }

    value += (byte & PAYLOAD_MASK) * 2 ** shift;
    shift += 6;
  }

  return {
    value: (first & NEGATIVE_FLAG) === NEGATIVE_FLAG ? -value : value,
    bytesRead: totalBytes
  };
}
