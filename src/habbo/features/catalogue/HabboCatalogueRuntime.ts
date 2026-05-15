import type {
  DirectorMemberManifest,
  UnsupportedFeature
} from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type {
  HabboExternalCastWindowLayoutSet,
  HabboWindowBitmapAsset
} from "../../boot/HabboBootResourceTypes";
import {
  coerceRecord,
  directorNumberFromUnknown,
  normalizeSymbolKey,
  numberFromUnknown,
  readStringList
} from "../../HabboSourceValueHelpers";
import type { HabboRoomRequest } from "../../room/HabboRoomData";
import type { HabboWindowElementActivation, HabboWindowRecord } from "../../window/HabboWindowTypes";
import {
  catalogueIndexRequestBody,
  catalogueElementIndex,
  catalogueImageElementKind,
  cataloguePageLayoutName,
  cataloguePageRequestBody,
  cataloguePageTextValues,
  catalogueProductAtSourceSlot,
  catalogueProductPageState,
  cataloguePurchaseRequestBody,
  catalogueSmallPreviewMemberCandidates,
  catalogueSpecialTextParts,
  catalogueSourceEventForElementId,
  catalogueTeaserImageNames,
  createCatalogueCenteredImageFeedImageMember,
  createCatalogueOrderDialogPlan,
  createCataloguePageListFeedImageMember,
  HABBO_CATALOGUE_COMPONENT_SOURCE,
  HABBO_CATALOGUE_HANDLER_SOURCE,
  HABBO_CATALOGUE_INFO_WINDOW_ID,
  HABBO_CATALOGUE_LOADING_LAYOUT,
  HABBO_CATALOGUE_MODAL_LOCZ,
  HABBO_CATALOGUE_ORDER_GIFT_LAYOUT,
  HABBO_CATALOGUE_ORDER_LAYOUT,
  HABBO_CATALOGUE_PURCHASE_OK_FALLBACK_TITLE,
  HABBO_CATALOGUE_PURCHASE_OK_LAYOUT,
  HABBO_CATALOGUE_PURCHASE_OK_TEMPLATE,
  HABBO_CATALOGUE_PURCHASE_OK_TITLE_KEY,
  HABBO_CATALOGUE_SOURCE,
  HABBO_CATALOGUE_TEMPLATE,
  HABBO_CATALOGUE_WINDOW_ID,
  parseCatalogueIndexPacket,
  parseCataloguePagePacket,
  readCatalogueIndexEntries,
  readCatalogueProducts,
  readCatalogueRequests,
  resolveCatalogueActivation,
  resolveCatalogueInfoWindowAction,
  type HabboCatalogueBitmapAssetSource,
  type HabboCataloguePageRecord,
  type HabboCatalogueProductPageState,
  type HabboCatalogueProductRecord,
  type HabboCatalogueRequest
} from "../../ui/HabboCatalogueDialog";
import { createCatalogueProductPreviewFeedImageMember } from "../../ui/HabboCatalogueProductPreview";
import {
  resolveWindowContentTargetSize,
  resolveWindowElementGeometry
} from "../../window/HabboWindowLayoutHelpers";

