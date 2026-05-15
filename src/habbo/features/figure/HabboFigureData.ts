import type { HabboFigurePartIndexEntry, HabboFigurePartIndexSet } from "../../boot/HabboBootResourceTypes";

export interface HabboFigurePartProps {
  readonly model: string;
  readonly color: string;
  readonly setid: number;
  readonly colorid: number;
}

export interface HabboFigureSourceLayer {
  readonly part: string;
  readonly assetPath: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly ink: number;
  readonly alpha?: number;
  readonly flipH?: boolean;
  readonly tint?: string;
}

export type HabboFigureTemplateAction = "std" | "walk" | "wave" | "smile" | "sit" | "lay";

export interface HabboFigurePartActionOverride {
  readonly action: string;
  readonly part?: string;
  readonly direction?: number;
  readonly frame?: number;
  readonly flipH?: boolean;
  readonly allowMirrorFallback?: boolean;
}

export interface HabboFigureRenderOptions {
  readonly action?: HabboFigureTemplateAction;
  readonly animFrame?: number;
  readonly headDirection?: number;
  readonly preferredCasts?: readonly string[];
  readonly memberPrefix?: "h" | "sh";
  readonly xOffset?: number;
  readonly canvasWidth?: number;
  readonly canvasHeight?: number;
  readonly baselineOffset?: number;
  readonly layerCacheKey?: string;
  readonly partActionOverrides?: Readonly<Record<string, HabboFigurePartActionOverride>>;
}

export interface HabboFigurePartAssetRequest {
  readonly action: string;
  readonly part: string;
  readonly direction: number;
  readonly frame: number;
  readonly flipH?: boolean;
  readonly allowMirrorFallback?: boolean;
}

export interface HabboHumanCanvasModeSpec {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly regPointOffsetY: number;
}

export interface HabboHumanCanvasSpec {
  readonly peopleSize: "h" | "sh";
  readonly width: number;
  readonly height: number;
  readonly regPoint: { readonly x: number; readonly y: number };
  readonly canvasHeight: number;
  readonly baselineOffset: number;
  readonly xOffset: number;
  readonly memberPrefix: "h" | "sh";
  readonly preferredCasts: readonly string[];
  readonly correctLocZ: boolean;
}

export interface HabboFigureLayerBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export function createDefaultFigureProps(sex: "M" | "F", figurePartIndexSet?: HabboFigurePartIndexSet): Record<string, HabboFigurePartProps> {
  const sourceBacked = createDefaultFigurePropsFromIndex(sex, figurePartIndexSet);
  if (sourceBacked) {
    return sourceBacked;
  }

  const figure: Record<string, HabboFigurePartProps> = {};
  const add = (part: string, model: string, color: string, setid: number, colorid = 1): void => {
    figure[part] = { model, color, setid, colorid };
  };

  if (sex === "F") {
    add("hr", "003", "#784215", 500);
    add("hd", "002", "#ffcc99", 580);
    add("ey", "002", "#ffcc99", 580);
    add("fc", "001", "#ffcc99", 580);
    add("bd", "001", "#ffcc99", 580);
    add("lh", "001", "#ffcc99", 580);
    add("rh", "001", "#ffcc99", 580);
    add("lg", "001", "#e63139", 670);
    add("sh", "001", "#c0b4c7", 700);
    add("ch", "002", "#626262", 610);
    add("ls", "001", "#626262", 610);
    add("rs", "001", "#626262", 610);
    return figure;
  }

  add("hr", "001", "#eeeeee", 100);
  add("hd", "002", "#ffcc99", 180);
  add("ey", "001", "#ffcc99", 180);
  add("fc", "001", "#ffcc99", 180);
  add("bd", "001", "#ffcc99", 180);
  add("lh", "001", "#ffcc99", 180);
  add("rh", "001", "#ffcc99", 180);
  add("lg", "001", "#779fbb", 270);
  add("sh", "001", "#afdcdf", 290);
  add("ch", "001", "#e8b137", 210);
  add("ls", "001", "#e8b137", 210);
  add("rs", "001", "#e8b137", 210);
  return figure;
}

