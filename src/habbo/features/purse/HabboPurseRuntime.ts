import type { UnsupportedFeature } from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import {
  directorNumberFromUnknown,
  normalizeSymbolKey,
  readStringList,
  truthySessionValue
} from "../../HabboSourceValueHelpers";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import {
  HABBO_PURSE_COMPONENT_SOURCE,
  HABBO_PURSE_FALLBACK_TITLE,
  HABBO_PURSE_HANDLER_SOURCE,
  HABBO_PURSE_LAYOUT,
  HABBO_PURSE_NO_TRANSACTIONS_LAYOUT,
  HABBO_PURSE_SOURCE,
  HABBO_PURSE_TEMPLATE,
  HABBO_PURSE_TITLE_KEY,
  HABBO_PURSE_TRANSACTIONS_LAYOUT,
  HABBO_PURSE_TRANSACTIONS_NO_VALUE_LAYOUT,
  HABBO_PURSE_VOUCHER_FALLBACK_TITLE,
  HABBO_PURSE_VOUCHER_LAYOUT,
  HABBO_PURSE_VOUCHER_TEMPLATE,
  HABBO_PURSE_VOUCHER_TITLE_KEY,
  parsePurseCreditCount,
  parsePurseCreditLogPacket,
  purseColumnText,
  resolvePurseAction,
  type HabboPurseTransactionPage
} from "../../ui/HabboPurseDialog";
import { readPurseRequests, type HabboPurseRequest } from "./HabboPurseData";

export interface HabboPurseRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly texts: Map<string, string>;
  readonly windowTextValues: Map<string, string>;
  nextPurseRequestId: number;

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
  setWindowElementEditable(window: HabboWindowRecord, elementId: string, editable: boolean): void;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  updateEntryBar(release: string): boolean;
  showAlert(payload: unknown, release: string): boolean;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function ensurePurseObjects(host: HabboPurseRuntimeHost, release: string): void {
  host.ensureThreadModuleObject("#purse_interface", "#purse", "interface", "Purse Interface Class", release);
  host.ensureThreadModuleObject("#purse_component", "#purse", "component", "Purse Component Class", release);
  host.ensureThreadModuleObject("#purse_handler", "#purse", "handler", "Purse Handler Class", release);
}

export function showHidePurse(host: HabboPurseRuntimeHost, release: string): boolean {
  ensurePurseObjects(host, release);
  const title = host.getText(HABBO_PURSE_TITLE_KEY) ?? HABBO_PURSE_FALLBACK_TITLE;
  return host.windows.has(normalizeSymbolKey(title))
    ? hidePurse(host, release)
    : showPurse(host, release);
}

export function showPurse(host: HabboPurseRuntimeHost, release: string): boolean {
  ensurePurseObjects(host, release);
  return changePurseWindowView(host, HABBO_PURSE_LAYOUT, release);
}

export function changePurseWindowView(host: HabboPurseRuntimeHost, layoutName: string, release: string): boolean {
  const title = host.getText(HABBO_PURSE_TITLE_KEY) ?? HABBO_PURSE_FALLBACK_TITLE;
  const template = layoutName === HABBO_PURSE_LAYOUT ? undefined : HABBO_PURSE_TEMPLATE;
  const position = host.resolveSourceWindowPosition(
    layoutName,
    template,
    layoutName === HABBO_PURSE_LAYOUT ? { x: 170, y: 114 } : { x: 123, y: 92 }
  );
  const window = host.createWindow(title, template, position.x, position.y);
  host.registerWindowClient(window, "#purse_interface");
  host.registerWindowProcedure(window, "#eventProcPurse", "#purse_interface", "#mouseUp");
  host.registerWindowProcedure(window, "#eventProcPurse", "#purse_interface", "#mouseDown");
  host.mergeWindowLayout(window, layoutName);

  const session = host.objectManager.getObject("#session");
  const name = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  const credits = stringFromSession(session, "user_walletbalance") || String(host.movie.getProperty("lastPurseBalance") ?? "0");
  if (layoutName === HABBO_PURSE_LAYOUT) {
    host.windowTextValues.set("youhave", host.getText("purse_youhave") ?? "You have");
    host.windowTextValues.set("coins", host.getText("purse_coins") ?? "Habbo credits");
    host.windowTextValues.set("purse_name", name);
    host.windowTextValues.set("purse_amount", credits);
  } else {
    applyPurseTransactionHeaderTexts(host, layoutName, name);
  }
  host.objectManager.getObject("#purse_interface")?.set("openWindow", HABBO_PURSE_LAYOUT);
  host.objectManager.getObject("#purse_interface")?.set("openWindow", layoutName);
  host.movie.setProperty("purseVisible", true);
  host.movie.setProperty("purseOpenWindow", layoutName);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("purse", "ok", `show layout=${layoutName} credits=${credits}`);
  return true;
}

