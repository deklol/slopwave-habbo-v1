export interface UnsupportedFeature {
  subsystem: "director" | "lingo" | "renderer" | "xtra" | "habbo" | "network";
  feature: string;
  detail?: string;
  source?: string;
}

export class UnsupportedFeatureRegistry {
  private readonly entries: UnsupportedFeature[] = [];

  add(entry: UnsupportedFeature): void {
    const exists = this.entries.some((candidate) => (
      candidate.subsystem === entry.subsystem
      && candidate.feature === entry.feature
      && candidate.detail === entry.detail
      && candidate.source === entry.source
    ));
    if (exists) {
      return;
    }

    this.entries.push(entry);
  }

  list(): readonly UnsupportedFeature[] {
    return this.entries;
  }

  has(feature: string): boolean {
    return this.entries.some((entry) => entry.feature === feature);
  }

  assertSupported(entry: UnsupportedFeature): never {
    this.add(entry);
    const suffix = entry.detail ? `: ${entry.detail}` : "";
    throw new Error(`Unsupported ${entry.subsystem} feature ${entry.feature}${suffix}`);
  }
}
