import { decodeHabboBase64, encodeHabboBase64 } from "./Base64Encoding";
import { decodeVl64, encodeVl64 } from "./Vl64Encoding";
import { bytesFrom, concatBytes, fromLatin1Bytes, toLatin1Bytes, type ByteInput } from "./latin1";

export interface Base64Vl64Packet {
  readonly headerId: number;
  readonly header: string;
  readonly payload: Uint8Array;
}

export class Base64Vl64PacketWriter {
  private readonly chunks: Uint8Array[] = [];

  constructor(readonly headerId: number) {
    if (!Number.isInteger(headerId) || headerId < 0) {
      throw new Error(`Invalid packet header: ${headerId}`);
    }
  }

  writeInt(value: number): this {
    this.chunks.push(encodeVl64(value));
    return this;
  }

  writeShort(value: number): this {
    this.chunks.push(encodeHabboBase64(value, 2));
    return this;
  }

  writeBoolean(value: boolean): this {
    return this.writeInt(value ? 1 : 0);
  }

  writeBooleanByte(value: boolean): this {
    this.chunks.push(Uint8Array.of(64 + (value ? 1 : 0)));
    return this;
  }

  writeString(value: string): this {
    const bytes = toLatin1Bytes(value);
    this.chunks.push(encodeHabboBase64(bytes.length, 2), bytes);
    return this;
  }

  writeRaw(input: ByteInput): this {
    this.chunks.push(bytesFrom(input));
    return this;
  }

  toBody(): Uint8Array {
    return concatBytes([encodeHabboBase64(this.headerId, 2), ...this.chunks]);
  }

  toClientRequest(): Uint8Array {
    const body = this.toBody();
    return concatBytes([encodeHabboBase64(body.length, 3), body]);
  }

  toServerResponse(finalise = true): Uint8Array {
    const body = this.toBody();
    return finalise ? concatBytes([body, Uint8Array.of(1)]) : body;
  }
}

export class Base64Vl64PacketReader implements Base64Vl64Packet {
  readonly headerId: number;
  readonly header: string;
  readonly payload: Uint8Array;
  private offset = 0;

  constructor(body: ByteInput) {
    const bytes = bytesFrom(body);
    if (bytes.length < 2) {
      throw new Error("Base64/VL64 packet body must include a two-byte header");
    }

    const headerBytes = bytes.slice(0, 2);
    this.header = fromLatin1Bytes(headerBytes);
    this.headerId = decodeHabboBase64(headerBytes);
    this.payload = bytes.slice(2);
  }

  get remainingLength(): number {
    return this.payload.length - this.offset;
  }

  readInt(): number {
    const result = decodeVl64(this.payload.slice(this.offset));
    this.offset += result.bytesRead;
    return result.value;
  }

  readBoolean(): boolean {
    return this.readInt() === 1;
  }

  readBooleanByte(): boolean {
    if (this.remainingLength < 1) {
      throw new Error("Packet has no bytes remaining; cannot read one-byte boolean");
    }

    const value = (this.payload[this.offset] ?? 64) & 0x3f;
    this.offset += 1;
    return value !== 0;
  }

  readBase64(width: number): number {
    if (this.remainingLength < width) {
      throw new Error(`Packet has ${this.remainingLength} bytes remaining; cannot read ${width}-byte Base64 value`);
    }

    const value = decodeHabboBase64(this.payload.slice(this.offset, this.offset + width));
    this.offset += width;
    return value;
  }

  readString(): string {
    const length = this.readBase64(2);
    if (this.remainingLength < length) {
      throw new Error(`Packet string declares ${length} bytes but only ${this.remainingLength} remain`);
    }

    const value = fromLatin1Bytes(this.payload.slice(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  remainingBytes(): Uint8Array {
    return this.payload.slice(this.offset);
  }

  remainingText(): string {
    return fromLatin1Bytes(this.remainingBytes());
  }
}

export function decodeBase64Vl64ClientRequest(input: ByteInput): Base64Vl64PacketReader {
  const bytes = bytesFrom(input);
  if (bytes.length < 5) {
    throw new Error("Base64/VL64 client packet must be at least five bytes");
  }

  const bodyLength = decodeHabboBase64(bytes.slice(0, 3));
  if (bytes.length - 3 !== bodyLength) {
    throw new Error(`Client packet length mismatch: prefix ${bodyLength}, actual ${bytes.length - 3}`);
  }

  return new Base64Vl64PacketReader(bytes.slice(3));
}

export function decodeBase64Vl64ServerResponse(input: ByteInput): Base64Vl64PacketReader {
  const bytes = bytesFrom(input);
  const last = bytes[bytes.length - 1];
  const body = last === 1 ? bytes.slice(0, -1) : bytes;
  return new Base64Vl64PacketReader(body);
}
