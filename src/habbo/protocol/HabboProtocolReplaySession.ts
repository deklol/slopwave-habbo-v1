import type { HabboVersionAdapter } from "../HabboVersionAdapter";
import { encodeHabboLoginRequest, type HabboLoginCredentials } from "./HabboLoginPacketCodec";
import { ProtocolReplayTransport } from "./ProtocolReplayTransport";

export class HabboProtocolReplaySession {
  constructor(
    readonly adapter: HabboVersionAdapter,
    readonly transport: ProtocolReplayTransport
  ) {
    if (adapter.id !== transport.fixture.adapterId) {
      throw new Error(`Adapter ${adapter.id} does not match replay fixture ${transport.fixture.adapterId}`);
    }
  }

  sendLogin(credentials: HabboLoginCredentials): readonly Uint8Array[] {
    return this.transport.send(encodeHabboLoginRequest(this.adapter, credentials)).inbound;
  }

  assertComplete(): void {
    this.transport.assertComplete();
  }
}
