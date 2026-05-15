import { HabboPacketBodyReader } from "./HabboPacketBodyReader";
import { coerceRecord, readLingoPacketWord } from "../HabboSourceValueHelpers";
import {
  createDefaultFigureProps,
  parseOldServerFigureString,
  preloadLoginUserFoundFigureAssetsRuntime,
  type HabboFigureRuntimeHost
} from "../features/figure";
import {
  normalizeModeratorAlertMessage,
  normalizeModeratorErrorMessage,
  normalizeSystemBroadcastMessage
} from "../HabboModerationMessages";
import { normalizeBadgeId } from "../room/HabboRoomSelection";

export interface HabboBridgePacketRuntimeHost {
  [key: string]: any;
}
export function handleBridgePacketRuntime(host: HabboBridgePacketRuntimeHost, packetName: string, body: string, release: string): boolean {
    const registrationInterface = host.objectManager.getObject("#registration_interface");
    const registrationComponent = host.objectManager.getObject("#registration_component");
    const openWindow = String(registrationInterface?.get("openWindow") ?? "");
    const normalizedPacketName = packetName.toUpperCase();
    host.movie.setProperty("lastHandledServerPacket", {
      name: normalizedPacketName,
      body,
      registrationOpenWindow: openWindow || undefined
    });

    switch (normalizedPacketName) {
      case "NAMEAPPROVED":
        host.movie.setProperty("lastRegistrationNameCheck", {
          ...coerceRecord(host.movie.getProperty("lastRegistrationNameCheck")),
          status: "approved"
        });
        host.movie.setProperty("lastRegistrationNameAvailabilityCheck", {
          command: "FINDUSER",
          status: "pending",
          name: String(host.getRegistrationProp("name") ?? ""),
          context: "REGNAME"
        });
        host.logDebug("registration", "ok", "NAMEAPPROVED received; queued FINDUSER REGNAME");
        return true;
      case "NOSUCHUSER":
        if (body.trim().split(/\s+/)[0] === "REGNAME") {
          registrationInterface?.set("nameChecked", 1);
          host.movie.setProperty("lastRegistrationNameAvailabilityCheck", {
            ...coerceRecord(host.movie.getProperty("lastRegistrationNameAvailabilityCheck")),
            status: "available"
          });
          host.logDebug("registration", "ok", "NOSUCHUSER REGNAME received; name is available");
          if (openWindow === "reg_loading.window") {
            return host.changeRegistrationPage(1, release);
          }
          return true;
        }
        if (host.isMessengerUserLookupBody(body)) {
          return host.handleMessengerUserNotFoundPacket(body, release);
        }
        break;
      case "MEMBERINFO":
        if (body.trim().split(/\s+/)[0] === "REGNAME") {
          host.handleRegistrationNameRejected(release, "Alert_NameAlreadyUse", "namereserved", true);
          host.movie.setProperty("lastRegistrationNameAvailabilityCheck", {
            ...coerceRecord(host.movie.getProperty("lastRegistrationNameAvailabilityCheck")),
            status: "reserved"
          });
          return true;
        }
        if (host.isMessengerMemberInfoBody(body)) {
          return host.handleMessengerMemberInfoPacket(body, release);
        }
        break;
      case "NAMEUNACCEPTABLE":
        host.handleRegistrationNameRejected(release, "Alert_unacceptableName", "namenogood", true);
        return true;
      case "NAMETOOLONG":
        host.handleRegistrationNameRejected(release, "Alert_NameTooLong", "nametoolong", false);
        return true;
      case "REGISTRATIONOK":
        registrationComponent?.set("state", "start");
        host.movie.setProperty("lastRegistrationResponse", {
          name: String(host.getRegistrationProp("name") ?? ""),
          status: "ok"
        });
        host.logDebug("registration", "ok", "REGISTRATIONOK received; closing figure creator");
        return host.closeRegistrationFigureCreator(release, false);
      case "ERROR":
        return host.handleServerErrorPacket(body, release);
      case "MODALERT":
        return host.showModeratorAlert(body, release, "modalert");
      case "SYSTEMBROADCAST":
        return host.handleSystemBroadcastPacket(body, release);
      case "ROOM_URL":
        host.movie.setProperty("lastRoomUrl", body);
        host.logDebug("room", "info", `ROOM_URL ${body}`);
        return true;
      case "UPDATE_VOTES":
        host.movie.setProperty("lastRoomVoteUpdate", body);
        host.logDebug("room", "info", `UPDATE_VOTES ${body}`);
        return true;
      case "TYPING_STATUS":
        host.movie.setProperty("lastRoomTypingStatus", body);
        host.logDebug("room", "info", `TYPING_STATUS ${body}`);
        return true;
      case "ROOMEEVENT_INFO":
        host.movie.setProperty("lastRoomEventInfo", body);
        host.logDebug("room", "info", `ROOMEEVENT_INFO ${body}`);
        return true;
      case "USERBANNED":
        return host.showGeneralDialog("ban", {
          id: "BannWarning",
          title: "Alert_YouAreBanned_T",
          msg: `${host.texts.get("Alert_YouAreBanned") ?? "Alert_YouAreBanned"}\r${body}`,
          modal: 1
        }, release);
      case "LOGINOK":
        host.movie.setProperty("loginResponseStatus", "ok");
        host.logDebug("login", "ok", "LOGINOK received");
        return true;
      case "USEROBJ":
      case "USER_OBJECT":
        return host.handleUserObjectPacket(body, release);
      case "PURSE":
        host.handlePursePacket(body, release);
        return true;
      case "USERCREDITLOG":
      case "CREDITLOG":
        return host.handlePurseCreditLogPacket(body, release);
      case "VOUCHER_REDEEM_OK":
        return host.handleVoucherRedeemOkPacket(body, release);
      case "VOUCHER_REDEEM_ERROR":
        return host.handleVoucherRedeemErrorPacket(body, release);
      case "CATALOGINDEX":
        return host.handleCatalogueIndexPacket(body, release);
      case "CATALOGPAGE":
        return host.handleCataloguePagePacket(body, release);
      case "PURCHASE_OK":
        return host.handleCataloguePurchaseResultPacket("OK", body, release);
      case "PURCHASE_NOBALANCE":
        return host.handleCataloguePurchaseResultPacket("NOBALANCE", body, release);
      case "PURCHASE_ERROR":
        return host.handleCataloguePurchaseResultPacket("ERROR", body, release);
      case "STRIPINFO":
        return host.handleStripInfoPacket(body, release);
      case "STRIPUPDATED":
        return host.handleStripUpdatedPacket(body, release);
      case "REMOVESTRIPITEM":
        return host.handleRemoveStripItemPacket(body, release);
      case "SCR_NOSUB":
        return host.handleClubNoSubscriptionPacket(body, release);
      case "SCR_SINFO":
        return host.handleClubSubscriptionInfoPacket(body, release);
      case "SCR_SOK":
        return host.handleClubSubscriptionOkPacket(release);
      case "MESSENGERREADY":
        return host.handleMessengerReadyPacket(release);
      case "BUDDYLIST":
      case "BUDDYLIST_UPDATE":
        return host.handleMessengerBuddyListPacket(normalizedPacketName, body, release);
      case "MYPERSISTENTMSG":
        return host.handleMessengerPersistentMessagePacket(body, release);
      case "BUDDYADDREQUESTS":
        return host.handleMessengerBuddyRequestsPacket(body, release);
      case "MESSENGER_MSG":
        return host.handleMessengerMessagePacket(body, release);
      case "REMOVE_BUDDY":
        return host.handleMessengerRemoveBuddyPacket(body, release);
      case "AVAILABLEBADGES":
        return host.handleAvailableBadgesPacket(body, release);
      case "USERBADGE":
        return host.handleUserBadgePacket(body, release);
      case "STUFFDATAUPDATE":
        return host.handleRoomStuffDataUpdatePacket(body, release);
      case "DOORFLAT":
        return host.handleRoomDoorFlatPacket(body, release);
      case "DOOR_IN":
      case "DOOR_OUT":
      case "DOORDELETED":
        return host.handleRoomTeleporterActivityPacket(normalizedPacketName, body, release);
      case "OPC_OK":
        return host.roomConnected(undefined, "OPC_OK", release);
      case "FLAT_LETIN":
        return host.roomConnected(undefined, "FLAT_LETIN", release);
      case "ROOM_READY":
        return host.roomConnected(readLingoPacketWord(body, 1), "ROOM_READY", release);
      case "HEIGHTMAP":
        if (!host.canAcceptRoomBootstrapPacket(normalizedPacketName, release)) {
          return false;
        }
        host.movie.setProperty("lastRoomHeightMap", body);
        host.handleRoomProcessStep("heightmap", release);
        host.logDebug("room", "ok", `HEIGHTMAP length=${body.length}`);
        return true;
      case "USERS":
        if (!host.canAcceptRoomBootstrapPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomUsersPacket(body, release);
      case "OBJECTS":
        if (!host.canAcceptRoomBootstrapPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomPassiveObjectsPacket(body, release);
      case "ACTIVE_OBJECTS":
        if (!host.canAcceptRoomBootstrapPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomActiveObjectsPacket(body, release);
      case "ITEMS":
        if (!host.canAcceptRoomBootstrapPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomItemsPacket(body, release);
      case "ADDITEM":
      case "UPDATEITEM":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomItemUpdatePacket(body, release);
      case "ACTIVEOBJECT_UPDATE":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomActiveObjectUpdatePacket(body, release);
      case "ACTIVEOBJECT_ADD":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomActiveObjectUpdatePacket(body, release);
      case "ACTIVEOBJECT_REMOVE":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomActiveObjectRemovePacket(body, release);
      case "REMOVEITEM":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomItemRemovePacket(body, release);
      case "STATUS":
        if (!host.canAcceptInitialStatusPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomStatusPacket(body, release);
      case "LOGOUT":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomLogoutPacket(body, release);
      case "CHAT":
      case "SHOUT":
      case "WHISPER":
        if (!host.canAcceptActiveRoomPacket(normalizedPacketName, release)) {
          return false;
        }
        return host.handleRoomChatPacket(body, normalizedPacketName, release);
      case "FLATPROPERTY":
        return host.handleRoomFlatPropertyPacket(body, release);
      case "YOUARECONTROLLER":
        getOrCreateSessionObject(host)?.set("room_controller", 1);
        host.logDebug("room", "ok", "YOUARECONTROLLER");
        return true;
      case "YOUAREOWNER":
        getOrCreateSessionObject(host)?.set("room_owner", 1);
        getOrCreateSessionObject(host)?.set("room_controller", 1);
        host.logDebug("room", "ok", "YOUAREOWNER");
        return true;
      case "YOUARENOTCONTROLLER":
        getOrCreateSessionObject(host)?.set("room_controller", 0);
        host.logDebug("room", "info", "YOUARENOTCONTROLLER");
        return true;
      case "NAVNODEINFO":
        return host.handleNavigatorNodeInfoPacket(body, release);
      case "USERFLATCATS":
        return host.handleNavigatorUserFlatCatsPacket(body, release);
      case "FLAT_RESULTS":
      case "SEARCH_FLAT_RESULTS":
      case "FAVORITE_FLAT_RESULTS":
        return host.handleNavigatorFlatResultsPacket(normalizedPacketName, body, release);
      case "NOFLATSFORUSER":
      case "NOFLATS":
        return host.handleNavigatorNoFlatsPacket(normalizedPacketName, release);
      case "FLATCREATED":
      case "FLAT_CREATED":
        return host.handleRoomKioskFlatCreatedPacket(body, release);
      default:
        return false;
    }

    return false;
  }

export function handleUserObjectPacketRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string
): boolean {
  const fields = parseUserObjectFields(body, release);
  const source = loginUserObjectHandlerSource(release);
  if (fields.sex) {
    fields.sex = fields.sex.toLowerCase().includes("f") ? "F" : "M";
  }

  const session = getOrCreateSessionObject(host);
  for (const [key, value] of Object.entries(fields)) {
    session?.set(`user_${key}`, value);
  }
  applyUserObjectBadgeStateRuntime(host, session, fields, release);
  const sex = fields.sex === "F" ? "F" : "M";
  const parsedFigure = parseOldServerFigureString(fields.figure, sex, host.figurePartIndexSet);
  if (parsedFigure) {
    session?.set("user_figure", parsedFigure);
    session?.set("user_figureRaw", fields.figure);
  } else if (fields.figure) {
    session?.set("user_figure", createDefaultFigureProps(sex, host.figurePartIndexSet));
    session?.set("user_figureRaw", fields.figure);
    host.recordUnsupportedOnce("login-figure-string-parse-partial", {
      subsystem: "habbo",
      feature: "login-figure-string-parse-partial",
      detail: `${release} Login Handler Class received USEROBJ figure=${fields.figure}, but it could not be mapped through the local figurepart index; preview rendering falls back to source-backed default figure parts`,
      source
    });
  }
  if (fields.name) {
    session?.set("userName", fields.name);
    session?.set("user_name", fields.name);
  }
  if (fields.customData) {
    session?.set("user_customData", fields.customData);
  }
  const password = session ? session.get("password") ?? "" : "";
  session?.set("user_password", password);

  host.movie.setProperty("lastUserObjectBody", body);
  host.movie.setProperty("lastUserObject", {
    ...fields,
    ...(parsedFigure ? { figureProps: parsedFigure, figureParse: "old-server-25-digit" } : {})
  });
  host.movie.setProperty("lastLoginAttempt", {
    ...coerceRecord(host.movie.getProperty("lastLoginAttempt")),
    accepted: true,
    userName: fields.name ?? stringFromSession(session, "userName"),
    action: "userobj"
  });
  host.logDebug("login", "ok", `USEROBJ received user=${fields.name ?? "unknown"} figure=${fields.figure ?? "n/a"}`);

  if (session?.exists("user_logged")) {
    host.updateEntryBar(release);
    return true;
  }

  session?.set("user_logged", 1);
  host.executeMessage("#updateFigureData", undefined, release);
  preloadLoginUserFoundFigureAssetsRuntime(host as HabboFigureRuntimeHost, release);
  const userFound = host.showUserFound(release);
  const userLogin = host.executeMessage("#userlogin", "userLogin", release);
  host.movie.setProperty("lastPostLoginFlow", {
    release,
    source,
    userFound,
    userLogin,
    user: fields.name ?? "",
    figure: fields.figure ?? ""
  });
  return userFound || userLogin;
}

function getOrCreateSessionObject(host: HabboBridgePacketRuntimeHost): { set(key: string, value: unknown): void; get(key: string): unknown; exists(key: string): boolean } | undefined {
  const existing = host.objectManager.getObject("#session");
  if (existing) {
    return existing;
  }

  if (typeof host.objectManager.createObject !== "function") {
    return undefined;
  }

  const variableClass = String(host.getClassVariable?.("variable.manager.class") ?? "Variable Manager Class");
  return host.objectManager.createObject("#session", variableClass);
}

function applyUserObjectBadgeStateRuntime(
  host: HabboBridgePacketRuntimeHost,
  session: { set(key: string, value: unknown): void } | undefined,
  fields: Readonly<Record<string, string>>,
  release: string
): void {
  const badge = normalizeBadgeId(fields.badge_type ?? fields.badge ?? fields.badgeType);
  if (!badge) {
    return;
  }

  const badges = [badge];
  session?.set("available_badges", badges);
  session?.set("chosen_badge_index", 1);
  session?.set("badge_visible", 1);
  session?.set("user_badge", badge);
  host.movie.setProperty("availableBadges", badges);
  host.movie.setProperty("chosenBadgeIndex", 1);
  host.movie.setProperty("badgeVisible", 1);
  host.movie.setProperty("lastUserObjectBadge", {
    badge,
    source: loginUserObjectHandlerSource(release),
    ...(release.startsWith("release1")
      ? {
          serverSource: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/player/PlayerDetails.java"
        }
      : {})
  });
  if (release.startsWith("release1")) {
    host.movie.setProperty("release1OwnBadgeType", badge);
  }
}

export function handleAvailableBadgesPacketRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string
): boolean {
  const reader = new HabboPacketBodyReader(body);
  const count = Math.max(0, reader.readInt());
  const badges: string[] = [];
  for (let index = 0; index < count && !reader.exhausted; index++) {
    const badge = normalizeBadgeId(reader.readString());
    if (badge) {
      badges.push(badge);
    }
  }

  const serverChosenIndex = reader.exhausted ? 0 : reader.readInt();
  const visible = reader.exhausted ? 1 : reader.readInt();
  const chosenBadgeIndex = badges.length > 0
    ? Math.max(1, Math.min(badges.length, serverChosenIndex + 1))
    : 1;
  const session = host.objectManager.getObject("#session");
  session?.set("available_badges", badges);
  session?.set("chosen_badge_index", chosenBadgeIndex);
  session?.set("badge_visible", visible !== 0 ? 1 : 0);
  host.movie.setProperty("availableBadges", badges);
  host.movie.setProperty("chosenBadgeIndex", chosenBadgeIndex);
  host.movie.setProperty("badgeVisible", visible !== 0 ? 1 : 0);
  host.movie.setProperty("lastAvailableBadges", {
    badges,
    chosenBadgeIndex,
    visible: visible !== 0 ? 1 : 0
  });
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "ok", `AVAILABLEBADGES count=${badges.length} chosen=${chosenBadgeIndex}`);
  return true;
}

export function handleUserBadgePacketRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string
): boolean {
  const reader = new HabboPacketBodyReader(body);
  const userId = String(reader.readInt());
  const badge = normalizeBadgeId(reader.readString());
  if (!userId) {
    return false;
  }

  const component = host.objectManager.getObject("#room_component");
  const users = coerceRecord(component?.get("userObjects")) as Record<string, Record<string, unknown>>;
  const user = users[userId];
  if (user) {
    const next = {
      ...users,
      [userId]: {
        ...user,
        badge
      }
    };
    component?.set("userObjects", next);
    host.movie.setProperty("roomUsers", next);
    if (host.movie.getProperty("selectedRoomObjectId") === userId) {
      host.movie.setProperty("selectedRoomUserBadge", badge);
      const selectedInfo = host.getSelectedRoomUserInfo();
      if (selectedInfo) {
        host.movie.setProperty("selectedRoomUserInfo", {
          ...selectedInfo,
          badge
        });
      }
    }
  }

  host.movie.setProperty("lastUserBadge", {
    userId,
    badge
  });
  host.syncWindowSpriteChannels(release);
  host.logDebug("room", "ok", `USERBADGE user=${userId} badge=${badge || "none"}`);
  return true;
}

export function handleRegistrationNameRejectedRuntime(
  host: HabboBridgePacketRuntimeHost,
  release: string,
  messageKey: string,
  id: string,
  clearName: boolean
): void {
  const registrationInterface = host.objectManager.getObject("#registration_interface");
  registrationInterface?.set("nameChecked", 0);
  if (String(registrationInterface?.get("openWindow") ?? "") === "reg_loading.window") {
    host.changeRegistrationWindowView("reg_namepage.window", release);
  }
  if (clearName) {
    host.clearRegistrationNameField();
  }
  host.showRegistrationAlert(release, messageKey, id, "");
  host.logDebug("registration", "warn", `name rejected id=${id}`);
}

export function handleServerErrorPacketRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string
): boolean {
  if (body.includes("login incorrect")) {
    host.objectManager.getObject("#login_component")?.set("okToLogin", 0);
    host.showLoginWindowPair(release);
    return host.showAlert({
      msg: "Alert_WrongNameOrPassword",
      id: "loginincorrect",
      modal: 1
    }, release);
  }

  if (body.includes("mod_warn")) {
    return host.showModeratorAlert(body, release, "error");
  }

  if (body.includes("Version not correct")) {
    return host.showAlert({
      msg: "Old client version!!!",
      id: "oldclient",
      modal: 1
    }, release);
  }

  host.showAlert({
    title: "win_error",
    msg: body || "Server error",
    id: "servererror",
    modal: 1
  }, release);
  return true;
}

