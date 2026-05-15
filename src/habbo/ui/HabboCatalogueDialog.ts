import type { DirectorBitmapCompositeLayer, DirectorMemberManifest } from "../../runtime";
import { HABBO_DIRECTOR_FONT_FAMILY } from "../HabboSourceValueHelpers";

export const HABBO_CATALOGUE_WINDOW_ID = "Catalogue_window";
export const HABBO_CATALOGUE_TEMPLATE = "habbo_catalogue.window";
export const HABBO_CATALOGUE_LOADING_LAYOUT = "ctlg_loading.window";
export const HABBO_CATALOGUE_FALLBACK_PAGE_LAYOUT = "ctlg_layout1.window";
export const HABBO_CATALOGUE_PAGE_LINE_HEIGHT = 21;
export const HABBO_CATALOGUE_INFO_WINDOW_ID = "Purchase info";
export const HABBO_CATALOGUE_ORDER_TEMPLATE = "habbo_simple.window";
export const HABBO_CATALOGUE_ORDER_LAYOUT = "habbo_orderinfo_dialog.window";
export const HABBO_CATALOGUE_ORDER_GIFT_LAYOUT = "habbo_orderinfo_gift_dialog.window";
export const HABBO_CATALOGUE_ORDER_NO_CREDITS_LAYOUT = "habbo_orderinfo_nocredits.window";
export const HABBO_CATALOGUE_ORDER_CANT_BUY_CREDITS_LAYOUT = "habbo_orderinfo_cantbuycredits.window";
export const HABBO_CATALOGUE_PURCHASE_OK_TEMPLATE = "habbo_basic.window";
export const HABBO_CATALOGUE_PURCHASE_OK_LAYOUT = "habbo_message_dialog.window";
export const HABBO_CATALOGUE_PURCHASE_OK_TITLE_KEY = "catalog_buyingSuccesfull";
export const HABBO_CATALOGUE_PURCHASE_OK_FALLBACK_TITLE = "Purchase successful";
export const HABBO_CATALOGUE_MODAL_LOCZ = 22000000;

export const HABBO_CATALOGUE_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_cat_code/casts/External/ParentScript 2 - Catalogue Interface Class.ls";

export type HabboCatalogueEventKind = "mouseDown" | "mouseUp" | "keyDown";

export const HABBO_CATALOGUE_COMPONENT_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_cat_code/casts/External/ParentScript 3 - Catalogue Component Class.ls";

export const HABBO_CATALOGUE_HANDLER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_cat_code/casts/External/ParentScript 4 - Catalogue Handler Class.ls";

export const HABBO_CATALOGUE_LOADER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_cat_code/casts/External/ParentScript 6 - Catalogue Loader Class.ls";

export interface HabboCatalogueRequest {
  readonly id: number;
  readonly command: "GET_CATALOG_INDEX" | "GET_CATALOG_PAGE" | "PURCHASE_FROM_CATALOG";
  readonly status: "pending" | "sent";
  readonly body?: string;
  readonly pageId?: string;
}

export interface HabboCatalogueIndexEntry {
  readonly id: string;
  readonly name: string;
}

export interface HabboCatalogueProductRecord {
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly specialText?: string;
  readonly kind: string;
  readonly className: string;
  readonly direction?: string;
  readonly dimensions?: string;
  readonly purchaseCode: string;
  readonly partColors?: string;
  readonly extraParam?: string;
  readonly color?: string;
  readonly rawFields: readonly string[];
}

export interface HabboCataloguePageRecord {
  readonly id: string;
  readonly name: string;
  readonly layout: string;
  readonly headlineImage?: string;
  readonly teaserImages?: string;
  readonly headerText?: string;
  readonly teaserText?: string;
  readonly textList?: readonly string[];
  readonly linkList?: readonly string[];
  readonly bodyText?: string;
  readonly helpText?: string;
  readonly extraText?: string;
  readonly products: readonly HabboCatalogueProductRecord[];
  readonly rawBody: string;
}

export interface HabboCataloguePageListFeedOptions {
  readonly number: number;
  readonly windowName: string;
  readonly elementId: string;
  readonly width: number;
  readonly height: number;
  readonly entries: readonly HabboCatalogueIndexEntry[];
  readonly activePageId?: string;
  readonly scrollOffset?: number;
  readonly leftAssetPath?: string;
  readonly activeLeftAssetPath?: string;
}

