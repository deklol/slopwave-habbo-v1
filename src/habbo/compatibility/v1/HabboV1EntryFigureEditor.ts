import type { DirectorBehaviorInterval, DirectorMember, DirectorMemberRef, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";
import { getExternalBitmapAssetSet } from "../../extractedManifests";
import { getRelease1FigureSpecLines } from "../../features/figure";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { hydrateRelease1EntryAvatarCasts } from "./HabboV1EntryAvatarRuntime";

const sourcePaths = {
  figureLoop: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 142 - figure loop.ls",
  partChanger: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 381 - PartChanger_behavior.ls",
  changePartButton: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 133 - changePart_btn.ls",
  changeColorButton: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 135 - changeColor_btn.ls",
  skinPartChanger: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 383 - skinPartChanger.ls",
  getFigure: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 138 - get_figure.ls",
  goToFrame: "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/BehaviorScript 60 - Go To Frame.ls"
} as const;

const registrationTextMembers = {
  sex: "charactersex_field",
  figure: "figure_field"
} as const;

const defaultFigureParts = ["sd", "hr", "hd", "ey", "fc", "bd", "lh", "rh", "ch", "ls", "rs", "lg", "sh"] as const;
type Release1FigurePart = typeof defaultFigureParts[number];

const sourceFigureDefaultColors: Readonly<Record<Release1FigurePart, string>> = {
  sd: "0",
  hr: "255,255,255",
  hd: "255,204,153",
  ey: "0",
  fc: "255,204,153",
  bd: "255,204,153",
  lh: "255,204,153",
  rh: "255,204,153",
  ch: "232,177,55",
  ls: "232,177,55",
  rs: "232,177,55",
  lg: "119,159,187",
  sh: "175,220,223"
};

interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface SourceChannel {
  readonly channel: number;
  readonly sprite: DirectorSpriteChannel;
  readonly bounds: Bounds;
}

interface PartChangerState {
  readonly frame: number;
  readonly sourceChannel: number;
  readonly myField: string;
  readonly myParts: readonly string[];
  readonly mySprs: readonly number[];
  readonly resolvedMySprs: readonly number[];
  readonly mag: boolean;
  readonly myPreviewSprite: number;
  readonly addParts: readonly string[];
  readonly addSprs: readonly number[];
  readonly resolvedAddSprs: readonly number[];
  currPartNum: number;
  currColorNum: number;
  currPartNums: string[];
  allColors: string[];
  currColorRgb: string;
  specLines: readonly string[];
}

interface SkinPartAddition {
  readonly target: number;
  readonly parts: readonly string[];
  readonly sprs: readonly number[];
}

interface PreviewPlacementAnchor {
  readonly largeOffset?: {
    readonly x: number;
    readonly y: number;
  };
}

export function syncRelease1EntryFigureForm(movie: DirectorMovie, release: string): boolean {
  const nextButton = sourceChannelByBehaviorName(movie, "get_figure");
  const backButton = sourceChannelByBehaviorName(movie, "Go To Frame", (candidate) => !channelHasBehavior(movie, candidate.channel, "get_figure"));
  if (!nextButton || !backButton) {
    return false;
  }

  ensureRelease1FigureAssetsHydrated(movie);
  const partButtons = sourceChannelsByBehaviorName(movie, "changePart_btn");
  const colorButtons = sourceChannelsByBehaviorName(movie, "changeColor_btn");
  const elements: HabboWindowInteractiveElement[] = [
    sourceButtonElement("reg_figure_back_button", backButton, "Back", "Go To Frame"),
    sourceButtonElement("reg_figure_next_button", nextButton, "Accept", "get_figure"),
    ...partButtons.map((button) => sourceButtonElement(`reg_figure_part_${button.channel}`, button, "Part", "changePart_btn")),
    ...colorButtons.map((button) => sourceButtonElement(`reg_figure_color_${button.channel}`, button, "Color", "changeColor_btn"))
  ];

  movie.setProperty("release1EntryFigureRelease", release);
  initializeRelease1EntryFigureFields(movie);
  movie.setProperty("windowInteractiveElements", elements);
  movie.setProperty("release1EntryFigureInteractionState", {
    release,
    sourceRelease: "release1_roseau_dcr0910-habbo_entry",
    frame: movie.currentFrameIndex,
    interactiveCount: elements.length,
    partChangerCount: sourceChannelsByBehaviorName(movie, "PartChanger_behavior").length,
    source: [
      sourcePaths.figureLoop,
      sourcePaths.partChanger,
      sourcePaths.changePartButton,
      sourcePaths.changeColorButton,
      sourcePaths.skinPartChanger,
      sourcePaths.getFigure,
      sourcePaths.goToFrame
    ]
  });
  return true;
}

export function activateRelease1EntryFigureElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if ((elementId.startsWith("reg_figure_part_") || elementId.startsWith("reg_figure_color_")) && acceptsMouseDown(activation)) {
    const channel = Number.parseInt(elementId.slice(elementId.lastIndexOf("_") + 1), 10);
    const behaviorName = elementId.startsWith("reg_figure_part_") ? "changePart_btn" : "changeColor_btn";
    return activateFigureArrow(movie, channel, behaviorName);
  }

  return false;
}

