export interface DirectorStageManifest {
  width: number;
  height: number;
  backgroundColor?: string;
}

export class DirectorStage {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor: string;

  constructor(manifest: DirectorStageManifest) {
    if (!Number.isInteger(manifest.width) || manifest.width <= 0) {
      throw new Error(`Invalid stage width: ${manifest.width}`);
    }

    if (!Number.isInteger(manifest.height) || manifest.height <= 0) {
      throw new Error(`Invalid stage height: ${manifest.height}`);
    }

    this.width = manifest.width;
    this.height = manifest.height;
    this.backgroundColor = manifest.backgroundColor ?? "#000000";
  }
}
