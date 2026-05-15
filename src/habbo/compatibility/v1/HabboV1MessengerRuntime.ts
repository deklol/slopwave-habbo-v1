import type { DirectorMember, DirectorMemberManifest, DirectorMovie, DirectorSpriteChannelManifest } from "../../../runtime";
import {
  getActiveUserFigurePropsRuntime,
  getMessengerCurrentMessageFigurePropsRuntime,
  getMessengerSearchFigurePropsRuntime,
  type HabboFigurePartProps,
  type HabboFigureRuntimeHost,
  type HabboFigureSourceLayer
} from "../../features/figure";
import type { HabboFriendsConsoleRuntimeHost } from "../../features/friends-console/HabboFriendsConsoleRuntime";
import { queueMessengerRequest, setMessengerRequests } from "../../features/friends-console/HabboFriendsConsoleRuntime";
import {
  readMessengerBuddyList,
  readMessengerMessage,
  readMessengerSearchResult,
  type HabboMessengerBuddy,
  type HabboMessengerMessage
} from "../../features/friends-console/HabboFriendsConsolePackets";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { rgbToHex, sanitizeDirectorSingleLineInput } from "../../HabboSourceValueHelpers";
import {
  parseRecordedNavigatorFrame,
  popupContextSourcePath,
  release1FieldText,
  sanitizeElementId,
  stringBehaviorProperty,
  type RecordedSprite
} from "./HabboV1NavigatorSource";
import { directorInteger, readRecord } from "./HabboV1EntryRuntime";
import { closeRelease1EntryNavigator } from "./HabboV1Navigator";

const messengerWindowId = "#release1_messenger";
const messengerCastName = "MessengerScript";
const messengerEntryStartChannel = 380;
const messengerRoomStartChannel = 660;
const messengerChannelCount = 51;
const messengerLocZ = 2_110_000_000;
const messengerDefaultPlace = { x: 300, y: 100 } as const;
const messengerRuntimeCastSlot = 10011;

const messengerFrameAliases: Readonly<Record<string, Release1MessengerFrame>> = {
  findresult: "find"
};

export const release1MessengerSources = {
  open: "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 36 - Messenger Open.ls",
  close: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 193 - Close Messenger.ls",
  move: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 194 - Move Messenger.ls",
  context: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 160 - Go To Frame Context Sensitive.ls",
  buddyList: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/ParentScript 21 - BuddyList Class.ls",
  message: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/ParentScript 22 - Message Class.ls",
  messageManager: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/ParentScript 23 - MessageManager Class.ls",
  searchUser: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 136 - Search User.ls",
  userSearchField: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 191 - usersearchfieldbehavior.ls",
  buddyRequest: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 149 - Buddy Request.ls",
  acceptBuddy: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 33 - Accept buddy.ls",
  declineBuddy: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 34 - Decline buddy.ls",
  sendMessage: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 139 - SendMessage.ls",
  activateReceiver: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 28 - Activate Receiver & Read.ls",
  nextMessage: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 25 - NextMessage.ls",
  myWireFace: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 212 - MyWireFace.ls",
  wireFaceBehavior: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 213 - WireFaceBehavior.ls",
  enterpriseConnection: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 1 - EnterpriseServer Connection Scripts.ls"
} as const;

type Release1MessengerFrame =
  | "main"
  | "buddies"
  | "find"
  | "buddy_requests"
  | "asktobuddy"
  | "buddyselected"
  | "buddydelete"
  | "edit_pmsg"
  | "help"
  | "readmsg"
  | "writemsg"
  | "msgsent"
  | "sms_account";

type Release1MessengerArea = "entry" | "room";

type Release1MessengerActionKind =
  | "close"
  | "frame"
  | "search"
  | "request-buddy"
  | "accept-buddy"
  | "decline-buddy"
  | "select-buddy"
  | "read-message"
  | "send-message";

interface Release1MessengerAction {
  readonly id: string;
  readonly kind: Release1MessengerActionKind;
  readonly event: "mouseDown" | "mouseUp";
  readonly targetFrame?: Release1MessengerFrame;
  readonly row?: number;
  readonly source: readonly string[];
}

interface Release1MessengerPlace {
  readonly x: number;
  readonly y: number;
}

export interface HabboV1MessengerRuntimeHost extends HabboFriendsConsoleRuntimeHost {
  readonly movie: DirectorMovie;
  syncDirectorOverlaySprites(): void;
}

export function showHideRelease1Messenger(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const state = readRecord(host.movie.getProperty("release1EntryMessengerState"));
  if (state?.open === true) {
    return closeRelease1Messenger(host, release);
  }
  return openRelease1Messenger(host, release, "main");
}

export function openRelease1Messenger(
  host: HabboV1MessengerRuntimeHost,
  release: string,
  frame: Release1MessengerFrame = "main"
): boolean {
  const area = release1MessengerArea(host.movie);
  if (area === "room" && readRecord(host.movie.getProperty("release1EntryNavigatorState"))?.open === true) {
    closeRelease1EntryNavigator(host.movie);
  }
  host.movie.setProperty("release1EntryMessengerState", {
    open: true,
    frame,
    area,
    place: messengerDefaultPlace,
    channels: release1MessengerChannelRange(area),
    source: [release1MessengerSources.open, popupContextSourcePath]
  });
  host.movie.debugLog.add("messenger", "info", `release1 openMessenger displayFrame=${frame}`);
  syncRelease1Messenger(host, release);
  return true;
}

export function closeRelease1Messenger(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const message = String(
    host.windowTextValues.get(release1MessengerFieldId("messenger.my_persistent_message"))
      ?? host.movie.getProperty("messengerPersistentMessage")
      ?? ""
  ).split(/\r?\n|\r/)[0] ?? "";
  if (message && message !== String(host.movie.getProperty("messengerPersistentMessage") ?? "")) {
    queueMessengerRequest(host, {
      command: "MESSENGER_ASSIGNPERSMSG",
      body: message
    }, release);
    host.movie.setProperty("messengerPersistentMessage", message);
  }

  host.movie.setProperty("release1EntryMessengerState", {
    open: false,
    source: release1MessengerSources.close
  });
  clearRelease1Messenger(host.movie);
  host.syncDirectorOverlaySprites();
  host.movie.debugLog.add("messenger", "info", "release1 closeMessenger");
  return true;
}

