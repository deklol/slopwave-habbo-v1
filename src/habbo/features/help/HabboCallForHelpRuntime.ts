import type { UnsupportedFeature } from "../../../runtime";
import type { HabboVariableObject } from "../../boot/HabboBootManagers";
import {
  replaceChars,
  replaceChunks
} from "../../HabboSourceValueHelpers";
import {
  readCallForHelpRequests,
  readRoomDataStruct,
  type HabboCallForHelpRequest
} from "../../room/HabboRoomData";

const hobbaComponentClassSource = "extracted/projectorrays/release7_20050729_2/hh_shared/casts/External/ParentScript 9 - Hobba Component Class.ls";

export interface HabboCallForHelpRuntimeHost {
  readonly movie: {
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
  readonly objectManager: {
    getObject(id: string): HabboVariableObject | undefined;
  };

  allocateCallForHelpRequestId(): number;
  convertSpecialChars(value: string, direction?: number): string;
  logDebug(channel: string, level: "info" | "ok" | "warn" | "error", message: string, data?: unknown): void;
  recordUnsupportedOnce(key: string, entry: UnsupportedFeature): void;
}

export function queueCallForHelpRequestRuntime(
  host: HabboCallForHelpRuntimeHost,
  request: Omit<HabboCallForHelpRequest, "id" | "status" | "command">,
  release: string
): HabboCallForHelpRequest {
  const queued = readCallForHelpRequests(host.movie.getProperty("pendingCallForHelpRequests"));
  const nextRequest: HabboCallForHelpRequest = {
    id: host.allocateCallForHelpRequestId(),
    command: "CRYFORHELP",
    status: "pending",
    ...request
  };
  host.movie.setProperty("pendingCallForHelpRequests", [...queued, nextRequest]);
  host.movie.setProperty("lastCallForHelpRequest", {
    ...nextRequest,
    source: hobbaComponentClassSource
  });
  host.logDebug("dialog", "info", `queued CRYFORHELP room=${nextRequest.roomId} type=${nextRequest.roomType} length=${nextRequest.message.length}`, {
    request: nextRequest,
    release
  });
  return nextRequest;
}

export function sendCallForHelpRuntime(host: HabboCallForHelpRuntimeHost, argument: unknown, release: string): boolean {
  const rawMessage = String(argument ?? "");
  const message = host.convertSpecialChars(
    replaceChunks(replaceChars(rawMessage, "/", " "), "\r", "<br>"),
    1
  );
  const session = host.objectManager.getObject("#session");
  const lastRoom = readRoomDataStruct(session?.get("lastroom"));
  if (!lastRoom) {
    host.movie.setProperty("lastCallForHelpRequest", {
      message,
      status: "unavailable",
      source: hobbaComponentClassSource
    });
    host.logDebug("dialog", "warn", `sendCallForHelp unavailable length=${message.length}`);
    return false;
  }

  const request = lastRoom.type === "private"
    ? {
        message,
        roomType: 1 as const,
        markerOrCasts: lastRoom.marker ?? "",
        roomName: lastRoom.name,
        roomId: lastRoom.id,
        roomOwner: lastRoom.owner ?? "",
        room: lastRoom
      }
    : {
        message,
        roomType: 0 as const,
        markerOrCasts: lastRoom.casts.join(","),
        roomName: lastRoom.name,
        roomId: lastRoom.id,
        roomPort: lastRoom.port ?? 0,
        roomDoor: Math.trunc(Number(lastRoom.door ?? 0) || 0),
        room: lastRoom
      };
  queueCallForHelpRequestRuntime(host, request, release);
  host.logDebug("dialog", "info", `sendCallForHelp length=${message.length}`);
  return true;
}
