import { normalizeHandlerName, type LingoHandler, type LingoHandlerRegistration } from "../lingo";
import type { DirectorEventContext, DirectorEventRouter } from "./DirectorEventRouter";

export type DirectorScriptType = "movie" | "parent" | "behavior" | "cast" | "frame";

export interface DirectorScriptHandlerDefinition {
  readonly name: string;
  readonly handler: LingoHandler<DirectorEventContext>;
}

export interface DirectorScriptInstanceOptions {
  readonly id: string;
  readonly name: string;
  readonly type: DirectorScriptType;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly handlers?: readonly DirectorScriptHandlerDefinition[];
}

export interface DirectorScriptAttachmentOptions {
  readonly scope?: "movie" | "frame" | "sprite" | "member" | "score-behavior";
  readonly frameIndex?: number;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly channel?: number;
  readonly memberRef?: string;
  readonly handlerNames?: readonly string[];
}

export class DirectorScriptInstance {
  readonly id: string;
  readonly name: string;
  readonly type: DirectorScriptType;
  private readonly properties = new Map<string, unknown>();
  private readonly handlers = new Map<string, DirectorScriptHandlerDefinition>();

  constructor(options: DirectorScriptInstanceOptions) {
    if (options.id.trim().length === 0) {
      throw new Error("DirectorScriptInstance id cannot be empty");
    }

    if (options.name.trim().length === 0) {
      throw new Error("DirectorScriptInstance name cannot be empty");
    }

    this.id = options.id;
    this.name = options.name;
    this.type = options.type;

    for (const [key, value] of Object.entries(options.properties ?? {})) {
      this.properties.set(key, value);
    }

    for (const definition of options.handlers ?? []) {
      this.addHandler(definition.name, definition.handler);
    }
  }

  get handlerNames(): readonly string[] {
    return [...this.handlers.values()].map((definition) => definition.name);
  }

  addHandler(name: string, handler: LingoHandler<DirectorEventContext>): void {
    const normalized = normalizeScriptHandlerName(name);
    this.handlers.set(normalized, { name, handler });
  }

  attachTo(
    router: DirectorEventRouter,
    options: DirectorScriptAttachmentOptions = {}
  ): readonly LingoHandlerRegistration<DirectorEventContext>[] {
    const handlerNames =
      options.handlerNames === undefined
        ? undefined
        : new Set(options.handlerNames.map((handlerName) => normalizeHandlerName(handlerName)));

    return [...this.handlers.values()].filter((definition) => handlerNames === undefined || handlerNames.has(normalizeHandlerName(definition.name))).map((definition) =>
      router.registerHandler(definition.name, definition.handler, {
        scriptId: this.id,
        scriptName: this.name,
        scriptType: this.type,
        ...(options.scope === undefined ? {} : { scope: options.scope }),
        ...(options.frameIndex === undefined ? {} : { frameIndex: options.frameIndex }),
        ...(options.startFrame === undefined ? {} : { startFrame: options.startFrame }),
        ...(options.endFrame === undefined ? {} : { endFrame: options.endFrame }),
        ...(options.channel === undefined ? {} : { channel: options.channel }),
        ...(options.memberRef === undefined ? {} : { memberRef: options.memberRef })
      })
    );
  }

  getProperty(name: string): unknown {
    return this.properties.get(name);
  }

  setProperty(name: string, value: unknown): void {
    this.properties.set(name, value);
  }

  hasProperty(name: string): boolean {
    return this.properties.has(name);
  }
}

function normalizeScriptHandlerName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized.length === 0) {
    throw new Error("Director script handler name cannot be empty");
  }

  return normalized;
}
