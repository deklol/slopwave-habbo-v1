import { coerceRecord, directorFrameDurationMs, numberFromUnknown } from "../../HabboSourceValueHelpers";
import {
  advanceRoomObjectSourceAnimationStates,
  advanceRoomObjectTimedStateRecords,
  readRoomObjectSourceAnimations,
  readRoomObjectTimedStates,
  startRoomObjectSourceAnimationState,
  roomObjectSourceAnimationForPart as resolveRoomObjectSourceAnimationForPart,
  roomObjectTimedStateActive as resolveRoomObjectTimedStateActive,
  type HabboRoomObjectAnimationRecord
} from "../../room/HabboRoomObjectAnimations";
import { isRoomObjectRecord, type HabboRoomObjectRecord } from "../../room/HabboRoomObjectData";
import { roomObjectOverlayKey } from "../../room/HabboRoomObjectSpritePlanning";
import {
  resolveRoomObjectSourcePartState,
  resolveRoomObjectSourcePartVisible,
  roomObjectSourceHasAnimatedUpdate,
  sourceClassValueContains
} from "../../ui/HabboRoomObjectInteractions";
import type { HabboRoomObjectRuntimeHost } from "./HabboRoomObjectRuntimeHost";

export function advanceRoomObjectAnimations(host: HabboRoomObjectRuntimeHost, deltaMs: number, release: string): boolean {
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = Object.values(coerceRecord(component?.get("activeObjects"))).filter(isRoomObjectRecord);
  const hasAnimatedObject = activeObjects.some((object) => (
    roomObjectSourceHasAnimatedUpdate(object, host.getRoomObjectSourceClassValue(object.className))
  ));
  const hasRunningTimedState = Object.values(readRoomObjectTimedStates(host.movie.getProperty("roomObjectTimedStates")))
    .some((state) => state.remainingFrames > 0);
  const hasRunningSourceAnimation = Object.values(readRoomObjectSourceAnimations(host.movie.getProperty("roomObjectSourceAnimations")))
    .some((state) => state.remainingFrames > 0);
  if (!hasAnimatedObject && !hasRunningTimedState && !hasRunningSourceAnimation) {
    return false;
  }

  const elapsed = numberFromUnknown(host.movie.getProperty("roomObjectAnimationElapsedMs")) + Math.max(0, deltaMs);
  const nextFrame = Math.floor(elapsed / directorFrameDurationMs(host.movie.tempo));
  const currentFrame = host.getRoomObjectAnimationFrame();
  host.movie.setProperty("roomObjectAnimationElapsedMs", elapsed);
  if (nextFrame === currentFrame) {
    return false;
  }

  const previousAnimationSignatures = roomObjectAnimationVisualSignaturesByObject(host, activeObjects);
  host.movie.setProperty("roomObjectAnimationFrame", nextFrame);
  const frameCount = Math.max(1, nextFrame - currentFrame);
  const timedStateChanged = advanceRoomObjectTimedStates(host, frameCount, release);
  const sourceAnimationChanged = advanceRoomObjectSourceAnimations(host, frameCount);
  if (!hasAnimatedObject && !timedStateChanged && !sourceAnimationChanged) {
    return false;
  }

  const updatedActiveObjects = Object.values(coerceRecord(component?.get("activeObjects"))).filter(isRoomObjectRecord);
  const nextAnimationSignatures = roomObjectAnimationVisualSignaturesByObject(host, updatedActiveObjects);
  const changedObjects = updatedActiveObjects.filter((object) => {
    const key = roomObjectOverlayKey(object.kind, object.id);
    return nextAnimationSignatures.get(key) !== previousAnimationSignatures.get(key);
  });
  if (changedObjects.length === 0) {
    return false;
  }

  host.refreshAnimatedRoomObjectSprites(changedObjects, release);
  return true;
}

export function startRoomObjectSourceAnimation(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  packetName: string,
  sourceClassValue: string | undefined
): HabboRoomObjectAnimationRecord | undefined {
  const result = startRoomObjectSourceAnimationState({
    object,
    packetName,
    sourceClassValue,
    currentValue: host.movie.getProperty("roomObjectSourceAnimations")
  });
  if (result.state) {
    host.movie.setProperty("roomObjectSourceAnimations", result.animations);
  }
  return result.state;
}

