import type { DirectorMemberManifest, UnsupportedFeature } from "../../../runtime";
import { LingoList, LingoPropertyList, LingoSymbol } from "../../../lingo";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type { HabboWindowBitmapAsset, HabboFigurePartIndexSet } from "../../boot/HabboBootResourceTypes";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import type { HabboRoomUserRecord } from "../../room/HabboRoomUserData";
import { readRegistrationProps } from "../edit-habbo/HabboRegistrationData";
import {
  readMessengerBuddyList,
  readMessengerMessage,
  readMessengerSearchResult
} from "../friends-console/HabboFriendsConsolePackets";
import {
  coerceRecord,
  numberFromUnknown
} from "../../HabboSourceValueHelpers";
import {
  createDefaultFigureProps,
  createFigurePartAssetFallbackRequests,
  figurePartInk,
  getFigureLayerBounds,
  isExpectedMissingFigurePartAsset,
  isFigureHeadPart,
  normalizeFigureDirection,
  orderFigureParts,
  parseOldServerFigureString,
  resolveFigurePartAssetRequest,
  type HabboFigurePartAssetRequest,
  type HabboFigurePartProps,
  type HabboFigureRenderOptions,
  type HabboFigureSourceLayer,
  type HabboFigureTemplateAction,
  type HabboHumanCanvasModeSpec,
  type HabboHumanCanvasSpec
} from "./HabboFigureData";
import {
  getFigureAnimationDirectionsRuntime,
  getFigureAnimationFramesRuntime,
  getFigureHumanRuntimeMetadataRuntime,
  getFigureSourceActionRuleRuntime,
  getFigureSourceActionSpecRuntime,
  getFigureStaticPreloadActionsRuntime,
  normalizeFigureAnimationFrameRuntime
} from "./HabboFigureAnimationManifest";

const registrationInterfaceClassSource = "hh_registrat/casts/External/ParentScript 2 - Registration Interface Class.ls";
const fullHumanFigureParts = ["lh", "ls", "bd", "sh", "lg", "ch", "hd", "fc", "ey", "hr", "rh", "rs"] as const;

interface HabboResolvedFigurePartAsset {
  readonly asset: HabboWindowBitmapAsset;
  readonly request: HabboFigurePartAssetRequest;
}

function loginUserObjectHandlerSource(release: string): string {
  const source = release.startsWith("release14")
    ? "hh_entry/casts/External/ParentScript 8 - Login Handler Class.ls"
    : "hh_shared/casts/External/ParentScript 5 - Login Handler Class.ls";
  return `extracted/projectorrays/${release}/${source}`;
}

