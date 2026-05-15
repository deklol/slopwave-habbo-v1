import type { DirectorMember, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { showRelease1EntryAlert } from "./HabboV1EntryAlerts";

const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
const release1EntryRelease = "release1_roseau_dcr0910-habbo_entry";

const sourcePaths = {
  forgottenPassword: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 160 - Forgotten_your_password.ls",
  goLogin: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 12 - goLogin.ls",
  sendPassword: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 11 - Send_userpassword_to_email.ls",
  emailCheck: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 15 - emailcheck.ls"
} as const;

const fieldIds = {
  name: "forgot_password_name",
  email: "forgot_password_email"
} as const;

const sourceMembers = {
  name: "NameCheck",
  email: "EmailCheckField"
} as const;

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

interface ForgotPasswordFields {
  readonly name: string;
  readonly email: string;
}

export function syncRelease1EntryForgotPasswordInteractions(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie) || !release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const sourceChannels = collectSourceForgotPasswordChannels(movie);
  if (!sourceChannels) {
    return false;
  }

  const fields = readRelease1EntryForgotPasswordFields(movie);
  applyRelease1EntryForgotPasswordFields(movie, fields);
  const elements: HabboWindowInteractiveElement[] = [
    sourceFieldElement(movie, fieldIds.name, sourceChannels.nameField, sourceMembers.name, "empty field"),
    sourceFieldElement(movie, fieldIds.email, sourceChannels.emailField, sourceMembers.email, "emailcheck"),
    sourceButtonElement("forgot_password_back_button", sourceChannels.backButton, "Back", "goLogin"),
    sourceButtonElement("forgot_password_send_button", sourceChannels.sendButton, "Send", "Send_userpassword_to_email")
  ];

  movie.setProperty("windowInteractiveElements", elements);
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [fieldIds.name]: fields.name,
    [fieldIds.email]: fields.email,
    [sourceMembers.name]: fields.name,
    [sourceMembers.email]: fields.email
  });
  movie.setProperty("release1EntryForgotPasswordInteractionState", {
    release,
    sourceRelease: release1EntryRelease,
    frame: movie.currentFrameIndex,
    interactiveCount: elements.length,
    source: [
      sourcePaths.forgottenPassword,
      sourcePaths.goLogin,
      sourcePaths.sendPassword,
      sourcePaths.emailCheck
    ]
  });
  return true;
}

export function setRelease1EntryForgotPasswordFieldValue(movie: DirectorMovie, elementId: string, value: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const fields = readRelease1EntryForgotPasswordFields(movie);
  if (elementId === fieldIds.name || elementId === sourceMembers.name) {
    applyRelease1EntryForgotPasswordFields(movie, {
      ...fields,
      name: sanitizeSingleLine(value).slice(0, 115)
    });
    return true;
  }

  if (elementId === fieldIds.email || elementId === sourceMembers.email) {
    applyRelease1EntryForgotPasswordFields(movie, {
      ...fields,
      email: sanitizeSingleLine(value).slice(0, 115)
    });
    return true;
  }

  return false;
}

export function validateRelease1EntryForgotPasswordField(movie: DirectorMovie, elementId: string): boolean {
  if (!isRelease1EntryMovie(movie) || elementId !== fieldIds.email) {
    return false;
  }

  const fields = readRelease1EntryForgotPasswordFields(movie);
  if (!isValidSourceEmail(fields.email)) {
    showRelease1EntryAlert(movie, "emailNotCorrect", undefined, "", [sourcePaths.emailCheck]);
    movie.setProperty("release1EntryForgotPasswordAlert", {
      alertId: "emailNotCorrect",
      source: sourcePaths.emailCheck
    });
    movie.debugLog.add("login", "warn", "release1 forgotten password email rejected alert=emailNotCorrect");
  }
  return true;
}