export interface HabboCatalogueBitmapAssetSource {
  readonly assetPath: string;
  readonly width: number;
  readonly height: number;
  readonly ink?: number;
  readonly memberName?: string;
  readonly regPoint?: { readonly x: number; readonly y: number };
  readonly inkAssetPaths?: Readonly<Record<string, string>>;
}

export interface HabboCatalogueImageFeedOptions {
  readonly number: number;
  readonly windowName: string;
  readonly elementId: string;
  readonly width: number;
  readonly height: number;
  readonly image?: HabboCatalogueBitmapAssetSource;
  readonly background?: HabboCatalogueBitmapAssetSource;
  readonly fillColor?: string;
  readonly imageInk?: number;
}

export interface HabboCataloguePurchaseSelection {
  readonly product: HabboCatalogueProductRecord;
  readonly productIndex: number;
}

export interface HabboCatalogueProductPageState {
  readonly productOffset: number;
  readonly productPerPage: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly canPrevious: boolean;
  readonly canNext: boolean;
  readonly counterText: string;
  readonly paged: boolean;
}

export interface HabboCatalogueActivationContext {
  readonly entries: readonly HabboCatalogueIndexEntry[];
  readonly products: readonly HabboCatalogueProductRecord[];
  readonly selectedProduct?: HabboCatalogueProductRecord;
  readonly selectedProductIndex?: number;
  readonly productOffset?: number;
  readonly productPerPage?: number;
  readonly activePageId?: string;
  readonly pageLinkList?: readonly string[];
  readonly localY?: unknown;
  readonly scrollOffset?: number;
  readonly editMode: string;
  readonly language: string;
}

export type HabboCatalogueActivationAction =
  | { readonly kind: "close" }
  | {
      readonly kind: "select-page";
      readonly entry: HabboCatalogueIndexEntry;
      readonly request: Omit<HabboCatalogueRequest, "id" | "status">;
    }
  | {
      readonly kind: "select-product";
      readonly product: HabboCatalogueProductRecord;
      readonly productIndex: number;
      readonly textValues: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: "product-page";
      readonly productOffset: number;
      readonly pageState: HabboCatalogueProductPageState;
      readonly textValues: Readonly<Record<string, string>>;
    }
  | {
      readonly kind: "show-order-info";
      readonly product: HabboCatalogueProductRecord;
      readonly productIndex: number;
    };

export interface HabboCatalogueGiftPurchaseProps {
  readonly gift?: boolean;
  readonly receiver?: string;
  readonly message?: string;
}

export interface HabboCatalogueOrderDialogPlan {
  readonly windowId: string;
  readonly templateName: string;
  readonly layoutName: string;
  readonly activeOrderCode: string;
  readonly product: HabboCatalogueProductRecord;
  readonly status: "OK" | "NOBALANCE" | "ERROR";
  readonly textValues: Readonly<Record<string, string>>;
  readonly giftEnabled: boolean;
}

export type HabboCatalogueInfoWindowAction =
  | { readonly kind: "confirm-purchase" }
  | { readonly kind: "cancel" }
  | { readonly kind: "show-gift" }
  | { readonly kind: "show-normal-order" }
  | { readonly kind: "open-no-balance-url" }
  | { readonly kind: "open-subscribe-url" };

export function readCatalogueRequests(value: unknown): HabboCatalogueRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboCatalogueRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "GET_CATALOG_INDEX" || command === "GET_CATALOG_PAGE" || command === "PURCHASE_FROM_CATALOG")
      && (record.status === "pending" || record.status === "sent");
  });
}

export function readCatalogueIndexEntries(value: unknown): HabboCatalogueIndexEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboCatalogueIndexEntry => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Partial<HabboCatalogueIndexEntry>;
    return typeof record.id === "string" && typeof record.name === "string";
  });
}

export function readCatalogueProducts(value: unknown): HabboCatalogueProductRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboCatalogueProductRecord => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Partial<HabboCatalogueProductRecord>;
    return typeof record.name === "string"
      && typeof record.price === "string"
      && typeof record.purchaseCode === "string";
  });
}

