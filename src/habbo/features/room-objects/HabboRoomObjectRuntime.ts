import type { DirectorMemberRef, DirectorSpriteChannelManifest } from "../../../runtime";
import type { DirectorMember } from "../../../runtime";
import {
  coerceRecord,
  normalizeCastName,
  normalizeMemberName,
  normalizeRoomObjectClassName,
  numberFromUnknown,
  stripMemberAliasSuffix
} from "../../HabboSourceValueHelpers";
import { readRoomVisual, type HabboPrivateRoomPatterns } from "../../room/HabboRoomData";
import {
  colorForPrivateRoomWallMember,
  resolvePrivateRoomWallMemberName
} from "../../room/HabboPrivateRoomPatterns";
import {
  directorInteger,
  numberFromRoomData,
  rectsIntersect,
  roomCoordinateToStage,
  roomStageToWorldCoordinate,
  spriteRectForLoc,
  type HabboRoomCoordinate
} from "../../room/HabboRoomGeometry";
import {
  isRoomObjectRecord,
  moduloDirection,
  normalizeWallItemDirection,
  parseRoomActiveObjectsPacket,
  parseRoomItemsPacket,
  parseRoomPassiveObjectsPacket,
  parseRoomStuffDataUpdatePacket,
  uniqueNumbers,
  type HabboRoomObjectRecord
} from "../../room/HabboRoomObjectData";
import {
  refreshRoomObjectTimedStateRecords,
  roomObjectSourceAnimationForPart as resolveRoomObjectSourceAnimationForPart,
  roomObjectTimedStateActive as resolveRoomObjectTimedStateActive,
  updateRoomObjectTimedStateRecords
} from "../../room/HabboRoomObjectAnimations";
import {
  HabboRoomObjectClassProps,
  parseRoomObjectPartColors,
  roomObjectPartColorToHex
} from "../../room/HabboRoomObjectProps";
import {
  dedupeSpritePreloadManifests,
  dynamicFurnitureAssetIdFromClassName,
  isWallPlacementSpriteEntry,
  isWallPlacementSpritePlan,
  readRoomObjectSpriteEntries,
  readSpriteManifestArray,
  resolveWallPlacementPlanDirection,
  roomObjectAnimationPreloadCandidateSortKey,
  roomObjectAnimationPreloadInputSignature,
  roomObjectOverlayKey,
  roomObjectOverlayPartKey,
  uniqueStrings,
  type HabboRoomObjectAnimationPreloadCandidate,
  type HabboRoomObjectSpriteEntry,
  type HabboRoomObjectSpritePlan
} from "../../room/HabboRoomObjectSpritePlanning";
import {
  readRoomObjectMoverPlacement,
  type HabboRoomObjectMoverActiveMove,
  type HabboRoomObjectMoverActivePlacement,
  type HabboRoomObjectMoverPlacement,
  type HabboRoomObjectMoverItemPlacement
} from "../inventory-hand";
import type { HabboWindowElementActivation } from "../../window/HabboWindowTypes";
import {
  HABBO_ROOM_OBJECT_MOVER_INVALID_ITEM_BLEND,
  HABBO_ROOM_OBJECT_MOVER_GHOST_BLEND,
  HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE,
  HABBO_ROOM_OBJECT_MOVER_SMALL_BLEND,
  HABBO_ROOM_OBJECT_MOVER_SMALL_LOCZ,
  HABBO_ROOM_OBJECT_MOVER_SOURCE,
  roomObjectMoverSmallMemberCandidates
} from "../../ui/HabboRoomFurnitureDialog";
import {
  HABBO_ROOM_ACTIVE_OBJECT_SOURCE,
  resolveRoomObjectSelectAction,
  resolveRoomObjectSourceAnimationPreloadTicks,
  resolveRoomObjectSourcePartFrame,
  resolveRoomObjectSourcePartState,
  resolveRoomObjectSourcePartVisible,
  resolveRoomObjectSourceTimedState,
  roomObjectHasSourceSelectOverride,
  roomObjectSourceHasAnimatedUpdate,
  sourceClassValueContains
} from "../../ui/HabboRoomObjectInteractions";
import { buildRoomObjectInfo } from "../../room/HabboRoomSelection";
import { activateTeleporterObject } from "./HabboRoomTeleporterRuntime";
import {
  roomHiliterClassSource,
  roomComponentClassSource,
  roomInterfaceClassSource,
  roomItemObjectClassSource,
  roomObjectMoverClassSource
} from "./HabboRoomObjectSources";
import type { HabboRoomObjectRuntimeHost } from "./HabboRoomObjectRuntimeHost";

export interface HabboRoomObjectRotateOptions {
  readonly change?: number;
  readonly stepMode?: "change-plus-index" | "repeat-change";
  readonly source?: string;
}

export interface HabboRoomFurniInterfaceOptions {
  readonly rotate?: HabboRoomObjectRotateOptions;
}

export function handleRoomPassiveObjectsPacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const objects = parseRoomPassiveObjectsPacket(body);
  ensureDynamicFurnitureCastsForObjectsRuntime(host, objects, release, "passive");
  const component = host.objectManager.getObject("#room_component");
  const next = Object.fromEntries(objects.map((object) => [object.id, object]));
  component?.set("passiveObjects", next);
  host.movie.setProperty("lastRoomPassiveObjects", body);
  host.movie.setProperty("roomPassiveObjects", next);
  host.handleRoomProcessStep("passive", release);
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `OBJECTS count=${objects.length} bytes=${body.length}`);
  return true;
}

export function handleRoomActiveObjectsPacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const objects = parseRoomActiveObjectsPacket(body);
  ensureDynamicFurnitureCastsForObjectsRuntime(host, objects, release, "active");
  const component = host.objectManager.getObject("#room_component");
  const next = Object.fromEntries(objects.map((object) => [object.id, object]));
  component?.set("activeObjects", next);
  host.movie.setProperty("lastRoomActiveObjects", body);
  host.movie.setProperty("roomActiveObjects", next);
  refreshRoomObjectTimedStatesRuntime(host, next);
  host.handleRoomProcessStep("Active", release);
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `ACTIVE_OBJECTS count=${objects.length} bytes=${body.length}`);
  return true;
}

export function handleRoomActiveObjectUpdatePacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const [object] = parseRoomActiveObjectsPacket(body);
  if (!object) {
    host.recordUnsupportedOnce("room-active-object-update-unparsed", {
      subsystem: "habbo",
      feature: "room-active-object-update-unparsed",
      detail: `${release} received ACTIVEOBJECT_UPDATE, but the runtime could not parse the active object line`,
      source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
    });
    return false;
  }

  ensureDynamicFurnitureCastsForObjectsRuntime(host, [object], release, "active-update");
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = {
    ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>),
    [object.id]: object
  };
  const placement = coerceRecord(host.movie.getProperty("lastRoomHandPlacementRequest"));
  const localObjectId = typeof placement.localObjectId === "string" ? placement.localObjectId : "";
  if (localObjectId
    && localObjectId !== object.id
    && activeObjects[localObjectId]
    && placement.className === object.className
    && placement.x === object.x
    && placement.y === object.y) {
    delete activeObjects[localObjectId];
    host.movie.setProperty("lastRoomHandPlacementRequest", {
      ...placement,
      reconciledObjectId: object.id
    });
  }
  component?.set("activeObjects", activeObjects);
  host.movie.setProperty("roomActiveObjects", activeObjects);
  updateRoomObjectTimedStateRuntime(host, object);
  host.movie.setProperty("lastRoomActiveObjectUpdate", body);
  if (host.movie.getProperty("selectedRoomObjectType") === "active" && host.movie.getProperty("selectedRoomObjectId") === object.id) {
    const info = buildRoomObjectInfo(object, (key) => host.texts.get(key));
    host.movie.setProperty("selectedRoomObjectInfo", info);
    host.movie.setProperty("selectedRoomObjectName", info.name);
  }
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `ACTIVEOBJECT_UPDATE id=${object.id} class=${object.className}`);
  return true;
}

export function handleRoomStuffDataUpdatePacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const parsed = parseRoomStuffDataUpdatePacket(body);
  if (!parsed) {
    host.recordUnsupportedOnce("room-stuffdataupdate-unparsed", {
      subsystem: "habbo",
      feature: "room-stuffdataupdate-unparsed",
      detail: `${release} received STUFFDATAUPDATE, but the body did not match the release7 id//key/value or release14 id\\x02stuffData\\x02 source shape`,
      source: `extracted/projectorrays/${release}/hh_room/casts/External/ParentScript 5 - Room Handler Class.ls`
    });
    return false;
  }

  const { objectId, key, value } = parsed;
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = { ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>) };
  const object = activeObjects[objectId] ?? Object.values(activeObjects).find((candidate) => candidate.id === objectId);
  if (!object) {
    host.movie.setProperty("lastRoomStuffDataUpdate", { objectId, key, value, body, found: false });
    host.logDebug("room", "warn", `STUFFDATAUPDATE missing id=${objectId} ${key}=${value}`);
    return true;
  }

  const nextObject: HabboRoomObjectRecord = {
    ...object,
    props: {
      ...object.props,
      [key]: value
    }
  };
  activeObjects[object.id] = nextObject;
  component?.set("activeObjects", activeObjects);
  host.movie.setProperty("roomActiveObjects", activeObjects);
  updateRoomObjectTimedStateRuntime(host, nextObject);
  host.movie.setProperty("lastRoomStuffDataUpdate", { objectId: object.id, key, value, body, found: true });
  if (host.movie.getProperty("selectedRoomObjectType") === "active" && host.movie.getProperty("selectedRoomObjectId") === object.id) {
    const info = buildRoomObjectInfo(nextObject, (textKey) => host.texts.get(textKey));
    host.movie.setProperty("selectedRoomObjectInfo", info);
    host.movie.setProperty("selectedRoomObjectName", info.name);
  }
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `STUFFDATAUPDATE id=${object.id} ${key}=${value}`);
  return true;
}

function applyLocalActiveObjectUpdateRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  release: string,
  reason: string
): HabboRoomObjectRecord {
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = {
    ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>),
    [object.id]: object
  };
  component?.set("activeObjects", activeObjects);
  host.movie.setProperty("roomActiveObjects", activeObjects);
  updateRoomObjectTimedStateRuntime(host, object);
  if (host.movie.getProperty("selectedRoomObjectType") === "active" && host.movie.getProperty("selectedRoomObjectId") === object.id) {
    const info = buildRoomObjectInfo(object, (textKey) => host.texts.get(textKey));
    host.movie.setProperty("selectedRoomObjectInfo", info);
    host.movie.setProperty("selectedRoomObjectName", info.name);
  }
  host.movie.setProperty("lastRoomObjectLocalUpdate", {
    reason,
    objectId: object.id,
    className: object.className,
    x: object.x,
    y: object.y,
    h: object.h,
    direction: object.direction,
    source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
  });
  return object;
}

function applyLocalMovedActiveObjectRuntime(
  host: HabboRoomObjectRuntimeHost,
  objectId: string,
  coordinate: { readonly x: number; readonly y: number; readonly h: number },
  direction: number,
  release: string
): HabboRoomObjectRecord | undefined {
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>;
  const object = activeObjects[objectId] ?? Object.values(activeObjects).find((candidate) => candidate.id === objectId);
  if (!object) {
    return undefined;
  }
  const nextObject: HabboRoomObjectRecord = {
    ...object,
    x: coordinate.x,
    y: coordinate.y,
    h: coordinate.h,
    altitude: coordinate.h,
    direction: [direction]
  };
  return applyLocalActiveObjectUpdateRuntime(host, nextObject, release, "move-active");
}

export function ensureDynamicFurnitureCastsForObjectsRuntime(
  host: HabboRoomObjectRuntimeHost,
  objects: readonly HabboRoomObjectRecord[],
  release: string,
  reason: string
): void {
  ensureDynamicFurnitureCastsForClassNamesRuntime(host, objects.map((object) => object.className), release, reason);
}

export function ensureDynamicFurnitureCastsForClassNamesRuntime(
  host: HabboRoomObjectRuntimeHost,
  classNames: readonly string[],
  release: string,
  reason: string
): void {
  const casts = uniqueStrings(classNames
    .map((className) => dynamicFurnitureCastNameForClassNameRuntime(host, className))
    .filter((castName): castName is string => Boolean(castName)))
    .filter((castName) => !host.castExists(castName));
  if (casts.length === 0) {
    return;
  }

  const loadId = host.startCastLoad(casts, 1, release);
  host.movie.setProperty("lastDynamicFurnitureCastLoad", {
    loadId,
    reason,
    casts,
    source: `extracted/projectorrays/${release}/hh_dynamic_downloader/casts/External/ParentScript 3 - Dynamic Downloader Component Class.ls`
  });
  host.logDebug("casts", "info", `dynamic furniture casts reason=${reason} requested=${casts.length} loadId=${loadId}`);
}

export function dynamicFurnitureCastNameForClassNameRuntime(host: HabboRoomObjectRuntimeHost, className: string): string | undefined {
  const baseClass = dynamicFurnitureAssetIdFromClassName(className);
  if (!baseClass) {
    return undefined;
  }

  const template = String(host.getVariable("dynamic.download.name.template") ?? "");
  if (!template || !template.includes("%typeid%")) {
    return undefined;
  }

  const fixedAssetId = baseClass.replace(/\s+/g, "_");
  const fileName = template.replaceAll("%typeid%", fixedAssetId).replaceAll("%revision%", "");
  const castName = fileName.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "";
  return castName || undefined;
}

export function refreshRoomObjectTimedStatesRuntime(host: HabboRoomObjectRuntimeHost, activeObjects: Readonly<Record<string, HabboRoomObjectRecord>>): void {
  const timedStates = refreshRoomObjectTimedStateRecords(
    activeObjects,
    host.movie.getProperty("roomObjectTimedStates"),
    (className) => host.getRoomObjectSourceClassValue(className)
  );
  host.movie.setProperty("roomObjectTimedStates", timedStates);
}

export function updateRoomObjectTimedStateRuntime(host: HabboRoomObjectRuntimeHost, object: HabboRoomObjectRecord): void {
  const timedStates = updateRoomObjectTimedStateRecords(
    object,
    host.movie.getProperty("roomObjectTimedStates"),
    host.getRoomObjectSourceClassValue(object.className)
  );
  host.movie.setProperty("roomObjectTimedStates", timedStates);
}

export function handleRoomActiveObjectRemovePacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const objectId = body.trim().split(/\s+/)[0] ?? "";
  if (!objectId) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const activeObjects = { ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>) };
  delete activeObjects[objectId];
  component?.set("activeObjects", activeObjects);
  host.movie.setProperty("roomActiveObjects", activeObjects);
  host.movie.setProperty("lastRoomActiveObjectRemove", objectId);
  if (host.movie.getProperty("selectedRoomObjectType") === "active" && host.movie.getProperty("selectedRoomObjectId") === objectId) {
    host.clearRoomObjectSelection(release);
  }
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `ACTIVEOBJECT_REMOVE id=${objectId}`);
  return true;
}

export function handleRoomItemsPacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const objects = parseRoomItemsPacket(body);
  const component = host.objectManager.getObject("#room_component");
  const next = Object.fromEntries(objects.map((object) => [object.id, object]));
  component?.set("itemObjects", next);
  host.movie.setProperty("lastRoomItems", body);
  host.movie.setProperty("roomItemObjects", next);
  host.handleRoomProcessStep("items", release);
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `ITEMS count=${objects.length} bytes=${body.length}`);
  return true;
}

export function handleRoomItemUpdatePacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const [object] = parseRoomItemsPacket(body);
  if (!object) {
    host.recordUnsupportedOnce("room-item-update-unparsed", {
      subsystem: "habbo",
      feature: "room-item-update-unparsed",
      detail: `${release} received ADDITEM/UPDATEITEM, but the runtime could not parse the wall-item body`,
      source: `extracted/projectorrays/${release}/${roomItemObjectClassSource}`
    });
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const itemObjects = {
    ...(coerceRecord(component?.get("itemObjects")) as Record<string, HabboRoomObjectRecord>),
    [object.id]: object
  };
  component?.set("itemObjects", itemObjects);
  host.movie.setProperty("roomItemObjects", itemObjects);
  host.movie.setProperty("lastRoomItemUpdate", {
    objectId: object.id,
    className: object.className,
    direction: object.direction,
    source: `extracted/projectorrays/${release}/${roomItemObjectClassSource}`
  });
  if (host.movie.getProperty("selectedRoomObjectType") === "item" && host.movie.getProperty("selectedRoomObjectId") === object.id) {
    const info = buildRoomObjectInfo(object, (textKey) => host.texts.get(textKey));
    host.movie.setProperty("selectedRoomObjectInfo", info);
    host.movie.setProperty("selectedRoomObjectName", info.name);
  }
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `ITEM_UPDATE id=${object.id} class=${object.className}`);
  return true;
}

export function handleRoomItemRemovePacketRuntime(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const objectId = body.trim().split(/\s+/)[0] ?? "";
  if (!objectId) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const itemObjects = { ...(coerceRecord(component?.get("itemObjects")) as Record<string, HabboRoomObjectRecord>) };
  delete itemObjects[objectId];
  component?.set("itemObjects", itemObjects);
  host.movie.setProperty("roomItemObjects", itemObjects);
  host.movie.setProperty("lastRoomItemRemove", objectId);
  if (host.movie.getProperty("selectedRoomObjectType") === "item" && host.movie.getProperty("selectedRoomObjectId") === objectId) {
    host.clearRoomObjectSelection(release);
  }
  host.renderRoomObjects(release);
  host.logDebug("room", "ok", `REMOVEITEM id=${objectId}`);
  return true;
}

