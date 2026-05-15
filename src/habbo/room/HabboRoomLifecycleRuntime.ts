import type { DirectorBitmapCompositeLayer, DirectorMemberManifest, DirectorSpriteChannelManifest } from "../../runtime";
import type { HabboExternalCastVisualLayoutSet } from "../boot/HabboBootResourceTypes";
import {
  normalizeCastName,
  normalizeSymbolKey,
  coerceRecord,
  directorLine,
  numberFromUnknown,
  numberProperty,
  parseLoadingBarProps,
  readLingoPacketWord,
  rgbToHex,
  stringProperty
} from "../HabboSourceValueHelpers";
import {
  colorForPrivateRoomWallMember,
  isPrivateRoomFloorVisualElement,
  isPrivateRoomWallVisualElement,
  resolvePrivateRoomFloorMemberName,
  resolvePrivateRoomWallMemberName
} from "./HabboPrivateRoomPatterns";
import { ROOM_CAST_CALLBACK_FRAME_DELAY_MS, roomHoldText, roomLoadingText, roomPreparingText } from "./HabboRoomLifecycle";
import { readSpriteManifestArray, uniqueStrings } from "./HabboRoomObjectSpritePlanning";
import { isRoomObjectRecord } from "./HabboRoomObjectData";
import type { HabboWindowRecord } from "../window/HabboWindowTypes";
import {
  readPrivateRoomProgramState,
  readRoomDataStruct,
  readRoomRequests,
  readRoomVisual,
  type HabboPrivateRoomPatterns,
  type HabboPrivateRoomProgramState,
  type HabboRoomPattern,
  type HabboRoomRequest
} from "./HabboRoomData";
import {
  resolveLayoutBorder,
  resolveLayoutRenderSize,
  zeroWindowBorder
} from "../window/HabboWindowLayoutHelpers";

const roomInterfaceClassSource = "hh_room/casts/External/ParentScript 3 - Room Interface Class.ls";
const roomComponentClassSource = "hh_room/casts/External/ParentScript 4 - Room Component Class.ls";

export interface HabboRoomLifecycleRuntimeHost {
  readonly externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet;
  readonly loadedCastSlots: Map<string, number>;
  [key: string]: any;
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function createRoomLoaderBarMemberRuntime(
  host: HabboRoomLifecycleRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const props = parseLoadingBarProps(host.getVariable("loading.bar.props"));
  const barWidth = Math.max(1, Math.min(geometry.width, props.width));
  const barHeight = Math.max(1, Math.min(geometry.height, props.height));
  const barX = Math.floor((geometry.width - barWidth) / 2);
  const barY = Math.floor((geometry.height - barHeight) / 2);
  const innerWidth = Math.max(0, barWidth - 4);
  const innerHeight = Math.max(0, barHeight - 4);
  const percent = Math.max(0, Math.min(1, numberFromUnknown(host.movie.getProperty("roomLoaderProgress"), 0)));
  const fillWidth = Math.max(0, Math.round(innerWidth * percent));
  const layers: DirectorBitmapCompositeLayer[] = [
    {
      fillColor: "#ffffff",
      x: barX,
      y: barY,
      width: barWidth,
      height: barHeight
    },
    {
      fillColor: props.color,
      x: barX,
      y: barY,
      width: barWidth,
      height: 1
    },
    {
      fillColor: props.color,
      x: barX,
      y: barY + barHeight - 1,
      width: barWidth,
      height: 1
    },
    {
      fillColor: props.color,
      x: barX,
      y: barY,
      width: 1,
      height: barHeight
    },
    {
      fillColor: props.color,
      x: barX + barWidth - 1,
      y: barY,
      width: 1,
      height: barHeight
    },
    ...(fillWidth > 0
      ? [
          {
            fillColor: props.color,
            x: barX + 2,
            y: barY + 2,
            width: fillWidth,
            height: innerHeight
          } satisfies DirectorBitmapCompositeLayer
        ]
      : [])
  ];

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

export function getPrivateRoomPatternsRuntime(host: HabboRoomLifecycleRuntimeHost): HabboPrivateRoomPatterns {
  const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  if (roomData?.type !== "private") {
    return {};
  }

  const state = getPrivateRoomProgramStateRuntime(host);
  const floor = getRoomPatternRuntime(host, "floorpattern_patterns", state.floorModel);
  const wall = getRoomPatternRuntime(host, "wallpattern_patterns", state.wallModel);
  return {
    ...(floor ? { floor } : {}),
    ...(wall ? { wall } : {})
  };
}

export function createDefaultPrivateRoomProgramStateRuntime(host: HabboRoomLifecycleRuntimeHost): HabboPrivateRoomProgramState {
  return {
    floorModel: String(host.getVariable("room.default.floor") ?? "203"),
    wallModel: String(host.getVariable("room.default.wall") ?? "201"),
    floorDefined: false,
    wallDefined: false
  };
}

export function getPrivateRoomProgramStateRuntime(host: HabboRoomLifecycleRuntimeHost): HabboPrivateRoomProgramState {
  return readPrivateRoomProgramState(host.movie.getProperty("privateRoomProgramState"))
    ?? createDefaultPrivateRoomProgramStateRuntime(host);
}

export function setPrivateRoomProgramStateRuntime(host: HabboRoomLifecycleRuntimeHost, state: HabboPrivateRoomProgramState): void {
  host.movie.setProperty("privateRoomProgramState", state);
}

export function handleRoomFlatPropertyPacketRuntime(
  host: HabboRoomLifecycleRuntimeHost,
  body: string,
  release: string
): boolean {
  host.movie.setProperty("lastRoomFlatProperty", body);
  const separator = body.indexOf("/");
  const propertyName = separator >= 0 ? body.slice(0, separator).trim().toLowerCase() : body.trim().toLowerCase();
  const propertyValue = separator >= 0 ? body.slice(separator + 1).trim() : "";
  host.movie.setProperty("lastRoomFlatPropertyParsed", {
    propertyName,
    propertyValue,
    raw: body
  });

  const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  if (roomData?.type !== "private" || !propertyValue) {
    host.logDebug("room", "info", `FLATPROPERTY ${body}`);
    return true;
  }

  const currentState = getPrivateRoomProgramStateRuntime(host);
  const passiveObjects = Object.values(coerceRecord(host.objectManager.getObject("#room_component")?.get("passiveObjects"))).filter(isRoomObjectRecord);
  const currentVisual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));

