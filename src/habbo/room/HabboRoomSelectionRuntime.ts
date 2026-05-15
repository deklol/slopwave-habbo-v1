import { LingoList } from "../../lingo";
import type { DirectorBitmapCompositeLayer, DirectorMemberManifest } from "../../runtime";
import type {
  HabboWindowElementActivation,
  HabboWindowRecord
} from "../window/HabboWindowTypes";
import type { HabboWindowBitmapAsset } from "../boot/HabboBootResourceTypes";
import {
  coerceRecord,
  labelForElement,
  normalizeRoomObjectClassName,
  normalizeSymbolKey,
  numberFromUnknown,
  roommaticUseTile
} from "../HabboSourceValueHelpers";
import {
  resolveLayoutRenderSize,
  resolveWindowElementGeometry
} from "../window/HabboWindowLayoutHelpers";
import {
  HABBO_ROOM_ACTIVE_OBJECT_SOURCE,
  roomObjectHasSourceSelectOverride,
  sourceClassValueContains
} from "../ui/HabboRoomObjectInteractions";
import {
  HABBO_ROOM_DELETE_CONFIRM_FALLBACK_TITLE,
  HABBO_ROOM_DELETE_CONFIRM_LAYOUT,
  HABBO_ROOM_DELETE_CONFIRM_TEMPLATE,
  HABBO_ROOM_DELETE_CONFIRM_TEXT_A_FALLBACK,
  HABBO_ROOM_DELETE_CONFIRM_TEXT_A_KEY,
  HABBO_ROOM_DELETE_CONFIRM_TEXT_B_FALLBACK,
  HABBO_ROOM_DELETE_CONFIRM_TEXT_B_KEY,
  HABBO_ROOM_DELETE_CONFIRM_TITLE_KEY,
  HABBO_ROOM_FURNITURE_SOURCE,
  resolveRoomDeleteConfirmAction
} from "../ui/HabboRoomFurnitureDialog";
import { readRoomDeleteConfirmationState } from "../features/inventory-hand";
import {
  buildRoomObjectInfo,
  buildRoomUserInfo,
  nextBadgeIndex,
  normalizeBadgeId,
  resolveRoomUserControlType,
  type HabboRoomObjectInfo,
  type HabboRoomSelectableObjectKind,
  type HabboRoomUserInfo
} from "./HabboRoomSelection";
import { readRoomDataStruct } from "./HabboRoomData";
import {
  isRoomObjectRecord,
  moduloDirection,
  type HabboRoomObjectRecord
} from "./HabboRoomObjectData";
import { hasRoomUserAction, isRoomUserRecord, type HabboRoomUserRecord } from "./HabboRoomUserData";
import {
  clampOneBasedIndex,
  type HabboFigurePartProps
} from "../features/figure/HabboFigureData";
import {
  isBadgeEffectBadge,
  nextBadgeEffectStep,
  type HabboBadgeEffectPoint
} from "./HabboBadgeEffect";
import {
  badgeMemberName,
  isHabboClubBadge,
  normalizeBadgeMemberId
} from "./HabboBadgeAssets";
import {
  capitalizeRoomObjectKind,
  readRoomObjectSpriteEntries
} from "./HabboRoomObjectSpritePlanning";

const roomInterfaceClassSource = "hh_room/casts/External/ParentScript 3 - Room Interface Class.ls";

export interface HabboRoomSelectionRuntimeHost {
  [key: string]: any;
}

export function createInfoStandUserImageMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  _geometry: { readonly width: number; readonly height: number },
  release: string
): DirectorMemberManifest | undefined {
  const user = getSelectedRoomUserRuntime(host);
  if (!user) {
    return undefined;
  }

  const selectedInfo = getSelectedRoomUserInfoRuntime(host);
  const figure = typeof selectedInfo?.figure === "object" && selectedInfo.figure !== null
    ? selectedInfo.figure as Readonly<Record<string, HabboFigurePartProps>>
    : user.figure;
  const direction = selectedInfo?.dirBody ?? user.dirBody ?? 2;
  const headDirection = selectedInfo?.dirHead ?? user.dirHead ?? direction;
  const figureRaw = selectedInfo?.figureRaw ?? user.figureRaw;
  const selectedId = selectedInfo?.selectedId ?? user.id;
  const sourceLayers = host.createFigureSourceLayers(
    ["lh", "ls", "bd", "sh", "lg", "ch", "hd", "fc", "ey", "hr", "rh", "rs"],
    figure,
    release,
    direction,
    {
      action: "std",
      animFrame: 0,
      headDirection,
      preferredCasts: ["hh_people_1", "hh_people_2"],
      memberPrefix: "h",
      layerCacheKey: `infostand:${selectedId}:${figureRaw}:${direction}:${headDirection}`
    }
  );
  if (sourceLayers.length === 0) {
    return undefined;
  }

  const width = 64;
  const height = 102;
  const flipH = true;
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width,
    height,
    regPoint: { x: width / 2, y: height },
    composite: {
      width,
      height,
      layers: sourceLayers.map((layer: { readonly assetPath: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly alpha?: number; readonly tint?: string; readonly ink: number }) => ({
        assetPath: layer.assetPath,
        x: flipH ? width - layer.x - layer.width : layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        sourceWidth: layer.width,
        sourceHeight: layer.height,
        ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}),
        ...(flipH ? { flipH: true } : {}),
        ...(layer.tint !== undefined ? { tint: layer.tint } : {}),
        ink: layer.ink
      }))
    }
  };
}

