import { LingoList, parseLingoLiteral } from "../../../lingo";
import type {
  DirectorMemberManifest,
  DirectorMemberRef,
  DirectorMovie,
  DirectorSpriteChannelManifest,
  UnsupportedFeature
} from "../../../runtime";
import type {
  HabboExternalCastVisualLayout,
  HabboExternalCastVisualLayoutSet,
  HabboWindowLayoutElement
} from "../../boot/HabboBootResourceTypes";
import {
  normalizeCastName,
  normalizeSymbolKey,
  stringProperty
} from "../../HabboSourceValueHelpers";
import {
  isWindowElementFlippedH,
  isWindowElementFlippedV
} from "../../window/HabboWindowLayoutHelpers";
import { createRuntimeEntryVisualShapeMember } from "../../window/HabboRuntimeWindowMembers";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import { readSpriteManifestArray } from "../../room/HabboRoomObjectSpritePlanning";

export const entryViewDelayMs = 500;
export const entryViewOpenDurationMs = 500;
export const entrySignStepPx = 30;

export interface HabboEntryVisualAnimationSprite {
  readonly channel: number;
  readonly id: string;
  readonly memberName?: string;
  readonly sourceSprByIdTarget?: boolean;
  readonly animationPrefix?: string;
  readonly animationClass?: string;
  readonly memberSwapFrames?: readonly DirectorMemberRef[];
  readonly memberSwapInitDelay?: number;
  readonly memberSwapDelay?: number;
  readonly cloudVerticalDirection?: number;
  readonly cloudTravelWidth?: number;
  readonly cloudTurnPoint?: number;
  readonly cloudMemberLeft?: DirectorMemberRef;
  readonly cloudMemberRight?: DirectorMemberRef;
  readonly carCount?: number;
  readonly carDirection?: "left" | "right";
  readonly initialLoc: { readonly x: number; readonly y: number };
  readonly openLoc: { readonly x: number; readonly y: number };
  readonly width: number;
  readonly height: number;
}

export interface HabboEntryVisualAnimationSnapshot {
  readonly release: string;
  readonly visual: string;
  readonly source: string;
  readonly elapsedMs: number;
  readonly phase: "waiting" | "opening" | "sign" | "open";
  readonly delayMs: number;
  readonly openDurationMs: number;
  readonly signStepPx: number;
  readonly frameTempo: number;
}

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";
const loginInterfaceClassSource = "hh_shared/casts/External/ParentScript 3 - Login Interface Class.ls";

export interface HabboEntryHotelViewRuntimeHost {
  readonly movie: DirectorMovie;
  readonly loadedCastSlots: ReadonlyMap<string, number>;
  readonly externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet;
  readonly objectManager: {
    getObject(id: string): { get(key: string): unknown; set(key: string, value: unknown): void } | undefined;
    objectExists(id: string): boolean;
  };
  readonly texts: Map<string, string>;
  readonly loginFieldValues: Map<string, string>;
  readonly windowTextValues: Map<string, string>;
  readonly windows: Map<string, HabboWindowRecord>;
  readonly resourceManager: {
    getMemberRef(memberName: string): DirectorMemberRef | undefined;
    preIndexMembers(): void;
    readonly indexedMemberCount: number;
  };
  [key: string]: unknown;

  sourcePathForClass(className: string, release: string, fallback: string): string;
  getVariable(key: string): unknown;
  getRuntimeEntryVisualCastSlot(): number;
  createWindow(id: string, template?: string, x?: number, y?: number): HabboWindowRecord;
  mergeWindowLayout(window: HabboWindowRecord, memberName: string): void;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  scheduleDelay(clientId: string, method: string, delayMs: number, argument: unknown, source?: string): unknown;
  removeLoginWindowPair(release: string): void;
  executeMessage(message: string, argument: unknown, release: string): boolean;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedVisualElement(release: string, layout: HabboExternalCastVisualLayout, element: HabboWindowLayoutElement): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  syncDirectorOverlaySprites(): void;
}