export function parseCatalogueIndexPacket(body: string): HabboCatalogueIndexEntry[] {
  const entries: HabboCatalogueIndexEntry[] = [];
  for (const line of body.split(/\r?\n|\r/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const [id, ...nameParts] = trimmed.split("\t");
    const name = nameParts.join("\t").trim();
    if (id && name) {
      entries.push({ id: id.trim(), name });
    }
  }
  return entries;
}

export function parseCataloguePagePacket(body: string): HabboCataloguePageRecord | undefined {
  const fields: Record<string, string> = {};
  const textEntries: Array<{ readonly index: number; readonly text: string }> = [];
  const products: HabboCatalogueProductRecord[] = [];
  for (const line of body.split(/\r?\n|\r/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("p:")) {
      const rawFields = trimmed.slice(2).split("\t");
      products.push({
        name: rawFields[0]?.trim() ?? "",
        description: rawFields[1]?.trim() ?? "",
        price: rawFields[2]?.trim() ?? "",
        ...(rawFields[3]?.trim() ? { specialText: rawFields[3]!.trim() } : {}),
        kind: rawFields[4]?.trim() ?? "",
        className: rawFields[5]?.trim() ?? "",
        ...(rawFields[6]?.trim() ? { direction: rawFields[6]!.trim() } : {}),
        ...(rawFields[7]?.trim() ? { dimensions: rawFields[7]!.trim() } : {}),
        purchaseCode: rawFields[8]?.trim() || rawFields[5]?.trim() || "",
        ...(rawFields[9]?.trim() ? { partColors: rawFields[9]!.trim(), color: rawFields[9]!.trim() } : {}),
        rawFields
      });
      continue;
    }

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = replaceCatalogueLineBreaks(trimmed.slice(separator + 1));
    const textMatch = /^t(\d+)$/i.exec(key);
    if (textMatch) {
      const index = Number.parseInt(textMatch[1] ?? "", 10);
      if (Number.isFinite(index) && index > 0) {
        textEntries.push({ index, text: value });
      }
      continue;
    }

    fields[key] = value;
  }

  const id = fields.i?.trim() ?? "";
  if (!id) {
    return undefined;
  }

  const textList = textEntries
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.text);
  const linkList = splitCatalogueCsv(fields.u);

  return {
    id,
    name: fields.n?.trim() ?? "",
    layout: fields.l?.trim() || "ctlg_layout1",
    ...(fields.g !== undefined ? { headlineImage: fields.g } : {}),
    ...(fields.e !== undefined ? { teaserImages: fields.e } : {}),
    ...(fields.h !== undefined ? { headerText: fields.h, bodyText: fields.h } : {}),
    ...(fields.w !== undefined ? { teaserText: fields.w, helpText: fields.w } : {}),
    ...(textList.length > 0 ? { textList } : {}),
    ...(linkList.length > 0 ? { linkList } : {}),
    ...(fields.s !== undefined ? { extraText: fields.s } : {}),
    products,
    rawBody: body
  };
}

export function formatCataloguePrice(price: string, getText: (key: string) => string | undefined): string {
  const numericPrice = Number.parseFloat(price);
  const creditKey = Number.isFinite(numericPrice) && numericPrice === 1 ? "credit" : "credits";
  const credits = getText(creditKey) ?? getText("credits") ?? "credits";
  return `${price} ${credits}`.trim();
}

export function catalogueIndexRequestBody(editMode: string, language: string): string {
  return `${editMode}/${language}`;
}

export function cataloguePageRequestBody(editMode: string, pageId: string, language: string): string {
  return `${editMode}/${pageId}/${language}`;
}

export function cataloguePurchaseRequestBody(
  editMode: string,
  pageId: string,
  language: string,
  product: HabboCatalogueProductRecord,
  gift: HabboCatalogueGiftPurchaseProps = {}
): string {
  const extraParam = product.extraParam?.trim() || "-";
  const giftBody = `${gift.gift ? "1" : "0"}\r${gift.receiver ?? ""}\r${gift.message ?? ""}\r`;
  return [
    editMode,
    pageId,
    language,
    product.purchaseCode,
    extraParam,
    giftBody
  ].join("\r");
}

export function cataloguePageLayoutName(layout: string, exists: (layoutName: string) => boolean): string {
  const normalized = layout.endsWith(".window") ? layout : `${layout}.window`;
  return exists(normalized) ? normalized : HABBO_CATALOGUE_FALLBACK_PAGE_LAYOUT;
}

