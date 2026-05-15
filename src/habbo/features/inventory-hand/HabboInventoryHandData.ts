import { moduloDirection } from "../../room/HabboRoomObjectData";
import type { HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { HABBO_ROOM_HAND_VISUALIZER_ID } from "../../ui/HabboRoomHand";

export interface HabboStripItemRecord {
  readonly id: string;
  readonly stripId: string;
  readonly objectId: string;
  readonly stripType: "S" | "I" | string;
  readonly sourceStripType: "active" | "item";
  readonly kind: "stuff" | "item";
  readonly className: string;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly customData?: string;
  readonly rawFields: readonly string[];
}

export interface HabboRoomDeleteConfirmationState {
  readonly objectId: string;
  readonly kind: "active" | "item";
  readonly className: string;
}

export type HabboRoomObjectMoverPlacement =
  | HabboRoomObjectMoverActivePlacement
  | HabboRoomObjectMoverItemPlacement
  | HabboRoomObjectMoverActiveMove;

export interface HabboRoomObjectMoverActivePlacement {
  readonly action: "placeActive";
  readonly objectId: string;
  readonly stripId: string;
  readonly className: string;
  readonly width: number;
  readonly height: number;
  readonly direction: number;
  readonly colors?: string;
}

export interface HabboRoomObjectMoverItemPlacement {
  readonly action: "placeItem";
  readonly objectId: string;
  readonly stripId: string;
  readonly className: string;
  readonly itemType: string;
}

export interface HabboRoomObjectMoverActiveMove {
  readonly action: "moveActive";
  readonly objectId: string;
  readonly className: string;
  readonly width: number;
  readonly height: number;
  readonly direction: number;
  readonly colors?: string;
}

export function readStripItems(value: unknown): HabboStripItemRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboStripItemRecord => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Partial<HabboStripItemRecord>;
    return typeof record.id === "string" && typeof record.className === "string";
  });
}

export function parseStripInfoPacket(body: string): { readonly items: readonly HabboStripItemRecord[]; readonly totalCount: number } {
  const trimmed = body.trim();
  if (!trimmed || trimmed === "0") {
    return { items: [], totalCount: 0 };
  }

  if (looksLikeSemicolonStripInfo(body)) {
    const items = body
      .split("/")
      .map((entry) => parseSemicolonStripInfoEntry(entry))
      .filter((entry): entry is HabboStripItemRecord => entry !== undefined);
    return { items, totalCount: items.length };
  }

  const splitIndex = body.lastIndexOf("\r");
  const entryText = splitIndex >= 0 ? body.slice(0, splitIndex) : body;
  const totalText = splitIndex >= 0 ? body.slice(splitIndex + 1).trim() : "";
  const items = entryText.split("/").map((entry) => parseStripInfoEntry(entry)).filter((entry): entry is HabboStripItemRecord => entry !== undefined);
  const totalCount = Number.parseInt(totalText, 10);
  return {
    items,
    totalCount: Number.isFinite(totalCount) ? totalCount : items.length
  };
}

export function readRoomHandInteractiveElements(value: unknown): HabboWindowInteractiveElement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboWindowInteractiveElement => {
    if (!isHabboWindowInteractiveElement(entry)) {
      return false;
    }

    return entry.windowId === HABBO_ROOM_HAND_VISUALIZER_ID;
  });
}

export function readRoomObjectMoverPlacement(value: unknown): HabboRoomObjectMoverPlacement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (
    record.action === "placeItem"
    && typeof record.objectId === "string"
    && typeof record.stripId === "string"
    && typeof record.className === "string"
  ) {
    return {
      action: "placeItem",
      objectId: record.objectId,
      stripId: record.stripId,
      className: record.className,
      itemType: typeof record.itemType === "string" ? record.itemType : ""
    };
  }

  if (
    record.action === "moveActive"
    && typeof record.objectId === "string"
    && typeof record.className === "string"
    && typeof record.width === "number"
    && typeof record.height === "number"
    && typeof record.direction === "number"
  ) {
    return {
      action: "moveActive",
      objectId: record.objectId,
      className: record.className,
      width: Math.max(1, Math.trunc(record.width)),
      height: Math.max(1, Math.trunc(record.height)),
      direction: moduloDirection(record.direction),
      ...(typeof record.colors === "string" ? { colors: record.colors } : {})
    };
  }

  if (
    record.action !== "placeActive"
    || typeof record.objectId !== "string"
    || typeof record.stripId !== "string"
    || typeof record.className !== "string"
    || typeof record.width !== "number"
    || typeof record.height !== "number"
    || typeof record.direction !== "number"
  ) {
    return undefined;
  }

  return {
    action: "placeActive",
    objectId: record.objectId,
    stripId: record.stripId,
    className: record.className,
    width: Math.max(1, Math.trunc(record.width)),
    height: Math.max(1, Math.trunc(record.height)),
    direction: moduloDirection(record.direction),
    ...(typeof record.colors === "string" ? { colors: record.colors } : {})
  };
}

