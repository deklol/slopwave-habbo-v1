import { LingoSymbol } from "../../lingo";
import type { HabboAlertDescriptor } from "../HabboAlertManager";
import { serializeAlert } from "../HabboRuntimeSerialization";
import {
  capitalizeMenuLabel,
  coerceRecord,
  countWindowElements,
  normalizeCastName,
  normalizeMemberName,
  normalizeSymbolish,
  normalizeSymbolKey,
  numberFromUnknown,
  numberProperty,
  parseWindowRect,
  sanitizeRoomKioskPasswordInput,
  stringListProperty,
  stringProperty,
  textAlignProperty
} from "../HabboSourceValueHelpers";
import type { DirectorMember, DirectorMemberRef, DirectorSpriteChannelManifest } from "../../runtime";
import {
  resolveEntryBarAction
} from "../ui/HabboEntryBarActions";
import {
  HABBO_ROOM_INTERFACE_SOURCE,
  resolveRoomBarAction
} from "../ui/HabboRoomBarActions";
import {
  parseRoomObjectInteractiveId,
  parseRoomUserInteractiveId,
  roomObjectInteractiveId,
  type HabboRoomSelectableObjectKind
} from "../room/HabboRoomSelection";
import { isRoomObjectRecord, type HabboRoomObjectRecord } from "../room/HabboRoomObjectData";
import { readRoomVisual } from "../room/HabboRoomData";
import {
  readRoomObjectSpriteEntries,
  readSpriteManifestArray
} from "../room/HabboRoomObjectSpritePlanning";
import { roomObjectHasSourceSelectOverride } from "../ui/HabboRoomObjectInteractions";
import { HABBO_ROOM_HAND_VISUALIZER_ID } from "../ui/HabboRoomHand";
import { readRoomHandInteractiveElements } from "../features/inventory-hand/HabboInventoryHandData";
import { isCatalogueRuntimeInteractiveElementId } from "../ui/HabboCatalogueDialog";
import { isPasswordElementId } from "../features/edit-habbo/HabboRegistrationData";
import {
  collectHelpTopics,
  HABBO_CALL_FOR_HELP_FALLBACK_TITLE,
  HABBO_CALL_FOR_HELP_LAYOUT,
  HABBO_CALL_FOR_HELP_SENT_LAYOUT,
  HABBO_CALL_FOR_HELP_TITLE_KEY,
  HABBO_HELP_FALLBACK_TITLE,
  HABBO_HELP_LAYOUT,
  HABBO_HELP_TITLE_KEY,
  helpTopicUrlKeyFromLocalY
} from "../ui/HabboHelpDialog";
import { classifySourceWindowCloseElement, type HabboWindowCloseMatch } from "../ui/HabboWindowClose";
import type { HabboExternalCastWindowLayout, HabboWindowLayoutElement } from "../boot/HabboBootResourceTypes";
import {
  estimateDialogWriterImageSize,
  estimateDialogWriterWrappedHeight,
  checkboxRegistrationPropForElementId,
  isEditableWindowField,
  isWindowDragElement,
  applyWindowElementGeometryOverride,
  resolveLayoutBorder,
  resolveLayoutRenderSize,
  resolveWindowElementGeometry,
  resolveWindowContentTargetSize,
  zeroWindowBorder
} from "./HabboWindowLayoutHelpers";
import { resolveRoomKioskSourceControlState } from "../ui/HabboRoomKioskDialog";
import type {
  HabboWindowElementActivation,
  HabboWindowElementEventKind,
  HabboWindowElementOverride,
  HabboWindowInteractiveElement,
  HabboWindowProcedureRecord,
  HabboWindowRecord
} from "./HabboWindowTypes";
import {
  dedupeWindowInteractiveElements,
  isHabboWindowInteractiveElement,
  mergeWindowInteractiveElements,
  windowScrollKey
} from "./HabboWindowRuntimeData";

export interface HabboWindowRuntimeHost {
  [key: string]: any;
}

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";
const roomComponentClassSource = "hh_room/casts/External/ParentScript 4 - Room Component Class.ls";

export function collectInteractiveElementRuntime(
  host: HabboWindowRuntimeHost,
  interactiveElements: HabboWindowInteractiveElement[],
  window: HabboWindowRecord,
  sourceLayout: HabboExternalCastWindowLayout,
  element: HabboWindowLayoutElement,
  x: number,
  y: number,
  geometry: { readonly width: number; readonly height: number },
  geometryTarget: { readonly width: number; readonly height: number },
  originX: number,
  originY: number
): void {
  if (!element.id || geometry.width <= 0 || geometry.height <= 0) {
    return;
  }

  const editable = host.isOpenWindowElementEditable(window, element);
  const cursor = stringProperty(element.properties, "cursor");
  const isButton = element.type === "button";
  const isScrollbar = element.type === "scrollbarv";
  const isDropMenu = element.type === "dropmenu";
  const isDrag = isWindowDragElement(element);
  const isClose = classifySourceWindowCloseElement(element.id, element) !== undefined;
  const isCatalogueEventTarget = window.procedures.some((procedure: HabboWindowProcedureRecord) => {
    return procedure.clientId.equals("#catalogue_interface")
      && procedure.handler.equals("#eventProcCatalogue")
      && isCatalogueRuntimeInteractiveElementId(element.id ?? "");
  });
  const isLink = !editable && !isButton && (cursor === "cursor.finger" || isCatalogueEventTarget || isClose);
  const scrollbarClientId = isScrollbar ? stringProperty(element.properties, "client") : undefined;
  if (!editable && !isButton && !isLink && !isScrollbar && !isDropMenu && !isDrag) {
    return;
  }

  const interactiveGeometry = isDropMenu
    ? host.resolveDropMenuSpriteGeometry(element, geometry, x, y)
    : { x, y, width: geometry.width, height: geometry.height };
  const scrollbarClientElement = scrollbarClientId
    ? sourceLayout.elements.find((candidate) => candidate.id === scrollbarClientId)
    : undefined;
  const scrollbarClientGeometry = scrollbarClientElement
    ? applyWindowElementGeometryOverride(
      resolveWindowElementGeometry(sourceLayout, scrollbarClientElement, geometryTarget.width, geometryTarget.height),
      host.getWindowElementOverride(window, scrollbarClientElement.id)
    )
    : undefined;
  const elementCursor = isDrag ? "move" : isClose ? "cursor.finger" : cursor;
  const nextElement: HabboWindowInteractiveElement = {
    id: element.id,
    windowId: window.id.toString(),
    kind: editable ? "field" : isButton ? "button" : isScrollbar ? "scrollbar" : isDropMenu ? "dropmenu" : isDrag ? "drag" : "link",
    x: interactiveGeometry.x,
    y: interactiveGeometry.y,
    width: interactiveGeometry.width,
    height: interactiveGeometry.height,
    label: resolveElementLabelRuntime(host, element),
    editable,
    password: isPasswordElementId(element.id),
    textAlign: textAlignProperty(element.properties),
    ...(scrollbarClientId !== undefined ? { clientId: scrollbarClientId } : {}),
    ...(scrollbarClientGeometry !== undefined ? {
      scrollClientX: originX + scrollbarClientGeometry.x,
      scrollClientY: originY + scrollbarClientGeometry.y,
      scrollClientWidth: scrollbarClientGeometry.width,
      scrollClientHeight: scrollbarClientGeometry.height
    } : {}),
    ...(elementCursor !== undefined ? { cursor: elementCursor } : {})
  };
  const existingIndex = interactiveElements.findIndex((candidate) => {
    return candidate.id === nextElement.id
      && candidate.windowId === nextElement.windowId
      && candidate.kind === nextElement.kind;
  });
  if (existingIndex === -1) {
    interactiveElements.push(nextElement);
    return;
  }

  interactiveElements[existingIndex] = mergeWindowInteractiveElements(interactiveElements[existingIndex]!, nextElement);
}

export function isWindowElementPressedRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  sourceKind: "template" | "content"
): boolean {
  if (sourceKind !== "content" || !element.id) {
    return false;
  }

  const pressed = host.movie.getProperty("pressedWindowElement");
  if (typeof pressed !== "object" || pressed === null) {
    return false;
  }

  const record = pressed as Record<string, unknown>;
  if (record.elementId !== element.id) {
    return false;
  }

  const pressedWindowId = typeof record.windowId === "string" ? record.windowId : "";
  return !pressedWindowId || normalizeSymbolKey(pressedWindowId) === normalizeSymbolKey(window.id);
}

export function resolveInteractiveSpriteBoundsRuntime(
  sprite: DirectorSpriteChannelManifest,
  member: DirectorMember | undefined
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const width = Math.max(1, Math.round(sprite.width ?? member?.width ?? 1));
  const height = Math.max(1, Math.round(sprite.height ?? member?.height ?? 1));
  const sourceWidth = Math.max(1, Math.round(member?.composite?.width ?? member?.width ?? width));
  const sourceHeight = Math.max(1, Math.round(member?.composite?.height ?? member?.height ?? height));
  const regPoint = member?.regPoint ?? { x: 0, y: member?.height ?? height };
  const scaledRegX = Math.trunc((regPoint.x * width) / sourceWidth);
  const scaledRegY = Math.trunc((regPoint.y * height) / sourceHeight);
  const effectiveRegX = sprite.flipH ? width - scaledRegX : scaledRegX;
  const effectiveRegY = sprite.flipV ? height - scaledRegY : scaledRegY;

  return {
    x: Math.round(sprite.loc.x - effectiveRegX),
    y: Math.round(sprite.loc.y - effectiveRegY),
    width,
    height
  };
}

