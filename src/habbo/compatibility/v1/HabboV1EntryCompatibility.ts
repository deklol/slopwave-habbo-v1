import type { DirectorMember, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";
import { normalizeBadgeId } from "../../room/HabboRoomSelection";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { showRelease1EntryAlert } from "./HabboV1EntryAlerts";
import { syncRelease1EntryForgotPasswordInteractions } from "./HabboV1EntryForgotPassword";
import {
  readRelease1EntryLoginFields,
  syncRelease1EntryLoginInteractions
} from "./HabboV1EntryLogin";
import {
  enterRelease1EntryRegistrationForm,
  enterRelease1EntryUpdateForm,
  syncRelease1EntryRegistrationInteractions
} from "./HabboV1EntryRegistration";
import { release1EntrySourcePaths as sourcePaths } from "./HabboV1EntrySources";
import {
  clearRelease1EntryInteractions,
  goToMarkerIfPresent,
  isRelease1EntryMovie,
  readRecord,
  readRelease1EntryGlobals,
  setMemberTextByName,
  setRelease1EpConnectionState,
  sourceChannelsByBehaviorName
} from "./HabboV1EntryRuntime";
import {
  activateRelease1EntryNavigatorElement,
  closeRelease1EntryNavigator,
  openRelease1EntryNavigator,
  syncRelease1EntryNavigator,
  syncRelease1EntryNavigatorInteractions
} from "./HabboV1Navigator";
import {
  activateRelease1PurseOrHelpElement,
  openRelease1PurseOrHelp,
  syncRelease1PurseOrHelp,
  updateRelease1PurseCreditTexts
} from "./HabboV1PurseHelpRuntime";

export function syncRelease1EntryInteractions(movie: DirectorMovie, release: string): boolean {
  if (movie.getProperty("alertWindowVisible") === true) {
    return false;
  }

  return syncRelease1EntryLoginInteractions(movie, release)
    || syncRelease1EntryForgotPasswordInteractions(movie, release)
    || syncRelease1EntryRegistrationInteractions(movie, release)
    || syncRelease1EntryHotelInteractions(movie, release);
}

export function completeRelease1EntryLoginFromUserObject(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const fields = parseKeyValueLines(body);
  const userName = fields.name ?? String(readRelease1EntryGlobals(movie).gLoginName ?? "");
  movie.setProperty("release1EntryUserObject", {
    ...fields,
    source: sourcePaths.epConnectionScripts
  });
  if (fields.figure) {
    movie.setProperty("release1EntryFigureParts", undefined);
    movie.setProperty("release1EntryFigureColors", undefined);
    movie.setProperty("release1EntryFigureInitializedFrom", undefined);
    movie.setProperty("release1EntryFigurePartChangers", undefined);
  }
  applyRelease1UserObjectBadgeState(movie, fields);
  if (userName) {
    movie.setProperty("release1EntryGlobals", {
      ...readRelease1EntryGlobals(movie),
      gMyName: userName
    });
  }
  if (isRelease1EntryUpdateRetrievePending(movie)) {
    enterRelease1EntryUpdateForm(movie, fields);
    clearRelease1EntryInteractions(movie);
    movie.setProperty("release1EntryUpdateInfoRequest", {
      ...(readRecord(movie.getProperty("release1EntryUpdateInfoRequest")) ?? {}),
      status: "received",
      source: sourcePaths.changeReg,
      responseSource: sourcePaths.epConnectionScripts
    });
    movie.debugLog.add("login", "ok", `release1 USEROBJECT filled update details user=${fields.name ?? "unknown"} frame=change1`);
    return true;
  }
  movie.setProperty("release1EntryPostLoginFlow", {
    action: "post-login welcome timeline",
    currentFrame: movie.currentFrameIndex,
    source: [
      "tmp/reference-repos/habbo_src/release1/MessengerScript/Cast External BehaviorScript 48 - Get user info.ls",
      "tmp/reference-repos/habbo_src/release1/habbo_entry/Cast Internal BehaviorScript 239 - Wait MyFigureData.ls",
      "tmp/reference-repos/habbo_src/release1/habbo_entry/Cast Internal BehaviorScript 241 - Set User Avatar Parts.ls",
      "tmp/reference-repos/habbo_src/release1/habbo_entry/Cast Internal BehaviorScript 7 - Init Welcome text.ls",
      "tmp/reference-repos/habbo_src/release1/MessengerScript/Cast External BehaviorScript 29.ls",
      "tmp/reference-repos/habbo_src/release1/GoldFish/Cast External BehaviorScript 41.ls"
    ]
  });
  if (fields.name) {
    setMemberTextByName(movie, "charactername_field", fields.name);
    setMemberTextByName(movie, "character_info_name", fields.name);
    setMemberTextByName(movie, "welcomeText", `Welcome to Habbo Hotel,\r${fields.name}`);
  }
  if (fields.figure) {
    setMemberTextByName(movie, "figure_field", fields.figure);
  }
  if (fields.customData) {
    setMemberTextByName(movie, "character_info_desc", fields.customData);
  }
  movie.setProperty("release1EntryMyFigureData", {
    ready: true,
    figure: fields.figure ?? "",
    source: sourcePaths.epConnectionScripts
  });
  if (movie.currentFrameIndex < 45 || movie.currentFrameIndex > 74) {
    movie.go(45);
  }
  clearRelease1EntryInteractions(movie);
  movie.debugLog.add("login", "ok", `release1 USEROBJECT completed user info user=${fields.name ?? "unknown"} frame=welcome-sequence`);
  return true;
}

export function completeRelease1EntryEnterpriseError(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const lowerContent = body.toLowerCase();
  if (lowerContent.includes("login incorrect")) {
    showRelease1EntryAlert(movie, "WrongPassword", undefined, body);
    goToMarkerIfPresent(movie, "sendMyPassword");
    clearRelease1EntryInteractions(movie);
    movie.setProperty("release1EntryEpLogin", {
      ...(readRecord(movie.getProperty("release1EntryEpLogin")) ?? {}),
      status: "error",
      error: "login incorrect",
      source: sourcePaths.epConnectionScripts
    });
    movie.debugLog.add("login", "warn", "release1 ERROR login incorrect; routed to sendMyPassword");
    return true;
  }

  if (lowerContent.includes("version not correct")) {
    const message = "Too old client version, please reload page!\rClear browser's cache if necessary.";
    showRelease1EntryAlert(movie, message, undefined, body);
    movie.debugLog.add("server", "warn", "release1 ERROR version not correct");
    return true;
  }

  if (lowerContent.includes("inproper") && !lowerContent.includes("warning")) {
    goToMarkerIfPresent(movie, "public_places");
    movie.setProperty("release1EntryBannedPopup", {
      frame: "banned",
      body,
      source: sourcePaths.epConnectionScripts
    });
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "warn", "release1 ERROR inproper behavior; routed to public_places banned context");
    return true;
  }

  if (lowerContent.includes("user exists")) {
    showRelease1EntryAlert(movie, "NameAlreadyUse", undefined, body);
    setMemberTextByName(movie, "charactername_field", "");
    goToMarkerIfPresent(movie, "figure");
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "warn", "release1 ERROR user exists; routed to figure");
    return true;
  }

  return false;
}

