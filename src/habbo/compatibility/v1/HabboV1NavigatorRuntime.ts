import type {
  DirectorCastLib,
  DirectorMember,
  DirectorMemberManifest,
  DirectorMovie,
  DirectorSpriteChannelManifest
} from "../../../runtime";
import type { HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import {
  isRelease1PublicUnit,
  readRecord,
  type RecordedSprite,
  type Release1PublicUnit
} from "./HabboV1NavigatorSource";

export const navigatorCastName = "navigation";
const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
const release1EntryRelease = "release1_roseau_dcr0910-habbo_entry";

export function isRelease1EntryMovie(movie: DirectorMovie): boolean {
  return movie.id === release1EntryMovieId
    || readRecord(movie.getProperty("release1EntryState"))?.release === release1EntryRelease;
}

export function navigationCast(movie: DirectorMovie): DirectorCastLib | undefined {
  return movie.cast.castLibs.find((castLib) => castLib.name === navigatorCastName);
}

export function readRelease1PublicUnits(movie: DirectorMovie): readonly Release1PublicUnit[] {
  const state = readRecord(movie.getProperty("release1EntryPublicUnits"));
  if (!Array.isArray(state?.units)) {
    return [];
  }
  return state.units.filter(isRelease1PublicUnit);
}

export function readFirstVisiblePlace(movie: DirectorMovie): number {
  const state = readRecord(movie.getProperty("release1EntryNavigatorState"));
  const rawValue = typeof state?.firstVisiblePlace === "number" ? state.firstVisiblePlace : 1;
  return Math.max(1, Math.trunc(rawValue));
}

export function boundsForRecordedSprite(movie: DirectorMovie, sprite: RecordedSprite): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const member = movie.cast.getMember(sprite.member);
  const width = Math.max(1, Math.round(sprite.width ?? member?.width ?? 1));
  const height = Math.max(1, Math.round(sprite.height ?? member?.height ?? 1));
  const regPoint = member?.regPoint ?? { x: 0, y: 0 };
  return {
    x: Math.round(sprite.loc.x - regPoint.x),
    y: Math.round(sprite.loc.y - regPoint.y),
    width,
    height
  };
}

export function navigatorContextBoundsForRecordedSprite(
  movie: DirectorMovie,
  sprite: RecordedSprite,
  recordedSprites: readonly RecordedSprite[]
): ReturnType<typeof boundsForRecordedSprite> | undefined {
  const bounds = boundsForRecordedSprite(movie, sprite);
  const containingBackgrounds = recordedSprites
    .filter((candidate) => candidate.channel < sprite.channel && candidate.behaviorNames.length === 0)
    .map((candidate) => ({
      sprite: candidate,
      bounds: boundsForRecordedSprite(movie, candidate)
    }))
    .filter((candidate) => {
      const member = movie.cast.getMember(candidate.sprite.member);
      return member?.type === "bitmap"
        && candidate.bounds.width >= bounds.width
        && candidate.bounds.width <= bounds.width + 80
        && candidate.bounds.height >= bounds.height
        && candidate.bounds.height <= bounds.height + 24
        && candidate.bounds.x <= bounds.x
        && candidate.bounds.y <= bounds.y
        && candidate.bounds.x + candidate.bounds.width >= bounds.x + bounds.width
        && candidate.bounds.y + candidate.bounds.height >= bounds.y + bounds.height;
    })
    .sort((left, right) => (left.bounds.width * left.bounds.height) - (right.bounds.width * right.bounds.height));

  return containingBackgrounds[0]?.bounds;
}

export function readSpriteManifests(value: unknown): DirectorSpriteChannelManifest[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isSpriteManifest);
}

export function readInteractiveElements(movie: DirectorMovie): HabboWindowInteractiveElement[] {
  const value = movie.getProperty("windowInteractiveElements");
  return Array.isArray(value) ? value.filter(isInteractiveElement) : [];
}

export function memberManifestFromMember(member: DirectorMember): DirectorMemberManifest {
  return {
    number: member.memberNumber,
    ...(member.name ? { name: member.name } : {}),
    type: member.type,
    ...(member.width !== undefined ? { width: member.width } : {}),
    ...(member.height !== undefined ? { height: member.height } : {}),
    ...(member.shapeType !== undefined ? { shapeType: member.shapeType } : {}),
    ...(member.shapeFillType !== undefined ? { shapeFillType: member.shapeFillType } : {}),
    ...(member.shapeLineThickness !== undefined ? { shapeLineThickness: member.shapeLineThickness } : {}),
    ...(member.color ? { color: member.color } : {}),
    ...(member.backgroundColor ? { backgroundColor: member.backgroundColor } : {}),
    ...(member.text !== undefined ? { text: member.text } : {}),
    ...(member.fontSize !== undefined ? { fontSize: member.fontSize } : {}),
    ...(member.fontFamily ? { fontFamily: member.fontFamily } : {}),
    ...(member.fontWeight ? { fontWeight: member.fontWeight } : {}),
    ...(member.fontStyle ? { fontStyle: member.fontStyle } : {}),
    ...(member.underline ? { underline: member.underline } : {}),
    ...(member.textAlign ? { textAlign: member.textAlign } : {}),
    ...(member.lineHeight !== undefined ? { lineHeight: member.lineHeight } : {}),
    ...(member.wordWrap ? { wordWrap: member.wordWrap } : {}),
    ...(member.textSpans.length > 0 ? { textSpans: [...member.textSpans] } : {}),
    ...(member.textScrollY !== 0 ? { textScrollY: member.textScrollY } : {}),
    ...(member.editable ? { editable: member.editable } : {}),
    regPoint: member.regPoint,
    ...(member.assetPath ? { assetPath: member.assetPath } : {}),
    ...(Object.keys(member.inkAssetPaths).length > 0 ? { inkAssetPaths: { ...member.inkAssetPaths } } : {}),
    ...(member.composite ? { composite: member.composite } : {}),
    ...(member.borderColor ? { borderColor: member.borderColor } : {}),
    ...(member.borderWidth !== undefined ? { borderWidth: member.borderWidth } : {}),
    ...(member.borderRadius !== undefined ? { borderRadius: member.borderRadius } : {})
  };
}

export function setMemberTextByName(movie: DirectorMovie, name: string, text: string): void {
  for (const castLib of movie.cast.castLibs) {
    const members = castLib.members.filter((member) => member.name === name && isTextLikeMember(member));
    for (const member of members) {
      member.setText(text);
    }
  }
}

function isSpriteManifest(value: unknown): value is DirectorSpriteChannelManifest {
  const record = readRecord(value);
  return typeof record?.channel === "number"
    && readRecord(record.member) !== undefined
    && readRecord(record.loc) !== undefined;
}

function isInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && typeof record.windowId === "string"
    && typeof record.kind === "string"
    && typeof record.x === "number"
    && typeof record.y === "number"
    && typeof record.width === "number"
    && typeof record.height === "number";
}

function isTextLikeMember(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}
