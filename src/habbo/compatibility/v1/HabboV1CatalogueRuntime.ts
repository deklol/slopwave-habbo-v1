import type {
  DirectorBitmapCompositeLayer,
  DirectorCastLibManifest,
  DirectorMemberManifest,
  DirectorMovie,
  DirectorSpriteChannelManifest,
  UnsupportedFeature
} from "../../../runtime";
import type { DirectorBitmapComposite } from "../../../runtime/DirectorMember";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import { rgbToHex } from "../../HabboSourceValueHelpers";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import defaultCatalogueManifest from "../../../../generated/runtime-data/release1_roseau_dcr0910-catalogue.json";
import defaultFurniManifest from "../../../../generated/runtime-data/release1_roseau_dcr0910-furni.json";
import {
  boundsForRecordedSprite,
  memberManifestFromMember,
  readInteractiveElements,
  readSpriteManifests,
  setMemberTextByName
} from "./HabboV1NavigatorRuntime";
import {
  parseRecordedNavigatorFrame,
  popupContextSourcePath,
  readRecord,
  sanitizeElementId,
  type RecordedSprite
} from "./HabboV1NavigatorSource";
import { showRelease1EntryAlert } from "./HabboV1EntryAlerts";

const catalogueCastName = "catalog_text_fi";
const catalogueStartChannel = 45;
const catalogueEndChannel = 95;
const catalogueLocZ = 2_000_010_000;
const cataloguePlace = { x: 30, y: 16 } as const;
const catalogueWindowId = "#release1_catalogue";
const catalogueInitialFrame = "etus";

const confirmCastName = "GoldFish";
const confirmStartChannel = 851;
const confirmEndChannel = 870;
const confirmLocZ = 2_000_020_000;
const confirmPlace = { x: 0, y: 0 } as const;
const confirmWindowId = "#release1_catalogue_confirm";

const catalogueIndexFullMemberName = "catalogIndexPic";
const catalogueIndexCropMemberName = "CropcatalogIndexPic";
const plastoCodeFieldMemberName = "PlastoCodeField";

const catalogueSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 11 - Catalogs.ls";
const purchaseSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 85 - Purchase.ls";
const purchaseFromFieldSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 86 - Purchase from field.ls";
const purchaseConfirmSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 87 - Purchase after confirm.ls";
const orderInfoSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 1 - Special Scripts.ls";
const catalogueIndexSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 168 - ScrollCatalogIndexPicture.ls";
const catalogueLeftArrowSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 169 - Catalog_leftArrow.ls";
const catalogueRightArrowSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 170 - Catalog_RightArrow.ls";
const plastoColorSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 128 - Plasto Color Changer.ls";
const plastoModelSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv_gfx/casts/External/BehaviorScript 94 - Plasto Model Changer.ls";
const plastoCodeSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/Goldfish_prv_gfx/casts/External/BehaviorScript 1 - Plasto Code.ls";
const posterChooserSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 383 - poster chooserBhv.ls";
const posterSetSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 386 - NextPrevPosterSet.ls";
const posterPurchaseSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/catalog_text_fi/casts/External/BehaviorScript 387 - Purchase poster.ls";
const closeConfirmDialogSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 88 - Close Confirm Dialog.ls";
const closeNoBalanceDialogSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 89 - Close No Balance Dialog.ls";
const roseauOrderInfoSourcePath =
  "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/incoming/GETORDERINFO.java";
const roseauPurchaseSourcePath =
  "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/incoming/PURCHASE.java";

type Release1CatalogueManifest = typeof defaultCatalogueManifest;
type Release1FurniManifest = typeof defaultFurniManifest;

interface Release1CatalogueProduct {
  readonly definitionId?: number;
  readonly definition?: {
    readonly name?: string;
    readonly description?: string;
  };
}

interface Release1CatalogueDeal {
  readonly callId?: string;
}

interface Release1FurniDefinition {
  readonly name?: string;
  readonly description?: string;
}

interface Release1CatalogueState {
  readonly open: boolean;
  readonly frame: string;
  readonly activeButtonIndex: number;
  readonly firstVisibleButtonIndex: number;
  readonly maxVisibleButtons: number;
  readonly plastoModel?: string;
  readonly plastoColor?: string;
  readonly plastoColorCode?: string;
  readonly posterCode?: string;
  readonly source: readonly string[];
}

interface Release1CatalogueConfirmState {
  readonly open: boolean;
  readonly frame: string;
  readonly purchaseCode: string;
  readonly lookupCallId: string;
  readonly price: number;
  readonly source: readonly string[];
}

interface Release1CatalogueInteractiveAction {
  readonly id: string;
  readonly kind:
    | "close"
    | "frame-link"
    | "index-click"
    | "index-scroll"
    | "purchase"
    | "purchase-from-field"
    | "confirm-purchase"
    | "confirm-close"
    | "plasto-color"
    | "plasto-model"
    | "poster-purchase"
    | "poster-set";
  readonly event: "mouseDown" | "mouseUp";
  readonly channel: number;
  readonly sourceFrame: string;
  readonly bounds: Release1Rect;
  readonly source: readonly string[];
  readonly targetFrame?: string;
  readonly sourceCode?: string;
  readonly lookupCallId?: string;
  readonly field?: string;
  readonly direction?: "left" | "right" | "next" | "prev";
  readonly plastoModel?: string;
  readonly plastoColor?: string;
  readonly plastoColorCode?: string;
}

interface Release1CatalogueTextRequest {
  readonly id: number;
  readonly command: "GETORDERINFO" | "PURCHASE";
  readonly body: string;
  readonly status: "pending" | "sent";
  readonly source: readonly string[];
}

interface Release1Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HabboV1CatalogueRuntimeHost {
  readonly movie: DirectorMovie;
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };

  queueRoomRequest?(request: Record<string, unknown>, release: string): void;
  syncDirectorOverlaySprites?(): void;
  syncWindowSpriteChannels?(release: string): void;
  syncWindowSnapshot?(): void;
  logDebug?(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedOnce?(key: string, feature: UnsupportedFeature): void;
}