export function syncRelease1Messenger(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const state = readRecord(host.movie.getProperty("release1EntryMessengerState"));
  if (state?.open !== true) {
    clearRelease1Messenger(host.movie);
    return false;
  }

  const frame = normalizeRelease1MessengerFrame(String(state.frame ?? "main"));
  updateRelease1MessengerTextMembers(host, frame);

  const area = release1MessengerArea(host.movie);
  const recordedSprites = parseRecordedNavigatorFrame(host.movie, `${frame}.recorded`, {
    castName: messengerCastName,
    startChannel: release1MessengerStartChannel(area),
    locZ: messengerLocZ,
    place: readRelease1MessengerPlace(state)
  });
  if (recordedSprites.length === 0) {
    host.recordUnsupportedOnce(`release1-messenger-recorded-frame-missing:${frame}`, {
      subsystem: "habbo",
      feature: "release1-messenger-recorded-frame-missing",
      detail: `release1 MessengerScript requested ${frame}.recorded, but no recorded source frame was found in the imported cast`,
      source: `${release1MessengerSources.open}; ${popupContextSourcePath}`
    });
    clearRelease1Messenger(host.movie);
    return false;
  }

  const sprites = recordedSprites.map((sprite) => recordedSpriteManifest(host, sprite, frame, release));
  setRelease1MessengerOverlaySprites(host.movie, sprites, area);
  syncRelease1MessengerInteractions(host, recordedSprites, frame, area);
  host.movie.setProperty("release1MessengerVisualState", {
    open: true,
    frame,
    area,
    spriteCount: sprites.length,
    source: [release1MessengerSources.open, popupContextSourcePath]
  });
  host.syncDirectorOverlaySprites();
  return true;
}

export function syncRelease1MessengerIfOpen(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const state = readRecord(host.movie.getProperty("release1EntryMessengerState"));
  return state?.open === true ? syncRelease1Messenger(host, release) : false;
}

export function moveRelease1MessengerBy(
  host: HabboV1MessengerRuntimeHost,
  offsetX: number,
  offsetY: number,
  release: string
): boolean {
  const state = readRecord(host.movie.getProperty("release1EntryMessengerState"));
  if (state?.open !== true) {
    return false;
  }

  const deltaX = Math.round(offsetX);
  const deltaY = Math.round(offsetY);
  if (deltaX === 0 && deltaY === 0) {
    return true;
  }

  const place = readRelease1MessengerPlace(state);
  const nextPlace = clampRelease1MessengerPlace(host.movie, {
    x: place.x + deltaX,
    y: place.y + deltaY
  });
  if (nextPlace.x === place.x && nextPlace.y === place.y) {
    return true;
  }

  host.movie.setProperty("release1EntryMessengerState", {
    ...state,
    place: nextPlace,
    source: [release1MessengerSources.move, popupContextSourcePath]
  });
  host.movie.setProperty("release1MessengerLastMove", {
    offsetX: deltaX,
    offsetY: deltaY,
    place: nextPlace,
    source: release1MessengerSources.move
  });
  return syncRelease1Messenger(host, release);
}

export function activateRelease1MessengerElement(
  host: HabboV1MessengerRuntimeHost,
  elementId: string,
  activation: HabboWindowElementActivation | undefined,
  release: string
): boolean {
  if (elementId.startsWith("release1_open_messenger_room_")) {
    return false;
  }

  if (!elementId.startsWith("release1_messenger_") && !elementId.startsWith("release1_open_messenger_")) {
    return false;
  }

  if (elementId.startsWith("release1_open_messenger_") || elementId.startsWith("release1_messenger_open_")) {
    if (activation?.event === "mouseDown") {
      return false;
    }
    return showHideRelease1Messenger(host, release);
  }

  const actions = readRelease1MessengerActions(host.movie);
  const action = actions.find((candidate) => candidate.id === elementId);
  if (!action) {
    return false;
  }
  if (activation?.event && !release1MessengerActionAcceptsEvent(action, activation.event)) {
    return false;
  }

  switch (action.kind) {
    case "close":
      return closeRelease1Messenger(host, release);
    case "frame":
      return showRelease1MessengerFrame(host, action.targetFrame ?? "main", release);
    case "search":
      return searchRelease1MessengerUser(host, release);
    case "request-buddy":
      return requestRelease1MessengerBuddy(host, release);
    case "accept-buddy":
      return acceptOrDeclineRelease1MessengerBuddy(host, "accept", release);
    case "decline-buddy":
      return acceptOrDeclineRelease1MessengerBuddy(host, "decline", release);
    case "select-buddy":
      return selectRelease1MessengerBuddy(host, action.row ?? 0, activation, release);
    case "read-message":
      return readRelease1MessengerMessage(host, release);
    case "send-message":
      return sendRelease1MessengerMessage(host, release);
    default:
      return false;
  }
}

function release1MessengerActionAcceptsEvent(
  action: Release1MessengerAction,
  event: HabboWindowElementActivation["event"]
): boolean {
  if (event === undefined || event === action.event) {
    return true;
  }
  return action.kind === "close" && action.event === "mouseDown" && event === "mouseUp";
}

function showRelease1MessengerFrame(
  host: HabboV1MessengerRuntimeHost,
  frame: Release1MessengerFrame,
  release: string
): boolean {
  const state = readRecord(host.movie.getProperty("release1EntryMessengerState"));
  host.movie.setProperty("release1EntryMessengerState", {
    ...state,
    open: true,
    frame,
    area: release1MessengerArea(host.movie),
    source: [release1MessengerSources.context, release1MessengerSources.open]
  });
  return syncRelease1Messenger(host, release);
}

function searchRelease1MessengerUser(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const rawName = host.windowTextValues.get(release1MessengerFieldId("messenger.search_user")) ?? "";
  const name = sanitizeDirectorSingleLineInput(rawName).trim();
  if (!name) {
    return true;
  }

  queueMessengerRequest(host, {
    command: "FINDUSER",
    name,
    context: "MESSENGER",
    body: `${name}\tMESSENGER`
  }, release);
  host.movie.setProperty("messengerLastSearchQuery", name);
  host.movie.setProperty("messengerLastSearch", undefined);
  setTextMemberByName(host.movie, "messenger.member_info", release1FieldText(host.movie, "Searching", "Searching..."));
  return showRelease1MessengerFrame(host, "find", release);
}

