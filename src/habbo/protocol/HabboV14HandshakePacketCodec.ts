import type { HabboVersionAdapter } from "../HabboVersionAdapter";
import { Base64Vl64PacketWriter } from "./Base64Vl64PacketCodec";

export type HabboV14HandshakeCommand =
  | "INIT_CRYPTO"
  | "GENERATEKEY"
  | "PONG";

export function encodeHabboV14HandshakeCommand(
  adapter: HabboVersionAdapter,
  command: HabboV14HandshakeCommand
): Uint8Array {
  if (adapter.id !== "release14") {
    throw new Error(`v14 handshake command ${command} cannot be encoded for ${adapter.id}`);
  }

  const header = adapter.protocol.commandIds?.[command];
  if (header === undefined) {
    throw new Error(`${adapter.id} does not define ${command}`);
  }

  return new Base64Vl64PacketWriter(header).toClientRequest();
}