export function completeRelease1EntrySystemBroadcast(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const message = firstNonEmptyLine(body);
  showRelease1EntryAlert(movie, "MessageFromAdmin", message, body, [sourcePaths.fuseMain]);
  movie.setProperty("release1EntrySystemBroadcast", {
    message,
    body,
    source: sourcePaths.fuseMain
  });
  movie.debugLog.add("server", "warn", "release1 SYSTEMBROADCAST surfaced through MessageFromAdmin");
  return true;
}

export function completeRelease1EntryWalletBalance(movie: DirectorMovie, body: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const credits = Number.parseInt(body.replace(/^[\r\n]+/, "").trim(), 10);
  if (!Number.isFinite(credits)) {
    return false;
  }

  updateRelease1PurseCreditTexts(movie, credits);
  movie.debugLog.add("purse", "ok", `release1 WALLETBALANCE credits=${credits}`);
  return true;
}

export function advanceRelease1EntryPostLoginTimeline(movie: DirectorMovie, release: string, deltaMs: number): boolean {
  if (!isRelease1EntryMovie(movie) || !release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  if (advanceRelease1EntryWelcomeTimeline(movie, deltaMs)) {
    return true;
  }

  return advanceRelease1EntryHotelTimeline(movie, deltaMs);
}

export function advanceRelease1EntryConnectionFlow(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie) || !release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const globals = readRelease1EntryGlobals(movie);
  const goTo = typeof globals.gGoTo === "string" ? globals.gGoTo : "";
  if (goTo !== "login" && goTo !== "register" && goTo !== "forgottenPassword") {
    return false;
  }

  const waitFrame = findSourceBehaviorFrame(movie, "EPConnectionWait");
  const connectFrame = movie.score.getMarker("connectloop")?.frame ?? waitFrame;
  if (waitFrame === undefined || connectFrame === undefined) {
    return false;
  }

  const earliestConnectionFrame = goTo === "forgottenPassword" ? connectFrame - 1 : connectFrame;
  if (movie.currentFrameIndex < earliestConnectionFrame || movie.currentFrameIndex > waitFrame) {
    return false;
  }

  if (movie.currentFrameIndex < waitFrame) {
    movie.go(waitFrame);
    movie.debugLog.add("login", "info", `release1 connectloop advanced to EPConnectionWait frame=${waitFrame}`);
    return true;
  }

  setRelease1EpConnectionState(movie, {
    ok: true,
    secured: true,
    source: sourcePaths.epConnectionWait
  });

  if (goTo === "register") {
    enterRelease1EntryRegistrationForm(movie);
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "info", "release1 EPConnectionWait action=regist");
    return true;
  }

  if (goTo === "forgottenPassword") {
    goToMarkerIfPresent(movie, "sendMyPassword");
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "info", "release1 EPConnectionWait action=sendMyPassword");
    return true;
  }

  const fields = readRelease1EntryLoginFields(movie);
  movie.setProperty("release1EntryEpLogin", {
    command: "LOGIN",
    username: fields.username,
    passwordLength: fields.password.length,
    source: sourcePaths.epConnectionWait,
    connectionSource: sourcePaths.epConnectionScripts
  });
  movie.go(movie.currentFrameIndex + 1);
  clearRelease1EntryInteractions(movie);
  movie.debugLog.add("login", "info", `release1 EPConnectionWait action=epLogin user=${fields.username} passwordLength=${fields.password.length}`);
  return true;
}

