import type { DirectorMovie, DirectorSpriteChannel, DirectorTextSpan } from "../../../runtime";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { release1EntrySourcePaths as sourcePaths } from "./HabboV1EntrySources";
import {
  type Bounds,
  type SourceChannel,
  clearRelease1EntryInteractions,
  directorInteger,
  goToMarkerIfPresent,
  isRelease1EntryMovie,
  readRecord,
  readRelease1EntryGlobals,
  readWindowFieldValues,
  release1EntryRelease,
  sanitizeSingleLine,
  setMemberTextByName,
  setRelease1EpConnectionState,
  sourceBoundsForSprite,
  sourceChannelByBehaviorName,
  sourceFontSizeForSprite
} from "./HabboV1EntryRuntime";

const usernameFieldId = "login_username";
const passwordFieldId = "login_password";
const usernameSourceMemberName = "loginname";
const passwordSourceMemberName = "loginpw";
const passwordDisplaySourceMemberName = "loginpwshow";
const passwordMaxLength = 9;

export function syncRelease1EntryLoginInteractions(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const sourceChannels = collectSourceLoginChannels(movie);
  if (!sourceChannels) {
    clearRelease1EntryInteractions(movie);
    return false;
  }

  const usernameField = reconcileSourceEditableFieldGeometry(movie, sourceChannels.usernameField);
  const passwordField = reconcileSourceEditableFieldGeometry(movie, sourceChannels.passwordField);
  const fields = readRelease1EntryLoginFields(movie);
  const elements: HabboWindowInteractiveElement[] = [
    {
      id: "login_createUser",
      windowId: "#release1_entry_login",
      kind: "link",
      ...sourceChannels.createUserLink.bounds,
      label: "createHabbo",
      cursor: "cursor.finger",
      clientId: "Go To Regist"
    },
    {
      id: usernameFieldId,
      windowId: "#release1_entry_login",
      kind: "field",
      ...editableFieldInteractionBounds(movie, usernameField),
      label: usernameSourceMemberName,
      editable: true,
      fontSize: sourceFontSizeForSprite(movie, usernameField.sprite),
      textAlign: "center",
      clientId: "namefield"
    },
    {
      id: passwordFieldId,
      windowId: "#release1_entry_login",
      kind: "field",
      ...editableFieldInteractionBounds(movie, passwordField),
      label: passwordSourceMemberName,
      editable: true,
      password: true,
      fontSize: sourceFontSizeForSprite(movie, passwordField.sprite),
      textAlign: "center",
      clientId: "password field"
    },
    {
      id: "login_ok",
      windowId: "#release1_entry_login",
      kind: "button",
      ...sourceChannels.loginOkButton.bounds,
      label: "OK",
      cursor: "cursor.finger",
      clientId: "loginOk_btn"
    },
    {
      id: "login_forgot_password",
      windowId: "#release1_entry_login",
      kind: "link",
      ...sourceChannels.forgotPasswordLink.bounds,
      label: "Forgotten your password?",
      cursor: "cursor.finger",
      clientId: "Forgotten_your_password"
    }
  ];

  applySourceLinkTextSpan(movie, sourceChannels.createUserLink.sprite);
  applySourceLinkTextSpan(movie, sourceChannels.forgotPasswordLink.sprite);

  movie.setProperty("windowInteractiveElements", elements);
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [usernameFieldId]: fields.username,
    [passwordFieldId]: fields.password,
    [usernameSourceMemberName]: fields.username,
    [passwordSourceMemberName]: fields.password,
    [passwordDisplaySourceMemberName]: "*".repeat(fields.password.length)
  });
  movie.setProperty("release1EntryLoginInteractionState", {
    release,
    sourceRelease: release1EntryRelease,
    frame: movie.currentFrameIndex,
    interactiveCount: elements.length,
    source: [
      sourcePaths.nameField,
      sourcePaths.passwordField,
      sourcePaths.loginOk,
      sourcePaths.goToRegister,
      sourcePaths.forgottenPassword
    ]
  });
  return true;
}

