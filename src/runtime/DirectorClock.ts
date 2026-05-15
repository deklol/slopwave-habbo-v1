import type { DirectorEventDispatchResult } from "./DirectorEventRouter";
import type { DirectorMovie } from "./DirectorMovie";

export interface DirectorClockOptions {
  readonly loop?: boolean;
}

export interface DirectorClockStepResult {
  readonly beforeFrame: number;
  readonly afterFrame: number;
  readonly advanced: boolean;
  readonly exitFrame: DirectorEventDispatchResult;
  readonly enterFrame: DirectorEventDispatchResult;
}

export class DirectorClock {
  private readonly loop: boolean;
  private ticks = 0;

  constructor(private readonly movie: DirectorMovie, options: DirectorClockOptions = {}) {
    this.loop = options.loop ?? false;
  }

  get tickCount(): number {
    return this.ticks;
  }

  stepFrame(): DirectorClockStepResult {
    const beforeFrame = this.movie.currentFrameIndex;
    const exitFrame = this.movie.dispatchEvent("exitFrame", [], "frame");
    const advanced = this.movie.advanceFrame(this.loop);
    const enterFrame = this.movie.dispatchEvent("enterFrame", [], "frame");
    this.ticks++;

    return {
      beforeFrame,
      afterFrame: this.movie.currentFrameIndex,
      advanced,
      exitFrame,
      enterFrame
    };
  }
}