export function showRelease1Catalogue(host: HabboV1CatalogueRuntimeHost, release: string, catName?: unknown): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  installRelease1CatalogueData(host.movie);
  const frame = catalogueInitialFrame;
  const state: Release1CatalogueState = {
    open: true,
    frame,
    activeButtonIndex: 1,
    firstVisibleButtonIndex: 1,
    maxVisibleButtons: catalogueManifest().index.maxVisibleButtons,
    source: [catalogueSourcePath, popupContextSourcePath]
  };
  host.movie.setProperty("release1CatalogueState", state);
  host.movie.setProperty("release1CatalogueCatalogName", typeof catName === "string" ? catName : "basicA");
  host.movie.setProperty("release1CatalogueConfirmState", undefined);
  host.movie.setProperty("release1CatalogueOrderCode", "");
  const synced = syncRelease1Catalogue(host, release);
  host.logDebug?.("catalogue", synced ? "ok" : "warn", `release1 show frame=${frame} sprites=${catalogueSpriteCount(host.movie)}`);
  return synced;
}

export function hideRelease1Catalogue(host: HabboV1CatalogueRuntimeHost, release: string): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  const state = readCatalogueState(host.movie);
  if (!state?.open) {
    return false;
  }

  host.movie.setProperty("release1CatalogueState", { ...state, open: false });
  host.movie.setProperty("release1CatalogueConfirmState", undefined);
  setCatalogueOverlaySprites(host.movie, []);
  setConfirmOverlaySprites(host.movie, []);
  syncRelease1CatalogueInteractions(host.movie, [], []);
  host.syncDirectorOverlaySprites?.();
  host.logDebug?.("catalogue", "info", "release1 hide");
  return true;
}

export function activateRelease1CatalogueElement(
  host: HabboV1CatalogueRuntimeHost,
  elementId: string,
  activation: HabboWindowElementActivation | undefined,
  release: string
): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  const action = resolveCatalogueAction(host.movie, elementId, activation);
  if (!action) {
    return false;
  }

  switch (action.kind) {
    case "close":
    case "confirm-close":
      if (action.kind === "confirm-close") {
        hideRelease1CatalogueConfirm(host, release);
        return true;
      }
      return hideRelease1Catalogue(host, release);
    case "frame-link":
      if (action.targetFrame) {
        setRelease1CatalogueFrame(host, action.targetFrame, action.source, release);
      }
      return true;
    case "index-click":
      activateCatalogueIndexClick(host, action, activation, release);
      return true;
    case "index-scroll":
      activateCatalogueIndexScroll(host, action, release);
      return true;
    case "purchase":
      if (action.sourceCode) {
        queueRelease1CatalogueOrderInfo(host, action.sourceCode, action.lookupCallId ?? orderLookupCallId(action.sourceCode), action.source);
      }
      return true;
    case "purchase-from-field":
      queueRelease1CatalogueOrderInfoFromField(host, action, release);
      return true;
    case "confirm-purchase":
      queueRelease1CataloguePurchase(host, action.source, release);
      hideRelease1CatalogueConfirm(host, release);
      return true;
    case "plasto-color":
      activateCataloguePlastoColor(host, action, release);
      return true;
    case "plasto-model":
      activateCataloguePlastoModel(host, action, release);
      return true;
    case "poster-purchase":
      queueRelease1PosterPurchase(host, action.source);
      return true;
    case "poster-set":
      activatePosterSet(host, action, release);
      return true;
  }
}

function resolveCatalogueAction(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): Release1CatalogueInteractiveAction | undefined {
  const actions = readCatalogueActions(movie).filter((candidate) => candidate.id === elementId);
  if (actions.length === 0) {
    return undefined;
  }

  if (activation?.event !== undefined) {
    const exact = actions.find((candidate) => candidate.event === activation.event);
    if (exact) {
      return exact;
    }
  }

  const action = actions[0];
  if (!action) {
    return undefined;
  }

  // The v1 source closes purchase dialogs from `mouseDown`, but browser button
  // controls also finish with `mouseUp`. Only close-only actions may use this
  // fallback, so purchase and page-change semantics stay source-event strict.
  if (action.kind === "close" || action.kind === "confirm-close") {
    return action;
  }

  return activation?.event === undefined ? action : undefined;
}

export function handleRelease1CatalogueOrderInfoPacket(host: HabboV1CatalogueRuntimeHost, body: string, release: string): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  const parsed = parseOrderInfoBody(body);
  if (!parsed) {
    host.recordUnsupportedOnce?.("release1-catalogue-orderinfo-unparsed", {
      subsystem: "habbo",
      feature: "release1-catalogue-orderinfo-unparsed",
      detail: `release1 ORDERINFO packet body could not be parsed: ${body}`,
      source: orderInfoSourcePath
    });
    return true;
  }

  const lookupCallId = orderLookupCallId(parsed.purchaseCode);
  const product = catalogueProduct(lookupCallId);
  const deal = catalogueDeal(lookupCallId);
  const definition = product?.definitionId !== undefined ? furniDefinition(product.definitionId) : undefined;
  const itemText = definition?.name ?? product?.definition?.name ?? deal?.callId ?? lookupCallId;
  const description = definition?.description ?? product?.definition?.description ?? itemText;
  setMemberTextByName(host.movie, "purchase_item_txt_e", `${description} costs ${parsed.price} credits`);
  setMemberTextByName(host.movie, "purchase_confirm_txt_e", `You have ${currentCredits(host.movie)} in your purse.`);

  const hasEnoughCredits = currentCredits(host.movie) >= parsed.price;
  const frame = hasEnoughCredits
    ? catalogueManifest().runtime.confirmationPopup.frames.enoughCredits
    : catalogueManifest().runtime.confirmationPopup.frames.notEnoughCredits;
  const confirmState: Release1CatalogueConfirmState = {
    open: true,
    frame,
    purchaseCode: parsed.purchaseCode,
    lookupCallId,
    price: parsed.price,
    source: [orderInfoSourcePath, roseauOrderInfoSourcePath]
  };
  host.movie.setProperty("release1CatalogueConfirmState", confirmState);
  host.movie.setProperty("release1CatalogueOrderCode", parsed.purchaseCode);
  syncRelease1CatalogueConfirm(host, release);
  host.logDebug?.("catalogue", "ok", `release1 ORDERINFO code=${parsed.purchaseCode} price=${parsed.price}`);
  return true;
}

