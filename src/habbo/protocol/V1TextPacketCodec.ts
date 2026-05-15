import { bytesFrom, concatBytes, fromLatin1Bytes, toLatin1Bytes, type ByteInput } from "./latin1";

export interface V1TextPacket {
  readonly header: string;
  readonly body: string;
  readonly arguments: readonly string[];
}

export interface V1TextServerPacket {
  readonly header: string;
  readonly body: string;
}

export function encodeV1TextClientPacket(header: string, args: readonly string[] = []): Uint8Array {
  const content = [header, ...args].join(" ");
  const contentBytes = toLatin1Bytes(content);
  if (contentBytes.length > 9999) {
    throw new Error(`v1 text packet is too large: ${contentBytes.length}`);
  }

  const prefix = contentBytes.length.toString().padEnd(4, " ");
  return concatBytes([toLatin1Bytes(prefix), contentBytes]);
}

export function decodeV1TextClientPacket(input: ByteInput): V1TextPacket {
  const bytes = bytesFrom(input);
  if (bytes.length < 4) {
    throw new Error("v1 text packet must include a four-byte length prefix");
  }

  const declaredLength = Number.parseInt(fromLatin1Bytes(bytes.slice(0, 4)).trim(), 10);
  if (!Number.isInteger(declaredLength) || declaredLength < 0) {
    throw new Error("v1 text packet has an invalid length prefix");
  }

  if (bytes.length - 4 !== declaredLength) {
    throw new Error(`v1 text packet length mismatch: prefix ${declaredLength}, actual ${bytes.length - 4}`);
  }

  const content = fromLatin1Bytes(bytes.slice(4));
  const firstSpace = content.indexOf(" ");
  const header = firstSpace === -1 ? content : content.slice(0, firstSpace);
  const body = firstSpace === -1 ? "" : content.slice(firstSpace + 1);

  return {
    header,
    body,
    arguments: body.length === 0 ? [] : body.split(" ")
  };
}

export function encodeV1TextServerMessage(header: string, body = ""): string {
  return `#${header}${body}##`;
}

export function decodeV1TextServerPacket(frame: string): V1TextServerPacket {
  const release1ObjectsWorld = decodeRelease1ObjectsWorldPacket(frame);
  if (release1ObjectsWorld) {
    return release1ObjectsWorld;
  }

  const bodyStart = findV1ServerBodyStart(frame);
  if (bodyStart < 0) {
    return {
      header: frame,
      body: ""
    };
  }

  return {
    header: frame.slice(0, bodyStart),
    body: frame.slice(bodyStart)
  };
}

function decodeRelease1ObjectsWorldPacket(frame: string): V1TextServerPacket | undefined {
  const firstLineEnd = firstLineEndIndex(frame);
  const firstLine = frame.slice(0, firstLineEnd);
  const match = /^\s*OBJECTS\s+WORLD\s+\d+\s+/i.exec(firstLine);
  if (!match) {
    return undefined;
  }

  return {
    header: "OBJECTS_WORLD",
    body: frame.slice(match[0].length).trimStart()
  };
}

function firstLineEndIndex(value: string): number {
  const cr = value.indexOf("\r");
  const lf = value.indexOf("\n");
  if (cr < 0) {
    return lf < 0 ? value.length : lf;
  }
  if (lf < 0) {
    return cr;
  }
  return Math.min(cr, lf);
}

function findV1ServerBodyStart(frame: string): number {
  const separators = [" ", "\r", "\n", "\t"];
  let bodyStart = -1;
  for (const separator of separators) {
    const index = frame.indexOf(separator);
    if (index >= 0 && (bodyStart < 0 || index < bodyStart)) {
      bodyStart = index;
    }
  }
  return bodyStart;
}
