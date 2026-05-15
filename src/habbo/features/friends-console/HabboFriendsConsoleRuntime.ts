import type {
  DirectorBitmapCompositeLayer,
  DirectorMemberManifest,
  UnsupportedFeature
} from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import {
  directorFontFamily,
  normalizeSymbolKey,
  sanitizeDirectorSingleLineInput
} from "../../HabboSourceValueHelpers";
import type {
  HabboWindowElementActivation,
  HabboWindowRecord
} from "../../window/HabboWindowTypes";
import {
  HABBO_MESSENGER_COMPOSE_LAYOUT,
  HABBO_MESSENGER_FALLBACK_TITLE,
  HABBO_MESSENGER_FIND_LAYOUT,
  HABBO_MESSENGER_FRIENDS_LAYOUT,
  HABBO_MESSENGER_GET_MESSAGE_LAYOUT,
  HABBO_MESSENGER_GET_REQUEST_LAYOUT,
  HABBO_MESSENGER_MAIN_HELP_LAYOUT,
  HABBO_MESSENGER_MY_INFO_LAYOUT,
  HABBO_MESSENGER_REMOVE_FRIEND_LAYOUT,
  HABBO_MESSENGER_SENT_REQUEST_LAYOUT,
  HABBO_MESSENGER_SOURCE,
  HABBO_MESSENGER_TEMPLATE,
  HABBO_MESSENGER_TITLE_KEY,
  resolveMessengerAction
} from "../../ui/HabboMessengerConsole";
import {
  mergeMessengerBuddyLists,
  parseMessengerBuddyListPacket,
  parseMessengerBuddyRequestsPacket,
  parseMessengerMemberInfoPacket,
  parseMessengerMessagePacket,
  parseMessengerNoSuchUserName,
  readMessengerBuddyList,
  readMessengerMessage,
  readMessengerRequests,
  readMessengerSearchResult,
  type HabboMessengerBuddy,
  type HabboMessengerBuddyList,
  type HabboMessengerMessage,
  type HabboMessengerRequest,
  type HabboMessengerSearchResult
} from "./HabboFriendsConsolePackets";