export function applyRelease1EntryFigureField(movie: DirectorMovie): string {
  initializeRelease1EntryFigureSourceState(movie);
  const parts = readRecord(movie.getProperty("release1EntryFigureParts")) ?? {};
  const colors = readRecord(movie.getProperty("release1EntryFigureColors")) ?? {};
  const figure = defaultFigureParts
    .map((part) => `${stringField(parts[part], `${part}=001`)}/${serializedFigureColor(part, stringField(colors[part]))}`)
    .join("&");
  setTextValues(movie, {
    [registrationTextMembers.figure]: figure
  });
  movie.setProperty("release1EntryFigureField", {
    figure,
    source: sourcePaths.getFigure
  });
  return figure;
}

function initializeRelease1EntryFigureFields(movie: DirectorMovie): void {
  const sourceFigure = readSourceFigureField(movie);
  const initializedFrom = stringField(movie.getProperty("release1EntryFigureInitializedFrom"));
  if (sourceFigure.length > 0 && sourceFigure !== initializedFrom) {
    const parsed = parseNativeFigureString(sourceFigure);
    movie.setProperty("release1EntryFigureParts", parsed.parts);
    movie.setProperty("release1EntryFigureColors", parsed.colors);
    movie.setProperty("release1EntryFigureInitializedFrom", sourceFigure);
    movie.setProperty("release1EntryFigureSource", {
      mode: "source-figure",
      source: sourcePaths.partChanger
    });
  } else if (movie.getProperty("release1EntryFigureParts") === undefined) {
    initializeRelease1EntryFigureSourceState(movie);
    movie.setProperty("release1EntryFigureSource", {
      mode: "source-default",
      source: sourcePaths.figureLoop
    });
  }

  initializePartChangerStates(movie);
  applyRelease1EntryFigureField(movie);
}

function activateFigureArrow(movie: DirectorMovie, channel: number, behaviorName: "changePart_btn" | "changeColor_btn"): boolean {
  initializePartChangerStates(movie);
  const buttonBehavior = activeBehaviorByNameAndChannel(movie, behaviorName, channel);
  const props = buttonBehavior?.properties;
  if (!props) {
    return false;
  }

  const targets = [numberProperty(props.sprSmall), numberProperty(props.sprBig)]
    .filter((target): target is number => target !== undefined && target > 0);
  if (targets.length === 0) {
    return false;
  }

  let changed = false;
  for (const target of targets) {
    const changer = findPartChangerForSprite(movie, target);
    if (!changer) {
      continue;
    }

    if (behaviorName === "changePart_btn") {
      changePart(changer, Boolean(numberProperty(props.rightArrow)));
    } else {
      changeColor(changer, Boolean(numberProperty(props.rightArrow)));
    }
    applyPartChangerToSprites(movie, changer);
    applyPartChangerToFigureData(movie, changer);
    changed = true;
  }

  if (changed) {
    applyPartChangerPreviewPlacements(movie, Object.values(readPartChangerStates(movie)).filter((state) => state.frame === movie.currentFrameIndex));
    writePartChangerStates(movie, readPartChangerStates(movie));
    applyRelease1EntryFigureField(movie);
    movie.debugLog.add("login", "info", `release1 figure arrow ${behaviorName} channel=${channel}`);
  }

  return changed;
}

function initializePartChangerStates(movie: DirectorMovie): void {
  const existing = readPartChangerStates(movie);
  const additions = collectSkinPartAdditions(movie);
  let changed = false;
  const currentStates: PartChangerState[] = [];

  for (const behavior of activeBehaviorsByName(movie, "PartChanger_behavior")) {
    const existingState = existing[String(behavior.channel)];
    if (existingState?.frame === movie.currentFrameIndex) {
      currentStates.push(existingState);
      continue;
    }

    const state = createPartChangerState(movie, behavior, additions);
    if (state) {
      existing[String(behavior.channel)] = state;
      currentStates.push(state);
      changed = true;
    }
  }

  ensurePartChangerPreviewPlacementAnchors(movie, currentStates);
  for (const state of currentStates) {
    applyPartChangerToSprites(movie, state);
  }

  if (changed) {
    writePartChangerStates(movie, existing);
  }
  applyPartChangerPreviewPlacements(movie, currentStates);
}