export interface HabboCatalogueRuntimeHost {
  readonly movie: {
    readonly stage: {
      readonly width: number;
      readonly height: number;
    };
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;
  readonly externalCastWindowLayoutSet?: HabboExternalCastWindowLayoutSet;
  nextCatalogueRequestId: number;

  getText(key: string): string | undefined;
  getVariable(key: string): unknown;
  ensureThreadModuleObject(id: string, threadId: string, module: "interface" | "component" | "handler", className: string, release: string): void;
  resolveSourceWindowPosition(
    layoutName: string,
    templateName: string | undefined,
    fallback: { readonly x: number; readonly y: number }
  ): { readonly x: number; readonly y: number };
  createWindow(title: string, template: string | undefined, x: number, y: number): HabboWindowRecord;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  mergeWindowLayout(window: HabboWindowRecord, layoutName: string): void;
  clearWindowElementOverrides(window: HabboWindowRecord): void;
  removeWindow(title: string): boolean;
  hideWindowElement(window: HabboWindowRecord, elementId: string): void;
  showWindowElement(window: HabboWindowRecord, elementId: string): void;
  setWindowElementCommonButtonActivation(window: HabboWindowRecord, elementId: string, enabled: boolean): void;
  getWindowScrollOffset(window: HabboWindowRecord, elementId: string): number;
  getBitmapAssetByMemberName(memberName: string, preferredCasts: readonly string[]): HabboWindowBitmapAsset | undefined;
  activateWindow(window: HabboWindowRecord): void;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  ensureDynamicFurnitureCastsForClassNames(classNames: readonly string[], release: string, reason: string): void;
  queueRoomRequest(request: Omit<HabboRoomRequest, "id" | "status">, release: string): void;
  resolveCatalogueAssetSource(candidates: readonly string[], preferredCasts: readonly string[]): HabboCatalogueBitmapAssetSource | undefined;
  resolveCatalogueSmallSlotBackground(window: HabboWindowRecord, elementId: string): HabboCatalogueBitmapAssetSource | undefined;
  findExternalCastTextField(name: string): { readonly text?: string } | undefined;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function ensureCatalogueObjects(host: HabboCatalogueRuntimeHost, release: string): void {
  host.ensureThreadModuleObject("#catalogue_interface", "#catalogue", "interface", "Catalogue Interface Class", release);
  host.ensureThreadModuleObject("#catalogue_component", "#catalogue", "component", "Catalogue Component Class", release);
  host.ensureThreadModuleObject("#catalogue_handler", "#catalogue", "handler", "Catalogue Handler Class", release);
  host.ensureThreadModuleObject("#catalogue_loader", "#catalogue", "component", "Catalogue Loader Class", release);
}

export function showHideCatalogue(host: HabboCatalogueRuntimeHost, release: string): boolean {
  ensureCatalogueObjects(host, release);
  return host.windows.has(normalizeSymbolKey(HABBO_CATALOGUE_WINDOW_ID))
    ? hideCatalogue(host, release)
    : showCatalogue(host, release);
}

export function showCatalogue(host: HabboCatalogueRuntimeHost, release: string): boolean {
  ensureCatalogueObjects(host, release);
  const position = resolveCatalogueSourcePosition(host);
  let window = host.windows.get(normalizeSymbolKey(HABBO_CATALOGUE_WINDOW_ID));
  if (!window) {
    window = host.createWindow(HABBO_CATALOGUE_WINDOW_ID, HABBO_CATALOGUE_TEMPLATE, position.x, position.y);
    host.registerWindowClient(window, "#catalogue_interface");
  }

  window.procedures.length = 0;
  host.registerWindowProcedure(window, "#eventProcCatalogue", "#catalogue_interface", "#mouseUp");
  host.registerWindowProcedure(window, "#eventProcCatalogue", "#catalogue_interface", "#mouseDown");
  host.registerWindowProcedure(window, "#eventProcCatalogue", "#catalogue_interface", "#keyDown");
  host.mergeWindowLayout(window, HABBO_CATALOGUE_LOADING_LAYOUT);
  host.objectManager.getObject("#catalogue_interface")?.set("openWindow", HABBO_CATALOGUE_LOADING_LAYOUT);
  host.movie.setProperty("catalogueVisible", true);
  host.movie.setProperty("catalogueOpenWindow", HABBO_CATALOGUE_LOADING_LAYOUT);
  queueCatalogueRequest(host, {
    command: "GET_CATALOG_INDEX",
    body: catalogueIndexRequestBody(getCatalogueEditMode(host), getCatalogueLanguage(host))
  }, release);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "ok", `show window=${HABBO_CATALOGUE_LOADING_LAYOUT}`);
  host.recordUnsupportedOnce("catalogue-ui-shell-partial", {
    subsystem: "habbo",
    feature: "catalogue-ui-shell-partial",
    detail: `${release} Catalogue Interface Class showCatalogue now opens the source habbo_catalogue.window shell, merges the source loading dialog, and queues GET_CATALOG_INDEX. Full index/page rendering and product purchase controls are the next catalogue slice.`,
    source: HABBO_CATALOGUE_SOURCE
  });
  return true;
}

export function hideCatalogue(host: HabboCatalogueRuntimeHost, release: string): boolean {
  ensureCatalogueObjects(host, release);
  const removed = host.removeWindow(HABBO_CATALOGUE_WINDOW_ID);
  host.objectManager.getObject("#catalogue_interface")?.set("openWindow", "");
  host.movie.setProperty("catalogueVisible", false);
  host.movie.setProperty("catalogueOpenWindow", "");
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "info", `hide removed=${removed}`);
  return true;
}

export function resolveCatalogueSourcePosition(host: HabboCatalogueRuntimeHost): { readonly x: number; readonly y: number } {
  const template = host.externalCastWindowLayoutSet?.windows.find((entry) => {
    return entry.memberName.toLowerCase() === HABBO_CATALOGUE_TEMPLATE.toLowerCase();
  });
  const rect = template?.rect;
  if (!rect || rect.length !== 4) {
    return { x: 107, y: 17 };
  }

  const [left, top, right, bottom] = rect as readonly [number, number, number, number];
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  return {
    x: Math.round((host.movie.stage.width - width) / 2 - 30),
    y: Math.round((host.movie.stage.height - height) / 2 - 30)
  };
}

