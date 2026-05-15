export type HabboRoomEntryState =
  | "idle"
  | "loading-common-casts"
  | "loading-room-casts"
  | "preparing-room"
  | "waiting-bootstrap"
  | "waiting-status"
  | "ready-to-activate"
  | "active";

export type HabboRoomWirePhase =
  | "idle"
  | "awaiting-opc-ok"
  | "awaiting-flat-letin"
  | "awaiting-room-ready"
  | "awaiting-bootstrap"
  | "awaiting-status"
  | "active";

export const ROOM_CAST_CALLBACK_FRAME_DELAY_MS = 16;

export function roomHoldText(texts: ReadonlyMap<string, string>): string {
  return texts.get("room_hold") ?? texts.get("room_loading") ?? "Hold on...";
}

export function roomLoadingText(texts: ReadonlyMap<string, string>, roomName: string): string {
  return `${texts.get("room_loading") ?? "Loading room"}\r"${roomName}"`;
}

export function roomPreparingText(texts: ReadonlyMap<string, string>, roomName: string, waiting = false): string {
  const statusText = waiting
    ? texts.get("room_waiting") ?? "...waiting."
    : texts.get("room_preparing") ?? "...preparing room.";
  return `"${roomName}"\r${statusText}`;
}