function createPartChangerState(
  movie: DirectorMovie,
  behavior: DirectorBehaviorInterval,
  additions: Map<number, { readonly parts: readonly string[]; readonly sprs: readonly number[] }>
): PartChangerState | undefined {
  const props = behavior.properties;
  if (!props) {
    return undefined;
  }

  const myField = stringProperty(props.myField);
  const myParts = listProperty(props.myParts);
  const mySprs = numberListProperty(props.mySprs);
  if (!myField || myParts.length === 0 || mySprs.length === 0) {
    return undefined;
  }

  const specLines = readPartSpecLines(movie, myField);
  const spec = readPartSpec(specLines, 1);
  const sourceOffset = resolveSourceTargetOffset(movie, behavior.channel, myParts, mySprs);
  const matchedExtra = findSkinPartAdditionForBehavior(behavior.channel, mySprs, additions);
  const state: PartChangerState = {
    frame: movie.currentFrameIndex,
    sourceChannel: behavior.channel,
    myField,
    myParts,
    mySprs,
    resolvedMySprs: resolvePartChangerSpriteTargets(movie, behavior.channel, myParts, mySprs, sourceOffset),
    mag: Boolean(numberProperty(props.mag)),
    myPreviewSprite: numberProperty(props.myPreviewSprite) ?? 0,
    addParts: matchedExtra?.parts ?? [],
    addSprs: matchedExtra?.sprs ?? [],
    resolvedAddSprs: resolvePartChangerSpriteTargets(movie, behavior.channel, matchedExtra?.parts ?? [], matchedExtra?.sprs ?? [], sourceOffset),
    currPartNum: 1,
    currColorNum: 1,
    currPartNums: spec.partNums,
    allColors: spec.colors,
    currColorRgb: spec.colors[0] ?? "255,255,255",
    specLines
  };
  initializePartChangerFromCurrentFigure(movie, state);
  return state;
}

function collectSkinPartAdditions(movie: DirectorMovie): Map<number, { readonly parts: readonly string[]; readonly sprs: readonly number[] }> {
  const additions = new Map<number, { readonly parts: readonly string[]; readonly sprs: readonly number[] }>();
  for (const behavior of activeBehaviorsByName(movie, "skinPartChanger")) {
    const props = behavior.properties;
    const target = numberProperty(props?.sprto);
    if (target === undefined) {
      continue;
    }

    additions.set(target, {
      parts: listProperty(props?.parts),
      sprs: numberListProperty(props?.sprs)
    });
  }
  return additions;
}

function findSkinPartAdditionForBehavior(
  behaviorChannel: number,
  mySprs: readonly number[],
  additions: Map<number, { readonly parts: readonly string[]; readonly sprs: readonly number[] }> | undefined
): SkinPartAddition | undefined {
  if (!additions) {
    return undefined;
  }

  const direct = additions.get(behaviorChannel);
  if (direct) {
    return {
      target: behaviorChannel,
      parts: direct.parts,
      sprs: direct.sprs
    };
  }

  for (const target of mySprs) {
    const sourceTarget = additions.get(target);
    if (sourceTarget) {
      return {
        target,
        parts: sourceTarget.parts,
        sprs: sourceTarget.sprs
      };
    }
  }

  return undefined;
}

function changePart(state: PartChangerState, rightArrow: boolean): void {
  const totalParts = Math.max(1, statePartSpecsCount(state));
  state.currPartNum += rightArrow ? 1 : -1;
  if (state.currPartNum < 1) {
    state.currPartNum = totalParts;
  } else if (state.currPartNum > totalParts) {
    state.currPartNum = 1;
  }

  const spec = readPartSpec(state.specLines, state.currPartNum);
  state.currPartNums = spec.partNums;
  state.currColorNum = 1;
  state.allColors = spec.colors;
  state.currColorRgb = spec.colors[0] ?? "255,255,255";
}

function changeColor(state: PartChangerState, rightArrow: boolean): void {
  const colorCount = Math.max(1, state.allColors.length);
  state.currColorNum += rightArrow ? 1 : -1;
  if (state.currColorNum < 1) {
    state.currColorNum = colorCount;
  } else if (state.currColorNum > colorCount) {
    state.currColorNum = 1;
  }
  state.currColorRgb = state.allColors[state.currColorNum - 1] ?? "255,255,255";
}

function readPartSpec(lines: readonly string[], oneBasedPart: number): { readonly partNums: string[]; readonly colors: string[] } {
  const line = lines[Math.max(0, Math.min(lines.length - 1, oneBasedPart - 1))] ?? "";
  return parsePartSpecLine(line);
}

function statePartSpecsCount(state: PartChangerState): number {
  return Math.max(1, state.specLines.length);
}

function readPartSpecLines(movie: DirectorMovie, myField: string): readonly string[] {
  const sex = readFigureSex(movie);
  const member = movie.cast.getMemberByName(`${myField}_specs_${sex}`);
  const lines = member?.text?.split(/\r\n|\r|\n/).filter((line) => line.length > 0) ?? [];
  return getRelease1FigureSpecLines(
    movie,
    stringField(movie.getProperty("release1EntryFigureRelease"), "release1_roseau_dcr0910-habbo_entry"),
    myField,
    sex,
    readCurrentPartChangerParts(movie, myField),
    lines
  );
}