export function parseOldServerFigureString(
  figureData: string | undefined,
  sex: "M" | "F",
  figurePartIndexSet?: HabboFigurePartIndexSet
): Record<string, HabboFigurePartProps> | undefined {
  const keyValueFigure = parseKeyValueFigureString(figureData);
  if (keyValueFigure) {
    return keyValueFigure;
  }

  if (!figureData || !/^\d{25}$/.test(figureData)) {
    return undefined;
  }

  const figure: Record<string, HabboFigurePartProps> = {};
  for (let offset = 0; offset < figureData.length; offset += 5) {
    const setid = Number.parseInt(figureData.slice(offset, offset + 3), 10);
    const colorid = Number.parseInt(figureData.slice(offset + 3, offset + 5), 10);
    const entry = findFigureSetEntry(setid, sex, figurePartIndexSet);
    if (!entry) {
      return undefined;
    }
    applyFigurePartEntry(figure, entry, colorid);
  }

  return Object.keys(figure).length > 0 ? figure : undefined;
}

function parseKeyValueFigureString(figureData: string | undefined): Record<string, HabboFigurePartProps> | undefined {
  if (!figureData || !figureData.includes("=") || !figureData.includes("/")) {
    return undefined;
  }

  const figure: Record<string, HabboFigurePartProps> = {};
  for (const entry of figureData.split("&")) {
    const [part, value] = entry.split("=");
    if (!part || !value) {
      continue;
    }

    const [model, colorToken = "0"] = value.split("/");
    if (!model) {
      continue;
    }

    const setid = Number.parseInt(model, 10);
    figure[part] = {
      model: normalizeFigureModel(model),
      color: parseKeyValueFigureColor(colorToken),
      setid: Number.isFinite(setid) ? setid : 0,
      colorid: 0
    };
  }

  return Object.keys(figure).length > 0 ? figure : undefined;
}

function parseKeyValueFigureColor(colorToken: string): string {
  const rgb = colorToken
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10));
  if (rgb.length === 3 && rgb.every((part) => Number.isFinite(part))) {
    return `#${rgb.map((part) => clampByte(part).toString(16).padStart(2, "0")).join("")}`;
  }

  return "#000000";
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export function figurePartInk(part: string): number {
  switch (part) {
    case "ey":
      return 36;
    case "sd":
      return 8;
    case "ri":
    case "li":
      return 8;
    default:
      return 41;
  }
}

export function normalizeFigureDirection(direction: number): number {
  if (!Number.isFinite(direction)) {
    return 2;
  }

  const rounded = Math.round(direction);
  return ((rounded % 8) + 8) % 8;
}

export function resolveFigurePartAssetRequest(
  part: string,
  direction: number,
  options: HabboFigureRenderOptions
): HabboFigurePartAssetRequest {
  const bodyDirection = normalizeFigureDirection(direction);
  const flippedDirection = flipFigureDirection(bodyDirection);
  const animFrame = Math.max(0, Math.trunc(options.animFrame ?? 0));
  const partOverride = options.partActionOverrides?.[part];
  if (partOverride?.action) {
    return {
      action: partOverride.action,
      part: partOverride.part ?? part,
      direction: normalizeFigureDirection(partOverride.direction ?? flippedDirection),
      frame: Math.max(0, Math.trunc(partOverride.frame ?? animFrame)),
      ...(partOverride.flipH ? { flipH: true } : {}),
      ...(partOverride.allowMirrorFallback === true ? { allowMirrorFallback: true } : {})
    };
  }

  if (options.action === "walk" && isFigureWalkPart(part)) {
    return { action: "wlk", part, direction: flippedDirection, frame: animFrame % 4 };
  }

  if (options.action === "sit" && isFigureSitPart(part)) {
    return { action: "sit", part, direction: flippedDirection, frame: 0 };
  }

  if (options.action === "lay") {
    const layDirection = flipFigureDirection(bodyDirection === 0 ? 4 : bodyDirection);
    return { action: "lay", part, direction: layDirection, frame: 0 };
  }

  if (options.action === "wave") {
    if ((part === "lh" || part === "ls") && bodyDirection === flippedDirection) {
      return { action: "wav", part, direction: flippedDirection, frame: animFrame % 2 };
    }

    if ((part === "rh" || part === "rs") && bodyDirection !== flippedDirection) {
      return { action: "wav", part: `l${part.slice(1)}`, direction: bodyDirection, frame: animFrame % 2 };
    }
  }

  if (options.action === "smile" && (part === "fc" || part === "ey")) {
    return { action: "sml", part, direction: flippedDirection, frame: 0 };
  }

  return { action: "std", part, direction: flippedDirection, frame: 0 };
}

