import { DirectorBehaviorInterval, type DirectorBehaviorIntervalManifest } from "./DirectorBehaviorInterval";
import { DirectorFrame, type DirectorFrameManifest } from "./DirectorFrame";
import { DirectorMarker, type DirectorMarkerManifest } from "./DirectorMarker";

export interface DirectorScoreManifest {
  frameRate: number;
  markers?: DirectorMarkerManifest[];
  behaviors?: DirectorBehaviorIntervalManifest[];
  frames: DirectorFrameManifest[];
}

export class DirectorScore {
  readonly frameRate: number;
  readonly frames: readonly DirectorFrame[];
  readonly markers: readonly DirectorMarker[];
  readonly behaviors: readonly DirectorBehaviorInterval[];
  private readonly framesByIndex = new Map<number, DirectorFrame>();
  private readonly markersByName = new Map<string, DirectorMarker>();

  constructor(manifest: DirectorScoreManifest) {
    if (!Number.isFinite(manifest.frameRate) || manifest.frameRate <= 0) {
      throw new Error(`Invalid frame rate: ${manifest.frameRate}`);
    }

    this.frameRate = manifest.frameRate;
    this.frames = manifest.frames
      .map((frame) => new DirectorFrame(frame))
      .sort((left, right) => left.index - right.index);

    for (const frame of this.frames) {
      if (this.framesByIndex.has(frame.index)) {
        throw new Error(`Duplicate frame index ${frame.index}`);
      }

      this.framesByIndex.set(frame.index, frame);
    }

    this.markers = (manifest.markers ?? []).map((marker) => new DirectorMarker(marker));
    for (const marker of this.markers) {
      this.markersByName.set(marker.name.toLowerCase(), marker);
    }

    this.behaviors = (manifest.behaviors ?? []).map((behavior) => new DirectorBehaviorInterval(behavior));
  }

  get firstFrameIndex(): number {
    const first = this.frames[0];
    if (!first) {
      throw new Error("Score has no frames");
    }

    return first.index;
  }

  getFrame(index: number): DirectorFrame | undefined {
    return this.framesByIndex.get(index);
  }

  getMarker(name: string): DirectorMarker | undefined {
    return this.markersByName.get(name.toLowerCase());
  }

  resolveFrame(target: number | string): DirectorFrame {
    const frameIndex = typeof target === "number" ? target : this.getMarker(target)?.frame;
    if (frameIndex === undefined) {
      throw new Error(`Unknown marker: ${target}`);
    }

    const frame = this.getFrame(frameIndex);
    if (!frame) {
      throw new Error(`Unknown frame: ${frameIndex}`);
    }

    return frame;
  }

  nextFrameIndex(current: number, loop = false): number | undefined {
    const currentIndex = this.frames.findIndex((frame) => frame.index === current);
    if (currentIndex === -1) {
      throw new Error(`Unknown frame: ${current}`);
    }

    const next = this.frames[currentIndex + 1];
    if (next) {
      return next.index;
    }

    return loop ? this.firstFrameIndex : undefined;
  }

  activeBehaviorIntervals(frameIndex: number): readonly DirectorBehaviorInterval[] {
    return this.behaviors.filter((behavior) => behavior.containsFrame(frameIndex));
  }
}