export function createInfoStandObjectImageMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest | undefined {
  const info = getSelectedRoomObjectInfoRuntime(host);
  if (!info) {
    return undefined;
  }

  const asset = host.getBitmapAssetByMemberName(info.smallMemberName, [
    "hh_furni_small",
    "hh_furni_items",
    "hh_furni_armas",
    "hh_furni_drken",
    "hh_furni_special",
    "hh_room_private"
  ]) ?? getSelectedRoomObjectFirstAssetRuntime(host, info);
  if (!asset) {
    return undefined;
  }

  const x = Math.round((geometry.width - asset.width) / 2);
  const y = Math.round(geometry.height - asset.height);
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    regPoint: { x: Math.round(geometry.width / 2), y: geometry.height },
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers: [{
        assetPath: asset.inkAssetPaths?.["8"] ?? asset.pngPath,
        x,
        y,
        width: asset.width,
        height: asset.height,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        ink: 8
      }]
    }
  };
}

export function createInfoStandBadgeMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const selectedBadge = getSelectedInfoStandBadgeRuntime(host);
  const visible = getSelectedInfoStandBadgeVisibleRuntime(host);
  return createCenteredBadgeMemberRuntime(host, number, window, elementId, geometry, selectedBadge, visible ? 1 : 0.4);
}

export function createBadgePreviewMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const badges = getAvailableBadgesRuntime(host);
  const index = host.getBadgeChooserChosenIndex();
  const badgeId = badges[index - 1] ?? "";
  return createCenteredBadgeMemberRuntime(host, number, window, elementId, geometry, badgeId, 1);
}

export function createBadgeVisibilityRadioMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const visibleValue = host.movie.getProperty("badgeChooserVisible");
  const visible = Number(visibleValue ?? (getSelectedInfoStandBadgeVisibleRuntime(host) ? 1 : 0)) !== 0;
  const selected = elementId === "badge.visible.radio" ? visible : !visible;
  const asset = host.getAnyBitmapAssetByMemberName(selected ? "button.radio.on" : "button.radio.off", ["hh_interface"]);
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers: asset ? [{
        assetPath: asset.inkAssetPaths?.["8"] ?? asset.pngPath,
        x: 0,
        y: 0,
        width: asset.width,
        height: asset.height,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        ink: 8
      }] : []
    }
  };
}