export interface HabboFigureRuntimeHost {
  readonly movie: {
    readonly tempo: number;
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly figurePartIndexSet?: HabboFigurePartIndexSet;

  getVariable(name: string): unknown;
  ensureRegistrationFigureProps(): Record<string, HabboFigurePartProps>;
  getBitmapAssetByMemberName(memberName: string, preferredCasts?: readonly string[]): HabboWindowBitmapAsset | undefined;
  renderRoomUsers(release: string): void;
  syncWindowSpriteChannels(release: string): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
}

export function getActiveUserFigurePropsRuntime(host: HabboFigureRuntimeHost, release: string): Record<string, HabboFigurePartProps> {
  const sessionFigure = coerceRecord(host.objectManager.getObject("#session")?.get("user_figure"));
  if (Object.keys(sessionFigure).length > 0) {
    return sessionFigure as Record<string, HabboFigurePartProps>;
  }

  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const registrationFigure = readRegistrationProps(registrationInterface).figure;
  if (typeof registrationFigure === "object" && registrationFigure !== null && !Array.isArray(registrationFigure) && Object.keys(registrationFigure).length > 0) {
    return registrationFigure as Record<string, HabboFigurePartProps>;
  }

  const lastSubmit = coerceRecord(host.movie.getProperty("lastRegistrationSubmitProps"));
  if (typeof lastSubmit.figure === "object" && lastSubmit.figure !== null && !Array.isArray(lastSubmit.figure)) {
    return lastSubmit.figure as Record<string, HabboFigurePartProps>;
  }

  const lastUserObject = coerceRecord(host.movie.getProperty("lastUserObject"));
  if (typeof lastUserObject.figure === "string" && lastUserObject.figure.length > 0) {
    host.recordUnsupportedOnce("login-figure-string-parse-partial", {
      subsystem: "habbo",
      feature: "login-figure-string-parse-partial",
      detail: `${release} Login Handler Class receives USEROBJ figure=${lastUserObject.figure}, but the old encoded figure string parser is not complete; the login preview falls back to source-backed default figure parts`,
      source: loginUserObjectHandlerSource(release)
    });
  }

  const session = host.objectManager.getObject("#session");
  const sex = (stringFromSession(session, "user_sex") || String(lastUserObject.sex ?? "M")).toUpperCase().startsWith("F") ? "F" : "M";
  return createDefaultFigureProps(sex, host.figurePartIndexSet);
}

export function getMessengerSearchFigurePropsRuntime(host: HabboFigureRuntimeHost): Record<string, HabboFigurePartProps> | undefined {
  const search = readMessengerSearchResult(host.movie.getProperty("messengerLastSearch"));
  if (!search?.found) {
    return undefined;
  }

  return parseOldServerFigureString(search.figureData, search.sex, host.figurePartIndexSet)
    ?? createDefaultFigureProps(search.sex, host.figurePartIndexSet);
}

export function getMessengerCurrentMessageFigurePropsRuntime(host: HabboFigureRuntimeHost): Record<string, HabboFigurePartProps> | undefined {
  const current = readMessengerMessage(host.movie.getProperty("messengerCurrentMessage"));
  if (!current) {
    return undefined;
  }

  const buddy = readMessengerBuddyList(host.movie.getProperty("messengerBuddyList")).buddies[current.senderID];
  const sex = buddy?.sex ?? "M";
  return parseOldServerFigureString(current.figureData, sex, host.figurePartIndexSet)
    ?? createDefaultFigureProps(sex, host.figurePartIndexSet);
}

export function createLoginPreviewMemberRuntime(
  host: HabboFigureRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  _geometry: { readonly width: number; readonly height: number },
  release: string
): DirectorMemberManifest | undefined {
  const figure = getActiveUserFigurePropsRuntime(host, release);
  const animation = getLoginUserFoundFigureActionRuntime(host);
  const sourceLayers = createFigureSourceLayersRuntime(
    host,
    fullHumanFigureParts,
    figure,
    release,
    3,
    animation
  );
  if (sourceLayers.length === 0) {
    return undefined;
  }

  // Figure_Preview.createTemplateHuman("h", 3, ...) returns a 64x102 member
  // with a bottom-biased regPoint. The window element loc is that regPoint.
  const width = 64;
  const height = 102;
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width,
    height,
    regPoint: { x: 0, y: 92 },
    composite: {
      width,
      height,
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
}

export function getLoginUserFoundFigureActionRuntime(host: HabboFigureRuntimeHost): HabboFigureRenderOptions {
  const state = String(host.movie.getProperty("loginUserFoundAnimation") ?? "std");
  const rawAnimFrame = host.movie.getProperty("loginUserFoundAnimationFrame");
  const animFrame = typeof rawAnimFrame === "number" && Number.isFinite(rawAnimFrame) ? Math.trunc(rawAnimFrame) : 0;
  if (state === "wave") {
    return { action: "wave", animFrame };
  }

  if (state === "smile" || state === "stopWaving") {
    return { action: "smile", animFrame };
  }

  return { action: "std", animFrame: 0 };
}

export function advanceLoginUserFoundAnimationRuntime(host: HabboFigureRuntimeHost, deltaMs: number, release: string): boolean {
  if (host.movie.getProperty("loginUserFoundVisible") !== true) {
    return false;
  }

  const state = String(host.movie.getProperty("loginUserFoundAnimation") ?? "std");
  if (state !== "wave") {
    return false;
  }

  const elapsed = numberFromUnknown(host.movie.getProperty("loginUserFoundAnimationElapsedMs")) + Math.max(0, deltaMs);
  host.movie.setProperty("loginUserFoundAnimationElapsedMs", elapsed);
  return false;
}

export function createHumanFeedPreviewMemberRuntime(
  host: HabboFigureRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  parts: readonly string[],
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  direction: number,
  release: string
): DirectorMemberManifest | undefined {
  const sourceLayers = createFigureSourceLayersRuntime(host, parts, figure, release, direction);
  if (sourceLayers.length === 0) {
    return undefined;
  }

  const bounds = getFigureLayerBounds(sourceLayers);
  const marginX = Math.round((geometry.width - bounds.width) / 2);
  const marginY = Math.round((geometry.height - bounds.height) / 2);
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers: sourceLayers.map((layer) => ({
        assetPath: layer.assetPath,
        x: marginX + layer.x - bounds.left,
        y: marginY + layer.y - bounds.top,
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
}

export function createFigurePartPreviewMemberRuntime(
  host: HabboFigureRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  part: string,
  release: string
): DirectorMemberManifest | undefined {
  const figure = host.ensureRegistrationFigureProps();
  const parts = part === "hd" ? ["hd", "ey", "fc"] : part === "ch" ? ["ls", "ch", "rs"] : [part];
  const sourceLayers = createFigureSourceLayersRuntime(host, parts, figure, release, 2);
  if (sourceLayers.length === 0) {
    return undefined;
  }

  const flippedLayers = sourceLayers.map((layer) => ({
    ...layer,
    flippedX: 64 - layer.x - layer.width
  }));
  const bounds = flippedLayers.reduce(
    (rect, layer) => ({
      left: Math.min(rect.left, layer.flippedX),
      top: Math.min(rect.top, layer.y),
      right: Math.max(rect.right, layer.flippedX + layer.width),
      bottom: Math.max(rect.bottom, layer.y + layer.height)
    }),
    { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
  );
  const contentWidth = Math.max(1, bounds.right - bounds.left);
  const contentHeight = Math.max(1, bounds.bottom - bounds.top);
  const marginX = Math.round((geometry.width - contentWidth) / 2);
  const marginY = Math.round((geometry.height - contentHeight) / 2);

  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers: flippedLayers.map((layer) => ({
        assetPath: layer.assetPath,
        x: marginX + layer.flippedX - bounds.left,
        y: marginY + layer.y - bounds.top,
        width: layer.width,
        height: layer.height,
        sourceWidth: layer.width,
        sourceHeight: layer.height,
        ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}),
        flipH: !layer.flipH,
        ...(layer.tint !== undefined ? { tint: layer.tint } : {}),
        ink: layer.ink
      }))
    }
  };
}

export function createFigurePreviewMemberRuntime(
  host: HabboFigureRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  release: string
): DirectorMemberManifest | undefined {
  const figure = host.ensureRegistrationFigureProps();
  const sourceLayers = createFigureSourceLayersRuntime(host, fullHumanFigureParts, figure, release, 2);
  if (sourceLayers.length === 0) {
    return undefined;
  }

  const scale = 2;
  const marginX = -11;
  const marginY = 3;
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "bitmap",
    width: geometry.width,
    height: geometry.height,
    composite: {
      width: geometry.width,
      height: geometry.height,
      layers: sourceLayers.map((layer) => ({
        assetPath: layer.assetPath,
        x: marginX + ((64 - layer.x - layer.width) * scale),
        y: marginY + (layer.y * scale),
        width: layer.width * scale,
        height: layer.height * scale,
        sourceWidth: layer.width,
        sourceHeight: layer.height,
        ...(layer.alpha !== undefined ? { alpha: layer.alpha } : {}),
        flipH: !layer.flipH,
        ...(layer.tint !== undefined ? { tint: layer.tint } : {}),
        ink: layer.ink
      }))
    }
  };
}

export function createFigureSourceLayersRuntime(
  host: HabboFigureRuntimeHost,
  parts: readonly string[],
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  release: string,
  direction: number,
  options: HabboFigureRenderOptions = {}
): readonly HabboFigureSourceLayer[] {
  const layers: HabboFigureSourceLayer[] = [];
  const memberPrefix = options.memberPrefix ?? "h";
  const xOffset = Math.round(options.xOffset ?? 0);
  const canvasWidth = Math.round(options.canvasWidth ?? 64);
  const canvasHeight = Math.round(options.canvasHeight ?? 102);
  const baselineOffset = Math.round(options.baselineOffset ?? 10);
  for (const part of orderFigureParts(parts, direction, options.action ?? "std")) {
    const props = figure[part];
    if (!props) {
      continue;
    }

    const partDirection = isFigureHeadPart(part) ? options.headDirection ?? direction : direction;
    const assetRequest = resolveFigurePartAssetRequest(part, partDirection, options);
    const resolvedAsset = getFigurePartAssetRuntime(host, part, props, partDirection, assetRequest, options);
    const memberName = `${memberPrefix}_${assetRequest.action}_${assetRequest.part}_${props.model}_${assetRequest.direction}_${assetRequest.frame}`;
    if (!resolvedAsset) {
      const cachedLayer = getCachedFigureSourceLayerRuntime(host, options.layerCacheKey, part);
      if (cachedLayer) {
        layers.push(cachedLayer);
        continue;
      }

      if (isExpectedMissingFigurePartAsset(part, assetRequest, options)) {
        continue;
      }

      host.recordUnsupportedOnce(`figure-part-asset-missing:${memberName}`, {
        subsystem: "habbo",
        feature: "figure-part-asset-missing",
        detail: `${release} Figure_Preview requested ${memberName} for a runtime feedImage preview, but no decoded external bitmap asset was found`,
        source: `extracted/projectorrays/${release}/${registrationInterfaceClassSource}`
      });
      continue;
    }

    const asset = resolvedAsset.asset;
    const ink = figurePartInk(part);
    const layerX = resolvedAsset.request.flipH === true
      ? xOffset + canvasWidth - (asset.width - asset.regPoint.x)
      : xOffset - asset.regPoint.x;
    const layer = {
      part,
      assetPath: asset.inkAssetPaths?.[ink === 36 ? "36" : "8"] ?? asset.pngPath,
      x: layerX,
      y: canvasHeight - asset.regPoint.y - baselineOffset,
      width: asset.width,
      height: asset.height,
      ink,
      ...(part === "sd" ? { alpha: 0.16 } : {}),
      ...(resolvedAsset.request.flipH === true ? { flipH: true } : {}),
      ...(ink === 41 ? { tint: props.color } : {})
    };
    setCachedFigureSourceLayerRuntime(host, options.layerCacheKey, part, layer);
    layers.push(layer);
  }

  return layers;
}

function getCachedFigureSourceLayerRuntime(host: HabboFigureRuntimeHost, cacheKey: string | undefined, part: string): HabboFigureSourceLayer | undefined {
  if (!cacheKey) {
    return undefined;
  }

  const cache = coerceRecord(host.movie.getProperty("figureLayerCache"));
  const figureCache = coerceRecord(cache[cacheKey]);
  return figureCache[part] as HabboFigureSourceLayer | undefined;
}

function setCachedFigureSourceLayerRuntime(host: HabboFigureRuntimeHost, cacheKey: string | undefined, part: string, layer: HabboFigureSourceLayer): void {
  if (!cacheKey) {
    return;
  }

  const cache: Record<string, unknown> = { ...coerceRecord(host.movie.getProperty("figureLayerCache")) };
  const figureCache: Record<string, unknown> = { ...coerceRecord(cache[cacheKey]) };
  figureCache[part] = layer;
  cache[cacheKey] = figureCache;
  host.movie.setProperty("figureLayerCache", cache);
}

function getFigurePartAssetRuntime(
  host: HabboFigureRuntimeHost,
  part: string,
  props: HabboFigurePartProps,
  direction: number,
  assetRequest: HabboFigurePartAssetRequest,
  options: HabboFigureRenderOptions
): HabboResolvedFigurePartAsset | undefined {
  const memberPrefix = options.memberPrefix ?? "h";
  const candidateRequests = createFigurePartAssetFallbackRequests(part, direction, assetRequest, options);
  for (const candidate of candidateRequests) {
    const memberName = `${memberPrefix}_${candidate.action}_${candidate.part}_${props.model}_${candidate.direction}_${candidate.frame}`;
    const asset = host.getBitmapAssetByMemberName(memberName, options.preferredCasts);
    if (asset) {
      return { asset, request: candidate };
    }
  }

  return undefined;
}

export function estimateRoomUserLocZRuntime(screenLocZ: number, user: HabboRoomUserRecord, canvas: HabboHumanCanvasSpec): number {
  const locH = user.h ?? 0;
  const humanOffset = canvas.correctLocZ ? (locH * 1000) + 2 : 2;
  return screenLocZ + humanOffset;
}

export function resolveRoomHumanCanvasSpecRuntime(host: HabboFigureRuntimeHost, factorX: number, mode = "std"): HabboHumanCanvasSpec {
  const variableSize = host.getVariable(`human.size.${Math.trunc(factorX)}`);
  const peopleSize = variableSize === "sh" || variableSize === "h"
    ? variableSize
    : factorX >= 64 ? "h" : "sh";
  const std = getHumanCanvasModeSpecRuntime(host, peopleSize, mode)
    ?? getHumanCanvasModeSpecRuntime(host, peopleSize, "std")
    ?? (peopleSize === "h"
      ? { width: 64, height: 102, depth: 32, regPointOffsetY: -10 }
      : { width: 32, height: 60, depth: 32, regPointOffsetY: -8 });

  // Human Class EX.refresh and action_lay set pLocFix before Bodypart
  // Class EX copies parts at canvasHeight - part.regPointY - 10 + pLocFix.y.
  const locFix = mode === "lay" ? { x: 30, y: -10 } : { x: -1, y: 2 };
  return {
    peopleSize,
    width: std.width,
    height: std.height,
    regPoint: {
      x: 0,
      y: std.height + std.regPointOffsetY
    },
    canvasHeight: std.height,
    baselineOffset: 10 - locFix.y,
    xOffset: locFix.x,
    memberPrefix: peopleSize,
    preferredCasts: peopleSize === "h"
      ? ["hh_people_1", "hh_people_2", "hh_people_small_1", "hh_people_small_2"]
      : ["hh_people_small_1", "hh_people_small_2", "hh_people_1", "hh_people_2"],
    correctLocZ: peopleSize === "h"
  };
}

function getHumanCanvasModeSpecRuntime(host: HabboFigureRuntimeHost, peopleSize: "h" | "sh", mode: string): HabboHumanCanvasModeSpec | undefined {
  const value = host.getVariable(`human.canvas.${peopleSize}`);
  if (!(value instanceof LingoPropertyList)) {
    return undefined;
  }

  const modeValue = value.getProp(new LingoSymbol(mode));
  if (!(modeValue instanceof LingoList)) {
    return undefined;
  }

  const entries = modeValue.toArray();
  const [width, height, depth, regPointOffsetY] = entries.map((entry) => {
    return typeof entry === "number" && Number.isFinite(entry) ? entry : Number.NaN;
  });
  if (![width, height, depth, regPointOffsetY].every((entry) => Number.isFinite(entry))) {
    return undefined;
  }

  return {
    width: width as number,
    height: height as number,
    depth: depth as number,
    regPointOffsetY: regPointOffsetY as number
  };
}

export function syncRoomFigurePreloadPathsRuntime(
  host: HabboFigureRuntimeHost,
  roomUsers: readonly HabboRoomUserRecord[],
  release: string,
  canvas: HabboHumanCanvasSpec
): void {
  const preloadKey = roomUsers
    .map((user) => {
      return `${user.id}:${user.figureRaw}:${canvas.memberPrefix}`;
    })
    .join("|");
  const targetProperty = getFigurePreloadTargetPropertyRuntime(host);
  const cachedPreloadPaths = readPreloadAssetPathList(host.movie.getProperty("roomFigurePreloadAssetPaths"));
  if (host.movie.getProperty("roomFigurePreloadKey") === preloadKey && cachedPreloadPaths.length > 0) {
    const currentTargetPaths = readPreloadAssetPathList(host.movie.getProperty(targetProperty));
    const firstCachedPath = cachedPreloadPaths[0];
    const lastCachedPath = cachedPreloadPaths[cachedPreloadPaths.length - 1];
    if (currentTargetPaths.length >= cachedPreloadPaths.length
      && firstCachedPath !== undefined
      && lastCachedPath !== undefined
      && currentTargetPaths.includes(firstCachedPath)
      && currentTargetPaths.includes(lastCachedPath)) {
      return;
    }
    setFigurePreloadAssetPathsRuntime(host, cachedPreloadPaths, "room-user", "syncRoomFigurePreloadPathsRuntime");
    host.movie.setProperty("roomFigurePreloadTargetProperty", targetProperty);
    return;
  }

  const paths = new Set<string>();
  for (const user of roomUsers) {
    for (const assetPath of collectRoomUserWarmupAssetPathsRuntime(host, user, canvas, release)) {
      paths.add(assetPath);
    }
  }

  const preloadPaths = [...paths].sort();
  host.movie.setProperty("roomFigurePreloadKey", preloadKey);
  host.movie.setProperty("roomFigurePreloadAssetPaths", preloadPaths);
  setFigurePreloadAssetPathsRuntime(host, preloadPaths, "room-user", "syncRoomFigurePreloadPathsRuntime");
  host.movie.setProperty("roomFigurePreloadTargetProperty", targetProperty);
  if (preloadPaths.length > 0) {
    host.logDebug("room", "info", `preload room figure animation assets users=${roomUsers.length} paths=${preloadPaths.length}`);
  }
}

export function syncActiveFigurePreloadPathsRuntime(host: HabboFigureRuntimeHost, release: string): void {
  const figure = getActiveUserFigurePropsRuntime(host, release);
  if (Object.keys(figure).length === 0) {
    return;
  }

  const session = host.objectManager.getObject("#session");
  const lastUserObject = coerceRecord(host.movie.getProperty("lastUserObject"));
  const rawFigure = stringFromSession(session, "user_figureRaw") || String(lastUserObject.figure ?? "");
  const sex = stringFromSession(session, "user_sex") || String(lastUserObject.sex ?? "M");
  const canvases = [resolveRoomHumanCanvasSpecRuntime(host, 64), resolveRoomHumanCanvasSpecRuntime(host, 32)];
  const preloadKey = `active:${rawFigure}:${sex}:${canvases.map((canvas) => canvas.memberPrefix).join(",")}`;
  if (host.movie.getProperty("activeFigurePreloadKey") === preloadKey) {
    return;
  }

  const paths = new Set<string>();
  for (const canvas of canvases) {
    for (const assetPath of collectFigurePreloadAssetPathsRuntime(host, figure, canvas, release)) {
      paths.add(assetPath);
    }
  }

  const preloadPaths = [...paths].sort();
  host.movie.setProperty("activeFigurePreloadKey", preloadKey);
  setFigurePreloadAssetPathsRuntime(host, preloadPaths, "avatar", "syncActiveFigurePreloadPathsRuntime");
  if (preloadPaths.length > 0) {
    host.logDebug("room", "info", `preload active figure assets paths=${preloadPaths.length}`);
  }
}

export function preloadLoginUserFoundFigureAssetsRuntime(host: HabboFigureRuntimeHost, release: string): void {
  const figure = getActiveUserFigurePropsRuntime(host, release);
  if (Object.keys(figure).length === 0) {
    return;
  }

  const session = host.objectManager.getObject("#session");
  const lastUserObject = coerceRecord(host.movie.getProperty("lastUserObject"));
  const rawFigure = stringFromSession(session, "user_figureRaw") || String(lastUserObject.figure ?? "");
  const sex = stringFromSession(session, "user_sex") || String(lastUserObject.sex ?? "M");
  const canvas = resolveRoomHumanCanvasSpecRuntime(host, 64);
  const preloadKey = `login-user-found:${rawFigure}:${sex}:${canvas.memberPrefix}`;
  if (host.movie.getProperty("loginUserFoundFigurePreloadKey") === preloadKey) {
    return;
  }

  const paths = new Set<string>();
  for (const frame of getFigureAnimationFramesRuntime(release, "wave")) {
    for (const assetPath of collectFigureActionFrameAssetPathsRuntime(host, figure, canvas, "wave", 3, 3, frame)) {
      paths.add(assetPath);
    }
  }
  for (const frame of getFigureAnimationFramesRuntime(release, "smile")) {
    for (const assetPath of collectFigureActionFrameAssetPathsRuntime(host, figure, canvas, "smile", 3, 3, frame)) {
      paths.add(assetPath);
    }
  }

  const preloadPaths = [...paths].sort();
  host.movie.setProperty("loginUserFoundFigurePreloadKey", preloadKey);
  mergeFigurePreloadAssetPathsRuntime(host, "blockingPreloadBitmapAssetPaths", preloadPaths, "avatar", "preloadLoginUserFoundFigureAssetsRuntime");
  if (preloadPaths.length > 0) {
    host.logDebug("login", "info", `preload login user-found figure assets paths=${preloadPaths.length}`);
  }
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" ? value : "";
}

function setFigurePreloadAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  preloadPaths: readonly string[],
  category: "avatar" | "room-user",
  caller: string
): void {
  host.movie.setProperty("preloadBitmapAssetContext", { category, caller });
  if (getFigurePreloadTargetPropertyRuntime(host) === "blockingPreloadBitmapAssetPaths") {
    host.movie.setProperty("blockingPreloadBitmapAssetPaths", [...preloadPaths]);
    host.movie.setProperty("preloadBitmapAssetPaths", []);
    return;
  }

  host.movie.setProperty("preloadBitmapAssetPaths", [...preloadPaths]);
}

function mergeFigurePreloadAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  propertyName: "blockingPreloadBitmapAssetPaths" | "preloadBitmapAssetPaths",
  preloadPaths: readonly string[],
  category: "avatar" | "room-user",
  caller: string
): void {
  host.movie.setProperty("preloadBitmapAssetContext", { category, caller });
  const existing = readPreloadAssetPathList(host.movie.getProperty(propertyName));
  host.movie.setProperty(propertyName, [...new Set([...existing, ...preloadPaths])]);
}

function readPreloadAssetPathList(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}

function collectFigurePreloadAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  canvas: HabboHumanCanvasSpec,
  release: string
): readonly string[] {
  const paths = new Set<string>();

  for (const direction of getFigureAnimationDirectionsRuntime(release)) {
    for (const action of getFigureStaticPreloadActionsRuntime(release)) {
      for (const assetPath of collectFigureActionFrameAssetPathsRuntime(host, figure, canvas, action, direction, direction, 0)) {
        paths.add(assetPath);
      }
    }
    for (const frame of getFigureAnimationFramesRuntime(release, "wave")) {
      for (const assetPath of collectFigureActionFrameAssetPathsRuntime(host, figure, canvas, "wave", direction, direction, frame)) {
        paths.add(assetPath);
      }
    }
    for (const frame of getFigureAnimationFramesRuntime(release, "walk")) {
      for (const assetPath of collectFigureActionFrameAssetPathsRuntime(host, figure, canvas, "walk", direction, direction, frame)) {
        paths.add(assetPath);
      }
    }
  }

  return [...paths];
}

function collectRoomUserWarmupAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  user: HabboRoomUserRecord,
  canvas: HabboHumanCanvasSpec,
  release: string
): readonly string[] {
  const paths = new Set<string>();
  for (const assetPath of collectFigurePreloadAssetPathsRuntime(host, user.figure, canvas, release)) {
    paths.add(assetPath);
  }

  const layCanvas = resolveMatchingCanvasModeRuntime(host, canvas, "lay");
  const sourceActions = getRoomUserWarmupSourceActionsRuntime(release);
  for (const direction of getFigureAnimationDirectionsRuntime(release)) {
    for (const sourceAction of sourceActions) {
      const actionSpec = getFigureSourceActionSpecRuntime(release, sourceAction);
      if (actionSpec.sourceMemberCount <= 0 || actionSpec.parts.length === 0) {
        continue;
      }
      const actionRule = getFigureSourceActionRuleRuntime(release, sourceAction);
      const actionCanvas = actionRule?.runtimeActionWhenIdle === "lay" ? layCanvas : canvas;
      for (const frame of actionSpec.frames.length > 0 ? actionSpec.frames : [0]) {
        for (const assetPath of collectFigureSourceOverrideAssetPathsRuntime(host, user.figure, actionCanvas, sourceAction, actionSpec.parts, direction, direction, frame)) {
          paths.add(assetPath);
        }
      }
    }
  }

  return [...paths];
}

