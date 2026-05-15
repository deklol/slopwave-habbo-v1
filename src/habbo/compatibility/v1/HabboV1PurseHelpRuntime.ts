import type { DirectorMember, DirectorMovie, DirectorSpriteChannelManifest } from "../../../runtime";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import {
  parseRecordedNavigatorFrame,
  popupContextSourcePath,
  release1FieldText,
  sanitizeElementId,
  type RecordedSprite
} from "./HabboV1NavigatorSource";
import { readRecord } from "./HabboV1EntryRuntime";

const purseHelpWindowId = "#release1_purse_help";
const purseHelpCastName = "navigation";
const purseHelpStartChannel = 851;
const purseHelpEndChannel = 870;
const purseHelpLocZ = 2_130_000_000;
const purseHelpPlace = { x: 0, y: 40 } as const;

export const release1PurseHelpSources = {
  open: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/MovieScript 292 - Purse Or Help Open.ls",
  openPurse: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 290 - openPurse.ls",
  openHelp: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 289 - openHelp.ls",
  close: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 291 - closePurseOrHelp.ls",
  buyCredits: "extracted/projectorrays/release1_roseau_dcr0910/navigation/casts/External/BehaviorScript 296 - BuyCreditsURL.ls",
  walletBalance: "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/MovieScript 1 - Special Scripts.ls"
} as const;

type Release1PurseHelpFrame = "purse" | "helpLinks";

interface Release1PurseHelpAction {
  readonly id: string;
  readonly kind: "close" | "buy-credits";
  readonly event: "mouseUp";
  readonly source: readonly string[];
}

export function openRelease1PurseOrHelp(movie: DirectorMovie, frame: Release1PurseHelpFrame): boolean {
  const current = readRecord(movie.getProperty("release1EntryPurseOrHelpState"));
  if (current?.open === true && String(current.frame ?? "").includes(frame)) {
    closeRelease1PurseOrHelp(movie);
    return true;
  }

  if (frame === "purse") {
    updateRelease1PurseCreditTextsFromState(movie);
  }

  movie.setProperty("release1EntryPurseOrHelpState", {
    open: true,
    frame,
    place: purseHelpPlace,
    channels: [purseHelpStartChannel, purseHelpEndChannel],
    source: [release1PurseHelpSources.open, frame === "purse" ? release1PurseHelpSources.openPurse : release1PurseHelpSources.openHelp]
  });
  movie.debugLog.add(frame === "purse" ? "purse" : "windows", "info", `release1 ${frame === "purse" ? "openPurse" : "openHelp"} displayFrame=${frame}`);
  syncRelease1PurseOrHelp(movie);
  return true;
}

export function closeRelease1PurseOrHelp(movie: DirectorMovie): boolean {
  movie.setProperty("release1EntryPurseOrHelpState", {
    open: false,
    source: release1PurseHelpSources.close
  });
  clearRelease1PurseOrHelp(movie);
  movie.debugLog.add("windows", "info", "release1 closePurseOrHelp");
  return true;
}

export function syncRelease1PurseOrHelp(movie: DirectorMovie): boolean {
  const state = readRecord(movie.getProperty("release1EntryPurseOrHelpState"));
  if (state?.open !== true) {
    clearRelease1PurseOrHelp(movie);
    return false;
  }

  const frame = String(state.frame ?? "");
  if (frame === "purse") {
    updateRelease1PurseCreditTextsFromState(movie);
  }

  const recordedSprites = parseRecordedNavigatorFrame(movie, `${frame}.recorded`, {
    castName: purseHelpCastName,
    startChannel: purseHelpStartChannel,
    locZ: purseHelpLocZ,
    place: purseHelpPlace
  });
  if (recordedSprites.length === 0) {
    movie.setProperty("release1PurseHelpUnsupported", {
      frame,
      source: [release1PurseHelpSources.open, popupContextSourcePath]
    });
    movie.debugLog.add("windows", "warn", `release1 purse/help frame missing ${frame}.recorded`);
    clearRelease1PurseOrHelp(movie);
    return false;
  }

  const visibleSprites = recordedSprites.filter((sprite) => !isRelease1PurseHelpModalBackdrop(movie, sprite));
  const sprites = visibleSprites.map((sprite) => recordedSpriteManifest(movie, sprite));
  setRelease1PurseOrHelpOverlaySprites(movie, sprites);
  syncRelease1PurseOrHelpInteractions(movie, recordedSprites);
  movie.setProperty("release1PurseHelpVisualState", {
    open: true,
    frame,
    spriteCount: visibleSprites.length,
    backingSpriteCount: recordedSprites.length - visibleSprites.length,
    source: [release1PurseHelpSources.open, popupContextSourcePath]
  });
  return true;
}

