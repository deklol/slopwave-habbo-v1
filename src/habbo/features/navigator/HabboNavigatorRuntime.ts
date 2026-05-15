import type {
  DirectorBitmapCompositeLayer,
  DirectorMemberManifest,
  UnsupportedFeature
} from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type { HabboWindowBitmapAsset } from "../../boot/HabboBootResourceTypes";
import {
  coerceRecord,
  directorNumberFromUnknown,
  directorFontFamily,
  directorFontWeight,
  estimateVolterTextWidth,
  normalizeSymbolKey
} from "../../HabboSourceValueHelpers";
import { createRuntimeNavigatorTextMember } from "../../window/HabboRuntimeWindowMembers";
import { readRoomDataStruct, type HabboRoomDataStruct, type HabboRoomRequest } from "../../room/HabboRoomData";
import type {
  HabboWindowElementActivation,
  HabboWindowElementEventKind,
  HabboWindowRecord
} from "../../window/HabboWindowTypes";
import {
  isNavigatorNodeInfo,
  navigatorViewForWindow,
  parseNavigatorFlatResultsPacket,
  parseNavigatorNodeInfoPacket,
  parseNavigatorUserFlatCategoriesPacket,
  navigatorPaletteIndexColor,
  navigatorStatusColor,
  navigatorStatusIndex,
  navigatorDoorIconName,
  readNavigatorHistoryItems,
  readNavigatorRequests,
  type HabboNavigatorHistory,
  type HabboNavigatorNodeInfo,
  type HabboNavigatorRequest,
  type HabboNavigatorView
} from "./HabboNavigatorData";

const navigatorComponentClassSource = "hh_navigator/casts/External/ParentScript 5 - Navigator Component Class.ls";
const navigatorHandlerClassSource = "hh_navigator/casts/External/ParentScript 6 - Navigator Handler Class.ls";
const navigatorRoomlistInterfaceClassSource = "hh_navigator/casts/External/ParentScript 4 - Navigator Roomlist Interface Class.ls";
const navigatorHistoryEntrySymbol = "#entry";
const navigatorHistoryItemHeight = 18;

export interface HabboNavigatorRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;
  nextNavigatorRequestId: number;

  getText(key: string): string | undefined;
  getVariable(name: string): unknown;
  getAnyBitmapAssetByMemberName(memberName: string, preferredCasts?: readonly string[]): HabboWindowBitmapAsset | undefined;
  scheduleDelay(clientId: string, methodName: string, milliseconds: number, argument: unknown, source: string): void;
  executeMessage(message: string, argument: unknown, release: string): unknown;
  createWindow(title: string, template: string | undefined, x: number, y: number): HabboWindowRecord;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  mergeWindowLayout(window: HabboWindowRecord, layoutName: string): void;
  clearWindowElementOverrides(window: HabboWindowRecord): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  removeWindow(title: string): boolean;
  hideWindowElement(window: HabboWindowRecord, elementId: string): void;
  showWindowElement(window: HabboWindowRecord, elementId: string): void;
  moveWindowElementBy(window: HabboWindowRecord, elementId: string, deltaX: number, deltaY: number): void;
  resizeWindowElementBy(window: HabboWindowRecord, elementId: string, deltaWidth: number, deltaHeight: number): void;
  getWindowScrollOffset(window: HabboWindowRecord, elementId: string): number;
  setWindowScrollOffset(window: HabboWindowRecord, elementId: string, offset: number): void;
  getBitmapAssetByMemberName(memberName: string, preferredCasts?: readonly string[]): HabboWindowBitmapAsset | undefined;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  queueRoomRequest(request: Omit<HabboRoomRequest, "id" | "status">, release: string): void;
  readCastListVariable(name: string): readonly string[];
  leaveEntry(release: string): boolean;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function updateNavigatorState(host: HabboNavigatorRuntimeHost, state: string, release: string): boolean {
  const navigatorComponent = host.objectManager.getObject("#navigator_component");
  if (!navigatorComponent) {
    return false;
  }

  navigatorComponent.set("state", state);
  switch (state) {
    case "userLogin": {
      const defaultUnitCatId = stringFromObject(navigatorComponent, "defaultUnitCatId") || "3";
      const defaultFlatCatId = stringFromObject(navigatorComponent, "defaultFlatCatId") || "4";
      setNavigatorProperty(host, "categoryId", defaultUnitCatId, "unit");
      setNavigatorProperty(host, "viewedNodeId", defaultUnitCatId, "unit");
      setNavigatorProperty(host, "roomInfoState", "show", "unit");
      setNavigatorProperty(host, "categoryId", defaultFlatCatId, "flat");
      setNavigatorProperty(host, "viewedNodeId", defaultFlatCatId, "flat");
      setNavigatorProperty(host, "roomInfoState", "show", "flat");
      queueNavigatorRequest(host, { command: "NAVIGATE", nodeId: defaultUnitCatId, depth: 1 }, release);
      queueNavigatorRequest(host, { command: "NAVIGATE", nodeId: defaultFlatCatId, depth: 1 }, release);
      host.scheduleDelay("#navigator_component", "#updateState", 2000, "openNavigator", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.logDebug("navigator", "info", `updateState=userLogin queued default nodes public=${defaultUnitCatId} private=${defaultFlatCatId}`);
      return true;
    }
    case "openNavigator": {
      const shown = showNavigator(host, release);
      host.executeMessage("#updateAvailableFlatCategories", undefined, release);
      host.logDebug("navigator", shown ? "ok" : "warn", `updateState=openNavigator shown=${shown}`);
      return shown;
    }
    case "enterEntry": {
      host.executeMessage("#changeRoom", undefined, release);
      host.executeMessage("#leaveRoom", undefined, release);
      const view = getNavigatorView(host);
      const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
      if (window) {
        applyNavigatorSourceLayoutMutations(host, window, view);
        applyNavigatorWindowState(host, window, view);
        host.syncWindowFieldValueSnapshot();
        host.syncWindowSpriteChannels(release);
      }
      host.logDebug("navigator", "info", "updateState=enterEntry");
      return true;
    }
    case "reset":
    case "":
      return true;
    default:
      host.recordUnsupportedOnce(`navigator-update-state-unhandled:${state}`, {
        subsystem: "lingo",
        feature: "navigator-update-state-unhandled",
        detail: `${release} Navigator Component Class updateState(${state}) is recorded, but only userLogin/openNavigator are modeled in this browser slice`,
        source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
      });
      return false;
  }
}

export function showNavigator(host: HabboNavigatorRuntimeHost, release: string): boolean {
  const navigatorInterface = host.objectManager.getObject("#navigator_interface");
  const openWindow = stringFromObject(navigatorInterface, "openWindow") || "nav_pr";
  return changeNavigatorWindowView(host, openWindow, release);
}

export function hideNavigator(host: HabboNavigatorRuntimeHost, release: string): boolean {
  const removed = host.removeWindow(getNavigatorWindowId(host));
  host.movie.setProperty("navigatorVisible", false);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "info", `hideNavigator removed=${removed}`);
  return true;
}

