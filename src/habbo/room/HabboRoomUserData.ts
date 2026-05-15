import type { HabboFigurePartIndexSet } from "../boot/HabboBootResourceTypes";
import { createDefaultFigureProps, parseOldServerFigureString, type HabboFigurePartProps } from "../features/figure";
import { moduloDirection } from "./HabboRoomObjectData";

export interface HabboRoomUserRecord {
  readonly id: string;
  readonly name: string;
  readonly figureRaw: string;
  readonly figure: Readonly<Record<string, HabboFigurePartProps>>;
  readonly sex: "M" | "F";
  readonly custom?: string;
  readonly badge?: string;
  readonly moderatorLevel?: string;
  readonly x?: number;
  readonly y?: number;
  readonly h?: number;
  readonly dirHead?: number;
  readonly dirBody?: number;
  readonly infoImageDirHead?: number;
  readonly infoImageDirBody?: number;
  readonly actions?: readonly { readonly name: string; readonly params: string }[];
  readonly moveStartX?: number;
  readonly moveStartY?: number;
  readonly moveStartH?: number;
  readonly moveTargetX?: number;
  readonly moveTargetY?: number;
  readonly moveTargetH?: number;
  readonly moveStartedAtMs?: number;
  readonly moveDurationMs?: number;
}

export function parseRoomUsersPacket(body: string, figurePartIndexSet?: HabboFigurePartIndexSet): HabboRoomUserRecord[] {
  const sourcePropertyChunks = parseRoomUserPropertyChunks(body);
  const hasPropertyListUsers = sourcePropertyChunks.some((chunk) => chunk.prop === "i");
  if (!hasPropertyListUsers) {
    return parseRelease1RoomUsersPacket(body, figurePartIndexSet);
  }

  const users = new Map<string, Record<string, string>>();
  let currentId = "";
  for (const { prop, value } of sourcePropertyChunks) {
    if (prop === "i") {
      currentId = value;
      users.set(currentId, { id: value });
      continue;
    }

    if (!currentId) {
      continue;
    }

    const record = users.get(currentId);
    if (!record) {
      continue;
    }

    switch (prop) {
      case "n":
        record.name = value;
        break;
      case "f":
        record.figure = value;
        break;
      case "l":
        record.location = value;
        break;
      case "c":
        record.custom = value;
        break;
      case "s":
        record.sex = value.toUpperCase().startsWith("F") ? "F" : "M";
        break;
      case "b":
        record.badge = value;
        break;
    }
  }

  return [...users.values()].map((record) => {
    const sex: "M" | "F" = record.sex === "F" ? "F" : "M";
    const figure = parseOldServerFigureString(record.figure, sex, figurePartIndexSet) ?? createDefaultFigureProps(sex, figurePartIndexSet);
    const location = parseRoomLocation(record.location ?? "");
    return {
      id: record.id ?? "",
      name: record.name ?? "",
      figureRaw: record.figure ?? "",
      figure,
      sex,
      ...(record.custom !== undefined ? { custom: record.custom } : {}),
      ...(record.badge !== undefined ? { badge: record.badge } : {}),
      ...(location !== undefined ? { x: location.x, y: location.y, h: location.h } : {})
    };
  }).filter((user) => user.id.length > 0);
}