export function catalogueIndexEntryFromLocalY(
  entries: readonly HabboCatalogueIndexEntry[],
  localY: unknown,
  scrollOffset = 0
): HabboCatalogueIndexEntry | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const y = Number(localY);
  const safeY = Number.isFinite(y) ? y : 0;
  const safeOffset = Number.isFinite(scrollOffset) ? Math.max(0, Math.round(scrollOffset)) : 0;
  const line = Math.floor((Math.max(0, safeY) + safeOffset) / HABBO_CATALOGUE_PAGE_LINE_HEIGHT);
  return entries[Math.min(entries.length - 1, line)];
}

export function isCatalogueRuntimeInteractiveElementId(elementId: string): boolean {
  return elementId === "ctlg_pages"
    || elementId === "ctlg_pages_scroll"
    || elementId === "ctlg_next_button"
    || elementId === "ctlg_prev_button"
    || elementId === "ctlg_nextpage_button"
    || elementId === "ctlg_prevpage_button"
    || /^ctlg_small_img_\d+$/i.test(elementId)
    || /^ctlg_buy(?:_button|_\d+|_wall|_floor)$/i.test(elementId);
}

export function catalogueSourceEventForElementId(elementId: string): HabboCatalogueEventKind | undefined {
  if (elementId === "close") {
    return "mouseUp";
  }

  if (
    elementId === "ctlg_pages"
    || elementId === "ctlg_next_button"
    || elementId === "ctlg_prev_button"
    || elementId === "ctlg_nextpage_button"
    || elementId === "ctlg_prevpage_button"
    || /^ctlg_small_img_\d+$/i.test(elementId)
    || /^ctlg_buy(?:_button|_\d+|_wall|_floor)$/i.test(elementId)
  ) {
    return "mouseDown";
  }

  return undefined;
}

export function cataloguePurchaseSelectionFromElement(
  elementId: string,
  products: readonly HabboCatalogueProductRecord[],
  productOffset = 0
): HabboCataloguePurchaseSelection | undefined {
  const buyMatch = /^ctlg_buy(?:_button|_(\d+))$/.exec(elementId);
  if (!buyMatch || products.length === 0) {
    return undefined;
  }

  const visibleIndex = buyMatch[1] ? Math.max(1, Number.parseInt(buyMatch[1], 10)) : 1;
  const productIndex = visibleIndex + Math.max(0, Math.trunc(productOffset));
  const product = products[productIndex - 1] ?? products[0];
  if (!product) {
    return undefined;
  }

  return {
    product,
    productIndex
  };
}

export function resolveCatalogueActivation(
  elementId: string,
  context: HabboCatalogueActivationContext,
  getText: (key: string) => string | undefined
): HabboCatalogueActivationAction | undefined {
  if (elementId === "close") {
    return { kind: "close" };
  }

  if (elementId === "ctlg_pages") {
    const entry = catalogueIndexEntryFromLocalY(context.entries, context.localY, context.scrollOffset);
    if (!entry) {
      return undefined;
    }

    return {
      kind: "select-page",
      entry,
      request: {
        command: "GET_CATALOG_PAGE",
        pageId: entry.id,
        body: cataloguePageRequestBody(context.editMode, entry.id, context.language)
      }
    };
  }

  if (elementId === "ctlg_nextpage_button" || elementId === "ctlg_prevpage_button") {
    const pageId = catalogueLinkedPageIdAfterStep(
      context.pageLinkList ?? [],
      context.activePageId ?? "",
      elementId === "ctlg_nextpage_button" ? 1 : -1
    );
    if (!pageId) {
      return undefined;
    }

    return {
      kind: "select-page",
      entry: { id: pageId, name: pageId },
      request: {
        command: "GET_CATALOG_PAGE",
        pageId,
        body: cataloguePageRequestBody(context.editMode, pageId, context.language)
      }
    };
  }

  const productPageState = catalogueProductPageState(context.products.length, context.productOffset, context.productPerPage);
  if (elementId === "ctlg_next_button" || elementId === "ctlg_prev_button") {
    const direction = elementId === "ctlg_next_button" ? 1 : -1;
    const nextOffset = catalogueProductOffsetAfterStep(
      context.products.length,
      productPageState.productOffset,
      productPageState.productPerPage,
      direction
    );
    if (nextOffset === productPageState.productOffset) {
      return undefined;
    }

    const nextPageState = catalogueProductPageState(context.products.length, nextOffset, productPageState.productPerPage);
    return {
      kind: "product-page",
      productOffset: nextPageState.productOffset,
      pageState: nextPageState,
      textValues: catalogueProductPageTextValues(nextPageState)
    };
  }

  const smallImageIndex = /^ctlg_small_img_(\d+)$/.exec(elementId)?.[1];
  if (smallImageIndex) {
    const productIndex = Math.max(1, Number.parseInt(smallImageIndex, 10)) + productPageState.productOffset;
    const product = context.products[productIndex - 1];
    if (!product) {
      return undefined;
    }

    return {
      kind: "select-product",
      product,
      productIndex,
      textValues: catalogueSelectedProductTextValues(product, getText)
    };
  }

  const purchaseSelection = cataloguePurchaseSelectionFromElement(elementId, context.products, productPageState.productOffset);
  if (!purchaseSelection) {
    return undefined;
  }

  const product = elementId === "ctlg_buy_button"
    ? context.selectedProduct
    : purchaseSelection.product;
  if (!product) {
    return undefined;
  }

  return {
    kind: "show-order-info",
    product,
    productIndex: elementId === "ctlg_buy_button"
      ? context.selectedProductIndex ?? Math.max(1, context.products.indexOf(product) + 1)
      : purchaseSelection.productIndex
    };
}

