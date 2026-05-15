import type { DirectorFrameManifest, DirectorMember, DirectorMemberManifest, DirectorMemberRef, DirectorMovie, DirectorMovieManifest, DirectorSpriteChannelManifest, UnsupportedFeature } from "../../../runtime";
import { getProjectorRaysManifestByRelease } from "../../extractedManifests";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type { HabboExternalCastVisualLayoutSet, HabboWindowBitmapAsset, HabboWindowLayoutElement } from "../../boot/HabboBootResourceTypes";
import { normalizeCastName, normalizeRoomObjectClassName, numberFromUnknown } from "../../HabboSourceValueHelpers";
import type { HabboRoomRequest } from "../../room/HabboRoomData";
import { readRoomDataStruct } from "../../room/HabboRoomData";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import {
  advanceRoomHandAnimationState,
  createRoomHandOpenAnimationState,
  HABBO_ROOM_HAND_SOURCE,
  HABBO_ROOM_HAND_VISUAL,
  HABBO_ROOM_HAND_VISUALIZER_ID,
  readRoomHandAnimationState,
  resolveRoomHandElementAction,
  resolveRoomHandPlacementAction,
  roomHandItemElementIndex,
  startRoomHandCloseAnimation,
  type HabboRoomHandAnimationState
} from "../../ui/HabboRoomHand";
import {
  parseStripInfoPacket,
  readStripItems,
  type HabboStripItemRecord
} from "./HabboInventoryHandData";

const roomHandlerClassSource = "hh_room/casts/External/ParentScript 5 - Room Handler Class.ls";
const release1RoseauId = "release1_roseau_dcr0910";
const release1GfPrivateManifestRelease = "release1_roseau_dcr0910-gf_private";
const release1GfPrivateManifestPath = "generated/runtime-data/release1_roseau_dcr0910-gf_private-projectorrays-manifest.json";
const release1UserStripSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 18 - UserStrip Class.ls";
const release1OpenHandSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 29 - Open Hand.ls";
const release1HandItemSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 19 - Hand Item Behavior.ls";
const release1MoreHandSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 59 - More Hand Stuff.ls";
const release1HandRuntimeWindowId = HABBO_ROOM_HAND_VISUALIZER_ID;
const release1HandChannelBase = 3600;
const release1HandLocZBase = 1_001_000_000;
const roomHandItemBitmapCastCandidates = [
  "hh_furni_small",
  "hh_room",
  "hh_room_private",
  "hh_patch_uk",
  "catalog_text_fi",
  "Goldfish_prv_gfx",
  "Goldfish_prv",
  "small",
  "Items",
  "drken_furniture_lab",
  "armas_furniture",
  "gf_private"
] as const;

export interface HabboInventoryHandRuntimeHost {
  readonly movie: DirectorMovie;
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet;
  readonly loadedCastSlots: Map<string, number>;

  getText(key: string): string | undefined;
  queueRoomRequest(request: Omit<HabboRoomRequest, "id" | "status">, release: string): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  syncRoomInteractiveElements(): void;
  syncDirectorOverlaySprites(): void;
  clearRoomObjectMoverPreview(): boolean;
  resolveExternalBitmapMemberRefByName(memberName: string, preferredCasts: readonly string[]): DirectorMemberRef | undefined;
  getBitmapAssetByMemberName(memberName: string, preferredCasts?: readonly string[]): HabboWindowBitmapAsset | undefined;
}

export function handleStripInfoPacket(host: HabboInventoryHandRuntimeHost, body: string, release: string): boolean {
  const parsed = parseStripInfoPacket(body);
  host.movie.setProperty("roomHandStripItems", parsed.items);
  host.movie.setProperty("roomHandStripTotalCount", parsed.totalCount);
  host.movie.setProperty("lastStripInfoPacket", {
    itemCount: parsed.items.length,
    totalCount: parsed.totalCount,
    source: isRelease1Roseau(release)
      ? release1UserStripSource
      : `extracted/projectorrays/${release}/${roomHandlerClassSource}`
  });
  if (host.movie.getProperty("roomHandOpenPending") === true || host.movie.getProperty("roomHandVisible") === true) {
    openRoomHandFromStripInfo(host, release);
  }
  host.logDebug("room", "ok", `STRIPINFO items=${parsed.items.length} total=${parsed.totalCount}`);
  return true;
}

export function handleStripUpdatedPacket(host: HabboInventoryHandRuntimeHost, body: string, release: string): boolean {
  host.movie.setProperty("lastStripUpdatedPacket", {
    body,
    source: `extracted/projectorrays/${release}/${roomHandlerClassSource}`
  });
  if (host.movie.getProperty("roomHandVisible") === true) {
    host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
  }
  host.logDebug("room", "info", "STRIPUPDATED");
  return true;
}