function requestRelease1MessengerBuddy(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const result = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  if (!result?.found || !result.name) {
    return true;
  }

  queueMessengerRequest(host, {
    command: "MESSENGER_REQUESTBUDDY",
    name: result.name,
    body: `${result.name}\rrequest buddy.message`
  }, release);
  setTextMemberByName(host.movie, "messenger.ask_to_buddy_confirmation", `${result.name}\r${release1FieldText(host.movie, "BuddyRequestSent", "Request sent")}`);
  return showRelease1MessengerFrame(host, "asktobuddy", release);
}

function acceptOrDeclineRelease1MessengerBuddy(
  host: HabboV1MessengerRuntimeHost,
  mode: "accept" | "decline",
  release: string
): boolean {
  const [name, ...remaining] = readRelease1MessengerRequestNames(host.movie);
  if (!name) {
    return showRelease1MessengerFrame(host, "main", release);
  }

  queueMessengerRequest(host, {
    command: mode === "accept" ? "MESSENGER_ACCEPTBUDDY" : "MESSENGER_DECLINEBUDDY",
    name,
    body: name
  }, release);
  setRelease1MessengerRequestNames(host, remaining, release);
  return showRelease1MessengerFrame(host, remaining.length > 0 ? "buddy_requests" : "main", release);
}

function selectRelease1MessengerBuddy(
  host: HabboV1MessengerRuntimeHost,
  row: number,
  activation: HabboWindowElementActivation | undefined,
  release: string
): boolean {
  const list = readMessengerBuddyList(host.movie.getProperty("messengerBuddyList"));
  const name = list.render[Math.max(0, row - 1)] ?? "";
  const buddy = buddyByRenderedName(list.buddies, name);
  if (!buddy) {
    return true;
  }

  const topRowClick = activation?.localY !== undefined && activation.localY <= 15;
  if (topRowClick && readMessengerMessages(host.movie.getProperty("messengerMessages")).some((message) => message.senderID === buddy.id)) {
    return readRelease1MessengerMessageForBuddy(host, buddy.id, release);
  }

  host.movie.setProperty("messengerSelectedBuddies", [buddy.name]);
  host.movie.setProperty("messengerSelectedBuddyIds", [buddy.id]);
  host.movie.setProperty("lastMessengerSelectedBuddy", buddy.name);
  return showRelease1MessengerFrame(host, "buddyselected", release);
}

function readRelease1MessengerMessage(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const message = readMessengerMessages(host.movie.getProperty("messengerMessages"))[0];
  return readRelease1MessengerMessageRecord(host, message, release);
}

function readRelease1MessengerMessageForBuddy(host: HabboV1MessengerRuntimeHost, buddyId: string, release: string): boolean {
  const message = readMessengerMessages(host.movie.getProperty("messengerMessages")).find((entry) => entry.senderID === buddyId);
  return readRelease1MessengerMessageRecord(host, message, release);
}

function readRelease1MessengerMessageRecord(
  host: HabboV1MessengerRuntimeHost,
  message: HabboMessengerMessage | undefined,
  release: string
): boolean {
  if (!message) {
    return true;
  }
  host.movie.setProperty("release1MessengerActiveMessage", message);
  queueMessengerRequest(host, {
    command: "MESSENGER_MARKREAD",
    messageId: message.id,
    body: message.id
  }, release);
  const remaining = readMessengerMessages(host.movie.getProperty("messengerMessages")).filter((entry) => entry.id !== message.id);
  host.movie.setProperty("messengerMessages", remaining);
  return showRelease1MessengerFrame(host, "readmsg", release);
}

function sendRelease1MessengerMessage(host: HabboV1MessengerRuntimeHost, release: string): boolean {
  const list = readMessengerBuddyList(host.movie.getProperty("messengerBuddyList"));
  const receiverIds = readStringList(host.movie.getProperty("messengerSelectedBuddyIds"));
  const selected = receiverIds.length > 0 ? receiverIds : firstRenderedBuddyId(list);
  const message = String(host.windowTextValues.get(release1MessengerFieldId("messenger.message.new")) ?? "").trim();
  if (selected.length === 0 || !message) {
    return true;
  }

  queueMessengerRequest(host, {
    command: "MESSENGER_SENDMSG",
    receivers: selected,
    message,
    body: `${selected.join(" ")}\r${message}`
  }, release);
  host.windowTextValues.set(release1MessengerFieldId("messenger.message.new"), "");
  setTextMemberByName(host.movie, "messenger.message.new", "");
  return showRelease1MessengerFrame(host, "msgsent", release);
}

function updateRelease1MessengerTextMembers(host: HabboV1MessengerRuntimeHost, frame: Release1MessengerFrame): void {
  const movie = host.movie as DirectorMovie;
  const user = currentRelease1UserName(movie);
  const persistent = String(movie.getProperty("messengerPersistentMessage") ?? release1FieldText(movie, "MyPersistentMessage", ""));
  setTextMemberByName(movie, "messenger.my_name", user);
  setTextMemberByName(movie, "messenger.my_persistent_message", persistent);
  host.windowTextValues.set(release1MessengerFieldId("messenger.my_persistent_message"), persistent);

  const requests = readRelease1MessengerRequestNames(movie);
  const messages = readMessengerMessages(movie.getProperty("messengerMessages"));
  const requestText = requests.length === 1
    ? release1FieldText(movie, "OnebuddyRequest", "1 Friend Request")
    : `${requests.length} ${release1FieldText(movie, "BuddyRequesta", "Friend Request(s)")}`;
  const messageText = `${messages.length} ${release1FieldText(movie, "NewBuddyMessages", "new message(s)")}`;
  setTextMemberByName(movie, "messenger.new_buddy_requests", requestText);
  setTextMemberByName(movie, "messenger.new_buddy_requests2", requestText);
  setTextMemberByName(movie, "messenger.no_of_new_messages", messageText);

  updateRelease1MessengerBuddyFields(host);
  updateRelease1MessengerSearchFields(host);
  updateRelease1MessengerRequestField(host);
  updateRelease1MessengerMessageFields(host);
  if (frame === "writemsg") {
    const selected = readStringList(movie.getProperty("messengerSelectedBuddies"));
    setTextMemberByName(movie, "receivers.show", `${release1FieldText(movie, "receivers", "To:")}\r${selected.join(", ")}`);
    setTextMemberByName(movie, "receivers", readStringList(movie.getProperty("messengerSelectedBuddyIds")).join(" "));
  }
}