export function isFigureHeadPart(part: string): boolean {
  return part === "hd" || part === "hr" || part === "ey" || part === "fc";
}

export function orderFigureParts(parts: readonly string[], direction: number, action: HabboFigureTemplateAction): readonly string[] {
  const requested = new Set(parts);
  const baseOrder = ["sd", "li", "lh", "ls", "bd", "sh", "lg", "ch", "hd", "fc", "ey", "hr", "ri", "rh", "rs"];
  const body = normalizeFigureDirection(direction);
  const leftParts = ["li", "lh", "ls"];
  const rightParts = ["ri", "rh", "rs"];
  let ordered = baseOrder.filter((part) => requested.has(part));
  ordered = ordered.filter((part) => !leftParts.includes(part) && !rightParts.includes(part));

  const presentLeft = leftParts.filter((part) => requested.has(part));
  const presentRight = rightParts.filter((part) => requested.has(part));
  if (body === 3) {
    const insertAt = Math.min(7, ordered.length);
    ordered.splice(insertAt, 0, ...presentLeft);
  } else {
    ordered.unshift(...presentLeft);
  }

  if (body === 7) {
    const insertAt = Math.min(presentLeft.length, ordered.length);
    ordered.splice(insertAt, 0, ...presentRight);
  } else {
    ordered.push(...presentRight);
  }

  if (action === "walk" || action === "std" || action === "wave" || action === "smile" || action === "sit" || action === "lay") {
    return ordered;
  }

  return parts;
}

export function flipFigureDirection(direction: number): number {
  return [0, 1, 2, 3, 2, 1, 0, 7][normalizeFigureDirection(direction)] ?? 2;
}

export function shouldFlipFigureSprite(bodyDirection: number, headDirection: number): boolean {
  const body = normalizeFigureDirection(bodyDirection);
  const head = normalizeFigureDirection(headDirection);
  return flipFigureDirection(body) !== body || (body === 3 && head === 4) || (body === 7 && head === 6);
}

