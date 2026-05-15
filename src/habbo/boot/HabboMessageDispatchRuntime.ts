import { LingoSymbol } from "../../lingo";
import type { HabboDelayRecord } from "../window/HabboWindowTypes";
import type { HabboMessageCallRecord, HabboMessageRegistration } from "./HabboBootResourceTypes";
import { coerceRecord, normalizeSymbolKey } from "../HabboSourceValueHelpers";
import { serializeDelay } from "../HabboRuntimeSerialization";
import { HABBO_CLUB_HANDLER_SOURCE } from "../features/habbo-club";

export interface HabboMessageDispatchHost {
  readonly objectManager: {
    getObject(id: LingoSymbol | string): { get(key: string): unknown; set(key: string, value: unknown): void } | undefined;
    objectExists(id: LingoSymbol | string): boolean;
  };
  readonly movie: {
    setProperty(key: string, value: unknown): void;
  };
  readonly brokers: Map<string, HabboMessageRegistration[]>;
  readonly delays: Map<string, HabboDelayRecord>;
  nextDelayId: number;
  [key: string]: any;
}

const entryInterfaceClassSource = "hh_entry_fi/casts/External/ParentScript 2 - Entry Interface Class.ls";
const loginInterfaceClassSource = "hh_shared/casts/External/ParentScript 1 - Login Interface Class.ls";
export function executeObjectHandlerRuntime(host: HabboMessageDispatchHost, 
    clientIdValue: LingoSymbol | string,
    methodValue: LingoSymbol | string,
    argument: unknown,
    release: string,
    source?: string
  ): HabboMessageCallRecord {
    const clientSymbol = clientIdValue instanceof LingoSymbol ? clientIdValue : new LingoSymbol(clientIdValue);
    const methodSymbol = methodValue instanceof LingoSymbol ? methodValue : new LingoSymbol(methodValue);
    const clientId = clientSymbol.toString();
    const method = methodSymbol.toString();
    const object = host.objectManager.getObject(clientSymbol);
    if (!object) {
      return {
        clientId,
        method,
        handled: false,
        result: "missing-object"
      };
    }

    if (clientSymbol.equals("#entry_component") && methodSymbol.equals("#updateState") && argument === "initialize") {
      object.set("state", "initialize");
      host.objectManager.getObject("#entry_interface")?.set("hotelViewVisible", true);
      const result = host.showEntryHotelView(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-hotel-view-rendered" : "entry-hotel-view-missing"
      };
    }

    if (clientSymbol.equals("#entry_interface") && methodSymbol.equals("#showEntryBar")) {
      const result = host.showEntryBar(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-bar-rendered" : "entry-bar-missing"
      };
    }

    if (clientSymbol.equals("#entry_interface") && methodSymbol.equals("#updateEntryBar")) {
      const result = host.updateEntryBar(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-bar-updated" : "entry-bar-missing"
      };
    }

    if (clientSymbol.equals("#entry_interface") && methodSymbol.equals("#updateCreditCount")) {
      const result = host.updateEntryBar(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-bar-credits-updated" : "entry-bar-missing"
      };
    }

    if (clientSymbol.equals("#messenger_interface") && methodSymbol.equals("#showhidemessenger")) {
      const result = host.showHideMessenger(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "messenger-toggled" : "messenger-toggle-failed"
      };
    }

    if (clientSymbol.equals("#messenger_component") && (methodSymbol.equals("#showhidemessenger") || methodSymbol.equals("#showMessenger"))) {
      const result = methodSymbol.equals("#showMessenger") ? host.showMessenger(release) : host.showHideMessenger(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "messenger-shown" : "messenger-show-failed"
      };
    }

    if ((clientSymbol.equals("#messenger_component") || clientSymbol.equals("#messenger_interface")) && methodSymbol.equals("#hideMessenger")) {
      const result = host.hideMessenger(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "messenger-hidden" : "messenger-hide-failed"
      };
    }

    if (clientSymbol.equals("#entry_interface") && methodSymbol.equals("#activateIcon")) {
      host.objectManager.getObject("#entry_interface")?.set("messengerReady", 1);
      host.movie.setProperty("messengerReady", true);
      host.updateEntryBar(release);
      return {
        clientId,
        method,
        handled: true,
        result: "entry-messenger-icon-activated"
      };
    }

    if (clientSymbol.equals("#purse_interface") && methodSymbol.equals("#showHidePurse")) {
      const result = host.showHidePurse(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "purse-toggled" : "purse-toggle-failed"
      };
    }

    if (clientSymbol.equals("#purse_component") && methodSymbol.equals("#showPurse")) {
      const result = host.showPurse(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "purse-shown" : "purse-show-failed"
      };
    }

    if (clientSymbol.equals("#purse_component") && methodSymbol.equals("#hidePurse")) {
      const result = host.hidePurse(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "purse-hidden" : "purse-hide-failed"
      };
    }

    if (clientSymbol.equals("#purse_component") && methodSymbol.equals("#showHidePurse")) {
      const result = host.showHidePurse(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "purse-toggled" : "purse-toggle-failed"
      };
    }

    if (clientSymbol.equals("#catalogue_interface") && methodSymbol.equals("#showCatalogue")) {
      const result = host.showCatalogue(release, argument);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "catalogue-shown" : "catalogue-show-failed"
      };
    }

    if (clientSymbol.equals("#catalogue_interface") && methodSymbol.equals("#hideCatalogue")) {
      const result = host.hideCatalogue(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "catalogue-hidden" : "catalogue-hide-failed"
      };
    }

    if (clientSymbol.equals("#catalogue_interface") && methodSymbol.equals("#showHideCatalogue")) {
      const result = host.showHideCatalogue(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "catalogue-toggled" : "catalogue-toggle-failed"
      };
    }

    if (clientSymbol.equals("#catalogue_component") && methodSymbol.equals("#editModeOn")) {
      host.setVariable("ctlg.editmode", "develop");
      object.set("catalogProps", {
        ...coerceRecord(object.get("catalogProps")),
        editmode: "develop"
      });
      host.movie.setProperty("catalogueEditMode", "develop");
      return {
        clientId,
        method,
        handled: true,
        result: "catalogue-edit-mode-enabled"
      };
    }

    if (clientSymbol.equals("#club_interface") && methodSymbol.equals("#show_clubinfo")) {
      const result = host.showClubInfo(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "club-info-routed" : "club-info-unavailable"
      };
    }

    if (clientSymbol.equals("#club_interface") && methodSymbol.equals("#notify")) {
      const result = host.notifyClub(argument, release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "club-notify-routed" : "club-notify-unhandled"
      };
    }

    if (clientSymbol.equals("#entry_component") && methodSymbol.equals("#leaveEntry")) {
      const result = host.leaveEntry(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-left" : "entry-leave-failed"
      };
    }

    if (clientSymbol.equals("#entry_component") && methodSymbol.equals("#enterEntry")) {
      const result = host.enterEntry(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "entry-entered" : "entry-enter-failed"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#updateState")) {
      const result = host.updateNavigatorState(String(argument ?? ""), release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? `navigator-state:${String(argument ?? "")}` : "navigator-state-unhandled"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#showNavigator")) {
      const result = host.showNavigator(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "navigator-shown" : "navigator-show-failed"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#hideNavigator")) {
      const result = host.hideNavigator(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "navigator-hidden" : "navigator-hide-failed"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#leaveRoom")) {
      const result = host.navigatorLeaveRoom(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "navigator-room-left" : "navigator-room-leave-failed"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#showhidenavigator")) {
      const result = host.showHideNavigator(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "navigator-toggled" : "navigator-toggle-failed"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#sendGetUserFlatCats")) {
      host.queueNavigatorRequest({ command: "GETUSERFLATCATS" }, release);
      return {
        clientId,
        method,
        handled: true,
        result: "navigator-get-user-flat-cats-queued"
      };
    }

    if (clientSymbol.equals("#navigator_component") && methodSymbol.equals("#executeRoomEntry")) {
      const result = host.executeNavigatorRoomEntry(argument, release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "navigator-room-entry-executed" : "navigator-room-entry-failed"
      };
    }

    if ((clientSymbol.equals("#roomkiosk_component") || clientSymbol.equals("#roomkiosk_interface")) && methodSymbol.equals("#showHideRoomKiosk")) {
      const result = host.showHideRoomKiosk(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "roomkiosk-toggled" : "roomkiosk-toggle-failed"
      };
    }

    if (clientSymbol.equals("#room_component") && methodSymbol.equals("#enterRoom")) {
      const result = host.enterRoom(argument, release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "room-enter-started" : "room-enter-failed"
      };
    }

    if (clientSymbol.equals("#room_component") && methodSymbol.equals("#loadRoomCasts")) {
      const result = host.loadRoomCasts(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "room-cast-load-advanced" : "room-cast-load-failed"
      };
    }

    if (clientSymbol.equals("#room_component") && methodSymbol.equals("#leaveRoom")) {
      const result = host.leaveRoom(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "room-left" : "room-leave-failed"
      };
    }

    if (clientSymbol.equals("#room_component") && methodSymbol.equals("#roomCastLoaded")) {
      const result = host.roomCastLoaded(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "room-casts-loaded" : "room-cast-load-failed"
      };
    }

    if (clientSymbol.equals("#login_component") && methodSymbol.equals("#initA")) {
      const loginComponentSource = host.sourcePathForClass("Login Component Class", release, "hh_shared/casts/External/ParentScript 4 - Login Component Class.ls");
      const figurepartlistLoaded = host.getIntVariable("figurepartlist.loaded", 1) !== 0;
      const scheduledHandler = figurepartlistLoaded ? "#initB" : "#initA";
      const delayMs = figurepartlistLoaded ? 1000 : 250;
      const delay = host.scheduleDelay(
        clientSymbol,
        scheduledHandler,
        delayMs,
        undefined,
        loginComponentSource
      );
      object.set("lastInitializeDelay", {
        handler: scheduledHandler,
        delayMs,
        delayId: delay.id
      });
      host.movie.setProperty("loginInitializeDelay", {
        figurepartlistLoaded,
        handler: scheduledHandler,
        delayMs,
        delayId: delay.id
      });
      host.recordUnsupportedOnce("login-component-delay-timeout-partial", {
        subsystem: "lingo",
        feature: "login-component-delay-timeout-partial",
        detail: `${release} Login Component Class initA reached delay(${delayMs}, ${scheduledHandler}); delay scheduling is modeled without real wall-clock timing`,
        source: loginComponentSource
      });
      return {
        clientId,
        method,
        handled: true,
        result: `scheduled ${scheduledHandler}`
      };
    }

    if (clientSymbol.equals("#login_component") && methodSymbol.equals("#initB")) {
      const result = host.showLoginWindowPair(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "login-windows-recorded" : "login-interface-missing"
      };
    }

    if (clientSymbol.equals("#login_interface") && methodSymbol.equals("#showUserFound")) {
      const result = host.showUserFound(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "login-user-found-rendered" : "login-user-found-missing"
      };
    }

    if (clientSymbol.equals("#login_interface") && methodSymbol.equals("#myHabboSmile")) {
      const loginInterfaceSource = host.sourcePathForClass("Login Interface Class", release, loginInterfaceClassSource);
      host.movie.setProperty("loginUserFoundAnimation", "smile");
      host.movie.setProperty("loginUserFoundAnimationFrame", 0);
      host.syncWindowSpriteChannels(release);
      host.scheduleDelay(clientSymbol, "#stopWaving", 1200, undefined, loginInterfaceSource);
      host.logDebug("login", "info", "showUserFound animation=smile");
      return {
        clientId,
        method,
        handled: true,
        result: "login-user-found-smile"
      };
    }

    if (clientSymbol.equals("#login_interface") && methodSymbol.equals("#stopWaving")) {
      const loginInterfaceSource = host.sourcePathForClass("Login Interface Class", release, loginInterfaceClassSource);
      host.movie.setProperty("loginUserFoundAnimation", "stopWaving");
      host.movie.setProperty("loginUserFoundAnimationFrame", 0);
      host.syncWindowSpriteChannels(release);
      host.scheduleDelay(clientSymbol, "#hideLogin", 400, undefined, loginInterfaceSource);
      host.logDebug("login", "info", "showUserFound animation=stopWaving");
      return {
        clientId,
        method,
        handled: true,
        result: "login-user-found-stop-waving"
      };
    }

    if (clientSymbol.equals("#login_interface") && methodSymbol.equals("#hideLogin")) {
      host.removeLoginWindowPair(release);
      host.movie.setProperty("loginUserFoundVisible", false);
      return {
        clientId,
        method,
        handled: true,
        result: "login-windows-hidden"
      };
    }

    if (clientSymbol.equals("#registration_component") && methodSymbol.equals("#openFigureCreator")) {
      const result = host.openRegistrationFigureCreator(release);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "registration-window-recorded" : "registration-interface-missing"
      };
    }

    if (clientSymbol.equals("#registration_component") && methodSymbol.equals("#closeFigureCreator")) {
      const result = host.closeRegistrationFigureCreator(release, true);
      return {
        clientId,
        method,
        handled: result,
        result: result ? "registration-window-closed" : "registration-window-missing"
      };
    }

    if (clientSymbol.equals("#registration_component") && methodSymbol.equals("#figureSystemReady")) {
      const state = typeof object.get("state") === "string" ? object.get("state") as string : "openFigureCreator";
      const result = state === "openFigureCreator" ? host.openRegistrationFigureCreator(release) : true;
      return {
        clientId,
        method,
        handled: result,
        result: result ? `registration-figure-ready:${state}` : "registration-figure-ready-unhandled"
      };
    }

    host.recordUnsupportedOnce(`message-handler-not-translated:${clientId}:${method}`, {
      subsystem: "lingo",
      feature: "message-handler-not-translated",
      detail: `${release} broker dispatch reached ${clientId}.${method}, but that message handler is not translated yet`,
      ...(source !== undefined ? { source } : {})
    });
    return {
      clientId,
      method,
      handled: false,
      result: "unsupported-handler"
    };
  }


export function createBrokerRuntime(host: HabboMessageDispatchHost, id: LingoSymbol | string): void {
  const key = normalizeSymbolKey(id);
  if (!host.brokers.has(key)) {
    host.brokers.set(key, []);
  }
}

export function brokerExistsRuntime(host: HabboMessageDispatchHost, id: LingoSymbol | string): boolean {
  return host.brokers.has(normalizeSymbolKey(id));
}

export function registerMessageRuntime(
  host: HabboMessageDispatchHost,
  message: LingoSymbol | string,
  clientId: LingoSymbol | string,
  method: LingoSymbol | string,
  source?: string
): boolean {
  const messageSymbol = message instanceof LingoSymbol ? message : new LingoSymbol(message);
  const clientSymbol = clientId instanceof LingoSymbol ? clientId : new LingoSymbol(clientId);
  const methodSymbol = method instanceof LingoSymbol ? method : new LingoSymbol(method);
  const key = normalizeSymbolKey(messageSymbol);
  const registrations = host.brokers.get(key) ?? [];
  const nextRegistration: HabboMessageRegistration = {
    message: messageSymbol,
    clientId: clientSymbol,
    method: methodSymbol,
    ...(source !== undefined ? { source } : {})
  };

  host.brokers.set(key, [
    ...registrations.filter((registration) => !registration.clientId.equals(clientSymbol)),
    nextRegistration
  ]);
  host.movie.setProperty(`brokerRegistrations.${messageSymbol.toString()}`, getMessageRegistrationsRuntime(host, messageSymbol));
  return true;
}

export function unregisterMessageRuntime(host: HabboMessageDispatchHost, message: LingoSymbol | string, clientId: LingoSymbol | string): boolean {
  const key = normalizeSymbolKey(message);
  const registrations = host.brokers.get(key);
  if (!registrations) {
    return false;
  }

  const clientSymbol = clientId instanceof LingoSymbol ? clientId : new LingoSymbol(clientId);
  const nextRegistrations = registrations.filter((registration) => !registration.clientId.equals(clientSymbol));
  if (nextRegistrations.length === 0) {
    host.brokers.delete(key);
  } else {
    host.brokers.set(key, nextRegistrations);
  }

  return true;
}

export function getMessageRegistrationsRuntime(host: HabboMessageDispatchHost, message: LingoSymbol | string): readonly Record<string, unknown>[] {
  return (host.brokers.get(normalizeSymbolKey(message)) ?? []).map((registration) => ({
    message: registration.message.toString(),
    clientId: registration.clientId.toString(),
    method: registration.method.toString(),
    ...(registration.source !== undefined ? { source: registration.source } : {})
  }));
}

export function executeMessageRuntime(
  host: HabboMessageDispatchHost,
  message: LingoSymbol | string,
  argument: unknown,
  release: string
): boolean {
  const messageSymbol = message instanceof LingoSymbol ? message : new LingoSymbol(message);
  if (messageSymbol.equals("#alert")) {
    const handled = host.showAlert(argument, release);
    const calls: HabboMessageCallRecord[] = [{
      clientId: "#alert_manager",
      method: "#showAlert",
      handled,
      result: handled ? "alert-rendered" : "alert-not-rendered"
    }];
    host.movie.setProperty("lastMessageDispatch", {
      message: messageSymbol.toString(),
      argument,
      registrations: getMessageRegistrationsRuntime(host, messageSymbol),
      calls,
      result: handled
    });
    return handled;
  }

  if (messageSymbol.equals("#openGeneralDialog")) {
    const handled = host.showOpenGeneralDialog(argument, release);
    const calls: HabboMessageCallRecord[] = [{
      clientId: "#dialog_thread",
      method: "#showDialog",
      handled,
      result: handled ? "dialog-rendered" : "dialog-unsupported"
    }];
    host.movie.setProperty("lastMessageDispatch", {
      message: messageSymbol.toString(),
      argument,
      registrations: getMessageRegistrationsRuntime(host, messageSymbol),
      calls,
      result: handled
    });
    return handled;
  }

  if (messageSymbol.equals("#sendCallForHelp")) {
    const handled = host.sendCallForHelp(argument, release);
    const calls: HabboMessageCallRecord[] = [{
      clientId: "#hobba_component",
      method: "#send_cryForHelp",
      handled,
      result: handled ? "call-for-help-recorded" : "call-for-help-unavailable"
    }];
    host.movie.setProperty("lastMessageDispatch", {
      message: messageSymbol.toString(),
      argument,
      registrations: getMessageRegistrationsRuntime(host, messageSymbol),
      calls,
      result: handled
    });
    return handled;
  }

  if (messageSymbol.equals("#open_roomkiosk")) {
    host.ensureRoomKioskObjects(release);
  }
  if (messageSymbol.equals("#show_hide_messenger")) {
    host.ensureMessengerInterfaceObject(release);
  }
  if (messageSymbol.equals("#show_hide_purse")) {
    host.ensurePurseInterfaceObject(release);
  }
  if (messageSymbol.equals("#show_hide_catalogue") || messageSymbol.equals("#show_catalogue") || messageSymbol.equals("#hide_catalogue") || messageSymbol.equals("#edit_catalogue")) {
    host.ensureCatalogueObjects(release);
  }
  if (messageSymbol.equals("#show_clubinfo")) {
    host.ensureClubObjects(release);
  }

  const registrations = [...(host.brokers.get(normalizeSymbolKey(messageSymbol)) ?? [])].reverse();
  const calls: HabboMessageCallRecord[] = [];

  for (const registration of registrations) {
    if (!host.objectManager.objectExists(registration.clientId)) {
      unregisterMessageRuntime(host, messageSymbol, registration.clientId);
      calls.push({
        clientId: registration.clientId.toString(),
        method: registration.method.toString(),
        handled: false,
        result: "missing-object"
      });
      continue;
    }

    calls.push(host.executeRegisteredMessageHandler(registration, argument, release));
  }

  host.movie.setProperty("lastMessageDispatch", {
    message: messageSymbol.toString(),
    argument,
    registrations: getMessageRegistrationsRuntime(host, messageSymbol),
    calls,
    result: registrations.length > 0
  });
  return registrations.length > 0;
}

export function scheduleDelayRuntime(
  host: HabboMessageDispatchHost,
  clientId: LingoSymbol | string,
  method: LingoSymbol | string,
  delayMs: number,
  argument: unknown,
  source?: string
): HabboDelayRecord {
  const clientSymbol = clientId instanceof LingoSymbol ? clientId : new LingoSymbol(clientId);
  const methodSymbol = method instanceof LingoSymbol ? method : new LingoSymbol(method);
  const delay: HabboDelayRecord = {
    id: `Delay ${clientSymbol.toString()} ${host.nextDelayId++}`,
    clientId: clientSymbol,
    method: methodSymbol,
    delayMs,
    ...(argument !== undefined ? { argument } : {}),
    ...(source !== undefined ? { source } : {})
  };

  host.delays.set(delay.id, delay);
  const object = host.objectManager.getObject(clientSymbol);
  if (object) {
    const existing = Array.isArray(object.get("delays")) ? object.get("delays") as string[] : [];
    object.set("delays", [...existing, delay.id]);
  }
  host.syncDelaySnapshot();
  return delay;
}

export function getPendingDelaysRuntime(host: HabboMessageDispatchHost): readonly Record<string, unknown>[] {
  return [...host.delays.values()].map((delay) => serializeDelay(delay));
}

export function runScheduledDelaysRuntime(host: HabboMessageDispatchHost, elapsedMs: number, release: string): readonly HabboMessageCallRecord[] {
  const dueDelays = [...host.delays.values()].filter((delay) => delay.delayMs <= elapsedMs);
  const calls: HabboMessageCallRecord[] = [];

  for (const delay of dueDelays) {
    host.delays.delete(delay.id);
    const object = host.objectManager.getObject(delay.clientId);
    if (object) {
      const existing = Array.isArray(object.get("delays")) ? object.get("delays") as string[] : [];
      object.set("delays", existing.filter((id) => id !== delay.id));
    }
    calls.push(host.executeObjectHandler(delay.clientId, delay.method, delay.argument, release, delay.source));
  }

  host.syncDelaySnapshot();
  host.movie.setProperty("lastExecutedDelays", {
    elapsedMs,
    calls
  });
  return calls;
}