export function collectRoomObjectInteractiveElementsRuntime(
  host: HabboWindowRuntimeHost,
  interactiveElements: HabboWindowInteractiveElement[]
): void {
  const sprites = readSpriteManifestArray(host.movie.getProperty("roomObjectOverlaySprites"));
  const entries = readRoomObjectSpriteEntries(host.movie.getProperty("roomObjectOverlaySpriteEntries"));
  if (sprites.length === 0 || entries.length === 0) {
    return;
  }

  const component = host.objectManager.getObject("#room_component");
  const objectsByKind: Record<HabboRoomSelectableObjectKind, Record<string, HabboRoomObjectRecord>> = {
    active: coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>,
    passive: coerceRecord(component?.get("passiveObjects")) as Record<string, HabboRoomObjectRecord>,
    item: coerceRecord(component?.get("itemObjects")) as Record<string, HabboRoomObjectRecord>
  };
  const spritesByChannel = new Map(sprites.map((sprite) => [sprite.channel, sprite]));
  const boundsByObject = new Map<string, {
    id: string;
    kind: HabboRoomSelectableObjectKind;
    label: string;
    cursor?: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    locZ: number;
  }>();

  for (const entry of entries) {
    const object = objectsByKind[entry.kind][entry.id];
    if (!isRoomObjectRecord(object)) {
      continue;
    }

    const sprite = spritesByChannel.get(entry.channel);
    if (!sprite) {
      continue;
    }

    const member = host.movie.cast.getMember(sprite.member);
    const bounds = resolveInteractiveSpriteBoundsRuntime(sprite, member);
    const x1 = bounds.x;
    const y1 = bounds.y;
    const x2 = x1 + bounds.width;
    const y2 = y1 + bounds.height;
    const key = `${entry.kind}:${entry.id}`;
    const current = boundsByObject.get(key);
    if (!current) {
      const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
      const hasSelectableSource = entry.kind !== "passive" || roomObjectHasSourceSelectOverride(sourceClassValue);
      boundsByObject.set(key, {
        id: entry.id,
        kind: entry.kind,
        label: host.resolveRoomObjectLabel(object),
        ...(hasSelectableSource ? { cursor: "cursor.finger" } : {}),
        x1,
        y1,
        x2,
        y2,
        locZ: sprite.locZ ?? 0
      });
      continue;
    }

    current.x1 = Math.min(current.x1, x1);
    current.y1 = Math.min(current.y1, y1);
    current.x2 = Math.max(current.x2, x2);
    current.y2 = Math.max(current.y2, y2);
    current.locZ = Math.max(current.locZ, sprite.locZ ?? 0);
  }

  for (const bounds of [...boundsByObject.values()].sort((left, right) => left.locZ - right.locZ)) {
    const width = Math.max(1, bounds.x2 - bounds.x1);
    const height = Math.max(1, bounds.y2 - bounds.y1);
    interactiveElements.push({
      id: roomObjectInteractiveId(bounds.kind, bounds.id),
      windowId: "Room",
      kind: "room_object",
      x: bounds.x1,
      y: bounds.y1,
      width,
      height,
      label: bounds.label,
      ...(bounds.cursor !== undefined ? { cursor: bounds.cursor } : {})
    });
  }
}

export function collectRoomHandInteractiveElementsRuntime(
  host: HabboWindowRuntimeHost,
  interactiveElements: HabboWindowInteractiveElement[]
): void {
  if (host.movie.getProperty("roomHandVisible") !== true) {
    return;
  }

  interactiveElements.push(...readRoomHandInteractiveElements(host.movie.getProperty("roomHandInteractiveElements")));
}

export function syncRoomInteractiveElementsRuntime(host: HabboWindowRuntimeHost): void {
  const current = host.movie.getProperty("windowInteractiveElements");
  const existingElements = Array.isArray(current)
    ? current.filter((entry): entry is HabboWindowInteractiveElement => isHabboWindowInteractiveElement(entry))
    : [];
  const directorRoomControls = readDirectorRoomControlElements(host.movie.getProperty("directorRoomInteractiveElements"));
  const windowElements = existingElements.filter((entry) => {
    return entry.windowId !== "Room"
      && entry.kind !== "room"
      && entry.kind !== "room_user"
      && entry.kind !== "room_object"
      && entry.windowId !== HABBO_ROOM_HAND_VISUALIZER_ID;
  });
  const roomElements: HabboWindowInteractiveElement[] = [];
  if (host.movie.getProperty("roomActive") === true && readRoomVisual(host.movie.getProperty("currentRoomVisual"))) {
    roomElements.push({
      id: "room_canvas",
      windowId: "Room",
      kind: "room",
      x: 0,
      y: 0,
      width: host.movie.stage.width,
      height: host.movie.stage.height,
      label: "Room"
    });
    collectRoomObjectInteractiveElementsRuntime(host, roomElements);
    host.collectRoomUserInteractiveElements(roomElements);
    collectRoomHandInteractiveElementsRuntime(host, roomElements);
  }

  const mergedRoomElements = [...roomElements];
  for (const element of directorRoomControls) {
    if (!mergedRoomElements.some((candidate) => candidate.id === element.id)) {
      mergedRoomElements.push(element);
    }
  }

  host.movie.setProperty("windowInteractiveElements", dedupeWindowInteractiveElements([
    ...mergedRoomElements,
    ...windowElements
  ]));
}

function readDirectorRoomControlElements(value: unknown): readonly HabboWindowInteractiveElement[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboWindowInteractiveElement => {
    return isHabboWindowInteractiveElement(entry)
      && entry.windowId === "Room"
      && entry.kind !== "room"
      && entry.kind !== "room_user"
      && entry.kind !== "room_object";
  });
}

export function resolveElementLabelRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): string {
  const key = element.key?.trim();
  if (key) {
    return host.texts.get(key) ?? key;
  }

  return element.id ?? element.memberName ?? "window element";
}

export function resolveWindowElementTextRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement
): string | undefined {
  if (element.key === "%title") {
    return window.title ?? window.id.name;
  }

  return element.id ? host.windowTextValues.get(element.id) : undefined;
}

export function getEditableDisplayTextRuntime(host: HabboWindowRuntimeHost, elementId: string): string | undefined {
  const value = host.loginFieldValues.get(elementId)
    ?? host.registrationFieldValues.get(elementId)
    ?? host.windowTextValues.get(elementId);
  if (value === undefined) {
    return undefined;
  }

  return isPasswordElementId(elementId) ? "*".repeat(value.length) : value;
}

export function syncDirectorOverlaySpritesRuntime(host: HabboWindowRuntimeHost): void {
  const entryVisualSprites = readSpriteManifestArray(host.movie.getProperty("entryVisualOverlaySprites"));
  const showRoomSprites = host.movie.getProperty("roomActive") === true || !isRelease1PreRevealRoomRuntime(host.movie.id);
  const roomVisualSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomVisualOverlaySprites")) : [];
  const roomObjectSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomObjectOverlaySprites")) : [];
  const roomObjectMoverSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomObjectMoverOverlaySprites")) : [];
  const roomCoverSprites = readSpriteManifestArray(host.movie.getProperty("roomCoverOverlaySprites"));
  const roomUserSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomUserOverlaySprites")) : [];
  const roomChatSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomChatOverlaySprites")) : [];
  const roomHiliterSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomHiliterOverlaySprites")) : [];
  const roomHandSprites = showRoomSprites ? readSpriteManifestArray(host.movie.getProperty("roomHandOverlaySprites")) : [];
  const logoSprites = readSpriteManifestArray(host.movie.getProperty("logoOverlaySprites"));
  const windowSprites = readSpriteManifestArray(host.movie.getProperty("windowOverlaySprites"));
  const loadingBarSprites = readSpriteManifestArray(host.movie.getProperty("loadingBarOverlaySprites"));
  host.movie.setProperty("directorOverlaySprites", [...entryVisualSprites, ...roomVisualSprites, ...roomObjectSprites, ...roomObjectMoverSprites, ...roomHiliterSprites, ...roomUserSprites, ...roomChatSprites, ...roomHandSprites, ...roomCoverSprites, ...logoSprites, ...windowSprites, ...loadingBarSprites]);
}

function isRelease1PreRevealRoomRuntime(movieId: string): boolean {
  return movieId.startsWith("release1_roseau_dcr0910");
}