export interface HabboFriendsConsoleRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;
  nextMessengerRequestId: number;

  getText(key: string): string | undefined;
  ensureThreadModuleObject(id: string, thread: string, kind: string, className: string, release: string): void;
  resolveSourceWindowPosition(
    layoutName: string,
    templateName: string | undefined,
    fallback: { readonly x: number; readonly y: number }
  ): { readonly x: number; readonly y: number };
  createWindow(title: string, template: string | undefined, x: number, y: number): HabboWindowRecord;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  mergeWindowLayout(window: HabboWindowRecord, layoutName: string): void;
  removeWindow(title: string): boolean;
  hideWindowElement(window: HabboWindowRecord, elementId: string): void;
  showWindowElement(window: HabboWindowRecord, elementId: string): void;
  getWindowScrollOffset(window: HabboWindowRecord, elementId: string): number;
  setWindowScrollOffset(window: HabboWindowRecord, elementId: string, offset: number): void;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  updateEntryBar(release: string): boolean;
  convertSpecialChars(value: string, mode: number): string;
  executeMessage(message: string, argument: unknown, release: string): unknown;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function showHideMessenger(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const title = host.getText(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE;
  ensureMessengerObjects(host, release);
  return host.windows.has(normalizeSymbolKey(title))
    ? hideMessenger(host, release)
    : showMessenger(host, release);
}

export function showMessenger(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  ensureMessengerObjects(host, release);
  return changeMessengerWindowView(host, HABBO_MESSENGER_MY_INFO_LAYOUT, release);
}

export function changeMessengerWindowView(host: HabboFriendsConsoleRuntimeHost, windowName: string, release: string): boolean {
  ensureMessengerObjects(host, release);
  const normalizedWindowName = windowName.endsWith(".window") ? windowName : `${windowName}.window`;
  const title = host.getText(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE;
  let window = host.windows.get(normalizeSymbolKey(title));
  const messengerInterface = host.objectManager.getObject("#messenger_interface");
  const previousOpenWindow = String(messengerInterface?.get("openWindow") ?? "");
  if (!window) {
    const position = host.resolveSourceWindowPosition(normalizedWindowName, HABBO_MESSENGER_TEMPLATE, { x: 255, y: 75 });
    window = host.createWindow(title, HABBO_MESSENGER_TEMPLATE, position.x, position.y);
    host.registerWindowClient(window, "#messenger_interface");
    host.registerWindowProcedure(window, "#eventProcMessenger", "#messenger_interface", "#mouseUp");
    host.registerWindowProcedure(window, "#eventProcMessenger", "#messenger_interface", "#mouseDown");
    host.registerWindowProcedure(window, "#eventProcMessenger", "#messenger_interface", "#keyDown");
  } else if (previousOpenWindow === HABBO_MESSENGER_MY_INFO_LAYOUT && previousOpenWindow !== normalizedWindowName) {
    persistMessengerMissionField(host, release);
  }

  host.mergeWindowLayout(window, normalizedWindowName);
  messengerInterface?.set("lastOpenWindow", previousOpenWindow);
  messengerInterface?.set("openWindow", normalizedWindowName);
  host.movie.setProperty("messengerVisible", true);
  host.movie.setProperty("messengerOpenWindow", normalizedWindowName);
  applyMessengerWindowState(host, normalizedWindowName, release);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("messenger", "ok", `view=${normalizedWindowName}`);
  return true;
}

export function hideMessenger(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  ensureMessengerObjects(host, release);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_MY_INFO_LAYOUT) {
    persistMessengerMissionField(host, release);
  }
  const title = host.getText(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE;
  const removed = host.removeWindow(title);
  host.objectManager.getObject("#messenger_interface")?.set("openWindow", "");
  host.movie.setProperty("messengerVisible", false);
  host.movie.setProperty("messengerOpenWindow", "");
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("messenger", "info", `hide removed=${removed}`);
  return true;
}

export function persistMessengerMissionField(host: HabboFriendsConsoleRuntimeHost, release: string): void {
  const mission = (host.windowTextValues.get("console_myinfo_mission_field") ?? "").split(/\r?\n|\r/)[0] ?? "";
  const current = String(host.movie.getProperty("messengerPersistentMessage") ?? "");
  if (mission === current) {
    return;
  }

  host.movie.setProperty("messengerPersistentMessage", mission);
  host.objectManager.getObject("#messenger_component")?.set("persistentMessage", mission);
  queueMessengerRequest(host, {
    command: "MESSENGER_ASSIGNPERSMSG",
    body: host.convertSpecialChars(mission, 1)
  }, release);
}

export function getMessengerCounts(host: HabboFriendsConsoleRuntimeHost): { readonly messages: number; readonly requests: number } {
  return {
    messages: getMessengerMessages(host).length,
    requests: getMessengerRequests(host).length
  };
}

export function getMessengerBuddyList(host: HabboFriendsConsoleRuntimeHost): HabboMessengerBuddyList {
  return readMessengerBuddyList(host.movie.getProperty("messengerBuddyList"));
}

export function setMessengerBuddyList(host: HabboFriendsConsoleRuntimeHost, list: HabboMessengerBuddyList): void {
  host.objectManager.getObject("#messenger_component")?.set("buddyList", list);
  host.movie.setProperty("messengerBuddyList", list);
}

export function getMessengerRequests(host: HabboFriendsConsoleRuntimeHost): readonly string[] {
  const value = host.movie.getProperty("messengerBuddyRequests");
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

export function setMessengerRequests(host: HabboFriendsConsoleRuntimeHost, requests: readonly string[], release: string): void {
  const unique = [...new Set(requests.map((entry) => String(entry)).filter(Boolean))];
  host.objectManager.getObject("#messenger_component")?.set("newBuddyRequest", unique);
  host.movie.setProperty("messengerBuddyRequests", unique);
  updateMessengerCounts(host, release);
}

export function getMessengerMessages(host: HabboFriendsConsoleRuntimeHost): readonly HabboMessengerMessage[] {
  const value = host.movie.getProperty("messengerMessages");
  return Array.isArray(value) ? value.map(readMessengerMessage).filter((entry): entry is HabboMessengerMessage => entry !== undefined) : [];
}

export function setMessengerMessages(host: HabboFriendsConsoleRuntimeHost, messages: readonly HabboMessengerMessage[], release: string): void {
  host.objectManager.getObject("#messenger_component")?.set("messages", messages);
  host.movie.setProperty("messengerMessages", [...messages]);
  updateMessengerCounts(host, release);
}

export function updateMessengerCounts(host: HabboFriendsConsoleRuntimeHost, release: string): void {
  const counts = getMessengerCounts(host);
  host.objectManager.getObject("#entry_interface")?.set("newMsgCount", counts.messages);
  host.objectManager.getObject("#entry_interface")?.set("newBuddyRequests", counts.requests);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_MY_INFO_LAYOUT) {
    host.windowTextValues.set("console_myinfo_messages_link", `${counts.messages} ${host.getText("console_newmessages") ?? "new message(s)"}`);
    host.windowTextValues.set("console_myinfo_requests_link", `${counts.requests} ${host.getText("console_requests") ?? "Friend Request(s)"}`);
  }
  if (host.movie.getProperty("entryBarVisible") === true) {
    host.updateEntryBar(release);
  }
}

export function getSelectedMessengerBuddyNames(host: HabboFriendsConsoleRuntimeHost): readonly string[] {
  const value = host.movie.getProperty("messengerSelectedBuddies");
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

export function getSelectedMessengerBuddy(host: HabboFriendsConsoleRuntimeHost): HabboMessengerBuddy | undefined {
  const [selectedName] = getSelectedMessengerBuddyNames(host);
  if (!selectedName) {
    return undefined;
  }

  const list = getMessengerBuddyList(host);
  return Object.values(list.buddies).find((buddy) => buddy.name === selectedName || buddy.id === selectedName);
}

export function createMessengerFriendListMember(
  host: HabboFriendsConsoleRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const buddyList = getMessengerBuddyList(host);
  const rowHeight = 40;
  const sourceHeight = Math.max(geometry.height, Math.max(1, buddyList.render.length) * rowHeight);
  const offset = Math.max(0, Math.min(sourceHeight - geometry.height, host.getWindowScrollOffset(window, elementId)));
  if (offset !== host.getWindowScrollOffset(window, elementId)) {
    host.setWindowScrollOffset(window, elementId, offset);
  }

  const layers: DirectorBitmapCompositeLayer[] = [{
    fillColor: "#303030",
    x: 0,
    y: 0,
    width: geometry.width,
    height: geometry.height
  }];
  for (let y = 1; y < geometry.height; y += 2) {
    layers.push({
      fillColor: "#444444",
      x: 0,
      y,
      width: geometry.width,
      height: 1
    });
  }

  if (buddyList.render.length === 0) {
    layers.push({
      text: host.windowTextValues.get(elementId) ?? host.getText("console_youdonthavebuddies") ?? "You don't have any friends.",
      color: "#eeeeee",
      fontFamily: directorFontFamily("Volter (Goldfish)"),
      fontSize: 9,
      lineHeight: 11,
      x: 6,
      y: 5,
      width: Math.max(1, geometry.width - 12),
      height: Math.max(10, geometry.height - 4)
    });
  } else {
    const first = Math.max(0, Math.floor(offset / rowHeight));
    const last = Math.min(buddyList.render.length, first + Math.ceil(geometry.height / rowHeight) + 2);
    for (let index = first; index < last; index++) {
      const name = buddyList.render[index];
      const buddy = Object.values(buddyList.buddies).find((entry) => entry.name === name);
      if (!buddy) {
        continue;
      }

      const y = (index * rowHeight) - offset;
      const selected = getSelectedMessengerBuddyNames(host).includes(buddy.name);
      layers.push({
        fillColor: selected ? "#4d4d4d" : "#303030",
        x: 0,
        y,
        width: geometry.width,
        height: rowHeight - 1
      });
      for (let lineY = y + 1; lineY < y + rowHeight - 1; lineY += 2) {
        layers.push({
          fillColor: "#444444",
          x: 0,
          y: lineY,
          width: geometry.width,
          height: 1
        });
      }
      layers.push({
        text: buddy.name,
        color: "#eeeeee",
        fontFamily: directorFontFamily("VB"),
        fontWeight: "700",
        fontSize: 9,
        lineHeight: 10,
        x: 6,
        y: y + 4,
        width: Math.max(1, geometry.width - 12),
        height: 10
      });
      layers.push({
        text: `${buddy.online ? formatMessengerLocation(host, buddy.unit) : host.getText("console_offline") ?? "Offline"}\r${buddy.msg}`,
        color: "#eeeeee",
        fontFamily: directorFontFamily("Volter (Goldfish)"),
        fontSize: 9,
        lineHeight: 10,
        x: 6,
        y: y + 16,
        width: Math.max(1, geometry.width - 12),
        height: 21
      });
    }
  }

  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers
    }
  };
}

export function createMessengerMessageTextMember(
  host: HabboFriendsConsoleRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "text",
    width: geometry.width,
    height: geometry.height,
    text: host.windowTextValues.get(elementId) ?? "",
    color: "#000000",
    backgroundColor: "#ffffff",
    fontSize: 9,
    fontFamily: directorFontFamily("Volter (Goldfish)"),
    lineHeight: 11,
    wordWrap: true,
    textAlign: "left"
  };
}