export function catalogueLinkedPageIdAfterStep(
  pageLinkList: readonly string[],
  activePageId: string,
  direction: -1 | 1
): string | undefined {
  if (pageLinkList.length === 0) {
    return undefined;
  }

  const currentIndex = Math.max(0, pageLinkList.indexOf(activePageId));
  const nextIndex = Math.min(pageLinkList.length - 1, Math.max(0, currentIndex + direction));
  if (nextIndex === currentIndex) {
    return undefined;
  }
  return pageLinkList[nextIndex];
}

export function catalogueProductAtSourceSlot(
  products: readonly HabboCatalogueProductRecord[],
  slotIndex: number,
  productOffset = 0
): HabboCataloguePurchaseSelection | undefined {
  const productIndex = Math.max(1, Math.trunc(slotIndex)) + Math.max(0, Math.trunc(productOffset));
  const product = products[productIndex - 1];
  return product ? { product, productIndex } : undefined;
}

export function catalogueProductPageState(
  productCount: number,
  productOffset: unknown = 0,
  productPerPage: unknown = productCount
): HabboCatalogueProductPageState {
  const safeCount = Math.max(0, Math.trunc(Number(productCount) || 0));
  const rawPerPage = Math.trunc(Number(productPerPage) || 0);
  const safePerPage = Math.max(1, rawPerPage > 0 ? rawPerPage : Math.max(1, safeCount));
  const totalPages = Math.max(1, Math.ceil(safeCount / safePerPage));
  const maxOffset = Math.max(0, (totalPages - 1) * safePerPage);
  const rawOffset = Math.max(0, Math.trunc(Number(productOffset) || 0));
  const safeOffset = Math.min(maxOffset, rawOffset - (rawOffset % safePerPage));
  const currentPage = Math.floor(safeOffset / safePerPage) + 1;
  return {
    productOffset: safeOffset,
    productPerPage: safePerPage,
    currentPage,
    totalPages,
    canPrevious: safeOffset > 0,
    canNext: safeOffset + safePerPage < safeCount,
    counterText: `${currentPage}/${totalPages}`,
    paged: safeCount > safePerPage
  };
}

export function catalogueProductOffsetAfterStep(
  productCount: number,
  productOffset: unknown,
  productPerPage: unknown,
  direction: -1 | 1
): number {
  const state = catalogueProductPageState(productCount, productOffset, productPerPage);
  if (!state.paged) {
    return state.productOffset;
  }
  const nextOffset = direction > 0
    ? state.productOffset + state.productPerPage
    : state.productOffset - state.productPerPage;
  return catalogueProductPageState(productCount, nextOffset, state.productPerPage).productOffset;
}

export function catalogueProductPageTextValues(
  state: HabboCatalogueProductPageState
): Readonly<Record<string, string>> {
  return {
    ctlg_page_counter: state.counterText
  };
}

export function catalogueSelectedProductTextValues(
  product: HabboCatalogueProductRecord,
  getText: (key: string) => string | undefined
): Readonly<Record<string, string>> {
  return {
    ctlg_product_name: product.name,
    ctlg_description: product.description,
    ctlg_price_1: formatCataloguePrice(product.price, getText)
  };
}

