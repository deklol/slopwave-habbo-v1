import type { UnsupportedFeature } from "../../../runtime";
import {
  compatibleRelease14ClubStatus,
  HABBO_CLUB_DEFAULT_UI_MODE,
  HABBO_CLUB_V14_BUY_JP_LAYOUT,
  HABBO_CLUB_V14_BUY_LAYOUT,
  HABBO_CLUB_V14_CONFIRM_LAYOUT,
  HABBO_CLUB_V14_ENDED_LAYOUT,
  HABBO_CLUB_V14_SOURCE,
  HABBO_CLUB_V14_STATUS_LAYOUT,
  HABBO_CLUB_V7_SOURCE_UI_MODE,
  normalizeHabboClubUiMode,
  resolveHabboClubPeriodChoice,
  resolveRelease14ClubLayout,
  type HabboClubPeriodChoice,
  type HabboClubPeriodSelection,
  type HabboClubUiMode
} from "../../compatibility/habbo-club";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import {
  directorNumberFromUnknown,
  normalizeSymbolKey,
  numberFromUnknown
} from "../../HabboSourceValueHelpers";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import {
  HABBO_CLUB_COMPONENT_SOURCE,
  HABBO_CLUB_EXPIRED_LAYOUT,
  HABBO_CLUB_FALLBACK_TITLE,
  HABBO_CLUB_INTERFACE_SOURCE,
  HABBO_CLUB_NOTIFY_CONNECTION_ERROR,
  HABBO_CLUB_NOTIFY_EXPIRED,
  HABBO_CLUB_PRODUCT_NAME,
  HABBO_CLUB_SOURCE_X,
  HABBO_CLUB_SOURCE_Y,
  HABBO_CLUB_TEMPLATE,
  HABBO_CLUB_THANKS_LAYOUT,
  HABBO_CLUB_TITLE_KEY,
  HABBO_CLUB_WINDOW_ID,
  clubHiddenElementsForLayout,
  clubStatusFromNoSubscription,
  clubStatusFromSubscriptionInfo,
  clubTextOverridesForLayout,
  resolveClubAction,
  resolveClubOpenNetPageUrl,
  resolveClubStatusLayout,
  shouldRefreshClubWindowAfterStatus,
  type HabboClubRequest,
  type HabboClubStatus
} from "../../ui/HabboClubDialog";
import { readClubRequests, readClubStatus } from "./HabboClubData";

export interface HabboClubRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
    readonly stage: { readonly width: number; readonly height: number };
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;
  readonly externalCastWindowLayoutSet?: {
    readonly windows: ReadonlyArray<{
      readonly memberName: string;
      readonly elements: ReadonlyArray<{ readonly id: string; readonly locH?: number }>;
    }>;
  };
  nextClubRequestId: number;

  getText(key: string): string | undefined;
  ensureThreadModuleObject(id: string, thread: string, kind: string, className: string, release: string): void;
  createWindow(title: string, template: string | undefined, x: number, y: number): HabboWindowRecord;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  mergeWindowLayout(window: HabboWindowRecord, layoutName: string): void;
  clearWindowElementOverrides(window: HabboWindowRecord): void;
  hideWindowElement(window: HabboWindowRecord, elementId: string): void;
  moveWindowElementH(window: HabboWindowRecord, elementId: string, locH: number): void;
  removeWindow(title: string): boolean;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  updateEntryBar(release: string): boolean;
  showAlert(payload: unknown, release: string): boolean;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function showClubInfo(host: HabboClubRuntimeHost, release: string): boolean {
  ensureClubObjects(host, release);
  const dialogId = getClubWindowId(host);
  if (host.windows.has(normalizeSymbolKey(dialogId))) {
    return hideClubInfo(host, release);
  }

  const status = getClubStatus(host);
  if (!status) {
    queueClubRequest(host, { command: "SCR_GINFO" }, release);
    host.movie.setProperty("lastClubInfoAction", {
      action: "request-status",
      command: "SCR_GINFO",
      source: HABBO_CLUB_INTERFACE_SOURCE
    });
    host.logDebug("club", "info", "show_clubinfo queued SCR_GINFO");
    return true;
  }

  const layout = resolveClubInfoLayout(host, status);
  host.objectManager.getObject("#club_interface")?.set("clubBuyMode", status.status === "inactive" ? "buy" : "extend");
  const opened = changeClubWindowView(host, layout, release);
  const source = isRelease14ClubLayout(layout) ? HABBO_CLUB_V14_SOURCE : HABBO_CLUB_INTERFACE_SOURCE;
  host.movie.setProperty("lastClubInfoAction", {
    action: "show-window",
    layout,
    status,
    source
  });
  host.recordUnsupportedOnce("club-info-window-partial", {
    subsystem: "habbo",
    feature: "club-info-window-partial",
    detail: `${release} Club Interface Class #show_clubinfo opens the source habbo_full shell. release7 defaults to a documented release14 Club status/buy layout override when that version-tagged data exists; set habboClubUiMode=release7-source to use only release7 layouts.`,
    source
  });
  host.logDebug("club", opened ? "ok" : "warn", `show_clubinfo layout=${layout} status=${status.status}`);
  return opened;
}

