import { DirectorCast, type DirectorCastLibManifest } from "./DirectorCast";
import { DirectorClock } from "./DirectorClock";
import { DirectorDebugLog } from "./DirectorDebugLog";
import { DirectorEventRouter, type DirectorEventDispatchResult, type DirectorEventContext } from "./DirectorEventRouter";
import { DirectorNetManager } from "./DirectorNetManager";
import { DirectorScore, type DirectorScoreManifest } from "./DirectorScore";
import type { DirectorScriptInstance } from "./DirectorScriptInstance";
import { DirectorStage, type DirectorStageManifest } from "./DirectorStage";
import { assertDirectorMovieManifest } from "./DirectorManifestValidator";
import { UnsupportedFeatureRegistry } from "./UnsupportedFeature";
import type { LingoHandler, LingoHandlerMetadata, LingoHandlerRegistration } from "../lingo";

export interface DirectorMovieManifest {
  id: string;
  name: string;
  stage: DirectorStageManifest;
  casts: DirectorCastLibManifest[];
  score: DirectorScoreManifest;
}

export interface DirectorFrameScriptAttachmentResult {
  readonly frameIndex: number;
  readonly scriptId: string;
  readonly event: string;
  readonly handler: string;
  readonly attached: boolean;
  readonly registrations: number;
  readonly reason?: string;
}

export interface DirectorScoreBehaviorAttachmentResult {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly channel: number;
  readonly scriptRef: string;
  readonly attached: boolean;
  readonly registrations: number;
  readonly reason?: string;
}

export interface DirectorMovieScriptAttachmentResult {
  readonly scriptId: string;
  readonly attached: boolean;
  readonly registrations: number;
  readonly reason?: string;
}

export class DirectorMovie {
  readonly id: string;
  readonly name: string;
  readonly stage: DirectorStage;
  readonly cast: DirectorCast;
  readonly score: DirectorScore;
  readonly clock: DirectorClock;
  readonly eventRouter: DirectorEventRouter;
  readonly net: DirectorNetManager;
  readonly debugLog: DirectorDebugLog;
  readonly unsupported = new UnsupportedFeatureRegistry();
  private currentFrameIndexValue: number;
  private tempoValue: number;
  private readonly properties = new Map<string, unknown>();

  constructor(manifest: DirectorMovieManifest) {
    assertDirectorMovieManifest(manifest);

    this.id = manifest.id;
    this.name = manifest.name;
    this.stage = new DirectorStage(manifest.stage);
    this.cast = new DirectorCast(manifest.casts);
    this.score = new DirectorScore(manifest.score);
    this.currentFrameIndexValue = this.score.firstFrameIndex;
    this.tempoValue = this.score.frameRate;
    this.debugLog = new DirectorDebugLog({ maxEntries: 5000 });
    this.eventRouter = new DirectorEventRouter(this);
    this.clock = new DirectorClock(this);
    this.net = new DirectorNetManager(this.debugLog);
    this.debugLog.add("runtime", "info", `movie-created id=${this.id} stage=${this.stage.width}x${this.stage.height} frames=${this.score.frames.length}`, {
      id: this.id,
      name: this.name,
      stage: { width: this.stage.width, height: this.stage.height },
      frames: this.score.frames.length
    });
  }

  get currentFrameIndex(): number {
    return this.currentFrameIndexValue;
  }

  get currentFrame() {
    return this.score.resolveFrame(this.currentFrameIndexValue);
  }

  get tempo(): number {
    return this.tempoValue;
  }

  go(target: number | string): void {
    this.currentFrameIndexValue = this.score.resolveFrame(target).index;
  }

  goCurrentFrame(): void {
    this.go(this.currentFrameIndexValue);
  }

  puppetTempo(tempo: number): void {
    if (!Number.isFinite(tempo) || tempo <= 0) {
      throw new Error(`Invalid puppetTempo value: ${tempo}`);
    }

    this.tempoValue = tempo;
  }

  getProperty(name: string): unknown {
    return this.properties.get(name);
  }

  setProperty(name: string, value: unknown): void {
    this.properties.set(name, value);
  }

  advanceFrame(loop = false): boolean {
    const nextFrame = this.score.nextFrameIndex(this.currentFrameIndexValue, loop);
    if (nextFrame === undefined) {
      return false;
    }

    this.currentFrameIndexValue = nextFrame;
    return true;
  }

  registerHandler(
    name: string,
    handler: LingoHandler<DirectorEventContext>,
    metadata?: LingoHandlerMetadata
  ): LingoHandlerRegistration<DirectorEventContext> {
    return this.eventRouter.registerHandler(name, handler, metadata);
  }

