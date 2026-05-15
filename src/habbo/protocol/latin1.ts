export type ByteInput = Uint8Array | readonly number[] | string;

export function toLatin1Bytes(input: string): Uint8Array {
  const bytes = new Uint8Array(input.length);
  for (let index = 0; index < input.length; index++) {
    bytes[index] = input.charCodeAt(index) & 0xff;
  }

  return bytes;
}

export function fromLatin1Bytes(input: Uint8Array | readonly number[]): string {
  let output = "";
  for (const byte of input) {
    output += String.fromCharCode(byte & 0xff);
  }

  return output;
}

export function bytesFrom(input: ByteInput): Uint8Array {
  if (typeof input === "string") {
    return toLatin1Bytes(input);
  }

  return input instanceof Uint8Array ? input : Uint8Array.from(input);
}

export function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