function roomObjectAnimationVisualSignaturesByObject(
  host: HabboRoomObjectRuntimeHost,
  activeObjects: readonly HabboRoomObjectRecord[]
): Map<string, string> {
  return new Map(activeObjects
    .filter((object) => {
      const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
      return roomObjectSourceHasAnimatedUpdate(object, sourceClassValue)
        || roomObjectTimedStateActive(host, object, sourceClassValue) !== undefined
        || Object.values(readRoomObjectSourceAnimations(host.movie.getProperty("roomObjectSourceAnimations"))).some((state) => (
          state.objectId === object.id
          && state.remainingFrames > 0
          && sourceClassValueContains(sourceClassValue, state.sourceClassName)
        ));
    })
    .map((object) => {
      const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
      const directions = Array.isArray(object.direction) ? object.direction : [0];
      const baseDirection = Number(directions[0] ?? 0) || 0;
      const dimensions: readonly [number, number] | undefined = object.dimensions === 0 ? undefined : object.dimensions;
      const parts: unknown[] = [];
      for (let index = 0; index < 26; index++) {
        const part = String.fromCharCode("a".charCodeAt(0) + index);
        const direction = Number(directions[index] ?? baseDirection) || 0;
        const frame = host.resolveRoomObjectPartFrame(object, part, sourceClassValue);
        const baseMemberName = host.resolveRoomObjectPartMemberName(object.className, part, dimensions, direction, frame)
          ?? (frame !== 0 ? host.resolveRoomObjectPartMemberName(object.className, part, dimensions, direction, 0) : undefined);
        if (!baseMemberName) {
          break;
        }
        const sourcePartState = resolveRoomObjectSourcePartState(object, sourceClassValue, part, {
          animationTick: host.getRoomObjectAnimationFrame(),
          timedStateActive: roomObjectTimedStateActive(host, object, sourceClassValue),
          baseMemberName
        });
        const sourceAnimation = roomObjectSourceAnimationForPart(host, object, sourceClassValue, part);
        const visible = resolveRoomObjectSourcePartVisible(object, sourceClassValue, part, {
          visibilityAnimationActive: sourceAnimation !== undefined,
          visibilityAnimationTick: sourceAnimation?.elapsedFrames,
          timedStateActive: roomObjectTimedStateActive(host, object, sourceClassValue)
        });
        parts.push([
          part,
          frame,
          baseMemberName,
          sourcePartState?.memberName,
          sourcePartState?.ink,
          sourcePartState?.blend,
          sourcePartState?.locZRelative,
          visible
        ]);
      }
      return [
        roomObjectOverlayKey(object.kind, object.id),
        JSON.stringify([
          object.id,
          object.className,
          object.props,
          roomObjectTimedStateActive(host, object, sourceClassValue),
          parts
        ])
      ] as const;
    }));
}

function advanceRoomObjectSourceAnimations(host: HabboRoomObjectRuntimeHost, frameCount: number): boolean {
  const result = advanceRoomObjectSourceAnimationStates(host.movie.getProperty("roomObjectSourceAnimations"), frameCount);
  if (result.changed) {
    host.movie.setProperty("roomObjectSourceAnimations", result.animations);
  }
  return result.changed;
}

function advanceRoomObjectTimedStates(host: HabboRoomObjectRuntimeHost, frameCount: number, release: string): boolean {
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = { ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>) };
  const result = advanceRoomObjectTimedStateRecords({
    currentValue: host.movie.getProperty("roomObjectTimedStates"),
    activeObjects,
    frameCount
  });

  host.movie.setProperty("roomObjectTimedStates", result.timedStates);
  for (const request of result.resetRequests) {
    host.queueRoomRequest({ command: "SETSTUFFDATA", objectId: request.objectId, key: request.key, value: request.value }, release);
    host.logDebug("room", "ok", `timed object state reset id=${request.objectId} ${request.key}=${request.value}`);
  }
  if (result.activeObjectChanged) {
    component?.set("activeObjects", result.activeObjects);
    host.movie.setProperty("roomActiveObjects", result.activeObjects);
  }
  return result.changed;
}

function roomObjectSourceAnimationForPart(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined,
  part: string
): HabboRoomObjectAnimationRecord | undefined {
  return resolveRoomObjectSourceAnimationForPart(
    host.movie.getProperty("roomObjectSourceAnimations"),
    object,
    sourceClassValue,
    part
  );
}

function roomObjectTimedStateActive(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined
): boolean | undefined {
  return resolveRoomObjectTimedStateActive(
    host.movie.getProperty("roomObjectTimedStates"),
    object,
    sourceClassValue
  );
}
