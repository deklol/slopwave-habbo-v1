import type { DirectorFrameManifest, DirectorMemberManifest, DirectorMovie, DirectorMovieManifest, DirectorSpriteChannelManifest } from "../../../runtime";
import { getProjectorRaysManifestByRelease } from "../../extractedManifests";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import { coerceRecord, normalizeCastName, rgbToHex } from "../../HabboSourceValueHelpers";
import type { HabboPrivateRoomPatterns, HabboRoomDataStruct, HabboRoomPattern } from "../../room/HabboRoomData";
import { readRoomDataStruct } from "../../room/HabboRoomData";
import { resolvePrivateRoomFloorMemberName, resolvePrivateRoomWallMemberName } from "../../room/HabboPrivateRoomPatterns";
import type { HabboRoomObjectInfo, HabboRoomUserInfo } from "../../room/HabboRoomSelection";
import { hasRoomUserAction, roomUserModeratorLevelFromActions, type HabboRoomUserRecord } from "../../room/HabboRoomUserData";
import { isRoomObjectRecord, type HabboRoomObjectRecord } from "../../room/HabboRoomObjectData";
import type { HabboWindowBitmapAsset, HabboWindowLayoutElement } from "../../boot/HabboBootResourceTypes";
import {
  beginRoomEntryTransitionRuntime,
  createDefaultPrivateRoomProgramStateRuntime,
  leaveRoomRuntime,
  roomConnectedRuntime,
  setRoomEntryStateRuntime,
  setRoomLoaderProgressRuntime,
  setRoomWirePhaseRuntime,
  type HabboRoomLifecycleRuntimeHost
} from "../../room/HabboRoomLifecycleRuntime";
import type { HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { setMemberTextByName } from "./HabboV1EntryRuntime";
import { openRelease1EntryNavigator, syncRelease1EntryNavigatorRoomLoadProgress } from "./HabboV1Navigator";
import { flatLoaderSourcePath, goToFlatWithNaviSourcePath, release1FieldText } from "./HabboV1NavigatorSource";
import { showHideRelease1Messenger, type HabboV1MessengerRuntimeHost } from "./HabboV1MessengerRuntime";
import { openRelease1PurseOrHelp } from "./HabboV1PurseHelpRuntime";
import {
  createRelease1FurniPreviewRuntimeMember,
  release1FurniMetadataForRoomObject,
  release1FurniMetadataSource,
  type Release1FurniPreviewAsset,
  type Release1ResolvedFurniMetadata
} from "./HabboV1FurniMetadata";

const roomComponentId = "#room_component";
const sessionObjectId = "#session";
const privateRoomLoadListMember = "loadlistPrivateRoom";
const privateRoomObjectsSource =
  "extracted/projectorrays/release1_roseau_dcr0910/FuseScript/casts/External/MovieScript 1 - Main Script.ls";
const privateRoomProgressSource =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 138 - progressBar_bhv.ls";
const privateRoomConfigurationSource =
  "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv/casts/External/MovieScript 1 - Configuration.ls";
const privateRoomWallSource =
  "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv/casts/External/BehaviorScript 12 - PrivateRoom Wall.ls";
const privateRoomFloorSource =
  "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv/casts/External/BehaviorScript 11 - PrivateRoom Floor.ls";
const privateRoomButtonSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 64 - UI Button Enablable.ls";
const privateRoomRotateButtonSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 32 - Rotate Item.ls";
const privateRoomHiliterSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 20 - hiliter_one_room.ls";
const privateRoomInfoStandSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 44 - infoStand.ls";
const privateRoomHumanClassSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 72 - Human Class GF.ls";
const privateRoomBootstrapTextSource =
  "extracted/projectorrays/release1_roseau_dcr0910/FuseScript/casts/External/BehaviorScript 10 - SecondFrameLoadinSystem.ls";
const privateRoomChatInputSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 17 - chatTextInput behavior.ls";
const privateRoomChatModePopupSource =
  "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/BehaviorScript 66 - b_chatMode_popup.ls";
const privateRoomOpenHandSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 29 - Open Hand.ls";
const privateRoomOpenCatalogSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 27 - Open Catalog.ls";
const privateRoomOpenMessengerSource =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 35 - Open Messenger.ls";
const privateRoomOpenNavigatorSource =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 118 - openNavigator.ls";
const privateRoomOpenHelpSource =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 289 - openHelp.ls";
const privateRoomOpenPurseSource =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 290 - openPurse.ls";
const gfPrivateManifestRelease = "release1_roseau_dcr0910-gf_private";
const gfPrivateManifestPath = "generated/runtime-data/release1_roseau_dcr0910-gf_private-projectorrays-manifest.json";
const v1RoomScoreLocZBase = 1_000_000;
const v1RoomStageBackdropCastName = "runtime_release1_room_stage";
const v1RoomStageBackdropMember = 1;
const v1RoomStageBackdropChannel = 1999;
const v1SelectedUserRuntimeCastSlot = 10009;
const v1SelectedUserPreviewStartChannel = 2712;
const v1SelectedUserPreviewChannelCount = 32;
const v1SelectedUserHiliteChannel = 2890;
const v1SelectedUserWaveButtonChannel = 2891;
const v1SelectedUserModeratorBadgeChannel = 2892;
const v1SelectedObjectPreviewChannel = 2893;
const v1SelectedUserWaveButtonId = "release1_room_button_wave_runtime";
const v1SelectedUserModeratorBadgeId = "release1_room_moderator_badge_runtime";
const v1SelectedUserPreviewLoc = { x: 695, y: 390 };
const v1SelectedObjectPreviewLoc = { x: 645, y: 389 };
const v1SelectedUserModeratorBadgeLoc = { x: 694, y: 350 };
const v1SelectedUserPreviewLocZBase = v1RoomScoreLocZBase + 10000;
const v1SelectedUserHiliteLocZ = v1RoomScoreLocZBase + 9000000;
const roseauObjectsSource =
  "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/outgoing/OBJECTS_WORLD.java";

const release1PrivateRoomSelectedUserSource = [
  privateRoomHiliterSource,
  privateRoomInfoStandSource,
  privateRoomHumanClassSource
] as const;

const release1PrivateRoomInfoStandButtonSource = [
  privateRoomHiliterSource,
  privateRoomButtonSource
] as const;

const release1PrivateRoomWaveButtonSource = [
  privateRoomHumanClassSource,
  privateRoomButtonSource,
  gfPrivateManifestPath
] as const;

const release1PrivateRoomModeratorBadgeSource = [
  privateRoomHiliterSource,
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 14 - Human Class.ls",
  "extracted/projectorrays/release1_roseau_dcr0910/interface_gfx/casts/External/CastScript 119 - sheriff_badge.ls"
] as const;

const release1SelectedUserPreviewPreferredCasts = ["people", "small", "hh_people_1", "hh_people_2"] as const;
const release1SelectedUserHilitePreferredCasts = ["interface_gfx", "Goldfish_prv_gfx", "hh_room", "hh_interface"] as const;
const release1SelectedUserButtonPreferredCasts = ["interface_gfx", "Goldfish_prv_gfx", "habbo_messenger", "MessengerScript", "hh_room", "hh_interface"] as const;
const release1SelectedObjectPreviewPreferredCasts = ["drken_furniture_lab", "armas_furniture", "Items", "Goldfish_prv_gfx", "catalog_text_fi"] as const;

const release1SelectedUserPartLocZShifts: Readonly<Record<string, number>> = {
  sd: -100,
  bd: 0,
  sh: 5,
  lg: 10,
  ch: 15,
  lh: 20,
  ls: 30,
  rh: 20,
  rs: 30,
  fc: 100,
  ey: 111,
  hr: 112,
  hd: 31
};

interface Release1ScoreBehavior {
  readonly name: string;
  readonly properties: Readonly<Record<string, unknown>>;
}

interface Release1PrivateRoomInteractiveAction {
  readonly id: string;
  readonly channel: number;
  readonly kind: "chat-field" | "chat-mode-popup" | "open-catalog" | "open-hand" | "open-toolbar" | "source-button" | "moderator-badge";
  readonly event?: "mouseDown" | "mouseUp";
  readonly source: readonly string[];
  readonly bounds: Release1Rect;
  readonly openBounds?: Release1Rect;
  readonly chatModeProps?: Release1ChatModePopupProps;
  readonly catalogName?: string;
  readonly buttonType?: string;
  readonly rotateChange?: number;
  readonly rotateStepMode?: "repeat-change";
}

interface Release1ChatModePopupProps {
  readonly openHeight: number;
  readonly topMargin: number;
  readonly bottomMargin: number;
  readonly selections: number;
  readonly defaultChatMode: number;
}

interface Release1Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Release1PrivateRoomSourceButton {
  readonly id: string;
  readonly channel: number;
  readonly buttonType: string;
  readonly event: "mouseDown" | "mouseUp";
  readonly sourceMemberName: string;
  readonly pressedMemberName?: string;
  readonly rotateChange?: number;
  readonly rotateStepMode?: "repeat-change";
  readonly disabledMode: "hidden" | "dimmed";
  readonly bounds: Release1Rect;
  readonly source: readonly string[];
}

export interface HabboV1PrivateRoomRuntimeHost extends HabboRoomLifecycleRuntimeHost {
  readonly movie: DirectorMovie;
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
    createObject?(id: string, className: string): HabboVariableObject;
  };
  readonly loadedCastNames?: Set<string>;

  castExists?(castName: string): boolean;
  getRuntimeRoomVisualCastSlot?(): number;
  handleBridgePacket?(packetName: string, body: string, release: string): boolean;
  executeMessage?(message: string, argument: unknown, release: string): boolean;
  queueRoomRequest?(request: Record<string, unknown>, release: string): void;
  openCloseRoomHandContainer?(release: string): boolean;
  activateRoomFurniInterfaceElement?(
    elementId: string,
    object: HabboRoomObjectRecord,
    release: string,
    options?: {
      readonly rotate?: {
        readonly change?: number;
        readonly stepMode?: "repeat-change";
        readonly source?: string;
      };
    }
  ): boolean;
  startCastLoad?(castList: readonly string[], priority: number, release: string): number;
  getBitmapAssetByMemberName?(memberName: string, preferredCasts?: readonly string[]): HabboWindowBitmapAsset | undefined;
  syncDirectorOverlaySprites?(): void;
  syncWindowSpriteChannels?(release: string): void;
  syncRoomInteractiveElements?(): void;
  logDebug?(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedOnce?(key: string, feature: { readonly subsystem: string; readonly feature: string; readonly detail: string; readonly source?: string }): void;
}

export function prepareRelease1PrivateRoomAfterFlatLetIn(host: HabboV1PrivateRoomRuntimeHost, release: string): boolean {
  if (!release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const entry = readRelease1NavigatorRoomEntry(host.movie);
  if (!entry) {
    return false;
  }

  const casts = release1PrivateRoomCastList(host.movie);
  if (casts.length === 0) {
    host.recordUnsupportedOnce?.("release1-private-room-loadlist-missing", {
      subsystem: "habbo",
      feature: "release1-private-room-loadlist-missing",
      detail: "release1 flat loading source requested field loadlistPrivateRoom, but the runtime could not resolve it before GOTOFLAT",
      source: flatLoaderSourcePath
    });
  }

  const roomData: HabboRoomDataStruct = {
    id: entry.roomId,
    name: entry.roomName,
    type: "private",
    owner: entry.owner,
    door: entry.doorMode,
    teleport: 0,
    casts
  };

  const roomEpoch = beginRoomEntryTransitionRuntime(host, release, roomData);
  const component = ensureRelease1RoomComponent(host);
  component.set("roomId", "private");
  component.set("activeFlag", 0);
  component.set("saveData", roomData);
  component.set("roomEntryEpoch", roomEpoch);
  component.set("processList", {});
  component.set("userObjects", {});
  component.set("activeObjects", {});
  component.set("passiveObjects", {});
  component.set("itemObjects", {});
  component.set("chatProps", { mode: "CHAT" });

  const session = host.objectManager.getObject(sessionObjectId);
  const userName = stringFromObject(session, "userName") || stringFromObject(session, "user_name");
  const isOwner = userName.length > 0 && roomData.owner === userName;
  session?.set("room_owner", isOwner ? 1 : 0);
  session?.set("room_controller", isOwner ? 1 : 0);

  host.movie.setProperty("currentRoomData", roomData);
  host.movie.setProperty("privateRoomProgramState", createDefaultPrivateRoomProgramStateRuntime(host));
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
  setRoomEntryStateRuntime(host, "preparing-room");
  setRoomWirePhaseRuntime(host, "awaiting-room-ready");
  setRelease1PrivateRoomLoadingProgress(host, 0.18, release, false);

  importRelease1PrivateRoomCasts(host, casts, release);
  setRelease1PrivateRoomLoadingProgress(host, 0.35, release, false);
  host.syncDirectorOverlaySprites?.();
  host.logDebug?.("room", "ok", `release1 prepared private room entry id=${roomData.id} casts=${casts.length}`, {
    source: [goToFlatWithNaviSourcePath, flatLoaderSourcePath]
  });
  return true;
}

export function activateRelease1PrivateRoomElement(
  host: HabboV1PrivateRoomRuntimeHost,
  elementId: string,
  activation: { readonly localX?: number; readonly localY?: number; readonly event?: "mouseDown" | "mouseUp" | "keyDown" } | undefined,
  release: string
): boolean {
  if (!release.startsWith("release1_roseau_dcr0910") || host.movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  const action = readRelease1PrivateRoomInteractiveActions(host.movie).find((candidate) => candidate.id === elementId);
  if (!action) {
    return false;
  }

  if (action.kind === "source-button") {
    if (activation?.event === "mouseDown" || activation?.event === "mouseUp") {
      updateRelease1PrivateRoomSourceButtonPressed(host, action, activation.event === "mouseDown");
      if (action.event && activation.event !== action.event) {
        return true;
      }
    } else if (action.event && activation?.event) {
      return false;
    }

    return activateRelease1PrivateRoomSourceButton(host, action, release);
  }

  if (action.event
    && activation?.event
    && activation.event !== action.event) {
    return false;
  }

  if (action.kind === "chat-mode-popup") {
    return activateRelease1PrivateRoomChatModePopup(host, action, activation, release);
  }

  if (action.kind === "open-hand") {
    if (action.event && activation?.event && action.event !== activation.event) {
      return false;
    }
    const wasOpen = host.movie.getProperty("roomHandVisible") === true;
    const handled = host.openCloseRoomHandContainer?.(release) === true;
    if (handled) {
      host.movie.setProperty("release1PrivateRoomLastToolbarAction", {
        elementId,
        action: wasOpen ? "closeHand" : "openHand",
        handled,
        source: action.source
      });
      host.logDebug?.("room", "ok", `release1 hand ${wasOpen ? "closed" : "open queued"} from source toolbar`);
      return true;
    }

    host.queueRoomRequest?.({ command: "GETSTRIP", stripMode: "new" }, release);
    host.movie.setProperty("roomHandOpenPending", true);
    host.movie.setProperty("release1PrivateRoomLastToolbarAction", {
      elementId,
      action: "GETSTRIP new",
      handled: false,
      source: action.source
    });
    host.logDebug?.("room", "info", "release1 Open Hand queued GETSTRIP new");
    return true;
  }

  if (action.kind === "open-catalog") {
    if (action.event && activation?.event && action.event !== activation.event) {
      return false;
    }
    const catalogueState = coerceRecord(host.movie.getProperty("release1CatalogueState"));
    const handled = catalogueState?.open === true
      ? host.executeMessage?.("#hide_catalogue", undefined, release) === true
      : host.executeMessage?.("#show_catalogue", action.catalogName ?? "basicA", release) === true;
    host.movie.setProperty("release1PrivateRoomLastToolbarAction", {
      elementId,
      action: catalogueState?.open === true ? "closeCatalog" : "openCatalog",
      catalogName: action.catalogName ?? "basicA",
      handled,
      source: action.source
    });
    host.logDebug?.("catalogue", handled ? "ok" : "warn", `release1 toggle Catalog catName=${action.catalogName ?? "basicA"} handled=${handled}`);
    return true;
  }

  if (action.kind === "open-toolbar") {
    if (action.event && activation?.event && action.event !== activation.event) {
      return false;
    }
    return activateRelease1PrivateRoomToolbarElement(host, elementId, action, release);
  }

  if (action.kind === "moderator-badge") {
    return activateRelease1PrivateRoomModeratorBadge(host, release);
  }

  return false;
}

function activateRelease1PrivateRoomToolbarElement(
  host: HabboV1PrivateRoomRuntimeHost,
  elementId: string,
  action: Release1PrivateRoomInteractiveAction,
  release: string
): boolean {
  ensureRelease1PrivateRoomUserGlobals(host);

  if (action.source.includes(privateRoomOpenNavigatorSource)) {
    const handled = openRelease1EntryNavigator(host.movie, privateRoomOpenNavigatorSource);
    host.syncDirectorOverlaySprites?.();
    setRelease1PrivateRoomToolbarAction(host, elementId, "navigator", handled, action.source);
    return true;
  }

  if (action.source.includes(privateRoomOpenMessengerSource)) {
    const handled = showHideRelease1Messenger(host as unknown as HabboV1MessengerRuntimeHost, release);
    host.syncDirectorOverlaySprites?.();
    setRelease1PrivateRoomToolbarAction(host, elementId, "messenger", handled, action.source);
    return true;
  }

  if (action.source.includes(privateRoomOpenPurseSource)) {
    const handled = openRelease1PurseOrHelp(host.movie, "purse");
    host.syncDirectorOverlaySprites?.();
    setRelease1PrivateRoomToolbarAction(host, elementId, "purse", handled, action.source);
    return true;
  }

  if (action.source.includes(privateRoomOpenHelpSource)) {
    const handled = openRelease1PurseOrHelp(host.movie, "helpLinks");
    host.syncDirectorOverlaySprites?.();
    setRelease1PrivateRoomToolbarAction(host, elementId, "help", handled, action.source);
    return true;
  }

  host.recordUnsupportedOnce?.("release1-private-room-toolbar-action", {
    subsystem: "room",
    feature: "release1 private room toolbar action",
    detail: `No source-backed toolbar route matched ${elementId}`,
    source: action.source[0] ?? privateRoomButtonSource
  });
  return false;
}

function ensureRelease1PrivateRoomUserGlobals(host: HabboV1PrivateRoomRuntimeHost): void {
  const globals = coerceRecord(host.movie.getProperty("release1EntryGlobals"));
  if (typeof globals.gMyName === "string" && globals.gMyName.trim()) {
    return;
  }

  const session = host.objectManager.getObject(sessionObjectId);
  const userName = firstNonEmptyString(session?.get("userName"), session?.get("user_name"));
  if (!userName) {
    return;
  }

  host.movie.setProperty("release1EntryGlobals", {
    ...globals,
    gMyName: userName
  });
}

function firstNonEmptyString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }

    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function setRelease1PrivateRoomToolbarAction(
  host: HabboV1PrivateRoomRuntimeHost,
  elementId: string,
  action: string,
  handled: boolean,
  source: readonly string[]
): void {
  host.movie.setProperty("release1PrivateRoomLastToolbarAction", {
    elementId,
    action,
    handled,
    source
  });
  host.logDebug?.("room", handled ? "ok" : "warn", `release1 toolbar ${action} handled=${handled}`);
}

export function showRelease1SelectedPrivateRoomUserInfo(
  host: HabboV1PrivateRoomRuntimeHost,
  user: HabboRoomUserRecord,
  info: HabboRoomUserInfo,
  release: string
): boolean {
  if (!release.startsWith("release1_roseau_dcr0910") || host.movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  release1PrivateRoomEmptyInfoFields(host);
  const customText = normalizeRelease1InfostandText(info.custom);
  setAllTextMembersByName(host.movie, "item.info_name", info.name);
  setAllTextMembersByName(host.movie, "item.info_text", customText);
  showRelease1SelectedPrivateRoomUserPreview(host, user, release);
  showRelease1SelectedPrivateRoomUserHilite(host, user);
  showRelease1SelectedPrivateRoomModeratorBadge(host, user, release);

  host.movie.setProperty("release1PrivateRoomSelectedUser", {
    userId: info.selectedId,
    name: info.name,
    custom: customText,
    source: release1PrivateRoomSelectedUserSource
  });
  applyRelease1SelectedPrivateRoomUserActions(host, user);
  host.syncDirectorOverlaySprites?.();
  host.syncRoomInteractiveElements?.();
  host.logDebug?.("room", "info", `release1 selected user=${info.name}`);
  return true;
}

export function showRelease1SelectedPrivateRoomObjectInfo(
  host: HabboV1PrivateRoomRuntimeHost,
  object: HabboRoomObjectRecord,
  info: HabboRoomObjectInfo,
  release: string
): boolean {
  if (!release.startsWith("release1_roseau_dcr0910") || host.movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  release1PrivateRoomEmptyInfoFields(host);
  const displayInfo = release1PrivateRoomObjectDisplayInfo(object, info);
  const customText = normalizeRelease1InfostandText(displayInfo.custom);
  setAllTextMembersByName(host.movie, "item.info_name", displayInfo.name);
  setAllTextMembersByName(host.movie, "item.info_text", customText);
  showRelease1SelectedPrivateRoomObjectPreview(host, displayInfo.metadata);

  const control = release1PrivateRoomCurrentControlContext(host);
  const isController = control.roomController;
  const isOwner = control.roomOwner;
  if (isController && object.kind === "active") {
    setRelease1PrivateRoomSourceButtonEnabled(host, "movestuff", true);
    setRelease1PrivateRoomSourceButtonEnabled(host, "rotatestuff", true);
    if (isOwner) {
      setRelease1PrivateRoomSourceButtonEnabled(host, "pickstuff", true);
      setRelease1PrivateRoomSourceButtonEnabled(host, "removestuff", true);
    }
  } else if (isController && object.kind === "item") {
    setRelease1PrivateRoomSourceButtonEnabled(host, "pickstuff", true);
  }

  host.movie.setProperty("release1PrivateRoomSelectedObject", {
    objectId: info.selectedId,
    kind: info.selectedType,
    className: object.className,
    object: cloneRelease1SelectedRoomObject(object),
    name: displayInfo.name,
    custom: customText,
    smallMemberName: displayInfo.smallMemberName,
    control,
    source: [
      privateRoomInfoStandSource,
      "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 5 - FUSEMember Class.ls",
      "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 25 - InteractiveItem Abstract.ls",
      release1FurniMetadataSource
    ]
  });
  host.movie.setProperty("selectedRoomObjectInfo", {
    ...info,
    name: displayInfo.name,
    custom: customText,
    smallMemberName: displayInfo.smallMemberName
  });
  host.movie.setProperty("selectedRoomObjectName", displayInfo.name);
  host.syncDirectorOverlaySprites?.();
  host.syncRoomInteractiveElements?.();
  host.logDebug?.("room", "info", `release1 selected ${object.kind} object=${displayInfo.name} id=${info.selectedId}`);
  return true;
}

export function refreshRelease1SelectedPrivateRoomUserInfo(
  host: HabboV1PrivateRoomRuntimeHost,
  release: string
): void {
  if (!release.startsWith("release1_roseau_dcr0910") || host.movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return;
  }

  const selectedState = coerceRecord(host.movie.getProperty("release1PrivateRoomSelectedUser"));
  const selectedId = String(selectedState.userId ?? "");
  if (selectedId.length === 0) {
    return;
  }

  const selected = readRelease1PrivateRoomSelectedUser(host);
  if (!selected || selected.id !== selectedId) {
    clearRelease1SelectedPrivateRoomUserSprites(host);
    host.movie.setProperty("release1PrivateRoomSelectedUser", undefined);
    return;
  }

  showRelease1SelectedPrivateRoomUserHilite(host, selected);
  showRelease1SelectedPrivateRoomModeratorBadge(host, selected, release);
  applyRelease1SelectedPrivateRoomUserActions(host, selected);
}

export function recordRelease1PrivateRoomReady(host: HabboV1PrivateRoomRuntimeHost, body: string): boolean {
  const description = body.replace(/^[\r\n]+/, "").trim();
  host.movie.setProperty("release1PrivateRoomReady", {
    description,
    source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/outgoing/ROOM_READY.java"
  });
  setRelease1PrivateRoomLoadingProgress(host, 0.45, "release1_roseau_dcr0910", false);
  host.logDebug?.("room", "info", `release1 ROOM_READY description=${description || "empty"}`);
  return true;
}

export function deferRelease1PrivateRoomBootstrapPacket(
  host: HabboV1PrivateRoomRuntimeHost,
  packetName: string,
  body: string,
  release: string
): boolean {
  if (!release.startsWith("release1_roseau_dcr0910") || !isRelease1DeferredBootstrapPacket(packetName)) {
    return false;
  }

  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  if (!roomData || roomData.type !== "private") {
    return false;
  }

  const entryState = host.movie.getProperty("roomEntryState");
  const wirePhase = host.movie.getProperty("roomWirePhase");
  if (entryState !== "preparing-room" && wirePhase !== "awaiting-room-ready") {
    return false;
  }

  host.movie.setProperty("release1PrivateRoomDeferredBootstrapPackets", [
    ...readDeferredBootstrapPackets(host.movie),
    {
      packetName,
      body,
      source: [
        privateRoomObjectsSource,
        "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/room/Room.java"
      ]
    }
  ]);
  host.logDebug?.("room", "info", `release1 deferred ${packetName} until OBJECTS WORLD selects the gf_private score`);
  return true;
}

export function prepareRelease1PrivateRoomObjectsPacket(
  host: HabboV1PrivateRoomRuntimeHost,
  body: string,
  release: string
): boolean {
  if (!release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const marker = release1PrivateRoomMarkerFromObjectsPacketBody(body);
  if (!marker) {
    return false;
  }

  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  if (!roomData || host.movie.getProperty("roomWirePhase") !== "awaiting-room-ready") {
    return false;
  }

  const connected = connectRelease1PrivateRoomFromScoreFrame(host, marker, release)
    || roomConnectedRuntime(host, marker, "ROOM_READY", release);
  if (connected) {
    setRelease1PrivateRoomLoadingProgress(host, 0.6, release, false);
    host.movie.setProperty("release1PrivateRoomObjectWorld", {
      marker,
      source: [privateRoomObjectsSource, roseauObjectsSource]
    });
    flushRelease1PrivateRoomDeferredBootstrapPackets(host, release);
  }
  return connected;
}

export function refreshRelease1PrivateRoomScoreFrame(host: HabboV1PrivateRoomRuntimeHost, release: string): boolean {
  if (!release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  const marker = roomData?.marker;
  if (!marker || host.movie.getProperty("release1PrivateRoomMovieActive") !== true) {
    return false;
  }

  const refreshed = showRelease1PrivateRoomScoreFrame(host, marker, release);
  if (refreshed) {
    host.movie.setProperty("release1PrivateRoomPatternRefresh", {
      marker,
      source: [
        privateRoomFloorSource,
        privateRoomWallSource,
        "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv/casts/External/MovieScript 9 - Floors and Wallpapers.ls"
      ]
    });
    host.logDebug?.("room", "ok", `release1 refreshed private room score marker=${marker} after FLATPROPERTY`);
  }
  return refreshed;
}

function setRelease1PrivateRoomLoadingProgress(
  host: HabboV1PrivateRoomRuntimeHost,
  progress: number,
  release: string,
  sync = true
): void {
  setRoomLoaderProgressRuntime(host, progress, release, sync);
  syncRelease1EntryNavigatorRoomLoadProgress(host.movie);
}

function connectRelease1PrivateRoomFromScoreFrame(
  host: HabboV1PrivateRoomRuntimeHost,
  marker: string,
  release: string
): boolean {
  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  if (!roomData || roomData.type !== "private") {
    return false;
  }

  if (host.movie.getProperty("roomWirePhase") !== "awaiting-room-ready") {
    host.movie.setProperty("lastRoomReadyTransition", {
      release,
      marker,
      state: "ROOM_READY",
      accepted: false,
      reason: "wire-phase-mismatch",
      roomData,
      entryState: host.movie.getProperty("roomEntryState"),
      wirePhase: host.movie.getProperty("roomWirePhase")
    });
    return false;
  }

  const nextRoomData = { ...roomData, marker };
  host.objectManager.getObject(roomComponentId)?.set("saveData", nextRoomData);
  host.movie.setProperty("currentRoomData", nextRoomData);
  host.movie.setProperty("lastRoomReadyTransition", {
    release,
    marker,
    state: "ROOM_READY",
    accepted: true,
    step: "before-release1-score-room",
    roomData: nextRoomData,
    entryStateBeforeLeave: host.movie.getProperty("roomEntryState"),
    wirePhaseBeforeLeave: host.movie.getProperty("roomWirePhase")
  });

  leaveRoomRuntime(host, release, true);
  if (!showRelease1PrivateRoomScoreFrame(host, marker, release)) {
    host.movie.setProperty("lastRoomReadyTransition", {
      release,
      marker,
      state: "ROOM_READY",
      accepted: false,
      reason: "release1-score-room-failed",
      failure: host.movie.getProperty("lastRoomShowFailure"),
      entryState: host.movie.getProperty("roomEntryState"),
      wirePhase: host.movie.getProperty("roomWirePhase")
    });
    return false;
  }

  const processList = { passive: 0, Active: 0, users: 0, items: 0, heightmap: 0 };
  host.objectManager.getObject(roomComponentId)?.set("processList", processList);
  host.movie.setProperty("roomProcessList", processList);
  host.movie.setProperty("release1PrivateRoomMovieActive", true);
  setRelease1PrivateRoomLoadingProgress(host, 0.75, release, false);
  setRoomEntryStateRuntime(host, "waiting-bootstrap");
  setRoomWirePhaseRuntime(host, "awaiting-bootstrap");
  host.movie.setProperty("lastRoomReadyTransition", {
    release,
    marker,
    state: "ROOM_READY",
    accepted: true,
    step: "release1-score-room-ready",
    roomData: nextRoomData,
    entryState: host.movie.getProperty("roomEntryState"),
    wirePhase: host.movie.getProperty("roomWirePhase"),
    source: [privateRoomObjectsSource, privateRoomConfigurationSource, gfPrivateManifestPath]
  });
  host.logDebug?.("room", "ok", `release1 showRoom marker=${marker} source=gf_private score`);
  return true;
}

function showRelease1PrivateRoomScoreFrame(
  host: HabboV1PrivateRoomRuntimeHost,
  marker: string,
  release: string
): boolean {
  const manifest = getProjectorRaysManifestByRelease(gfPrivateManifestRelease);
  const markerFrame = (manifest?.score.markers ?? []).find((entry) => entry.name.toLowerCase() === marker.toLowerCase())?.frame;
  const frame = markerFrame !== undefined ? manifest?.score.frames.find((entry) => entry.index === markerFrame) : undefined;
  if (!manifest || markerFrame === undefined || !frame) {
    host.movie.setProperty("lastRoomShowFailure", {
      release,
      marker,
      reason: "release1-gf-private-marker-missing",
      source: gfPrivateManifestPath
    });
    host.recordUnsupportedOnce?.(`release1-private-room-score-marker-missing:${marker}`, {
      subsystem: "habbo",
      feature: "release1-private-room-score-marker-missing",
      detail: `${release} OBJECTS WORLD selected ${marker}, but the generated gf_private score manifest did not contain that marker`,
      source: privateRoomObjectsSource
    });
    return false;
  }

  const sprites: DirectorSpriteChannelManifest[] = [
    createRelease1RoomStageBackdropSprite(host)
  ];
  const visualElements: HabboWindowLayoutElement[] = [];
  const interactiveElements: HabboWindowInteractiveElement[] = [];
  const interactiveActions: Release1PrivateRoomInteractiveAction[] = [];
  const sourceButtons: Release1PrivateRoomSourceButton[] = [];
  const behaviorsByChannel = release1ScoreBehaviorsByChannel(manifest, markerFrame);
  const privateRoomPatterns = release1PrivateRoomPatterns(host);
  let culledOffstageCount = 0;
  let culledNonVisualCount = 0;
  const unresolved: Array<{ readonly channel: number; readonly castLib: number; readonly member: number; readonly castName?: string }> = [];
  for (const sourceSprite of frame.sprites) {
    const castName = sourceCastNameForSprite(manifest, sourceSprite.member.castLib);
    const sourceMemberName = sourceMemberNameForSprite(manifest, sourceSprite.member.castLib, sourceSprite.member.member);
    const sourceMember = sourceMemberForSprite(manifest, sourceSprite.member.castLib, sourceSprite.member.member);
    const targetCastName = castName === "Internal" ? "gf_private" : castName;
    const castLib = targetCastName ? currentCastLibForName(host, targetCastName) : undefined;
    if (castLib === undefined) {
      unresolved.push({
        channel: sourceSprite.channel,
        castLib: sourceSprite.member.castLib,
        member: sourceSprite.member.member,
        ...(castName ? { castName } : {})
      });
      continue;
    }

    const behaviors = behaviorsByChannel.get(sourceSprite.channel) ?? [];
    let sprite = applyRelease1ScoreBehaviorSpriteState({
      channel: 2000 + sourceSprite.channel,
      member: {
        castLib,
        member: sourceSprite.member.member
      },
      loc: sourceSprite.loc,
      ...release1ScoreSpriteSizeForRender(sourceSprite, sourceMember),
      ...(sourceSprite.visible !== undefined ? { visible: sourceSprite.visible } : {}),
      ...(sourceSprite.ink !== undefined ? { ink: sourceSprite.ink } : {}),
      ...(sourceSprite.blend !== undefined ? { blend: sourceSprite.blend } : {}),
      locZ: v1RoomScoreLocZBase + sourceSprite.channel,
      ...(sourceSprite.fgColor !== undefined ? { fgColor: sourceSprite.fgColor } : {}),
      ...(sourceSprite.bgColor !== undefined ? { bgColor: sourceSprite.bgColor } : {}),
      ...(sourceSprite.flipH === true ? { flipH: true } : {}),
      ...(sourceSprite.flipV === true ? { flipV: true } : {})
    }, behaviors);
    const interactive = sourceMemberName && sourceMember
      ? release1RuntimeInteractiveForScoreSprite(manifest, sourceSprite, sourceMember, sourceMemberName, behaviors)
      : undefined;
    const sourceButton = sourceMemberName && sourceMember
      ? release1RuntimeSourceButtonForScoreSprite(manifest, sourceSprite, sourceMember, sourceMemberName, behaviors)
      : undefined;
    if (sourceMemberName) {
      sprite = applyRelease1PrivateRoomPatternSprite(host, sprite, castLib, sourceMemberName, behaviors, privateRoomPatterns);
      const visualElement = release1RuntimeVisualElementForScoreSprite(sourceSprite, sourceMemberName, targetCastName, behaviors);
      if (visualElement) {
        visualElements.push(visualElement);
      }
    }
    if (interactive) {
      interactiveElements.push(interactive.element);
      interactiveActions.push(interactive.action);
    }
    if (sourceButton) {
      sourceButtons.push(sourceButton);
    }
    const renderDecision = release1ScoreSpriteRenderDecision(host.movie, sourceSprite, sourceMember, interactive !== undefined);
    if (!renderDecision.render) {
      if (renderDecision.reason === "offstage") {
        culledOffstageCount += 1;
      } else {
        culledNonVisualCount += 1;
      }
      continue;
    }
    sprites.push(sprite);
  }

  alignRelease1InfoTextSpriteToSourceBacking(host, manifest, frame, sprites);

  if (sprites.length === 0) {
    host.movie.setProperty("lastRoomShowFailure", {
      release,
      marker,
      reason: "release1-score-frame-no-resolved-sprites",
      source: gfPrivateManifestPath,
      unresolved
    });
    return false;
  }

  const runtimeVisual = {
    versionId: "release1",
    release: gfPrivateManifestRelease,
    sourceId: "projectorrays",
    castName: "gf_private",
    castOrder: 0,
    member: 0,
    memberChunkId: 0,
    memberName: `${marker}.score`,
    visualName: marker,
    textChunkPath: gfPrivateManifestPath,
    elementCount: sprites.length - 1,
    rect: [0, 0, 720, 540],
    bitmapReferences: [],
    unresolvedReferences: unresolved.map((entry) => ({
      elementIndex: entry.channel,
      memberName: entry.castName ?? `${entry.castLib}:${entry.member}`,
      media: "bitmap",
      reason: "source score cast member did not resolve into the active entry runtime"
    })),
    elements: visualElements,
    roomData: {
      factorx: 64,
      factory: 32,
      factorh: 18,
      offsetx: 311,
      offsety: 58,
      offsetz: v1RoomScoreLocZBase
    }
  };

  host.movie.setProperty("roomVisualOverlaySprites", sprites);
  host.movie.setProperty("currentRoomVisual", runtimeVisual);
  syncRelease1PrivateRoomFields(host);
  syncRelease1PrivateRoomInteractions(host, interactiveElements, interactiveActions);
  host.movie.setProperty("release1PrivateRoomSourceButtons", sourceButtons);
  host.movie.setProperty("roomVisuals", {
    release,
    visual: runtimeVisual.memberName,
    marker,
    spriteCount: sprites.length,
    sourceSpriteCount: frame.sprites.length,
    culledOffstageCount,
    culledNonVisualCount,
    sourceFrame: markerFrame,
    sourceMovie: gfPrivateManifestRelease,
    stageBackdrop: v1RoomStageBackdropCastName,
    unresolvedCount: unresolved.length,
    channels: sprites.map((sprite) => sprite.channel)
  });
  host.movie.setProperty("lastRoomShowFailure", undefined);
  host.syncDirectorOverlaySprites?.();
  return true;
}

function alignRelease1InfoTextSpriteToSourceBacking(
  host: HabboV1PrivateRoomRuntimeHost,
  manifest: DirectorMovieManifest,
  frame: DirectorFrameManifest,
  sprites: DirectorSpriteChannelManifest[]
): void {
  const sourceTextSprite = frame.sprites.find((sprite) =>
    sourceMemberNameForSprite(manifest, sprite.member.castLib, sprite.member.member)?.toLowerCase() === "item.info_text"
  );
  const sourceTextMember = sourceTextSprite
    ? sourceMemberForSprite(manifest, sourceTextSprite.member.castLib, sourceTextSprite.member.member)
    : undefined;
  const sourceBackingSprite = frame.sprites.find((sprite) =>
    sourceMemberNameForSprite(manifest, sprite.member.castLib, sprite.member.member)?.toLowerCase() === "itemname_bg"
  ) ?? frame.sprites.find((sprite) =>
    sourceMemberNameForSprite(manifest, sprite.member.castLib, sprite.member.member)?.toLowerCase() === "item.info_name"
  );
  const sourceBackingMember = sourceBackingSprite
    ? sourceMemberForSprite(manifest, sourceBackingSprite.member.castLib, sourceBackingSprite.member.member)
    : undefined;
  if (!sourceTextSprite || !sourceTextMember || !sourceBackingSprite || !sourceBackingMember) {
    return;
  }

  const runtimeChannel = 2000 + sourceTextSprite.channel;
  const spriteIndex = sprites.findIndex((sprite) => sprite.channel === runtimeChannel);
  if (spriteIndex < 0) {
    return;
  }

  const sprite = sprites[spriteIndex];
  if (!sprite) {
    return;
  }

  const sourceTextBounds = release1ScoreSpriteRenderBounds(sourceTextSprite, sourceTextMember);
  const sourceBackingBounds = release1ScoreSpriteRenderBounds(sourceBackingSprite, sourceBackingMember);
  const offsetX = Math.round((sourceBackingBounds.x + sourceBackingBounds.width) - (sourceTextBounds.x + sourceTextBounds.width));
  const runtimeMember = host.movie.cast.getMember(sprite.member);
  if (runtimeMember?.type === "field" || runtimeMember?.type === "text") {
    runtimeMember.setTextAlign("right");
  }
  host.movie.setProperty("release1PrivateRoomInfoTextPlacement", {
    textAlign: "right",
    offsetX,
    textChannel: sourceTextSprite.channel,
    backingChannel: sourceBackingSprite.channel,
    textMember: sourceTextMember.name,
    backingMember: sourceBackingMember.name,
    source: [privateRoomHiliterSource, gfPrivateManifestPath]
  });

  if (offsetX === 0) {
    return;
  }

  const alignedSprite: DirectorSpriteChannelManifest = {
    ...sprite,
    placementOffset: {
      x: (sprite.placementOffset?.x ?? 0) + offsetX,
      y: sprite.placementOffset?.y ?? 0
    }
  };
  sprites[spriteIndex] = alignedSprite;
}

function release1ScoreBehaviorsByChannel(
  manifest: DirectorMovieManifest,
  frameIndex: number
): Map<number, Release1ScoreBehavior[]> {
  const result = new Map<number, Release1ScoreBehavior[]>();
  for (const behavior of manifest.score.behaviors ?? []) {
    if (frameIndex < behavior.startFrame || frameIndex > behavior.endFrame) {
      continue;
    }

    const name = sourceMemberNameForSprite(manifest, behavior.script.castLib, behavior.script.member);
    if (!name) {
      continue;
    }

    const next: Release1ScoreBehavior = {
      name,
      properties: behavior.properties ?? {}
    };
    result.set(behavior.channel, [...(result.get(behavior.channel) ?? []), next]);
  }
  return result;
}

function release1ScoreSpriteSizeForRender(
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: DirectorMemberManifest | undefined
): Pick<DirectorSpriteChannelManifest, "width" | "height"> {
  if (sourceMember?.type === "bitmap") {
    return {};
  }

  return {
    ...(sourceSprite.width !== undefined ? { width: sourceSprite.width } : {}),
    ...(sourceSprite.height !== undefined ? { height: sourceSprite.height } : {})
  };
}

function release1ScoreSpriteRenderDecision(
  movie: DirectorMovie,
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: DirectorMemberManifest | undefined,
  hasInteractiveAction: boolean
): { readonly render: true } | { readonly render: false; readonly reason: "offstage" | "nonvisual" } {
  if (!sourceMember) {
    return { render: true };
  }

  if (!isVisualDirectorMemberType(sourceMember.type)) {
    return hasInteractiveAction ? { render: true } : { render: false, reason: "nonvisual" };
  }

  const bounds = release1ScoreSpriteRenderBounds(sourceSprite, sourceMember);
  if (!release1RectsIntersect(bounds, {
    x: 0,
    y: 0,
    width: movie.stage.width,
    height: movie.stage.height
  })) {
    return hasInteractiveAction ? { render: true } : { render: false, reason: "offstage" };
  }

  return { render: true };
}

function isVisualDirectorMemberType(type: DirectorMemberManifest["type"]): boolean {
  return type === "bitmap" || type === "shape" || type === "text" || type === "field";
}

function release1ScoreSpriteRenderBounds(
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: DirectorMemberManifest
): Release1Rect {
  const renderSize = release1ScoreSpriteSizeForRender(sourceSprite, sourceMember);
  const width = Math.max(1, Math.round(renderSize.width ?? sourceMember.width ?? sourceSprite.width ?? 1));
  const height = Math.max(1, Math.round(renderSize.height ?? sourceMember.height ?? sourceSprite.height ?? 1));
  if (sourceMember.type === "text" || sourceMember.type === "field") {
    return {
      x: Math.round(sourceSprite.loc.x),
      y: Math.round(sourceSprite.loc.y),
      width,
      height
    };
  }

  const sourceWidth = Math.max(1, Math.round(sourceMember.width ?? sourceSprite.width ?? width));
  const sourceHeight = Math.max(1, Math.round(sourceMember.height ?? sourceSprite.height ?? height));
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

function release1RectsIntersect(left: Release1Rect, right: Release1Rect): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function applyRelease1ScoreBehaviorSpriteState(
  sprite: DirectorSpriteChannelManifest,
  behaviors: readonly Release1ScoreBehavior[]
): DirectorSpriteChannelManifest {
  let next: DirectorSpriteChannelManifest = { ...sprite };
  const explicitLocZ = numberBehaviorProperty(behaviors, "ExplicitLocZ Behavior", "tlocz");
  if (explicitLocZ !== undefined) {
    next = { ...next, locZ: v1RoomScoreLocZBase + explicitLocZ };
  }

  const buttonBehavior = behaviors.find((behavior) => {
    const name = behavior.name.toLowerCase();
    return name === "ui button enablable" || name === "ui button enablable no hilite";
  });
  if (buttonBehavior && Number(buttonBehavior.properties.enabled ?? 1) === 0) {
    const disabledType = typeof buttonBehavior.properties.type === "string" ? buttonBehavior.properties.type.toLowerCase() : "";
    next = disabledType === "visible"
      ? { ...next, visible: false }
      : { ...next, blend: 30 };
  }

  if (behaviors.some((behavior) => behavior.name.toLowerCase() === "info icon")) {
    next = { ...next, visible: false };
  }

  if (behaviors.some((behavior) => behavior.name.toLowerCase() === "hiliter/one_room")) {
    next = { ...next, visible: false };
  }

  return next;
}

function release1RuntimeVisualElementForScoreSprite(
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMemberName: string,
  castName: string | undefined,
  behaviors: readonly Release1ScoreBehavior[]
): HabboWindowLayoutElement | undefined {
  if (!behaviors.some((behavior) => behavior.name.toLowerCase() === "hiliter/one_room") || !castName) {
    return undefined;
  }

  return {
    index: sourceSprite.channel,
    id: "hiliter",
    type: "hiliter",
    memberName: sourceMemberName,
    media: "bitmap",
    locH: sourceSprite.loc.x,
    locV: sourceSprite.loc.y,
    ...(sourceSprite.width !== undefined ? { width: sourceSprite.width } : {}),
    ...(sourceSprite.height !== undefined ? { height: sourceSprite.height } : {}),
    ...(sourceSprite.ink !== undefined ? { ink: sourceSprite.ink } : {}),
    ...(sourceSprite.blend !== undefined ? { blend: sourceSprite.blend } : {}),
    ...(sourceSprite.locZ !== undefined ? { locZ: sourceSprite.locZ } : {}),
    properties: {},
    resolvedMember: {
      castName,
      castOrder: 0,
      member: sourceSprite.member.member,
      memberChunkId: 0,
      memberName: sourceMemberName,
      memberType: "bitmap",
      memberChunkPath: gfPrivateManifestPath,
      memberChunkExists: true
    }
  };
}

function release1RuntimeInteractiveForScoreSprite(
  manifest: DirectorMovieManifest,
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: DirectorMemberManifest,
  sourceMemberName: string,
  behaviors: readonly Release1ScoreBehavior[]
): { readonly element: HabboWindowInteractiveElement; readonly action: Release1PrivateRoomInteractiveAction } | undefined {
  const behaviorNames = new Set(behaviors.map((behavior) => behavior.name.toLowerCase()));
  const bounds = sourceSpriteBounds(sourceSprite, sourceMember);
  const sourceBase = [gfPrivateManifestPath];
  if (behaviorNames.has("chattextinput behavior")) {
    const id = "chat_field";
    return {
      element: {
        id,
        windowId: "Room",
        kind: "field",
        ...bounds,
        height: Math.max(18, bounds.height),
        editable: true,
        fontSize: 9,
        textAlign: "left",
        renderValue: true,
        clientId: "chatTextInput behavior"
      },
      action: {
        id,
        channel: sourceSprite.channel,
        kind: "chat-field",
        source: [privateRoomChatInputSource, ...sourceBase],
        bounds: {
          ...bounds,
          height: Math.max(18, bounds.height)
        }
      }
    };
  }

  const chatPopupBehavior = behaviors.find((behavior) => behavior.name.toLowerCase() === "b_chatmode_popup");
  if (chatPopupBehavior) {
    const props = release1ChatModePopupProps(chatPopupBehavior.properties, bounds.height);
    const openBounds = {
      x: bounds.x,
      y: bounds.y + bounds.height - props.openHeight,
      width: bounds.width,
      height: props.openHeight
    };
    const id = "int_speechmode_dropmenu";
    return {
      element: {
        id,
        windowId: "Room",
        kind: "dropmenu",
        ...bounds,
        cursor: "cursor.finger",
        clientId: "b_chatMode_popup"
      },
      action: {
        id,
        channel: sourceSprite.channel,
        kind: "chat-mode-popup",
        event: "mouseDown",
        source: [privateRoomChatModePopupSource, ...sourceBase],
        bounds,
        openBounds,
        chatModeProps: props
      }
    };
  }

  if (behaviorNames.has("open hand")) {
    const id = `release1_room_open_hand_${sourceSprite.channel}`;
    return release1PrivateRoomLinkAction(id, "open-hand", "mouseUp", sourceSprite.channel, bounds, "Open Hand", sourceMemberName, [privateRoomOpenHandSource, ...sourceBase]);
  }

  const catalogBehavior = behaviors.find((behavior) => behavior.name.toLowerCase() === "open catalog");
  if (catalogBehavior) {
    const id = `release1_room_open_catalog_${sourceSprite.channel}`;
    const result = release1PrivateRoomLinkAction(id, "open-catalog", "mouseDown", sourceSprite.channel, bounds, "Open Catalog", sourceMemberName, [privateRoomOpenCatalogSource, ...sourceBase]);
    return {
      element: result.element,
      action: {
        ...result.action,
        catalogName: typeof catalogBehavior.properties.catName === "string" ? catalogBehavior.properties.catName : "basicA"
      }
    };
  }

  if (behaviorNames.has("opennavigator")) {
    return release1PrivateRoomLinkAction(
      `release1_open_navigator_room_${sourceSprite.channel}`,
      "open-toolbar",
      "mouseUp",
      sourceSprite.channel,
      bounds,
      "Open Navigator",
      sourceMemberName,
      [privateRoomOpenNavigatorSource, ...sourceBase]
    );
  }

  if (behaviorNames.has("open messenger")) {
    return release1PrivateRoomLinkAction(
      `release1_open_messenger_room_${sourceSprite.channel}`,
      "open-toolbar",
      "mouseUp",
      sourceSprite.channel,
      bounds,
      "Open Messenger",
      sourceMemberName,
      [privateRoomOpenMessengerSource, ...sourceBase]
    );
  }

  if (behaviorNames.has("openpurse")) {
    return release1PrivateRoomLinkAction(
      `release1_open_purse_room_${sourceSprite.channel}`,
      "open-toolbar",
      "mouseUp",
      sourceSprite.channel,
      bounds,
      "Open Purse",
      sourceMemberName,
      [privateRoomOpenPurseSource, ...sourceBase]
    );
  }

  if (behaviorNames.has("openhelp")) {
    return release1PrivateRoomLinkAction(
      `release1_open_help_room_${sourceSprite.channel}`,
      "open-toolbar",
      "mouseUp",
      sourceSprite.channel,
      bounds,
      "Open Help",
      sourceMemberName,
      [privateRoomOpenHelpSource, ...sourceBase]
    );
  }

  const sourceButton = release1RuntimeSourceButtonForScoreSprite(manifest, sourceSprite, sourceMember, sourceMemberName, behaviors);
  if (sourceButton) {
    const result = release1PrivateRoomLinkAction(
      sourceButton.id,
      "source-button",
      sourceButton.event,
      sourceSprite.channel,
      sourceButton.bounds,
      sourceButton.buttonType,
      sourceMemberName,
      sourceButton.source
    );
    return {
      element: result.element,
      action: {
        ...result.action,
        buttonType: sourceButton.buttonType,
        ...(sourceButton.rotateChange !== undefined ? { rotateChange: sourceButton.rotateChange } : {}),
        ...(sourceButton.rotateStepMode ? { rotateStepMode: sourceButton.rotateStepMode } : {})
      }
    };
  }

  return undefined;
}

function release1RuntimeSourceButtonForScoreSprite(
  manifest: DirectorMovieManifest,
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMember: DirectorMemberManifest,
  sourceMemberName: string,
  behaviors: readonly Release1ScoreBehavior[]
): Release1PrivateRoomSourceButton | undefined {
  const buttonBehavior = behaviors.find((behavior) => {
    const name = behavior.name.toLowerCase();
    return name === "ui button enablable" || name === "ui button enablable no hilite";
  });
  const rawButtonType = buttonBehavior?.properties.buttonType;
  const buttonType = typeof rawButtonType === "string" ? rawButtonType.trim() : "";
  if (!buttonBehavior || buttonType.length === 0) {
    return undefined;
  }

  const event = release1SourceButtonEventForBehaviors(behaviors);
  if (!event) {
    return undefined;
  }

  const bounds = sourceSpriteBounds(sourceSprite, sourceMember);
  const pressedMemberName = release1SourceButtonPressedMemberName(manifest, sourceSprite, sourceMemberName);
  const rotateChange = numberBehaviorProperty(behaviors, "Rotate Item", "direction");
  return {
    id: `release1_room_button_${buttonType.toLowerCase()}_${sourceSprite.channel}`,
    channel: sourceSprite.channel,
    buttonType,
    event,
    sourceMemberName,
    ...(pressedMemberName ? { pressedMemberName } : {}),
    ...(rotateChange !== undefined ? { rotateChange, rotateStepMode: "repeat-change" as const } : {}),
    disabledMode: String(buttonBehavior.properties.type ?? "").toLowerCase() === "visible" ? "hidden" : "dimmed",
    bounds,
    source: [privateRoomButtonSource, gfPrivateManifestPath]
  };
}

function release1SourceButtonEventForBehaviors(behaviors: readonly Release1ScoreBehavior[]): "mouseDown" | "mouseUp" | undefined {
  const behaviorNames = new Set(behaviors.map((behavior) => behavior.name.toLowerCase()));
  if (behaviorNames.has("move item bhv")
    || behaviorNames.has("take item to pocket bhv")
    || behaviorNames.has("trash item")
    || behaviorNames.has("dance behavior")) {
    return "mouseUp";
  }

  if (behaviorNames.has("rotate item")
    || behaviorNames.has("kick user out")
    || behaviorNames.has("assign / remove rights")) {
    return "mouseDown";
  }

  return undefined;
}

function release1SourceButtonPressedMemberName(
  manifest: DirectorMovieManifest,
  sourceSprite: DirectorSpriteChannelManifest,
  sourceMemberName: string
): string | undefined {
  const nextMember = sourceMemberForSprite(manifest, sourceSprite.member.castLib, sourceSprite.member.member + 1);
  if (nextMember?.name && release1LooksLikePressedButtonMember(sourceMemberName, nextMember.name)) {
    return nextMember.name;
  }

  return undefined;
}

function release1LooksLikePressedButtonMember(sourceMemberName: string, candidate: string): boolean {
  const source = sourceMemberName.toLowerCase();
  const pressed = candidate.toLowerCase();
  return pressed === `${source}_hilite`
    || pressed === `${source}hi`
    || pressed === `${source} hi`
    || pressed.endsWith("_hilite")
    || pressed.endsWith(" hi");
}

function release1PrivateRoomLinkAction(
  id: string,
  kind: Release1PrivateRoomInteractiveAction["kind"],
  event: "mouseDown" | "mouseUp",
  channel: number,
  bounds: Release1Rect,
  label: string,
  clientId: string,
  source: readonly string[]
): { readonly element: HabboWindowInteractiveElement; readonly action: Release1PrivateRoomInteractiveAction } {
  return {
    element: {
      id,
      windowId: "Room",
      kind: "link",
      ...bounds,
      label,
      cursor: "cursor.finger",
      clientId
    },
    action: {
      id,
      channel,
      kind,
      event,
      source,
      bounds
    }
  };
}

function sourceSpriteBounds(sourceSprite: DirectorSpriteChannelManifest, sourceMember: DirectorMemberManifest): Release1Rect {
  const renderSize = release1ScoreSpriteSizeForRender(sourceSprite, sourceMember);
  const width = Math.max(1, Math.round(renderSize.width ?? sourceMember.width ?? sourceSprite.width ?? 1));
  const height = Math.max(1, Math.round(renderSize.height ?? sourceMember.height ?? sourceSprite.height ?? 1));
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
  const effectiveRegX = sourceSprite.flipH ? width - regX : regX;
  const effectiveRegY = sourceSprite.flipV ? height - regY : regY;
  return {
    x: Math.round(sourceSprite.loc.x - effectiveRegX),
    y: Math.round(sourceSprite.loc.y - effectiveRegY),
    width,
    height
  };
}

function release1ChatModePopupProps(properties: Readonly<Record<string, unknown>>, closedHeight: number): Release1ChatModePopupProps {
  return {
    openHeight: Math.max(closedHeight, Math.round(numberFromUnknown(properties.pOpenHeight, closedHeight) ?? closedHeight)),
    topMargin: Math.max(0, Math.round(numberFromUnknown(properties.pTopMargin, 0) ?? 0)),
    bottomMargin: Math.max(0, Math.round(numberFromUnknown(properties.pBotMargin, 0) ?? 0)),
    selections: Math.max(1, Math.round(numberFromUnknown(properties.pSelections, 3) ?? 3)),
    defaultChatMode: Math.max(1, Math.round(numberFromUnknown(properties.pChatmode, 1) ?? 1))
  };
}

function applyRelease1PrivateRoomPatternSprite(
  host: HabboV1PrivateRoomRuntimeHost,
  sprite: DirectorSpriteChannelManifest,
  castLib: number,
  sourceMemberName: string,
  behaviors: readonly Release1ScoreBehavior[],
  privateRoomPatterns: HabboPrivateRoomPatterns
): DirectorSpriteChannelManifest {
  if (behaviors.some((behavior) => behavior.name.toLowerCase() === "privateRoom Floor".toLowerCase())) {
    return applyRelease1FloorPatternSprite(host, sprite, castLib, sourceMemberName, privateRoomPatterns.floor);
  }

  const wallBehavior = behaviors.find((behavior) => behavior.name.toLowerCase() === "privateRoom Wall".toLowerCase());
  if (wallBehavior) {
    return applyRelease1WallPatternSprite(host, sprite, castLib, sourceMemberName, wallBehavior, privateRoomPatterns.wall);
  }

  return sprite;
}

function applyRelease1FloorPatternSprite(
  host: HabboV1PrivateRoomRuntimeHost,
  sprite: DirectorSpriteChannelManifest,
  castLib: number,
  sourceMemberName: string,
  pattern: HabboRoomPattern | undefined
): DirectorSpriteChannelManifest {
  if (!pattern) {
    return sprite;
  }

  const replacement = resolvePrivateRoomFloorMemberName(sourceMemberName, pattern);
  const replacementMember = replacement ? host.movie.cast.getMemberByName(replacement, castLib) ?? host.movie.cast.getMemberByName(replacement) : undefined;
  return {
    ...sprite,
    ...(replacementMember ? { member: replacementMember.ref() } : {}),
    ink: 41,
    bgColor: pattern.color
  };
}

function applyRelease1WallPatternSprite(
  host: HabboV1PrivateRoomRuntimeHost,
  sprite: DirectorSpriteChannelManifest,
  castLib: number,
  sourceMemberName: string,
  behavior: Release1ScoreBehavior,
  pattern: HabboRoomPattern | undefined
): DirectorSpriteChannelManifest {
  if (!pattern) {
    return sprite;
  }

  const replacement = resolvePrivateRoomWallMemberName(sourceMemberName, pattern);
  const replacementMember = replacement ? host.movie.cast.getMemberByName(replacement, castLib) ?? host.movie.cast.getMemberByName(replacement) : undefined;
  const brightness = numberFromUnknown(behavior.properties.brightness, 1) ?? 1;
  return {
    ...sprite,
    ...(replacementMember ? { member: replacementMember.ref() } : {}),
    ink: 41,
    bgColor: applyRelease1ColorBrightness(pattern.color, brightness)
  };
}

function syncRelease1PrivateRoomFields(host: HabboV1PrivateRoomRuntimeHost): void {
  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  if (roomData) {
    setAllTextMembersByName(
      host.movie,
      "room.info",
      `${release1FieldText(host.movie, "Room", "Room:")} ${roomData.name}\r${release1FieldText(host.movie, "Owner", "Owner:")} ${roomData.owner ?? ""}`
    );
  }

  for (const memberName of ["item.info_name", "item.info_text", "helpbox", "texttypefield"]) {
    setAllTextMembersByName(host.movie, memberName, "");
  }
  host.movie.setProperty("release1PrivateRoomFieldSync", {
    source: [privateRoomBootstrapTextSource, privateRoomButtonSource]
  });
}

function syncRelease1PrivateRoomInteractions(
  host: HabboV1PrivateRoomRuntimeHost,
  interactiveElements: readonly HabboWindowInteractiveElement[],
  interactiveActions: readonly Release1PrivateRoomInteractiveAction[]
): void {
  const current = host.movie.getProperty("windowInteractiveElements");
  const existing = Array.isArray(current) ? current.filter(isWindowInteractiveElement) : [];
  const withoutPrivateRoomElements = existing.filter((element) => !isRelease1PrivateRoomInteractiveElement(element));
  const elements = interactiveElements.map((element) => release1PrivateRoomElementWithCurrentEnabledState(host, element, interactiveActions));
  host.movie.setProperty("windowInteractiveElements", [
    ...withoutPrivateRoomElements,
    ...elements
  ]);
  host.movie.setProperty("directorRoomInteractiveElements", elements);
  host.movie.setProperty("release1PrivateRoomInteractiveActions", interactiveActions);
  host.movie.setProperty("release1PrivateRoomChatPopupOpen", false);
  host.movie.setProperty("release1PrivateRoomInteractionSync", {
    source: [
      privateRoomChatInputSource,
      privateRoomChatModePopupSource,
      privateRoomOpenHandSource,
      privateRoomOpenCatalogSource,
      privateRoomOpenNavigatorSource,
      privateRoomOpenMessengerSource,
      privateRoomOpenPurseSource,
      privateRoomOpenHelpSource
    ],
    interactiveCount: interactiveElements.length
  });
  reapplyRelease1SelectedPrivateRoomUserActions(host);
}

function release1PrivateRoomElementWithCurrentEnabledState(
  host: HabboV1PrivateRoomRuntimeHost,
  element: HabboWindowInteractiveElement,
  actions: readonly Release1PrivateRoomInteractiveAction[]
): HabboWindowInteractiveElement {
  const action = actions.find((candidate) => candidate.id === element.id);
  if (action?.kind !== "source-button" || !action.buttonType) {
    return element;
  }

  return {
    ...element,
    enabled: isRelease1PrivateRoomSourceButtonEnabled(host, action.buttonType)
  };
}

function reapplyRelease1SelectedPrivateRoomUserActions(host: HabboV1PrivateRoomRuntimeHost): void {
  const selected = readRelease1PrivateRoomSelectedUser(host);
  if (!selected) {
    return;
  }

  applyRelease1SelectedPrivateRoomUserActions(host, selected);
}

function applyRelease1SelectedPrivateRoomUserActions(host: HabboV1PrivateRoomRuntimeHost, user: HabboRoomUserRecord): void {
  const context = release1SelectedPrivateRoomUserActionContext(host, user);
  if (context.selectedIsOwnUser) {
    setRelease1PrivateRoomSourceButtonEnabled(host, "Dance", true);
    showRelease1SelectedPrivateRoomWaveButton(host);
    return;
  }

  setRelease1PrivateRoomSourceButtonEnabled(host, "Dance", false);
  if (context.roomController) {
    setRelease1PrivateRoomSourceButtonEnabled(host, "killuser", true);
    setRelease1PrivateRoomSourceButtonEnabled(host, "userrights", true, "enablerights_btn");
  }
}

function release1SelectedPrivateRoomUserActionContext(
  host: HabboV1PrivateRoomRuntimeHost,
  user: HabboRoomUserRecord
): { readonly selectedIsOwnUser: boolean; readonly roomController: boolean } {
  const session = host.objectManager.getObject(sessionObjectId);
  const ownNames = release1OwnUserNameCandidates(host);
  const ownUserId = stringFromObject(session, "user_index");
  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  const selectedFlat = coerceRecord(coerceRecord(host.movie.getProperty("release1EntryNavigatorSelectedFlat")).flat);
  const ownerName = roomData?.owner ?? String(selectedFlat.owner ?? "");
  const normalizedUserName = normalizeRelease1UserName(user.name);
  const selectedIsOwnUser = ownNames.some((ownName) => normalizeRelease1UserName(ownName) === normalizedUserName)
    || (ownUserId.length > 0 && user.id === ownUserId)
    || (Number(session?.get("room_owner") ?? 0) !== 0 && normalizeRelease1UserName(ownerName) === normalizeRelease1UserName(user.name))
    || (ownNames.length === 0 && ownUserId.length === 0 && release1PrivateRoomHasSingleUser(host) && normalizeRelease1UserName(ownerName) === normalizeRelease1UserName(user.name));
  return {
    selectedIsOwnUser,
    roomController: Number(session?.get("room_controller") ?? 0) !== 0
  };
}

function release1OwnUserNameCandidates(host: HabboV1PrivateRoomRuntimeHost): readonly string[] {
  const session = host.objectManager.getObject(sessionObjectId);
  const sources = [
    stringFromObject(session, "userName"),
    stringFromObject(session, "user_name"),
    String(coerceRecord(host.movie.getProperty("lastLoginAttempt")).userName ?? ""),
    String(coerceRecord(host.movie.getProperty("release1EntryEpLogin")).username ?? ""),
    String(coerceRecord(host.movie.getProperty("release1EntryPostRegisterLogin")).username ?? ""),
    String(coerceRecord(host.movie.getProperty("lastUserObject")).name ?? "")
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const source of sources) {
    const trimmed = source.trim();
    const normalized = normalizeRelease1UserName(trimmed);
    if (!trimmed || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(trimmed);
  }
  return result;
}

function setAllTextMembersByName(movie: DirectorMovie, memberName: string, text: string): number {
  let changed = 0;
  for (const castLib of movie.cast.castLibs) {
    for (const member of castLib.members) {
      if (member.name?.toLowerCase() !== memberName.toLowerCase() || (member.type !== "text" && member.type !== "field")) {
        continue;
      }

      member.setText(text);
      changed += 1;
    }
  }
  if (changed === 0) {
    setMemberTextByName(movie, memberName, text);
  }
  return changed;
}

function isRelease1PrivateRoomInteractiveElement(element: HabboWindowInteractiveElement): boolean {
  return element.id === "chat_field"
    || element.id === "int_speechmode_dropmenu"
    || element.id.startsWith("release1_room_")
    || element.id.startsWith("release1_open_navigator_room_")
    || element.id.startsWith("release1_open_messenger_room_")
    || element.id.startsWith("release1_open_purse_room_")
    || element.id.startsWith("release1_open_help_room_");
}

function release1PrivateRoomPatterns(host: HabboV1PrivateRoomRuntimeHost): HabboPrivateRoomPatterns {
  const getPrivateRoomPatterns = host.getPrivateRoomPatterns;
  if (typeof getPrivateRoomPatterns !== "function") {
    return {};
  }

  const patterns = getPrivateRoomPatterns.call(host);
  return coerceRecord(patterns) as unknown as HabboPrivateRoomPatterns;
}

function sourceMemberNameForSprite(manifest: DirectorMovieManifest, castLib: number, member: number): string | undefined {
  return manifest.casts.find((cast) => cast.number === castLib)?.members.find((entry) => entry.number === member)?.name;
}

function sourceMemberForSprite(manifest: DirectorMovieManifest, castLib: number, member: number): DirectorMemberManifest | undefined {
  return manifest.casts.find((cast) => cast.number === castLib)?.members.find((entry) => entry.number === member);
}

function numberBehaviorProperty(
  behaviors: readonly Release1ScoreBehavior[],
  behaviorName: string,
  propertyName: string
): number | undefined {
  const value = behaviors.find((behavior) => behavior.name.toLowerCase() === behaviorName.toLowerCase())?.properties[propertyName];
  return numberFromUnknown(value);
}

function numberFromUnknown(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function applyRelease1ColorBrightness(color: string, brightness: number): string {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match?.[1] || !match[2] || !match[3]) {
    return color;
  }

  return rgbToHex(
    Math.round(Number.parseInt(match[1], 16) * brightness),
    Math.round(Number.parseInt(match[2], 16) * brightness),
    Math.round(Number.parseInt(match[3], 16) * brightness)
  );
}

function isWindowInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  const record = coerceRecord(value);
  return typeof record.id === "string"
    && typeof record.windowId === "string"
    && typeof record.kind === "string"
    && typeof record.x === "number"
    && typeof record.y === "number"
    && typeof record.width === "number"
    && typeof record.height === "number";
}

function readRelease1PrivateRoomInteractiveActions(movie: DirectorMovie): readonly Release1PrivateRoomInteractiveAction[] {
  const value = movie.getProperty("release1PrivateRoomInteractiveActions");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRelease1PrivateRoomInteractiveAction);
}

function isRelease1PrivateRoomInteractiveAction(value: unknown): value is Release1PrivateRoomInteractiveAction {
  const record = coerceRecord(value);
  return typeof record.id === "string"
    && typeof record.channel === "number"
    && typeof record.kind === "string"
    && (record.rotateChange === undefined || typeof record.rotateChange === "number")
    && (record.rotateStepMode === undefined || record.rotateStepMode === "repeat-change")
    && isRelease1Rect(record.bounds);
}

function isRelease1Rect(value: unknown): value is Release1Rect {
  const record = coerceRecord(value);
  return typeof record.x === "number"
    && typeof record.y === "number"
    && typeof record.width === "number"
    && typeof record.height === "number";
}

function activateRelease1PrivateRoomChatModePopup(
  host: HabboV1PrivateRoomRuntimeHost,
  action: Release1PrivateRoomInteractiveAction,
  activation: { readonly localY?: number } | undefined,
  release: string
): boolean {
  const isOpen = host.movie.getProperty("release1PrivateRoomChatPopupOpen") === true;
  if (!isOpen) {
    host.movie.setProperty("release1PrivateRoomChatPopupOpen", true);
    setRelease1PrivateRoomScoreSpriteMember(host, action.channel, "speakmode_fi_3");
    updateRelease1PrivateRoomInteractiveBounds(host.movie, action.id, action.openBounds ?? action.bounds);
    host.movie.setProperty("dropMenuOpenId", action.id);
    host.movie.setProperty("lastDropMenuAction", {
      elementId: action.id,
      action: "open",
      source: action.source
    });
    host.syncDirectorOverlaySprites?.();
    host.logDebug?.("room", "info", "release1 chat mode popup opened", { source: privateRoomChatModePopupSource });
    return true;
  }

  const chatMode = release1PrivateRoomChatModeFromPopupY(action.chatModeProps, activation?.localY);
  setRelease1PrivateRoomChatMode(host, chatMode, release, action.source);
  host.movie.setProperty("release1PrivateRoomChatPopupOpen", false);
  host.movie.setProperty("dropMenuOpenId", "");
  setRelease1PrivateRoomScoreSpriteMember(host, action.channel, `speakmode_fi_${chatMode}`);
  updateRelease1PrivateRoomInteractiveBounds(host.movie, action.id, action.bounds);
  host.movie.setProperty("lastDropMenuAction", {
    elementId: action.id,
    action: "select",
    selectedKey: release1ChatModeKey(chatMode),
    selectedIndex: chatMode,
    source: action.source
  });
  host.syncDirectorOverlaySprites?.();
  host.syncWindowSpriteChannels?.(release);
  host.logDebug?.("room", "info", `release1 chat mode popup selected ${release1ChatModeKey(chatMode)}`, { source: privateRoomChatModePopupSource });
  return true;
}

function release1PrivateRoomChatModeFromPopupY(props: Release1ChatModePopupProps | undefined, localY: number | undefined): number {
  const popupProps = props ?? {
    openHeight: 56,
    topMargin: 3,
    bottomMargin: 3,
    selections: 3,
    defaultChatMode: 1
  };
  if (localY === undefined || !Number.isFinite(localY)) {
    return popupProps.defaultChatMode;
  }

  const selectionHeight = (popupProps.openHeight - popupProps.topMargin - popupProps.bottomMargin) / popupProps.selections;
  if (localY > popupProps.topMargin && localY <= popupProps.topMargin + selectionHeight) {
    return 3;
  }
  if (localY > popupProps.topMargin + selectionHeight && localY <= popupProps.topMargin + selectionHeight * 2) {
    return 2;
  }
  if (localY > popupProps.topMargin + selectionHeight * 2 && localY <= popupProps.openHeight) {
    return 1;
  }
  return popupProps.defaultChatMode;
}

function setRelease1PrivateRoomChatMode(
  host: HabboV1PrivateRoomRuntimeHost,
  chatMode: number,
  release: string,
  source: readonly string[]
): void {
  const mode = chatMode === 3 ? "WHISPER" : chatMode === 2 ? "SHOUT" : "CHAT";
  const component = host.objectManager.getObject(roomComponentId);
  component?.set("chatProps", {
    ...coerceRecord(component.get("chatProps")),
    mode
  });
  host.movie.setProperty("roomChatMode", mode);
  host.movie.setProperty("release1PrivateRoomChatMode", {
    gChatMode: chatMode,
    mode,
    source
  });
}

function release1ChatModeKey(chatMode: number): string {
  return chatMode === 3 ? "whisper" : chatMode === 2 ? "shout" : "say";
}

function activateRelease1PrivateRoomSourceButton(
  host: HabboV1PrivateRoomRuntimeHost,
  action: Release1PrivateRoomInteractiveAction,
  release: string
): boolean {
  const buttonType = action.buttonType ?? "";
  if (!buttonType || !isRelease1PrivateRoomSourceButtonEnabled(host, buttonType)) {
    return false;
  }

  const objectAction = release1PrivateRoomObjectButtonElementId(buttonType);
  if (objectAction) {
    const object = readRelease1PrivateRoomSelectedObject(host);
    if (!object) {
      return false;
    }

    const handled = host.activateRoomFurniInterfaceElement?.(objectAction, object, release, {
      ...(action.rotateChange !== undefined
        ? {
            rotate: {
              change: action.rotateChange,
              stepMode: action.rotateStepMode ?? "repeat-change",
              source: privateRoomRotateButtonSource
            }
          }
        : {})
    }) === true;
    host.logDebug?.("room", handled ? "info" : "warn", `release1 ${buttonType} button object=${object.id}`);
    return handled;
  }

  const selected = readRelease1PrivateRoomSelectedUser(host);
  if (buttonType.toLowerCase() === "dance") {
    if (!selected) {
      return false;
    }
    if (hasRoomUserAction(selected, "dance")) {
      host.queueRoomRequest?.({ command: "STOP", action: "Dance" }, release);
    } else {
      host.queueRoomRequest?.({ command: "STOP", action: "CarryDrink" }, release);
      host.queueRoomRequest?.({ command: "DANCE" }, release);
    }
    host.logDebug?.("room", "info", "release1 Dance button queued source action");
    return true;
  }

  if (buttonType.toLowerCase() === "wave") {
    if (!selected) {
      return false;
    }
    if (hasRoomUserAction(selected, "dance")) {
      host.queueRoomRequest?.({ command: "STOP", action: "Dance" }, release);
    }
    host.queueRoomRequest?.({ command: "WAVE" }, release);
    host.logDebug?.("room", "info", "release1 Wave button queued source action");
    return true;
  }

  if (buttonType.toLowerCase() === "killuser") {
    if (!selected) {
      return false;
    }
    host.queueRoomRequest?.({ command: "KILLUSER", userName: selected.name }, release);
    host.logDebug?.("room", "info", `release1 Kick User button user=${selected.name}`);
    return true;
  }

  if (buttonType.toLowerCase() === "userrights") {
    if (!selected) {
      return false;
    }
    host.queueRoomRequest?.({ command: "ASSIGNRIGHTS", userName: selected.name }, release);
    host.logDebug?.("room", "info", `release1 Assign Rights button user=${selected.name}`);
    return true;
  }

  return false;
}

function release1PrivateRoomObjectButtonElementId(buttonType: string): string | undefined {
  switch (buttonType.toLowerCase()) {
    case "movestuff":
      return "move.button";
    case "rotatestuff":
      return "rotate.button";
    case "pickstuff":
      return "pick.button";
    case "removestuff":
      return "delete.button";
    default:
      return undefined;
  }
}

function release1PrivateRoomEmptyInfoFields(host: HabboV1PrivateRoomRuntimeHost): void {
  setAllTextMembersByName(host.movie, "item.info_name", "");
  setAllTextMembersByName(host.movie, "item.info_text", "");
  clearRelease1SelectedPrivateRoomUserSprites(host);
  clearRelease1SelectedPrivateRoomObjectPreview(host);
  host.movie.setProperty("release1PrivateRoomSelectedUser", undefined);
  host.movie.setProperty("release1PrivateRoomSelectedObject", undefined);
  for (const button of readRelease1PrivateRoomSourceButtons(host.movie)) {
    setRelease1PrivateRoomSourceButtonEnabled(host, button.buttonType, false);
  }
}

function setRelease1PrivateRoomSourceButtonEnabled(
  host: HabboV1PrivateRoomRuntimeHost,
  buttonType: string,
  enabled: boolean,
  replacementMemberName?: string
): void {
  const normalizedType = buttonType.toLowerCase();
  const buttons = readRelease1PrivateRoomSourceButtons(host.movie)
    .filter((button) => button.buttonType.toLowerCase() === normalizedType);
  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (!Array.isArray(current) || buttons.length === 0) {
    return;
  }

  const buttonChannels = new Set(buttons.map((button) => 2000 + button.channel));
  host.movie.setProperty("roomVisualOverlaySprites", current.map((entry) => {
    if (!isDirectorSpriteChannelManifest(entry) || !buttonChannels.has(entry.channel)) {
      return entry;
    }

    const sourceButton = buttons.find((button) => 2000 + button.channel === entry.channel);
    if (!sourceButton) {
      return entry;
    }

    const memberName = enabled ? (replacementMemberName ?? sourceButton.sourceMemberName) : sourceButton.sourceMemberName;
    const replacement = host.movie.cast.getMemberByName(memberName, entry.member.castLib) ?? host.movie.cast.getMemberByName(memberName);
    return {
      ...entry,
      ...(replacement ? { member: replacement.ref() } : {}),
      ...(sourceButton.disabledMode === "hidden" ? { visible: enabled } : {}),
      ...(sourceButton.disabledMode === "dimmed" ? { blend: enabled ? 100 : 30 } : {})
    };
  }));
  host.movie.setProperty("release1PrivateRoomEnabledSourceButtons", {
    ...coerceRecord(host.movie.getProperty("release1PrivateRoomEnabledSourceButtons")),
    [normalizedType]: enabled
  });
  for (const button of buttons) {
    updateRelease1PrivateRoomInteractiveEnabled(host.movie, button.id, enabled);
  }
}

function updateRelease1PrivateRoomInteractiveEnabled(movie: DirectorMovie, elementId: string, enabled: boolean): void {
  updateRelease1PrivateRoomInteractiveEnabledProperty(movie, "windowInteractiveElements", elementId, enabled);
  updateRelease1PrivateRoomInteractiveEnabledProperty(movie, "directorRoomInteractiveElements", elementId, enabled);
}

function updateRelease1PrivateRoomInteractiveEnabledProperty(
  movie: DirectorMovie,
  propertyName: string,
  elementId: string,
  enabled: boolean
): void {
  const current = movie.getProperty(propertyName);
  if (!Array.isArray(current)) {
    return;
  }

  movie.setProperty(propertyName, current.map((entry) => {
    if (!isWindowInteractiveElement(entry) || entry.id !== elementId) {
      return entry;
    }

    return {
      ...entry,
      enabled
    };
  }));
}

function updateRelease1PrivateRoomSourceButtonPressed(
  host: HabboV1PrivateRoomRuntimeHost,
  action: Release1PrivateRoomInteractiveAction,
  pressed: boolean
): boolean {
  const button = readRelease1PrivateRoomSourceButtons(host.movie).find((candidate) => candidate.id === action.id);
  const pressedMemberName = button?.pressedMemberName;
  if (!button || !pressedMemberName || !isRelease1PrivateRoomSourceButtonEnabled(host, button.buttonType)) {
    return false;
  }

  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (!Array.isArray(current)) {
    return false;
  }

  const channel = 2000 + button.channel;
  const changed = current.map((entry) => {
    if (!isDirectorSpriteChannelManifest(entry) || entry.channel !== channel) {
      return entry;
    }

    const memberName = pressed ? pressedMemberName : button.sourceMemberName;
    const replacement = host.movie.cast.getMemberByName(memberName, entry.member.castLib) ?? host.movie.cast.getMemberByName(memberName);
    if (!replacement) {
      return entry;
    }

    return {
      ...entry,
      member: replacement.ref()
    };
  });

  host.movie.setProperty("roomVisualOverlaySprites", changed);
  host.syncDirectorOverlaySprites?.();
  return true;
}

function normalizeRelease1InfostandText(value: string): string {
  return value.replace(/[\s\u0000]+$/g, "");
}

function isRelease1PrivateRoomSourceButtonEnabled(host: HabboV1PrivateRoomRuntimeHost, buttonType: string): boolean {
  const state = coerceRecord(host.movie.getProperty("release1PrivateRoomEnabledSourceButtons"));
  return state[buttonType.toLowerCase()] === true;
}

function readRelease1PrivateRoomSelectedUser(host: HabboV1PrivateRoomRuntimeHost): HabboRoomUserRecord | undefined {
  const selectedId = String(host.movie.getProperty("selectedRoomObjectId") ?? "");
  const users = coerceRecord(host.objectManager.getObject(roomComponentId)?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
  return users[selectedId] ?? Object.values(users).find((user) => user.id === selectedId);
}

function readRelease1PrivateRoomSelectedObject(host: HabboV1PrivateRoomRuntimeHost): HabboRoomObjectRecord | undefined {
  const selectedId = String(host.movie.getProperty("selectedRoomObjectId") ?? "");
  const selectedType = String(host.movie.getProperty("selectedRoomObjectType") ?? "");
  const component = host.objectManager.getObject(roomComponentId);
  const source = selectedType === "active"
    ? component?.get("activeObjects")
    : selectedType === "item"
      ? component?.get("itemObjects")
      : undefined;
  const objects = coerceRecord(source) as Record<string, HabboRoomObjectRecord>;
  const object = objects[selectedId] ?? Object.values(objects).find((candidate) => candidate.id === selectedId);
  if (isRoomObjectRecord(object)) {
    return object;
  }

  const selected = coerceRecord(host.movie.getProperty("release1PrivateRoomSelectedObject"));
  const selectedObject = selected.object;
  if (isRoomObjectRecord(selectedObject)
    && selectedObject.id === selectedId
    && selectedObject.kind === selectedType) {
    return selectedObject;
  }

  return undefined;
}

function cloneRelease1SelectedRoomObject(object: HabboRoomObjectRecord): HabboRoomObjectRecord {
  return {
    ...object,
    ...(Array.isArray(object.dimensions) ? { dimensions: [...object.dimensions] as [number, number] } : {}),
    ...(Array.isArray(object.direction) ? { direction: [...object.direction] } : {}),
    ...(object.props ? { props: { ...object.props } } : {})
  };
}

function release1PrivateRoomCurrentControlContext(
  host: HabboV1PrivateRoomRuntimeHost
): { readonly roomOwner: boolean; readonly roomController: boolean } {
  const session = host.objectManager.getObject(sessionObjectId);
  const sessionOwner = Number(session?.get("room_owner") ?? 0) !== 0;
  const sessionController = Number(session?.get("room_controller") ?? 0) !== 0;
  const roomData = readRoomDataStruct(host.objectManager.getObject(roomComponentId)?.get("saveData"));
  const ownerName = roomData?.owner ?? "";
  const ownerFromRoomData = ownerName.length > 0
    && release1OwnUserNameCandidates(host).some((ownName) => normalizeRelease1UserName(ownName) === normalizeRelease1UserName(ownerName));
  const roomOwner = sessionOwner || ownerFromRoomData;
  return {
    roomOwner,
    roomController: sessionController || roomOwner
  };
}

interface Release1PrivateRoomObjectDisplayInfo {
  readonly name: string;
  readonly custom: string;
  readonly smallMemberName: string;
  readonly metadata?: Release1ResolvedFurniMetadata;
}

function release1PrivateRoomObjectDisplayInfo(
  object: HabboRoomObjectRecord,
  info: HabboRoomObjectInfo
): Release1PrivateRoomObjectDisplayInfo {
  const metadata = release1FurniMetadataForRoomObject(object);
  if (!metadata) {
    return {
      name: info.name,
      custom: info.custom,
      smallMemberName: info.smallMemberName
    };
  }

  return {
    name: metadata.displayName || info.name,
    custom: metadata.description || info.custom,
    smallMemberName: metadata.smallMemberName || info.smallMemberName,
    metadata
  };
}

function showRelease1SelectedPrivateRoomObjectPreview(
  host: HabboV1PrivateRoomRuntimeHost,
  metadata: Release1ResolvedFurniMetadata | undefined
): void {
  clearRelease1SelectedPrivateRoomObjectPreview(host);
  if (!metadata) {
    return;
  }

  const runtimeMembers: DirectorMemberManifest[] = [];
  let resolved: (Release1ResolvedBitmapMember & { readonly memberName: string; readonly regPoint: { readonly x: number; readonly y: number } }) | undefined;
  for (const memberName of metadata.previewMemberNames.length > 0 ? metadata.previewMemberNames : [metadata.smallMemberName]) {
    resolved = resolveRelease1SelectedObjectBitmapMember(host, metadata, memberName, runtimeMembers);
    if (resolved) {
      break;
    }
  }
  if (!resolved) {
    host.recordUnsupportedOnce?.(`release1-private-room-object-preview-missing:${metadata.smallMemberName}`, {
      subsystem: "habbo",
      feature: "release1-private-room-object-preview-missing",
      detail: `release1 Info icon source requested ${metadata.smallMemberName}, but the runtime could not resolve a decoded furniture preview bitmap`,
      source: [
        "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 31 - Info icon.ls",
        release1FurniMetadataSource
      ].join("\n")
    });
    return;
  }

  if (runtimeMembers.length > 0) {
    importRelease1SelectedUserRuntimeMembers(host, runtimeMembers);
  }

  appendRelease1SelectedPrivateRoomUserSprites(host, [{
    channel: v1SelectedObjectPreviewChannel,
    member: resolved.ref,
    loc: v1SelectedObjectPreviewLoc,
    width: resolved.width,
    height: resolved.height,
    locZ: v1SelectedUserPreviewLocZBase + 726,
    ink: 8,
    visible: true
  }]);
  host.movie.setProperty("release1PrivateRoomSelectedObjectPreview", {
    memberName: metadata.smallMemberName,
    loc: v1SelectedObjectPreviewLoc,
    source: [
      "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 31 - Info icon.ls",
      metadata.source
    ]
  });
}

function resolveRelease1SelectedObjectBitmapMember(
  host: HabboV1PrivateRoomRuntimeHost,
  metadata: Release1ResolvedFurniMetadata,
  memberName: string,
  runtimeMembers: DirectorMemberManifest[]
): (Release1ResolvedBitmapMember & { readonly memberName: string; readonly regPoint: { readonly x: number; readonly y: number } }) | undefined {
  const existing = host.movie.cast.getMemberByName(memberName);
  if (existing && existing.width !== undefined && existing.height !== undefined && existing.type === "bitmap") {
    return {
      ref: existing.ref(),
      width: existing.width,
      height: existing.height,
      nextRuntimeMember: 300,
      memberName,
      regPoint: existing.regPoint
    };
  }

  const runtimeExisting = host.movie.cast.getMemberByName(`runtime.release1.selected.object.${memberName}`, v1SelectedUserRuntimeCastSlot);
  if (runtimeExisting && runtimeExisting.width !== undefined && runtimeExisting.height !== undefined && runtimeExisting.type === "bitmap") {
    return {
      ref: runtimeExisting.ref(),
      width: runtimeExisting.width,
      height: runtimeExisting.height,
      nextRuntimeMember: 300,
      memberName,
      regPoint: runtimeExisting.regPoint
    };
  }

  const asset = host.getBitmapAssetByMemberName?.(memberName, release1SelectedObjectPreviewPreferredCasts);
  if (asset) {
    const memberNumber = nextRelease1SelectedUserRuntimeMemberNumber(host, 300);
    runtimeMembers.push(createRelease1SelectedObjectRuntimeBitmapMember(memberNumber, memberName, asset));
    return {
      ref: { castLib: v1SelectedUserRuntimeCastSlot, member: memberNumber },
      width: asset.width,
      height: asset.height,
      nextRuntimeMember: memberNumber + 1,
      memberName,
      regPoint: asset.regPoint
    };
  }

  if (metadata.previewAsset && metadata.previewAsset.memberName === memberName) {
    const memberNumber = nextRelease1SelectedUserRuntimeMemberNumber(host, 300);
    const regPoint = release1FurniPreviewRegPoint(metadata.previewAsset);
    runtimeMembers.push(createRelease1FurniPreviewRuntimeMember(memberNumber, memberName, metadata.previewAsset, regPoint));
    return {
      ref: { castLib: v1SelectedUserRuntimeCastSlot, member: memberNumber },
      width: metadata.previewAsset.width,
      height: metadata.previewAsset.height,
      nextRuntimeMember: memberNumber + 1,
      memberName,
      regPoint
    };
  }

  return undefined;
}

function createRelease1SelectedObjectRuntimeBitmapMember(
  memberNumber: number,
  memberName: string,
  asset: HabboWindowBitmapAsset
): DirectorMemberManifest {
  return {
    number: memberNumber,
    name: `runtime.release1.selected.object.${memberName}`,
    type: "bitmap",
    width: asset.width,
    height: asset.height,
    regPoint: asset.regPoint,
    assetPath: asset.pngPath,
    ...(asset.inkAssetPaths ? { inkAssetPaths: { ...asset.inkAssetPaths } } : {})
  };
}

function release1FurniPreviewRegPoint(asset: Release1FurniPreviewAsset): { readonly x: number; readonly y: number } {
  return {
    x: Math.round(asset.width / 2),
    y: Math.max(0, Math.round(asset.height))
  };
}

function clearRelease1SelectedPrivateRoomObjectPreview(host: HabboV1PrivateRoomRuntimeHost): void {
  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (Array.isArray(current)) {
    host.movie.setProperty("roomVisualOverlaySprites", current.filter((entry) => {
      return !isDirectorSpriteChannelManifest(entry)
        || entry.channel !== v1SelectedObjectPreviewChannel;
    }));
  }
  host.movie.setProperty("release1PrivateRoomSelectedObjectPreview", undefined);
}

function showRelease1SelectedPrivateRoomUserPreview(
  host: HabboV1PrivateRoomRuntimeHost,
  user: HabboRoomUserRecord,
  release: string
): void {
  const runtimeMembers: DirectorMemberManifest[] = [];
  let nextRuntimeMember = 1;
  const sprites: DirectorSpriteChannelManifest[] = [];
  for (const part of release1SelectedUserSourceParts(user)) {
    const props = user.figure[part];
    if (!props) {
      continue;
    }

    const memberName = `h_std_${part}_${props.model}_2_0`;
    const resolved = resolveRelease1SelectedUserBitmapMember(
      host,
      memberName,
      release1SelectedUserPreviewPreferredCasts,
      runtimeMembers,
      nextRuntimeMember
    );
    if (!resolved) {
      continue;
    }
    nextRuntimeMember = resolved.nextRuntimeMember;

    const ink = release1SelectedUserPartInk(part);
    sprites.push({
      channel: v1SelectedUserPreviewStartChannel + sprites.length,
      member: resolved.ref,
      loc: v1SelectedUserPreviewLoc,
      width: resolved.width,
      height: resolved.height,
      locZ: v1SelectedUserPreviewLocZBase + (release1SelectedUserPartLocZShifts[part] ?? 0),
      ink,
      ...(part === "ey" ? {} : { bgColor: props.color }),
      visible: true,
      flipH: true,
      ...(part === "sd" ? { blend: 16 } : {})
    });
  }

  if (runtimeMembers.length > 0) {
    importRelease1SelectedUserRuntimeMembers(host, runtimeMembers);
  }

  appendRelease1SelectedPrivateRoomUserSprites(host, sprites);
  host.movie.setProperty("release1PrivateRoomSelectedUserPreview", {
    partCount: sprites.length,
    startChannel: v1SelectedUserPreviewStartChannel,
    loc: v1SelectedUserPreviewLoc,
    source: release1PrivateRoomSelectedUserSource
  });

  if (sprites.length === 0) {
    host.recordUnsupportedOnce?.(`release1-private-room-selected-user-preview-missing:${user.name}`, {
      subsystem: "habbo",
      feature: "release1-private-room-selected-user-preview-missing",
      detail: `${release} hiliter_one_room requested source figure preview members for selected user ${user.name}, but no matching decoded h_std figure assets were resolved`,
      source: privateRoomHiliterSource
    });
  }
}

function showRelease1SelectedPrivateRoomUserHilite(host: HabboV1PrivateRoomRuntimeHost, user: HabboRoomUserRecord): void {
  const sourceSprite = findRelease1SelectedRoomUserSprite(host, user);
  if (!sourceSprite) {
    return;
  }

  let direction = Math.round(user.dirBody ?? 2);
  if (direction > 3) {
    direction -= 4;
  }
  direction = Math.max(0, Math.min(3, direction));
  const memberName = `memberhilite_${direction}`;
  const runtimeMembers: DirectorMemberManifest[] = [];
  const resolved = resolveRelease1SelectedUserBitmapMember(
    host,
    memberName,
    release1SelectedUserHilitePreferredCasts,
    runtimeMembers,
    100
  );
  if (!resolved) {
    return;
  }

  if (runtimeMembers.length > 0) {
    importRelease1SelectedUserRuntimeMembers(host, runtimeMembers);
  }

  const loc = {
    x: sourceSprite.loc?.x ?? 0,
    y: sourceSprite.loc?.y ?? 0
  };
  appendRelease1SelectedPrivateRoomUserSprites(host, [{
    channel: v1SelectedUserHiliteChannel,
    member: resolved.ref,
    loc,
    width: resolved.width,
    height: resolved.height,
    locZ: v1SelectedUserHiliteLocZ,
    ink: 41,
    visible: true
  }]);
  host.movie.setProperty("release1PrivateRoomSelectedUserHilite", {
    memberName,
    direction,
    loc,
    source: privateRoomHiliterSource
  });
}

function showRelease1SelectedPrivateRoomWaveButton(host: HabboV1PrivateRoomRuntimeHost): void {
  const danceButton = readRelease1PrivateRoomSourceButtons(host.movie)
    .find((button) => button.buttonType.toLowerCase() === "dance");
  if (!danceButton) {
    return;
  }

  const resolved = resolveRelease1SelectedUserButtonMember(host, "wave_btn_fi", "waveto_btn_fi");
  if (!resolved) {
    host.recordUnsupportedOnce?.("release1-private-room-wave-button-asset-missing", {
      subsystem: "habbo",
      feature: "release1-private-room-wave-button-asset-missing",
      detail: "release1 has Human Class fuseAction_wave, but the runtime could not resolve wave_btn_fi or waveto_btn_fi while building the selected-user source bridge",
      source: release1PrivateRoomWaveButtonSource.join("\n")
    });
    return;
  }

  const sourceWidth = Math.max(1, Math.round(resolved.width));
  const sourceHeight = Math.max(1, Math.round(resolved.height));
  const regX = Math.round(resolved.regPoint.x);
  const regY = Math.round(resolved.regPoint.y);
  const gap = Math.max(2, Math.round(danceButton.bounds.height / 8));
  const bounds: Release1Rect = {
    x: danceButton.bounds.x - sourceWidth - gap,
    y: danceButton.bounds.y,
    width: sourceWidth,
    height: sourceHeight
  };

  appendRelease1SelectedPrivateRoomUserSprites(host, [{
    channel: v1SelectedUserWaveButtonChannel,
    member: resolved.ref,
    loc: {
      x: bounds.x + regX,
      y: bounds.y + regY
    },
    width: sourceWidth,
    height: sourceHeight,
    locZ: v1RoomScoreLocZBase + danceButton.channel + 1,
    ink: 8,
    visible: true
  }]);

  const element: HabboWindowInteractiveElement = {
    id: v1SelectedUserWaveButtonId,
    windowId: "Room",
    kind: "link",
    ...bounds,
    label: "Wave",
    cursor: "cursor.finger",
    clientId: resolved.memberName
  };
  const action: Release1PrivateRoomInteractiveAction = {
    id: v1SelectedUserWaveButtonId,
    channel: v1SelectedUserWaveButtonChannel,
    kind: "source-button",
    event: "mouseDown",
    source: release1PrivateRoomWaveButtonSource,
    bounds,
    buttonType: "Wave"
  };
  upsertRelease1SelectedPrivateRoomRuntimeInteraction(host, element, action);
  host.movie.setProperty("release1PrivateRoomEnabledSourceButtons", {
    ...coerceRecord(host.movie.getProperty("release1PrivateRoomEnabledSourceButtons")),
    wave: true
  });
  host.movie.setProperty("release1PrivateRoomWaveButton", {
    memberName: resolved.memberName,
    bounds,
    source: release1PrivateRoomWaveButtonSource
  });
}

function showRelease1SelectedPrivateRoomModeratorBadge(
  host: HabboV1PrivateRoomRuntimeHost,
  user: HabboRoomUserRecord,
  release: string
): void {
  const level = release1ModeratorLevelForUser(host, user);
  if (!level) {
    clearRelease1SelectedPrivateRoomModeratorBadge(host);
    return;
  }

  const memberName = `sheriff_badge${level}`;
  const resolved = resolveRelease1SelectedUserButtonMember(host, memberName, "sheriff_badge");
  if (!resolved) {
    host.recordUnsupportedOnce?.(`release1-private-room-moderator-badge-asset-missing:${level}`, {
      subsystem: "habbo",
      feature: "release1-private-room-moderator-badge-asset-missing",
      detail: `${release} Human Class source requested ${memberName}, but the runtime could not resolve the source badge bitmap`,
      source: release1PrivateRoomModeratorBadgeSource.join("\n")
    });
    return;
  }

  const context = release1SelectedPrivateRoomUserActionContext(host, user);
  const visible = host.movie.getProperty("release1ModeratorBadgeVisible") !== false;
  const blend = context.selectedIsOwnUser && !visible ? 50 : 100;
  const regX = Math.round(resolved.regPoint.x);
  const regY = Math.round(resolved.regPoint.y);
  const bounds: Release1Rect = {
    x: v1SelectedUserModeratorBadgeLoc.x - regX,
    y: v1SelectedUserModeratorBadgeLoc.y - regY,
    width: Math.max(1, Math.round(resolved.width)),
    height: Math.max(1, Math.round(resolved.height))
  };

  appendRelease1SelectedPrivateRoomUserSprites(host, [{
    channel: v1SelectedUserModeratorBadgeChannel,
    member: resolved.ref,
    loc: v1SelectedUserModeratorBadgeLoc,
    width: bounds.width,
    height: bounds.height,
    locZ: v1RoomScoreLocZBase + 726,
    ink: 36,
    blend,
    visible: true
  }]);

  host.movie.setProperty("release1PrivateRoomModeratorBadge", {
    memberName: resolved.memberName,
    level,
    loc: v1SelectedUserModeratorBadgeLoc,
    blend,
    source: release1PrivateRoomModeratorBadgeSource
  });

  if (!context.selectedIsOwnUser) {
    clearRelease1SelectedPrivateRoomModeratorBadgeInteraction(host);
    return;
  }

  const element: HabboWindowInteractiveElement = {
    id: v1SelectedUserModeratorBadgeId,
    windowId: "Room",
    kind: "link",
    ...bounds,
    label: "Moderator Badge",
    cursor: "cursor.finger",
    clientId: resolved.memberName
  };
  const action: Release1PrivateRoomInteractiveAction = {
    id: v1SelectedUserModeratorBadgeId,
    channel: v1SelectedUserModeratorBadgeChannel,
    kind: "moderator-badge",
    event: "mouseDown",
    source: release1PrivateRoomModeratorBadgeSource,
    bounds
  };
  upsertRelease1SelectedPrivateRoomRuntimeInteraction(host, element, action);
}

function activateRelease1PrivateRoomModeratorBadge(host: HabboV1PrivateRoomRuntimeHost, release: string): boolean {
  const selected = readRelease1PrivateRoomSelectedUser(host);
  if (!selected) {
    return false;
  }

  const context = release1SelectedPrivateRoomUserActionContext(host, selected);
  const level = release1ModeratorLevelForUser(host, selected);
  if (!context.selectedIsOwnUser || !level) {
    return false;
  }

  const nextVisible = host.movie.getProperty("release1ModeratorBadgeVisible") === false;
  host.movie.setProperty("release1ModeratorBadgeVisible", nextVisible);
  if (nextVisible) {
    host.queueRoomRequest?.({ command: "MODERATOR", level }, release);
  } else {
    host.queueRoomRequest?.({ command: "STOP", action: "Moderator" }, release);
  }
  showRelease1SelectedPrivateRoomModeratorBadge(host, selected, release);
  host.syncDirectorOverlaySprites?.();
  host.syncRoomInteractiveElements?.();
  host.logDebug?.("room", "info", `release1 moderator badge ${nextVisible ? "shown" : "hidden"} level=${level}`);
  return true;
}

function release1ModeratorLevelForUser(host: HabboV1PrivateRoomRuntimeHost, user: HabboRoomUserRecord): string | undefined {
  const level = user.moderatorLevel ?? roomUserModeratorLevelFromActions(user.actions);
  const context = release1SelectedPrivateRoomUserActionContext(host, user);
  if (context.selectedIsOwnUser && level) {
    host.movie.setProperty("release1OwnModeratorLevel", level);
    return level;
  }
  if (level) {
    return level;
  }
  if (!context.selectedIsOwnUser) {
    return undefined;
  }
  const storedLevel = host.movie.getProperty("release1OwnModeratorLevel");
  const storedLevelText = typeof storedLevel === "string" ? storedLevel.trim() : "";
  return storedLevelText || undefined;
}

function clearRelease1SelectedPrivateRoomModeratorBadge(host: HabboV1PrivateRoomRuntimeHost): void {
  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (Array.isArray(current)) {
    host.movie.setProperty("roomVisualOverlaySprites", current.filter((entry) => {
      return !isDirectorSpriteChannelManifest(entry)
        || entry.channel !== v1SelectedUserModeratorBadgeChannel;
    }));
  }
  clearRelease1SelectedPrivateRoomModeratorBadgeInteraction(host);
  host.movie.setProperty("release1PrivateRoomModeratorBadge", undefined);
}

function clearRelease1SelectedPrivateRoomModeratorBadgeInteraction(host: HabboV1PrivateRoomRuntimeHost): void {
  const interactiveProperties = ["windowInteractiveElements", "directorRoomInteractiveElements"] as const;
  for (const propertyName of interactiveProperties) {
    const current = host.movie.getProperty(propertyName);
    if (!Array.isArray(current)) {
      continue;
    }
    host.movie.setProperty(propertyName, current.filter((entry) => {
      return !isWindowInteractiveElement(entry)
        || entry.id !== v1SelectedUserModeratorBadgeId;
    }));
  }

  const actions = host.movie.getProperty("release1PrivateRoomInteractiveActions");
  if (Array.isArray(actions)) {
    host.movie.setProperty("release1PrivateRoomInteractiveActions", actions.filter((entry) => {
      return coerceRecord(entry).id !== v1SelectedUserModeratorBadgeId;
    }));
  }
}

function resolveRelease1SelectedUserButtonMember(
  host: HabboV1PrivateRoomRuntimeHost,
  ...memberNames: readonly string[]
): (Release1ResolvedBitmapMember & { readonly memberName: string; readonly regPoint: { readonly x: number; readonly y: number } }) | undefined {
  for (const memberName of memberNames) {
    const existing = host.movie.cast.getMemberByName(memberName);
    if (existing && existing.width !== undefined && existing.height !== undefined && existing.type === "bitmap") {
      return {
        ref: existing.ref(),
        width: existing.width,
        height: existing.height,
        nextRuntimeMember: 200,
        memberName,
        regPoint: existing.regPoint
      };
    }

    const runtimeMembers: DirectorMemberManifest[] = [];
    const resolved = resolveRelease1SelectedUserBitmapMember(
      host,
      memberName,
      release1SelectedUserButtonPreferredCasts,
      runtimeMembers,
      nextRelease1SelectedUserRuntimeMemberNumber(host, 200)
    );
    if (!resolved) {
      continue;
    }

    if (runtimeMembers.length > 0) {
      importRelease1SelectedUserRuntimeMembers(host, runtimeMembers);
    }

    const runtimeMember = host.movie.cast.getMember(resolved.ref);
    return {
      ...resolved,
      memberName,
      regPoint: runtimeMember?.regPoint ?? { x: 0, y: 0 }
    };
  }
  return undefined;
}

function nextRelease1SelectedUserRuntimeMemberNumber(host: HabboV1PrivateRoomRuntimeHost, minimum: number): number {
  const existing = host.movie.cast.getCastLib(v1SelectedUserRuntimeCastSlot)?.members ?? [];
  const used = new Set(existing.map((member) => member.memberNumber));
  let candidate = minimum;
  while (used.has(candidate)) {
    candidate += 1;
  }
  return candidate;
}

function upsertRelease1SelectedPrivateRoomRuntimeInteraction(
  host: HabboV1PrivateRoomRuntimeHost,
  element: HabboWindowInteractiveElement,
  action: Release1PrivateRoomInteractiveAction
): void {
  const interactiveProperties = ["windowInteractiveElements", "directorRoomInteractiveElements"] as const;
  for (const propertyName of interactiveProperties) {
    const current = host.movie.getProperty(propertyName);
    const base = Array.isArray(current)
      ? current.filter((entry) => !isWindowInteractiveElement(entry) || entry.id !== element.id)
      : [];
    host.movie.setProperty(propertyName, [...base, element]);
  }

  const currentActions = host.movie.getProperty("release1PrivateRoomInteractiveActions");
  const baseActions = Array.isArray(currentActions)
    ? currentActions.filter((entry) => coerceRecord(entry).id !== action.id)
    : [];
  host.movie.setProperty("release1PrivateRoomInteractiveActions", [...baseActions, action]);
}

function clearRelease1SelectedPrivateRoomUserSprites(host: HabboV1PrivateRoomRuntimeHost): void {
  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (Array.isArray(current)) {
    host.movie.setProperty("roomVisualOverlaySprites", current.filter((entry) => {
      if (!isDirectorSpriteChannelManifest(entry)) {
        return true;
      }
      return !isRelease1SelectedUserRuntimeChannel(entry.channel);
    }));
  }
  host.movie.setProperty("release1PrivateRoomSelectedUserPreview", undefined);
  host.movie.setProperty("release1PrivateRoomSelectedUserHilite", undefined);
  clearRelease1SelectedPrivateRoomRuntimeInteractions(host);
}

function clearRelease1SelectedPrivateRoomRuntimeInteractions(host: HabboV1PrivateRoomRuntimeHost): void {
  const interactiveProperties = ["windowInteractiveElements", "directorRoomInteractiveElements"] as const;
  for (const propertyName of interactiveProperties) {
    const current = host.movie.getProperty(propertyName);
    if (!Array.isArray(current)) {
      continue;
    }
    host.movie.setProperty(propertyName, current.filter((entry) => {
      return !isWindowInteractiveElement(entry)
        || (entry.id !== v1SelectedUserWaveButtonId && entry.id !== v1SelectedUserModeratorBadgeId);
    }));
  }

  const actions = host.movie.getProperty("release1PrivateRoomInteractiveActions");
  if (Array.isArray(actions)) {
    host.movie.setProperty("release1PrivateRoomInteractiveActions", actions.filter((entry) => {
      const id = coerceRecord(entry).id;
      return id !== v1SelectedUserWaveButtonId && id !== v1SelectedUserModeratorBadgeId;
    }));
  }
  const enabled = { ...coerceRecord(host.movie.getProperty("release1PrivateRoomEnabledSourceButtons")) };
  delete enabled.wave;
  host.movie.setProperty("release1PrivateRoomEnabledSourceButtons", enabled);
  host.movie.setProperty("release1PrivateRoomWaveButton", undefined);
  host.movie.setProperty("release1PrivateRoomModeratorBadge", undefined);
}

function appendRelease1SelectedPrivateRoomUserSprites(
  host: HabboV1PrivateRoomRuntimeHost,
  sprites: readonly DirectorSpriteChannelManifest[]
): void {
  if (sprites.length === 0) {
    return;
  }

  const current = host.movie.getProperty("roomVisualOverlaySprites");
  const base = Array.isArray(current) ? current.filter((entry) => {
    if (!isDirectorSpriteChannelManifest(entry)) {
      return true;
    }
    return !sprites.some((sprite) => sprite.channel === entry.channel);
  }) : [];
  host.movie.setProperty("roomVisualOverlaySprites", [...base, ...sprites]);
}

function isRelease1SelectedUserRuntimeChannel(channel: number): boolean {
  return channel === v1SelectedUserHiliteChannel
    || channel === v1SelectedUserWaveButtonChannel
    || channel === v1SelectedUserModeratorBadgeChannel
    || (channel >= v1SelectedUserPreviewStartChannel && channel < v1SelectedUserPreviewStartChannel + v1SelectedUserPreviewChannelCount);
}

function release1SelectedUserSourceParts(user: HabboRoomUserRecord): readonly string[] {
  const rawParts = user.figureRaw
    .split("&")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((part): part is string => Boolean(part && user.figure[part]));
  if (rawParts.length > 0) {
    return rawParts;
  }
  return Object.keys(user.figure);
}

function release1SelectedUserPartInk(part: string): number {
  return part === "sd" ? 8 : 41;
}

function findRelease1SelectedRoomUserSprite(host: HabboV1PrivateRoomRuntimeHost, user: HabboRoomUserRecord): DirectorSpriteChannelManifest | undefined {
  const sprites = host.movie.getProperty("roomUserOverlaySprites");
  if (!Array.isArray(sprites)) {
    return undefined;
  }

  return sprites.find((entry): entry is DirectorSpriteChannelManifest => {
    if (!isDirectorSpriteChannelManifest(entry)) {
      return false;
    }
    const member = host.movie.cast.getMember(entry.member);
    return member?.name === `runtime.room.user.${user.id}`;
  });
}

interface Release1ResolvedBitmapMember {
  readonly ref: { readonly castLib: number; readonly member: number };
  readonly width: number;
  readonly height: number;
  readonly nextRuntimeMember: number;
}

function resolveRelease1SelectedUserBitmapMember(
  host: HabboV1PrivateRoomRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[],
  runtimeMembers: DirectorMemberManifest[],
  nextRuntimeMember: number
): Release1ResolvedBitmapMember | undefined {
  const existing = host.movie.cast.getMemberByName(memberName);
  if (existing && existing.width !== undefined && existing.height !== undefined && existing.type === "bitmap") {
    return {
      ref: existing.ref(),
      width: existing.width,
      height: existing.height,
      nextRuntimeMember
    };
  }

  const runtimeExisting = host.movie.cast.getMemberByName(`runtime.release1.selected.${memberName}`, v1SelectedUserRuntimeCastSlot);
  if (runtimeExisting && runtimeExisting.width !== undefined && runtimeExisting.height !== undefined && runtimeExisting.type === "bitmap") {
    return {
      ref: runtimeExisting.ref(),
      width: runtimeExisting.width,
      height: runtimeExisting.height,
      nextRuntimeMember
    };
  }

  const asset = host.getBitmapAssetByMemberName?.(memberName, preferredCasts);
  if (!asset) {
    return undefined;
  }

  const memberNumber = nextRuntimeMember;
  runtimeMembers.push(createRelease1SelectedUserRuntimeBitmapMember(memberNumber, memberName, asset));
  return {
    ref: { castLib: v1SelectedUserRuntimeCastSlot, member: memberNumber },
    width: asset.width,
    height: asset.height,
    nextRuntimeMember: memberNumber + 1
  };
}

function createRelease1SelectedUserRuntimeBitmapMember(
  memberNumber: number,
  memberName: string,
  asset: HabboWindowBitmapAsset
): DirectorMemberManifest {
  return {
    number: memberNumber,
    name: `runtime.release1.selected.${memberName}`,
    type: "bitmap",
    width: asset.width,
    height: asset.height,
    regPoint: asset.regPoint,
    assetPath: asset.pngPath,
    ...(asset.inkAssetPaths ? { inkAssetPaths: { ...asset.inkAssetPaths } } : {})
  };
}

function importRelease1SelectedUserRuntimeMembers(
  host: HabboV1PrivateRoomRuntimeHost,
  members: readonly DirectorMemberManifest[]
): void {
  const existing = host.movie.cast.getCastLib(v1SelectedUserRuntimeCastSlot)?.members
    .filter((member) => member.name?.startsWith("runtime.release1.selected."))
    .map((member): DirectorMemberManifest => ({
      number: member.memberNumber,
      ...(member.name ? { name: member.name } : {}),
      type: member.type,
      ...(member.width !== undefined ? { width: member.width } : {}),
      ...(member.height !== undefined ? { height: member.height } : {}),
      ...(member.shapeType !== undefined ? { shapeType: member.shapeType } : {}),
      ...(member.shapeFillType !== undefined ? { shapeFillType: member.shapeFillType } : {}),
      ...(member.shapeLineThickness !== undefined ? { shapeLineThickness: member.shapeLineThickness } : {}),
      ...(member.color !== undefined ? { color: member.color } : {}),
      ...(member.backgroundColor !== undefined ? { backgroundColor: member.backgroundColor } : {}),
      ...(member.text !== undefined ? { text: member.text } : {}),
      ...(member.fontSize !== undefined ? { fontSize: member.fontSize } : {}),
      ...(member.fontFamily !== undefined ? { fontFamily: member.fontFamily } : {}),
      ...(member.fontWeight !== undefined ? { fontWeight: member.fontWeight } : {}),
      ...(member.fontStyle !== undefined ? { fontStyle: member.fontStyle } : {}),
      ...(member.underline ? { underline: member.underline } : {}),
      ...(member.textAlign !== undefined ? { textAlign: member.textAlign } : {}),
      ...(member.lineHeight !== undefined ? { lineHeight: member.lineHeight } : {}),
      ...(member.wordWrap ? { wordWrap: member.wordWrap } : {}),
      ...(member.textSpans.length > 0 ? { textSpans: [...member.textSpans] } : {}),
      ...(member.textScrollY ? { textScrollY: member.textScrollY } : {}),
      ...(member.editable ? { editable: member.editable } : {}),
      regPoint: member.regPoint,
      ...(member.assetPath ? { assetPath: member.assetPath } : {}),
      ...(Object.keys(member.inkAssetPaths).length > 0 ? { inkAssetPaths: { ...member.inkAssetPaths } } : {}),
      ...(member.composite ? { composite: {
        width: member.composite.width,
        height: member.composite.height,
        layers: member.composite.layers.map((layer) => ({ ...layer }))
      } } : {}),
      ...(member.borderColor !== undefined ? { borderColor: member.borderColor } : {}),
      ...(member.borderWidth !== undefined ? { borderWidth: member.borderWidth } : {}),
      ...(member.borderRadius !== undefined ? { borderRadius: member.borderRadius } : {})
    })) ?? [];
  const byNumber = new Map<number, DirectorMemberManifest>();
  for (const member of [...existing, ...members]) {
    byNumber.set(member.number, member);
  }
  host.movie.cast.importOrCreateCastLib({
    number: v1SelectedUserRuntimeCastSlot,
    name: "runtime_release1_selected_user",
    fileName: "runtime-release1-selected-user",
    members: [...byNumber.values()].sort((left, right) => left.number - right.number)
  });
}

function numberFromCurrentRoomVisual(host: HabboV1PrivateRoomRuntimeHost, key: string, fallback: number): number {
  const visual = coerceRecord(host.movie.getProperty("currentRoomVisual"));
  const roomData = coerceRecord(visual.roomData);
  const value = roomData[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function setRelease1PrivateRoomScoreSpriteMember(host: HabboV1PrivateRoomRuntimeHost, sourceChannel: number, memberName: string): boolean {
  const current = host.movie.getProperty("roomVisualOverlaySprites");
  if (!Array.isArray(current)) {
    return false;
  }

  const sprites = current.filter((entry): entry is DirectorSpriteChannelManifest => {
    const record = coerceRecord(entry);
    return typeof record.channel === "number" && typeof record.member === "object" && record.member !== null;
  });
  const target = sprites.find((sprite) => sprite.channel === 2000 + sourceChannel);
  if (!target) {
    return false;
  }

  const replacement = host.movie.cast.getMemberByName(memberName, target.member.castLib) ?? host.movie.cast.getMemberByName(memberName);
  if (!replacement) {
    return false;
  }

  host.movie.setProperty("roomVisualOverlaySprites", sprites.map((sprite) => {
    return sprite.channel === target.channel
      ? { ...sprite, member: replacement.ref() }
      : sprite;
  }));
  return true;
}

function readRelease1PrivateRoomSourceButtons(movie: DirectorMovie): readonly Release1PrivateRoomSourceButton[] {
  const value = movie.getProperty("release1PrivateRoomSourceButtons");
  return Array.isArray(value) ? value.filter(isRelease1PrivateRoomSourceButton) : [];
}

function isRelease1PrivateRoomSourceButton(value: unknown): value is Release1PrivateRoomSourceButton {
  const record = coerceRecord(value);
  return typeof record.id === "string"
    && typeof record.channel === "number"
    && typeof record.buttonType === "string"
    && (record.event === "mouseDown" || record.event === "mouseUp")
    && typeof record.sourceMemberName === "string"
    && (record.pressedMemberName === undefined || typeof record.pressedMemberName === "string")
    && (record.rotateChange === undefined || typeof record.rotateChange === "number")
    && (record.rotateStepMode === undefined || record.rotateStepMode === "repeat-change")
    && (record.disabledMode === "hidden" || record.disabledMode === "dimmed")
    && isRelease1Rect(record.bounds);
}

function isDirectorSpriteChannelManifest(value: unknown): value is DirectorSpriteChannelManifest {
  const record = coerceRecord(value);
  return typeof record.channel === "number"
    && typeof record.member === "object"
    && record.member !== null;
}

function updateRelease1PrivateRoomInteractiveBounds(movie: DirectorMovie, elementId: string, bounds: Release1Rect): void {
  const current = movie.getProperty("windowInteractiveElements");
  if (!Array.isArray(current)) {
    updateRelease1PrivateRoomInteractiveBoundsProperty(movie, "directorRoomInteractiveElements", elementId, bounds);
    return;
  }

  movie.setProperty("windowInteractiveElements", current.map((entry) => {
    if (!isWindowInteractiveElement(entry) || entry.id !== elementId) {
      return entry;
    }

    return {
      ...entry,
      ...bounds
    };
  }));
  updateRelease1PrivateRoomInteractiveBoundsProperty(movie, "directorRoomInteractiveElements", elementId, bounds);
}

function updateRelease1PrivateRoomInteractiveBoundsProperty(movie: DirectorMovie, propertyName: string, elementId: string, bounds: Release1Rect): void {
  const value = movie.getProperty(propertyName);
  if (!Array.isArray(value)) {
    return;
  }

  movie.setProperty(propertyName, value.map((entry) => {
    if (!isWindowInteractiveElement(entry) || entry.id !== elementId) {
      return entry;
    }

    return {
      ...entry,
      ...bounds
    };
  }));
}

function createRelease1RoomStageBackdropSprite(host: HabboV1PrivateRoomRuntimeHost): DirectorSpriteChannelManifest {
  const castLib = host.getRuntimeRoomVisualCastSlot?.() ?? nextRuntimeCastLibNumber(host.movie);
  host.movie.cast.importOrCreateCastLib({
    number: castLib,
    name: v1RoomStageBackdropCastName,
    fileName: `${v1RoomStageBackdropCastName}.runtime`,
    members: [
      {
        number: v1RoomStageBackdropMember,
        name: "release1 private room movie backdrop",
        type: "shape",
        width: host.movie.stage.width,
        height: host.movie.stage.height,
        backgroundColor: "#000000"
      }
    ]
  });

  return {
    channel: v1RoomStageBackdropChannel,
    member: {
      castLib,
      member: v1RoomStageBackdropMember
    },
    loc: {
      x: 0,
      y: 0
    },
    width: host.movie.stage.width,
    height: host.movie.stage.height,
    locZ: 0,
    visible: true
  };
}

function nextRuntimeCastLibNumber(movie: DirectorMovie): number {
  return Math.max(0, ...movie.cast.castLibs.map((cast) => cast.number)) + 1;
}

export function prepareRelease1PrivateRoomStatusPacket(host: HabboV1PrivateRoomRuntimeHost, release: string): boolean {
  if (!release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  if (host.movie.getProperty("roomEntryState") !== "waiting-bootstrap") {
    return false;
  }

  const component = host.objectManager.getObject(roomComponentId);
  const processList = coerceRecord(component?.get("processList"));
  const complete = ["passive", "Active", "users", "items", "heightmap"].every((key) => Number(processList[key] ?? 0) !== 0);
  if (!complete) {
    return false;
  }

  component?.set("activeFlag", 1);
  host.movie.setProperty("roomBootstrapPendingFinalize", false);
  host.movie.setProperty("roomBootstrapFinalizeFrameFence", 0);
  host.movie.setProperty("blockingPreloadBitmapAssetPaths", []);
  setRoomEntryStateRuntime(host, "waiting-status");
  setRoomWirePhaseRuntime(host, "awaiting-status");
  setRelease1PrivateRoomLoadingProgress(host, 0.95, release, false);
  host.movie.setProperty("release1PrivateRoomStatusReady", {
    source: privateRoomProgressSource
  });
  host.logDebug?.("room", "ok", "release1 private room bootstrap complete; accepting STATUS");
  return true;
}

export function release1PrivateRoomMarkerFromObjectsPacketBody(body: string): string | undefined {
  const firstLine = body.split(/\r?\n|\r/).map((line) => line.trim()).find((line) => line.length > 0);
  if (!firstLine) {
    return undefined;
  }

  const words = firstLine.split(/\s+/).filter(Boolean);
  const marker = [...words].reverse().find((word) => /^model_[a-z0-9]+$/i.test(word));
  return marker;
}

function flushRelease1PrivateRoomDeferredBootstrapPackets(host: HabboV1PrivateRoomRuntimeHost, release: string): void {
  const packets = readDeferredBootstrapPackets(host.movie);
  if (packets.length === 0 || !host.handleBridgePacket) {
    return;
  }

  host.movie.setProperty("release1PrivateRoomDeferredBootstrapPackets", []);
  let handled = 0;
  for (const packet of packets) {
    if (host.handleBridgePacket(packet.packetName, packet.body, release)) {
      handled += 1;
    }
  }
  host.movie.setProperty("release1PrivateRoomDeferredBootstrapFlush", {
    handled,
    total: packets.length,
    source: [
      privateRoomObjectsSource,
      "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/room/Room.java"
    ]
  });
  host.logDebug?.("room", "ok", `release1 replayed deferred bootstrap packets ${handled}/${packets.length}`);
}

function readDeferredBootstrapPackets(movie: DirectorMovie): Array<{
  readonly packetName: string;
  readonly body: string;
}> {
  const value = movie.getProperty("release1PrivateRoomDeferredBootstrapPackets");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const record = coerceRecord(entry);
    const packetName = typeof record.packetName === "string" ? record.packetName : "";
    const body = typeof record.body === "string" ? record.body : "";
    return isRelease1DeferredBootstrapPacket(packetName) ? [{ packetName, body }] : [];
  });
}

function isRelease1DeferredBootstrapPacket(packetName: string): boolean {
  return packetName === "HEIGHTMAP"
    || packetName === "ACTIVE_OBJECTS"
    || packetName === "ITEMS"
    || packetName === "USERS";
}

function release1PrivateRoomCastList(movie: DirectorMovie): readonly string[] {
  const member = movie.cast.getMemberByName(privateRoomLoadListMember);
  const text = typeof member?.text === "string" ? member.text : "";
  return uniqueStrings(text.split(/\r?\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\.(cct|cst|dcr|dir|dxr)$/i, ""))
    .filter(Boolean));
}

function importRelease1PrivateRoomCasts(
  host: HabboV1PrivateRoomRuntimeHost,
  casts: readonly string[],
  release: string
): void {
  if (casts.length === 0 || !host.startCastLoad) {
    return;
  }

  const missing = casts.filter((castName) => host.castExists?.(castName) !== true);
  if (missing.length === 0) {
    return;
  }

  host.startCastLoad(casts, 0, release);
  for (const castName of casts) {
    host.loadedCastNames?.add(normalizeCastName(castName));
  }
}

function sourceCastNameForSprite(manifest: DirectorMovieManifest, castLib: number): string | undefined {
  return manifest.casts.find((cast) => cast.number === castLib)?.name;
}

function currentCastLibForName(host: HabboV1PrivateRoomRuntimeHost, castName: string): number | undefined {
  const normalized = normalizeCastName(castName);
  const loaded = host.loadedCastSlots?.get(normalized);
  if (loaded !== undefined) {
    return loaded;
  }

  return host.movie.cast.castLibs.find((cast) => {
    const fileStem = cast.fileName?.replace(/\.[^.]+$/, "");
    return normalizeCastName(cast.name ?? "") === normalized
      || (fileStem !== undefined && normalizeCastName(fileStem) === normalized);
  })?.number;
}

function ensureRelease1RoomComponent(host: HabboV1PrivateRoomRuntimeHost): HabboVariableObject {
  const existing = host.objectManager.getObject(roomComponentId);
  if (existing) {
    return existing;
  }

  const created = host.objectManager.createObject?.(roomComponentId, "release1 Room Component Class");
  if (!created) {
    throw new Error("release1 private room entry requires #room_component");
  }
  return created;
}

function readRelease1NavigatorRoomEntry(movie: DirectorMovie): {
  readonly roomId: string;
  readonly roomName: string;
  readonly owner: string;
  readonly doorMode: string;
} | undefined {
  const entry = coerceRecord(movie.getProperty("release1EntryNavigatorRoomEntry"));
  const roomId = typeof entry.roomId === "string" || typeof entry.roomId === "number" ? String(entry.roomId) : "";
  const roomName = typeof entry.roomName === "string" ? entry.roomName : "";
  const owner = typeof entry.owner === "string" ? entry.owner : "";
  const doorMode = typeof entry.doorMode === "string" ? entry.doorMode : "";
  if (!roomId || !roomName) {
    return undefined;
  }

  return {
    roomId,
    roomName,
    owner,
    doorMode
  };
}

function stringFromObject(object: HabboVariableObject | undefined, key: string): string {
  const value = object?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function normalizeRelease1UserName(value: string): string {
  return value.trim().toLowerCase();
}

function release1PrivateRoomHasSingleUser(host: HabboV1PrivateRoomRuntimeHost): boolean {
  const users = coerceRecord(host.objectManager.getObject(roomComponentId)?.get("userObjects"));
  return Object.values(users).filter((entry) => coerceRecord(entry).name !== undefined).length === 1;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = normalizeCastName(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}