function updateRelease1MessengerBuddyFields(host: HabboV1MessengerRuntimeHost): void {
  const movie = host.movie as DirectorMovie;
  const list = readMessengerBuddyList(movie.getProperty("messengerBuddyList"));
  const messages = readMessengerMessages(movie.getProperty("messengerMessages"));
  for (let index = 1; index <= 4; index += 1) {
    const name = list.render[index - 1] ?? "";
    const buddy = buddyByRenderedName(list.buddies, name);
    const text = buddy ? release1BuddyFieldText(movie, buddy, messages) : "";
    setTextMemberByName(movie, `buddy${index}.field`, text);
  }
  if (list.render.length === 0) {
    setTextMemberByName(movie, "buddy1.field", release1FieldText(movie, "YouCanAskBuddys", "You can ask Habbos to become your friends."));
  }
}

function release1BuddyFieldText(
  movie: DirectorMovie,
  buddy: HabboMessengerBuddy,
  messages: readonly HabboMessengerMessage[]
): string {
  const messageCount = messages.filter((message) => message.senderID === buddy.id).length;
  const location = buddy.online
    ? release1MessengerLocation(movie, buddy.unit)
    : `${release1FieldText(movie, "Last visit", "Last visit")} ${buddy.lastAccessTime}`.trim();
  const msgText = messageCount === 1 ? release1FieldText(movie, "msg", "msg") : release1FieldText(movie, "msgs", "msgs");
  return `${buddy.name} - ${messageCount}_${msgText}\r${location}\r"${buddy.msg}"`;
}

function updateRelease1MessengerSearchFields(host: HabboV1MessengerRuntimeHost): void {
  const movie = host.movie as DirectorMovie;
  const result = readMessengerSearchResult(movie.getProperty("messengerLastSearch"));
  if (!result) {
    return;
  }

  if (!result.found) {
    setTextMemberByName(movie, "messenger.member_info", release1FieldText(movie, "CantFindYou", "No Habbo found"));
    setTextMemberByName(movie, "messenger.member_info2", "");
    return;
  }

  const custom = result.customText ? `"${result.customText}"` : "\"\"";
  const lastAccess = `${release1FieldText(movie, "LastTime", "Last visit")} ${result.lastAccess}`.trim();
  const location = release1MessengerLocation(movie, result.location);
  setTextMemberByName(movie, "messenger.member_info", `${result.name}\r${custom}\r`);
  setTextMemberByName(movie, "messenger.member_info2", `${lastAccess}\r\r${release1FieldText(movie, "BuddyNow", "Now:")} ${location}`.trimEnd());
}

function updateRelease1MessengerRequestField(host: HabboV1MessengerRuntimeHost): void {
  const movie = host.movie as DirectorMovie;
  const [name] = readRelease1MessengerRequestNames(movie);
  if (name) {
    setTextMemberByName(movie, "messenger.buddy_request", name);
  }
}

function updateRelease1MessengerMessageFields(host: HabboV1MessengerRuntimeHost): void {
  const movie = host.movie as DirectorMovie;
  const messages = readMessengerMessages(movie.getProperty("messengerMessages"));
  const active = readMessengerMessage(movie.getProperty("release1MessengerActiveMessage")) ?? messages[0];
  if (!active) {
    setTextMemberByName(movie, "messenger.message_info", "");
    setTextMemberByName(movie, "messenger.message", "");
    return;
  }

  const list = readMessengerBuddyList(movie.getProperty("messengerBuddyList"));
  const buddy = list.buddies[active.senderID];
  const senderName = buddy?.name ?? active.senderID;
  setTextMemberByName(movie, "messenger.message_info", `From: ${senderName}\r${active.time}`);
  setTextMemberByName(movie, "messenger.message", active.message);
  setTextMemberByName(movie, "receivers", active.senderID);
}

function syncRelease1MessengerInteractions(
  host: HabboV1MessengerRuntimeHost,
  recordedSprites: readonly RecordedSprite[],
  frame: Release1MessengerFrame,
  area: Release1MessengerArea
): void {
  const existing = readInteractiveElements(host.movie.getProperty("windowInteractiveElements")).filter((element) => !isRelease1MessengerElement(element));
  const actions: Release1MessengerAction[] = [];
  const elements: HabboWindowInteractiveElement[] = [];

  for (const sprite of recordedSprites) {
    const behaviorNames = sprite.behaviorNames.map((name) => name.toLowerCase());
    const contextFrame = stringBehaviorProperty(sprite, "Go To Frame Context Sensitive", "sFrame");
    const contextTarget = contextFrame ? normalizeRelease1MessengerFrame(contextFrame) : undefined;

    const action = release1MessengerActionForSprite(sprite, behaviorNames, contextTarget, frame);
    if (action) {
      const bounds = release1MessengerSpriteBounds(host.movie, sprite);
      actions.push(action);
      elements.push({
        id: action.id,
        windowId: messengerWindowId,
        kind: action.kind === "close" ? "link" : "button",
        x: bounds.x,
        y: bounds.y,
        locZ: sprite.locZ,
        width: bounds.width,
        height: bounds.height,
        label: action.kind,
        cursor: "cursor.finger",
        clientId: action.kind
      });
      continue;
    }

    if (behaviorNames.includes("move messenger")) {
      const bounds = release1MessengerSpriteBounds(host.movie, sprite);
      elements.push({
        id: `release1_messenger_drag_${sprite.channel}`,
        windowId: messengerWindowId,
        kind: "drag",
        x: bounds.x,
        y: bounds.y,
        locZ: sprite.locZ,
        width: bounds.width,
        height: bounds.height,
        label: "drag",
        cursor: "move",
        clientId: "drag"
      });
      continue;
    }

    const member = host.movie.cast.getMember(sprite.member);
    if ((member?.type === "field" || member?.type === "text") && member.name) {
      const editableName = release1EditableMessengerField(member.name);
      if (editableName) {
        const id = release1MessengerFieldId(editableName);
        const bounds = release1MessengerSpriteBounds(host.movie, sprite);
        if (!host.windowTextValues.has(id)) {
          host.windowTextValues.set(id, member.text ?? "");
        }
        elements.push({
          id,
          windowId: messengerWindowId,
          kind: "field",
          x: bounds.x,
          y: bounds.y,
          locZ: sprite.locZ,
          width: bounds.width,
          height: bounds.height,
          label: member.name,
          editable: true,
          renderValue: true,
          fontSize: member.fontSize || 9,
          textAlign: member.textAlign ?? "left"
        });
      }
    }
  }

  host.movie.setProperty("release1MessengerActions", actions);
  host.movie.setProperty("windowInteractiveElements", [...existing, ...elements]);
  host.movie.setProperty("release1MessengerInteractionState", {
    frame,
    area,
    actionCount: actions.length,
    fieldCount: elements.filter((element) => element.kind === "field").length
  });
}

