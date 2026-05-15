import { LingoList, parseLingoLiteral } from "../../../lingo";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import type { HabboFigurePartIndexEntry } from "../../boot/HabboBootResourceTypes";
import type { HabboWindowRecord } from "../../window/HabboWindowTypes";
import {
  createDefaultRegistrationProps,
  isPasswordElementId,
  isValidHabboEmail,
  readRegistrationProps
} from "./HabboRegistrationData";
import {
  applyFigurePartEntry,
  clampOneBasedIndex,
  createDefaultFigureProps,
  wrapIndex,
  type HabboFigurePartProps
} from "../figure/HabboFigureData";

const registrationInterfaceClassSource = "hh_registrat/casts/External/ParentScript 2 - Registration Interface Class.ls";
const registrationComponentClassSource = "hh_registrat/casts/External/ParentScript 3 - Registration Component Class.ls";

export interface HabboEditHabboRuntimeHost {
  [key: string]: any;
}

export function openRegistrationFigureCreatorRuntime(host: HabboEditHabboRuntimeHost, release: string, mode = "registration"): boolean {
  const registrationComponent = host.objectManager.getObject("#registration_component");
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  if (!registrationComponent || !registrationInterface) {
    host.recordUnsupportedOnce("registration-thread-object-missing", {
      subsystem: "habbo",
      feature: "registration-thread-object-missing",
      detail: `${release} #show_registration reached registration flow, but the registration component/interface objects were not initialized`,
      source: `extracted/projectorrays/${release}/${registrationComponentClassSource}`
    });
    return false;
  }

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

  registrationComponent.set("state", "openFigureCreator");
  defineRegistrationModeRuntime(host, registrationInterface, mode);
  const process = getRegistrationProcessRuntime(host, mode);
  const firstPage = process[0] ?? "reg_namepage";
  const windowName = firstPage.endsWith(".window") ? firstPage : `${firstPage}.window`;

  host.recordUnsupportedOnce("registration-server-gate-partial", {
    subsystem: "network",
    feature: "registration-server-gate-partial",
    detail: `${release} Registration Component Class would connect through the login component and wait for Figure_System/server state when needed; this browser slice opens the source-backed registration window and handles the first v7 server-backed name check path`,
    source: `extracted/projectorrays/${release}/${registrationComponentClassSource}`
  });

  return changeRegistrationWindowViewRuntime(host, windowName, release);
}

export function changeRegistrationWindowViewRuntime(host: HabboEditHabboRuntimeHost, windowName: string, release: string): boolean {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  if (!registrationInterface) {
    return false;
  }

  const windowTitle = String(registrationInterface.get("windowTitle") ?? host.texts.get("win_figurecreator") ?? "Your own Habbo");
  let window = host.windows.get(normalizeRegistrationWindowKey(windowTitle));
  if (!window) {
    window = host.createWindow(windowTitle, "habbo_basic.window", 381, 73);
    host.registerWindowClient(window, "#registration_interface");
    host.registerWindowProcedure(window, "#eventProcFigurecreator", "#registration_interface", "#mouseDown");
    host.registerWindowProcedure(window, "#eventProcFigurecreator", "#registration_interface", "#mouseUp");
    host.registerWindowProcedure(window, "#eventProcFigurecreator", "#registration_interface", "#keyDown");
  }

  host.mergeWindowLayout(window, windowName);
  host.clearWindowElementOverrides(window);
  registrationInterface.set("openWindow", windowName);
  applyRegistrationPageSideEffectsRuntime(host, window, windowName);
  host.movie.setProperty("registrationWindowVisible", true);
  host.movie.setProperty("registrationOpenWindow", windowName);
  host.movie.setProperty("loginWindowsVisible", false);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("registration", "ok", `ChangeWindowView ${windowName} template=habbo_basic.window`);
  host.recordUnsupportedOnce("registration-window-rendering-partial", {
    subsystem: "habbo",
    feature: "registration-window-rendering-partial",
    detail: `${release} Registration Interface Class ChangeWindowView is modeled with generated registration window layouts; checkboxes, radio buttons, button bitmap composition, and figure previews are source-backed, but full visualizer behavior and complete scrolling text semantics remain incomplete`,
    source: `extracted/projectorrays/${release}/${registrationInterfaceClassSource}`
  });
  return true;
}

