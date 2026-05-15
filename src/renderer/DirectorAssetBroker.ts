export type DirectorAssetRequestCategory =
  | "entry"
  | "figure-editor"
  | "avatar"
  | "room-user"
  | "room-object"
  | "catalogue"
  | "navigator/window"
  | "preload/warmup"
  | "unknown";

export type DirectorAssetRequestMode = "blocking" | "warmup";

export type DirectorAssetCacheResult = "memory" | "pending" | "network" | "failed";

export interface DirectorAssetRequestContext {
  readonly category: DirectorAssetRequestCategory;
  readonly logicalId: string;
  readonly resolvedPath: string;
  readonly release: string | undefined;
  readonly caller: string | undefined;
  readonly mode: DirectorAssetRequestMode;
}

export interface DirectorAssetRequestTrace {
  readonly category: DirectorAssetRequestCategory;
  readonly logicalId: string;
  readonly resolvedPath: string;
  readonly release: string | undefined;
  readonly caller: string | undefined;
  readonly mode: DirectorAssetRequestMode;
  readonly result: DirectorAssetCacheResult;
  readonly count: number;
}

export interface DirectorAssetRequestSummary {
  readonly totalRequests: number;
  readonly uniqueAssets: number;
  readonly networkLoads: number;
  readonly memoryHits: number;
  readonly pendingHits: number;
  readonly failures: number;
  readonly byCategory: Record<DirectorAssetRequestCategory, number>;
  readonly byCaller: Record<string, number>;
  readonly topAssets: readonly DirectorAssetRequestTrace[];
  readonly recent: readonly DirectorAssetRequestTrace[];
}

export type DirectorAssetBrokerImageFactory = () => HTMLImageElement;

interface AssetRequestCounters {
  category: DirectorAssetRequestCategory;
  logicalId: string;
  resolvedPath: string;
  release: string | undefined;
  caller: string | undefined;
  mode: DirectorAssetRequestMode;
  result: DirectorAssetCacheResult;
  count: number;
}

export class DirectorAssetBroker {
  private readonly pendingImages = new Map<string, Promise<HTMLImageElement>>();
  private readonly loadedImages = new Map<string, HTMLImageElement>();
  private readonly failedImages = new Set<string>();
  private readonly counters = new Map<string, AssetRequestCounters>();
  private readonly recent: DirectorAssetRequestTrace[] = [];

  private totalRequests = 0;
  private networkLoads = 0;
  private memoryHits = 0;
  private pendingHits = 0;
  private failures = 0;

  constructor(private readonly createImage: DirectorAssetBrokerImageFactory = defaultImageFactory) {}

  hasFailed(resolvedPath: string): boolean {
    return this.failedImages.has(resolvedPath);
  }

  hasLoadedImage(resolvedPath: string): boolean {
    return this.loadedImages.has(resolvedPath);
  }

  getLoadedImage(resolvedPath: string): HTMLImageElement | undefined {
    return this.loadedImages.get(resolvedPath);
  }

  markFailed(context: DirectorAssetRequestContext): void {
    this.failedImages.add(context.resolvedPath);
    this.record(context, "failed");
  }

  recordMemoryHit(context: DirectorAssetRequestContext): void {
    this.record(context, "memory");
  }

  recordPendingHit(context: DirectorAssetRequestContext): void {
    this.record(context, "pending");
  }

