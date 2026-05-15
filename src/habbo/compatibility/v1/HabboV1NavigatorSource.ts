import type { DirectorMember, DirectorMemberType, DirectorMovie } from "../../../runtime";
import { directorPaletteIndexColor } from "../../HabboSourceValueHelpers";

export const popupContextSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/ParentScript 11 - PopUp Context Class.ls";
export const navigatorOpenSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/MovieScript 119 - Navigator Open.ls";
export const navigatorWindowSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 57 - NavigatorWindow_behavior.ls";
export const navigatorImageHandlersSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/MovieScript 56 - ImageHandlers.ls";
export const navigatorContextButtonSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 160 - Go To Frame Context Sensitive.ls";
export const busyFlatsSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 215 - busyflats.ls";
export const privateDropSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 47 - PrivateRoomDropListBehavior.ls";
export const popularFlatQuerySourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 187 - PopularFlatQuery.ls";
export const flatResultsSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 1 - Special Scripts.ls";
export const openFlatInfoSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 179 - Open Flat Info.ls";
export const privateRoomGoLinksSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 197 - PrivateRoomGoLinks.ls";
export const goFlatSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 180 - GoFlat.ls";
export const goToFlatWithNaviSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 1 - Special Scripts.ls";
export const connectionWaitEntryFlatSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/FuseScript/casts/External/BehaviorScript 23 - connectionWait entry flat.ls";
export const connectionWaitUnitsSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/FuseScript/casts/External/BehaviorScript 21 - connectionWait units.ls";
export const flatLoaderSourcePath =
  "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/MovieScript 136 - LoaderScript.ls";
export const allUnitsSourcePath =
  "tmp/reference-repos/habbo_src/release1/GoldFish/Cast External MovieScript 1 - Special Scripts.ls";
export const unitMembersSourcePath =
  "tmp/reference-repos/habbo_src/release1/GoldFish/Cast External MovieScript 1 - Special Scripts.ls";

export interface Release1PublicUnit {
  readonly name: string;
  readonly activeUsers: number;
  readonly maxUsers: number;
  readonly host: string;
  readonly port: number;
  readonly description: string;
  readonly otherRooms: readonly string[];
}

export interface Release1FlatResult {
  readonly id: number;
  readonly name: string;
  readonly owner: string;
  readonly doorMode: string;
  readonly host: string;
  readonly port: number;
  readonly usersNow: number;
  readonly filterFlag: string;
  readonly description: string;
  readonly raw: string;
}

interface RecordedBehavior {
  readonly name: string;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
}

export interface RecordedSprite {
  readonly channel: number;
  readonly member: {
    readonly castLib: number;
    readonly member: number;
  };
  readonly loc: {
    readonly x: number;
    readonly y: number;
  };
  readonly locZ: number;
  readonly ink: number;
  readonly fgColorRaw?: string;
  readonly fgColor?: string;
  readonly bgColorRaw?: string;
  readonly bgColor?: string;
  readonly blend: number;
  readonly width: number;
  readonly height: number;
  readonly behaviorNames: readonly string[];
  readonly behaviors: readonly RecordedBehavior[];
}

interface CastLibNameRef {
  readonly index: number;
  readonly name: string;
  readonly castLib: number;
  readonly memberDelta: number;
}

export interface Release1NavigatorTextRequest {
  readonly id: number;
  readonly command: "SEARCHBUSYFLATS" | "SEARCHFLAT" | "SEARCHFLATFORUSER" | "GETUNITUSERS" | "TRYFLAT" | "GOTOFLAT";
  readonly body: string;
  readonly status: "pending" | "sent";
  readonly source: string;
}

export interface Release1NavigatorInteractiveAction {
  readonly id: string;
  readonly event: "mouseDown" | "mouseUp";
  readonly kind?: "context" | "flatInfo" | "flatGo" | "selectedFlatGo";
  readonly targetFrame?: string;
  readonly requests: readonly Release1NavigatorTextRequest[];
  readonly source: readonly string[];
}

export interface RecordedNavigatorFrameOptions {
  readonly castName: string;
  readonly startChannel: number;
  readonly locZ: number;
  readonly place: {
    readonly x: number;
    readonly y: number;
  };
}

