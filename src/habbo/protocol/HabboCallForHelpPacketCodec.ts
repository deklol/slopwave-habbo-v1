import type { HabboVersionAdapter } from "../HabboVersionAdapter";
import { Base64Vl64PacketWriter } from "./Base64Vl64PacketCodec";

export interface HabboCallForHelpRequest {
  readonly message: string;
  readonly roomType: 0 | 1;
  readonly markerOrCasts: string;
  readonly roomName: string;
  readonly roomId: string;
  readonly roomOwner?: string;
  readonly roomPort?: number;
  readonly roomDoor?: number;
}

export function encodeHabboCallForHelpRequest(adapter: HabboVersionAdapter, request: HabboCallForHelpRequest): Uint8Array {
  switch (adapter.protocol.kind) {
    case "base64-vl64":
    case "base64-vl64-mus":
      return encodeBase64Vl64CallForHelpRequest(adapter, request);
    default:
      throw new Error(`No call-for-help packet encoder for protocol ${adapter.protocol.kind}`);
  }
}

function encodeBase64Vl64CallForHelpRequest(adapter: HabboVersionAdapter, request: HabboCallForHelpRequest): Uint8Array {
  const callForHelpHeader = adapter.protocol.commandIds?.["CRYFORHELP"];
  if (callForHelpHeader === undefined) {
    throw new Error(`${adapter.id} does not define a CRYFORHELP command id`);
  }

  const writer = new Base64Vl64PacketWriter(callForHelpHeader)
    .writeString(request.message)
    .writeInt(request.roomType)
    .writeString(request.markerOrCasts)
    .writeString(request.roomName);

  if (request.roomType === 0) {
    return writer
      .writeString(request.roomId)
      .writeInt(Math.trunc(request.roomPort ?? 0))
      .writeInt(Math.trunc(request.roomDoor ?? 0))
      .toClientRequest();
  }

  return writer
    .writeInt(Math.trunc(Number.parseInt(request.roomId, 10) || 0))
    .writeString(request.roomOwner ?? "")
    .toClientRequest();
}