export function showModeratorAlertRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string,
  source: "error" | "modalert"
): boolean {
  return host.showAlert({
    title: source === "error" ? "alert_warning" : "alert_moderator_warning",
    msg: source === "error" ? normalizeModeratorErrorMessage(body) : normalizeModeratorAlertMessage(body),
    id: "mod_warn",
    modal: 1
  }, release);
}

export function handleSystemBroadcastPacketRuntime(
  host: HabboBridgePacketRuntimeHost,
  body: string,
  release: string
): boolean {
  const message = normalizeSystemBroadcastMessage(body);
  host.movie.setProperty("lastSystemBroadcast", {
    message,
    raw: body,
    source: `extracted/projectorrays/${release}/hh_shared/casts/External/ParentScript 5 - Login Handler Class.ls`
  });
  host.movie.setProperty("keyboardFocusSprite", 0);
  return host.showAlert({
    msg: message,
    id: "systembroadcast"
  }, release);
}

export function loginUserObjectHandlerSource(release: string): string {
  const source = release.startsWith("release14")
    ? "hh_entry/casts/External/ParentScript 8 - Login Handler Class.ls"
    : "hh_shared/casts/External/ParentScript 5 - Login Handler Class.ls";
  return `extracted/projectorrays/${release}/${source}`;
}

function parseUserObjectFields(body: string, release?: string): Record<string, string> {
  if (release?.startsWith("release14")) {
    const parsed = parseRelease14UserObjectFields(body);
    if (parsed) {
      return parsed;
    }
  }

  const fields: Record<string, string> = {};
  for (const line of body.split(/\r?\n|\r/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    fields[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return fields;
}

function parseRelease14UserObjectFields(body: string): Record<string, string> | undefined {
  if (!body.includes("\u0002")) {
    return undefined;
  }

  const reader = new HabboPacketBodyReader(body);
  const fields: Record<string, string> = {
    user_id: reader.readString(),
    name: reader.readString(),
    figure: reader.readString(),
    sex: reader.readString(),
    customData: reader.readString(),
    ph_tickets: String(reader.readInt()),
    ph_figure: reader.readString(),
    photo_film: String(reader.readInt()),
    directMail: String(reader.readInt())
  };

  return fields.user_id || fields.name || fields.figure ? fields : undefined;
}

function stringFromSession(session: { get(key: string): unknown } | undefined, key: string): string {
  const value = session?.get(key);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}