function getRoomUserWarmupSourceActionsRuntime(release: string): readonly string[] {
  const metadata = getFigureHumanRuntimeMetadataRuntime(release);
  if (!metadata) {
    return [];
  }

  const sourceActions = new Set<string>();
  if (metadata.movement?.sourceAction) {
    sourceActions.add(metadata.movement.sourceAction);
  }
  if (metadata.movement?.sourceFrameAction) {
    sourceActions.add(metadata.movement.sourceFrameAction);
  }
  for (const entry of metadata.statusActionInventory) {
    sourceActions.add(entry.sourceAction);
    for (const sourceAction of entry.mainActions) {
      sourceActions.add(sourceAction);
    }
    for (const sourceAction of entry.referencedSourceActions) {
      sourceActions.add(sourceAction);
    }
  }
  return [...sourceActions].filter((sourceAction) => sourceAction.length > 0).sort();
}

function collectFigureSourceOverrideAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  canvas: HabboHumanCanvasSpec,
  sourceAction: string,
  parts: readonly string[],
  direction: number,
  headDirection: number,
  frame: number
): readonly string[] {
  const paths = new Set<string>();
  const overrides = Object.fromEntries(parts.map((part) => [part, { action: sourceAction, frame }]));
  const options: HabboFigureRenderOptions = {
    action: "std",
    animFrame: normalizePreloadFrame(frame),
    headDirection: normalizeFigureDirection(headDirection),
    preferredCasts: canvas.preferredCasts,
    memberPrefix: canvas.memberPrefix,
    partActionOverrides: overrides
  };

  for (const part of parts) {
    const props = figure[part];
    if (!props) {
      continue;
    }

    const partDirection = isFigureHeadPart(part) ? options.headDirection ?? direction : normalizeFigureDirection(direction);
    const assetRequest = resolveFigurePartAssetRequest(part, partDirection, options);
    const resolvedAsset = getFigurePartAssetRuntime(host, part, props, partDirection, assetRequest, options);
    if (!resolvedAsset) {
      continue;
    }

    const ink = figurePartInk(part);
    const asset = resolvedAsset.asset;
    paths.add(asset.inkAssetPaths?.[ink === 36 ? "36" : "8"] ?? asset.pngPath);
  }

  return [...paths];
}