export function handleRelease1CataloguePurchaseResultPacket(
  host: HabboV1CatalogueRuntimeHost,
  packetName: string,
  body: string,
  release: string
): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  if (packetName === "ADDSTRIPITEM" || packetName === "PURCHASE_ADDSTRIPITEM") {
    const purchasePending = packetName === "PURCHASE_ADDSTRIPITEM" || hasRelease1CataloguePurchasePending(host.movie);
    const stripMode = purchasePending ? "last" : "new";
    hideRelease1CatalogueConfirm(host, release);
    host.movie.setProperty("release1CatalogueLastPurchaseResult", {
      packetName,
      body,
      purchasePending,
      stripMode,
      source: [orderInfoSourcePath, roseauPurchaseSourcePath]
    });
    host.queueRoomRequest?.({ command: "GETSTRIP", stripMode }, release);
    if (purchasePending || host.movie.getProperty("roomHandVisible") === true) {
      host.movie.setProperty("roomHandOpenPending", true);
    }
    host.movie.setProperty("release1CataloguePurchaseAwaitingResult", undefined);
    clearRelease1CataloguePurchaseRequests(host.movie);
    if (purchasePending) {
      showRelease1EntryAlert(host.movie, "BuyingOK", undefined, body, [orderInfoSourcePath, roseauPurchaseSourcePath]);
    }
    host.logDebug?.("catalogue", "ok", purchasePending ? "release1 purchase added strip item" : "release1 ADDSTRIPITEM queued strip refresh");
    return true;
  }

  if (packetName === "PURCHASE_OK" || packetName === "PURCHASE_NOBALANCE" || packetName === "PURCHASE_ERROR") {
    hideRelease1CatalogueConfirm(host, release);
    host.movie.setProperty("release1CatalogueLastPurchaseResult", {
      packetName,
      body,
      source: [orderInfoSourcePath]
    });
    host.movie.setProperty("release1CataloguePurchaseAwaitingResult", undefined);
    clearRelease1CataloguePurchaseRequests(host.movie);
    if (packetName === "PURCHASE_OK") {
      host.queueRoomRequest?.({ command: "GETSTRIP", stripMode: "last" }, release);
      host.movie.setProperty("roomHandOpenPending", true);
      showRelease1EntryAlert(host.movie, "BuyingOK", undefined, body, [orderInfoSourcePath]);
    } else if (packetName === "PURCHASE_NOBALANCE") {
      showRelease1EntryAlert(host.movie, "nobalance", "You don't have enough credits!", body, [orderInfoSourcePath]);
    } else {
      showRelease1EntryAlert(host.movie, "purchasingerror", "Purchasing error", body, [orderInfoSourcePath]);
    }
    host.logDebug?.("catalogue", packetName === "PURCHASE_OK" ? "ok" : "warn", `release1 ${packetName}`);
    return true;
  }

  return false;
}

export function readRelease1CatalogueTextRequests(movie: DirectorMovie): Release1CatalogueTextRequest[] {
  const value = movie.getProperty("release1CatalogueTextRequests");
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isCatalogueTextRequest);
}

export function markRelease1CatalogueTextRequestSent(movie: DirectorMovie, id: number): void {
  movie.setProperty("release1CatalogueTextRequests", readRelease1CatalogueTextRequests(movie).map((request) => {
    return request.id === id ? { ...request, status: "sent" } : request;
  }));
}

function clearRelease1CataloguePurchaseRequests(movie: DirectorMovie): void {
  movie.setProperty("release1CatalogueTextRequests", readRelease1CatalogueTextRequests(movie).filter((request) => {
    return request.command !== "PURCHASE";
  }));
}

function syncRelease1Catalogue(host: HabboV1CatalogueRuntimeHost, release: string): boolean {
  const state = readCatalogueState(host.movie);
  if (!state?.open) {
    return false;
  }

  applyCatalogueDynamicMembers(host.movie, state);
  const recordedSprites = parseRecordedNavigatorFrame(host.movie, `${state.frame}.recorded`, {
    castName: catalogueCastName,
    startChannel: catalogueStartChannel,
    locZ: catalogueLocZ,
    place: cataloguePlace
  });
  if (recordedSprites.length === 0) {
    host.recordUnsupportedOnce?.("release1-catalogue-recorded-frame-missing", {
      subsystem: "habbo",
      feature: "release1-catalogue-recorded-frame-missing",
      detail: `release1 catalogue frame ${state.frame}.recorded was not available from catalog_text_fi`,
      source: catalogueSourcePath
    });
    return false;
  }

  const sprites = recordedSprites.map((sprite) => recordedSpriteManifest(host.movie, sprite));
  setCatalogueOverlaySprites(host.movie, sprites);
  syncRelease1CatalogueInteractions(host.movie, recordedSprites, readConfirmSprites(host.movie));
  host.movie.setProperty("release1CatalogueVisualState", {
    frame: state.frame,
    spriteCount: recordedSprites.length,
    source: [catalogueSourcePath, popupContextSourcePath]
  });
  host.syncDirectorOverlaySprites?.();
  return true;
}

function syncRelease1CatalogueConfirm(host: HabboV1CatalogueRuntimeHost, release: string): boolean {
  const confirmState = readCatalogueConfirmState(host.movie);
  if (!confirmState?.open) {
    setConfirmOverlaySprites(host.movie, []);
    syncRelease1CatalogueInteractions(host.movie, readCatalogueSprites(host.movie), []);
    return false;
  }

  const recordedSprites = parseRecordedNavigatorFrame(host.movie, `${confirmState.frame}.recorded`, {
    castName: confirmCastName,
    startChannel: confirmStartChannel,
    locZ: confirmLocZ,
    place: confirmPlace
  });
  if (recordedSprites.length === 0) {
    host.recordUnsupportedOnce?.("release1-catalogue-confirm-recorded-frame-missing", {
      subsystem: "habbo",
      feature: "release1-catalogue-confirm-recorded-frame-missing",
      detail: `release1 purchase confirmation frame ${confirmState.frame}.recorded was not available from GoldFish`,
      source: orderInfoSourcePath
    });
    return false;
  }

  setConfirmOverlaySprites(host.movie, recordedSprites.map((sprite) => recordedSpriteManifest(host.movie, sprite)));
  syncRelease1CatalogueInteractions(host.movie, readCatalogueSprites(host.movie), recordedSprites);
  host.syncDirectorOverlaySprites?.();
  return true;
}

function hideRelease1CatalogueConfirm(host: HabboV1CatalogueRuntimeHost, release: string): void {
  host.movie.setProperty("release1CatalogueConfirmState", undefined);
  setConfirmOverlaySprites(host.movie, []);
  syncRelease1CatalogueInteractions(host.movie, readCatalogueSprites(host.movie), []);
  host.syncDirectorOverlaySprites?.();
}