function parsePartSpecLine(line: string): { readonly partNums: string[]; readonly colors: string[] } {
  const [parts = "", colorText = ""] = line.split("/", 2);
  const partNums = parts.split(",").map((part) => part.trim()).filter((part) => part.length > 0);
  const colors = colorText.length > 0
    ? colorText.split("&").map((color) => color.trim()).filter((color) => color.length > 0)
    : ["255,255,255"];
  return {
    partNums: partNums.length > 0 ? partNums : ["1"],
    colors: colors.length > 0 ? colors : ["255,255,255"]
  };
}

function readCurrentPartChangerParts(movie: DirectorMovie, myField: string): readonly string[] {
  for (const behavior of activeBehaviorsByName(movie, "PartChanger_behavior")) {
    const props = behavior.properties;
    if (stringProperty(props?.myField)?.toLowerCase() === myField.toLowerCase()) {
      return listProperty(props?.myParts);
    }
  }
  return [myField];
}

function applyPartChangerToSprites(movie: DirectorMovie, state: PartChangerState): void {
  state.myParts.forEach((part, index) => {
    const spriteNumber = state.resolvedMySprs[index] ?? state.mySprs[index];
    const partNumber = padPartNumber(state.currPartNums[index] ?? state.currPartNums[0] ?? "1");
    setSpriteMemberByChannel(movie, spriteNumber, `h_std_${part}_${partNumber}_2_0`, state.mag ? 2 : 1, state.mag && part !== "ey" ? state.currColorRgb : undefined);
    if (state.mag && part !== "ey") {
      setSpriteBackgroundByChannel(movie, state.myPreviewSprite, state.currColorRgb);
    }
  });

  if (state.mag && state.addSprs.length > 0) {
    state.addParts.forEach((part, index) => {
      const spriteNumber = state.resolvedAddSprs[index] ?? state.addSprs[index];
      setSpriteBackgroundByChannel(movie, spriteNumber, state.currColorRgb);
      if (part) {
        applyFigureColor(movie, part, state.currColorRgb);
      }
    });
  }

}

function applyPartChangerToFigureData(movie: DirectorMovie, state: PartChangerState): void {
  state.myParts.forEach((part, index) => {
    const partNumber = padPartNumber(state.currPartNums[index] ?? state.currPartNums[0] ?? "1");
    applyFigurePart(movie, part, `${part}=${partNumber}`);
    if (state.mag && part !== "ey") {
      applyFigureColor(movie, part, state.currColorRgb);
    }
  });

  if (state.mag) {
    state.addParts.forEach((part) => applyFigureColor(movie, part, state.currColorRgb));
  }
}

function applyFigurePart(movie: DirectorMovie, part: string, value: string): void {
  const parts = readRecord(movie.getProperty("release1EntryFigureParts")) ?? {};
  movie.setProperty("release1EntryFigureParts", {
    ...parts,
    [part]: value
  });
}

function applyFigureColor(movie: DirectorMovie, part: string, value: string): void {
  const colors = readRecord(movie.getProperty("release1EntryFigureColors")) ?? {};
  movie.setProperty("release1EntryFigureColors", {
    ...colors,
    [part]: value
  });
}

function initializeRelease1EntryFigureSourceState(movie: DirectorMovie): void {
  if (movie.getProperty("release1EntryFigureParts") !== undefined) {
    return;
  }

  const parts = Object.fromEntries(defaultFigureParts.map((part) => [part, `${part}=001`]));
  const colors = Object.fromEntries(defaultFigureParts.map((part) => [part, defaultFigureColor(part)]));
  movie.setProperty("release1EntryFigureParts", parts);
  movie.setProperty("release1EntryFigureColors", colors);
}

function ensureRelease1FigureAssetsHydrated(movie: DirectorMovie): void {
  if (movie.getProperty("release1EntryAvatarCastHydration") !== undefined) {
    return;
  }

  hydrateRelease1EntryAvatarCasts(movie, getExternalBitmapAssetSet("release1"));
}

