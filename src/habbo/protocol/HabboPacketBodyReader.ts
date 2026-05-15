import { decodeVl64 } from "./Vl64Encoding";

export class HabboPacketBodyReader {
  private offset = 0;

  constructor(private readonly body: string) {}

  get exhausted(): boolean {
    return this.offset >= this.body.length;
  }

  readInt(): number {
    if (this.exhausted) {
      return 0;
    }

    const bytes = new Uint8Array(this.body.length - this.offset);
    for (let index = this.offset; index < this.body.length; index++) {
      bytes[index - this.offset] = this.body.charCodeAt(index) & 0xff;
    }

    try {
      const result = decodeVl64(bytes);
      this.offset += result.bytesRead;
      return result.value;
    } catch {
      this.offset = this.body.length;
      return 0;
    }
  }

  readBooleanByte(): boolean {
    if (this.exhausted) {
      return false;
    }

    const value = this.body.charCodeAt(this.offset) & 0x3f;
    this.offset += 1;
    return value !== 0;
  }

  readString(): string {
    const terminator = this.body.indexOf("\u0002", this.offset);
    if (terminator < 0) {
      const value = this.body.slice(this.offset);
      this.offset = this.body.length;
      return value;
    }

    const value = this.body.slice(this.offset, terminator);
    this.offset = terminator + 1;
    return value;
  }
}
