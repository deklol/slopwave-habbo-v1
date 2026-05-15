import type {
  DirectorMemberRef,
  DirectorCastLibManifest,
  DirectorMemberManifest,
  DirectorSpriteChannelManifest
} from "../../runtime";
import { LingoList, parseLingoLiteral } from "../../lingo";
import type {
  HabboExternalCastEntry,
  HabboExternalCastVisualLayout,
  HabboWindowBitmapAsset
} from "./HabboBootResourceTypes";
import {
  coerceVariableFieldValue,
  lingoCharFromValue,
  lingoPropertyEntries,
  normalizeCastName,
  normalizeMemberName,
  normalizePaletteName,
  resolveKnownBitmapFallbackColor,
  stripMemberAliasSuffix,
  toDirectorMemberType
} from "../HabboSourceValueHelpers";
import { getProjectorRaysManifestsByVersion } from "../extractedManifests";

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";

export interface HabboExternalCastRuntimeHost {
  [key: string]: any;
}

interface HabboResolvedLoaderLogoAsset {
  readonly source: "internal-cast" | "override";
  readonly assetPath: string;
  readonly width: number;
  readonly height: number;
  readonly regPoint: { readonly x: number; readonly y: number };
  readonly inkAssetPaths: Readonly<Record<string, string>>;
}

export function getIntVariableRuntime(host: HabboExternalCastRuntimeHost, name: string, fallback: number): number {
  const value = host.getVariable(name);
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return fallback;
}

export function setVariableRuntime(host: HabboExternalCastRuntimeHost, name: string, value: unknown): void {
  host.variables.set(name, value);
}

export function getVariableRuntime(host: HabboExternalCastRuntimeHost, name: string): unknown {
  return host.variables.get(name);
}

export function getClassVariableRuntime(host: HabboExternalCastRuntimeHost, name: string): unknown {
  const value = host.variables.get(name);
  return typeof value === "string" ? parseLingoLiteral(value) : value;
}

export function convertSpecialCharsRuntime(host: HabboExternalCastRuntimeHost, value: string, direction = 0): string {
  const entries = lingoPropertyEntries(host.getVariable("char.conversion.win"));
  if (entries.length === 0) {
    return value;
  }

  let converted = "";
  for (const char of value) {
    let replacement = char;
    for (const [rawKey, rawValue] of entries) {
      const from = direction === 0 ? lingoCharFromValue(rawKey) : lingoCharFromValue(rawValue);
      const to = direction === 0 ? lingoCharFromValue(rawValue) : lingoCharFromValue(rawKey);
      if (char === from) {
        replacement = to;
        break;
      }
    }
    converted += replacement;
  }
  return converted;
}

export function getBoolVariableRuntime(host: HabboExternalCastRuntimeHost, name: string): boolean {
  const value = host.getVariable(name);
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }

  return Boolean(value);
}

export function getRoomCommonCastEntriesRuntime(host: HabboExternalCastRuntimeHost): readonly string[] {
  const castList: string[] = [];
  for (let index = 1; ; index++) {
    const value = host.getVariable(`room.cast.${index}`);
    if (typeof value !== "string" || value.length === 0) {
      break;
    }
    castList.push(value);
  }
  return castList;
}

export function readCastListVariableRuntime(host: HabboExternalCastRuntimeHost, name: string): readonly string[] {
  const value = host.getVariable(name);
  if (value instanceof LingoList) {
    return value.toArray().map((entry) => String(entry)).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = parseLingoLiteral(value);
    if (parsed instanceof LingoList) {
      return parsed.toArray().map((entry) => String(entry)).filter(Boolean);
    }
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry)).filter(Boolean);
    }
    return value.split(",").map((entry) => entry.replaceAll("\"", "").trim()).filter(Boolean);
  }
  return [];
}

export function getSequentialCastEntriesRuntime(host: HabboExternalCastRuntimeHost, release: string): readonly string[] {
  const castList: string[] = [];
  for (let index = 1; ; index++) {
    const value = host.getVariable(`cast.entry.${index}`);
    if (typeof value !== "string" || value.length === 0) {
      break;
    }

    castList.push(value);
  }

  if (castList.length > 0) {
    return host.applyCastEntryCompatibility(release, castList);
  }

  return host.applyCastEntryCompatibility(release, host.getSourceBackedCastEntryFallback(release));
}