function initializePartChangerFromCurrentFigure(movie: DirectorMovie, state: PartChangerState): void {
  const parts = readRecord(movie.getProperty("release1EntryFigureParts")) ?? {};
  const colors = readRecord(movie.getProperty("release1EntryFigureColors")) ?? {};
  const currentPartNums: string[] = [];
  let currentColor = "";

  for (const part of state.myParts) {
    const partValue = stringField(parts[part]);
    const partId = partValue.includes("=") ? partValue.split("=", 2)[1] ?? "" : partValue;
    currentPartNums.push(normalizePartNumber(partId || "1"));
    const color = normalizeFigureRgb(stringField(colors[part]));
    if (color.length > 0) {
      currentColor = color;
    }
  }

  if (currentPartNums.length === state.myParts.length) {
    const matchingSpecIndex = state.specLines.findIndex((line) => {
      const spec = parsePartSpecLine(line);
      return spec.partNums.length === currentPartNums.length
        && spec.partNums.every((part, index) => normalizePartNumber(part) === normalizePartNumber(currentPartNums[index] ?? ""));
    });
    if (matchingSpecIndex >= 0) {
      const spec = readPartSpec(state.specLines, matchingSpecIndex + 1);
      state.currPartNum = matchingSpecIndex + 1;
      state.currPartNums = spec.partNums;
      state.allColors = spec.colors;
    } else {
      state.currPartNums = currentPartNums;
    }
  }
  if (currentColor.length > 0) {
    state.currColorRgb = currentColor;
    const colorIndex = state.allColors.findIndex((color) => normalizeFigureRgb(color) === currentColor);
    if (colorIndex >= 0) {
      state.currColorNum = colorIndex + 1;
    } else {
      state.allColors = [currentColor, ...state.allColors];
      state.currColorNum = 1;
    }
  }
}

function sourceButtonElement(id: string, channel: SourceChannel, label: string, clientId: string): HabboWindowInteractiveElement {
  return {
    id,
    windowId: "#release1_entry_registration",
    kind: "button",
    ...channel.bounds,
    label,
    cursor: "cursor.finger",
    clientId
  };
}

function sourceChannelByBehaviorName(
  movie: DirectorMovie,
  behaviorName: string,
  predicate?: (candidate: SourceChannel) => boolean
): SourceChannel | undefined {
  return sourceChannelsByBehaviorName(movie, behaviorName).find((candidate) => predicate?.(candidate) ?? true);
}

function sourceChannelsByBehaviorName(movie: DirectorMovie, behaviorName: string): SourceChannel[] {
  const normalizedName = behaviorName.toLowerCase();
  const result: SourceChannel[] = [];
  for (const behavior of movie.score.activeBehaviorIntervals(movie.currentFrameIndex)) {
    const scriptMember = movie.cast.getMember(behavior.script);
    if (scriptMember?.name?.toLowerCase() !== normalizedName) {
      continue;
    }

    const sprite = movie.currentFrame.getSprite(behavior.channel);
    if (sprite) {
      result.push({
        channel: behavior.channel,
        sprite,
        bounds: sourceBoundsForSprite(movie, sprite)
      });
    }
  }

  return result;
}

function channelHasBehavior(movie: DirectorMovie, channel: number, behaviorName: string): boolean {
  return activeBehaviorByNameAndChannel(movie, behaviorName, channel) !== undefined;
}

function activeBehaviorByNameAndChannel(movie: DirectorMovie, behaviorName: string, channel: number): DirectorBehaviorInterval | undefined {
  const normalizedName = behaviorName.toLowerCase();
  return movie.score.activeBehaviorIntervals(movie.currentFrameIndex).find((behavior) => {
    if (behavior.channel !== channel) {
      return false;
    }

    return movie.cast.getMember(behavior.script)?.name?.toLowerCase() === normalizedName;
  });
}

function activeBehaviorsByName(movie: DirectorMovie, behaviorName: string): readonly DirectorBehaviorInterval[] {
  const normalizedName = behaviorName.toLowerCase();
  return movie.score.activeBehaviorIntervals(movie.currentFrameIndex).filter((behavior) =>
    movie.cast.getMember(behavior.script)?.name?.toLowerCase() === normalizedName
  );
}

function findPartChangerForSprite(movie: DirectorMovie, spriteNumber: number): PartChangerState | undefined {
  const states = readPartChangerStates(movie);
  return Object.values(states).find((state) => state.mySprs.includes(spriteNumber))
    ?? Object.values(states).find((state) => state.sourceChannel === spriteNumber)
    ?? Object.values(states).find((state) => state.resolvedMySprs.includes(spriteNumber));
}

function resolveSourceTargetOffset(
  movie: DirectorMovie,
  behaviorChannel: number,
  myParts: readonly string[],
  mySprs: readonly number[]
): number | undefined {
  const behaviorSprite = movie.currentFrame.getSprite(behaviorChannel);
  const behaviorPart = behaviorSprite ? memberFigurePart(movie, behaviorSprite) : undefined;
  if (!behaviorPart) {
    return undefined;
  }

  const index = myParts.findIndex((part) => part.toLowerCase() === behaviorPart.toLowerCase());
  if (index < 0) {
    return undefined;
  }

  const sourceTarget = mySprs[index];
  return sourceTarget === undefined ? undefined : behaviorChannel - sourceTarget;
}