  async loadImageElement(context: DirectorAssetRequestContext): Promise<HTMLImageElement> {
    const resolved = this.resolveAsset(context);
    const loaded = this.loadedImages.get(resolved.resolvedPath);
    if (loaded) {
      this.record(resolved, "memory");
      return loaded;
    }

    const pending = this.pendingImages.get(resolved.resolvedPath);
    if (pending) {
      this.record(resolved, "pending");
      return pending;
    }

    this.record(resolved, "network");
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = this.createImage();
      image.onload = () => {
        this.loadedImages.set(resolved.resolvedPath, image);
        this.pendingImages.delete(resolved.resolvedPath);
        resolve(image);
      };
      image.onerror = () => {
        this.failedImages.add(resolved.resolvedPath);
        this.pendingImages.delete(resolved.resolvedPath);
        this.record(resolved, "failed");
        reject(new Error(`Failed to load image ${resolved.resolvedPath}`));
      };
      image.src = resolved.resolvedPath;
    });
    this.pendingImages.set(resolved.resolvedPath, promise);
    return promise;
  }

  snapshot(): DirectorAssetRequestSummary {
    const byCategory = emptyCategoryCounts();
    const byCaller: Record<string, number> = {};
    for (const counter of this.counters.values()) {
      byCategory[counter.category] += counter.count;
      const caller = counter.caller ?? "unknown";
      byCaller[caller] = (byCaller[caller] ?? 0) + counter.count;
    }

    return {
      totalRequests: this.totalRequests,
      uniqueAssets: new Set([...this.counters.values()].map((counter) => counter.resolvedPath)).size,
      networkLoads: this.networkLoads,
      memoryHits: this.memoryHits,
      pendingHits: this.pendingHits,
      failures: this.failures,
      byCategory,
      byCaller,
      topAssets: [...this.counters.values()]
        .sort((left, right) => right.count - left.count)
        .slice(0, 12)
        .map(counterToTrace),
      recent: this.recent.slice(-20)
    };
  }

  private resolveAsset(context: DirectorAssetRequestContext): DirectorAssetRequestContext {
    const memoryPath = this.loadedImages.has(context.resolvedPath) ? context.resolvedPath : undefined;
    if (memoryPath) {
      return {
        ...context,
        resolvedPath: memoryPath
      };
    }

    return context;
  }

  private record(context: DirectorAssetRequestContext, result: DirectorAssetCacheResult): void {
    this.totalRequests += 1;
    if (result === "network") {
      this.networkLoads += 1;
    } else if (result === "memory") {
      this.memoryHits += 1;
    } else if (result === "pending") {
      this.pendingHits += 1;
    } else {
      this.failures += 1;
    }

    const key = `${result}\t${context.mode}\t${context.category}\t${context.release ?? ""}\t${context.caller ?? ""}\t${context.logicalId}\t${context.resolvedPath}`;
    const counter = this.counters.get(key);
    if (counter) {
      counter.count += 1;
    } else {
      this.counters.set(key, {
        category: context.category,
        logicalId: context.logicalId,
        resolvedPath: context.resolvedPath,
        release: context.release,
        caller: context.caller,
        mode: context.mode,
        result,
        count: 1
      });
    }

    this.recent.push({
      category: context.category,
      logicalId: context.logicalId,
      resolvedPath: context.resolvedPath,
      release: context.release,
      caller: context.caller,
      mode: context.mode,
      result,
      count: 1
    });
    if (this.recent.length > 40) {
      this.recent.splice(0, this.recent.length - 40);
    }
  }
}

function defaultImageFactory(): HTMLImageElement {
  if (typeof Image === "undefined") {
    throw new Error("HTML Image is not available in this runtime");
  }
  return new Image();
}

function emptyCategoryCounts(): Record<DirectorAssetRequestCategory, number> {
  return {
    entry: 0,
    "figure-editor": 0,
    avatar: 0,
    "room-user": 0,
    "room-object": 0,
    catalogue: 0,
    "navigator/window": 0,
    "preload/warmup": 0,
    unknown: 0
  };
}

function counterToTrace(counter: AssetRequestCounters): DirectorAssetRequestTrace {
  return {
    category: counter.category,
    logicalId: counter.logicalId,
    resolvedPath: counter.resolvedPath,
    release: counter.release,
    caller: counter.caller,
    mode: counter.mode,
    result: counter.result,
    count: counter.count
  };
}
