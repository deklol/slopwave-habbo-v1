import type { DirectorDebugLog } from "./DirectorDebugLog";

export type DirectorNetStatus = "loading" | "complete" | "error";

export interface DirectorNetStream {
  readonly id: number;
  readonly url: string;
  status: DirectorNetStatus;
  bytesLoaded?: number;
  bytesTotal?: number;
  memberName?: string;
  memberType?: string;
  priority?: number;
}

export interface DirectorPreloadOptions {
  readonly status?: DirectorNetStatus;
  readonly bytesLoaded?: number;
  readonly bytesTotal?: number;
}

export interface DirectorQueuedDownloadOptions extends DirectorPreloadOptions {
  readonly memberName: string;
  readonly memberType: string;
  readonly priority?: number;
}

export class DirectorNetManager {
  private nextId = 1;
  private readonly streamList: DirectorNetStream[] = [];

  constructor(private readonly debugLog?: DirectorDebugLog) {}

  get streams(): readonly DirectorNetStream[] {
    return this.streamList;
  }

  preloadNetThing(url: string, options: DirectorPreloadOptions = {}): DirectorNetStream {
    if (url.trim().length === 0) {
      throw new Error("preloadNetThing url cannot be empty");
    }

    const stream: DirectorNetStream = {
      id: this.nextId++,
      url,
      status: options.status ?? "complete",
      ...(options.bytesLoaded === undefined ? {} : { bytesLoaded: options.bytesLoaded }),
      ...(options.bytesTotal === undefined ? {} : { bytesTotal: options.bytesTotal })
    };
    this.streamList.push(stream);
    this.debugLog?.add("network", stream.status === "error" ? "error" : stream.status === "complete" ? "ok" : "info", `preloadNetThing id=${stream.id} status=${stream.status} url=${stream.url}`, {
      id: stream.id,
      url: stream.url,
      status: stream.status,
      bytesLoaded: stream.bytesLoaded,
      bytesTotal: stream.bytesTotal
    });
    return stream;
  }

  queueDownload(url: string, options: DirectorQueuedDownloadOptions): DirectorNetStream {
    if (options.memberName.trim().length === 0) {
      throw new Error("queueDownload memberName cannot be empty");
    }

    if (options.memberType.trim().length === 0) {
      throw new Error("queueDownload memberType cannot be empty");
    }

    const stream = this.preloadNetThing(url, {
      status: options.status ?? "loading",
      ...(options.bytesLoaded === undefined ? {} : { bytesLoaded: options.bytesLoaded }),
      ...(options.bytesTotal === undefined ? {} : { bytesTotal: options.bytesTotal })
    });
    stream.memberName = options.memberName;
    stream.memberType = options.memberType;
    if (options.priority !== undefined) {
      stream.priority = options.priority;
    }
    this.debugLog?.add("download", stream.status === "error" ? "error" : "info", `queueDownload id=${stream.id} member=${stream.memberName} type=${stream.memberType} status=${stream.status}`, {
      id: stream.id,
      url: stream.url,
      memberName: stream.memberName,
      memberType: stream.memberType,
      priority: stream.priority,
      status: stream.status
    });
    return stream;
  }

  netDone(): boolean {
    return this.streamList.every((stream) => stream.status === "complete");
  }

  getStreamStatus(url: string): DirectorNetStatus | undefined {
    return [...this.streamList].reverse().find((stream) => stream.url === url)?.status;
  }

  setStreamStatus(url: string, status: DirectorNetStatus): boolean {
    const stream = [...this.streamList].reverse().find((candidate) => candidate.url === url);
    if (!stream) {
      return false;
    }

    stream.status = status;
    this.debugLog?.add("network", status === "error" ? "error" : status === "complete" ? "ok" : "info", `setStreamStatus status=${status} url=${url}`, {
      id: stream.id,
      url,
      status
    });
    return true;
  }
}
