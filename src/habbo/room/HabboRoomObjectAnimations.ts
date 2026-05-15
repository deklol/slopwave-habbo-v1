import {
  isRoomObjectAnimationRecord,
  isRoomObjectTimedStateRecord,
  roomObjectSourceAnimationId,
  roomObjectTimedStateId,
  type HabboRoomObjectAnimationRecord,
  type HabboRoomObjectRecord,
  type HabboRoomObjectTimedStateRecord
} from "./HabboRoomObjectData";
import {
  resolveRoomObjectSourcePacketAnimation,
  resolveRoomObjectSourceTimedState,
  roomObjectPropValue,
  sourceClassValueContains,
  sourceValueEquals
} from "../ui/HabboRoomObjectInteractions";

export type { HabboRoomObjectAnimationRecord, HabboRoomObjectTimedStateRecord } from "./HabboRoomObjectData";

export interface HabboRoomObjectTimedStateResetRequest {
  readonly objectId: string;
  readonly key: string;
  readonly value: string;
}

export interface HabboRoomObjectTimedStateAdvanceResult {
  readonly timedStates: Record<string, HabboRoomObjectTimedStateRecord>;
  readonly activeObjects: Record<string, HabboRoomObjectRecord>;
  readonly changed: boolean;
  readonly activeObjectChanged: boolean;
  readonly resetRequests: readonly HabboRoomObjectTimedStateResetRequest[];
}

export function readRoomObjectTimedStates(value: unknown): Record<string, HabboRoomObjectTimedStateRecord> {
  return Object.fromEntries(
    Object.entries(coerceRecord(value))
      .filter((entry): entry is [string, HabboRoomObjectTimedStateRecord] => isRoomObjectTimedStateRecord(entry[1]))
  );
}

export function readRoomObjectSourceAnimations(value: unknown): Record<string, HabboRoomObjectAnimationRecord> {
  return Object.fromEntries(
    Object.entries(coerceRecord(value))
      .filter((entry): entry is [string, HabboRoomObjectAnimationRecord] => isRoomObjectAnimationRecord(entry[1]))
  );
}

export function advanceRoomObjectSourceAnimationStates(
  currentValue: unknown,
  frameCount: number
): { readonly animations: Record<string, HabboRoomObjectAnimationRecord>; readonly changed: boolean } {
  const animations = { ...readRoomObjectSourceAnimations(currentValue) };
  const runningAnimations = Object.entries(animations).filter(([, state]) => state.remainingFrames > 0);
  if (runningAnimations.length === 0) {
    return { animations, changed: false };
  }

  for (const [stateId, state] of runningAnimations) {
    const remainingFrames = Math.max(0, state.remainingFrames - frameCount);
    animations[stateId] = {
      ...state,
      remainingFrames,
      elapsedFrames: state.elapsedFrames + frameCount
    };
    if (remainingFrames === 0) {
      delete animations[stateId];
    }
  }

  return { animations, changed: true };
}

export function advanceRoomObjectTimedStateRecords(input: {
  readonly currentValue: unknown;
  readonly activeObjects: Readonly<Record<string, HabboRoomObjectRecord>>;
  readonly frameCount: number;
}): HabboRoomObjectTimedStateAdvanceResult {
  const timedStates = { ...readRoomObjectTimedStates(input.currentValue) };
  const runningStates = Object.entries(timedStates).filter(([, state]) => state.remainingFrames > 0);
  const activeObjects = { ...input.activeObjects };
  if (runningStates.length === 0) {
    return {
      timedStates,
      activeObjects,
      changed: false,
      activeObjectChanged: false,
      resetRequests: []
    };
  }

  const resetRequests: HabboRoomObjectTimedStateResetRequest[] = [];
  let timedStateChanged = false;
  let activeObjectChanged = false;
  for (const [stateId, state] of runningStates) {
    const remainingFrames = Math.max(0, state.remainingFrames - input.frameCount);
    if (remainingFrames > 0) {
      timedStates[stateId] = { ...state, remainingFrames };
      continue;
    }

    timedStateChanged = true;
    const object = activeObjects[state.objectId] ?? Object.values(activeObjects).find((candidate) => candidate.id === state.objectId);
    if (object && state.closeValue !== undefined) {
      activeObjects[object.id] = {
        ...object,
        props: {
          ...object.props,
          [state.key]: state.closeValue
        }
      };
      delete timedStates[stateId];
      activeObjectChanged = true;
      resetRequests.push({
        objectId: object.id,
        key: state.key,
        value: state.closeValue
      });
    } else {
      timedStates[stateId] = { ...state, remainingFrames: 0 };
    }
  }

  return {
    timedStates,
    activeObjects,
    changed: timedStateChanged || activeObjectChanged,
    activeObjectChanged,
    resetRequests
  };
}