export function showHideNavigator(host: HabboNavigatorRuntimeHost, release: string): boolean {
  return host.windows.has(normalizeSymbolKey(getNavigatorWindowId(host)))
    ? hideNavigator(host, release)
    : showNavigator(host, release);
}

export function navigatorLeaveRoom(host: HabboNavigatorRuntimeHost, release: string): boolean {
  host.objectManager.getObject("#session")?.set("lastroom", "Entry");
  return showNavigator(host, release);
}

export function changeNavigatorWindowView(host: HabboNavigatorRuntimeHost, windowName: string, release: string): boolean {
  const navigatorInterface = host.objectManager.getObject("#navigator_interface");
  const normalizedWindowName = windowName.endsWith(".window") ? windowName.slice(0, -".window".length) : windowName;
  const windowId = getNavigatorWindowId(host);
  let window = host.windows.get(normalizeSymbolKey(windowId));
  if (!window) {
    window = host.createWindow(windowId, "habbo_basic.window", 345, 20);
    host.registerWindowClient(window, "#navigator_interface");
  }

  host.mergeWindowLayout(window, `${normalizedWindowName}.window`);
  host.clearWindowElementOverrides(window);
  window.procedures.length = 0;
  const view = navigatorViewForWindow(normalizedWindowName);
  const handler = view === "unit" ? "#eventProcNavigatorPublic" : view === "flat" || view === "own" || view === "src" || view === "fav"
    ? "#eventProcNavigatorPrivate"
    : "#eventProcNavigatorModify";
  host.registerWindowProcedure(window, handler, "#navigator_interface", "#mouseDown");
  host.registerWindowProcedure(window, handler, "#navigator_interface", "#mouseUp");
  host.registerWindowProcedure(window, handler, "#navigator_interface", "#keyDown");
  navigatorInterface?.set("openWindow", normalizedWindowName);
  host.movie.setProperty("navigatorVisible", true);
  host.movie.setProperty("navigatorOpenWindow", `${normalizedWindowName}.window`);
  updateNavigatorFeedTextValues(host, view);
  applyNavigatorSourceLayoutMutations(host, window, view);
  applyNavigatorWindowState(host, window, view);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "ok", `ChangeWindowView ${normalizedWindowName}.window view=${view}`);
  return true;
}

export function getNavigatorWindowId(host: HabboNavigatorRuntimeHost): string {
  return stringFromObject(host.objectManager.getObject("#navigator_interface"), "windowTitle") || "Hotel Navigator";
}

export function setNavigatorProperty(
  host: HabboNavigatorRuntimeHost,
  prop: string,
  value: unknown,
  view: HabboNavigatorView = getNavigatorView(host)
): void {
  if (view === "none" || view === "mod") {
    view = "own";
  }

  const navigatorInterface = host.objectManager.getObject("#navigator_interface");
  const props = coerceRecord(navigatorInterface?.get("props"));
  const viewProps = coerceRecord(props[view]);
  navigatorInterface?.set("props", {
    ...props,
    [view]: {
      ...viewProps,
      [prop]: value
    }
  });
}

export function getNavigatorProperty(
  host: HabboNavigatorRuntimeHost,
  prop: string,
  view: HabboNavigatorView = getNavigatorView(host)
): unknown {
  if (view === "none" || view === "mod") {
    view = "own";
  }

  const props = coerceRecord(host.objectManager.getObject("#navigator_interface")?.get("props"));
  return coerceRecord(props[view])[prop];
}

export function getNavigatorView(host: HabboNavigatorRuntimeHost): HabboNavigatorView {
  const openWindow = stringFromObject(host.objectManager.getObject("#navigator_interface"), "openWindow") || "nav_pr";
  return navigatorViewForWindow(openWindow);
}

export function queueNavigatorRequest(
  host: HabboNavigatorRuntimeHost,
  request: Omit<HabboNavigatorRequest, "id" | "status">,
  release: string
): void {
  const queued = readNavigatorRequests(host.movie.getProperty("pendingNavigatorRequests"));
  let nextRequest: HabboNavigatorRequest = {
    id: host.nextNavigatorRequestId++,
    status: "pending",
    ...request
  };
  if (release.startsWith("release14") && nextRequest.command === "NAVIGATE" && nextRequest.nodeMask === undefined) {
    nextRequest = {
      ...nextRequest,
      nodeMask: getNavigatorCurrentNodeMask(host)
    };
  }
  host.movie.setProperty("pendingNavigatorRequests", [...queued, nextRequest]);
  host.logDebug("navigator", "info", `queued ${nextRequest.command}${nextRequest.nodeMask !== undefined ? ` mask=${nextRequest.nodeMask}` : ""}${nextRequest.nodeId ? ` node=${nextRequest.nodeId}` : ""}${nextRequest.flatId ? ` flat=${nextRequest.flatId}` : ""}`, {
    request: nextRequest
  });
}

export function updateNavigatorFeedTextValues(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): void {
  const categoryId = String(getNavigatorProperty(host, "categoryId", view) ?? "");
  const node = getNavigatorNodeInfo(host, categoryId);
  host.windowTextValues.set("nav_roomlist_hd", node?.name ?? "");
  host.windowTextValues.set("nav_roomnfo_hd", getNavigatorRoomInfoHeader(host, view));
  host.windowTextValues.set("nav_roomnfo", getNavigatorRoomInfoText(host, view));
}

export function applyNavigatorWindowState(host: HabboNavigatorRuntimeHost, window: HabboWindowRecord, view: HabboNavigatorView): void {
  const node = getNavigatorViewedNode(host, view);
  const showGo = node !== undefined && (node.nodeType === 1 || node.nodeType === 2 || node.id.startsWith("f_"));
  const showPrivateActions = showGo && (node.nodeType === 2 || node.id.startsWith("f_"));
  const maybeShow = (elementId: string, visible: boolean): void => {
    if (visible) {
      host.showWindowElement(window, elementId);
    } else {
      host.hideWindowElement(window, elementId);
    }
  };

  maybeShow("nav_go_button", showGo);
  maybeShow("nav_modify_button", showPrivateActions);
  maybeShow("nav_addtofavourites_button", showPrivateActions && view !== "fav");
  maybeShow("nav_removefavourites_button", showPrivateActions && view === "fav");
}

export function applyNavigatorSourceLayoutMutations(host: HabboNavigatorRuntimeHost, window: HabboWindowRecord, view: HabboNavigatorView): void {
  const history = view === "unit" || view === "flat" ? buildNavigatorHistory(host, view) : { text: "", items: [] };
  setNavigatorProperty(host, "historyItems", history.items, view);
  host.movie.setProperty("navigatorHistoryItems", history.items);
  host.windowTextValues.set("nav_roomlistBackLinks", history.text);
  const historyLineCount = history.items.length;
  const historyOffset = (historyLineCount * navigatorHistoryItemHeight) + (view === "flat" && historyLineCount > 0 ? 7 : 0);
  if (historyOffset > 0) {
    host.moveWindowElementBy(window, "nav_roomlist_hd", 0, historyOffset);
    for (const elementId of ["nav_roomlist", "nav_scrollbar", "nav_roomlistArea"]) {
      host.moveWindowElementBy(window, elementId, 0, historyOffset);
      host.resizeWindowElementBy(window, elementId, 0, -historyOffset);
    }
  }

  const roomInfoState = String(getNavigatorProperty(host, "roomInfoState", view) ?? "show");
  if (roomInfoState === "hide") {
    for (const elementId of ["nav_roomlist", "nav_scrollbar", "nav_roomlistArea"]) {
      host.resizeWindowElementBy(window, elementId, 0, 96);
    }
  }
}