function collectFigureActionFrameAssetPathsRuntime(
  host: HabboFigureRuntimeHost,
  figure: Readonly<Record<string, HabboFigurePartProps>>,
  canvas: HabboHumanCanvasSpec,
  action: HabboFigureTemplateAction,
  direction: number,
  headDirection: number,
  frame: number
): readonly string[] {
  const paths = new Set<string>();
  const bodyDirection = normalizeFigureDirection(direction);
  const options: HabboFigureRenderOptions = {
    action,
    animFrame: normalizePreloadFrame(frame),
    headDirection: normalizeFigureDirection(headDirection),
    preferredCasts: canvas.preferredCasts,
    memberPrefix: canvas.memberPrefix
  };

  for (const part of orderFigureParts(fullHumanFigureParts, bodyDirection, action)) {
    const props = figure[part];
    if (!props) {
      continue;
    }

    const partDirection = isFigureHeadPart(part) ? options.headDirection ?? bodyDirection : bodyDirection;
    const assetRequest = resolveFigurePartAssetRequest(part, partDirection, options);
    const resolvedAsset = getFigurePartAssetRuntime(host, part, props, partDirection, assetRequest, options);
    if (!resolvedAsset) {
      continue;
    }

    const ink = figurePartInk(part);
    const asset = resolvedAsset.asset;
    paths.add(asset.inkAssetPaths?.[ink === 36 ? "36" : "8"] ?? asset.pngPath);
  }

  return [...paths];
}