export function getRuntimeWindowCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeWindowCastSlot !== undefined) {
    return host.runtimeWindowCastSlot;
  }

  const usedSlots = new Set(host.loadedCastSlots.values());
  const emptySlot = host.movie.cast.castLibs
    .filter((cast: { readonly name?: string; readonly number: number }) => normalizeCastName(cast.name ?? "").startsWith("empty") && !usedSlots.has(cast.number))
    .map((cast: { readonly number: number }) => cast.number)
    .sort((left: number, right: number) => left - right)[0];

  host.runtimeWindowCastSlot = emptySlot ?? 10000;
  return host.runtimeWindowCastSlot;
}

export function getRuntimeLoadingCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeLoadingCastSlot !== undefined) {
    return host.runtimeLoadingCastSlot;
  }

  host.runtimeLoadingCastSlot = 10001;
  return host.runtimeLoadingCastSlot;
}

export function getRuntimeLogoCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeLogoCastSlot !== undefined) {
    return host.runtimeLogoCastSlot;
  }

  host.runtimeLogoCastSlot = 10002;
  return host.runtimeLogoCastSlot;
}

export function getRuntimeEntryVisualCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeEntryVisualCastSlot !== undefined) {
    return host.runtimeEntryVisualCastSlot;
  }

  host.runtimeEntryVisualCastSlot = 10008;
  return host.runtimeEntryVisualCastSlot;
}

export function getRuntimeRoomCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeRoomCastSlot !== undefined) {
    return host.runtimeRoomCastSlot;
  }

  host.runtimeRoomCastSlot = 10003;
  return host.runtimeRoomCastSlot;
}

export function getRuntimeRoomVisualCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeRoomVisualCastSlot !== undefined) {
    return host.runtimeRoomVisualCastSlot;
  }

  host.runtimeRoomVisualCastSlot = 10004;
  return host.runtimeRoomVisualCastSlot;
}

export function getRuntimeRoomObjectCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeRoomObjectCastSlot !== undefined) {
    return host.runtimeRoomObjectCastSlot;
  }

  host.runtimeRoomObjectCastSlot = 10005;
  return host.runtimeRoomObjectCastSlot;
}

export function getRuntimeRoomChatCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeRoomChatCastSlot !== undefined) {
    return host.runtimeRoomChatCastSlot;
  }

  host.runtimeRoomChatCastSlot = 10006;
  return host.runtimeRoomChatCastSlot;
}

export function getRuntimeRoomCoverCastSlotRuntime(host: HabboWindowRuntimeHost): number {
  if (host.runtimeRoomCoverCastSlot !== undefined) {
    return host.runtimeRoomCoverCastSlot;
  }

  host.runtimeRoomCoverCastSlot = 10007;
  return host.runtimeRoomCoverCastSlot;
}

export function findOpenWindowElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  windowId?: string
): {
  readonly window: HabboWindowRecord;
  readonly layout: HabboExternalCastWindowLayout;
  readonly element: HabboWindowLayoutElement;
  readonly geometryTarget: { readonly width: number; readonly height: number };
  readonly geometry: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
} | undefined {
  const windowKey = windowId ? normalizeSymbolKey(windowId) : undefined;
  for (const window of [...host.windows.values()].reverse()) {
    if (windowKey && normalizeSymbolKey(window.id) !== windowKey) {
      continue;
    }

    if (!window.mergedLayout) {
      continue;
    }

    const layout = host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => {
      return entry.memberName.toLowerCase() === window.mergedLayout?.memberName.toLowerCase();
    });
    if (!layout) {
      continue;
    }

    const geometryTarget = resolveWindowContentTargetSize(window, layout);
    const contentElement = layout.elements.find((candidate: HabboWindowLayoutElement) => candidate.id === elementId);
    if (contentElement) {
      const geometry = applyWindowElementGeometryOverride(
        resolveWindowElementGeometry(layout, contentElement, geometryTarget.width, geometryTarget.height),
        host.getWindowElementOverride(window, contentElement.id)
      );
      return {
        window,
        layout,
        element: contentElement,
        geometryTarget,
        geometry
      };
    }

    const templateLayout = window.template
      ? host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === window.template?.toLowerCase())
      : undefined;
    if (!templateLayout) {
      continue;
    }

    const templateElement = templateLayout.elements.find((candidate: HabboWindowLayoutElement) => candidate.id === elementId);
    if (!templateElement) {
      continue;
    }

    const border = resolveLayoutBorder(templateLayout);
    const templateGeometryTarget = {
      width: border.left + geometryTarget.width + border.right,
      height: border.top + geometryTarget.height + border.bottom
    };
    return {
      window,
      layout: templateLayout,
      element: templateElement,
      geometryTarget: templateGeometryTarget,
      geometry: resolveWindowElementGeometry(
        templateLayout,
        templateElement,
        templateGeometryTarget.width,
        templateGeometryTarget.height
      )
    };
  }

  return undefined;
}

export function removeLoginWindowPairRuntime(host: HabboWindowRuntimeHost, release: string): void {
  const removed = [host.removeWindow("#login_a"), host.removeWindow("#login_b")].filter(Boolean).length;
  host.loginFieldValues.clear();
  host.movie.setProperty("loginWindowsVisible", false);
  host.movie.setProperty("loginUserFoundVisible", false);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "info", `remove login windows removed=${removed}`);
}

export function removeWindowRuntime(host: HabboWindowRuntimeHost, id: LingoSymbol | string): boolean {
  const key = normalizeSymbolKey(id);
  host.windowElementOverrides.delete(key);
  for (const offsetKey of [...host.windowScrollOffsets.keys()]) {
    if (offsetKey.startsWith(`${key}:`)) {
      host.windowScrollOffsets.delete(offsetKey);
    }
  }
  return host.windows.delete(key);
}

export function moveWindowByIdRuntime(
  host: HabboWindowRuntimeHost,
  windowId: string,
  offsetX: number,
  offsetY: number,
  release: string
): boolean {
  const window = host.windows.get(normalizeSymbolKey(windowId));
  if (!window || window.x === undefined || window.y === undefined) {
    return false;
  }

  const activated = host.activateWindow(window);
  const deltaX = Math.round(offsetX);
  const deltaY = Math.round(offsetY);
  if (deltaX === 0 && deltaY === 0) {
    if (activated) {
      host.syncWindowSnapshot();
      host.syncWindowSpriteChannels(release);
    }
    return true;
  }

  const layout = window.mergedLayout
    ? host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === window.mergedLayout?.memberName.toLowerCase())
    : undefined;
  const templateLayout = window.template
    ? host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === window.template?.toLowerCase())
    : undefined;
  const contentSize = layout ? resolveWindowContentTargetSize(window, layout) : { width: 1, height: 1 };
  const templateBorder = templateLayout ? resolveLayoutBorder(templateLayout) : zeroWindowBorder();
  const windowWidth = templateLayout ? templateBorder.left + contentSize.width + templateBorder.right : contentSize.width;
  const windowHeight = templateLayout ? templateBorder.top + contentSize.height + templateBorder.bottom : contentSize.height;
  const minX = -20;
  const minY = -20;
  const maxX = Math.max(minX, host.movie.stage.width - windowWidth + 20);
  const maxY = Math.max(minY, host.movie.stage.height - windowHeight + 20);
  const nextX = Math.max(minX, Math.min(maxX, window.x + deltaX));
  const nextY = Math.max(minY, Math.min(maxY, window.y + deltaY));
  if (nextX === window.x && nextY === window.y) {
    if (activated) {
      host.syncWindowSnapshot();
      host.syncWindowSpriteChannels(release);
    }
    return true;
  }

  window.x = nextX;
  window.y = nextY;
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "info", `moveWindow id=${window.id.toString()} x=${nextX} y=${nextY}`, {
    release,
    windowId: window.id.toString(),
    offsetX: deltaX,
    offsetY: deltaY,
    width: windowWidth,
    height: windowHeight
  });
  return true;
}

export function createWindowRuntime(
  host: HabboWindowRuntimeHost,
  id: LingoSymbol | string,
  template?: string,
  x?: number,
  y?: number
): HabboWindowRecord {
  const symbol = id instanceof LingoSymbol ? id : new LingoSymbol(id);
  const key = normalizeSymbolKey(symbol);
  const existing = host.windows.get(key);
  if (existing) {
    host.removeWindow(symbol);
  }

  const window: HabboWindowRecord = {
    id: symbol,
    ...(template !== undefined ? { template } : {}),
    ...(x !== undefined ? { x } : existing?.x !== undefined ? { x: existing.x } : {}),
    ...(y !== undefined ? { y } : existing?.y !== undefined ? { y: existing.y } : {}),
    registeredClients: [],
    procedures: []
  };
  host.windows.set(key, window);
  return window;
}

export function activateWindowRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord): boolean {
  const key = normalizeSymbolKey(window.id);
  if (!host.windows.has(key)) {
    return false;
  }

  const lastKey = [...host.windows.keys()].at(-1);
  if (lastKey === key) {
    return false;
  }

  host.windows.delete(key);
  host.windows.set(key, window);
  return true;
}

export function bringWindowToFrontRuntime(host: HabboWindowRuntimeHost, windowId: string, release: string): boolean {
  const window = host.windows.get(normalizeSymbolKey(windowId));
  if (!window) {
    return false;
  }

  if (!host.activateWindow(window)) {
    return false;
  }

  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "info", `activateWindow id=${window.id.toString()}`);
  return true;
}

export function bringWindowContainingElementToFrontRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const found = host.findOpenWindowElement(elementId, activation?.windowId);
  if (!found) {
    return false;
  }

  return host.bringWindowToFront(found.window.id.toString(), release);
}

export function clearWindowElementOverridesRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord): void {
  host.windowElementOverrides.delete(normalizeSymbolKey(window.id));
}

export function getWindowElementOverrideRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string | undefined
): HabboWindowElementOverride | undefined {
  if (!elementId) {
    return undefined;
  }

  return host.windowElementOverrides.get(normalizeSymbolKey(window.id))?.get(elementId);
}

export function setWindowElementOverrideRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  patch: HabboWindowElementOverride
): void {
  const windowKey = normalizeSymbolKey(window.id);
  const elementOverrides = host.windowElementOverrides.get(windowKey) ?? new Map<string, HabboWindowElementOverride>();
  const current = elementOverrides.get(elementId) ?? {};
  elementOverrides.set(elementId, {
    ...current,
    ...patch
  });
  host.windowElementOverrides.set(windowKey, elementOverrides);
}

export function hideWindowElementRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord, elementId: string): void {
  host.setWindowElementOverride(window, elementId, { visible: false });
}

export function showWindowElementRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord, elementId: string): void {
  host.setWindowElementOverride(window, elementId, { visible: true });
}

export function setWindowElementCommonButtonActivationRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  active: boolean
): void {
  host.setWindowElementOverride(window, elementId, {
    blend: active ? 100 : 50,
    cursor: active ? "cursor.finger" : 0
  });
}

export function setWindowElementEditableRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  editable: boolean
): void {
  host.setWindowElementOverride(window, elementId, { editable });
}

export function isOpenWindowElementEditableRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  element: { readonly id?: string }
): boolean {
  return host.getWindowElementOverride(window, element.id)?.editable ?? isEditableWindowField(element as any);
}

export function moveWindowElementHRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  locH: number
): void {
  host.setWindowElementOverride(window, elementId, { locH });
}

export function moveWindowElementByRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  offsetH: number,
  offsetV: number
): void {
  const current = host.getWindowElementOverride(window, elementId);
  host.setWindowElementOverride(window, elementId, {
    offsetH: (current?.offsetH ?? 0) + offsetH,
    offsetV: (current?.offsetV ?? 0) + offsetV
  });
}

export function resizeWindowElementByRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  elementId: string,
  resizeWidth: number,
  resizeHeight: number
): void {
  const current = host.getWindowElementOverride(window, elementId);
  host.setWindowElementOverride(window, elementId, {
    resizeWidth: (current?.resizeWidth ?? 0) + resizeWidth,
    resizeHeight: (current?.resizeHeight ?? 0) + resizeHeight
  });
}

export function mergeWindowLayoutRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord, memberName: string): void {
  const field = host.externalCastTextFieldSet?.fields.find((entry: { readonly memberName: string }) => entry.memberName.toLowerCase() === memberName.toLowerCase());
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === memberName.toLowerCase());
  if (!field && !layout) {
    return;
  }

  const rect = field ? parseWindowRect(field.text) : layout?.rect;
  window.mergedLayout = {
    memberName: field?.memberName ?? layout!.memberName,
    textChunkPath: field?.textChunkPath ?? layout!.textChunkPath,
    elementCount: field ? countWindowElements(field.text) : layout!.elementCount,
    ...(rect !== undefined ? { rect } : {})
  };
  host.activateWindow(window);
}

export function resolveSourceWindowPositionRuntime(
  host: HabboWindowRuntimeHost,
  contentLayoutName: string,
  templateLayoutName?: string,
  fallback: { readonly x: number; readonly y: number } = { x: 100, y: 100 }
): { readonly x: number; readonly y: number } {
  const contentLayout = host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => {
    return entry.memberName.toLowerCase() === contentLayoutName.toLowerCase();
  });
  const templateLayout = templateLayoutName
    ? host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === templateLayoutName.toLowerCase())
    : undefined;
  const rect = contentLayout?.rect;
  if (!rect || rect.length !== 4) {
    return fallback;
  }

  const border = templateLayout ? resolveLayoutBorder(templateLayout) : zeroWindowBorder();
  const [left, top] = rect as readonly [number, number, number, number];
  return {
    x: Math.round(left - border.left),
    y: Math.round(top - border.top)
  };
}

export function registerWindowClientRuntime(
  window: HabboWindowRecord,
  clientId: LingoSymbol | string
): void {
  const clientSymbol = clientId instanceof LingoSymbol ? clientId : new LingoSymbol(clientId);
  if (!window.registeredClients.some((client) => client.equals(clientSymbol))) {
    window.registeredClients.push(clientSymbol);
  }
}

export function registerWindowProcedureRuntime(
  window: HabboWindowRecord,
  handler: LingoSymbol | string,
  clientId: LingoSymbol | string,
  event: LingoSymbol | string
): void {
  window.procedures.push({
    handler: handler instanceof LingoSymbol ? handler : new LingoSymbol(handler),
    clientId: clientId instanceof LingoSymbol ? clientId : new LingoSymbol(clientId),
    event: event instanceof LingoSymbol ? event : new LingoSymbol(event)
  });
}

export function procedureEventSymbolRuntime(event: HabboWindowElementEventKind): LingoSymbol {
  return new LingoSymbol(`#${event}`);
}

export function findWindowProcedureForEventRuntime(
  window: HabboWindowRecord,
  event?: HabboWindowElementEventKind
): HabboWindowProcedureRecord | undefined {
  if (!event) {
    return window.procedures[0];
  }

  const eventSymbol = procedureEventSymbolRuntime(event);
  return window.procedures.find((procedure) => procedure.event.equals(eventSymbol));
}

export function windowHasProcedureForElementEventRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (!activation?.event) {
    return true;
  }

  const found = host.findOpenWindowElement(elementId, activation.windowId);
  return found ? host.findWindowProcedureForEvent(found.window, activation.event) !== undefined : true;
}

export function recordWindowElementActivationEventRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (!activation?.event) {
    return false;
  }

  const eventRecord = {
    elementId,
    event: activation.event,
    windowId: activation.windowId,
    localX: activation.localX,
    localY: activation.localY
  };
  host.movie.setProperty("lastWindowControlEvent", eventRecord);
  if (activation.event === "mouseDown") {
    host.movie.setProperty("pressedWindowElement", eventRecord);
    return true;
  } else if (activation.event === "mouseUp") {
    host.movie.setProperty("pressedWindowElement", undefined);
    return true;
  }
  return false;
}

export function activateWindowElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const pressStateChanged = host.recordWindowElementActivationEvent(elementId, activation);
  if (pressStateChanged && host.findOpenWindowElement(elementId, activation?.windowId)) {
    host.syncWindowSpriteChannels(release);
  }

  if (host.movie.getProperty("alertWindowVisible")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }

    if (host.activateAlertElement(elementId, release)) {
      return true;
    }
  }

  const roomObjectId = parseRoomObjectInteractiveId(elementId);
  const roomUserId = parseRoomUserInteractiveId(elementId);
  if ((roomObjectId !== undefined || roomUserId !== undefined) && shouldRouteRoomObjectHitToRoomCanvasRuntime(host, activation)) {
    return host.activateRoomCanvas(release, activation);
  }

  if (roomUserId !== undefined) {
    return host.selectRoomUser(roomUserId, release);
  }

  if (roomObjectId !== undefined) {
    return host.selectRoomObject(roomObjectId.kind, roomObjectId.objectId, release, activation);
  }

  if (elementId === "room_canvas") {
    return host.activateRoomCanvas(release, activation);
  }

  if (host.activateRoomHandElement(elementId, release, activation)) {
    return true;
  }

  host.bringWindowContainingElementToFront(elementId, release, activation);

  if (activateDropMenuElementRuntime(host, elementId, release, activation)) {
    return true;
  }

  if (host.activateScrollbarElement(elementId, release, activation)) {
    return true;
  }

  if (host.movie.getProperty("loginWindowsVisible") && elementId.startsWith("login_")) {
    if (!host.windowHasProcedureForElementEvent(elementId, activation)) {
      return false;
    }
    return host.activateLoginElement(elementId, release);
  }

  if (host.movie.getProperty("registrationWindowVisible")) {
    if (activation?.event === "mouseDown") {
      return false;
    }
    return host.activateRegistrationElement(elementId, release);
  }

  return activateGenericWindowElementRuntime(host, elementId, release, activation);
}

export function releasePressedWindowElementRuntime(host: HabboWindowRuntimeHost, release?: string): boolean {
  if (host.movie.getProperty("pressedWindowElement") === undefined) {
    return false;
  }

  host.movie.setProperty("pressedWindowElement", undefined);
  if (release) {
    host.syncWindowSpriteChannels(release);
  }
  return true;
}

