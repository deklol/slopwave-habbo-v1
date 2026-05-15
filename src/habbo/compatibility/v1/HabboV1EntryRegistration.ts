import type { DirectorMember, DirectorMovie, DirectorSpriteChannel } from "../../../runtime";
import type { HabboWindowElementActivation, HabboWindowInteractiveElement } from "../../window/HabboWindowTypes";
import { showRelease1EntryAlert } from "./HabboV1EntryAlerts";
import {
  completeRelease1EntryRegistrationNamePacketRuntime,
  queueRelease1EntryRegistrationNameCheckRuntime,
  sanitizeRelease1EntryRegistrationName,
  type Release1EntryRegistrationNameCheckHost
} from "./HabboV1EntryRegistrationNameCheck";
import {
  activateRelease1EntryFigureElement,
  applyRelease1EntryFigureField,
  syncRelease1EntryFigureForm
} from "./HabboV1EntryFigureEditor";
import { setRelease1SpriteMemberByChannel } from "./HabboV1EntryRuntime";

const release1EntryMovieId = "release1_roseau_dcr0910-habbo_entry-projectorrays";
const release1EntryRelease = "release1_roseau_dcr0910-habbo_entry";

const sourcePaths = {
  clearFields: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 69 - clear register fields.ls",
  nameField: "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/BehaviorScript 31 - nospace field.ls",
  nameCheck: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/BehaviorScript 196 - regist name check.ls",
  passwordField: "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/BehaviorScript 35 - passwordREG.ls",
  passwordCheck: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 140 - passwordCheckAndGo.ls",
  figureLoop: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 64 - figure loop.ls",
  fuseRegister: "extracted/projectorrays/release1_roseau_dcr0910/FuseScript/casts/External/MovieScript 1 - Main Script.ls",
  doRegister: "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 40.ls",
  agreement: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 5 - Agreement.ls",
  spamCheckbox: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 139 - spam_checkbox behavior.ls",
  changeSex: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 157 - ChangeSex.ls",
  goToFrame: "extracted/projectorrays/release1_roseau_dcr0910/MemberScript/casts/External/BehaviorScript 60 - Go To Frame.ls"
} as const;

const registrationFieldIds = {
  characterName: "reg_charactername",
  password: "reg_password",
  passwordConfirm: "reg_password_confirm",
  birthday: "reg_birthday",
  email: "reg_email",
  phone: "reg_phone",
  mission: "reg_mission"
} as const;

const registrationTextMembers = {
  characterName: "charactername_field",
  passwordDisplay: "passwordShow_field",
  passwordConfirmDisplay: "passwordcheck_field",
  password: "password_field",
  passwordConfirm: "password_field2",
  birthday: "birthday_field",
  email: "email_field",
  phone: "phonenumber",
  phoneSource: "phoneNumber",
  mission: "persistantmessage_field",
  agreement: "Agreement_field",
  directMail: "can_spam_field",
  sex: "charactersex_field",
  loginName: "loginname",
  loginPassword: "loginpw"
} as const;

const registrationPasswordMaxLength = 9;
type RegistrationMode = "create" | "update";

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

interface RegistrationFields {
  readonly characterName: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly birthday: string;
  readonly email: string;
  readonly phone: string;
  readonly mission: string;
  readonly agreement: string;
  readonly directMail: string;
  readonly sex: "Female" | "Male";
}

interface Release1UserObjectFields {
  readonly name?: string;
  readonly email?: string;
  readonly figure?: string;
  readonly directMail?: string;
  readonly birthday?: string;
  readonly phonenumber?: string;
  readonly phoneNumber?: string;
  readonly customData?: string;
  readonly has_read_agreement?: string;
  readonly sex?: string;
  readonly country?: string;
}

const nameCheckHost: Release1EntryRegistrationNameCheckHost<RegistrationFields> = {
  characterNameElementId: registrationFieldIds.characterName,
  source: sourcePaths.nameCheck,
  readFields: readRelease1EntryRegistrationFields,
  applyFields: applyRelease1EntryRegistrationFields,
  resetRegistrationForm(movie) {
    movie.setProperty("release1EntryRegistrationFields", undefined);
    enterRelease1EntryRegistrationForm(movie);
  }
};

