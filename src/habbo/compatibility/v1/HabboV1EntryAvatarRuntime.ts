import type {
  DirectorCastLibManifest,
  DirectorMember,
  DirectorMemberManifest,
  DirectorMemberRef,
  DirectorMovie,
  DirectorSpriteChannel
} from "../../../runtime";
import type { HabboExternalBitmapAssetSet } from "../../boot/HabboBootResourceTypes";
import { coerceRecord, normalizeCastName, rgbToHex } from "../../HabboSourceValueHelpers";
import { parseOldServerFigureString } from "../../features/figure/HabboFigureData";

const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
const release1EntryRelease = "release1_roseau_dcr0910-habbo_entry";

const sourcePaths = {
  userObject:
    "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 1 - EnterpriseServer Connection Scripts.ls",
  setUserAvatarParts:
    "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 241 - Set User Avatar Parts.ls",
  welcomeWave:
    "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 243 - Smily face and waving hand.ls",
  humanClass:
    "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/ParentScript 72 - Human Class GF.ls",
  externalCastGraph:
    "generated/runtime-data/external-cast-graph.json",
  externalBitmapAssets:
    "generated/runtime-data/external-bitmap-assets.json"
} as const;

interface MutableSpriteChannel {
  member: DirectorMemberRef;
  width: number | undefined;
  height: number | undefined;
  bgColor?: string;
  ink: number;
}

interface ParsedFigurePart {
  readonly model: string;
  readonly rgbColor?: string;
}

interface SourceFigureMemberName {
  readonly prefix: string;
  readonly action: string;
  readonly part: string;
  readonly direction: string;
  readonly frame: string;
}

export function hydrateRelease1EntryAvatarCasts(
  movie: DirectorMovie,
  externalBitmapAssetSet: HabboExternalBitmapAssetSet | undefined
): boolean {
  if (!externalBitmapAssetSet || externalBitmapAssetSet.versionId !== "release1") {
    return false;
  }

  const assetsByCastMember = new Map<string, HabboExternalBitmapAssetSet["assets"][number]>();
  for (const asset of externalBitmapAssetSet.assets) {
    assetsByCastMember.set(assetKey(asset.castName, asset.member), asset);
  }

  let hydratedCastCount = 0;
  for (const castLib of movie.cast.castLibs) {
    if (!castLib.name) {
      continue;
    }

    let hydratedMemberCount = 0;
    const members: DirectorMemberManifest[] = castLib.members.map((member) => {
      const asset = assetsByCastMember.get(assetKey(castLib.name ?? "", member.memberNumber));
      if (!asset) {
        return memberManifestFromMember(member);
      }

      hydratedMemberCount += 1;
      return {
        ...memberManifestFromMember(member),
        type: "bitmap",
        width: asset.width,
        height: asset.height,
        regPoint: asset.regPoint,
        assetPath: asset.pngPath,
        ...(asset.inkAssetPaths ? { inkAssetPaths: asset.inkAssetPaths } : {})
      };
    });

    if (hydratedMemberCount === 0) {
      continue;
    }

    movie.cast.importCastLib({
      number: castLib.number,
      name: castLib.name,
      ...(castLib.fileName ? { fileName: castLib.fileName } : {}),
      ...(castLib.preloadMode !== undefined ? { preloadMode: castLib.preloadMode } : {}),
      members
    } satisfies DirectorCastLibManifest);
    hydratedCastCount += 1;
  }

  if (hydratedCastCount > 0) {
    movie.setProperty("release1EntryAvatarCastHydration", {
      hydratedCastCount,
      assetCount: externalBitmapAssetSet.assetCount,
      source: [sourcePaths.externalCastGraph, sourcePaths.externalBitmapAssets]
    });
    movie.debugLog.add("entry", "ok", `release1 avatar casts hydrated casts=${hydratedCastCount} assets=${externalBitmapAssetSet.assetCount}`);
  }

  return hydratedCastCount > 0;
}