export function createCatalogueOrderDialogPlan(options: {
  readonly product: HabboCatalogueProductRecord;
  readonly walletBalance: number;
  readonly canBuyCredits: boolean;
  readonly canTrade: boolean;
  readonly getText: (key: string) => string | undefined;
}): HabboCatalogueOrderDialogPlan {
  const product = options.product;
  const price = Number.parseFloat(product.price);
  const safePrice = Number.isFinite(price) ? price : 0;
  const costText = replaceCatalogueChunks(
    options.getText("catalog_costs") ?? "\\x1 costs \\x2 credits",
    {
      "\\x1": product.name || "ERROR",
      "\\x2": product.price || "ERROR"
    }
  );

  if (!product.name || !product.purchaseCode || !product.price) {
    return {
      windowId: HABBO_CATALOGUE_INFO_WINDOW_ID,
      templateName: HABBO_CATALOGUE_ORDER_TEMPLATE,
      layoutName: HABBO_CATALOGUE_PURCHASE_OK_LAYOUT,
      activeOrderCode: "",
      product,
      status: "ERROR",
      textValues: {
        habbo_message_text_a: "Error occured!",
        habbo_message_text_b: JSON.stringify({
          name: product.name,
          code: product.purchaseCode,
          price: product.price
        })
      },
      giftEnabled: false
    };
  }

  if (options.walletBalance < safePrice) {
    return {
      windowId: HABBO_CATALOGUE_INFO_WINDOW_ID,
      templateName: HABBO_CATALOGUE_ORDER_TEMPLATE,
      layoutName: options.canBuyCredits ? HABBO_CATALOGUE_ORDER_NO_CREDITS_LAYOUT : HABBO_CATALOGUE_ORDER_CANT_BUY_CREDITS_LAYOUT,
      activeOrderCode: product.purchaseCode,
      product,
      status: "NOBALANCE",
      textValues: {
        habbo_message_text_a: costText
      },
      giftEnabled: false
    };
  }

  return {
    windowId: HABBO_CATALOGUE_INFO_WINDOW_ID,
    templateName: HABBO_CATALOGUE_ORDER_TEMPLATE,
    layoutName: HABBO_CATALOGUE_ORDER_LAYOUT,
    activeOrderCode: product.purchaseCode,
    product,
    status: "OK",
    textValues: {
      habbo_orderinfo_text_a: costText,
      habbo_orderinfo_text_b: replaceCatalogueChunks(options.getText("catalog_credits") ?? "You have \\x credits", {
        "\\x": String(options.walletBalance)
      })
    },
    giftEnabled: options.canTrade
  };
}

export function resolveCatalogueInfoWindowAction(elementId: string): HabboCatalogueInfoWindowAction | undefined {
  switch (elementId) {
    case "habbo_decision_ok":
    case "habbo_message_ok":
    case "button_ok":
      return { kind: "confirm-purchase" };
    case "habbo_decision_cancel":
    case "button_cancel":
    case "close":
      return { kind: "cancel" };
    case "buy_gift_ok":
      return { kind: "show-gift" };
    case "buy_gift_cancel":
      return { kind: "show-normal-order" };
    case "nobalance_ok":
      return { kind: "open-no-balance-url" };
    case "subscribe":
      return { kind: "open-subscribe-url" };
    default:
      return undefined;
  }
}

export function catalogueImageElementKind(elementId: string): "header" | "teaser" | "special" | "small" | undefined {
  if (elementId === "ctlg_header_img") {
    return "header";
  }
  if (/^ctlg_teaserimg_\d+$/.test(elementId)) {
    return "teaser";
  }
  if (elementId === "ctlg_special_img") {
    return "special";
  }
  if (/^ctlg_small_img_\d+$/.test(elementId)) {
    return "small";
  }
  return undefined;
}

export function catalogueElementIndex(elementId: string): number | undefined {
  const match = /_(\d+)$/.exec(elementId);
  if (!match) {
    return undefined;
  }

  const index = Number.parseInt(match[1]!, 10);
  return Number.isFinite(index) && index > 0 ? index : undefined;
}

export function catalogueTeaserImageNames(page: HabboCataloguePageRecord): string[] {
  return splitCatalogueCsv(page.teaserImages);
}