export function shouldRouteRoomObjectHitToRoomCanvasRuntime(host: HabboWindowRuntimeHost, activation?: HabboWindowElementActivation): boolean {
  const clickAction = String(host.movie.getProperty("roomClickAction") ?? "");
  if (clickAction !== "moveActive" && clickAction !== "placeActive" && clickAction !== "moveItem" && clickAction !== "placeItem") {
    return false;
  }

  if (activation?.event && activation.event !== "mouseDown") {
    return false;
  }

  return activation?.localX !== undefined && activation.localY !== undefined;
}

export function activateScrollbarElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const found = host.findOpenWindowElement(elementId);
  if (!found || found.element.type !== "scrollbarv") {
    return false;
  }

  const state = host.getScrollbarClientScrollState(found.window, found.layout, found.element, found.geometryTarget);
  if (!state || state.maxOffset <= 0) {
    host.logDebug("windows", "info", `scrollbar=${elementId} no-scroll`);
    return true;
  }

  const model = numberProperty(found.element.properties, "model") ?? 1;
  const metrics = host.getScrollbarMetrics(found.element, found.geometry.height, model, state);
  const lineStep = Math.max(state.lineHeight, 1);
  const pageStep = Math.max(lineStep, state.pageSize);
  let nextOffset = state.offset;

  if (activation?.scrollDelta !== undefined && activation.scrollDelta !== 0) {
    nextOffset += Math.sign(activation.scrollDelta) * lineStep * 3;
  } else if (activation?.localY !== undefined) {
    const localY = Math.max(0, Math.min(found.geometry.height, Math.round(activation.localY)));
    if (localY < metrics.topHeight) {
      nextOffset -= lineStep;
    } else if (localY >= found.geometry.height - metrics.bottomHeight) {
      nextOffset += lineStep;
    } else if (localY < metrics.liftY) {
      nextOffset -= pageStep;
    } else if (localY > metrics.liftY + metrics.liftHeight) {
      nextOffset += pageStep;
    }
  } else {
    nextOffset += lineStep;
  }

  const offset = Math.max(0, Math.min(state.maxOffset, Math.round(nextOffset)));
  setWindowScrollOffsetRuntime(host, found.window, state.clientId, offset);
  host.movie.setProperty("lastWindowScroll", {
    elementId,
    clientId: state.clientId,
    offset,
    maxOffset: state.maxOffset
  });
  host.logDebug("windows", "info", `scrollbar=${elementId} client=${state.clientId} offset=${offset}/${state.maxOffset}`);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function getWindowScrollOffsetRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord, clientId: string): number {
  if (!clientId) {
    return 0;
  }
  return host.windowScrollOffsets.get(windowScrollKey(window, clientId)) ?? 0;
}

export function setWindowScrollOffsetRuntime(host: HabboWindowRuntimeHost, window: HabboWindowRecord, clientId: string, offset: number): void {
  if (!clientId) {
    return;
  }
  host.windowScrollOffsets.set(windowScrollKey(window, clientId), Math.max(0, Math.round(offset)));
}

export function getScrollbarMetricsRuntime(
  host: HabboWindowRuntimeHost,
  element: HabboWindowLayoutElement,
  height: number,
  model: number,
  scrollState?: {
    readonly offset: number;
    readonly maxOffset: number;
  }
): { readonly topHeight: number; readonly bottomHeight: number; readonly barHeight: number; readonly liftHeight: number; readonly liftY: number } {
  const scrollbarElement = host.buttonBitmapAssetSet?.elements.find((candidate: { readonly memberName: string }) => {
    return normalizeCastName(candidate.memberName) === normalizeCastName(`scrollbarv${model}.element`);
  });
  const state = scrollbarElement?.states.find((entry: { readonly state: string }) => entry.state.toLowerCase() === "up");
  const topHeight = Math.min(height, state?.parts.top?.height ?? 14);
  const bottomHeight = Math.min(Math.max(0, height - topHeight), state?.parts.bottom?.height ?? 14);
  const barHeight = Math.max(1, height - topHeight - bottomHeight);
  const liftHeight = state?.parts.lift?.height ?? 15;
  const liftTravel = Math.max(0, barHeight - liftHeight);
  const liftY = scrollState && scrollState.maxOffset > 0
    ? topHeight + Math.round((scrollState.offset / scrollState.maxOffset) * liftTravel)
    : Math.max(topHeight, Math.min(height - bottomHeight - liftHeight, numberProperty(element.properties, "offset") ?? topHeight));
  return {
    topHeight,
    bottomHeight,
    barHeight,
    liftHeight,
    liftY
  };
}

export function getDropMenuSelectedKeyRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): string {
  const keyList = getDropMenuKeyListRuntime(host, element);
  const fallback = keyList[0] ?? element.key ?? "...";
  if (!element.id) {
    return fallback;
  }

  const selections = coerceRecord(host.movie.getProperty("dropMenuSelections"));
  const selected = selections[element.id];
  if (typeof selected !== "string") {
    return fallback;
  }

  return keyList.length === 0 || keyList.includes(selected) ? selected : fallback;
}

export function getDropMenuKeyListRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): readonly string[] {
  if (element.id === "roomatic_choosecategory") {
    const categories = coerceRecord(host.objectManager.getObject("#session")?.get("user_flat_cats"));
    const keys = Object.keys(categories).filter((key) => String(categories[key] ?? "").length > 0);
    if (keys.length > 0) {
      return keys;
    }
  }

  return stringListProperty(element.properties, "keylist");
}

export function getDropMenuLabelsRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement, keyList: readonly string[]): readonly string[] {
  if (element.id === "roomatic_choosecategory") {
    const categories = coerceRecord(host.objectManager.getObject("#session")?.get("user_flat_cats"));
    return keyList.map((key) => String(categories[key] ?? key));
  }

  return keyList.map((key) => host.texts.get(key) ?? capitalizeMenuLabel(key));
}

export function isDropMenuOpenRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): boolean {
  return element.id !== undefined && host.movie.getProperty("dropMenuOpenId") === element.id;
}

export function getDropMenuLineHeightRuntime(
  _host: HabboWindowRuntimeHost,
  element: HabboWindowLayoutElement,
  geometry: { readonly height: number }
): number {
  const rawHeight = numberProperty(element.properties, "height") ?? geometry.height;
  const lineHeight = Math.max(1, Math.round(rawHeight));
  return lineHeight % 2 === 0 ? lineHeight : lineHeight + 1;
}

export function resolveDropMenuSpriteGeometryRuntime(
  host: HabboWindowRuntimeHost,
  element: HabboWindowLayoutElement,
  geometry: { readonly width: number; readonly height: number },
  x: number,
  y: number
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const keyList = getDropMenuKeyListRuntime(host, element);
  const open = isDropMenuOpenRuntime(host, element);
  if (!open || keyList.length <= 1) {
    return {
      x,
      y,
      width: geometry.width,
      height: geometry.height
    };
  }

  const lineHeight = getDropMenuLineHeightRuntime(host, element, geometry);
  const selectedIndex = Math.max(0, keyList.indexOf(getDropMenuSelectedKeyRuntime(host, element)));
  const direction = stringProperty(element.properties, "direction") ?? "down";
  const height = keyList.length * lineHeight;
  if (direction === "up") {
    return {
      x,
      y: y - ((keyList.length - 1) * lineHeight),
      width: geometry.width,
      height
    };
  }
  if (direction === "lastselected") {
    return {
      x,
      y: y - (selectedIndex * lineHeight),
      width: geometry.width,
      height
    };
  }

  return {
    x,
    y,
    width: geometry.width,
    height
  };
}

export function resolveWindowBitmapElementRefRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): DirectorMemberRef | undefined {
  const statefulMemberName = resolveStatefulControlMemberNameRuntime(host, element);
  if (statefulMemberName) {
    const member = host.resourceManager.getMemberRef(statefulMemberName);
    if (member) {
      return member;
    }
  }

  if (!element.resolvedMember) {
    return undefined;
  }

  const castLib = host.loadedCastSlots.get(normalizeCastName(element.resolvedMember.castName));
  if (castLib === undefined) {
    return undefined;
  }

  return {
    castLib,
    member: element.resolvedMember.member
  };
}