function setRelease1CatalogueFrame(
  host: HabboV1CatalogueRuntimeHost,
  frame: string,
  source: readonly string[],
  release: string
): void {
  const state = readCatalogueState(host.movie);
  const current = state ?? {
    open: true,
    frame: catalogueInitialFrame,
    activeButtonIndex: 1,
    firstVisibleButtonIndex: 1,
    maxVisibleButtons: catalogueManifest().index.maxVisibleButtons,
    source: [catalogueSourcePath]
  };
  const buttonIndex = catalogueButtonIndexForFrame(frame) ?? current.activeButtonIndex;
  host.movie.setProperty("release1CatalogueState", {
    ...current,
    open: true,
    frame,
    activeButtonIndex: buttonIndex,
    source
  } satisfies Release1CatalogueState);
  initializeFrameState(host.movie, frame);
  syncRelease1Catalogue(host, release);
}

function activateCatalogueIndexClick(
  host: HabboV1CatalogueRuntimeHost,
  action: Release1CatalogueInteractiveAction,
  activation: HabboWindowElementActivation | undefined,
  release: string
): void {
  const state = readCatalogueState(host.movie);
  const localX = typeof activation?.localX === "number" ? activation.localX : 0;
  const buttonWidth = catalogueButtonWidth();
  const clickedIndex = Math.max(1, Math.floor(localX / buttonWidth) + (state?.firstVisibleButtonIndex ?? 1));
  const button = catalogueManifest().index.buttons[clickedIndex - 1];
  if (button?.frame) {
    setRelease1CatalogueFrame(host, button.frame, [catalogueIndexSourcePath, ...action.source], release);
  }
}

function activateCatalogueIndexScroll(host: HabboV1CatalogueRuntimeHost, action: Release1CatalogueInteractiveAction, release: string): void {
  const state = readCatalogueState(host.movie);
  if (!state) {
    return;
  }

  const pageCount = catalogueManifest().index.buttons.length;
  const maxFirst = Math.max(1, pageCount - state.maxVisibleButtons + 1);
  const nextFirst = action.direction === "left"
    ? Math.max(1, state.firstVisibleButtonIndex - 1)
    : Math.min(maxFirst, state.firstVisibleButtonIndex + 1);
  host.movie.setProperty("release1CatalogueState", {
    ...state,
    firstVisibleButtonIndex: nextFirst,
    source: [action.direction === "left" ? catalogueLeftArrowSourcePath : catalogueRightArrowSourcePath, ...action.source]
  } satisfies Release1CatalogueState);
  syncRelease1Catalogue(host, release);
}

function activateCataloguePlastoColor(host: HabboV1CatalogueRuntimeHost, action: Release1CatalogueInteractiveAction, release: string): void {
  const state = readCatalogueState(host.movie);
  if (!state) {
    return;
  }
  const nextState: Release1CatalogueState = {
    ...state,
    ...(action.plastoColor ? { plastoColor: normalizeRgbColorString(action.plastoColor) ?? action.plastoColor } : {}),
    plastoColorCode: action.plastoColorCode ?? state.plastoColorCode ?? "H",
    source: [plastoColorSourcePath, ...action.source]
  };
  host.movie.setProperty("release1CatalogueState", nextState);
  updatePlastoCode(host.movie, nextState);
  syncRelease1Catalogue(host, release);
}

function activateCataloguePlastoModel(host: HabboV1CatalogueRuntimeHost, action: Release1CatalogueInteractiveAction, release: string): void {
  const state = readCatalogueState(host.movie);
  if (!state) {
    return;
  }
  const nextState: Release1CatalogueState = {
    ...state,
    plastoModel: action.plastoModel ?? state.plastoModel ?? "E",
    source: [plastoModelSourcePath, ...action.source]
  };
  host.movie.setProperty("release1CatalogueState", nextState);
  updatePlastoCode(host.movie, nextState);
  if (action.targetFrame) {
    setRelease1CatalogueFrame(host, action.targetFrame, [plastoModelSourcePath, ...action.source], release);
  } else {
    syncRelease1Catalogue(host, release);
  }
}

function activatePosterSet(host: HabboV1CatalogueRuntimeHost, action: Release1CatalogueInteractiveAction, release: string): void {
  const current = readRecord(host.movie.getProperty("release1CataloguePosterState"));
  const firstLine = typeof current?.firstLine === "number" ? current.firstLine : 1;
  const nextFirstLine = action.direction === "prev" ? Math.max(1, firstLine - 10) : firstLine + 10;
  host.movie.setProperty("release1CataloguePosterState", {
    firstLine: nextFirstLine,
    source: [posterSetSourcePath, ...action.source]
  });
  initializePosterFrame(host.movie);
  syncRelease1Catalogue(host, release);
}

function queueRelease1CatalogueOrderInfo(
  host: HabboV1CatalogueRuntimeHost,
  sourceCode: string,
  lookupCallId: string,
  source: readonly string[]
): void {
  const request: Release1CatalogueTextRequest = {
    id: nextCatalogueTextRequestId(host.movie),
    command: "GETORDERINFO",
    body: `/${sourceCode} ${currentUserName(host)}`.trimEnd(),
    status: "pending",
    source: [purchaseSourcePath, roseauOrderInfoSourcePath, ...source]
  };
  host.movie.setProperty("release1CatalogueTextRequests", [
    ...readRelease1CatalogueTextRequests(host.movie),
    request
  ]);
  host.movie.setProperty("release1CatalogueLastOrderInfo", {
    lookupCallId,
    sourceCode,
    source: request.source
  });
  host.logDebug?.("catalogue", "info", `release1 GETORDERINFO code=${sourceCode}`);
}

function queueRelease1CatalogueOrderInfoFromField(
  host: HabboV1CatalogueRuntimeHost,
  action: Release1CatalogueInteractiveAction,
  release: string
): void {
  const fieldName = action.field ?? "";
  const sourceCode = fieldText(host.movie, fieldName).trim();
  if (sourceCode.length === 0) {
    return;
  }
  queueRelease1CatalogueOrderInfo(host, sourceCode, orderLookupCallId(sourceCode), [purchaseFromFieldSourcePath, ...action.source]);
  syncRelease1Catalogue(host, release);
}

function queueRelease1PosterPurchase(host: HabboV1CatalogueRuntimeHost, source: readonly string[]): void {
  const state = readCatalogueState(host.movie);
  const posterCode = state?.posterCode ?? String(readRecord(host.movie.getProperty("release1CataloguePosterState"))?.posterCode ?? "");
  if (!posterCode) {
    return;
  }
  queueRelease1CatalogueOrderInfo(host, posterCode, orderLookupCallId(posterCode), [posterPurchaseSourcePath, ...source]);
}

