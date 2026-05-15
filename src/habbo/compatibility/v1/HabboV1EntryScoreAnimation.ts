import type { DirectorBehaviorInterval, DirectorMemberRef, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";

const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
const sourcePaths = {
  cloud: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/habbo_entry_gfx/BehaviorScript 52 - Cloud behavior.ls",
  flags: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/habbo_entry_gfx/BehaviorScript 67 - Flags behavior.ls",
  car1: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 291 - car1behaviour.ls",
  car2: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 292 - car2behaviour.ls"
} as const;

interface MutableSpriteChannel {
  member: DirectorMemberRef;
  loc: {
    x: number;
    y: number;
  };
  width: number | undefined;
  height: number | undefined;
  bgColor?: string;
  flipH: boolean;
}

interface Release1EntryAnimationState {
  elapsedMs: number;
  readonly sprites: Record<number, Release1EntrySpriteState>;
}

type Release1EntrySpriteState =
  | CloudState
  | FlagState
  | CarState;

interface CloudState {
  readonly kind: "cloud";
  direction: -1 | 1;
  turnpoint: number;
}

interface FlagState {
  readonly kind: "flags";
  frame: number;
  wait: number;
}

interface CarState {
  readonly kind: "car";
  readonly route: "car1" | "car2";
  model: string;
  direction: 1 | 2;
  smallCount: 0 | 1;
  readonly startX: number;
  readonly startY: number;
}

interface AnimationTarget {
  readonly scriptName: string;
  readonly sprite: DirectorSpriteChannel;
  readonly behavior: DirectorBehaviorInterval;
}

export function advanceRelease1EntryScoreAnimation(movie: DirectorMovie, release: string, deltaMs: number): boolean {
  if (!isRelease1EntryMovie(movie, release)) {
    return false;
  }

  const targets = collectAnimationTargets(movie);
  if (targets.length === 0) {
    movie.setProperty("release1EntryScoreAnimation", undefined);
    return false;
  }

  const state = readOrCreateAnimationState(movie);
  let changed = initializeAnimationTargets(movie, state, targets);
  state.elapsedMs += Math.max(0, deltaMs);

  const frameMs = 1000 / Math.max(1, movie.tempo);
  while (state.elapsedMs >= frameMs) {
    state.elapsedMs -= frameMs;
    for (const target of targets) {
      changed = advanceTarget(movie, state, target) || changed;
    }
  }

  movie.setProperty("release1EntryScoreAnimation", state);
  return changed;
}

function isRelease1EntryMovie(movie: DirectorMovie, release: string): boolean {
  return movie.id === release1EntryMovieId && release.startsWith("release1_roseau_dcr0910");
}

function collectAnimationTargets(movie: DirectorMovie): AnimationTarget[] {
  const targets: AnimationTarget[] = [];
  for (const behavior of movie.score.activeBehaviorIntervals(movie.currentFrameIndex)) {
    const script = movie.cast.getMember(behavior.script);
    const scriptName = script?.name ?? "";
    if (!isAnimatedEntryScript(scriptName)) {
      continue;
    }

    const sprite = movie.currentFrame.getSprite(behavior.channel);
    if (sprite) {
      targets.push({ scriptName, sprite, behavior });
    }
  }
  return targets;
}

function isAnimatedEntryScript(scriptName: string): boolean {
  return scriptName === "Cloud behavior"
    || scriptName === "Flags behavior"
    || scriptName === "car1behaviour"
    || scriptName === "car2behaviour";
}

function readOrCreateAnimationState(movie: DirectorMovie): Release1EntryAnimationState {
  const existing = movie.getProperty("release1EntryScoreAnimation");
  if (isAnimationState(existing)) {
    return existing;
  }

  return {
    elapsedMs: 0,
    sprites: {}
  };
}

function isAnimationState(value: unknown): value is Release1EntryAnimationState {
  return typeof value === "object"
    && value !== null
    && "elapsedMs" in value
    && "sprites" in value;
}

function initializeAnimationTargets(
  movie: DirectorMovie,
  state: Release1EntryAnimationState,
  targets: readonly AnimationTarget[]
): boolean {
  let changed = false;
  for (const target of targets) {
    if (state.sprites[target.sprite.channel]) {
      continue;
    }

    const sprite = mutableSprite(target.sprite);
    if (target.scriptName === "Cloud behavior") {
      const turnpoint = sourceNumberProperty(target.behavior, "turnpoint", 332);
      const direction = sprite.loc.x > turnpoint ? 1 : -1;
      state.sprites[target.sprite.channel] = { kind: "cloud", direction, turnpoint };
      if (sprite.flipH !== (direction === 1)) {
        sprite.flipH = direction === 1;
        changed = true;
      }
    } else if (target.scriptName === "Flags behavior") {
      state.sprites[target.sprite.channel] = { kind: "flags", frame: 1, wait: 3 };
    } else if (target.scriptName === "car1behaviour" || target.scriptName === "car2behaviour") {
      const route = target.scriptName === "car1behaviour" ? "car1" : "car2";
      const model = chooseSourceCarModel(movie, 1);
      state.sprites[target.sprite.channel] = {
        kind: "car",
        route,
        model,
        direction: 1,
        smallCount: 0,
        startX: route === "car1" ? 206 : 724,
        startY: route === "car1" ? 496 : 494
      };
      sprite.loc.x = route === "car1" ? 206 : 724;
      sprite.loc.y = route === "car1" ? 496 : 494;
      sprite.flipH = false;
      setSpriteMemberByName(movie, target.sprite, `${model}1`);
      changed = true;
    }
  }
  return changed;
}

function advanceTarget(
  movie: DirectorMovie,
  state: Release1EntryAnimationState,
  target: AnimationTarget
): boolean {
  const spriteState = state.sprites[target.sprite.channel];
  if (!spriteState) {
    return false;
  }

  if (spriteState.kind === "cloud") {
    return advanceCloud(target.sprite, spriteState, movie.stage.width);
  }
  if (spriteState.kind === "flags") {
    return advanceFlags(movie, target.sprite, spriteState);
  }
  return advanceCar(movie, target.sprite, spriteState);
}

function advanceCloud(spriteChannel: DirectorSpriteChannel, state: CloudState, stageWidth: number): boolean {
  const sprite = mutableSprite(spriteChannel);
  sprite.loc.x += 1;
  if (sprite.loc.x % 2 === 0) {
    sprite.loc.y += state.direction;
  }

  if (sprite.loc.x > state.turnpoint) {
    state.direction = 1;
    sprite.flipH = true;
  }

  if (sprite.loc.x > stageWidth + 30) {
    sprite.loc.x = -30;
    sprite.loc.y = 151 + Math.floor(Math.random() * 81);
    state.direction = -1;
    sprite.flipH = false;
  }

  return true;
}

function advanceFlags(movie: DirectorMovie, spriteChannel: DirectorSpriteChannel, state: FlagState): boolean {
  if (state.wait > 0) {
    state.wait -= 1;
    return false;
  }

  if (state.frame > 6) {
    state.frame = 1;
    return false;
  }

  const changed = setSpriteMemberByName(movie, spriteChannel, `hotel_flags${state.frame}`);
  state.wait = 3;
  state.frame += 1;
  return changed;
}

function advanceCar(movie: DirectorMovie, spriteChannel: DirectorSpriteChannel, state: CarState): boolean {
  const sprite = mutableSprite(spriteChannel);
  const horizontalStep = state.route === "car1" ? 2 : -2;
  const thresholdY = state.route === "car1" ? 353 : 375;

  if (state.smallCount === 0) {
    sprite.loc.x += horizontalStep;
    sprite.loc.y -= 1;
  }
  if (sprite.loc.y < thresholdY) {
    state.smallCount = 1;
    state.direction = 2;
    setSpriteMemberByName(movie, spriteChannel, `${state.model}${state.direction}`);
  }
  if ((state.route === "car1" && sprite.loc.x > 740) || (state.route === "car2" && sprite.loc.x < 249)) {
    state.smallCount = 0;
    state.direction = 1;
    state.model = chooseSourceCarModel(movie, state.direction);
    sprite.loc.x = state.startX;
    sprite.loc.y = state.startY;
    sprite.flipH = false;
    setSpriteMemberByName(movie, spriteChannel, `${state.model}${state.direction}`);
  }
  if (state.smallCount === 1) {
    sprite.loc.x += horizontalStep;
    sprite.loc.y += 1;
  }

  return true;
}

function chooseSourceCarModel(movie: DirectorMovie, direction: 1 | 2): string {
  const fallbackModel = hasRenderableBitmapMember(movie, `car${direction}`) ? "car" : undefined;
  const alternateModels = ["cab", "bus"].filter((model) => hasRenderableBitmapMember(movie, `${model}${direction}`));
  if (Math.floor(Math.random() * 4) === 0 && alternateModels.length > 0) {
    return alternateModels[Math.floor(Math.random() * alternateModels.length)] ?? alternateModels[0] ?? fallbackModel ?? "car";
  }

  return fallbackModel ?? alternateModels[0] ?? "car";
}

function hasRenderableBitmapMember(movie: DirectorMovie, name: string): boolean {
  const member = movie.cast.getMemberByName(name);
  return member?.type === "bitmap" && (member.assetPath !== undefined || Object.keys(member.inkAssetPaths).length > 0);
}

function sourceNumberProperty(behavior: DirectorBehaviorInterval, name: string, fallback: number): number {
  const value = behavior.properties?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function setSpriteMemberByName(movie: DirectorMovie, spriteChannel: DirectorSpriteChannel, name: string): boolean {
  const member = movie.cast.getMemberByName(name);
  if (!member) {
    movie.unsupported.add({
      subsystem: "director",
      feature: "release1-entry-animation-member-missing",
      detail: `Release1 entry animation requested source member ${name}`
    });
    return false;
  }

  const sprite = mutableSprite(spriteChannel);
  if (sprite.member.castLib === member.castLib && sprite.member.member === member.memberNumber) {
    return false;
  }

  sprite.member = member.ref();
  sprite.width = member.width;
  sprite.height = member.height;
  return true;
}

function mutableSprite(sprite: DirectorSpriteChannel): MutableSpriteChannel {
  return sprite as unknown as MutableSpriteChannel;
}

export const release1EntryScoreAnimationSources = sourcePaths;
