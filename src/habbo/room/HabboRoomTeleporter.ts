import { HabboPacketBodyReader } from "../protocol";
import { roomObjectBaseDirection } from "../ui/HabboRoomObjectInteractions";
import type { HabboRoomObjectRecord } from "./HabboRoomObjectData";

export interface HabboRoomDoorFlatPacket {
  readonly body: string;
  readonly targetTeleporterId: number;
  readonly targetFlatId: number;
  readonly currentDoorId: string;
}

export interface HabboRoomTeleporterActivityPacket {
  readonly objectId: string;
  readonly userName: string;
  readonly className: string;
}

export type HabboRoomTeleporterActivation =
  | {
      readonly kind: "missing-user-or-door";
      readonly unsupportedKey: string;
      readonly detail: string;
      readonly source: string;
    }
  | {
      readonly kind: "move-to-use-tile";
      readonly request: { readonly command: "MOVE"; readonly x: number; readonly y: number };
      readonly lastAction: Record<string, unknown>;
      readonly logMessage: string;
    }
  | {
      readonly kind: "use-door";
      readonly requests: readonly (
        | { readonly command: "SETSTUFFDATA"; readonly objectId: string; readonly key: string; readonly value: string }
        | { readonly command: "INTODOOR"; readonly objectId: string }
        | { readonly command: "GETDOORFLAT"; readonly objectId: string }
      )[];
      readonly unsupported?: {
        readonly key: string;
        readonly detail: string;
        readonly source: string;
      };
      readonly sessionDoorId: string;
      readonly stateKey?: string;
      readonly stateValue?: string;
      readonly lastAction: Record<string, unknown>;
      readonly logMessage: string;
    };

export function parseRoomDoorFlatPacket(body: string, currentDoorId: string): HabboRoomDoorFlatPacket {
  const reader = new HabboPacketBodyReader(body);
  return {
    body,
    targetTeleporterId: reader.readInt(),
    targetFlatId: reader.readInt(),
    currentDoorId
  };
}

export function roomDoorFlatPacketIsValid(packet: HabboRoomDoorFlatPacket): boolean {
  return Number.isFinite(packet.targetTeleporterId)
    && packet.targetTeleporterId > 0
    && Number.isFinite(packet.targetFlatId)
    && packet.targetFlatId > 0;
}

export function parseRoomTeleporterActivityPacket(body: string): HabboRoomTeleporterActivityPacket {
  const [objectId = "", userName = "", className = ""] = body.trim().split("/");
  return { objectId, userName, className };
}

export function resolveTeleporterActivation(input: {
  readonly object: HabboRoomObjectRecord;
  readonly ownUser: { readonly x?: number; readonly y?: number } | undefined;
  readonly useTile: { readonly x: number; readonly y: number } | undefined;
  readonly release: string;
  readonly sourceClassName: string;
  readonly sourcePath: string;
  readonly stateKey: string | undefined;
  readonly stateValue: string | undefined;
}): HabboRoomTeleporterActivation | undefined {
  if (
    !input.ownUser
    || input.ownUser.x === undefined
    || input.ownUser.y === undefined
    || input.object.x === undefined
    || input.object.y === undefined
  ) {
    return {
      kind: "missing-user-or-door",
      unsupportedKey: `teleporter-own-user-missing:${input.object.id}`,
      detail: `${input.release} ${input.sourceClassName}.select needs the own user and door tile before MOVE/INTODOOR/GETDOORFLAT can be sent`,
      source: input.sourcePath
    };
  }

  const atDoor = input.ownUser.x === input.object.x && input.ownUser.y === input.object.y;
  const adjacent = input.useTile !== undefined && input.ownUser.x === input.useTile.x && input.ownUser.y === input.useTile.y;
  if (!atDoor && !adjacent) {
    if (!input.useTile) {
      return undefined;
    }
    return {
      kind: "move-to-use-tile",
      request: { command: "MOVE", x: input.useTile.x, y: input.useTile.y },
      lastAction: {
        action: "teleporter-move",
        objectId: input.object.id,
        className: input.object.className,
        moveTo: input.useTile,
        direction: roomObjectBaseDirection(input.object),
        source: input.sourcePath
      },
      logMessage: `teleporter move id=${input.object.id} x=${input.useTile.x} y=${input.useTile.y}`
    };
  }

  const requests: Array<
    | { readonly command: "SETSTUFFDATA"; readonly objectId: string; readonly key: string; readonly value: string }
    | { readonly command: "INTODOOR"; readonly objectId: string }
    | { readonly command: "GETDOORFLAT"; readonly objectId: string }
  > = [];
  let unsupported: { readonly key: string; readonly detail: string; readonly source: string } | undefined;
  if (adjacent) {
    if (input.stateKey && input.stateValue !== undefined) {
      requests.push({ command: "SETSTUFFDATA", objectId: input.object.id, key: input.stateKey, value: input.stateValue });
    } else {
      unsupported = {
        key: `teleporter-state-key-unparsed:${input.sourceClassName}`,
        detail: `${input.release} ${input.sourceClassName}.select starts door traversal, but the runtime could not parse its SETSTUFFDATA state key/value from extracted Lingo`,
        source: input.sourcePath
      };
    }
    requests.push({ command: "INTODOOR", objectId: input.object.id });
  }
  requests.push({ command: "GETDOORFLAT", objectId: input.object.id });

  return {
    kind: "use-door",
    requests,
    ...(unsupported ? { unsupported } : {}),
    sessionDoorId: input.object.id,
    ...(input.stateKey ? { stateKey: input.stateKey } : {}),
    ...(input.stateValue !== undefined ? { stateValue: input.stateValue } : {}),
    lastAction: {
      action: adjacent ? "teleporter-enter" : "teleporter-try-door",
      objectId: input.object.id,
      className: input.object.className,
      user: { x: input.ownUser.x, y: input.ownUser.y },
      stateKey: input.stateKey,
      stateValue: input.stateValue,
      direction: roomObjectBaseDirection(input.object),
      source: input.sourcePath
    },
    logMessage: `teleporter use id=${input.object.id} adjacent=${adjacent}`
  };
}