export function enterRelease1EntryRegistrationForm(movie: DirectorMovie): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  movie.setProperty("release1EntryRegistrationMode", "create");
  initializeRelease1EntryRegistrationFields(movie);
  const targetFrame = movie.score.getMarker("regist_2")?.frame ?? movie.score.getMarker("regist")?.frame;
  if (targetFrame === undefined) {
    return false;
  }

  movie.go(targetFrame);
  applyRelease1EntryRegistrationVisualState(movie, readRelease1EntryRegistrationFields(movie));
  return true;
}

export function enterRelease1EntryUpdateForm(movie: DirectorMovie, userObject?: Release1UserObjectFields): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  movie.setProperty("release1EntryRegistrationMode", "update");
  applyRelease1EntryUpdateFields(movie, userObject);
  const targetFrame = movie.score.getMarker("change1")?.frame;
  if (targetFrame === undefined) {
    return false;
  }

  movie.go(targetFrame);
  applyRelease1EntryRegistrationVisualState(movie, readRelease1EntryRegistrationFields(movie));
  movie.setProperty("release1EntryRegistrationUpdateState", {
    frame: "change1",
    source: [
      "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 1 - EnterpriseServer Connection Scripts.ls",
      sourcePaths.passwordCheck,
      sourcePaths.doRegister
    ]
  });
  return true;
}

export function syncRelease1EntryRegistrationInteractions(movie: DirectorMovie, release: string): boolean {
  if (!isRelease1EntryMovie(movie) || !release.startsWith("release1_roseau_dcr0910")) {
    return false;
  }

  const sourceChannels = collectSourceRegistrationChannels(movie);
  return sourceChannels
    ? syncRelease1EntryRegistrationForm(movie, release, sourceChannels)
    : syncRelease1EntryFigureForm(movie, release);
}

function syncRelease1EntryRegistrationForm(
  movie: DirectorMovie,
  release: string,
  sourceChannels: NonNullable<ReturnType<typeof collectSourceRegistrationChannels>>
): boolean {
  const fields = readRelease1EntryRegistrationFields(movie);
  applyRelease1EntryRegistrationVisualState(movie, fields);
  const updateMode = isRelease1EntryRegistrationUpdateMode(movie);

  const elements: HabboWindowInteractiveElement[] = [
    sourceFieldElement(movie, registrationFieldIds.characterName, sourceChannels.characterName, "charactername_field", "nospace field", false, !updateMode),
    sourceFieldElement(movie, registrationFieldIds.password, sourceChannels.passwordDisplay, "password_field", "passwordREG", true),
    sourceFieldElement(movie, registrationFieldIds.passwordConfirm, sourceChannels.passwordConfirmDisplay, "password_field2", "passwordREG", true),
    sourceFieldElement(movie, registrationFieldIds.birthday, sourceChannels.birthday, "birthday_field", "fingercursor behavior", false, !updateMode),
    sourceFieldElement(movie, registrationFieldIds.email, sourceChannels.email, "email_field", "fingercursor behavior"),
    sourceFieldElement(movie, registrationFieldIds.phone, sourceChannels.phone, "phoneNumber", "fingercursor behavior"),
    sourceFieldElement(movie, registrationFieldIds.mission, sourceChannels.mission, "persistantmessage_field", "fingercursor behavior"),
    sourceButtonElement("reg_back_button", sourceChannels.backButton, "Back", "Go To Frame"),
    sourceButtonElement("reg_next_button", sourceChannels.nextButton, "Accept", "passwordCheckAndGo"),
    sourceButtonElement("reg_direct_mail", sourceChannels.directMailCheckbox, "Direct mail", "spam_checkbox behavior"),
    sourceButtonElement("reg_agreement", sourceChannels.agreementCheckbox, "Agreement", "Agreement"),
    sourceButtonElement("reg_sex_female", sourceChannels.sexFemale, "Girl", "ChangeSex"),
    sourceButtonElement("reg_sex_male", sourceChannels.sexMale, "Boy", "ChangeSex")
  ];

  movie.setProperty("windowInteractiveElements", elements);
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [registrationFieldIds.characterName]: fields.characterName,
    [registrationFieldIds.password]: fields.password,
    [registrationFieldIds.passwordConfirm]: fields.passwordConfirm,
    [registrationFieldIds.birthday]: fields.birthday,
    [registrationFieldIds.email]: fields.email,
    [registrationFieldIds.phone]: fields.phone,
    [registrationFieldIds.mission]: fields.mission
  });
  movie.setProperty("release1EntryRegistrationInteractionState", {
    release,
    sourceRelease: release1EntryRelease,
    frame: movie.currentFrameIndex,
    interactiveCount: elements.length,
    source: [
      sourcePaths.clearFields,
      sourcePaths.nameField,
      sourcePaths.nameCheck,
      sourcePaths.passwordField,
      sourcePaths.passwordCheck,
      sourcePaths.agreement,
      sourcePaths.spamCheckbox,
      sourcePaths.changeSex,
      sourcePaths.figureLoop,
      sourcePaths.goToFrame
    ]
  });
  return true;
}