export function setRelease1EntryLoginFieldValue(movie: DirectorMovie, elementId: string, value: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const fields = readRelease1EntryLoginFields(movie);
  if (elementId === usernameFieldId || elementId === usernameSourceMemberName) {
    const username = sanitizeSingleLine(value).slice(0, 115);
    applyRelease1EntryLoginFields(movie, {
      username,
      password: fields.password
    });
    movie.debugLog.add("login", "info", `release1 field=${usernameSourceMemberName} length=${username.length}`);
    return true;
  }

  if (elementId === passwordFieldId || elementId === passwordSourceMemberName || elementId === passwordDisplaySourceMemberName) {
    const password = sanitizeSingleLine(value).slice(0, passwordMaxLength);
    applyRelease1EntryLoginFields(movie, {
      username: fields.username,
      password
    });
    movie.debugLog.add("login", "info", `release1 field=${passwordSourceMemberName} length=${password.length}`);
    return true;
  }

  return false;
}

export function submitRelease1EntryLoginField(movie: DirectorMovie, elementId: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (elementId === usernameFieldId || elementId === usernameSourceMemberName) {
    movie.setProperty("release1EntryLoginKeyDown", {
      elementId,
      key: "RETURN",
      action: "ignored",
      source: sourcePaths.nameField
    });
    movie.debugLog.add("login", "info", "release1 namefield RETURN ignored");
    return true;
  }

  if (elementId === passwordFieldId || elementId === passwordSourceMemberName || elementId === passwordDisplaySourceMemberName) {
    movie.setProperty("release1EntryLoginKeyDown", {
      elementId,
      keyCode: 36,
      action: "doLogin",
      source: sourcePaths.passwordField
    });
    return doRelease1EntryLogin(movie, elementId, sourcePaths.passwordField);
  }

  return false;
}

export function activateRelease1EntryLoginElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (elementId === "login_ok") {
    if (activation?.event === "mouseDown") {
      movie.setProperty("pressedWindowElement", {
        elementId,
        event: "mouseDown",
        source: sourcePaths.loginOk
      });
      return true;
    }

    if (activation?.event === "mouseUp" || activation?.event === undefined) {
      return doRelease1EntryLogin(movie, elementId, sourcePaths.doLogin);
    }

    return true;
  }

  if (elementId === "login_createUser") {
    if (activation?.event === "mouseUp") {
      return true;
    }

    movie.setProperty("release1EntryGlobals", {
      ...readRelease1EntryGlobals(movie),
      gGoTo: "register"
    });
    setRelease1EpConnectionState(movie, {
      ok: false,
      secured: false,
      source: sourcePaths.goToRegister
    });
    movie.setProperty("lastLoginAction", {
      elementId,
      action: "register",
      source: sourcePaths.goToRegister
    });
    goToMarkerIfPresent(movie, "connectloop");
    clearRelease1EntryInteractions(movie);
    movie.debugLog.add("login", "info", "release1 link=login_createUser action=register");
    return true;
  }

  if (elementId === "login_forgot_password") {
    if (activation?.event === "mouseDown") {
      movie.setProperty("pressedWindowElement", {
        elementId,
        event: "mouseDown",
        source: sourcePaths.forgottenPassword
      });
      return true;
    }

    if (activation?.event === "mouseUp" || activation?.event === undefined) {
      movie.setProperty("pressedWindowElement", undefined);
      movie.setProperty("release1EntryGlobals", {
        ...readRelease1EntryGlobals(movie),
        gGoTo: "forgottenPassword"
      });
      setRelease1EpConnectionState(movie, {
        ok: false,
        secured: false,
        source: sourcePaths.forgottenPassword
      });
      movie.setProperty("lastLoginAction", {
        elementId,
        action: "forgottenPassword",
        source: sourcePaths.forgottenPassword
      });
      movie.go(movie.currentFrameIndex + 1);
      clearRelease1EntryInteractions(movie);
      movie.debugLog.add("login", "info", "release1 link=login_forgot_password action=forgottenPassword");
      return true;
    }
  }

  return false;
}