export function showEntryHotelViewRuntime(host: HabboEntryHotelViewRuntimeHost, release: string): boolean {
  const requestedVisualName = getEntryHotelVisualMemberNameRuntime(host, release);
  const visual = resolveLoadedVisualLayoutRuntime(host, requestedVisualName);
  if (!visual) {
    host.movie.setProperty("entryHotelViewVisible", false);
    const visualCandidates = host.externalCastVisualLayoutSet?.visuals.filter((entry) => entry.memberName.toLowerCase() === requestedVisualName.toLowerCase()) ?? [];
    host.recordUnsupportedOnce(`entry-visual-layout-missing:${requestedVisualName}`, {
      subsystem: "habbo",
      feature: "entry-visual-layout-missing",
      detail: visualCandidates.length > 1
        ? `${release} Entry Interface Class showHotel requested ${requestedVisualName}, but ${visualCandidates.length} generated localized visual layouts exist and no loaded cast member resolved the source member`
        : `${release} Entry Interface Class showHotel requested ${requestedVisualName}, but no loaded generated visual layout was available`,
      source: host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource)
    });
    return false;
  }

  const sprites: DirectorSpriteChannelManifest[] = [];
  const animationSprites: HabboEntryVisualAnimationSprite[] = [];
  const bitmapChannels: number[] = [];
  const shapeChannels: number[] = [];
  const inactiveElements: number[] = [];
  const castLib = host.loadedCastSlots.get(normalizeCastName(visual.castName));
  const runtimeVisualCastLib = host.getRuntimeEntryVisualCastSlot();
  const runtimeMembers: DirectorMemberManifest[] = [];
  const visualizerLocZ = numberFromUnknown(host.getVariable("visualizer.default.locz"), -20000000);
  const sourceSprByIdTargets = sourceVisualizerSpriteTargetsById(visual.elements);

  for (const element of visual.elements) {
    if (element.locH === undefined || element.locV === undefined) {
      continue;
    }

    if (element.active === false) {
      inactiveElements.push(element.index);
    }

    const shapeMemberNumber = runtimeMembers.length + 1;
    const memberRef = element.media === "shape"
      ? {
          castLib: runtimeVisualCastLib,
          member: shapeMemberNumber
        }
      : element.media === "bitmap" && element.resolvedMember && castLib !== undefined
      ? {
          castLib,
          member: element.resolvedMember.member
        }
      : undefined;

    if (element.media === "shape") {
      runtimeMembers.push(createRuntimeEntryVisualShapeMember(shapeMemberNumber, visual, element));
      if (stringProperty(element.properties, "color") === undefined) {
        host.recordUnsupportedOnce(`entry-visual-shape-color-default:${visual.castName}:${element.index}`, {
          subsystem: "habbo",
          feature: "entry-visual-shape-color-default",
          detail: `${release} ${visual.memberName} element ${element.index} (${element.id ?? element.memberName ?? "unnamed"}) is a generated visualizer shape without an extracted color property; rendering uses Director's black shape fallback until shape member specifics are decoded`,
          source: visual.textChunkPath
        });
      }
    }

    if (!memberRef) {
      if (element.media === "bitmap" && element.resolvedMember && castLib === undefined) {
        host.recordUnsupportedOnce(`entry-visual-cast-not-loaded:${visual.castName}`, {
          subsystem: "habbo",
          feature: "entry-visual-cast-not-loaded",
          detail: `${release} ${visual.memberName} references ${visual.castName}, but that external cast has not been imported`,
          source: visual.textChunkPath
        });
      } else {
        host.recordUnsupportedVisualElement(release, visual, element);
      }
      continue;
    }

    const initialLoc = resolveEntryVisualInitialLocation(visual, element);
    const openLoc = resolveEntryVisualOpenLocation(visual, element, initialLoc);
    const sprite: DirectorSpriteChannelManifest = {
      channel: 500 + element.index + 1,
      member: memberRef,
      loc: initialLoc,
      locZ: resolveEntryVisualLocZ(element, visualizerLocZ),
      ...(element.width !== undefined ? { width: element.width } : {}),
      ...(element.height !== undefined ? { height: element.height } : {}),
      ...(element.ink !== undefined ? { ink: element.ink } : {}),
      ...(element.blend !== undefined ? { blend: element.blend } : {}),
      ...(isWindowElementFlippedH(element) ? { flipH: true } : {}),
      ...(isWindowElementFlippedV(element) ? { flipV: true } : {}),
      visible: true
    };
    sprites.push(sprite);
    animationSprites.push({
      channel: sprite.channel,
      id: element.id ?? element.memberName ?? `element-${element.index}`,
      sourceSprByIdTarget: element.id === undefined ? true : sourceSprByIdTargets.get(element.id) === element.index,
      ...resolveEntryVisualDynamicAnimationRuntime(host, visual, element),
      initialLoc,
      openLoc,
      width: element.width ?? 0,
      height: element.height ?? 0
    });
    if (element.media === "shape") {
      shapeChannels.push(sprite.channel);
    } else {
      bitmapChannels.push(sprite.channel);
    }
  }

  if (runtimeMembers.length > 0) {
    host.movie.cast.importOrCreateCastLib({
      number: runtimeVisualCastLib,
      name: "runtime_entry_visuals",
      fileName: "runtime-entry-visuals",
      members: runtimeMembers
    });
    host.resourceManager.preIndexMembers();
    host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
    host.movie.setProperty("runtimeEntryVisualCastLib", runtimeVisualCastLib);
  }

  host.movie.setProperty("entryHotelViewVisible", true);
  host.movie.setProperty("entryVisualOverlaySprites", sprites);
  host.movie.setProperty("entryVisualAnimationSprites", animationSprites);
  host.movie.setProperty("entryVisuals", {
    release,
    visual: visual.memberName,
    spriteCount: sprites.length,
    bitmapSpriteCount: bitmapChannels.length,
    shapeSpriteCount: shapeChannels.length,
    channels: sprites.map((sprite) => sprite.channel),
    bitmapChannels,
    shapeChannels,
    inactiveElements
  });
  advanceEntryHotelAnimationRuntime(host, 0, release);
  host.recordUnsupportedOnce("entry-interface-showhotel-partial", {
    subsystem: "habbo",
    feature: "entry-interface-showhotel-partial",
    detail: `${release} Entry Interface Class showHotel is modeled as generated visualizer sprite channels with the evidenced openView/animSign timing; generic visualizer object APIs remain incomplete`,
    source: host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource)
  });
  return true;
}