export function catalogueSpecialTextParts(value: string | undefined): { readonly type: number; readonly text: string } | undefined {
  if (!value || value.length < 2) {
    return undefined;
  }

  const parts = value.split(":");
  const parsedType = Number.parseInt(parts[0] ?? "", 10);
  return {
    type: Number.isFinite(parsedType) && parsedType > 0 ? parsedType : 1,
    text: parts[parts.length - 1] ?? ""
  };
}

export function catalogueSmallPreviewMemberCandidates(product: HabboCatalogueProductRecord): string[] {
  const candidates: string[] = [];
  if (product.purchaseCode) {
    candidates.push(`ctlg_pic_small_${product.purchaseCode}`);
  }

  for (const className of catalogueClassSmallCandidates(product.className)) {
    candidates.push(className);
  }

  candidates.push("no_icon_small");
  return uniqueCatalogueCandidates(candidates);
}

export function catalogueLargePreviewMemberCandidates(product: HabboCatalogueProductRecord): string[] {
  const candidates: string[] = [];
  if (product.purchaseCode) {
    candidates.push(`ctlg_pic_${product.purchaseCode}`);
  }

  const baseClass = catalogueBaseClassName(product.className);
  if (product.kind === "i" && baseClass) {
    candidates.push(`rightwall ${baseClass}`);
  }

  const dimensions = splitCatalogueCsv(product.dimensions);
  const width = dimensions[0] ?? "1";
  const height = dimensions[1] ?? "1";
  const direction = splitCatalogueCsv(product.direction)[0] ?? "2";
  if (baseClass) {
    candidates.push(`${baseClass}_sd`);
    candidates.push(`${baseClass}_a_0_${width}_${height}_${direction}_0`);
    candidates.push(`${baseClass}_b_0_${width}_${height}_${direction}_0`);
    candidates.push(`${baseClass}_c_0_${width}_${height}_${direction}_0`);
    candidates.push(`${baseClass}_d_0_${width}_${height}_${direction}_0`);
  }

  return uniqueCatalogueCandidates(candidates);
}

export function createCatalogueCenteredImageFeedImageMember(options: HabboCatalogueImageFeedOptions): DirectorMemberManifest | undefined {
  if (!options.image && !options.background && !options.fillColor) {
    return undefined;
  }

  const layers: DirectorBitmapCompositeLayer[] = [];
  if (options.fillColor) {
    layers.push({
      fillColor: options.fillColor,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height
    });
  }

  if (options.background) {
    layers.push(centeredAssetLayer(options.background, options.width, options.height, options.background.ink));
  }

  if (options.image) {
    layers.push(centeredAssetLayer(options.image, options.width, options.height, options.imageInk ?? options.image.ink));
  }

  return {
    number: options.number,
    name: `runtime.${options.windowName}.${options.elementId}.feedImage`,
    type: "bitmap",
    width: options.width,
    height: options.height,
    composite: {
      width: options.width,
      height: options.height,
      layers
    }
  };
}

export function cataloguePageTextValues(
  page: HabboCataloguePageRecord,
  entries: readonly HabboCatalogueIndexEntry[],
  getText: (key: string) => string | undefined,
  productPageState: HabboCatalogueProductPageState = catalogueProductPageState(page.products.length)
): Readonly<Record<string, string>> {
  const values: Record<string, string> = {
    ctlg_header_text: page.headerText ?? "",
    ctlg_description: page.teaserText ?? "",
    ctlg_product_name: "",
    ctlg_page_text: getText("catalog_page") ?? "page",
    ctlg_page_counter: productPageState.counterText,
    ctlg_price_1: ""
  };

  for (let index = 1; index <= 25; index++) {
    values[`ctlg_text_${index}`] = page.textList?.[index - 1] ?? "";
  }

  const special = catalogueSpecialTextParts(page.extraText);
  if (special) {
    values.ctlg_special_txt = special.text;
  }

  for (let index = 1; index <= 25; index++) {
    const product = page.products[productPageState.productOffset + index - 1];
    values[`ctlg_product_name_${index}`] = product?.name ?? "";
    values[`ctlg_description_${index}`] = product?.description ?? "";
    values[`ctlg_price_${index}`] = product ? formatCataloguePrice(product.price, getText) : "";
  }

  if (entries.length > 0) {
    values.ctlg_pages = entries.map((entry) => entry.name).join("\r");
  }

  return values;
}

function replaceCatalogueLineBreaks(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\r");
}