export function applyCastEntryCompatibilityRuntime(
  host: HabboExternalCastRuntimeHost,
  release: string,
  castList: readonly string[]
): readonly string[] {
  void host;
  void release;
  return castList;
}

export function getSourceBackedCastEntryFallbackRuntime(
  host: HabboExternalCastRuntimeHost,
  release: string
): readonly string[] {
  const threadFieldName = String(host.getVariable("thread.index.field") ?? "thread.index");
  const castsByName = new Map<string, string>();

  for (const field of host.externalCastTextFieldSet?.fields ?? []) {
    if (field.memberName.toLowerCase() !== threadFieldName.toLowerCase()) {
      continue;
    }

    castsByName.set(normalizeCastName(field.castName), field.castName);
  }

  const ordered = [...castsByName.values()].sort((left, right) => {
    const leftOrder = host.resolveExternalCast(left)?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = host.resolveExternalCast(right)?.order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  const entryVisualCast = host.getEntryVisualCastEntryFallback(release, ordered);
  if (entryVisualCast && !ordered.map(normalizeCastName).includes(normalizeCastName(entryVisualCast.castName))) {
    ordered.push(entryVisualCast.castName);
  }

  if (ordered.length === 0) {
    return [];
  }

  host.movie.setProperty("coreThreadCastListFallback", {
    release,
    reason: "cast.entry variables missing",
    source: "generated/runtime-data/external-cast-text-fields.json",
    threadIndexField: threadFieldName,
    ...(entryVisualCast !== undefined ? { entryVisualCastFallback: entryVisualCast } : {}),
    casts: ordered
  });
  host.recordUnsupportedOnce("external-cast-entry-list-missing", {
    subsystem: "habbo",
    feature: "external-cast-entry-list-missing",
    detail: `${release} external variables did not provide cast.entry.N values; using generated thread.index cast order as a boot-only fallback for the v14 load-to-login slice`,
    source: host.externalCastGraph?.variableSourcePath ?? "generated/runtime-data/external-cast-graph.json"
  });

  return ordered;
}

export function getEntryVisualCastEntryFallbackRuntime(
  host: HabboExternalCastRuntimeHost,
  release: string,
  orderedThreadCasts: readonly string[]
): { readonly castName: string; readonly source: string; readonly reason: string } | undefined {
  const requestedVisualName = host.getEntryHotelVisualMemberName(release);
  const candidates = host.externalCastVisualLayoutSet?.visuals.filter((entry: HabboExternalCastVisualLayout) => {
    return entry.memberName.toLowerCase() === requestedVisualName.toLowerCase();
  }) ?? [];
  if (candidates.length === 0) {
    return undefined;
  }

  const loadedCandidate = candidates.find((entry: HabboExternalCastVisualLayout) => host.loadedCastSlots.has(normalizeCastName(entry.castName)));
  if (loadedCandidate) {
    return {
      castName: loadedCandidate.castName,
      source: loadedCandidate.textChunkPath,
      reason: "already loaded visual cast"
    };
  }

  const orderedCandidate = candidates.find((entry: HabboExternalCastVisualLayout) => {
    return orderedThreadCasts.map(normalizeCastName).includes(normalizeCastName(entry.castName));
  });
  if (orderedCandidate) {
    return {
      castName: orderedCandidate.castName,
      source: orderedCandidate.textChunkPath,
      reason: "thread-index cast also owns requested visual"
    };
  }

  const language = host.getEntryVisualLocaleHint();
  const localeCandidate = language ? host.findEntryVisualCandidateForLocale(candidates, language) : undefined;
  if (localeCandidate) {
    return {
      castName: localeCandidate.castName,
      source: localeCandidate.textChunkPath,
      reason: `locale hint ${language}`
    };
  }

  if (candidates.length === 1) {
    const [candidate] = candidates;
    if (!candidate) {
      return undefined;
    }
    return {
      castName: candidate.castName,
      source: candidate.textChunkPath,
      reason: "single visual candidate"
    };
  }

  host.recordUnsupportedOnce(`entry-visual-locale-unresolved:${requestedVisualName}`, {
    subsystem: "habbo",
    feature: "entry-visual-locale-unresolved",
    detail: `${release} createVisualizer requested ${requestedVisualName}, but ${candidates.length} localized visual casts were available and no source-backed locale variable identified one`,
    source: host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource)
  });
  return undefined;
}

export function getEntryVisualLocaleHintRuntime(host: HabboExternalCastRuntimeHost): string | undefined {
  const direct = host.getVariable("entry.visual.locale") ?? host.getVariable("client.locale") ?? host.getVariable("country") ?? host.getVariable("language");
  if (typeof direct !== "string" || direct.trim().length === 0) {
    return undefined;
  }

  return direct.toLowerCase().replace(/^en[-_]/, "").replace(/[^a-z]/g, "");
}

export function findEntryVisualCandidateForLocaleRuntime(
  candidates: readonly HabboExternalCastVisualLayout[],
  locale: string
): HabboExternalCastVisualLayout | undefined {
  const exactSuffix = locale === "gb" ? "uk" : locale;
  const exact = candidates.find((entry) => normalizeCastName(entry.castName) === `hh_entry_${exactSuffix}`);
  if (exact) {
    return exact;
  }

  if (locale === "en") {
    return candidates.find((entry) => normalizeCastName(entry.castName) === "hh_entry_uk");
  }

  return undefined;
}

export function startCastLoadRuntime(
  host: HabboExternalCastRuntimeHost,
  castList: readonly string[],
  priority: number,
  release: string
): number {
  const loadId = host.nextCastLoadId++;
  const alreadyLoadedCasts = castList.filter((castName) => host.castExists(castName));
  const loadCandidates = castList.filter((castName) => !alreadyLoadedCasts.includes(castName));
  const resolvedCasts = loadCandidates.filter((castName) => host.resolveExternalCast(castName)?.resolved ?? false);
  const missingCasts = loadCandidates.filter((castName) => !resolvedCasts.includes(castName));
  const assignedCastLibs = host.assignDynamicCastSlots(resolvedCasts);
  const importedCastLibs = host.importResolvedExternalCasts(assignedCastLibs);
  const dumpedVariableIndexes = host.dumpImportedCastVariableIndexes(importedCastLibs, release);

  for (const castName of resolvedCasts) {
    host.loadedCastNames.add(normalizeCastName(castName));
  }

  host.movie.setProperty("lastCastLoad", {
    loadId,
    priority,
    casts: [...castList],
    alreadyLoadedCasts,
    resolvedCasts,
    missingCasts,
    assignedCastLibs,
    importedCastLibs
  });
  host.movie.setProperty("lastCastGraphResolution", castList.map((castName) => {
    const cast = host.resolveExternalCast(castName);
    const assignedCastLib = host.loadedCastSlots.get(normalizeCastName(castName));
    return cast
      ? {
          order: cast.order,
          name: cast.name,
          resolved: cast.resolved,
          sourceExists: cast.sourceExists,
          assignedCastLib,
          memberCount: cast.memberCount,
          memberTypes: cast.memberTypes,
          expectedSourcePath: cast.expectedSourcePath,
          expectedExtractionRoot: cast.expectedExtractionRoot
        }
      : {
          name: castName,
          resolved: false,
          sourceExists: false,
          assignedCastLib,
          memberCount: 0,
          memberTypes: {},
          expectedSourcePath: undefined,
          expectedExtractionRoot: undefined
        };
  }));
  host.logDebug("casts", missingCasts.length > 0 ? "warn" : "ok", `startCastLoad id=${loadId} requested=${castList.length} resolved=${resolvedCasts.length} imported=${importedCastLibs.length} missing=${missingCasts.length}`, {
    loadId,
    requested: castList,
    alreadyLoadedCasts,
    resolvedCasts,
    missingCasts,
    importedCastLibs,
    dumpedVariableIndexes
  });
  host.recordUnsupportedOnce("castload-not-implemented", {
    subsystem: "director",
    feature: "castload-not-implemented",
    detail: `${release} Core Thread Class requested startCastLoad for ${castList.length} external casts; ${resolvedCasts.length} are resolved in generated ProjectorRays cast graph and imported as cast metadata, but media payload loading is not implemented yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return loadId;
}

export function dumpImportedCastVariableIndexesRuntime(
  host: HabboExternalCastRuntimeHost,
  imports: readonly { readonly castName: string; readonly castLib: number; readonly memberCount: number }[],
  release: string
): readonly { readonly castName: string; readonly propertyCount: number }[] {
  const dumps: { castName: string; propertyCount: number }[] = [];
  for (const imported of imports) {
    const field = host.externalCastTextFieldSet?.fields.find((candidate: { readonly castName: string; readonly memberName: string }) => {
      return normalizeCastName(candidate.castName) === normalizeCastName(imported.castName)
        && candidate.memberName.toLowerCase() === "variable.index";
    });
    if (!field) {
      continue;
    }

    const properties = field.properties as Record<string, string>;
    for (const [key, rawValue] of Object.entries(properties)) {
      host.variables.set(key, coerceVariableFieldValue(rawValue));
    }
    dumps.push({ castName: imported.castName, propertyCount: Object.keys(properties).length });
  }

  if (dumps.length > 0) {
    host.movie.setProperty("lastImportedCastVariableIndexes", dumps);
    host.logDebug("casts", "info", `dumped variable.index for ${dumps.length} imported casts`, { release, dumps });
  }

  return dumps;
}

export function importResolvedExternalCastsRuntime(
  host: HabboExternalCastRuntimeHost,
  assignments: readonly { readonly castName: string; readonly castLib: number }[]
): readonly {
  readonly castName: string;
  readonly castLib: number;
  readonly memberCount: number;
}[] {
  const imported: { castName: string; castLib: number; memberCount: number }[] = [];

  for (const assignment of assignments) {
    const cast = host.resolveExternalCast(assignment.castName);
    if (!cast?.resolved) {
      continue;
    }

    const manifest: DirectorCastLibManifest = {
      number: assignment.castLib,
      name: cast.name,
      fileName: `${cast.name}.cct`,
      members: cast.members.map((member: { readonly number: number; readonly type: string; readonly name?: string }) => {
        const sourceMember = sourceProjectorRaysExternalCastMember(host, cast.name, member.number);
        const asset = host.getBitmapAsset(cast.name, member.number);
        const fallbackColor = resolveKnownBitmapFallbackColor(member.name);
        return {
          ...memberManifestFromExternalCastSource(sourceMember),
          number: member.number,
          type: sourceMember?.type ?? toDirectorMemberType(member.type),
          ...(sourceMember?.name !== undefined
            ? { name: sourceMember.name }
            : member.name !== undefined
              ? { name: member.name }
              : {}),
          ...(asset !== undefined
            ? {
                width: asset.width,
                height: asset.height,
                regPoint: asset.regPoint,
                assetPath: asset.pngPath,
                ...(asset.inkAssetPaths !== undefined ? { inkAssetPaths: asset.inkAssetPaths } : {})
              }
            : fallbackColor !== undefined
              ? {
                  width: 1,
                  height: 1,
                  color: fallbackColor
                }
              : {})
        };
      })
    };
    host.movie.cast.importOrCreateCastLib(manifest);
    imported.push({
      castName: cast.name,
      castLib: assignment.castLib,
      memberCount: cast.memberCount
    });
  }

  if (imported.length > 0) {
    host.resourceManager.preIndexMembers();
    host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
  }

  return imported;
}

function sourceProjectorRaysExternalCastMember(
  host: HabboExternalCastRuntimeHost,
  castName: string,
  memberNumber: number
): DirectorMemberManifest | undefined {
  const versionId = typeof host.externalCastGraph?.versionId === "string" ? host.externalCastGraph.versionId : undefined;
  if (!versionId) {
    return undefined;
  }

  const normalizedCastName = normalizeCastName(castName);
  for (const manifest of getProjectorRaysManifestsByVersion(versionId)) {
    const cast = manifest.casts.find((candidate) => normalizeCastName(candidate.name ?? candidate.fileName?.replace(/\.[^.]+$/, "") ?? "") === normalizedCastName);
    const member = cast?.members.find((candidate) => candidate.number === memberNumber);
    if (member) {
      return member;
    }
  }

  return undefined;
}

function memberManifestFromExternalCastSource(sourceMember: DirectorMemberManifest | undefined): Partial<DirectorMemberManifest> {
  if (!sourceMember) {
    return {};
  }

  const {
    number: _number,
    type: _type,
    ...source
  } = sourceMember;
  return source;
}

export function assignDynamicCastSlotsRuntime(
  host: HabboExternalCastRuntimeHost,
  castList: readonly string[]
): readonly { readonly castName: string; readonly castLib: number }[] {
  const usedSlots = new Set<number>(
    [...host.loadedCastSlots.values()].filter((slot): slot is number => typeof slot === "number")
  );
  const availableSlots = host.getAvailableDynamicCastSlots().filter((slot: number) => !usedSlots.has(slot));
  let nextCreatedSlot = Math.max(
    0,
    ...host.movie.cast.castLibs.map((cast: { readonly number: number }) => cast.number),
    ...usedSlots
  ) + 1;
  const assignments: { castName: string; castLib: number }[] = [];

  for (const castName of castList) {
    const normalized = normalizeCastName(castName);
    const existing = host.loadedCastSlots.get(normalized);
    if (existing !== undefined) {
      assignments.push({ castName, castLib: existing });
      continue;
    }

    const castLib = availableSlots.shift() ?? nextCreatedSlot++;

    host.loadedCastSlots.set(normalized, castLib);
    assignments.push({ castName, castLib });
  }

  return assignments;
}

export function getAvailableDynamicCastSlotsRuntime(host: HabboExternalCastRuntimeHost): number[] {
  return host.movie.cast.castLibs
    .filter((cast: { readonly name?: string; readonly number: number }) => normalizeCastName(cast.name ?? "").startsWith("empty"))
    .map((cast: { readonly number: number }) => cast.number)
    .sort((left: number, right: number) => right - left);
}

export function resolveExternalCastRuntime(host: HabboExternalCastRuntimeHost, castName: string): HabboExternalCastEntry | undefined {
  const normalized = normalizeCastName(castName);
  return host.externalCastGraph?.casts.find((cast: HabboExternalCastEntry) => normalizeCastName(cast.name) === normalized);
}

export function getBitmapAssetRuntime(
  host: HabboExternalCastRuntimeHost,
  castName: string,
  member: number,
  paletteName?: string,
  preferredVersionId?: string
): HabboWindowBitmapAsset | undefined {
  const normalized = normalizeCastName(castName);
  const findAsset = (sourceId: string, assets: readonly HabboWindowBitmapAsset[] | undefined): HabboWindowBitmapAsset | undefined => {
    const candidates = host.getBitmapAssetCandidates(sourceId, assets, normalized, member);
    const orderedCandidates = preferredVersionId
      ? [
          ...candidates.filter((asset: HabboWindowBitmapAsset) => asset.versionId === preferredVersionId),
          ...candidates.filter((asset: HabboWindowBitmapAsset) => asset.versionId !== preferredVersionId)
        ]
      : candidates;
    if (paletteName) {
      const normalizedPalette = normalizePaletteName(paletteName);
      const paletteAsset = orderedCandidates.find((asset: HabboWindowBitmapAsset) => {
        return normalizePaletteName(asset.layoutPaletteName ?? asset.paletteName) === normalizedPalette;
      });
      if (paletteAsset) {
        return paletteAsset;
      }
    }

    return orderedCandidates[0];
  };

  const windowAsset = findAsset("window", host.windowBitmapAssetSet?.assets);
  if (windowAsset) {
    return windowAsset;
  }

  const visualAsset = findAsset("visual", host.visualBitmapAssetSet?.assets);
  if (visualAsset) {
    return visualAsset;
  }

  const buttonAsset = findAsset("button", host.buttonBitmapAssetSet?.assets);
  if (buttonAsset) {
    return buttonAsset;
  }

  return findAsset("external", host.externalBitmapAssetSet?.assets);
}

export function getBitmapAssetCandidatesRuntime(
  host: HabboExternalCastRuntimeHost,
  sourceId: string,
  assets: readonly HabboWindowBitmapAsset[] | undefined,
  normalizedCastName: string,
  member: number
): readonly HabboWindowBitmapAsset[] {
  if (!assets || assets.length === 0) {
    return [];
  }

  const cacheKey = `${sourceId}:${normalizedCastName}:${member}`;
  const cached = host.bitmapAssetLookupCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const candidates = assets.filter((asset) => normalizeCastName(asset.castName) === normalizedCastName && asset.member === member);
  host.bitmapAssetLookupCache.set(cacheKey, candidates);
  return candidates;
}

export function getBitmapAssetCandidatesByMemberNameRuntime(
  host: HabboExternalCastRuntimeHost,
  sourceId: string,
  assets: readonly HabboWindowBitmapAsset[] | undefined,
  normalizedMemberName: string
): readonly HabboWindowBitmapAsset[] {
  if (!assets || assets.length === 0) {
    return [];
  }

  const cacheKey = `${sourceId}:${normalizedMemberName}`;
  const cached = host.bitmapMemberNameLookupCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const candidates = assets.filter((asset) => {
    return typeof asset.memberName === "string" && normalizeMemberName(asset.memberName) === normalizedMemberName;
  });
  host.bitmapMemberNameLookupCache.set(cacheKey, candidates);
  return candidates;
}

export function getBitmapAssetByMemberNameRuntime(
  host: HabboExternalCastRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[] = ["hh_people_1", "hh_people_2"]
): HabboWindowBitmapAsset | undefined {
  const seen = new Set<string>();
  let current = stripMemberAliasSuffix(memberName);
  for (let depth = 0; depth < 8; depth++) {
    const normalized = normalizeMemberName(current);
    if (seen.has(normalized)) {
      return undefined;
    }
    seen.add(normalized);

    const direct = findExternalBitmapAssetByMemberNameRuntime(host, current, preferredCasts);
    if (direct) {
      return direct;
    }

    const alias = resolveMemberAliasRuntime(host, current, preferredCasts);
    if (!alias) {
      return undefined;
    }
    current = stripMemberAliasSuffix(alias);
  }

  return undefined;
}

export function findExternalBitmapAssetByMemberNameRuntime(
  host: HabboExternalCastRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[]
): HabboWindowBitmapAsset | undefined {
  const normalized = normalizeMemberName(stripMemberAliasSuffix(memberName));
  const assets = host.externalBitmapAssetSet?.assets ?? [];
  const candidates = getBitmapAssetCandidatesByMemberNameRuntime(host, "external", assets, normalized);
  for (const castName of preferredCasts) {
    const normalizedCastName = normalizeCastName(castName);
    const asset = candidates.find((candidate: HabboWindowBitmapAsset) => normalizeCastName(candidate.castName) === normalizedCastName);
    if (asset) {
      return asset;
    }
  }

  return candidates[0];
}

export function resolveMemberAliasRuntime(
  host: HabboExternalCastRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[] = []
): string | undefined {
  const normalized = normalizeMemberName(stripMemberAliasSuffix(memberName));
  const fields = (host.externalCastTextFieldSet?.fields ?? [])
    .filter((field: { readonly memberName: string; readonly castName: string }) => field.memberName.toLowerCase() === "memberalias.index")
    .filter((field: { readonly castName: string }) => host.castExists(field.castName));
  const preferredCastNames = new Set(preferredCasts.map((castName) => normalizeCastName(castName)));
  const orderedFields = [
    ...fields.filter((field: { readonly castName: string }) => preferredCastNames.has(normalizeCastName(field.castName))),
    ...fields.filter((field: { readonly castName: string }) => !preferredCastNames.has(normalizeCastName(field.castName)))
  ];

  for (const field of orderedFields) {
    const value = field.properties[normalized] ?? field.properties[memberName];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function getAnyBitmapAssetByMemberNameRuntime(
  host: HabboExternalCastRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[] = []
): HabboWindowBitmapAsset | undefined {
  const normalized = normalizeMemberName(memberName);
  const groups = [
    host.windowBitmapAssetSet?.assets ?? [],
    host.visualBitmapAssetSet?.assets ?? [],
    host.buttonBitmapAssetSet?.assets ?? [],
    host.externalBitmapAssetSet?.assets ?? []
  ];
  for (const castName of preferredCasts) {
    const normalizedCastName = normalizeCastName(castName);
    for (const [groupIndex, assets] of groups.entries()) {
      const candidates = getBitmapAssetCandidatesByMemberNameRuntime(host, `any-${groupIndex}`, assets, normalized);
      const asset = candidates.find((candidate: HabboWindowBitmapAsset) => normalizeCastName(candidate.castName) === normalizedCastName);
      if (asset) {
        return asset;
      }
    }
  }

  for (const [groupIndex, assets] of groups.entries()) {
    const candidates = getBitmapAssetCandidatesByMemberNameRuntime(host, `any-${groupIndex}`, assets, normalized);
    const first = candidates[0];
    if (first) {
      return first;
    }
  }

  return undefined;
}

export function resolveExternalBitmapMemberRefByNameRuntime(
  host: HabboExternalCastRuntimeHost,
  memberName: string,
  preferredCasts: readonly string[]
): DirectorMemberRef | undefined {
  const resourceMember = host.resourceManager.getMemberRef(memberName);
  if (resourceMember) {
    return resourceMember;
  }

  const asset = getBitmapAssetByMemberNameRuntime(host, memberName, preferredCasts);
  const castLib = asset ? host.loadedCastSlots.get(normalizeCastName(asset.castName)) : undefined;
  return asset && castLib !== undefined
    ? { castLib, member: asset.member }
    : undefined;
}

export function getTextRuntime(host: HabboExternalCastRuntimeHost, key: string): string | undefined {
  if (!key) {
    return undefined;
  }

  const exact = host.texts.get(key);
  if (exact !== undefined) {
    return exact;
  }

  const normalized = key.toLowerCase();
  for (const [candidateKey, value] of host.texts.entries()) {
    if (candidateKey.toLowerCase() === normalized) {
      return value;
    }
  }

  const compact = normalized.replace(/[_\s.-]/g, "");
  for (const [candidateKey, value] of host.texts.entries()) {
    if (candidateKey.toLowerCase().replace(/[_\s.-]/g, "") === compact) {
      return value;
    }
  }

  return undefined;
}

export function castExistsRuntime(host: HabboExternalCastRuntimeHost, castName: string): boolean {
  const normalized = normalizeCastName(castName);
  if (host.loadedCastNames.has(normalized) || host.loadedCastSlots.has(normalized)) {
    return true;
  }

  return host.movie.cast.castLibs.some((cast: { readonly name?: string; readonly fileName?: string }) => {
    const candidates = [cast.name, cast.fileName?.replace(/\.[^.]+$/, "")].filter((value): value is string => Boolean(value));
    return candidates.some((candidate) => normalizeCastName(candidate) === normalized);
  });
}

export function removeMemberByNameRuntime(host: HabboExternalCastRuntimeHost, memberName: string, release: string): void {
  const removedMembers = Array.isArray(host.movie.getProperty("removedMembers")) ? host.movie.getProperty("removedMembers") as string[] : [];
  host.movie.setProperty("removedMembers", [...removedMembers, memberName]);
  host.recordUnsupportedOnce("remove-member-not-implemented", {
    subsystem: "director",
    feature: "remove-member-not-implemented",
    detail: `${release} removeMember(${memberName}) is recorded, but dynamic member removal is not implemented yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
}

export function showLogoRuntime(host: HabboExternalCastRuntimeHost, release: string): boolean {
  const logo = host.resourceManager.getMemberRef("Logo");
  if (!logo) {
    host.movie.setProperty("logoVisible", false);
    host.movie.setProperty("logoOverlaySprites", []);
    host.syncDirectorOverlaySprites();
    return true;
  }

  const logoAsset = host.resolveLoaderLogoAsset();
  if (!logoAsset) {
    host.movie.setProperty("logoVisible", false);
    host.movie.setProperty("logoOverlaySprites", []);
    host.syncDirectorOverlaySprites();
    host.recordUnsupportedOnce("logo-bitmap-asset-not-extracted", {
      subsystem: "director",
      feature: "logo-bitmap-asset-not-extracted",
      detail: `${release} Core Thread Class found Logo, but no decoded Logo bitmap asset is available for rendering`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
    });
    return true;
  }

  const logoCastLib = host.getRuntimeLogoCastSlot();
  host.movie.cast.importOrCreateCastLib({
    number: logoCastLib,
    name: "runtime_loader_logo",
    fileName: "runtime-loader-logo",
    members: [
      {
        number: 1,
        name: "runtime.loader.logo",
        type: "bitmap",
        width: logoAsset.width,
        height: logoAsset.height,
        regPoint: logoAsset.regPoint,
        assetPath: logoAsset.assetPath,
        inkAssetPaths: logoAsset.inkAssetPaths
      }
    ]
  });
  host.resourceManager.preIndexMembers();
  host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);

  const logoSprite: DirectorSpriteChannelManifest = {
    channel: 9101,
    member: {
      castLib: logoCastLib,
      member: 1
    },
    loc: {
      x: Math.round(host.movie.stage.width / 2),
      y: Math.round((host.movie.stage.height / 2) - logoAsset.height)
    },
    width: logoAsset.width,
    height: logoAsset.height,
    ink: 36,
    blend: 60,
    visible: true
  };

  host.movie.setProperty("logoVisible", true);
  host.movie.setProperty("logoMemberRef", logo);
  host.movie.setProperty("logoRenderMemberRef", logoSprite.member);
  host.movie.setProperty("logoOverlaySprites", [logoSprite]);
  host.movie.setProperty("lastLogoRender", {
    release,
    source: logoAsset.source,
    sourceMemberRef: logo,
    renderMemberRef: logoSprite.member,
    assetPath: logoAsset.assetPath,
    width: logoAsset.width,
    height: logoAsset.height,
    regPoint: logoAsset.regPoint,
    loc: logoSprite.loc,
    ink: logoSprite.ink,
    blend: logoSprite.blend
  });
  host.syncDirectorOverlaySprites();
  host.logDebug("loader", "ok", `showLogo source=${logoAsset.source} ${logoAsset.width}x${logoAsset.height}`, {
    sourceMemberRef: logo,
    renderMemberRef: logoSprite.member,
    assetPath: logoAsset.assetPath
  });
  return true;
}

export function hideLogoRuntime(host: HabboExternalCastRuntimeHost, release: string): boolean {
  if (!host.movie.getProperty("logoVisible")) {
    return true;
  }

  host.movie.setProperty("logoVisible", false);
  host.movie.setProperty("logoOverlaySprites", []);
  host.movie.setProperty("lastLogoRelease", {
    release,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  host.syncDirectorOverlaySprites();
  host.logDebug("loader", "info", "hideLogo released loader logo overlay", { release });
  return true;
}

export function resolveLoaderLogoAssetRuntime(host: HabboExternalCastRuntimeHost): HabboResolvedLoaderLogoAsset | undefined {
  const override = readLoaderLogoOverride(host.movie.getProperty("loaderLogoOverride"));
  if (override) {
    return override;
  }

  const asset = host.internalBitmapAssetSet?.assets.find((candidate: { readonly castName: string; readonly memberName: string }) => {
    return normalizeCastName(candidate.castName) === "internal" && normalizeCastName(candidate.memberName) === "logo";
  });
  if (!asset) {
    return undefined;
  }

  return {
    source: "internal-cast",
    assetPath: asset.pngPath,
    width: asset.width,
    height: asset.height,
    regPoint: asset.regPoint,
    inkAssetPaths: asset.inkAssetPaths ?? {}
  };
}

export function getMoviePathRuntime(host: HabboExternalCastRuntimeHost): string {
  return String(host.movie.getProperty("moviePath") ?? "");
}

function readLoaderLogoOverride(value: unknown): HabboResolvedLoaderLogoAsset | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.assetPath !== "string" || record.assetPath.length === 0) {
    return undefined;
  }

  const width = typeof record.width === "number" && Number.isFinite(record.width) ? Math.max(1, Math.round(record.width)) : 1;
  const height = typeof record.height === "number" && Number.isFinite(record.height) ? Math.max(1, Math.round(record.height)) : 1;
  const regPointValue = typeof record.regPoint === "object" && record.regPoint !== null ? record.regPoint as Record<string, unknown> : undefined;
  const regPoint = {
    x: typeof regPointValue?.x === "number" && Number.isFinite(regPointValue.x) ? Math.round(regPointValue.x) : Math.floor(width / 2),
    y: typeof regPointValue?.y === "number" && Number.isFinite(regPointValue.y) ? Math.round(regPointValue.y) : Math.floor(height / 2)
  };

  return {
    source: "override",
    assetPath: record.assetPath,
    width,
    height,
    regPoint,
    inkAssetPaths: {
      "36": record.assetPath
    }
  };
}
