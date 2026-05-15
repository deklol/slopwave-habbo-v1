export interface DirectorMarkerManifest {
  name: string;
  frame: number;
}

export class DirectorMarker {
  readonly name: string;
  readonly frame: number;

  constructor(manifest: DirectorMarkerManifest) {
    if (!manifest.name) {
      throw new Error("Director marker requires a name");
    }

    if (!Number.isInteger(manifest.frame) || manifest.frame <= 0) {
      throw new Error(`Invalid marker frame for ${manifest.name}: ${manifest.frame}`);
    }

    this.name = manifest.name;
    this.frame = manifest.frame;
  }
}
