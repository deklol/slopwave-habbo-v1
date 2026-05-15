import type { DirectorMemberRef } from "./DirectorMember";

export interface DirectorBehaviorIntervalManifest {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly channel: number;
  readonly script: DirectorMemberRef;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly propertiesEntry?: number;
}

export class DirectorBehaviorInterval {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly channel: number;
  readonly script: DirectorMemberRef;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly propertiesEntry?: number;

  constructor(manifest: DirectorBehaviorIntervalManifest) {
    if (!Number.isInteger(manifest.startFrame) || manifest.startFrame <= 0) {
      throw new Error(`Invalid behavior interval start frame: ${manifest.startFrame}`);
    }

    if (!Number.isInteger(manifest.endFrame) || manifest.endFrame < manifest.startFrame) {
      throw new Error(`Invalid behavior interval end frame: ${manifest.endFrame}`);
    }

    if (!Number.isInteger(manifest.channel) || manifest.channel < 0) {
      throw new Error(`Invalid behavior interval channel: ${manifest.channel}`);
    }

    this.startFrame = manifest.startFrame;
    this.endFrame = manifest.endFrame;
    this.channel = manifest.channel;
    this.script = manifest.script;
    if (manifest.properties !== undefined) {
      this.properties = manifest.properties;
    }
    if (manifest.propertiesEntry !== undefined) {
      this.propertiesEntry = manifest.propertiesEntry;
    }
  }

  containsFrame(frameIndex: number): boolean {
    return frameIndex >= this.startFrame && frameIndex <= this.endFrame;
  }

  get scriptKey(): string {
    return `${this.script.castLib}:${this.script.member}`;
  }
}
