import type { HabboVersionAdapter } from "../HabboVersionAdapter";
import { Base64Vl64PacketWriter } from "./Base64Vl64PacketCodec";
import { encodeV1TextClientPacket } from "./V1TextPacketCodec";

export type HabboLoginCredentials =
  | {
      readonly username: string;
      readonly password: string;
      readonly ssoTicket?: never;
    }
  | {
      readonly ssoTicket: string;
      readonly username?: never;
      readonly password?: never;
    };

export function encodeHabboLoginRequest(adapter: HabboVersionAdapter, credentials: HabboLoginCredentials): Uint8Array {
  switch (adapter.protocol.kind) {
    case "v1-text-length":
      return encodeV1LoginRequest(credentials);
    case "base64-vl64":
    case "base64-vl64-mus":
      return encodeBase64Vl64LoginRequest(adapter, credentials);
    default:
      throw new Error(`No login packet encoder for protocol ${adapter.protocol.kind}`);
  }
}

function encodeV1LoginRequest(credentials: HabboLoginCredentials): Uint8Array {
  if ("ssoTicket" in credentials) {
    throw new Error("v1 text login does not support SSO tickets");
  }

  return encodeV1TextClientPacket("LOGIN", [credentials.username, credentials.password]);
}

function encodeBase64Vl64LoginRequest(adapter: HabboVersionAdapter, credentials: HabboLoginCredentials): Uint8Array {
  if ("ssoTicket" in credentials) {
    const ssoHeader = adapter.protocol.commandIds?.["SSO"];
    if (ssoHeader === undefined) {
      throw new Error(`${adapter.id} does not define an SSO command id`);
    }

    return new Base64Vl64PacketWriter(ssoHeader).writeString(credentials.ssoTicket).toClientRequest();
  }

  const tryLoginHeader = adapter.protocol.commandIds?.["TRY_LOGIN"];
  if (tryLoginHeader === undefined) {
    throw new Error(`${adapter.id} does not define a TRY_LOGIN command id`);
  }

  return new Base64Vl64PacketWriter(tryLoginHeader)
    .writeString(credentials.username)
    .writeString(credentials.password)
    .toClientRequest();
}