export function setRelease1EntryRegistrationFieldValue(movie: DirectorMovie, elementId: string, value: string): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  const fields = readRelease1EntryRegistrationFields(movie);
  if (elementId === registrationFieldIds.characterName || elementId === registrationTextMembers.characterName) {
    if (isRelease1EntryRegistrationUpdateMode(movie)) {
      applyRelease1EntryRegistrationFields(movie, fields);
      return true;
    }

    const characterName = sanitizeRelease1EntryRegistrationName(movie, value).slice(0, 115);
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      characterName
    });
    movie.setProperty("release1EntryRegistrationLastNameSearch", "");
    return true;
  }

  if (elementId === registrationFieldIds.password || elementId === registrationTextMembers.password) {
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      password: sanitizeSingleLine(value).slice(0, registrationPasswordMaxLength)
    });
    return true;
  }

  if (elementId === registrationFieldIds.passwordConfirm || elementId === registrationTextMembers.passwordConfirm) {
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      passwordConfirm: sanitizeSingleLine(value).slice(0, registrationPasswordMaxLength)
    });
    return true;
  }

  if (elementId === registrationFieldIds.birthday || elementId === registrationTextMembers.birthday) {
    if (isRelease1EntryRegistrationUpdateMode(movie)) {
      applyRelease1EntryRegistrationFields(movie, fields);
      return true;
    }

    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      birthday: sanitizeSingleLine(value).slice(0, 32)
    });
    return true;
  }

  if (elementId === registrationFieldIds.email || elementId === registrationTextMembers.email) {
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      email: sanitizeSingleLine(value).slice(0, 115)
    });
    return true;
  }

  if (elementId === registrationFieldIds.phone || elementId === registrationTextMembers.phone || elementId === registrationTextMembers.phoneSource) {
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      phone: sanitizeSingleLine(value).slice(0, 115)
    });
    return true;
  }

  if (elementId === registrationFieldIds.mission || elementId === registrationTextMembers.mission) {
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      mission: sanitizeSingleLine(value).slice(0, 115)
    });
    return true;
  }

  return false;
}

export function queueRelease1EntryRegistrationNameCheck(movie: DirectorMovie, elementId: string): boolean {
  if (isRelease1EntryRegistrationUpdateMode(movie)) {
    return elementId === registrationFieldIds.characterName || elementId === registrationTextMembers.characterName;
  }

  return isRelease1EntryMovie(movie)
    ? queueRelease1EntryRegistrationNameCheckRuntime(movie, elementId, nameCheckHost)
    : false;
}

export function completeRelease1EntryRegistrationNamePacket(
  movie: DirectorMovie,
  packetName: string,
  body = ""
): boolean {
  return isRelease1EntryMovie(movie)
    ? completeRelease1EntryRegistrationNamePacketRuntime(movie, packetName, body, nameCheckHost)
    : false;
}

