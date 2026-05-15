export type HabboRoomBarAction =
  | { readonly kind: "message"; readonly message: "#openGeneralDialog"; readonly argument: "help" | "purse" }
  | { readonly kind: "message"; readonly message: "#show_hide_navigator" | "#show_hide_messenger" | "#show_hide_catalogue" }
  | { readonly kind: "container-open-close" };

export const HABBO_ROOM_INTERFACE_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 3 - Room Interface Class.ls";

export function resolveRoomBarAction(elementId: string): HabboRoomBarAction | undefined {
  switch (elementId) {
    case "int_help_image":
      return { kind: "message", message: "#openGeneralDialog", argument: "help" };
    case "int_hand_image":
      return { kind: "container-open-close" };
    case "int_brochure_image":
      return { kind: "message", message: "#show_hide_catalogue" };
    case "int_purse_image":
    case "get_credit_text":
      return { kind: "message", message: "#openGeneralDialog", argument: "purse" };
    case "int_nav_image":
      return { kind: "message", message: "#show_hide_navigator" };
    case "int_messenger_image":
      return { kind: "message", message: "#show_hide_messenger" };
    default:
      return undefined;
  }
}