function release1MessengerSpriteBounds(movie: DirectorMovie, sprite: RecordedSprite): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const member = movie.cast.getMember(sprite.member);
  const width = Math.max(1, Math.round(sprite.width));
  const height = Math.max(1, Math.round(sprite.height));
  const sourceWidth = Math.max(1, Math.round(member?.composite?.width ?? member?.width ?? width));
  const sourceHeight = Math.max(1, Math.round(member?.composite?.height ?? member?.height ?? height));
  const regPoint = member?.regPoint ?? { x: 0, y: 0 };
  const scaledRegX = directorInteger((regPoint.x * width) / sourceWidth);
  const scaledRegY = directorInteger((regPoint.y * height) / sourceHeight);
  return {
    x: sprite.loc.x - scaledRegX,
    y: sprite.loc.y - scaledRegY,
    width,
    height
  };
}

function release1MessengerActionForSprite(
  sprite: RecordedSprite,
  behaviorNames: readonly string[],
  contextTarget: Release1MessengerFrame | undefined,
  frame: Release1MessengerFrame
): Release1MessengerAction | undefined {
  const close = behaviorNames.includes("close messenger");
  if (close) {
    return {
      id: `release1_messenger_close_${sprite.channel}`,
      kind: "close",
      event: "mouseDown",
      source: [release1MessengerSources.close, release1MessengerSources.open]
    };
  }

  if (contextTarget) {
    return {
      id: `release1_messenger_context_${sanitizeElementId(contextTarget)}_${sprite.channel}`,
      kind: "frame",
      event: "mouseUp",
      targetFrame: contextTarget,
      source: [release1MessengerSources.context, release1MessengerSources.open]
    };
  }

  if (behaviorNames.includes("search user")) {
    return {
      id: `release1_messenger_search_${sprite.channel}`,
      kind: "search",
      event: "mouseDown",
      source: [release1MessengerSources.searchUser, release1MessengerSources.userSearchField]
    };
  }

  if (behaviorNames.includes("buddy request")) {
    return {
      id: `release1_messenger_request_buddy_${sprite.channel}`,
      kind: "request-buddy",
      event: "mouseUp",
      source: [release1MessengerSources.buddyRequest]
    };
  }

  if (behaviorNames.includes("accept buddy")) {
    return {
      id: `release1_messenger_accept_buddy_${sprite.channel}`,
      kind: "accept-buddy",
      event: "mouseUp",
      source: [release1MessengerSources.acceptBuddy, release1MessengerSources.buddyList]
    };
  }

  if (behaviorNames.includes("decline buddy")) {
    return {
      id: `release1_messenger_decline_buddy_${sprite.channel}`,
      kind: "decline-buddy",
      event: "mouseUp",
      source: [release1MessengerSources.declineBuddy, release1MessengerSources.buddyList]
    };
  }

  if (behaviorNames.includes("sendmessage")) {
    return {
      id: `release1_messenger_send_message_${sprite.channel}`,
      kind: "send-message",
      event: "mouseUp",
      source: [release1MessengerSources.sendMessage]
    };
  }

  if (behaviorNames.includes("activate receiver & read") || behaviorNames.includes("new_activate receiver & read2")) {
    const row = rowFromBuddyFrameSprite(sprite.channel);
    return {
      id: `release1_messenger_select_buddy_${row}_${sprite.channel}`,
      kind: frame === "buddies" ? "select-buddy" : "read-message",
      event: "mouseUp",
      row,
      source: [release1MessengerSources.activateReceiver, release1MessengerSources.message]
    };
  }

  if (behaviorNames.includes("read messages") || behaviorNames.includes("nextmessage")) {
    return {
      id: `release1_messenger_read_message_${sprite.channel}`,
      kind: "read-message",
      event: "mouseUp",
      source: [release1MessengerSources.nextMessage, release1MessengerSources.message]
    };
  }

  return undefined;
}

function setRelease1MessengerOverlaySprites(
  movie: DirectorMovie,
  sprites: readonly DirectorSpriteChannelManifest[],
  area: Release1MessengerArea
): void {
  const [start, end] = release1MessengerChannelRange(area);
  movie.setProperty("windowOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isRelease1MessengerSprite(sprite)),
    ...sprites
  ]);
  movie.setProperty("directorOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isRelease1MessengerSprite(sprite)),
    ...sprites
  ]);
  movie.setProperty("release1MessengerChannels", { start, end });
}

function clearRelease1Messenger(movie: DirectorMovie): void {
  movie.setProperty("windowOverlaySprites", readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isRelease1MessengerSprite(sprite)));
  movie.setProperty("directorOverlaySprites", readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isRelease1MessengerSprite(sprite)));
  movie.setProperty("windowInteractiveElements", readInteractiveElements(movie.getProperty("windowInteractiveElements")).filter((element) => !isRelease1MessengerElement(element)));
  movie.setProperty("release1MessengerActions", []);
  movie.setProperty("release1MessengerVisualState", undefined);
  movie.setProperty("release1MessengerFaceIconState", undefined);
}