export function createCatalogueImageMember(
  host: HabboCatalogueRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest | undefined {
  const page = host.movie.getProperty("catalogueCurrentPage") as HabboCataloguePageRecord | undefined;
  if (!page || typeof page !== "object") {
    return undefined;
  }

  const kind = catalogueImageElementKind(elementId);
  if (!kind) {
    return undefined;
  }

  if (kind === "header") {
    const asset = page.headlineImage ? host.resolveCatalogueAssetSource([page.headlineImage], ["hh_cat_gfx_all"]) : undefined;
    return createCatalogueCenteredImageFeedImageMember({
      number,
      windowName: window.id.name,
      elementId,
      width: geometry.width,
      height: geometry.height,
      ...(asset ? { image: asset, fillColor: "#ffffff", imageInk: 8 } : {})
    });
  }

  if (kind === "teaser") {
    const index = catalogueElementIndex(elementId) ?? 1;
    const selectedProduct = readCatalogueProducts([host.movie.getProperty("catalogueSelectedProduct")])[0];
    const hasSmallProductPreviews = catalogueLayoutHasSmallProductPreviews(host, window.mergedLayout?.memberName);
    if (selectedProduct && elementId === "ctlg_teaserimg_1" && hasSmallProductPreviews) {
      return createCatalogueProductPreviewFeedImageMember({
        number,
        windowName: window.id.name,
        elementId,
        width: geometry.width,
        height: geometry.height,
        product: selectedProduct,
        resolveAsset: (candidates, preferredCasts) => host.resolveCatalogueAssetSource(candidates, preferredCasts),
        getClassPropsSource: (className) => host.findExternalCastTextField(`${className}.props`)?.text
      });
    }

    const teaserImageName = catalogueTeaserImageNames(page)[index - 1];
    const product = page.products[index - 1];
    if (!teaserImageName && product) {
      return createCatalogueProductPreviewFeedImageMember({
        number,
        windowName: window.id.name,
        elementId,
        width: geometry.width,
        height: geometry.height,
        product,
        resolveAsset: (candidates, preferredCasts) => host.resolveCatalogueAssetSource(candidates, preferredCasts),
        getClassPropsSource: (className) => host.findExternalCastTextField(`${className}.props`)?.text
      });
    }

    const asset = teaserImageName
      ? host.resolveCatalogueAssetSource([teaserImageName], ["hh_cat_gfx_all"])
      : undefined;
    return createCatalogueCenteredImageFeedImageMember({
      number,
      windowName: window.id.name,
      elementId,
      width: geometry.width,
      height: geometry.height,
      ...(asset ? { image: asset, fillColor: "#ffffff", imageInk: 36 } : {})
    });
  }

  if (kind === "special") {
    const special = catalogueSpecialTextParts(page.extraText);
    const asset = special
      ? host.resolveCatalogueAssetSource([`catalog_special_txtbg${special.type}`], ["hh_cat_gfx_all"])
      : undefined;
    return createCatalogueCenteredImageFeedImageMember({
      number,
      windowName: window.id.name,
      elementId,
      width: geometry.width,
      height: geometry.height,
      ...(asset ? { image: asset, fillColor: "#ffffff", imageInk: 8 } : {})
    });
  }

  const index = catalogueElementIndex(elementId) ?? 1;
  const productOffset = numberFromUnknown(host.movie.getProperty("catalogueProductOffset"), 0);
  const selection = catalogueProductAtSourceSlot(page.products, index, productOffset);
  const product = selection?.product;
  const slotBackground = resolveCatalogueSmallSlotBackground(host, window, elementId);
  if (!product) {
    return createCatalogueCenteredImageFeedImageMember({
      number,
      windowName: window.id.name,
      elementId,
      width: geometry.width,
      height: geometry.height,
      ...(slotBackground ? { background: slotBackground } : {})
    });
  }

  const asset = host.resolveCatalogueAssetSource(catalogueSmallPreviewMemberCandidates(product), [
    "hh_furni_small",
    "hh_cat_gfx_all",
    "hh_furni_items",
    "hh_room_private"
  ]);
  const activeBackground = selection.productIndex === numberFromUnknown(host.movie.getProperty("catalogueSelectedProductIndex"), 0)
    ? host.resolveCatalogueAssetSource(["ctlg_small_active_bg"], ["hh_cat_gfx_all"])
    : undefined;
  const background = activeBackground ?? slotBackground;
  return createCatalogueCenteredImageFeedImageMember({
    number,
    windowName: window.id.name,
    elementId,
    width: geometry.width,
    height: geometry.height,
    ...(asset ? { image: asset, imageInk: 41 } : {}),
    ...(background ? { background } : {})
  });
}

export function createCataloguePageListMember(
  host: HabboCatalogueRuntimeHost,
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number }
): DirectorMemberManifest {
  const leftAsset = host.getBitmapAssetByMemberName("ctlg.pagelist.left", ["hh_cat_gfx_all"]);
  const activeLeftAsset = host.getBitmapAssetByMemberName("ctlg.pagelist.left.active", ["hh_cat_gfx_all"]);
  const leftAssetPath = leftAsset?.inkAssetPaths?.["36"] ?? leftAsset?.pngPath;
  const activeLeftAssetPath = activeLeftAsset?.inkAssetPaths?.["36"] ?? activeLeftAsset?.pngPath;
  return createCataloguePageListFeedImageMember({
    number,
    windowName: window.id.name,
    elementId,
    width: geometry.width,
    height: geometry.height,
    entries: readCatalogueIndexEntries(host.movie.getProperty("catalogueIndexEntries")),
    activePageId: String(host.movie.getProperty("catalogueActivePageId") ?? ""),
    scrollOffset: host.getWindowScrollOffset(window, elementId),
    ...(leftAssetPath !== undefined ? { leftAssetPath } : {}),
    ...(activeLeftAssetPath !== undefined ? { activeLeftAssetPath } : {})
  });
}

