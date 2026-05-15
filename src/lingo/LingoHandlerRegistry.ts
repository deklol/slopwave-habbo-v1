export type LingoHandler<TContext = unknown> = (context: TContext, ...args: readonly unknown[]) => unknown;

export interface LingoHandlerMetadata {
  readonly scriptId?: string;
  readonly scriptName?: string;
  readonly scriptType?: string;
  readonly scope?: string;
  readonly frameIndex?: number;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly channel?: number;
  readonly memberRef?: string;
}

export interface LingoHandlerRegistration<TContext = unknown> {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly order: number;
  readonly handler: LingoHandler<TContext>;
  readonly metadata?: LingoHandlerMetadata;
}

export interface LingoHandlerCallResult<TContext = unknown> {
  readonly registration: LingoHandlerRegistration<TContext>;
  readonly result: unknown;
}

export interface LingoHandlerDispatchResult<TContext = unknown> {
  readonly name: string;
  readonly normalizedName: string;
  readonly handled: boolean;
  readonly calls: readonly LingoHandlerCallResult<TContext>[];
}

export class LingoHandlerRegistry<TContext = unknown> {
  private readonly handlers = new Map<string, LingoHandlerRegistration<TContext>[]>();
  private nextId = 1;
  private nextOrder = 1;

  register(name: string, handler: LingoHandler<TContext>, metadata?: LingoHandlerMetadata): LingoHandlerRegistration<TContext> {
    const normalizedName = normalizeHandlerName(name);
    const id = `${normalizedName}:${this.nextId++}`;
    const registration: LingoHandlerRegistration<TContext> = {
      id,
      name,
      normalizedName,
      order: this.nextOrder++,
      handler,
      ...(metadata === undefined ? {} : { metadata })
    };

    const existing = this.handlers.get(normalizedName) ?? [];
    existing.push(registration);
    existing.sort((left, right) => left.order - right.order);
    this.handlers.set(normalizedName, existing);

    return registration;
  }

  unregister(registrationId: string): boolean {
    for (const [name, registrations] of this.handlers) {
      const next = registrations.filter((registration) => registration.id !== registrationId);
      if (next.length !== registrations.length) {
        if (next.length === 0) {
          this.handlers.delete(name);
        } else {
          this.handlers.set(name, next);
        }

        return true;
      }
    }

    return false;
  }

  has(name: string): boolean {
    return this.get(name).length > 0;
  }

  get(name: string): readonly LingoHandlerRegistration<TContext>[] {
    return [...(this.handlers.get(normalizeHandlerName(name)) ?? [])];
  }

  dispatch(name: string, context: TContext, args: readonly unknown[] = []): LingoHandlerDispatchResult<TContext> {
    return this.dispatchWhere(name, context, () => true, args);
  }

  dispatchWhere(
    name: string,
    context: TContext,
    predicate: (registration: LingoHandlerRegistration<TContext>) => boolean,
    args: readonly unknown[] = []
  ): LingoHandlerDispatchResult<TContext> {
    const normalizedName = normalizeHandlerName(name);
    const registrations = this.get(name).filter(predicate);
    const calls = registrations.map((registration) => ({
      registration,
      result: registration.handler(context, ...args)
    }));

    return {
      name,
      normalizedName,
      handled: calls.length > 0,
      calls
    };
  }
}

export function normalizeHandlerName(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized.length === 0) {
    throw new Error("Lingo handler name cannot be empty");
  }

  return normalized;
}