function queueRelease1CataloguePurchase(host: HabboV1CatalogueRuntimeHost, source: readonly string[], release: string): void {
  const confirmState = readCatalogueConfirmState(host.movie);
  const purchaseCode = confirmState?.purchaseCode ?? String(host.movie.getProperty("release1CatalogueOrderCode") ?? "");
  if (!purchaseCode) {
    return;
  }

  const request: Release1CatalogueTextRequest = {
    id: nextCatalogueTextRequestId(host.movie),
    command: "PURCHASE",
    body: `/${purchaseCode} ${currentUserName(host)}`.trimEnd(),
    status: "pending",
    source: [purchaseConfirmSourcePath, roseauPurchaseSourcePath, ...source]
  };
  host.movie.setProperty("release1CatalogueTextRequests", [
    ...readRelease1CatalogueTextRequests(host.movie),
    request
  ]);
  host.movie.setProperty("release1CataloguePurchaseAwaitingResult", {
    purchaseCode,
    source: request.source
  });
  host.movie.setProperty("release1CatalogueOrderCode", "");
  host.logDebug?.("catalogue", "info", `release1 PURCHASE code=${purchaseCode}`);
}

function hasRelease1CataloguePurchasePending(movie: DirectorMovie): boolean {
  const awaiting = movie.getProperty("release1CataloguePurchaseAwaitingResult");
  if (typeof awaiting === "object"
    && awaiting !== null
    && typeof (awaiting as { readonly purchaseCode?: unknown }).purchaseCode === "string"
    && (awaiting as { readonly purchaseCode: string }).purchaseCode.length > 0) {
    return true;
  }

  return readRelease1CatalogueTextRequests(movie).some((request) => request.command === "PURCHASE"
    && (request.status === "pending" || request.status === "sent"));
}

function syncRelease1CatalogueInteractions(
  movie: DirectorMovie,
  catalogueSprites: readonly RecordedSprite[],
  confirmSprites: readonly RecordedSprite[]
): void {
  const existing = readInteractiveElements(movie)
    .filter((element) => !element.id.startsWith("release1_catalogue_"));
  const elements: HabboWindowInteractiveElement[] = [];
  const actions: Release1CatalogueInteractiveAction[] = [];
  collectCatalogueInteractions(movie, catalogueSprites, catalogueWindowId, elements, actions);
  collectCatalogueInteractions(movie, confirmSprites, confirmWindowId, elements, actions);
  movie.setProperty("windowInteractiveElements", [
    ...existing,
    ...elements
  ]);
  movie.setProperty("release1CatalogueInteractiveActions", actions);
}

function collectCatalogueInteractions(
  movie: DirectorMovie,
  sprites: readonly RecordedSprite[],
  windowId: string,
  elements: HabboWindowInteractiveElement[],
  actions: Release1CatalogueInteractiveAction[]
): void {
  for (const sprite of sprites) {
    const action = actionForSprite(movie, sprite, windowId);
    if (!action) {
      continue;
    }
    elements.push({
      id: action.id,
      windowId,
      kind: action.kind === "confirm-purchase" || action.kind === "purchase" ? "button" : "link",
      ...action.bounds,
      label: action.kind,
      cursor: "cursor.finger",
      clientId: action.kind
    });
    actions.push(action);
  }
}

function actionForSprite(movie: DirectorMovie, sprite: RecordedSprite, windowId: string): Release1CatalogueInteractiveAction | undefined {
  const bounds = boundsForRecordedSprite(movie, sprite);
  for (const behavior of sprite.behaviors) {
    const behaviorName = behavior.name.toLowerCase();
    const base = {
      channel: sprite.channel,
      sourceFrame: windowId === confirmWindowId ? readCatalogueConfirmState(movie)?.frame ?? "" : readCatalogueState(movie)?.frame ?? "",
      bounds
    };
    switch (behaviorName) {
      case "close catalog":
        return {
          ...base,
          id: `release1_catalogue_close_${sprite.channel}`,
          kind: "close",
          event: "mouseUp",
          source: [catalogueSourcePath]
        };
      case "purchase":
        return {
          ...base,
          id: `release1_catalogue_purchase_${sprite.channel}`,
          kind: "purchase",
          event: "mouseDown",
          sourceCode: stringBehaviorValue(behavior.properties.code),
          lookupCallId: orderLookupCallId(stringBehaviorValue(behavior.properties.code)),
          source: [purchaseSourcePath]
        };
      case "purchase from field":
        return {
          ...base,
          id: `release1_catalogue_purchase_field_${sprite.channel}`,
          kind: "purchase-from-field",
          event: "mouseDown",
          field: stringBehaviorValue(behavior.properties.theField),
          source: [purchaseFromFieldSourcePath]
        };
      case "purchase after confirm":
        return {
          ...base,
          id: `release1_catalogue_confirm_purchase_${sprite.channel}`,
          kind: "confirm-purchase",
          event: "mouseUp",
          source: [purchaseConfirmSourcePath]
        };
      case "close confirm dialog":
        return {
          ...base,
          id: `release1_catalogue_confirm_close_${sprite.channel}`,
          kind: "confirm-close",
          event: "mouseDown",
          source: [closeConfirmDialogSourcePath]
        };
      case "close no balance dialog":
        return {
          ...base,
          id: `release1_catalogue_confirm_close_${sprite.channel}`,
          kind: "confirm-close",
          event: "mouseDown",
          source: [closeNoBalanceDialogSourcePath]
        };
      case "go to frame context sensitive":
        return {
          ...base,
          id: `release1_catalogue_frame_${sanitizeElementId(stringBehaviorValue(behavior.properties.sFrame))}_${sprite.channel}`,
          kind: "frame-link",
          event: "mouseUp",
          targetFrame: stringBehaviorValue(behavior.properties.sFrame),
          source: [catalogueSourcePath]
        };
      case "scrollcatalogindexpicture":
        return {
          ...base,
          id: `release1_catalogue_index_${sprite.channel}`,
          kind: "index-click",
          event: "mouseUp",
          source: [catalogueIndexSourcePath]
        };
      case "catalog_leftarrow":
        return {
          ...base,
          id: `release1_catalogue_index_left_${sprite.channel}`,
          kind: "index-scroll",
          event: "mouseDown",
          direction: "left",
          source: [catalogueLeftArrowSourcePath]
        };
      case "catalog_rightarrow":
        return {
          ...base,
          id: `release1_catalogue_index_right_${sprite.channel}`,
          kind: "index-scroll",
          event: "mouseDown",
          direction: "right",
          source: [catalogueRightArrowSourcePath]
        };
      case "plasto color changer":
        return {
          ...base,
          id: `release1_catalogue_plasto_color_${sprite.channel}`,
          kind: "plasto-color",
          event: "mouseDown",
          plastoColor: stringBehaviorValue(behavior.properties.plastoColor),
          plastoColorCode: stringBehaviorValue(behavior.properties.plastoColorCode),
          source: [plastoColorSourcePath]
        };
      case "plasto model changer":
        return {
          ...base,
          id: `release1_catalogue_plasto_model_${sprite.channel}`,
          kind: "plasto-model",
          event: "mouseDown",
          plastoModel: stringBehaviorValue(behavior.properties.PlastoCodeModel),
          targetFrame: stringBehaviorValue(behavior.properties.sFrame),
          source: [plastoModelSourcePath]
        };
      case "purchase poster":
        return {
          ...base,
          id: `release1_catalogue_poster_purchase_${sprite.channel}`,
          kind: "poster-purchase",
          event: "mouseDown",
          source: [posterPurchaseSourcePath]
        };
      case "nextprevposterset":
        return {
          ...base,
          id: `release1_catalogue_poster_set_${sprite.channel}`,
          kind: "poster-set",
          event: "mouseUp",
          direction: stringBehaviorValue(behavior.properties.pDirection) === "prev" ? "prev" : "next",
          source: [posterSetSourcePath]
        };
    }
  }
  return undefined;
}