export function resolveCatalogueAssetSource(
  host: HabboCatalogueRuntimeHost,
  candidates: readonly string[],
  preferredCasts: readonly string[]
): HabboCatalogueBitmapAssetSource | undefined {
  for (const candidate of candidates) {
    const asset = host.getBitmapAssetByMemberName(candidate, preferredCasts);
    if (!asset) {
      continue;
    }

    const source: HabboCatalogueBitmapAssetSource = {
      assetPath: asset.inkAssetPaths?.["36"] ?? asset.pngPath,
      width: asset.width,
      height: asset.height,
      ink: 36,
      memberName: asset.memberName,
      regPoint: asset.regPoint
    };
    return asset.inkAssetPaths ? { ...source, inkAssetPaths: asset.inkAssetPaths } : source;
  }

  return undefined;
}

export function resolveCatalogueSmallSlotBackground(
  host: HabboCatalogueRuntimeHost,
  window: HabboWindowRecord,
  elementId: string
): HabboCatalogueBitmapAssetSource | undefined {
  const layoutName = window.mergedLayout?.memberName;
  if (!layoutName) {
    return undefined;
  }

  const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName.toLowerCase() === layoutName.toLowerCase());
  if (!layout) {
    return undefined;
  }

  const contentSize = resolveWindowContentTargetSize(window, layout);
  const imageElement = layout.elements.find((element) => element.id?.toLowerCase() === elementId.toLowerCase());
  if (!imageElement || imageElement.locH === undefined || imageElement.locV === undefined) {
    return undefined;
  }

  const imageGeometry = resolveWindowElementGeometry(layout, imageElement, contentSize.width, contentSize.height);
  const imageCenter = {
    x: imageGeometry.x + (imageGeometry.width / 2),
    y: imageGeometry.y + (imageGeometry.height / 2)
  };
  const candidates = layout.elements
    .filter((element) => element.id?.toLowerCase() === "ctlg_small_bg" && element.media === "bitmap" && element.resolvedMember)
    .map((element) => {
      const geometry = resolveWindowElementGeometry(layout, element, contentSize.width, contentSize.height);
      const center = {
        x: geometry.x + (geometry.width / 2),
        y: geometry.y + (geometry.height / 2)
      };
      return {
        element,
        distance: Math.abs(center.x - imageCenter.x) + Math.abs(center.y - imageCenter.y)
      };
    })
    .sort((left, right) => left.distance - right.distance);
  const backgroundElement = candidates[0]?.element;
  if (!backgroundElement?.resolvedMember) {
    return undefined;
  }

  const member = backgroundElement.resolvedMember;
  const castNames = member.castName ? [member.castName, "hh_cat_gfx_all"] : ["hh_cat_gfx_all"];
  return host.resolveCatalogueAssetSource([member.memberName], castNames);
}

export function getCatalogueEditMode(host: HabboCatalogueRuntimeHost): string {
  const component = host.objectManager.getObject("#catalogue_component");
  const props = coerceRecord(component?.get("catalogProps"));
  return String(host.getVariable("ctlg.editmode") ?? props.editmode ?? "production");
}

export function getCatalogueLanguage(host: HabboCatalogueRuntimeHost): string {
  return String(host.getVariable("language") ?? "en");
}

export function queueCatalogueRequest(
  host: HabboCatalogueRuntimeHost,
  request: Omit<HabboCatalogueRequest, "id" | "status">,
  release: string
): HabboCatalogueRequest {
  const queued = readCatalogueRequests(host.movie.getProperty("pendingCatalogueRequests"));
  const nextRequest: HabboCatalogueRequest = {
    id: host.nextCatalogueRequestId++,
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingCatalogueRequests", [...queued, nextRequest]);
  host.movie.setProperty("lastCatalogueRequest", {
    ...nextRequest,
    source: HABBO_CATALOGUE_COMPONENT_SOURCE
  });
  host.logDebug("catalogue", "info", `queued ${nextRequest.command}`, {
    request: nextRequest,
    release
  });
  return nextRequest;
}

export function resolveCataloguePageLayout(host: HabboCatalogueRuntimeHost, layout: string): string {
  return cataloguePageLayoutName(layout, (layoutName) => {
    return host.externalCastWindowLayoutSet?.windows.some((entry) => entry.memberName.toLowerCase() === layoutName.toLowerCase()) === true;
  });
}

export function applyCataloguePageText(
  host: HabboCatalogueRuntimeHost,
  window: HabboWindowRecord,
  page: HabboCataloguePageRecord,
  layoutName: string
): void {
  const entries = readCatalogueIndexEntries(host.movie.getProperty("catalogueIndexEntries"));
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName.toLowerCase() === layoutName.toLowerCase());
  const productPerPage = catalogueProductPerPageForLayout(host, layoutName, page.products.length);
  const productPageState = catalogueProductPageState(page.products.length, 0, productPerPage);
  const textValues = cataloguePageTextValues(page, entries, (key) => host.getText(key), productPageState);
  for (const [elementId, text] of Object.entries(textValues)) {
    host.windowTextValues.set(elementId, text);
  }

  host.movie.setProperty("catalogueSelectedProduct", undefined);
  host.movie.setProperty("catalogueSelectedProductIndex", 0);
  host.movie.setProperty("catalogueProductOffset", productPageState.productOffset);
  host.movie.setProperty("catalogueProductPerPage", productPageState.productPerPage);

  const hasSmallProductPreviews = layout?.elements.some((element) => /^ctlg_small_img_\d+$/i.test(element.id ?? "")) === true;
  host.hideWindowElement(window, "ctlg_buy_button");
  host.hideWindowElement(window, "ctlg_price_box");
  applyCatalogueProductPageControls(host, window, productPageState);

  for (let index = 1; index <= 25; index++) {
    const elementId = `ctlg_buy_${index}`;
    const hasProduct = page.products[productPageState.productOffset + index - 1] !== undefined;
    if (hasProduct && !hasSmallProductPreviews) {
      host.showWindowElement(window, elementId);
    } else {
      host.hideWindowElement(window, elementId);
    }
  }

  host.movie.setProperty("lastCatalogueRenderedLayout", {
    layoutName,
    pageId: page.id,
    productCount: page.products.length,
    productOffset: productPageState.productOffset,
    productPerPage: productPageState.productPerPage,
    selectedProductIndex: 0,
    source: HABBO_CATALOGUE_SOURCE
  });
}