  if (propertyName === "wallpaper") {
    setPrivateRoomProgramStateRuntime(host, {
      ...currentState,
      wallModel: propertyValue,
      wallDefined: passiveObjects.length > 0
    });
    if (passiveObjects.length > 0) {
      host.renderRoomObjects(release);
    }
    host.logDebug("room", "ok", `FLATPROPERTY wallpaper=${propertyValue} passive=${passiveObjects.length}`);
    return true;
  }

  if (propertyName === "floor") {
    setPrivateRoomProgramStateRuntime(host, {
      ...currentState,
      floorModel: propertyValue,
      floorDefined: currentVisual !== undefined
    });
    if (currentVisual) {
      host.showRoom(currentVisual.visualName, release);
      host.renderRoomObjects(release);
      host.renderRoomUsers(release);
    }
    host.logDebug("room", "ok", `FLATPROPERTY floor=${propertyValue} visual=${currentVisual ? "ready" : "pending"}`);
    return true;
  }

  host.logDebug("room", "info", `FLATPROPERTY ${body}`);
  return true;
}

export function getRoomPatternRuntime(
  host: HabboRoomLifecycleRuntimeHost,
  patternsFieldName: string,
  index: string
): HabboRoomPattern | undefined {
  const normalizedIndex = index.trim();
  if (!/^\d{3,}$/.test(normalizedIndex)) {
    return undefined;
  }

  const fieldLineIndex = Number.parseInt(normalizedIndex.slice(0, -2), 10);
  const patternLineIndex = Number.parseInt(normalizedIndex.slice(-2), 10);
  if (!Number.isFinite(fieldLineIndex) || !Number.isFinite(patternLineIndex)) {
    return undefined;
  }

  const patternsField = host.findField(patternsFieldName);
  const patternFieldName = patternsField ? directorLine(patternsField.field.text, fieldLineIndex) : undefined;
  if (!patternFieldName) {
    return undefined;
  }

  const patternField = host.findField(patternFieldName);
  const rawPattern = patternField ? directorLine(patternField.field.text, patternLineIndex) : undefined;
  if (!rawPattern) {
    return undefined;
  }

  const [type = "0", palette = "", redText = "0", greenText = "0", blueText = "0"] = rawPattern.split(",").map((item) => item.trim());
  const red = Number.parseInt(redText, 10);
  const green = Number.parseInt(greenText, 10);
  const blue = Number.parseInt(blueText, 10);
  if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
    return undefined;
  }

  return {
    index: normalizedIndex,
    type,
    palette,
    color: rgbToHex(red, green, blue),
    raw: rawPattern
  };
}

export function leaveEntryRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  const removed = host.removeWindow("entry_bar");
  host.movie.setProperty("entryBarVisible", false);
  host.movie.setProperty("entryHotelViewVisible", false);
  host.movie.setProperty("entryVisualOverlaySprites", []);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.syncDirectorOverlaySprites();
  host.logDebug("entry", "info", `leaveEntry removedEntryBar=${removed}`);
  return true;
}

export function enterEntryRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  leaveRoomRuntime(host, release, true);
  const hotel = host.showEntryHotelView(release);
  const bar = host.showEntryBar(release);
  host.logDebug("entry", "info", "enterEntry");
  return hotel || bar;
}

export function leaveRoomRuntime(host: HabboRoomLifecycleRuntimeHost, release: string, jumpingToSubUnit = false): boolean {
  host.removeWindow("Room_bar");
  host.removeWindow("Room_info_stand");
  if (!jumpingToSubUnit) {
    host.removeWindow("Loading room");
  }
  host.movie.setProperty("roomVisualOverlaySprites", []);
  host.movie.setProperty("roomUserOverlaySprites", []);
  host.movie.setProperty("roomObjectOverlaySprites", []);
  host.movie.setProperty("roomObjectMoverOverlaySprites", []);
  host.movie.setProperty("roomObjectAnimationPreloadSprites", []);
  host.movie.setProperty("roomObjectAnimationPreloadSourceKey", "");
  host.movie.setProperty("roomObjectAnimationPreloadSignature", "[]");
  host.movie.setProperty("roomCoverOverlaySprites", []);
  host.movie.setProperty("roomObjectOverlaySpriteEntries", []);
  host.movie.setProperty("roomChatMessages", []);
  host.movie.setProperty("roomChatOverlaySprites", []);
  host.movie.setProperty("roomHiliterOverlaySprites", []);
  host.movie.setProperty("roomHandOverlaySprites", []);
  host.movie.setProperty("roomHandInteractiveElements", []);
  host.movie.setProperty("roomHandVisible", false);
  host.movie.setProperty("roomActive", false);
  host.movie.setProperty("release1PrivateRoomMovieActive", false);
  host.movie.setProperty("roomBootstrapPendingFinalize", false);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", 0);
  host.movie.setProperty("roomLoaderRenderedFrames", 0);
  host.movie.setProperty("roomPreRevealBitmapPreloadComplete", false);
  host.movie.setProperty("roomProcessList", {});
  host.setRoomEntryState("idle");
  host.setRoomWirePhase("idle");
  host.objectManager.getObject("#room_component")?.set("activeFlag", 0);
  if (!jumpingToSubUnit) {
    host.objectManager.getObject("#room_component")?.set("saveData", undefined);
    host.objectManager.getObject("#room_component")?.set("userObjects", {});
    host.movie.setProperty("privateRoomProgramState", undefined);
  }
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.syncDirectorOverlaySprites();
  host.logDebug("room", "info", `leaveRoom jumping=${jumpingToSubUnit}`);
  return true;
}