export function queueMessengerRequest(
  host: HabboFriendsConsoleRuntimeHost,
  request: Omit<HabboMessengerRequest, "id" | "status">,
  release: string
): void {
  const queued = readMessengerRequests(host.movie.getProperty("pendingMessengerRequests"));
  const nextRequest: HabboMessengerRequest = {
    id: host.nextMessengerRequestId++,
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingMessengerRequests", [...queued, nextRequest]);
  host.movie.setProperty("lastMessengerRequest", nextRequest);
  host.logDebug("messenger", "info", `queued ${nextRequest.command}${nextRequest.name ? ` name=${nextRequest.name}` : ""}`, {
    request: nextRequest,
    release
  });
}

export function handleMessengerReadyPacket(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  ensureMessengerObjects(host, release);
  host.objectManager.getObject("#messenger_component")?.set("readyFlag", 1);
  host.movie.setProperty("messengerReady", true);
  host.executeMessage("#messenger_ready", undefined, release);
  host.logDebug("messenger", "ok", "MESSENGERREADY");
  return true;
}

export function handleMessengerPersistentMessagePacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  ensureMessengerObjects(host, release);
  const message = body.split(/\r?\n|\r/)[0] ?? "";
  host.movie.setProperty("messengerPersistentMessage", message);
  host.objectManager.getObject("#messenger_component")?.set("persistentMessage", message);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_MY_INFO_LAYOUT) {
    host.windowTextValues.set("console_myinfo_mission_field", message);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "info", "MYPERSISTENTMSG");
  return true;
}