export function hidePurse(host: HabboPurseRuntimeHost, release: string): boolean {
  const title = host.getText(HABBO_PURSE_TITLE_KEY) ?? HABBO_PURSE_FALLBACK_TITLE;
  const removed = host.removeWindow(title);
  hideVoucherWindow(host, release, false);
  host.objectManager.getObject("#purse_interface")?.set("openWindow", "");
  host.movie.setProperty("purseVisible", false);
  host.movie.setProperty("purseOpenWindow", "");
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("purse", "info", `hide removed=${removed}`);
  return true;
}

export function showVoucherWindow(host: HabboPurseRuntimeHost, release: string): boolean {
  ensurePurseObjects(host, release);
  const title = host.getText(HABBO_PURSE_VOUCHER_TITLE_KEY) ?? HABBO_PURSE_VOUCHER_FALLBACK_TITLE;
  if (host.windows.has(normalizeSymbolKey(title))) {
    return true;
  }

  const position = host.resolveSourceWindowPosition(HABBO_PURSE_VOUCHER_LAYOUT, HABBO_PURSE_VOUCHER_TEMPLATE, { x: 308, y: 177 });
  const window = host.createWindow(title, HABBO_PURSE_VOUCHER_TEMPLATE, position.x, position.y);
  host.registerWindowClient(window, "#purse_interface");
  host.registerWindowProcedure(window, "#eventProcPurse", "#purse_interface", "#mouseUp");
  host.mergeWindowLayout(window, HABBO_PURSE_VOUCHER_LAYOUT);
  const helpUrl = host.getText("purse_vouchers_helpurl") ?? "";
  if (!helpUrl.toLowerCase().startsWith("http")) {
    host.hideWindowElement(window, "voucher_help");
  }
  if (!host.windowTextValues.has("voucher_code")) {
    host.windowTextValues.set("voucher_code", "");
  }
  setVoucherInputState(host, true, release, false);
  host.movie.setProperty("purseVoucherVisible", true);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("purse", "ok", "show voucher window");
  return true;
}