export function queueRoomRequestRuntime(
  host: HabboRoomLifecycleRuntimeHost,
  request: Omit<HabboRoomRequest, "id" | "status">,
  release: string
): void {
  let queued = readRoomRequests(host.movie.getProperty("pendingRoomRequests"));
  if (request.command === "MOVE") {
    const duplicateMove = queued.find((queuedRequest) => queuedRequest.command === "MOVE"
      && Number(queuedRequest.x) === Number(request.x)
      && Number(queuedRequest.y) === Number(request.y)
      && queuedRequest.status === "pending");
    if (duplicateMove) {
      host.logDebug("room", "info", `ignored unsent duplicate MOVE x=${request.x} y=${request.y}`, {
        request: duplicateMove,
        release
      });
      return;
    }

    const retained = queued.filter((queuedRequest) => queuedRequest.command !== "MOVE");
    if (retained.length !== queued.length) {
      host.logDebug("room", "info", `superseded ${queued.length - retained.length} older MOVE request(s) with x=${request.x} y=${request.y}`, {
        release
      });
      queued = retained;
    }
  }

  const nextRequest: HabboRoomRequest = {
    id: host.nextRoomRequestId++,
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingRoomRequests", [...queued, nextRequest]);
  host.logDebug("room", "info", `queued ${nextRequest.command}${nextRequest.roomId ? ` room=${nextRequest.roomId}` : ""}`, {
    request: nextRequest,
    release
  });
}

export function enterRoomRuntime(host: HabboRoomLifecycleRuntimeHost, argument: unknown, release: string): boolean {
  const roomData = readRoomDataStruct(argument);
  if (!roomData) {
    return false;
  }

  const roomEpoch = beginRoomEntryTransitionRuntime(host, release, roomData);
  const roomComponent = host.objectManager.getObject("#room_component");
  roomComponent?.set("roomId", roomData.type === "private" ? "private" : roomData.id);
  roomComponent?.set("activeFlag", 0);
  roomComponent?.set("saveData", roomData);
  roomComponent?.set("roomEntryEpoch", roomEpoch);
  roomComponent?.set("processList", {});
  roomComponent?.set("userObjects", {});
  roomComponent?.set("activeObjects", {});
  roomComponent?.set("passiveObjects", {});
  roomComponent?.set("itemObjects", {});
  host.movie.setProperty("privateRoomProgramState", roomData.type === "private" ? host.createDefaultPrivateRoomProgramState() : undefined);
  const session = host.objectManager.getObject("#session");
  const ownUserName = stringFromSession(session, "userName") || stringFromSession(session, "user_name");
  session?.set("room_owner", roomData.owner && ownUserName && roomData.owner === ownUserName ? 1 : 0);
  session?.set("room_controller", roomData.owner && ownUserName && roomData.owner === ownUserName ? 1 : 0);
  host.movie.setProperty("currentRoomData", roomData);
  host.movie.setProperty("roomUserOverlaySprites", []);
  host.movie.setProperty("roomVisualOverlaySprites", []);
  host.movie.setProperty("roomObjectOverlaySprites", []);
  host.movie.setProperty("roomObjectMoverOverlaySprites", []);
  host.movie.setProperty("roomObjectAnimationPreloadSprites", []);
  host.movie.setProperty("roomObjectAnimationPreloadSourceKey", "");
  host.movie.setProperty("roomObjectAnimationPreloadSignature", "[]");
  host.movie.setProperty("roomCoverOverlaySprites", []);
  host.movie.setProperty("roomObjectOverlaySpriteEntries", []);
  host.movie.setProperty("roomEntryEpoch", roomEpoch);
  setRoomEntryStateRuntime(host, "loading-common-casts");
  host.syncDirectorOverlaySprites();
  host.logDebug("room", "info", `enterRoom id=${roomData.id} type=${roomData.type} casts=${roomData.casts.length}`);
  return host.loadRoomCasts(release);
}

export function beginRoomEntryTransitionRuntime(host: HabboRoomLifecycleRuntimeHost, release: string, roomData: ReturnType<typeof readRoomDataStruct>): number {
  const previousRoomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  const hadRoomDisplay = host.movie.getProperty("roomActive") === true
    || readSpriteManifestArray(host.movie.getProperty("roomVisualOverlaySprites")).length > 0
    || readSpriteManifestArray(host.movie.getProperty("roomObjectOverlaySprites")).length > 0
    || readSpriteManifestArray(host.movie.getProperty("roomUserOverlaySprites")).length > 0
    || host.windows.has(normalizeSymbolKey("Room_bar"))
    || host.windows.has(normalizeSymbolKey("Room_info_stand"))
    || host.windows.has(normalizeSymbolKey("Loading room"));

  if (hadRoomDisplay || previousRoomData) {
    host.leaveRoom(release, false);
  } else {
    host.removeWindow("Loading room");
    host.movie.setProperty("roomActive", false);
    host.movie.setProperty("roomBootstrapPendingFinalize", false);
    host.movie.setProperty("roomPreRevealBitmapPreloadComplete", false);
    host.movie.setProperty("blockingPreloadBitmapAssetPaths", []);
    host.movie.setProperty("roomObjectAnimationPreloadSprites", []);
    host.movie.setProperty("roomObjectAnimationPreloadSourceKey", "");
    host.movie.setProperty("roomObjectAnimationPreloadSignature", "[]");
    host.movie.setProperty("roomCoverOverlaySprites", []);
  }

  host.movie.setProperty("pendingRoomRequests", []);
  host.movie.setProperty("roomProcessList", {});
  host.movie.setProperty("roomBootstrapPendingFinalize", false);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", 0);
  host.movie.setProperty("roomLoaderRenderedFrames", 0);
  host.movie.setProperty("roomPreRevealBitmapPreloadComplete", false);
  host.movie.setProperty("roomLoaderVisible", false);
  host.movie.setProperty("roomLoaderCastLoadId", "");
  host.movie.setProperty("roomLoaderProgress", 0);
  host.movie.setProperty("privateRoomProgramState", undefined);
  setRoomWirePhaseRuntime(host, "idle");
  host.movie.setProperty("selectedRoomObjectId", undefined);
  host.movie.setProperty("selectedRoomUserId", undefined);
  setRoomEntryStateRuntime(host, "idle");

  const roomEpoch = host.nextRoomEntryEpoch++;
  host.movie.setProperty("roomEntryTarget", {
    id: roomData?.id,
    name: roomData?.name,
    type: roomData?.type,
    epoch: roomEpoch
  });
  return roomEpoch;
}

export function setRoomEntryStateRuntime(host: HabboRoomLifecycleRuntimeHost, state: string): void {
  host.movie.setProperty("roomEntryState", state);
  host.objectManager.getObject("#room_component")?.set("entryState", state);
}

export function setRoomWirePhaseRuntime(host: HabboRoomLifecycleRuntimeHost, phase: string): void {
  host.movie.setProperty("roomWirePhase", phase);
  host.objectManager.getObject("#room_component")?.set("wirePhase", phase);
}

export function markRoomRequestSentRuntime(host: HabboRoomLifecycleRuntimeHost, request: { readonly command?: unknown; readonly isPublic?: unknown }, release: string): boolean {
  const command = typeof request.command === "string" ? request.command.toUpperCase() : "";
  const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  switch (command) {
    case "ROOM_DIRECTORY":
      setRoomWirePhaseRuntime(host, request.isPublic === true || roomData?.type === "public" ? "awaiting-room-ready" : "awaiting-opc-ok");
      break;
    case "TRYFLAT":
      setRoomWirePhaseRuntime(host, "awaiting-flat-letin");
      break;
    case "GOTOFLAT":
      setRoomWirePhaseRuntime(host, "awaiting-room-ready");
      break;
    case "GETROOMAD":
    case "G_HMAP":
    case "G_USRS":
    case "G_OBJS":
    case "G_ITEMS":
      if (host.movie.getProperty("roomEntryState") === "waiting-bootstrap") {
        setRoomWirePhaseRuntime(host, "awaiting-bootstrap");
      }
      break;
    case "G_STAT":
      if (host.movie.getProperty("roomEntryState") === "waiting-status") {
        setRoomWirePhaseRuntime(host, "awaiting-status");
      } else if (host.movie.getProperty("roomEntryState") === "active") {
        setRoomWirePhaseRuntime(host, "active");
      }
      break;
    default:
      break;
  }

  host.movie.setProperty("lastSentRoomRequest", {
    command,
    phase: host.movie.getProperty("roomWirePhase"),
    release
  });
  return command.length > 0;
}

export function showRoomLoaderBarRuntime(host: HabboRoomLifecycleRuntimeHost, text: string, release: string, castLoadId?: number): boolean {
  const layoutName = "room_loader_small.window";
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry: { readonly memberName: string }) => entry.memberName.toLowerCase() === layoutName);
  const templateLayout = host.externalCastWindowLayoutSet?.windows.find((entry: { readonly memberName: string }) => entry.memberName.toLowerCase() === "habbo_simple.window");
  const size = layout ? resolveLayoutRenderSize(layout) : { width: 188, height: 82 };
  const border = templateLayout ? resolveLayoutBorder(templateLayout) : zeroWindowBorder();
  const fullWidth = border.left + size.width + border.right;
  const fullHeight = border.top + size.height + border.bottom;
  const window = host.windows.get(normalizeSymbolKey("Loading room"))
    ?? host.createWindow(
      "Loading room",
      "habbo_simple.window",
      Math.round((host.movie.stage.width - fullWidth) / 2),
      Math.round((host.movie.stage.height - fullHeight) / 2)
    );

  const mutableWindow = window as { template?: string; x?: number; y?: number };
  mutableWindow.template = "habbo_simple.window";
  mutableWindow.x = Math.round((host.movie.stage.width - fullWidth) / 2);
  mutableWindow.y = Math.round((host.movie.stage.height - fullHeight) / 2);
  host.mergeWindowLayout(window, layoutName);
  host.registerWindowClient(window, "#room_interface");
  host.registerWindowProcedure(window, "#eventProcRoomLoader", "#room_interface", "#mouseUp");
  host.windowTextValues.set("general_loader_text", text);
  host.movie.setProperty("roomLoaderVisible", true);
  host.movie.setProperty("roomLoaderText", text);
  host.movie.setProperty("roomLoaderCastLoadId", castLoadId ?? "");
  setRoomLoaderProgressRuntime(host, castLoadId !== undefined ? 0.3 : 0.55, release, false);
  host.movie.setProperty("roomLoaderRenderedFrames", 0);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", 0);
  host.syncWindowSnapshot();
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "info", `showLoaderBar loadId=${castLoadId ?? "none"} text=${text.replace(/\s+/g, " ").trim()}`);
  return true;
}