function resolvePartChangerSpriteTargets(
  movie: DirectorMovie,
  behaviorChannel: number,
  parts: readonly string[],
  sourceSprs: readonly number[],
  sourceOffset: number | undefined
): readonly number[] {
  if (parts.length === 0 || sourceSprs.length === 0) {
    return sourceSprs;
  }

  const anchor = movie.currentFrame.getSprite(behaviorChannel);
  const anchorLoc = anchor?.loc;
  return sourceSprs.map((sourceSprite, index) => {
    const part = parts[index] ?? parts[0] ?? "";
    const matchingPartSprite = anchorLoc ? findSpriteChannelForFigurePart(movie, part, anchorLoc, behaviorChannel) : undefined;
    if (matchingPartSprite !== undefined) {
      return matchingPartSprite;
    }
  return sourceOffset !== undefined ? sourceSprite + sourceOffset : sourceSprite;
  });
}

function findSpriteChannelForFigurePart(
  movie: DirectorMovie,
  part: string,
  loc: { readonly x: number; readonly y: number },
  behaviorChannel: number
): number | undefined {
  let best: { readonly channel: number; readonly score: number } | undefined;
  for (const sprite of movie.currentFrame.sprites) {
    if (memberFigurePart(movie, sprite)?.toLowerCase() !== part.toLowerCase()) {
      continue;
    }

    const distance = Math.abs(sprite.loc.x - loc.x) + Math.abs(sprite.loc.y - loc.y);
    if (distance > 6) {
      continue;
    }

    const score = (distance * 1000) + Math.abs(sprite.channel - behaviorChannel);
    if (!best || score < best.score) {
      best = {
        channel: sprite.channel,
        score
      };
    }
  }

  return best?.channel;
}

function memberFigurePart(movie: DirectorMovie, sprite: DirectorSpriteChannel): string | undefined {
  const name = movie.cast.getMember(sprite.member)?.name;
  return name?.match(/^h_std_([a-z]+)_/i)?.[1];
}

function parseNativeFigureString(figure: string): { readonly parts: Record<string, string>; readonly colors: Record<string, string> } {
  const parts = Object.fromEntries(defaultFigureParts.map((part) => [part, `${part}=001`]));
  const colors = Object.fromEntries(defaultFigureParts.map((part) => [part, defaultFigureColor(part)]));
  for (const entry of figure.split("&")) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const [partText = "", colorText = "0"] = trimmed.split("/", 2);
    const [partName = "", rawId = ""] = partText.split("=", 2);
    const normalizedPart = partName.trim().toLowerCase();
    if (!defaultFigureParts.includes(normalizedPart as typeof defaultFigureParts[number])) {
      continue;
    }

    const id = normalizePartNumber(rawId || "1");
    const part = normalizedPart as Release1FigurePart;
    parts[part] = `${part}=${padPartNumber(id)}`;
    colors[part] = serializedFigureColor(part, colorText);
  }
  return { parts, colors };
}

function defaultFigureColor(part: Release1FigurePart): string {
  return sourceFigureDefaultColors[part];
}

function serializedFigureColor(part: Release1FigurePart, value: string | undefined): string {
  const trimmed = stringField(value).trim();
  const normalized = normalizeFigureRgb(trimmed);
  if (normalized.length > 0) {
    return normalized;
  }

  const fallback = defaultFigureColor(part);
  if (fallback === "0" && trimmed === "0") {
    return "0";
  }
  return fallback;
}

function readSourceFigureField(movie: DirectorMovie): string {
  return stringField(movie.cast.getMemberByName(registrationTextMembers.figure)?.text)
    || stringField(movie.getProperty(`fieldText.${registrationTextMembers.figure}`));
}

function sourceBoundsForSprite(movie: DirectorMovie, sprite: DirectorSpriteChannel): Bounds {
  const member = movie.cast.getMember(sprite.member);
  const width = Math.max(1, Math.round(sprite.width ?? member?.width ?? 1));
  const height = Math.max(1, Math.round(sprite.height ?? member?.height ?? 1));
  const sourceWidth = Math.max(1, Math.round(member?.composite?.width ?? member?.width ?? width));
  const sourceHeight = Math.max(1, Math.round(member?.composite?.height ?? member?.height ?? height));
  const regPoint = member?.regPoint ?? { x: 0, y: 0 };
  const scaledRegX = directorInteger((regPoint.x * width) / sourceWidth);
  const scaledRegY = directorInteger((regPoint.y * height) / sourceHeight);
  return {
    x: sprite.loc.x - (sprite.flipH ? width - scaledRegX : scaledRegX),
    y: sprite.loc.y - (sprite.flipV ? height - scaledRegY : scaledRegY),
    width,
    height
  };
}

