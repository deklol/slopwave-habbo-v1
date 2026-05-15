import type { DirectorMovie } from "../../../runtime";
import defaultRelease1Policy from "./config/release1.json";
import type {
  HabboFigureAvailabilityIncludeMode,
  HabboFigureAvailabilityPartPolicy,
  HabboFigureAvailabilityPolicy
} from "./HabboFigureAvailabilityTypes";

const release1PolicyProperty = "habboFigureAvailability.release1";
const release1PolicyOverrideSourceProperty = "habboFigureAvailability.release1.source";
const release1SourcePath = "docs/FIGURE_AVAILABILITY_RUNTIME_PLAN.md";

interface ParsedSpecLine {
  readonly partNums: readonly string[];
  readonly colors: readonly string[];
}

export function installDefaultHabboFigureAvailabilityPolicy(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1(release)) {
    return false;
  }

  if (movie.getProperty(release1PolicyProperty) === undefined) {
    movie.setProperty(release1PolicyProperty, normalizePolicy(defaultRelease1Policy));
    movie.setProperty(release1PolicyOverrideSourceProperty, "src/habbo/features/figure/config/release1.json");
  }
  return true;
}

export async function loadHabboFigureAvailabilityPolicyOverride(
  movie: DirectorMovie,
  release: string,
  fetchPolicy: typeof fetch = fetch
): Promise<boolean> {
  if (!isRelease1(release)) {
    return false;
  }

  try {
    const response = await fetchPolicy("/habbo-config/figure-availability/release1.json", { cache: "no-store" });
    if (!response.ok) {
      return false;
    }

    const policy = normalizePolicy(await response.json());
    if (!policy) {
      recordPolicyWarning(movie, "release1:public-policy-invalid");
      return false;
    }

    movie.setProperty(release1PolicyProperty, policy);
    movie.setProperty(release1PolicyOverrideSourceProperty, "public/habbo-config/figure-availability/release1.json");
    movie.debugLog.add("login", "info", "release1 figure availability policy loaded");
    return true;
  } catch {
    return false;
  }
}

export function getRelease1FigureSpecLines(
  movie: DirectorMovie,
  release: string,
  myField: string,
  sex: "female" | "male",
  myParts: readonly string[],
  sourceLines: readonly string[]
): readonly string[] {
  const policy = readRelease1Policy(movie, release);
  if (!policy || policy.mode === "source") {
    return sourceLines;
  }

  const field = myField.toLowerCase();
  const groupParts = myParts.length > 0 ? myParts.map((part) => part.toLowerCase()) : [field];
  const partPolicy = policy.parts?.[field];
  const sourceFallback = policy.sourceFallback !== false;
  let lines = sourceLines.length > 0 || !sourceFallback ? [...sourceLines] : readSourceSpecLines(movie, field, sex);

  if (policy.genderPolicy === "merged") {
    lines = mergeUniqueLines([
      ...lines,
      ...readSourceSpecLines(movie, field, sex === "male" ? "female" : "male")
    ]);
  }

  const includeMode = partPolicy?.include ?? (policy.mode === "expanded" ? "allValidated" : "source");
  if (includeMode !== "source") {
    lines = expandWithValidatedAssets(movie, lines, groupParts, includeMode, field, partPolicy?.tupleMode ?? "sourceBase");
  }

  return applyPolicyColors(lines, policy, partPolicy);
}

function readRelease1Policy(movie: DirectorMovie, release: string): HabboFigureAvailabilityPolicy | undefined {
  if (!isRelease1(release)) {
    return undefined;
  }

  return normalizePolicy(movie.getProperty(release1PolicyProperty)) ?? normalizePolicy(defaultRelease1Policy);
}