  dispatchEvent(name: string, args: readonly unknown[] = [], target: "movie" | "frame" | "sprite" | "member" | "score" = "movie"): DirectorEventDispatchResult {
    return this.eventRouter.dispatch(name, args, target);
  }

  prepareMovie(): DirectorEventDispatchResult {
    return this.dispatchEvent("prepareMovie");
  }

  startMovie(): DirectorEventDispatchResult {
    return this.dispatchEvent("startMovie");
  }

  stopMovie(): DirectorEventDispatchResult {
    return this.dispatchEvent("stopMovie");
  }

  attachFrameScripts(
    scripts: ReadonlyMap<string, DirectorScriptInstance> | Readonly<Record<string, DirectorScriptInstance>>
  ): readonly DirectorFrameScriptAttachmentResult[] {
    const scriptMap = scripts instanceof Map ? scripts : new Map(Object.entries(scripts));

    const results: DirectorFrameScriptAttachmentResult[] = [];
    for (const frame of this.score.frames) {
      for (const scriptRef of frame.scripts) {
        const script = scriptMap.get(scriptRef.scriptId);
        if (!script) {
          const reason = `Frame ${frame.index} references missing script ${scriptRef.scriptId}`;
          this.unsupported.add({
            subsystem: "director",
            feature: "missing-frame-script",
            detail: reason
          });
          results.push({
            frameIndex: frame.index,
            scriptId: scriptRef.scriptId,
            event: scriptRef.event,
            handler: scriptRef.handler,
            attached: false,
            registrations: 0,
            reason
          });
          continue;
        }

        const registrations = script.attachTo(this.eventRouter, {
          scope: "frame",
          frameIndex: frame.index,
          handlerNames: [scriptRef.handler]
        });

        results.push({
          frameIndex: frame.index,
          scriptId: scriptRef.scriptId,
          event: scriptRef.event,
          handler: scriptRef.handler,
          attached: registrations.length > 0,
          registrations: registrations.length,
          ...(registrations.length === 0 ? { reason: `Script ${scriptRef.scriptId} has no handler ${scriptRef.handler}` } : {})
        });
      }
    }

    return results;
  }

  attachMovieScripts(
    scripts: ReadonlyMap<string, DirectorScriptInstance> | Readonly<Record<string, DirectorScriptInstance>>
  ): readonly DirectorMovieScriptAttachmentResult[] {
    const scriptMap = scripts instanceof Map ? scripts : new Map(Object.entries(scripts));
    const results: DirectorMovieScriptAttachmentResult[] = [];

    for (const script of scriptMap.values()) {
      if (script.type !== "movie") {
        continue;
      }

      const registrations = script.attachTo(this.eventRouter, { scope: "movie" });
      results.push({
        scriptId: script.id,
        attached: registrations.length > 0,
        registrations: registrations.length,
        ...(registrations.length === 0 ? { reason: `Movie script ${script.id} has no handlers` } : {})
      });
    }

    return results;
  }

  attachScoreBehaviorScripts(
    scripts: ReadonlyMap<string, DirectorScriptInstance> | Readonly<Record<string, DirectorScriptInstance>>
  ): readonly DirectorScoreBehaviorAttachmentResult[] {
    const scriptMap = scripts instanceof Map ? scripts : new Map(Object.entries(scripts));
    const results: DirectorScoreBehaviorAttachmentResult[] = [];

    for (const behavior of this.score.behaviors) {
      const scriptRef = behavior.scriptKey;
      const script = scriptMap.get(scriptRef);
      if (!script) {
        const reason = `Score behavior ${behavior.startFrame}-${behavior.endFrame} channel ${behavior.channel} references missing script ${scriptRef}`;
        this.unsupported.add({
          subsystem: "director",
          feature: "missing-score-behavior-script",
          detail: reason
        });
        results.push({
          startFrame: behavior.startFrame,
          endFrame: behavior.endFrame,
          channel: behavior.channel,
          scriptRef,
          attached: false,
          registrations: 0,
          reason
        });
        continue;
      }

      const registrations = script.attachTo(this.eventRouter, {
        scope: "score-behavior",
        startFrame: behavior.startFrame,
        endFrame: behavior.endFrame,
        channel: behavior.channel,
        memberRef: scriptRef
      });

      results.push({
        startFrame: behavior.startFrame,
        endFrame: behavior.endFrame,
        channel: behavior.channel,
        scriptRef,
        attached: registrations.length > 0,
        registrations: registrations.length,
        ...(registrations.length === 0 ? { reason: `Score behavior script ${scriptRef} has no handlers` } : {})
      });
    }

    return results;
  }
}