export function mutateNavigatorRoomInfoArea(
  host: HabboNavigatorRuntimeHost,
  window: HabboWindowRecord,
  view: HabboNavigatorView,
  state: "show" | "hide"
): boolean {
  const currentValue = getNavigatorProperty(host, "roomInfoState", view);
  const currentState = currentValue === undefined || currentValue === null ? "show" : String(currentValue);
  if (currentValue === undefined || currentValue === null) {
    setNavigatorProperty(host, "roomInfoState", "show", view);
  }
  if (currentState === state) {
    return false;
  }

  setNavigatorProperty(host, "roomInfoState", state, view);
  if (state === "hide") {
    setNavigatorProperty(host, "viewedNodeId", undefined, view);
  }

  const offset = state === "show" ? -96 : 96;
  for (const elementId of ["nav_roomlist", "nav_scrollbar", "nav_roomlistArea"]) {
    host.resizeWindowElementBy(window, elementId, 0, offset);
  }
  return true;
}

export function setNavigatorRoomInfoArea(
  host: HabboNavigatorRuntimeHost,
  state: "show" | "hide",
  release: string,
  view: HabboNavigatorView = getNavigatorView(host)
): boolean {
  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  if (!window) {
    return false;
  }

  const changed = mutateNavigatorRoomInfoArea(host, window, view, state);
  if (!changed) {
    return true;
  }

  applyNavigatorWindowState(host, window, view);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "info", `setRoomInfoArea ${state} view=${view}`);
  return true;
}

export function buildNavigatorHistory(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): HabboNavigatorHistory {
  const categoryId = String(getNavigatorProperty(host, "categoryId", view) ?? "");
  if (!categoryId) {
    return { text: "", items: [] };
  }

  const component = host.objectManager.getObject("#navigator_component");
  const categoryIndex = coerceRecord(component?.get("categoryIndex"));
  const rootUnitCatId = stringFromObject(component, "rootUnitCatId");
  const rootFlatCatId = stringFromObject(component, "rootFlatCatId");
  const lines: string[] = [];
  const items: string[] = [];
  const visited = new Set<string>();
  let parentId = getNavigatorParentId(host, categoryId, categoryIndex);
  while (parentId && parentId !== "0" && !visited.has(parentId)) {
    visited.add(parentId);
    const name = getNavigatorCategoryName(host, parentId, categoryIndex);
    if (name) {
      lines.unshift(name);
      items.unshift(parentId);
    }
    if (parentId === rootUnitCatId || parentId === rootFlatCatId) {
      break;
    }
    parentId = getNavigatorParentId(host, parentId, categoryIndex);
  }

  const session = host.objectManager.getObject("#session");
  const lastRoom = session?.get("lastroom");
  if (lastRoom !== undefined && lastRoom !== "Entry") {
    lines.unshift(host.getText("nav_hotelview") ?? "Hotel View");
    items.unshift(navigatorHistoryEntrySymbol);
  }

  return {
    text: lines.join("\r"),
    items
  };
}

export function getNavigatorParentId(host: HabboNavigatorRuntimeHost, nodeId: string, categoryIndex: Readonly<Record<string, unknown>>): string {
  const indexed = coerceRecord(categoryIndex[nodeId]);
  const indexedParent = indexed.parentid ?? indexed.parentId;
  if (indexedParent !== undefined && indexedParent !== null) {
    return String(indexedParent);
  }

  const node = getNavigatorNodeInfo(host, nodeId);
  return node?.parentid ? String(node.parentid) : "";
}

export function getNavigatorCategoryName(host: HabboNavigatorRuntimeHost, nodeId: string, categoryIndex: Readonly<Record<string, unknown>>): string {
  const indexed = coerceRecord(categoryIndex[nodeId]);
  if (typeof indexed.name === "string") {
    return indexed.name;
  }

  return getNavigatorNodeInfo(host, nodeId)?.name ?? "";
}

export function getNavigatorRoomInfoHeader(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): string {
  const node = getNavigatorViewedNode(host, view);
  if (node && node.nodeType === 1) {
    return node.name;
  }
  if (node && (node.nodeType === 2 || node.id.startsWith("f_"))) {
    const count = node.usercount ?? 0;
    const ownerLabel = host.getText("nav_owner") ?? "Owner";
    const owner = node.owner ? ` ${ownerLabel}: ${node.owner}` : "";
    return `${node.name}\r(${count}/25)${owner}`;
  }

  return host.getText(getNavigatorDefaultHelpHeaderKey(view)) ?? "";
}

export function getNavigatorRoomInfoText(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): string {
  const node = getNavigatorViewedNode(host, view);
  if (node && node.nodeType === 1) {
    return getNavigatorPublicNodeDescription(host, node);
  }
  if (node && (node.nodeType === 2 || node.id.startsWith("f_"))) {
    return node.description && node.description.length > 0 ? node.description : "-";
  }

  return host.getText(getNavigatorDefaultHelpTextKey(view)) ?? "";
}

export function getNavigatorViewedNode(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): HabboNavigatorNodeInfo | undefined {
  const viewedNodeId = String(getNavigatorProperty(host, "viewedNodeId", view) ?? "");
  return getNavigatorNodeInfo(host, viewedNodeId);
}

export function getNavigatorDefaultHelpHeaderKey(view: HabboNavigatorView): string {
  return view === "unit" ? "nav_public_helptext_hd" : "nav_private_helptext_hd";
}

export function getNavigatorDefaultHelpTextKey(view: HabboNavigatorView): string {
  switch (view) {
    case "unit":
      return "nav_public_helptext";
    case "src":
      return "nav_search_helptext";
    case "fav":
      return "nav_favourites_helptext";
    case "own":
      return "nav_ownrooms_helptext";
    default:
      return "nav_private_helptext";
  }
}

export function getNavigatorPublicNodeDescription(host: HabboNavigatorRuntimeHost, node: HabboNavigatorNodeInfo): string {
  const unitStrId = node.unitStrId ?? "";
  if (!unitStrId) {
    return node.description ?? "";
  }

  const door = typeof node.door === "number" && node.door > 0 ? node.door : 0;
  const exactKey = `nav_venue_${unitStrId}/${door}_desc`;
  const zeroKey = `nav_venue_${unitStrId}/0_desc`;
  return host.getText(exactKey)
    ?? host.getText(zeroKey)
    ?? node.description
    ?? "";
}

export function getNavigatorNodeInfo(host: HabboNavigatorRuntimeHost, nodeId: string): HabboNavigatorNodeInfo | undefined {
  if (!nodeId) {
    return undefined;
  }

  const component = host.objectManager.getObject("#navigator_component");
  const cache = coerceRecord(component?.get("nodeCache"));
  const direct = cache[nodeId];
  if (isNavigatorNodeInfo(direct)) {
    return direct;
  }

  for (const value of Object.values(cache)) {
    if (!isNavigatorNodeInfo(value)) {
      continue;
    }

    const children = coerceRecord(value.children);
    const child = children[nodeId];
    if (isNavigatorNodeInfo(child)) {
      return child;
    }
  }

  return undefined;
}

