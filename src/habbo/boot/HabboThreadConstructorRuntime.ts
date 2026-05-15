import { LingoList, LingoSymbol } from "../../lingo";
import {
  classNamesFromValue,
  coerceVariableFieldValue,
  directorNumberFromUnknown,
  makeThreadModuleObjectId,
  normalizeCastName,
  normalizeTextFieldValue
} from "../HabboSourceValueHelpers";
import type { HabboThreadModules, HabboVariableObject } from "./HabboBootManagers";
import type {
  HabboCastLoadCallback,
  HabboDownloadCallback,
  HabboExternalCastTextFieldEntry,
  HabboExternalFieldEntry,
  HabboTextFieldEntry
} from "./HabboBootResourceTypes";
import { resolveThreadIndexDefinitions } from "../HabboThreadIndex";
import { createDefaultRegistrationProps, createRegistrationMessageStruct } from "../features/edit-habbo";
import {
  createEmptyMessengerBuddyList,
  HABBO_MESSENGER_COMPONENT_SOURCE,
  HABBO_MESSENGER_FALLBACK_TITLE,
  HABBO_MESSENGER_HANDLER_SOURCE,
  HABBO_MESSENGER_SOURCE,
  HABBO_MESSENGER_TITLE_KEY
} from "../features/friends-console";
import {
  HABBO_PURSE_COMPONENT_SOURCE,
  HABBO_PURSE_FALLBACK_TITLE,
  HABBO_PURSE_HANDLER_SOURCE,
  HABBO_PURSE_SOURCE,
  HABBO_PURSE_TITLE_KEY,
  HABBO_PURSE_VOUCHER_FALLBACK_TITLE,
  HABBO_PURSE_VOUCHER_TITLE_KEY
} from "../features/purse";
import {
  HABBO_CATALOGUE_COMPONENT_SOURCE,
  HABBO_CATALOGUE_HANDLER_SOURCE,
  HABBO_CATALOGUE_LOADER_SOURCE,
  HABBO_CATALOGUE_SOURCE,
  HABBO_CATALOGUE_WINDOW_ID
} from "../features/catalogue";
import {
  HABBO_CLUB_COMPONENT_SOURCE,
  HABBO_CLUB_HANDLER_SOURCE,
  HABBO_CLUB_INTERFACE_SOURCE,
  HABBO_CLUB_WINDOW_ID
} from "../features/habbo-club";

export interface HabboThreadConstructorHost {
  [key: string]: any;
}

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";
const registrationInterfaceClassSource = "hh_registrat/casts/External/ParentScript 2 - Registration Interface Class.ls";
const registrationComponentClassSource = "hh_registrat/casts/External/ParentScript 3 - Registration Component Class.ls";
const navigatorInterfaceClassSource = "hh_navigator/casts/External/ParentScript 3 - Navigator Window Interface Class.ls";
const navigatorComponentClassSource = "hh_navigator/casts/External/ParentScript 5 - Navigator Component Class.ls";
const navigatorHandlerClassSource = "hh_navigator/casts/External/ParentScript 6 - Navigator Handler Class.ls";
const roomKioskInterfaceClassSource = "hh_kiosk_room/casts/External/ParentScript 3 - RoomKiosk Interface Class.ls";
const roomKioskComponentClassSource = "hh_kiosk_room/casts/External/ParentScript 4 - RoomKiosk Component Class.ls";
const roomKioskHandlerClassSource = "hh_kiosk_room/casts/External/ParentScript 5 - RoomKiosk Handler Class.ls";
const roomInterfaceClassSource = "hh_room/casts/External/ParentScript 3 - Room Interface Class.ls";
const roomComponentClassSource = "hh_room/casts/External/ParentScript 4 - Room Component Class.ls";
const roomHandlerClassSource = "hh_room/casts/External/ParentScript 5 - Room Handler Class.ls";

export function registerDownloadCallbackRuntime(
  host: HabboThreadConstructorHost,
  memberNumber: number,
  handler: LingoSymbol | string,
  targetId: LingoSymbol | string,
  nextState: string
): boolean {
  const callback = {
    memberNumber,
    handler: handler instanceof LingoSymbol ? handler : new LingoSymbol(handler),
    targetId: targetId instanceof LingoSymbol ? targetId : new LingoSymbol(targetId),
    nextState
  };
  host.downloadCallbacks.push(callback);
  host.movie.setProperty("downloadCallbacks", host.downloadCallbacks.map((entry: HabboDownloadCallback) => ({
    memberNumber: entry.memberNumber,
    handler: entry.handler.toString(),
    targetId: entry.targetId.toString(),
    nextState: entry.nextState
  })));
  return true;
}

export function getDownloadCallbacksRuntime(host: HabboThreadConstructorHost): readonly HabboDownloadCallback[] {
  return [...host.downloadCallbacks];
}

export function registerCastloadCallbackRuntime(
  host: HabboThreadConstructorHost,
  loadId: number,
  handler: LingoSymbol | string,
  targetId: LingoSymbol | string,
  nextState: string
): boolean {
  const callback = {
    loadId,
    handler: handler instanceof LingoSymbol ? handler : new LingoSymbol(handler),
    targetId: targetId instanceof LingoSymbol ? targetId : new LingoSymbol(targetId),
    nextState
  };
  host.castLoadCallbacks.push(callback);
  host.movie.setProperty("castLoadCallbacks", host.castLoadCallbacks.map((entry: HabboCastLoadCallback) => ({
    loadId: entry.loadId,
    handler: entry.handler.toString(),
    targetId: entry.targetId.toString(),
    nextState: entry.nextState
  })));
  return true;
}

export function getCastLoadCallbacksRuntime(host: HabboThreadConstructorHost): readonly HabboCastLoadCallback[] {
  return [...host.castLoadCallbacks];
}

export function startClientRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  host.constructObjectManager(release);
  if (!host.dumpVariableField("System Props", release)) {
    host.stopClient(release);
    return false;
  }

  if (!host.resetCastLibs(0, 0, release)) {
    host.stopClient(release);
    return false;
  }

  if (!host.preIndexMembers(release)) {
    host.stopClient(release);
    return false;
  }

  if (!host.dumpTextField("System Texts", release)) {
    host.stopClient(release);
    return false;
  }

  if (!host.createCoreThread(release)) {
    host.stopClient(release);
    return false;
  }

  host.movie.setProperty("habboClientStarted", true);
  return true;
}