export function readRelease1EntryLoginFields(movie: DirectorMovie): { readonly username: string; readonly password: string } {
  const fields = readRecord(movie.getProperty("release1EntryLoginFields"));
  if (fields) {
    return {
      username: typeof fields.username === "string" ? fields.username : "",
      password: typeof fields.password === "string" ? fields.password : ""
    };
  }

  const values = readWindowFieldValues(movie);
  return {
    username: typeof values[usernameFieldId] === "string" ? values[usernameFieldId] : typeof values[usernameSourceMemberName] === "string" ? values[usernameSourceMemberName] : "",
    password: typeof values[passwordFieldId] === "string" ? values[passwordFieldId] : typeof values[passwordSourceMemberName] === "string" ? values[passwordSourceMemberName] : ""
  };
}

function collectSourceLoginChannels(movie: DirectorMovie): {
  readonly usernameField: SourceChannel;
  readonly passwordField: SourceChannel;
  readonly loginOkButton: SourceChannel;
  readonly createUserLink: SourceChannel;
  readonly forgotPasswordLink: SourceChannel;
} | undefined {
  const usernameField = sourceChannelByBehaviorName(movie, "namefield");
  const passwordField = sourceChannelByBehaviorName(movie, "password field");
  const loginOkButton = sourceChannelByBehaviorName(movie, "loginOk_btn");
  const createUserLink = sourceChannelByBehaviorName(movie, "Go To Regist");
  const forgotPasswordLink = sourceChannelByBehaviorName(movie, "Forgotten_your_password");
  if (!usernameField || !passwordField || !loginOkButton || !createUserLink || !forgotPasswordLink) {
    return undefined;
  }

  return {
    usernameField,
    passwordField,
    loginOkButton,
    createUserLink,
    forgotPasswordLink
  };
}

function doRelease1EntryLogin(movie: DirectorMovie, elementId: string, source: string): boolean {
  const fields = readRelease1EntryLoginFields(movie);
  movie.setProperty("pressedWindowElement", undefined);
  movie.setProperty("release1EntryGlobals", {
    gLoginName: fields.username,
    gLoginPw: fields.password,
    gGoTo: "login"
  });
  setRelease1EpConnectionState(movie, {
    ok: false,
    secured: false,
    source: sourcePaths.doLogin
  });
  movie.setProperty("lastLoginAttempt", {
    elementId,
    accepted: fields.username.length > 0 && fields.password.length > 0,
    userName: fields.username,
    passwordLength: fields.password.length,
    action: "release1-doLogin",
    source
  });
  movie.setProperty("lastLoginAction", {
    elementId,
    action: "connectloop",
    source
  });
  goToMarkerIfPresent(movie, "connectloop");
  reconcileCurrentFrameLoginFieldGeometry(movie);
  clearRelease1EntryInteractions(movie);
  movie.debugLog.add("login", "ok", `release1 doLogin user=${fields.username} passwordLength=${fields.password.length}`);
  return true;
}

function reconcileCurrentFrameLoginFieldGeometry(movie: DirectorMovie): void {
  const usernameField = sourceChannelByBehaviorName(movie, "namefield");
  const passwordField = sourceChannelByBehaviorName(movie, "password field");
  if (!usernameField || !passwordField) {
    return;
  }

  reconcileSourceEditableFieldGeometry(movie, usernameField);
  reconcileSourceEditableFieldGeometry(movie, passwordField);
}

function findSourceTextFieldBackground(movie: DirectorMovie, fieldSprite: DirectorSpriteChannel): SourceChannel | undefined {
  const fieldBounds = sourceBoundsForSprite(movie, fieldSprite);
  let nearest: SourceChannel | undefined;
  let nearestScore = Number.POSITIVE_INFINITY;
  const fieldCenter = rectCenter(fieldBounds);
  for (const sprite of movie.currentFrame.sprites) {
    const member = movie.cast.getMember(sprite.member);
    if (member?.name !== "textfieldbg_74") {
      continue;
    }

    const bounds = sourceBoundsForSprite(movie, sprite);
    if (!bounds) {
      continue;
    }

    const center = rectCenter(bounds);
    const yDistance = Math.abs(center.y - fieldCenter.y);
    if (yDistance > 32) {
      continue;
    }

    const xDistance = Math.abs(center.x - fieldCenter.x);
    const score = (yDistance * 1000) + xDistance;
    if (score < nearestScore) {
      nearestScore = score;
      nearest = {
        channel: sprite.channel,
        sprite,
        bounds
      };
    }
  }

  return nearest;
}