function recordedSpriteManifest(
  host: HabboV1MessengerRuntimeHost,
  sprite: RecordedSprite,
  frame: Release1MessengerFrame,
  release: string
): DirectorSpriteChannelManifest {
  const member = host.movie.cast.getMember(sprite.member);
  const fgColor = release1MessengerRecordedFgColor(member, sprite);
  const textColorSource = release1MessengerTextColorSource(member, sprite, fgColor);
  const dynamicFace = createRelease1MessengerFaceMember(host, member, frame, release);
  return {
    channel: sprite.channel,
    member: dynamicFace?.ref ?? sprite.member,
    loc: sprite.loc,
    locZ: sprite.locZ,
    ink: sprite.ink,
    blend: sprite.blend,
    width: sprite.width,
    height: sprite.height,
    ...(fgColor ? { fgColor } : {}),
    ...(sprite.bgColor ? { bgColor: sprite.bgColor } : {}),
    ...(textColorSource ? { textColorSource } : {})
  };
}

function release1MessengerRecordedFgColor(member: DirectorMember | undefined, sprite: RecordedSprite): string | undefined {
  if (isTextLikeMember(member) && sprite.fgColorRaw === "255") {
    return "#ffffff";
  }

  const rgb = rgbFromRecordedColor(sprite.fgColorRaw);
  return rgb ?? sprite.fgColor;
}

function release1MessengerTextColorSource(
  member: DirectorMember | undefined,
  sprite: RecordedSprite,
  fgColor: string | undefined
): "sprite" | undefined {
  if (!isTextLikeMember(member) || !fgColor) {
    return undefined;
  }

  if (member.name?.toLowerCase() === "messenger_title_e") {
    return undefined;
  }

  return "sprite";
}

function rgbFromRecordedColor(value: string | undefined): string | undefined {
  if (!value?.includes(",")) {
    return undefined;
  }

  const [red, green, blue] = value.split(",", 3).map((part) => Number.parseInt(part.trim(), 10));
  if (![red, green, blue].every((channel) => Number.isFinite(channel))) {
    return undefined;
  }

  return rgbToHex(red ?? 0, green ?? 0, blue ?? 0);
}

function createRelease1MessengerFaceMember(
  host: HabboV1MessengerRuntimeHost,
  sourceMember: DirectorMember | undefined,
  frame: Release1MessengerFrame,
  release: string
): { readonly ref: { readonly castLib: number; readonly member: number }; readonly member: DirectorMemberManifest } | undefined {
  const sourceName = sourceMember?.name?.toLowerCase();
  if (sourceName !== "face_icon" && sourceName !== "smallface_icon") {
    return undefined;
  }

  const small = sourceName === "smallface_icon";
  const parts = small ? ["hd", "fc", "hr"] : ["hd", "ey", "fc", "hr"];
  const figure = release1MessengerFigureForFrame(host, frame, release);
  if (!figure.hd) {
    return undefined;
  }

  const layers = createRelease1MessengerFaceLayers(host, figure, parts, small, release);
  if (layers.length === 0) {
    return undefined;
  }

  const bounds = sourceLayerBounds(layers);
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const memberName = `runtime.release1.messenger.${frame}.${sourceName}`;
  const existing = host.movie.cast.getMemberByName(memberName, messengerRuntimeCastSlot);
  const memberNumber = existing?.memberNumber ?? nextRelease1MessengerRuntimeMemberNumber(host.movie);
  const member: DirectorMemberManifest = {
    number: memberNumber,
    name: memberName,
    type: "bitmap",
    width,
    height,
    regPoint: { x: Math.round(width / 2), y: Math.round(height / 2) },
    composite: {
      width,
      height,
      layers: layers.map((layer) => ({
        assetPath: layer.assetPath,
        x: layer.x - bounds.left,
        y: layer.y - bounds.top,
        width: layer.width,
        height: layer.height,
        sourceWidth: layer.width,
        sourceHeight: layer.height,
        ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}),
        ...(layer.flipH ? { flipH: true } : {}),
        ...(layer.tint !== undefined ? { tint: layer.tint } : {}),
        ink: layer.ink
      }))
    }
  };
  importRelease1MessengerRuntimeMembers(host.movie, [member]);
  host.movie.setProperty("release1MessengerFaceIconState", {
    frame,
    memberName: sourceName,
    runtimeMemberName: member.name,
    parts,
    width,
    height,
    source: [
      release1MessengerSources.myWireFace,
      release1MessengerSources.wireFaceBehavior,
      release1MessengerSources.enterpriseConnection,
      release1MessengerSources.messageManager
    ]
  });
  return {
    ref: { castLib: messengerRuntimeCastSlot, member: memberNumber },
    member
  };
}

function release1MessengerFigureForFrame(
  host: HabboV1MessengerRuntimeHost,
  frame: Release1MessengerFrame,
  release: string
): Record<string, HabboFigurePartProps> {
  const figureHost = host as unknown as HabboFigureRuntimeHost;
  if (frame === "find") {
    return getMessengerSearchFigurePropsRuntime(figureHost) ?? getActiveUserFigurePropsRuntime(figureHost, release);
  }
  if (frame === "readmsg") {
    return getMessengerCurrentMessageFigurePropsRuntime(figureHost) ?? getActiveUserFigurePropsRuntime(figureHost, release);
  }
  return getActiveUserFigurePropsRuntime(figureHost, release);
}

function createRelease1MessengerFaceLayers(
  host: HabboV1MessengerRuntimeHost,
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  parts: readonly string[],
  small: boolean,
  release: string
): readonly HabboFigureSourceLayer[] {
  const figureHost = host as unknown as HabboFigureRuntimeHost;
  const prefix = small ? "sh" : "h";
  const head = figure.hd;
  if (!head) {
    return [];
  }

  const headMemberName = `${prefix}_std_hd_${head.model}_3_0`;
  const headAsset = figureHost.getBitmapAssetByMemberName(headMemberName, release1MessengerFacePreferredCasts(small));
  if (!headAsset) {
    host.recordUnsupportedOnce(`release1-messenger-face-head-missing:${headMemberName}`, {
      subsystem: "habbo",
      feature: "release1-messenger-face-head-missing",
      detail: `${release} MyWireFace requested base head member ${headMemberName}, but no decoded bitmap asset was found`,
      source: release1MessengerSources.myWireFace
    });
    return [];
  }

  const layers: HabboFigureSourceLayer[] = [];
  for (const part of parts) {
    const props = figure[part];
    if (!props) {
      continue;
    }

    const memberName = `${prefix}_std_${part}_${props.model}_3_0`;
    const asset = figureHost.getBitmapAssetByMemberName(memberName, release1MessengerFacePreferredCasts(small));
    if (!asset) {
      host.recordUnsupportedOnce(`release1-messenger-face-part-missing:${memberName}`, {
        subsystem: "habbo",
        feature: "release1-messenger-face-part-missing",
        detail: `${release} MyWireFace requested ${memberName} for ${sourceNameForMessengerFacePart(part)}, but no decoded bitmap asset was found`,
        source: release1MessengerSources.myWireFace
      });
      continue;
    }

    const ink = part === "ey" ? 36 : 8;
    layers.push({
      part,
      assetPath: asset.inkAssetPaths?.[ink === 36 ? "36" : "8"] ?? asset.pngPath,
      x: Math.round(headAsset.regPoint.x + 50 - asset.regPoint.x),
      y: Math.round(headAsset.regPoint.y + 50 - asset.regPoint.y),
      width: asset.width,
      height: asset.height,
      ink
    });
  }

  return layers;
}

