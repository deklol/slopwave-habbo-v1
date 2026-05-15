import type {
  DirectorMember,
  DirectorMemberManifest,
  DirectorMovie,
  DirectorSpriteChannelManifest
} from "../../runtime";
import type { HabboVariableObject } from "../boot/HabboBootManagers";
import type { HabboFigurePartIndexSet } from "../boot/HabboBootResourceTypes";
import type {
  HabboFigurePartActionOverride,
  HabboFigurePartProps,
  HabboFigureRenderOptions,
  HabboFigureSourceLayer,
  HabboFigureTemplateAction,
  HabboHumanCanvasSpec
} from "../features/figure";
import {
  flipFigureDirection,
  getFigureAnimationFramesRuntime,
  getFigureHumanMovementDurationMsRuntime,
  getFigureHumanRuntimeMetadataRuntime,
  getFigureSourceActionFramesRuntime,
  getFigureSourceActionRuleRuntime,
  getFigureSourceActionSpecRuntime,
  normalizeFigureSourceActionFrameRuntime,
  shouldFlipFigureSprite
} from "../features/figure";
import type {
  HabboFigureSourceActionPartRuleRuntime,
  HabboFigureSourceActionRuleRuntime
} from "../features/figure";
import {
  coerceRecord,
  directorFrameDurationMs,
  numberFromUnknown
} from "../HabboSourceValueHelpers";
import type { HabboWindowInteractiveElement } from "../window/HabboWindowTypes";
import {
  numberFromRoomData,
  roomCoordinateToStage,
  type HabboRoomCoordinate
} from "./HabboRoomGeometry";
import { roomUserInteractiveId } from "./HabboRoomSelection";
import {
  readSpriteManifestArray
} from "./HabboRoomObjectSpritePlanning";
import {
  hasRoomUserAction,
  isRoomUserMoving,
  isRoomUserRecord,
  parseRoomStatusPacket,
  parseRoomUserMoveTarget,
  parseRoomUsersPacket,
  clearRoomUserMovement,
  roomUserPosture,
  type HabboRoomUserRecord
} from "./HabboRoomUserData";
import { readRoomRequests, readRoomVisual } from "./HabboRoomData";

export interface HabboRoomUserRuntimeHost {
  readonly movie: DirectorMovie;
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly figurePartIndexSet?: HabboFigurePartIndexSet;
  readonly resourceManager: {
    preIndexMembers(): void;
    readonly indexedMemberCount: number;
  };
  [key: string]: unknown;