export function handleMessengerBuddyListPacket(
  host: HabboFriendsConsoleRuntimeHost,
  packetName: string,
  body: string,
  release: string
): boolean {
  ensureMessengerObjects(host, release);
  const parsed = parseMessengerBuddyListPacket(body);
  if (packetName === "BUDDYLIST_UPDATE" && parsed.render.length === 0) {
    host.logDebug("messenger", "info", "BUDDYLIST_UPDATE empty");
    return true;
  }

  const next = packetName === "BUDDYLIST_UPDATE"
    ? mergeMessengerBuddyLists(getMessengerBuddyList(host), parsed)
    : parsed;
  setMessengerBuddyList(host, next);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_FRIENDS_LAYOUT) {
    updateMessengerFriendsFields(host);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "ok", `${packetName} buddies=${next.render.length}`);
  return true;
}

export function handleMessengerBuddyRequestsPacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  ensureMessengerObjects(host, release);
  const requests = parseMessengerBuddyRequestsPacket(body);
  setMessengerRequests(host, requests, release);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_MY_INFO_LAYOUT) {
    updateMessengerMyInfoFields(host, release);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "ok", `BUDDYADDREQUESTS count=${requests.length}`);
  return true;
}

export function handleMessengerMessagePacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  ensureMessengerObjects(host, release);
  const message = parseMessengerMessagePacket(body);
  if (!message) {
    return false;
  }

  setMessengerMessages(host, [...getMessengerMessages(host), message], release);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_MY_INFO_LAYOUT) {
    updateMessengerMyInfoFields(host, release);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "ok", `MESSENGER_MSG id=${message.id} sender=${message.senderID}`);
  return true;
}

export function handleMessengerRemoveBuddyPacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  const id = body.trim();
  if (!id) {
    return true;
  }

  const current = getMessengerBuddyList(host);
  const buddy = current.buddies[id];
  if (!buddy) {
    return true;
  }

  const buddies = { ...current.buddies };
  delete buddies[id];
  setMessengerBuddyList(host, {
    buddies,
    online: current.online.filter((name) => name !== buddy.name),
    offline: current.offline.filter((name) => name !== buddy.name),
    render: current.render.filter((name) => name !== buddy.name)
  });
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_FRIENDS_LAYOUT) {
    updateMessengerFriendsFields(host);
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "ok", `REMOVE_BUDDY id=${id}`);
  return true;
}

export function handleMessengerMemberInfoPacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  ensureMessengerObjects(host, release);
  const result = parseMessengerMemberInfoPacket(body, String(host.movie.getProperty("messengerLastSearchQuery") ?? ""));
  if (!result) {
    return false;
  }

  host.movie.setProperty("messengerLastSearch", result);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_FIND_LAYOUT) {
    updateMessengerFindFields(host);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "ok", `MEMBERINFO name=${result.name}`);
  return true;
}