function release1MessengerFacePreferredCasts(small: boolean): readonly string[] {
  return small ? ["s_people", "people"] : ["people", "s_people"];
}

function sourceNameForMessengerFacePart(part: string): string {
  switch (part) {
    case "hd":
      return "head";
    case "ey":
      return "eyes";
    case "fc":
      return "face";
    case "hr":
      return "hair";
    default:
      return part;
  }
}

function sourceLayerBounds(layers: readonly HabboFigureSourceLayer[]): { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } {
  return layers.reduce(
    (bounds, layer) => ({
      left: Math.min(bounds.left, layer.x),
      top: Math.min(bounds.top, layer.y),
      right: Math.max(bounds.right, layer.x + layer.width),
      bottom: Math.max(bounds.bottom, layer.y + layer.height)
    }),
    { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
  );
}

function nextRelease1MessengerRuntimeMemberNumber(movie: DirectorMovie): number {
  const existing = movie.cast.getCastLib(messengerRuntimeCastSlot)?.members ?? [];
  return existing.reduce((max, member) => Math.max(max, member.memberNumber), 0) + 1;
}

function importRelease1MessengerRuntimeMembers(movie: DirectorMovie, members: readonly DirectorMemberManifest[]): void {
  const existing = movie.cast.getCastLib(messengerRuntimeCastSlot)?.members
    .filter((member) => member.name?.startsWith("runtime.release1.messenger."))
    .map((member): DirectorMemberManifest => ({
      number: member.memberNumber,
      ...(member.name ? { name: member.name } : {}),
      type: member.type,
      ...(member.width !== undefined ? { width: member.width } : {}),
      ...(member.height !== undefined ? { height: member.height } : {}),
      ...(member.shapeType !== undefined ? { shapeType: member.shapeType } : {}),
      ...(member.shapeFillType !== undefined ? { shapeFillType: member.shapeFillType } : {}),
      ...(member.shapeLineThickness !== undefined ? { shapeLineThickness: member.shapeLineThickness } : {}),
      ...(member.color !== undefined ? { color: member.color } : {}),
      ...(member.backgroundColor !== undefined ? { backgroundColor: member.backgroundColor } : {}),
      ...(member.text !== undefined ? { text: member.text } : {}),
      ...(member.fontSize !== undefined ? { fontSize: member.fontSize } : {}),
      ...(member.fontFamily !== undefined ? { fontFamily: member.fontFamily } : {}),
      ...(member.fontWeight !== undefined ? { fontWeight: member.fontWeight } : {}),
      ...(member.fontStyle !== undefined ? { fontStyle: member.fontStyle } : {}),
      ...(member.underline ? { underline: member.underline } : {}),
      ...(member.textAlign !== undefined ? { textAlign: member.textAlign } : {}),
      ...(member.lineHeight !== undefined ? { lineHeight: member.lineHeight } : {}),
      ...(member.wordWrap ? { wordWrap: member.wordWrap } : {}),
      ...(member.textSpans.length > 0 ? { textSpans: [...member.textSpans] } : {}),
      ...(member.textScrollY ? { textScrollY: member.textScrollY } : {}),
      ...(member.editable ? { editable: member.editable } : {}),
      regPoint: member.regPoint,
      ...(member.assetPath ? { assetPath: member.assetPath } : {}),
      ...(Object.keys(member.inkAssetPaths).length > 0 ? { inkAssetPaths: { ...member.inkAssetPaths } } : {}),
      ...(member.composite ? { composite: {
        width: member.composite.width,
        height: member.composite.height,
        layers: member.composite.layers.map((layer) => ({ ...layer }))
      } } : {}),
      ...(member.borderColor !== undefined ? { borderColor: member.borderColor } : {}),
      ...(member.borderWidth !== undefined ? { borderWidth: member.borderWidth } : {}),
      ...(member.borderRadius !== undefined ? { borderRadius: member.borderRadius } : {})
    })) ?? [];
  const byNumber = new Map<number, DirectorMemberManifest>();
  for (const member of [...existing, ...members]) {
    byNumber.set(member.number, member);
  }
  movie.cast.importOrCreateCastLib({
    number: messengerRuntimeCastSlot,
    name: "runtime_release1_messenger",
    fileName: "runtime-release1-messenger",
    members: [...byNumber.values()].sort((left, right) => left.number - right.number)
  });
}

function release1MessengerArea(movie: DirectorMovie): Release1MessengerArea {
  return movie.getProperty("release1PrivateRoomMovieActive") === true || movie.getProperty("roomActive") === true ? "room" : "entry";
}

function release1MessengerStartChannel(area: Release1MessengerArea): number {
  return area === "room" ? messengerRoomStartChannel : messengerEntryStartChannel;
}

function release1MessengerChannelRange(area: Release1MessengerArea): readonly [number, number] {
  const start = release1MessengerStartChannel(area);
  return [start, start + messengerChannelCount - 1];
}

function readRelease1MessengerPlace(state: Readonly<Record<string, unknown>>): Release1MessengerPlace {
  const place = readRecord(state.place);
  const x = Number(place?.x);
  const y = Number(place?.y);
  return {
    x: Number.isFinite(x) ? Math.round(x) : messengerDefaultPlace.x,
    y: Number.isFinite(y) ? Math.round(y) : messengerDefaultPlace.y
  };
}

function clampRelease1MessengerPlace(movie: DirectorMovie, place: Release1MessengerPlace): Release1MessengerPlace {
  const maxX = Math.max(-20, movie.stage.width - 80);
  const maxY = Math.max(-20, movie.stage.height - 80);
  return {
    x: Math.max(-20, Math.min(maxX, place.x)),
    y: Math.max(-20, Math.min(maxY, place.y))
  };
}

function isRelease1MessengerSprite(sprite: DirectorSpriteChannelManifest): boolean {
  return (sprite.channel >= messengerEntryStartChannel && sprite.channel < messengerEntryStartChannel + messengerChannelCount)
    || (sprite.channel >= messengerRoomStartChannel && sprite.channel < messengerRoomStartChannel + messengerChannelCount);
}

function isRelease1MessengerElement(element: HabboWindowInteractiveElement): boolean {
  return element.id.startsWith("release1_messenger_") || element.windowId === messengerWindowId;
}

function normalizeRelease1MessengerFrame(value: string): Release1MessengerFrame {
  const normalized = value.trim().toLowerCase().replace(/\.recorded$/i, "");
  const aliased = messengerFrameAliases[normalized] ?? normalized;
  if (isRelease1MessengerFrame(aliased)) {
    return aliased;
  }
  return "main";
}

function isRelease1MessengerFrame(value: string): value is Release1MessengerFrame {
  return value === "main"
    || value === "buddies"
    || value === "find"
    || value === "buddy_requests"
    || value === "asktobuddy"
    || value === "buddyselected"
    || value === "buddydelete"
    || value === "edit_pmsg"
    || value === "help"
    || value === "readmsg"
    || value === "writemsg"
    || value === "msgsent"
    || value === "sms_account";
}

function release1EditableMessengerField(memberName: string): string | undefined {
  const normalized = memberName.toLowerCase();
  if (normalized === "messenger.search_user"
    || normalized === "messenger.my_persistent_message"
    || normalized === "messenger.message.new") {
    return memberName;
  }
  return undefined;
}

function release1MessengerFieldId(memberName: string): string {
  return `release1_messenger_field_${sanitizeElementId(memberName)}`;
}

function rowFromBuddyFrameSprite(channel: number): number {
  const row = ((channel % 10) % 4) + 1;
  return row < 1 || row > 4 ? 1 : row;
}

function currentRelease1UserName(movie: DirectorMovie): string {
  const userObject = readRecord(movie.getProperty("release1EntryUserObject"));
  const globals = readRecord(movie.getProperty("release1EntryGlobals"));
  const session = readRecord(movie.getProperty("session"));
  return String(userObject?.name ?? globals?.gMyName ?? session?.userName ?? session?.user_name ?? "");
}

function release1MessengerLocation(movie: DirectorMovie, location: string): string {
  const normalized = location.trim();
  if (!normalized || normalized.length < 2) {
    return release1FieldText(movie, "BuddyNotHere", "offline");
  }
  if (normalized === "ENTERPRISESERVER" || normalized === "Messenger") {
    return release1FieldText(movie, "BuddyEntry", "Hotel View");
  }
  if (normalized.startsWith("Floor1")) {
    return release1FieldText(movie, "BuddyPrivateRoom", "Private room");
  }
  return normalized;
}

function buddyByRenderedName(
  buddies: Readonly<Record<string, HabboMessengerBuddy>>,
  name: string
): HabboMessengerBuddy | undefined {
  return Object.values(buddies).find((buddy) => buddy.name === name);
}

function firstRenderedBuddyId(list: ReturnType<typeof readMessengerBuddyList>): readonly string[] {
  const name = list.render[0] ?? "";
  const buddy = name ? buddyByRenderedName(list.buddies, name) : undefined;
  return buddy ? [buddy.id] : [];
}

function readMessengerMessages(value: unknown): readonly HabboMessengerMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => readMessengerMessage(entry)).filter((entry): entry is HabboMessengerMessage => Boolean(entry));
}

