import type { DirectorBitmapCompositeLayer, DirectorMemberManifest } from "../../runtime";
import { HabboRoomObjectClassProps, parseRoomObjectPartColors, roomObjectPartColorToHex } from "../room/HabboRoomObjectProps";
import {
  catalogueLargePreviewMemberCandidates,
  createCatalogueCenteredImageFeedImageMember,
  type HabboCatalogueBitmapAssetSource,
  type HabboCatalogueProductRecord
} from "./HabboCatalogueDialog";

export const HABBO_CATALOGUE_PRODUCT_PREVIEW_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_cat_code/casts/External/ParentScript 5 - Product Preview Class.ls";

export const HABBO_CATALOGUE_SMALL_PREVIEW_RENDERER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 56 - Preview Renderer Class.ls";

const productPreviewPreferredCasts = [
  "hh_cat_gfx_all",
  "hh_furni_armas",
  "hh_furni_plasto",
  "hh_furni_drken",
  "hh_furni_special",
  "hh_furni_items",
  "hh_room_private"
];

export interface HabboCatalogueProductPreviewResolver {
  readonly resolveAsset: (
    candidates: readonly string[],
    preferredCasts: readonly string[]
  ) => HabboCatalogueBitmapAssetSource | undefined;
  readonly getClassPropsSource?: (className: string) => string | undefined;
}

export interface HabboCatalogueProductPreviewFeedOptions extends HabboCatalogueProductPreviewResolver {
  readonly number: number;
  readonly windowName: string;
  readonly elementId: string;
  readonly width: number;
  readonly height: number;
  readonly product: HabboCatalogueProductRecord;
}

export interface HabboCatalogueProductPreviewLayerPlan {
  readonly width: number;
  readonly height: number;
  readonly layers: readonly DirectorBitmapCompositeLayer[];
  readonly memberNames: readonly string[];
}

interface ProductPreviewLayerSource {
  readonly part: string;
  readonly asset: HabboCatalogueBitmapAssetSource;
  readonly x: number;
  readonly y: number;
  readonly zKey: number;
  readonly ink: number;
  readonly blend: number;
  readonly tint?: string;
}

export function catalogueProductPreviewDirectMemberCandidates(product: HabboCatalogueProductRecord): string[] {
  const candidates: string[] = [];
  if (product.purchaseCode) {
    candidates.push(`ctlg_pic_${product.purchaseCode}`);
  }

  const baseClass = catalogueProductPreviewBaseClass(product.className);
  if (baseClass) {
    candidates.push(`${product.className.trim()}_small`);
    if (baseClass !== product.className.trim()) {
      candidates.push(`${baseClass}_small`);
    }
  }

  if (product.kind === "i" && baseClass) {
    candidates.push(`rightwall ${baseClass}`);
  }

  return uniqueCatalogueProductPreviewCandidates(candidates);
}

export function createCatalogueProductPreviewFeedImageMember(
  options: HabboCatalogueProductPreviewFeedOptions
): DirectorMemberManifest | undefined {
  const directAsset = options.resolveAsset(catalogueProductPreviewDirectMemberCandidates(options.product), productPreviewPreferredCasts);
  if (directAsset) {
    return createCatalogueCenteredImageFeedImageMember({
      number: options.number,
      windowName: options.windowName,
      elementId: options.elementId,
      width: options.width,
      height: options.height,
      image: directAsset,
      fillColor: "#ffffff",
      imageInk: options.product.kind === "i" ? 8 : 36
    });
  }

  const previewPlan = createCatalogueProductPreviewLayerPlan(options);
  if (previewPlan) {
    const offsetX = Math.round((options.width - previewPlan.width) / 2);
    const offsetY = Math.round((options.height - previewPlan.height) / 2);
    return {
      number: options.number,
      name: `runtime.${options.windowName}.${options.elementId}.feedImage`,
      type: "bitmap",
      width: options.width,
      height: options.height,
      composite: {
        width: options.width,
        height: options.height,
        layers: [
          {
            fillColor: "#ffffff",
            x: 0,
            y: 0,
            width: options.width,
            height: options.height
          },
          ...previewPlan.layers.map((layer) => ({
            ...layer,
            x: layer.x + offsetX,
            y: layer.y + offsetY
          }))
        ]
      }
    };
  }

  const fallbackAsset = options.resolveAsset(catalogueLargePreviewMemberCandidates(options.product), productPreviewPreferredCasts);
  return createCatalogueCenteredImageFeedImageMember({
    number: options.number,
    windowName: options.windowName,
    elementId: options.elementId,
    width: options.width,
    height: options.height,
    ...(fallbackAsset ? { image: fallbackAsset, fillColor: "#ffffff", imageInk: 36 } : {})
  });
}