function parseRelease1RoomUsersPacket(body: string, figurePartIndexSet?: HabboFigurePartIndexSet): HabboRoomUserRecord[] {
  const users: HabboRoomUserRecord[] = [];
  for (const rawLine of body.split(/\r?\n|\r/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const words = line.split(/\s+/);
    if (words.length < 5) {
      continue;
    }

    const [name = "", figureRaw = "", xText = "0", yText = "0", hText = "0", ...customWords] = words;
    if (!isValidRoomUserIdentity(name) || !figureRaw.includes("=")) {
      continue;
    }

    const sex: "M" | "F" = "M";
    const figure = parseOldServerFigureString(figureRaw, sex, figurePartIndexSet) ?? createDefaultFigureProps(sex, figurePartIndexSet);
    users.push({
      id: name,
      name,
      figureRaw,
      figure,
      sex,
      x: Number.parseInt(xText, 10) || 0,
      y: Number.parseInt(yText, 10) || 0,
      h: Number.parseFloat(hText) || 0,
      custom: customWords.join(" ")
    });
  }
  return users;
}

export function parseRoomStatusPacket(body: string): readonly HabboRoomUserRecord[] {
  const statuses: HabboRoomUserRecord[] = [];
  for (const rawLine of body.split(/\r?\n|\r/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const segments = line.split("/").filter((segment) => segment.length > 0);
    const [head, ...actionSegments] = segments;
    if (!head) {
      continue;
    }

    const [id = "", loc = ""] = head.split(/\s+/, 2);
    const parts = loc.split(",");
    if (!isValidRoomUserIdentity(id) || parts.length < 5) {
      continue;
    }

    const actions = actionSegments.map((segment) => {
      const [name = "", ...rest] = segment.split(/\s+/);
      return { name, params: rest.join(" ") };
    }).filter((entry) => entry.name.length > 0);
    const moderatorLevel = roomUserModeratorLevelFromActions(actions);

    statuses.push({
      id,
      name: "",
      figureRaw: "",
      figure: {},
      sex: "M",
      x: Number.parseInt(parts[0] ?? "0", 10) || 0,
      y: Number.parseInt(parts[1] ?? "0", 10) || 0,
      h: Number.parseFloat(parts[2] ?? "0") || 0,
      dirHead: parseDirectionPart(parts[3], 2),
      dirBody: parseDirectionPart(parts[4], 2),
      actions,
      ...(moderatorLevel ? { moderatorLevel } : {})
    });
  }
  return statuses;
}

function isValidRoomUserIdentity(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "null" && normalized !== "undefined";
}

export function hasRoomUserAction(user: HabboRoomUserRecord, actionName: string): boolean {
  const normalized = actionName.toLowerCase();
  return user.actions?.some((entry) => entry.name.toLowerCase() === normalized) === true;
}

export function roomUserModeratorLevelFromActions(
  actions: readonly { readonly name: string; readonly params: string }[] | undefined
): string | undefined {
  const action = actions?.find((entry) => entry.name.toLowerCase() === "mod");
  const level = action?.params.trim().split(/\s+/)[0]?.trim();
  return level ? level : undefined;
}

export function roomUserPosture(user: HabboRoomUserRecord): { readonly action: "sit" | "lay"; readonly height: number; readonly restingHeight: number } | undefined {
  const action = user.actions?.find((entry) => entry.name === "lay" || entry.name === "sit");
  if (!action || (action.name !== "sit" && action.name !== "lay")) {
    return undefined;
  }

  const firstParam = action.params.trim().split(/\s+/)[0];
  const height = Number.parseFloat(firstParam ?? "");
  const sourceHeight = Number.isFinite(height) ? height : 0;
  return {
    action: action.name,
    height: sourceHeight,
    restingHeight: sourceHeight - 1
  };
}

export function hasRoomUserGesture(user: HabboRoomUserRecord, gestureName: string): boolean {
  return user.actions?.some((entry) => entry.name === "gest" && entry.params.trim().split(/\s+/)[0] === gestureName) === true;
}

export function parseRoomUserMoveTarget(actions: readonly { readonly name: string; readonly params: string }[] | undefined): { readonly x: number; readonly y: number; readonly h: number } | undefined {
  const action = actions?.find((entry) => entry.name === "mv" || entry.name === "sld");
  if (!action) {
    return undefined;
  }

  const location = action.params.trim().split(/\s+/)[0] ?? "";
  const [xText = "", yText = "", hText = "0"] = location.split(",");
  const x = Number.parseInt(xText, 10);
  const y = Number.parseInt(yText, 10);
  const h = Number.parseFloat(hText);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return undefined;
  }

  return {
    x,
    y,
    h: Number.isFinite(h) ? h : 0
  };
}

export function isRoomUserMoving(user: HabboRoomUserRecord, elapsedMs: number): boolean {
  if (!hasRoomUserAction(user, "mv")
    || user.moveTargetX === undefined
    || user.moveTargetY === undefined
    || user.moveTargetH === undefined) {
    return false;
  }

  const startedAt = numberFromUnknown(user.moveStartedAtMs);
  const duration = Math.max(1, numberFromUnknown(user.moveDurationMs) || 500);
  return elapsedMs - startedAt < duration;
}

export function clearRoomUserMovement(user: HabboRoomUserRecord): HabboRoomUserRecord {
  const {
    moveStartX,
    moveStartY,
    moveStartH,
    moveTargetX,
    moveTargetY,
    moveTargetH,
    moveStartedAtMs,
    moveDurationMs,
    ...rest
  } = user;
  void moveStartX;
  void moveStartY;
  void moveStartH;
  void moveTargetX;
  void moveTargetY;
  void moveTargetH;
  void moveStartedAtMs;
  void moveDurationMs;
  return rest;
}

export function isRoomUserRecord(value: unknown): value is HabboRoomUserRecord {
  return typeof value === "object"
    && value !== null
    && typeof (value as HabboRoomUserRecord).id === "string"
    && typeof (value as HabboRoomUserRecord).name === "string"
    && typeof (value as HabboRoomUserRecord).figure === "object";
}

export function roomUserAnimationFrameDurationMs(users: readonly HabboRoomUserRecord[], tempo: number): number {
  const movingDurations = users
    .filter((user) => hasRoomUserAction(user, "mv"))
    .map((user) => Math.max(1, numberFromUnknown(user.moveDurationMs) || 500));
  if (movingDurations.length > 0) {
    return Math.max(1, Math.min(...movingDurations) / 4);
  }

  return directorFrameDurationMs(tempo);
}

function parseRoomUserPropertyChunks(body: string): readonly { readonly prop: string; readonly value: string }[] {
  const rawLines = body.split(/\r?\n|\r/).map((line) => line.trim()).filter((line) => line.length >= 2);
  if (rawLines.length > 1 || rawLines.every((line) => /^[A-Za-z][:=]/.test(line))) {
    return rawLines
      .map(parseRoomUserPropertyLine)
      .filter((entry): entry is { readonly prop: string; readonly value: string } => entry !== undefined);
  }

  return parseFlattenedRoomUserPropertyChunks(body);
}

function parseRoomUserPropertyLine(line: string): { readonly prop: string; readonly value: string } | undefined {
  if (line.length < 2) {
    return undefined;
  }

  const prop = line.charAt(0).toLowerCase();
  if (!isRoomUserSourceProperty(prop)) {
    return undefined;
  }

  const delimiter = line.charAt(1);
  const value = delimiter === ":" || delimiter === "=" ? line.slice(2).trim() : line.slice(1).trim();
  return { prop, value };
}

function parseFlattenedRoomUserPropertyChunks(body: string): readonly { readonly prop: string; readonly value: string }[] {
  const text = body.trim();
  const matches: { readonly index: number; readonly prop: string }[] = [];
  const pattern = /(^|\s)([A-Za-z])[:=]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const prop = (match[2] ?? "").toLowerCase();
    if (!isRoomUserSourceProperty(prop)) {
      continue;
    }

    matches.push({
      index: match.index + (match[1]?.length ?? 0),
      prop
    });
  }

  return matches.map((entry, index) => {
    const next = matches[index + 1];
    const valueStart = entry.index + 2;
    const valueEnd = next ? next.index : text.length;
    return {
      prop: entry.prop,
      value: text.slice(valueStart, valueEnd).trim()
    };
  });
}

function isRoomUserSourceProperty(prop: string): boolean {
  return prop === "i"
    || prop === "n"
    || prop === "f"
    || prop === "l"
    || prop === "c"
    || prop === "s"
    || prop === "p"
    || prop === "b"
    || prop === "a"
    || prop === "g"
    || prop === "t";
}

function parseDirectionPart(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? moduloDirection(parsed) : fallback;
}

function parseRoomLocation(value: string): { readonly x: number; readonly y: number; readonly h: number } | undefined {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) {
    return undefined;
  }

  return {
    x: Number.parseInt(parts[0] ?? "0", 10) || 0,
    y: Number.parseInt(parts[1] ?? "0", 10) || 0,
    h: Number.parseFloat(parts[2] ?? "0") || 0
  };
}

function numberFromUnknown(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function directorFrameDurationMs(tempo: number): number {
  return 1000 / Math.max(1, Number.isFinite(tempo) ? Math.trunc(tempo) : 24);
}