export function stopClientRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const runMode = String(host.movie.getProperty("runMode") ?? "Browser");
  host.movie.setProperty("habboClientStarted", false);
  host.movie.setProperty("lastStopClientRunMode", runMode);

  if (runMode.includes("Author")) {
    host.deconstructObjectManager();
    host.recordUnsupportedOnce("author-mode-deconstruct-partial", {
      subsystem: "habbo",
      feature: "author-mode-deconstruct-partial",
      detail: `${release} author-mode stopClient deconstructs the lightweight object manager only`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 4 - Client Initialization Script.ls`
    });
  }

  return false;
}

type HabboResolvedField =
  | {
      readonly sourceKind: "projectorrays-text-member";
      readonly field: HabboTextFieldEntry;
    }
  | {
      readonly sourceKind: "external-cast-text-member";
      readonly field: HabboExternalCastTextFieldEntry;
    }
  | {
      readonly sourceKind: "external-field-bundle";
      readonly field: HabboExternalFieldEntry;
    };

interface HabboExternalScriptCast {
  readonly name: string;
  readonly order: number;
  readonly resolved?: unknown;
  readonly expectedExtractionRoot: string;
  readonly members: readonly {
    readonly type: string;
    readonly name: string;
    readonly number: number;
  }[];
}

export function constructObjectManagerRuntime(host: HabboThreadConstructorHost, release: string): unknown {
  host.movie.setProperty("gCore", host.objectManager);
  host.objectManager.registerManager("#object_manager", "Object Manager Class");
  host.recordUnsupportedOnce("object-manager-class-not-instantiated", {
    subsystem: "habbo",
    feature: "object-manager-class-not-instantiated",
    detail: `${release} constructObjectManager creates a lightweight runtime object manager instead of script(tClass).new()`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 6 - Object API.ls`
  });
  return host.objectManager;
}

export function deconstructObjectManagerRuntime(host: HabboThreadConstructorHost): boolean {
  host.objectManager.deconstruct();
  host.movie.setProperty("gCore", undefined);
  return true;
}

export function dumpVariableFieldRuntime(host: HabboThreadConstructorHost, fieldName: string, release: string): boolean {
  const found = findFieldRuntime(host, fieldName);
  if (!found) {
    seedRequiredBootVariablesRuntime(host);
    host.recordUnsupportedOnce(`variable-field-text-not-extracted:${fieldName}`, {
      subsystem: "habbo",
      feature: "variable-field-text-not-extracted",
      detail: `${release} ${fieldName} member text is not available in the extracted text field index; seeded manager class variables required by startClient`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 20 - Variable API.ls`
    });
    return true;
  }

  for (const [key, rawValue] of Object.entries(found.field.properties)) {
    host.variables.set(key, coerceVariableFieldValue(rawValue));
  }

  host.movie.setProperty("lastVariableFieldDump", createFieldDumpSnapshot(fieldName, found));
  host.movie.setProperty(`fieldText.${fieldName}`, found.field.text);
  return true;
}

export function seedRequiredBootVariablesRuntime(host: HabboThreadConstructorHost): void {
  host.variables.set("object.manager.class", "[\"Object Manager Class\"]");
  host.variables.set("variable.manager.class", "[\"Variable Manager Class\"]");
  host.variables.set("resource.manager.class", "[\"Resource Manager Class\"]");
  host.variables.set("thread.manager.class", "[\"Thread Manager Class\"]");
  host.variables.set("castlib.manager.class", "[\"CastLoad Manager Class\"]");
  host.variables.set("text.manager.class", "[\"Text Manager Class\"]");
}

export function dumpTextFieldRuntime(host: HabboThreadConstructorHost, fieldName: string, release: string): boolean {
  host.objectManager.registerManager("#text_manager", classNamesFromValue(host.getClassVariable("text.manager.class") ?? "Text Manager Class"));
  const found = findFieldRuntime(host, fieldName);
  if (!found) {
    host.recordUnsupportedOnce(`text-field-text-not-extracted:${fieldName}`, {
      subsystem: "habbo",
      feature: "text-field-text-not-extracted",
      detail: `${release} ${fieldName} member text is not available in the extracted text field index; text manager starts empty`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 15 - Text API.ls`
    });
    return true;
  }

  for (const [key, rawValue] of Object.entries(found.field.properties)) {
    host.texts.set(key, normalizeTextFieldValue(rawValue));
  }

  host.movie.setProperty("lastTextFieldDump", createFieldDumpSnapshot(fieldName, found));
  host.movie.setProperty(`fieldText.${fieldName}`, found.field.text);
  return true;
}

export function findFieldRuntime(host: HabboThreadConstructorHost, fieldName: string): HabboResolvedField | undefined {
  const textField = findTextFieldRuntime(host, fieldName);
  if (textField) {
    return { sourceKind: "projectorrays-text-member", field: textField };
  }

  const externalCastTextField = findExternalCastTextFieldRuntime(host, fieldName);
  if (externalCastTextField) {
    return { sourceKind: "external-cast-text-member", field: externalCastTextField };
  }

  const externalField = findExternalFieldRuntime(host, fieldName);
  if (externalField) {
    return { sourceKind: "external-field-bundle", field: externalField };
  }

  return undefined;
}

export function findTextFieldRuntime(host: HabboThreadConstructorHost, fieldName: string): HabboTextFieldEntry | undefined {
  const expectedName = fieldName.toLowerCase();
  const resourceRef = host.resourceManager.getMemberRef(fieldName);
  return host.textFieldSet?.fields.find((field: HabboTextFieldEntry) => {
    if (field.memberName.toLowerCase() !== expectedName) {
      return false;
    }

    if (!resourceRef) {
      return true;
    }

    return field.castLib === resourceRef.castLib && field.member === resourceRef.member;
  });
}

export function findExternalFieldRuntime(host: HabboThreadConstructorHost, fieldName: string): HabboExternalFieldEntry | undefined {
  const expectedName = fieldName.toLowerCase();
  return host.externalFieldSet?.fields.find((field: HabboExternalFieldEntry) => field.name.toLowerCase() === expectedName);
}

export function findExternalCastTextFieldRuntime(host: HabboThreadConstructorHost, fieldName: string): HabboExternalCastTextFieldEntry | undefined {
  const expectedName = fieldName.toLowerCase();
  const resourceRef = host.resourceManager.getMemberRef(fieldName);
  return host.externalCastTextFieldSet?.fields.find((field: HabboExternalCastTextFieldEntry) => {
    if (field.memberName.toLowerCase() !== expectedName) {
      return false;
    }

    if (!resourceRef) {
      return true;
    }

    const castLib = host.loadedCastSlots.get(normalizeCastName(field.castName));
    return castLib === resourceRef.castLib && field.member === resourceRef.member;
  });
}

export function resetCastLibsRuntime(host: HabboThreadConstructorHost, clean: number, forced: number, release: string): boolean {
  host.movie.setProperty("lastCastLibReset", { clean, forced, castCount: host.movie.cast.castLibs.length });
  host.objectManager.registerManager("#castload_manager", classNamesFromValue(host.getClassVariable("castlib.manager.class") ?? "CastLoad Manager Class"));
  host.recordUnsupportedOnce("castlib-reset-partial", {
    subsystem: "habbo",
    feature: "castlib-reset-partial",
    detail: `${release} resetCastLibs records cast reset state but does not unload/reload external casts`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 10 - CastLoad  API.ls`
  });
  return true;
}

export function preIndexMembersRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  host.objectManager.registerManager("#resource_manager", classNamesFromValue(host.getClassVariable("resource.manager.class") ?? "Resource Manager Class"));
  const indexed = host.resourceManager.preIndexMembers();
  host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
  host.recordUnsupportedOnce("member-preindex-partial", {
    subsystem: "habbo",
    feature: "member-preindex-partial",
    detail: `${release} resource manager indexed member names, but dynamic member creation/replacement is not implemented`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 9 - Resource API.ls`
  });
  return indexed;
}