export function handleMessengerUserNotFoundPacket(host: HabboFriendsConsoleRuntimeHost, body: string, release: string): boolean {
  const name = parseMessengerNoSuchUserName(body) || String(host.movie.getProperty("messengerLastSearchQuery") ?? "");
  host.movie.setProperty("messengerLastSearch", {
    name,
    customText: "",
    lastAccess: "",
    location: "",
    figureData: "",
    sex: "M",
    found: false
  } satisfies HabboMessengerSearchResult);
  if (host.movie.getProperty("messengerOpenWindow") === HABBO_MESSENGER_FIND_LAYOUT) {
    updateMessengerFindFields(host);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("messenger", "info", `NOSUCHUSER name=${name}`);
  return true;
}

export function isMessengerUserLookupBody(host: HabboFriendsConsoleRuntimeHost, body: string): boolean {
  const first = body.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  return first === "MESSENGER" || host.movie.getProperty("messengerLastSearchQuery") !== undefined;
}

export function isMessengerMemberInfoBody(host: HabboFriendsConsoleRuntimeHost, body: string): boolean {
  const first = body.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  return first === "MESSENGER" || host.movie.getProperty("messengerLastSearchQuery") !== undefined;
}

export function activateMessengerElement(
  host: HabboFriendsConsoleRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const action = activation?.event
    ? resolveMessengerAction(elementId, activation.event)
    : resolveMessengerAction(elementId, "mouseDown")
      ?? resolveMessengerAction(elementId, "mouseUp")
      ?? resolveMessengerAction(elementId, "keyDown");
  if (!action) {
    if (
      activation?.event
      && (
        resolveMessengerAction(elementId, "mouseDown")
        || resolveMessengerAction(elementId, "mouseUp")
        || resolveMessengerAction(elementId, "keyDown")
      )
    ) {
      return false;
    }

    host.recordUnsupportedOnce(`messenger-element-unhandled:${elementId}`, {
      subsystem: "lingo",
      feature: "messenger-element-unhandled",
      detail: `${release} Messenger Interface Class eventProcMessenger received ${elementId}; this console action is not translated yet`,
      source: HABBO_MESSENGER_SOURCE
    });
    host.logDebug("messenger", "warn", `unhandled element=${elementId}`);
    return false;
  }

  switch (action.kind) {
    case "view":
      return changeMessengerWindowView(host, action.layout, release);
    case "messages-link": {
      const message = getMessengerMessages(host)[0];
      return message ? renderMessengerMessage(host, message, release) : true;
    }
    case "requests-link":
      return getMessengerRequests(host).length > 0
        ? changeMessengerWindowView(host, HABBO_MESSENGER_GET_REQUEST_LAYOUT, release)
        : true;
    case "friend-list":
      return selectMessengerBuddyFromPoint(host, release, activation);
    case "search":
      return sendMessengerFindUser(host, release);
    case "start-friend-request":
      return startMessengerFriendRequest(host, release);
    case "confirm-friend-request":
      return confirmMessengerFriendRequest(host, release);
    case "accept-request":
      return acceptMessengerBuddyRequest(host, release);
    case "decline-request":
      return declineMessengerBuddyRequest(host, release);
    case "compose":
      return openMessengerCompose(host, release);
    case "send-message":
      return sendMessengerMessage(host, release);
    case "cancel-compose":
      return changeMessengerWindowView(host, HABBO_MESSENGER_FRIENDS_LAYOUT, release);
    case "remove-friend":
      return getSelectedMessengerBuddy(host)
        ? changeMessengerWindowView(host, HABBO_MESSENGER_REMOVE_FRIEND_LAYOUT, release)
        : true;
    case "confirm-remove-friend":
      return confirmMessengerRemoveFriend(host, release);
    case "cancel-remove-friend":
      return changeMessengerWindowView(host, HABBO_MESSENGER_FRIENDS_LAYOUT, release);
    case "reply-message":
      return replyMessengerMessage(host, release);
    case "next-message":
      return nextMessengerMessage(host, release);
    case "message-mode":
      host.movie.setProperty("messengerComposeMode", action.mode);
      return true;
    case "record":
      host.movie.setProperty("lastMessengerRecordedAction", {
        reason: action.reason,
        source: HABBO_MESSENGER_SOURCE
      });
      return true;
    default:
      return false;
  }
}

export function ensureMessengerObjects(host: HabboFriendsConsoleRuntimeHost, release: string): void {
  host.ensureThreadModuleObject("#messenger_interface", "#messenger", "interface", "Messenger Interface Class", release);
  host.ensureThreadModuleObject("#messenger_component", "#messenger", "component", "Messenger Component Class", release);
  host.ensureThreadModuleObject("#messenger_handler", "#messenger", "handler", "Messenger Handler Class", release);
}

function applyMessengerWindowState(host: HabboFriendsConsoleRuntimeHost, windowName: string, release: string): void {
  switch (windowName) {
    case HABBO_MESSENGER_MY_INFO_LAYOUT:
      updateMessengerMyInfoFields(host, release);
      break;
    case HABBO_MESSENGER_FRIENDS_LAYOUT:
      updateMessengerFriendsFields(host);
      break;
    case HABBO_MESSENGER_FIND_LAYOUT:
      updateMessengerFindFields(host);
      break;
    case HABBO_MESSENGER_GET_REQUEST_LAYOUT:
      updateMessengerRequestFields(host);
      break;
    case HABBO_MESSENGER_GET_MESSAGE_LAYOUT:
      updateMessengerMessageFields(host);
      break;
    case HABBO_MESSENGER_COMPOSE_LAYOUT:
      updateMessengerComposeFields(host);
      break;
    case HABBO_MESSENGER_SENT_REQUEST_LAYOUT:
      updateMessengerSentRequestFields(host);
      break;
    case HABBO_MESSENGER_REMOVE_FRIEND_LAYOUT:
      updateMessengerRemoveFriendFields(host);
      break;
    case HABBO_MESSENGER_MAIN_HELP_LAYOUT:
      host.movie.setProperty("lastMessengerHelpView", "main");
      break;
  }
}

function updateMessengerMyInfoFields(host: HabboFriendsConsoleRuntimeHost, release: string): void {
  const session = host.objectManager.getObject("#session");
  const name = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  const sessionMission = stringFromSession(session, "user_customData");
  const persistentMessage = String(host.movie.getProperty("messengerPersistentMessage") ?? sessionMission);
  const counts = getMessengerCounts(host);
  host.windowTextValues.set("console_myinfo_name", name);
  host.windowTextValues.set("console_myinfo_mission_field", persistentMessage);
  host.windowTextValues.set("console_myinfo_messages_link", `${counts.messages} ${host.getText("console_newmessages") ?? "new message(s)"}`);
  host.windowTextValues.set("console_myinfo_requests_link", `${counts.requests} ${host.getText("console_requests") ?? "Friend Request(s)"}`);
  host.movie.setProperty("messengerMyHeadPreview", {
    source: HABBO_MESSENGER_SOURCE,
    elementId: "console_myhead_image",
    figure: stringFromSession(session, "user_figureRaw") || "session-figure",
    direction: 3,
    release
  });
}

function updateMessengerFriendsFields(host: HabboFriendsConsoleRuntimeHost): void {
  const buddyList = getMessengerBuddyList(host);
  host.movie.setProperty("messengerFriendList", buddyList);
  if (buddyList.render.length === 0) {
    host.windowTextValues.set("console_friends_friendlist", host.getText("console_youdonthavebuddies") ?? "You don't have any friends.");
  } else {
    host.windowTextValues.delete("console_friends_friendlist");
  }
}

function updateMessengerFindFields(host: HabboFriendsConsoleRuntimeHost): void {
  const title = host.getText(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE;
  const window = host.windows.get(normalizeSymbolKey(title));
  const showSearchResultIcon = (visible: boolean): void => {
    if (!window) {
      return;
    }

    if (visible) {
      host.showWindowElement(window, "console_magnifier");
    } else {
      host.hideWindowElement(window, "console_magnifier");
    }
  };
  const lastSearch = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  if (!lastSearch) {
    showSearchResultIcon(false);
    host.windowTextValues.set("console_search_habbo_name_text", "");
    host.windowTextValues.set("console_search_habbo_mission_text", "");
    host.windowTextValues.set("console_search_habbo_lasthere_text", "");
    host.windowTextValues.set("console_search_habbo_online_text", "");
    return;
  }

  if (!lastSearch.found) {
    showSearchResultIcon(false);
    host.windowTextValues.set("console_search_habbo_name_text", host.getText("console_usersnotfound") ?? "Users not found");
    host.windowTextValues.set("console_search_habbo_mission_text", "");
    host.windowTextValues.set("console_search_habbo_lasthere_text", "");
    host.windowTextValues.set("console_search_habbo_online_text", "");
    return;
  }

  showSearchResultIcon(true);
  host.windowTextValues.set("console_search_habbo_name_text", lastSearch.name);
  host.windowTextValues.set("console_search_habbo_mission_text", lastSearch.customText);
  host.windowTextValues.set("console_search_habbo_lasthere_text", lastSearch.lastAccess);
  host.windowTextValues.set("console_search_habbo_online_text", formatMessengerLocation(host, lastSearch.location));
}

function updateMessengerRequestFields(host: HabboFriendsConsoleRuntimeHost): void {
  const requestName = getMessengerRequests(host)[0] ?? "";
  host.windowTextValues.set("console_getrequest_habbo_name_text", requestName);
}

function updateMessengerSentRequestFields(host: HabboFriendsConsoleRuntimeHost): void {
  const lastSearch = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  host.windowTextValues.set("console_request_habbo_name_text", lastSearch?.name ?? "");
}

function updateMessengerRemoveFriendFields(host: HabboFriendsConsoleRuntimeHost): void {
  const buddy = getSelectedMessengerBuddy(host);
  host.windowTextValues.set("console_removefriend_name", buddy?.name ?? "");
}

function updateMessengerComposeFields(host: HabboFriendsConsoleRuntimeHost): void {
  const selected = getSelectedMessengerBuddyNames(host);
  host.windowTextValues.set("console_compose_recipients", selected.join(", "));
  host.windowTextValues.set("console_compose_lenght_text", "0/255");
  if (!host.windowTextValues.has("console_compose_message_field")) {
    host.windowTextValues.set("console_compose_message_field", "");
  }
}

function updateMessengerMessageFields(host: HabboFriendsConsoleRuntimeHost): void {
  const message = getMessengerMessages(host)[0];
  if (!message) {
    host.windowTextValues.set("console_getmessage_sender", "");
    host.windowTextValues.set("console_getmessage_field", "");
    return;
  }

  const buddy = getMessengerBuddyList(host).buddies[message.senderID];
  const senderName = buddy?.name ?? message.senderID;
  host.windowTextValues.set("console_getmessage_sender", `${host.getText("console_getmessage_sender") ?? "From:"} ${senderName}\r${message.time}`);
  host.windowTextValues.set("console_getmessage_field", message.message);
  host.movie.setProperty("messengerCurrentMessage", message);
}

export function formatMessengerLocation(host: HabboFriendsConsoleRuntimeHost, location: string): string {
  const normalizedLocation = location.trim();
  const normalizedLower = normalizedLocation.toLowerCase();
  if (normalizedLocation.length < 3) {
    return host.getText("console_offline") ?? "Offline";
  }
  if (normalizedLocation.includes("Floor1")) {
    return `${host.getText("console_online") ?? "Online:"} ${host.getText("console_inprivateroom") ?? "In private room"}`;
  }
  if (normalizedLower.includes("messenger")
    || normalizedLower.includes("hotel view")
    || normalizedLower === "enterpriseserver") {
    return `${host.getText("console_online") ?? "Online:"} ${host.getText("console_onfrontpage") ?? "(On front page)"}`;
  }
  return normalizedLocation;
}

function selectMessengerBuddyFromPoint(
  host: HabboFriendsConsoleRuntimeHost,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const list = getMessengerBuddyList(host);
  if (list.render.length === 0) {
    return true;
  }

  const rowHeight = 40;
  const title = host.getText(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE;
  const window = host.windows.get(normalizeSymbolKey(title));
  const offset = window ? host.getWindowScrollOffset(window, "console_friends_friendlist") : 0;
  const localY = Math.max(0, Math.round(activation?.localY ?? 0));
  const index = Math.max(0, Math.min(list.render.length - 1, Math.floor((localY + offset) / rowHeight)));
  const name = list.render[index];
  if (!name) {
    return true;
  }

  host.movie.setProperty("messengerSelectedBuddies", [name]);
  host.movie.setProperty("lastMessengerSelectedBuddy", name);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function sendMessengerFindUser(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const name = sanitizeDirectorSingleLineInput(String(host.windowTextValues.get("console_search_key_field") ?? "")).trim();
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
  host.windowTextValues.set("console_search_key_field", "");
  host.windowTextValues.set("console_search_habbo_name_text", host.getText("console_searching") ?? "");
  host.windowTextValues.set("console_search_habbo_mission_text", "");
  host.windowTextValues.set("console_search_habbo_lasthere_text", "");
  host.windowTextValues.set("console_search_habbo_online_text", "");
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

function startMessengerFriendRequest(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const lastSearch = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  if (!lastSearch?.found || !lastSearch.name) {
    return true;
  }

  return changeMessengerWindowView(host, HABBO_MESSENGER_SENT_REQUEST_LAYOUT, release);
}

function confirmMessengerFriendRequest(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const lastSearch = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  if (!lastSearch?.found || !lastSearch.name) {
    return changeMessengerWindowView(host, HABBO_MESSENGER_FIND_LAYOUT, release);
  }

  queueMessengerRequest(host, {
    command: "MESSENGER_REQUESTBUDDY",
    name: lastSearch.name,
    body: lastSearch.name
  }, release);
  return changeMessengerWindowView(host, HABBO_MESSENGER_FIND_LAYOUT, release);
}

function acceptMessengerBuddyRequest(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const [name, ...remaining] = getMessengerRequests(host);
  if (!name) {
    return changeMessengerWindowView(host, HABBO_MESSENGER_MY_INFO_LAYOUT, release);
  }

  queueMessengerRequest(host, { command: "MESSENGER_ACCEPTBUDDY", name, body: name }, release);
  setMessengerRequests(host, remaining, release);
  return remaining.length > 0
    ? changeMessengerWindowView(host, HABBO_MESSENGER_GET_REQUEST_LAYOUT, release)
    : changeMessengerWindowView(host, HABBO_MESSENGER_MY_INFO_LAYOUT, release);
}

function declineMessengerBuddyRequest(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const [name, ...remaining] = getMessengerRequests(host);
  if (name) {
    queueMessengerRequest(host, { command: "MESSENGER_DECLINEBUDDY", name, body: name }, release);
  }
  setMessengerRequests(host, remaining, release);
  return remaining.length > 0
    ? changeMessengerWindowView(host, HABBO_MESSENGER_GET_REQUEST_LAYOUT, release)
    : changeMessengerWindowView(host, HABBO_MESSENGER_MY_INFO_LAYOUT, release);
}

function openMessengerCompose(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  if (getSelectedMessengerBuddyNames(host).length === 0) {
    const first = getMessengerBuddyList(host).render[0];
    if (first) {
      host.movie.setProperty("messengerSelectedBuddies", [first]);
    }
  }
  return changeMessengerWindowView(host, HABBO_MESSENGER_COMPOSE_LAYOUT, release);
}

function sendMessengerMessage(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const receivers = getSelectedMessengerBuddyNames(host);
  const message = String(host.windowTextValues.get("console_compose_message_field") ?? "").trim();
  if (receivers.length === 0 || !message) {
    return true;
  }

  const command = host.movie.getProperty("messengerComposeMode") === "email" ? "MESSENGER_SENDEMAILMSG" : "MESSENGER_SENDMSG";
  queueMessengerRequest(host, {
    command,
    receivers,
    message,
    body: `${receivers.join(",")}\r${host.convertSpecialChars(message, 1)}`
  }, release);
  host.windowTextValues.set("console_compose_message_field", "");
  return changeMessengerWindowView(host, HABBO_MESSENGER_FRIENDS_LAYOUT, release);
}

function confirmMessengerRemoveFriend(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const buddy = getSelectedMessengerBuddy(host);
  if (!buddy) {
    return changeMessengerWindowView(host, HABBO_MESSENGER_FRIENDS_LAYOUT, release);
  }

  queueMessengerRequest(host, { command: "MESSENGER_REMOVEBUDDY", name: buddy.name, body: buddy.name }, release);
  const current = getMessengerBuddyList(host);
  const buddies = { ...current.buddies };
  delete buddies[buddy.id];
  const nextList: HabboMessengerBuddyList = {
    buddies,
    online: current.online.filter((name) => name !== buddy.name),
    offline: current.offline.filter((name) => name !== buddy.name),
    render: current.render.filter((name) => name !== buddy.name)
  };
  setMessengerBuddyList(host, nextList);
  host.movie.setProperty("messengerSelectedBuddies", []);
  return changeMessengerWindowView(host, HABBO_MESSENGER_FRIENDS_LAYOUT, release);
}

function renderMessengerMessage(host: HabboFriendsConsoleRuntimeHost, message: HabboMessengerMessage, release: string): boolean {
  host.movie.setProperty("messengerCurrentMessage", message);
  return changeMessengerWindowView(host, HABBO_MESSENGER_GET_MESSAGE_LAYOUT, release);
}

function replyMessengerMessage(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const current = readMessengerMessage(host.movie.getProperty("messengerCurrentMessage"));
  if (current) {
    const buddy = getMessengerBuddyList(host).buddies[current.senderID];
    host.movie.setProperty("messengerSelectedBuddies", [buddy?.name ?? current.senderID]);
  }
  return changeMessengerWindowView(host, HABBO_MESSENGER_COMPOSE_LAYOUT, release);
}

function nextMessengerMessage(host: HabboFriendsConsoleRuntimeHost, release: string): boolean {
  const [message, ...remaining] = getMessengerMessages(host);
  if (message) {
    queueMessengerRequest(host, {
      command: "MESSENGER_MARKREAD",
      messageId: message.id,
      senderId: message.senderID,
      body: `${message.id}\r${message.senderID}`
    }, release);
    setMessengerMessages(host, remaining, release);
  }

  return remaining.length > 0
    ? renderMessengerMessage(host, remaining[0]!, release)
    : changeMessengerWindowView(host, HABBO_MESSENGER_MY_INFO_LAYOUT, release);
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
