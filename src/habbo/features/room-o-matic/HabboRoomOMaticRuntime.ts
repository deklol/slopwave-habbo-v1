import type { UnsupportedFeature } from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import {
  coerceRecord,
  normalizeSymbolKey,
  replaceChars,
  roomKioskPasswordFromTempValue,
  sanitizeDirectorSingleLineInput,
  sanitizeRoomKioskRoomNameInput
} from "../../HabboSourceValueHelpers";
import type {
  HabboNavigatorNodeInfo,
  HabboNavigatorRequest
} from "../navigator";
import type { HabboWindowElementActivation, HabboWindowRecord } from "../../window/HabboWindowTypes";
import type { HabboRoomKioskDoor } from "../../ui/HabboRoomKioskDialog";

const roomKioskInterfaceClassSource = "hh_kiosk_room/casts/External/ParentScript 3 - RoomKiosk Interface Class.ls";
const roomKioskHandlerClassSource = "hh_kiosk_room/casts/External/ParentScript 5 - RoomKiosk Handler Class.ls";

export interface HabboRoomOMaticRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
    objectExists(id: string): boolean;
    createObject(id: string, className: string): HabboVariableObject;
  };
  readonly windows: Map<string, HabboWindowRecord>;
  readonly windowTextValues: Map<string, string>;

  getText(key: string): string | undefined;
  applyThreadConstructorSideEffects(object: HabboVariableObject, classNames: readonly string[], release: string): void;
  createWindow(title: string, template: string | undefined, x: number, y: number): HabboWindowRecord;
  registerWindowClient(window: HabboWindowRecord, clientId: string): void;
  mergeWindowLayout(window: HabboWindowRecord, layoutName: string): void;
  clearWindowElementOverrides(window: HabboWindowRecord): void;
  registerWindowProcedure(window: HabboWindowRecord, handler: string, clientId: string, event: string): void;
  removeWindow(title: string): boolean;
  syncWindowFieldValueSnapshot(): void;
  syncWindowSnapshot(): void;
  syncWindowSpriteChannels(release: string): void;
  executeMessage(message: string, argument: unknown, release: string): unknown;
  convertSpecialChars(value: string, mode: number): string;
  queueNavigatorRequest(request: Omit<HabboNavigatorRequest, "id" | "status">, release: string): void;
  getNavigatorNodeInfo(nodeId: string): HabboNavigatorNodeInfo | undefined;
  prepareNavigatorRoomEntry(nodeId: string, release: string): boolean;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
}

export function ensureRoomKioskObjects(host: HabboRoomOMaticRuntimeHost, release: string): void {
  const ensureObject = (id: string, className: string): void => {
    if (host.objectManager.objectExists(id)) {
      return;
    }

    const object = host.objectManager.createObject(id, className);
    object.set("threadId", "#roomkiosk");
    object.set("classNames", [className]);
    host.applyThreadConstructorSideEffects(object, [className], release);
  };

  ensureObject("#roomkiosk_interface", "RoomKiosk Interface Class");
  ensureObject("#roomkiosk_component", "RoomKiosk Component Class");
  ensureObject("#roomkiosk_handler", "RoomKiosk Handler Class");
}

export function showHideRoomKiosk(host: HabboRoomOMaticRuntimeHost, release: string): boolean {
  ensureRoomKioskObjects(host, release);
  const windowId = "RoomMatic";
  if (host.windows.has(normalizeSymbolKey(windowId))) {
    const removed = host.removeWindow(windowId);
    host.objectManager.getObject("#roomkiosk_component")?.set("state", "start");
    host.movie.setProperty("roomKioskVisible", false);
    host.syncWindowSnapshot();
    host.syncWindowSpriteChannels(release);
    host.logDebug("roomkiosk", "info", `hide removed=${removed}`);
    return true;
  }

  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  kioskInterface?.set("tempPassword", {});
  kioskInterface?.set("roomProps", {});
  return changeRoomKioskWindowView(host, "roomatic1.window", release);
}

export function changeRoomKioskWindowView(host: HabboRoomOMaticRuntimeHost, windowName: string, release: string): boolean {
  ensureRoomKioskObjects(host, release);
  const normalizedWindowName = windowName.endsWith(".window") ? windowName : `${windowName}.window`;
  let window = host.windows.get(normalizeSymbolKey("RoomMatic"));
  if (!window) {
    window = host.createWindow("RoomMatic", undefined, 0, -4);
    host.registerWindowClient(window, "#roomkiosk_interface");
  }

  host.mergeWindowLayout(window, normalizedWindowName);
  host.clearWindowElementOverrides(window);
  window.procedures.length = 0;
  host.registerWindowProcedure(window, "#eventProc", "#roomkiosk_interface", "#mouseUp");
  host.registerWindowProcedure(window, "#eventProc", "#roomkiosk_interface", "#keyDown");
  applyRoomKioskPageValues(host, normalizedWindowName, release);
  host.movie.setProperty("roomKioskVisible", true);
  host.movie.setProperty("roomKioskOpenWindow", normalizedWindowName);
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("roomkiosk", "ok", `ChangeWindowView ${normalizedWindowName}`);
  return true;
}

