import type { DirectorMemberManifest, DirectorMemberRef } from "../../../runtime";
import defaultFurniManifest from "../../../../generated/runtime-data/release1_roseau_dcr0910-furni.json";
import type { HabboRoomObjectRecord } from "../../room/HabboRoomObjectData";

export const release1FurniMetadataSource =
  "generated/runtime-data/release1_roseau_dcr0910-furni.json";

type Release1FurniManifest = typeof defaultFurniManifest;

export interface Release1FurniPreviewAsset {
  readonly memberName: string;
  readonly memberRef?: DirectorMemberRef & { readonly memberName?: string; readonly castName?: string };
  readonly assetPath: string;
  readonly width: number;
  readonly height: number;
  readonly inkAssetPaths?: Readonly<Record<string, string>>;
}

export interface Release1FurniDefinition {
  readonly id: number;
  readonly sprite: string;
  readonly color: string;
  readonly name: string;
  readonly description: string;
  readonly behaviour: string;
  readonly dimensions?: {
    readonly length?: number;
    readonly width?: number;
    readonly height?: number;
  };
  readonly flags?: Readonly<Record<string, boolean>>;
  readonly preview?: {
    readonly candidates?: readonly string[];
    readonly asset?: Release1FurniPreviewAsset;
  };
}

export interface Release1ResolvedFurniMetadata {
  readonly definition: Release1FurniDefinition;
  readonly displayName: string;
  readonly description: string;
  readonly smallMemberName: string;
  readonly previewMemberNames: readonly string[];
  readonly previewAsset?: Release1FurniPreviewAsset;
  readonly source: string;
}

export function release1FurniDefinitionForRoomObject(object: HabboRoomObjectRecord): Release1FurniDefinition | undefined {
  const manifest = release1FurniManifest();
  const spriteKeys = release1FurniSpriteKeyCandidates(object.className);
  const definitionsBySprite = manifest.definitionsBySprite as Readonly<Record<string, unknown>>;
  const definitions = manifest.definitions as Readonly<Record<string, Release1FurniDefinition>>;
  for (const spriteKey of spriteKeys) {
    const candidateIds = readDefinitionIds(definitionsBySprite[spriteKey]);
    const exact = candidateIds
      .map((id) => definitions[String(id)])
      .find((definition) => definition !== undefined);
    if (exact) {
      return exact;
    }
  }

  const candidateSet = new Set(spriteKeys);
  return Object.values(definitions)
    .find((definition) => candidateSet.has(definition.sprite));
}

export function release1FurniMetadataForRoomObject(object: HabboRoomObjectRecord): Release1ResolvedFurniMetadata | undefined {
  const definition = release1FurniDefinitionForRoomObject(object);
  if (!definition) {
    return undefined;
  }

  const previewAsset = definition.preview?.asset;
  const previewMemberNames = release1FurniPreviewMemberCandidates(definition);
  const previewName = previewAsset?.memberName
    ?? previewMemberNames[0]
    ?? `${definition.sprite}_small`;
  return {
    definition,
    displayName: definition.name,
    description: definition.description,
    smallMemberName: previewName,
    previewMemberNames: previewAsset?.memberName
      ? uniqueStrings([previewAsset.memberName, ...previewMemberNames])
      : previewMemberNames,
    ...(previewAsset ? { previewAsset } : {}),
    source: release1FurniMetadataSource
  };
}

export function createRelease1FurniPreviewRuntimeMember(
  memberNumber: number,
  memberName: string,
  asset: Release1FurniPreviewAsset,
  regPoint: { readonly x: number; readonly y: number }
): DirectorMemberManifest {
  return {
    number: memberNumber,
    name: `runtime.release1.selected.object.${memberName}`,
    type: "bitmap",
    width: asset.width,
    height: asset.height,
    regPoint,
    assetPath: asset.assetPath,
    ...(asset.inkAssetPaths ? { inkAssetPaths: { ...asset.inkAssetPaths } } : {})
  };
}

function release1FurniManifest(): Release1FurniManifest {
  return defaultFurniManifest as Release1FurniManifest;
}

function release1FurniSpriteKeyCandidates(className: string): readonly string[] {
  const raw = className.trim();
  const sourceName = raw.replace(/-/g, "_");
  const lower = sourceName.toLowerCase();
  const noPrefix = lower.replace(/^furni[_-]/, "");
  const base = noPrefix.replace(/\*.*$/, "");
  return uniqueStrings([raw, sourceName, lower, noPrefix, base]);
}

function release1FurniPreviewMemberCandidates(definition: Release1FurniDefinition): readonly string[] {
  const sourceCandidates = definition.preview?.candidates ?? [];
  const preferred = sourceCandidates.find((candidate) => candidate.endsWith("_small"))
    ?? `${definition.sprite}_small`;
  const expanded: string[] = [preferred, ...sourceCandidates, `${definition.sprite}_small`];
  for (const candidate of [...expanded]) {
    expanded.push(candidate.replace(/\*[^_]+(?=_|$)/, ""));
  }
  return uniqueStrings(expanded.filter((candidate) => candidate.length > 0));
}

function readDefinitionIds(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