export function createFigurePartAssetFallbackRequests(
  part: string,
  direction: number,
  assetRequest: HabboFigurePartAssetRequest,
  options: HabboFigureRenderOptions
): readonly HabboFigurePartAssetRequest[] {
  const bodyDirection = normalizeFigureDirection(direction);
  const flippedDirection = flipFigureDirection(bodyDirection);
  const candidates: HabboFigurePartAssetRequest[] = [assetRequest];
  if (assetRequest.action === "wlk") {
    for (const frame of [0, 1, 2, 3]) {
      candidates.push({ action: "wlk", part: assetRequest.part, direction: assetRequest.direction, frame });
    }
  }

  if (assetRequest.allowMirrorFallback === true && assetRequest.action !== "std" && isFigureArmPart(assetRequest.part)) {
    const mirrorPart = oppositeFigureArmPart(assetRequest.part);
    const mirrorDirection = normalizeFigureDirection(6 - assetRequest.direction);
    candidates.push({
      action: assetRequest.action,
      part: mirrorPart,
      direction: mirrorDirection,
      frame: assetRequest.frame,
      flipH: true
    });
    candidates.push({
      action: assetRequest.action,
      part: mirrorPart,
      direction: mirrorDirection,
      frame: 0,
      flipH: true
    });
  }

  if (assetRequest.action !== "std") {
    candidates.push({ action: "std", part: assetRequest.part, direction: assetRequest.direction, frame: 0 });
    candidates.push({ action: "std", part, direction: flippedDirection, frame: 0 });
  }

  if (options.action === "wave" && (part === "rh" || part === "rs")) {
    candidates.push({ action: "std", part, direction: flippedDirection, frame: 0 });
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.action}:${candidate.part}:${candidate.direction}:${candidate.frame}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function isExpectedMissingFigurePartAsset(
  part: string,
  assetRequest: HabboFigurePartAssetRequest,
  options: HabboFigureRenderOptions
): boolean {
  const direction = normalizeFigureDirection(assetRequest.direction);
  if ((part === "fc" || part === "ey") && ![1, 2, 3].includes(direction)) {
    return true;
  }

  return options.memberPrefix === "sh" && part === "ey";
}

export function getFigureLayerBounds(layers: readonly HabboFigureSourceLayer[]): HabboFigureLayerBounds {
  const bounds = layers.reduce(
    (rect, layer) => ({
      left: Math.min(rect.left, layer.x),
      top: Math.min(rect.top, layer.y),
      right: Math.max(rect.right, layer.x + layer.width),
      bottom: Math.max(rect.bottom, layer.y + layer.height)
    }),
    { left: Number.POSITIVE_INFINITY, top: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY }
  );
  const left = Number.isFinite(bounds.left) ? bounds.left : 0;
  const top = Number.isFinite(bounds.top) ? bounds.top : 0;
  const right = Number.isFinite(bounds.right) ? bounds.right : left + 1;
  const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top + 1;
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

function createDefaultFigurePropsFromIndex(
  sex: "M" | "F",
  figurePartIndexSet?: HabboFigurePartIndexSet
): Record<string, HabboFigurePartProps> | undefined {
  const sexIndex = figurePartIndexSet?.sexes[sex];
  if (!sexIndex) {
    return undefined;
  }

  const figure: Record<string, HabboFigurePartProps> = {};
  for (const part of ["hr", "hd", "ch", "lg", "sh"]) {
    const entry = sexIndex[part]?.[0];
    if (!entry) {
      return undefined;
    }
    applyFigurePartEntry(figure, entry, 1);
  }
  return figure;
}

function findFigureSetEntry(
  setid: number,
  sex: "M" | "F",
  figurePartIndexSet?: HabboFigurePartIndexSet
): HabboFigurePartIndexEntry | undefined {
  const sexIndex = figurePartIndexSet?.sexes[sex];
  if (!sexIndex) {
    return undefined;
  }

  for (const entries of Object.values(sexIndex)) {
    const entry = entries.find((candidate) => candidate.setid === setid);
    if (entry) {
      return entry;
    }
  }

  return undefined;
}

export function applyFigurePartEntry(
  figure: Record<string, HabboFigurePartProps>,
  entry: HabboFigurePartIndexEntry | undefined,
  colorid: number
): void {
  if (!entry) {
    return;
  }

  const normalizedColorid = clampOneBasedIndex(colorid, entry.colors.length);
  const color = entry.colors[normalizedColorid - 1] ?? "#ffffff";
  for (const [part, model] of Object.entries(entry.parts)) {
    figure[part] = {
      model: normalizeFigureModel(model),
      color,
      setid: entry.setid,
      colorid: normalizedColorid
    };
  }
}

function normalizeFigureModel(model: string): string {
  const text = String(model);
  return /^\d+$/.test(text) ? text.padStart(3, "0") : text;
}

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return ((index % length) + length) % length;
}

export function clampOneBasedIndex(index: number, length: number): number {
  if (length <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(length, Math.trunc(index)));
}

function isFigureWalkPart(part: string): boolean {
  return part === "bd" || part === "lg" || part === "lh" || part === "rh" || part === "ls" || part === "rs" || part === "sh";
}

function isFigureArmPart(part: string): boolean {
  return part === "lh" || part === "ls" || part === "rh" || part === "rs";
}

function oppositeFigureArmPart(part: string): string {
  if (part === "lh") {
    return "rh";
  }
  if (part === "ls") {
    return "rs";
  }
  if (part === "rh") {
    return "lh";
  }
  if (part === "rs") {
    return "ls";
  }
  return part;
}

function isFigureSitPart(part: string): boolean {
  return part === "bd" || part === "lg" || part === "sh";
}