export function catalogueProductPerPageForLayout(host: HabboCatalogueRuntimeHost, layoutName: string, productCount: number): number {
  const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName.toLowerCase() === layoutName.toLowerCase());
  const smallSlots = layout?.elements
    .map((element) => /^ctlg_small_img_(\d+)$/i.exec(element.id ?? "")?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left)[0];
  return smallSlots ?? Math.max(1, productCount);
}

export function catalogueLayoutHasSmallProductPreviews(host: HabboCatalogueRuntimeHost, layoutName: string | undefined): boolean {
  if (!layoutName) {
    return false;
  }

  const layout = host.externalCastWindowLayoutSet?.windows.find((entry) => entry.memberName.toLowerCase() === layoutName.toLowerCase());
  return layout?.elements.some((element) => /^ctlg_small_img_\d+$/i.test(element.id ?? "")) === true;
}

export function applyCatalogueProductPageControls(
  host: HabboCatalogueRuntimeHost,
  window: HabboWindowRecord,
  state: HabboCatalogueProductPageState
): void {
  if (!state.paged) {
    host.hideWindowElement(window, "ctlg_next_button");
    host.hideWindowElement(window, "ctlg_prev_button");
    host.hideWindowElement(window, "ctlg_page_counter");
    host.hideWindowElement(window, "ctlg_page_text");
    return;
  }

  host.showWindowElement(window, "ctlg_next_button");
  host.showWindowElement(window, "ctlg_prev_button");
  host.showWindowElement(window, "ctlg_page_counter");
  host.showWindowElement(window, "ctlg_page_text");
  host.setWindowElementCommonButtonActivation(window, "ctlg_next_button", state.canNext);
  host.setWindowElementCommonButtonActivation(window, "ctlg_prev_button", state.canPrevious);
}

export function activateCatalogueElement(
  host: HabboCatalogueRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  const sourceEvent = catalogueSourceEventForElementId(elementId);
  if (activation?.event && sourceEvent && activation.event !== sourceEvent) {
    return false;
  }

  const entries = readCatalogueIndexEntries(host.movie.getProperty("catalogueIndexEntries"));
  const products = readCatalogueProducts(host.movie.getProperty("catalogueProducts"));
  const currentPage = host.movie.getProperty("catalogueCurrentPage") as HabboCataloguePageRecord | undefined;
  const selectedProduct = readCatalogueProducts([host.movie.getProperty("catalogueSelectedProduct")])[0];
  const selectedProductIndex = numberFromUnknown(host.movie.getProperty("catalogueSelectedProductIndex"), 0);
  const productOffset = numberFromUnknown(host.movie.getProperty("catalogueProductOffset"), 0);
  const productPerPage = numberFromUnknown(host.movie.getProperty("catalogueProductPerPage"), products.length);
  const catalogueWindow = host.windows.get(normalizeSymbolKey(HABBO_CATALOGUE_WINDOW_ID));
  const action = resolveCatalogueActivation(elementId, {
    entries,
    products,
    ...(selectedProduct ? { selectedProduct } : {}),
    ...(selectedProductIndex > 0 ? { selectedProductIndex } : {}),
    productOffset,
    productPerPage,
    activePageId: String(host.movie.getProperty("catalogueActivePageId") ?? currentPage?.id ?? ""),
    pageLinkList: currentPage?.linkList ?? [],
    localY: activation?.localY,
    scrollOffset: catalogueWindow ? host.getWindowScrollOffset(catalogueWindow, "ctlg_pages") : 0,
    editMode: getCatalogueEditMode(host),
    language: getCatalogueLanguage(host)
  }, (key) => host.getText(key));
  if (!action) {
    return false;
  }

  switch (action.kind) {
    case "close":
      return hideCatalogue(host, release);
    case "select-page":
      host.movie.setProperty("catalogueActivePageId", action.entry.id);
      queueCatalogueRequest(host, action.request, release);
      host.movie.setProperty("catalogueLoading", true);
      host.logDebug("catalogue", "info", `select page=${action.entry.id}`);
      return true;
    case "select-product":
      host.movie.setProperty("catalogueSelectedProduct", action.product);
      host.movie.setProperty("catalogueSelectedProductIndex", action.productIndex);
      for (const [field, value] of Object.entries(action.textValues)) {
        host.windowTextValues.set(field, value);
      }
      if (catalogueWindow) {
        host.showWindowElement(catalogueWindow, "ctlg_buy_button");
        host.showWindowElement(catalogueWindow, "ctlg_price_box");
      }
      host.syncWindowFieldValueSnapshot();
      host.syncWindowSpriteChannels(release);
      host.logDebug("catalogue", "info", `select product index=${action.productIndex} code=${action.product.purchaseCode}`);
      return true;
    case "product-page":
      host.movie.setProperty("catalogueProductOffset", action.productOffset);
      for (const [field, value] of Object.entries(action.textValues)) {
        host.windowTextValues.set(field, value);
      }
      if (catalogueWindow) {
        applyCatalogueProductPageControls(host, catalogueWindow, action.pageState);
      }
      host.syncWindowFieldValueSnapshot();
      host.syncWindowSpriteChannels(release);
      host.logDebug("catalogue", "info", `product page ${action.pageState.counterText} offset=${action.productOffset}`);
      return true;
    case "show-order-info":
      host.movie.setProperty("catalogueSelectedProduct", action.product);
      host.movie.setProperty("catalogueSelectedProductIndex", action.productIndex);
      return showCatalogueOrderInfo(host, action.product, release);
    default:
      return false;
  }
}