export function createCatalogueProductPreviewLayerPlan(options: {
  readonly product: HabboCatalogueProductRecord;
  readonly resolveAsset: HabboCatalogueProductPreviewResolver["resolveAsset"];
  readonly getClassPropsSource?: HabboCatalogueProductPreviewResolver["getClassPropsSource"];
}): HabboCatalogueProductPreviewLayerPlan | undefined {
  if (options.product.kind !== "s") {
    return undefined;
  }

  const baseClass = catalogueProductPreviewBaseClass(options.product.className);
  if (!baseClass || !options.product.direction) {
    return undefined;
  }

  const dimensions = parseCatalogueProductPreviewDimensions(options.product.dimensions);
  const directions = sourceCatalogueProductPreviewDirections(options.product.direction);
  if (directions.length === 0) {
    return undefined;
  }

  const classProps = HabboRoomObjectClassProps.fromSource(options.getClassPropsSource?.(baseClass));
  const partColors = parseRoomObjectPartColors(options.product.partColors);
  const layerSources = resolveProductPreviewLayerSources({
    baseClass,
    dimensions,
    directions,
    partColors,
    classProps,
    resolveAsset: options.resolveAsset
  });
  if (layerSources.length === 0) {
    return undefined;
  }

  const sortedSources = [...layerSources].sort((left, right) => left.zKey - right.zKey);
  const minX = Math.min(...sortedSources.map((source) => source.x));
  const minY = Math.min(...sortedSources.map((source) => source.y));
  const maxX = Math.max(...sortedSources.map((source) => source.x + source.asset.width));
  const maxY = Math.max(...sortedSources.map((source) => source.y + source.asset.height));
  const previewWidth = Math.max(1, maxX - minX);
  const previewHeight = Math.max(1, maxY - minY);

  return {
    width: previewWidth,
    height: previewHeight,
    memberNames: sortedSources.map((source) => source.asset.memberName ?? ""),
    layers: sortedSources.map((source): DirectorBitmapCompositeLayer => ({
      assetPath: catalogueProductPreviewLayerAssetPath(source.asset, source.ink),
      x: source.x - minX,
      y: source.y - minY,
      width: source.asset.width,
      height: source.asset.height,
      sourceWidth: source.asset.width,
      sourceHeight: source.asset.height,
      ...(source.ink !== 8 ? { ink: source.ink } : {}),
      ...(source.blend !== 100 ? { alpha: Math.max(0, Math.min(100, source.blend)) / 100 } : {}),
      ...(source.tint ? { tint: source.tint } : {})
    }))
  };
}

function resolveProductPreviewLayerSources(options: {
  readonly baseClass: string;
  readonly dimensions: readonly [number, number];
  readonly directions: readonly number[];
  readonly partColors: readonly string[];
  readonly classProps: HabboRoomObjectClassProps;
  readonly resolveAsset: HabboCatalogueProductPreviewResolver["resolveAsset"];
}): ProductPreviewLayerSource[] {
  let sourceDirections = [...options.directions];
  let firstPart = resolveProductPreviewPartAsset(options.baseClass, "a", options.dimensions, sourceDirections[0] ?? 0, options.resolveAsset);
  while (!firstPart && sourceDirections[0] !== undefined && sourceDirections[0] < 7) {
    sourceDirections = sourceDirections.map((direction) => direction + 1);
    firstPart = resolveProductPreviewPartAsset(options.baseClass, "a", options.dimensions, sourceDirections[0] ?? 0, options.resolveAsset);
  }

  if (!firstPart) {
    return [];
  }

  const sources: ProductPreviewLayerSource[] = [];
  for (let index = 0; index < 26; index++) {
    const part = String.fromCharCode("a".charCodeAt(0) + index);
    const direction = sourceDirections[index] ?? sourceDirections[0] ?? 0;
    const asset = index === 0
      ? firstPart
      : resolveProductPreviewPartAsset(options.baseClass, part, options.dimensions, direction, options.resolveAsset);
    if (!asset) {
      break;
    }

    const regPoint = asset.regPoint ?? { x: 0, y: 0 };
    const ink = options.classProps.getInk(part);
    const blend = options.classProps.getBlend(part);
    const tint = roomObjectPartColorToHex(options.partColors[index]);
    sources.push({
      part,
      asset,
      x: 100 - regPoint.x,
      y: 150 - regPoint.y,
      zKey: options.classProps.getZShift(part, sourceDirections[0] ?? 0) + part.charCodeAt(0),
      ink,
      blend,
      ...(tint && tint.toLowerCase() !== "#ffffff" ? { tint } : {})
    });
  }

  return sources;
}

function resolveProductPreviewPartAsset(
  baseClass: string,
  part: string,
  dimensions: readonly [number, number],
  direction: number,
  resolveAsset: HabboCatalogueProductPreviewResolver["resolveAsset"]
): HabboCatalogueBitmapAssetSource | undefined {
  const memberBase = `${baseClass}_${part}_0_${dimensions[0]}_${dimensions[1]}`;
  return resolveAsset([
    `${memberBase}_${direction}_0`,
    `${memberBase}_0_0`
  ], productPreviewPreferredCasts);
}

function catalogueProductPreviewLayerAssetPath(asset: HabboCatalogueBitmapAssetSource, ink: number): string {
  if (ink === 41) {
    return asset.inkAssetPaths?.["8"] ?? asset.assetPath;
  }
  if (ink === 33) {
    return asset.inkAssetPaths?.["36"] ?? asset.assetPath;
  }
  return asset.inkAssetPaths?.[String(ink)] ?? asset.assetPath;
}

function sourceCatalogueProductPreviewDirections(value: string): number[] {
  if (!value.trim()) {
    return [];
  }

  // Catalogue Interface Class.showPreviewImage overwrites an existing source
  // direction string with "2,2,2" before it creates Product Preview Class.
  return [2, 2, 2];
}

function parseCatalogueProductPreviewDimensions(value: string | undefined): readonly [number, number] {
  const values = (value ?? "")
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry));
  return [
    Math.max(1, values[0] ?? 1),
    Math.max(1, values[1] ?? 1)
  ];
}

function catalogueProductPreviewBaseClass(className: string): string {
  const trimmed = className.trim();
  const marker = trimmed.indexOf("*");
  return marker >= 0 ? trimmed.slice(0, marker) : trimmed;
}

function uniqueCatalogueProductPreviewCandidates(candidates: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of candidates) {
    const normalized = candidate.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}
