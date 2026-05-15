import type { DirectorMemberRef, DirectorSpriteChannelManifest } from "../../runtime";
import type { HabboRoomCoordinate } from "./HabboRoomGeometry";
import type { HabboRoomObjectRecord } from "./HabboRoomObjectData";
import { normalizeWallItemDirection } from "./HabboRoomObjectData";
import type { HabboRoomSelectableObjectKind } from "./HabboRoomSelection";

export interface HabboRoomObjectSpritePlan {
  readonly object: HabboRoomObjectRecord;
  readonly memberRef: DirectorMemberRef;
  readonly memberName: string;
  readonly part?: string;
  readonly screen: HabboRoomCoordinate;
  readonly locZ: number;
  readonly ink: number;
  readonly blend: number;
  readonly zSort: number;
  readonly tint?: string;
  readonly locZAdjust?: number;
  readonly preferredCasts?: readonly string[];
  readonly visible?: boolean;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
}

export interface HabboRoomObjectSpriteEntry {
  readonly channel: number;
  readonly id: string;
  readonly kind: HabboRoomSelectableObjectKind;
  readonly className: string;
  readonly part?: string;
  readonly memberName: string;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
}

export interface HabboRoomObjectAnimationPreloadCandidate {
  readonly object: HabboRoomObjectRecord;
  readonly sourceClassValue: string | undefined;
  readonly ticks: readonly number[];
}

export function isWallPlacementSpritePlan(plan: HabboRoomObjectSpritePlan): boolean {
  return isWallPlacementMemberName(plan.object.className, plan.memberName);
}

export function isWallPlacementSpriteEntry(entry: HabboRoomObjectSpriteEntry): boolean {
  return isWallPlacementMemberName(entry.className, entry.memberName);
}

export function resolveWallPlacementPlanDirection(
  plan: HabboRoomObjectSpritePlan,
  rect: { readonly left: number; readonly right: number },
  localX: number
): "leftwall" | "rightwall" | undefined {
  const memberName = normalizeMemberName(plan.memberName);
  const className = normalizeMemberName(plan.object.className);
  if (memberName.startsWith("right_") || className.startsWith("right_")) {
    return "rightwall";
  }
  if (memberName.startsWith("left_") || className.startsWith("left_")) {
    return "leftwall";
  }

  const direction = Array.isArray(plan.object.direction)
    ? Number(plan.object.direction[0] ?? 0)
    : Number.NaN;
  if (direction === 2) {
    return "rightwall";
  }
  if (direction === 0) {
    return "leftwall";
  }
  if (direction === 1 || direction === 3) {
    return localX < ((rect.left + rect.right) / 2) ? "rightwall" : "leftwall";
  }

  return normalizeWallItemDirection(plan.object.direction);
}