export function parseRecordedNavigatorFrame(
  movie: DirectorMovie,
  memberName: string,
  options: RecordedNavigatorFrameOptions
): readonly RecordedSprite[] {
  const recordedMember = movie.cast.getMemberByName(memberName, navigationCast(movie, options.castName)?.number);
  const text = recordedMember?.text;
  if (!text) {
    return [];
  }

  const lines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const castRefs: CastLibNameRef[] = [];
  let recordedCastIndex = 1;
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line = lines[lineIndex]?.trim() ?? "";
    lineIndex += 1;
    if (line === "*") {
      break;
    }
    if (line.length === 0) {
      continue;
    }
    const recordedCastName = normalizeRecordedCastName(line);
    const castLib = movie.cast.castLibs.find((candidate) => {
      return normalizeRecordedCastName(candidate.name ?? "") === recordedCastName
        || normalizeRecordedCastName(candidate.fileName ?? "") === recordedCastName;
    })?.number;
    if (castLib !== undefined) {
      castRefs.push({
        index: recordedCastIndex,
        name: line,
        castLib,
        memberDelta: 0
      });
    }
    recordedCastIndex += 1;
  }

  const memberDeltas = inferRecordedMemberDeltas(movie, castRefs, lines.slice(lineIndex));
  const sprites: RecordedSprite[] = [];
  let sourceSpriteIndex = 0;
  while (lineIndex < lines.length) {
    const spriteLine = lines[lineIndex]?.trim() ?? "";
    if (!spriteLine) {
      lineIndex += 1;
      continue;
    }
    const behaviorLine = lines[lineIndex + 1]?.trim() ?? "";
    lineIndex += 2;

    const items = spriteLine.split("/");
    if (items.length < 11) {
      continue;
    }

    const memberNumber = parseInteger(items[0]);
    const castIndex = parseInteger(items[1]);
    const castRef = castRefs.find((ref) => ref.index === castIndex);
    if (!memberNumber || !castRef) {
      continue;
    }
    const channel = options.startChannel + sourceSpriteIndex;
    sourceSpriteIndex += 1;
    const locZOffset = parseInteger(items[4]) ?? 0;
    const fgColorRaw = items[6]?.trim();
    const bgColorRaw = items[7]?.trim();
    const fgColor = parseDirectorColor(fgColorRaw);
    const bgColor = parseDirectorColor(bgColorRaw);
    const width = parseInteger(items[9]) ?? 1;
    const height = parseInteger(items[10]) ?? 1;
    const behaviors = behaviorEntriesForRecordedLine(movie, castRefs, memberDeltas, behaviorLine);
    const resolvedMemberNumber = resolveRecordedSpriteMemberNumber(
      movie,
      castRef.castLib,
      memberNumber,
      memberDeltas.get(castRef.index) ?? 0,
      width,
      height,
      behaviors
    );
    if (resolvedMemberNumber === undefined) {
      continue;
    }

    sprites.push({
      channel,
      member: {
        castLib: castRef.castLib,
        member: resolvedMemberNumber
      },
      loc: {
        x: (parseInteger(items[2]) ?? 0) + options.place.x,
        y: (parseInteger(items[3]) ?? 0) + options.place.y
      },
      locZ: options.locZ + locZOffset,
      ink: parseInteger(items[5]) ?? 0,
      ...(fgColorRaw ? { fgColorRaw } : {}),
      ...(fgColor ? { fgColor } : {}),
      ...(bgColorRaw ? { bgColorRaw } : {}),
      ...(bgColor ? { bgColor } : {}),
      blend: parseInteger(items[8]) ?? 100,
      width,
      height,
      behaviorNames: behaviors.map((behavior) => behavior.name),
      behaviors
    });
  }

  return sprites;
}