function expandWithValidatedAssets(
  movie: DirectorMovie,
  lines: readonly string[],
  groupParts: readonly string[],
  include: HabboFigureAvailabilityIncludeMode,
  field: string,
  tupleMode: "sourceBase" | "synchronized" | "sourceBaseAndSynchronized"
): string[] {
  const parsed = lines.map(parseSpecLine);
  const partIdsByIndex = new Map<number, Set<string>>();
  for (const line of parsed) {
    line.partNums.forEach((id, index) => {
      if (!partIdsByIndex.has(index)) {
        partIdsByIndex.set(index, new Set<string>());
      }
      partIdsByIndex.get(index)?.add(normalizePartId(id));
    });
  }

  const result = [...lines];
  const seen = new Set(result.map((line) => canonicalPartsKey(parseSpecLine(line).partNums)));
  const baseTuple = parsed.find((line) => line.partNums.length === groupParts.length)?.partNums
    ?? groupParts.map((part) => firstValidatedPartId(movie, part) ?? "1");
  const baseColors = parsed[0]?.colors ?? ["255,255,255"];

  if (tupleMode === "synchronized" && groupParts.length > 1) {
    const synchronizedIds = groupParts
      .map((part) => collectValidatedPartIds(movie, part))
      .reduce((shared, ids) => shared.filter((id) => ids.includes(id)));
    for (const id of synchronizedIds) {
      const tuple = groupParts.map(() => id);
      const key = canonicalPartsKey(tuple);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(formatSpecLine({ partNums: tuple, colors: baseColors }));
      }
    }
    return result;
  }

  if (tupleMode === "sourceBaseAndSynchronized" && groupParts.length > 1) {
    const fieldIndex = Math.max(0, groupParts.findIndex((part) => part === field));
    const fieldPart = groupParts[fieldIndex] ?? field;
    const fieldIds = include === "allValidated"
      ? collectValidatedPartIds(movie, fieldPart)
      : Array.isArray(include)
        ? validateExplicitPartIds(movie, field, fieldPart, include)
        : [];
    for (const id of fieldIds) {
      const tuple = groupParts.every((part) => hasStandardPartMember(movie, part, id))
        ? groupParts.map(() => id)
        : sourceBaseTuple(baseTuple, fieldIndex, id);
      if (!tuple.every((candidate, tupleIndex) => hasStandardPartMember(movie, groupParts[tupleIndex] ?? fieldPart, candidate))) {
        continue;
      }

      const key = canonicalPartsKey(tuple);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(formatSpecLine({ partNums: tuple, colors: baseColors }));
      }
    }
    return result;
  }

  groupParts.forEach((part, index) => {
    const validated = include === "allValidated"
      ? collectValidatedPartIds(movie, part)
      : Array.isArray(include)
        ? validateExplicitPartIds(movie, field, part, include)
        : [];
    const sourceIds = partIdsByIndex.get(index) ?? new Set<string>();
    for (const id of validated) {
      if (sourceIds.has(id)) {
        continue;
      }

      const tuple = [...baseTuple];
      tuple[index] = id;
      if (!tuple.every((candidate, tupleIndex) => hasStandardPartMember(movie, groupParts[tupleIndex] ?? part, candidate))) {
        continue;
      }

      const key = canonicalPartsKey(tuple);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(formatSpecLine({ partNums: tuple, colors: baseColors }));
      }
    }
  });

  return result;
}

function sourceBaseTuple(baseTuple: readonly string[], index: number, id: string): string[] {
  const tuple = [...baseTuple];
  tuple[index] = id;
  return tuple;
}

function applyPolicyColors(
  lines: readonly string[],
  policy: HabboFigureAvailabilityPolicy,
  partPolicy: HabboFigureAvailabilityPartPolicy | undefined
): readonly string[] {
  const colorMode = partPolicy?.colors ?? "source";
  if (colorMode === "source") {
    return lines;
  }

  if (Array.isArray(colorMode)) {
    return lines.map((line) => {
      const parsed = parseSpecLine(line);
      return formatSpecLine({ partNums: parsed.partNums, colors: mergeUniqueStrings([...parsed.colors, ...colorMode]) });
    });
  }

  const colorGroups = partPolicy?.customColorGroups ?? [];
  const customColors = mergeUniqueStrings(colorGroups.flatMap((group) => policy.customColors?.[group] ?? []));
  if (customColors.length === 0) {
    return lines;
  }

  return lines.map((line) => {
    const parsed = parseSpecLine(line);
    return formatSpecLine({ partNums: parsed.partNums, colors: mergeUniqueStrings([...parsed.colors, ...customColors]) });
  });
}

function collectValidatedPartIds(movie: DirectorMovie, part: string): string[] {
  const ids = new Set<string>();
  const pattern = new RegExp(`^h_std_${escapeRegExp(part)}_(\\d{3})_2_0$`, "i");
  for (const castLib of movie.cast.castLibs) {
    for (const member of castLib.members) {
      const name = member.name;
      if (!name) {
        continue;
      }

      const match = pattern.exec(name);
      if (match?.[1] && isRenderableFigurePartMember(member)) {
        ids.add(normalizePartId(match[1]));
      }
    }
  }

  return sortPartIds([...ids]);
}