  getRuntimeRoomCastSlot(): number;
  resolveRoomHumanCanvasSpec(factorX: number, mode?: string): HabboHumanCanvasSpec;
  syncRoomFigurePreloadPaths(roomUsers: readonly HabboRoomUserRecord[], release: string, canvas: HabboHumanCanvasSpec): void;
  createFigureSourceLayers(
    parts: readonly string[],
    figure: Readonly<Record<string, HabboFigurePartProps>>,
    release: string,
    direction: number,
    options?: HabboFigureRenderOptions
  ): readonly HabboFigureSourceLayer[];
  estimateRoomUserLocZ(screenLocZ: number, user: HabboRoomUserRecord, canvas: HabboHumanCanvasSpec): number;
  refreshRelease1SelectedPrivateRoomUserInfo?(release: string): void;
  syncDirectorOverlaySprites(): void;
  syncRoomInteractiveElements(): void;
  resolveInteractiveSpriteBounds(
    sprite: DirectorSpriteChannelManifest,
    member: DirectorMember | undefined
  ): { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  handleRoomProcessStep(key: "heightmap" | "users" | "passive" | "Active" | "items", release: string): void;
  renderRoomUsers(release: string): void;
  prepareRoomActivationAfterInitialStatus(release: string): void;
}

interface HabboRoomUserFigureRenderState {
  readonly action: HabboFigureTemplateAction;
  readonly partActionOverrides?: Readonly<Record<string, HabboFigurePartActionOverride>>;
  readonly signature: string;
}

export function handleRoomUsersPacketRuntime(host: HabboRoomUserRuntimeHost, body: string, release: string): boolean {
  const users = parseRoomUsersPacket(body, host.figurePartIndexSet);
  const component = host.objectManager.getObject("#room_component");
  const existing = coerceRecord(component?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  const next = { ...existing };
  for (const user of users) {
    const existingUser = existing[user.id];
    const infoImageDirBody = existingUser?.infoImageDirBody ?? user.infoImageDirBody ?? user.dirBody ?? 2;
    const infoImageDirHead = existingUser?.infoImageDirHead ?? user.infoImageDirHead ?? user.dirHead ?? infoImageDirBody;
    next[user.id] = {
      ...user,
      infoImageDirHead,
      infoImageDirBody
    };
    const session = host.objectManager.getObject("#session");
    const ownUserName = stringFromSession(session, "userName") || stringFromSession(session, "user_name");
    if (user.name === ownUserName) {
      host.objectManager.getObject("#session")?.set("user_index", user.id);
    }
  }
  component?.set("userObjects", next);
  host.movie.setProperty("roomUsers", next);
  host.handleRoomProcessStep("users", release);
  host.renderRoomUsers(release);
  host.logDebug("room", "ok", `USERS count=${users.length}`);
  return true;
}

export function handleRoomStatusPacketRuntime(host: HabboRoomUserRuntimeHost, body: string, release: string): boolean {
  const statuses = parseRoomStatusPacket(body);
  const component = host.objectManager.getObject("#room_component");
  const existing = coerceRecord(component?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  const next: Record<string, HabboRoomUserRecord> = { ...existing };
  const animationElapsedMs = numberFromUnknown(host.movie.getProperty("roomUserAnimationElapsedMs"));
  for (const status of statuses) {
    const current = next[status.id];
    if (!current) {
      continue;
    }

    const moveTarget = parseRoomUserMoveTarget(status.actions);
    const baseUser = moveTarget ? current : clearRoomUserMovement(current);
    const movement: Partial<HabboRoomUserRecord> = moveTarget
      ? {
          moveStartX: status.x ?? current.x ?? 0,
          moveStartY: status.y ?? current.y ?? 0,
          moveStartH: status.h ?? current.h ?? 0,
          moveTargetX: moveTarget.x,
          moveTargetY: moveTarget.y,
          moveTargetH: moveTarget.h,
          moveStartedAtMs: animationElapsedMs,
          // Human Class EX constructs pMoveTime = 500 and interpolates
          // pScreenLoc between STATUS base tile and /mv target tile.
          moveDurationMs: getFigureHumanMovementDurationMsRuntime(release) ?? 500
        }
      : {};
    next[status.id] = {
      ...baseUser,
      ...(status.x !== undefined ? { x: status.x } : {}),
      ...(status.y !== undefined ? { y: status.y } : {}),
      ...(status.h !== undefined ? { h: status.h } : {}),
      ...(status.dirHead !== undefined ? { dirHead: status.dirHead } : {}),
      ...(status.dirBody !== undefined ? { dirBody: status.dirBody } : {}),
      ...(status.actions !== undefined ? { actions: status.actions } : {}),
      ...(status.moderatorLevel !== undefined
        ? { moderatorLevel: status.moderatorLevel }
        : current.moderatorLevel !== undefined
          ? { moderatorLevel: current.moderatorLevel }
          : {}),
      ...movement
    };
  }
  component?.set("userObjects", next);
  host.movie.setProperty("roomUsers", next);
  acknowledgeStatusDrivenRoomRequests(host, release);
  host.renderRoomUsers(release);
  host.logDebug("room", "ok", `STATUS count=${statuses.length}`);
  if (host.movie.getProperty("roomEntryState") === "waiting-status") {
    host.prepareRoomActivationAfterInitialStatus(release);
  }
  return true;
}

export function handleRoomLogoutPacketRuntime(host: HabboRoomUserRuntimeHost, body: string, release: string): boolean {
  const userName = firstRoomLogoutWord(body);
  if (!userName) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const existing = coerceRecord(component?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  const next: Record<string, HabboRoomUserRecord> = {};
  let removed: HabboRoomUserRecord | undefined;

  for (const [id, user] of Object.entries(existing)) {
    if (user.name === userName || user.id === userName) {
      removed = user;
      continue;
    }

    next[id] = user;
  }

  if (!removed) {
    return true;
  }

  component?.set("userObjects", next);
  host.movie.setProperty("roomUsers", next);
  if (host.movie.getProperty("selectedRoomUserId") === removed.id) {
    host.movie.setProperty("selectedRoomUserId", undefined);
    host.movie.setProperty("selectedRoomUserInfo", undefined);
    host.movie.setProperty("selectedRoomUserBadge", "");
  }
  host.renderRoomUsers(release);
  host.syncRoomInteractiveElements();
  host.logDebug("room", "info", `LOGOUT user=${removed.name}`);
  return true;
}

function acknowledgeStatusDrivenRoomRequests(host: HabboRoomUserRuntimeHost, release: string): void {
  const requests = readRoomRequests(host.movie.getProperty("pendingRoomRequests"));
  if (requests.length === 0) {
    return;
  }

  const statusDrivenCommands = new Set(["MOVE", "LOOKTO", "STOP", "DANCE", "WAVE", "MODERATOR"]);
  const remaining = requests.filter((request) => {
    return request.status !== "sent" || !statusDrivenCommands.has(request.command);
  });
  if (remaining.length === requests.length) {
    return;
  }

  host.movie.setProperty("pendingRoomRequests", remaining);
  host.logDebug("room", "info", `STATUS acknowledged ${requests.length - remaining.length} room action request(s)`, {
    release
  });
}

function firstRoomLogoutWord(body: string): string {
  const firstLine = body.split(/\r?\n|\r/).find((line) => line.trim().length > 0) ?? "";
  return firstLine.trim().split(/\s+/)[0] ?? "";
}

export function renderRoomUsersRuntime(host: HabboRoomUserRuntimeHost, release: string): void {
  const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
  if (!visual?.roomData) {
    return;
  }

  const roomUsers = Object.values(coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")))
    .filter(isRoomUserRecord)
    .filter((user) => user.x !== undefined && user.y !== undefined);
  const runtimeRoomCastLib = host.getRuntimeRoomCastSlot();
  const members: DirectorMemberManifest[] = [];
  const sprites: DirectorSpriteChannelManifest[] = [];
  const geometryLeft = 0;
  const geometryTop = 0;
  const factorX = numberFromRoomData(visual.roomData, "factorx", 64);
  const baseCanvas = host.resolveRoomHumanCanvasSpec(factorX);
  const sortedUsers = [...roomUsers].sort((left, right) => ((left.x ?? 0) + (left.y ?? 0)) - ((right.x ?? 0) + (right.y ?? 0)));
  host.syncRoomFigurePreloadPaths(sortedUsers, release, baseCanvas);

  let memberNumber = 1;
  for (const user of sortedUsers) {
    const renderPosition = resolveRoomUserScreenPositionRuntime(host, user, visual.roomData, geometryLeft, geometryTop);
    const direction = user.dirBody ?? 2;
    const headDirection = user.dirHead ?? direction;
    const posture = roomUserPosture(user);
    const animFrame = getRoomUserAnimationFrameRuntime(host);
    const figureState = resolveRoomUserFigureRenderStateRuntime(user, renderPosition.moving, posture?.action, animFrame, release);
    const action = figureState.action;
    const canvas = action === "lay" ? host.resolveRoomHumanCanvasSpec(factorX, "lay") : baseCanvas;
    const sourceLayers = host.createFigureSourceLayers(
      ["sd", "lh", "ls", "bd", "sh", "lg", "ch", "hd", "fc", "ey", "hr", "rh", "rs"],
      user.figure,
      release,
      direction,
      {
        action,
        animFrame,
        headDirection,
        preferredCasts: canvas.preferredCasts,
        memberPrefix: canvas.memberPrefix,
        xOffset: canvas.xOffset,
        canvasWidth: canvas.width,
        canvasHeight: canvas.canvasHeight,
        baselineOffset: canvas.baselineOffset,
        ...(figureState.partActionOverrides ? { partActionOverrides: figureState.partActionOverrides } : {}),
        layerCacheKey: `room:${user.id}:${user.figureRaw}:${canvas.memberPrefix}:${action}:${figureState.signature}:${direction}:${headDirection}:${animFrame}`
      }
    );
    if (sourceLayers.length === 0) {
      continue;
    }

    const flipH = shouldFlipFigureSprite(direction, headDirection);
    const member: DirectorMemberManifest = {
      number: memberNumber,
      name: `runtime.room.user.${user.id}`,
      type: "bitmap",
      width: canvas.width,
      height: canvas.height,
      regPoint: flipH ? { x: canvas.width, y: canvas.regPoint.y } : canvas.regPoint,
      composite: {
        width: canvas.width,
        height: canvas.height,
        layers: sourceLayers.map((layer) => ({
          assetPath: layer.assetPath,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          sourceWidth: layer.width,
          sourceHeight: layer.height,
          ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}),
          ...(layer.flipH ? { flipH: true } : {}),
          ...(layer.tint !== undefined ? { tint: layer.tint } : {}),
          ink: layer.ink
        }))
      }
    };
    const screen = renderPosition.screen;
    const locZ = host.estimateRoomUserLocZ(screen.locZ, user, canvas);
    members.push(member);
    sprites.push({
      channel: 3000 + memberNumber,
      member: {
        castLib: runtimeRoomCastLib,
        member: memberNumber
      },
      loc: screen,
      width: canvas.width,
      height: canvas.height,
      locZ,
      visible: true,
      ...(flipH ? { flipH: true } : {})
    });
    memberNumber += 1;
  }

  if (members.length > 0) {
    host.movie.cast.importOrCreateCastLib({
      number: runtimeRoomCastLib,
      name: "runtime_room_users",
      fileName: "runtime-room-users",
      members
    });
    host.resourceManager.preIndexMembers();
    host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
    host.movie.setProperty("runtimeRoomCastLib", runtimeRoomCastLib);
  }
  host.movie.setProperty("roomUserOverlaySprites", sprites);
  host.refreshRelease1SelectedPrivateRoomUserInfo?.(release);
  host.syncDirectorOverlaySprites();
  host.syncRoomInteractiveElements();
  const logSignature = sortedUsers.map((user) => {
    const actions = user.actions?.map((entry) => `${entry.name}:${entry.params}`).join(",") ?? "";
    return `${user.id}:${user.x ?? ""},${user.y ?? ""},${user.h ?? ""}:${user.dirHead ?? ""},${user.dirBody ?? ""}:${actions}`;
  }).join("|");
  if (host.movie.getProperty("roomUserRenderLogSignature") !== logSignature) {
    host.movie.setProperty("roomUserRenderLogSignature", logSignature);
    host.logDebug("room", sprites.length > 0 ? "ok" : "warn", `renderRoomUsers users=${roomUsers.length} sprites=${sprites.length}`);
  }
}

export function advanceRoomUserAnimationsRuntime(host: HabboRoomUserRuntimeHost, deltaMs: number, release: string): boolean {
  const users = Object.values(coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects"))).filter(isRoomUserRecord);
  const hasMovingUser = users.some((user) => isRoomUserMoving(user, numberFromUnknown(host.movie.getProperty("roomUserAnimationElapsedMs"))));
  const hasAnimatedAction = users.some((user) => user.actions?.some((entry) => {
    const name = entry.name.toLowerCase();
    return name === "wave" || name === "wav" || name === "dance" || name === "talk";
  }));
  if (!hasMovingUser && !hasAnimatedAction) {
    return false;
  }

  const elapsed = numberFromUnknown(host.movie.getProperty("roomUserAnimationElapsedMs")) + Math.max(0, deltaMs);
  const nextFrame = Math.floor(elapsed / roomUserAnimationFrameDurationMsRuntime(users, host.movie.tempo, release)) % activeRoomUserAnimationCycleLengthRuntime(users, release);
  const currentFrame = getRoomUserAnimationFrameRuntime(host);
  host.movie.setProperty("roomUserAnimationElapsedMs", elapsed);
  if (nextFrame === currentFrame && !hasMovingUser) {
    return false;
  }

  host.movie.setProperty("roomUserAnimationFrame", nextFrame);
  renderRoomUsersRuntime(host, release);
  return true;
}

function resolveRoomUserFigureRenderStateRuntime(
  user: HabboRoomUserRecord,
  moving: boolean,
  postureAction: "sit" | "lay" | undefined,
  animFrame: number,
  release: string
): HabboRoomUserFigureRenderState {
  let action: HabboFigureTemplateAction = moving ? "walk" : postureAction ?? "std";
  const overrides: Record<string, HabboFigurePartActionOverride> = {};

  for (const entry of user.actions ?? []) {
    const sourceAction = entry.name.toLowerCase();
    const sourceRule = getFigureSourceActionRuleRuntime(release, sourceAction);
    if (sourceRule) {
      action = applyFigureSourceActionRuleRuntime(sourceRule, entry.params, moving, action, animFrame, release, overrides);
      continue;
    }

    if (sourceAction === "wave" || sourceAction === "wav") {
      if (!moving && action === "std") {
        action = "wave";
      } else {
        addSourcePartOverrides(overrides, ["lh", "rh"], "wav", normalizeFigureSourceActionFrameRuntime(release, "wav", animFrame));
      }
      continue;
    }

    if (sourceAction === "talk") {
      if (action === "lay") {
        addSourcePartOverrides(overrides, ["fc", "hd"], "lsp", normalizeFigureSourceActionFrameRuntime(release, "lsp", animFrame));
      } else {
        addSourcePartOverrides(overrides, ["fc", "hd", "hr"], "spk", normalizeFigureSourceActionFrameRuntime(release, "spk", animFrame));
      }
      continue;
    }

    if (sourceAction === "gest") {
      const gesture = firstActionParam(entry.params).toLowerCase();
      if (gesture.length === 0) {
        continue;
      }

      if (action === "lay") {
        addSourcePartOverrides(overrides, ["ey", "fc"], `l${gesture.slice(0, 2)}`, 0);
      } else {
        addSourcePartOverrides(overrides, ["fc", "hd", "hr", "ey"], gesture, 0);
      }
      continue;
    }

    if (sourceAction === "dance") {
      const danceLegFrame = normalizeFigureSourceActionFrameRuntime(release, "wlk", animFrame % 2 === 0 ? 0 : 2);
      addSourcePartOverrides(overrides, ["bd", "lg", "sh"], "wlk", danceLegFrame);
      if ((animFrame % 3) + 1 === 1) {
        addSourcePartOverrides(overrides, ["lh", "ls", "rh", "rs"], "crr", normalizeFigureSourceActionFrameRuntime(release, "crr", 0));
      }
    }
  }

  const signature = Object.entries(overrides)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([part, override]) => `${part}:${override.action}:${override.part ?? part}:${override.direction ?? ""}:${override.frame ?? ""}:${override.flipH ? "h" : ""}:${override.allowMirrorFallback === true ? "m" : ""}`)
    .join(",");

  return {
    action,
    ...(signature.length > 0 ? { partActionOverrides: overrides } : {}),
    signature
  };
}

function applyFigureSourceActionRuleRuntime(
  rule: HabboFigureSourceActionRuleRuntime,
  params: string,
  moving: boolean,
  action: HabboFigureTemplateAction,
  animFrame: number,
  release: string,
  overrides: Record<string, HabboFigurePartActionOverride>
): HabboFigureTemplateAction {
  let nextAction = action;
  if (!moving && action === "std" && rule.runtimeActionWhenIdle) {
    nextAction = rule.runtimeActionWhenIdle;
  }

  for (const partRule of rule.partActionRules) {
    if (!shouldApplySourcePartRuleRuntime(partRule, moving, nextAction, animFrame)) {
      continue;
    }

    const partAction = resolveSourcePartRuleActionRuntime(partRule, params);
    if (!partAction) {
      continue;
    }

    addSourcePartOverrides(
      overrides,
      partRule.parts,
      partAction,
      resolveSourcePartRuleFrameRuntime(partRule, partAction, animFrame, release, moving, rule),
      (part) => shouldAllowSourceMirrorFallbackRuntime(release, partAction, part) ? { allowMirrorFallback: true } : undefined
    );
  }

  return nextAction;
}

function roomUserAnimationFrameDurationMsRuntime(
  users: readonly HabboRoomUserRecord[],
  tempo: number,
  release: string
): number {
  const movingDurations = users
    .filter((user) => isRoomUserMoving(user, numberFromUnknown(user.moveStartedAtMs)) || hasRoomUserActionName(user, "mv") || hasRoomUserActionName(user, "sld"))
    .map((user) => Math.max(1, numberFromUnknown(user.moveDurationMs) || getFigureHumanMovementDurationMsRuntime(release) || 500));
  if (movingDurations.length > 0) {
    return Math.max(1, Math.min(...movingDurations) / 4);
  }

  const frameMs = directorFrameDurationMs(tempo);
  const metadata = getFigureHumanRuntimeMetadataRuntime(release);
  if (users.some((user) => hasRoomUserActionName(user, "dance"))) {
    const sourcePacing = getFigureSourceActionRuleRuntime(release, "dance")?.sourceFramePacing;
    return frameMs * Math.max(1, sourcePacing?.counterModulo ?? metadata?.animationLoop?.danceCounterModulo ?? 6);
  }

  if (users.some((user) => hasRoomUserActionName(user, "talk"))) {
    return frameMs * Math.max(1, metadata?.animationLoop?.exitFrameCounterModulo ?? 2);
  }

  return frameMs * Math.max(1, metadata?.animationLoop?.exitFrameCounterModulo ?? 1);
}

function activeRoomUserAnimationCycleLengthRuntime(users: readonly HabboRoomUserRecord[], release: string): number {
  let length = 1;
  for (const user of users) {
    const elapsed = 0;
    if (isRoomUserMoving(user, elapsed) || hasRoomUserAction(user, "mv") || hasRoomUserAction(user, "sld")) {
      length = Math.max(length, getFigureAnimationFramesRuntime(release, "walk").length);
    }

    for (const entry of user.actions ?? []) {
      const sourceAction = entry.name.toLowerCase();
      if (sourceAction === "wave" || sourceAction === "wav") {
        const sourcePacing = getFigureSourceActionRuleRuntime(release, sourceAction)?.sourceFramePacing;
        length = Math.max(length, sourcePacing?.cycleLength ?? 1);
      } else if (sourceAction === "talk") {
        length = Math.max(length, getFigureSourceActionFramesRuntime(release, "spk").length);
      } else if (sourceAction === "dance") {
        const sourcePacing = getFigureSourceActionRuleRuntime(release, "dance")?.sourceFramePacing;
        const metadata = getFigureHumanRuntimeMetadataRuntime(release);
        length = Math.max(length, sourcePacing?.cycleLength ?? metadata?.animationLoop?.danceCounterModulo ?? 6);
      }
    }
  }

  return Math.max(1, length);
}

function shouldApplySourcePartRuleRuntime(
  rule: HabboFigureSourceActionPartRuleRuntime,
  moving: boolean,
  action: HabboFigureTemplateAction,
  animFrame: number
): boolean {
  if (!sourcePartRulePhaseMatchesRuntime(rule, animFrame)) {
    return false;
  }

  switch (rule.when) {
    case "lay":
      return action === "lay";
    case "standing":
      return action !== "lay";
    case "not-idle":
      return moving || action !== "std";
    case "dance-random-head":
      return false;
    case "always":
    case "dance-body":
    case "dance-hand-phase":
    default:
      return true;
  }
}

function sourcePartRulePhaseMatchesRuntime(rule: HabboFigureSourceActionPartRuleRuntime, animFrame: number): boolean {
  const phase = rule.phase;
  if (!phase?.modulo) {
    return true;
  }

  const modulo = Math.max(1, Math.trunc(phase.modulo));
  const remainder = Math.max(0, Math.trunc(phase.remainder ?? 0));
  return ((animFrame % modulo) + modulo) % modulo === remainder;
}

function resolveSourcePartRuleActionRuntime(
  rule: HabboFigureSourceActionPartRuleRuntime,
  params: string
): string | undefined {
  if (rule.action) {
    return rule.action;
  }

  const fromParam = rule.actionFromStatusParam;
  if (!fromParam) {
    return undefined;
  }

  const rawParam = splitActionParams(params)[fromParam.paramIndex] ?? "";
  const charStart = fromParam.charStart ?? 0;
  const charCount = fromParam.charCount;
  const action = charCount === undefined ? rawParam.slice(charStart) : rawParam.slice(charStart, charStart + charCount);
  const prefixed = `${fromParam.prefix ?? ""}${action}`.toLowerCase();
  return prefixed.length > 0 ? prefixed : undefined;
}

function resolveSourcePartRuleFrameRuntime(
  rule: HabboFigureSourceActionPartRuleRuntime,
  action: string,
  animFrame: number,
  release: string,
  moving: boolean,
  sourceRule: HabboFigureSourceActionRuleRuntime
): number {
  const frame = rule.frame;
  if (!frame) {
    return normalizeFigureSourceActionFrameRuntime(release, action, animFrame);
  }

  if (!moving && frame.source === "source-action-frame" && sourceRule.sourceFramePacing?.source === "standing-static") {
    return normalizeFigureSourceActionFrameRuntime(release, action, sourceRule.sourceFramePacing.standingFrame ?? 0);
  }

  if (frame.source === "constant") {
    return Math.max(0, Math.trunc(frame.value ?? 0));
  }

  if (frame.source === "toggle" && frame.values && frame.values.length > 0) {
    const index = ((animFrame % frame.values.length) + frame.values.length) % frame.values.length;
    return normalizeFigureSourceActionFrameRuntime(release, action, frame.values[index] ?? 0);
  }

  return normalizeFigureSourceActionFrameRuntime(release, action, animFrame);
}

function addSourcePartOverrides(
  overrides: Record<string, HabboFigurePartActionOverride>,
  parts: readonly string[],
  action: string,
  frame: number,
  optionsForPart?: (part: string) => Pick<HabboFigurePartActionOverride, "allowMirrorFallback" | "flipH" | "part" | "direction"> | undefined
): void {
  for (const part of parts) {
    const options = optionsForPart?.(part) ?? {};
    overrides[part] = {
      action,
      frame,
      ...options
    };
  }
}

function shouldAllowSourceMirrorFallbackRuntime(release: string, action: string, part: string): boolean {
  const oppositePart = oppositeSourceArmPartRuntime(part);
  if (!oppositePart) {
    return false;
  }

  const sourceParts = getFigureSourceActionSpecRuntime(release, action).parts;
  if (sourceParts.includes(part)) {
    return false;
  }

  return sourceParts.includes(oppositePart);
}

function oppositeSourceArmPartRuntime(part: string): string | undefined {
  switch (part) {
    case "lh":
      return "rh";
    case "ls":
      return "rs";
    case "rh":
      return "lh";
    case "rs":
      return "ls";
    default:
      return undefined;
  }
}

function firstActionParam(params: string): string {
  return splitActionParams(params)[0] ?? "";
}

function splitActionParams(params: string): readonly string[] {
  return params.trim().split(/\s+/).filter((param) => param.length > 0);
}

function hasRoomUserActionName(user: HabboRoomUserRecord, actionName: string): boolean {
  const normalized = actionName.toLowerCase();
  return user.actions?.some((entry) => entry.name.toLowerCase() === normalized) === true;
}

export function getRoomUserAnimationFrameRuntime(host: HabboRoomUserRuntimeHost): number {
  const value = host.movie.getProperty("roomUserAnimationFrame");
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

export function collectRoomUserInteractiveElementsRuntime(
  host: HabboRoomUserRuntimeHost,
  interactiveElements: HabboWindowInteractiveElement[]
): void {
  const sprites = readSpriteManifestArray(host.movie.getProperty("roomUserOverlaySprites"));
  if (sprites.length === 0) {
    return;
  }

  const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  for (const sprite of sprites) {
    const member = host.movie.cast.getMember(sprite.member);
    const memberUserId = member?.name?.startsWith("runtime.room.user.") ? member.name.slice("runtime.room.user.".length) : "";
    const user = users[memberUserId] ?? Object.values(users).find((candidate) => candidate.id === memberUserId);
    if (!user) {
      continue;
    }

    const bounds = host.resolveInteractiveSpriteBounds(sprite, member);
    interactiveElements.push({
      id: roomUserInteractiveId(user.id),
      windowId: "Room",
      kind: "room_user",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      label: user.name,
      cursor: "cursor.finger"
    });
  }
}

export function resolveRoomUserScreenPositionRuntime(
  host: HabboRoomUserRuntimeHost,
  user: HabboRoomUserRecord,
  roomData: Readonly<Record<string, string | number>>,
  rectLeft: number,
  rectTop: number
): { readonly screen: HabboRoomCoordinate; readonly moving: boolean } {
  const base = {
    x: user.x ?? 0,
    y: user.y ?? 0,
    h: user.h ?? 0
  };
  const posture = roomUserPosture(user);
  const postureHeight = !hasRoomUserAction(user, "mv") ? posture?.restingHeight ?? 0 : 0;
  const baseScreen = roomCoordinateToStage(roomData, rectLeft, rectTop, base.x, base.y, base.h + postureHeight);
  if (!hasRoomUserAction(user, "mv")
    || user.moveTargetX === undefined
    || user.moveTargetY === undefined
    || user.moveTargetH === undefined) {
    if (posture?.action === "lay") {
      return {
        screen: applyRoomUserLayScreenOffset(baseScreen, user.dirBody ?? 2),
        moving: false
      };
    }
    return { screen: baseScreen, moving: false };
  }

  const startedAt = numberFromUnknown(user.moveStartedAtMs);
  const duration = Math.max(1, numberFromUnknown(user.moveDurationMs) || 500);
  const elapsed = numberFromUnknown(host.movie.getProperty("roomUserAnimationElapsedMs"));
  const progress = Math.max(0, Math.min(1, (elapsed - startedAt) / duration));
  const startX = user.moveStartX ?? base.x;
  const startY = user.moveStartY ?? base.y;
  const startH = user.moveStartH ?? base.h;
  const startScreen = roomCoordinateToStage(roomData, rectLeft, rectTop, startX, startY, startH);
  const targetScreen = roomCoordinateToStage(roomData, rectLeft, rectTop, user.moveTargetX, user.moveTargetY, user.moveTargetH);

  return {
    screen: {
      x: startScreen.x + ((targetScreen.x - startScreen.x) * progress),
      y: startScreen.y + ((targetScreen.y - startScreen.y) * progress),
      locZ: startScreen.locZ + ((targetScreen.locZ - startScreen.locZ) * progress)
    },
    moving: progress < 1
  };
}

function applyRoomUserLayScreenOffset(screen: HabboRoomCoordinate, bodyDirection: number): HabboRoomCoordinate {
  const sourceDirection = flipFigureDirection(bodyDirection);
  if (sourceDirection === 2) {
    return { x: screen.x + 10, y: screen.y + 30, locZ: screen.locZ + 2000 };
  }
  if (sourceDirection === 0) {
    return { x: screen.x - 47, y: screen.y + 32, locZ: screen.locZ + 2000 };
  }
  return screen;
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" ? value : "";
}