export function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeCastName(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

export function dynamicFurnitureAssetIdFromClassName(className: string): string {
  const trimmed = className.trim();
  if (!trimmed) {
    return "";
  }

  const marker = trimmed.indexOf("*");
  return marker >= 0 ? trimmed.slice(0, marker).trim() : trimmed;
}

export function roomObjectAnimationPreloadCandidateSortKey(candidate: HabboRoomObjectAnimationPreloadCandidate): string {
  return [
    candidate.object.kind,
    candidate.object.id,
    candidate.object.className,
    candidate.sourceClassValue ?? ""
  ].join("\u0000");
}

export function roomObjectAnimationPreloadInputSignature(
  candidates: readonly HabboRoomObjectAnimationPreloadCandidate[],
  roomData: Readonly<Record<string, string | number>>
): string {
  return JSON.stringify({
    room: [
      roomData.id ?? "",
      roomData.type ?? "",
      roomData.model ?? "",
      roomData.cast ?? "",
      roomData.factorx ?? "",
      roomData.factory ?? "",
      roomData.xoffset ?? "",
      roomData.yoffset ?? ""
    ],
    objects: candidates.map((candidate) => [
      candidate.object.id,
      candidate.object.className,
      candidate.object.kind,
      candidate.object.x ?? "",
      candidate.object.y ?? "",
      candidate.object.h ?? "",
      candidate.object.z ?? "",
      candidate.object.altitude ?? "",
      roomObjectPreloadDirectionSignature(candidate.object.direction),
      roomObjectPreloadDimensionsSignature(candidate.object.dimensions),
      candidate.object.colors ?? "",
      candidate.object.itemType ?? "",
      roomObjectPreloadPropsSignature(candidate.object.props),
      candidate.sourceClassValue ?? "",
      candidate.ticks
    ])
  });
}

export function roomObjectOverlayKey(kind: HabboRoomSelectableObjectKind, id: string): string {
  return `${kind}:${id}`;
}

export function roomObjectOverlayPartKey(
  kind: HabboRoomSelectableObjectKind,
  id: string,
  part: string | undefined,
  memberName: string
): string {
  return `${roomObjectOverlayKey(kind, id)}:${part ?? memberName}`;
}

export function readRoomObjectSpriteEntries(value: unknown): HabboRoomObjectSpriteEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboRoomObjectSpriteEntry => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const objectEntry = entry as HabboRoomObjectSpriteEntry;
    return typeof objectEntry.channel === "number"
      && typeof objectEntry.id === "string"
      && (objectEntry.kind === "active" || objectEntry.kind === "passive" || objectEntry.kind === "item")
      && typeof objectEntry.className === "string"
      && (objectEntry.part === undefined || typeof objectEntry.part === "string")
      && typeof objectEntry.memberName === "string"
      && (objectEntry.flipH === undefined || typeof objectEntry.flipH === "boolean")
      && (objectEntry.flipV === undefined || typeof objectEntry.flipV === "boolean");
  });
}

export function readSpriteManifestArray(value: unknown): DirectorSpriteChannelManifest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is DirectorSpriteChannelManifest => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const sprite = entry as DirectorSpriteChannelManifest;
    return typeof sprite.channel === "number"
      && typeof sprite.member?.castLib === "number"
      && typeof sprite.member?.member === "number"
      && typeof sprite.loc?.x === "number"
      && typeof sprite.loc?.y === "number";
  });
}

export function dedupeSpritePreloadManifests(sprites: readonly DirectorSpriteChannelManifest[]): DirectorSpriteChannelManifest[] {
  const seen = new Set<string>();
  const deduped: DirectorSpriteChannelManifest[] = [];
  for (const sprite of sprites) {
    const key = JSON.stringify([
      sprite.member.castLib,
      sprite.member.member,
      sprite.ink ?? 0,
      sprite.blend ?? 100,
      sprite.bgColor ?? "",
      sprite.flipH === true ? 1 : 0,
      sprite.flipV === true ? 1 : 0,
      sprite.width ?? "",
      sprite.height ?? ""
    ]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push({
      ...sprite,
      channel: deduped.length + 1
    });
  }
  return deduped;
}

export function capitalizeRoomObjectKind(kind: HabboRoomSelectableObjectKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function isWallPlacementMemberName(className: string, memberName: string): boolean {
  const normalizedMemberName = normalizeMemberName(memberName);
  const normalizedClassName = normalizeMemberName(className);
  return normalizedMemberName.includes("wall") || normalizedClassName.includes("wall");
}

function roomObjectPreloadDirectionSignature(direction: HabboRoomObjectRecord["direction"]): readonly number[] | string {
  return Array.isArray(direction) ? [...direction] : direction ?? "";
}

function roomObjectPreloadDimensionsSignature(dimensions: HabboRoomObjectRecord["dimensions"]): readonly number[] | string {
  return Array.isArray(dimensions) ? [...dimensions] : "";
}

function roomObjectPreloadPropsSignature(props: HabboRoomObjectRecord["props"]): readonly (readonly [string, string])[] {
  return Object.entries(props ?? {}).sort(([left], [right]) => left.localeCompare(right));
}

function normalizeCastName(value: string): string {
  return value.replace(/\.[^.]+$/, "").toLowerCase();
}

function normalizeMemberName(value: string): string {
  return value.trim().toLowerCase();
}