export function createCenteredBadgeMemberRuntime(
  host: HabboRoomSelectionRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  badgeId: string,
  alpha: number
): DirectorMemberManifest {
  const asset = resolveInfoStandBadgeAssetRuntime(host, badgeId);
  const layers: DirectorBitmapCompositeLayer[] = asset ? [{
    assetPath: asset.inkAssetPaths?.["36"] ?? asset.pngPath,
    x: Math.round((geometry.width - asset.width) / 2),
    y: Math.round((geometry.height - asset.height) / 2),
    width: asset.width,
    height: asset.height,
    sourceWidth: asset.width,
    sourceHeight: asset.height,
    alpha,
    ink: 0
  }] : [];
  const effectLayer = elementId === "info_badge" && alpha > 0 && isBadgeEffectBadge(badgeId)
    ? createBadgeEffectLayerRuntime(host, geometry)
    : undefined;
  if (effectLayer) {
    layers.push(effectLayer);
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

export function createBadgeEffectLayerRuntime(
  host: HabboRoomSelectionRuntimeHost,
  geometry: { readonly width: number; readonly height: number }
): DirectorBitmapCompositeLayer | undefined {
  const frame = clampOneBasedIndex(numberFromUnknown(host.movie.getProperty("badgeEffectFrame")) || 1, 9);
  const asset = host.getAnyBitmapAssetByMemberName(`starblink${frame}`, ["hh_interface"]);
  if (!asset) {
    return undefined;
  }

  const point = getBadgeEffectPointRuntime(host, geometry);
  return {
    assetPath: asset.inkAssetPaths?.["36"] ?? asset.pngPath,
    x: Math.max(0, Math.min(Math.max(0, geometry.width - asset.width), point.x)),
    y: Math.max(0, Math.min(Math.max(0, geometry.height - asset.height), point.y)),
    width: asset.width,
    height: asset.height,
    sourceWidth: asset.width,
    sourceHeight: asset.height,
    ink: 36
  };
}

export function getBadgeEffectPointRuntime(
  host: HabboRoomSelectionRuntimeHost,
  geometry: { readonly width: number; readonly height: number }
): HabboBadgeEffectPoint {
  const value = host.movie.getProperty("badgeEffectPoint");
  if (isBadgeEffectPoint(value)) {
    return value;
  }

  const step = nextBadgeEffectStep(0, 0, undefined, 0, geometry);
  host.movie.setProperty("badgeEffectPoint", step.point);
  return step.point;
}

export function resolveInfoStandBadgeAssetRuntime(
  host: HabboRoomSelectionRuntimeHost,
  badgeId: string
): HabboWindowBitmapAsset | undefined {
  const normalizedBadgeId = normalizeBadgeMemberId(badgeId);
  if (!normalizedBadgeId) {
    return undefined;
  }

  if (isHabboClubBadge(normalizedBadgeId)) {
    return host.getAnyBitmapAssetByMemberName("club_icon", ["hh_interface"])
      ?? host.getAnyBitmapAssetByMemberName(badgeMemberName(normalizedBadgeId), ["hh_interface", "hh_club"]);
  }

  return host.getAnyBitmapAssetByMemberName(badgeMemberName(normalizedBadgeId), ["hh_interface", "hh_club"]);
}

export function getSelectedRoomUserRuntime(host: HabboRoomSelectionRuntimeHost): HabboRoomUserRecord | undefined {
  const selectedId = String(host.movie.getProperty("selectedRoomObjectId") ?? "");
  if (!selectedId) {
    return undefined;
  }

  const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  return users[selectedId] ?? Object.values(users).find((user) => user.id === selectedId);
}

export function getOwnRoomUserRuntime(host: HabboRoomSelectionRuntimeHost): HabboRoomUserRecord | undefined {
  const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  const session = host.objectManager.getObject("#session");
  const ownUserId = stringFromSession(session, "user_index");
  const direct = ownUserId ? users[ownUserId] : undefined;
  if (isRoomUserRecord(direct)) {
    return direct;
  }

  const ownUserName = stringFromSession(session, "userName") || stringFromSession(session, "user_name");
  return Object.values(users).find((user) => isRoomUserRecord(user) && user.name === ownUserName);
}

export function getSelectedRoomUserInfoRuntime(host: HabboRoomSelectionRuntimeHost): HabboRoomUserInfo | undefined {
  const value = host.movie.getProperty("selectedRoomUserInfo");
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const info = value as HabboRoomUserInfo;
  return info.selectedType === "user" && typeof info.selectedId === "string"
    ? info
    : undefined;
}

export function getSelectedRoomObjectInfoRuntime(host: HabboRoomSelectionRuntimeHost): HabboRoomObjectInfo | undefined {
  const value = host.movie.getProperty("selectedRoomObjectInfo");
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const info = value as HabboRoomObjectInfo;
  return typeof info.selectedId === "string"
    && (info.selectedType === "active" || info.selectedType === "passive" || info.selectedType === "item")
    ? info
    : undefined;
}

export function getSelectedRoomObjectFirstAssetRuntime(
  host: HabboRoomSelectionRuntimeHost,
  info: HabboRoomObjectInfo
): HabboWindowBitmapAsset | undefined {
  const entries = readRoomObjectSpriteEntries(host.movie.getProperty("roomObjectOverlaySpriteEntries"));
  const entry = entries.find((candidate) => candidate.kind === info.selectedType && candidate.id === info.selectedId && !candidate.memberName.endsWith("_sd"));
  return entry ? host.getBitmapAssetByMemberName(entry.memberName, ["hh_furni_items", "hh_furni_armas", "hh_furni_drken", "hh_furni_special", "hh_room_private"]) : undefined;
}

export function getAvailableBadgesRuntime(host: HabboRoomSelectionRuntimeHost): readonly string[] {
  const sessionBadges = host.objectManager.getObject("#session")?.get("available_badges");
  if (Array.isArray(sessionBadges)) {
    return sessionBadges.filter((badge): badge is string => typeof badge === "string" && badge.trim().length > 0);
  }

  const movieBadges = host.movie.getProperty("availableBadges");
  if (Array.isArray(movieBadges)) {
    return movieBadges.filter((badge): badge is string => typeof badge === "string" && badge.trim().length > 0);
  }

  return [];
}

export function getSelectedInfoStandBadgeRuntime(host: HabboRoomSelectionRuntimeHost): string {
  const selected = getSelectedRoomUserRuntime(host);
  const ownUserId = stringFromSession(host.objectManager.getObject("#session"), "user_index");
  if (selected?.id === ownUserId) {
    const badges = getAvailableBadgesRuntime(host);
    return normalizeBadgeId(badges[host.getChosenBadgeIndex() - 1]);
  }

  return normalizeBadgeId(selected?.badge ?? host.movie.getProperty("selectedRoomUserBadge"));
}

export function getSelectedInfoStandBadgeVisibleRuntime(host: HabboRoomSelectionRuntimeHost): boolean {
  const selected = getSelectedRoomUserRuntime(host);
  const ownUserId = stringFromSession(host.objectManager.getObject("#session"), "user_index");
  if (selected?.id !== ownUserId) {
    return true;
  }

  const value = host.objectManager.getObject("#session")?.get("badge_visible") ?? host.movie.getProperty("badgeVisible");
  return Number(value ?? 1) !== 0;
}

export function advanceBadgeEffectAnimationRuntime(
  host: HabboRoomSelectionRuntimeHost,
  deltaMs: number,
  release: string
): boolean {
  const selectedBadge = getSelectedInfoStandBadgeRuntime(host);
  if (!isBadgeEffectBadge(selectedBadge) || !getSelectedInfoStandBadgeVisibleRuntime(host)) {
    return false;
  }

  const found = host.findOpenWindowElement("info_badge");
  if (!found || host.getWindowElementOverride(found.window, "info_badge")?.visible === false) {
    return false;
  }

  const previousElapsed = numberFromUnknown(host.movie.getProperty("badgeEffectElapsedMs"));
  const previousFrame = clampOneBasedIndex(numberFromUnknown(host.movie.getProperty("badgeEffectFrame")) || 1, 9);
  const step = nextBadgeEffectStep(
    previousElapsed,
    previousFrame,
    isBadgeEffectPoint(host.movie.getProperty("badgeEffectPoint")) ? host.movie.getProperty("badgeEffectPoint") as HabboBadgeEffectPoint : undefined,
    deltaMs,
    found.geometry
  );
  host.movie.setProperty("badgeEffectElapsedMs", step.elapsedMs);
  host.movie.setProperty("badgeEffectFrame", step.frame);
  host.movie.setProperty("badgeEffectPoint", step.point);
  if (!step.changed) {
    return false;
  }

  host.syncWindowSpriteChannels(release);
  return true;
}

export function showRoomBarRuntime(host: HabboRoomSelectionRuntimeHost, release: string): boolean {
  let window = host.windows.get(normalizeSymbolKey("Room_bar"));
  if (!window) {
    window = host.createWindow("Room_bar", "empty.window", 0, 452);
    host.registerWindowClient(window, "#room_interface");
    host.registerWindowProcedure(window, "#eventProcRoomBar", "#room_interface", "#mouseUp");
    host.registerWindowProcedure(window, "#eventProcRoomBar", "#room_interface", "#keyDown");
  }

  host.mergeWindowLayout(window, "room_bar.window");
  const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  if (roomData?.type === "private") {
    host.windowTextValues.set("room_info_text", `${host.texts.get("room_name") ?? "Room:"} ${roomData.name}\r${host.texts.get("room_owner") ?? "Owner:"} ${roomData.owner ?? ""}`.trim());
  }
  host.syncWindowSnapshot();
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "ok", "showRoomBar window=room_bar.window");
  return true;
}

export function showRoomInfoStandRuntime(host: HabboRoomSelectionRuntimeHost, release: string): boolean {
  let window = host.windows.get(normalizeSymbolKey("Room_info_stand"));
  const sourcePosition = resolveRoomInfoStandSourcePosition(release);
  if (!window) {
    window = host.createWindow("Room_info_stand", undefined, sourcePosition.x, sourcePosition.y);
    host.registerWindowClient(window, "#room_interface");
    host.registerWindowProcedure(window, "#eventProcInfoStand", "#room_interface", "#mouseUp");
  } else if (window.x !== sourcePosition.x || window.y !== sourcePosition.y) {
    window.x = sourcePosition.x;
    window.y = sourcePosition.y;
  }

  host.mergeWindowLayout(window, "info_stand.window");
  if (!host.movie.getProperty("selectedRoomObjectId")) {
    host.hideWindowElement(window, "bg_darken");
    host.hideWindowElement(window, "info_name");
    host.hideWindowElement(window, "info_text");
    host.hideWindowElement(window, "info_image");
    host.hideWindowElement(window, "info_badge");
  }
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", "showInfostand window=info_stand.window");
  return true;
}

export function selectRoomUserRuntime(host: HabboRoomSelectionRuntimeHost, userId: string, release: string): boolean {
  if (host.movie.getProperty("roomActive") !== true) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const users = coerceRecord(component?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  const user = users[userId] ?? Object.values(users).find((candidate) => candidate.id === userId);
  if (!user) {
    return false;
  }

  const info = buildRoomUserInfo(user);
  const roomInterface = host.objectManager.getObject("#room_interface");
  roomInterface?.set("selectedObj", info.selectedId);
  roomInterface?.set("selectedType", info.selectedType);
  host.movie.setProperty("selectedRoomObjectId", info.selectedId);
  host.movie.setProperty("selectedRoomObjectType", info.selectedType);
  host.movie.setProperty("selectedRoomObjectName", info.name);
  host.movie.setProperty("selectedRoomUserInfo", info);

  const release1PrivateRoomHandled = typeof host.showRelease1SelectedPrivateRoomUserInfo === "function"
    && host.showRelease1SelectedPrivateRoomUserInfo(user, info, release) === true;
  if (!release1PrivateRoomHandled) {
    host.showRoomInfoStand(release);
    host.showSelectedRoomUserInfo(info, release);
    host.showSelectedRoomUserInterface(user, release);
  }

  if (user.x !== undefined && user.y !== undefined) {
    host.queueRoomRequest({ command: "LOOKTO", x: user.x, y: user.y }, release);
  }

  host.recordUnsupportedOnce("room-user-selection-partial", {
    subsystem: "habbo",
    feature: "room-user-selection-partial",
    detail: `${release} Room Interface Class eventProcUserObj selection now drives source-backed info stand, personal action buttons, selected-user hiliter, and LOOKTO; friend/trade/ignore flows and object/furni selection remain partial`,
    source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
  });
  host.logDebug("room", "info", `select user=${info.name} id=${info.selectedId}`);
  return true;
}

export function selectRoomObjectRuntime(
  host: HabboRoomSelectionRuntimeHost,
  kind: HabboRoomSelectableObjectKind,
  objectId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (host.movie.getProperty("roomActive") !== true) {
    return false;
  }

  const object = host.getRoomObject(kind, objectId);
  if (!object) {
    host.clearRoomObjectSelection(release);
    host.recordUnsupportedOnce(`room-object-selection-missing:${kind}:${objectId}`, {
      subsystem: "habbo",
      feature: "room-object-selection-missing",
      detail: `${release} Room Interface Class eventProc${capitalizeRoomObjectKind(kind)}Obj received ${objectId}, but the runtime room component does not have that object record`,
      source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
    });
    return false;
  }

  if (kind === "passive") {
    host.movie.setProperty("lastRoomPassiveObjectClick", {
      objectId,
      className: object.className,
      source: `extracted/projectorrays/${release}/hh_room/casts/External/ParentScript 19 - Passive Object Class.ls`
    });
    host.logDebug("room", "info", `passive object click id=${objectId} class=${object.className}`);
    const roommaticResult = host.activateRoommaticPassiveObject(object, release);
    if (roommaticResult !== undefined) {
      return roommaticResult;
    }
    return host.activateRoomCanvas(release, activation) || true;
  }

  const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
  const info = buildRoomObjectInfo(object, (key) => host.texts.get(key));
  const roomInterface = host.objectManager.getObject("#room_interface");
  roomInterface?.set("selectedObj", info.selectedId);
  roomInterface?.set("selectedType", info.selectedType);
  host.movie.setProperty("selectedRoomObjectId", info.selectedId);
  host.movie.setProperty("selectedRoomObjectType", info.selectedType);
  host.movie.setProperty("selectedRoomObjectName", info.name);
  host.movie.setProperty("selectedRoomObjectInfo", info);
  host.movie.setProperty("selectedRoomUserInfo", undefined);
  host.movie.setProperty("selectedRoomUserBadge", "");

  const release1PrivateRoomObjectHandled = typeof host.showRelease1SelectedPrivateRoomObjectInfo === "function"
    && host.showRelease1SelectedPrivateRoomObjectInfo(object, info, release) === true;
  if (!release1PrivateRoomObjectHandled) {
    host.showRoomInfoStand(release);
    host.showSelectedRoomObjectInfo(info, release);
    host.showSelectedRoomObjectInterface(object, release);
  }
  host.recordUnsupportedOnce("room-object-selection-partial", {
    subsystem: "habbo",
    feature: "room-object-selection-partial",
    detail: `${release} Room Interface Class eventProcActiveObj/eventProcItemObj selection now drives source-backed info stand, object action buttons, active Object Mover preview, rotate/pick/delete command paths, and room-click placement; full object program classes remain incomplete`,
    source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
  });
  host.logDebug("room", "info", `select ${kind} object=${info.name} id=${info.selectedId}`);

  if (kind === "active" && host.activateSelectedActiveObjectProgram(object, sourceClassValue, release, activation)) {
    return true;
  }

  if (
    kind === "active"
    && activation?.event !== "mouseUp"
    && !roomObjectHasSourceSelectOverride(sourceClassValue)
    && object.x !== undefined
    && object.y !== undefined
  ) {
    host.queueRoomRequest({ command: "MOVE", x: object.x, y: object.y }, release);
    host.movie.setProperty("lastRoomObjectFallbackMove", {
      objectId: object.id,
      className: object.className,
      x: object.x,
      y: object.y,
      source: HABBO_ROOM_ACTIVE_OBJECT_SOURCE
    });
    host.logDebug("room", "info", `active object fallback MOVE id=${object.id} x=${object.x} y=${object.y}`);
  }
  return true;
}

export function activateRoomObjectInterfaceElementRuntime(
  host: HabboRoomSelectionRuntimeHost,
  elementId: string,
  release: string
): boolean {
  const selected = getSelectedRoomUserRuntime(host);
  const selectedId = String(host.movie.getProperty("selectedRoomObjectId") ?? "");
  const selectedType = String(host.movie.getProperty("selectedRoomObjectType") ?? "");
  const selectedObject = selectedType === "active" || selectedType === "item" || selectedType === "passive"
    ? getRoomObjectRuntime(host, selectedType, selectedId)
    : undefined;
  if (!selected && !selectedObject) {
    host.removeWindow("Room_interface");
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    return false;
  }

  if (selectedObject) {
    return host.activateRoomFurniInterfaceElement(elementId, selectedObject, release);
  }

  if (!selected) {
    return false;
  }

  switch (elementId) {
    case "dance.button":
      if (hasRoomUserAction(selected, "dance")) {
        host.queueRoomRequest({ command: "STOP", action: "Dance" }, release);
      } else {
        host.queueRoomRequest({ command: "STOP", action: "CarryDrink" }, release);
        host.queueRoomRequest({ command: "DANCE" }, release);
      }
      host.logDebug("room", "info", "eventProcInterface dance.button");
      return true;
    case "wave.button":
      if (hasRoomUserAction(selected, "dance")) {
        host.queueRoomRequest({ command: "STOP", action: "Dance" }, release);
      }
      host.queueRoomRequest({ command: "WAVE" }, release);
      host.logDebug("room", "info", "eventProcInterface wave.button");
      return true;
    case "badge.button":
      return openBadgeWindowRuntime(host, release);
    default:
      host.recordUnsupportedOnce(`room-interface-element-unhandled:${elementId}`, {
        subsystem: "lingo",
        feature: "room-interface-element-unhandled",
        detail: `${release} Room Interface Class eventProcInterface received ${elementId}; this object action is recorded but not translated yet`,
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
      host.logDebug("room", "warn", `unhandled object interface element=${elementId}`);
      return false;
  }
}

export function showRoomDeleteConfirmRuntime(
  host: HabboRoomSelectionRuntimeHost,
  object: HabboRoomObjectRecord,
  release: string
): boolean {
  const title = host.getText(HABBO_ROOM_DELETE_CONFIRM_TITLE_KEY) ?? HABBO_ROOM_DELETE_CONFIRM_FALLBACK_TITLE;
  if (host.windows.has(normalizeSymbolKey(title))) {
    return true;
  }

  const window = host.createWindow(title, HABBO_ROOM_DELETE_CONFIRM_TEMPLATE, 200, 120);
  host.mergeWindowLayout(window, HABBO_ROOM_DELETE_CONFIRM_LAYOUT);
  host.registerWindowClient(window, "#room_interface");
  host.registerWindowProcedure(window, "#eventProcDelConfirm", "#room_interface", "#mouseUp");
  host.windowTextValues.set(
    "habbo_decision_text_a",
    host.getText(HABBO_ROOM_DELETE_CONFIRM_TEXT_A_KEY) ?? HABBO_ROOM_DELETE_CONFIRM_TEXT_A_FALLBACK
  );
  host.windowTextValues.set(
    "habbo_decision_text_b",
    host.getText(HABBO_ROOM_DELETE_CONFIRM_TEXT_B_KEY) ?? HABBO_ROOM_DELETE_CONFIRM_TEXT_B_FALLBACK
  );
  host.movie.setProperty("roomDeleteConfirmWindowId", title);
  host.movie.setProperty("roomDeleteConfirm", {
    objectId: object.id,
    kind: object.kind,
    className: object.className,
    source: HABBO_ROOM_FURNITURE_SOURCE
  });
  host.movie.setProperty("lastRoomObjectDeleteRequest", {
    action: "confirm-open",
    objectId: object.id,
    kind: object.kind,
    className: object.className,
    source: HABBO_ROOM_FURNITURE_SOURCE
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", `object delete confirm id=${object.id} kind=${object.kind}`);
  return true;
}

export function hideRoomDeleteConfirmRuntime(host: HabboRoomSelectionRuntimeHost): void {
  const title = String(host.movie.getProperty("roomDeleteConfirmWindowId") ?? (host.getText(HABBO_ROOM_DELETE_CONFIRM_TITLE_KEY) ?? HABBO_ROOM_DELETE_CONFIRM_FALLBACK_TITLE));
  host.removeWindow(title);
  host.movie.setProperty("roomDeleteConfirmWindowId", undefined);
}

export function activateRoomDeleteConfirmElementRuntime(
  host: HabboRoomSelectionRuntimeHost,
  elementId: string,
  release: string
): boolean {
  const action = resolveRoomDeleteConfirmAction(elementId);
  if (!action) {
    return false;
  }

  const pending = readRoomDeleteConfirmationState(host.movie.getProperty("roomDeleteConfirm"));
  hideRoomDeleteConfirmRuntime(host);
  if (action === "cancel") {
    host.movie.setProperty("roomDeleteConfirm", undefined);
    host.movie.setProperty("lastRoomObjectDeleteRequest", {
      action: "cancel",
      source: HABBO_ROOM_FURNITURE_SOURCE
    });
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("room", "info", "object delete cancelled");
    return true;
  }

  if (!pending) {
    host.movie.setProperty("roomDeleteConfirm", undefined);
    host.syncWindowFieldValueSnapshot();
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    return true;
  }

  if (pending.kind === "active") {
    host.queueRoomRequest({ command: "REMOVESTUFF", objectId: pending.objectId }, release);
  } else {
    host.queueRoomRequest({ command: "REMOVEITEM", objectId: pending.objectId }, release);
  }
  host.movie.setProperty("roomDeleteConfirm", undefined);
  host.movie.setProperty("lastRoomObjectDeleteRequest", {
    action: "delete",
    objectId: pending.objectId,
    kind: pending.kind,
    className: pending.className,
    command: pending.kind === "active" ? "REMOVESTUFF" : "REMOVEITEM",
    source: HABBO_ROOM_FURNITURE_SOURCE
  });
  host.clearRoomObjectSelection(release);
  host.logDebug("room", "info", `object delete queued id=${pending.objectId} kind=${pending.kind}`);
  return true;
}

export function openBadgeWindowRuntime(host: HabboRoomSelectionRuntimeHost, release: string): boolean {
  const badges = getAvailableBadgesRuntime(host);
  if (badges.length === 0) {
    return false;
  }

  host.removeWindow("badge_choice_window");
  const window = host.createWindow("badge_choice_window", "habbo_basic.window", 360, 195);
  host.registerWindowClient(window, "#Room_badge");
  host.registerWindowProcedure(window, "#eventProcBadgeChooser", "#Room_badge", "#mouseUp");
  host.mergeWindowLayout(window, "habbo_badge_select.window");
  const chosenBadgeIndex = host.getChosenBadgeIndex();
  host.movie.setProperty("badgeChooserChosenIndex", chosenBadgeIndex);
  host.movie.setProperty("badgeChooserVisible", getSelectedInfoStandBadgeVisibleRuntime(host) ? 1 : 0);
  if (badges.length === 1) {
    host.hideWindowElement(window, "badge.next.button");
    host.hideWindowElement(window, "badge.prev.button");
  }

  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", `openBadgeWindow count=${badges.length} chosen=${chosenBadgeIndex}`);
  return true;
}

export function activateBadgeChooserElementRuntime(
  host: HabboRoomSelectionRuntimeHost,
  elementId: string,
  release: string
): boolean {
  const badges = getAvailableBadgesRuntime(host);
  const session = host.objectManager.getObject("#session");
  switch (elementId) {
    case "badge.hidden.radio":
      host.movie.setProperty("badgeChooserVisible", 0);
      host.syncWindowSpriteChannels(release);
      return true;
    case "badge.visible.radio":
      host.movie.setProperty("badgeChooserVisible", 1);
      host.syncWindowSpriteChannels(release);
      return true;
    case "badge.next.button":
    case "badge.prev.button": {
      const direction = elementId === "badge.next.button" ? 1 : -1;
      const nextIndex = nextBadgeIndex(host.getBadgeChooserChosenIndex(), badges.length, direction);
      host.movie.setProperty("badgeChooserChosenIndex", nextIndex);
      host.syncWindowSpriteChannels(release);
      return true;
    }
    case "badge.cancel":
      host.removeWindow("badge_choice_window");
      host.syncWindowSnapshot();
      host.syncWindowSpriteChannels(release);
      return true;
    case "badge.ok": {
      const chosenIndex = host.getBadgeChooserChosenIndex();
      const badge = badges[chosenIndex - 1] ?? "";
      const visible = Number(host.movie.getProperty("badgeChooserVisible") ?? session?.get("badge_visible") ?? 1) !== 0 ? 1 : 0;
      if (!badge) {
        return false;
      }

      session?.set("chosen_badge_index", chosenIndex);
      session?.set("badge_visible", visible);
      host.movie.setProperty("chosenBadgeIndex", chosenIndex);
      host.movie.setProperty("badgeVisible", visible);
      host.queueRoomRequest({ command: "SETBADGE", badge, visible }, release);
      host.removeWindow("badge_choice_window");
      host.syncWindowSnapshot();
      host.syncWindowSpriteChannels(release);
      host.logDebug("room", "info", `SETBADGE badge=${badge} visible=${visible}`);
      return true;
    }
    default:
      return false;
  }
}

export function toggleOwnBadgeVisibilityRuntime(host: HabboRoomSelectionRuntimeHost, release: string): boolean {
  const selected = getSelectedRoomUserRuntime(host);
  const session = host.objectManager.getObject("#session");
  if (!selected || selected.id !== stringFromSession(session, "user_index")) {
    return false;
  }

  const badges = getAvailableBadgesRuntime(host);
  const badge = badges[host.getChosenBadgeIndex() - 1] ?? "";
  if (!badge) {
    return false;
  }

  const visible = getSelectedInfoStandBadgeVisibleRuntime(host) ? 0 : 1;
  session?.set("badge_visible", visible);
  host.movie.setProperty("badgeVisible", visible);
  host.queueRoomRequest({ command: "SETBADGE", badge, visible }, release);
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", `toggleOwnBadgeVisibility badge=${badge} visible=${visible}`);
  return true;
}

export function getRoomObjectRuntime(
  host: HabboRoomSelectionRuntimeHost,
  kind: HabboRoomSelectableObjectKind,
  objectId: string
): HabboRoomObjectRecord | undefined {
  const component = host.objectManager.getObject("#room_component");
  const source = kind === "active"
    ? component?.get("activeObjects")
    : kind === "passive"
      ? component?.get("passiveObjects")
      : component?.get("itemObjects");
  const objects = coerceRecord(source) as Record<string, HabboRoomObjectRecord>;
  const object = objects[objectId] ?? Object.values(objects).find((candidate) => candidate.id === objectId);
  return isRoomObjectRecord(object) ? object : undefined;
}

export function activateRoommaticPassiveObjectRuntime(
  host: HabboRoomSelectionRuntimeHost,
  object: HabboRoomObjectRecord,
  release: string
): boolean | undefined {
  if (!host.roomObjectUsesClass(object.className, "Roommatic Class")) {
    return undefined;
  }

  if (object.x === undefined || object.y === undefined) {
    host.recordUnsupportedOnce(`roommatic-location-missing:${object.id}`, {
      subsystem: "habbo",
      feature: "roommatic-location-missing",
      detail: `${release} Roommatic Class select requires pLocX/pLocY for ${object.className} ${object.id}, but the passive object packet did not include a tile location`,
      source: `extracted/projectorrays/${release}/hh_kiosk_room/casts/External/ParentScript 39 - Roommatic Class.ls`
    });
    return false;
  }

  const ownUser = host.getOwnRoomUser();
  if (!ownUser || ownUser.x === undefined || ownUser.y === undefined) {
    host.recordUnsupportedOnce(`roommatic-own-user-missing:${object.id}`, {
      subsystem: "habbo",
      feature: "roommatic-own-user-missing",
      detail: `${release} Roommatic Class select expected getOwnUser() before using ${object.className} ${object.id}, but the runtime could not resolve the current room user`,
      source: `extracted/projectorrays/${release}/hh_kiosk_room/casts/External/ParentScript 39 - Roommatic Class.ls`
    });
    return false;
  }

  const directionValue = Array.isArray(object.direction) ? Number(object.direction[0] ?? 0) : Number(object.direction ?? 0);
  const direction = Number.isFinite(directionValue) ? moduloDirection(directionValue) : 0;
  const useTile = roommaticUseTile(object.x, object.y, direction);
  if (!useTile) {
    host.recordUnsupportedOnce(`roommatic-direction-unhandled:${direction}`, {
      subsystem: "habbo",
      feature: "roommatic-direction-unhandled",
      detail: `${release} Roommatic Class select has source cases for directions 0, 2, 4, and 6; ${object.className} ${object.id} used direction ${direction}`,
      source: `extracted/projectorrays/${release}/hh_kiosk_room/casts/External/ParentScript 39 - Roommatic Class.ls`
    });
    return true;
  }

  const source = `extracted/projectorrays/${release}/hh_kiosk_room/casts/External/ParentScript 39 - Roommatic Class.ls`;
  if (ownUser.x === useTile.x && ownUser.y === useTile.y) {
    host.queueRoomRequest({ command: "LOOKTO", x: object.x, y: object.y }, release);
    const opened = host.executeMessage("#open_roomkiosk", undefined, release);
    host.movie.setProperty("lastRoommaticObjectAction", {
      objectId: object.id,
      className: object.className,
      direction,
      action: "open",
      lookTo: { x: object.x, y: object.y },
      user: { id: ownUser.id, x: ownUser.x, y: ownUser.y },
      source
    });
    host.logDebug("room", opened ? "ok" : "warn", `roommatic object=${object.id} open=${opened}`);
    return opened;
  }

  host.queueRoomRequest({ command: "MOVE", x: useTile.x, y: useTile.y }, release);
  host.movie.setProperty("lastRoommaticObjectAction", {
    objectId: object.id,
    className: object.className,
    direction,
    action: "move",
    moveTo: useTile,
    user: { id: ownUser.id, x: ownUser.x, y: ownUser.y },
    source
  });
  host.logDebug("room", "info", `roommatic object=${object.id} move=${useTile.x},${useTile.y}`);
  return true;
}

export function roomObjectUsesClassRuntime(
  host: HabboRoomSelectionRuntimeHost,
  className: string,
  sourceClassName: string
): boolean {
  const normalizedClassName = normalizeRoomObjectClassName(className);
  const sourceValue = host.getRoomObjectSourceClassValue(className);
  if (sourceValue) {
    return sourceClassValueContains(sourceValue, sourceClassName);
  }

  return normalizedClassName === "roommatic" && sourceClassName === "Roommatic Class";
}

export function getRoomObjectSourceClassValueRuntime(host: HabboRoomSelectionRuntimeHost, className: string): string | undefined {
  const normalizedClassName = normalizeRoomObjectClassName(className);
  const classList = host.findExternalCastTextField("object.cast")
    ?? host.findExternalCastTextField("fuse.object.classes");
  const sourceValue = classList?.properties[normalizedClassName] ?? classList?.properties[className];
  return typeof sourceValue === "string" ? sourceValue : undefined;
}

export function resolveRoomObjectLabelRuntime(host: HabboRoomSelectionRuntimeHost, object: HabboRoomObjectRecord): string {
  return buildRoomObjectInfo(object, (key) => host.texts.get(key)).name;
}

export function sessionHasRightRuntime(host: HabboRoomSelectionRuntimeHost, right: string): boolean {
  const value = host.objectManager.getObject("#session")?.get("user_rights");
  if (Array.isArray(value)) {
    return value.includes(right);
  }

  if (value instanceof LingoList) {
    return value.toArray().some((entry) => entry === right);
  }

  if (typeof value === "string") {
    return value.includes(right);
  }

  return false;
}

export function clearRoomObjectSelectionRuntime(host: HabboRoomSelectionRuntimeHost, release: string): void {
  const roomInterface = host.objectManager.getObject("#room_interface");
  roomInterface?.set("selectedObj", "");
  roomInterface?.set("selectedType", "");
  host.movie.setProperty("selectedRoomObjectId", "");
  host.movie.setProperty("selectedRoomObjectType", "");
  host.movie.setProperty("selectedRoomObjectName", "");
  host.movie.setProperty("selectedRoomObjectInfo", undefined);
  host.movie.setProperty("selectedRoomUserInfo", undefined);
  host.removeWindow("Room_interface");
  const window = host.windows.get(normalizeSymbolKey("Room_info_stand"));
  if (window) {
    host.hideWindowElement(window, "bg_darken");
    host.hideWindowElement(window, "info_name");
    host.hideWindowElement(window, "info_text");
    host.hideWindowElement(window, "info_image");
    host.hideWindowElement(window, "info_badge");
  }
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
}

export function showSelectedRoomUserInfoRuntime(
  host: HabboRoomSelectionRuntimeHost,
  info: { readonly name: string; readonly custom: string; readonly badge: string },
  release: string
): void {
  const window = host.windows.get(normalizeSymbolKey("Room_info_stand"));
  if (!window) {
    return;
  }

  host.windowTextValues.set("info_name", info.name);
  host.windowTextValues.set("info_text", info.custom);
  host.showWindowElement(window, "bg_darken");
  host.showWindowElement(window, "info_name");
  host.showWindowElement(window, "info_text");
  host.showWindowElement(window, "info_image");
  host.showWindowElement(window, "info_badge");
  host.movie.setProperty("selectedRoomUserBadge", info.badge);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
}

export function showSelectedRoomObjectInfoRuntime(
  host: HabboRoomSelectionRuntimeHost,
  info: HabboRoomObjectInfo,
  release: string
): void {
  const window = host.windows.get(normalizeSymbolKey("Room_info_stand"));
  if (!window) {
    return;
  }

  host.windowTextValues.set("info_name", info.name);
  host.windowTextValues.set("info_text", info.custom);
  host.showWindowElement(window, "bg_darken");
  host.showWindowElement(window, "info_name");
  host.showWindowElement(window, "info_text");
  host.showWindowElement(window, "info_image");
  host.hideWindowElement(window, "info_badge");
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
}

export function showSelectedRoomUserInterfaceRuntime(
  host: HabboRoomSelectionRuntimeHost,
  user: HabboRoomUserRecord,
  release: string
): boolean {
  const session = host.objectManager.getObject("#session");
  const ownUserId = stringFromSession(session, "user_index");
  const controlType = resolveRoomUserControlType(
    user.id,
    ownUserId,
    Number(session?.get("room_owner") ?? 0) !== 0,
    Number(session?.get("room_controller") ?? 0) !== 0
  );
  let buttonList = [...host.readCastListVariable(`interface.cmds.user.${controlType}`)];
  if (controlType === "personal" && host.getAvailableBadges().length === 0) {
    buttonList = buttonList.filter((entry) => entry !== "badge");
  }

  if (buttonList.length === 0) {
    host.removeWindow("Room_interface");
    return false;
  }

  return showObjectInterfaceButtonsWithWindowRuntime(host, buttonList, release);
}

export function showSelectedRoomObjectInterfaceRuntime(
  host: HabboRoomSelectionRuntimeHost,
  object: HabboRoomObjectRecord,
  release: string
): boolean {
  const session = host.objectManager.getObject("#session");
  const roomController = Number(session?.get("room_controller") ?? 0) !== 0 || host.sessionHasRight("fuse_any_room_controller");
  const roomOwner = Number(session?.get("room_owner") ?? 0) !== 0;
  const canControlFurni = roomOwner || roomController || host.sessionHasRight("fuse_pick_up_any_furni");
  if ((object.kind === "active" || object.kind === "item") && !canControlFurni) {
    host.removeWindow("Room_interface");
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    return false;
  }

  const controlType = roomOwner ? "owner" : roomController ? "ctrl" : "";
  let buttonList = controlType ? [...host.readCastListVariable(`interface.cmds.${object.kind}.${controlType}`)] : [];
  if ((object.kind === "active" || object.kind === "item") && host.sessionHasRight("fuse_pick_up_any_furni") && !buttonList.includes("pick")) {
    buttonList.push("pick");
  }

  if (buttonList.length === 0) {
    host.removeWindow("Room_interface");
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.movie.setProperty("roomInterfaceButtons", []);
    return false;
  }

  host.showObjectInterfaceButtons(buttonList, release);
  return true;
}

export function showObjectInterfaceButtonsRuntime(
  host: HabboRoomSelectionRuntimeHost,
  buttonList: readonly string[],
  release: string
): boolean {
  return showObjectInterfaceButtonsWithWindowRuntime(host, buttonList, release);
}

function showObjectInterfaceButtonsWithWindowRuntime(
  host: HabboRoomSelectionRuntimeHost,
  buttonList: readonly string[],
  release: string
): boolean {
  let window = host.windows.get(normalizeSymbolKey("Room_interface"));
  if (!window) {
    window = host.createWindow("Room_interface", undefined, 0, 466);
    host.registerWindowClient(window, "#room_interface");
    host.registerWindowProcedure(window, "#eventProcInterface", "#room_interface", "#mouseUp");
  }

  host.mergeWindowLayout(window, "object_interface.window");
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry: { readonly memberName: string }) => entry.memberName.toLowerCase() === "object_interface.window");
  if (!layout) {
    return false;
  }

  for (const element of layout.elements) {
    if (element.id?.endsWith(".button")) {
      host.hideWindowElement(window, element.id);
    }
  }

  let rightMargin = 4;
  for (const action of buttonList) {
    const elementId = `${action}.button`;
    const element = layout.elements.find((candidate: { readonly id?: string }) => candidate.id === elementId);
    if (!element) {
      continue;
    }

    const geometry = resolveWindowElementGeometry(layout, element, resolveLayoutRenderSize(layout).width, resolveLayoutRenderSize(layout).height);
    const prepared = host.prepareRuntimeButton(element, geometry, labelForElement(host.texts, element), { applyAlignmentOffset: false });
    rightMargin += (prepared?.width ?? geometry.width) + 2;
    host.showWindowElement(window, elementId);
    host.moveWindowElementH(window, elementId, host.movie.stage.width - rightMargin);
  }

  host.movie.setProperty("roomInterfaceButtons", [...buttonList]);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  return true;
}

function resolveRoomInfoStandSourcePosition(release: string): { readonly x: number; readonly y: number } {
  return release.startsWith("release14")
    ? { x: 552, y: 300 }
    : { x: 552, y: 332 };
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function isBadgeEffectPoint(value: unknown): value is HabboBadgeEffectPoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as { readonly x?: unknown; readonly y?: unknown };
  return typeof point.x === "number" && Number.isFinite(point.x)
    && typeof point.y === "number" && Number.isFinite(point.y);
}
