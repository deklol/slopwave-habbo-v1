import { HabboPacketBodyReader, decodeVl64, type Vl64DecodeResult } from "../protocol";

export interface HabboRoomObjectRecord {
  readonly id: string;
  readonly className: string;
  readonly kind: "passive" | "active" | "item";
  readonly x?: number;
  readonly y?: number;
  readonly h?: number;
  readonly z?: number;
  readonly direction?: readonly number[] | string;
  readonly dimensions?: readonly [number, number] | 0;
  readonly altitude?: number;
  readonly colors?: string;
  readonly props?: Readonly<Record<string, string>>;
  readonly owner?: string;
  readonly itemType?: string;
  readonly formatVersion?: "old" | "new";
  readonly wallX?: number;
  readonly wallY?: number;
  readonly localX?: number;
  readonly localY?: number;
}

export interface HabboRoomObjectTimedStateRecord {
  readonly objectId: string;
  readonly key: string;
  readonly triggerValue: string;
  readonly closeValue?: string;
  readonly remainingFrames: number;
  readonly sourceClassName: string;
  readonly sourcePath: string;
}

export interface HabboRoomObjectAnimationRecord {
  readonly objectId: string;
  readonly remainingFrames: number;
  readonly elapsedFrames: number;
  readonly partIndexes: readonly number[];
  readonly sourceClassName: string;
  readonly sourcePath: string;
  readonly handlerSourcePath: string;
}

export function parseRoomPassiveObjectsPacket(body: string): readonly HabboRoomObjectRecord[] {
  const keplerObjects = parseKeplerPassiveObjectsPacket(body);
  if (keplerObjects) {
    return keplerObjects;
  }

  const objects: HabboRoomObjectRecord[] = [];
  for (const rawLine of body.split(/\r?\n|\r/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 6) {
      continue;
    }

    const [id = "", className = "", xText = "0", yText = "0", hText = "0", ...rest] = parts;
    const x = Number.parseInt(xText, 10) || 0;
    const y = Number.parseInt(yText, 10) || 0;
    const h = Number.parseFloat(hText) || 0;
    if (rest.length >= 3) {
      const width = Number.parseInt(rest[0] ?? "0", 10) || 0;
      const height = Number.parseInt(rest[1] ?? "0", 10) || 0;
      const direction = Number.parseInt(rest[2] ?? "0", 10) || 0;
      objects.push({ id, className, kind: "passive", x, y, h, dimensions: [width, height], direction: [moduloDirection(direction)] });
      continue;
    }

    const direction = Number.parseInt(rest[0] ?? "0", 10) || 0;
    objects.push({ id, className, kind: "passive", x, y, h, dimensions: 0, direction: [moduloDirection(direction)] });
  }
  return objects.filter((object) => object.id.length > 0 && object.className.length > 0);
}

