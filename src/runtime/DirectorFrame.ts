import { DirectorSpriteChannel, type DirectorSpriteChannelManifest } from "./DirectorSpriteChannel";

export interface DirectorFrameScriptRefManifest {
  scriptId: string;
  event: string;
  handler?: string;
}

export interface DirectorFrameManifest {
  index: number;
  sprites: DirectorSpriteChannelManifest[];
  scripts?: DirectorFrameScriptRefManifest[];
}

export class DirectorFrameScriptRef {
  readonly scriptId: string;
  readonly event: string;
  readonly handler: string;

  constructor(manifest: DirectorFrameScriptRefManifest) {
    this.scriptId = manifest.scriptId;
    this.event = manifest.event;
    this.handler = manifest.handler ?? manifest.event;
  }
}

export class DirectorFrame {
  readonly index: number;
  readonly sprites: readonly DirectorSpriteChannel[];
  readonly scripts: readonly DirectorFrameScriptRef[];

  constructor(manifest: DirectorFrameManifest) {
    if (!Number.isInteger(manifest.index) || manifest.index <= 0) {
      throw new Error(`Invalid frame index: ${manifest.index}`);
    }

    this.index = manifest.index;
    this.sprites = manifest.sprites
      .map((sprite) => new DirectorSpriteChannel(sprite))
      .sort((left, right) => left.channel - right.channel);
    this.scripts = (manifest.scripts ?? []).map((script) => new DirectorFrameScriptRef(script));
  }

  getSprite(channel: number): DirectorSpriteChannel | undefined {
    return this.sprites.find((sprite) => sprite.channel === channel);
  }
}