function applyPartChangerPreviewPlacements(movie: DirectorMovie, states: readonly PartChangerState[]): void {
  const smallStates = states.filter((state) => !state.mag);
  const largeChannels = uniqueNumbers(states
    .filter((state) => state.mag)
    .flatMap((state) => [...state.resolvedMySprs, ...state.resolvedAddSprs]));
  clearSpritePlacementOffsets(movie, [
    ...largeChannels,
    ...smallStates.flatMap((state) => state.resolvedMySprs)
  ]);

  const largeOffset = partChangerPreviewLargeOffset(movie);
  if (largeOffset) {
    for (const channel of largeChannels) {
      setSpritePlacementOffset(movie, channel, largeOffset);
    }
  }

  for (const state of smallStates) {
    const channels = uniqueNumbers(state.resolvedMySprs);
    const groupBounds = boundsForChannels(movie, channels);
    const targetBounds = groupBounds ? closestSourcePreviewBox(movie, groupBounds) : undefined;
    if (!groupBounds || !targetBounds) {
      continue;
    }

    const offset = offsetToCenterInTarget(groupBounds, targetBounds);
    for (const channel of channels) {
      setSpritePlacementOffset(movie, channel, offset);
    }
  }
}

function ensurePartChangerPreviewPlacementAnchors(movie: DirectorMovie, states: readonly PartChangerState[]): void {
  const frame = movie.currentFrameIndex;
  const anchors = readPreviewPlacementAnchors(movie);
  if (anchors[frame]?.largeOffset) {
    return;
  }

  const largeChannels = uniqueNumbers(states
    .filter((state) => state.mag)
    .flatMap((state) => [...state.resolvedMySprs, ...state.resolvedAddSprs]));
  const largeBounds = boundsForChannels(movie, largeChannels);
  const largeTarget = sourceBoundsForMemberName(movie, "character_edit_bg");
  if (!largeBounds || !largeTarget) {
    return;
  }

  movie.setProperty("release1EntryFigurePreviewPlacementAnchors", {
    ...anchors,
    [frame]: {
      largeOffset: offsetToCenterInTarget(largeBounds, largeTarget)
    }
  });
}

function partChangerPreviewLargeOffset(movie: DirectorMovie): { readonly x: number; readonly y: number } | undefined {
  return readPreviewPlacementAnchors(movie)[movie.currentFrameIndex]?.largeOffset;
}

function clearSpritePlacementOffsets(movie: DirectorMovie, channels: readonly number[]): void {
  for (const channel of uniqueNumbers(channels)) {
    setSpritePlacementOffset(movie, channel, undefined);
  }
}

function setSpritePlacementOffset(movie: DirectorMovie, channel: number, offset: { readonly x: number; readonly y: number } | undefined): void {
  const sprite = mutableSprite(movie.currentFrame.getSprite(channel));
  if (sprite) {
    sprite.placementOffset = offset;
  }
}

function offsetToCenterInTarget(source: Bounds, target: Bounds): { readonly x: number; readonly y: number } {
  return {
    x: directorInteger(centerX(target) - centerX(source)),
    y: directorInteger(centerY(target) - centerY(source))
  };
}

function boundsForChannels(movie: DirectorMovie, channels: readonly number[]): Bounds | undefined {
  const bounds = channels
    .map((channel) => {
      const sprite = movie.currentFrame.getSprite(channel);
      return sprite ? sourceBoundsForSprite(movie, sprite) : undefined;
    })
    .filter((entry): entry is Bounds => entry !== undefined);
  if (bounds.length === 0) {
    return undefined;
  }

  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height));
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

function sourceBoundsForMemberName(movie: DirectorMovie, memberName: string): Bounds | undefined {
  const normalized = memberName.toLowerCase();
  const sprite = movie.currentFrame.sprites.find((candidate) =>
    movie.cast.getMember(candidate.member)?.name?.toLowerCase() === normalized
  );
  return sprite ? sourceBoundsForSprite(movie, sprite) : undefined;
}

