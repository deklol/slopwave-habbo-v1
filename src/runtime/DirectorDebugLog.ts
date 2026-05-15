export type DirectorDebugLogLevel = "info" | "ok" | "warn" | "error";

export interface DirectorDebugLogEntry {
  readonly sequence: number;
  readonly timestamp: number;
  readonly channel: string;
  readonly level: DirectorDebugLogLevel;
  readonly message: string;
  readonly data?: unknown;
}

export interface DirectorDebugLogOptions {
  readonly maxEntries?: number;
  readonly now?: () => number;
}

export class DirectorDebugLog {
  private readonly entries: DirectorDebugLogEntry[] = [];
  private readonly maxEntries: number;
  private readonly now: () => number;
  private nextSequence = 1;

  constructor(options: DirectorDebugLogOptions = {}) {
    this.maxEntries = Math.max(1, Math.trunc(options.maxEntries ?? 500));
    this.now = options.now ?? Date.now;
  }

  add(channel: string, level: DirectorDebugLogLevel, message: string, data?: unknown): DirectorDebugLogEntry {
    const entry: DirectorDebugLogEntry = {
      sequence: this.nextSequence++,
      timestamp: this.now(),
      channel,
      level,
      message,
      ...(data === undefined ? {} : { data })
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  list(limit?: number): readonly DirectorDebugLogEntry[] {
    if (limit === undefined || limit >= this.entries.length) {
      return [...this.entries];
    }
    return this.entries.slice(Math.max(0, this.entries.length - Math.max(0, Math.trunc(limit))));
  }

  clear(): void {
    this.entries.length = 0;
  }
}
