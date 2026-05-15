import type { HabboRoomChatMessage, HabboRoomChatMode } from "./HabboRoomChat";
import { rgbToHex } from "../HabboSourceValueHelpers";

export function readRoomChatMessages(value: unknown): HabboRoomChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboRoomChatMessage => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const candidate = entry as Partial<HabboRoomChatMessage>;
    return typeof candidate.id === "string"
      && typeof candidate.userId === "string"
      && typeof candidate.message === "string"
      && typeof candidate.name === "string"
      && typeof candidate.color === "string"
      && typeof candidate.createdAtMs === "number"
      && isRoomChatMode(candidate.mode);
  });
}

export function isRoomChatMode(value: unknown): value is HabboRoomChatMode {
  return value === "CHAT" || value === "SHOUT" || value === "WHISPER";
}

export function darkenBrightRoomChatColor(color: string): string {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color.trim());
  if (!match?.[1] || !match[2] || !match[3]) {
    return color;
  }

  const red = Number.parseInt(match[1], 16);
  const green = Number.parseInt(match[2], 16);
  const blue = Number.parseInt(match[3], 16);
  if ((red + green + blue) < 600) {
    return rgbToHex(red, green, blue);
  }

  return rgbToHex(Math.trunc(red * 0.9), Math.trunc(green * 0.9), Math.trunc(blue * 0.9));
}