function closestSourcePreviewBox(movie: DirectorMovie, groupBounds: Bounds): Bounds | undefined {
  const groupCenter = {
    x: centerX(groupBounds),
    y: centerY(groupBounds)
  };
  let best: { readonly bounds: Bounds; readonly score: number } | undefined;
  for (const sprite of movie.currentFrame.sprites) {
    const bounds = sourceBoundsForSprite(movie, sprite);
    if (bounds.width < 40 || bounds.width > 60 || bounds.height < 35 || bounds.height > 55) {
      continue;
    }

    if (centerX(bounds) >= groupCenter.x) {
      continue;
    }

    const yDistance = Math.abs(centerY(bounds) - groupCenter.y);
    if (yDistance > 30) {
      continue;
    }

    const score = (yDistance * 1000) + Math.abs(centerX(bounds) - groupCenter.x);
    if (!best || score < best.score) {
      best = { bounds, score };
    }
  }

  return best?.bounds;
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function centerX(bounds: Bounds): number {
  return bounds.x + (bounds.width / 2);
}

function centerY(bounds: Bounds): number {
  return bounds.y + (bounds.height / 2);
}

function setTextValues(movie: DirectorMovie, values: Record<string, string>): void {
  const fieldValues = readWindowFieldValues(movie);
  for (const [name, text] of Object.entries(values)) {
    setMemberTextByName(movie, name, text);
    movie.setProperty(`fieldText.${name}`, text);
    fieldValues[name] = text;
  }
  movie.setProperty("windowFieldValues", fieldValues);
}

function setMemberTextByName(movie: DirectorMovie, name: string, text: string): void {
  const targetName = name.toLowerCase();
  for (const castLib of movie.cast.castLibs) {
    for (const member of castLib.members) {
      if (member.name?.toLowerCase() === targetName && isTextLikeMember(member)) {
        member.setText(text);
      }
    }
  }
}

function setSpriteMemberByChannel(
  movie: DirectorMovie,
  channel: number | undefined,
  memberName: string,
  scale: number,
  background: string | undefined
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
  const memberWidth = member.width ?? member.composite?.width;
  const memberHeight = member.height ?? member.composite?.height;
  sprite.width = memberWidth !== undefined ? memberWidth * scale : previousWidth;
  sprite.height = memberHeight !== undefined ? memberHeight * scale : previousHeight;
  if (background) {
    sprite.bgColor = rgbCss(background);
  }
}

function setSpriteBackgroundByChannel(movie: DirectorMovie, channel: number | undefined, background: string): void {
  if (channel === undefined) {
    return;
  }

  const sprite = mutableSprite(movie.currentFrame.getSprite(channel));
  if (sprite) {
    sprite.bgColor = rgbCss(background);
  }
}

function readFigureSex(movie: DirectorMovie): "female" | "male" {
  const value = movie.cast.getMemberByName(registrationTextMembers.sex)?.text ?? stringField(movie.getProperty(`fieldText.${registrationTextMembers.sex}`));
  return value.toLowerCase().startsWith("m") ? "male" : "female";
}

function readPartChangerStates(movie: DirectorMovie): Record<string, PartChangerState> {
  const value = readRecord(movie.getProperty("release1EntryFigurePartChangers"));
  return value as Record<string, PartChangerState> | undefined ?? {};
}

function writePartChangerStates(movie: DirectorMovie, states: Record<string, PartChangerState>): void {
  movie.setProperty("release1EntryFigurePartChangers", states);
}

function readPreviewPlacementAnchors(movie: DirectorMovie): Record<string, PreviewPlacementAnchor> {
  const value = readRecord(movie.getProperty("release1EntryFigurePreviewPlacementAnchors"));
  return value as Record<string, PreviewPlacementAnchor> | undefined ?? {};
}

function readWindowFieldValues(movie: DirectorMovie): Record<string, string> {
  const value = readRecord(movie.getProperty("windowFieldValues"));
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function listProperty(value: unknown): string[] {
  return typeof value === "string"
    ? value.split(",").map((part) => part.trim()).filter((part) => part.length > 0)
    : [];
}

function numberListProperty(value: unknown): number[] {
  return listProperty(value)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isInteger(part));
}

function numberProperty(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringProperty(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizePartNumber(value: string): string {
  const numeric = Number.parseInt(value.trim(), 10);
  return Number.isFinite(numeric) ? String(numeric) : value.trim();
}

function normalizeFigureRgb(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === "0") {
    return "";
  }
  if (trimmed.startsWith("*")) {
    return hexColorToRgb(trimmed.slice(1));
  }
  const parts = trimmed.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length >= 3 && parts.slice(0, 3).every((part) => Number.isFinite(part))) {
    return `${parts[0]},${parts[1]},${parts[2]}`;
  }
  return "";
}

function hexColorToRgb(value: string): string {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return "";
  }
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ].join(",");
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function isTextLikeMember(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}

function acceptsMouseDown(activation: HabboWindowElementActivation | undefined): boolean {
  return activation?.event === "mouseDown" || activation?.event === undefined;
}

function padPartNumber(value: string): string {
  return value.padStart(3, "0").slice(-3);
}

function rgbCss(value: string): string {
  const [red = "255", green = "255", blue = "255"] = value.split(",");
  return `#${hexByte(Number.parseInt(red, 10))}${hexByte(Number.parseInt(green, 10))}${hexByte(Number.parseInt(blue, 10))}`;
}

function hexByte(value: number): string {
  return Math.max(0, Math.min(255, Number.isFinite(value) ? value : 255)).toString(16).padStart(2, "0");
}

function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function mutableSprite(sprite: DirectorSpriteChannel | undefined): MutableSpriteChannel | undefined {
  return sprite as unknown as MutableSpriteChannel | undefined;
}

interface MutableSpriteChannel {
  member: DirectorMemberRef;
  width: number | undefined;
  height: number | undefined;
  bgColor: string | undefined;
  placementOffset: { x: number; y: number } | undefined;
}