export function hideRoomLoaderBarRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  const removed = host.removeWindow("Loading room");
  host.windowTextValues.delete("general_loader_text");
  host.movie.setProperty("roomLoaderVisible", false);
  host.movie.setProperty("roomLoaderCastLoadId", "");
  host.syncWindowSnapshot();
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  if (removed) {
    host.logDebug("room", "info", "hideLoaderBar");
  }
  return removed;
}

export function setRoomLoaderProgressRuntime(host: HabboRoomLifecycleRuntimeHost, progress: number, release: string, sync = true): void {
  const nextProgress = Math.max(0, Math.min(1, progress));
  const previousProgress = numberFromUnknown(host.movie.getProperty("roomLoaderProgress"), -1);
  if (Math.abs(previousProgress - nextProgress) < 0.001) {
    return;
  }

  host.movie.setProperty("roomLoaderProgress", nextProgress);
  if (sync && host.movie.getProperty("roomLoaderVisible") === true) {
    host.syncWindowSpriteChannels(release);
  }
}

export function getRoomWirePhaseRuntime(host: HabboRoomLifecycleRuntimeHost): string {
  const phase = String(host.movie.getProperty("roomWirePhase") ?? "idle");
  switch (phase) {
    case "awaiting-opc-ok":
    case "awaiting-flat-letin":
    case "awaiting-room-ready":
    case "awaiting-bootstrap":
    case "awaiting-status":
    case "active":
      return phase;
    default:
      return "idle";
  }
}

export function ignoreRoomPacketRuntime(host: HabboRoomLifecycleRuntimeHost, packetName: string, release: string, reason: string): boolean {
  host.movie.setProperty("lastIgnoredRoomPacket", {
    packetName,
    reason,
    roomEntryState: host.movie.getProperty("roomEntryState"),
    roomWirePhase: host.movie.getProperty("roomWirePhase")
  });
  host.logDebug("room", "warn", `ignored ${packetName} ${reason}`);
  host.recordUnsupportedOnce("room-late-packet-guard", {
    subsystem: "network",
    feature: "room-late-packet-guard",
    detail: `${release} Room Component Class processes room packets only inside the active room build state; this runtime ignored ${packetName} because ${reason}`,
    source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
  });
  return false;
}

export function canAcceptRoomBootstrapPacketRuntime(host: HabboRoomLifecycleRuntimeHost, packetName: string, release: string): boolean {
  const entryState = host.movie.getProperty("roomEntryState");
  const wirePhase = getRoomWirePhaseRuntime(host);
  if (entryState === "waiting-bootstrap"
    || entryState === "waiting-status"
    || entryState === "active"
    || wirePhase === "awaiting-bootstrap"
    || wirePhase === "awaiting-status"
    || wirePhase === "active") {
    return true;
  }

  return ignoreRoomPacketRuntime(host, packetName, release, `entryState=${String(entryState ?? "idle")} wirePhase=${wirePhase}`);
}

export function canAcceptActiveRoomPacketRuntime(host: HabboRoomLifecycleRuntimeHost, packetName: string, release: string): boolean {
  const entryState = host.movie.getProperty("roomEntryState");
  if ((entryState === "active" && host.movie.getProperty("roomActive") === true)
    || entryState === "ready-to-activate") {
    return true;
  }

  return ignoreRoomPacketRuntime(host, packetName, release, "room is not active");
}

export function canAcceptInitialStatusPacketRuntime(host: HabboRoomLifecycleRuntimeHost, packetName: string, release: string): boolean {
  if (host.movie.getProperty("roomEntryState") === "waiting-status" && getRoomWirePhaseRuntime(host) === "awaiting-status") {
    return true;
  }

  return canAcceptActiveRoomPacketRuntime(host, packetName, release);
}