export function activateRelease1PurseOrHelpElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  const actions = readRelease1PurseHelpActions(movie);
  const action = actions.find((candidate) => candidate.id === elementId);
  if (!action) {
    return false;
  }
  if (activation?.event && activation.event !== action.event) {
    return false;
  }

  if (action.kind === "close") {
    return closeRelease1PurseOrHelp(movie);
  }

  const url = release1BuyCreditsUrl(movie);
  movie.setProperty("release1PurseHelpLastAction", {
    action: "buy-credits",
    url,
    target: "_new",
    source: action.source
  });
  movie.debugLog.add("purse", "info", `release1 BuyCreditsURL ${url}`);
  return true;
}

export function updateRelease1PurseCreditTexts(movie: DirectorMovie, credits: number): void {
  const normalizedCredits = Number.isFinite(credits) ? Math.trunc(credits) : 0;
  const creditLabel = release1FieldText(movie, "Credit(s)", "Habbo Credit(s)");
  const creditsAmount = `You have ${normalizedCredits} Habbo Credits in your purse.`;
  setAllTextMembersByName(movie, "habbo_credits", `${normalizedCredits} ${creditLabel}`);
  setAllTextMembersByName(movie, "credits_amount_e", creditsAmount);
  movie.setProperty("lastPurseBalance", String(normalizedCredits));
  movie.setProperty("release1EntryCredits", {
    credits: normalizedCredits,
    amountText: creditsAmount,
    source: release1PurseHelpSources.walletBalance
  });
}

function updateRelease1PurseCreditTextsFromState(movie: DirectorMovie): void {
  const state = readRecord(movie.getProperty("release1EntryCredits"));
  const stateCredits = typeof state?.credits === "number" ? state.credits : undefined;
  const balanceCredits = Number.parseInt(String(movie.getProperty("lastPurseBalance") ?? ""), 10);
  const credits = stateCredits ?? (Number.isFinite(balanceCredits) ? balanceCredits : 0);
  updateRelease1PurseCreditTexts(movie, credits);
}

function syncRelease1PurseOrHelpInteractions(movie: DirectorMovie, recordedSprites: readonly RecordedSprite[]): void {
  const existing = readInteractiveElements(movie.getProperty("windowInteractiveElements")).filter((element) => !isRelease1PurseHelpElement(element));
  const actions: Release1PurseHelpAction[] = [];
  const elements: HabboWindowInteractiveElement[] = [];

  for (const sprite of recordedSprites) {
    const behaviorNames = sprite.behaviorNames.map((name) => name.toLowerCase());
    const close = behaviorNames.includes("closepurseorhelp");
    const buyCredits = behaviorNames.includes("buycreditsurl");
    if (!close && !buyCredits) {
      continue;
    }

    const kind = close ? "close" : "buy-credits";
    const behaviorName = close ? "closePurseOrHelp" : "BuyCreditsURL";
    const id = `release1_purse_help_${sanitizeElementId(kind)}_${sprite.channel}`;
    const source = close
      ? [release1PurseHelpSources.close, release1PurseHelpSources.open, popupContextSourcePath]
      : [release1PurseHelpSources.buyCredits, release1PurseHelpSources.open, popupContextSourcePath];
    actions.push({
      id,
      kind,
      event: "mouseUp",
      source
    });
    elements.push({
      id,
      windowId: purseHelpWindowId,
      kind: "link",
      x: sprite.loc.x,
      y: sprite.loc.y,
      width: sprite.width,
      height: sprite.height,
      label: behaviorName,
      cursor: "cursor.finger",
      clientId: behaviorName
    });
  }

  movie.setProperty("release1PurseHelpActions", actions);
  movie.setProperty("windowInteractiveElements", [...existing, ...elements]);
}

function readRelease1PurseHelpActions(movie: DirectorMovie): readonly Release1PurseHelpAction[] {
  const actions = movie.getProperty("release1PurseHelpActions");
  return Array.isArray(actions) ? actions.filter(isRelease1PurseHelpAction) : [];
}

function isRelease1PurseHelpAction(value: unknown): value is Release1PurseHelpAction {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && (record.kind === "close" || record.kind === "buy-credits")
    && record.event === "mouseUp"
    && Array.isArray(record.source);
}

