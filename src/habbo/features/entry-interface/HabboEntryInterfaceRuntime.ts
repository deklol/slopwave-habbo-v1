import type { DirectorMovie, UnsupportedFeature } from "../../../runtime";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import { normalizeSymbolKey } from "../../HabboSourceValueHelpers";
import type { HabboEntryBarAction } from "../../ui/HabboEntryBarActions";
import { parsePurseCreditCount } from "../purse";
import {
  clubEntryBarText,
  readClubStatus
} from "../habbo-club";

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";

export interface HabboEntryInterfaceRuntimeHost {
  readonly movie: DirectorMovie;
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;
  readonly texts: Map<string, string>;
  readonly objectManager: {
    getObject(id: string): { get(key: string): unknown; set(key: string, value: unknown): void } | undefined;
  };

  createWindow(id: string, template?: string, x?: number, y?: number): HabboWindowRecord;
  mergeWindowLayout(window: HabboWindowRecord, memberName: string): void;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  registerMessage(message: string, objectId: string, method: string, source?: string): void;
  getMessengerCounts(): { readonly messages: number; readonly requests: number };
  getText(key: string): string | undefined;
  executeMessage(message: string, argument: unknown, release: string): boolean;
  openRegistrationFigureCreator(release: string, mode: "create" | "update"): boolean;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
}

export function showEntryBarRuntime(host: HabboEntryInterfaceRuntimeHost, release: string): boolean {
  const entryInterface = host.objectManager.getObject("#entry_interface");
  let window = host.windows.get(normalizeSymbolKey("entry_bar"));
  if (!window) {
    // Source Entry Interface Class creates this at y=535 and animates it up to 485.
    // This slice opens at the final resting position until the generic update task loop is complete.
    window = host.createWindow("entry_bar", undefined, 0, 486);
    host.registerWindowClient(window, "#entry_interface");
    host.registerWindowProcedure(window, "#eventProcEntryBar", "#entry_interface", "#mouseUp");
  }

  host.mergeWindowLayout(window, "entry_bar.window");
  entryInterface?.set("entryBarVisible", true);
  host.registerMessage("#updateMessageCount", "#entry_interface", "#updateMessageCount", `extracted/projectorrays/${release}/${entryInterfaceClassSource}`);
  host.registerMessage("#updateCreditCount", "#entry_interface", "#updateCreditCount", `extracted/projectorrays/${release}/${entryInterfaceClassSource}`);
  host.registerMessage("#updateBuddyrequestCount", "#entry_interface", "#updateBuddyrequestCount", `extracted/projectorrays/${release}/${entryInterfaceClassSource}`);
  host.registerMessage("#updateFigureData", "#entry_interface", "#updateEntryBar", `extracted/projectorrays/${release}/${entryInterfaceClassSource}`);
  host.registerMessage("#updateClubStatus", "#entry_interface", "#updateClubStatus", `extracted/projectorrays/${release}/${entryInterfaceClassSource}`);
  updateEntryBarTextValuesRuntime(host);
  host.syncWindowFieldValueSnapshot();
  host.movie.setProperty("entryBarVisible", true);
  host.movie.setProperty("entryBarAnimation", {
    release,
    source: `extracted/projectorrays/${release}/${entryInterfaceClassSource}`,
    sourceStartY: 535,
    y: 486,
    targetY: 485,
    phase: "open"
  });
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("entry", "ok", "showEntryBar window=entry_bar.window");
  host.recordUnsupportedOnce("entry-bar-rendering-partial", {
    subsystem: "habbo",
    feature: "entry-bar-rendering-partial",
    detail: `${release} Entry Interface Class showEntryBar renders entry_bar.window and source-backed text/icon elements; generic update-task animation, messenger flashing, and exact head preview buffering remain partial`,
    source: `extracted/projectorrays/${release}/${entryInterfaceClassSource}`
  });
  return true;
}

export function updateEntryBarRuntime(host: HabboEntryInterfaceRuntimeHost, release: string): boolean {
  if (!host.windows.has(normalizeSymbolKey("entry_bar"))) {
    return false;
  }

  updateEntryBarTextValuesRuntime(host);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("entry", "info", "updateEntryBar");
  return true;
}

export function updateEntryBarTextValuesRuntime(host: HabboEntryInterfaceRuntimeHost): void {
  const session = host.objectManager.getObject("#session");
  const name = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  const mission = stringFromSession(session, "user_customData");
  const rawCredits = stringFromSession(session, "user_walletbalance");
  const credits = rawCredits ? parsePurseCreditCount(rawCredits) : (host.texts.get("loading") ?? "Loading");
  const clubStatus = readClubStatus(session?.get("club_status"));
  const messengerCounts = host.getMessengerCounts();
  host.windowTextValues.set("ownhabbo_name_text", name);
  host.windowTextValues.set("ownhabbo_mission_text", mission);
  host.windowTextValues.set("own_credits_text", `${credits} ${host.texts.get("int_credits") ?? "Credits"}`.trim());
  host.windowTextValues.set("new_messages_text", `${messengerCounts.messages} ${host.texts.get("int_newmessages") ?? ""}`.trim());
  host.windowTextValues.set("friendrequests_text", `${messengerCounts.requests} ${host.texts.get("int_newrequests") ?? ""}`.trim());
  const clubEntryText = clubEntryBarText(clubStatus, (key) => host.getText(key));
  host.windowTextValues.set("club_bottombar_text1", clubEntryText.text1);
  host.windowTextValues.set("club_bottombar_text2", clubEntryText.text2);
}

export function executeEntryBarActionRuntime(
  host: HabboEntryInterfaceRuntimeHost,
  action: HabboEntryBarAction,
  release: string
): boolean {
  switch (action.kind) {
    case "message":
      return host.executeMessage(action.message, "argument" in action ? action.argument : undefined, release);
    case "figure-update":
      return host.openRegistrationFigureCreator(release, "update");
    case "noop":
      host.movie.setProperty("lastEntryBarNoop", {
        reason: action.reason,
        source: `extracted/projectorrays/${release}/${entryInterfaceClassSource}`
      });
      return true;
    default:
      return false;
  }
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