export function resolveStatefulControlMemberNameRuntime(host: HabboWindowRuntimeHost, element: HabboWindowLayoutElement): string | undefined {
  const memberName = normalizeMemberName(element.memberName ?? "");
  const match = /^(button\.(checkbox|radio)(?:[._][a-z0-9_-]+)*)\.(on|off)$/.exec(memberName);
  if (!match) {
    return undefined;
  }

  const baseMemberName = match[1]!;
  const controlType = match[2]!;
  const roomKioskState = resolveRoomKioskSourceControlState(
    element.id,
    coerceRecord(host.objectManager.getObject("#roomkiosk_interface")?.get("roomProps"))
  );
  if (roomKioskState !== undefined) {
    return `${baseMemberName}.${roomKioskState ? "on" : "off"}`;
  }

  if (controlType === "checkbox" && baseMemberName === "button.checkbox") {
    const propName = checkboxRegistrationPropForElementId(element.id);
    if (!propName) {
      return undefined;
    }

    return `${baseMemberName}.${String(host.getRegistrationProp(propName) ?? "0") === "1" ? "on" : "off"}`;
  }

  if (controlType === "radio" && baseMemberName === "button.radio") {
    if (element.id === "char_sex_f") {
      return `${baseMemberName}.${String(host.getRegistrationProp("sex") ?? "M").toUpperCase().startsWith("F") ? "on" : "off"}`;
    }

    if (element.id === "char_sex_m") {
      return `${baseMemberName}.${String(host.getRegistrationProp("sex") ?? "M").toUpperCase().startsWith("F") ? "off" : "on"}`;
    }

    if (element.id === "badge.visible.radio") {
      return Number(host.objectManager.getObject("#session")?.get("badge_visible") ?? host.movie.getProperty("badgeVisible") ?? 1) !== 0
        ? `${baseMemberName}.on`
        : `${baseMemberName}.off`;
    }

    if (element.id === "badge.hidden.radio") {
      return Number(host.objectManager.getObject("#session")?.get("badge_visible") ?? host.movie.getProperty("badgeVisible") ?? 1) !== 0
        ? `${baseMemberName}.off`
        : `${baseMemberName}.on`;
    }
  }

  return undefined;
}

export function syncWindowFieldValueSnapshotRuntime(host: HabboWindowRuntimeHost): void {
  const loginFields = Object.fromEntries(host.loginFieldValues.entries());
  const registrationFields = Object.fromEntries(host.registrationFieldValues.entries());
  const textFields = Object.fromEntries(host.windowTextValues.entries());
  host.movie.setProperty("loginFieldValues", loginFields);
  host.movie.setProperty("registrationFieldValues", registrationFields);
  host.movie.setProperty("windowTextValues", textFields);
  host.movie.setProperty("windowFieldValues", {
    ...textFields,
    ...registrationFields,
    ...loginFields,
  });
}

export function setWindowFieldValueRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  value: string,
  release: string
): boolean {
  if (host.movie.getProperty("loginWindowsVisible") && elementId.startsWith("login_")) {
    return host.setLoginFieldValue(elementId, value, release);
  }

  if (host.movie.getProperty("registrationWindowVisible")) {
    return host.setRegistrationFieldValue(elementId, value, release);
  }

  const found = host.findOpenWindowElement(elementId);
  if (found && host.isOpenWindowElementEditable(found.window, found.element)) {
    if (elementId === "roomatic_password_field" || elementId === "roomatic_password2_field") {
      const normalizedPassword = sanitizeRoomKioskPasswordInput(value, String(host.getVariable("permitted.name.chars") ?? "1234567890qwertyuiopasdfghjklzxcvbnm_-=+?!@<>:.,"));
      const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
      kioskInterface?.set("tempPassword", {
        ...coerceRecord(kioskInterface.get("tempPassword")),
        [elementId]: [...normalizedPassword]
      });
      host.windowTextValues.set(elementId, "*".repeat(normalizedPassword.length));
      host.syncWindowFieldValueSnapshot();
      host.syncWindowSpriteChannels(release);
      host.logDebug("roomkiosk", "info", `passwordField=${elementId} length=${normalizedPassword.length}`);
      return true;
    }

    const normalizedValue = value.slice(0, isPasswordElementId(elementId) ? 32 : 128);
    host.windowTextValues.set(elementId, normalizedValue);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("windows", "info", `field=${elementId} length=${normalizedValue.length}`);
    return true;
  }

  const runtimeField = readRuntimeInteractiveField(host.movie.getProperty("windowInteractiveElements"), elementId);
  if (runtimeField) {
    const normalizedValue = value.slice(0, isPasswordElementId(elementId) ? 32 : 400);
    host.windowTextValues.set(elementId, normalizedValue);
    host.syncWindowFieldValueSnapshot();
    host.logDebug("windows", "info", `runtime field=${elementId} length=${normalizedValue.length}`);
    return true;
  }

  return false;
}

function readRuntimeInteractiveField(value: unknown, elementId: string): HabboWindowInteractiveElement | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.find((entry): entry is HabboWindowInteractiveElement => {
    return isHabboWindowInteractiveElement(entry)
      && entry.id === elementId
      && entry.kind === "field"
      && entry.editable !== false;
  });
}

export function submitWindowFieldRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  options: { readonly shiftKey?: boolean } = {}
): boolean {
  if (elementId === "chat_field") {
    return host.submitRoomChat(release, options);
  }

  if (elementId === "nav_private_search_field") {
    return host.startNavigatorFlatSearch(release);
  }

  if (elementId === "console_search_key_field") {
    return host.sendMessengerFindUser(release);
  }

  return false;
}

export function activateDropMenuElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const found = host.findOpenWindowElement(elementId, activation?.windowId);
  if (!found || found.element.type !== "dropmenu") {
    return false;
  }

  const keyList = host.getDropMenuKeyList(found.element);
  if (keyList.length === 0) {
    return false;
  }

  if (host.movie.getProperty("dropMenuOpenId") !== elementId) {
    host.movie.setProperty("dropMenuOpenId", elementId);
    host.movie.setProperty("lastDropMenuAction", {
      elementId,
      action: "open"
    });
    host.syncWindowSpriteChannels(release);
    host.logDebug("windows", "info", `dropmenu open element=${elementId}`);
    return true;
  }

  const lineHeight = host.getDropMenuLineHeight(found.element, found.geometry);
  const selectedIndex = activation?.localY !== undefined
    ? Math.max(0, Math.min(keyList.length - 1, Math.floor(activation.localY / lineHeight)))
    : Math.max(0, keyList.indexOf(host.getDropMenuSelectedKey(found.element)));
  const selectedKey = keyList[selectedIndex] ?? keyList[0] ?? "";
  host.movie.setProperty("dropMenuOpenId", "");
  host.movie.setProperty("dropMenuSelections", {
    ...coerceRecord(host.movie.getProperty("dropMenuSelections")),
    [elementId]: selectedKey
  });
  host.movie.setProperty("lastDropMenuAction", {
    elementId,
    action: "select",
    selectedKey,
    selectedLabel: host.getDropMenuLabels(found.element, keyList)[selectedIndex] ?? selectedKey,
    selectedIndex: selectedIndex + 1
  });
  applyDropMenuSelectionRuntime(host, found, selectedKey, release);
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "info", `dropmenu select element=${elementId} key=${selectedKey}`);
  return true;
}

export function applyDropMenuSelectionRuntime(
  host: HabboWindowRuntimeHost,
  found: {
    readonly window: HabboWindowRecord;
    readonly layout: HabboExternalCastWindowLayout;
    readonly element: { readonly id?: string };
  },
  selectedKey: string,
  release: string
): void {
  const procedure = found.window.procedures[0];
  if (procedure?.clientId.equals("#room_interface") && procedure.handler.equals("#eventProcRoomBar") && found.element.id === "int_speechmode_dropmenu") {
    setRoomChatModeRuntime(host, selectedKey, release);
  } else if (procedure?.clientId.equals("#roomkiosk_interface") && found.element.id === "roomatic_choosecategory") {
    host.applyRoomKioskCategorySelection(selectedKey, release);
  }
}

export function setRoomChatModeRuntime(host: HabboWindowRuntimeHost, selectedKey: string, release: string): void {
  const mode = selectedKey === "whisper" ? "WHISPER" : selectedKey === "shout" ? "SHOUT" : "CHAT";
  const roomComponent = host.objectManager.getObject("#room_component");
  roomComponent?.set("chatProps", {
    ...coerceRecord(roomComponent.get("chatProps")),
    mode
  });
  host.movie.setProperty("roomChatMode", mode);
  host.logDebug("room", "info", `setChatMode key=${selectedKey} mode=${mode}`, {
    release,
    source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
  });
}

