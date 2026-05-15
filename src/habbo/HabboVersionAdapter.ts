import type { DirectorMovieManifest } from "../runtime";

export type HabboVersionId =
  | "release1"
  | "release5"
  | "release6"
  | "release7"
  | "release8"
  | "release9"
  | "release10"
  | "release11"
  | "release12"
  | "release13"
  | "release14";

export type HabboProtocolKind =
  | "v1-text-length"
  | "fuse-text"
  | "base64-vl64"
  | "base64-vl64-mus"
  | "unknown";

export type HabboLoginMode = "username-password" | "sso-ticket" | "mixed" | "unknown";

export interface HabboLoaderDescriptor {
  readonly entryMovie: string;
  readonly loaderParameters: readonly string[];
  readonly externalVariables: readonly string[];
  readonly castPathStrategy: string;
  readonly startupFlow: string;
}

export interface HabboProtocolDescriptor {
  readonly kind: HabboProtocolKind;
  readonly primaryReference: string;
  readonly loginMode: HabboLoginMode;
  readonly loginCommands: readonly string[];
  readonly commandIds?: Readonly<Record<string, number>>;
  readonly framing: string;
  readonly browserTransport: "bridge-required" | "replay-only" | "unknown";
  readonly bridge?: {
    readonly defaultWebSocketPort: number;
    readonly upstreamTcpPort?: number;
    readonly upstreamTcpHost?: string;
    readonly source: string;
  };
  readonly mus?: {
    readonly required: boolean;
    readonly purpose: string;
    readonly framing: string;
  };
}

export interface HabboVersionAdapter {
  readonly id: HabboVersionId;
  readonly label: string;
  readonly releaseBand: string;
  readonly sourceEvidence: readonly string[];
  readonly loader: HabboLoaderDescriptor;
  readonly protocol: HabboProtocolDescriptor;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly unsupported: readonly string[];

  createManifest(): DirectorMovieManifest;
}