export function syncRelease1EntryAvatarSprites(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie, release)) {
    return false;
  }

  const figureText = release1UserFigure(movie);
  if (!figureText) {
    return false;
  }

  const figureParts = parseRelease1FigureParts(figureText);
  const parsedFigure = parseOldServerFigureString(figureText, "M");
  if (Object.keys(figureParts).length === 0 && !parsedFigure) {
    return false;
  }

  let changed = false;
  let syncedSprites = 0;
  for (const sprite of movie.currentFrame.sprites) {
    const sourceMember = movie.cast.getMember(sprite.member);
    const sourceName = parseSourceFigureMemberName(sourceMember?.name);
    if (!sourceName) {
      continue;
    }

    const part = figureParts[sourceName.part];
    const parsedPart = parsedFigure?.[sourceName.part];
    const model = part?.model ?? parsedPart?.model;
    if (!model) {
      continue;
    }

    const nextMember = resolveSourceFigureMember(movie, sourceName, model);
    if (!nextMember) {
      movie.unsupported.add({
        subsystem: "habbo",
        feature: "release1-entry-avatar-member-missing",
        detail: `Release1 entry avatar requested ${sourceName.prefix}_${sourceName.action}_${sourceName.part}_${model}_${sourceName.direction}_${sourceName.frame}`,
        source: sourcePaths.humanClass
      });
      continue;
    }

    const mutable = mutableSprite(sprite);
    if (mutable.member.castLib !== nextMember.castLib || mutable.member.member !== nextMember.memberNumber) {
      mutable.member = nextMember.ref();
      mutable.width = nextMember.width;
      mutable.height = nextMember.height;
      changed = true;
    }

    const rgbColor = part?.rgbColor;
    if (rgbColor && mutable.bgColor !== rgbColor) {
      mutable.bgColor = rgbColor;
      changed = true;
    }

    syncedSprites += 1;
  }

  if (syncedSprites > 0) {
    movie.setProperty("release1EntryAvatarSpriteState", {
      frame: movie.currentFrameIndex,
      syncedSprites,
      figure: figureText,
      source: [sourcePaths.userObject, sourcePaths.setUserAvatarParts, sourcePaths.welcomeWave, sourcePaths.humanClass]
    });
  }

  return changed;
}

function memberManifestFromMember(member: DirectorMember): DirectorMemberManifest {
  const manifest: DirectorMemberManifest = {
    number: member.memberNumber,
    type: member.type
  };

  assignDefined(manifest, "name", member.name);
  assignDefined(manifest, "width", member.width);
  assignDefined(manifest, "height", member.height);
  assignDefined(manifest, "shapeType", member.shapeType);
  assignDefined(manifest, "shapeFillType", member.shapeFillType);
  assignDefined(manifest, "shapeLineThickness", member.shapeLineThickness);
  assignDefined(manifest, "color", member.color);
  assignDefined(manifest, "backgroundColor", member.backgroundColor);
  assignDefined(manifest, "text", member.text);
  assignDefined(manifest, "fontSize", member.fontSize);
  assignDefined(manifest, "fontFamily", member.fontFamily);
  assignDefined(manifest, "fontWeight", member.fontWeight);
  assignDefined(manifest, "fontStyle", member.fontStyle);
  if (member.underline) {
    manifest.underline = member.underline;
  }
  assignDefined(manifest, "textAlign", member.textAlign);
  assignDefined(manifest, "lineHeight", member.lineHeight);
  if (member.wordWrap) {
    manifest.wordWrap = member.wordWrap;
  }
  if (member.textSpans.length > 0) {
    manifest.textSpans = [...member.textSpans];
  }
  if (member.textScrollY !== 0) {
    manifest.textScrollY = member.textScrollY;
  }
  if (member.editable) {
    manifest.editable = member.editable;
  }
  if (member.regPoint.x !== 0 || member.regPoint.y !== 0) {
    manifest.regPoint = member.regPoint;
  }
  assignDefined(manifest, "assetPath", member.assetPath);
  if (Object.keys(member.inkAssetPaths).length > 0) {
    manifest.inkAssetPaths = { ...member.inkAssetPaths };
  }
  assignDefined(manifest, "composite", member.composite);
  assignDefined(manifest, "borderColor", member.borderColor);
  assignDefined(manifest, "borderWidth", member.borderWidth);
  assignDefined(manifest, "borderRadius", member.borderRadius);

  return manifest;
}

