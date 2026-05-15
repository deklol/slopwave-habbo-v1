import type { HabboExternalCastVisualLayout } from "../boot/HabboBootResourceTypes";
import type { HabboRoomHandStripMode } from "../features/inventory-hand";

export interface HabboRoomDataStruct {
  readonly id: string;
  readonly name: string;
  readonly type: "private" | "public";
  readonly marker?: string;
  readonly owner?: string;
  readonly door?: string | number;
  readonly port?: number;
  readonly trading?: number;
  readonly teleport: number;
  readonly casts: readonly string[];
}

export interface HabboCallForHelpRequest {
  readonly id: number;
  readonly command: "CRYFORHELP";
  readonly status: "pending" | "sent";
  readonly message: string;
  readonly roomType: 0 | 1;
  readonly markerOrCasts: string;
  readonly roomName: string;
  readonly roomId: string;
  readonly roomOwner?: string;
  readonly roomPort?: number;
  readonly roomDoor?: number;
  readonly room: HabboRoomDataStruct;
}

export interface HabboRoomRequest {
  readonly id: number;
  readonly command:
    | "ROOM_DIRECTORY"
    | "TRYFLAT"
    | "GOTOFLAT"
    | "GETROOMAD"
    | "G_HMAP"
    | "G_USRS"
    | "G_OBJS"
    | "G_ITEMS"
    | "G_STAT"
    | "MOVE"
    | "CHAT"
    | "SHOUT"
    | "WHISPER"
    | "LOOKTO"
    | "STOP"
    | "DANCE"
    | "WAVE"
    | "MODERATOR"
    | "QUIT"
    | "SETBADGE"
    | "ADDSTRIPITEM"
    | "GETSTRIP"
    | "FLATPROPBYITEM"
    | "PLACESTUFF"
    | "MOVESTUFF"
    | "REMOVEITEM"
    | "REMOVESTUFF"
    | "SETSTUFFDATA"
    | "GETDOORFLAT"
    | "GOVIADOOR"
    | "INTODOOR"
    | "DOORGOIN"
    | "USEITEM";
  readonly status: "pending" | "sent";
  readonly roomId?: string;
  readonly isPublic?: boolean;
  readonly doorId?: number;
  readonly password?: string;
  readonly x?: number;
  readonly y?: number;
  readonly message?: string;
  readonly action?: string;
  readonly level?: string;
  readonly badge?: string;
  readonly visible?: number;
  readonly objectId?: string;
  readonly stripType?: "stuff" | "item";
  readonly stripMode?: HabboRoomHandStripMode;
  readonly direction?: number;
  readonly key?: string;
  readonly value?: string;
  readonly body?: string;
}

export interface HabboRoomPattern {
  readonly index: string;
  readonly type: string;
  readonly palette: string;
  readonly color: string;
  readonly raw: string;
}

export interface HabboPrivateRoomPatterns {
  readonly floor?: HabboRoomPattern;
  readonly wall?: HabboRoomPattern;
}

export interface HabboPrivateRoomProgramState {
  readonly floorModel: string;
  readonly wallModel: string;
  readonly floorDefined: boolean;
  readonly wallDefined: boolean;
}

export function readCallForHelpRequests(value: unknown): HabboCallForHelpRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboCallForHelpRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    return typeof record.id === "number"
      && record.command === "CRYFORHELP"
      && (record.status === "pending" || record.status === "sent")
      && typeof record.message === "string"
      && (record.roomType === 0 || record.roomType === 1)
      && typeof record.markerOrCasts === "string"
      && typeof record.roomName === "string"
      && typeof record.roomId === "string";
  });
}

export function readRoomRequests(value: unknown): HabboRoomRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboRoomRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "ROOM_DIRECTORY"
        || command === "TRYFLAT"
        || command === "GOTOFLAT"
        || command === "GETROOMAD"
        || command === "G_HMAP"
        || command === "G_USRS"
        || command === "G_OBJS"
        || command === "G_ITEMS"
        || command === "G_STAT"
        || command === "MOVE"
        || command === "CHAT"
        || command === "SHOUT"
        || command === "WHISPER"
        || command === "LOOKTO"
        || command === "STOP"
        || command === "DANCE"
        || command === "WAVE"
        || command === "MODERATOR"
        || command === "QUIT"
        || command === "SETBADGE"
        || command === "ADDSTRIPITEM"
        || command === "GETSTRIP"
        || command === "FLATPROPBYITEM"
        || command === "PLACESTUFF"
        || command === "MOVESTUFF"
        || command === "REMOVEITEM"
        || command === "REMOVESTUFF"
        || command === "SETSTUFFDATA"
        || command === "GETDOORFLAT"
        || command === "GOVIADOOR"
        || command === "INTODOOR"
        || command === "DOORGOIN"
        || command === "USEITEM")
      && (record.status === "pending" || record.status === "sent");
  });
}

export function readRoomDataStruct(value: unknown): HabboRoomDataStruct | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" || typeof record.id === "number" ? String(record.id) : "";
  const name = typeof record.name === "string" ? record.name : "";
  const type = record.type === "public" ? "public" : record.type === "private" ? "private" : undefined;
  if (!id || !type) {
    return undefined;
  }

  return {
    id,
    name,
    type,
    ...(typeof record.marker === "string" ? { marker: record.marker } : {}),
    ...(typeof record.owner === "string" ? { owner: record.owner } : {}),
    ...(typeof record.door === "string" || typeof record.door === "number" ? { door: record.door } : {}),
    ...(typeof record.port === "number" && Number.isFinite(record.port) ? { port: Math.trunc(record.port) } : {}),
    ...(typeof record.trading === "number" && Number.isFinite(record.trading) ? { trading: Math.trunc(record.trading) } : {}),
    teleport: typeof record.teleport === "number" && Number.isFinite(record.teleport) ? Math.trunc(record.teleport) : 0,
    casts: Array.isArray(record.casts) ? record.casts.map((entry) => String(entry)).filter(Boolean) : []
  };
}

export function readRoomVisual(value: unknown): HabboExternalCastVisualLayout | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Partial<HabboExternalCastVisualLayout>;
  return typeof record.memberName === "string"
    && typeof record.visualName === "string"
    && Array.isArray(record.elements)
    ? record as HabboExternalCastVisualLayout
    : undefined;
}

export function readPrivateRoomProgramState(value: unknown): HabboPrivateRoomProgramState | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Partial<HabboPrivateRoomProgramState>;
  return typeof record.floorModel === "string" && typeof record.wallModel === "string"
    ? {
        floorModel: record.floorModel,
        wallModel: record.wallModel,
        floorDefined: record.floorDefined === true,
        wallDefined: record.wallDefined === true
      }
    : undefined;
}