export function readEntryVisualAnimationSprites(value: unknown): HabboEntryVisualAnimationSprite[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboEntryVisualAnimationSprite => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }

    const sprite = entry as HabboEntryVisualAnimationSprite;
    return typeof sprite.channel === "number"
      && typeof sprite.id === "string"
      && typeof sprite.initialLoc?.x === "number"
      && typeof sprite.initialLoc?.y === "number"
      && typeof sprite.openLoc?.x === "number"
      && typeof sprite.openLoc?.y === "number"
      && typeof sprite.width === "number"
      && typeof sprite.height === "number";
  });
}

export function readEntryVisualAnimationMappings(value: unknown): readonly { readonly animationPrefix: string; readonly animationClass: string }[] {
  const entries = value instanceof LingoList ? value.toArray() : Array.isArray(value) ? value : [];
  return entries.flatMap((entry) => {
    const pair = entry instanceof LingoList ? entry.toArray() : Array.isArray(entry) ? entry : [];
    const animationPrefix = pair[0];
    const animationClass = pair[1];
    return typeof animationPrefix === "string" && typeof animationClass === "string"
      ? [{ animationPrefix, animationClass }]
      : [];
  });
}

export function showLoginWindowPairRuntime(host: HabboEntryHotelViewRuntimeHost, release: string): boolean {
  const loginComponentSource = host.sourcePathForClass("Login Component Class", release, "hh_shared/casts/External/ParentScript 4 - Login Component Class.ls");
  const loginInterfaceSource = host.sourcePathForClass("Login Interface Class", release, loginInterfaceClassSource);
  const loginInterface = host.objectManager.getObject("#login_interface");
  if (!loginInterface) {
    host.recordUnsupportedOnce("login-interface-object-missing", {
      subsystem: "habbo",
      feature: "login-interface-object-missing",
      detail: `${release} Login Component Class initB expected #login_interface before showLogin`,
      source: loginComponentSource
    });
    return false;
  }

  host.objectManager.getObject("#session")?.set("userName", "");
  host.objectManager.getObject("#session")?.set("password", "");
  loginInterface.set("tempPassword", []);
  host.loginFieldValues.clear();
  host.loginFieldValues.set("login_username", "");
  host.loginFieldValues.set("login_password", "");
  host.syncWindowFieldValueSnapshot();

  const loginA = host.createWindow("#login_a", "habbo_simple.window", 444, 100);
  host.mergeWindowLayout(loginA, "login_a.window");
  host.registerWindowClient(loginA, "#login_interface");
  host.registerWindowProcedure(loginA, "#eventProcLogin", "#login_interface", "#mouseUp");

  const loginB = host.createWindow("#login_b", "habbo_simple.window", 444, 230);
  host.mergeWindowLayout(loginB, "login_b.window");
  host.registerWindowClient(loginB, "#login_interface");
  host.registerWindowProcedure(loginB, "#eventProcLogin", "#login_interface", "#mouseUp");
  host.registerWindowProcedure(loginB, "#eventProcLogin", "#login_interface", "#keyDown");
  loginB.focusedElement = "login_username";

  host.movie.setProperty("loginWindowsVisible", true);
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("windows", "ok", "showLogin windows=2 templates=habbo_simple.window layouts=login_a.window,login_b.window");
  host.recordUnsupportedOnce("login-window-rendering-partial", {
    subsystem: "habbo",
    feature: "login-window-rendering-partial",
    detail: `${release} Login Interface Class showLogin creates login_a/login_b windows and bitmap sprite channels from generated layout data; text fields and full visualizer behavior are still unsupported`,
    source: loginInterfaceSource
  });
  return true;
}