export function refreshRoomObjectTimedStateRecords(
  activeObjects: Readonly<Record<string, HabboRoomObjectRecord>>,
  currentValue: unknown,
  sourceClassValueForClassName: (className: string) => string | undefined
): Record<string, HabboRoomObjectTimedStateRecord> {
  const timedStates = { ...readRoomObjectTimedStates(currentValue) };
  const objectIds = new Set(Object.values(activeObjects).map((object) => object.id));
  for (const stateId of Object.keys(timedStates)) {
    if (!objectIds.has(timedStates[stateId]?.objectId ?? "")) {
      delete timedStates[stateId];
    }
  }

  for (const object of Object.values(activeObjects)) {
    writeRoomObjectTimedState(object, timedStates, sourceClassValueForClassName(object.className));
  }
  return timedStates;
}

export function updateRoomObjectTimedStateRecords(
  object: HabboRoomObjectRecord,
  currentValue: unknown,
  sourceClassValue: string | undefined
): Record<string, HabboRoomObjectTimedStateRecord> {
  const timedStates = { ...readRoomObjectTimedStates(currentValue) };
  writeRoomObjectTimedState(object, timedStates, sourceClassValue);
  return timedStates;
}

export function startRoomObjectSourceAnimationState(input: {
  readonly object: HabboRoomObjectRecord;
  readonly packetName: string;
  readonly sourceClassValue: string | undefined;
  readonly currentValue: unknown;
}): {
  readonly animations: Record<string, HabboRoomObjectAnimationRecord>;
  readonly state?: HabboRoomObjectAnimationRecord;
} {
  const animations = { ...readRoomObjectSourceAnimations(input.currentValue) };
  const animation = resolveRoomObjectSourcePacketAnimation(input.packetName, input.sourceClassValue);
  if (!animation) {
    return { animations };
  }

  const state: HabboRoomObjectAnimationRecord = {
    objectId: input.object.id,
    remainingFrames: animation.durationFrames,
    elapsedFrames: 0,
    partIndexes: animation.partIndexes,
    sourceClassName: animation.sourceClassName,
    sourcePath: animation.sourcePath,
    handlerSourcePath: animation.handlerSourcePath
  };
  animations[roomObjectSourceAnimationId(input.object.id, animation.sourceClassName)] = state;
  return { animations, state };
}

export function roomObjectSourceAnimationForPart(
  currentValue: unknown,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined,
  part: string
): HabboRoomObjectAnimationRecord | undefined {
  const partIndex = part.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
  if (!Number.isInteger(partIndex) || partIndex < 1) {
    return undefined;
  }

  return Object.values(readRoomObjectSourceAnimations(currentValue))
    .find((state) => (
      state.objectId === object.id
      && state.remainingFrames > 0
      && state.partIndexes.includes(partIndex)
      && sourceClassValueContains(sourceClassValue, state.sourceClassName)
    ));
}

export function roomObjectTimedStateActive(
  currentValue: unknown,
  object: HabboRoomObjectRecord,
  sourceClassValue: string | undefined
): boolean | undefined {
  const timedState = resolveRoomObjectSourceTimedState(object, sourceClassValue);
  if (!timedState) {
    return undefined;
  }

  const value = roomObjectPropValue(object.props, timedState.key);
  if (!sourceValueEquals(value, timedState.triggerValue)) {
    return undefined;
  }

  const stored = readRoomObjectTimedStates(currentValue)[roomObjectTimedStateId(object.id, timedState.key)];
  return stored === undefined ? undefined : stored.remainingFrames > 0;
}

function writeRoomObjectTimedState(
  object: HabboRoomObjectRecord,
  timedStates: Record<string, HabboRoomObjectTimedStateRecord>,
  sourceClassValue: string | undefined
): void {
  const timedState = resolveRoomObjectSourceTimedState(object, sourceClassValue);
  if (!timedState) {
    return;
  }

  const stateId = roomObjectTimedStateId(object.id, timedState.key);
  const value = roomObjectPropValue(object.props, timedState.key);
  if (sourceValueEquals(value, timedState.triggerValue)) {
    timedStates[stateId] = {
      objectId: object.id,
      key: timedState.key,
      triggerValue: timedState.triggerValue,
      ...(timedState.closeValue !== undefined ? { closeValue: timedState.closeValue } : {}),
      remainingFrames: timedState.durationFrames,
      sourceClassName: timedState.sourceClassName,
      sourcePath: timedState.sourcePath
    };
  } else {
    delete timedStates[stateId];
  }
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