export function activateGenericWindowElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const found = host.findOpenWindowElement(elementId, activation?.windowId);
  if (!found) {
    return false;
  }

  const procedure = host.findWindowProcedureForEvent(found.window, activation?.event);
  if (!procedure) {
    return false;
  }

  if (procedure?.clientId.equals("#dialog_thread") && host.activateDialogElement(elementId, found, release, activation)) {
    return true;
  }

  if (procedure?.clientId.equals("#purse_interface") && procedure.handler.equals("#eventProcPurse")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activatePurseElement(elementId, found.window, release);
  }

  if (procedure?.clientId.equals("#catalogue_interface") && procedure.handler.equals("#eventProcInfoWnd")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activateCatalogueInfoElement(elementId, release);
  }

  if (procedure?.clientId.equals("#catalogue_interface") && procedure.handler.equals("#hidePurchaseOk")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activateCataloguePurchaseOkElement(elementId, release);
  }

  if (procedure?.clientId.equals("#catalogue_interface") && procedure.handler.equals("#eventProcCatalogue")) {
    return host.activateCatalogueElement(elementId, release, activation);
  }

  if (procedure?.clientId.equals("#room_interface") && procedure.handler.equals("#eventProcDelConfirm")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activateRoomDeleteConfirmElement(elementId, release);
  }

  const closeMatch = classifySourceWindowCloseElement(elementId, found.element);
  if (
    closeMatch
    && !procedure?.clientId.equals("#navigator_interface")
    && !procedure?.clientId.equals("#roomkiosk_interface")
  ) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.closeWindowFromSourceElement(found.window, release, closeMatch);
  }

  if (procedure?.clientId.equals("#messenger_interface") && procedure.handler.equals("#eventProcMessenger")) {
    return host.activateMessengerElement(elementId, release, activation);
  }

  if (procedure?.clientId.equals("#club_interface") && procedure.handler.equals("#eventProcDialogMousedown")) {
    return host.activateClubElement(elementId, release);
  }

  if (procedure?.clientId.equals("#entry_interface") && procedure.handler.equals("#eventProcEntryBar")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    const entryInterface = host.objectManager.getObject("#entry_interface");
    const action = resolveEntryBarAction(elementId, {
      newMessageCount: numberFromUnknown(entryInterface?.get("newMsgCount"), 0),
      newBuddyRequestCount: numberFromUnknown(entryInterface?.get("newBuddyRequests"), 0)
    });
    if (action) {
      host.logDebug("entry", "info", `${elementId} action=${action.kind}`);
      return host.executeEntryBarAction(action, release);
    }

    host.recordUnsupportedOnce(`entry-bar-element-unhandled:${elementId}`, {
      subsystem: "lingo",
      feature: "entry-bar-element-unhandled",
      detail: `${release} Entry Interface Class eventProcEntryBar received ${elementId}; this toolbar action is recorded but not translated yet`,
      source: `extracted/projectorrays/${release}/${entryInterfaceClassSource}`
    });
    host.logDebug("entry", "warn", `unhandled entry-bar element=${elementId}`);
    return false;
  }

  if (procedure?.clientId.equals("#room_interface") && procedure.handler.equals("#eventProcRoomBar")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    const action = resolveRoomBarAction(elementId);
    if (action) {
      host.logDebug("room", "info", `${elementId} action=${action.kind}`);
      return host.executeRoomBarAction(action, release);
    }

    host.recordUnsupportedOnce(`room-bar-element-unhandled:${elementId}`, {
      subsystem: "lingo",
      feature: "room-bar-element-unhandled",
      detail: `${release} Room Interface Class eventProcRoomBar received ${elementId}; this toolbar action is recorded but not translated yet`,
      source: HABBO_ROOM_INTERFACE_SOURCE
    });
    host.logDebug("room", "warn", `unhandled room-bar element=${elementId}`);
    return false;
  }

  if (procedure?.clientId.equals("#room_interface") && procedure.handler.equals("#eventProcInfoStand")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    if (elementId === "info_badge") {
      return host.toggleOwnBadgeVisibility(release);
    }

    return false;
  }

  if (procedure?.clientId.equals("#room_interface") && procedure.handler.equals("#eventProcInterface")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activateRoomObjectInterfaceElement(elementId, release);
  }

  if (procedure?.clientId.equals("#Room_badge") && procedure.handler.equals("#eventProcBadgeChooser")) {
    if (activation?.event && activation.event !== "mouseUp") {
      return false;
    }
    return host.activateBadgeChooserElement(elementId, release);
  }

  if (procedure?.clientId.equals("#navigator_interface")) {
    return host.activateNavigatorElement(elementId, release, activation);
  }

  if (procedure?.clientId.equals("#roomkiosk_interface")) {
    return host.activateRoomKioskElement(elementId, release, activation);
  }

  host.logDebug("windows", "warn", `unhandled generic element=${elementId} window=${found.window.id.toString()}`);
  return false;
}

export function showAlertRuntime(host: HabboWindowRuntimeHost, payload: unknown, release: string): boolean {
  const alert = host.alertManager.show(payload, (key: string) => host.getText(key));
  host.removeWindow("#habbo_alert");
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === alert.template);
  const templateLayout = host.externalCastWindowLayoutSet?.windows.find((entry: HabboExternalCastWindowLayout) => entry.memberName.toLowerCase() === "habbo_basic.window");
  const border = templateLayout ? resolveLayoutBorder(templateLayout) : zeroWindowBorder();
  const alertSize = layout ? host.resolveAlertContentSize(alert, layout, border) : { width: 203, height: 100, resizeWidth: 0, resizeHeight: 0 };
  const fullWidth = border.left + alertSize.width + border.right;
  const fullHeight = border.top + alertSize.height + border.bottom;
  const window = host.createWindow(
    "#habbo_alert",
    "habbo_basic.window",
    Math.round((host.movie.stage.width - fullWidth) / 2),
    Math.round((host.movie.stage.height - fullHeight) / 2)
  );
  window.contentResizeWidth = alertSize.resizeWidth;
  window.contentResizeHeight = alertSize.resizeHeight;

  host.mergeWindowLayout(window, alert.template);
  host.registerWindowClient(window, "#alert_manager");
  host.registerWindowProcedure(window, "#eventProcAlert", "#alert_manager", "#mouseUp");
  host.windowTextValues.set("alert_title", alert.title);
  host.windowTextValues.set("alert_text", alert.message);
  host.windowTextValues.set("alert_link", alert.link);
  host.movie.setProperty("activeAlert", serializeAlert(alert));
  host.movie.setProperty("alertWindowVisible", true);
  host.movie.setProperty("alertWindowTemplate", alert.template);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("alert", "warn", `show id=${alert.id} template=${alert.template} modal=${alert.modal} message=${alert.message.replace(/\s+/g, " ").trim()}`);
  return true;
}

export function resolveAlertContentSizeRuntime(
  host: HabboWindowRuntimeHost,
  alert: HabboAlertDescriptor,
  layout: HabboExternalCastWindowLayout,
  border: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
): { readonly width: number; readonly height: number; readonly resizeWidth: number; readonly resizeHeight: number } {
  const baseSize = resolveLayoutRenderSize(layout);
  const textElement = layout.elements.find((element) => element.id === "alert_text");
  if (!textElement) {
    return {
      width: baseSize.width,
      height: baseSize.height,
      resizeWidth: 0,
      resizeHeight: 0
    };
  }

  const baseTextWidth = Math.max(1, Math.round(textElement.width ?? baseSize.width));
  const baseTextHeight = Math.max(1, Math.round(textElement.height ?? 1));
  const titleMetrics = alert.title
    ? estimateDialogWriterImageSize(alert.title)
    : { width: 0, height: 0 };
  const textNaturalMetrics = estimateDialogWriterImageSize(alert.message);
  const desiredTextWidth = Math.max(titleMetrics.width, textNaturalMetrics.width);
  const maxContentWidth = Math.max(
    baseSize.width,
    Math.round(host.movie.stage.width - border.left - border.right - 40)
  );
  const maxResizeWidth = Math.max(0, maxContentWidth - baseSize.width);
  const resizeWidth = Math.min(Math.max(0, desiredTextWidth - baseTextWidth), maxResizeWidth);
  const effectiveTextWidth = baseTextWidth + resizeWidth;
  const textHeight = desiredTextWidth > effectiveTextWidth
    ? estimateDialogWriterWrappedHeight(alert.message, effectiveTextWidth)
    : textNaturalMetrics.height;
  const resizeHeight = Math.max(0, (textHeight + titleMetrics.height) - baseTextHeight);

  return {
    width: baseSize.width + resizeWidth,
    height: baseSize.height + resizeHeight,
    resizeWidth,
    resizeHeight
  };
}

export function closeAlertWindowRuntime(host: HabboWindowRuntimeHost, release: string): boolean {
  const activeAlert = host.movie.getProperty("activeAlert") as { readonly id?: string } | undefined;
  if (typeof activeAlert?.id === "string") {
    host.alertManager.close(activeAlert.id);
  }

  const removed = host.removeWindow("#habbo_alert");
  host.windowTextValues.delete("alert_title");
  host.windowTextValues.delete("alert_text");
  host.windowTextValues.delete("alert_link");
  host.movie.setProperty("activeAlert", undefined);
  host.movie.setProperty("alertWindowVisible", false);
  host.movie.setProperty("alertWindowTemplate", undefined);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("alert", "info", `close removed=${removed}`);
  return removed;
}