export function showUserFoundRuntime(host: HabboEntryHotelViewRuntimeHost, release: string): boolean {
  let loginB = host.windows.get(normalizeSymbolKey("#login_b"));
  if (!loginB) {
    loginB = host.createWindow("#login_b", "habbo_simple.window", 444, 230);
    host.registerWindowClient(loginB, "#login_interface");
    host.registerWindowProcedure(loginB, "#eventProcLogin", "#login_interface", "#mouseUp");
  }

  const session = host.objectManager.getObject("#session");
  const userName = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
  const welcome = host.texts.get("login_welcome") ?? "";
  host.mergeWindowLayout(loginB, "login_c.window");
  host.loginFieldValues.clear();
  host.windowTextValues.set("login_c_welcome", `${welcome} ${userName}`.trim());
  host.movie.setProperty("loginWindowsVisible", true);
  host.movie.setProperty("loginUserFoundVisible", true);
  host.movie.setProperty("loginUserFoundAnimation", "wave");
  host.movie.setProperty("loginUserFoundAnimationFrame", 0);
  host.movie.setProperty("loginUserFoundAnimationElapsedMs", 0);
  host.movie.setProperty("lastLoginUserFound", {
    userName,
    source: `extracted/projectorrays/${release}/${loginInterfaceClassSource}`,
    window: "login_c.window",
    figurePreviewObjectExists: host.objectManager.objectExists("Figure_Preview")
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);

  if (host.objectManager.objectExists("Figure_Preview")) {
    host.scheduleDelay("#login_interface", "#myHabboSmile", 800, undefined, host.sourcePathForClass("Login Interface Class", release, loginInterfaceClassSource));
  } else {
    host.removeLoginWindowPair(release);
  }

  host.logDebug("login", "ok", `showUserFound user=${userName || "unknown"}`);
  host.recordUnsupportedOnce("login-user-found-animation-partial", {
    subsystem: "habbo",
    feature: "login-user-found-animation-partial",
    detail: `${release} Login Interface Class showUserFound swaps login_b to login_c.window and schedules the wave/smile/hide timing; Figure_Preview.createTemplateHuman exact animation buffering remains partial`,
    source: host.sourcePathForClass("Login Interface Class", release, loginInterfaceClassSource)
  });
  return true;
}

export function setLoginFieldValueRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  elementId: string,
  value: string,
  release: string
): boolean {
  if (!host.movie.getProperty("loginWindowsVisible")) {
    return false;
  }

  const normalizedValue = value.slice(0, 64);
  host.loginFieldValues.set(elementId, normalizedValue);
  const loginInterface = host.objectManager.getObject("#login_interface");
  if (loginInterface && elementId === "login_password") {
    loginInterface.set("tempPassword", [...normalizedValue]);
  }

  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("login", "info", `field=${elementId} length=${normalizedValue.length}`);
  return true;
}

export function activateLoginElementRuntime(host: HabboEntryHotelViewRuntimeHost, elementId: string, release: string): boolean {
  if (!host.movie.getProperty("loginWindowsVisible")) {
    return false;
  }

  if (elementId === "login_ok") {
    const userName = host.loginFieldValues.get("login_username") ?? "";
    const password = host.loginFieldValues.get("login_password") ?? "";
    const accepted = userName.length > 0 && password.length > 0;
    const session = host.objectManager.getObject("#session");
    if (accepted) {
      session?.set("userName", userName);
      session?.set("password", password);
    }

    host.movie.setProperty("lastLoginAttempt", {
      elementId,
      accepted,
      userName,
      passwordLength: password.length
    });
    host.logDebug("login", accepted ? "ok" : "warn", `submit accepted=${accepted} user=${userName} passwordLength=${password.length}`);
    host.recordUnsupportedOnce("login-response-flow-partial", {
      subsystem: "habbo",
      feature: "login-response-flow-partial",
      detail: `${release} Login Interface Class tryLogin reaches the source-backed OK button path; the browser bridge sends release7 TRY_LOGIN, but full response-driven client progression remains partial`,
      source: `extracted/projectorrays/${release}/hh_shared/casts/External/ParentScript 3 - Login Interface Class.ls`
    });
    return true;
  }

  if (elementId === "login_createUser") {
    host.movie.setProperty("lastLoginAction", {
      elementId,
      action: "show_registration"
    });
    host.logDebug("login", "info", "link=login_createUser action=show_registration");
    host.removeLoginWindowPair(release);
    return host.executeMessage("#show_registration", undefined, release);
  }

  if (elementId === "login_forgotten") {
    host.movie.setProperty("lastLoginAction", {
      elementId,
      action: "open_net_page",
      url: host.texts.get("login_forgottenPassword_url")
    });
    host.logDebug("login", "info", "link=login_forgotten action=open_net_page");
    host.recordUnsupportedOnce("open-net-page-not-implemented", {
      subsystem: "director",
      feature: "open-net-page-not-implemented",
      detail: `${release} Login Interface Class would open login_forgottenPassword_url; browser page navigation is recorded only`,
      source: `extracted/projectorrays/${release}/hh_shared/casts/External/ParentScript 3 - Login Interface Class.ls`
    });
    return true;
  }

  return false;
}

export function getEntryHotelVisualMemberNameRuntime(host: HabboEntryHotelViewRuntimeHost, release: string): string {
  const entrySource = host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource).replaceAll("\\", "/");
  // V14 source evidence: hh_entry/casts/External/ParentScript 3 - Entry Interface Class.ls
  // calls createVisualizer(pEntryVisual, "entry.visual"). V7 hh_entry_fi keeps the
  // localized member name "entry_fi.visual".
  return entrySource.includes("/hh_entry/casts/External/") ? "entry.visual" : "entry_fi.visual";
}

export function resolveLoadedVisualLayoutRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  memberName: string
): HabboExternalCastVisualLayout | undefined {
  const visuals = host.externalCastVisualLayoutSet?.visuals.filter((entry) => entry.memberName.toLowerCase() === memberName.toLowerCase()) ?? [];
  if (visuals.length === 0) {
    return undefined;
  }

  const memberRef = host.resourceManager.getMemberRef(memberName);
  if (!memberRef) {
    return visuals.length === 1 ? visuals[0] : undefined;
  }

  const loadedCast = [...host.loadedCastSlots.entries()].find((entry) => entry[1] === memberRef.castLib)?.[0];
  if (!loadedCast) {
    return visuals.length === 1 ? visuals[0] : undefined;
  }

  return visuals.find((entry) => normalizeCastName(entry.castName) === loadedCast && entry.member === memberRef.member);
}

export function resolveEntryVisualDynamicAnimationRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  visual: HabboExternalCastVisualLayout,
  element: HabboWindowLayoutElement
): Partial<HabboEntryVisualAnimationSprite> {
  const memberName = element.memberName ?? stringProperty(element.properties, "member");
  const memberSwapType = stringProperty(element.properties, "swapAnimType");
  const memberSwapFrames = memberSwapType?.toLowerCase() === "memberswap" && memberName
    ? resolveEntryVisualMemberSwapFramesRuntime(host, visual, memberName, stringProperty(element.properties, "swapAnimFrameList"))
    : [];
  const sourceAnimation = resolveEntryVisualSourceAnimationRuntime(host, element.id);
  const animationClass = sourceAnimation?.animationClass;
  const carCount = animationClass === "Entry Car Class" && element.id ? numericSuffix(element.id) : undefined;
  const cloudVerticalDirection = animationClass === "Entry Cloud Class" && memberName
    ? entryCloudVerticalDirectionFromMember(memberName)
    : undefined;
  const cloudMembers = animationClass === "Entry Cloud Class" && memberName
    ? resolveEntryVisualCloudMembersRuntime(host, visual, memberName)
    : undefined;
  const carFrames = carCount !== undefined ? resolveEntryVisualDirectionalMemberFramesRuntime(host, visual, memberName) : undefined;

  return {
    ...(memberName !== undefined ? { memberName } : {}),
    ...(sourceAnimation ?? {}),
    ...(memberSwapFrames.length > 0 ? { memberSwapFrames } : {}),
    ...(memberSwapType?.toLowerCase() === "memberswap" ? {
      memberSwapInitDelay: numberProperty(element.properties, "swapInitDelayValue") ?? 0,
      memberSwapDelay: numberProperty(element.properties, "swapAnimDelayValue") ?? 0
    } : {}),
    ...(cloudVerticalDirection !== undefined ? {
      cloudVerticalDirection,
      cloudTravelWidth: host.movie.stage.width + 70,
      cloudTurnPoint: 330
    } : {}),
    ...(cloudMembers?.left !== undefined ? { cloudMemberLeft: cloudMembers.left } : {}),
    ...(cloudMembers?.right !== undefined ? { cloudMemberRight: cloudMembers.right } : {}),
    ...(carCount !== undefined ? {
      carCount,
      carDirection: carCount % 2 === 1 ? "right" as const : "left" as const
    } : {}),
    ...(carFrames ? { memberSwapFrames: carFrames } : {})
  };
}

function resolveEntryVisualSourceAnimationRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  elementId: string | undefined
): { readonly animationPrefix: string; readonly animationClass: string } | undefined {
  if (!elementId) {
    return undefined;
  }

  for (const entry of readEntryVisualAnimationMappings(host.getVariable("hotel.view.animations"))) {
    if (elementId.toLowerCase().startsWith(entry.animationPrefix.toLowerCase()) && numericSuffix(elementId) !== undefined) {
      return entry;
    }
  }

  return undefined;
}

function resolveEntryVisualMemberSwapFramesRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  visual: HabboExternalCastVisualLayout,
  memberName: string,
  frameList: string | undefined
): readonly DirectorMemberRef[] {
  const explicitFrames = parseEntryVisualFrameList(frameList);
  const baseName = explicitFrames.length > 0 ? memberName.replace(/\d+$/, "") : memberName.replace(/\d+$/, "");
  const frameNumbers = explicitFrames.length > 0 ? explicitFrames : undefined;
  const frames: DirectorMemberRef[] = [];
  if (frameNumbers) {
    for (const frame of frameNumbers) {
      const member = resolveEntryVisualCastMemberRefRuntime(host, visual, `${baseName}${frame}`);
      if (member) {
        frames.push(member);
      }
    }
    return frames;
  }

  for (let index = 1; index < 100; index++) {
    const member = resolveEntryVisualCastMemberRefRuntime(host, visual, `${baseName}${index}`);
    if (!member) {
      break;
    }
    frames.push(member);
  }
  return frames;
}

function resolveEntryVisualDirectionalMemberFramesRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  visual: HabboExternalCastVisualLayout,
  memberName: string | undefined
): readonly DirectorMemberRef[] | undefined {
  if (!memberName) {
    return undefined;
  }

  const match = /^(.*?)([12])$/.exec(memberName);
  if (!match) {
    const member = resolveEntryVisualCastMemberRefRuntime(host, visual, memberName);
    return member ? [member] : undefined;
  }

  const baseName = match[1] ?? "";
  const frames = [1, 2]
    .map((frame) => resolveEntryVisualCastMemberRefRuntime(host, visual, `${baseName}${frame}`))
    .filter((entry): entry is DirectorMemberRef => entry !== undefined);
  return frames.length > 0 ? frames : undefined;
}

function resolveEntryVisualCloudMembersRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  visual: HabboExternalCastVisualLayout,
  memberName: string
): { readonly left?: DirectorMemberRef; readonly right?: DirectorMemberRef } | undefined {
  const match = /^(.*)_(left|right)$/i.exec(memberName);
  if (!match) {
    return undefined;
  }

  const baseName = match[1] ?? "";
  const left = resolveEntryVisualCastMemberRefRuntime(host, visual, `${baseName}_left`);
  const right = resolveEntryVisualCastMemberRefRuntime(host, visual, `${baseName}_right`);
  return left || right ? {
    ...(left !== undefined ? { left } : {}),
    ...(right !== undefined ? { right } : {})
  } : undefined;
}

function resolveEntryVisualCastMemberRefRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  visual: HabboExternalCastVisualLayout,
  memberName: string
): DirectorMemberRef | undefined {
  const castLib = host.loadedCastSlots.get(normalizeCastName(visual.castName));
  if (castLib === undefined) {
    return undefined;
  }

  const member = host.movie.cast.getMemberByName(memberName, castLib);
  return member ? { castLib, member: member.memberNumber } : undefined;
}

export function advanceEntryHotelAnimationRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  elapsedMs: number,
  release: string
): boolean {
  const sprites = readSpriteManifestArray(host.movie.getProperty("entryVisualOverlaySprites"));
  const animationSprites = readEntryVisualAnimationSprites(host.movie.getProperty("entryVisualAnimationSprites"));
  if (sprites.length === 0 || animationSprites.length === 0) {
    return false;
  }

  const safeElapsedMs = Math.max(0, elapsedMs);
  const frameTempo = Math.max(1, host.movie.tempo);
  const phase = resolveEntryVisualAnimationPhase(safeElapsedMs, animationSprites, frameTempo);
  const animationByChannel = new Map(animationSprites.map((sprite) => [sprite.channel, sprite]));
  const nextSprites = sprites.map((sprite) => {
    const animationSprite = animationByChannel.get(sprite.channel);
    if (!animationSprite) {
      return sprite;
    }

    return {
      ...sprite,
      ...resolveEntryVisualAnimatedSprite(sprite, animationSprite, safeElapsedMs, frameTempo, host.movie.stage.width)
    };
  });

  host.movie.setProperty("entryVisualOverlaySprites", nextSprites);
  host.movie.setProperty("entryVisualAnimationElapsedMs", safeElapsedMs);
  const entryVisuals = host.movie.getProperty("entryVisuals");
  const visualName = typeof entryVisuals === "object"
    && entryVisuals !== null
    && typeof (entryVisuals as { visual?: unknown }).visual === "string"
    ? (entryVisuals as { visual: string }).visual
    : getEntryHotelVisualMemberNameRuntime(host, release);
  host.movie.setProperty("entryVisualAnimation", {
    release,
    visual: visualName,
    source: host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource),
    elapsedMs: Math.round(safeElapsedMs),
    phase,
    delayMs: entryViewDelayMs,
    openDurationMs: entryViewOpenDurationMs,
    signStepPx: entrySignStepPx,
    frameTempo
  } satisfies HabboEntryVisualAnimationSnapshot);
  host.syncDirectorOverlaySprites();
  return true;
}

export function advanceEntryHotelAnimationFrameRuntime(
  host: HabboEntryHotelViewRuntimeHost,
  deltaMs: number,
  release: string
): boolean {
  if (host.movie.getProperty("entryHotelViewVisible") !== true) {
    return false;
  }

  const previousElapsed = numberFromUnknown(host.movie.getProperty("entryVisualAnimationElapsedMs"), 0);
  const nextElapsed = previousElapsed + Math.max(0, deltaMs);
  const frameMs = 1000 / Math.max(1, host.movie.tempo);
  const previousFrame = Math.floor(previousElapsed / frameMs);
  const nextFrame = Math.floor(nextElapsed / frameMs);
  if (previousFrame === nextFrame) {
    host.movie.setProperty("entryVisualAnimationElapsedMs", nextElapsed);
    return false;
  }

  return advanceEntryHotelAnimationRuntime(host, nextElapsed, release);
}

export function sourceVisualizerSpriteTargetsById(elements: readonly HabboWindowLayoutElement[]): ReadonlyMap<string, number> {
  const targets = new Map<string, number>();
  for (const element of elements) {
    if (element.id) {
      targets.set(element.id, element.index);
    }
  }
  return targets;
}

export function resolveEntryVisualLocZ(element: HabboWindowLayoutElement, visualizerLocZ: number): number {
  const elementLocZ = element.locZ ?? numberProperty(element.properties, "locZ");
  return Math.trunc(visualizerLocZ + (elementLocZ ?? element.index));
}