function applyCatalogueDynamicMembers(movie: DirectorMovie, state: Release1CatalogueState): void {
  applyCatalogueIndexMembers(movie, state);
  if (state.frame === "plas") {
    const plastoState: Release1CatalogueState = {
      ...state,
      plastoModel: state.plastoModel ?? "E",
      plastoColor: state.plastoColor ?? "#ffffff",
      plastoColorCode: state.plastoColorCode ?? "H"
    };
    movie.setProperty("release1CatalogueState", plastoState);
    updatePlastoCode(movie, plastoState);
  }
  if (state.frame === "posters") {
    initializePosterFrame(movie);
  }
}

function applyCatalogueIndexMembers(movie: DirectorMovie, state: Release1CatalogueState): void {
  const cast = movie.cast.castLibs.find((candidate) => candidate.name === catalogueCastName);
  if (!cast) {
    return;
  }

  const members = cast.members.map((member) => {
    if (member.name === catalogueIndexFullMemberName) {
      return {
        ...memberManifestFromMember(member),
        type: "bitmap",
        width: catalogueButtonWidth() * catalogueManifest().index.buttons.length,
        height: catalogueButtonHeight(),
        composite: createCatalogueFullIndexComposite(state)
      } satisfies DirectorMemberManifest;
    }
    if (member.name === catalogueIndexCropMemberName) {
      return {
        ...memberManifestFromMember(member),
        type: "bitmap",
        width: catalogueCropWidth(),
        height: catalogueButtonHeight(),
        composite: createCatalogueCropIndexComposite(state)
      } satisfies DirectorMemberManifest;
    }
    return memberManifestFromMember(member);
  });

  movie.cast.importCastLib({
    number: cast.number,
    ...(cast.name ? { name: cast.name } : {}),
    ...(cast.fileName ? { fileName: cast.fileName } : {}),
    ...(cast.preloadMode !== undefined ? { preloadMode: cast.preloadMode } : {}),
    members
  } satisfies DirectorCastLibManifest);
}

function createCatalogueFullIndexComposite(state: Release1CatalogueState): DirectorBitmapComposite {
  const width = catalogueButtonWidth() * catalogueManifest().index.buttons.length;
  const height = catalogueButtonHeight();
  return {
    width,
    height,
    layers: catalogueManifest().index.buttons.flatMap((button, index) => {
      const member = index + 1 === state.activeButtonIndex ? button.activeMember : button.inactiveMember;
      return bitmapLayerFromRecord(member, index * catalogueButtonWidth(), 0, catalogueButtonWidth(), height);
    })
  };
}

function createCatalogueCropIndexComposite(state: Release1CatalogueState): DirectorBitmapComposite {
  const buttonWidth = catalogueButtonWidth();
  const height = catalogueButtonHeight();
  const firstVisible = Math.max(1, state.firstVisibleButtonIndex);
  const visibleCount = state.maxVisibleButtons;
  const buttons = catalogueManifest().index.buttons.slice(firstVisible - 1, firstVisible + visibleCount);
  return {
    width: catalogueCropWidth(),
    height,
    layers: buttons.flatMap((button, index) => {
      const absoluteIndex = firstVisible + index;
      const member = absoluteIndex === state.activeButtonIndex ? button.activeMember : button.inactiveMember;
      return bitmapLayerFromRecord(member, index * buttonWidth - 1, 0, buttonWidth, height);
    })
  };
}

function initializeFrameState(movie: DirectorMovie, frame: string): void {
  if (frame === "plas") {
    const state = readCatalogueState(movie);
    if (state) {
      const nextState = {
        ...state,
        plastoModel: state.plastoModel ?? "E",
        plastoColor: state.plastoColor ?? "#ffffff",
        plastoColorCode: state.plastoColorCode ?? "H"
      } satisfies Release1CatalogueState;
      movie.setProperty("release1CatalogueState", nextState);
      updatePlastoCode(movie, nextState);
    }
  }
  if (frame === "posters") {
    initializePosterFrame(movie);
  }
}

function updatePlastoCode(movie: DirectorMovie, state: Release1CatalogueState): void {
  const model = state.plastoModel ?? "E";
  const color = state.plastoColorCode ?? "H";
  setMemberTextByName(movie, plastoCodeFieldMemberName, `A1 ${model}${color}P`);
  movie.setProperty("release1CataloguePlastoState", {
    model,
    color,
    colorRgb: state.plastoColor ?? "#ffffff",
    source: [plastoCodeSourcePath]
  });
}

function initializePosterFrame(movie: DirectorMovie): void {
  const posters = posterEntries(movie);
  const firstLine = Number(readRecord(movie.getProperty("release1CataloguePosterState"))?.firstLine ?? 1);
  const selected = posters[Math.max(0, firstLine - 1)];
  if (!selected) {
    return;
  }
  setMemberTextByName(movie, "Selected poster name", selected.name);
  setMemberTextByName(movie, "Poster list", posters.slice(firstLine - 1, firstLine + 9)
    .map((poster, index) => `${firstLine + index}. ${poster.label}`)
    .join("\r"));
  movie.setProperty("release1CataloguePosterState", {
    firstLine,
    posterCode: selected.code,
    source: [posterChooserSourcePath]
  });
}