export function parseRelease1AllUnits(body: string): Release1PublicUnit[] {
  const lines = body.replace(/^\r?\n/, "").split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  const units: Release1PublicUnit[] = [];
  for (const line of lines) {
    if (line.includes("Floor1")) {
      continue;
    }

    const [first, ...otherRooms] = line.split("\t");
    if (!first || first.length <= 5) {
      continue;
    }

    const parts = first.split(",");
    const [name, activeUsers, maxUsers, host, port, description] = parts;
    if (!name) {
      continue;
    }

    units.push({
      name,
      activeUsers: Number.parseInt(activeUsers ?? "0", 10) || 0,
      maxUsers: Number.parseInt(maxUsers ?? "0", 10) || 0,
      host: host ?? "",
      port: Number.parseInt(port ?? "0", 10) || 0,
      description: description ?? "",
      otherRooms
    });
  }
  return units;
}

export function isRelease1PublicUnit(value: unknown): value is Release1PublicUnit {
  const record = readRecord(value);
  return typeof record?.name === "string"
    && typeof record.activeUsers === "number"
    && typeof record.maxUsers === "number"
    && typeof record.host === "string"
    && typeof record.port === "number"
    && typeof record.description === "string"
    && Array.isArray(record.otherRooms);
}

export function parseRelease1FlatResults(body: string): Release1FlatResult[] {
  const lines = body.replace(/^\s+/, "").split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  const flatLines = lines[0]?.trim().match(/^\d+$/) ? lines.slice(1) : lines;
  const flats: Release1FlatResult[] = [];
  for (const line of flatLines) {
    const items = line.split("/");
    const id = parseInteger(items[0]);
    const name = items[1] ?? "";
    if (!id || !name) {
      continue;
    }

    flats.push({
      id,
      name,
      owner: items[2] ?? "",
      doorMode: items[3] ?? "",
      host: items[7] ?? items[6] ?? "",
      port: Number.parseInt(items[8] ?? "0", 10) || 0,
      usersNow: Number.parseInt(items[9] ?? "0", 10) || 0,
      filterFlag: items[10] ?? "",
      description: items.slice(11).join("/"),
      raw: line
    });
  }
  return flats;
}

export function isRelease1FlatResult(value: unknown): value is Release1FlatResult {
  const record = readRecord(value);
  return typeof record?.id === "number"
    && typeof record.name === "string"
    && typeof record.owner === "string"
    && typeof record.doorMode === "string"
    && typeof record.host === "string"
    && typeof record.port === "number"
    && typeof record.usersNow === "number"
    && typeof record.filterFlag === "string"
    && typeof record.description === "string"
    && typeof record.raw === "string";
}

export function flatResultDescriptionKey(resultType: "busy" | "favorite" | "search"): string {
  if (resultType === "busy") {
    return "MostPopularRooms";
  }
  return resultType === "favorite" ? "FavoriteRooms" : "SearchResults";
}

export function flatResultDescriptionFallback(resultType: "busy" | "favorite" | "search"): string {
  if (resultType === "busy") {
    return "Favourite rooms";
  }
  return resultType === "favorite" ? "Favorite rooms" : "Search results";
}

export function doorStatusGlyph(doorMode: string): string {
  if (doorMode === "open") {
    return "";
  }
  return doorMode === "password" ? String.fromCharCode(204) : String.fromCharCode(145);
}

export function release1FieldText(movie: DirectorMovie, key: string, fallback: string): string {
  const text = release1TextFieldValue(movie, "FieldTexts", key);
  return text ?? fallback;
}

export function release1TextFieldValue(movie: DirectorMovie, memberName: string, key: string): string | undefined {
  const fieldTexts = movie.cast.getMemberByName(memberName)?.text;
  if (!fieldTexts) {
    return undefined;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\r|\\n)${escapedKey}\\s*=\\s*"([^"]*)"`, "i").exec(fieldTexts);
  return match?.[1];
}

export function stringBehaviorProperty(sprite: RecordedSprite, behaviorName: string, propertyName: string): string | undefined {
  const behavior = sprite.behaviors.find((entry) => entry.name === behaviorName);
  const value = behavior?.properties[propertyName];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function sanitizeElementId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "context";
}