export function parseRoomActiveObjectsPacket(body: string): readonly HabboRoomObjectRecord[] {
  const keplerObjects = parseKeplerActiveObjectsPacket(body);
  if (keplerObjects) {
    return keplerObjects;
  }

  const objects: HabboRoomObjectRecord[] = [];
  for (const rawLine of body.split(/\r?\n|\r/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const segments = line.split("/").filter((segment) => segment.length > 0);
    const [head = "", ...propertySegments] = segments;
    const [idClass = "", xText = "0", yText = "0", widthText = "0", heightText = "0", directionText = "0", altitudeText = "0", ...colorParts] = head.trim().split(/\s+/);
    const [id = "", className = ""] = idClass.split(",", 2);
    if (!id || !className) {
      continue;
    }

    const directionValues = directionText.split(",")
      .map((entry) => Number.parseInt(entry, 10))
      .filter((entry) => Number.isFinite(entry))
      .map(moduloDirection);
    objects.push({
      id,
      className,
      kind: "active",
      x: Number.parseInt(xText, 10) || 0,
      y: Number.parseInt(yText, 10) || 0,
      h: Number.parseFloat(altitudeText) || 0,
      dimensions: [Number.parseInt(widthText, 10) || 0, Number.parseInt(heightText, 10) || 0],
      direction: directionValues.length > 0 ? directionValues : [0],
      altitude: Number.parseFloat(altitudeText) || 0,
      colors: colorParts.join(" "),
      props: slashPropertyPairs(propertySegments)
    });
  }
  return objects;
}

export function parseRoomStuffDataUpdatePacket(body: string): { readonly objectId: string; readonly key: string; readonly value: string } | undefined {
  if (body.includes("\u0002")) {
    const reader = new HabboPacketBodyReader(body);
    const objectId = reader.readString().trim();
    const data = reader.readString().trim();
    const keyValue = firstRoomObjectPropFromStuffData(data);
    return objectId && keyValue ? { objectId, ...keyValue } : undefined;
  }

  const separator = body.indexOf("//");
  if (separator <= 0) {
    return undefined;
  }

  const objectId = body.slice(0, separator).trim();
  const data = body.slice(separator + 2);
  const keyValue = firstRoomObjectPropFromStuffData(data);
  return objectId && keyValue ? { objectId, ...keyValue } : undefined;
}

export function parseRoomItemsPacket(body: string): readonly HabboRoomObjectRecord[] {
  const objects: HabboRoomObjectRecord[] = [];
  const release1Objects = parseRelease1SemicolonRoomItemsPacket(body);
  if (release1Objects.length > 0) {
    objects.push(...release1Objects);
  }

  for (const rawLine of body.split(/\r?\n|\r/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const [id = "", className = "", owner = "", locationText = "", itemType = ""] = line.split(/\t+/);
    if (!id || !className || id.includes(";")) {
      continue;
    }

    const record: HabboRoomObjectRecord = {
      id,
      className,
      kind: "item",
      owner,
      itemType
    };

    const parsed = parseRoomItemLocation(locationText);
    if (!parsed) {
      continue;
    }

    objects.push({ ...record, ...parsed });
  }
  return objects;
}

function parseRelease1SemicolonRoomItemsPacket(body: string): readonly HabboRoomObjectRecord[] {
  const normalized = body.replace(/\r?\n/g, "\r");
  const lines = normalized.split("\r").map((line) => line.trim()).filter(Boolean);
  const objects: HabboRoomObjectRecord[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (!line.includes(";")) {
      continue;
    }

    const parts = line.split(";");
    const id = parts[0]?.trim() ?? "";
    const className = parts[1]?.trim() ?? "";
    const owner = parts[2]?.trim() ?? "";
    const locationText = parts[3]?.trim() ?? "";
    const customData = parts[4]?.trim() || (lines[index + 1]?.includes(";") ? "" : lines[index + 1]?.trim() ?? "");
    if (!id || !className || !locationText) {
      continue;
    }

    const parsed = parseRoomItemLocation(locationText);
    if (!parsed) {
      continue;
    }

    objects.push({
      id,
      className,
      kind: "item",
      owner,
      itemType: customData,
      ...parsed
    });
  }
  return objects;
}

export function normalizeWallItemDirection(value: unknown): "leftwall" | "rightwall" | undefined {
  const direction = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (direction === "frontwall" || direction === "rightwall" || direction === "r") {
    return "rightwall";
  }
  if (direction === "leftwall" || direction === "l") {
    return "leftwall";
  }
  return undefined;
}

export function moduloDirection(value: number): number {
  const normalized = value % 8;
  return normalized < 0 ? normalized + 8 : normalized;
}

export function isRoomObjectRecord(value: unknown): value is HabboRoomObjectRecord {
  return typeof value === "object"
    && value !== null
    && typeof (value as HabboRoomObjectRecord).id === "string"
    && typeof (value as HabboRoomObjectRecord).className === "string"
    && ((value as HabboRoomObjectRecord).kind === "passive" || (value as HabboRoomObjectRecord).kind === "active" || (value as HabboRoomObjectRecord).kind === "item");
}

export function isRoomObjectTimedStateRecord(value: unknown): value is HabboRoomObjectTimedStateRecord {
  return typeof value === "object"
    && value !== null
    && typeof (value as HabboRoomObjectTimedStateRecord).objectId === "string"
    && typeof (value as HabboRoomObjectTimedStateRecord).key === "string"
    && typeof (value as HabboRoomObjectTimedStateRecord).triggerValue === "string"
    && typeof (value as HabboRoomObjectTimedStateRecord).remainingFrames === "number"
    && Number.isFinite((value as HabboRoomObjectTimedStateRecord).remainingFrames)
    && typeof (value as HabboRoomObjectTimedStateRecord).sourceClassName === "string"
    && typeof (value as HabboRoomObjectTimedStateRecord).sourcePath === "string";
}

export function isRoomObjectAnimationRecord(value: unknown): value is HabboRoomObjectAnimationRecord {
  return typeof value === "object"
    && value !== null
    && typeof (value as HabboRoomObjectAnimationRecord).objectId === "string"
    && typeof (value as HabboRoomObjectAnimationRecord).remainingFrames === "number"
    && Number.isFinite((value as HabboRoomObjectAnimationRecord).remainingFrames)
    && typeof (value as HabboRoomObjectAnimationRecord).elapsedFrames === "number"
    && Number.isFinite((value as HabboRoomObjectAnimationRecord).elapsedFrames)
    && Array.isArray((value as HabboRoomObjectAnimationRecord).partIndexes)
    && typeof (value as HabboRoomObjectAnimationRecord).sourceClassName === "string"
    && typeof (value as HabboRoomObjectAnimationRecord).sourcePath === "string"
    && typeof (value as HabboRoomObjectAnimationRecord).handlerSourcePath === "string";
}

export function roomObjectTimedStateId(objectId: string, key: string): string {
  return `${objectId}:${key.trim().toLowerCase()}`;
}

export function roomObjectSourceAnimationId(objectId: string, sourceClassName: string): string {
  return `${objectId}:${sourceClassName.trim().toLowerCase()}`;
}

export function uniqueNumbers(values: readonly number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const value of values) {
    const normalized = moduloDirection(Math.trunc(value));
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function readRoomObjectZShift(source: string, part: string, direction: number): number {
  const partPattern = new RegExp(`#${escapeRegExp(part)}\\s*:\\s*\\[([^\\]]*#zshift\\s*:\\s*\\[[^\\]]+\\][^\\]]*)\\]`, "i");
  const partMatch = partPattern.exec(source);
  if (!partMatch) {
    return 0;
  }

  const zShiftMatch = /#zshift\s*:\s*\[([^\]]+)\]/i.exec(partMatch[1] ?? "");
  if (!zShiftMatch) {
    return 0;
  }

  const values = zShiftMatch[1]?.split(",").map((item) => Number.parseFloat(item.trim())).filter((item) => Number.isFinite(item)) ?? [];
  if (values.length === 0) {
    return 0;
  }
  const index = Math.max(0, Math.min(values.length - 1, moduloDirection(direction)));
  return values[index] ?? 0;
}

function readInitialVl64String(value: string): Vl64DecodeResult | undefined {
  if (!value || value.charCodeAt(0) < 0x40) {
    return undefined;
  }

  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index++) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }

  try {
    return decodeVl64(bytes);
  } catch {
    return undefined;
  }
}

function parseKeplerActiveObjectsPacket(body: string): readonly HabboRoomObjectRecord[] | undefined {
  if (!body.includes("\u0002")) {
    return undefined;
  }

  const countHeader = readInitialVl64String(body);
  if (countHeader && countHeader.value >= 0) {
    const reader = new HabboPacketBodyReader(body.slice(countHeader.bytesRead));
    const objects: HabboRoomObjectRecord[] = [];
    for (let index = 0; index < countHeader.value && !reader.exhausted; index++) {
      const object = parseKeplerActiveObject(reader);
      if (object) {
        objects.push(object);
      }
    }
    if (objects.length === countHeader.value) {
      return objects;
    }
  }

  const singleObject = parseKeplerActiveObject(new HabboPacketBodyReader(body));
  return singleObject ? [singleObject] : undefined;
}

function parseKeplerActiveObject(reader: HabboPacketBodyReader): HabboRoomObjectRecord | undefined {
  const id = reader.readString().trim();
  const className = reader.readString().trim();
  if (!id || !className) {
    return undefined;
  }

  const x = reader.readInt();
  const y = reader.readInt();
  const width = reader.readInt();
  const height = reader.readInt();
  const direction = moduloDirection(reader.readInt());
  const altitudeText = reader.readString();
  const colors = reader.readString() || "0";
  const runtimeData = reader.readString();
  const extra = reader.readInt();
  const stuffData = reader.readString();
  return {
    id,
    className,
    kind: "active",
    x,
    y,
    h: Number.parseFloat(altitudeText) || 0,
    dimensions: [Math.max(0, width), Math.max(0, height)],
    direction: [direction, direction, direction],
    altitude: Number.parseFloat(altitudeText) || 0,
    colors,
    props: roomObjectPropsFromKeplerRuntimeData(runtimeData, extra, stuffData)
  };
}

function parseKeplerPassiveObjectsPacket(body: string): readonly HabboRoomObjectRecord[] | undefined {
  if (!body.includes("\u0002")) {
    return undefined;
  }

  const countHeader = readInitialVl64String(body);
  if (!countHeader || countHeader.value < 0) {
    return undefined;
  }

  const objects: HabboRoomObjectRecord[] = [];
  let offset = countHeader.bytesRead;
  for (let index = 0; index < countHeader.value && offset < body.length; index++) {
    const lineEnd = body.indexOf("\r", offset);
    const line = body.slice(offset, lineEnd < 0 ? body.length : lineEnd);
    offset = lineEnd < 0 ? body.length : lineEnd + 1;
    const object = parseKeplerPassiveObjectLine(line, index);
    if (object) {
      objects.push(object);
    }
  }

  return objects;
}

function parseKeplerPassiveObjectLine(line: string, index: number): HabboRoomObjectRecord | undefined {
  const terminator = line.indexOf("\u0002");
  if (terminator < 0) {
    return undefined;
  }

  const head = line.slice(0, terminator);
  const split = head.lastIndexOf(" ");
  const id = (split >= 0 ? head.slice(0, split) : String(index + 1)).trim();
  const className = (split >= 0 ? head.slice(split + 1) : head).trim();
  const tail = line.slice(terminator + 1).trim().split(/\s+/);
  if (!id || !className || tail.length < 4) {
    return undefined;
  }

  const x = Number.parseInt(tail[0] ?? "0", 10) || 0;
  const y = Number.parseInt(tail[1] ?? "0", 10) || 0;
  const h = Number.parseFloat(tail[2] ?? "0") || 0;
  const direction = Number.parseInt(tail[3] ?? "0", 10) || 0;
  return {
    id,
    className,
    kind: "passive",
    x,
    y,
    h,
    dimensions: 0,
    direction: [moduloDirection(direction)]
  };
}

function roomObjectPropsFromKeplerRuntimeData(
  runtimeData: string,
  extra: number,
  stuffData: string
): Readonly<Record<string, string>> {
  const slashProps = parseSlashDelimitedRoomObjectProps(stuffData);
  return {
    ...(runtimeData ? { runtimedata: runtimeData } : {}),
    extra: String(extra),
    ...(stuffData ? { stuffdata: stuffData } : {}),
    ...slashProps
  };
}

function firstRoomObjectPropFromStuffData(data: string): { readonly key: string; readonly value: string } | undefined {
  const slash = data.indexOf("/");
  const key = (slash >= 0 ? data.slice(0, slash) : data).trim();
  const value = slash >= 0 ? data.slice(slash + 1).trim() : "";
  return key ? { key, value } : undefined;
}

function parseSlashDelimitedRoomObjectProps(data: string): Readonly<Record<string, string>> {
  const props: Record<string, string> = {};
  const segments = data.split("/").map((segment) => segment.trim()).filter(Boolean);
  for (let index = 0; index + 1 < segments.length; index += 2) {
    props[segments[index]!] = segments[index + 1]!;
  }
  return props;
}

function parseRoomItemLocation(locationText: string): Partial<HabboRoomObjectRecord> | undefined {
  const trimmed = locationText.trim();
  if (!trimmed) {
    return undefined;
  }

  if (!trimmed.startsWith(":")) {
    const [directionText = "", location = ""] = trimmed.split(/\s+/, 2);
    const direction = normalizeWallItemDirection(directionText);
    if (!direction) {
      return undefined;
    }
    const [yText = "0", hText = "0", zText = "0"] = location.split(",");
    return {
      formatVersion: "old",
      direction,
      x: 0,
      y: Number.parseFloat(yText) || 0,
      h: Number.parseFloat(hText) || 0,
      z: Number.parseInt(zText, 10) || 0
    };
  }

  const words = trimmed.split(/\s+/);
  const wallPair = parseTrailingCoordinatePair(words[0] ?? "");
  const localPair = parseTrailingCoordinatePair(words[1] ?? "");
  const direction = words[2] === "r"
    ? "rightwall"
    : words[2] === "l"
      ? "leftwall"
      : undefined;
  if (!wallPair || !localPair || !direction) {
    return undefined;
  }

  return {
    formatVersion: "new",
    direction,
    x: wallPair.x,
    y: wallPair.y,
    wallX: wallPair.x,
    wallY: wallPair.y,
    localX: localPair.x,
    localY: localPair.y
  };
}

function parseTrailingCoordinatePair(value: string): { readonly x: number; readonly y: number } | undefined {
  const match = /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  return {
    x: Number.parseFloat(match[1] ?? "0") || 0,
    y: Number.parseFloat(match[2] ?? "0") || 0
  };
}

function slashPropertyPairs(items: readonly string[]): Record<string, string> {
  const props: Record<string, string> = {};
  for (let index = 0; index < items.length; index += 2) {
    const key = items[index]?.trim();
    if (!key) {
      continue;
    }
    props[key] = items[index + 1]?.trim() ?? "";
  }
  return props;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
