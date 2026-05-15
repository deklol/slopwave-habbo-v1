import { LingoSymbol } from "../../lingo";
import type {
  HabboButtonElementAsset,
  HabboButtonElementPartAssetRef,
  HabboButtonElementTextSpec,
  HabboExternalCastWindowLayout,
  HabboWindowBitmapAsset,
  HabboWindowLayoutElement
} from "../boot/HabboBootResourceTypes";
import { directorFontFamily } from "../HabboSourceValueHelpers";
import type { HabboWindowElementOverride, HabboWindowRecord } from "./HabboWindowTypes";

type WindowScaleMode = "fixed" | "move" | "scale" | "center";

export interface HabboWindowGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HabboWindowBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function resolveWindowElementGeometry(
  layout: HabboExternalCastWindowLayout,
  element: HabboWindowLayoutElement,
  targetWidth: number,
  targetHeight: number
): HabboWindowGeometry {
  const baseSize = resolveLayoutRenderSize(layout);
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;
  const deltaWidth = targetWidth - baseWidth;
  const deltaHeight = targetHeight - baseHeight;
  const scaleH = resolveWindowElementScaleH(element);
  const scaleV = resolveWindowElementScaleV(element);
  let width = element.width ?? 0;
  let height = element.height ?? 0;
  // Fuse Window Instance Class adjusts flipped element origins before it
  // computes grouped bounds and renders wrappers. Without this, mirrored
  // right and bottom pieces are shifted outward by their own size.
  let x = (element.locH ?? 0) - (isWindowElementFlippedH(element) ? width : 0);
  let y = (element.locV ?? 0) - (isWindowElementFlippedV(element) ? height : 0);

  if (scaleH === "move") {
    x += deltaWidth;
  }
  if (scaleH === "center") {
    x += deltaWidth / 2;
  }
  if (scaleH === "scale") {
    width += deltaWidth;
  }

  if (scaleV === "move") {
    y += deltaHeight;
  }
  if (scaleV === "center") {
    y += deltaHeight / 2;
  }
  if (scaleV === "scale") {
    height += deltaHeight;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

export function applyWindowElementGeometryOverride(
  geometry: HabboWindowGeometry,
  override: HabboWindowElementOverride | undefined
): HabboWindowGeometry {
  if (!override) {
    return geometry;
  }

  return {
    x: Math.round((override.locH !== undefined ? override.locH : geometry.x) + (override.offsetH ?? 0)),
    y: Math.round((override.locV !== undefined ? override.locV : geometry.y) + (override.offsetV ?? 0)),
    width: Math.max(1, Math.round((override.width !== undefined ? override.width : geometry.width) + (override.resizeWidth ?? 0))),
    height: Math.max(1, Math.round((override.height !== undefined ? override.height : geometry.height) + (override.resizeHeight ?? 0)))
  };
}

export function applyWindowElementPropertyOverride(
  element: HabboWindowLayoutElement,
  override: HabboWindowElementOverride | undefined
): HabboWindowLayoutElement {
  if (override?.blend === undefined && override?.cursor === undefined) {
    return element;
  }

  return {
    ...element,
    ...(override.blend !== undefined ? { blend: override.blend } : {}),
    properties: override.cursor === undefined
      ? element.properties
      : {
          ...element.properties,
          cursor: override.cursor
        }
  };
}

export function applyWindowGroupBoundsOverride(
  bounds: HabboWindowBounds,
  override: HabboWindowElementOverride | undefined
): HabboWindowBounds {
  const baseWidth = bounds.right - bounds.left;
  const baseHeight = bounds.bottom - bounds.top;
  const left = Math.round((override?.locH !== undefined ? override.locH : bounds.left) + (override?.offsetH ?? 0));
  const top = Math.round((override?.locV !== undefined ? override.locV : bounds.top) + (override?.offsetV ?? 0));
  const width = Math.max(1, Math.round((override?.width !== undefined ? override.width : baseWidth) + (override?.resizeWidth ?? 0)));
  const height = Math.max(1, Math.round((override?.height !== undefined ? override.height : baseHeight) + (override?.resizeHeight ?? 0)));
  return {
    left,
    top,
    right: left + width,
    bottom: top + height
  };
}

export function resolveGroupedWindowElementGeometry(
  geometry: HabboWindowGeometry,
  baseBounds: HabboWindowBounds,
  baseSize: { readonly width: number; readonly height: number },
  targetSize: { readonly width: number; readonly height: number },
  element: HabboWindowLayoutElement
): HabboWindowGeometry {
  const deltaWidth = targetSize.width - baseSize.width;
  const deltaHeight = targetSize.height - baseSize.height;
  const scaleH = resolveWindowElementScaleH(element);
  const scaleV = resolveWindowElementScaleV(element);
  let x = geometry.x - baseBounds.left;
  let y = geometry.y - baseBounds.top;
  let width = geometry.width;
  let height = geometry.height;

  if (scaleH === "move") {
    x += deltaWidth;
  }
  if (scaleH === "center") {
    x += deltaWidth / 2;
  }
  if (scaleH === "scale") {
    width += deltaWidth;
  }

  if (scaleV === "move") {
    y += deltaHeight;
  }
  if (scaleV === "center") {
    y += deltaHeight / 2;
  }
  if (scaleV === "scale") {
    height += deltaHeight;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

export function isUnfedWindowImagePlaceholder(element: HabboWindowLayoutElement): boolean {
  if (element.type !== "image" || element.media !== "bitmap") {
    return false;
  }

  const memberName = normalizeMemberName(element.resolvedMember?.memberName ?? element.memberName ?? "");
  return memberName === "shadow.pixel" || memberName === "null" || memberName === "";
}

const sourceTextFeedImageElementIds = new Set([
  "link_list",
  "purse_amount",
  "taction_name",
  "purse_field1",
  "purse_field2",
  "purse_field3",
  "purse_field4",
  "purse_field5"
]);

export function isSourceTextFeedImageElement(elementId: string, element: HabboWindowLayoutElement): boolean {
  return sourceTextFeedImageElementIds.has(elementId)
    && element.media === "bitmap"
    && (element.type === "image" || isUnfedWindowImagePlaceholder(element));
}

export function resolveWindowElementScaleH(element: HabboWindowLayoutElement): WindowScaleMode {
  const explicit = normalizeWindowScaleMode(stringProperty(element.properties, "scaleH"));
  if (explicit) {
    return explicit;
  }

  const stretch = normalizeWindowStretchMode(element);
  switch (stretch) {
    case "moveh":
    case "movehv":
    case "movehstrechv":
    case "movehcenterv":
      return "move";
    case "strechh":
    case "strechhv":
    case "movevstrechh":
      return "scale";
    case "centerh":
    case "centerhv":
    case "movevcenterh":
      return "center";
    default:
      return "fixed";
  }
}

export function resolveWindowElementScaleV(element: HabboWindowLayoutElement): WindowScaleMode {
  const explicit = normalizeWindowScaleMode(stringProperty(element.properties, "scaleV"));
  if (explicit) {
    return explicit;
  }

  const stretch = normalizeWindowStretchMode(element);
  switch (stretch) {
    case "movev":
    case "movehv":
    case "movevstrechh":
    case "movevcenterh":
      return "move";
    case "strechv":
    case "strechhv":
    case "movehstrechv":
      return "scale";
    case "centerv":
    case "centerhv":
    case "movehcenterv":
      return "center";
    default:
      return "fixed";
  }
}

function normalizeWindowScaleMode(value: string | undefined): WindowScaleMode | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeSymbolKey(value);
  return normalized === "fixed" || normalized === "move" || normalized === "scale" || normalized === "center"
    ? normalized
    : undefined;
}

export function normalizeWindowStretchMode(element: HabboWindowLayoutElement): string {
  const raw = element.stretch
    ?? element.strech
    ?? stringProperty(element.properties, "stretch")
    ?? stringProperty(element.properties, "strech")
    ?? "fixed";
  return normalizeSymbolKey(raw).replaceAll("stretch", "strech");
}

export function isTextWindowElement(element: HabboWindowLayoutElement): boolean {
  return element.media === "field" || element.media === "text";
}

export function isEditableWindowField(element: HabboWindowLayoutElement): boolean {
  return element.media === "field" && normalizeSymbolKey(element.model ?? "") === "edit";
}

export function isCommonButtonElement(element: HabboWindowLayoutElement): boolean {
  const memberName = normalizeMemberName(element.memberName ?? "");
  return element.type === "button" && (memberName === "shadow.pixel" || memberName === "null" || memberName === "");
}

export function selectButtonAssetPath(asset: HabboWindowBitmapAsset, ink: number | undefined): string {
  const requestedInk = ink === undefined ? undefined : String(ink);
  return requestedInk !== undefined
    ? asset.inkAssetPaths?.[requestedInk] ?? asset.pngPath
    : asset.pngPath;
}

export function scrollbarElementPart(
  element: HabboButtonElementAsset,
  stateName: string,
  partName: "top" | "bar" | "lift" | "bottom"
): HabboButtonElementPartAssetRef | undefined {
  const requested = element.states.find((state) => state.state.toLowerCase() === stateName.toLowerCase())?.parts[partName];
  if (requested) {
    return requested;
  }

  return element.states.find((state) => state.state.toLowerCase() === "up")?.parts[partName];
}

export function isWindowElementFlippedH(element: HabboWindowLayoutElement): boolean {
  return truthyWindowElementFlag(element.flipH) || booleanProperty(element.properties, "flipH");
}

export function isWindowElementFlippedV(element: HabboWindowLayoutElement): boolean {
  return truthyWindowElementFlag(element.flipV) || booleanProperty(element.properties, "flipV");
}

function truthyWindowElementFlag(value: boolean | number | string | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }
  return false;
}

export function checkboxRegistrationPropForElementId(elementId: string | undefined): string | undefined {
  switch (elementId) {
    case "char_spam_checkbox":
      return "directMail";
    case "char_terms_checkbox":
      return "has_read_agreement";
    case "char_permission_checkbox":
      return "parent_permission";
    default:
      return undefined;
  }
}

export function groupLayoutElementsById(elements: readonly HabboWindowLayoutElement[]): readonly {
  readonly id: string;
  readonly elements: readonly HabboWindowLayoutElement[];
}[] {
  const groups: { id: string; elements: HabboWindowLayoutElement[] }[] = [];
  const byId = new Map<string, { id: string; elements: HabboWindowLayoutElement[] }>();
  for (const element of elements) {
    const id = element.id ?? "null";
    let group = byId.get(id);
    if (!group) {
      group = { id, elements: [] };
      byId.set(id, group);
      groups.push(group);
    }
    group.elements.push(element);
  }
  return groups;
}

export function layoutElementKey(layout: HabboExternalCastWindowLayout, element: HabboWindowLayoutElement): string {
  return `${layout.memberName}:${element.index}`;
}

export function isWindowDragElement(element: HabboWindowLayoutElement): boolean {
  const id = element.id?.toLowerCase();
  return id === "drag" || /^drag\d+$/.test(id ?? "");
}

export function allElementsShareNumber(elements: readonly HabboWindowLayoutElement[], property: "blend" | "ink"): boolean {
  if (elements.length < 2) {
    return true;
  }

  const firstValue = elements[0]?.[property];
  return elements.every((element) => element[property] === firstValue);
}

export function resolveLayoutRenderSize(layout: HabboExternalCastWindowLayout): { readonly width: number; readonly height: number } {
  const normalizedRect = layout.normalizedRect;
  if (normalizedRect && normalizedRect.length === 4) {
    const [left, top, right, bottom] = normalizedRect as readonly [number, number, number, number];
    const width = Math.max(1, Math.round(right - left));
    const height = Math.max(1, Math.round(bottom - top));
    return { width, height };
  }

  const rect = layout.rect;
  if (rect && rect.length === 4) {
    const [left, top, right, bottom] = rect as readonly [number, number, number, number];
    const width = Math.max(1, Math.round(right - left));
    const height = Math.max(1, Math.round(bottom - top));
    return { width, height };
  }

  return {
    width: Math.max(1, Math.round(layout.bounds.width)),
    height: Math.max(1, Math.round(layout.bounds.height))
  };
}

export function resolveWindowContentTargetSize(
  window: HabboWindowRecord,
  layout: HabboExternalCastWindowLayout
): { readonly width: number; readonly height: number } {
  const size = resolveLayoutRenderSize(layout);
  const resizeWidth = Math.max(0, Math.round(window.contentResizeWidth ?? 0));
  const resizeHeight = Math.max(0, Math.round(window.contentResizeHeight ?? 0));
  if (isNavigatorStableContentLayout(window, layout)) {
    // Source Navigator layouts nav_gr_src/nav_gr_own have a one-pixel smaller
    // parsed rect than nav_gr0/nav_pr while sharing the same outer bounds. The
    // v7 window instance keeps the same merged window shell, so normalize these
    // sibling views to the common Navigator content size.
    return {
      width: Math.max(size.width, 343) + resizeWidth,
      height: Math.max(size.height, 413) + resizeHeight
    };
  }

  return {
    width: size.width + resizeWidth,
    height: size.height + resizeHeight
  };
}

function isNavigatorStableContentLayout(window: HabboWindowRecord, layout: HabboExternalCastWindowLayout): boolean {
  if (normalizeSymbolKey(window.id) !== normalizeSymbolKey("Hotel Navigator")) {
    return false;
  }

  return /^(nav_pr|nav_gr0|nav_gr_src|nav_gr_own|nav_gr_fav)\.window$/i.test(layout.memberName);
}

export function resolveLayoutBorder(layout: HabboExternalCastWindowLayout): HabboWindowBounds {
  const border = layout.border;
  if (!border || border.length !== 4) {
    return zeroWindowBorder();
  }

  const [left, top, right, bottom] = border as readonly [number, number, number, number];
  return {
    left: Math.round(left),
    top: Math.round(top),
    right: Math.round(right),
    bottom: Math.round(bottom)
  };
}

export function zeroWindowBorder(): HabboWindowBounds {
  return { left: 0, top: 0, right: 0, bottom: 0 };
}

export function adjustWindowTextGeometry(
  element: HabboWindowLayoutElement,
  geometry: HabboWindowGeometry,
  text: string
): HabboWindowGeometry {
  if (
    stringProperty(element.properties, "boxType")?.toLowerCase() !== "adjust"
    || booleanProperty(element.properties, "wordWrap")
    || text.length === 0
  ) {
    return geometry;
  }

  const adjustedWidth = Math.max(geometry.width, estimateDirectorTextWidth(text, element));
  if (adjustedWidth === geometry.width) {
    return geometry;
  }

  return {
    ...geometry,
    x: geometry.x + Math.round((geometry.width - adjustedWidth) / 2),
    width: adjustedWidth
  };
}

export function estimateDirectorTextWidth(text: string, element: HabboWindowLayoutElement): number {
  const fontSize = numberProperty(element.properties, "fontSize") ?? 9;
  const baseCharWidth = directorFontFamily(stringProperty(element.properties, "font")).includes("Volter Goldfish")
    ? 7
    : Math.max(5, Math.round(fontSize * 0.62));
  return Math.ceil(text.length * baseCharWidth * (fontSize / 9)) + 4;
}

export function estimateDialogWriterImageSize(text: string): { readonly width: number; readonly height: number } {
  const normalizedLines = normalizeDirectorTextLines(text);
  const charWidth = 6;
  const lineHeight = 14;
  const width = Math.max(1, ...normalizedLines.map((line) => Math.ceil(line.length * charWidth) + 4));
  return {
    width,
    height: Math.max(1, normalizedLines.length * lineHeight)
  };
}

export function estimateDialogWriterWrappedHeight(text: string, width: number): number {
  const charWidth = 6;
  const lineHeight = 14;
  const maxChars = Math.max(1, Math.floor((width - 4) / charWidth));
  let lineCount = 0;
  for (const rawLine of normalizeDirectorTextLines(text)) {
    if (rawLine.length === 0) {
      lineCount += 1;
      continue;
    }
    lineCount += Math.max(1, Math.ceil(rawLine.length / maxChars));
  }
  return Math.max(1, lineCount * lineHeight);
}

export function normalizeDirectorTextLines(text: string): string[] {
  const lines = String(text ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  return lines.length > 0 ? lines : [""];
}

export function estimateRuntimeButtonTextWidth(text: string, textSpec: HabboButtonElementTextSpec): number {
  const fontSize = textSpec.fontSize || 9;
  const baseCharWidth = directorFontFamily(textSpec.font).includes("Volter Goldfish")
    ? 6
    : Math.max(5, Math.round(fontSize * 0.62));
  return Math.ceil(text.length * baseCharWidth * (fontSize / 9));
}

export function estimateDirectorTextLineCount(text: string, element: HabboWindowLayoutElement, width: number): number {
  const rawLines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  if (!booleanProperty(element.properties, "wordWrap")) {
    return Math.max(1, rawLines.length);
  }

  let count = 0;
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      count += 1;
      continue;
    }

    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && estimateDirectorTextWidth(candidate, element) > width) {
        count += 1;
        current = word;
      } else {
        current = candidate;
      }
    }
    count += 1;
  }
  return Math.max(1, count);
}

function stringProperty(properties: Readonly<Record<string, string | number>>, name: string): string | undefined {
  const value = properties[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberProperty(properties: Readonly<Record<string, string | number>>, name: string): number | undefined {
  const value = properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanProperty(properties: Readonly<Record<string, string | number>>, name: string): boolean {
  const value = properties[name];
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }

  return false;
}

function normalizeSymbolKey(value: LingoSymbol | string): string {
  return (value instanceof LingoSymbol ? value.name : value.replace(/^#/, "")).toLowerCase();
}

function normalizeMemberName(value: string): string {
  return value.trim().toLowerCase();
}