function setCatalogueOverlaySprites(movie: DirectorMovie, sprites: readonly DirectorSpriteChannelManifest[]): void {
  movie.setProperty("windowOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isCatalogueSprite(sprite)),
    ...sprites
  ]);
  movie.setProperty("directorOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isCatalogueSprite(sprite)),
    ...sprites
  ]);
}

function setConfirmOverlaySprites(movie: DirectorMovie, sprites: readonly DirectorSpriteChannelManifest[]): void {
  movie.setProperty("windowOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isConfirmSprite(sprite)),
    ...sprites
  ]);
  movie.setProperty("directorOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isConfirmSprite(sprite)),
    ...sprites
  ]);
}

function readCatalogueSprites(movie: DirectorMovie): readonly RecordedSprite[] {
  const state = readCatalogueState(movie);
  if (!state?.open) {
    return [];
  }
  return parseRecordedNavigatorFrame(movie, `${state.frame}.recorded`, {
    castName: catalogueCastName,
    startChannel: catalogueStartChannel,
    locZ: catalogueLocZ,
    place: cataloguePlace
  });
}

function readConfirmSprites(movie: DirectorMovie): readonly RecordedSprite[] {
  const state = readCatalogueConfirmState(movie);
  if (!state?.open) {
    return [];
  }
  return parseRecordedNavigatorFrame(movie, `${state.frame}.recorded`, {
    castName: confirmCastName,
    startChannel: confirmStartChannel,
    locZ: confirmLocZ,
    place: confirmPlace
  });
}

function recordedSpriteManifest(movie: DirectorMovie, sprite: RecordedSprite): DirectorSpriteChannelManifest {
  const member = movie.cast.getMember(sprite.member);
  const textColorSource = (member?.type === "text" || member?.type === "field") && sprite.fgColor
    ? "sprite"
    : undefined;
  const bgColor = sourceBackedSpriteBgColor(movie, sprite) ?? sprite.bgColor;
  const blend = sourceBackedSpriteBlend(sprite) ?? sprite.blend;

  return {
    channel: sprite.channel,
    member: sprite.member,
    loc: sprite.loc,
    locZ: sprite.locZ,
    ink: sprite.ink,
    blend,
    width: sprite.width,
    height: sprite.height,
    ...(sprite.fgColor ? { fgColor: sprite.fgColor } : {}),
    ...(bgColor ? { bgColor } : {}),
    ...(textColorSource ? { textColorSource } : {})
  };
}

function sourceBackedSpriteBgColor(movie: DirectorMovie, sprite: RecordedSprite): string | undefined {
  const plastoColorChanger = sprite.behaviors.find((behavior) => behavior.name.toLowerCase() === "plasto color changer");
  if (plastoColorChanger) {
    return normalizeRgbColorString(stringBehaviorValue(plastoColorChanger.properties.plastoColor));
  }

  const isPlastoFurniture = sprite.behaviors.some((behavior) => behavior.name.toLowerCase() === "plasto furniture");
  if (isPlastoFurniture) {
    return readCatalogueState(movie)?.plastoColor ?? "#ffffff";
  }

  return undefined;
}

function sourceBackedSpriteBlend(sprite: RecordedSprite): number | undefined {
  const hasDialogClickBlocker = sprite.behaviors.some((behavior) => behavior.name.toLowerCase() === "dialogyoucantclickotherplaces");
  return hasDialogClickBlocker ? 0 : undefined;
}

function normalizeRgbColorString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = /^(\d+),\s*(\d+),\s*(\d+)$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  return rgbToHex(
    Number.parseInt(match[1] ?? "0", 10),
    Number.parseInt(match[2] ?? "0", 10),
    Number.parseInt(match[3] ?? "0", 10)
  );
}

function isCatalogueSprite(sprite: DirectorSpriteChannelManifest): boolean {
  return typeof sprite.locZ === "number"
    && sprite.locZ >= catalogueLocZ
    && sprite.locZ < confirmLocZ;
}

function isConfirmSprite(sprite: DirectorSpriteChannelManifest): boolean {
  return (
    typeof sprite.locZ === "number"
      && sprite.locZ >= confirmLocZ
      && sprite.locZ < confirmLocZ + 1000
  ) || (sprite.channel >= confirmStartChannel && sprite.channel <= confirmEndChannel);
}

function catalogueSpriteCount(movie: DirectorMovie): number {
  return readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter(isCatalogueSprite).length;
}

function parseOrderInfoBody(body: string): { readonly purchaseCode: string; readonly price: number } | undefined {
  const lines = body.replace(/^\s+/, "").split(/\r\n|\r|\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const price = Number.parseInt(lines[1] ?? "", 10);
    return {
      purchaseCode: lines[0] ?? "",
      price: Number.isFinite(price) ? price : 0
    };
  }

  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const price = Number.parseInt(words[words.length - 1] ?? "", 10);
    return {
      purchaseCode: words.slice(0, -1).join(" "),
      price: Number.isFinite(price) ? price : 0
    };
  }
  return undefined;
}