export function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function behaviorEntriesForRecordedLine(
  movie: DirectorMovie,
  castRefs: readonly CastLibNameRef[],
  memberDeltas: ReadonlyMap<number, number>,
  behaviorLine: string
): readonly RecordedBehavior[] {
  if (!behaviorLine) {
    return [];
  }

  const entries: RecordedBehavior[] = [];
  for (const behavior of behaviorLine.split("&")) {
    const items = behavior.split("/");
    const memberNumber = parseInteger(items[0]);
    const castIndex = parseInteger(items[1]);
    const castRef = castRefs.find((ref) => ref.index === castIndex);
    if (!memberNumber || !castRef) {
      continue;
    }
    const member = movie.cast.getMember({
      castLib: castRef.castLib,
      member: resolveRecordedMemberNumber(memberNumber, memberDeltas.get(castRef.index) ?? 0)
    });
    if (member?.name) {
      entries.push({
        name: member.name,
        properties: parseBehaviorProperties(items.slice(2).join("/"))
      });
    }
  }
  return entries;
}

function inferRecordedMemberDeltas(
  movie: DirectorMovie,
  castRefs: readonly CastLibNameRef[],
  spriteAndBehaviorLines: readonly string[]
): ReadonlyMap<number, number> {
  const behaviorRefsByCast = new Map<number, number[]>();
  let lineIndex = 0;
  while (lineIndex < spriteAndBehaviorLines.length) {
    const spriteLine = spriteAndBehaviorLines[lineIndex]?.trim() ?? "";
    if (!spriteLine) {
      lineIndex += 1;
      continue;
    }
    const behaviorLine = spriteAndBehaviorLines[lineIndex + 1]?.trim() ?? "";
    lineIndex += 2;
    if (!behaviorLine) {
      continue;
    }
    for (const behavior of behaviorLine.split("&")) {
      const items = behavior.split("/");
      const memberNumber = parseInteger(items[0]);
      const castIndex = parseInteger(items[1]);
      if (!memberNumber || !castIndex) {
        continue;
      }
      const refs = behaviorRefsByCast.get(castIndex) ?? [];
      refs.push(memberNumber);
      behaviorRefsByCast.set(castIndex, refs);
    }
  }

  const result = new Map<number, number>();
  for (const castRef of castRefs) {
    const memberNumbers = behaviorRefsByCast.get(castRef.index);
    if (!memberNumbers?.length) {
      continue;
    }

    const delta = inferRecordedMemberDeltaForCast(movie, castRef.castLib, memberNumbers);
    if (delta !== 0) {
      result.set(castRef.index, delta);
    }
  }
  return result;
}

function inferRecordedMemberDeltaForCast(movie: DirectorMovie, castLib: number, recordedMembers: readonly number[]): number {
  const uniqueMembers = [...new Set(recordedMembers)];
  const candidateDeltas = new Set<number>([0]);
  for (const recordedMember of uniqueMembers) {
    for (let delta = -30; delta <= 30; delta += 1) {
      const member = movie.cast.getMember({ castLib, member: resolveRecordedMemberNumber(recordedMember, delta) });
      if (member?.type === "script") {
        candidateDeltas.add(delta);
      }
    }
  }

  let bestDelta = 0;
  let bestScore = scoreRecordedMemberDelta(movie, castLib, uniqueMembers, 0);
  for (const delta of candidateDeltas) {
    if (delta === 0) {
      continue;
    }
    const score = scoreRecordedMemberDelta(movie, castLib, uniqueMembers, delta);
    if (score > bestScore) {
      bestScore = score;
      bestDelta = delta;
    }
  }
  return bestDelta;
}

function scoreRecordedMemberDelta(movie: DirectorMovie, castLib: number, recordedMembers: readonly number[], delta: number): number {
  let score = 0;
  for (const recordedMember of recordedMembers) {
    const member = movie.cast.getMember({ castLib, member: resolveRecordedMemberNumber(recordedMember, delta) });
    if (member?.type === "script") {
      score += 1;
    }
  }
  return score;
}

function resolveRecordedMemberNumber(recordedMember: number, delta: number): number {
  const resolved = recordedMember - delta;
  return resolved > 0 ? resolved : recordedMember;
}