export function activateRelease1EntryHotelElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (activateRelease1EntryNavigatorElement(movie, elementId, activation)) {
    return true;
  }

  if (activateRelease1PurseOrHelpElement(movie, elementId, activation)) {
    return true;
  }

  if (activation?.event === "mouseDown") {
    return false;
  }

  if (isRelease1PrivateRoomToolbarElement(elementId)) {
    return false;
  }

  if (elementId.startsWith("release1_open_navigator_")) {
    return openRelease1EntryNavigator(movie, sourcePaths.openNavigator);
  }

  if (elementId.startsWith("release1_open_purse_")) {
    return openRelease1PurseOrHelp(movie, "purse");
  }

  if (elementId.startsWith("release1_open_help_")) {
    return openRelease1PurseOrHelp(movie, "helpLinks");
  }

  if (elementId.startsWith("release1_open_messenger_")) {
    movie.setProperty("release1EntryMessengerState", {
      open: true,
      frame: "main",
      source: sourcePaths.openMessenger
    });
    movie.debugLog.add("entry", "info", "release1 openMessenger displayFrame=main");
    return true;
  }

  if (elementId.startsWith("release1_change_habbo_")) {
    closeRelease1EntryNavigator(movie);
    enterRelease1EntryUpdateForm(movie);
    clearRelease1EntryInteractions(movie);
    const credentials = readRelease1UpdateCredentials(movie);
    movie.setProperty("release1EntryChangeHabboState", {
      frame: "change1",
      source: sourcePaths.changeReg
    });
    if (credentials.username && credentials.password) {
      movie.setProperty("release1EntryUpdateInfoRequest", {
        command: "INFORETRIEVE",
        username: credentials.username,
        password: credentials.password,
        status: "pending",
        source: sourcePaths.changeReg
      });
    }
    movie.debugLog.add("entry", "info", "release1 change reg action=change1");
    return true;
  }

  return false;
}

