export const HABBO_ROOM_KIOSK_INTERFACE_SOURCE =
  "extracted/projectorrays/release14.1_b8/hh_kiosk_room/casts/External/ParentScript 3 - RoomKiosk Interface Class.ls";

export type HabboRoomKioskDoor = "open" | "closed" | "password";

export function resolveRoomKioskSourceControlState(
  elementId: string | undefined,
  roomProps: Readonly<Record<string, unknown>>
): boolean | undefined {
  switch (elementId) {
    case "roomatic_namedisplayed_yes_check":
      return sourcePropString(roomProps, "showownername", "1") === "1";
    case "roomatic_namedisplayed_no_check":
      return sourcePropString(roomProps, "showownername", "1") !== "1";
    case "roomatic_security_open":
      return sourcePropString(roomProps, "door", "open") === "open";
    case "roomatic_security_locked":
      return sourcePropString(roomProps, "door", "open") === "closed";
    case "roomatic_security_pwc":
      return sourcePropString(roomProps, "door", "open") === "password";
    case "roomatic_security_letmove":
      return sourcePropString(roomProps, "ableothersmovefurniture", "0") === "1";
    default:
      return undefined;
  }
}

function sourcePropString(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: string
): string {
  const value = record[key];
  return value === undefined || value === null ? fallback : String(value);
}