export function showCatalogueOrderInfo(host: HabboCatalogueRuntimeHost, product: HabboCatalogueProductRecord, release: string): boolean {
  const existing = host.windows.get(normalizeSymbolKey(HABBO_CATALOGUE_INFO_WINDOW_ID));
  if (existing) {
    existing.locZ = HABBO_CATALOGUE_MODAL_LOCZ;
    host.activateWindow(existing);
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("catalogue", "info", "order info already open; activated topmost");
    return true;
  }

  const session = host.objectManager.getObject("#session");
  const rights = readStringList(session?.get("user_rights"));
  const plan = createCatalogueOrderDialogPlan({
    product,
    walletBalance: directorNumberFromUnknown(session?.get("user_walletbalance"), 0),
    canBuyCredits: rights.includes("fuse_buy_credits"),
    canTrade: rights.includes("fuse_trade"),
    getText: (key) => host.getText(key)
  });
  const position = host.resolveSourceWindowPosition(plan.layoutName, plan.templateName, { x: 216, y: 194 });
  const window = host.createWindow(plan.windowId, plan.templateName, position.x, position.y);
  window.locZ = HABBO_CATALOGUE_MODAL_LOCZ;
  host.registerWindowClient(window, "#catalogue_interface");
  host.registerWindowProcedure(window, "#eventProcInfoWnd", "#catalogue_interface", "#mouseUp");
  host.mergeWindowLayout(window, plan.layoutName);
  for (const [elementId, value] of Object.entries(plan.textValues)) {
    host.windowTextValues.set(elementId, value);
  }

  host.movie.setProperty("catalogueOrderInfoVisible", true);
  host.movie.setProperty("catalogueOrderGiftMode", false);
  host.movie.setProperty("catalogueActiveOrderCode", plan.activeOrderCode);
  host.movie.setProperty("catalogueActiveOrderProduct", product);
  host.movie.setProperty("catalogueOrderInfoTextValues", plan.textValues);
  host.movie.setProperty("lastCatalogueOrderInfo", {
    status: plan.status,
    layout: plan.layoutName,
    productName: product.name,
    purchaseCode: product.purchaseCode,
    giftEnabled: plan.giftEnabled,
    source: HABBO_CATALOGUE_SOURCE
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "info", `order info status=${plan.status} code=${product.purchaseCode}`);
  return true;
}

export function hideCatalogueOrderInfo(host: HabboCatalogueRuntimeHost, release: string): boolean {
  const removed = host.removeWindow(HABBO_CATALOGUE_INFO_WINDOW_ID);
  host.movie.setProperty("catalogueOrderInfoVisible", false);
  host.movie.setProperty("catalogueOrderGiftMode", false);
  host.movie.setProperty("catalogueActiveOrderCode", "");
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "info", `hide order info removed=${removed}`);
  return true;
}

export function setCatalogueOrderGiftMode(host: HabboCatalogueRuntimeHost, enabled: boolean, release: string): boolean {
  const window = host.windows.get(normalizeSymbolKey(HABBO_CATALOGUE_INFO_WINDOW_ID));
  if (!window) {
    return false;
  }

  host.mergeWindowLayout(window, enabled ? HABBO_CATALOGUE_ORDER_GIFT_LAYOUT : HABBO_CATALOGUE_ORDER_LAYOUT);
  window.locZ = HABBO_CATALOGUE_MODAL_LOCZ;
  const textValues = coerceRecord(host.movie.getProperty("catalogueOrderInfoTextValues"));
  for (const [elementId, value] of Object.entries(textValues)) {
    host.windowTextValues.set(elementId, String(value));
  }

  host.activateWindow(window);
  host.movie.setProperty("catalogueOrderGiftMode", enabled);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "info", `gift mode=${enabled}`);
  return true;
}