export function readRoomDeleteConfirmationState(value: unknown): HabboRoomDeleteConfirmationState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.objectId !== "string"
    || (record.kind !== "active" && record.kind !== "item")
    || typeof record.className !== "string"
  ) {
    return undefined;
  }

  return {
    objectId: record.objectId,
    kind: record.kind,
    className: record.className
  };
}

function parseStripInfoEntry(entry: string): HabboStripItemRecord | undefined {
  if (entry.includes(";")) {
    return parseSemicolonStripInfoEntry(entry);
  }

  const rawFields = entry.split(String.fromCharCode(30));
  const stripId = (rawFields[1] ?? rawFields[4] ?? "").trim();
  const objectId = (rawFields[4] ?? rawFields[1] ?? "").trim();
  const stripType = (rawFields[3] ?? "").trim();
  const className = (rawFields[5] ?? "").trim();
  if (!stripId || !className) {
    return undefined;
  }

  const kind = stripType === "S" ? "stuff" : "item";
  const width = Number.parseInt(rawFields[6] ?? "", 10);
  const height = Number.parseInt(rawFields[7] ?? "", 10);
  return {
    id: stripId,
    stripId,
    objectId: objectId || stripId,
    stripType,
    sourceStripType: kind === "stuff" ? "active" : "item",
    kind,
    className,
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(kind === "stuff" && rawFields[8]?.trim() ? { color: rawFields[8]!.trim() } : {}),
    ...(kind === "item" && rawFields[6]?.trim() ? { customData: rawFields[6]!.trim() } : {}),
    rawFields
  };
}

function looksLikeSemicolonStripInfo(body: string): boolean {
  return body.split("/").some((entry) => {
    const rawFields = stripTrailingEmptyField(entry.trim()).split(";");
    const stripType = (rawFields[3] ?? "").trim();
    return rawFields.length >= 8 && (stripType === "S" || stripType === "I");
  });
}

function parseSemicolonStripInfoEntry(entry: string): HabboStripItemRecord | undefined {
  const rawFields = stripTrailingEmptyField(entry.trim()).split(";").map((field) => field.trim());
  const stripId = (rawFields[1] ?? "").trim();
  const stripType = (rawFields[3] ?? "").trim();
  const className = (rawFields[5] ?? "").trim();
  if (!stripId || !className || (stripType !== "S" && stripType !== "I")) {
    return undefined;
  }

  const kind = stripType === "S" ? "stuff" : "item";
  const width = Number.parseInt(rawFields[8] ?? "", 10);
  const height = Number.parseInt(rawFields[9] ?? "", 10);
  return {
    id: stripId,
    stripId,
    objectId: stripId,
    stripType,
    sourceStripType: kind === "stuff" ? "active" : "item",
    kind,
    className,
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(kind === "stuff" && rawFields[10] ? { color: rawFields[10] } : {}),
    ...(kind === "item" && rawFields[7] ? { customData: rawFields[7] } : {}),
    rawFields
  };
}

function stripTrailingEmptyField(value: string): string {
  return value.endsWith(";") ? value.slice(0, -1) : value;
}

function isHabboWindowInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<HabboWindowInteractiveElement>;
  return typeof candidate.id === "string"
    && typeof candidate.windowId === "string"
    && (candidate.kind === "field"
      || candidate.kind === "button"
      || candidate.kind === "link"
      || candidate.kind === "scrollbar"
      || candidate.kind === "dropmenu"
      || candidate.kind === "drag"
      || candidate.kind === "room"
      || candidate.kind === "room_user"
      || candidate.kind === "room_object")
    && typeof candidate.x === "number"
    && typeof candidate.y === "number"
    && typeof candidate.width === "number"
    && typeof candidate.height === "number";
}
