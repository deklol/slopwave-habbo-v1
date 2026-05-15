import { LingoHandlerRegistry, type LingoHandler, type LingoHandlerDispatchResult, type LingoHandlerMetadata, type LingoHandlerRegistration } from "../lingo";
import type { DirectorFrame } from "./DirectorFrame";
import type { DirectorMovie } from "./DirectorMovie";

export type DirectorEventTarget = "movie" | "frame" | "sprite" | "member" | "score";

export interface DirectorEvent {
  readonly name: string;
  readonly target: DirectorEventTarget;
  readonly args: readonly unknown[];
}

export interface DirectorEventContext {
  readonly movie: DirectorMovie;
  readonly event: DirectorEvent;
  readonly frame: DirectorFrame;
  readonly frameIndex: number;
}

export interface DirectorEventDispatchResult {
  readonly event: DirectorEvent;
  readonly handled: boolean;
  readonly calls: LingoHandlerDispatchResult<DirectorEventContext>["calls"];
}

export class DirectorEventRouter {
  constructor(
    private readonly movie: DirectorMovie,
    readonly handlers: LingoHandlerRegistry<DirectorEventContext> = new LingoHandlerRegistry<DirectorEventContext>()
  ) {}

  registerHandler(
    name: string,
    handler: LingoHandler<DirectorEventContext>,
    metadata?: LingoHandlerMetadata
  ): LingoHandlerRegistration<DirectorEventContext> {
    return this.handlers.register(name, handler, metadata);
  }

  dispatch(name: string, args: readonly unknown[] = [], target: DirectorEventTarget = "movie"): DirectorEventDispatchResult {
    return this.dispatchEvent({
      name,
      target,
      args
    });
  }

  dispatchEvent(event: DirectorEvent): DirectorEventDispatchResult {
    const context: DirectorEventContext = {
      movie: this.movie,
      event,
      frame: this.movie.currentFrame,
      frameIndex: this.movie.currentFrameIndex
    };
    const result = this.handlers.dispatchWhere(
      event.name,
      context,
      (registration) => isRegistrationActiveForFrame(registration.metadata, context.frameIndex),
      event.args
    );

    return {
      event,
      handled: result.handled,
      calls: result.calls
    };
  }
}

function isRegistrationActiveForFrame(metadata: { frameIndex?: number; startFrame?: number; endFrame?: number } | undefined, frameIndex: number): boolean {
  if (!metadata) {
    return true;
  }

  if (metadata.frameIndex !== undefined && metadata.frameIndex !== frameIndex) {
    return false;
  }

  if (metadata.startFrame !== undefined && frameIndex < metadata.startFrame) {
    return false;
  }

  if (metadata.endFrame !== undefined && frameIndex > metadata.endFrame) {
    return false;
  }

  return true;
}