export function activateRelease1EntryForgotPasswordElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (elementId === "forgot_password_back_button") {
    if (activation?.event === "mouseDown") {
      movie.setProperty("pressedWindowElement", {
        elementId,
        event: "mouseDown",
        source: sourcePaths.goLogin
      });
      return true;
    }

    if (activation?.event === "mouseUp" || activation?.event === undefined) {
      movie.setProperty("pressedWindowElement", undefined);
      movie.go(3);
      clearRelease1EntryInteractions(movie);
      movie.setProperty("lastLoginAction", {
        elementId,
        action: "goLogin",
        source: sourcePaths.goLogin
      });
      movie.debugLog.add("login", "info", "release1 forgotten password back action=goLogin frame=3");
      return true;
    }
    return true;
  }

  if (elementId === "forgot_password_send_button") {
    if (activation?.event === "mouseDown") {
      movie.setProperty("pressedWindowElement", {
        elementId,
        event: "mouseDown",
        source: sourcePaths.sendPassword
      });
      return true;
    }

    if (activation?.event === "mouseUp" || activation?.event === undefined) {
      const fields = readRelease1EntryForgotPasswordFields(movie);
      movie.setProperty("pressedWindowElement", undefined);
      if (fields.name.length > 0) {
        movie.setProperty("release1EntryForgotPasswordRequest", {
          command: "SEND_USERPASS_TO_EMAIL",
          status: "pending",
          name: fields.name,
          email: fields.email,
          body: `${fields.name} ${fields.email}`.trimEnd(),
          source: sourcePaths.sendPassword
        });
        movie.debugLog.add("login", "info", `release1 queued SEND_USERPASS_TO_EMAIL name=${fields.name} emailLength=${fields.email.length}`);
      }
      movie.go(movie.currentFrameIndex + 1);
      clearRelease1EntryInteractions(movie);
      movie.setProperty("lastLoginAction", {
        elementId,
        action: "sendMyPassword",
        source: sourcePaths.sendPassword
      });
      return true;
    }
    return true;
  }

  return false;
}

function collectSourceForgotPasswordChannels(movie: DirectorMovie): {
  readonly nameField: SourceChannel;
  readonly emailField: SourceChannel;
  readonly backButton: SourceChannel;
  readonly sendButton: SourceChannel;
} | undefined {
  const nameField = sourceChannelByMemberName(movie, sourceMembers.name);
  const emailField = sourceChannelByMemberName(movie, sourceMembers.email);
  const backButton = sourceChannelByBehaviorName(movie, "goLogin");
  const sendButton = sourceChannelByBehaviorName(movie, "Send_userpassword_to_email");
  if (!nameField || !emailField || !backButton || !sendButton) {
    return undefined;
  }

  return {
    nameField: {
      ...nameField,
      bounds: unionBounds(nameField.bounds, sourceChannelByMemberName(movie, "textfieldbg_check")?.bounds)
    },
    emailField: {
      ...emailField,
      bounds: unionBounds(emailField.bounds, sourceChannelByMemberName(movie, "textfieldbg_emailcheck")?.bounds)
    },
    backButton,
    sendButton
  };
}

function sourceFieldElement(
  movie: DirectorMovie,
  id: string,
  sourceChannel: SourceChannel,
  label: string,
  clientId: string
): HabboWindowInteractiveElement {
  return {
    id,
    windowId: "#release1_entry_forgot_password",
    kind: "field",
    ...sourceChannel.bounds,
    label,
    editable: true,
    fontSize: sourceFontSizeForSprite(movie, sourceChannel.sprite),
    textAlign: "center",
    clientId
  };
}

function sourceButtonElement(id: string, sourceChannel: SourceChannel, label: string, clientId: string): HabboWindowInteractiveElement {
  return {
    id,
    windowId: "#release1_entry_forgot_password",
    kind: "button",
    ...sourceChannel.bounds,
    label,
    cursor: "cursor.finger",
    clientId
  };
}

function sourceChannelByMemberName(movie: DirectorMovie, memberName: string): SourceChannel | undefined {
  const normalizedTarget = normalizeSourceName(memberName);
  for (const sprite of movie.currentFrame.sprites) {
    const member = movie.cast.getMember(sprite.member);
    if (normalizeSourceName(member?.name ?? "") !== normalizedTarget) {
      continue;
    }

    return {
      channel: sprite.channel,
      sprite,
      bounds: sourceBoundsForSprite(movie, sprite)
    };
  }
  return undefined;
}