function validateExplicitPartIds(
  movie: DirectorMovie,
  field: string,
  part: string,
  include: readonly string[]
): string[] {
  const result: string[] = [];
  for (const id of include.map(normalizePartId)) {
    if (hasStandardPartMember(movie, part, id)) {
      result.push(id);
    } else {
      recordPolicyWarning(movie, `release1:${field}:${part}:${id}`);
    }
  }
  return mergeUniqueStrings(result);
}

function firstValidatedPartId(movie: DirectorMovie, part: string): string | undefined {
  return collectValidatedPartIds(movie, part)[0];
}

function hasStandardPartMember(movie: DirectorMovie, part: string, id: string): boolean {
  const member = movie.cast.getMemberByName(`h_std_${part}_${padPartId(id)}_2_0`);
  return member !== undefined && isRenderableFigurePartMember(member);
}

function isRenderableFigurePartMember(member: {
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly assetPath?: string | undefined;
}): boolean {
  return typeof member.assetPath === "string"
    && member.assetPath.length > 0
    && typeof member.width === "number"
    && member.width > 0
    && typeof member.height === "number"
    && member.height > 0;
}

function readSourceSpecLines(movie: DirectorMovie, field: string, sex: "female" | "male"): string[] {
  const member = movie.cast.getMemberByName(`${field}_specs_${sex}`);
  return member?.text?.split(/\r\n|\r|\n/).filter((line) => line.length > 0) ?? [];
}

function parseSpecLine(line: string): ParsedSpecLine {
  const [parts = "", colorText = ""] = line.split("/", 2);
  const partNums = parts.split(",").map(normalizePartId).filter((part) => part.length > 0);
  const colors = colorText.length > 0
    ? colorText.split("&").map((color) => color.trim()).filter((color) => color.length > 0)
    : ["255,255,255"];
  return {
    partNums: partNums.length > 0 ? partNums : ["1"],
    colors: colors.length > 0 ? colors : ["255,255,255"]
  };
}

function formatSpecLine(line: ParsedSpecLine): string {
  return `${line.partNums.join(",")}/${line.colors.join("&")}`;
}

function normalizePolicy(value: unknown): HabboFigureAvailabilityPolicy | undefined {
  if (!isRecord(value) || typeof value.version !== "string") {
    return undefined;
  }

  return value as unknown as HabboFigureAvailabilityPolicy;
}

function normalizePartId(value: string): string {
  const trimmed = value.trim();
  const numeric = Number.parseInt(trimmed, 10);
  return Number.isFinite(numeric) ? String(numeric) : trimmed;
}

function padPartId(id: string): string {
  return normalizePartId(id).padStart(3, "0").slice(-3);
}

function canonicalPartsKey(parts: readonly string[]): string {
  return parts.map(normalizePartId).join(",");
}

function mergeUniqueLines(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (key.length > 0 && !seen.has(key)) {
      seen.add(key);
      result.push(line);
    }
  }
  return result;
}

function mergeUniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

function sortPartIds(ids: readonly string[]): string[] {
  return [...ids].sort((left, right) => {
    const leftNumber = Number.parseInt(left, 10);
    const rightNumber = Number.parseInt(right, 10);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
    return left.localeCompare(right);
  });
}

function recordPolicyWarning(movie: DirectorMovie, key: string): void {
  const existing = movie.getProperty("habboFigureAvailabilityWarnings");
  const warnings = Array.isArray(existing) ? existing.filter((item): item is string => typeof item === "string") : [];
  if (warnings.includes(key)) {
    return;
  }

  movie.setProperty("habboFigureAvailabilityWarnings", [...warnings, key]);
  movie.unsupported.add({
    subsystem: "habbo",
    feature: "figure-availability-policy-entry-invalid",
    detail: `Release1 figure availability ignored policy entry ${key} because no extracted avatar bitmap member validates it`,
    source: release1SourcePath
  });
}

function isRelease1(release: string): boolean {
  return release === "release1" || release.startsWith("release1_roseau_dcr0910");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