function resolveRecordedSpriteMemberNumber(
  movie: DirectorMovie,
  castLib: number,
  recordedMember: number,
  delta: number,
  requestedWidth: number,
  requestedHeight: number,
  behaviors: readonly RecordedBehavior[]
): number | undefined {
  const resolvedMember = resolveRecordedMemberNumber(recordedMember, delta);
  if (delta === 0 || resolvedMember === recordedMember || behaviors.length > 0) {
    return resolvedMember;
  }

  const rawMember = movie.cast.getMember({ castLib, member: recordedMember });
  const shiftedMember = movie.cast.getMember({ castLib, member: resolvedMember });
  if (
    isSuspiciousRecordedBitmapSubstitution(shiftedMember, requestedWidth, requestedHeight)
    && (!rawMember || !isRecordedBitmapSpriteMemberType(rawMember.type))
  ) {
    return undefined;
  }

  return resolvedMember;
}

function isRecordedBitmapSpriteMemberType(type: DirectorMemberType): boolean {
  return type === "bitmap" || type === "shape";
}

function isSuspiciousRecordedBitmapSubstitution(
  member: DirectorMember | undefined,
  requestedWidth: number,
  requestedHeight: number
): boolean {
  if (member?.type !== "bitmap") {
    return false;
  }

  const memberWidth = member.width ?? 0;
  const memberHeight = member.height ?? 0;
  const requestedArea = Math.max(1, requestedWidth * requestedHeight);
  const memberArea = Math.max(0, memberWidth * memberHeight);
  return requestedArea >= 3000 && memberArea * 8 < requestedArea;
}

function parseBehaviorProperties(text: string): Readonly<Record<string, string | number | boolean>> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return {};
  }

  const result: Record<string, string | number | boolean> = {};
  const body = trimmed.slice(1, -1);
  const pattern = /#([A-Za-z0-9_]+)\s*:\s*("(?:[^"]*)"|#[A-Za-z0-9_]+|-?\d+(?:\.\d+)?|TRUE|FALSE|VOID|EMPTY)/gi;
  for (const match of body.matchAll(pattern)) {
    const key = match[1];
    const rawValue = match[2];
    if (!key || !rawValue) {
      continue;
    }
    result[key] = parseBehaviorPropertyValue(rawValue);
  }
  return result;
}

function parseBehaviorPropertyValue(rawValue: string): string | number | boolean {
  if (rawValue.startsWith("\"") && rawValue.endsWith("\"")) {
    return rawValue.slice(1, -1);
  }

  const upper = rawValue.toUpperCase();
  if (upper === "TRUE") {
    return true;
  }
  if (upper === "FALSE") {
    return false;
  }
  if (upper === "VOID" || upper === "EMPTY") {
    return "";
  }
  if (rawValue.startsWith("#")) {
    return rawValue.slice(1);
  }

  const numberValue = Number(rawValue);
  return Number.isFinite(numberValue) ? numberValue : rawValue;
}

function navigationCast(movie: DirectorMovie, castName: string) {
  const normalized = normalizeRecordedCastName(castName);
  return movie.cast.castLibs.find((castLib) => {
    return normalizeRecordedCastName(castLib.name ?? "") === normalized
      || normalizeRecordedCastName(castLib.fileName ?? "") === normalized;
  });
}

function normalizeRecordedCastName(value: string): string {
  return value
    .replace(/\.(cct|cst|dcr|dir|dxr)$/i, "")
    .trim()
    .toLowerCase();
}

function parseDirectorColor(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(trimmed);
  if (rgbMatch) {
    return rgbToHex(
      Number.parseInt(rgbMatch[1] ?? "0", 10),
      Number.parseInt(rgbMatch[2] ?? "0", 10),
      Number.parseInt(rgbMatch[3] ?? "0", 10)
    );
  }

  const commaRgbMatch = /^(\d+),\s*(\d+),\s*(\d+)$/.exec(trimmed);
  if (commaRgbMatch) {
    return rgbToHex(
      Number.parseInt(commaRgbMatch[1] ?? "0", 10),
      Number.parseInt(commaRgbMatch[2] ?? "0", 10),
      Number.parseInt(commaRgbMatch[3] ?? "0", 10)
    );
  }

  const paletteIndexMatch = /^\d+$/.exec(trimmed);
  if (paletteIndexMatch) {
    return directorPaletteIndexColor(Number.parseInt(trimmed, 10));
  }

  return undefined;
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((component) => Math.max(0, Math.min(255, component)).toString(16).padStart(2, "0")).join("")}`;
}

function parseInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