export function activateCatalogueInfoElement(host: HabboCatalogueRuntimeHost, elementId: string, release: string): boolean {
  const action = resolveCatalogueInfoWindowAction(elementId);
  if (!action) {
    return false;
  }

  switch (action.kind) {
    case "confirm-purchase":
      return confirmCatalogueOrderInfo(host, release);
    case "cancel":
      return hideCatalogueOrderInfo(host, release);
    case "show-gift": {
      const lastOrder = coerceRecord(host.movie.getProperty("lastCatalogueOrderInfo"));
      if (lastOrder.giftEnabled !== true) {
        host.movie.setProperty("lastCatalogueOrderInfoAction", {
          action: "gift-disabled",
          source: HABBO_CATALOGUE_SOURCE
        });
        return true;
      }
      return setCatalogueOrderGiftMode(host, true, release);
    }
    case "show-normal-order":
      return setCatalogueOrderGiftMode(host, false, release);
    case "open-no-balance-url":
      return recordCatalogueExternalUrl(host, "url_nobalance", release);
    case "open-subscribe-url":
      return recordCatalogueExternalUrl(host, "url_subscribe", release);
    default:
      return false;
  }
}

export function confirmCatalogueOrderInfo(host: HabboCatalogueRuntimeHost, release: string): boolean {
  const activeOrderCode = String(host.movie.getProperty("catalogueActiveOrderCode") ?? "");
  if (!activeOrderCode) {
    return hideCatalogueOrderInfo(host, release);
  }

  const product = readCatalogueProducts([host.movie.getProperty("catalogueActiveOrderProduct")])[0];
  const pageId = String(host.movie.getProperty("catalogueActivePageId") ?? "");
  if (!product || !pageId) {
    host.movie.setProperty("lastCatalogueOrderInfoAction", {
      action: "confirm-failed",
      reason: !product ? "missing-product" : "missing-page",
      source: HABBO_CATALOGUE_COMPONENT_SOURCE
    });
    return false;
  }

  const giftMode = host.movie.getProperty("catalogueOrderGiftMode") === true;
  const receiver = String(host.windowTextValues.get("shopping_gift_target") ?? "").trim();
  const message = String(host.windowTextValues.get("shopping_greeting_field") ?? "");
  if (giftMode && !receiver) {
    host.movie.setProperty("lastCatalogueOrderInfoAction", {
      action: "gift-missing-receiver",
      source: HABBO_CATALOGUE_SOURCE
    });
    return false;
  }

  queueCatalogueRequest(host, {
    command: "PURCHASE_FROM_CATALOG",
    pageId,
    body: cataloguePurchaseRequestBody(getCatalogueEditMode(host), pageId, getCatalogueLanguage(host), product, giftMode
      ? { gift: true, receiver, message }
      : { gift: false })
  }, release);
  host.movie.setProperty("lastCatalogueOrderInfoAction", {
    action: "purchase-queued",
    pageId,
    purchaseCode: product.purchaseCode,
    gift: giftMode,
    source: HABBO_CATALOGUE_COMPONENT_SOURCE
  });
  hideCatalogueOrderInfo(host, release);
  host.logDebug("catalogue", "info", `purchase queued page=${pageId} code=${product.purchaseCode}`);
  return true;
}

export function recordCatalogueExternalUrl(host: HabboCatalogueRuntimeHost, urlKey: string, release: string): boolean {
  const session = host.objectManager.getObject("#session");
  const userName = encodeURIComponent(String(session?.get("userName") ?? session?.get("#userName") ?? ""));
  const checksum = session?.exists("user_checksum") ? encodeURIComponent(String(session.get("user_checksum"))) : "";
  const baseUrl = host.getText(urlKey) ?? "";
  host.movie.setProperty("lastCatalogueExternalUrl", {
    key: urlKey,
    url: `${baseUrl}${userName}${checksum ? `&sum=${checksum}` : ""}`,
    source: HABBO_CATALOGUE_SOURCE
  });
  hideCatalogueOrderInfo(host, release);
  return true;
}

export function showCataloguePurchaseOk(host: HabboCatalogueRuntimeHost, release: string): boolean {
  const title = host.getText(HABBO_CATALOGUE_PURCHASE_OK_TITLE_KEY) ?? HABBO_CATALOGUE_PURCHASE_OK_FALLBACK_TITLE;
  const position = host.resolveSourceWindowPosition(HABBO_CATALOGUE_PURCHASE_OK_LAYOUT, HABBO_CATALOGUE_PURCHASE_OK_TEMPLATE, { x: 259, y: 203 });
  const window = host.createWindow(title, HABBO_CATALOGUE_PURCHASE_OK_TEMPLATE, position.x, position.y);
  window.locZ = HABBO_CATALOGUE_MODAL_LOCZ;
  host.registerWindowClient(window, "#catalogue_interface");
  host.registerWindowProcedure(window, "#hidePurchaseOk", "#catalogue_interface", "#mouseUp");
  host.mergeWindowLayout(window, HABBO_CATALOGUE_PURCHASE_OK_LAYOUT);
  host.windowTextValues.set("habbo_message_text_b", host.getText("catalog_itsurs") ?? "");
  host.movie.setProperty("cataloguePurchaseOkVisible", true);
  host.movie.setProperty("cataloguePurchaseOkWindowId", title);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "ok", `purchase ok window=${title}`);
  return true;
}