function isRelease1PrivateRoomToolbarElement(elementId: string): boolean {
  return elementId.startsWith("release1_open_navigator_room_")
    || elementId.startsWith("release1_open_messenger_room_")
    || elementId.startsWith("release1_open_purse_room_")
    || elementId.startsWith("release1_open_help_room_");
}

function isRelease1EntryUpdateRetrievePending(movie: DirectorMovie): boolean {
  const request = readRecord(movie.getProperty("release1EntryUpdateInfoRequest"));
  return request?.command === "INFORETRIEVE" && request.status !== "received";
}

function readRelease1UpdateCredentials(movie: DirectorMovie): { readonly username: string; readonly password: string } {
  const globals = readRelease1EntryGlobals(movie);
  const loginFields = readRelease1EntryLoginFields(movie);
  const userObject = readRecord(movie.getProperty("release1EntryUserObject")) ?? {};
  const username = stringValue(globals.gLoginName)
    || stringValue(userObject.name)
    || loginFields.username;
  const password = stringValue(globals.gLoginPw)
    || loginFields.password
    || memberTextByName(movie, "loginpw");
  return { username, password };
}

function memberTextByName(movie: DirectorMovie, name: string): string {
  const member = movie.cast.getMemberByName(name);
  return member?.text ?? "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function advanceRelease1EntryWelcomeTimeline(movie: DirectorMovie, deltaMs: number): boolean {
  if (movie.currentFrameIndex < 45 || movie.currentFrameIndex > 74) {
    return false;
  }

  if (!shouldAdvanceRelease1TimelineFrame(movie, "release1EntryWelcomeTimelineClock", deltaMs)) {
    return false;
  }

  if (movie.currentFrameIndex === 45 && !readRecord(movie.getProperty("release1EntryMyFigureData"))?.ready) {
    movie.setProperty("release1EntryWelcomeTimeline", {
      frame: 45,
      waitingFor: "MyfigureColorList/MyfigurePartList",
      source: sourcePaths.waitMyFigureData
    });
    return false;
  }

  if (movie.currentFrameIndex === 52) {
    movie.setProperty("release1EntryAvatarPartTimeline", {
      action: "Set User Avatar Parts",
      source: sourcePaths.setUserAvatarParts
    });
  }

  if (movie.currentFrameIndex >= 53 && movie.currentFrameIndex <= 74) {
    const user = readRecord(movie.getProperty("release1EntryUserObject"))?.name;
    if (typeof user === "string" && user.length > 0) {
      setMemberTextByName(movie, "welcomeText", `Welcome to Habbo Hotel,\r${user}`);
    }
    movie.setProperty("release1EntryWelcomeTimeline", {
      frame: movie.currentFrameIndex,
      action: "welcome wave",
      source: [sourcePaths.initWelcomeText, sourcePaths.welcomeWave]
    });
  }

  if (movie.currentFrameIndex === 74) {
    goToMarkerIfPresent(movie, "hotel");
    movie.setProperty("release1EntryWelcomeTimeline", {
      frame: 74,
      action: "gotoFrame(\"hotel\")",
      source: sourcePaths.gotoHotel
    });
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "info", "release1 welcome timeline reached hotel marker");
    return true;
  }

  const advanced = movie.advanceFrame(false);
  if (advanced) {
    clearRelease1EntryInteractions(movie);
  }
  return advanced;
}

