import type { HabboVersionId } from "../HabboVersionAdapter";
import { bytesFrom, fromLatin1Bytes, toLatin1Bytes, type ByteInput } from "./latin1";

export type ProtocolFixtureSourceKind = "reference-derived" | "captured";
export type ProtocolPayloadEncoding = "latin1";

export interface ProtocolPayloadFixture {
  readonly encoding: ProtocolPayloadEncoding;
  readonly text: string;
}

export interface ProtocolReplayStepFixture {
  readonly id: string;
  readonly outbound: ProtocolPayloadFixture;
  readonly inbound?: readonly ProtocolPayloadFixture[];
}

export interface ProtocolReplayFixture {
  readonly id: string;
  readonly adapterId: HabboVersionId;
  readonly sourceKind: ProtocolFixtureSourceKind;
  readonly source: string;
  readonly steps: readonly ProtocolReplayStepFixture[];
}

export interface ProtocolReplaySendResult {
  readonly stepId: string;
  readonly inbound: readonly Uint8Array[];
}

export class ProtocolReplayTransport {
  private cursor = 0;
  private readonly sentPayloads: Uint8Array[] = [];

  constructor(readonly fixture: ProtocolReplayFixture) {
    if (fixture.steps.length === 0) {
      throw new Error(`Replay fixture ${fixture.id} has no steps`);
    }
  }

  get complete(): boolean {
    return this.cursor === this.fixture.steps.length;
  }

  get sent(): readonly Uint8Array[] {
    return [...this.sentPayloads];
  }

  send(payload: ByteInput): ProtocolReplaySendResult {
    const step = this.fixture.steps[this.cursor];
    if (!step) {
      throw new Error(`Replay fixture ${this.fixture.id} has no step ${this.cursor + 1}`);
    }

    const actual = bytesFrom(payload);
    const expected = payloadFixtureToBytes(step.outbound);

    if (!sameBytes(actual, expected)) {
      throw new Error(
        `Replay step ${step.id} expected ${formatBytes(expected)} but received ${formatBytes(actual)}`
      );
    }

    this.sentPayloads.push(actual);
    this.cursor++;

    return {
      stepId: step.id,
      inbound: (step.inbound ?? []).map(payloadFixtureToBytes)
    };
  }

  assertComplete(): void {
    if (!this.complete) {
      const remaining = this.fixture.steps.slice(this.cursor).map((step) => step.id).join(", ");
      throw new Error(`Replay fixture ${this.fixture.id} has unplayed steps: ${remaining}`);
    }
  }
}

export function payloadFixtureToBytes(payload: ProtocolPayloadFixture): Uint8Array {
  switch (payload.encoding) {
    case "latin1":
      return toLatin1Bytes(payload.text);
    default:
      return assertNever(payload.encoding);
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((byte, index) => byte === right[index]);
}

function formatBytes(bytes: Uint8Array): string {
  const text = fromLatin1Bytes(bytes)
    .replaceAll("\u0001", "{1}")
    .replaceAll("\u0002", "{2}")
    .replaceAll("\r", "{13}");
  return `"${text}" [${[...bytes].join(", ")}]`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported protocol payload encoding: ${value}`);
}