export function activateRoomFurniInterfaceElement(
  host: HabboRoomObjectRuntimeHost,
  elementId: string,
  object: HabboRoomObjectRecord,
  release: string,
  options?: HabboRoomFurniInterfaceOptions
): boolean {
  switch (elementId) {
    case "move.button":
      if (object.kind !== "active") {
        host.recordUnsupportedOnce(`room-object-mover-kind-partial:${object.kind}`, {
          subsystem: "habbo",
          feature: "room-object-mover-kind-partial",
          detail: `${release} Room Interface Class startObjectMover supports ${object.kind} ${object.id}, but this runtime slice only commits active floor furniture movement through MOVESTUFF; wall-item mover placement still needs Object Mover itemLocStr parity`,
          source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
        });
        host.logDebug("room", "warn", `object mover unsupported kind=${object.kind} id=${object.id}`);
        return true;
      }
      {
        const dimensions = object.dimensions === undefined || object.dimensions === 0 ? [1, 1] as const : object.dimensions;
        const direction = moduloDirection(Number(Array.isArray(object.direction) ? object.direction[0] ?? 0 : object.direction ?? 0) || 0);
        host.movie.setProperty("roomObjectMover", {
          action: "moveActive",
          objectId: object.id,
          kind: object.kind,
          className: object.className,
          width: Math.max(1, Math.trunc(dimensions[0] ?? 1)),
          height: Math.max(1, Math.trunc(dimensions[1] ?? 1)),
          direction,
          ...(object.colors !== undefined ? { colors: object.colors } : {}),
          source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
        });
        host.clearRoomObjectMoverPreview();
        host.movie.setProperty("roomClickAction", "moveActive");
        host.movie.setProperty("selectedRoomObjectId", object.id);
        host.movie.setProperty("selectedRoomObjectType", "active");
        host.renderRoomObjects(release);
        host.logDebug("room", "info", `object mover active id=${object.id} direction=${direction}`);
      }
      return true;
    case "rotate.button":
      if (object.kind !== "active" || object.x === undefined || object.y === undefined) {
        return false;
      }
      {
        const direction = host.resolveRotatedActiveObjectDirection(object, release, options?.rotate);
        if (direction === undefined) {
          return false;
        }
        host.queueRoomRequest({
          command: "MOVESTUFF",
          objectId: object.id,
          x: object.x,
          y: object.y,
          direction
        }, release);
        const nextObject: HabboRoomObjectRecord = {
          ...object,
          direction: [direction]
        };
        applyLocalActiveObjectUpdateRuntime(host, nextObject, release, "rotate-active");
        host.movie.setProperty("lastRoomObjectRotateRequest", {
          objectId: object.id,
          x: object.x,
          y: object.y,
          direction,
          ...(options?.rotate?.change !== undefined ? { change: options.rotate.change } : {}),
          ...(options?.rotate?.stepMode ? { stepMode: options.rotate.stepMode } : {}),
          source: options?.rotate?.source ?? `extracted/projectorrays/${release}/hh_room/casts/External/ParentScript 18 - Active Object Class.ls`
        });
        host.renderRoomObjects(release);
        host.logDebug("room", "info", `object rotate id=${object.id} direction=${direction}`);
      }
      return true;
    case "pick.button":
      if (object.kind !== "active" && object.kind !== "item") {
        return false;
      }
      host.queueRoomRequest({
        command: "ADDSTRIPITEM",
        objectId: object.id,
        stripType: object.kind === "active" ? "stuff" : "item"
      }, release);
      host.movie.setProperty("lastRoomObjectPickupRequest", {
        objectId: object.id,
        kind: object.kind,
        stripType: object.kind === "active" ? "stuff" : "item",
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
      host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
      if (object.kind === "active") {
        handleRoomActiveObjectRemovePacketRuntime(host, object.id, release);
      } else {
        handleRoomItemRemovePacketRuntime(host, object.id, release);
      }
      host.logDebug("room", "info", `object pickup id=${object.id} kind=${object.kind}`);
      return true;
    case "delete.button":
      if (object.kind !== "active" && object.kind !== "item") {
        return false;
      }
      return host.showRoomDeleteConfirm(object, release);
    default:
      host.recordUnsupportedOnce(`room-furni-interface-element-unhandled:${elementId}`, {
        subsystem: "lingo",
        feature: "room-furni-interface-element-unhandled",
        detail: `${release} Room Interface Class eventProcInterface received ${elementId} for ${object.kind}; this furniture action is recorded but not translated yet`,
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
      return false;
  }
}

export function resolveRotatedActiveObjectDirectionRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  release: string,
  options?: HabboRoomObjectRotateOptions
): number | undefined {
  const currentDirection = moduloDirection(Number(Array.isArray(object.direction) ? object.direction[0] ?? 0 : 0) || 0);
  const rotateChange = Number.isFinite(options?.change) ? Math.trunc(options?.change as number) : 2;
  const stepMode = options?.stepMode ?? "change-plus-index";
  const dimensions = object.dimensions === 0 ? undefined : object.dimensions;
  const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
  const currentFrame = host.resolveRoomObjectPartFrame(object, "a", sourceClassValue);
  const currentMemberName = host.resolveRoomObjectPartMemberNameExactDirection(object.className, "a", dimensions, currentDirection, currentFrame)
    ?? host.resolveRoomObjectPartMemberName(object.className, "a", dimensions, currentDirection, currentFrame)
    ?? host.resolveRoomObjectPartMemberName(object.className, "a", dimensions, currentDirection, 0);
  const sourceMemberPrefix = currentMemberName?.replace(/_\d+_\d+$/, "_");
  if (sourceMemberPrefix) {
    let nextDirection = currentDirection;
    for (let step = 0; step <= 3; step++) {
      nextDirection = moduloDirection(nextDirection + rotateChange + (stepMode === "change-plus-index" ? step : 0));
      const candidateMemberName = `${sourceMemberPrefix}${nextDirection}_0`;
      if (host.resolveRoomObjectMemberRef(candidateMemberName)) {
        host.movie.setProperty("lastRoomObjectRotateProbe", {
          objectId: object.id,
          className: object.className,
          currentDirection,
          nextDirection,
          change: rotateChange,
          stepMode,
          currentMemberName,
          candidateMemberName,
          source: options?.source ?? `extracted/projectorrays/${release}/hh_room/casts/External/ParentScript 18 - Active Object Class.ls`
        });
        return nextDirection;
      }
    }
  }

  host.recordUnsupportedOnce(`room-object-rotate-direction-missing:${object.className}`, {
    subsystem: "habbo",
    feature: "room-object-rotate-direction-missing",
    detail: `${release} Active Object Class rotate could not resolve a valid member direction for ${object.className} from direction ${currentDirection}`,
    source: `extracted/projectorrays/${release}/hh_room/casts/External/ParentScript 18 - Active Object Class.ls`
  });
  return undefined;
}

export function activateSelectedActiveObjectProgram(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (activation?.event === "mouseUp") {
    return false;
  }

  const action = resolveRoomObjectSelectAction(object, sourceClassValue, { doubleClick: activation?.doubleClick === true });
  if (!action) {
    if (activation?.doubleClick === true && roomObjectHasSourceSelectOverride(sourceClassValue)) {
      host.recordUnsupportedOnce(`room-object-program-select-unhandled:${object.className}`, {
        subsystem: "habbo",
        feature: "room-object-program-select-unhandled",
        detail: `${release} ${object.className} has an extracted active-object subclass in object.cast, but this runtime has not translated that subclass select() behavior yet`,
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
    }
    return false;
  }

  if (action.kind === "move") {
    host.queueRoomRequest({ command: "MOVE", x: action.tile.x, y: action.tile.y }, release);
    host.movie.setProperty("lastRoomObjectProgramAction", {
      action: "move",
      objectId: object.id,
      className: object.className,
      sourceClassName: action.sourceClassName,
      moveTo: action.tile,
      source: action.sourcePath
    });
    host.logDebug("room", "info", `source object MOVE id=${object.id} x=${action.tile.x} y=${action.tile.y}`);
    return true;
  }

  if (action.kind === "set-stuff-data") {
    host.queueRoomRequest({
      command: "SETSTUFFDATA",
      objectId: object.id,
      key: action.key,
      value: action.value
    }, release);
    host.movie.setProperty("lastRoomObjectProgramAction", {
      action: "set-stuff-data",
      objectId: object.id,
      className: object.className,
      sourceClassName: action.sourceClassName,
      key: action.key,
      value: action.value,
      source: action.sourcePath
    });
    host.logDebug("room", "info", `SETSTUFFDATA id=${object.id} ${action.key}=${action.value}`);
    return true;
  }

  if (action.kind === "teleport") {
    return activateTeleporterObject(
      host,
      object,
      action.useTile,
      release,
      action.sourceClassName,
      action.sourcePath,
      action.stateKey,
      action.stateValue
    );
  }

  return false;
}

export function activateRoomCanvas(
  host: HabboRoomObjectRuntimeHost,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (host.movie.getProperty("roomActive") !== true) {
    return false;
  }

  const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
  if (!visual?.roomData || activation?.localX === undefined || activation.localY === undefined) {
    return false;
  }

  const localX = directorInteger(activation.localX);
  const localY = directorInteger(activation.localY);
  const wallItemPlacement = placePendingRoomItemMover(host, localX, localY, release);
  if (wallItemPlacement !== undefined) {
    return wallItemPlacement;
  }

  const passiveWallHit = resolveRoomPointerPassiveWallHit(host, localX, localY);
  if (passiveWallHit) {
    host.movie.setProperty("roomHiliterOverlaySprites", []);
    host.movie.setProperty("lastRoomPointerTarget", undefined);
    host.movie.setProperty("lastRoomPassiveWallClick", {
      ...passiveWallHit,
      x: localX,
      y: localY,
      source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
    });
    host.syncDirectorOverlaySprites();
    host.logDebug("room", "info", `room_canvas click over passive wall id=${passiveWallHit.id} member=${passiveWallHit.memberName}`);
    return true;
  }

  const coordinate = roomStageToWorldCoordinate(
    visual.roomData,
    localX,
    localY,
    String(host.movie.getProperty("lastRoomHeightMap") ?? "")
  );
  if (!coordinate) {
    host.logDebug("room", "info", `room_canvas click outside walkable tile x=${localX} y=${localY}`);
    return true;
  }

  if (placePendingRoomObjectMover(host, coordinate, release)) {
    return true;
  }

  host.queueRoomRequest({ command: "MOVE", x: coordinate.x, y: coordinate.y }, release);
  host.movie.setProperty("lastRoomMoveTarget", coordinate);
  const screen = roomCoordinateToStage(visual.roomData, 0, 0, coordinate.x, coordinate.y, coordinate.h);
  host.logDebug("room", "info", `MOVE target x=${coordinate.x} y=${coordinate.y} h=${coordinate.h} mouse=${localX},${localY} screen=${screen.x},${screen.y}`);
  return true;
}

export function updateRoomPointer(
  host: HabboRoomObjectRuntimeHost,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (host.movie.getProperty("roomActive") !== true) {
    return false;
  }

  const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
  if (!visual?.roomData || activation?.localX === undefined || activation.localY === undefined) {
    return clearRoomPointer(host);
  }

  const localX = directorInteger(activation.localX);
  const localY = directorInteger(activation.localY);
  const passiveWallHit = resolveRoomPointerPassiveWallHit(host, localX, localY);
  if (passiveWallHit) {
    const hadHiliter = readSpriteManifestArray(host.movie.getProperty("roomHiliterOverlaySprites")).length > 0;
    host.movie.setProperty("roomHiliterOverlaySprites", []);
    host.movie.setProperty("lastRoomPointerTarget", undefined);
    host.movie.setProperty("lastRoomPassiveWallPointer", {
      ...passiveWallHit,
      x: localX,
      y: localY,
      source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
    });
    const previewChanged = syncRoomObjectMoverPreview(host, localX, localY, undefined, release);
    if (hadHiliter || previewChanged) {
      host.syncDirectorOverlaySprites();
      return true;
    }
    return false;
  }

  const coordinate = roomStageToWorldCoordinate(
    visual.roomData,
    localX,
    localY,
    String(host.movie.getProperty("lastRoomHeightMap") ?? "")
  );
  if (!coordinate) {
    const hadHiliter = readSpriteManifestArray(host.movie.getProperty("roomHiliterOverlaySprites")).length > 0;
    host.movie.setProperty("roomHiliterOverlaySprites", []);
    const previewChanged = syncRoomObjectMoverPreview(host, localX, localY, undefined, release);
    if (hadHiliter || previewChanged) {
      host.syncDirectorOverlaySprites();
      return true;
    }
    return false;
  }

  const hiliter = visual.elements.find((element) => element.id === "hiliter" || element.type === "hiliter");
  if (!hiliter?.resolvedMember) {
    host.recordUnsupportedOnce("room-hiliter-member-missing", {
      subsystem: "habbo",
      feature: "room-hiliter-member-missing",
      detail: `${release} Room Hiliter Class requested the hiliter sprite, but no generated visual hiliter bitmap member was available`,
      source: `extracted/projectorrays/${release}/${roomHiliterClassSource}`
    });
    const previewChanged = syncRoomObjectMoverPreview(host, localX, localY, coordinate, release);
    if (previewChanged) {
      host.syncDirectorOverlaySprites();
    }
    return previewChanged;
  }

  const castLib = host.loadedCastSlots.get(normalizeCastName(hiliter.resolvedMember.castName));
  if (castLib === undefined) {
    return false;
  }

  const screen = roomCoordinateToStage(visual.roomData, 0, 0, coordinate.x, coordinate.y, coordinate.h);
  host.movie.setProperty("roomHiliterOverlaySprites", [{
    channel: 2400,
    member: {
      castLib,
      member: hiliter.resolvedMember.member
    },
    loc: {
      x: screen.x,
      y: screen.y
    },
    ...(hiliter.width !== undefined ? { width: hiliter.width } : {}),
    ...(hiliter.height !== undefined ? { height: hiliter.height } : {}),
    ...(hiliter.ink !== undefined ? { ink: hiliter.ink } : {}),
    ...(hiliter.blend !== undefined ? { blend: hiliter.blend } : {}),
    locZ: screen.locZ - 1,
    visible: true
  }]);
  syncRoomObjectMoverPreview(host, localX, localY, coordinate, release);
  host.movie.setProperty("lastRoomPointerTarget", coordinate);
  host.syncDirectorOverlaySprites();
  return true;
}

export function clearRoomPointer(host: HabboRoomObjectRuntimeHost): boolean {
  host.movie.setProperty("roomHiliterOverlaySprites", []);
  clearRoomObjectMoverPreview(host);
  host.syncDirectorOverlaySprites();
  return true;
}

function placePendingRoomItemMover(host: HabboRoomObjectRuntimeHost, localX: number, localY: number, release: string): boolean | undefined {
  const mover = readRoomObjectMoverPlacement(host.movie.getProperty("roomObjectMover"));
  if (!mover || mover.action !== "placeItem") {
    return undefined;
  }

  const target = resolveRoomWallItemPlacementTarget(host, localX, localY, release);
  if (!target) {
    host.movie.setProperty("lastRoomHandPlacementRequest", {
      action: "place-item-rejected",
      objectId: mover.objectId,
      stripId: mover.stripId,
      className: mover.className,
      x: localX,
      y: localY,
      source: `extracted/projectorrays/${release}/${roomObjectMoverClassSource}`
    });
    host.logDebug("room", "info", `wall item placement rejected strip=${mover.stripId} mouse=${localX},${localY}`);
    return true;
  }

  const directionMarker = target.direction === "rightwall" ? "r" : "l";
  const body = `${mover.stripId} :w=${target.wallX},${target.wallY} l=${target.localX},${target.localY} ${directionMarker}`;
  host.queueRoomRequest({ command: "PLACESTUFF", body }, release);
  host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
  host.movie.setProperty("roomObjectMover", undefined);
  host.movie.setProperty("roomClickAction", "moveHuman");
  clearRoomObjectMoverPreview(host);
  host.movie.setProperty("lastRoomHandPlacementRequest", {
    action: "place-item",
    objectId: mover.objectId,
    stripId: mover.stripId,
    className: mover.className,
    itemType: mover.itemType,
    wallX: target.wallX,
    wallY: target.wallY,
    localX: target.localX,
    localY: target.localY,
    direction: target.direction,
    body,
    source: `extracted/projectorrays/${release}/${roomObjectMoverClassSource}`
  });
  clearRoomPointer(host);
  host.logDebug("room", "info", `PLACESTUFF wall-item strip=${mover.stripId} body=${body}`);
  return true;
}

function resolveRoomWallItemPlacementTarget(
  host: HabboRoomObjectRuntimeHost,
  localX: number,
  localY: number,
  release: string
): {
  readonly wallX: number;
  readonly wallY: number;
  readonly localX: number;
  readonly localY: number;
  readonly direction: "leftwall" | "rightwall";
  readonly wallObjectId: string;
  readonly wallMemberName: string;
} | undefined {
  const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
  if (!visual?.roomData) {
    return undefined;
  }

  const component = host.objectManager.getObject("#room_component");
  const passiveObjects = Object.values(coerceRecord(component?.get("passiveObjects"))).filter(isRoomObjectRecord);
  const privateRoomPatterns = host.getPrivateRoomPatterns();
  const passivePlans = passiveObjects.flatMap((object) => host.createRoomObjectSpritePlans(object, visual.roomData ?? {}, 0, 0, release, privateRoomPatterns));
  let selected: {
    readonly plan: HabboRoomObjectSpritePlan;
    readonly rect: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
    readonly direction: "leftwall" | "rightwall";
  } | undefined;

  for (const plan of passivePlans) {
    if (!isWallPlacementSpritePlan(plan)) {
      continue;
    }

    const member = host.movie.cast.getMember(plan.memberRef);
    if (!member) {
      continue;
    }

    const rect = spriteRectForLoc(plan.screen, member);
    if (localX < rect.left || localX >= rect.right || localY < rect.top || localY >= rect.bottom) {
      continue;
    }

    const direction = resolveWallPlacementPlanDirection(plan, rect, localX);
    if (!direction) {
      continue;
    }

    if (!selected || plan.locZ > selected.plan.locZ || (plan.locZ === selected.plan.locZ && plan.zSort > selected.plan.zSort)) {
      selected = { plan, rect, direction };
    }
  }

  if (!selected) {
    return undefined;
  }

  const target = {
    wallX: Math.trunc(selected.plan.object.x ?? 0),
    wallY: Math.trunc(selected.plan.object.y ?? 0),
    localX: Math.max(0, Math.trunc(localX - selected.rect.left)),
    localY: Math.max(0, Math.trunc(localY - selected.rect.top)),
    direction: selected.direction,
    wallObjectId: selected.plan.object.id,
    wallMemberName: selected.plan.memberName
  };
  host.movie.setProperty("lastRoomWallItemPlacementTarget", target);
  return target;
}

function placePendingRoomObjectMover(
  host: HabboRoomObjectRuntimeHost,
  coordinate: { readonly x: number; readonly y: number; readonly h: number },
  release: string
): boolean {
  const mover = readRoomObjectMoverPlacement(host.movie.getProperty("roomObjectMover"));
  if (!mover || (mover.action !== "placeActive" && mover.action !== "moveActive")) {
    return false;
  }

  if (mover.action === "moveActive") {
    host.queueRoomRequest({
      command: "MOVESTUFF",
      objectId: mover.objectId,
      x: coordinate.x,
      y: coordinate.y,
      direction: mover.direction
    }, release);
    applyLocalMovedActiveObjectRuntime(host, mover.objectId, coordinate, mover.direction, release);
    host.movie.setProperty("roomObjectMover", undefined);
    host.movie.setProperty("roomClickAction", "moveHuman");
    clearRoomObjectMoverPreview(host);
    host.movie.setProperty("lastRoomObjectMoveRequest", {
      action: "move-active",
      objectId: mover.objectId,
      className: mover.className,
      x: coordinate.x,
      y: coordinate.y,
      h: coordinate.h,
      direction: mover.direction,
      source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
    });
    clearRoomPointer(host);
    host.clearRoomObjectSelection(release);
    host.renderRoomObjects(release);
    host.logDebug("room", "info", `MOVESTUFF id=${mover.objectId} x=${coordinate.x} y=${coordinate.y} direction=${mover.direction}`);
    return true;
  }

  const body = `${mover.stripId} ${coordinate.x} ${coordinate.y} ${mover.width} ${mover.height} ${mover.direction}`;
  host.queueRoomRequest({ command: "PLACESTUFF", body }, release);
  host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
  const placedObject: HabboRoomObjectRecord = {
    id: mover.objectId,
    className: mover.className,
    kind: "active",
    x: coordinate.x,
    y: coordinate.y,
    h: coordinate.h,
    altitude: coordinate.h,
    dimensions: [mover.width, mover.height],
    direction: [mover.direction],
    ...(mover.colors !== undefined ? { colors: mover.colors } : {})
  };
  ensureDynamicFurnitureCastsForObjectsRuntime(host, [placedObject], release, "place-active-local");
  applyLocalActiveObjectUpdateRuntime(host, placedObject, release, "place-active");
  host.movie.setProperty("roomObjectMover", undefined);
  host.movie.setProperty("roomClickAction", "moveHuman");
  clearRoomObjectMoverPreview(host);
  host.movie.setProperty("lastRoomHandPlacementRequest", {
    action: "place-active",
    objectId: mover.objectId,
    stripId: mover.stripId,
    className: mover.className,
    x: coordinate.x,
    y: coordinate.y,
    h: coordinate.h,
    body,
    localObjectId: placedObject.id,
    source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
  });
  clearRoomPointer(host);
  host.clearRoomObjectSelection(release);
  host.renderRoomObjects(release);
  host.logDebug("room", "info", `PLACESTUFF strip=${mover.stripId} x=${coordinate.x} y=${coordinate.y}`);
  return true;
}

function resolveRoomPointerPassiveWallHit(
  host: HabboRoomObjectRuntimeHost,
  localX: number,
  localY: number
): {
  readonly id: string;
  readonly className: string;
  readonly memberName: string;
  readonly channel: number;
} | undefined {
  const sprites = readSpriteManifestArray(host.movie.getProperty("roomObjectOverlaySprites"));
  const entries = readRoomObjectSpriteEntries(host.movie.getProperty("roomObjectOverlaySpriteEntries"));
  if (sprites.length === 0 || entries.length === 0) {
    return undefined;
  }

  const spritesByChannel = new Map(sprites.map((sprite) => [sprite.channel, sprite]));
  let topHit: {
    readonly entry: HabboRoomObjectSpriteEntry;
    readonly sprite: DirectorSpriteChannelManifest;
    readonly locZ: number;
  } | undefined;
  for (const entry of entries) {
    const sprite = spritesByChannel.get(entry.channel);
    if (!sprite) {
      continue;
    }

    const member = host.movie.cast.getMember(sprite.member);
    const bounds = host.resolveInteractiveSpriteBounds(sprite, member);
    if (localX < bounds.x || localX >= bounds.x + bounds.width || localY < bounds.y || localY >= bounds.y + bounds.height) {
      continue;
    }

    const locZ = sprite.locZ ?? 0;
    if (!topHit || locZ > topHit.locZ || (locZ === topHit.locZ && sprite.channel > topHit.sprite.channel)) {
      topHit = { entry, sprite, locZ };
    }
  }

  if (!topHit || topHit.entry.kind !== "passive" || !isWallPlacementSpriteEntry(topHit.entry)) {
    return undefined;
  }

  return {
    id: topHit.entry.id,
    className: topHit.entry.className,
    memberName: topHit.entry.memberName,
    channel: topHit.entry.channel
  };
}

function syncRoomObjectMoverPreview(
  host: HabboRoomObjectRuntimeHost,
  localX: number,
  localY: number,
  coordinate: { readonly x: number; readonly y: number; readonly h: number } | undefined,
  release: string
): boolean {
  const mover = readRoomObjectMoverPlacement(host.movie.getProperty("roomObjectMover"));
  if (!mover) {
    return clearRoomObjectMoverPreview(host);
  }

  const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
  if (!visual?.roomData) {
    return clearRoomObjectMoverPreview(host);
  }

  let sprites: DirectorSpriteChannelManifest[] = [];
  if (mover.action === "placeActive" || mover.action === "moveActive") {
    sprites = coordinate
      ? createRoomObjectMoverActivePreviewSprites(host, mover, coordinate, visual.roomData, release)
      : createRoomObjectMoverSmallPreviewSprites(host, mover.className, localX, localY, release);
    if (coordinate && sprites.length === 0) {
      sprites = createRoomObjectMoverSmallPreviewSprites(host, mover.className, localX, localY, release);
    }
  } else if (mover.action === "placeItem") {
    sprites = createRoomObjectMoverItemPreviewSprites(host, mover, localX, localY, release);
  }

  host.movie.setProperty("roomObjectMoverOverlaySprites", sprites);
  host.movie.setProperty("lastRoomObjectMoverPreview", {
    action: mover.action,
    objectId: mover.objectId,
    className: mover.className,
    ...(mover.action === "placeActive" || mover.action === "moveActive" ? { direction: mover.direction } : {}),
    x: coordinate?.x,
    y: coordinate?.y,
    h: coordinate?.h,
    localX,
    localY,
    spriteCount: sprites.length,
    source: HABBO_ROOM_OBJECT_MOVER_SOURCE
  });
  return true;
}

export function clearRoomObjectMoverPreview(host: HabboRoomObjectRuntimeHost): boolean {
  const hadPreview = readSpriteManifestArray(host.movie.getProperty("roomObjectMoverOverlaySprites")).length > 0;
  host.movie.setProperty("roomObjectMoverOverlaySprites", []);
  return hadPreview;
}

function createRoomObjectMoverActivePreviewSprites(
  host: HabboRoomObjectRuntimeHost,
  mover: HabboRoomObjectMoverActivePlacement | HabboRoomObjectMoverActiveMove,
  coordinate: { readonly x: number; readonly y: number; readonly h: number },
  roomData: Readonly<Record<string, string | number>>,
  release: string
): DirectorSpriteChannelManifest[] {
  const object: HabboRoomObjectRecord = {
    id: `mover:${mover.objectId}`,
    kind: "active",
    className: mover.className,
    x: coordinate.x,
    y: coordinate.y,
    h: coordinate.h,
    altitude: coordinate.h,
    dimensions: [mover.width, mover.height],
    direction: [mover.direction],
    ...(mover.colors !== undefined ? { colors: mover.colors } : {})
  };
  const plans = host.createRoomObjectSpritePlans(object, roomData, 0, 0, release, host.getPrivateRoomPatterns());
  return plans.map((plan, index) => ({
    channel: HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE + index,
    member: plan.memberRef,
    loc: plan.screen,
    ink: plan.ink,
    blend: plan.blend,
    locZ: plan.locZ,
    ...(plan.tint !== undefined ? { bgColor: plan.tint } : {}),
    ...(plan.flipH ? { flipH: true } : {}),
    ...(plan.flipV ? { flipV: true } : {}),
    visible: true
  }));
}

function createRoomObjectMoverSmallPreviewSprites(
  host: HabboRoomObjectRuntimeHost,
  className: string,
  localX: number,
  localY: number,
  release: string
): DirectorSpriteChannelManifest[] {
  const memberRef = roomObjectMoverSmallMemberCandidates(className)
    .map((memberName) => host.resolveExternalBitmapMemberRefByName(memberName, ["hh_furni_small", "hh_room", "hh_room_private", "hh_patch_uk"]))
    .find((candidate): candidate is DirectorMemberRef => candidate !== undefined);
  if (!memberRef) {
    host.recordUnsupportedOnce(`room-object-mover-small-member-missing:${className}`, {
      subsystem: "habbo",
      feature: "room-object-mover-small-member-missing",
      detail: `${release} Object Mover Class requested a small mouse preview for ${className}, but no source small-member bitmap was resolved`,
      source: HABBO_ROOM_OBJECT_MOVER_SOURCE
    });
    return [];
  }

  return [{
    channel: HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE,
    member: memberRef,
    loc: { x: localX, y: localY },
    ink: 36,
    blend: HABBO_ROOM_OBJECT_MOVER_SMALL_BLEND,
    locZ: HABBO_ROOM_OBJECT_MOVER_SMALL_LOCZ,
    visible: true
  }];
}

function createRoomObjectMoverItemPreviewSprites(
  host: HabboRoomObjectRuntimeHost,
  mover: HabboRoomObjectMoverItemPlacement,
  localX: number,
  localY: number,
  release: string
): DirectorSpriteChannelManifest[] {
  const target = resolveRoomWallItemPlacementTarget(host, localX, localY, release);
  const direction = target?.direction ?? "rightwall";
  const memberName = resolveRoomItemMemberNameRuntime(mover.className, direction, mover.itemType);
  const memberRef = memberName ? host.resolveRoomObjectMemberRef(memberName) : undefined;
  if (!memberRef) {
    host.recordUnsupportedOnce(`room-object-mover-item-member-missing:${mover.className}`, {
      subsystem: "habbo",
      feature: "room-object-mover-item-member-missing",
      detail: `${release} Object Mover Class requested an item preview for ${mover.className}, but no source wall-item bitmap was resolved`,
      source: HABBO_ROOM_OBJECT_MOVER_SOURCE
    });
    return [];
  }

  return [{
    channel: HABBO_ROOM_OBJECT_MOVER_PREVIEW_CHANNEL_BASE,
    member: memberRef,
    loc: { x: localX, y: localY },
    ink: 8,
    blend: target ? 100 : HABBO_ROOM_OBJECT_MOVER_INVALID_ITEM_BLEND,
    locZ: HABBO_ROOM_OBJECT_MOVER_SMALL_LOCZ,
    visible: true
  }];
}

export function renderRoomObjectsRuntime(host: HabboRoomObjectRuntimeHost, release: string): void {
    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    if (!visual?.roomData) {
      return;
    }

    const component = host.objectManager.getObject("#room_component");
    const passiveObjects = Object.values(coerceRecord(component?.get("passiveObjects"))).filter(isRoomObjectRecord);
    const activeObjects = Object.values(coerceRecord(component?.get("activeObjects"))).filter(isRoomObjectRecord);
    const itemObjects = Object.values(coerceRecord(component?.get("itemObjects"))).filter(isRoomObjectRecord);
    const objects = [
      ...passiveObjects,
      ...activeObjects,
      ...itemObjects
    ];
    // Source Room Geometry Class uses roomdata offsets only. The visualizer
    // rect is applied to static visualizer sprites, not to object/user geometry.
    const geometryLeft = 0;
    const geometryTop = 0;
    const privateRoomPatterns = host.getPrivateRoomPatterns();
    const passivePlans = passiveObjects.flatMap((object) => createRoomObjectSpritePlansRuntime(host, object, visual.roomData ?? {}, geometryLeft, geometryTop, release, privateRoomPatterns));
    const activePlans = activeObjects.flatMap((object) => createRoomObjectSpritePlansRuntime(host, object, visual.roomData ?? {}, geometryLeft, geometryTop, release, privateRoomPatterns));
    const itemPlans = itemObjects.flatMap((object) => createRoomItemSpritePlansRuntime(host, object, visual.roomData ?? {}, geometryLeft, geometryTop, release, passivePlans));
    const plans = [...passivePlans, ...activePlans, ...itemPlans];
    const mover = readRoomObjectMoverPlacement(host.movie.getProperty("roomObjectMover"));
    const sortedPlans = [...plans].sort((left, right) => left.zSort - right.zSort || left.object.id.localeCompare(right.object.id) || left.memberName.localeCompare(right.memberName));
    const spriteEntries: HabboRoomObjectSpriteEntry[] = [];
    const sprites: DirectorSpriteChannelManifest[] = sortedPlans.map((plan, index) => {
      const channel = 2500 + index;
      spriteEntries.push({
        channel,
        id: plan.object.id,
        kind: plan.object.kind,
        className: plan.object.className,
        ...(plan.part ? { part: plan.part } : {}),
        memberName: plan.memberName,
        ...(plan.flipH ? { flipH: true } : {}),
        ...(plan.flipV ? { flipV: true } : {})
      });
      return {
        channel,
        member: plan.memberRef,
        loc: plan.screen,
        ink: plan.ink,
        blend: host.resolveRoomObjectMoverBaseBlend(plan, mover),
        locZ: plan.locZ,
        ...(plan.tint !== undefined ? { bgColor: plan.tint } : {}),
        ...(plan.flipH ? { flipH: true } : {}),
        ...(plan.flipV ? { flipV: true } : {}),
        visible: host.resolveRoomObjectMoverBaseVisible(plan, mover)
      };
    });
    host.movie.setProperty("roomObjectOverlaySprites", sprites);
    host.movie.setProperty("roomObjectOverlaySpriteEntries", spriteEntries);
    host.movie.setProperty("roomObjectSprites", {
      objectCount: objects.length,
      spriteCount: sprites.length,
      runtimeMemberCount: 0,
      missingCount: Math.max(0, objects.length - new Set(plans.map((plan) => plan.object.id)).size),
      members: sortedPlans.map((plan) => ({
        channel: spriteEntries.find((entry) => entry.id === plan.object.id && entry.memberName === plan.memberName)?.channel,
        id: plan.object.id,
        className: plan.object.className,
        kind: plan.object.kind,
        part: plan.part,
        memberName: plan.memberName,
        locZ: plan.locZ
      }))
    });
    host.syncRoomObjectAnimationPreloadSprites(release);
    host.syncDirectorOverlaySprites();
    host.syncRoomInteractiveElements();
    host.logDebug("room", sprites.length > 0 ? "ok" : "warn", `renderRoomObjects objects=${objects.length} sprites=${sprites.length}`);
  }


export function refreshAnimatedRoomObjectSpritesRuntime(host: HabboRoomObjectRuntimeHost, objects: readonly HabboRoomObjectRecord[], release: string): void {
    if (objects.length === 0) {
      return;
    }

    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    if (!visual?.roomData) {
      return;
    }

    const changedKeys = new Set(objects.map((object) => roomObjectOverlayKey(object.kind, object.id)));
    const currentSprites = readSpriteManifestArray(host.movie.getProperty("roomObjectOverlaySprites"));
    const currentEntries = readRoomObjectSpriteEntries(host.movie.getProperty("roomObjectOverlaySpriteEntries"));
    if (currentSprites.length === 0 || currentEntries.length === 0) {
      host.renderRoomObjects(release);
      return;
    }

    const currentSpritesByChannel = new Map(currentSprites.map((sprite) => [sprite.channel, sprite]));
    const retainedSprites: DirectorSpriteChannelManifest[] = [];
    const retainedEntries: HabboRoomObjectSpriteEntry[] = [];
    const reusableChannels = new Map<string, number>();
    for (const entry of currentEntries) {
      const key = roomObjectOverlayKey(entry.kind, entry.id);
      if (changedKeys.has(key)) {
        reusableChannels.set(roomObjectOverlayPartKey(entry.kind, entry.id, entry.part, entry.memberName), entry.channel);
        continue;
      }

      const sprite = currentSpritesByChannel.get(entry.channel);
      if (!sprite) {
        continue;
      }

      retainedEntries.push(entry);
      retainedSprites.push(sprite);
    }

    const usedChannels = new Set(retainedEntries.map((entry) => entry.channel));
    let nextChannel = Math.max(2499, ...currentSprites.map((sprite) => sprite.channel)) + 1;
    const mover = readRoomObjectMoverPlacement(host.movie.getProperty("roomObjectMover"));
    const privateRoomPatterns = host.getPrivateRoomPatterns();
    const plans = objects
      .flatMap((object) => createRoomObjectSpritePlansRuntime(host, object, visual.roomData ?? {}, 0, 0, release, privateRoomPatterns))
      .sort((left, right) => left.zSort - right.zSort || left.object.id.localeCompare(right.object.id) || left.memberName.localeCompare(right.memberName));
    const updatedEntries: HabboRoomObjectSpriteEntry[] = [];
    const updatedSprites: DirectorSpriteChannelManifest[] = [];
    for (const plan of plans) {
      const channelKey = roomObjectOverlayPartKey(plan.object.kind, plan.object.id, plan.part, plan.memberName);
      let channel = reusableChannels.get(channelKey);
      if (channel === undefined || usedChannels.has(channel)) {
        channel = nextChannel++;
      }
      usedChannels.add(channel);

      updatedEntries.push({
        channel,
        id: plan.object.id,
        kind: plan.object.kind,
        className: plan.object.className,
        ...(plan.part ? { part: plan.part } : {}),
        memberName: plan.memberName,
        ...(plan.flipH ? { flipH: true } : {}),
        ...(plan.flipV ? { flipV: true } : {})
      });
      updatedSprites.push({
        channel,
        member: plan.memberRef,
        loc: plan.screen,
        ink: plan.ink,
        blend: host.resolveRoomObjectMoverBaseBlend(plan, mover),
        locZ: plan.locZ,
        ...(plan.tint !== undefined ? { bgColor: plan.tint } : {}),
        ...(plan.flipH ? { flipH: true } : {}),
        ...(plan.flipV ? { flipV: true } : {}),
        visible: host.resolveRoomObjectMoverBaseVisible(plan, mover)
      });
    }

    const sprites = [...retainedSprites, ...updatedSprites];
    const entries = [...retainedEntries, ...updatedEntries];
    host.movie.setProperty("roomObjectOverlaySprites", sprites);
    host.movie.setProperty("roomObjectOverlaySpriteEntries", entries);
    host.movie.setProperty("lastRoomObjectAnimationOverlayRefresh", {
      objectCount: objects.length,
      spriteCount: updatedSprites.length,
      retainedSpriteCount: retainedSprites.length,
      totalSpriteCount: sprites.length
    });
    host.syncDirectorOverlaySprites();
  }


export function resolveRoomObjectMoverBaseBlendRuntime(host: HabboRoomObjectRuntimeHost, 
    plan: HabboRoomObjectSpritePlan,
    mover: HabboRoomObjectMoverPlacement | undefined
  ): number {
    return mover?.action === "moveActive" && plan.object.kind === "active" && plan.object.id === mover.objectId
      ? HABBO_ROOM_OBJECT_MOVER_GHOST_BLEND
      : plan.blend;
  }


export function resolveRoomObjectMoverBaseVisibleRuntime(host: HabboRoomObjectRuntimeHost, 
    plan: HabboRoomObjectSpritePlan,
    mover: HabboRoomObjectMoverPlacement | undefined
  ): boolean {
    if (plan.visible === false) {
      return false;
    }

    if (mover?.action === "moveActive" && plan.object.kind === "active" && plan.object.id === mover.objectId && plan.ink === 33) {
      return false;
    }

    return true;
  }


export function syncRoomObjectAnimationPreloadSpritesRuntime(host: HabboRoomObjectRuntimeHost, release: string): void {
    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    if (!visual?.roomData) {
      host.movie.setProperty("roomObjectAnimationPreloadSourceKey", "");
      host.movie.setProperty("roomObjectAnimationPreloadSignature", "[]");
      host.movie.setProperty("roomObjectAnimationPreloadSprites", []);
      return;
    }

    const component = host.objectManager.getObject("#room_component");
    const activeObjects = Object.values(coerceRecord(component?.get("activeObjects"))).filter(isRoomObjectRecord);
    const preloadCandidates = activeObjects
      .flatMap((object): HabboRoomObjectAnimationPreloadCandidate[] => {
        const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
        if (!roomObjectSourceHasAnimatedUpdate(object, sourceClassValue)) {
          return [];
        }

        const ticks = resolveRoomObjectSourceAnimationPreloadTicks(sourceClassValue);
        return ticks.length > 0 ? [{ object, sourceClassValue, ticks }] : [];
      })
      .sort((left, right) => roomObjectAnimationPreloadCandidateSortKey(left).localeCompare(roomObjectAnimationPreloadCandidateSortKey(right)));
    const preloadSourceKey = roomObjectAnimationPreloadInputSignature(preloadCandidates, visual.roomData);
    if (host.movie.getProperty("roomObjectAnimationPreloadSourceKey") === preloadSourceKey) {
      return;
    }

    if (preloadCandidates.length === 0) {
      host.movie.setProperty("roomObjectAnimationPreloadSourceKey", preloadSourceKey);
      host.movie.setProperty("roomObjectAnimationPreloadSignature", "[]");
      host.movie.setProperty("roomObjectAnimationPreloadSprites", []);
      return;
    }

    const privateRoomPatterns = host.getPrivateRoomPatterns();
    const originalFrame = host.getRoomObjectAnimationFrame();
    const preloadSprites: DirectorSpriteChannelManifest[] = [];
    let channel = 850000;
    try {
      for (const candidate of preloadCandidates) {
        for (const tick of candidate.ticks) {
          host.movie.setProperty("roomObjectAnimationFrame", tick);
          const plans = createRoomObjectSpritePlansRuntime(host, candidate.object, visual.roomData, 0, 0, release, privateRoomPatterns);
          for (const plan of plans) {
            preloadSprites.push({
              channel: channel++,
              member: plan.memberRef,
              loc: plan.screen,
              ink: plan.ink,
              blend: plan.blend,
              locZ: plan.locZ,
              ...(plan.tint !== undefined ? { bgColor: plan.tint } : {}),
              ...(plan.flipH ? { flipH: true } : {}),
              ...(plan.flipV ? { flipV: true } : {}),
              visible: plan.visible !== false
            });
          }
        }
      }
    } finally {
      host.movie.setProperty("roomObjectAnimationFrame", originalFrame);
    }

    const deduped = dedupeSpritePreloadManifests(preloadSprites);
    const signature = JSON.stringify(deduped.map((sprite) => [
      sprite.member.castLib,
      sprite.member.member,
      sprite.ink,
      sprite.blend,
      sprite.bgColor ?? "",
      sprite.flipH === true ? 1 : 0,
      sprite.flipV === true ? 1 : 0,
      sprite.width ?? "",
      sprite.height ?? ""
    ]));
    if (host.movie.getProperty("roomObjectAnimationPreloadSignature") === signature) {
      host.movie.setProperty("roomObjectAnimationPreloadSourceKey", preloadSourceKey);
      return;
    }

    host.movie.setProperty("roomObjectAnimationPreloadSignature", signature);
    host.movie.setProperty("roomObjectAnimationPreloadSourceKey", preloadSourceKey);
    host.movie.setProperty("roomObjectAnimationPreloadSprites", deduped);
    if (deduped.length > 0) {
      host.logDebug("room", "info", `preload room object animation sprites=${deduped.length}`);
    }
  }


export function createRoomObjectSpritePlansRuntime(host: HabboRoomObjectRuntimeHost, 
    object: HabboRoomObjectRecord,
    roomData: Readonly<Record<string, string | number>>,
    rectLeft: number,
    rectTop: number,
    release: string,
    privateRoomPatterns: HabboPrivateRoomPatterns = {}
  ): HabboRoomObjectSpritePlan[] {
    if (object.x === undefined || object.y === undefined) {
      return [];
    }

    const directions = Array.isArray(object.direction) ? object.direction : [0];
    const baseDirection = Number(directions[0] ?? 0) || 0;
    const dimensions: readonly [number, number] | undefined = object.dimensions === 0 ? undefined : object.dimensions;
    const screen = roomCoordinateToStage(roomData, rectLeft, rectTop, object.x, object.y, object.h ?? object.altitude ?? 0);
    const plans: HabboRoomObjectSpritePlan[] = [];
    const classProps = getRoomObjectClassPropsRuntime(host, object.className);
    const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
    const partColors = parseRoomObjectPartColors(object.colors);
    const correctLocZ = numberFromRoomData(roomData, "factorx", 64) !== 32;
    const sourceMirrorLocHShift = numberFromRoomData(roomData, "factorx", 64);
    const locHeight = correctLocZ ? ((object.h ?? object.altitude ?? 0) * 1000) : 0;
    let activeLocZAdjust = -5;
    const plannedLocZByPart = new Map<string, number>();
    for (let index = 0; index < 26; index++) {
      const part = String.fromCharCode("a".charCodeAt(0) + index);
      const direction = Number(directions[index] ?? baseDirection) || 0;
      const frame = resolveRoomObjectPartFrameRuntime(host, object, part, sourceClassValue);
      const baseMemberName = resolveRoomObjectPartMemberNameRuntime(host, object.className, part, dimensions, direction, frame)
        ?? (frame !== 0 ? resolveRoomObjectPartMemberNameRuntime(host, object.className, part, dimensions, direction, 0) : undefined);
      const sourcePartState = baseMemberName
        ? resolveRoomObjectSourcePartState(object, sourceClassValue, part, {
          animationTick: getRoomObjectAnimationFrameRuntime(host),
          timedStateActive: roomObjectTimedStateActiveRuntime(host, object, sourceClassValue),
          baseMemberName
        })
        : undefined;
      const sourceMemberName = sourcePartState?.memberName && resolveRoomObjectMemberRefRuntime(host, sourcePartState.memberName)
        ? sourcePartState.memberName
        : undefined;
      const previousSourceMemberName = sourcePartState?.memberName && !sourceMemberName
          ? previousRoomObjectPartMemberNameRuntime(host, object, part)
        : undefined;
      const memberName = sourceMemberName ?? previousSourceMemberName ?? baseMemberName;
      if (!memberName) {
        if (index === 0) {
          host.recordUnsupportedOnce(`room-object-member-missing:${object.className}`, {
            subsystem: "habbo",
            feature: "room-object-member-missing",
            detail: `${release} ${object.kind} object ${object.id} (${object.className}) did not resolve a first bitmap member for direction ${direction}`,
            source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
          });
        }
        break;
      }

      const wallMemberName = privateRoomPatterns.wall ? resolvePrivateRoomWallMemberName(memberName, privateRoomPatterns.wall) : undefined;
      const wallMemberRef = wallMemberName ? resolveRoomObjectMemberRefRuntime(host, wallMemberName) : undefined;
      const resolvedMemberName = wallMemberRef ? wallMemberName : memberName;
      const memberRef = wallMemberRef ?? resolveRoomObjectMemberRefRuntime(host, memberName);
      if (!memberRef) {
        break;
      }
      const memberFlipH = isMirroredRoomObjectMemberAliasRuntime(host, resolvedMemberName ?? memberName);

      const sourceDirection = object.kind === "active" ? baseDirection : direction;
      const locShift = object.kind === "active" ? classProps.getLocShift(part, baseDirection) : { x: 0, y: 0 };
      const mirrorLocHShift = memberFlipH ? sourceMirrorLocHShift : 0;
      const shiftedScreen = locShift.x !== 0 || locShift.y !== 0 || mirrorLocHShift !== 0
        ? { x: screen.x + mirrorLocHShift + locShift.x, y: screen.y + locShift.y, locZ: screen.locZ }
        : screen;
      const sourceInk = sourcePartState?.ink ?? classProps.getInk(part);
      const sourceBlend = sourcePartState?.blend ?? classProps.getBlend(part);
      const sourceZShift = classProps.getZShift(part, sourceDirection);
      const objectLocZAdjust = object.kind === "active" ? activeLocZAdjust - 1 : 0;
      const locZAdjust = wallMemberRef ? -975 : 0;
      let locZ = screen.locZ + locHeight + sourceZShift + objectLocZAdjust + locZAdjust;
      if (sourcePartState?.locZRelative) {
        const referenceLocZ = plannedLocZByPart.get(sourcePartState.locZRelative.referencePart);
        if (referenceLocZ !== undefined) {
          locZ = referenceLocZ + sourcePartState.locZRelative.offset;
        }
      }
      const partTint = wallMemberRef && privateRoomPatterns.wall
        ? colorForPrivateRoomWallMember(memberName, privateRoomPatterns.wall)
        : roomObjectPartColorToHex(partColors[index]);
      plannedLocZByPart.set(part, locZ);
      plans.push({
        object,
        memberRef,
        memberName: resolvedMemberName ?? memberName,
        part,
        screen: shiftedScreen,
        locZ,
        ink: wallMemberRef ? 41 : sourceInk,
        blend: sourceBlend,
        zSort: estimateRoomObjectZSortRuntime(object, locZ),
        ...(partTint !== undefined ? { tint: partTint } : {}),
        ...(wallMemberRef ? { locZAdjust, preferredCasts: ["hh_room_private"] } : {}),
        ...(resolveRoomObjectPartVisibleRuntime(host, object, part, sourceClassValue) === false ? { visible: false } : {}),
        ...(memberFlipH ? { flipH: true } : {})
      });
      activeLocZAdjust++;
    }

    const shadowMemberName = resolveRoomObjectShadowMemberNameRuntime(host, object.className, baseDirection);
    if (shadowMemberName) {
      const memberRef = resolveRoomObjectMemberRefRuntime(host, shadowMemberName);
      if (memberRef) {
        const shadowFlipH = isMirroredRoomObjectMemberAliasRuntime(host, shadowMemberName);
        const shadowBlend = classProps.getBlend("sd");
        plans.push({
          object,
          memberRef,
          memberName: shadowMemberName,
          part: "sd",
          screen: shadowFlipH ? { x: screen.x + sourceMirrorLocHShift, y: screen.y, locZ: screen.locZ } : screen,
          locZ: screen.locZ - 4000,
          ink: classProps.getInk("sd"),
          blend: shadowBlend === 100 ? 20 : shadowBlend,
          zSort: estimateRoomObjectZSortRuntime(object, screen.locZ - 4000),
          ...(shadowFlipH ? { flipH: true } : {})
        });
      }
    }

    return plans;
  }

export function createRoomItemSpritePlansRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  roomData: Readonly<Record<string, string | number>>,
  rectLeft: number,
  rectTop: number,
  release: string,
  passivePlans: readonly HabboRoomObjectSpritePlan[]
): HabboRoomObjectSpritePlan[] {
  const direction = normalizeWallItemDirection(object.direction);
  if (!direction) {
    return [];
  }

  const memberName = resolveRoomItemMemberNameRuntime(object.className, direction, object.itemType ?? "");
  if (!memberName) {
    host.recordUnsupportedOnce(`room-item-member-class:${object.className}`, {
      subsystem: "habbo",
      feature: "room-item-member-class",
      detail: `${release} wall item ${object.id} (${object.className}) uses an item class not yet resolved through Item Object Class solveMembers`,
      source: `extracted/projectorrays/${release}/${roomItemObjectClassSource}`
    });
    return [];
  }

  const memberRef = resolveRoomObjectMemberRefRuntime(host, memberName);
  if (!memberRef) {
    host.recordUnsupportedOnce(`room-item-member-missing:${memberName}`, {
      subsystem: "habbo",
      feature: "room-item-member-missing",
      detail: `${release} wall item ${object.id} requested bitmap member ${memberName}, but it was not found in imported room casts`,
      source: `extracted/projectorrays/${release}/${roomItemObjectClassSource}`
    });
    return [];
  }

  const member = host.movie.cast.getMember(memberRef);
  const screen = resolveRoomItemScreenRuntime(host, object, roomData, rectLeft, rectTop, passivePlans);
  if (!screen) {
    return [];
  }

  const locZ = resolveRoomItemLocZRuntime(host, screen, member, passivePlans);
  const tint = resolveRoomItemInkBgColorRuntime(object.className, object.itemType ?? "");
  return [{
    object,
    memberRef,
    memberName,
    screen,
    locZ,
    ink: 8,
    blend: 100,
    zSort: locZ,
    ...(tint ? { tint } : {})
  }];
}

export function resolveRoomItemMemberNameRuntime(className: string, direction: "leftwall" | "rightwall", itemType: string): string | undefined {
  switch (className) {
    case "post.it":
    case "post.it.vd":
      return `${direction} ${className}`;
    case "poster":
      return `${direction} poster ${itemType || "0"}`;
    case "photo":
      return `${direction} photo`;
    default:
      return undefined;
  }
}

function resolveRoomItemInkBgColorRuntime(className: string, itemType: string): string | undefined {
  if (className === "post.it") {
    return itemType || "#FFFF33";
  }
  if (className === "post.it.vd") {
    return "#FFFFFF";
  }
  return undefined;
}

function resolveRoomItemScreenRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  roomData: Readonly<Record<string, string | number>>,
  rectLeft: number,
  rectTop: number,
  passivePlans: readonly HabboRoomObjectSpritePlan[]
): HabboRoomCoordinate | undefined {
  if (object.formatVersion === "new") {
    const wallPlan = passivePlans.find((plan) => (
      plan.object.x === object.wallX
      && plan.object.y === object.wallY
    ));
    const wallMember = wallPlan ? host.movie.cast.getMember(wallPlan.memberRef) : undefined;
    if (wallPlan && wallMember) {
      // Item Object Class updateLocation anchors new-format wall items to the
      // passive wall sprite top-left, then applies the packet local offset.
      return {
        x: wallPlan.screen.x - wallMember.regPoint.x + (object.localX ?? 0),
        y: wallPlan.screen.y - wallMember.regPoint.y + (object.localY ?? 0),
        locZ: wallPlan.locZ + 2
      };
    }
  }

  if (object.x === undefined || object.y === undefined) {
    return undefined;
  }

  return roomCoordinateToStage(roomData, rectLeft, rectTop, object.x, object.y, (object.h ?? 0) * (18 / 32));
}

function resolveRoomItemLocZRuntime(
  host: HabboRoomObjectRuntimeHost,
  screen: HabboRoomCoordinate,
  member: DirectorMember | undefined,
  passivePlans: readonly HabboRoomObjectSpritePlan[]
): number {
  if (member) {
    const itemRect = spriteRectForLoc(screen, member);
    let locZ: number | undefined;
    for (const plan of passivePlans) {
      const passiveMember = host.movie.cast.getMember(plan.memberRef);
      if (!passiveMember) {
        continue;
      }
      if (!rectsIntersect(itemRect, spriteRectForLoc(plan.screen, passiveMember))) {
        continue;
      }
      locZ = Math.max(locZ ?? plan.locZ, plan.locZ);
    }
    if (locZ !== undefined) {
      return locZ + 2;
    }
  }

  const defaultLocZ = numberFromUnknown(host.getVariable("window.default.locz"), 0);
  return defaultLocZ - 10000;
}

export function resolveRoomObjectPartFrameRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  part: string,
  sourceClassValue: string | undefined
): number {
  const sourceFrame = resolveRoomObjectSourcePartFrame(object, sourceClassValue, part, {
    animationTick: getRoomObjectAnimationFrameRuntime(host),
    timedStateActive: roomObjectTimedStateActiveRuntime(host, object, sourceClassValue)
  });
  if (sourceFrame !== undefined) {
    return sourceFrame;
  }

  return 0;
}

export function getRoomObjectAnimationFrameRuntime(host: HabboRoomObjectRuntimeHost): number {
  return Math.max(0, Math.trunc(numberFromUnknown(host.movie.getProperty("roomObjectAnimationFrame"))));
}

export function resolveRoomObjectPartVisibleRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  part: string,
  sourceClassValue: string | undefined
): boolean {
  const sourceAnimation = roomObjectSourceAnimationForPartRuntime(host, object, sourceClassValue, part);
  const sourceVisible = resolveRoomObjectSourcePartVisible(object, sourceClassValue, part, {
    visibilityAnimationActive: sourceAnimation !== undefined,
    visibilityAnimationTick: sourceAnimation?.elapsedFrames,
    timedStateActive: roomObjectTimedStateActiveRuntime(host, object, sourceClassValue)
  });
  if (sourceVisible !== undefined) {
    return sourceVisible;
  }

  return true;
}

export function previousRoomObjectPartMemberNameRuntime(host: HabboRoomObjectRuntimeHost, object: HabboRoomObjectRecord, part: string): string | undefined {
  const previousEntry = readRoomObjectSpriteEntries(host.movie.getProperty("roomObjectOverlaySpriteEntries"))
    .find((entry) => (
      entry.id === object.id
      && entry.kind === object.kind
      && entry.className === object.className
      && (entry.part === part || (entry.part === undefined && entry.memberName.includes(`_${part}_`)))
      && resolveRoomObjectMemberRefRuntime(host, entry.memberName) !== undefined
    ));
  return previousEntry?.memberName;
}

export function resolveRoomObjectPartMemberNameRuntime(
  host: HabboRoomObjectRuntimeHost,
  className: string,
  part: string,
  dimensions: readonly [number, number] | undefined,
  direction: number,
  frame: number
): string | undefined {
  const directionCandidates = uniqueNumbers([direction, 0, 2, 4, 6]);
  for (const candidateDirection of directionCandidates) {
    for (const base of resolveRoomObjectPartMemberBasesRuntime(className, part, dimensions)) {
      const memberName = `${base}_${candidateDirection}_${frame}`;
      if (resolveRoomObjectMemberRefRuntime(host, memberName)) {
        return memberName;
      }
    }
  }

  return undefined;
}

export function resolveRoomObjectPartMemberNameExactDirectionRuntime(
  host: HabboRoomObjectRuntimeHost,
  className: string,
  part: string,
  dimensions: readonly [number, number] | undefined,
  direction: number,
  frame: number
): string | undefined {
  for (const base of resolveRoomObjectPartMemberBasesRuntime(className, part, dimensions)) {
    const memberName = `${base}_${moduloDirection(direction)}_${frame}`;
    if (resolveRoomObjectMemberRefRuntime(host, memberName)) {
      return memberName;
    }
  }

  return undefined;
}

function resolveRoomObjectPartMemberBasesRuntime(
  className: string,
  part: string,
  dimensions: readonly [number, number] | undefined
): readonly string[] {
  const sourceClassName = normalizeRoomObjectClassName(className);
  const dimensionless = `${sourceClassName}_${part}_0`;
  if (!dimensions) {
    return [dimensionless];
  }

  const width = Math.trunc(dimensions[0] ?? 0);
  const height = Math.trunc(dimensions[1] ?? 0);
  const dimensioned = `${dimensionless}_${width}_${height}`;
  return dimensioned === dimensionless ? [dimensionless] : [dimensioned, dimensionless];
}

export function resolveRoomObjectShadowMemberNameRuntime(host: HabboRoomObjectRuntimeHost, className: string, direction: number): string | undefined {
  const sourceClassName = normalizeRoomObjectClassName(className);
  const candidates = [`${sourceClassName}_sd_${direction}`, `${sourceClassName}_sd`];
  return candidates.find((candidate) => resolveRoomObjectMemberRefRuntime(host, candidate) !== undefined);
}

export function resolveRoomObjectMemberRefRuntime(host: HabboRoomObjectRuntimeHost, memberName: string): DirectorMemberRef | undefined {
  let current = memberName.replace(/\*$/, "");
  for (let depth = 0; depth < 8; depth++) {
    const direct = host.resourceManager.getMemberRef(current);
    if (direct) {
      return direct;
    }

    const alias = host.resolveMemberAlias(current);
    if (!alias || normalizeMemberName(stripMemberAliasSuffix(alias)) === normalizeMemberName(current)) {
      return undefined;
    }
    current = stripMemberAliasSuffix(alias);
  }

  return undefined;
}

export function isMirroredRoomObjectMemberAliasRuntime(host: HabboRoomObjectRuntimeHost, memberName: string): boolean {
  let current = memberName.replace(/\*$/, "");
  let mirrored = false;
  for (let depth = 0; depth < 8; depth++) {
    if (host.resourceManager.getMemberRef(current)) {
      return mirrored;
    }

    const alias = host.resolveMemberAlias(current);
    if (!alias) {
      return mirrored;
    }

    mirrored = mirrored !== /\*$/.test(alias);
    const next = stripMemberAliasSuffix(alias);
    if (normalizeMemberName(next) === normalizeMemberName(current)) {
      return mirrored;
    }
    current = next;
  }

  return mirrored;
}

export function estimateRoomObjectLocZRuntime(host: HabboRoomObjectRuntimeHost, object: HabboRoomObjectRecord, part: string, direction: number): number {
  return getRoomObjectClassPropsRuntime(host, object.className).getZShift(part, direction);
}

export function getRoomObjectClassPropsRuntime(host: HabboRoomObjectRuntimeHost, className: string): HabboRoomObjectClassProps {
  const normalized = className.replace(/\*.*$/, "");
  const cached = host.roomObjectPropsCache.get(normalized);
  if (cached) {
    return cached;
  }

  const props = HabboRoomObjectClassProps.fromSource(host.findExternalCastTextField(`${normalized}.props`)?.text);
  host.roomObjectPropsCache.set(normalized, props);
  return props;
}

export function estimateRoomObjectZSortRuntime(object: HabboRoomObjectRecord, locZ: number): number {
  const x = object.x ?? 0;
  const y = object.y ?? 0;
  const h = object.h ?? object.altitude ?? 0;
  return ((x + y) * 1000) + (h * 1000) + locZ;
}

export function roomObjectSourceAnimationForPartRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined,
  part: string
): { readonly elapsedFrames: number } | undefined {
  return resolveRoomObjectSourceAnimationForPart(
    host.movie.getProperty("roomObjectSourceAnimations"),
    object,
    sourceClassValue,
    part
  );
}

export function roomObjectTimedStateActiveRuntime(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined
): boolean | undefined {
  return resolveRoomObjectTimedStateActive(host.movie.getProperty("roomObjectTimedStates"), object, sourceClassValue);
}

