import { DirectorMovie } from "../runtime";
import type {
  DirectorMovieManifest,
  DirectorMovieScriptAttachmentResult,
  DirectorScoreBehaviorAttachmentResult,
  DirectorScriptInstance
} from "../runtime";
import type { HabboVersionAdapter } from "./HabboVersionAdapter";

export interface HabboRuntimeSnapshot {
  readonly adapterId: string;
  readonly movieId: string;
  readonly frame: number;
  readonly unsupportedCount: number;
}

export interface HabboRuntimeScriptAttachments {
  readonly movieScripts: readonly DirectorMovieScriptAttachmentResult[];
  readonly scoreBehaviors: readonly DirectorScoreBehaviorAttachmentResult[];
}

export class HabboRuntime {
  readonly adapter: HabboVersionAdapter;
  readonly movie: DirectorMovie;
  readonly scriptAttachments: HabboRuntimeScriptAttachments;

  constructor(
    adapter: HabboVersionAdapter,
    manifest?: DirectorMovieManifest,
    scripts?: ReadonlyMap<string, DirectorScriptInstance> | Readonly<Record<string, DirectorScriptInstance>>
  ) {
    this.adapter = adapter;
    this.movie = new DirectorMovie(manifest ?? adapter.createManifest());
    this.scriptAttachments = scripts
      ? {
          movieScripts: this.movie.attachMovieScripts(scripts),
          scoreBehaviors: this.movie.attachScoreBehaviorScripts(scripts)
        }
      : {
          movieScripts: [],
          scoreBehaviors: []
        };
  }

  snapshot(): HabboRuntimeSnapshot {
    return {
      adapterId: this.adapter.id,
      movieId: this.movie.id,
      frame: this.movie.currentFrameIndex,
      unsupportedCount: this.movie.unsupported.list().length + this.adapter.unsupported.length
    };
  }
}