export function hideClubInfo(host: HabboClubRuntimeHost, release: string): boolean {
  const dialogId = getClubWindowId(host);
  const removed = host.removeWindow(dialogId);
  const clubInterface = host.objectManager.getObject("#club_interface");
  clubInterface?.set("openWindow", "");
  host.movie.setProperty("clubWindowVisible", false);
  host.movie.setProperty("clubOpenWindow", "");
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("club", "info", `hide removed=${removed}`);
  return true;
}

export function notifyClub(host: HabboClubRuntimeHost, argument: unknown, release: string): boolean {
  const notifyType = directorNumberFromUnknown(Array.isArray(argument) ? argument[0] : argument, Number.NaN);
  if (notifyType === HABBO_CLUB_NOTIFY_CONNECTION_ERROR) {
    host.showAlert({ msg: "epsnotify_1001" }, release);
    host.movie.setProperty("lastClubNotify", {
      type: notifyType,
      action: "alert-and-remove-connection",
      source: HABBO_CLUB_INTERFACE_SOURCE
    });
    host.logDebug("club", "warn", "notify 1001");
    return true;
  }

  if (notifyType === HABBO_CLUB_NOTIFY_EXPIRED) {
    const opened = changeClubWindowView(host, HABBO_CLUB_EXPIRED_LAYOUT, release);
    host.movie.setProperty("lastClubNotify", {
      type: notifyType,
      action: "show-expired",
      source: HABBO_CLUB_INTERFACE_SOURCE
    });
    host.logDebug("club", opened ? "ok" : "warn", "notify 550 expired");
    return opened;
  }

  host.movie.setProperty("lastClubNotify", {
    type: Number.isFinite(notifyType) ? notifyType : String(argument),
    action: "unhandled",
    source: HABBO_CLUB_INTERFACE_SOURCE
  });
  return false;
}