function advanceRelease1EntryHotelTimeline(movie: DirectorMovie, deltaMs: number): boolean {
  if (movie.currentFrameIndex < 103 || movie.currentFrameIndex > 140) {
    return false;
  }

  if (movie.currentFrameIndex === 140) {
    movie.setProperty("release1EntryHotelLoop", {
      frame: 140,
      source: sourcePaths.hotelLoop
    });
    return false;
  }

  if (!shouldAdvanceRelease1TimelineFrame(movie, "release1EntryHotelTimelineClock", deltaMs)) {
    return false;
  }

  if (movie.currentFrameIndex === 139) {
    const units = readRelease1PublicUnits(movie);
    const navigatorState = readRecord(movie.getProperty("release1EntryNavigatorState"));
    if (navigatorState?.open === true || units.length > 0) {
      if (navigatorState?.open !== true) {
        openRelease1EntryNavigator(movie, sourcePaths.openNavigatorLoop);
      }
      movie.go(140);
      movie.debugLog.add("navigator", "info", `release1 OPENnavigator advanced with units=${units.length}`);
      return true;
    }

    movie.setProperty("release1EntryNavigatorWait", {
      frame: 139,
      waitingFor: "gUnits",
      source: sourcePaths.openNavigatorLoop
    });
    return false;
  }

  const advanced = movie.advanceFrame(false);
  if (advanced && movie.currentFrameIndex === 110) {
    movie.setProperty("release1EntryInitUnitListenerRequest", {
      command: "INITUNITLISTENER",
      status: "source-frame-reached",
      source: sourcePaths.initUnitInfoListening
    });
    movie.debugLog.add("navigator", "info", "release1 reached Init Unit Info Listening frame");
  }
  return advanced;
}

function shouldAdvanceRelease1TimelineFrame(movie: DirectorMovie, clockKey: string, deltaMs: number): boolean {
  const frameDurationMs = 1000 / Math.max(1, movie.tempo);
  const state = readRecord(movie.getProperty(clockKey));
  const previousElapsed = typeof state?.elapsedMs === "number" ? state.elapsedMs : 0;
  const elapsedMs = previousElapsed + Math.max(0, deltaMs);
  if (elapsedMs + 0.001 < frameDurationMs) {
    movie.setProperty(clockKey, {
      elapsedMs
    });
    return false;
  }

  movie.setProperty(clockKey, {
    elapsedMs: elapsedMs - frameDurationMs
  });
  return true;
}

function syncRelease1EntryHotelInteractions(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie) || !release.startsWith("release1_roseau_dcr0910") || movie.currentFrameIndex < 103 || movie.currentFrameIndex > 142) {
    return false;
  }

  const elements: HabboWindowInteractiveElement[] = [
    ...hotelElementsByBehaviorName(movie, "openNavigator", "release1_open_navigator", "Open Navigator"),
    ...hotelElementsByBehaviorName(movie, "openPurse", "release1_open_purse", "Purse"),
    ...hotelElementsByBehaviorName(movie, "openHelp", "release1_open_help", "Help"),
    ...hotelElementsByBehaviorName(movie, "Open Messenger", "release1_open_messenger", "Messenger"),
    ...hotelElementsByBehaviorName(movie, "change reg", "release1_change_habbo", "Change Habbo")
  ];
  if (elements.length === 0) {
    return false;
  }

  reconcileRelease1HotelToolbarTextStacks(movie);
  movie.setProperty("windowInteractiveElements", elements);
  if (readRecord(movie.getProperty("release1EntryNavigatorState"))?.open === true) {
    syncRelease1EntryNavigator(movie);
  } else {
    syncRelease1EntryNavigatorInteractions(movie);
  }
  syncRelease1PurseOrHelp(movie);
  movie.setProperty("release1EntryHotelInteractionState", {
    release,
    frame: movie.currentFrameIndex,
    interactiveCount: elements.length,
    source: [
      sourcePaths.openNavigator,
      sourcePaths.openMessenger,
      sourcePaths.purseOrHelp,
      sourcePaths.changeReg
    ]
  });
  return true;
}

function readRelease1PublicUnits(movie: DirectorMovie): readonly unknown[] {
  const state = readRecord(movie.getProperty("release1EntryPublicUnits"));
  return Array.isArray(state?.units) ? state.units : [];
}

function hotelElementsByBehaviorName(movie: DirectorMovie, behaviorName: string, idPrefix: string, label: string): HabboWindowInteractiveElement[] {
  return sourceChannelsByBehaviorName(movie, behaviorName).map((sourceChannel) => ({
    id: `${idPrefix}_${sourceChannel.channel}`,
    windowId: "#release1_entry_hotel",
    kind: "link",
    ...sourceChannel.bounds,
    label,
    cursor: "cursor.finger",
    clientId: behaviorName
  }));
}

