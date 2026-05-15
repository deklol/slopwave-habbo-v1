export const HABBO_ROOM_FURNITURE_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 3 - Room Interface Class.ls";
export const HABBO_ROOM_OBJECT_MOVER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 9 - Object Mover Class.ls";

export const HABBO_ROOM_DELETE_CONFIRM_TEMPLATE = "habbo_basic.window";
export const HABBO_ROOM_DELETE_CONFIRM_LAYOUT = "habbo_decision_dialog.window";
export const HABBO_ROOM_DELETE_CONFIRM_TITLE_KEY = "win_delete_item";
export const HABBO_ROOM_DELETE_CONFIRM_FALLBACK_TITLE = "Delete item?";
export const HABBO_ROOM_DELETE_CONFIRM_TEXT_A_KEY = "room_confirmDelete";
export const HABBO_ROOM_DELETE_CONFIRM_TEXT_A_FALLBACK = "Confirm delete";
export const HABBO_ROOM_DELETE_CONFIRM_TEXT_B_KEY = "room_areYouSure";
export const HABBO_ROOM_DELETE_CONFIRM_TEXT_B_FALLBACK = "Are you absolutely sure you want to delete this item?";

export const HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE = 27000;
export const HABBO_ROOM_OBJECT_MOVER_GHOST_BLEND = 35;
export const HABBO_ROOM_OBJECT_MOVER_SMALL_BLEND = 60;
export const HABBO_ROOM_OBJECT_MOVER_INVALID_ITEM_BLEND = 30;
export const HABBO_ROOM_OBJECT_MOVER_SMALL_LOCZ = 20000000;

export type HabboRoomDeleteConfirmAction = "ok" | "cancel";

export function resolveRoomDeleteConfirmAction(elementId: string): HabboRoomDeleteConfirmAction | undefined {
  switch (elementId) {
    case "habbo_decision_ok":
      return "ok";
    case "habbo_decision_cancel":
    case "close":
      return "cancel";
    default:
      return undefined;
  }
}

export function roomObjectMoverSmallMemberCandidates(className: string): readonly string[] {
  const trimmed = className.trim();
  const baseClass = trimmed.includes("*") ? trimmed.slice(0, trimmed.indexOf("*")) : trimmed;
  return [
    `${trimmed}_small`,
    `${baseClass}_small`,
    "room_object_placeholder"
  ].filter((candidate, index, all) => candidate.length > 0 && all.indexOf(candidate) === index);
}