export function activateRelease1EntryRegistrationElement(
  movie: DirectorMovie,
  elementId: string,
  activation: HabboWindowElementActivation | undefined
): boolean {
  if (!isRelease1EntryMovie(movie)) {
    return false;
  }

  if (elementId === "reg_direct_mail" && acceptsMouseDown(activation)) {
    const fields = readRelease1EntryRegistrationFields(movie);
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      directMail: fields.directMail === "1" ? "0" : "1"
    });
    return true;
  }

  if (elementId === "reg_agreement" && acceptsMouseDown(activation)) {
    const fields = readRelease1EntryRegistrationFields(movie);
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      agreement: fields.agreement === "1" ? "0" : "1"
    });
    return true;
  }

  if ((elementId === "reg_sex_female" || elementId === "reg_sex_male") && acceptsMouseDown(activation)) {
    const fields = readRelease1EntryRegistrationFields(movie);
    applyRelease1EntryRegistrationFields(movie, {
      ...fields,
      sex: elementId === "reg_sex_female" ? "Female" : "Male"
    });
    return true;
  }

  if (elementId === "reg_back_button" && acceptsMouseUp(activation)) {
    const target = isRelease1EntryRegistrationUpdateMode(movie) ? "hotel" : "login";
    movie.go(target);
    movie.setProperty("lastLoginAction", {
      elementId,
      action: target,
      source: sourcePaths.goToFrame
    });
    return true;
  }

  if (elementId === "reg_next_button" && acceptsMouseUp(activation)) {
    return runRegistrationPasswordCheckAndGo(movie);
  }

  if (elementId === "reg_figure_back_button" && acceptsMouseUp(activation)) {
    const target = isRelease1EntryRegistrationUpdateMode(movie) ? "change1" : "regist_2";
    movie.go(target);
    movie.setProperty("lastLoginAction", {
      elementId,
      action: target,
      source: sourcePaths.goToFrame
    });
    return true;
  }

  if (elementId === "reg_figure_next_button" && acceptsMouseDown(activation)) {
    applyRelease1EntryFigureField(movie);
    return true;
  }

  if (elementId === "reg_figure_next_button" && acceptsMouseUp(activation)) {
    applyRelease1EntryFigureField(movie);
    runRelease1EntryRegisterRequest(movie);
    movie.go(isRelease1EntryRegistrationUpdateMode(movie) ? "doupdate" : "doregist");
    movie.setProperty("windowInteractiveElements", []);
    return true;
  }

  if (activateRelease1EntryFigureElement(movie, elementId, activation)) {
    return true;
  }

  return false;
}

function collectSourceRegistrationChannels(movie: DirectorMovie): {
  readonly characterName: SourceChannel;
  readonly passwordDisplay: SourceChannel;
  readonly passwordConfirmDisplay: SourceChannel;
  readonly birthday: SourceChannel;
  readonly email: SourceChannel;
  readonly phone: SourceChannel;
  readonly mission: SourceChannel;
  readonly backButton: SourceChannel;
  readonly nextButton: SourceChannel;
  readonly directMailCheckbox: SourceChannel;
  readonly agreementCheckbox: SourceChannel;
  readonly sexFemale: SourceChannel;
  readonly sexMale: SourceChannel;
} | undefined {
  const characterName = sourceChannelByMemberName(movie, registrationTextMembers.characterName);
  const passwordDisplay = sourceChannelByMemberName(movie, registrationTextMembers.passwordDisplay);
  const passwordConfirmDisplay = sourceChannelByMemberName(movie, registrationTextMembers.passwordConfirmDisplay);
  const birthday = sourceChannelByMemberName(movie, registrationTextMembers.birthday);
  const email = sourceChannelByMemberName(movie, registrationTextMembers.email);
  const phone = sourceChannelByMemberName(movie, registrationTextMembers.phone);
  const mission = sourceChannelByMemberName(movie, registrationTextMembers.mission);
  const backButton = sourceChannelByBehaviorName(movie, "Go To Frame", (candidate) => !channelHasBehavior(movie, candidate.channel, "passwordCheckAndGo"));
  const nextButton = sourceChannelByBehaviorName(movie, "passwordCheckAndGo");
  const directMailCheckbox = sourceChannelByBehaviorName(movie, "spam_checkbox behavior");
  const agreementCheckbox = sourceChannelByBehaviorName(movie, "Agreement");
  const sexChannels = sourceChannelsByBehaviorName(movie, "ChangeSex").sort((left, right) => left.bounds.x - right.bounds.x);

  if (!characterName || !passwordDisplay || !passwordConfirmDisplay || !birthday || !email || !phone || !mission
    || !backButton || !nextButton || !directMailCheckbox || !agreementCheckbox || sexChannels.length < 2) {
    return undefined;
  }

  const sexFemale = sexChannels[0];
  const sexMale = sexChannels[1];
  if (!sexFemale || !sexMale) {
    return undefined;
  }

  return {
    characterName,
    passwordDisplay,
    passwordConfirmDisplay,
    birthday,
    email,
    phone,
    mission,
    backButton,
    nextButton,
    directMailCheckbox,
    agreementCheckbox,
    sexFemale,
    sexMale
  };
}