export function closeWindowFromSourceElementRuntime(
  host: HabboWindowRuntimeHost,
  window: HabboWindowRecord,
  release: string,
  match: HabboWindowCloseMatch
): boolean {
  if (window.registeredClients.some((client) => client.equals("#messenger_interface"))) {
    return host.hideMessenger(release);
  }

  if (window.registeredClients.some((client) => client.equals("#purse_interface"))) {
    return host.hidePurse(release);
  }

  if (window.registeredClients.some((client) => client.equals("#club_interface"))) {
    return host.hideClubInfo(release);
  }

  const removed = host.removeWindow(window.id);
  const id = window.id.toString();
  if (id === `#${host.getText(HABBO_HELP_TITLE_KEY) ?? HABBO_HELP_FALLBACK_TITLE}`) {
    host.movie.setProperty("helpDialogVisible", false);
  }
  if (id === `#${host.getText(HABBO_CALL_FOR_HELP_TITLE_KEY) ?? HABBO_CALL_FOR_HELP_FALLBACK_TITLE}`) {
    host.movie.setProperty("callForHelpDialogVisible", false);
  }
  host.movie.setProperty("lastGlobalWindowClose", {
    windowId: id,
    match,
    source: "source window element close"
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "info", `source close window=${id} removed=${removed} via=${match.reason}:${match.value}`);
  return true;
}

export function activateAlertElementRuntime(host: HabboWindowRuntimeHost, elementId: string, release: string): boolean {
  if (!host.movie.getProperty("alertWindowVisible")) {
    return false;
  }

  if (elementId === "alert_ok" || elementId === "close") {
    return host.closeAlertWindow(release);
  }

  if (elementId === "alert_link") {
    const activeAlert = host.movie.getProperty("activeAlert");
    host.movie.setProperty("lastAlertLinkAction", activeAlert);
    host.recordUnsupportedOnce("alert-link-open-page-partial", {
      subsystem: "director",
      feature: "alert-link-open-page-partial",
      detail: `${release} alert_link was clicked; browser page navigation is recorded only until the full window/link handler path is translated`,
      source: `extracted/projectorrays/${release}/hh_interface/casts/External/Text member habbo_alert_c.window`
    });
    host.logDebug("alert", "info", "link=alert_link action=open_net_page");
    return true;
  }

  return Boolean((host.movie.getProperty("activeAlert") as { readonly modal?: boolean } | undefined)?.modal);
}

export function showOpenGeneralDialogRuntime(host: HabboWindowRuntimeHost, argument: unknown, release: string): boolean {
  const { dialogId, payload } = normalizeGeneralDialogArgument(argument);
  return host.showGeneralDialog(dialogId, payload, release);
}

export function showGeneralDialogRuntime(host: HabboWindowRuntimeHost, dialogId: unknown, payload: unknown, release: string): boolean {
  const normalizedId = normalizeSymbolish(dialogId).toLowerCase();
  const props = payload === undefined ? {} : payload;

  switch (normalizedId) {
    case "alert":
    case "modal_alert":
      return host.showAlert(props, release);
    case "ban":
      return host.showAlert({
        id: "BannWarning",
        title: "Alert_YouAreBanned_T",
        modal: 1,
        ...coerceRecord(props)
      }, release);
    case "help":
      return host.showHelpDialog(release);
    case "call_for_help":
      return host.showCallForHelpDialog(release);
    case "purse":
      return host.executeMessage("#show_hide_purse", undefined, release);
    default:
      host.movie.setProperty("lastGeneralDialogRequest", {
        dialogId: normalizedId || String(dialogId ?? ""),
        payload: props
      });
      host.recordUnsupportedOnce(`open-general-dialog-not-implemented:${normalizedId || "unknown"}`, {
        subsystem: "habbo",
        feature: "open-general-dialog-not-implemented",
        detail: `${release} Dialog Thread Class received openGeneralDialog(${normalizedId || String(dialogId ?? "")}); this dialog type is recorded but not rendered yet`,
        source: `extracted/projectorrays/${release}/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls`
      });
      host.logDebug("dialog", "warn", `openGeneralDialog id=${normalizedId || String(dialogId ?? "")} unsupported`);
      return false;
  }
}

export function showHelpDialogRuntime(host: HabboWindowRuntimeHost, release: string): boolean {
  const title = host.getText(HABBO_HELP_TITLE_KEY) ?? HABBO_HELP_FALLBACK_TITLE;
  const windowKey = normalizeSymbolKey(title);
  if (host.windows.has(windowKey)) {
    const removed = host.removeWindow(title);
    host.movie.setProperty("helpDialogVisible", false);
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("dialog", "info", `help toggle close removed=${removed}`);
    return true;
  }

  const position = host.resolveSourceWindowPosition(HABBO_HELP_LAYOUT, "habbo_basic.window");
  const window = host.createWindow(title, "habbo_basic.window", position.x, position.y);
  host.registerWindowClient(window, "#dialog_thread");
  host.registerWindowProcedure(window, "#eventProcHelp", "#dialog_thread", "#mouseUp");
  host.mergeWindowLayout(window, HABBO_HELP_LAYOUT);
  const topics = collectHelpTopics((key) => host.getText(key));
  host.windowTextValues.set("link_list", topics.join("\r"));

  const roomComponent = host.objectManager.getObject("#room_component");
  const roomId = String(roomComponent?.get("roomId") ?? "");
  if (host.movie.getProperty("roomActive") !== true && roomId.length === 0) {
    host.hideWindowElement(window, "help_callforhelp_textlink");
  }

  host.movie.setProperty("helpDialogVisible", true);
  host.movie.setProperty("lastGeneralDialogRequest", {
    dialogId: "help",
    source: `extracted/projectorrays/${release}/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls`
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("dialog", "ok", `help topics=${topics.length}`);
  return true;
}

export function showCallForHelpDialogRuntime(host: HabboWindowRuntimeHost, release: string): boolean {
  const title = host.getText(HABBO_CALL_FOR_HELP_TITLE_KEY) ?? HABBO_CALL_FOR_HELP_FALLBACK_TITLE;
  const windowKey = normalizeSymbolKey(title);
  if (host.windows.has(windowKey)) {
    const removed = host.removeWindow(title);
    host.movie.setProperty("callForHelpDialogVisible", false);
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("dialog", "info", `call_for_help toggle close removed=${removed}`);
    return true;
  }

  const position = host.resolveSourceWindowPosition(HABBO_CALL_FOR_HELP_LAYOUT, "habbo_basic.window");
  const window = host.createWindow(title, "habbo_basic.window", position.x, position.y);
  host.registerWindowClient(window, "#dialog_thread");
  host.registerWindowProcedure(window, "#eventProcCallHelp", "#dialog_thread", "#mouseUp");
  host.mergeWindowLayout(window, HABBO_CALL_FOR_HELP_LAYOUT);
  host.windowTextValues.set("callhelp_text", "");
  host.movie.setProperty("callForHelpDialogVisible", true);
  host.movie.setProperty("lastGeneralDialogRequest", {
    dialogId: "call_for_help",
    source: `extracted/projectorrays/${release}/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls`
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("dialog", "ok", "call_for_help shown");
  return true;
}

export function activateDialogElementRuntime(
  host: HabboWindowRuntimeHost,
  elementId: string,
  found: {
    readonly window: HabboWindowRecord;
    readonly element: unknown;
  },
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const procedure = found.window.procedures[0];
  if (procedure?.handler.equals("#eventProcHelp")) {
    switch (elementId) {
      case "close":
      case "help_ok":
        return host.closeWindowFromSourceElement(found.window, release, { reason: "element-id", value: elementId });
      case "link_list": {
        const urlKey = helpTopicUrlKeyFromLocalY(activation?.localY);
        const url = urlKey ? host.getText(urlKey) : undefined;
        if (!url) {
          return true;
        }
        host.movie.setProperty("lastHelpLinkAction", {
          urlKey,
          url,
          source: `extracted/projectorrays/${release}/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls`
        });
        host.recordUnsupportedOnce("help-link-open-page-partial", {
          subsystem: "director",
          feature: "help-link-open-page-partial",
          detail: `${release} Dialog Thread Class eventProcHelp would open ${urlKey}; browser navigation is recorded only`,
          source: `extracted/projectorrays/${release}/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls`
        });
        host.logDebug("dialog", "info", `help link=${urlKey}`);
        return true;
      }
      case "help_callforhelp_textlink":
        host.removeWindow(found.window.id);
        return host.showCallForHelpDialog(release);
      default:
        return false;
    }
  }

  if (procedure?.handler.equals("#eventProcCallHelp")) {
    switch (elementId) {
      case "close":
      case "callhelp_cancel":
      case "alertsent_ok":
        return host.closeWindowFromSourceElement(found.window, release, { reason: "element-id", value: elementId });
      case "callhelp_send": {
        const message = String(host.windowTextValues.get("callhelp_text") ?? "");
        host.executeMessage("#sendCallForHelp", message, release);
        host.mergeWindowLayout(found.window, HABBO_CALL_FOR_HELP_SENT_LAYOUT);
        host.windowTextValues.delete("callhelp_text");
        host.syncWindowFieldValueSnapshot();
        host.syncWindowSnapshot();
        host.syncWindowSpriteChannels(release);
        host.logDebug("dialog", "ok", `call_for_help sent length=${message.length}`);
        return true;
      }
      default:
        return false;
    }
  }

  return false;
}

function normalizeGeneralDialogArgument(argument: unknown): { readonly dialogId: unknown; readonly payload: unknown } {
  if (Array.isArray(argument)) {
    return {
      dialogId: argument[0],
      payload: argument[1]
    };
  }

  if (argument && typeof argument === "object") {
    const record = argument as Record<string, unknown>;
    if ("dialogId" in record || "dialog" in record || "id" in record || "payload" in record || "props" in record) {
      return {
        dialogId: record.dialogId ?? record.dialog ?? record.id,
        payload: record.payload ?? record.props
      };
    }
  }

  return {
    dialogId: argument,
    payload: undefined
  };
}
