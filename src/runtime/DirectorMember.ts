export type DirectorMemberType =
  | "bitmap"
  | "text"
  | "field"
  | "sound"
  | "script"
  | "palette"
  | "shape"
  | "unknown";

export interface DirectorPoint {
  x: number;
  y: number;
}

export interface DirectorMemberRef {
  castLib: number;
  member: number;
}

export interface DirectorBitmapCompositeLayer {
  assetPath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  text?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  lineHeight?: number;
  underline?: boolean;
  textAlign?: "left" | "center" | "right";
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  trimWhitespace?: boolean;
  alignX?: "left" | "center" | "right";
  alignY?: "top" | "center" | "bottom";
  alpha?: number;
  repeat?: boolean;
  flipH?: boolean;
  flipV?: boolean;
  rotate?: number;
  tint?: string;
  copyPixelsColor?: boolean;
  ink?: number;
}

export interface DirectorTextSpan {
  start: number;
  end: number;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
}

export interface DirectorBitmapComposite {
  width: number;
  height: number;
  layers: DirectorBitmapCompositeLayer[];
}

export interface DirectorMemberManifest {
  number: number;
  name?: string;
  type: DirectorMemberType;
  width?: number;
  height?: number;
  shapeType?: "rect" | "oval" | "unknown" | string;
  shapeFillType?: number;
  shapeLineThickness?: number;
  color?: string;
  backgroundColor?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  wordWrap?: boolean;
  textSpans?: DirectorTextSpan[];
  textScrollY?: number;
  editable?: boolean;
  regPoint?: DirectorPoint;
  assetPath?: string;
  inkAssetPaths?: Record<string, string>;
  composite?: DirectorBitmapComposite;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export class DirectorMember {
  readonly castLib: number;
  readonly memberNumber: number;
  readonly name: string | undefined;
  readonly type: DirectorMemberType;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly shapeType: string | undefined;
  readonly shapeFillType: number | undefined;
  readonly shapeLineThickness: number | undefined;
  readonly color: string | undefined;
  readonly backgroundColor: string | undefined;
  text: string | undefined;
  readonly fontSize: number | undefined;
  readonly fontFamily: string | undefined;
  readonly fontWeight: string | undefined;
  readonly fontStyle: string | undefined;
  readonly underline: boolean;
  readonly textAlign: "left" | "center" | "right" | undefined;
  readonly lineHeight: number | undefined;
  readonly wordWrap: boolean;
  readonly textSpans: readonly DirectorTextSpan[];
  readonly textScrollY: number;
  readonly editable: boolean;
  readonly regPoint: DirectorPoint;
  readonly assetPath: string | undefined;
  readonly inkAssetPaths: Readonly<Record<string, string>>;
  readonly composite: DirectorBitmapComposite | undefined;
  readonly borderColor: string | undefined;
  readonly borderWidth: number | undefined;
  readonly borderRadius: number | undefined;

  constructor(castLib: number, manifest: DirectorMemberManifest) {
    if (!Number.isInteger(castLib) || castLib <= 0) {
      throw new Error(`Invalid cast library number: ${castLib}`);
    }

    if (!Number.isInteger(manifest.number) || manifest.number <= 0) {
      throw new Error(`Invalid cast member number: ${manifest.number}`);
    }

    this.castLib = castLib;
    this.memberNumber = manifest.number;
    this.name = manifest.name;
    this.type = manifest.type;
    this.width = manifest.width;
    this.height = manifest.height;
    this.shapeType = manifest.shapeType;
    this.shapeFillType = manifest.shapeFillType;
    this.shapeLineThickness = manifest.shapeLineThickness;
    this.color = manifest.color;
    this.backgroundColor = manifest.backgroundColor;
    this.text = manifest.text;
    this.fontSize = manifest.fontSize;
    this.fontFamily = manifest.fontFamily;
    this.fontWeight = manifest.fontWeight;
    this.fontStyle = manifest.fontStyle;
    this.underline = manifest.underline ?? false;
    this.textAlign = manifest.textAlign;
    this.lineHeight = manifest.lineHeight;
    this.wordWrap = manifest.wordWrap ?? false;
    this.textSpans = manifest.textSpans ?? [];
    this.textScrollY = manifest.textScrollY ?? 0;
    this.editable = manifest.editable ?? false;
    this.regPoint = manifest.regPoint ?? { x: 0, y: 0 };
    this.assetPath = manifest.assetPath;
    this.inkAssetPaths = manifest.inkAssetPaths ?? {};
    this.composite = manifest.composite;
    this.borderColor = manifest.borderColor;
    this.borderWidth = manifest.borderWidth;
    this.borderRadius = manifest.borderRadius;
  }

  get key(): string {
    return DirectorMember.makeKey(this.castLib, this.memberNumber);
  }

  ref(): DirectorMemberRef {
    return { castLib: this.castLib, member: this.memberNumber };
  }

  setText(text: string): void {
    this.text = text;
  }

  setTextAlign(textAlign: "left" | "center" | "right" | undefined): void {
    (this as { textAlign: "left" | "center" | "right" | undefined }).textAlign = textAlign;
  }

  static makeKey(castLib: number, member: number): string {
    return `${castLib}:${member}`;
  }
}