function queueOrReadPropertyNumber(movie: DirectorMovie, key: string): number {
  const value = movie.getProperty(key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nextCatalogueTextRequestId(movie: DirectorMovie): number {
  const next = queueOrReadPropertyNumber(movie, "release1CatalogueNextTextRequestId") + 1;
  movie.setProperty("release1CatalogueNextTextRequestId", next);
  return next;
}

function currentCredits(movie: DirectorMovie): number {
  const entryObject = readRecord(movie.getProperty("release1EntryUserObject"));
  const creditsProperty = Number(movie.getProperty("credits") ?? movie.getProperty("currentCredits") ?? 0);
  const userCredits = Number(entryObject?.credits ?? 0);
  const creditMember = Number(movie.cast.getMemberByName("habbo_credits")?.text?.match(/\d+/)?.[0] ?? 0);
  return [creditsProperty, userCredits, creditMember].find((value) => Number.isFinite(value) && value > 0) ?? 0;
}

function currentUserName(host: HabboV1CatalogueRuntimeHost): string {
  const session = host.objectManager.getObject("#session");
  const sessionName = String(session?.get("userName") ?? session?.get("user_name") ?? "");
  const userObject = readRecord(host.movie.getProperty("release1EntryUserObject"));
  return sessionName || String(userObject?.name ?? "");
}

function fieldText(movie: DirectorMovie, fieldName: string): string {
  if (!fieldName) {
    return "";
  }
  return movie.cast.getMemberByName(fieldName)?.text ?? "";
}

function catalogueManifest(): Release1CatalogueManifest {
  return defaultCatalogueManifest as Release1CatalogueManifest;
}

function furniManifest(): Release1FurniManifest {
  return defaultFurniManifest as Release1FurniManifest;
}

function catalogueProduct(callId: string): Release1CatalogueProduct | undefined {
  return (catalogueManifest().products as Record<string, Release1CatalogueProduct>)[callId];
}

function catalogueDeal(callId: string): Release1CatalogueDeal | undefined {
  return (catalogueManifest().deals as Record<string, Release1CatalogueDeal>)[callId];
}

function furniDefinition(definitionId: number): Release1FurniDefinition | undefined {
  return (furniManifest().definitions as Record<string, Release1FurniDefinition>)[String(definitionId)];
}

function orderLookupCallId(sourceCode: string): string {
  const words = sourceCode.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-Z]\d$/i.test(words[0] ?? "")) {
    return words[1] ?? "";
  }
  return words[0] ?? sourceCode.trim();
}

function catalogueButtonWidth(): number {
  return catalogueManifest().index.buttons[0]?.inactiveMember?.width ?? 49;
}

function catalogueButtonHeight(): number {
  return catalogueManifest().index.buttons[0]?.inactiveMember?.height ?? 59;
}

function catalogueCropWidth(): number {
  return catalogueManifest().index.cropCatalogIndexPic?.width ?? 391;
}

function catalogueButtonIndexForFrame(frame: string): number | undefined {
  const index = catalogueManifest().index.buttons.findIndex((button) => button.frame === frame);
  return index >= 0 ? index + 1 : undefined;
}

function bitmapLayerFromRecord(
  record: { readonly assetPath?: string; readonly width?: number; readonly height?: number } | undefined,
  x: number,
  y: number,
  fallbackWidth: number,
  fallbackHeight: number
): DirectorBitmapCompositeLayer[] {
  if (!record?.assetPath) {
    return [];
  }
  return [{
    assetPath: record.assetPath,
    x,
    y,
    width: record.width ?? fallbackWidth,
    height: record.height ?? fallbackHeight
  }];
}

function posterEntries(movie: DirectorMovie): Array<{ readonly code: string; readonly name: string; readonly label: string }> {
  const text = movie.cast.getMemberByName("poster_IndexList")?.text ?? "";
  return text.split(/\r\n|\r|\n/).map((line) => {
    const items = line.split(":");
    return {
      code: items[4]?.trim() ?? "",
      name: items[5]?.trim() ?? "",
      label: items[1]?.trim() ?? ""
    };
  }).filter((entry) => entry.code.length > 0);
}

function readCatalogueState(movie: DirectorMovie): Release1CatalogueState | undefined {
  const record = readRecord(movie.getProperty("release1CatalogueState"));
  if (record?.open !== true || typeof record.frame !== "string") {
    return undefined;
  }
  return {
    open: true,
    frame: record.frame,
    activeButtonIndex: typeof record.activeButtonIndex === "number" ? record.activeButtonIndex : 1,
    firstVisibleButtonIndex: typeof record.firstVisibleButtonIndex === "number" ? record.firstVisibleButtonIndex : 1,
    maxVisibleButtons: typeof record.maxVisibleButtons === "number" ? record.maxVisibleButtons : 8,
    ...(typeof record.plastoModel === "string" ? { plastoModel: record.plastoModel } : {}),
    ...(typeof record.plastoColor === "string" ? { plastoColor: record.plastoColor } : {}),
    ...(typeof record.plastoColorCode === "string" ? { plastoColorCode: record.plastoColorCode } : {}),
    ...(typeof record.posterCode === "string" ? { posterCode: record.posterCode } : {}),
    source: Array.isArray(record.source) ? record.source.filter((entry): entry is string => typeof entry === "string") : [catalogueSourcePath]
  };
}

function readCatalogueConfirmState(movie: DirectorMovie): Release1CatalogueConfirmState | undefined {
  const record = readRecord(movie.getProperty("release1CatalogueConfirmState"));
  if (record?.open !== true || typeof record.frame !== "string" || typeof record.purchaseCode !== "string") {
    return undefined;
  }
  return {
    open: true,
    frame: record.frame,
    purchaseCode: record.purchaseCode,
    lookupCallId: typeof record.lookupCallId === "string" ? record.lookupCallId : orderLookupCallId(record.purchaseCode),
    price: typeof record.price === "number" ? record.price : 0,
    source: Array.isArray(record.source) ? record.source.filter((entry): entry is string => typeof entry === "string") : [orderInfoSourcePath]
  };
}

function readCatalogueActions(movie: DirectorMovie): Release1CatalogueInteractiveAction[] {
  const value = movie.getProperty("release1CatalogueInteractiveActions");
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isCatalogueAction);
}

function installRelease1CatalogueData(movie: DirectorMovie): void {
  if (movie.getProperty("release1CatalogueManifest") === undefined) {
    movie.setProperty("release1CatalogueManifest", catalogueManifest());
    movie.setProperty("release1CatalogueManifestSource", "generated/runtime-data/release1_roseau_dcr0910-catalogue.json");
  }
  if (movie.getProperty("release1FurniManifest") === undefined) {
    movie.setProperty("release1FurniManifest", furniManifest());
    movie.setProperty("release1FurniManifestSource", "generated/runtime-data/release1_roseau_dcr0910-furni.json");
  }
}

function isCatalogueAction(value: unknown): value is Release1CatalogueInteractiveAction {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && typeof record.kind === "string"
    && (record.event === "mouseDown" || record.event === "mouseUp")
    && typeof record.channel === "number"
    && readRecord(record.bounds) !== undefined;
}

function isCatalogueTextRequest(value: unknown): value is Release1CatalogueTextRequest {
  const record = readRecord(value);
  return typeof record?.id === "number"
    && (record.command === "GETORDERINFO" || record.command === "PURCHASE")
    && typeof record.body === "string"
    && (record.status === "pending" || record.status === "sent");
}

function stringBehaviorValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRelease1(release: string): boolean {
  return release.startsWith("release1_roseau_dcr0910");
}