function normalizeSourceName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceChannelByBehaviorName(movie: DirectorMovie, behaviorName: string): SourceChannel | undefined {
  const normalizedName = behaviorName.toLowerCase();
  for (const behavior of movie.score.activeBehaviorIntervals(movie.currentFrameIndex)) {
    const scriptMember = movie.cast.getMember(behavior.script);
    if (scriptMember?.name?.toLowerCase() !== normalizedName) {
      continue;
    }

    const sprite = movie.currentFrame.getSprite(behavior.channel);
    if (!sprite) {
      continue;
    }

    return {
      channel: behavior.channel,
      sprite,
      bounds: sourceBoundsForSprite(movie, sprite)
    };
  }
  return undefined;
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
  const effectiveRegX = sprite.flipH ? width - scaledRegX : scaledRegX;
  const effectiveRegY = sprite.flipV ? height - scaledRegY : scaledRegY;
  return {
    x: sprite.loc.x - effectiveRegX,
    y: sprite.loc.y - effectiveRegY,
    width,
    height
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

function readRelease1EntryForgotPasswordFields(movie: DirectorMovie): ForgotPasswordFields {
  const fields = readRecord(movie.getProperty("release1EntryForgotPasswordFields"));
  if (fields) {
    return {
      name: typeof fields.name === "string" ? fields.name : "",
      email: typeof fields.email === "string" ? fields.email : ""
    };
  }

  const values = readWindowFieldValues(movie);
  return {
    name: values[fieldIds.name] ?? memberTextByName(movie, sourceMembers.name),
    email: values[fieldIds.email] ?? memberTextByName(movie, sourceMembers.email)
  };
}

function applyRelease1EntryForgotPasswordFields(movie: DirectorMovie, fields: ForgotPasswordFields): void {
  setMemberTextByName(movie, sourceMembers.name, fields.name);
  setMemberTextByName(movie, sourceMembers.email, fields.email);
  movie.setProperty("release1EntryForgotPasswordFields", fields);
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [fieldIds.name]: fields.name,
    [fieldIds.email]: fields.email,
    [sourceMembers.name]: fields.name,
    [sourceMembers.email]: fields.email
  });
  movie.setProperty(`fieldText.${sourceMembers.name}`, fields.name);
  movie.setProperty(`fieldText.${sourceMembers.email}`, fields.email);
}

function isValidSourceEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (value.length <= 6 || at < 0) {
    return false;
  }

  let ok = false;
  for (let index = at + 1; index < value.length; index++) {
    if (value[index] === ".") {
      ok = true;
    }
    if (value[index] === "@") {
      ok = false;
    }
  }
  return ok;
}

function setMemberTextByName(movie: DirectorMovie, name: string, text: string): void {
  for (const castLib of movie.cast.castLibs) {
    const member = castLib.getMemberByName(name);
    if (member && isTextLikeMember(member)) {
      member.setText(text);
      return;
    }
  }
}

function memberTextByName(movie: DirectorMovie, name: string): string {
  const member = movie.cast.getMemberByName(name);
  return member && isTextLikeMember(member) ? member.text ?? "" : "";
}

function sourceFontSizeForSprite(movie: DirectorMovie, sprite: DirectorSpriteChannel): number {
  const member = movie.cast.getMember(sprite.member);
  return Math.max(1, Math.round(member?.fontSize ?? 9));
}

function isRelease1EntryMovie(movie: DirectorMovie): boolean {
  return movie.id === release1EntryMovieId
    || readRecord(movie.getProperty("release1EntryState"))?.release === release1EntryRelease;
}

function isTextLikeMember(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}

function readWindowFieldValues(movie: DirectorMovie): Record<string, string> {
  const value = readRecord(movie.getProperty("windowFieldValues"));
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function clearRelease1EntryInteractions(movie: DirectorMovie): void {
  movie.setProperty("windowInteractiveElements", []);
}

function sanitizeSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, "");
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}