export function handleRemoveStripItemPacket(host: HabboInventoryHandRuntimeHost, body: string, release: string): boolean {
  const itemId = body.trim().split(/\s+/)[0] ?? "";
  const current = readStripItems(host.movie.getProperty("roomHandStripItems"));
  host.movie.setProperty("roomHandStripItems", itemId ? current.filter((item) => item.stripId !== itemId && item.id !== itemId) : current);
  host.movie.setProperty("lastRemoveStripItemPacket", {
    itemId,
    source: `extracted/projectorrays/${release}/${roomHandlerClassSource}`
  });
  if (host.movie.getProperty("roomHandVisible") === true) {
    renderRoomHandContainer(host, release);
  }
  host.logDebug("room", "info", `REMOVESTRIPITEM id=${itemId || "n/a"}`);
  return true;
}

export function advanceRoomHandAnimation(host: HabboInventoryHandRuntimeHost, deltaMs: number, release: string): boolean {
  if (isRelease1Roseau(release)) {
    return false;
  }

  if (host.movie.getProperty("roomHandVisible") !== true) {
    return false;
  }

  const state = readRoomHandAnimationState(host.movie.getProperty("roomHandAnimationState"));
  if (!state) {
    return false;
  }

  const step = advanceRoomHandAnimationState(
    state,
    deltaMs,
    Math.max(1, Math.round(1000 / Math.max(1, host.movie.tempo))),
    shouldShowRoomHandNext(host)
  );
  if (step.removed) {
    host.movie.setProperty("roomHandVisible", false);
    host.movie.setProperty("roomHandAnimationState", undefined);
    host.movie.setProperty("roomHandOverlaySprites", []);
    host.movie.setProperty("roomHandInteractiveElements", []);
    host.syncRoomInteractiveElements();
    host.syncDirectorOverlaySprites();
    host.logDebug("room", "info", "hand close animation complete");
    return true;
  }

  if (step.state) {
    host.movie.setProperty("roomHandAnimationState", step.state);
  }

  if (!step.changed) {
    return false;
  }

  renderRoomHandContainer(host, release);
  return true;
}