export function showRoomTrashCoverRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): void {
  const castLib = host.getRuntimeRoomCoverCastSlot();
  host.movie.cast.importOrCreateCastLib({
    number: castLib,
    name: "runtime_room_cover",
    fileName: "runtime-room-cover",
    members: [
      {
        number: 1,
        name: "Room Trash Cover",
        type: "shape",
        width: host.movie.stage.width,
        height: host.movie.stage.height,
        backgroundColor: "#000000"
      }
    ]
  });
  host.movie.setProperty("runtimeRoomCoverCastLib", castLib);
  host.movie.setProperty("roomCoverOverlaySprites", [
    {
      channel: 1900,
      member: {
        castLib,
        member: 1
      },
      loc: {
        x: 0,
        y: 0
      },
      width: host.movie.stage.width,
      height: host.movie.stage.height,
      locZ: 0,
      blend: 100,
      visible: true
    } satisfies DirectorSpriteChannelManifest
  ]);
  host.syncDirectorOverlaySprites();
  host.logDebug("room", "info", "showTrashCover");
}

export function hideRoomTrashCoverRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  const hadCover = readSpriteManifestArray(host.movie.getProperty("roomCoverOverlaySprites")).length > 0;
  host.movie.setProperty("roomCoverOverlaySprites", []);
  host.syncDirectorOverlaySprites();
  if (hadCover) {
    host.logDebug("room", "info", "hideTrashCover");
  }
  return hadCover;
}

export function handleRoomProcessStepRuntime(host: HabboRoomLifecycleRuntimeHost, key: "heightmap" | "users" | "passive" | "Active" | "items", release: string): void {
  const component = host.objectManager.getObject("#room_component");
  const processList = {
    passive: 0,
    Active: 0,
    users: 0,
    items: 0,
    heightmap: 0,
    ...coerceRecord(component?.get("processList"))
  };
  processList[key] = 1;
  component?.set("processList", processList);
  host.movie.setProperty("roomProcessList", processList);
  const completedCount = (["heightmap", "users", "passive", "Active", "items"] as const)
    .filter((processKey) => Number(processList[processKey] ?? 0) !== 0)
    .length;
  setRoomLoaderProgressRuntime(host, 0.55 + (completedCount * 0.07), release);
  maybeFinalizeRoomBootstrapRuntime(host, release);
}

export function maybeFinalizeRoomBootstrapRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): void {
  const component = host.objectManager.getObject("#room_component");
  if (Number(component?.get("activeFlag") ?? 0) !== 0) {
    return;
  }

  const processList = coerceRecord(component?.get("processList"));
  const complete = ["passive", "Active", "users", "items", "heightmap"].every((key) => Number(processList[key] ?? 0) !== 0);
  if (!complete) {
    return;
  }

  if (host.movie.getProperty("roomBootstrapPendingFinalize") === true) {
    return;
  }

  const renderedFrames = numberFromUnknown(host.movie.getProperty("roomLoaderRenderedFrames"), 0);
  host.movie.setProperty("roomBootstrapPendingFinalize", true);
  setRoomLoaderProgressRuntime(host, 0.9, release);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", renderedFrames + 2);
  host.logDebug("room", "info", "room bootstrap packets complete; waiting for rendered loader frame");
}

export function markRoomLoaderFrameRenderedRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  if (host.movie.getProperty("roomLoaderVisible") !== true
    || host.movie.getProperty("roomActive") === true
    || !host.windows.has(normalizeSymbolKey("Loading room"))) {
    return false;
  }

  const renderedFrames = numberFromUnknown(host.movie.getProperty("roomLoaderRenderedFrames"), 0) + 1;
  host.movie.setProperty("roomLoaderRenderedFrames", renderedFrames);
  if (host.movie.getProperty("roomBootstrapPendingFinalize") === true) {
    host.logDebug("room", "info", `loader frame rendered ${renderedFrames}/${numberFromUnknown(host.movie.getProperty("roomBootstrapFinalizeFrameFence"), renderedFrames)}`);
  }
  return true;
}

export function completePendingRoomBootstrapRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  if (host.movie.getProperty("roomBootstrapPendingFinalize") !== true) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  if (Number(component?.get("activeFlag") ?? 0) !== 0) {
    host.movie.setProperty("roomBootstrapPendingFinalize", false);
    return false;
  }

  const renderedFrames = numberFromUnknown(host.movie.getProperty("roomLoaderRenderedFrames"), 0);
  const frameFence = numberFromUnknown(host.movie.getProperty("roomBootstrapFinalizeFrameFence"), 0);
  if (frameFence > 0 && renderedFrames < frameFence) {
    return false;
  }

  component?.set("activeFlag", 1);
  host.movie.setProperty("roomBootstrapPendingFinalize", false);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", 0);
  host.movie.setProperty("blockingPreloadBitmapAssetPaths", []);
  setRoomEntryStateRuntime(host, "waiting-status");
  setRoomWirePhaseRuntime(host, "awaiting-status");
  setRoomLoaderProgressRuntime(host, 0.95, release);
  host.queueRoomRequest({ command: "G_STAT" }, release);
  host.logDebug("room", "ok", "room bootstrap complete; queued G_STAT and waiting for initial STATUS");
  return true;
}

export function prepareRoomActivationAfterInitialStatusRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): void {
  setRoomLoaderProgressRuntime(host, 1, release);
  host.movie.setProperty("roomPreRevealBitmapPreloadComplete", false);
  setRoomEntryStateRuntime(host, "ready-to-activate");
  setRoomWirePhaseRuntime(host, "active");
  host.logDebug("room", "ok", "initial STATUS received; waiting for room frame preload before reveal");
}

export function completeRoomActivationAfterPreloadRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
  if (host.movie.getProperty("roomEntryState") !== "ready-to-activate" || host.movie.getProperty("roomActive") === true) {
    return false;
  }

  if (host.movie.getProperty("roomPreRevealBitmapPreloadComplete") !== true) {
    return false;
  }

  const roomFigurePreloadAssetPaths = readStringArray(host.movie.getProperty("roomFigurePreloadAssetPaths"));
  host.movie.setProperty("roomActive", true);
  host.movie.setProperty("roomPreRevealBitmapPreloadComplete", false);
  setRoomEntryStateRuntime(host, "active");
  setRoomWirePhaseRuntime(host, "active");
  if (roomFigurePreloadAssetPaths.length > 0) {
    host.movie.setProperty("preloadBitmapAssetPaths", roomFigurePreloadAssetPaths);
    host.movie.setProperty("blockingPreloadBitmapAssetPaths", []);
  }
  host.hideRoomLoaderBar(release);
  host.hideRoomTrashCover(release);
  if (!release.startsWith("release1_roseau_dcr0910")) {
    host.showRoomInfoStand(release);
    host.showRoomBar(release);
  }
  host.logDebug("room", "ok", "preloaded room frame; room activated");
  return true;
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}


