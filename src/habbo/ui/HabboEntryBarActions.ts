export type HabboEntryBarAction =
  | { readonly kind: "message"; readonly message: "#openGeneralDialog"; readonly argument: "help" | "purse" }
  | { readonly kind: "message"; readonly message: "#show_hide_navigator" | "#show_hide_messenger" | "#show_clubinfo" }
  | { readonly kind: "figure-update" }
  | { readonly kind: "noop"; readonly reason: "no-new-messages" | "no-new-buddy-requests" };

export interface HabboEntryBarState {
  readonly newMessageCount: number;
  readonly newBuddyRequestCount: number;
}

export function resolveEntryBarAction(elementId: string, state: HabboEntryBarState): HabboEntryBarAction | undefined {
  switch (elementId) {
    case "help_icon_image":
      return { kind: "message", message: "#openGeneralDialog", argument: "help" };
    case "get_credit_text":
    case "purse_icon_image":
      return { kind: "message", message: "#openGeneralDialog", argument: "purse" };
    case "nav_icon_image":
      return { kind: "message", message: "#show_hide_navigator" };
    case "messenger_icon_image":
      return { kind: "message", message: "#show_hide_messenger" };
    case "new_messages_text":
      return state.newMessageCount > 0
        ? { kind: "message", message: "#show_hide_messenger" }
        : { kind: "noop", reason: "no-new-messages" };
    case "friendrequests_text":
      return state.newBuddyRequestCount > 0
        ? { kind: "message", message: "#show_hide_messenger" }
        : { kind: "noop", reason: "no-new-buddy-requests" };
    case "update_habboid_text":
    case "ownhabbo_icon_image":
      return { kind: "figure-update" };
    case "club_icon_image":
    case "club_bottombar_text2":
      return { kind: "message", message: "#show_clubinfo" };
    default:
      return undefined;
  }
}