export function changeClubWindowView(host: HabboClubRuntimeHost, layoutName: string, release: string): boolean {
  ensureClubObjects(host, release);
  const normalizedWindowName = layoutName.endsWith(".window") ? layoutName : `${layoutName}.window`;
  const dialogId = getClubWindowId(host);
  let window = host.windows.get(normalizeSymbolKey(dialogId));
  if (!window) {
    window = host.createWindow(dialogId, HABBO_CLUB_TEMPLATE, HABBO_CLUB_SOURCE_X, HABBO_CLUB_SOURCE_Y);
    host.registerWindowClient(window, "#club_interface");
  }

  window.title = host.getText(HABBO_CLUB_TITLE_KEY) ?? HABBO_CLUB_FALLBACK_TITLE;
  window.procedures.length = 0;
  host.registerWindowProcedure(window, "#eventProcDialogMousedown", "#club_interface", "#mouseDown");
  host.mergeWindowLayout(window, normalizedWindowName);
  host.clearWindowElementOverrides(window);
  applyClubWindowValues(host, window, normalizedWindowName);
  const clubInterface = host.objectManager.getObject("#club_interface");
  clubInterface?.set("openWindow", normalizedWindowName);
  host.movie.setProperty("clubWindowVisible", true);
  host.movie.setProperty("clubOpenWindow", normalizedWindowName);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

export function activateClubElement(host: HabboClubRuntimeHost, elementId: string, release: string): boolean {
  const action = resolveClubAction(elementId);
  if (!action) {
    host.recordUnsupportedOnce(`club-element-unhandled:${elementId}`, {
      subsystem: "lingo",
      feature: "club-element-unhandled",
      detail: `${release} Club Interface Class eventProcDialogMousedown received ${elementId}; this club action is not translated yet`,
      source: HABBO_CLUB_INTERFACE_SOURCE
    });
    host.logDebug("club", "warn", `unhandled element=${elementId}`);
    return false;
  }

  switch (action.kind) {
    case "layout":
      return changeClubWindowView(host, action.layout, release);
    case "continue":
      return continueClubPurchase(host, release);
    case "extend-layout":
      host.objectManager.getObject("#club_interface")?.set("clubBuyMode", "extend");
      return changeClubWindowView(host, resolveRelease14BuyLayout(host), release);
    case "choose-period":
      return chooseClubPeriod(host, action.period, release);
    case "confirm-period":
      return confirmChosenClubPeriod(host, release);
    case "toggle-parent-permission": {
      const clubInterface = host.objectManager.getObject("#club_interface");
      const nextPermission = numberFromUnknown(clubInterface?.get("parentPermission"), 0) === 1 ? 0 : 1;
      clubInterface?.set("parentPermission", nextPermission);
      host.movie.setProperty("clubParentPermission", nextPermission);
      host.logDebug("club", "info", `parentPermission=${nextPermission}`);
      return true;
    }
    case "open-net-page": {
      const session = host.objectManager.getObject("#session");
      const url = resolveClubOpenNetPageUrl(
        action,
        (key) => host.getText(key),
        (key) => {
          const value = session?.get(key);
          return value === undefined ? undefined : String(value);
        }
      );
      host.movie.setProperty("lastClubInfoAction", {
        action: "open_net_page",
        variableKey: action.variableKey,
        url,
        target: action.target,
        source: HABBO_CLUB_INTERFACE_SOURCE
      });
      host.logDebug("club", "info", `openNetPage ${action.variableKey}=${url}`);
      return true;
    }
    case "close":
      return hideClubInfo(host, release);
    default:
      return false;
  }
}

export function continueClubPurchase(host: HabboClubRuntimeHost, release: string): boolean {
  return queueClubPurchase(host, release, getLegacyClubPurchaseChoice(host), {
    enforceRelease7TimeCap: true
  });
}

export function chooseClubPeriod(host: HabboClubRuntimeHost, period: HabboClubPeriodSelection, release: string): boolean {
  const clubInterface = host.objectManager.getObject("#club_interface");
  const choice = getRelease14ClubPeriodChoice(host, period);
  clubInterface?.set("chosenLength", period);
  clubInterface?.set("chosenDays", choice.days);
  clubInterface?.set("chosenPrice", choice.price);
  clubInterface?.set("chosenPeriods", choice.periods);
  host.movie.setProperty("clubChosenLength", period);
  host.movie.setProperty("clubChosenDays", choice.days);
  host.movie.setProperty("clubChosenPrice", choice.price);
  host.movie.setProperty("clubChosenPeriods", choice.periods);
  return changeClubWindowView(host, HABBO_CLUB_V14_CONFIRM_LAYOUT, release);
}

export function confirmChosenClubPeriod(host: HabboClubRuntimeHost, release: string): boolean {
  const clubInterface = host.objectManager.getObject("#club_interface");
  const chosenLength = Math.max(1, Math.min(3, Math.trunc(directorNumberFromUnknown(clubInterface?.get("chosenLength"), 1)))) as HabboClubPeriodSelection;
  const chosen = getRelease14ClubPeriodChoice(host, chosenLength);
  const choice: HabboClubPeriodChoice = {
    ...chosen,
    days: directorNumberFromUnknown(clubInterface?.get("chosenDays"), chosen.days),
    price: directorNumberFromUnknown(clubInterface?.get("chosenPrice"), chosen.price),
    periods: directorNumberFromUnknown(clubInterface?.get("chosenPeriods"), chosen.periods) as HabboClubPeriodChoice["periods"]
  };
  const beforeCount = readClubRequests(host.movie.getProperty("pendingClubRequests")).length;
  const queued = queueClubPurchase(host, release, choice);
  const afterCount = readClubRequests(host.movie.getProperty("pendingClubRequests")).length;
  if (queued && afterCount > beforeCount) {
    hideClubInfo(host, release);
  }
  return queued;
}

export function getClubWindowId(host: HabboClubRuntimeHost): string {
  return String(host.objectManager.getObject("#club_interface")?.get("dialogId") ?? HABBO_CLUB_WINDOW_ID);
}

export function getClubStatus(host: HabboClubRuntimeHost): HabboClubStatus | undefined {
  const component = host.objectManager.getObject("#club_component");
  return readClubStatus(component?.get("clubStatus"))
    ?? readClubStatus(host.objectManager.getObject("#session")?.get("club_status"))
    ?? readClubStatus(host.movie.getProperty("clubStatus"));
}

export function setClubStatus(host: HabboClubRuntimeHost, status: HabboClubStatus, release: string): void {
  ensureClubObjects(host, release);
  const dialogId = getClubWindowId(host);
  const previousStatus = getClubStatus(host);
  const shouldRefreshWindow = host.windows.has(normalizeSymbolKey(dialogId))
    && shouldRefreshClubWindowAfterStatus(status);
  host.objectManager.getObject("#club_component")?.set("clubStatus", status);
  host.objectManager.getObject("#session")?.set("club_status", status);
  host.movie.setProperty("clubStatus", status);
  if (host.windows.has(normalizeSymbolKey("entry_bar"))) {
    host.updateEntryBar(release);
  }
  if (status.responseFlag === 2 && getClubUiMode(host) === HABBO_CLUB_DEFAULT_UI_MODE && hasRelease14ClubLayouts(host)) {
    if (host.windows.has(normalizeSymbolKey(dialogId))) {
      host.removeWindow(dialogId);
    }
    host.movie.setProperty("clubWindowVisible", false);
    host.movie.setProperty("clubOpenWindow", "");
    host.movie.setProperty("lastClubInfoAction", {
      action: "subscription-status-update",
      layout: HABBO_CLUB_V14_STATUS_LAYOUT,
      status,
      previousStatus,
      source: HABBO_CLUB_V14_SOURCE
    });
    changeClubWindowView(host, HABBO_CLUB_V14_STATUS_LAYOUT, release);
    return;
  }
  if (shouldRefreshWindow) {
    host.removeWindow(dialogId);
    host.movie.setProperty("clubWindowVisible", false);
    host.movie.setProperty("clubOpenWindow", "");
    showClubInfo(host, release);
  }
}

export function queueClubRequest(
  host: HabboClubRuntimeHost,
  request: Omit<HabboClubRequest, "id" | "status">,
  release: string
): void {
  const queued = readClubRequests(host.movie.getProperty("pendingClubRequests"));
  const nextRequest: HabboClubRequest = {
    id: host.nextClubRequestId++,
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingClubRequests", [...queued, nextRequest]);
  host.logDebug("club", "info", `queue ${nextRequest.command}`, {
    release,
    request: nextRequest
  });
}

export function handleClubNoSubscriptionPacket(host: HabboClubRuntimeHost, body: string, release: string): boolean {
  const status = clubStatusFromNoSubscription(body);
  setClubStatus(host, status, release);
  host.movie.setProperty("lastClubStatusPacket", status);
  host.logDebug("club", "ok", `SCR_NOSUB product=${status.productName}`);
  return true;
}

export function handleClubSubscriptionInfoPacket(host: HabboClubRuntimeHost, body: string, release: string): boolean {
  const status = clubStatusFromSubscriptionInfo(body, (key) => host.getText(key));
  setClubStatus(host, status, release);
  host.movie.setProperty("lastClubStatusPacket", status);
  host.logDebug("club", "ok", `SCR_SINFO product=${status.productName} status=${status.status} days=${String(status.daysLeft)}`);
  return true;
}

export function handleClubSubscriptionOkPacket(host: HabboClubRuntimeHost, release: string): boolean {
  ensureClubObjects(host, release);
  const dialogId = getClubWindowId(host);
  const latestPurchase = [...readClubRequests(host.movie.getProperty("pendingClubRequests"))]
    .reverse()
    .find((request) => request.command === "SCR_SUBSCRIBE" || request.command === "SCR_EXTSCR");
  if (getClubUiMode(host) === HABBO_CLUB_DEFAULT_UI_MODE && latestPurchase?.sourceCommand === "SCR_BUY") {
    if (host.windows.has(normalizeSymbolKey(dialogId))) {
      host.removeWindow(dialogId);
    }
    queueClubRequest(host, { command: "GETAVAILABLEBADGES" }, release);
    host.movie.setProperty("clubWindowVisible", false);
    host.movie.setProperty("clubOpenWindow", "");
    host.movie.setProperty("lastClubInfoAction", {
      action: "subscription-ok-wait-status",
      request: latestPurchase,
      source: HABBO_CLUB_V14_SOURCE
    });
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("club", "ok", "SCR_SOK waiting for SCR_SINFO status refresh");
    return true;
  }

  if (!host.windows.has(normalizeSymbolKey(dialogId))) {
    host.movie.setProperty("lastClubInfoAction", {
      action: "subscription-ok-ignored",
      reason: "window-not-open",
      source: HABBO_CLUB_INTERFACE_SOURCE
    });
    host.logDebug("club", "info", "SCR_SOK ignored because club dialog is closed");
    return true;
  }

  host.removeWindow(dialogId);
  queueClubRequest(host, { command: "GETAVAILABLEBADGES" }, release);
  changeClubWindowView(host, HABBO_CLUB_THANKS_LAYOUT, release);
  host.movie.setProperty("lastClubInfoAction", {
    action: "subscription-ok",
    layout: HABBO_CLUB_THANKS_LAYOUT,
    source: HABBO_CLUB_INTERFACE_SOURCE
  });
  host.logDebug("club", "ok", "SCR_SOK");
  return true;
}

export function ensureClubObjects(host: HabboClubRuntimeHost, release: string): void {
  host.ensureThreadModuleObject("#club_interface", "#club", "interface", "Club Interface Class", release);
  host.ensureThreadModuleObject("#club_component", "#club", "component", "Club Component Class", release);
  host.ensureThreadModuleObject("#club_handler", "#club", "handler", "Club Handler Class", release);
}

function resolveClubInfoLayout(host: HabboClubRuntimeHost, status: HabboClubStatus): string {
  if (getClubUiMode(host) === HABBO_CLUB_V7_SOURCE_UI_MODE || !hasRelease14ClubLayouts(host)) {
    return resolveClubStatusLayout(status);
  }

  return resolveRelease14ClubLayout(status, hasClubHttpUrl(host, "club_paybycash_url"));
}

function resolveRelease14BuyLayout(host: HabboClubRuntimeHost): string {
  return hasClubHttpUrl(host, "club_paybycash_url") ? HABBO_CLUB_V14_BUY_JP_LAYOUT : HABBO_CLUB_V14_BUY_LAYOUT;
}

function getClubUiMode(host: HabboClubRuntimeHost): HabboClubUiMode {
  return normalizeHabboClubUiMode(host.movie.getProperty("habboClubUiMode") ?? HABBO_CLUB_DEFAULT_UI_MODE);
}

function hasRelease14ClubLayouts(host: HabboClubRuntimeHost): boolean {
  const names = new Set((host.externalCastWindowLayoutSet?.windows ?? []).map((window) => window.memberName.toLowerCase()));
  return names.has(HABBO_CLUB_V14_STATUS_LAYOUT.toLowerCase()) && names.has(HABBO_CLUB_V14_BUY_LAYOUT.toLowerCase());
}

function isRelease14ClubLayout(layoutName: string): boolean {
  const normalized = layoutName.toLowerCase();
  return normalized === HABBO_CLUB_V14_STATUS_LAYOUT
    || normalized === HABBO_CLUB_V14_BUY_LAYOUT
    || normalized === HABBO_CLUB_V14_BUY_JP_LAYOUT
    || normalized === HABBO_CLUB_V14_CONFIRM_LAYOUT
    || normalized === HABBO_CLUB_V14_ENDED_LAYOUT;
}

function hasClubHttpUrl(host: HabboClubRuntimeHost, key: string): boolean {
  return host.getText(key)?.toLowerCase().startsWith("http") === true;
}

function applyClubWindowValues(host: HabboClubRuntimeHost, window: HabboWindowRecord, layoutName: string): void {
  const status = getClubStatus(host);
  for (const elementId of clubHiddenElementsForLayout(layoutName, (key) => host.getText(key))) {
    host.hideWindowElement(window, elementId);
  }

  const session = host.objectManager.getObject("#session");
  const email = stringFromSession(session, "user_email") || stringFromSession(session, "email");
  const textOverrides = clubTextOverridesForLayout(layoutName, status, email, (key) => host.getText(key));
  for (const [elementId, text] of Object.entries(textOverrides)) {
    host.windowTextValues.set(elementId, text);
  }

  applyRelease14ClubWindowValues(host, window, layoutName);
}

function applyRelease14ClubWindowValues(host: HabboClubRuntimeHost, window: HabboWindowRecord, layoutName: string): void {
  if (!isRelease14ClubLayout(layoutName)) {
    return;
  }

  if (layoutName === HABBO_CLUB_V14_STATUS_LAYOUT) {
    applyRelease14ClubStatusWindowValues(host, window);
    return;
  }

  if (layoutName === HABBO_CLUB_V14_BUY_LAYOUT || layoutName === HABBO_CLUB_V14_BUY_JP_LAYOUT) {
    applyRelease14ClubBuyWindowValues(host, window, layoutName);
    return;
  }

  if (layoutName === HABBO_CLUB_V14_CONFIRM_LAYOUT) {
    applyRelease14ClubConfirmWindowValues(host);
    return;
  }

  if (layoutName === HABBO_CLUB_V14_ENDED_LAYOUT) {
    applyRelease14ClubEndedWindowValues(host, window);
  }
}

function applyRelease14ClubStatusWindowValues(host: HabboClubRuntimeHost, window: HabboWindowRecord): void {
  const status = getClubStatus(host);
  if (!status) {
    return;
  }

  const compatibleStatus = compatibleRelease14ClubStatus(status);
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName === HABBO_CLUB_V14_STATUS_LAYOUT);
  const arrowElement = layout?.elements.find((element) => element.id === "club_arrow");
  if (arrowElement?.locH !== undefined) {
    host.moveWindowElementH(window, "club_arrow", arrowElement.locH + ((31 - compatibleStatus.daysLeft) * 5));
  }

  host.windowTextValues.set("club_elapsed_periods", String(compatibleStatus.elapsedPeriods));
  host.windowTextValues.set("club_prepaid_periods", String(compatibleStatus.prepaidPeriods));

  if (status.responseFlag === 2) {
    host.windowTextValues.set("club_status_title", host.getText("club_thanks_title") ?? "");
    host.windowTextValues.set("club_status_text", host.getText("club_thanks_text") ?? "");
  }

  if (compatibleStatus.prepaidPeriods === -1) {
    host.hideWindowElement(window, "club_button_extend");
  } else {
    host.hideWindowElement(window, "club_isp_change");
    host.hideWindowElement(window, "club_isp_icon");
  }
  if (compatibleStatus.elapsedPeriods === 0) {
    host.hideWindowElement(window, "club_elapsed_periods");
    host.hideWindowElement(window, "club_elapsed");
  }
  if (compatibleStatus.prepaidPeriods === 0) {
    host.hideWindowElement(window, "club_prepaid_periods");
    host.hideWindowElement(window, "club_prepaid");
  }
  if (!hasClubHttpUrl(host, "club_info_url")) {
    host.hideWindowElement(window, "club_general_infolink");
  }
}

function applyRelease14ClubBuyWindowValues(host: HabboClubRuntimeHost, window: HabboWindowRecord, layoutName: string): void {
  if (!hasClubHttpUrl(host, "club_info_url")) {
    host.hideWindowElement(window, "club_intro_link");
  }
  if (layoutName === HABBO_CLUB_V14_BUY_JP_LAYOUT && !hasClubHttpUrl(host, "club_paybycash_url")) {
    host.hideWindowElement(window, "club_isp_buy");
  }

  const clubInterface = host.objectManager.getObject("#club_interface");
  if (clubInterface?.get("clubBuyMode") === "extend") {
    host.windowTextValues.set("club_intro_header", host.getText("club_extend_title") ?? "Habbo Club membership can be extended very easily.");
    host.windowTextValues.set("club_intro_text", host.getText("club_extend_text") ?? "");
  } else {
    host.windowTextValues.set("club_intro_header", host.getText("club_intro_header") ?? "");
    host.windowTextValues.set("club_intro_text", host.getText("club_intro_text") ?? "");
  }
  host.windowTextValues.set("club_desc_1_period", host.getText("club_desc_1_period") ?? "");
  host.windowTextValues.set("club_desc_2_period", host.getText("club_desc_2_period") ?? "");
  host.windowTextValues.set("club_desc_3_period", host.getText("club_desc_3_period") ?? "");
}

function applyRelease14ClubConfirmWindowValues(host: HabboClubRuntimeHost): void {
  const clubInterface = host.objectManager.getObject("#club_interface");
  const chosenLength = Math.max(1, Math.min(3, Math.trunc(directorNumberFromUnknown(clubInterface?.get("chosenLength"), 1))));
  const session = host.objectManager.getObject("#session");
  const credits = stringFromSession(session, "user_walletbalance")
    || String(host.movie.getProperty("lastPurseBalance") ?? "0");
  const text = host.getText(`club_confirm_text${chosenLength}`) ?? host.getText("club_confirm_text1") ?? "";
  host.windowTextValues.set("club_confirm_text", text.replaceAll("%credits%", credits));
}

function applyRelease14ClubEndedWindowValues(host: HabboClubRuntimeHost, window: HabboWindowRecord): void {
  const status = getClubStatus(host);
  if (status) {
    host.windowTextValues.set("club_elapsed_periods", String(compatibleRelease14ClubStatus(status).elapsedPeriods));
  }
  if (!hasClubHttpUrl(host, "club_info_url")) {
    host.hideWindowElement(window, "club_general_infolink");
  }
}

function queueClubPurchase(
  host: HabboClubRuntimeHost,
  release: string,
  choice: HabboClubPeriodChoice,
  options: { readonly enforceRelease7TimeCap?: boolean } = {}
): boolean {
  const status = getClubStatus(host);
  const session = host.objectManager.getObject("#session");
  const wallet = session?.exists("user_walletbalance")
    ? directorNumberFromUnknown(session.get("user_walletbalance"), 0)
    : undefined;
  const totalDaysLeft = status?.totalDaysLeft ?? (typeof status?.daysLeft === "number" ? status.daysLeft : 0);
  if (options.enforceRelease7TimeCap && status && totalDaysLeft > 62) {
    return host.showAlert({ msg: "club_timefull" }, release);
  }
  if (wallet !== undefined && wallet < choice.price) {
    return host.showAlert({ msg: "club_price" }, release);
  }

  if (!status || status.status === "inactive") {
    queueClubRequest(host, {
      command: "SCR_SUBSCRIBE",
      body: `${HABBO_CLUB_PRODUCT_NAME} 0 ${choice.days}`,
      days: choice.days,
      price: choice.price,
      selection: choice.selection,
      periods: choice.periods,
      sourceCommand: isRelease14ClubPurchaseChoice(host, choice.selection) ? "SCR_BUY" : "SCR_SUBSCRIBE"
    }, release);
    host.movie.setProperty("lastClubInfoAction", {
      action: "subscribe",
      command: "SCR_SUBSCRIBE",
      days: choice.days,
      price: choice.price,
      selection: choice.selection,
      periods: choice.periods,
      sourceCommand: isRelease14ClubPurchaseChoice(host, choice.selection) ? "SCR_BUY" : "SCR_SUBSCRIBE",
      source: HABBO_CLUB_COMPONENT_SOURCE
    });
    host.logDebug("club", "info", `queued SCR_SUBSCRIBE days=${choice.days} periods=${choice.periods} price=${choice.price}`);
    return true;
  }

  queueClubRequest(host, {
    command: "SCR_EXTSCR",
    body: `${HABBO_CLUB_PRODUCT_NAME} ${choice.days}`,
    days: choice.days,
    price: choice.price,
    selection: choice.selection,
    periods: choice.periods,
    sourceCommand: isRelease14ClubPurchaseChoice(host, choice.selection) ? "SCR_BUY" : "SCR_EXTSCR"
  }, release);
  host.movie.setProperty("lastClubInfoAction", {
    action: "extend",
    command: "SCR_EXTSCR",
    days: choice.days,
    price: choice.price,
    selection: choice.selection,
    periods: choice.periods,
    sourceCommand: isRelease14ClubPurchaseChoice(host, choice.selection) ? "SCR_BUY" : "SCR_EXTSCR",
    source: HABBO_CLUB_COMPONENT_SOURCE
  });
  host.logDebug("club", "info", `queued SCR_EXTSCR days=${choice.days} periods=${choice.periods} price=${choice.price}`);
  return hideClubInfo(host, release);
}

function getLegacyClubPurchaseChoice(host: HabboClubRuntimeHost): HabboClubPeriodChoice {
  const clubInterface = host.objectManager.getObject("#club_interface");
  const choice = getRelease14ClubPeriodChoice(host, 1);
  return {
    ...choice,
    days: directorNumberFromUnknown(clubInterface?.get("days"), choice.days),
    price: directorNumberFromUnknown(clubInterface?.get("price"), choice.price)
  };
}

function getRelease14ClubPeriodChoice(host: HabboClubRuntimeHost, period: HabboClubPeriodSelection): HabboClubPeriodChoice {
  return resolveHabboClubPeriodChoice(period, (key) => host.getText(key));
}

function isRelease14ClubPurchaseChoice(host: HabboClubRuntimeHost, selection: HabboClubPeriodSelection): boolean {
  return getClubUiMode(host) === HABBO_CLUB_DEFAULT_UI_MODE && hasRelease14ClubLayouts(host) && selection >= 1 && selection <= 3;
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