export function roomConnectedRuntime(host: HabboRoomLifecycleRuntimeHost, marker: string | undefined, state: "OPC_OK" | "FLAT_LETIN" | "ROOM_READY", release: string): boolean {
    const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
    if (!roomData) {
      if (state === "ROOM_READY") {
        host.movie.setProperty("lastRoomReadyTransition", {
          release,
          marker,
          state,
          accepted: false,
          reason: "missing-room-data",
          entryState: host.movie.getProperty("roomEntryState"),
          wirePhase: host.movie.getProperty("roomWirePhase")
        });
      }
      return false;
    }

    if (roomData.type === "private" && state === "OPC_OK") {
      if (host.getRoomWirePhase() !== "awaiting-opc-ok") {
        return host.ignoreRoomPacket("OPC_OK", release, `wirePhase=${host.getRoomWirePhase()}`);
      }
      host.queueRoomRequest({ command: "TRYFLAT", roomId: roomData.id }, release);
      host.logDebug("room", "info", `OPC_OK room=${roomData.id} queued TRYFLAT`);
      return true;
    }

    if (roomData.type === "private" && state === "FLAT_LETIN") {
      if (host.getRoomWirePhase() !== "awaiting-flat-letin") {
        return host.ignoreRoomPacket("FLAT_LETIN", release, `wirePhase=${host.getRoomWirePhase()}`);
      }
      host.queueRoomRequest({ command: "GOTOFLAT", roomId: roomData.id }, release);
      host.logDebug("room", "info", `FLAT_LETIN room=${roomData.id} queued GOTOFLAT`);
      return true;
    }

    if (state !== "ROOM_READY") {
      return true;
    }

    const cleanMarker = marker ? readLingoPacketWord(marker, 1) : undefined;
    const cleanSavedMarker = roomData.marker ? readLingoPacketWord(roomData.marker, 1) : undefined;
    const roomMarker = cleanMarker && cleanMarker.length > 0 ? cleanMarker : cleanSavedMarker;
    if (!roomMarker) {
      host.movie.setProperty("lastRoomReadyTransition", {
        release,
        marker,
        state,
        accepted: false,
        reason: "missing-room-marker",
        roomData,
        entryState: host.movie.getProperty("roomEntryState"),
        wirePhase: host.movie.getProperty("roomWirePhase")
      });
      return false;
    }

    if (host.getRoomWirePhase() !== "awaiting-room-ready") {
      host.movie.setProperty("lastRoomReadyTransition", {
        release,
        marker: roomMarker,
        state,
        accepted: false,
        reason: "wire-phase-mismatch",
        roomData,
        entryState: host.movie.getProperty("roomEntryState"),
        wirePhase: host.movie.getProperty("roomWirePhase")
      });
      return host.ignoreRoomPacket("ROOM_READY", release, `wirePhase=${host.getRoomWirePhase()}`);
    }

    const nextRoomData = { ...roomData, marker: roomMarker };
    host.objectManager.getObject("#room_component")?.set("saveData", nextRoomData);
    host.movie.setProperty("currentRoomData", nextRoomData);
    host.movie.setProperty("lastRoomReadyTransition", {
      release,
      marker: roomMarker,
      state,
      accepted: true,
      step: "before-show-room",
      roomData: nextRoomData,
      entryStateBeforeLeave: host.movie.getProperty("roomEntryState"),
      wirePhaseBeforeLeave: host.movie.getProperty("roomWirePhase")
    });
    host.leaveRoom(release, true);
    let shown = false;
    try {
      shown = host.showRoom(roomMarker, release);
    } catch (error) {
      host.movie.setProperty("lastRoomShowFailure", {
        release,
        marker: roomMarker,
        reason: "exception",
        error: String(error),
        candidates: host.describeRoomVisualCandidates(roomMarker, release),
        loadedCastSlots: [...host.loadedCastSlots.entries()]
      });
      host.movie.setProperty("lastRoomReadyTransition", {
        release,
        marker: roomMarker,
        state,
        accepted: false,
        reason: "show-room-exception",
        error: String(error),
        entryState: host.movie.getProperty("roomEntryState"),
        wirePhase: host.movie.getProperty("roomWirePhase")
      });
      host.logDebug("room", "error", `ROOM_READY showRoom exception marker=${roomMarker} ${String(error)}`);
      return false;
    }
    if (!shown) {
      host.movie.setProperty("lastRoomReadyTransition", {
        release,
        marker: roomMarker,
        state,
        accepted: false,
        reason: "show-room-failed",
        failure: host.movie.getProperty("lastRoomShowFailure"),
        entryState: host.movie.getProperty("roomEntryState"),
        wirePhase: host.movie.getProperty("roomWirePhase")
      });
      return false;
    }

    const processList = roomData.type === "private"
      ? { passive: 0, Active: 0, users: 0, items: 0, heightmap: 0 }
      : { passive: 0, Active: 0, users: 0, items: 1, heightmap: 0 };
    host.objectManager.getObject("#room_component")?.set("processList", processList);
    host.movie.setProperty("roomProcessList", processList);
    host.setRoomEntryState("waiting-bootstrap");
    host.setRoomWirePhase("awaiting-bootstrap");
    host.queueRoomRequest({ command: "GETROOMAD" }, release);
    host.queueRoomRequest({ command: "G_HMAP" }, release);
    host.queueRoomRequest({ command: "G_USRS" }, release);
    host.queueRoomRequest({ command: "G_OBJS" }, release);
    if (roomData.type === "private") {
      host.queueRoomRequest({ command: "G_ITEMS" }, release);
    }
    host.movie.setProperty("lastRoomReadyTransition", {
      release,
      marker: roomMarker,
      state,
      accepted: true,
      step: "bootstrap-queued",
      roomData: nextRoomData,
      entryState: host.movie.getProperty("roomEntryState"),
      wirePhase: host.movie.getProperty("roomWirePhase"),
      pendingRoomRequests: host.movie.getProperty("pendingRoomRequests")
    });
    host.logDebug("room", "ok", `ROOM_READY marker=${roomMarker}`);
    return true;
  }