export function applyRoomKioskPageValues(host: HabboRoomOMaticRuntimeHost, windowName: string, release: string): void {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  const session = host.objectManager.getObject("#session");
  if (windowName === "roomatic2.window") {
    const userName = stringFromSession(session, "user_name") || stringFromSession(session, "userName");
    props.owner = userName;
    if (!props.showownername) {
      props.showownername = "1";
    }
    const categories = coerceRecord(session?.get("user_flat_cats"));
    const firstCategoryId = Object.keys(categories)[0] ?? "";
    if (!props.category && firstCategoryId) {
      props.category = firstCategoryId;
    }
    if (Object.keys(categories).length === 0) {
      host.queueNavigatorRequest({ command: "GETUSERFLATCATS" }, release);
    }
    if (props.category) {
      host.movie.setProperty("dropMenuSelections", {
        ...coerceRecord(host.movie.getProperty("dropMenuSelections")),
        roomatic_choosecategory: String(props.category)
      });
    }
    host.windowTextValues.set("roomatic_ownername_field", userName);
    kioskInterface?.set("roomProps", props);
  } else if (windowName === "roomatic3.window" || windowName === "roomatic_club.window") {
    if (!props.model) {
      props.model = "1";
      kioskInterface?.set("roomProps", props);
    }
  } else if (windowName === "roomatic4.window") {
    if (!props.door) {
      props.door = "open";
    }
    if (!props.ableothersmovefurniture) {
      props.ableothersmovefurniture = "0";
    }
    kioskInterface?.set("roomProps", props);
  }

  host.movie.setProperty("roomKioskProps", {
    ...props,
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
}

export function handleRoomKioskFlatCreatedPacket(host: HabboRoomOMaticRuntimeHost, body: string, release: string): boolean {
  ensureRoomKioskObjects(host, release);
  const lines = body.split(/\r?\n|\r/).filter((line) => line.length > 0);
  const flatId = (lines[0] ?? "").trim().split(/\s+/)[0] ?? "";
  const currentProps = coerceRecord(host.objectManager.getObject("#roomkiosk_interface")?.get("roomProps"));
  const flatName = lines[1] ?? String(currentProps.name ?? "");
  if (!flatId) {
    return false;
  }

  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  props.id = flatId;
  props.flatId = flatId;
  props.name = flatName || String(props.name ?? "");
  if (props.door !== "password") {
    props.password = "";
  }
  kioskInterface?.set("roomProps", props);
  const categoryId = String(props.category ?? "");
  if (categoryId) {
    host.queueNavigatorRequest({ command: "SETFLATCAT", flatId, categoryId }, release);
  }
  const flatInfoBody = `/${replaceChars(flatId, "/", " ")}/\rdescription=${replaceChars(host.convertSpecialChars(sanitizeDirectorSingleLineInput(String(props.description ?? "")), 1), "/", " ")}\rpassword=${replaceChars(sanitizeDirectorSingleLineInput(String(props.password ?? "")), "/", " ")}\rallsuperuser=${String(props.ableothersmovefurniture ?? "0")}`;
  host.queueNavigatorRequest({ command: "SETFLATINFO", body: flatInfoBody }, release);
  changeRoomKioskWindowView(host, "roomatic7.window", release);
  host.windowTextValues.set("roomatic_newnumber", `${host.getText("roomatic_roomnumber") ?? "Room number:"} ${flatId}`);
  host.windowTextValues.set("roomatic_newname", `${host.getText("roomatic_roomname") ?? "Room name:"} ${props.name}`);
  host.movie.setProperty("lastRoomKioskFlatCreated", {
    flatId,
    flatName: props.name,
    source: `extracted/projectorrays/${release}/${roomKioskHandlerClassSource}`
  });
  host.syncWindowFieldValueSnapshot();
  host.syncWindowSpriteChannels(release);
  host.logDebug("roomkiosk", "ok", `FLATCREATED id=${flatId} name=${props.name}`);
  return true;
}

export function activateRoomKioskElement(
  host: HabboRoomOMaticRuntimeHost,
  elementId: string,
  release: string,
  activation?: HabboWindowElementActivation
): boolean {
  if (activation?.event && activation.event !== "mouseUp") {
    return false;
  }

  switch (elementId) {
    case "close":
    case "roomatic_1_button_cancel":
    case "roomatic_2_button_cancel":
    case "roomatic_7_button_cancel":
      return showHideRoomKiosk(host, release);
    case "roomatic_1_button_start":
      return changeRoomKioskWindowView(host, "roomatic2.window", release);
    case "roomatic_2_button_next":
      if (!updateRoomKioskPropsFromFields(host, release)) {
        return false;
      }
      return changeRoomKioskWindowView(host, "roomatic3.window", release);
    case "roomatic_3_button_next":
      return changeRoomKioskWindowView(host, "roomatic4.window", release);
    case "roomatic_3_button_previous":
      return changeRoomKioskWindowView(host, "roomatic2.window", release);
    case "roomatic_4_button_previous":
    case "roomatic_5_button_back":
      return changeRoomKioskWindowView(host, "roomatic3.window", release);
    case "roomatic_4_button_done":
      if (!validateRoomKioskPasswordFields(host, release)) {
        return changeRoomKioskWindowView(host, "roomatic5.window", release);
      }
      queueRoomKioskCreateFlat(host, release);
      return changeRoomKioskWindowView(host, "roomatic6.window", release);
    case "roomatic_7_button_go":
      return executeRoomKioskCreatedRoomEntry(host, release);
    case "roomatic_security_open":
    case "roomatic_security_locked":
    case "roomatic_security_pwc":
      setRoomKioskDoor(host, elementId === "roomatic_security_open" ? "open" : elementId === "roomatic_security_locked" ? "closed" : "password", release);
      return true;
    case "roomatic_namedisplayed_yes_check":
    case "roomatic_namedisplayed_no_check":
      setRoomKioskShowOwnerName(host, elementId === "roomatic_namedisplayed_yes_check", release);
      return true;
    case "roomatic_security_letmove":
      toggleRoomKioskFurnitureMove(host, release);
      return true;
    case "roomatic_choosecategory":
      if (activation?.localY !== undefined) {
        applyRoomKioskCategorySelection(host, String(host.movie.getProperty("dropMenuSelections") ?? ""), release);
      }
      return true;
    default:
      if (elementId.startsWith("roomatic_roomchoose_")) {
        const model = elementId.slice("roomatic_roomchoose_".length);
        const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
        kioskInterface?.set("roomProps", {
          ...coerceRecord(kioskInterface.get("roomProps")),
          model
        });
        host.movie.setProperty("roomKioskProps", kioskInterface?.get("roomProps"));
        host.logDebug("roomkiosk", "info", `model=${model}`);
        return true;
      }

      host.recordUnsupportedOnce(`roomkiosk-element-unhandled:${elementId}`, {
        subsystem: "lingo",
        feature: "roomkiosk-element-unhandled",
        detail: `${release} RoomKiosk Interface Class eventProc received ${elementId}; this RoomMatic action is not translated yet`,
        source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
      });
      host.logDebug("roomkiosk", "warn", `unhandled element=${elementId}`);
      return false;
  }
}

export function updateRoomKioskPropsFromFields(host: HabboRoomOMaticRuntimeHost, release: string): boolean {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  const name = sanitizeRoomKioskRoomNameInput(String(host.windowTextValues.get("roomatic_roomname_field") ?? props.name ?? ""));
  if (!name) {
    host.movie.setProperty("lastRoomKioskValidation", {
      field: "roomatic_roomname_field",
      error: "roomatic_givename",
      source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
    });
    host.executeMessage("#alert", { msg: "roomatic_givename" }, release);
    return false;
  }

  const description = sanitizeDirectorSingleLineInput(String(host.windowTextValues.get("romatic_roomdescription_field") ?? props.description ?? ""));
  props.name = name;
  props.description = description;
  host.windowTextValues.set("roomatic_roomname_field", name);
  host.windowTextValues.set("romatic_roomdescription_field", description);
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  return true;
}

export function validateRoomKioskPasswordFields(host: HabboRoomOMaticRuntimeHost, release: string): boolean {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  if (props.door !== "password") {
    props.password = "";
    kioskInterface?.set("roomProps", props);
    host.movie.setProperty("roomKioskProps", props);
    return true;
  }

  const tempPassword = coerceRecord(kioskInterface?.get("tempPassword"));
  const password = roomKioskPasswordFromTempValue(tempPassword.roomatic_password_field);
  const passwordAgain = roomKioskPasswordFromTempValue(tempPassword.roomatic_password2_field);
  let errorKey = "";
  if (password.length === 0) {
    errorKey = "Alert_ForgotSetPassword";
  } else if (password.length < 3) {
    errorKey = "nav_error_passwordtooshort";
  } else if (password !== passwordAgain) {
    errorKey = "Alert_WrongPassword";
  }

  if (errorKey) {
    host.windowTextValues.set("roomatic_errorMsg", host.getText(errorKey) ?? errorKey);
    host.movie.setProperty("lastRoomKioskValidation", {
      field: "roomatic_password_field",
      error: errorKey,
      source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
    });
    return false;
  }

  props.password = password;
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  return true;
}

export function applyRoomKioskCategorySelection(host: HabboRoomOMaticRuntimeHost, categoryId: string, release: string): void {
  if (!categoryId) {
    return;
  }

  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  props.category = categoryId;
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  host.logDebug("roomkiosk", "info", `category=${categoryId}`, {
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
}

export function setRoomKioskDoor(host: HabboRoomOMaticRuntimeHost, door: HabboRoomKioskDoor, release: string): void {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  props.door = door;
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  host.syncWindowSpriteChannels(release);
  host.logDebug("roomkiosk", "info", `door=${door}`, {
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
}

export function setRoomKioskShowOwnerName(host: HabboRoomOMaticRuntimeHost, showOwnerName: boolean, release: string): void {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  props.showownername = showOwnerName ? "1" : "0";
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  host.syncWindowSpriteChannels(release);
  host.logDebug("roomkiosk", "info", `showownername=${props.showownername}`, {
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
}

export function toggleRoomKioskFurnitureMove(host: HabboRoomOMaticRuntimeHost, release: string): void {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  props.ableothersmovefurniture = String(props.ableothersmovefurniture ?? "0") === "1" ? "0" : "1";
  kioskInterface?.set("roomProps", props);
  host.movie.setProperty("roomKioskProps", props);
  host.syncWindowSpriteChannels(release);
  host.logDebug("roomkiosk", "info", `ableothersmovefurniture=${props.ableothersmovefurniture}`, {
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
}

export function queueRoomKioskCreateFlat(host: HabboRoomOMaticRuntimeHost, release: string): void {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  const name = replaceChars(host.convertSpecialChars(sanitizeRoomKioskRoomNameInput(String(props.name ?? "")), 1), "/", " ");
  const model = String(props.model ?? "1");
  const roomModels = Array.isArray(kioskInterface?.get("roomModels")) ? kioskInterface?.get("roomModels") as string[] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const marker = `model_${roomModels[Math.max(0, Number.parseInt(model, 10) - 1)] ?? "a"}`;
  const door = String(props.door ?? "open");
  const showOwnerName = String(props.showownername ?? "1");
  const body = `/first floor/${name}/${marker}/${door}/${showOwnerName}`;
  props.name = name;
  props.marker = marker;
  props.door = door;
  props.showownername = showOwnerName;
  kioskInterface?.set("roomProps", props);
  host.queueNavigatorRequest({ command: "CREATEFLAT", body }, release);
  host.movie.setProperty("lastRoomKioskCreateFlat", {
    body,
    props,
    source: `extracted/projectorrays/${release}/${roomKioskInterfaceClassSource}`
  });
  host.logDebug("roomkiosk", "info", `CREATEFLAT name=${name} marker=${marker}`);
}

export function executeRoomKioskCreatedRoomEntry(host: HabboRoomOMaticRuntimeHost, release: string): boolean {
  const kioskInterface = host.objectManager.getObject("#roomkiosk_interface");
  const props = coerceRecord(kioskInterface?.get("roomProps"));
  const id = String(props.id ?? props.flatId ?? "");
  if (!id) {
    return showHideRoomKiosk(host, release);
  }

  const roomNode: HabboNavigatorNodeInfo = {
    id: `f_${id}`,
    flatId: id,
    nodeType: 2,
    name: String(props.name ?? ""),
    owner: String(props.owner ?? ""),
    door: String(props.door ?? "open"),
    description: String(props.description ?? ""),
    percentFilled: 0,
    parentid: "own"
  };
  const component = host.objectManager.getObject("#navigator_component");
  const own = host.getNavigatorNodeInfo("own") ?? {
    id: "own",
    nodeType: 0,
    name: "own",
    percentFilled: 0,
    parentid: "0",
    children: {}
  };
  component?.set("nodeCache", {
    ...coerceRecord(component.get("nodeCache")),
    own: {
      ...own,
      children: {
        ...coerceRecord(own.children),
        [roomNode.id]: roomNode
      }
    }
  });
  showHideRoomKiosk(host, release);
  return host.prepareNavigatorRoomEntry(roomNode.id, release);
}

function stringFromSession(session: HabboVariableObject | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" ? value : "";
}