function rectCenter(bounds: Bounds): { readonly x: number; readonly y: number } {
  return {
    x: bounds.x + (bounds.width / 2),
    y: bounds.y + (bounds.height / 2)
  };
}

function editableFieldInteractionBounds(movie: DirectorMovie, sourceChannel: SourceChannel): Bounds {
  return unionBounds(sourceChannel.bounds, findSourceTextFieldBackground(movie, sourceChannel.sprite)?.bounds);
}

function reconcileSourceEditableFieldGeometry(movie: DirectorMovie, sourceChannel: SourceChannel): SourceChannel {
  const background = findSourceTextFieldBackground(movie, sourceChannel.sprite);
  if (!background) {
    return sourceChannel;
  }

  const bounds = sourceBoundsForSprite(movie, sourceChannel.sprite);
  const nextX = directorInteger(background.bounds.x + ((background.bounds.width - bounds.width) / 2));
  const nextY = bounds.y;
  const deltaX = nextX - bounds.x;
  if (deltaX !== 0) {
    sourceChannel.sprite.loc.x += deltaX;
  }

  const nextBounds = {
    ...bounds,
    x: nextX,
    y: nextY
  };
  return {
    ...sourceChannel,
    bounds: nextBounds
  };
}

function unionBounds(left: Bounds, right: Bounds | undefined): Bounds {
  if (!right) {
    return left;
  }

  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y
  };
}

function applyRelease1EntryLoginFields(movie: DirectorMovie, fields: { readonly username: string; readonly password: string }): void {
  const passwordDisplay = "*".repeat(fields.password.length);
  setMemberTextByName(movie, usernameSourceMemberName, fields.username);
  setMemberTextByName(movie, passwordSourceMemberName, fields.password);
  setMemberTextByName(movie, passwordDisplaySourceMemberName, passwordDisplay);
  movie.setProperty("release1EntryLoginFields", fields);
  movie.setProperty("loginFieldValues", {
    [usernameFieldId]: fields.username,
    [passwordFieldId]: fields.password
  });
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [usernameFieldId]: fields.username,
    [passwordFieldId]: fields.password,
    [usernameSourceMemberName]: fields.username,
    [passwordSourceMemberName]: fields.password,
    [passwordDisplaySourceMemberName]: passwordDisplay
  });
  movie.setProperty(`fieldText.${usernameSourceMemberName}`, fields.username);
  movie.setProperty(`fieldText.${passwordSourceMemberName}`, fields.password);
  movie.setProperty(`fieldText.${passwordDisplaySourceMemberName}`, passwordDisplay);
}

function applySourceLinkTextSpan(movie: DirectorMovie, sprite: DirectorSpriteChannel): void {
  const member = movie.cast.getMember(sprite.member);
  if (!member || (member.type !== "text" && member.type !== "field") || !member.text) {
    return;
  }

  const span = lastVisibleTextLineSpan(member.text);
  if (!span) {
    return;
  }

  const textSpans = member.textSpans.filter((candidate) => {
    return candidate.start !== span.start || candidate.end !== span.end || candidate.underline !== true;
  });
  (member as unknown as { textSpans: readonly DirectorTextSpan[] }).textSpans = [
    ...textSpans,
    {
      start: span.start,
      end: span.end,
      underline: true
    }
  ];
}

function lastVisibleTextLineSpan(text: string): { readonly start: number; readonly end: number } | undefined {
  const normalizedText = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  let offset = 0;
  let last: { readonly start: number; readonly end: number } | undefined;
  for (const line of normalizedText.split("\n")) {
    const trimmedStart = line.search(/\S/);
    if (trimmedStart >= 0) {
      const trailingWhitespace = /\s*$/.exec(line)?.[0].length ?? 0;
      last = {
        start: offset + trimmedStart,
        end: offset + line.length - trailingWhitespace
      };
    }
    offset += line.length + 1;
  }
  return last && last.end > last.start ? last : undefined;
}