export function describeRoomVisualCandidatesRuntime(host: HabboRoomLifecycleRuntimeHost, marker: string, release: string): readonly Record<string, unknown>[] {
    const target = marker.toLowerCase();
    return (host.externalCastVisualLayoutSet?.visuals ?? [])
      .filter((entry) => entry.visualName.toLowerCase() === target || entry.memberName.toLowerCase() === `${target}.room`)
      .map((entry) => ({
        release: entry.release,
        castName: entry.castName,
        memberName: entry.memberName,
        visualName: entry.visualName,
        elementCount: entry.elements.length,
        loaded: host.loadedCastSlots.has(normalizeCastName(entry.castName))
      }));
  }

export function showRoomRuntime(host: HabboRoomLifecycleRuntimeHost, marker: string, release: string): boolean {
    const candidateVisuals = host.externalCastVisualLayoutSet?.visuals.filter((entry) => {
      const target = marker.toLowerCase();
      return entry.visualName.toLowerCase() === target || entry.memberName.toLowerCase() === `${target}.room`;
    }) ?? [];
    const visual = candidateVisuals.find((entry) => entry.release === release)
      ?? candidateVisuals.find((entry) => release.startsWith(entry.release) || entry.release.startsWith(release))
      ?? candidateVisuals[0];
    if (!visual) {
      host.movie.setProperty("lastRoomShowFailure", {
        release,
        marker,
        reason: "visual-layout-missing",
        visualLayoutSetRelease: host.externalCastVisualLayoutSet?.versionId,
        candidates: host.describeRoomVisualCandidates(marker, release),
        loadedCastSlots: [...host.loadedCastSlots.entries()]
      });
      host.recordUnsupportedOnce(`room-visual-layout-missing:${marker}`, {
        subsystem: "habbo",
        feature: "room-visual-layout-missing",
        detail: `${release} Room Interface Class showRoom requested ${marker}.room, but no generated visual layout was available`,
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
      return false;
    }

    const castLib = host.loadedCastSlots.get(normalizeCastName(visual.castName));
    if (castLib === undefined) {
      host.movie.setProperty("lastRoomShowFailure", {
        release,
        marker,
        reason: "visual-cast-not-loaded",
        selectedVisual: {
          release: visual.release,
          castName: visual.castName,
          memberName: visual.memberName,
          visualName: visual.visualName,
          elementCount: visual.elements.length
        },
        candidates: host.describeRoomVisualCandidates(marker, release),
        loadedCastSlots: [...host.loadedCastSlots.entries()]
      });
      host.recordUnsupportedOnce(`room-visual-cast-not-loaded:${visual.castName}`, {
        subsystem: "habbo",
        feature: "room-visual-cast-not-loaded",
        detail: `${release} ${visual.memberName} references ${visual.castName}, but that external cast has not been imported`,
        source: visual.textChunkPath
      });
      return false;
    }

    host.showRoomTrashCover(release);

    const rectLeft = visual.rect?.[0] ?? 0;
    const rectTop = visual.rect?.[1] ?? 0;
    const sprites: DirectorSpriteChannelManifest[] = [];
    const bitmapChannels: number[] = [];
    const privateRoomPatterns = host.getPrivateRoomPatterns();
    const runtimeVisualCastLib = host.getRuntimeRoomVisualCastSlot();
    const runtimeMembers: DirectorMemberManifest[] = [];
    const visualizerLocZ = host.getVisualizerDefaultLocZ();
    const visualRoomData = visual.roomData ? { ...visual.roomData, offsetz: visualizerLocZ } : undefined;
    const runtimeVisual = visualRoomData ? { ...visual, roomData: visualRoomData } : visual;
    for (const element of visual.elements) {
      if (element.locH === undefined || element.locV === undefined) {
        continue;
      }
      if (element.id === "hiliter" || element.type === "hiliter") {
        continue;
      }
      if (element.media !== "bitmap" || !element.resolvedMember) {
        host.recordUnsupportedVisualElement(release, visual, element);
        continue;
      }

      const memberName = element.resolvedMember.memberName;
      const typeDef = stringProperty(element.properties, "typeDef")?.toLowerCase();
      const sourceBgColor = stringProperty(element.properties, "bgColor");
      const floorPattern = isPrivateRoomFloorVisualElement(memberName, typeDef) ? privateRoomPatterns.floor : undefined;
      const wallPattern = isPrivateRoomWallVisualElement(memberName, typeDef) ? privateRoomPatterns.wall : undefined;
      const replacementMemberName = floorPattern
        ? resolvePrivateRoomFloorMemberName(memberName, floorPattern)
        : wallPattern
        ? resolvePrivateRoomWallMemberName(memberName, wallPattern)
        : undefined;
      const replacementMemberRef = replacementMemberName ? host.resourceManager.getMemberRef(replacementMemberName) : undefined;
      const replacementAsset = replacementMemberName && !replacementMemberRef
        ? host.getBitmapAssetByMemberName(replacementMemberName, [visual.castName, "hh_room_private"])
        : undefined;
      const usesReplacementMember = replacementMemberRef !== undefined || replacementAsset !== undefined;
      const patternedBgColor = floorPattern
        ? floorPattern.color
        : wallPattern
        ? colorForPrivateRoomWallMember(memberName, wallPattern)
        : sourceBgColor;
      const memberNumber = runtimeMembers.length + 1;
      if (replacementAsset) {
        runtimeMembers.push({
          number: memberNumber,
          name: `runtime.room.visual.${visual.visualName}.${element.id ?? element.index}`,
          type: "bitmap",
          width: Math.max(1, Math.round(element.width ?? replacementAsset.width)),
          height: Math.max(1, Math.round(element.height ?? replacementAsset.height)),
          regPoint: replacementAsset.regPoint,
          assetPath: replacementAsset.pngPath,
          ...(replacementAsset.inkAssetPaths !== undefined ? { inkAssetPaths: replacementAsset.inkAssetPaths } : {})
        });
      }

      const elementLocZ = element.locZ ?? numberProperty(element.properties, "locZ") ?? element.index;
      const sprite: DirectorSpriteChannelManifest = {
        channel: 2000 + element.index + 1,
        member: replacementMemberRef
          ? replacementMemberRef
          : replacementAsset
          ? {
              castLib: runtimeVisualCastLib,
              member: memberNumber
            }
          : {
              castLib,
              member: element.resolvedMember.member
        },
        loc: {
          x: rectLeft + element.locH,
          y: rectTop + element.locV
        },
        ...(element.width !== undefined ? { width: element.width } : {}),
        ...(element.height !== undefined ? { height: element.height } : {}),
        ...(usesReplacementMember || patternedBgColor ? { ink: 41 } : element.ink !== undefined ? { ink: element.ink } : {}),
        locZ: visualizerLocZ + elementLocZ + (floorPattern ? -1000000 : wallPattern ? -975 : 0),
        ...(patternedBgColor ? { bgColor: patternedBgColor } : {}),
        ...(element.blend !== undefined ? { blend: element.blend } : {}),
        visible: element.active !== false
      };
      sprites.push(sprite);
      bitmapChannels.push(sprite.channel);
    }

    if (runtimeMembers.length > 0) {
      host.movie.cast.importOrCreateCastLib({
        number: runtimeVisualCastLib,
        name: "runtime_room_visuals",
        fileName: "runtime-room-visuals",
        members: runtimeMembers
      });
      host.resourceManager.preIndexMembers();
      host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
      host.movie.setProperty("runtimeRoomVisualCastLib", runtimeVisualCastLib);
    }
    host.movie.setProperty("roomVisualOverlaySprites", sprites);
    host.movie.setProperty("currentRoomVisual", runtimeVisual);
    host.movie.setProperty("roomVisuals", {
      release,
      visual: visual.memberName,
      marker,
      spriteCount: sprites.length,
      runtimeMemberCount: runtimeMembers.length,
      bitmapSpriteCount: bitmapChannels.length,
      channels: sprites.map((sprite) => sprite.channel),
      bitmapChannels
    });
    host.movie.setProperty("lastRoomShowFailure", undefined);
    host.syncDirectorOverlaySprites();
    host.logDebug("room", "ok", `showRoom marker=${marker} sprites=${sprites.length}`);
    host.recordUnsupportedOnce("room-visualizer-rendering-partial", {
      subsystem: "habbo",
      feature: "room-visualizer-rendering-partial",
      detail: `${release} Room Interface Class createVisualizer renders ${marker}.room bitmap sprite channels from generated layout data; hiliter, object program classes, furniture objects, and full room interaction remain partial`,
      source: visual.textChunkPath
    });
    return true;
  }

export function getVisualizerDefaultLocZRuntime(host: HabboRoomLifecycleRuntimeHost): number {
    const value = host.getVariable("visualizer.default.locz");
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return -20000000;
  }

export function loadRoomCastsRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
    const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
    if (!roomData) {
      return false;
    }

    const commonCasts = (host.getRoomCommonCastEntries() as readonly string[]).filter((castName: string) => !host.castExists(castName));
    if (commonCasts.length > 0) {
      const loadId = host.startCastLoad(commonCasts, 1, release);
      host.movie.setProperty("lastRoomCastLoad", {
        loadId,
        roomId: roomData.id,
        phase: "common",
        casts: commonCasts
      });
      host.showRoomLoaderBar(
        roomHoldText(host.texts),
        release,
        loadId
      );
      host.syncActiveFigurePreloadPaths(release);
      host.setRoomEntryState("loading-common-casts");
      host.registerCastloadCallback(loadId, "#loadRoomCasts", "#room_component", "");
      host.scheduleDelay(
        "#room_component",
        "#loadRoomCasts",
        ROOM_CAST_CALLBACK_FRAME_DELAY_MS,
        undefined,
        `extracted/projectorrays/${release}/${roomComponentClassSource}`
      );
      host.logDebug("room", "info", `loadRoomCasts id=${loadId} phase=common room=${roomData.id} casts=${commonCasts.length}`);
      return true;
    }

    if (roomData.casts.length < 1) {
      host.recordUnsupportedOnce(`room-cast-list-empty:${roomData.id}`, {
        subsystem: "habbo",
        feature: "room-cast-list-empty",
        detail: `${release} Room Component Class loadRoomCasts expected pSaveData[#casts] before entering room ${roomData.id}, but the room struct had no casts`,
        source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
      });
      host.leaveRoom(release);
      return false;
    }

    const roomCasts = uniqueStrings(roomData.casts);
    const loadId = host.startCastLoad(roomCasts, 0, release);
    host.movie.setProperty("lastRoomCastLoad", {
      loadId,
      roomId: roomData.id,
      phase: "room",
      casts: roomCasts
    });
    host.showRoomLoaderBar(
      roomLoadingText(host.texts, roomData.name),
      release,
      loadId
    );
    host.syncActiveFigurePreloadPaths(release);
    host.setRoomEntryState("loading-room-casts");
    host.registerCastloadCallback(loadId, "#roomCastLoaded", "#room_component", "");
    host.scheduleDelay(
      "#room_component",
      "#roomCastLoaded",
      ROOM_CAST_CALLBACK_FRAME_DELAY_MS,
      undefined,
      `extracted/projectorrays/${release}/${roomComponentClassSource}`
    );
    host.logDebug("room", "info", `loadRoomCasts id=${loadId} phase=room room=${roomData.id} casts=${roomCasts.length}`);
    return true;
  }

export function roomCastLoadedRuntime(host: HabboRoomLifecycleRuntimeHost, release: string): boolean {
    const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
    if (!roomData) {
      return false;
    }

    const missingCasts = roomData.casts.filter((castName) => !host.castExists(castName));
    if (missingCasts.length > 0) {
      host.recordUnsupportedOnce(`room-cast-required-missing:${roomData.id}`, {
        subsystem: "habbo",
        feature: "room-cast-required-missing",
        detail: `${release} Room Component Class roomCastLoaded found missing casts for room ${roomData.id}: ${missingCasts.join(", ")}`,
        source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
      });
      host.leaveRoom(release);
      return false;
    }

    const roomId = Number.parseInt(roomData.type === "private" ? roomData.id : String(roomData.port ?? roomData.id), 10);
    if (!Number.isFinite(roomId) || roomId <= 0) {
      return false;
    }

    const ownUserName = stringFromSession(host.objectManager.getObject("#session"), "userName")
      || stringFromSession(host.objectManager.getObject("#session"), "user_name");
    const waitingForDoor = roomData.type === "private"
      && roomData.door === "closed"
      && roomData.owner !== undefined
      && ownUserName !== undefined
      && roomData.owner !== ownUserName;
    host.showRoomLoaderBar(roomPreparingText(host.texts, roomData.name, waitingForDoor), release);
    host.setRoomEntryState("preparing-room");
    const doorId = Number.parseInt(String(roomData.type === "private" ? 0 : roomData.door ?? 0), 10) || 0;
    host.queueRoomRequest({
      command: "ROOM_DIRECTORY",
      roomId: String(roomId),
      doorId,
      isPublic: roomData.type === "public"
    }, release);
    host.logDebug("room", "info", `roomCastLoaded room=${roomData.id} queued ROOM_DIRECTORY public=${roomData.type === "public"}`);
    return true;
  }

