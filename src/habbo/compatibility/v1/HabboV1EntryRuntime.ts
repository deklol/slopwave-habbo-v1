import type { DirectorMember, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";

export const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
export const release1EntryRelease = "release1_roseau_dcr0910-habbo_entry";

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SourceChannel {
  readonly channel: number;
  readonly sprite: DirectorSpriteChannel;
  readonly bounds: Bounds;
}

export function isRelease1EntryMovie(movie: DirectorMovie): boolean {
  return movie.id === release1EntryMovieId
    || readRecord(movie.getProperty("release1EntryState"))?.release === release1EntryRelease;
}

export function sourceChannelByBehaviorName(movie: DirectorMovie, behaviorName: string): SourceChannel | undefined {
  return sourceChannelsByBehaviorName(movie, behaviorName)[0];
}

export function sourceChannelsByBehaviorName(movie: DirectorMovie, behaviorName: string): SourceChannel[] {
  const normalizedName = behaviorName.toLowerCase();
  const channels: SourceChannel[] = [];
  for (const behavior of movie.score.activeBehaviorIntervals(movie.currentFrameIndex)) {
    const scriptMember = movie.cast.getMember(behavior.script);
    if (scriptMember?.name?.toLowerCase() !== normalizedName) {
      continue;
    }

    const sprite = movie.currentFrame.getSprite(behavior.channel);
    const bounds = sprite ? sourceBoundsForSprite(movie, sprite) : undefined;
    if (sprite && bounds) {
      channels.push({
        channel: behavior.channel,
        sprite,
        bounds
      });
    }
  }

  return channels;
}

export function sourceBoundsForSprite(movie: DirectorMovie, sprite: DirectorSpriteChannel): Bounds {
  const member = movie.cast.getMember(sprite.member);
  const width = Math.max(1, Math.round(sprite.width ?? member?.width ?? 1));
  const height = Math.max(1, Math.round(sprite.height ?? member?.height ?? 1));
  const sourceWidth = Math.max(1, Math.round(member?.composite?.width ?? member?.width ?? width));
  const sourceHeight = Math.max(1, Math.round(member?.composite?.height ?? member?.height ?? height));
  const regPoint = member?.regPoint ?? { x: 0, y: 0 };
  const scaledRegX = directorInteger((regPoint.x * width) / sourceWidth);
  const scaledRegY = directorInteger((regPoint.y * height) / sourceHeight);
  const effectiveRegX = sprite.flipH ? width - scaledRegX : scaledRegX;
  const effectiveRegY = sprite.flipV ? height - scaledRegY : scaledRegY;
  return {
    x: sprite.loc.x - effectiveRegX,
    y: sprite.loc.y - effectiveRegY,
    width,
    height
  };
}

export function readRelease1EntryGlobals(movie: DirectorMovie): Record<string, unknown> {
  return readRecord(movie.getProperty("release1EntryGlobals")) ?? {};
}

export function setRelease1EpConnectionState(
  movie: DirectorMovie,
  state: { readonly ok: boolean; readonly secured: boolean; readonly source: string }
): void {
  movie.setProperty("release1EntryEpConnection", {
    gEPConnectionOk: state.ok ? 1 : 0,
    gEPConnectionsSecured: state.secured ? 1 : 0,
    source: state.source
  });
}

export function readWindowFieldValues(movie: DirectorMovie): Record<string, string> {
  const value = readRecord(movie.getProperty("windowFieldValues"));
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function setMemberTextByName(movie: DirectorMovie, name: string, text: string): void {
  for (const castLib of movie.cast.castLibs) {
    const member = castLib.getMemberByName(name);
    if (member && isTextLikeMember(member)) {
      member.setText(text);
      return;
    }
  }
}

export function setRelease1SpriteMemberByChannel(
  movie: DirectorMovie,
  channel: number | undefined,
  memberName: string
): void {
  if (channel === undefined) {
    return;
  }

  const sprite = mutableSprite(movie.currentFrame.getSprite(channel));
  const member = movie.cast.getMemberByName(memberName);
  if (!sprite || !member) {
    return;
  }

  const previousWidth = sprite.width;
  const previousHeight = sprite.height;
  sprite.member = member.ref();
  sprite.width = member.width ?? member.composite?.width ?? previousWidth;
  sprite.height = member.height ?? member.composite?.height ?? previousHeight;
}

export function goToMarkerIfPresent(movie: DirectorMovie, markerName: string): void {
  if (movie.score.getMarker(markerName)) {
    movie.go(markerName);
  }
}

export function clearRelease1EntryInteractions(movie: DirectorMovie): void {
  movie.setProperty("windowInteractiveElements", []);
}

export function sanitizeSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, "");
}

export function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

export function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function sourceFontSizeForSprite(movie: DirectorMovie, sprite: DirectorSpriteChannel): number {
  const member = movie.cast.getMember(sprite.member);
  return Math.max(1, Math.round(member?.fontSize ?? 9));
}

function isTextLikeMember(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}

interface MutableSpriteChannel {
  member: ReturnType<DirectorMember["ref"]>;
  width: number | undefined;
  height: number | undefined;
}

function mutableSprite(sprite: DirectorSpriteChannel | undefined): MutableSpriteChannel | undefined {
  return sprite as unknown as MutableSpriteChannel | undefined;
}
