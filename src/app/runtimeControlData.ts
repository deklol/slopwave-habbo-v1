export interface RareCatalogueOption {
  readonly id: string;
  readonly label: string;
  readonly pageId: string;
  readonly source: string;
}

// The V1 portable package does not ship the multi-version rare-page shortcuts
// from the development workspace. V1 catalogue editing is handled by
// app/dist/habbo-config/catalogue/release1.json.
const rareCatalogueOptionsByAdapter: Readonly<Record<string, readonly RareCatalogueOption[]>> = {
  release1: []
};

export function rareCatalogueOptionsForAdapter(adapterId: string): readonly RareCatalogueOption[] {
  return rareCatalogueOptionsByAdapter[adapterId] ?? [];
}

export function normalizeRareCatalogueOption(adapterId: string, optionId: string | undefined): RareCatalogueOption | undefined {
  const options = rareCatalogueOptionsForAdapter(adapterId);
  return options.find((option) => option.id === optionId) ?? options[0];
}

export interface RuntimeMemorySnapshot {
  readonly supported: boolean;
  readonly usedText: string;
  readonly totalText: string;
  readonly limitText: string;
}

export function readRuntimeMemorySnapshot(): RuntimeMemorySnapshot {
  const memory = (performance as Performance & {
    readonly memory?: {
      readonly usedJSHeapSize?: number;
      readonly totalJSHeapSize?: number;
      readonly jsHeapSizeLimit?: number;
    };
  }).memory;

  if (!memory) {
    return {
      supported: false,
      usedText: "n/a",
      totalText: "n/a",
      limitText: "n/a"
    };
  }

  return {
    supported: true,
    usedText: formatBytes(memory.usedJSHeapSize),
    totalText: formatBytes(memory.totalJSHeapSize),
    limitText: formatBytes(memory.jsHeapSizeLimit)
  };
}

export function formatMetricNumber(value: number | undefined, suffix: string): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(value >= 100 ? 0 : 1)}${suffix}` : "n/a";
}

function formatBytes(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "n/a";
  }

  const mib = value / 1024 / 1024;
  return `${mib.toFixed(mib >= 100 ? 0 : 1)} MB`;
}