export function parseEntryVisualFrameList(frameList: string | undefined): readonly number[] {
  if (!frameList || frameList.trim().length === 0) {
    return [];
  }

  const parsed = parseLingoLiteral(frameList);
  const values = parsed instanceof LingoList ? parsed.toArray() : Array.isArray(parsed) ? parsed : [];
  return values.map((entry) => numberFromUnknown(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
}

export function numericSuffix(value: string): number | undefined {
  const match = /(\d+)$/.exec(value);
  if (!match) {
    return undefined;
  }
  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function entryCloudVerticalDirectionFromMember(memberName: string): number {
  return memberName.toLowerCase().endsWith("_left") ? -1 : 1;
}

export function resolveEntryVisualInitialLocation(
  visual: HabboExternalCastVisualLayout,
  element: HabboWindowLayoutElement
): { readonly x: number; readonly y: number } {
  const locH = element.locH ?? 0;
  const locV = element.locV ?? 0;
  const rectLeft = visual.rect?.[0] ?? 0;
  const rectTop = visual.rect?.[1] ?? 0;
  return { x: rectLeft + locH, y: rectTop + locV };
}

export function resolveEntryVisualOpenLocation(
  _visual: HabboExternalCastVisualLayout,
  element: HabboWindowLayoutElement,
  initialLoc: { readonly x: number; readonly y: number }
): { readonly x: number; readonly y: number } {
  if (element.id === "entry_sign" || element.id === "entry_sign_sd") {
    return { x: initialLoc.x, y: 0 };
  }

  if (element.id === "box_top") {
    return { x: initialLoc.x, y: initialLoc.y - (element.height ?? 0) };
  }

  if (element.id === "box_bottom") {
    return { x: initialLoc.x, y: initialLoc.y + (element.height ?? 0) };
  }

  return initialLoc;
}

export function resolveEntryVisualAnimationPhase(
  elapsedMs: number,
  sprites: readonly HabboEntryVisualAnimationSprite[],
  frameTempo: number
): HabboEntryVisualAnimationSnapshot["phase"] {
  if (elapsedMs < entryViewDelayMs) {
    return "waiting";
  }

  if (elapsedMs < entryViewDelayMs + entryViewOpenDurationMs) {
    return "opening";
  }

  const signSprite = sprites.find((sprite) => sprite.id === "entry_sign");
  if (!signSprite) {
    return "open";
  }

  const signElapsedMs = elapsedMs - entryViewDelayMs - entryViewOpenDurationMs;
  const frameMs = 1000 / Math.max(1, frameTempo);
  const signFrames = Math.floor(signElapsedMs / frameMs);
  const signLocY = signSprite.initialLoc.y + (signFrames * entrySignStepPx);
  return signLocY >= signSprite.openLoc.y ? "open" : "sign";
}

export function resolveEntryVisualAnimationLocation(
  sprite: HabboEntryVisualAnimationSprite,
  elapsedMs: number,
  frameTempo: number
): { readonly x: number; readonly y: number } {
  if (sprite.sourceSprByIdTarget && (sprite.id === "box_top" || sprite.id === "box_bottom")) {
    const progress = Math.max(0, Math.min(1, (elapsedMs - entryViewDelayMs) / entryViewOpenDurationMs));
    return {
      x: sprite.initialLoc.x,
      y: Math.round(sprite.initialLoc.y + ((sprite.openLoc.y - sprite.initialLoc.y) * progress))
    };
  }

  if (sprite.sourceSprByIdTarget && (sprite.id === "entry_sign" || sprite.id === "entry_sign_sd")) {
    if (elapsedMs < entryViewDelayMs + entryViewOpenDurationMs) {
      return sprite.initialLoc;
    }

    const signElapsedMs = elapsedMs - entryViewDelayMs - entryViewOpenDurationMs;
    const frameMs = 1000 / Math.max(1, frameTempo);
    const signFrames = Math.floor(signElapsedMs / frameMs);
    return {
      x: sprite.initialLoc.x,
      y: Math.min(sprite.openLoc.y, sprite.initialLoc.y + (signFrames * entrySignStepPx))
    };
  }

  return sprite.initialLoc;
}

export function resolveEntryVisualAnimatedSprite(
  baseSprite: DirectorSpriteChannelManifest,
  animationSprite: HabboEntryVisualAnimationSprite,
  elapsedMs: number,
  frameTempo: number,
  stageWidth: number
): Partial<DirectorSpriteChannelManifest> {
  if (animationSprite.animationClass === "Entry Car Class") {
    return resolveEntryVisualCarSprite(baseSprite, animationSprite, elapsedMs, frameTempo);
  }

  if (animationSprite.animationClass === "Entry Cloud Class") {
    return resolveEntryVisualCloudSprite(animationSprite, elapsedMs, frameTempo, stageWidth);
  }

  const frameCount = Math.max(0, Math.floor(elapsedMs / (1000 / Math.max(1, frameTempo))));
  const member = resolveEntryVisualMemberSwapFrame(animationSprite, frameCount);
  return {
    loc: resolveEntryVisualAnimationLocation(animationSprite, elapsedMs, frameTempo),
    ...(member ? { member } : {})
  };
}

export function resolveEntryVisualMemberSwapFrame(
  sprite: HabboEntryVisualAnimationSprite,
  frameCount: number
): DirectorMemberRef | undefined {
  const frames = sprite.memberSwapFrames;
  if (!frames || frames.length === 0) {
    return undefined;
  }

  const initDelay = Math.max(0, Math.trunc(sprite.memberSwapInitDelay ?? 0));
  const frameDelay = Math.max(0, Math.trunc(sprite.memberSwapDelay ?? 0));
  const period = frameDelay + 1;
  const advanceCount = Math.max(0, Math.floor((frameCount - initDelay) / period) - 1);
  return frames[advanceCount % frames.length];
}

export function resolveEntryVisualCarSprite(
  baseSprite: DirectorSpriteChannelManifest,
  sprite: HabboEntryVisualAnimationSprite,
  elapsedMs: number,
  frameTempo: number
): Partial<DirectorSpriteChannelManifest> {
  const frameCount = Math.max(0, Math.floor(elapsedMs / (1000 / Math.max(1, frameTempo))));
  let itemTicks = Math.floor(frameCount / 2);
  const movingRight = sprite.carDirection !== "left";
  const start = movingRight
    ? { x: 184, y: 505, offsetX: 2, offsetY: -1, turnPoint: 490, flipH: true }
    : { x: 720, y: 488, offsetX: -2, offsetY: -1, turnPoint: 488, flipH: false };
  const ticksToTurn = Math.max(0, Math.ceil(Math.abs(start.turnPoint - start.x) / Math.abs(start.offsetX)));
  const turnY = start.y + (start.offsetY * ticksToTurn);
  const ticksAfterTurnToReset = Math.max(0, Math.ceil((511 - turnY) / Math.abs(start.offsetY)));
  const cycleTicks = Math.max(1, ticksToTurn + ticksAfterTurnToReset + 1);
  itemTicks %= cycleTicks;
  const afterTurn = itemTicks >= ticksToTurn;
  const postTurnTicks = Math.max(0, itemTicks - ticksToTurn);
  const loc = afterTurn
    ? {
        x: start.x + (start.offsetX * itemTicks),
        y: turnY - (start.offsetY * postTurnTicks)
      }
    : {
        x: start.x + (start.offsetX * itemTicks),
        y: start.y + (start.offsetY * itemTicks)
      };
  const frames = sprite.memberSwapFrames ?? [];
  const member = afterTurn && frames.length > 1 ? frames[1] : frames[0];
  const ink = normalizeMemberName(sprite.memberName ?? "").startsWith("car1") ? 41 : baseSprite.ink;
  return {
    loc,
    ...(member ? { member } : {}),
    flipH: start.flipH,
    ...(ink !== undefined ? { ink } : {}),
    ...(baseSprite.blend !== undefined ? { blend: baseSprite.blend } : {})
  };
}

export function resolveEntryVisualCloudSprite(
  sprite: HabboEntryVisualAnimationSprite,
  elapsedMs: number,
  frameTempo: number,
  stageWidth: number
): Partial<DirectorSpriteChannelManifest> {
  const frameCount = Math.max(0, Math.floor(elapsedMs / (1000 / Math.max(1, frameTempo))));
  const itemTicks = Math.floor(frameCount / 2);
  const travelWidth = Math.max(1, Math.trunc(sprite.cloudTravelWidth ?? stageWidth + 70));
  const cycleTicks = Math.max(1, travelWidth);
  const cycleOffset = itemTicks % cycleTicks;
  const rawX = sprite.initialLoc.x + cycleOffset;
  const wrappedX = rawX > stageWidth + 30 ? -40 + (rawX - (stageWidth + 31)) : rawX;
  const simulation = simulateEntryCloudMotion(sprite, cycleOffset, stageWidth);
  const member = simulation.direction < 0 ? sprite.cloudMemberLeft : sprite.cloudMemberRight;
  return {
    loc: {
      x: wrappedX,
      y: simulation.y
    },
    ...(member ? { member } : {})
  };
}

export function simulateEntryCloudMotion(
  sprite: HabboEntryVisualAnimationSprite,
  ticks: number,
  stageWidth: number
): { readonly y: number; readonly direction: number } {
  const initialDirection = sprite.cloudVerticalDirection ?? 1;
  const turnPoint = sprite.cloudTurnPoint ?? 330;
  const hasTurnPoint = sprite.initialLoc.x + sprite.width < turnPoint;
  let direction = initialDirection;
  let y = sprite.initialLoc.y;

  for (let tick = 0; tick < ticks; tick++) {
    const left = sprite.initialLoc.x + tick;
    if (left > stageWidth + 30) {
      direction = -1;
      y = sprite.initialLoc.y;
      continue;
    }

    if (hasTurnPoint) {
      if (left + sprite.width > turnPoint && left <= turnPoint) {
        direction = left === turnPoint ? -initialDirection : 0;
      } else if (left > turnPoint) {
        direction = -initialDirection;
      }
    }

    const nextLeft = left + 1;
    if ((nextLeft % 2) === 0) {
      y += direction;
    }
  }

  return { y, direction };
}

function numberFromUnknown(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numberProperty(properties: Readonly<Record<string, string | number>>, name: string): number | undefined {
  const value = properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeMemberName(value: string): string {
  return value.trim().toLowerCase();
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" ? value : "";
}