export function getNavigatorNodeChildren(host: HabboNavigatorRuntimeHost, nodeId: string): readonly HabboNavigatorNodeInfo[] {
  const node = getNavigatorNodeInfo(host, nodeId);
  if (!node) {
    return [];
  }

  return Object.values(coerceRecord(node.children)).filter(isNavigatorNodeInfo);
}

export function renderNavigatorRoomListText(host: HabboNavigatorRuntimeHost, view: HabboNavigatorView): string {
  const categoryId = String(getNavigatorProperty(host, "categoryId", view) ?? "");
  const children = getNavigatorNodeChildren(host, categoryId);
  if (children.length === 0) {
    const explicitText = host.windowTextValues.get("nav_roomlist");
    if (explicitText) {
      return explicitText;
    }

    return view === "unit"
      ? host.getText("nav_public_helptext") ?? ""
      : host.getText("nav_private_norooms") ?? host.getText("nav_prvrooms_notfound") ?? "";
  }

  return children.map((node) => {
    if (node.nodeType === 2 || node.id.startsWith("f_")) {
      const userCount = node.usercount ?? 0;
      const owner = node.owner ? ` / ${node.owner}` : "";
      return `${node.name}${owner} (${userCount}/25)`;
    }

    return node.name;
  }).join("\r");
}

