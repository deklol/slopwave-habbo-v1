import { decodeVl64 } from "../protocol";
import { coerceRecord } from "../HabboSourceValueHelpers";

export type HabboRoomChatMode = "CHAT" | "SHOUT" | "WHISPER";

export interface HabboRoomChatPacket {
  readonly userId: string;
  readonly message: string;
  readonly mode: HabboRoomChatMode;
}

export interface HabboRoomChatMessage extends HabboRoomChatPacket {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly createdAtMs: number;
  readonly anchorX?: number;
}

export interface HabboRoomChatStyle {
  readonly mode: HabboRoomChatMode;
  readonly variation: "plain" | "bold" | "italic";
  readonly fontWeight: "400" | "700";
  readonly fontStyle: "normal" | "italic";
}

export interface HabboRoomChatRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly windowTextValues: Map<string, string>;
  readonly objectManager: {
    getObject(id: string): { get(key: string): unknown } | undefined;
  };

  sessionHasRight(right: string): boolean;
  executeMessage(message: string, argument: unknown, release: string): boolean;
  queueRoomRequest(request: { readonly command: string; readonly message?: string }, release: string): void;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

const roomComponentClassSource = "hh_room/casts/External/ParentScript 4 - Room Component Class.ls";

// Room Handler Class reads int user id and string message from subjects 24, 25, and 26.
export function parseRoomChatPacket(body: string, mode: HabboRoomChatMode): HabboRoomChatPacket | undefined {
  const release1TextPacket = parseRelease1TextRoomChatPacket(body, mode);
  if (release1TextPacket) {
    return release1TextPacket;
  }

  const reader = new RoomChatBodyReader(body);
  const userId = String(reader.readInt());
  const message = reader.readString();
  if (!userId || !message) {
    return undefined;
  }

  return {
    userId,
    message,
    mode
  };
}

function parseRelease1TextRoomChatPacket(body: string, mode: HabboRoomChatMode): HabboRoomChatPacket | undefined {
  if (!/^[\r\n\t ]/.test(body)) {
    return undefined;
  }

  const normalized = body.replace(/^[\r\n\t ]+/, "");
  if (!normalized || /^[A-Za-z]/.test(normalized) === false) {
    return undefined;
  }

  const separator = normalized.search(/[\r\n\t ]/);
  if (separator < 0) {
    return undefined;
  }

  const userId = normalized.slice(0, separator).trim();
  const message = normalized.slice(separator + 1).replace(/^[\r\n\t ]+/, "");
  if (!userId || !message) {
    return undefined;
  }

  return {
    userId,
    message,
    mode
  };
}

// Balloon Manager maps packet command names to struct.font.* variants.
export function roomChatStyle(mode: HabboRoomChatMode): HabboRoomChatStyle {
  switch (mode) {
    case "SHOUT":
      return { mode, variation: "bold", fontWeight: "700", fontStyle: "normal" };
    case "WHISPER":
      return { mode, variation: "italic", fontWeight: "400", fontStyle: "italic" };
    default:
      return { mode: "CHAT", variation: "plain", fontWeight: "400", fontStyle: "normal" };
  }
}

export function trimRoomChatMessage(message: string, maxChars = 400): string {
  return message.length > maxChars ? message.slice(0, maxChars) : message;
}

export function submitRoomChatRuntime(
  host: HabboRoomChatRuntimeHost,
  release: string,
  options: { readonly shiftKey?: boolean } = {}
): boolean {
  if (host.movie.getProperty("roomActive") !== true) {
    return false;
  }

  const text = String(host.windowTextValues.get("chat_field") ?? "").trim();
  if (!text) {
    return false;
  }

  if (text.split(/\s+/, 1)[0]?.toLowerCase() === ":editcatalogue" && host.sessionHasRight("fuse_catalog_editor")) {
    const handled = host.executeMessage("#edit_catalogue", undefined, release);
    host.windowTextValues.set("chat_field", "");
    host.movie.setProperty("lastRoomChatRequest", {
      command: "edit_catalogue",
      message: text,
      handled,
      source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
    });
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("room", "info", "edit catalogue mode requested");
    return handled;
  }

  const roomComponent = host.objectManager.getObject("#room_component");
  const chatProps = coerceRecord(roomComponent?.get("chatProps"));
  const mode = options.shiftKey === true
    ? "SHOUT"
    : chatProps.mode === "WHISPER" || chatProps.mode === "SHOUT"
      ? chatProps.mode
      : "CHAT";
  const selectedObject = String(host.movie.getProperty("selectedRoomObjectName") ?? "");
  const message = mode === "WHISPER" && selectedObject ? `${selectedObject} ${text}` : text;
  host.queueRoomRequest({ command: mode, message }, release);
  host.windowTextValues.set("chat_field", "");
  host.movie.setProperty("lastRoomChatRequest", {
    command: mode,
    message,
    source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", `sendChat mode=${mode} length=${message.length}`);
  return true;
}

class RoomChatBodyReader {
  private offset = 0;

  constructor(private readonly body: string) {}

  readInt(): number {
    if (this.offset >= this.body.length) {
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