export function activateRoomHandElement(
  host: HabboInventoryHandRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (host.movie.getProperty("roomHandVisible") !== true) {
    return false;
  }

  if (activation?.event && activation.event !== "mouseUp") {
    return false;
  }

  const state = readRoomHandAnimationState(host.movie.getProperty("roomHandAnimationState"));
  if (!state || state.mode !== "open") {
    return false;
  }

  const action = resolveRoomHandElementAction(elementId, state.nextVisible);
  if (!action) {
    return false;
  }

  if (action.kind === "next") {
    host.queueRoomRequest({ command: "GETSTRIP", stripMode: action.stripMode }, release);
    host.movie.setProperty("lastRoomHandAction", {
      action: "request-strip-next",
      command: "GETSTRIP",
      stripMode: action.stripMode,
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.logDebug("room", "info", `hand next queued GETSTRIP mode=${action.stripMode}`);
    return true;
  }

  const item = readStripItems(host.movie.getProperty("roomHandStripItems"))[action.index - 1];
  if (!item) {
    host.logDebug("room", "warn", `hand item slot missing index=${action.index}`);
    return true;
  }

  return activateRoomHandStripItem(host, item, action.index, release);
}

export function openCloseRoomHandContainer(host: HabboInventoryHandRuntimeHost, release: string): boolean {
  if (isRelease1Roseau(release)) {
    if (host.movie.getProperty("roomHandVisible") === true) {
      host.movie.setProperty("roomHandOpenPending", false);
      host.movie.setProperty("roomHandVisible", false);
      host.movie.setProperty("roomHandAnimationState", undefined);
      host.movie.setProperty("roomHandOverlaySprites", []);
      host.movie.setProperty("roomHandInteractiveElements", []);
      host.syncRoomInteractiveElements();
      host.syncDirectorOverlaySprites();
      host.logDebug("room", "info", "release1 hand closed");
      return true;
    }

    host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
    host.movie.setProperty("roomHandOpenPending", true);
    host.movie.setProperty("lastRoomHandAction", {
      action: "request-strip-before-open",
      command: "GETSTRIP",
      source: release1OpenHandSource
    });
    host.logDebug("room", "info", "release1 hand open queued GETSTRIP new");
    return true;
  }

  if (host.movie.getProperty("roomHandVisible") === true) {
    const currentState = readRoomHandAnimationState(host.movie.getProperty("roomHandAnimationState"))
      ?? createRoomHandOpenAnimationState();
    host.movie.setProperty("roomHandOpenPending", false);
    host.movie.setProperty("roomHandAnimationState", startRoomHandCloseAnimation(currentState));
    host.movie.setProperty("roomHandInteractiveElements", []);
    host.syncRoomInteractiveElements();
    renderRoomHandContainer(host, release);
    host.logDebug("room", "info", "hand close animation queued");
    return true;
  }

  host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
  host.movie.setProperty("roomHandOpenPending", true);
  host.movie.setProperty("lastRoomHandAction", {
    action: "request-strip-before-open",
    command: "GETSTRIP",
    source: HABBO_ROOM_HAND_SOURCE
  });
  host.logDebug("room", "info", "hand open queued GETSTRIP");
  return true;
}

export function openRoomHandFromStripInfo(host: HabboInventoryHandRuntimeHost, release: string): boolean {
  if (isRelease1Roseau(release)) {
    host.movie.setProperty("roomHandOpenPending", false);
    host.movie.setProperty("roomHandVisible", true);
    host.movie.setProperty("roomHandAnimationState", {
      mode: "open",
      frame: 9,
      elapsedMs: 0,
      originX: 0,
      originY: 0,
      handMemberName: "room_hand_3",
      maskVisible: false,
      maskBlend: 0,
      itemsVisible: true,
      nextVisible: true
    } satisfies HabboRoomHandAnimationState);
    return renderRelease1RoomHandContainer(host, release);
  }

  const existingState = readRoomHandAnimationState(host.movie.getProperty("roomHandAnimationState"));
  if (host.movie.getProperty("roomHandVisible") !== true || !existingState || existingState.mode === "close") {
    host.movie.setProperty("roomHandAnimationState", createRoomHandOpenAnimationState());
  }

  host.movie.setProperty("roomHandOpenPending", false);
  host.movie.setProperty("roomHandVisible", true);
  return renderRoomHandContainer(host, release);
}

export function renderRoomHandContainer(host: HabboInventoryHandRuntimeHost, release: string): boolean {
  if (isRelease1Roseau(release)) {
    return renderRelease1RoomHandContainer(host, release);
  }

  const visual = host.externalCastVisualLayoutSet?.visuals.find((entry) => {
    return entry.memberName.toLowerCase() === HABBO_ROOM_HAND_VISUAL.toLowerCase();
  });
  if (!visual) {
    host.recordUnsupportedOnce("room-hand-visual-layout-missing", {
      subsystem: "habbo",
      feature: "room-hand-visual-layout-missing",
      detail: `${release} Container Hand Class requested ${HABBO_ROOM_HAND_VISUAL}, but no generated visual layout was available`,
      source: HABBO_ROOM_HAND_SOURCE
    });
    return false;
  }

  if (!host.loadedCastSlots.has(normalizeCastName(visual.castName))) {
    host.recordUnsupportedOnce(`room-hand-visual-cast-not-loaded:${visual.castName}`, {
      subsystem: "habbo",
      feature: "room-hand-visual-cast-not-loaded",
      detail: `${release} habbo_hand.visual references ${visual.castName}, but that external cast has not been imported for the current room`,
      source: visual.textChunkPath
    });
    return false;
  }

  const state = readRoomHandAnimationState(host.movie.getProperty("roomHandAnimationState"))
    ?? createRoomHandOpenAnimationState();
  const stripItems = readStripItems(host.movie.getProperty("roomHandStripItems"));
  const sprites: DirectorSpriteChannelManifest[] = [];
  const interactiveElements: HabboWindowInteractiveElement[] = [];
  for (const element of visual.elements) {
    if (element.media !== "bitmap" || element.locH === undefined || element.locV === undefined) {
      continue;
    }

    const elementId = element.id ?? "";
    const itemIndex = roomHandItemElementIndex(elementId);
    const item = itemIndex !== undefined ? stripItems[itemIndex - 1] : undefined;
    const visible = resolveRoomHandElementVisible(elementId, state, item !== undefined);
    if (!visible) {
      continue;
    }

    const memberRef = resolveRoomHandElementMemberRef(host, element, state, item);
    if (!memberRef) {
      host.recordUnsupportedOnce(`room-hand-member-unresolved:${elementId || element.index}`, {
        subsystem: "habbo",
        feature: "room-hand-member-unresolved",
        detail: `${release} ${HABBO_ROOM_HAND_VISUAL} element ${element.index} (${elementId || element.memberName || "unknown"}) could not resolve a loaded bitmap member for the source hand visualizer`,
        source: visual.textChunkPath
      });
      continue;
    }

    const elementLoc = resolveRoomHandElementLoc(elementId, element.locH, element.locV, state);
    const elementX = Math.round(state.originX + elementLoc.x);
    const elementY = Math.round(state.originY + elementLoc.y);
    if (elementId === "room_hand_next") {
      const member = host.movie.cast.getMember(memberRef);
      interactiveElements.push({
        id: elementId,
        windowId: HABBO_ROOM_HAND_VISUALIZER_ID,
        kind: "button",
        x: elementX,
        y: elementY,
        width: Math.max(1, Math.round(member?.width ?? element.width ?? 1)),
        height: Math.max(1, Math.round(member?.height ?? element.height ?? 1)),
        label: "Next",
        cursor: "cursor.finger"
      });
    }
    if (itemIndex !== undefined && item) {
      const member = host.movie.cast.getMember(memberRef);
      interactiveElements.push({
        id: elementId,
        windowId: HABBO_ROOM_HAND_VISUALIZER_ID,
        kind: "button",
        x: elementX,
        y: elementY,
        width: Math.max(1, Math.round(member?.width ?? element.width ?? 1)),
        height: Math.max(1, Math.round(member?.height ?? element.height ?? 1)),
        label: item.className,
        cursor: "cursor.finger"
      });
    }
    const blend = elementId === "room_hand_mask"
      ? state.maskBlend
      : element.blend;
    sprites.push({
      channel: 2600 + element.index + 1,
      member: memberRef,
      loc: {
        x: elementX,
        y: elementY
      },
      ...(element.ink !== undefined ? { ink: element.ink } : {}),
      ...(blend !== undefined ? { blend } : {}),
      locZ: -1000 + element.index,
      visible
    });
  }

  host.movie.setProperty("roomHandOverlaySprites", sprites);
  host.movie.setProperty("roomHandInteractiveElements", interactiveElements);
  host.movie.setProperty("roomHandVisual", {
    release,
    visual: visual.memberName,
    spriteCount: sprites.length,
    origin: { x: state.originX, y: state.originY },
    frame: state.frame,
    mode: state.mode,
    handMemberName: state.handMemberName,
    itemsVisible: state.itemsVisible,
    nextVisible: state.nextVisible,
    source: visual.textChunkPath
  });
  host.syncRoomInteractiveElements();
  host.syncDirectorOverlaySprites();
  host.recordUnsupportedOnce("room-hand-container-partial", {
    subsystem: "habbo",
    feature: "room-hand-container-partial",
    detail: `${release} Container Hand Class now opens ${HABBO_ROOM_HAND_VISUAL} from the source moveTo/receiveUpdate animation path, queues GETSTRIP new/next, exposes the source next-page hand control, and starts Object Mover previews for active and item placement. Exact Preview_renderer output, source alpha/corner validation, and full drag/drop capture parity remain partial.`,
    source: HABBO_ROOM_HAND_SOURCE
  });
  return sprites.length > 0;
}

function renderRelease1RoomHandContainer(host: HabboInventoryHandRuntimeHost, release: string): boolean {
  const manifest = getProjectorRaysManifestByRelease(release1GfPrivateManifestRelease);
  const handFrame = manifest ? release1RoomHandOpenFrame(host, manifest) : undefined;
  if (!manifest || !handFrame) {
    host.recordUnsupportedOnce("release1-room-hand-score-frame-missing", {
      subsystem: "habbo",
      feature: "release1-room-hand-score-frame-missing",
      detail: `${release} UserStrip Class received STRIPINFO, but ${release1GfPrivateManifestPath} did not provide a source hand-open score frame for the current private room marker`,
      source: release1UserStripSource
    });
    return false;
  }

  const stripItems = readStripItems(host.movie.getProperty("roomHandStripItems"));
  const itemChannels = release1RoomHandItemChannels(manifest, handFrame.index);
  const nextChannels = release1RoomHandNextChannels(manifest, handFrame.index);
  const itemChannelIndex = new Map(itemChannels.map((channel, index) => [channel, index + 1] as const));
  const shadowChannelIndex = new Map(itemChannels.map((channel, index) => [channel - 1, index + 1] as const));
  const nextChannelSet = new Set(nextChannels);
  const sprites: DirectorSpriteChannelManifest[] = [];
  const interactiveElements: HabboWindowInteractiveElement[] = [];
  const unresolved: Array<{ readonly channel: number; readonly memberName: string }> = [];

  for (const sourceSprite of handFrame.sprites) {
    const sourceMember = release1SourceMemberForSprite(manifest, sourceSprite);
    const sourceMemberName = release1SourceMemberNameForSprite(manifest, sourceSprite);
    if (!sourceMember || !sourceMemberName) {
      continue;
    }

    const itemIndex = itemChannelIndex.get(sourceSprite.channel);
    const shadowIndex = shadowChannelIndex.get(sourceSprite.channel);
    const item = itemIndex !== undefined ? stripItems[itemIndex - 1] : shadowIndex !== undefined ? stripItems[shadowIndex - 1] : undefined;
    const isHandChrome = release1RoomHandChromeMemberName(sourceMemberName);
    const isNextButton = nextChannelSet.has(sourceSprite.channel);
    if (!isHandChrome && itemIndex === undefined && shadowIndex === undefined && !isNextButton) {
      continue;
    }

    if ((itemIndex !== undefined || shadowIndex !== undefined) && !item) {
      continue;
    }

    const memberName = itemIndex !== undefined && item
      ? resolveRelease1RoomHandStripItemMemberName(host, item)
      : shadowIndex !== undefined && item
      ? "object_shadow_placeholder"
      : sourceMemberName;
    const memberRef = host.resolveExternalBitmapMemberRefByName(memberName, release1RoomHandPreferredCasts(host, itemIndex !== undefined));
    if (!memberRef) {
      unresolved.push({ channel: sourceSprite.channel, memberName });
      continue;
    }

    const member = host.movie.cast.getMember(memberRef);
    const runtimeSprite: DirectorSpriteChannelManifest = {
      channel: release1HandChannelBase + sourceSprite.channel,
      member: memberRef,
      loc: sourceSprite.loc,
      ...(sourceSprite.visible !== undefined ? { visible: sourceSprite.visible } : {}),
      ...(sourceSprite.ink !== undefined ? { ink: sourceSprite.ink } : {}),
      ...(sourceSprite.blend !== undefined ? { blend: sourceSprite.blend } : {}),
      locZ: release1HandLocZBase + sourceSprite.channel,
      ...(sourceSprite.flipH === true ? { flipH: true } : {}),
      ...(sourceSprite.flipV === true ? { flipV: true } : {}),
      ...(itemIndex !== undefined && item ? release1RoomHandStripItemColor(item) : {})
    };
    sprites.push(runtimeSprite);

    if (itemIndex !== undefined && item && member) {
      const boundsMember = {
        type: member.type,
        ...(member.width !== undefined ? { width: member.width } : {}),
        ...(member.height !== undefined ? { height: member.height } : {}),
        ...(member.regPoint !== undefined ? { regPoint: member.regPoint } : {})
      };
      const bounds = release1RoomHandSpriteBounds(sourceSprite, boundsMember);
      interactiveElements.push({
        id: `room_hand_item_${itemIndex}`,
        windowId: release1HandRuntimeWindowId,
        kind: "button",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        label: item.className,
        cursor: "cursor.finger"
      });
    }

    if (isNextButton && member) {
      const boundsMember = {
        type: member.type,
        ...(member.width !== undefined ? { width: member.width } : {}),
        ...(member.height !== undefined ? { height: member.height } : {}),
        ...(member.regPoint !== undefined ? { regPoint: member.regPoint } : {})
      };
      const bounds = release1RoomHandSpriteBounds(sourceSprite, boundsMember);
      interactiveElements.push({
        id: "room_hand_next",
        windowId: release1HandRuntimeWindowId,
        kind: "button",
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        label: "Next",
        cursor: "cursor.finger"
      });
    }
  }

  host.movie.setProperty("roomHandOverlaySprites", sprites);
  host.movie.setProperty("roomHandInteractiveElements", interactiveElements);
  host.movie.setProperty("roomHandVisual", {
    release,
    visual: `${release1RoomMarkerForHand(host)}_hand_close.score`,
    spriteCount: sprites.length,
    itemCount: stripItems.length,
    sourceFrame: handFrame.index,
    sourceMovie: release1GfPrivateManifestRelease,
    source: [release1UserStripSource, release1HandItemSource, release1MoreHandSource, release1GfPrivateManifestPath],
    unresolved
  });
  host.syncRoomInteractiveElements();
  host.syncDirectorOverlaySprites();
  if (unresolved.length > 0) {
    host.recordUnsupportedOnce("release1-room-hand-member-unresolved", {
      subsystem: "habbo",
      feature: "release1-room-hand-member-unresolved",
      detail: `${release} rendered the source gf_private hand frame but ${unresolved.length} hand member reference(s) did not resolve into loaded casts`,
      source: release1HandItemSource
    });
  }
  host.logDebug("room", sprites.length > 0 ? "ok" : "warn", `release1 hand sprites=${sprites.length} items=${stripItems.length}`);
  return sprites.length > 0;
}

function release1RoomHandOpenFrame(
  host: HabboInventoryHandRuntimeHost,
  manifest: DirectorMovieManifest
): DirectorFrameManifest | undefined {
  const marker = release1RoomMarkerForHand(host);
  const openMarker = manifest.score.markers?.find((entry) => entry.name.toLowerCase() === `${marker}_hand_open`.toLowerCase());
  const closeMarker = manifest.score.markers?.find((entry) => entry.name.toLowerCase() === `${marker}_hand_close`.toLowerCase());
  const liveFrame = release1RoomHandLiveLoopFrame(manifest, openMarker?.frame, closeMarker?.frame);
  if (liveFrame) {
    return liveFrame;
  }

  return closeMarker
    ? manifest.score.frames.find((entry) => entry.index === closeMarker.frame)
    : openMarker
    ? manifest.score.frames.find((entry) => entry.index === openMarker.frame)
    : undefined;
}

function release1RoomMarkerForHand(host: HabboInventoryHandRuntimeHost): string {
  const roomVisuals = host.movie.getProperty("roomVisuals");
  if (roomVisuals && typeof roomVisuals === "object") {
    const marker = (roomVisuals as { readonly marker?: unknown }).marker;
    if (typeof marker === "string" && marker.trim()) {
      return marker.trim();
    }
  }

  const currentRoomVisual = host.movie.getProperty("currentRoomVisual");
  if (currentRoomVisual && typeof currentRoomVisual === "object") {
    const visualName = (currentRoomVisual as { readonly visualName?: unknown }).visualName;
    if (typeof visualName === "string" && visualName.trim()) {
      return visualName.trim();
    }
  }

  return "model_a";
}

function release1RoomHandItemChannels(manifest: DirectorMovieManifest, frameIndex: number): readonly number[] {
  return (manifest.score.behaviors ?? [])
    .filter((behavior) => behavior.startFrame <= frameIndex && behavior.endFrame >= frameIndex)
    .filter((behavior) => release1SourceMemberNameForRef(manifest, behavior.script)?.toLowerCase() === "hand item behavior")
    .map((behavior) => behavior.channel)
    .sort((left, right) => left - right);
}

function release1RoomHandNextChannels(manifest: DirectorMovieManifest, frameIndex: number): readonly number[] {
  return (manifest.score.behaviors ?? [])
    .filter((behavior) => behavior.startFrame <= frameIndex && behavior.endFrame >= frameIndex)
    .filter((behavior) => release1SourceMemberNameForRef(manifest, behavior.script)?.toLowerCase() === "more hand stuff")
    .map((behavior) => behavior.channel)
    .sort((left, right) => left - right);
}

function release1RoomHandLiveLoopFrame(
  manifest: DirectorMovieManifest,
  openFrame: number | undefined,
  closeFrame: number | undefined
): DirectorFrameManifest | undefined {
  if (openFrame === undefined || closeFrame === undefined) {
    return undefined;
  }

  const frameIndex = (manifest.score.behaviors ?? [])
    .filter((behavior) => behavior.startFrame >= openFrame && behavior.endFrame <= closeFrame)
    .filter((behavior) => release1SourceMemberNameForRef(manifest, behavior.script)?.toLowerCase() === "more hand stuff")
    .map((behavior) => behavior.startFrame)
    .sort((left, right) => left - right)[0];
  return frameIndex !== undefined ? manifest.score.frames.find((frame) => frame.index === frameIndex) : undefined;
}

function release1RoomHandChromeMemberName(memberName: string): boolean {
  const normalized = memberName.toLowerCase();
  return normalized === "hand_open"
    || normalized === "hand_opening"
    || normalized === "hand_closed"
    || normalized === "hand_opening_mask"
    || normalized === "hand_wall_shadow";
}

function resolveRelease1RoomHandStripItemMemberName(host: HabboInventoryHandRuntimeHost, item: HabboStripItemRecord): string {
  if (item.kind === "stuff") {
    const sourceMemberName = `${item.className}_small`;
    const normalizedMemberName = `${normalizeRoomObjectClassName(item.className)}_small`;
    const baseVariantName = item.className.includes("*") ? `${item.className.slice(0, item.className.indexOf("*"))}_small` : "";
    const memberName = [sourceMemberName, normalizedMemberName, baseVariantName].find((candidate) => {
      return candidate.length > 0 && host.getBitmapAssetByMemberName(candidate, roomHandItemPreferredCasts(host)) !== undefined;
    });
    return memberName ?? "object_placeholder";
  }

  if (item.className === "poster" && item.customData) {
    return `poster ${item.customData}_small`;
  }

  if (item.className.includes("post.it")) {
    const rawPostNumber = Number.parseFloat(item.customData ?? "1") / (20.0 / 6.0);
    const postNumber = Math.max(1, Math.min(6, Math.trunc(rawPostNumber)));
    return `${item.className}_${postNumber}_small`;
  }

  const memberName = `${item.className}_small`;
  return host.getBitmapAssetByMemberName(memberName, roomHandItemPreferredCasts(host))
    ? memberName
    : "object_placeholder";
}

function release1RoomHandStripItemColor(item: HabboStripItemRecord): Pick<DirectorSpriteChannelManifest, "bgColor"> {
  const lastColor = item.color?.split(",").map((entry) => entry.trim()).filter(Boolean).at(-1);
  if (!lastColor) {
    return {};
  }

  if (lastColor.startsWith("*") && lastColor.length > 1) {
    return { bgColor: `#${lastColor.slice(1)}` };
  }

  if (lastColor.startsWith("#")) {
    return { bgColor: lastColor };
  }

  return {};
}

function release1RoomHandPreferredCasts(host: HabboInventoryHandRuntimeHost, itemSprite: boolean): readonly string[] {
  const candidates = itemSprite
    ? roomHandItemPreferredCasts(host)
    : ["interface_gfx", "Goldfish_prv_gfx", "GoldFish", "gf_private"];
  const loadedCandidates = candidates.filter((castName) => host.loadedCastSlots.has(normalizeCastName(castName)));
  return loadedCandidates.length > 0 ? loadedCandidates : candidates;
}

function release1SourceMemberForSprite(
  manifest: DirectorMovieManifest,
  sourceSprite: DirectorSpriteChannelManifest
): DirectorMemberManifest | undefined {
  return release1SourceMemberForRef(manifest, sourceSprite.member);
}

function release1SourceMemberNameForSprite(
  manifest: DirectorMovieManifest,
  sourceSprite: DirectorSpriteChannelManifest
): string | undefined {
  return release1SourceMemberForSprite(manifest, sourceSprite)?.name;
}

function release1SourceMemberNameForRef(
  manifest: DirectorMovieManifest,
  ref: DirectorMemberRef
): string | undefined {
  return release1SourceMemberForRef(manifest, ref)?.name;
}

function release1SourceMemberForRef(
  manifest: DirectorMovieManifest,
  ref: DirectorMemberRef
): DirectorMemberManifest | undefined {
  const cast = manifest.casts.find((castLib) => castLib.number === ref.castLib);
  return cast?.members.find((member) => member.number === ref.member);
}

function release1RoomHandSpriteBounds(
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: {
    readonly type: DirectorMemberManifest["type"];
    readonly width?: number | undefined;
    readonly height?: number | undefined;
    readonly regPoint?: { readonly x: number; readonly y: number } | undefined;
  }
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const width = Math.max(1, Math.round(sourceSprite.width ?? sourceMember.width ?? 1));
  const height = Math.max(1, Math.round(sourceSprite.height ?? sourceMember.height ?? 1));
  if (sourceMember.type === "text" || sourceMember.type === "field") {
    return {
      x: Math.round(sourceSprite.loc.x),
      y: Math.round(sourceSprite.loc.y),
      width,
      height
    };
  }

  const sourceWidth = Math.max(1, Math.round(sourceMember.width ?? width));
  const sourceHeight = Math.max(1, Math.round(sourceMember.height ?? height));
  const reg = sourceMember.regPoint ?? { x: 0, y: 0 };
  const regX = Math.round((reg.x * width) / sourceWidth);
  const regY = Math.round((reg.y * height) / sourceHeight);
  return {
    x: Math.round(sourceSprite.loc.x - regX),
    y: Math.round(sourceSprite.loc.y - regY),
    width,
    height
  };
}

function isRelease1Roseau(release: string): boolean {
  return release.startsWith(release1RoseauId);
}

function activateRoomHandStripItem(host: HabboInventoryHandRuntimeHost, item: HabboStripItemRecord, index: number, release: string): boolean {
  const roomData = readRoomDataStruct(host.objectManager.getObject("#room_component")?.get("saveData"));
  if (roomData?.type !== "private") {
    host.logDebug("room", "info", `hand item ignored outside private room index=${index}`);
    return true;
  }

  const placement = resolveRoomHandPlacementAction(item);
  if (placement.kind === "active") {
    removeRoomHandStripItem(host, placement.stripId, release);
    host.movie.setProperty("roomObjectMover", {
      action: "placeActive",
      objectId: placement.objectId,
      stripId: placement.stripId,
      kind: "active",
      className: placement.className,
      width: placement.width,
      height: placement.height,
      direction: placement.direction,
      ...(placement.colors !== undefined ? { colors: placement.colors } : {}),
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.clearRoomObjectMoverPreview();
    host.movie.setProperty("roomClickAction", "placeActive");
    host.movie.setProperty("selectedRoomObjectId", placement.objectId);
    host.movie.setProperty("selectedRoomObjectType", "active");
    host.movie.setProperty("selectedRoomObjectName", host.getText(`furni_${placement.className}_name`) ?? placement.className);
    host.movie.setProperty("lastRoomHandAction", {
      action: "start-active-placement",
      objectId: placement.objectId,
      stripId: placement.stripId,
      className: placement.className,
      width: placement.width,
      height: placement.height,
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.logDebug("room", "info", `hand active placement strip=${placement.stripId} object=${placement.objectId}`);
    return true;
  }

  if (placement.kind === "decor") {
    host.queueRoomRequest({ command: "FLATPROPBYITEM", body: placement.body }, release);
    removeRoomHandStripItem(host, placement.stripId, release);
    host.movie.setProperty("roomClickAction", "moveHuman");
    host.movie.setProperty("lastRoomHandAction", {
      action: "place-decor",
      command: "FLATPROPBYITEM",
      body: placement.body,
      stripId: placement.stripId,
      className: placement.className,
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.logDebug("room", "info", `FLATPROPBYITEM body=${placement.body}`);
    return true;
  }

  if (placement.kind === "wall-item") {
    if (placement.className === "Chess") {
      host.recordUnsupportedOnce("room-hand-chess-item-place-partial", {
        subsystem: "habbo",
        feature: "room-hand-chess-item-place-partial",
        detail: `${release} Container Hand Class creates Chess as an item object with a list direction, but Chess item member/render parity is not implemented yet.`,
        source: HABBO_ROOM_HAND_SOURCE
      });
      host.logDebug("room", "warn", `hand Chess placement partial strip=${placement.stripId}`);
      return true;
    }

    if (placement.removeStripAtStart) {
      removeRoomHandStripItem(host, placement.stripId, release);
    }
    host.movie.setProperty("roomObjectMover", {
      action: "placeItem",
      objectId: placement.objectId,
      stripId: placement.stripId,
      kind: "item",
      className: placement.className,
      itemType: placement.itemType,
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.clearRoomObjectMoverPreview();
    host.movie.setProperty("roomClickAction", "placeItem");
    host.movie.setProperty("selectedRoomObjectId", placement.objectId);
    host.movie.setProperty("selectedRoomObjectType", "item");
    const wallItemName = placement.className === "poster"
      ? host.getText(`poster_${placement.itemType}_name`)
      : host.getText(`wallitem_${placement.className}_name`);
    host.movie.setProperty("selectedRoomObjectName", wallItemName ?? placement.className);
    host.movie.setProperty("lastRoomHandAction", {
      action: "start-wall-item-placement",
      objectId: placement.objectId,
      stripId: placement.stripId,
      className: placement.className,
      itemType: placement.itemType,
      source: HABBO_ROOM_HAND_SOURCE
    });
    host.logDebug("room", "info", `hand wall item placement strip=${placement.stripId} object=${placement.objectId} class=${placement.className}`);
    return true;
  }

  host.recordUnsupportedOnce(`room-hand-item-class-unsupported:${placement.className}`, {
    subsystem: "habbo",
    feature: "room-hand-item-class-unsupported",
    detail: `${release} Container Hand Class placeItemToRoom received unknown item class ${placement.className}; no source-backed placement path is implemented for it.`,
    source: HABBO_ROOM_HAND_SOURCE
  });
  host.logDebug("room", "warn", `hand item unsupported class=${placement.className}`);
  return true;
}

function removeRoomHandStripItem(host: HabboInventoryHandRuntimeHost, stripId: string, release: string): void {
  const current = readStripItems(host.movie.getProperty("roomHandStripItems"));
  host.movie.setProperty("roomHandStripItems", current.filter((item) => item.stripId !== stripId && item.id !== stripId));
  if (host.movie.getProperty("roomHandVisible") === true) {
    renderRoomHandContainer(host, release);
  }
}

function shouldShowRoomHandNext(host: HabboInventoryHandRuntimeHost): boolean {
  const stripItems = readStripItems(host.movie.getProperty("roomHandStripItems"));
  const totalCount = numberFromUnknown(host.movie.getProperty("roomHandStripTotalCount"), stripItems.length);
  return totalCount > stripItems.length;
}

function resolveRoomHandElementVisible(
  elementId: string,
  state: HabboRoomHandAnimationState,
  hasItem: boolean
): boolean {
  if (elementId === "room_hand_next") {
    return state.nextVisible;
  }

  if (elementId === "room_hand_mask") {
    return state.maskVisible;
  }

  if (roomHandItemElementIndex(elementId) !== undefined) {
    return state.itemsVisible && hasItem;
  }

  return true;
}

function resolveRoomHandElementLoc(
  elementId: string,
  locH: number,
  locV: number,
  state: HabboRoomHandAnimationState
): { readonly x: number; readonly y: number } {
  if (elementId === "room_hand_next" && state.nextVisible) {
    return { x: 630, y: 10 };
  }

  return { x: locH, y: locV };
}

function resolveRoomHandElementMemberRef(
  host: HabboInventoryHandRuntimeHost,
  element: HabboWindowLayoutElement,
  state: HabboRoomHandAnimationState,
  item?: HabboStripItemRecord
): DirectorMemberRef | undefined {
  const elementId = element.id ?? "";
  const memberName = elementId === "room_hand"
    ? state.handMemberName
    : item
    ? resolveRoomHandStripItemMemberName(host, item)
    : element.resolvedMember?.memberName ?? element.memberName;
  if (!memberName) {
    return undefined;
  }

  const preferredCasts = elementId.startsWith("room_hand_item_")
    ? roomHandItemPreferredCasts(host)
    : [element.resolvedMember?.castName ?? "", "hh_room", "hh_patch_uk"].filter(Boolean);
  const byName = host.resolveExternalBitmapMemberRefByName(memberName, preferredCasts);
  if (byName) {
    return byName;
  }

  if (!element.resolvedMember) {
    return undefined;
  }

  const castLib = host.loadedCastSlots.get(normalizeCastName(element.resolvedMember.castName));
  return castLib !== undefined
    ? { castLib, member: element.resolvedMember.member }
    : undefined;
}

function resolveRoomHandStripItemMemberName(host: HabboInventoryHandRuntimeHost, item: HabboStripItemRecord): string {
  if (item.kind === "stuff") {
    const sourceMemberName = `${item.className}_small`;
    const normalizedMemberName = `${normalizeRoomObjectClassName(item.className)}_small`;
    const memberName = [sourceMemberName, normalizedMemberName].find((candidate) => {
      return host.getBitmapAssetByMemberName(candidate, roomHandItemPreferredCasts(host)) !== undefined;
    });
    return memberName
      ? memberName
      : "room_object_placeholder";
  }

  if (item.className === "poster" && item.customData) {
    return `poster ${item.customData}_small`;
  }

  if (item.className.includes("post.it")) {
    const rawPostNumber = Number.parseFloat(item.customData ?? "1") / (20.0 / 6.0);
    const postNumber = Math.max(1, Math.min(6, Math.trunc(rawPostNumber)));
    return `${item.className}_${postNumber}_small`;
  }

  if (item.className === "wallpaper" || item.className === "floor") {
    return `${item.className}_small`;
  }

  const memberName = `${item.className}_small`;
  return host.getBitmapAssetByMemberName(memberName, roomHandItemPreferredCasts(host))
    ? memberName
    : "room_object_placeholder";
}

function roomHandItemPreferredCasts(host: HabboInventoryHandRuntimeHost): readonly string[] {
  const loadedCandidates = roomHandItemBitmapCastCandidates.filter((castName) => {
    return host.loadedCastSlots.has(normalizeCastName(castName));
  });

  return loadedCandidates.length > 0 ? loadedCandidates : roomHandItemBitmapCastCandidates;
}