function catalogueClassSmallCandidates(className: string): string[] {
  const original = className.trim();
  if (!original) {
    return [];
  }

  const base = catalogueBaseClassName(original);
  return uniqueCatalogueCandidates([
    `${original}_small`,
    ...(base && base !== original ? [`${base}_small`] : [])
  ]);
}

function catalogueBaseClassName(className: string): string {
  const trimmed = className.trim();
  const marker = trimmed.indexOf("*");
  return marker >= 0 ? trimmed.slice(0, marker) : trimmed;
}

function splitCatalogueCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

function uniqueCatalogueCandidates(candidates: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}

function replaceCatalogueChunks(template: string, replacements: Readonly<Record<string, string>>): string {
  let result = template;
  for (const [token, replacement] of Object.entries(replacements)) {
    result = result.split(token).join(replacement);
  }
  return result;
}

function centeredAssetLayer(
  asset: HabboCatalogueBitmapAssetSource,
  width: number,
  height: number,
  ink: number | undefined
): DirectorBitmapCompositeLayer {
  const drawWidth = Math.max(1, Math.min(width, asset.width));
  const drawHeight = Math.max(1, Math.min(height, asset.height));
  return {
    assetPath: asset.assetPath,
    x: Math.round((width - drawWidth) / 2),
    y: Math.round((height - drawHeight) / 2),
    width: drawWidth,
    height: drawHeight,
    sourceWidth: asset.width,
    sourceHeight: asset.height,
    ...(ink !== undefined ? { ink } : {})
  };
}

export function createCataloguePageListFeedImageMember(options: HabboCataloguePageListFeedOptions): DirectorMemberManifest {
  const leftMargin = 6;
  const offset = Math.max(0, Math.round(options.scrollOffset ?? 0));
  const firstIndex = Math.max(0, Math.floor(offset / HABBO_CATALOGUE_PAGE_LINE_HEIGHT));
  const lastIndex = Math.min(options.entries.length, firstIndex + Math.ceil(options.height / HABBO_CATALOGUE_PAGE_LINE_HEIGHT) + 2);
  const layers: DirectorBitmapCompositeLayer[] = [
    {
      fillColor: "#dddddd",
      x: 0,
      y: 0,
      width: options.width,
      height: options.height
    },
    {
      fillColor: "#aaaaaa",
      x: 0,
      y: 0,
      width: options.width,
      height: 1
    }
  ];

  for (let index = firstIndex; index < lastIndex; index++) {
    const entry = options.entries[index];
    if (!entry) {
      continue;
    }

    const y = (index * HABBO_CATALOGUE_PAGE_LINE_HEIGHT) - offset;
    if (y >= options.height || y + HABBO_CATALOGUE_PAGE_LINE_HEIGHT <= 0) {
      continue;
    }

    const active = entry.id === options.activePageId;
    if (active) {
      layers.push({
        fillColor: "#eeeeee",
        x: 0,
        y: y + 1,
        width: options.width,
        height: HABBO_CATALOGUE_PAGE_LINE_HEIGHT - 1
      });
    }

    const leftAssetPath = active ? options.activeLeftAssetPath : options.leftAssetPath;
    if (leftAssetPath) {
      layers.push({
        assetPath: leftAssetPath,
        x: 0,
        y: y + 1,
        width: Math.min(leftMargin, options.width),
        height: HABBO_CATALOGUE_PAGE_LINE_HEIGHT - 1,
        sourceWidth: Math.min(leftMargin, options.width),
        sourceHeight: HABBO_CATALOGUE_PAGE_LINE_HEIGHT - 1
      });
    }

    layers.push({
      text: entry.name,
      color: "#000000",
      fontFamily: HABBO_DIRECTOR_FONT_FAMILY,
      fontWeight: "700",
      fontSize: 9,
      lineHeight: 10,
      x: leftMargin,
      y: y + 6,
      width: Math.max(1, options.width - leftMargin),
      height: 10
    });
    layers.push({
      fillColor: "#aaaaaa",
      x: 0,
      y: y + HABBO_CATALOGUE_PAGE_LINE_HEIGHT,
      width: options.width,
      height: 1
    });
  }

  return {
    number: options.number,
    name: `runtime.${options.windowName}.${options.elementId}.feedImage`,
    type: "bitmap",
    width: options.width,
    height: options.height,
    composite: {
      width: options.width,
      height: options.height,
      layers
    }
  };
}