export function activateCataloguePurchaseOkElement(host: HabboCatalogueRuntimeHost, elementId: string, release: string): boolean {
  if (elementId !== "close" && elementId !== "habbo_message_ok") {
    return false;
  }

  const title = String(host.movie.getProperty("cataloguePurchaseOkWindowId") ?? (host.getText(HABBO_CATALOGUE_PURCHASE_OK_TITLE_KEY) ?? HABBO_CATALOGUE_PURCHASE_OK_FALLBACK_TITLE));
  const removed = host.removeWindow(title);
  host.movie.setProperty("cataloguePurchaseOkVisible", false);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "info", `hide purchase ok removed=${removed}`);
  return true;
}

export function handleCatalogueIndexPacket(host: HabboCatalogueRuntimeHost, body: string, release: string): boolean {
  ensureCatalogueObjects(host, release);
  const entries = parseCatalogueIndexPacket(body);
  const component = host.objectManager.getObject("#catalogue_component");
  const props = coerceRecord(component?.get("catalogProps"));
  props.catalogueIndex = entries;
  component?.set("catalogProps", props);
  host.movie.setProperty("catalogueIndexEntries", entries);
  host.movie.setProperty("lastCatalogueIndexPacket", {
    count: entries.length,
    source: HABBO_CATALOGUE_HANDLER_SOURCE
  });
  const firstPage = entries[0];
  if (firstPage) {
    host.movie.setProperty("catalogueActivePageId", firstPage.id);
    queueCatalogueRequest(host, {
      command: "GET_CATALOG_PAGE",
      pageId: firstPage.id,
      body: cataloguePageRequestBody(getCatalogueEditMode(host), firstPage.id, getCatalogueLanguage(host))
    }, release);
  } else {
    host.movie.setProperty("catalogueActivePageId", "");
    host.movie.setProperty("catalogueLoading", false);
  }

  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "ok", `CATALOGINDEX pages=${entries.length}`);
  return true;
}

export function handleCataloguePagePacket(host: HabboCatalogueRuntimeHost, body: string, release: string): boolean {
  ensureCatalogueObjects(host, release);
  const page = parseCataloguePagePacket(body);
  if (!page || !page.id) {
    host.movie.setProperty("lastCataloguePagePacket", {
      status: "empty",
      body,
      source: HABBO_CATALOGUE_HANDLER_SOURCE
    });
    host.logDebug("catalogue", "warn", "CATALOGPAGE empty");
    return false;
  }

  host.ensureDynamicFurnitureCastsForClassNames(page.products.map((product) => product.className), release, "catalogue");
  const component = host.objectManager.getObject("#catalogue_component");
  const props = coerceRecord(component?.get("catalogProps"));
  props[page.id] = page;
  props.lastPageID = page.id;
  component?.set("catalogProps", props);
  host.movie.setProperty("catalogueActivePageId", page.id);
  host.movie.setProperty("catalogueCurrentPage", page);
  host.movie.setProperty("catalogueProducts", page.products);
  host.movie.setProperty("catalogueLoading", false);
  const window = host.windows.get(normalizeSymbolKey(HABBO_CATALOGUE_WINDOW_ID));
  if (window) {
    const layoutName = resolveCataloguePageLayout(host, page.layout);
    host.mergeWindowLayout(window, layoutName);
    host.clearWindowElementOverrides(window);
    host.objectManager.getObject("#catalogue_interface")?.set("openWindow", layoutName);
    host.movie.setProperty("catalogueOpenWindow", layoutName);
    applyCataloguePageText(host, window, page, layoutName);
  }

  host.movie.setProperty("lastCataloguePagePacket", {
    status: "ok",
    pageId: page.id,
    layout: page.layout,
    productCount: page.products.length,
    source: HABBO_CATALOGUE_HANDLER_SOURCE
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("catalogue", "ok", `CATALOGPAGE id=${page.id} products=${page.products.length}`);
  host.recordUnsupportedOnce("catalogue-page-renderer-partial", {
    subsystem: "habbo",
    feature: "catalogue-page-renderer-partial",
    detail: `${release} Catalogue page packets are parsed and source page layouts are merged with text/product fields. Bitmap preview feedImage composition, page program classes, product paging, and full purchase confirmation windows remain partial.`,
    source: HABBO_CATALOGUE_SOURCE
  });
  return true;
}

export function handleCataloguePurchaseResultPacket(
  host: HabboCatalogueRuntimeHost,
  status: "OK" | "NOBALANCE" | "ERROR",
  body: string,
  release: string
): boolean {
  host.movie.setProperty("lastCataloguePurchaseResult", {
    status,
    body,
    source: HABBO_CATALOGUE_HANDLER_SOURCE
  });
  host.logDebug("catalogue", status === "OK" ? "ok" : "warn", `purchase ${status}`);
  if (status === "OK") {
    showCataloguePurchaseOk(host, release);
  }
  if (status === "OK" && host.movie.getProperty("roomActive") === true) {
    host.queueRoomRequest({ command: "GETSTRIP", stripMode: "new" }, release);
    host.movie.setProperty("roomHandOpenPending", true);
  }
  return true;
}