function resolveCurrentRoomUserFigureAction(user: HabboRoomUserRecord): HabboFigureTemplateAction {
  const posture = user.actions?.find((entry) => entry.name === "lay" || entry.name === "sit");
  if (posture?.name === "lay" || posture?.name === "sit") {
    return posture.name;
  }

  if (user.actions?.some((entry) => entry.name === "mv" || entry.name === "sld") === true) {
    return "walk";
  }

  if (user.actions?.some((entry) => entry.name === "wave" || entry.name === "wav") === true) {
    return "wave";
  }

  if (user.actions?.some((entry) => entry.name === "gest" && entry.params.trim().split(/\s+/)[0] === "sml") === true) {
    return "smile";
  }

  return "std";
}

function resolveMatchingCanvasModeRuntime(
  host: HabboFigureRuntimeHost,
  canvas: HabboHumanCanvasSpec,
  mode: string
): HabboHumanCanvasSpec {
  return resolveRoomHumanCanvasSpecRuntime(host, canvas.peopleSize === "h" ? 64 : 32, mode);
}

function normalizePreloadFrame(frame: number): number {
  return Math.max(0, Math.trunc(Number.isFinite(frame) ? frame : 0));
}

function getFigurePreloadTargetPropertyRuntime(
  host: HabboFigureRuntimeHost
): "blockingPreloadBitmapAssetPaths" | "preloadBitmapAssetPaths" {
  return shouldBlockFigurePreloadRuntime(host)
    ? "blockingPreloadBitmapAssetPaths"
    : "preloadBitmapAssetPaths";
}

function shouldBlockFigurePreloadRuntime(host: HabboFigureRuntimeHost): boolean {
  if (host.movie.getProperty("roomActive") === true) {
    return false;
  }

  if (host.movie.getProperty("roomLoaderVisible") === true) {
    return true;
  }

  const roomEntryState = String(host.movie.getProperty("roomEntryState") ?? "");
  return roomEntryState === "preparing-room"
    || roomEntryState === "waiting-bootstrap"
    || roomEntryState === "waiting-status"
    || roomEntryState === "ready-to-activate";
}