function setRelease1PurseOrHelpOverlaySprites(movie: DirectorMovie, sprites: readonly DirectorSpriteChannelManifest[]): void {
  movie.setProperty("windowOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isRelease1PurseHelpSprite(sprite)),
    ...sprites
  ]);
  movie.setProperty("directorOverlaySprites", [
    ...readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isRelease1PurseHelpSprite(sprite)),
    ...sprites
  ]);
}

function clearRelease1PurseOrHelp(movie: DirectorMovie): void {
  movie.setProperty("windowOverlaySprites", readSpriteManifests(movie.getProperty("windowOverlaySprites")).filter((sprite) => !isRelease1PurseHelpSprite(sprite)));
  movie.setProperty("directorOverlaySprites", readSpriteManifests(movie.getProperty("directorOverlaySprites")).filter((sprite) => !isRelease1PurseHelpSprite(sprite)));
  movie.setProperty("windowInteractiveElements", readInteractiveElements(movie.getProperty("windowInteractiveElements")).filter((element) => !isRelease1PurseHelpElement(element)));
  movie.setProperty("release1PurseHelpActions", []);
  movie.setProperty("release1PurseHelpVisualState", undefined);
}

function recordedSpriteManifest(movie: DirectorMovie, sprite: RecordedSprite): DirectorSpriteChannelManifest {
  const member = movie.cast.getMember(sprite.member);
  const textColorSource = isTextLikeMember(member) && sprite.fgColor ? "sprite" : undefined;
  return {
    channel: sprite.channel,
    member: sprite.member,
    loc: sprite.loc,
    locZ: sprite.locZ,
    ink: sprite.ink,
    blend: sprite.blend,
    width: sprite.width,
    height: sprite.height,
    ...(sprite.fgColor ? { fgColor: sprite.fgColor } : {}),
    ...(sprite.bgColor ? { bgColor: sprite.bgColor } : {}),
    ...(textColorSource ? { textColorSource } : {})
  };
}

function isRelease1PurseHelpModalBackdrop(movie: DirectorMovie, sprite: RecordedSprite): boolean {
  const member = movie.cast.getMember(sprite.member);
  return member?.name?.toLowerCase() === "harmaa"
    && sprite.width >= 700
    && sprite.height >= 500
    && sprite.loc.x <= 0
    && sprite.loc.y <= 40;
}

function release1BuyCreditsUrl(movie: DirectorMovie): string {
  const userObject = readRecord(movie.getProperty("release1EntryUserObject"));
  const globals = readRecord(movie.getProperty("release1EntryGlobals"));
  const userName = firstNonEmptyString(globals?.gMyName, globals?.gLoginName, userObject?.name);
  return `http://www.habbohotel.com/purchase.jsp?userName=${encodeURIComponent(userName)}`;
}

function firstNonEmptyString(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function setAllTextMembersByName(movie: DirectorMovie, memberName: string, text: string): void {
  let changed = 0;
  for (const castLib of movie.cast.castLibs) {
    for (const member of castLib.members) {
      if (member.name?.toLowerCase() !== memberName.toLowerCase() || !isTextLikeMember(member)) {
        continue;
      }
      member.setText(text);
      changed += 1;
    }
  }
  if (changed === 0) {
    movie.debugLog.add("purse", "warn", `release1 missing text member ${memberName}`);
  }
}

function isTextLikeMember(member: DirectorMember | undefined): member is DirectorMember {
  return member?.type === "text" || member?.type === "field";
}

function isRelease1PurseHelpSprite(sprite: DirectorSpriteChannelManifest): boolean {
  return sprite.channel >= purseHelpStartChannel && sprite.channel <= purseHelpEndChannel;
}

function isRelease1PurseHelpElement(element: HabboWindowInteractiveElement): boolean {
  return element.id.startsWith("release1_purse_help_") || element.windowId === purseHelpWindowId;
}

function readSpriteManifests(value: unknown): readonly DirectorSpriteChannelManifest[] {
  return Array.isArray(value) ? value.filter(isDirectorSpriteChannelManifest) : [];
}

function isDirectorSpriteChannelManifest(value: unknown): value is DirectorSpriteChannelManifest {
  const record = readRecord(value);
  return typeof record?.channel === "number";
}

function readInteractiveElements(value: unknown): readonly HabboWindowInteractiveElement[] {
  return Array.isArray(value) ? value.filter(isInteractiveElement) : [];
}

function isInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  const record = readRecord(value);
  return typeof record?.id === "string"
    && typeof record.windowId === "string"
    && typeof record.kind === "string";
}