function reconcileRelease1HotelToolbarTextStacks(movie: DirectorMovie): void {
  const stackGroups: Array<Array<{ readonly sprite: DirectorSpriteChannel; readonly member: DirectorMember }>> = [];
  for (const sprite of movie.currentFrame.sprites) {
    if (sprite.loc.y < 490) {
      continue;
    }

    const member = movie.cast.getMember(sprite.member);
    if (!member || (member.type !== "field" && member.type !== "text")) {
      continue;
    }

    const group = stackGroups.find((candidate) => candidate.some((entry) => Math.abs(entry.sprite.loc.x - sprite.loc.x) <= 6));
    if (group) {
      group.push({ sprite, member });
    } else {
      stackGroups.push([{ sprite, member }]);
    }
  }

  let alignmentReconciled = 0;
  let positionReconciled = 0;
  for (const group of stackGroups) {
    if (group.length < 2) {
      continue;
    }

    const leftX = Math.min(...group.map((entry) => entry.sprite.loc.x));
    for (const entry of group) {
      if (entry.sprite.loc.x !== leftX) {
        entry.sprite.loc.x = leftX;
        positionReconciled++;
      }
    }

    if (!group.some((entry) => entry.member.textAlign === "left" || entry.member.textAlign === undefined)) {
      continue;
    }

    for (const { member } of group) {
      if (member.textAlign !== "center") {
        continue;
      }

      (member as { textAlign?: "left" | "center" | "right" }).textAlign = "left";
      alignmentReconciled++;
    }
  }

  if (alignmentReconciled > 0 || positionReconciled > 0) {
    movie.setProperty("release1EntryToolbarTextAlignment", {
      reconciled: alignmentReconciled,
      positionReconciled,
      frame: movie.currentFrameIndex,
      source: [
        sourcePaths.epConnectionScripts,
        sourcePaths.openMessenger
      ]
    });
  }
}

function findSourceBehaviorFrame(movie: DirectorMovie, scriptName: string): number | undefined {
  for (const behavior of movie.score.behaviors) {
    const script = movie.cast.getMember(behavior.script);
    if (script?.name === scriptName) {
      return behavior.startFrame;
    }
  }

  return undefined;
}

function release1FieldText(movie: DirectorMovie, key: string, fallback: string): string {
  const fieldTexts = movie.cast.getMemberByName("FieldTexts")?.text;
  if (!fieldTexts) {
    return fallback;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\r|\\n)${escapedKey}\\s*=\\s*"([^"]*)"`, "i").exec(fieldTexts);
  return match?.[1] ?? fallback;
}

function parseKeyValueLines(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of body.split(/\r\n|\r|\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    const matches = Array.from(trimmedLine.matchAll(/(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=/g));
    if (matches.length > 1) {
      for (let index = 0; index < matches.length; index++) {
        const match = matches[index];
        if (!match) {
          continue;
        }
        const key = match[1];
        if (!key) {
          continue;
        }
        const nextMatch = matches[index + 1];
        const valueStart = (match.index ?? 0) + match[0].length;
        const valueEnd = nextMatch?.index ?? trimmedLine.length;
        fields[key] = trimmedLine.slice(valueStart, valueEnd).trim();
      }
      continue;
    }

    const separator = trimmedLine.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    fields[trimmedLine.slice(0, separator)] = trimmedLine.slice(separator + 1);
  }
  return fields;
}

function applyRelease1UserObjectBadgeState(movie: DirectorMovie, fields: Readonly<Record<string, string>>): void {
  const badge = normalizeBadgeId(fields.badge_type ?? fields.badge ?? fields.badgeType);
  if (!badge) {
    return;
  }

  movie.setProperty("release1OwnBadgeType", badge);
  movie.setProperty("availableBadges", [badge]);
  movie.setProperty("chosenBadgeIndex", 1);
  movie.setProperty("badgeVisible", 1);
  movie.setProperty("release1EntryUserObjectBadge", {
    badge,
    source: [
      sourcePaths.epConnectionScripts,
      "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/player/PlayerDetails.java"
    ]
  });
}

function firstNonEmptyLine(body: string): string {
  for (const line of body.split(/\r\n|\r|\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}
