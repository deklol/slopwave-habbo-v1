import type { DirectorMemberRef, DirectorPoint } from "./DirectorMember";

export interface DirectorSpriteChannelManifest {
  channel: number;
  member: DirectorMemberRef;
  loc: DirectorPoint;
  width?: number;
  height?: number;
  visible?: boolean;
  ink?: number;
  blend?: number;
  locZ?: number;
  fgColor?: string;
  bgColor?: string;
  textColorSource?: "member" | "sprite";
  flipH?: boolean;
  flipV?: boolean;
  placementOffset?: DirectorPoint;
}

export class DirectorSpriteChannel {
  readonly channel: number;
  readonly member: DirectorMemberRef;
  readonly loc: DirectorPoint;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly visible: boolean;
  readonly ink: number;
  readonly blend: number;
  readonly locZ: number;
  readonly fgColor: string | undefined;
  readonly bgColor: string | undefined;
  readonly textColorSource: "member" | "sprite" | undefined;
  readonly flipH: boolean;
  readonly flipV: boolean;
  placementOffset: DirectorPoint | undefined;

  constructor(manifest: DirectorSpriteChannelManifest) {
    if (!Number.isInteger(manifest.channel) || manifest.channel <= 0) {
      throw new Error(`Invalid sprite channel: ${manifest.channel}`);
    }

    this.channel = manifest.channel;
    this.member = manifest.member;
    this.loc = manifest.loc;
    this.width = manifest.width;
    this.height = manifest.height;
    this.visible = manifest.visible ?? true;
    this.ink = manifest.ink ?? 0;
    this.blend = manifest.blend ?? 100;
    this.locZ = manifest.locZ ?? 0;
    this.fgColor = manifest.fgColor;
    this.bgColor = manifest.bgColor;
    this.textColorSource = manifest.textColorSource;
    this.flipH = manifest.flipH ?? false;
    this.flipV = manifest.flipV ?? false;
    this.placementOffset = manifest.placementOffset;
  }
}