export function closeRegistrationFigureCreatorRuntime(host: HabboEditHabboRuntimeHost, release: string, returnToLogin: boolean): boolean {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const windowTitle = String(registrationInterface?.get("windowTitle") ?? host.texts.get("win_figurecreator") ?? "Your own Habbo");
  const removed = host.removeWindow(windowTitle);
  host.registrationFieldValues.clear();
  host.windowTextValues.clear();
  host.movie.setProperty("registrationWindowVisible", false);
  host.movie.setProperty("registrationOpenWindow", undefined);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("registration", "info", `closeFigureCreator removed=${removed}`);
  if (returnToLogin && !(host.objectManager.getObject("#session")?.get("userName"))) {
    host.showLoginWindowPair(release);
  }
  return removed;
}

export function setRegistrationFieldValueRuntime(host: HabboEditHabboRuntimeHost, elementId: string, value: string, release: string): boolean {
  const normalizedValue = value.slice(0, isPasswordElementId(elementId) ? 32 : 128);
  host.registrationFieldValues.set(elementId, normalizedValue);
  updateRegistrationPropsFromFieldRuntime(host, elementId, normalizedValue);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("registration", "info", `field=${elementId} length=${normalizedValue.length}`);
  return true;
}

export function clearRegistrationNameFieldRuntime(host: HabboEditHabboRuntimeHost): void {
  host.registrationFieldValues.set("char_name_field", "");
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const props = readRegistrationProps(registrationInterface);
  props.name = "";
  registrationInterface?.set("propsToServer", props);
  host.syncWindowFieldValueSnapshot();
}

export function ensureRegistrationFigurePropsRuntime(host: HabboEditHabboRuntimeHost): Record<string, HabboFigurePartProps> {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const props = readRegistrationProps(registrationInterface);
  const figure = props.figure;
  if (typeof figure === "object" && figure !== null && !Array.isArray(figure) && Object.keys(figure).length > 0) {
    return figure as Record<string, HabboFigurePartProps>;
  }

  const sex = String(props.sex ?? "M").toUpperCase().startsWith("F") ? "F" : "M";
  const defaults = createDefaultFigureProps(sex, host.figurePartIndexSet);
  props.figure = defaults;
  registrationInterface?.set("propsToServer", props);
  return defaults;
}

export function setRegistrationSexRuntime(host: HabboEditHabboRuntimeHost, sex: "M" | "F", release: string): void {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const props = readRegistrationProps(registrationInterface);
  props.sex = sex;
  props.figure = createDefaultFigureProps(sex, host.figurePartIndexSet);
  registrationInterface?.set("propsToServer", props);
  host.logDebug("registration", "info", `sex=${sex} figure=default`);
  host.syncWindowSpriteChannels(release);
}