export function createCoreThreadRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  host.objectManager.registerManager("#thread_manager", classNamesFromValue(host.getClassVariable("thread.manager.class") ?? "Thread Manager Class"));
  const created = host.threadManager.create("#core", "#core");
  host.constructCoreThread(release);
  host.recordUnsupportedOnce("core-thread-update-state-partial", {
    subsystem: "lingo",
    feature: "core-thread-update-state-partial",
    detail: `${release} Core Thread Class construct/load_variables/load_params/load_texts/load_casts/init_threads are partially modeled; external params, actual member insertion, media loading, and full Initialize message dispatch are still incomplete`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return created;
}

export function constructCoreThreadRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const variableClass = classNamesFromValue(host.getClassVariable("variable.manager.class") ?? "Variable Manager Class").join(" -> ");
  const session = host.objectManager.createObject("#session", variableClass);
  session.set("client_startdate", new Date().toDateString());
  session.set("client_starttime", new Date().toTimeString());
  session.set("client_version", host.getVariable("system.version") ?? "");
  session.set("client_url", host.getMoviePath());
  session.set("client_lastclick", "");

  host.objectManager.createObject("#headers", variableClass);
  host.objectManager.createObject("#classes", variableClass);
  host.objectManager.createObject("#cache", variableClass);
  host.createBroker("#Initialize");

  return host.updateCoreThreadState("load_variables", release);
}

export function updateCoreThreadStateRuntime(host: HabboThreadConstructorHost, state: string, release: string): boolean {
  host.movie.setProperty("coreThreadState", state);
  host.logDebug("boot", "info", `core-thread state=${state} release=${release}`);

  switch (state) {
    case "load_variables":
      return enterLoadVariablesRuntime(host, release);
    case "load_params":
      return enterLoadParamsRuntime(host, release);
    case "load_texts":
      return enterLoadTextsRuntime(host, release);
    case "load_casts":
      return enterLoadCastsRuntime(host, release);
    case "validate_resources":
      return enterValidateResourcesRuntime(host, release);
    case "init_threads":
      return enterInitThreadsRuntime(host, release);
    default:
      host.recordUnsupportedOnce(`core-thread-state-not-translated:${state}`, {
        subsystem: "lingo",
        feature: "core-thread-state-not-translated",
        detail: `${release} Core Thread Class state ${state} is not translated yet`,
        source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
      });
      return false;
  }
}

function enterLoadVariablesRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  host.showLogo(release);
  host.movie.setProperty("cursor", 4);

  const externalVariables = host.getExternalVariablesPath();
  if (!externalVariables) {
    host.recordUnsupportedOnce("external-variables-path-missing", {
      subsystem: "habbo",
      feature: "external-variables-path-missing",
      detail: `${release} Core Thread Class reached load_variables but System Props did not define external.variables.txt`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
    });
    host.movie.setProperty("coreThreadWaitingForExternalVariables", true);
    return true;
  }

  const downloadUrl = host.buildDownloadUrl(externalVariables);
  const download = host.movie.net.queueDownload(downloadUrl, {
    memberName: externalVariables,
    memberType: "field",
    priority: 1
  });
  host.movie.setProperty("lastQueuedDownload", {
    id: download.id,
    url: download.url,
    memberName: download.memberName,
    memberType: download.memberType,
    priority: download.priority
  });
  host.logDebug("download", "info", `external-variables queued member=${externalVariables} id=${download.id}`);
  host.registerDownloadCallback(download.id, "#updateState", "#core", "load_params");
  host.movie.setProperty("coreThreadWaitingForExternalVariables", true);
  host.recordUnsupportedOnce("external-variable-download-not-fetched", {
    subsystem: "director",
    feature: "external-variable-download-not-fetched",
    detail: `${release} Core Thread Class queued ${externalVariables}, but browser-side file download/member insertion is not implemented yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return true;
}

function enterLoadParamsRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const externalVariables = host.getExternalVariablesPath();
  if (externalVariables) {
    host.dumpVariableField(externalVariables, release);
    host.removeMemberByName(externalVariables, release);
  } else {
    host.recordUnsupportedOnce("external-variables-path-missing-load-params", {
      subsystem: "habbo",
      feature: "external-variables-path-missing",
      detail: `${release} Core Thread Class reached load_params but no external variables path is available`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
    });
  }

  host.movie.setProperty("coreThreadWaitingForExternalVariables", false);
  host.movie.setProperty("debugLevel", host.getIntVariable("system.debug", 0));
  host.movie.setProperty("stringServicesConvListInitialized", true);
  host.movie.puppetTempo(host.getIntVariable("system.tempo", 30));

  const reloadUrl = host.getVariable("client.reload.url");
  const session = host.objectManager.getObject("#session");
  if (typeof reloadUrl === "string" && reloadUrl.length > 0 && session) {
    session.set("client_url", reloadUrl);
  }

  host.recordUnsupportedOnce("external-params-not-applied", {
    subsystem: "habbo",
    feature: "external-params-not-applied",
    detail: `${release} Core Thread Class plugin sw1-sw9 external parameter overrides are not modeled yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return host.updateCoreThreadState("load_texts", release);
}

function enterLoadTextsRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const externalTexts = host.getExternalTextsPath();
  if (!externalTexts) {
    return host.updateCoreThreadState("load_casts", release);
  }

  const downloadUrl = host.buildDownloadUrl(externalTexts);
  const download = host.movie.net.queueDownload(downloadUrl, {
    memberName: externalTexts,
    memberType: "field"
  });
  host.movie.setProperty("lastQueuedDownload", {
    id: download.id,
    url: download.url,
    memberName: download.memberName,
    memberType: download.memberType
  });
  host.logDebug("download", "info", `external-texts queued member=${externalTexts} id=${download.id}`);
  host.registerDownloadCallback(download.id, "#updateState", "#core", "load_casts");
  host.movie.setProperty("coreThreadWaitingForExternalTexts", true);
  host.recordUnsupportedOnce("external-text-download-not-fetched", {
    subsystem: "director",
    feature: "external-text-download-not-fetched",
    detail: `${release} Core Thread Class queued ${externalTexts}, but browser-side text file download/member insertion is not implemented yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return true;
}

function enterLoadCastsRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const externalTexts = host.getExternalTextsPath();
  if (externalTexts) {
    if (host.findField(externalTexts)) {
      host.dumpTextField(externalTexts, release);
      host.removeMemberByName(externalTexts, release);
    } else {
      host.recordUnsupportedOnce(`external-text-field-not-available:${externalTexts}`, {
        subsystem: "habbo",
        feature: "external-text-field-not-available",
        detail: `${release} Core Thread Class reached load_casts but ${externalTexts} is not present in generated external field data`,
        source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
      });
    }
  }

  host.movie.setProperty("coreThreadWaitingForExternalTexts", false);
  const castList = host.getSequentialCastEntries(release);
  host.movie.setProperty("coreThreadCastList", castList);

  if (castList.length === 0) {
    return host.updateCoreThreadState("init_threads", release);
  }

  const loadId = host.startCastLoad(castList, 1, release);
  if (host.getBoolVariable("loading.bar.active")) {
    host.showLoadingBar(loadId, release, "#window", 0);
  }

  host.registerCastloadCallback(loadId, "#updateState", "#core", "validate_resources");
  return true;
}

function enterValidateResourcesRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  const castList = getCurrentCoreThreadCastListRuntime(host, release);
  const missingCasts = castList.filter((castName) => !host.castExists(castName));
  host.movie.setProperty("lastCastValidation", {
    requested: castList,
    missing: missingCasts
  });

  if (missingCasts.length > 0) {
    const loadId = host.startCastLoad(missingCasts, 1, release);
    if (host.getBoolVariable("loading.bar.active")) {
      host.showLoadingBar(loadId, release, "#window", 0);
    }

    host.registerCastloadCallback(loadId, "#updateState", "#core", "validate_resources");
    return true;
  }

  return host.updateCoreThreadState("init_threads", release);
}

export function getCurrentCoreThreadCastListRuntime(host: HabboThreadConstructorHost, release: string): readonly string[] {
  const existing = host.movie.getProperty("coreThreadCastList");
  if (Array.isArray(existing) && existing.every((entry) => typeof entry === "string")) {
    return existing;
  }

  return host.getSequentialCastEntries(release);
}

function enterInitThreadsRuntime(host: HabboThreadConstructorHost, release: string): boolean {
  host.movie.setProperty("cursor", 0);
  host.movie.setProperty("stageTitle", host.getVariable("client.window.title") ?? "");
  host.hideLoadingBar();
  host.hideLogo(release);
  initializeExternalThreadsRuntime(host, release);
  host.movie.setProperty("initializedThreadCount", host.threadManager.initAll());
  const initializeDispatched = host.executeMessage("#Initialize", "initialize", release);
  host.movie.setProperty("lastExecutedMessage", {
    broker: "#Initialize",
    message: "initialize",
    dispatched: initializeDispatched,
    callCount: (host.movie.getProperty("lastMessageDispatch") as { calls?: unknown[] } | undefined)?.calls?.length ?? 0
  });
  host.recordUnsupportedOnce("initialize-message-dispatch-partial", {
    subsystem: "lingo",
    feature: "initialize-message-dispatch-partial",
    detail: `${release} executeMessage(#Initialize, "initialize") is dispatched through a lightweight broker for the evidenced login and entry component handlers only`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 75 - Core Thread Class.ls`
  });
  return true;
}

export function initializeExternalThreadsRuntime(host: HabboThreadConstructorHost, release: string): void {
  const initializedThreads: Record<string, unknown>[] = [];
  const threadFieldName = String(host.getVariable("thread.index.field") ?? "thread.index");
  const threadFieldsByCast = new Map<string, HabboExternalCastTextFieldEntry>();

  for (const field of host.externalCastTextFieldSet?.fields ?? []) {
    if (field.memberName.toLowerCase() === threadFieldName.toLowerCase()) {
      threadFieldsByCast.set(normalizeCastName(field.castName), field);
    }
  }

  for (const cast of [...host.movie.cast.castLibs].sort((left, right) => right.number - left.number)) {
    if (!cast.name) {
      continue;
    }

    const threadField = threadFieldsByCast.get(normalizeCastName(cast.name));
    if (!threadField) {
      continue;
    }

    const threadDefinitions = resolveThreadIndexDefinitions(threadField.properties);
    if (threadDefinitions.length === 0) {
      host.recordUnsupportedOnce(`thread-index-missing-id:${threadField.castName}`, {
        subsystem: "habbo",
        feature: "thread-index-missing-id",
        detail: `${release} ${threadField.castName} thread.index has no thread.id property`,
        source: threadField.textChunkPath
      });
      continue;
    }

    for (const definition of threadDefinitions) {
      const modules = definition.modules;
      const created = host.threadManager.create(`#${definition.threadId}`, threadField.memberName, {
        sourceCastName: threadField.castName,
        castLib: cast.number,
        modules
      });
      if (!created) {
        continue;
      }

      createThreadModuleObjectsRuntime(host, definition.threadId, modules, release, threadField.castName);
      initializedThreads.push({
        id: `#${definition.threadId}`,
        castName: threadField.castName,
        castLib: cast.number,
        member: threadField.member,
        ...(definition.multipleDefinition ? { multipleDefinition: true } : {}),
        modules
      });
    }
  }

  host.movie.setProperty("lastInitializedThreads", initializedThreads);
  if (initializedThreads.length > 0) {
    host.recordUnsupportedOnce("thread-manager-initall-partial", {
      subsystem: "lingo",
      feature: "thread-manager-initall-partial",
      detail: `${release} Thread Manager Class initAll is modeled with lightweight thread/module objects from external cast thread.index fields; full parent-script inheritance is not implemented`,
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 29 - Thread Manager Class.ls`
    });
  } else if (host.externalCastTextFieldSet) {
    host.recordUnsupportedOnce("thread-index-fields-not-found", {
      subsystem: "habbo",
      feature: "thread-index-fields-not-found",
      detail: `${release} external cast text field data is present, but no ${threadFieldName} fields matched active cast libraries`,
      source: "generated/runtime-data/external-cast-text-fields.json"
    });
  }
}

export function createThreadModuleObjectsRuntime(
  host: HabboThreadConstructorHost,
  threadId: string,
  modules: HabboThreadModules,
  release: string,
  sourceCastName?: string
): void {
  const threadSymbol = new LingoSymbol(threadId);

  for (const moduleName of ["interface", "component", "handler"] as const) {
    const classNames = modules[moduleName];
    if (!classNames || classNames.length === 0) {
      continue;
    }

    const objectId = makeThreadModuleObjectId(threadSymbol, moduleName);
    const object = host.objectManager.createObject(objectId, classNames[classNames.length - 1] ?? "");
    object.set("threadId", threadSymbol.toString());
    object.set("module", moduleName);
    object.set("classNames", [...classNames]);
    if (sourceCastName) {
      object.set("sourceCastName", sourceCastName);
    }
    host.applyThreadConstructorSideEffects(object, classNames, release);
  }
}

export function sourcePathForClassRuntime(
  host: HabboThreadConstructorHost,
  className: string,
  release: string,
  fallbackRelativePath: string
): string {
  const source = resolveExternalScriptSourcePathRuntime(host, className);
  return source ?? `extracted/projectorrays/${release}/${fallbackRelativePath}`;
}

export function resolveExternalScriptSourcePathRuntime(host: HabboThreadConstructorHost, className: string): string | undefined {
  const graph = host.externalCastGraph;
  if (!graph) {
    return undefined;
  }

  const casts = graph.casts as readonly HabboExternalScriptCast[];
  const candidates = casts
    .filter((cast) => cast.resolved)
    .map((cast) => ({
      cast,
      loaded: host.loadedCastSlots.has(normalizeCastName(cast.name))
    }))
    .sort((left, right) => {
      if (left.loaded !== right.loaded) {
        return left.loaded ? -1 : 1;
      }

      return left.cast.order - right.cast.order;
    });

  for (const { cast } of candidates) {
    const member = cast.members.find((entry) => entry.type === "script" && entry.name === className);
    if (!member) {
      continue;
    }

    return `${cast.expectedExtractionRoot}/casts/External/ParentScript ${member.number} - ${className}.ls`;
  }

  return undefined;
}

function createFieldDumpSnapshot(fieldName: string, resolved: HabboResolvedField): Record<string, unknown> {
  const base = {
    fieldName,
    sourceKind: resolved.sourceKind,
    entries: Object.keys(resolved.field.properties).length
  };

  if (resolved.sourceKind === "projectorrays-text-member") {
    return {
      ...base,
      castLib: resolved.field.castLib,
      member: resolved.field.member,
      textChunkPath: resolved.field.textChunkPath
    };
  }

  if (resolved.sourceKind === "external-cast-text-member") {
    return {
      ...base,
      castName: resolved.field.castName,
      castOrder: resolved.field.castOrder,
      member: resolved.field.member,
      textChunkPath: resolved.field.textChunkPath
    };
  }

  return {
    ...base,
    sourcePath: resolved.field.sourcePath,
    lineCount: resolved.field.lineCount
  };
}

export function applyThreadConstructorSideEffectsRuntime(host: HabboThreadConstructorHost, object: HabboVariableObject, classNames: readonly string[], release: string): void {
    if (classNames.includes("Login Component Class")) {
      const loginComponentSource = host.sourcePathForClass("Login Component Class", release, "hh_shared/casts/External/ParentScript 4 - Login Component Class.ls");
      object.set("okToLogin", 0);
      if (!host.objectManager.objectExists("Figure_System")) {
        const figureSystem = host.objectManager.createObject("Figure_System", "Figure System Class");
        figureSystem.set("definition", {
          type: "url",
          source: host.getVariable("external.figurepartlist.txt")
        });
      }
      if (!host.objectManager.objectExists("Figure_Preview")) {
        host.objectManager.createObject("Figure_Preview", "Figure Preview Class");
      }
      host.objectManager.getObject("#session")?.set("user_rights", []);
      host.registerMessage("#Initialize", object.id, "#initA", loginComponentSource);
      host.recordUnsupportedOnce("login-component-construct-partial", {
        subsystem: "lingo",
        feature: "login-component-construct-partial",
        detail: `${release} Login Component Class construct is partially modeled for Figure_System/Figure_Preview setup and #Initialize registration only`,
        source: loginComponentSource
      });
      return;
    }

    if (classNames.includes("Registration Interface Class")) {
      object.set("windowTitle", host.texts.get("win_figurecreator") ?? "Your own Habbo");
      object.set("openWindow", "");
      object.set("mode", "");
      object.set("regProcessLocation", 1);
      object.set("propsToServer", createDefaultRegistrationProps());
      host.dumpVariableField("registration.props", release);
      if (!host.variables.has("permitted.name.chars")) {
        host.variables.set("permitted.name.chars", "1234567890qwertyuiopasdfghjklzxcvbnm_-=+?!@<>:.,");
      }
      if (!host.variables.has("denied.name.chars")) {
        host.variables.set("denied.name.chars", "_");
      }
      if (host.getVariable("fuse.project.id") === "habbo_us") {
        host.variables.set("parent_email.process", new LingoList(["reg_welcome_no_age", "reg_age_check", "reg_legal", "reg_namepage", "reg_infopage_no_age", "reg_confirm", "reg_parent_email", "reg_done"]));
        host.variables.set("registration.process", new LingoList(["reg_welcome_no_age", "reg_age_check", "reg_legal", "reg_namepage", "reg_infopage_no_age", "reg_confirm", "reg_done"]));
      }
      host.recordUnsupportedOnce("registration-interface-construct-partial", {
        subsystem: "lingo",
        feature: "registration-interface-construct-partial",
        detail: `${release} Registration Interface Class construct is modeled for registration.props, mode state, and window flow; figure preview object rendering remains incomplete`,
        source: `extracted/projectorrays/${release}/${registrationInterfaceClassSource}`
      });
      return;
    }

    if (classNames.includes("Registration Component Class")) {
      object.set("state", "start");
      object.set("regMsgStruct", createRegistrationMessageStruct());
      host.registerMessage("#enterRoom", object.id, "#closeFigureCreator", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.registerMessage("#changeRoom", object.id, "#closeFigureCreator", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.registerMessage("#leaveRoom", object.id, "#closeFigureCreator", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.registerMessage("#show_registration", object.id, "#openFigureCreator", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.registerMessage("#hide_registration", object.id, "#closeFigureCreator", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.registerMessage("#figure_ready", object.id, "#figureSystemReady", `extracted/projectorrays/${release}/${registrationComponentClassSource}`);
      host.recordUnsupportedOnce("registration-component-construct-partial", {
        subsystem: "lingo",
        feature: "registration-component-construct-partial",
        detail: `${release} Registration Component Class construct is modeled for message registration and basic state; server-backed name approval is connected, while age/COPPA/parent-email and full registration completion remain partial`,
        source: `extracted/projectorrays/${release}/${registrationComponentClassSource}`
      });
      return;
    }

    if (classNames.includes("Navigator Window Interface Class")) {
      object.set("windowTitle", host.texts.get("navigator") ?? "Hotel Navigator");
      object.set("openWindow", "nav_pr");
      object.set("props", {
        unit: {},
        flat: {},
        own: {},
        src: {},
        fav: {}
      });
      object.set("roomInfoHeight", 96);
      object.set("listAreaWidth", 311);
      object.set("listItemHeight", 18);
      object.set("historyItemHeight", 18);
      object.set("resourcesReady", 1);
      host.recordUnsupportedOnce("navigator-interface-construct-partial", {
        subsystem: "lingo",
        feature: "navigator-interface-construct-partial",
        detail: `${release} Navigator Window Interface Class construct is modeled for source window creation, room-list feedImage state, and public/private tab routing; exact writer buffers and all navigator subviews remain partial`,
        source: `extracted/projectorrays/${release}/${navigatorInterfaceClassSource}`
      });
      return;
    }

    if (classNames.includes("Navigator Component Class")) {
      const rootUnitCatId = String(host.getIntVariable("navigator.visible.public.root", 3));
      const rootFlatCatId = String(host.getIntVariable("navigator.visible.private.root", 4));
      const defaultUnitCatId = String(host.getIntVariable("navigator.public.default", Number(rootUnitCatId) || 3));
      const defaultFlatCatId = String(host.getIntVariable("navigator.private.default", Number(rootFlatCatId) || 4));
      object.set("state", "constructed");
      object.set("rootUnitCatId", rootUnitCatId);
      object.set("rootFlatCatId", rootFlatCatId);
      object.set("defaultUnitCatId", defaultUnitCatId);
      object.set("defaultFlatCatId", defaultFlatCatId);
      object.set("updatePeriod", host.getIntVariable("navigator.updatetime", 60000));
      object.set("connectionId", String(host.getVariable("connection.info.id") ?? "info"));
      object.set("categoryIndex", {});
      object.set("nodeCache", {});
      object.set("naviHistory", []);
      object.set("hideFullRoomsFlag", 0);
      host.objectManager.getObject("#session")?.set("lastroom", "Entry");
      host.setNavigatorProperty("categoryId", defaultUnitCatId, "unit");
      host.setNavigatorProperty("categoryId", defaultFlatCatId, "flat");
      host.registerMessage("#userlogin", object.id, "#updateState", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#show_navigator", object.id, "#showNavigator", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#hide_navigator", object.id, "#hideNavigator", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#show_hide_navigator", object.id, "#showhidenavigator", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#leaveRoom", object.id, "#leaveRoom", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#executeRoomEntry", object.id, "#executeRoomEntry", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#requestFlatStruct", object.id, "#sendGetFlatInfo", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.registerMessage("#updateAvailableFlatCategories", object.id, "#sendGetUserFlatCats", `extracted/projectorrays/${release}/${navigatorComponentClassSource}`);
      host.recordUnsupportedOnce("navigator-component-construct-partial", {
        subsystem: "lingo",
        feature: "navigator-component-construct-partial",
        detail: `${release} Navigator Component Class construct is modeled for message registration, category roots, node cache, and bridge request queuing; full timeout refresh, room-entry handoff, and all private-room management actions remain partial`,
        source: `extracted/projectorrays/${release}/${navigatorComponentClassSource}`
      });
      return;
    }

    if (classNames.includes("Navigator Handler Class")) {
      object.set("state", "constructed");
      object.set("commands", {
        NAVIGATE: 150,
        GETUSERFLATCATS: 151,
        SUSERF: 16,
        SRCHF: 17,
        GETFVRF: 18,
        ADD_FAVORITE_ROOM: 19,
        DEL_FAVORITE_ROOM: 20,
        GETFLATINFO: 21,
        SETFLATINFO: 25,
        CREATEFLAT: 29,
        GETFLATCAT: 152,
        SETFLATCAT: 153,
        GETSPACENODEUSERS: 154,
        GETPARENTCHAIN: 156
      });
      host.recordUnsupportedOnce("navigator-handler-construct-partial", {
        subsystem: "lingo",
        feature: "navigator-handler-construct-partial",
        detail: `${release} Navigator Handler Class packet registration is represented by browser bridge packet dispatch; NAVNODEINFO and USERFLATCATS are decoded, while the full handler table remains partial`,
        source: `extracted/projectorrays/${release}/${navigatorHandlerClassSource}`
      });
      return;
    }

    if (classNames.includes("RoomKiosk Interface Class")) {
      object.set("windowTitle", "RoomMatic");
      object.set("roomModels", ["a", "b", "c", "d", "e", "f", "g", "h"]);
      object.set("roomProps", {});
      object.set("tempPassword", {});
      host.recordUnsupportedOnce("roomkiosk-interface-construct-partial", {
        subsystem: "lingo",
        feature: "roomkiosk-interface-construct-partial",
        detail: `${release} RoomKiosk Interface Class construct is modeled for source roomatic windows and basic wizard state; full validation and room creation response flow remain partial`,
        source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
      });
      return;
    }

    if (classNames.includes("RoomKiosk Component Class")) {
      object.set("state", "start");
      host.registerMessage("#open_roomkiosk", object.id, "#showHideRoomKiosk", `extracted/projectorrays/${release}/${roomKioskComponentClassSource}`);
      host.recordUnsupportedOnce("roomkiosk-component-construct-partial", {
        subsystem: "lingo",
        feature: "roomkiosk-component-construct-partial",
        detail: `${release} RoomKiosk Component Class construct registers #open_roomkiosk and queues CREATEFLAT/SETFLATINFO/SETFLATCAT requests; the full server-created room handoff is still partial`,
        source: `extracted/projectorrays/${release}/${roomKioskComponentClassSource}`
      });
      return;
    }

    if (classNames.includes("RoomKiosk Handler Class")) {
      object.set("state", "constructed");
      object.set("commands", {
        CREATEFLAT: 29
      });
      host.recordUnsupportedOnce("roomkiosk-handler-construct-partial", {
        subsystem: "lingo",
        feature: "roomkiosk-handler-construct-partial",
        detail: `${release} RoomKiosk Handler Class command/listener registration is represented by browser bridge packet dispatch; FLATCREATED handling is partial`,
        source: `extracted/projectorrays/${release}/${roomKioskHandlerClassSource}`
      });
      return;
    }

    if (classNames.includes("Room Interface Class")) {
      object.set("roomSpaceId", "Room_visualizer");
      object.set("bottomBarId", "Room_bar");
      object.set("infoStandId", "Room_info_stand");
      object.set("loaderBarId", "Loading room");
      object.set("selectedObj", "");
      object.set("selectedType", "");
      host.registerMessage("#updateMessageCount", object.id, "#updateMessageCount", `extracted/projectorrays/${release}/${roomInterfaceClassSource}`);
      host.registerMessage("#updateBuddyrequestCount", object.id, "#updateBuddyrequestCount", `extracted/projectorrays/${release}/${roomInterfaceClassSource}`);
      host.recordUnsupportedOnce("room-interface-construct-partial", {
        subsystem: "lingo",
        feature: "room-interface-construct-partial",
        detail: `${release} Room Interface Class construct is modeled for source room visualizer, room bar, and infostand windows; object mover, doorbell, badges, and full room interaction remain partial`,
        source: `extracted/projectorrays/${release}/${roomInterfaceClassSource}`
      });
      return;
    }

    if (classNames.includes("Room Component Class")) {
      object.set("infoConnectionId", String(host.getVariable("connection.info.id") ?? "info"));
      object.set("roomConnectionId", String(host.getVariable("connection.room.id") ?? "room"));
      object.set("roomId", "");
      object.set("activeFlag", 0);
      object.set("processList", {});
      object.set("saveData", undefined);
      object.set("cacheKey", "");
      object.set("cacheFlag", host.getIntVariable("room.map.cache", 0));
      object.set("chatProps", {
        returnCount: 0,
        timerStart: 0,
        timerDelay: 0,
        mode: "CHAT",
        hobbaCmds: host.getVariable("moderator.cmds") ?? []
      });
      object.set("userObjects", {});
      object.set("activeObjects", {});
      object.set("passiveObjects", {});
      object.set("itemObjects", {});
      host.registerMessage("#enterRoom", object.id, "#enterRoom", `extracted/projectorrays/${release}/${roomComponentClassSource}`);
      host.registerMessage("#leaveRoom", object.id, "#leaveRoom", `extracted/projectorrays/${release}/${roomComponentClassSource}`);
      host.registerMessage("#changeRoom", object.id, "#leaveRoom", `extracted/projectorrays/${release}/${roomComponentClassSource}`);
      host.recordUnsupportedOnce("room-component-construct-partial", {
        subsystem: "lingo",
        feature: "room-component-construct-partial",
        detail: `${release} Room Component Class construct is modeled for source room cast loading, room-directory handoff, ROOM_READY bootstrap, and initial process-list state; full room object class inheritance remains partial`,
        source: `extracted/projectorrays/${release}/${roomComponentClassSource}`
      });
      return;
    }

    if (classNames.includes("Room Handler Class")) {
      object.set("state", "constructed");
      object.set("commands", {
        ROOM_DIRECTORY: 2,
        TRYFLAT: 57,
        GOTOFLAT: 59,
        G_HMAP: 60,
        G_USRS: 61,
        G_OBJS: 62,
        G_ITEMS: 63,
        G_STAT: 64,
        GETROOMAD: 126
      });
      host.recordUnsupportedOnce("room-handler-construct-partial", {
        subsystem: "lingo",
        feature: "room-handler-construct-partial",
        detail: `${release} Room Handler Class packet registration is represented by browser bridge packet dispatch; room bootstrap packets are decoded, while complete furniture/chat/trade handlers remain partial`,
        source: `extracted/projectorrays/${release}/${roomHandlerClassSource}`
      });
      return;
    }

    if (classNames.includes("Entry Interface Class")) {
      const entryInterfaceSource = host.sourcePathForClass("Entry Interface Class", release, entryInterfaceClassSource);
      object.set("entryVisual", "entry_view");
      object.set("bottomBar", "entry_bar");
      object.set("firstInit", 1);
      object.set("inactiveIconBlend", 40);
      object.set("newMsgCount", 0);
      object.set("newBuddyRequests", 0);
      object.set("messengerFlash", 0);
      host.registerMessage("#userlogin", object.id, "#showEntryBar", entryInterfaceSource);
      host.registerMessage("#messenger_ready", object.id, "#activateIcon", entryInterfaceSource);
      host.recordUnsupportedOnce("entry-interface-construct-partial", {
        subsystem: "lingo",
        feature: "entry-interface-construct-partial",
        detail: `${release} Entry Interface Class construct is modeled for #userlogin/#messenger_ready registration and entry bar state; full update task animation remains partial`,
        source: entryInterfaceSource
      });
      return;
    }

    if (classNames.includes("Entry Component Class")) {
      const entryComponentSource = host.sourcePathForClass("Entry Component Class", release, "hh_entry_fi/casts/External/ParentScript 3 - Entry Component Class.ls");
      object.set("state", "constructed");
      host.registerMessage("#enterRoom", object.id, "#leaveEntry", entryComponentSource);
      host.registerMessage("#leaveRoom", object.id, "#enterEntry", entryComponentSource);
      host.registerMessage("#Initialize", object.id, "#updateState", entryComponentSource);
      host.recordUnsupportedOnce("entry-component-construct-partial", {
        subsystem: "lingo",
        feature: "entry-component-construct-partial",
        detail: `${release} Entry Component Class construct is partially modeled for message registration only; interface rendering remains unsupported`,
        source: entryComponentSource
      });
      return;
    }

    if (classNames.includes("Messenger Interface Class")) {
      object.set("windowTitle", host.texts.get(HABBO_MESSENGER_TITLE_KEY) ?? HABBO_MESSENGER_FALLBACK_TITLE);
      object.set("openWindow", "");
      object.set("lastOpenWindow", "");
      host.recordUnsupportedOnce("messenger-interface-construct-partial", {
        subsystem: "lingo",
        feature: "messenger-interface-construct-partial",
        detail: `${release} Messenger Interface Class source owns window state and eventProcMessenger view routes; Messenger Component Class owns #show_hide_messenger registration and delegates into the interface. Exact buddy item row visualizer objects remain partial`,
        source: HABBO_MESSENGER_SOURCE
      });
      return;
    }

    if (classNames.includes("Messenger Component Class")) {
      object.set("state", "constructed");
      object.set("readyFlag", 0);
      object.set("paused", 0);
      object.set("buddyList", createEmptyMessengerBuddyList());
      object.set("itemList", {
        messages: [],
        msgCount: { allmsg: 0 },
        newBuddyRequest: [],
        persistenMsg: ""
      });
      host.registerMessage("#enterRoom", object.id, "#hideMessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.registerMessage("#leaveRoom", object.id, "#hideMessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.registerMessage("#changeRoom", object.id, "#hideMessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.registerMessage("#show_messenger", object.id, "#showMessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.registerMessage("#hide_messenger", object.id, "#hideMessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.registerMessage("#show_hide_messenger", object.id, "#showhidemessenger", HABBO_MESSENGER_COMPONENT_SOURCE);
      host.executeMessage("#messenger_ready", "#messenger", release);
      host.recordUnsupportedOnce("messenger-component-construct-partial", {
        subsystem: "lingo",
        feature: "messenger-component-construct-partial",
        detail: `${release} Messenger Component Class state is modeled for buddy list, messages, requests, persistent message, and source send_* commands; timeout refresh and full visualizer row objects remain partial`,
        source: HABBO_MESSENGER_COMPONENT_SOURCE
      });
      return;
    }

    if (classNames.includes("Messenger Handler Class")) {
      object.set("state", "constructed");
      object.set("commands", {
        MESSENGER_INIT: 12,
        MESSENGER_SENDUPDATE: 15,
        MESSENGER_C_CLICK: 30,
        MESSENGER_C_READ: 31,
        MESSENGER_MARKREAD: 32,
        MESSENGER_SENDMSG: 33,
        MESSENGER_SENDEMAILMSG: 34,
        MESSENGER_ASSIGNPERSMSG: 36,
        MESSENGER_ACCEPTBUDDY: 37,
        MESSENGER_DECLINEBUDDY: 38,
        MESSENGER_REQUESTBUDDY: 39,
        MESSENGER_REMOVEBUDDY: 40,
        FINDUSER: 41
      });
      host.recordUnsupportedOnce("messenger-handler-construct-partial", {
        subsystem: "lingo",
        feature: "messenger-handler-construct-partial",
        detail: `${release} Messenger Handler Class packet registration is represented by browser bridge packet dispatch for ready, buddy list, member info, friend requests, and messages; campaign and SMS flows remain partial`,
        source: HABBO_MESSENGER_HANDLER_SOURCE
      });
      return;
    }

    if (classNames.includes("Purse Interface Class")) {
      object.set("windowTitle", host.texts.get(HABBO_PURSE_TITLE_KEY) ?? HABBO_PURSE_FALLBACK_TITLE);
      object.set("voucherWindowTitle", host.texts.get(HABBO_PURSE_VOUCHER_TITLE_KEY) ?? HABBO_PURSE_VOUCHER_FALLBACK_TITLE);
      object.set("openWindow", "");
      object.set("pageView", 1);
      object.set("pageList", []);
      object.set("dataReceived", 0);
      object.set("voucherInputState", 1);
      host.recordUnsupportedOnce("purse-interface-construct-partial", {
        subsystem: "lingo",
        feature: "purse-interface-construct-partial",
        detail: `${release} Purse Interface Class construct initializes the source purse.window state; Purse Component Class owns #show_hide_purse registration per source. Credit log and voucher flow are modeled for the source packets, while advert download and fly animation remain partial`,
        source: HABBO_PURSE_SOURCE
      });
      return;
    }

    if (classNames.includes("Purse Component Class")) {
      host.registerMessage("#show_purse", object.id, "#showPurse", HABBO_PURSE_COMPONENT_SOURCE);
      host.registerMessage("#hide_purse", object.id, "#hidePurse", HABBO_PURSE_COMPONENT_SOURCE);
      host.registerMessage("#show_hide_purse", object.id, "#showHidePurse", HABBO_PURSE_COMPONENT_SOURCE);
      host.recordUnsupportedOnce("purse-component-construct-partial", {
        subsystem: "lingo",
        feature: "purse-component-construct-partial",
        detail: `${release} Purse Component Class source registrations and REDEEM_VOUCHER command are modeled for the browser bridge; purse fly animation remains partial`,
        source: HABBO_PURSE_COMPONENT_SOURCE
      });
      return;
    }

    if (classNames.includes("Purse Handler Class")) {
      object.set("commands", {
        GET_CREDITS: 8,
        GETUSERCREDITLOG: 127,
        REDEEM_VOUCHER: 129
      });
      object.set("listeners", {
        PURSE: 6,
        USERCREDITLOG: 209,
        VOUCHER_REDEEM_OK: 212,
        VOUCHER_REDEEM_ERROR: 213
      });
      host.recordUnsupportedOnce("purse-handler-construct-partial", {
        subsystem: "lingo",
        feature: "purse-handler-construct-partial",
        detail: `${release} Purse Handler Class packet registration is represented by browser bridge dispatch for PURSE, credit log, and voucher result packets`,
        source: HABBO_PURSE_HANDLER_SOURCE
      });
      return;
    }

    if (classNames.includes("Catalogue Interface Class")) {
      object.set("catalogId", HABBO_CATALOGUE_WINDOW_ID);
      object.set("openWindow", "");
      object.set("pageLineHeight", 21);
      object.set("productPerPage", 0);
      object.set("productOffset", 0);
      object.set("pageProgramId", "Catalogue_page_prg");
      object.set("loaderObjectId", "Catalogue_loader");
      host.registerMessage("#enterRoom", object.id, "#hideCatalogue", HABBO_CATALOGUE_SOURCE);
      host.registerMessage("#leaveRoom", object.id, "#hideCatalogue", HABBO_CATALOGUE_SOURCE);
      host.registerMessage("#changeRoom", object.id, "#hideCatalogue", HABBO_CATALOGUE_SOURCE);
      host.registerMessage("#show_catalogue", object.id, "#showCatalogue", HABBO_CATALOGUE_SOURCE);
      host.registerMessage("#hide_catalogue", object.id, "#hideCatalogue", HABBO_CATALOGUE_SOURCE);
      host.registerMessage("#show_hide_catalogue", object.id, "#showHideCatalogue", HABBO_CATALOGUE_SOURCE);
      host.recordUnsupportedOnce("catalogue-interface-construct-partial", {
        subsystem: "lingo",
        feature: "catalogue-interface-construct-partial",
        detail: `${release} Catalogue Interface Class source registrations are modeled for show/hide/toggle and the first loading/index request path; full page renderer and product program classes remain partial`,
        source: HABBO_CATALOGUE_SOURCE
      });
      return;
    }

    if (classNames.includes("Catalogue Component Class")) {
      const editMode = String(host.getVariable("ctlg.editmode") ?? "production");
      object.set("catalogProps", { editmode: editMode });
      object.set("productOrderData", {});
      host.registerMessage("#edit_catalogue", object.id, "#editModeOn", HABBO_CATALOGUE_COMPONENT_SOURCE);
      host.recordUnsupportedOnce("catalogue-component-construct-partial", {
        subsystem: "lingo",
        feature: "catalogue-component-construct-partial",
        detail: `${release} Catalogue Component Class edit mode and source catalogue commands are represented for the initial catalogue request path; product ordering is still partial`,
        source: HABBO_CATALOGUE_COMPONENT_SOURCE
      });
      return;
    }

    if (classNames.includes("Catalogue Handler Class")) {
      object.set("commands", {
        GET_CATALOG_INDEX: 101,
        GET_CATALOG_PAGE: 102,
        PURCHASE_FROM_CATALOG: 100
      });
      object.set("listeners", {
        PURCHASE_OK: 67,
        PURCHASE_ERROR: 65,
        PURCHASE_NOBALANCE: 68,
        CATALOGINDEX: 126,
        CATALOGPAGE: 127
      });
      host.recordUnsupportedOnce("catalogue-handler-construct-partial", {
        subsystem: "lingo",
        feature: "catalogue-handler-construct-partial",
        detail: `${release} Catalogue Handler Class packet registration is represented by browser bridge dispatch for catalogue index/page and purchase result packets`,
        source: HABBO_CATALOGUE_HANDLER_SOURCE
      });
      return;
    }

    if (classNames.includes("Catalogue Loader Class")) {
      object.set("state", 0);
      object.set("frameCounter", 0);
      host.recordUnsupportedOnce("catalogue-loader-construct-partial", {
        subsystem: "lingo",
        feature: "catalogue-loader-construct-partial",
        detail: `${release} Catalogue Loader Class is modeled as a source loading window merge; animated rotated icon update is still partial`,
        source: HABBO_CATALOGUE_LOADER_SOURCE
      });
      return;
    }

    if (classNames.includes("Club Interface Class")) {
      object.set("dialogId", HABBO_CLUB_WINDOW_ID);
      object.set("price", directorNumberFromUnknown(host.getText("habboclub_price1"), 25));
      object.set("days", directorNumberFromUnknown(host.getText("habboclub_price1.days"), 30));
      object.set("parentPermission", 0);
      host.registerMessage("#show_clubinfo", object.id, "#show_clubinfo", HABBO_CLUB_INTERFACE_SOURCE);
      host.registerMessage("#notify", object.id, "#notify", HABBO_CLUB_INTERFACE_SOURCE);
      host.recordUnsupportedOnce("club-interface-construct-partial", {
        subsystem: "lingo",
        feature: "club-interface-construct-partial",
        detail: `${release} Club Interface Class construct registers #show_clubinfo/#notify and stores source price/day settings; exact parent permission confirmation remains partial`,
        source: HABBO_CLUB_INTERFACE_SOURCE
      });
      return;
    }

    if (classNames.includes("Club Component Class")) {
      object.set("clubStatus", 0);
      host.recordUnsupportedOnce("club-component-construct-partial", {
        subsystem: "lingo",
        feature: "club-component-construct-partial",
        detail: `${release} Club Component Class state is modeled for SCR_NOSUB/SCR_SINFO status and source subscribe/extend commands; ticket/gift side effects remain server-driven`,
        source: HABBO_CLUB_COMPONENT_SOURCE
      });
      return;
    }

    if (classNames.includes("Club Handler Class")) {
      object.set("commands", {
        SCR_GINFO: 26,
        SCR_SUBSCRIBE: 50,
        SCR_EXTSCR: 51
      });
      host.recordUnsupportedOnce("club-handler-construct-partial", {
        subsystem: "lingo",
        feature: "club-handler-construct-partial",
        detail: `${release} Club Handler Class packet registration is represented by browser bridge dispatch for SCR_NOSUB, SCR_SINFO, and SCR_SOK`,
        source: HABBO_CLUB_HANDLER_SOURCE
      });
    }
  }



