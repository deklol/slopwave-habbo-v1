import { coerceRecord } from "../../HabboSourceValueHelpers";
import { type HabboRoomObjectRecord } from "../../room/HabboRoomObjectData";
import {
  parseRoomDoorFlatPacket,
  parseRoomTeleporterActivityPacket,
  resolveTeleporterActivation,
  roomDoorFlatPacketIsValid
} from "../../room/HabboRoomTeleporter";
import { resolveRoomObjectSourceTimedState } from "../../ui/HabboRoomObjectInteractions";
import { startRoomObjectSourceAnimation } from "./HabboRoomObjectAnimationRuntime";
import { roomHandlerClassSource } from "./HabboRoomObjectSources";
import type { HabboRoomObjectRuntimeHost } from "./HabboRoomObjectRuntimeHost";

export function handleRoomDoorFlatPacket(host: HabboRoomObjectRuntimeHost, body: string, release: string): boolean {
  const currentDoorId = String(host.movie.getProperty("currentRoomDoorId") ?? "").trim();
  const packet = parseRoomDoorFlatPacket(body, currentDoorId);
  host.movie.setProperty("lastRoomDoorFlat", packet);

  if (!roomDoorFlatPacketIsValid(packet)) {
    host.recordUnsupportedOnce("room-doorflat-unparsed", {
      subsystem: "habbo",
      feature: "room-doorflat-unparsed",
      detail: `${release} Room Handler Class handle_doorflat expects target teleporter id and flat id, but the runtime could not parse both VL64 ints`,
      source: `extracted/projectorrays/${release}/${roomHandlerClassSource}`
    });
    host.logDebug("room", "warn", `DOORFLAT unparsed body=${body.trim()}`);
    return false;
  }

  if (currentDoorId) {
    host.queueRoomRequest({ command: "DOORGOIN", objectId: currentDoorId }, release);
  }
  host.queueRoomRequest({ command: "GOVIADOOR", body: `${packet.targetFlatId}/${packet.targetTeleporterId}` }, release);
  host.logDebug("room", "ok", `DOORFLAT targetDoor=${packet.targetTeleporterId} targetFlat=${packet.targetFlatId}`);
  return true;
}

export function handleRoomTeleporterActivityPacket(
  host: HabboRoomObjectRuntimeHost,
  packetName: string,
  body: string,
  release: string
): boolean {
  const packet = parseRoomTeleporterActivityPacket(body);
  const component = host.objectManager.getObject("#room_component");
  const activeObjects = { ...(coerceRecord(component?.get("activeObjects")) as Record<string, HabboRoomObjectRecord>) };
  const object = packet.objectId ? activeObjects[packet.objectId] ?? Object.values(activeObjects).find((candidate) => candidate.id === packet.objectId) : undefined;
  let sourceClassName = "";
  let sourcePath = "";
  if (object) {
    const sourceClassValue = host.getRoomObjectSourceClassValue(object.className);
    const animation = startRoomObjectSourceAnimation(host, object, packetName, sourceClassValue);
    const timedState = resolveRoomObjectSourceTimedState(object, sourceClassValue);
    sourceClassName = animation?.sourceClassName ?? timedState?.sourceClassName ?? "";
    sourcePath = animation?.sourcePath ?? timedState?.sourcePath ?? "";
    if (animation) {
      host.renderRoomObjects(release);
    }
  }
  host.movie.setProperty("lastRoomTeleporterPacket", {
    name: packetName,
    body,
    objectId: packet.objectId,
    userName: packet.userName,
    className: packet.className,
    found: object !== undefined,
    sourceClassName,
    sourcePath
  });
  host.logDebug("room", "ok", `${packetName} body=${body.trim()}`);
  return true;
}

export function activateTeleporterObject(
  host: HabboRoomObjectRuntimeHost,
  object: HabboRoomObjectRecord,
  useTile: { readonly x: number; readonly y: number } | undefined,
  release: string,
  sourceClassName: string,
  sourcePath: string,
  stateKey: string | undefined,
  stateValue: string | undefined
): boolean {
  const activation = resolveTeleporterActivation({
    object,
    ownUser: host.getOwnRoomUser(),
    useTile,
    release,
    sourceClassName,
    sourcePath,
    stateKey,
    stateValue
  });
  if (!activation) {
    return false;
  }

  if (activation.kind === "missing-user-or-door") {
    host.recordUnsupportedOnce(activation.unsupportedKey, {
      subsystem: "habbo",
      feature: "teleporter-own-user-missing",
      detail: activation.detail,
      source: activation.source
    });
    return false;
  }

  if (activation.kind === "move-to-use-tile") {
    host.queueRoomRequest(activation.request, release);
    host.movie.setProperty("lastRoomObjectProgramAction", activation.lastAction);
    host.logDebug("room", "info", activation.logMessage);
    return true;
  }

  for (const request of activation.requests) {
    host.queueRoomRequest(request, release);
  }
  if (activation.unsupported) {
    host.recordUnsupportedOnce(activation.unsupported.key, {
      subsystem: "habbo",
      feature: "teleporter-state-key-unparsed",
      detail: activation.unsupported.detail,
      source: activation.unsupported.source
    });
  }
  host.objectManager.getObject("#session")?.set("current_door_ID", activation.sessionDoorId);
  host.movie.setProperty("currentRoomDoorId", activation.sessionDoorId);
  if (activation.stateKey) {
    host.movie.setProperty("currentRoomDoorStateKey", activation.stateKey);
  }
  if (activation.stateValue !== undefined) {
    host.movie.setProperty("currentRoomDoorStateOpenValue", activation.stateValue);
  }
  host.movie.setProperty("lastRoomObjectProgramAction", {
    ...activation.lastAction
  });
  host.logDebug("room", "info", activation.logMessage);
  return true;
}