export function changeRegistrationFigurePartRuntime(
  host: HabboEditHabboRuntimeHost,
  part: string,
  direction: -1 | 1,
  release: string
): boolean {
  const entries = getFigurePartEntriesRuntime(host, part);
  if (entries.length === 0) {
    host.recordUnsupportedOnce(`registration-figure-part-list-missing:${part}`, {
      subsystem: "habbo",
      feature: "registration-figure-part-list-missing",
      detail: `${release} Registration Interface Class requested figure part cycling for ${part}, but no local figuredata entry is available`,
      source: "generated/runtime-data/figure-part-index.json"
    });
    return false;
  }

  const figure = { ...ensureRegistrationFigurePropsRuntime(host) };
  const current = figure[part];
  const currentIndex = Math.max(0, entries.findIndex((entry) => entry.setid === current?.setid));
  const nextIndex = wrapIndex(currentIndex + direction, entries.length);
  const colorid = clampOneBasedIndex(current?.colorid ?? 1, entries[nextIndex]?.colors.length ?? 1);
  applyFigurePartEntry(figure, entries[nextIndex], colorid);
  host.setRegistrationProp("figure", figure);
  host.logDebug("registration", "info", `figure.${part}.set=${entries[nextIndex]?.setid ?? ""}`);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function changeRegistrationFigurePartColorRuntime(
  host: HabboEditHabboRuntimeHost,
  part: string,
  direction: -1 | 1,
  release: string
): boolean {
  const entries = getFigurePartEntriesRuntime(host, part);
  const figure = { ...ensureRegistrationFigurePropsRuntime(host) };
  const current = figure[part];
  const entry = entries.find((candidate) => candidate.setid === current?.setid) ?? entries[0];
  if (!entry || entry.colors.length === 0) {
    host.recordUnsupportedOnce(`registration-figure-color-list-missing:${part}`, {
      subsystem: "habbo",
      feature: "registration-figure-color-list-missing",
      detail: `${release} Registration Interface Class requested figure color cycling for ${part}, but no local figuredata colors are available`,
      source: "generated/runtime-data/figure-part-index.json"
    });
    return false;
  }

  const currentColorIndex = clampOneBasedIndex(current?.colorid ?? 1, entry.colors.length) - 1;
  const nextColorid = wrapIndex(currentColorIndex + direction, entry.colors.length) + 1;
  applyFigurePartEntry(figure, entry, nextColorid);
  host.setRegistrationProp("figure", figure);
  host.logDebug("registration", "info", `figure.${part}.color=${nextColorid}`);
  host.syncWindowSpriteChannels(release);
  return true;
}

export function getFigurePartEntriesRuntime(host: HabboEditHabboRuntimeHost, part: string): readonly HabboFigurePartIndexEntry[] {
  const sex = String(host.getRegistrationProp("sex") ?? "M").toUpperCase().startsWith("F") ? "F" : "M";
  return host.figurePartIndexSet?.sexes[sex]?.[part] ?? [];
}

export function activateRegistrationElementRuntime(host: HabboEditHabboRuntimeHost, elementId: string, release: string): boolean {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const registrationComponent = host.objectManager.getObject("#registration_component");
  const openWindow = String(registrationInterface?.get("openWindow") ?? "");
  host.movie.setProperty("lastRegistrationAction", {
    elementId,
    openWindow
  });

  switch (elementId) {
    case "close":
    case "reg_cancel_button":
    case "reg_exit_button":
      registrationComponent?.set("state", "start");
      return closeRegistrationFigureCreatorRuntime(host, release, true);
    case "reg_underage_button":
      setRegistrationPropRuntime(host, "parentagree", "1");
      return changeRegistrationPageRuntime(host, 1, release);
    case "reg_olderage_button":
      setRegistrationPropRuntime(host, "parentagree", "0");
      return changeRegistrationPageRuntime(host, 1, release);
    case "reg_next_button":
      return changeRegistrationPageRuntime(host, 1, release);
    case "reg_prev_button":
      return changeRegistrationPageRuntime(host, -1, release);
    case "reg_done_button":
    case "reg_ready":
      return finishRegistrationFlowRuntime(host, release);
    case "char_sex_m":
      host.setRegistrationSex("M", release);
      return true;
    case "char_sex_f":
      host.setRegistrationSex("F", release);
      return true;
    case "char_spam_checkbox":
      toggleRegistrationPropRuntime(host, "directMail");
      host.syncWindowSpriteChannels(release);
      return true;
    case "char_terms_checkbox":
      toggleRegistrationPropRuntime(host, "has_read_agreement");
      host.syncWindowSpriteChannels(release);
      return true;
    case "char_permission_checkbox":
      toggleRegistrationPropRuntime(host, "parent_permission");
      host.syncWindowSpriteChannels(release);
      return true;
    default:
      {
        const partChange = /^change\.([a-z]+)\.(left|right)\.button$/i.exec(elementId);
        if (partChange) {
          return host.changeRegistrationFigurePart(partChange[1] ?? "", partChange[2] === "left" ? -1 : 1, release);
        }

        const colorChange = /^change\.([a-z]+)\.color\.(left|right)\.button$/i.exec(elementId);
        if (colorChange) {
          return host.changeRegistrationFigurePartColor(colorChange[1] ?? "", colorChange[2] === "left" ? -1 : 1, release);
        }
      }

      if (elementId.endsWith("_linktext") || elementId.includes("_link")) {
        host.movie.setProperty("lastRegistrationAction", {
          elementId,
          openWindow,
          action: "open_net_page"
        });
        host.recordUnsupportedOnce(`registration-link-not-opened:${elementId}`, {
          subsystem: "director",
          feature: "open-net-page-not-implemented",
          detail: `${release} Registration Interface Class would open a browser page for ${elementId}; page navigation is recorded only`,
          source: `extracted/projectorrays/${release}/${registrationInterfaceClassSource}`
        });
        host.logDebug("registration", "info", `link=${elementId} action=open_net_page`);
        return true;
      }
      host.logDebug("registration", "warn", `unhandled element=${elementId} window=${openWindow}`);
      return false;
  }
}

export function changeRegistrationPageRuntime(host: HabboEditHabboRuntimeHost, delta: number, release: string): boolean {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  if (!registrationInterface) {
    return false;
  }

  const openWindow = String(registrationInterface.get("openWindow") ?? "");
  if (delta > 0 && !leaveRegistrationPageRuntime(host, openWindow, release)) {
    return true;
  }

  const process = getActiveRegistrationProcessRuntime(host);
  if (process.length === 0) {
    host.recordUnsupportedOnce("registration-process-missing", {
      subsystem: "habbo",
      feature: "registration-process-missing",
      detail: `${release} Registration Interface Class could not find a registration process list; using reg_namepage fallback`,
      source: `extracted/projectorrays/${release}/${registrationInterfaceClassSource}`
    });
    return changeRegistrationWindowViewRuntime(host, "reg_namepage.window", release);
  }

  const currentLocation = getRegistrationProcessLocationRuntime(host);
  const nextLocation = Math.max(1, Math.min(process.length, currentLocation + delta));
  registrationInterface.set("regProcessLocation", nextLocation);
  const nextPage = process[nextLocation - 1] ?? "reg_namepage";
  return changeRegistrationWindowViewRuntime(host, nextPage.endsWith(".window") ? nextPage : `${nextPage}.window`, release);
}

export function showRegistrationAlertRuntime(host: HabboEditHabboRuntimeHost, release: string, msg: string, id = "problems", title = "alert_reg_t"): boolean {
  return host.executeMessage("#alert", {
    title,
    msg,
    id,
    modal: 1
  }, release);
}

export function setRegistrationPropRuntime(host: HabboEditHabboRuntimeHost, name: string, value: unknown): void {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const props = readRegistrationProps(registrationInterface);
  props[name] = value;
  registrationInterface?.set("propsToServer", props);
}

export function getRegistrationPropRuntime(host: HabboEditHabboRuntimeHost, name: string): unknown {
  return readRegistrationProps(host.objectManager.getObject("#registration_interface"))[name];
}

export function toggleRegistrationPropRuntime(host: HabboEditHabboRuntimeHost, name: string): void {
  const current = String(getRegistrationPropRuntime(host, name) ?? "0");
  setRegistrationPropRuntime(host, name, current === "1" ? "0" : "1");
  host.logDebug("registration", "info", `${name}=${getRegistrationPropRuntime(host, name)}`);
}

function defineRegistrationModeRuntime(host: HabboEditHabboRuntimeHost, registrationInterface: HabboVariableObject, mode: string): void {
  const propsToServer = createDefaultRegistrationProps();
  host.registrationFieldValues.clear();
  host.windowTextValues.clear();
  registrationInterface.set("mode", mode);
  registrationInterface.set("propsToServer", propsToServer);
  registrationInterface.set("regProcess", getRegistrationProcessRuntime(host, mode));
  registrationInterface.set("regProcessLocation", 1);
  registrationInterface.set("nameChecked", mode === "registration" || mode === "parent_email" ? 0 : 1);
  host.syncWindowFieldValueSnapshot();
}

function applyRegistrationPageSideEffectsRuntime(host: HabboEditHabboRuntimeHost, window: HabboWindowRecord, windowName: string): void {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const process = getActiveRegistrationProcessRuntime(host);
  const location = getRegistrationProcessLocationRuntime(host);
  if (process.length > 0) {
    host.windowTextValues.set("reg_page_number", `${location}/${process.length}`);
  }

  const props = readRegistrationProps(registrationInterface);
  switch (windowName) {
    case "reg_namepage.window":
      host.registrationFieldValues.set("char_name_field", String(props.name ?? ""));
      host.registrationFieldValues.set("char_mission_field", String(props.customData ?? ""));
      break;
    case "reg_infopage.window":
    case "reg_infopage_no_age.window":
      host.registrationFieldValues.set("char_email_field", String(props.email ?? ""));
      host.registrationFieldValues.set("char_pw_field", "");
      host.registrationFieldValues.set("char_pwagain_field", "");
      host.registrationFieldValues.set("char_birth_dd_field", "");
      host.registrationFieldValues.set("char_birth_mm_field", "");
      host.registrationFieldValues.set("char_birth_yyyy_field", "");
      break;
    case "reg_confirm.window":
      host.windowTextValues.set("reg_name", `${host.texts.get("reg_check_name") ?? "Habbo name:"} ${String(props.name ?? "")}`.trim());
      host.windowTextValues.set("reg_age", `${host.texts.get("reg_check_age") ?? "Birthdate:"} ${String(props.birthday ?? "")}`.trim());
      host.windowTextValues.set("reg_mail", `${host.texts.get("reg_check_mail") ?? "Email:"} ${String(props.email ?? "")}`.trim());
      break;
  }

  const mode = String(registrationInterface?.get("mode") ?? "registration");
  if (process.length > 0 && Number.isInteger(location)) {
    if (mode === "update" && location === 1) {
      host.hideWindowElement(window, "reg_prev_button");
    } else if (mode === "update" && location !== 1) {
      host.hideWindowElement(window, "reg_cancel_button");
    } else if (mode !== "update") {
      host.hideWindowElement(window, "reg_done_button");
      host.hideWindowElement(window, "reg_cancel_button");
    }

    if (location === process.length && mode !== "registration" && mode !== "parent_email") {
      host.showWindowElement(window, "reg_done_button");
      host.hideWindowElement(window, "reg_next_button");
      const layout = host.externalCastWindowLayoutSet?.windows.find((entry: { readonly memberName: string }) => {
        return entry.memberName.toLowerCase() === windowName.toLowerCase();
      });
      const nextButton = layout?.elements.find((element: { readonly id?: string }) => element.id === "reg_next_button");
      if (nextButton?.locH !== undefined) {
        host.moveWindowElementH(window, "reg_done_button", nextButton.locH);
      }
    }
  }
}

function getRegistrationProcessRuntime(host: HabboEditHabboRuntimeHost, mode: string): readonly string[] {
  const value = host.variables.get(`${mode}.process`);
  if (value instanceof LingoList) {
    return value.toArray().map((entry) => String(entry));
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value === "string") {
    const parsed = parseLingoLiteral(value);
    if (parsed instanceof LingoList) {
      return parsed.toArray().map((entry) => String(entry));
    }
  }

  return ["reg_namepage"];
}

function getActiveRegistrationProcessRuntime(host: HabboEditHabboRuntimeHost): readonly string[] {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const value = registrationInterface?.get("regProcess");
  return Array.isArray(value) ? value.map((entry) => String(entry)) : getRegistrationProcessRuntime(host, String(registrationInterface?.get("mode") ?? "registration"));
}

function getRegistrationProcessLocationRuntime(host: HabboEditHabboRuntimeHost): number {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const value = registrationInterface?.get("regProcessLocation");
  return typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

function updateRegistrationPropsFromFieldRuntime(host: HabboEditHabboRuntimeHost, elementId: string, value: string): void {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  const props = readRegistrationProps(registrationInterface);
  switch (elementId) {
    case "char_name_field":
      props.name = value.split(/\s+/)[0] ?? "";
      registrationInterface?.set("nameChecked", 0);
      break;
    case "char_mission_field":
      props.customData = value;
      break;
    case "char_email_field":
      props.email = value;
      break;
    case "char_pw_field":
      props.password = value;
      break;
    case "char_birth_dd_field":
    case "char_birth_mm_field":
    case "char_birth_yyyy_field": {
      const day = host.registrationFieldValues.get("char_birth_dd_field") ?? "";
      const month = host.registrationFieldValues.get("char_birth_mm_field") ?? "";
      const year = host.registrationFieldValues.get("char_birth_yyyy_field") ?? "";
      props.birthday = `${day}.${month}.${year}`;
      break;
    }
  }
  registrationInterface?.set("propsToServer", props);
}

function leaveRegistrationPageRuntime(host: HabboEditHabboRuntimeHost, openWindow: string, release: string): boolean {
  switch (openWindow) {
    case "reg_legal.window":
      {
        const errors: string[] = [];
        const scrollbar = host.findOpenWindowElement("char_scrollbar");
        const scrollState = scrollbar ? host.getScrollbarClientScrollState(scrollbar.window, scrollbar.layout, scrollbar.element, scrollbar.geometryTarget) : undefined;
        if (scrollState && scrollState.offset + 2 < scrollState.maxOffset) {
          host.logDebug("registration", "warn", `terms not fully scrolled offset=${scrollState.offset}/${scrollState.maxOffset}`);
          errors.push(host.texts.get("reg_readterms_alert") ?? "reg_readterms_alert");
        }

        if (String(getRegistrationPropRuntime(host, "has_read_agreement") ?? "0") !== "1") {
          host.logDebug("registration", "warn", "terms not accepted");
          errors.push(host.texts.get("reg_agree_alert") ?? "reg_agree_alert");
        }

        if (errors.length > 0) {
          showRegistrationAlertRuntime(host, release, errors.join("\r"), "problems");
          return false;
        }
      }
      return true;
    case "reg_namepage.window":
      updateRegistrationPropsFromFieldRuntime(host, "char_name_field", host.registrationFieldValues.get("char_name_field") ?? "");
      updateRegistrationPropsFromFieldRuntime(host, "char_mission_field", host.registrationFieldValues.get("char_mission_field") ?? "");
      {
        const name = String(getRegistrationPropRuntime(host, "name") ?? "").trim().split(/\s+/)[0] ?? "";
        setRegistrationPropRuntime(host, "name", name);
        host.registrationFieldValues.set("char_name_field", name);
        if (name.length === 0) {
          showRegistrationAlertRuntime(host, release, "Alert_NoNameSet", "nonameset", "");
          return false;
        }

        if (name.length < host.getIntVariable("name.length.min", 3)) {
          showRegistrationAlertRuntime(host, release, "Alert_YourNameIstooShort", "name2short", "");
          return false;
        }
      }
      if (String(host.objectManager.getObject("#registration_interface")?.get("nameChecked") ?? "0") !== "1") {
        const name = String(getRegistrationPropRuntime(host, "name") ?? "");
        host.objectManager.getObject("#registration_component")?.set("checkingName", name);
        host.movie.setProperty("lastRegistrationNameCheck", {
          command: "APPROVENAME",
          status: "pending",
          name
        });
        host.logDebug("registration", "info", `APPROVENAME queued name=${name}`);
        changeRegistrationWindowViewRuntime(host, "reg_loading.window", release);
        return false;
      }
      return true;
    case "reg_infopage.window":
    case "reg_infopage_no_age.window":
      updateRegistrationPropsFromFieldRuntime(host, "char_email_field", host.registrationFieldValues.get("char_email_field") ?? "");
      updateRegistrationPropsFromFieldRuntime(host, "char_pw_field", host.registrationFieldValues.get("char_pw_field") ?? "");
      {
        const errors = validateRegistrationInfoPageRuntime(host, openWindow);
        if (errors.length > 0) {
          showRegistrationAlertRuntime(host, release, errors.join("\r"), "problems");
          if (errors.some((error) => error.includes("Password") || error.includes("password"))) {
            host.registrationFieldValues.set("char_pw_field", "");
            host.registrationFieldValues.set("char_pwagain_field", "");
          }
          return false;
        }
      }
      return true;
    case "reg_confirm.window":
      return true;
    default:
      return true;
  }
}

function validateRegistrationInfoPageRuntime(host: HabboEditHabboRuntimeHost, openWindow: string): string[] {
  const errors: string[] = [];
  const password = host.registrationFieldValues.get("char_pw_field") ?? "";
  const passwordAgain = host.registrationFieldValues.get("char_pwagain_field") ?? "";
  const minPasswordLength = host.getIntVariable("pass.length.min.patched", host.getIntVariable("pass.length.min", 6));
  const maxPasswordLength = host.getIntVariable("pass.length.max", 32);

  if (password.length === 0 || password !== passwordAgain) {
    errors.push(host.texts.get("Alert_WrongPassword") ?? "Alert_WrongPassword");
  } else if (password.length < minPasswordLength) {
    errors.push(host.texts.get("Alert_YourPasswordIsTooShort") ?? "Alert_YourPasswordIsTooShort");
  } else if (password.length > maxPasswordLength) {
    errors.push(host.texts.get("Alert_YourPasswordIsTooLong") ?? "Alert_YourPasswordIsTooLong");
  } else if (!/\d/.test(password)) {
    errors.push(host.texts.get("reg_passwordContainsNoNumber") ?? "reg_passwordContainsNoNumber");
  }

  const email = host.registrationFieldValues.get("char_email_field") ?? "";
  if (!isValidHabboEmail(email)) {
    errors.push(host.texts.get("alert_reg_email") ?? "alert_reg_email");
  }

  if (openWindow === "reg_infopage.window") {
    const day = Number.parseInt(host.registrationFieldValues.get("char_birth_dd_field") ?? "", 10);
    const month = Number.parseInt(host.registrationFieldValues.get("char_birth_mm_field") ?? "", 10);
    const year = Number.parseInt(host.registrationFieldValues.get("char_birth_yyyy_field") ?? "", 10);
    if (!Number.isFinite(day) || day < 1 || day > 31 || !Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(year) || year < 1900 || year > 2100) {
      errors.push(host.texts.get("alert_reg_birthday") ?? "alert_reg_birthday");
    }
  }

  return errors;
}

function finishRegistrationFlowRuntime(host: HabboEditHabboRuntimeHost, release: string): boolean {
  const props = readRegistrationProps(host.objectManager.getObject("#registration_interface"));
  host.objectManager.getObject("#session")?.set("userName", props.name ?? "");
  host.objectManager.getObject("#session")?.set("password", props.password ?? "");
  host.movie.setProperty("lastRegistrationSubmit", {
    name: props.name ?? "",
    passwordLength: String(props.password ?? "").length,
    email: props.email ?? "",
    birthday: props.birthday ?? ""
  });
  host.movie.setProperty("lastRegistrationSubmitProps", {
    ...props,
    passwordLength: String(props.password ?? "").length
  });
  host.recordUnsupportedOnce("registration-response-flow-partial", {
    subsystem: "network",
    feature: "registration-response-flow-partial",
    detail: `${release} Registration Component Class reaches the source-backed REGISTER payload path; the browser bridge sends release7 REGISTER and handles REGISTRATIONOK/login follow-up, but full post-login client state is still partial`,
    source: `extracted/projectorrays/${release}/${registrationComponentClassSource}`
  });
  host.logDebug("registration", "info", `REGISTER payload ready name=${String(props.name ?? "")} passwordLength=${String(props.password ?? "").length}`);
  return closeRegistrationFigureCreatorRuntime(host, release, false);
}

function normalizeRegistrationWindowKey(id: string): string {
  return id.startsWith("#") ? id.slice(1).toLowerCase() : id.toLowerCase();
}
