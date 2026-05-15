export const HABBO_MESSENGER_TITLE_KEY = "win_messenger";
export const HABBO_MESSENGER_FALLBACK_TITLE = "Habbo Console";
export const HABBO_MESSENGER_TEMPLATE = "habbo_messenger.window";
export const HABBO_MESSENGER_MY_INFO_LAYOUT = "console_myinfo.window";
export const HABBO_MESSENGER_FRIENDS_LAYOUT = "console_friends.window";
export const HABBO_MESSENGER_FIND_LAYOUT = "console_find.window";
export const HABBO_MESSENGER_MAIN_HELP_LAYOUT = "console_main_help.window";
export const HABBO_MESSENGER_FRIENDS_HELP_LAYOUT = "console_friends_help.window";
export const HABBO_MESSENGER_MESSAGE_MODES_HELP_LAYOUT = "console_messagemodes_help.window";
export const HABBO_MESSENGER_COMPOSE_LAYOUT = "console_compose.window";
export const HABBO_MESSENGER_GET_MESSAGE_LAYOUT = "console_getmessage.window";
export const HABBO_MESSENGER_GET_REQUEST_LAYOUT = "console_getrequest.window";
export const HABBO_MESSENGER_SENT_REQUEST_LAYOUT = "console_sentrequest.window";
export const HABBO_MESSENGER_REMOVE_FRIEND_LAYOUT = "console_removefriend.window";
export const HABBO_MESSENGER_NO_EMAIL_LAYOUT = "console_noemail.window";

export const HABBO_MESSENGER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_messenger/casts/External/ParentScript 3 - Messenger Interface Class.ls";

export const HABBO_MESSENGER_COMPONENT_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_messenger/casts/External/ParentScript 4 - Messenger Component Class.ls";

export const HABBO_MESSENGER_HANDLER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_messenger/casts/External/ParentScript 5 - Messenger Handler Class.ls";

export type HabboMessengerEventKind = "mouseDown" | "mouseUp" | "keyDown";

export type HabboMessengerAction =
  | { readonly kind: "view"; readonly layout: string }
  | { readonly kind: "messages-link" }
  | { readonly kind: "requests-link" }
  | { readonly kind: "friend-list" }
  | { readonly kind: "search" }
  | { readonly kind: "start-friend-request" }
  | { readonly kind: "confirm-friend-request" }
  | { readonly kind: "accept-request" }
  | { readonly kind: "decline-request" }
  | { readonly kind: "compose" }
  | { readonly kind: "send-message" }
  | { readonly kind: "cancel-compose" }
  | { readonly kind: "remove-friend" }
  | { readonly kind: "confirm-remove-friend" }
  | { readonly kind: "cancel-remove-friend" }
  | { readonly kind: "reply-message" }
  | { readonly kind: "next-message" }
  | { readonly kind: "message-mode"; readonly mode: "messenger" | "email" }
  | { readonly kind: "record"; readonly reason: string };

const sourceMouseDownActions: Readonly<Record<string, HabboMessengerAction>> = {
  "console.myinfo.button": { kind: "view", layout: HABBO_MESSENGER_MY_INFO_LAYOUT },
  "console.myfriends.button": { kind: "view", layout: HABBO_MESSENGER_FRIENDS_LAYOUT },
  "console.find.button": { kind: "view", layout: HABBO_MESSENGER_FIND_LAYOUT },
  "console.help.button": { kind: "view", layout: HABBO_MESSENGER_MAIN_HELP_LAYOUT },
  "console_myinfo_messages_link": { kind: "messages-link" },
  "console_myinfo_requests_link": { kind: "requests-link" },
  "console_friends_friendlist": { kind: "friend-list" },
  "console_compose_radio_messenger": { kind: "message-mode", mode: "messenger" },
  "console_compose_radio_email": { kind: "message-mode", mode: "email" }
};

const sourceMouseUpActions: Readonly<Record<string, HabboMessengerAction>> = {
  "console_search_search_button": { kind: "search" },
  "console_search_friendrequest_button": { kind: "start-friend-request" },
  "console_friendrequest_ok": { kind: "confirm-friend-request" },
  "console_friendrequest_accept": { kind: "accept-request" },
  "console_getfriendrequest_reject": { kind: "decline-request" },
  "messenger_friends_compose_button": { kind: "compose" },
  "console_compose_send": { kind: "send-message" },
  "console_compose_cancel": { kind: "cancel-compose" },
  "messenger_friends_remove_button": { kind: "remove-friend" },
  "console_friendrequest_remove": { kind: "confirm-remove-friend" },
  "console_getfriendrequest_cancel": { kind: "cancel-remove-friend" },
  "console_getmessage_reply": { kind: "reply-message" },
  "console_getmessage_next": { kind: "next-message" },
  "console_friends_help_button": { kind: "view", layout: HABBO_MESSENGER_FRIENDS_HELP_LAYOUT },
  "console_friends_help_backbutton": { kind: "view", layout: HABBO_MESSENGER_FRIENDS_LAYOUT },
  "console_compose_help_button": { kind: "view", layout: HABBO_MESSENGER_MESSAGE_MODES_HELP_LAYOUT },
  "console_messagemode_back": { kind: "view", layout: HABBO_MESSENGER_COMPOSE_LAYOUT },
  "compose_noemail_back": { kind: "view", layout: HABBO_MESSENGER_COMPOSE_LAYOUT },
  "console_safety_info": { kind: "record", reason: "safety-info-link" },
  "console_official_exit": { kind: "record", reason: "official-exit" }
};

export function resolveMessengerAction(elementId: string, event: HabboMessengerEventKind): HabboMessengerAction | undefined {
  if (event === "mouseDown") {
    return sourceMouseDownActions[elementId];
  }

  if (event === "mouseUp") {
    return sourceMouseUpActions[elementId];
  }

  if (event === "keyDown" && elementId === "console_search_key_field") {
    return { kind: "search" };
  }

  return undefined;
}

export function isMessengerLayout(layout: string): boolean {
  return layout.startsWith("console_") && layout.endsWith(".window");
}