function readRelease1MessengerRequestNames(movie: DirectorMovie): readonly string[] {
  const shared = readStringList(movie.getProperty("messengerBuddyRequests")).filter(Boolean);
  if (shared.length > 0) {
    return shared;
  }
  return readStringList(movie.getProperty("messengerRequests")).filter(Boolean);
}

function readStringList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function setRelease1MessengerRequestNames(host: HabboV1MessengerRuntimeHost, requests: readonly string[], release: string): void {
  setMessengerRequests(host, requests, release);
  host.movie.setProperty("messengerRequests", [...requests]);
}

function readRelease1MessengerActions(movie: DirectorMovie): readonly Release1MessengerAction[] {
  const actions = movie.getProperty("release1MessengerActions");
  return Array.isArray(actions) ? actions.filter(isRelease1MessengerAction) : [];
}

function isRelease1MessengerAction(value: unknown): value is Release1MessengerAction {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && typeof record.kind === "string"
    && (record.event === "mouseDown" || record.event === "mouseUp")
    && Array.isArray(record.source);
}

function setTextMemberByName(movie: DirectorMovie, memberName: string, text: string): void {
  for (const castLib of movie.cast.castLibs) {
    for (const member of castLib.members) {
      if (member.name?.toLowerCase() === memberName.toLowerCase() && isTextLikeMember(member)) {
        member.setText(text);
      }
    }
  }
}

function isTextLikeMember(member: DirectorMember | undefined): member is DirectorMember {
  return member?.type === "text" || member?.type === "field";
}

function readSpriteManifests(value: unknown): readonly DirectorSpriteChannelManifest[] {
  return Array.isArray(value) ? value.filter(isDirectorSpriteChannelManifest) : [];
}

function isDirectorSpriteChannelManifest(value: unknown): value is DirectorSpriteChannelManifest {
  const record = readRecord(value);
  return typeof record?.channel === "number";
}

function readInteractiveElements(value: unknown): readonly HabboWindowInteractiveElement[] {
  return Array.isArray(value) ? value.filter(isInteractiveElement) : [];
}

function isInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && typeof record.windowId === "string"
    && typeof record.kind === "string";
}