export function createNavigatorRoomListMember(
  host: HabboNavigatorRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const view = getNavigatorView(host);
  const categoryId = String(getNavigatorProperty(host, "categoryId", view) ?? "");
  const children = getNavigatorNodeChildren(host, categoryId);
  if (children.length === 0) {
    const text = renderNavigatorRoomListText(host, view);
    return createNavigatorEmptyRoomListMember(host, number, window, elementId, geometry, text);
  }

  const rowHeight = 18;
  const sourceHeight = Math.max(geometry.height, children.length * rowHeight);
  const maxOffset = Math.max(0, sourceHeight - geometry.height);
  const offset = Math.max(0, Math.min(maxOffset, host.getWindowScrollOffset(window, elementId)));
  if (offset !== host.getWindowScrollOffset(window, elementId)) {
    host.setWindowScrollOffset(window, elementId, offset);
  }
  const layers = createNavigatorRoomListLayers(host, children, geometry, offset);
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

export function createNavigatorEmptyRoomListMember(
  host: HabboNavigatorRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  text: string
): DirectorMemberManifest {
  const lines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n").filter((line) => line.length > 0);
  const layers: DirectorBitmapCompositeLayer[] = [{
    fillColor: "#ffffff",
    x: 0,
    y: 0,
    width: geometry.width,
    height: geometry.height
  }];
  const [firstLine, ...remainingLines] = lines;
  const hasInlineHeading = remainingLines.length > 0;
  if (firstLine && hasInlineHeading) {
    layers.push({
      text: firstLine,
      color: "#000000",
      fontFamily: directorFontFamily("VB"),
      fontWeight: directorFontWeight("VB", "plain"),
      fontSize: 9,
      lineHeight: 10,
      x: 0,
      y: 0,
      width: geometry.width,
      height: 10
    });
  }
  const bodyLines = hasInlineHeading ? remainingLines : lines;
  if (bodyLines.length > 0) {
    layers.push({
      text: bodyLines.join("\r"),
      color: "#000000",
      fontFamily: directorFontFamily("Volter (Goldfish)"),
      fontWeight: "400",
      fontSize: 9,
      lineHeight: 10,
      x: 0,
      y: hasInlineHeading ? 10 : 0,
      width: geometry.width,
      height: Math.max(10, geometry.height - (hasInlineHeading ? 10 : 0))
    });
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

export function createNavigatorRoomListLayers(
  host: HabboNavigatorRuntimeHost,
  children: readonly HabboNavigatorNodeInfo[],
  geometry: { readonly width: number; readonly height: number },
  scrollOffset = 0
): DirectorBitmapCompositeLayer[] {
  const layers: DirectorBitmapCompositeLayer[] = [{
    fillColor: "#ffffff",
    x: 0,
    y: 0,
    width: geometry.width,
    height: geometry.height
  }];
  const rowHeight = 18;
  const rowImageHeight = 16;
  const sourceListWidth = 311;
  const offset = Math.max(0, Math.round(scrollOffset));
  const firstIndex = Math.max(0, Math.floor(offset / rowHeight));
  const lastIndex = Math.min(children.length, firstIndex + Math.ceil(geometry.height / rowHeight) + 2);
  const visibleNameRows: string[] = [];
  const textY = 3 - (offset % rowHeight);
  for (let index = firstIndex; index < lastIndex; index++) {
    const node = children[index];
    if (!node) {
      continue;
    }

    const y = (index * rowHeight) - offset;
    if (y >= geometry.height || y + rowHeight <= 0) {
      continue;
    }

    visibleNameRows.push(node.name);
    const statusIndex = navigatorStatusIndex(node);
    const isRoom = node.nodeType !== 0 || node.id.startsWith("f_");
    layers.push(...createNavigatorRowBackgroundLayers(host, isRoom ? "room" : "cat", statusIndex, y, sourceListWidth, rowImageHeight));
    const lockName = node.door === "closed" ? "lock1" : node.door === "password" ? "lock2" : undefined;
    if (lockName) {
      const lockAsset = host.getBitmapAssetByMemberName(lockName, ["hh_interface"]);
      if (lockAsset) {
        layers.push({
          assetPath: lockAsset.inkAssetPaths?.["36"] ?? lockAsset.pngPath,
          x: 7,
          y: y + 5,
          width: lockAsset.width,
          height: lockAsset.height,
          sourceWidth: lockAsset.width,
          sourceHeight: lockAsset.height,
          ink: 36
        });
      }
    }

    const actionText = isRoom ? host.getText("nav_gobutton") ?? "Go" : host.getText("nav_openbutton") ?? "Open";
    const actionTextWidth = estimateVolterTextWidth(actionText);
    const actionX = isRoom ? sourceListWidth - actionTextWidth - 12 : sourceListWidth - actionTextWidth - 27;
    layers.push({
      text: actionText,
      fillColor: "#dddddd",
      color: "#000000",
      fontFamily: directorFontFamily("Volter (Goldfish)"),
      fontWeight: "400",
      fontSize: 9,
      lineHeight: 10,
      underline: true,
      x: Math.max(0, actionX),
      y: y + 3,
      width: actionTextWidth,
      height: 11
    });
  }

  layers.push({
    text: visibleNameRows.join("\r"),
    color: "#000000",
    fontFamily: directorFontFamily("Volter (Goldfish)"),
    fontWeight: "400",
    fontSize: 9,
    lineHeight: rowHeight,
    x: 17,
    y: textY,
    width: Math.max(1, sourceListWidth - 98),
    height: Math.max(1, (lastIndex - firstIndex) * rowHeight + 10)
  });

  return layers;
}

export function createNavigatorRowBackgroundLayers(
  host: HabboNavigatorRuntimeHost,
  type: "room" | "cat",
  statusIndex: number,
  y: number,
  width: number,
  height: number
): DirectorBitmapCompositeLayer[] {
  const layers: DirectorBitmapCompositeLayer[] = [];
  const leftAsset = host.getBitmapAssetByMemberName(type === "room" ? "nav_rw_lf" : `nav_rw_lf${statusIndex}`, ["hh_navigator"]);
  const statusAsset = host.getBitmapAssetByMemberName(`nav_rw_lf${statusIndex}`, ["hh_navigator"]);
  const arrowAsset = host.getBitmapAssetByMemberName("nav_rw_arr", ["hh_navigator"]);
  const plusAsset = host.getBitmapAssetByMemberName("nav_rw_plus", ["hh_navigator"]);
  const roomFillColor = navigatorPaletteIndexColor(82);
  const statusColor = navigatorStatusColor(statusIndex);

  if (type === "room") {
    if (leftAsset) {
      layers.push({
        assetPath: leftAsset.inkAssetPaths?.["36"] ?? leftAsset.pngPath,
        x: 0,
        y,
        width: leftAsset.width,
        height: leftAsset.height,
        sourceWidth: leftAsset.width,
        sourceHeight: leftAsset.height
      });
    }
    layers.push({ fillColor: roomFillColor, x: 6, y, width: 240, height });
    if (leftAsset) {
      layers.push({
        assetPath: leftAsset.inkAssetPaths?.["36"] ?? leftAsset.pngPath,
        x: 245,
        y,
        width: leftAsset.width,
        height: leftAsset.height,
        sourceWidth: leftAsset.width,
        sourceHeight: leftAsset.height,
        flipH: true
      });
    }
    if (statusAsset) {
      layers.push({
        assetPath: statusAsset.inkAssetPaths?.["36"] ?? statusAsset.pngPath,
        x: 253,
        y,
        width: statusAsset.width,
        height: statusAsset.height,
        sourceWidth: statusAsset.width,
        sourceHeight: statusAsset.height
      });
    }
    layers.push({ fillColor: statusColor, x: 259, y, width: 46, height });
    if (statusAsset) {
      layers.push({
        assetPath: statusAsset.inkAssetPaths?.["36"] ?? statusAsset.pngPath,
        x: 305,
        y,
        width: statusAsset.width,
        height: statusAsset.height,
        sourceWidth: statusAsset.width,
        sourceHeight: statusAsset.height,
        flipH: true
      });
    }
    if (arrowAsset) {
      layers.push({
        assetPath: arrowAsset.inkAssetPaths?.["36"] ?? arrowAsset.pngPath,
        x: 300,
        y: y + 4,
        width: arrowAsset.width,
        height: arrowAsset.height,
        sourceWidth: arrowAsset.width,
        sourceHeight: arrowAsset.height,
        ink: 36
      });
    }
    return layers;
  }

  if (statusAsset) {
    layers.push({
      assetPath: statusAsset.inkAssetPaths?.["36"] ?? statusAsset.pngPath,
      x: 0,
      y,
      width: statusAsset.width,
      height: statusAsset.height,
      sourceWidth: statusAsset.width,
      sourceHeight: statusAsset.height
    });
  }
  layers.push({ fillColor: statusColor, x: 6, y, width: 305, height });
  if (statusAsset) {
    layers.push({
      assetPath: statusAsset.inkAssetPaths?.["36"] ?? statusAsset.pngPath,
      x: 305,
      y,
      width: statusAsset.width,
      height: statusAsset.height,
      sourceWidth: statusAsset.width,
      sourceHeight: statusAsset.height,
      flipH: true
    });
  }
  if (plusAsset) {
    layers.push({
      assetPath: plusAsset.inkAssetPaths?.["36"] ?? plusAsset.pngPath,
      x: 6,
      y: y + 4,
      width: plusAsset.width,
      height: plusAsset.height,
      sourceWidth: plusAsset.width,
      sourceHeight: plusAsset.height,
      ink: 36
    });
  }
  if (arrowAsset) {
    for (const x of [286, 293, 300]) {
      layers.push({
        assetPath: arrowAsset.inkAssetPaths?.["36"] ?? arrowAsset.pngPath,
        x,
        y: y + 4,
        width: arrowAsset.width,
        height: arrowAsset.height,
        sourceWidth: arrowAsset.width,
        sourceHeight: arrowAsset.height,
        ink: 36
      });
    }
  }
  return layers;
}

export function createNavigatorTextFeedMember(
  host: HabboNavigatorRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const text = host.windowTextValues.get(elementId) ?? "";
  return createRuntimeNavigatorTextMember(number, window, elementId, geometry, text, elementId === "nav_roomnfo");
}

export function createNavigatorHistoryLinksMember(
  host: HabboNavigatorRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const text = host.windowTextValues.get(elementId) ?? "";
  const marginV = Math.trunc(directorNumberFromUnknown(host.getVariable("nav_roomlist_marginv"), 0));
  if (!text) {
    return {
      number,
      name: `runtime.${window.id.name}.${elementId}.feedImage`,
      type: "bitmap",
      width: geometry.width,
      height: geometry.height,
      composite: {
        width: geometry.width,
        height: geometry.height,
        layers: []
      }
    };
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
      layers: [{
        text,
        color: "#336666",
        fontFamily: directorFontFamily("Volter (Goldfish)"),
        fontWeight: "400",
        fontSize: 9,
        lineHeight: navigatorHistoryItemHeight,
        x: 0,
        y: marginV,
        width: geometry.width,
        height: Math.max(1, geometry.height - marginV)
      }]
    }
  };
}

export function createNavigatorInfoIconMember(
  host: HabboNavigatorRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest | undefined {
  const view = getNavigatorView(host);
  const node = getNavigatorViewedNode(host, view);
  const memberName = resolveNavigatorInfoIconMemberName(host, view, node);
  const asset = host.getAnyBitmapAssetByMemberName(memberName, ["hh_interface", "hh_navigator"]);
  if (!asset) {
    return undefined;
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
      layers: [{
        assetPath: asset.inkAssetPaths?.["8"] ?? asset.pngPath,
        // Navigator Window Interface Class calls image.trimWhiteSpace(), then copyPixels
        // centers the trimmed bitmap in nav_roomnfo_icon using ink 8.
        x: 0,
        y: 0,
        width: geometry.width,
        height: geometry.height,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        trimWhitespace: true,
        alignX: "center",
        alignY: "center",
        ink: 8
      }]
    }
  };
}

export function resolveNavigatorInfoIconMemberName(
  host: HabboNavigatorRuntimeHost,
  view: HabboNavigatorView,
  node: HabboNavigatorNodeInfo | undefined
): string {
  if (node && node.nodeType === 1) {
    return resolveNavigatorPublicThumbMemberName(host, node.unitStrId) ?? resolveNavigatorDefaultInfoIconName(view);
  }
  if (node && (node.nodeType === 2 || node.id.startsWith("f_"))) {
    return navigatorDoorIconName(node.door);
  }

  return resolveNavigatorDefaultInfoIconName(view);
}

export function resolveNavigatorPublicThumbMemberName(host: HabboNavigatorRuntimeHost, unitStrId: string | undefined): string | undefined {
  let candidate = unitStrId?.trim() ?? "";
  while (candidate.length > 0) {
    const memberName = `thumb.${candidate}`;
    if (host.getAnyBitmapAssetByMemberName(memberName, ["hh_interface", "hh_navigator"])) {
      return memberName;
    }

    const lastUnderscore = candidate.lastIndexOf("_");
    if (lastUnderscore <= 0) {
      break;
    }
    candidate = candidate.slice(0, lastUnderscore);
  }

  return undefined;
}

export function resolveNavigatorDefaultInfoIconName(view: HabboNavigatorView): string {
  switch (view) {
    case "unit":
      return "nav_ico_def_pr";
    case "src":
      return "nav_ico_def_src";
    case "fav":
      return "nav_ico_def_fav";
    case "own":
      return "nav_ico_def_own";
    default:
      return "nav_ico_def_gr";
  }
}

export function handleNavigatorNodeInfoPacket(host: HabboNavigatorRuntimeHost, body: string, release: string): boolean {
  const parsed = parseNavigatorNodeInfoPacket(body, release);
  if (!parsed) {
    host.recordUnsupportedOnce("navigator-navnodeinfo-parse-failed", {
      subsystem: "network",
      feature: "navigator-navnodeinfo-parse-failed",
      detail: `${release} Navigator Handler Class received NAVNODEINFO, but the browser body reader could not decode a valid root node`,
      source: `extracted/projectorrays/${release}/${navigatorHandlerClassSource}`
    });
    return false;
  }

  const component = host.objectManager.getObject("#navigator_component");
  const nodeCache = {
    ...coerceRecord(component?.get("nodeCache")),
    [parsed.node.id]: parsed.node,
    ...(parsed.node.nodeMask !== undefined ? { [`${parsed.node.id}/${parsed.node.nodeMask}`]: parsed.node } : {})
  };
  const categoryIndex = {
    ...coerceRecord(component?.get("categoryIndex")),
    ...parsed.categoryIndex
  };
  component?.set("nodeCache", nodeCache);
  component?.set("categoryIndex", categoryIndex);
  const view = parsed.node.id === stringFromObject(component, "rootUnitCatId") ? "unit" : "flat";
  setNavigatorProperty(host, "categoryId", parsed.node.id, view);
  setNavigatorProperty(host, "viewedNodeId", parsed.node.id, view);
  const currentView = getNavigatorView(host);
  updateNavigatorFeedTextValues(host, currentView);
  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  if (window) {
    applyNavigatorWindowState(host, window, currentView);
  }
  host.movie.setProperty("navigatorNodeCache", nodeCache);
  host.movie.setProperty("lastNavigatorNodeInfo", parsed.node);
  host.logDebug("navigator", "ok", `NAVNODEINFO id=${parsed.node.id} children=${Object.keys(coerceRecord(parsed.node.children)).length}`);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

export function handleNavigatorUserFlatCatsPacket(host: HabboNavigatorRuntimeHost, body: string, release: string): boolean {
  const categories = parseNavigatorUserFlatCategoriesPacket(body);
  const session = host.objectManager.getObject("#session");
  session?.set("user_flat_cats", categories);
  if (host.movie.getProperty("roomKioskOpenWindow") === "roomatic2.window") {
    const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
    const props = coerceRecord(kioskInterface?.get("roomProps"));
    const firstCategoryId = Object.keys(categories)[0] ?? "";
    if (!props.category && firstCategoryId) {
      props.category = firstCategoryId;
      kioskInterface?.set("roomProps", props);
      host.movie.setProperty("roomKioskProps", props);
      host.movie.setProperty("dropMenuSelections", {
        ...coerceRecord(host.movie.getProperty("dropMenuSelections")),
        roomatic_choosecategory: firstCategoryId
      });
    }
  }
  host.movie.setProperty("navigatorUserFlatCategories", categories);
  host.logDebug("navigator", "ok", `USERFLATCATS count=${Object.keys(categories).length}`);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function handleNavigatorFlatResultsPacket(
  host: HabboNavigatorRuntimeHost,
  packetName: string,
  body: string,
  release: string
): boolean {
  const mode: HabboNavigatorView = packetName === "FLAT_RESULTS" ? "own" : packetName === "SEARCH_FLAT_RESULTS" ? "src" : "fav";
  const node = parseNavigatorFlatResultsPacket(body, mode);
  const component = host.objectManager.getObject("#navigator_component");
  const nodeCache = {
    ...coerceRecord(component?.get("nodeCache")),
    [node.id]: node
  };
  component?.set("nodeCache", nodeCache);
  setNavigatorProperty(host, "categoryId", node.id, mode);
  setNavigatorProperty(host, "viewedNodeId", node.id, mode);
  host.windowTextValues.delete("nav_roomlist");
  const currentView = getNavigatorView(host);
  updateNavigatorFeedTextValues(host, currentView);
  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  if (window) {
    applyNavigatorWindowState(host, window, currentView);
  }
  host.movie.setProperty("navigatorNodeCache", nodeCache);
  host.movie.setProperty("lastNavigatorFlatResults", {
    packetName,
    mode,
    count: Object.keys(coerceRecord(node.children)).length
  });
  host.logDebug("navigator", "ok", `${packetName} mode=${mode} children=${Object.keys(coerceRecord(node.children)).length}`);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function handleNavigatorNoFlatsPacket(host: HabboNavigatorRuntimeHost, packetName: string, release: string): boolean {
  const message = packetName === "NOFLATSFORUSER"
    ? host.getText("nav_private_norooms") ?? "No rooms"
    : host.getText("nav_prvrooms_notfound") ?? "No rooms found";
  host.windowTextValues.set("nav_roomlist", message);
  host.movie.setProperty("lastNavigatorNoFlats", {
    packetName,
    message
  });
  host.logDebug("navigator", "warn", `${packetName} ${message}`);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

export function navigatorSourceEventForElementId(elementId: string): HabboWindowElementEventKind | undefined {
  if (
    elementId === "nav_closeInfo"
    || elementId === "nav_tb_publicRooms"
    || elementId === "nav_tb_guestRooms"
    || elementId === "nav_tab_srch"
    || elementId === "nav_tab_own"
    || elementId === "nav_tab_fav"
    || elementId === "nav_roomlist"
    || elementId === "nav_roomlistBackLinks"
    || elementId === "create_room"
    || elementId === "nav_public_helptext"
  ) {
    return "mouseDown";
  }

  if (
    elementId === "close"
    || elementId === "nav_go_button"
    || elementId === "nav_private_button_search"
    || elementId === "nav_addtofavourites_button"
    || elementId === "nav_removefavourites_button"
    || elementId === "nav_createroom_button"
    || elementId === "nav_createroom_icon"
  ) {
    return "mouseUp";
  }

  return undefined;
}

export function activateNavigatorElement(
  host: HabboNavigatorRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const sourceEvent = navigatorSourceEventForElementId(elementId);
  if (activation?.event && sourceEvent && activation.event !== sourceEvent) {
    return false;
  }

  const view = getNavigatorView(host);
  host.movie.setProperty("lastNavigatorAction", {
    elementId,
    view,
    activation
  });

  switch (elementId) {
    case "close":
      return hideNavigator(host, release);
    case "nav_tb_publicRooms": {
      const component = host.objectManager.getObject("#navigator_component");
      const nodeId = stringFromObject(component, "defaultUnitCatId") || stringFromObject(component, "rootUnitCatId") || "3";
      setNavigatorProperty(host, "categoryId", nodeId, "unit");
      setNavigatorProperty(host, "viewedNodeId", nodeId, "unit");
      queueNavigatorRequest(host, { command: "NAVIGATE", nodeId, depth: 1 }, release);
      return changeNavigatorWindowView(host, "nav_pr", release);
    }
    case "nav_tb_guestRooms": {
      const component = host.objectManager.getObject("#navigator_component");
      const nodeId = stringFromObject(component, "defaultFlatCatId") || stringFromObject(component, "rootFlatCatId") || "4";
      setNavigatorProperty(host, "categoryId", nodeId, "flat");
      setNavigatorProperty(host, "viewedNodeId", nodeId, "flat");
      queueNavigatorRequest(host, { command: "NAVIGATE", nodeId, depth: 1 }, release);
      return changeNavigatorWindowView(host, "nav_gr0", release);
    }
    case "nav_tab_own":
      queueNavigatorOwnRoomsRequest(host, release);
      return changeNavigatorWindowView(host, "nav_gr_own", release);
    case "nav_tab_srch":
      return changeNavigatorWindowView(host, "nav_gr_src", release);
    case "nav_tab_fav":
      queueNavigatorFavoriteRoomsRequest(host, release);
      return changeNavigatorWindowView(host, "nav_gr_fav", release);
    case "nav_roomlist":
      return activateNavigatorRoomList(host, activation, release);
    case "nav_roomlistBackLinks":
      return activateNavigatorHistoryLinks(host, activation, release, view);
    case "nav_closeInfo":
      return setNavigatorRoomInfoArea(host, "hide", release, view);
    case "nav_go_button": {
      const viewedNodeId = String(getNavigatorProperty(host, "viewedNodeId", view) ?? "");
      if (viewedNodeId) {
        return prepareNavigatorRoomEntry(host, viewedNodeId, release);
      }
      return false;
    }
    case "nav_private_button_search":
      return startNavigatorFlatSearch(host, release);
    case "nav_addtofavourites_button":
      return addNavigatorFavoriteRoom(host, release, view);
    case "nav_removefavourites_button":
      return removeNavigatorFavoriteRoom(host, release, view);
    case "create_room":
    case "nav_public_helptext":
    case "nav_createroom_button":
    case "nav_createroom_icon":
      return Boolean(host.executeMessage("#open_roomkiosk", undefined, release));
    default:
      host.recordUnsupportedOnce(`navigator-element-unhandled:${elementId}`, {
        subsystem: "lingo",
        feature: "navigator-element-unhandled",
        detail: `${release} Navigator window procedure received ${elementId}; this global navigator action is not translated yet`,
        source: `extracted/projectorrays/${release}/${navigatorRoomlistInterfaceClassSource}`
      });
      host.logDebug("navigator", "warn", `unhandled element=${elementId} view=${view}`);
      return false;
  }
}

export function queueNavigatorOwnRoomsRequest(host: HabboNavigatorRuntimeHost, release: string): void {
  const session = host.objectManager.getObject("#session");
  const userName = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  host.windowTextValues.set("nav_roomlist", host.getText("loading") ?? "Loading");
  queueNavigatorRequest(host, { command: "SUSERF", userName }, release);
}

export function queueNavigatorFavoriteRoomsRequest(host: HabboNavigatorRuntimeHost, release: string): void {
  host.windowTextValues.set("nav_roomlist", host.getText("loading") ?? "Loading");
  queueNavigatorRequest(host, { command: "GETFVRF" }, release);
}

export function startNavigatorFlatSearch(host: HabboNavigatorRuntimeHost, release: string): boolean {
  const query = String(host.windowTextValues.get("nav_private_search_field") ?? "").trim();
  host.movie.setProperty("lastNavigatorSearch", {
    query,
    source: `extracted/projectorrays/${release}/${navigatorRoomlistInterfaceClassSource}`
  });
  setNavigatorProperty(host, "categoryId", "src", "src");
  setNavigatorProperty(host, "viewedNodeId", undefined, "src");
  if (!query) {
    host.windowTextValues.set("nav_roomlist", host.getText("nav_prvrooms_notfound") ?? "");
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("navigator", "warn", "search empty");
    return true;
  }

  host.windowTextValues.set("nav_roomlist", host.getText("loading") ?? "Loading");
  queueNavigatorRequest(host, { command: "SRCHF", query: `%${query}%` }, release);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "info", `search query length=${query.length}`);
  return true;
}

export function activateNavigatorHistoryLinks(
  host: HabboNavigatorRuntimeHost,
  activation: HabboWindowElementActivation | undefined,
  release: string,
  view: HabboNavigatorView
): boolean {
  let items = readNavigatorHistoryItems(getNavigatorProperty(host, "historyItems", view));
  if (items.length === 0 && (view === "unit" || view === "flat")) {
    items = [...buildNavigatorHistory(host, view).items];
  }
  if (items.length === 0) {
    return false;
  }

  const localY = Math.max(0, Math.trunc(activation?.localY ?? 0));
  const clickedItem = Math.min(items.length, Math.floor(localY / navigatorHistoryItemHeight) + 1);
  const historyItem = items[clickedItem - 1];
  if (!historyItem) {
    return false;
  }

  host.movie.setProperty("lastNavigatorHistoryAction", {
    view,
    localY,
    clickedItem,
    historyItem,
    source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
  });

  if (historyItem === navigatorHistoryEntrySymbol) {
    host.queueRoomRequest({ command: "QUIT" }, release);
    return updateNavigatorState(host, "enterEntry", release);
  }

  return expandNavigatorHistoryNode(host, historyItem, release, view);
}

export function expandNavigatorHistoryNode(host: HabboNavigatorRuntimeHost, nodeId: string, release: string, view: HabboNavigatorView): boolean {
  if (!nodeId) {
    return false;
  }

  host.windowTextValues.set("nav_roomlist", "");
  setNavigatorProperty(host, "categoryId", nodeId, view);
  setNavigatorProperty(host, "viewedNodeId", nodeId, view);
  setNavigatorProperty(host, "roomInfoState", "show", view);
  queueNavigatorRequest(host, { command: "NAVIGATE", nodeId, depth: 1 }, release);

  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  if (window) {
    updateNavigatorFeedTextValues(host, view);
    applyNavigatorSourceLayoutMutations(host, window, view);
    applyNavigatorWindowState(host, window, view);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
  }
  return true;
}

export function addNavigatorFavoriteRoom(host: HabboNavigatorRuntimeHost, release: string, view: HabboNavigatorView): boolean {
  const node = getNavigatorViewedNode(host, view);
  const roomId = node?.nodeType === 1 ? node.id : node?.flatId ?? (node?.id.startsWith("f_") ? node.id.slice(2) : undefined);
  if (!roomId) {
    return false;
  }

  queueNavigatorRequest(host, { command: "ADD_FAVORITE_ROOM", flatId: roomId, roomType: node?.nodeType === 1 ? 1 : 0 }, release);
  queueNavigatorFavoriteRoomsRequest(host, release);
  host.movie.setProperty("lastNavigatorFavoriteAction", {
    action: "add",
    flatId: roomId,
    roomType: node?.nodeType === 1 ? 1 : 0,
    source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
  });
  host.logDebug("navigator", "info", `favorite add flat=${roomId}`);
  return true;
}

export function removeNavigatorFavoriteRoom(host: HabboNavigatorRuntimeHost, release: string, view: HabboNavigatorView): boolean {
  const node = getNavigatorViewedNode(host, view);
  const roomId = node?.nodeType === 1 ? node.id : node?.flatId ?? (node?.id.startsWith("f_") ? node.id.slice(2) : undefined);
  if (!roomId) {
    return false;
  }

  queueNavigatorRequest(host, { command: "DEL_FAVORITE_ROOM", flatId: roomId, roomType: node?.nodeType === 1 ? 1 : 0 }, release);
  setNavigatorProperty(host, "viewedNodeId", undefined, view);
  queueNavigatorFavoriteRoomsRequest(host, release);
  host.movie.setProperty("lastNavigatorFavoriteAction", {
    action: "remove",
    flatId: roomId,
    roomType: node?.nodeType === 1 ? 1 : 0,
    source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
  });
  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  if (window) {
    applyNavigatorWindowState(host, window, view);
  }
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "info", `favorite remove flat=${roomId}`);
  return true;
}

export function activateNavigatorRoomList(
  host: HabboNavigatorRuntimeHost,
  activation: HabboWindowElementActivation | undefined,
  release: string
): boolean {
  const view = getNavigatorView(host);
  const categoryId = String(getNavigatorProperty(host, "categoryId", view) ?? "");
  const children = getNavigatorNodeChildren(host, categoryId);
  if (children.length === 0) {
    return true;
  }

  const window = host.windows.get(normalizeSymbolKey(getNavigatorWindowId(host)));
  const scrollOffset = window ? host.getWindowScrollOffset(window, "nav_roomlist") : 0;
  const localY = Math.max(0, Math.round((activation?.localY ?? 0) + scrollOffset));
  const index = Math.min(children.length - 1, Math.floor(localY / 18));
  const node = children[index];
  if (!node) {
    return true;
  }

  setNavigatorProperty(host, "viewedNodeId", node.id, view);
  if (node.nodeType === 0) {
    queueNavigatorRequest(host, { command: "NAVIGATE", nodeId: node.id, depth: 1 }, release);
    setNavigatorProperty(host, "categoryId", node.id, view);
  } else if ((activation?.localX ?? 0) > 255) {
    return prepareNavigatorRoomEntry(host, node.id, release);
  } else {
    if (window) {
      mutateNavigatorRoomInfoArea(host, window, view, "show");
    }
  }
  updateNavigatorFeedTextValues(host, view);
  if (window) {
    applyNavigatorWindowState(host, window, view);
  }
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("navigator", "info", `roomlist selected id=${node.id} name=${node.name}`);
  return true;
}

export function prepareNavigatorRoomEntry(host: HabboNavigatorRuntimeHost, nodeId: string, release: string): boolean {
  const node = getNavigatorNodeInfo(host, nodeId);
  if (!node) {
    return false;
  }

  if (node.nodeType === 1 || node.nodeType === 2 || node.id.startsWith("f_")) {
    const roomData = buildNavigatorRoomDataStruct(host, node);
    if (!roomData) {
      return false;
    }

    host.movie.setProperty("pendingRoomEntry", {
      ...roomData,
      nodeId: node.id,
      source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
    });
    host.logDebug("navigator", "info", `prepareRoomEntry node=${node.id} name=${node.name} type=${roomData.type}`);
    host.recordUnsupportedOnce("navigator-room-entry-flow-partial", {
      subsystem: "habbo",
      feature: "navigator-room-entry-flow-partial",
      detail: `${release} Navigator Component Class prepareRoomEntry now hands the source room struct to #executeRoomEntry; room object rendering, furniture state, and full room programs remain partial`,
      source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
    });
    return Boolean(host.executeMessage("#executeRoomEntry", roomData, release));
  }

  queueNavigatorRequest(host, { command: "NAVIGATE", nodeId: node.id, depth: 1 }, release);
  setNavigatorProperty(host, "categoryId", node.id, getNavigatorView(host));
  return true;
}

export function buildNavigatorRoomDataStruct(host: HabboNavigatorRuntimeHost, node: HabboNavigatorNodeInfo): HabboRoomDataStruct | undefined {
  if (node.nodeType === 1) {
    return {
      id: String(node.id),
      name: node.name,
      type: "public",
      ...(node.unitStrId !== undefined ? { marker: node.unitStrId } : {}),
      ...(node.port !== undefined ? { port: node.port } : {}),
      ...(node.door !== undefined ? { door: node.door } : {}),
      teleport: 0,
      casts: node.casts ?? []
    };
  }

  if (node.nodeType === 2 || node.id.startsWith("f_")) {
    const roomId = node.flatId ?? node.id.replace(/^f_/, "");
    return {
      id: roomId,
      name: node.name,
      ...(node.owner !== undefined ? { owner: node.owner } : {}),
      ...(node.door !== undefined ? { door: node.door } : {}),
      type: "private",
      teleport: 0,
      casts: host.readCastListVariable("room.cast.private")
    };
  }

  return undefined;
}

export function executeNavigatorRoomEntry(host: HabboNavigatorRuntimeHost, argument: unknown, release: string): boolean {
  const roomData = readRoomDataStruct(argument);
  if (!roomData) {
    host.recordUnsupportedOnce("navigator-room-data-invalid", {
      subsystem: "habbo",
      feature: "navigator-room-data-invalid",
      detail: `${release} Navigator Component Class executeRoomEntry was called without a valid room struct`,
      source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
    });
    return false;
  }

  host.movie.setProperty("lastNavigatorRoomEntry", roomData);
  hideNavigator(host, release);
  if (stringFromSession(host.objectManager.getObject("#session"), "lastroom") === "Entry") {
    host.leaveEntry(release);
  }
  host.objectManager.getObject("#session")?.set("lastroom", roomData);
  host.logDebug("navigator", "info", `executeRoomEntry id=${roomData.id} type=${roomData.type} name=${roomData.name}`);
  return Boolean(host.executeMessage("#enterRoom", roomData, release));
}

function getNavigatorCurrentNodeMask(host: HabboNavigatorRuntimeHost): number {
  const value = host.objectManager.getObject("#navigator_component")?.get("hideFullRoomsFlag");
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric !== 0 ? 1 : 0;
}

function stringFromObject(object: HabboVariableObject | undefined, key: string): string {
  const value = object?.get(key);
  return typeof value === "string" ? value : "";
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" ? value : "";
}
