import type { DirectorMovieManifest } from "../../runtime";
import type {
  HabboLoaderDescriptor,
  HabboProtocolDescriptor,
  HabboVersionAdapter,
  HabboVersionId
} from "../HabboVersionAdapter";
import { createAdapterProbeManifest } from "./createAdapterProbeManifest";

export interface BaseHabboVersionAdapterOptions {
  readonly id: HabboVersionId;
  readonly label: string;
  readonly releaseBand: string;
  readonly accentColor: string;
  readonly sourceEvidence: readonly string[];
  readonly loader: HabboLoaderDescriptor;
  readonly protocol: HabboProtocolDescriptor;
  readonly featureFlags?: Readonly<Record<string, boolean>>;
  readonly unsupported?: readonly string[];
}

export abstract class BaseHabboVersionAdapter implements HabboVersionAdapter {
  readonly id: HabboVersionId;
  readonly label: string;
  readonly releaseBand: string;
  readonly sourceEvidence: readonly string[];
  readonly loader: HabboLoaderDescriptor;
  readonly protocol: HabboProtocolDescriptor;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly unsupported: readonly string[];
  private readonly accentColor: string;

  protected constructor(options: BaseHabboVersionAdapterOptions) {
    this.id = options.id;
    this.label = options.label;
    this.releaseBand = options.releaseBand;
    this.sourceEvidence = options.sourceEvidence;
    this.loader = options.loader;
    this.protocol = options.protocol;
    this.featureFlags = options.featureFlags ?? {};
    this.unsupported = options.unsupported ?? [];
    this.accentColor = options.accentColor;
  }

  createManifest(): DirectorMovieManifest {
    return createAdapterProbeManifest({
      id: this.id,
      label: this.label,
      releaseBand: this.releaseBand,
      accentColor: this.accentColor,
      protocolLabel: this.protocol.kind
    });
  }
}