function sourceFieldElement(
  movie: DirectorMovie,
  id: string,
  channel: SourceChannel,
  label: string,
  clientId: string,
  password = false,
  editable = true
): HabboWindowInteractiveElement {
  return {
    id,
    windowId: "#release1_entry_registration",
    kind: "field",
    ...unionBounds(channel.bounds, findNearestTextFieldBackground(movie, channel)?.bounds),
    label,
    editable,
    password,
    textAlign: "left",
    clientId
  };
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

function initializeRelease1EntryRegistrationFields(movie: DirectorMovie): void {
  if (movie.getProperty("release1EntryRegistrationFields") !== undefined) {
    return;
  }

  applyRelease1EntryRegistrationFields(movie, {
    characterName: "",
    password: "",
    passwordConfirm: "",
    birthday: "dd.mm.yyyy",
    email: "",
    phone: "+44",
    mission: "",
    agreement: "",
    directMail: "1",
    sex: "Female"
  });
  movie.setProperty("release1EntryRegistrationInitialized", {
    source: sourcePaths.clearFields
  });
}

function readRelease1EntryRegistrationFields(movie: DirectorMovie): RegistrationFields {
  initializeRelease1EntryRegistrationFields(movie);
  const fields = readRecord(movie.getProperty("release1EntryRegistrationFields")) ?? {};
  return {
    characterName: stringField(fields.characterName),
    password: stringField(fields.password),
    passwordConfirm: stringField(fields.passwordConfirm),
    birthday: stringField(fields.birthday, "dd.mm.yyyy"),
    email: stringField(fields.email),
    phone: stringField(fields.phone, "+44"),
    mission: stringField(fields.mission),
    agreement: stringField(fields.agreement),
    directMail: stringField(fields.directMail, "1"),
    sex: fields.sex === "Male" ? "Male" : "Female"
  };
}

function applyRelease1EntryUpdateFields(movie: DirectorMovie, userObject?: Release1UserObjectFields): void {
  const existingUserObject = readRecord(movie.getProperty("release1EntryUserObject")) ?? {};
  const fields = {
    ...existingUserObject,
    ...(userObject ?? {})
  };
  const current = readRelease1EntryRegistrationFields(movie);
  const name = stringField(fields.name, current.characterName || memberTextByName(movie, registrationTextMembers.loginName));
  const birthday = stringField(fields.birthday, current.birthday);
  const phone = stringField(fields.phonenumber, stringField(fields.phoneNumber, current.phone || "+44"));
  const sex = normalizeSex(stringField(fields.sex, current.sex));
  applyRelease1EntryRegistrationFields(movie, {
    characterName: name,
    password: "",
    passwordConfirm: "",
    birthday,
    email: stringField(fields.email, current.email),
    phone,
    mission: stringField(fields.customData, current.mission),
    agreement: stringField(fields.has_read_agreement, current.agreement || "1"),
    directMail: stringField(fields.directMail, current.directMail || "1"),
    sex
  });
  const figure = stringField(fields.figure);
  if (figure) {
    movie.setProperty("release1EntryFigureParts", undefined);
    movie.setProperty("release1EntryFigureColors", undefined);
    movie.setProperty("release1EntryFigureInitializedFrom", undefined);
    movie.setProperty("release1EntryFigurePartChangers", undefined);
    setTextValues(movie, {
      figure_field: figure
    });
  }
  movie.setProperty("release1EntryUpdateLockedFields", {
    characterName: name,
    birthday,
    source: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 1 - EnterpriseServer Connection Scripts.ls"
  });
}

function applyRelease1EntryRegistrationFields(movie: DirectorMovie, fields: RegistrationFields): void {
  const passwordDisplay = "*".repeat(fields.password.length);
  const passwordConfirmDisplay = "*".repeat(fields.passwordConfirm.length);
  movie.setProperty("release1EntryRegistrationFields", fields);
  setTextValues(movie, {
    [registrationTextMembers.characterName]: fields.characterName,
    [registrationTextMembers.password]: fields.password,
    [registrationTextMembers.passwordConfirm]: fields.passwordConfirm,
    [registrationTextMembers.passwordDisplay]: passwordDisplay,
    [registrationTextMembers.passwordConfirmDisplay]: passwordConfirmDisplay,
    [registrationTextMembers.birthday]: fields.birthday,
    [registrationTextMembers.email]: fields.email,
    [registrationTextMembers.phone]: fields.phone,
    [registrationTextMembers.phoneSource]: fields.phone,
    [registrationTextMembers.mission]: fields.mission,
    [registrationTextMembers.agreement]: fields.agreement,
    [registrationTextMembers.directMail]: fields.directMail,
    [registrationTextMembers.sex]: fields.sex
  });
  movie.setProperty("windowFieldValues", {
    ...readWindowFieldValues(movie),
    [registrationFieldIds.characterName]: fields.characterName,
    [registrationFieldIds.password]: fields.password,
    [registrationFieldIds.passwordConfirm]: fields.passwordConfirm,
    [registrationFieldIds.birthday]: fields.birthday,
    [registrationFieldIds.email]: fields.email,
    [registrationFieldIds.phone]: fields.phone,
    [registrationFieldIds.mission]: fields.mission
  });
  applyRelease1EntryRegistrationVisualState(movie, fields);
}

function applyRelease1EntryRegistrationVisualState(movie: DirectorMovie, fields: RegistrationFields): void {
  setBehaviorSpriteMember(movie, "spam_checkbox behavior", fields.directMail === "1" ? "checkbox on" : "checkbox off");
  setBehaviorSpriteMember(movie, "Agreement", fields.agreement === "1" ? "checkbox on" : "checkbox off");
  const sexChannels = sourceChannelsByBehaviorName(movie, "ChangeSex").sort((left, right) => left.bounds.x - right.bounds.x);
  setSpriteMemberByChannel(movie, sexChannels[0]?.channel, fields.sex === "Female" ? "radiobutton on" : "radiobutton off");
  setSpriteMemberByChannel(movie, sexChannels[1]?.channel, fields.sex === "Male" ? "radiobutton on" : "radiobutton off");
}

function runRegistrationPasswordCheckAndGo(movie: DirectorMovie): boolean {
  const fields = readRelease1EntryRegistrationFields(movie);
  const updateMode = isRelease1EntryRegistrationUpdateMode(movie);
  const alerts: string[] = [];
  if (fields.password.length < 3) {
    alerts.push("YourPasswordIstooShort");
  } else if (fields.password !== fields.passwordConfirm || fields.password.length === 0 || fields.agreement !== "1" || fields.characterName.length === 0) {
    if (fields.password !== fields.passwordConfirm || fields.password.length === 0) {
      alerts.push("CheckPassword");
    }
    if (fields.agreement !== "1") {
      alerts.push("YouMustAgree");
    }
  } else {
    const emailOk = isSourceValidEmail(fields.email);
    const birthdayOk = isSourceValidBirthday(fields.birthday);
    if (emailOk && birthdayOk) {
      setTextValues(movie, {
        [registrationTextMembers.loginPassword]: fields.password,
        [registrationTextMembers.loginName]: fields.characterName
      });
      movie.setProperty("release1EntryRegistrationReady", {
        action: updateMode ? "change2" : "figure",
        source: sourcePaths.passwordCheck
      });
      movie.go(updateMode ? "change2" : "figure");
      movie.setProperty("windowInteractiveElements", []);
      return true;
    }

    if (!emailOk && birthdayOk) {
      alerts.push("emailNotCorrect");
    } else if (emailOk && !birthdayOk) {
      alerts.push("CheckBirthday");
    } else {
      alerts.push("CheckEmailandBirthday");
    }
  }

  movie.setProperty("release1EntryRegistrationAlert", {
    alerts,
    source: sourcePaths.passwordCheck
  });
  for (const alert of alerts) {
    showRelease1EntryAlert(movie, alert, undefined, "", [sourcePaths.passwordCheck]);
  }
  movie.debugLog.add("login", "warn", `release1 registration validation alerts=${alerts.join(",")}`);
  return true;
}

function runRelease1EntryRegisterRequest(movie: DirectorMovie): void {
  const fields = readRelease1EntryRegistrationFields(movie);
  const figure = applyRelease1EntryFigureField(movie);
  const command = isRelease1EntryRegistrationUpdateMode(movie) ? "UPDATE" : "REGISTER";
  const body = [
    `name=${fields.characterName}`,
    `password=${fields.password}`,
    `email=${fields.email}`,
    `figure=${figure.replace(/[\r\n]+/g, "")}`,
    `directMail=${fields.directMail}`,
    `birthday=${fields.birthday}`,
    `phonenumber=${fields.phone}`,
    `customData=${fields.mission}`,
    `has_read_agreement=${fields.agreement}`,
    `sex=${fields.sex}`,
    "country="
  ].join("\r");
  movie.setProperty("release1EntryRegisterRequest", {
    command,
    body,
    source: sourcePaths.fuseRegister,
    frameSource: sourcePaths.doRegister
  });
  movie.setProperty("lastLoginAction", {
    elementId: "reg_figure_next_button",
    action: command,
    source: sourcePaths.fuseRegister
  });
}

function isRelease1EntryRegistrationUpdateMode(movie: DirectorMovie): boolean {
  return isRelease1EntryMovie(movie) && movie.getProperty("release1EntryRegistrationMode") === "update";
}

function sourceChannelByMemberName(movie: DirectorMovie, memberName: string): SourceChannel | undefined {
  const normalizedName = memberName.toLowerCase();
  for (const sprite of movie.currentFrame.sprites) {
    const member = movie.cast.getMember(sprite.member);
    if (member?.name?.toLowerCase() !== normalizedName) {
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
  const normalizedName = behaviorName.toLowerCase();
  return movie.score.activeBehaviorIntervals(movie.currentFrameIndex).some((behavior) => {
    if (behavior.channel !== channel) {
      return false;
    }

    return movie.cast.getMember(behavior.script)?.name?.toLowerCase() === normalizedName;
  });
}

function findNearestTextFieldBackground(movie: DirectorMovie, channel: SourceChannel): SourceChannel | undefined {
  let nearest: SourceChannel | undefined;
  let nearestScore = Number.POSITIVE_INFINITY;
  const fieldCenter = rectCenter(channel.bounds);
  for (const sprite of movie.currentFrame.sprites) {
    const member = movie.cast.getMember(sprite.member);
    if (member?.name?.startsWith("textfieldbg_") !== true) {
      continue;
    }

    const bounds = sourceBoundsForSprite(movie, sprite);
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

function memberTextByName(movie: DirectorMovie, name: string): string {
  const member = movie.cast.getMemberByName(name);
  return member && isTextLikeMember(member) ? member.text ?? "" : "";
}

function setBehaviorSpriteMember(movie: DirectorMovie, behaviorName: string, memberName: string): void {
  const channel = sourceChannelByBehaviorName(movie, behaviorName);
  setSpriteMemberByChannel(movie, channel?.channel, memberName);
}

function setSpriteMemberByChannel(movie: DirectorMovie, channel: number | undefined, memberName: string): void {
  setRelease1SpriteMemberByChannel(movie, channel, memberName);
}

function isTextLikeMember(member: DirectorMember): boolean {
  return member.type === "text" || member.type === "field";
}

function acceptsMouseDown(activation: HabboWindowElementActivation | undefined): boolean {
  return activation?.event === "mouseDown" || activation?.event === undefined;
}

function acceptsMouseUp(activation: HabboWindowElementActivation | undefined): boolean {
  return activation?.event === "mouseUp" || activation?.event === undefined;
}

function isSourceValidBirthday(value: string): boolean {
  if (value.length <= 8) {
    return false;
  }

  const sourceSlice = value.slice(value.length - 4, value.length - 2);
  return sourceSlice === "19" || sourceSlice === "20";
}

function isSourceValidEmail(value: string): boolean {
  if (value.length <= 6 || !value.includes("@")) {
    return false;
  }

  const atIndex = value.indexOf("@");
  for (let index = atIndex + 1; index < value.length; index++) {
    if (value[index] === "@") {
      return false;
    }
    if (value[index] === ".") {
      return true;
    }
  }

  return false;
}

function readWindowFieldValues(movie: DirectorMovie): Record<string, string> {
  const value = readRecord(movie.getProperty("windowFieldValues"));
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function isRelease1EntryMovie(movie: DirectorMovie): boolean {
  return movie.id === release1EntryMovieId
    || readRecord(movie.getProperty("release1EntryState"))?.release === release1EntryRelease;
}

function sanitizeSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, "");
}

function sanitizeNoSpace(value: string): string {
  return sanitizeSingleLine(value).replace(/\s+/g, "");
}

function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeSex(value: string): "Female" | "Male" {
  return value === "M" || value === "Male" ? "Male" : "Female";
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}