export function hideVoucherWindow(host: HabboPurseRuntimeHost, release: string, sync = true): boolean {
  const title = host.getText(HABBO_PURSE_VOUCHER_TITLE_KEY) ?? HABBO_PURSE_VOUCHER_FALLBACK_TITLE;
  const removed = host.removeWindow(title);
  host.movie.setProperty("purseVoucherVisible", false);
  if (sync) {
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  host.logDebug("purse", "info", `hide voucher removed=${removed}`);
  return true;
}

export function setVoucherInputState(host: HabboPurseRuntimeHost, enabled: boolean, release: string, sync = true): void {
  host.objectManager.getObject("#purse_interface")?.set("voucherInputState", enabled ? 1 : 0);
  host.movie.setProperty("purseVoucherInputState", enabled);
  host.windowTextValues.set(
    "voucher_statustext",
    enabled
      ? host.getText("purse_vouchers_entercode") ?? "Enter code here:"
      : host.getText("purse_vouchers_checking") ?? "Checking code, please wait..."
  );
  const title = host.getText(HABBO_PURSE_VOUCHER_TITLE_KEY) ?? HABBO_PURSE_VOUCHER_FALLBACK_TITLE;
  const window = host.windows.get(normalizeSymbolKey(title));
  if (window) {
    host.setWindowElementEditable(window, "voucher_code", enabled);
    if (enabled) {
      host.hideWindowElement(window, "loading_bg");
    } else {
      host.showWindowElement(window, "loading_bg");
    }
  }
  if (sync) {
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
}

export function openPurseTransactions(host: HabboPurseRuntimeHost, release: string): boolean {
  const purseInterface = host.objectManager.getObject("#purse_interface");
  const pages = getPurseTransactionPages(host);
  const dataReceived = directorNumberFromUnknown(purseInterface?.get("dataReceived"), 0) !== 0;
  const layout = isPurseValueFieldEnabled(host)
    ? HABBO_PURSE_TRANSACTIONS_LAYOUT
    : HABBO_PURSE_TRANSACTIONS_NO_VALUE_LAYOUT;
  if (pages.length === 0 && !dataReceived) {
    changePurseWindowView(host, layout, release);
    queuePurseRequest(host, { command: "GETUSERCREDITLOG" }, release);
    host.movie.setProperty("lastPurseAction", {
      action: "request-credit-log",
      command: "GETUSERCREDITLOG",
      source: HABBO_PURSE_SOURCE
    });
    return true;
  }

  if (pages.length === 0) {
    changePurseWindowView(host, HABBO_PURSE_NO_TRANSACTIONS_LAYOUT, release);
    return true;
  }

  changePurseWindowView(host, layout, release);
  return showPurseTransactionPage(host, 1, release);
}

export function showPurseTransactionPage(host: HabboPurseRuntimeHost, pageNumber: number, release: string): boolean {
  const pages = getPurseTransactionPages(host);
  if (pages.length === 0) {
    return false;
  }

  const nextPage = Math.max(1, Math.min(pages.length, Math.trunc(pageNumber)));
  const page = pages[nextPage - 1];
  if (!page) {
    return false;
  }

  const purseInterface = host.objectManager.getObject("#purse_interface");
  purseInterface?.set("pageView", nextPage);
  host.windowTextValues.set("purse_field1", purseColumnText(page, "date", (key) => host.getText(key)));
  host.windowTextValues.set("purse_field2", purseColumnText(page, "time", (key) => host.getText(key)));
  host.windowTextValues.set("purse_field3", purseColumnText(page, "creditValue", (key) => host.getText(key)));
  host.windowTextValues.set("purse_field4", purseColumnText(page, "transactionSystemName", (key) => host.getText(key)));
  if (isPurseValueFieldEnabled(host)) {
    host.windowTextValues.set("purse_field5", purseColumnText(page, "realValue", (key) => host.getText(key)));
  }
  host.windowTextValues.set("taction_pages", `${nextPage}/${pages.length}`);
  host.windowTextValues.set("taction_prev", host.getText("previous_onearrowed") ?? "< Previous");
  host.windowTextValues.set("taction_next", host.getText("next_onearrowed") ?? "Next >");
  host.movie.setProperty("lastPurseTransactionPage", {
    page: nextPage,
    pageCount: pages.length,
    rowCount: page.length,
    source: HABBO_PURSE_SOURCE
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

export function recordPurseBuyCredits(host: HabboPurseRuntimeHost, release: string): boolean {
  const session = host.objectManager.getObject("#session");
  const rights = readStringList(session?.get("user_rights"));
  const urlKey = rights.includes("can_buy_credits") ? "url_purselink" : "url_purse_subscribe";
  const baseUrl = host.getText(urlKey) ?? "";
  const userName = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  let url = `${baseUrl}${encodeURIComponent(userName)}`;
  const checksum = stringFromSession(session, "user_checksum");
  if (checksum) {
    url = `${url}&sum=${encodeURIComponent(checksum)}`;
  }
  host.movie.setProperty("lastPurseAction", {
    action: "open-net-page",
    variableKey: urlKey,
    url,
    target: "_new",
    source: HABBO_PURSE_SOURCE
  });
  host.logDebug("purse", "info", `openNetPage ${urlKey}=${url}`, { release });
  return true;
}

export function openVoucherFromPurse(host: HabboPurseRuntimeHost, release: string): boolean {
  const session = host.objectManager.getObject("#session");
  if (!truthySessionValue(session?.get("conf_voucher"))) {
    host.movie.setProperty("lastPurseAction", {
      action: "voucher-disabled",
      source: HABBO_PURSE_SOURCE
    });
    return true;
  }

  return showVoucherWindow(host, release);
}

export function sendVoucherFromPurse(host: HabboPurseRuntimeHost, release: string): boolean {
  if (host.movie.getProperty("purseVoucherInputState") === false) {
    return false;
  }

  const code = String(host.windowTextValues.get("voucher_code") ?? "").trim();
  if (!code) {
    return false;
  }

  setVoucherInputState(host, false, release);
  queuePurseRequest(host, { command: "REDEEM_VOUCHER", code }, release);
  host.movie.setProperty("lastPurseAction", {
    action: "redeem-voucher",
    command: "REDEEM_VOUCHER",
    codeLength: code.length,
    source: HABBO_PURSE_COMPONENT_SOURCE
  });
  return true;
}

export function recordPurseVoucherHelp(host: HabboPurseRuntimeHost, release: string): boolean {
  const url = host.getText("purse_vouchers_helpurl");
  host.movie.setProperty("lastPurseAction", {
    action: "voucher-help",
    url,
    source: HABBO_PURSE_SOURCE
  });
  host.logDebug("purse", "info", `voucher help url=${url ?? ""}`, { release });
  return true;
}

export function getPursePageView(host: HabboPurseRuntimeHost): number {
  return Math.max(1, Math.trunc(directorNumberFromUnknown(host.objectManager.getObject("#purse_interface")?.get("pageView"), 1)));
}

export function getPurseTransactionPages(host: HabboPurseRuntimeHost): readonly HabboPurseTransactionPage[] {
  const value = host.objectManager.getObject("#purse_interface")?.get("pageList");
  return Array.isArray(value) ? value.filter((page): page is HabboPurseTransactionPage => Array.isArray(page)) : [];
}

export function isPurseValueFieldEnabled(host: HabboPurseRuntimeHost): boolean {
  return truthySessionValue(host.objectManager.getObject("#purse_interface")?.get("valueField"));
}

export function queuePurseRequest(
  host: HabboPurseRuntimeHost,
  request: Omit<HabboPurseRequest, "id" | "status">,
  release: string
): void {
  const queued = readPurseRequests(host.movie.getProperty("pendingPurseRequests"));
  const nextRequest: HabboPurseRequest = {
    id: host.nextPurseRequestId++,
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingPurseRequests", [...queued, nextRequest]);
  host.logDebug("purse", "info", `queue ${nextRequest.command}`, {
    release,
    request: nextRequest
  });
}

export function handlePursePacket(host: HabboPurseRuntimeHost, body: string, release: string): void {
  const credits = parsePurseCreditCount(body);
  host.objectManager.getObject("#session")?.set("user_walletbalance", credits);
  host.movie.setProperty("lastPurseBalance", credits);
  host.windowTextValues.set("purse_amount", credits);
  host.logDebug("entry", "info", `PURSE balance=${credits}`);
  host.updateEntryBar(release);
  if (host.windows.has(normalizeSymbolKey(host.getText(HABBO_PURSE_TITLE_KEY) ?? HABBO_PURSE_FALLBACK_TITLE))) {
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
}

export function handlePurseCreditLogPacket(host: HabboPurseRuntimeHost, body: string, release: string): boolean {
  ensurePurseObjects(host, release);
  const pages = parsePurseCreditLogPacket(body);
  const purseInterface = host.objectManager.getObject("#purse_interface");
  purseInterface?.set("dataReceived", 1);
  purseInterface?.set("pageList", pages);
  host.movie.setProperty("lastPurseCreditLogPacket", {
    pageCount: pages.length,
    rowCount: pages.reduce((count, page) => count + page.length, 0),
    source: HABBO_PURSE_HANDLER_SOURCE
  });
  if (pages.length === 0) {
    host.objectManager.getObject("#session")?.set("purse_transactions", 0);
    changePurseWindowView(host, HABBO_PURSE_NO_TRANSACTIONS_LAYOUT, release);
    return true;
  }

  host.objectManager.getObject("#session")?.set("purse_transactions", 1);
  changePurseWindowView(host, isPurseValueFieldEnabled(host) ? HABBO_PURSE_TRANSACTIONS_LAYOUT : HABBO_PURSE_TRANSACTIONS_NO_VALUE_LAYOUT, release);
  showPurseTransactionPage(host, 1, release);
  host.logDebug("purse", "ok", `credit log pages=${pages.length}`);
  return true;
}

export function handleVoucherRedeemOkPacket(host: HabboPurseRuntimeHost, body: string, release: string): boolean {
  hideVoucherWindow(host, release, false);
  setVoucherInputState(host, true, release, false);
  host.movie.setProperty("lastPurseVoucherResult", {
    status: "ok",
    body,
    source: HABBO_PURSE_HANDLER_SOURCE
  });
  host.logDebug("purse", "ok", "voucher redeem ok");
  return host.showAlert({ msg: "purse_vouchers_success" }, release);
}

export function handleVoucherRedeemErrorPacket(host: HabboPurseRuntimeHost, body: string, release: string): boolean {
  setVoucherInputState(host, true, release);
  const errorCode = body.split(/\t|\r?\n|\r/)[0]?.trim() || "1";
  host.movie.setProperty("lastPurseVoucherResult", {
    status: "error",
    errorCode,
    source: HABBO_PURSE_HANDLER_SOURCE
  });
  host.logDebug("purse", "warn", `voucher redeem error=${errorCode}`);
  return host.showAlert({ msg: `purse_vouchers_error${errorCode}` }, release);
}

export function activatePurseElement(
  host: HabboPurseRuntimeHost,
  elementId: string,
  window: HabboWindowRecord,
  release: string
): boolean {
  const action = resolvePurseAction(elementId);
  if (!action) {
    host.recordUnsupportedOnce(`purse-element-unhandled:${elementId}`, {
      subsystem: "lingo",
      feature: "purse-element-unhandled",
      detail: `${release} Purse Interface Class eventProcPurse received ${elementId}; this purse action is not translated yet`,
      source: HABBO_PURSE_SOURCE
    });
    host.logDebug("purse", "warn", `unhandled element=${elementId}`);
    return false;
  }

  switch (action.kind) {
    case "view-transactions":
      return openPurseTransactions(host, release);
    case "previous-page":
      return showPurseTransactionPage(host, getPursePageView(host) - 1, release);
    case "next-page":
      return showPurseTransactionPage(host, getPursePageView(host) + 1, release);
    case "buy-credits":
      return recordPurseBuyCredits(host, release);
    case "open-voucher":
      return openVoucherFromPurse(host, release);
    case "send-voucher":
      return sendVoucherFromPurse(host, release);
    case "voucher-help":
      return recordPurseVoucherHelp(host, release);
    case "close-voucher":
      return hideVoucherWindow(host, release);
    case "close-purse": {
      const voucherTitle = host.getText(HABBO_PURSE_VOUCHER_TITLE_KEY) ?? HABBO_PURSE_VOUCHER_FALLBACK_TITLE;
      return normalizeSymbolKey(window.id) === normalizeSymbolKey(voucherTitle)
        ? hideVoucherWindow(host, release)
        : hidePurse(host, release);
    }
    default:
      return false;
  }
}

function applyPurseTransactionHeaderTexts(host: HabboPurseRuntimeHost, layoutName: string, userName: string): void {
  host.windowTextValues.set("header2", host.getText("purse_head") ?? "ACCOUNT TRANSACTIONS");
  host.windowTextValues.set("taction_name", userName);
  host.windowTextValues.set("taction_date", host.getText("purse_date") ?? "DATE");
  host.windowTextValues.set("taction_time", host.getText("purse_time") ?? "TIME");
  host.windowTextValues.set("taction_event", host.getText("purse_event") ?? "EVENT");
  host.windowTextValues.set("taction_info", host.getText("purse_info") ?? "DESCRIPTION");
  host.windowTextValues.set("taction_value", host.getText("purse_value") ?? "VALUE");
  host.windowTextValues.set("tactions_note", host.getText("purse_note") ?? "Note this!");
  host.windowTextValues.set("loading", host.getText("loading") ?? "loading");
  if (layoutName === HABBO_PURSE_NO_TRANSACTIONS_LAYOUT) {
    const noEvents = host.getText("purse_noevents") ?? "No transactions.";
    host.windowTextValues.set("no_tactions", noEvents.replaceAll("\\r", "\r"));
    host.windowTextValues.set("purse_buy", host.getText("purse_buy_coins") ?? "Buy Coins");
  }
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}