function assignDefined<K extends keyof DirectorMemberManifest>(
  manifest: DirectorMemberManifest,
  key: K,
  value: DirectorMemberManifest[K] | undefined
): void {
  if (value !== undefined) {
    manifest[key] = value;
  }
}

function resolveSourceFigureMember(
  movie: DirectorMovie,
  sourceName: SourceFigureMemberName,
  model: string
): DirectorMember | undefined {
  const castLib = sourceFigureCastLib(movie, sourceName.prefix);
  for (const candidateName of sourceFigureMemberCandidates(sourceName, model)) {
    const member = castLib !== undefined
      ? movie.cast.getMemberByName(candidateName, castLib)
      : movie.cast.getMemberByName(candidateName);
    if (member) {
      return member;
    }
  }

  return undefined;
}

function sourceFigureMemberCandidates(sourceName: SourceFigureMemberName, model: string): string[] {
  const base = `${sourceName.prefix}_${sourceName.action}_${sourceName.part}_${model}_${sourceName.direction}`;
  const fallback = `${sourceName.prefix}_std_${sourceName.part}_${model}_${sourceName.direction}_0`;
  return [
    `${base}_${sourceName.frame}`,
    `${base}_0`,
    fallback
  ].filter((name, index, names) => names.indexOf(name) === index);
}

function sourceFigureCastLib(movie: DirectorMovie, prefix: string): number | undefined {
  const targetCastName = prefix === "sh" ? "s_people" : "people";
  return movie.cast.castLibs.find((castLib) => normalizeCastName(castLib.name ?? "") === targetCastName)?.number;
}

function parseSourceFigureMemberName(memberName: string | undefined): SourceFigureMemberName | undefined {
  const match = /^(h|sh)_([a-z]+)_([a-z]{2})_([^_]+)_([0-7])_(\d+)$/i.exec(memberName ?? "");
  if (!match?.[1] || !match[2] || !match[3] || !match[5] || !match[6]) {
    return undefined;
  }

  return {
    prefix: match[1].toLowerCase(),
    action: match[2].toLowerCase(),
    part: match[3].toLowerCase(),
    direction: match[5],
    frame: match[6]
  };
}

function parseRelease1FigureParts(figureText: string): Record<string, ParsedFigurePart> {
  const parts: Record<string, ParsedFigurePart> = {};
  for (const entry of figureText.split("&")) {
    const separator = entry.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const part = entry.slice(0, separator).trim().toLowerCase();
    const value = entry.slice(separator + 1);
    const [model, colorToken = ""] = value.split("/");
    if (!part || !model) {
      continue;
    }

    const rgbColor = parseRelease1RgbColorToken(colorToken);
    parts[part] = {
      model: model.padStart(3, "0"),
      ...(rgbColor ? { rgbColor } : {})
    };
  }

  return parts;
}

function parseRelease1RgbColorToken(colorToken: string): string | undefined {
  const channels = colorToken
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10));
  return channels.length === 3 && channels.every((channel) => Number.isFinite(channel))
    ? rgbToHex(channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0)
    : undefined;
}

function release1UserFigure(movie: DirectorMovie): string | undefined {
  const userObject = coerceRecord(movie.getProperty("release1EntryUserObject"));
  if (typeof userObject.figure === "string" && userObject.figure.length > 0) {
    return userObject.figure;
  }

  const myFigureData = coerceRecord(movie.getProperty("release1EntryMyFigureData"));
  return typeof myFigureData.figure === "string" && myFigureData.figure.length > 0
    ? myFigureData.figure
    : undefined;
}

function assetKey(castName: string, memberNumber: number): string {
  return `${normalizeCastName(castName)}:${memberNumber}`;
}

function isRelease1EntryMovie(movie: DirectorMovie, release: string): boolean {
  return release.startsWith("release1_roseau_dcr0910")
    && (movie.id === release1EntryMovieId || coerceRecord(movie.getProperty("release1EntryState")).release === release1EntryRelease);
}

function mutableSprite(sprite: DirectorSpriteChannel): MutableSpriteChannel {
  return sprite as unknown as MutableSpriteChannel;
}

export const release1EntryAvatarSources = sourcePaths;
