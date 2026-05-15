import type { LingoSymbol } from "../../lingo";

export interface HabboTextFieldEntry {
  readonly castLib: number;
  readonly member: number;
  readonly memberName: string;
  readonly textChunkPath: string;
  readonly text: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface HabboTextFieldSet {
  readonly release: string;
  readonly fields: readonly HabboTextFieldEntry[];
}

export interface HabboExternalFieldEntry {
  readonly name: string;
  readonly sourcePath: string;
  readonly text: string;
  readonly lineCount: number;
  readonly properties: Readonly<Record<string, string>>;
}

export interface HabboExternalFieldSet {
  readonly versionId: string;
  readonly sourceId: string;
  readonly fields: readonly HabboExternalFieldEntry[];
}

export interface HabboExternalCastMember {
  readonly number: number;
  readonly name?: string;
  readonly type: string;
  readonly memberChunkId: number;
}

export interface HabboExternalCastEntry {
  readonly order: number;
  readonly name: string;
  readonly expectedSourcePath: string;
  readonly sourceExists: boolean;
  readonly expectedExtractionRoot: string;
  readonly resolved: boolean;
  readonly memberCount: number;
  readonly memberTypes: Readonly<Record<string, number>>;
  readonly members: readonly HabboExternalCastMember[];
}

export interface HabboExternalCastGraph {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly variableSourcePath: string;
  readonly casts: readonly HabboExternalCastEntry[];
  readonly unresolved: readonly {
    readonly order: number;
    readonly name: string;
    readonly expectedSourcePath: string;
    readonly expectedExtractionRoot: string;
  }[];
}

export interface HabboExternalCastTextFieldEntry {
  readonly versionId: string;
  readonly release: string;
  readonly castName: string;
  readonly castOrder: number;
  readonly member: number;
  readonly memberChunkId: number;
  readonly memberName: string;
  readonly memberType: string;
  readonly textSectionId: number;
  readonly textChunkPath: string;
  readonly textLength: number;
  readonly styleTrailingBytes: number;
  readonly text: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface HabboExternalCastTextFieldSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly fields: readonly HabboExternalCastTextFieldEntry[];
}

export interface HabboWindowLayoutBitmapMetadata {
  readonly metadataSource: string;
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly pitch: number;
  readonly paletteId: number;
  readonly paletteCastLib: number;
  readonly regPoint: { readonly x: number; readonly y: number };
  readonly initialRect: { readonly top: number; readonly left: number; readonly bottom: number; readonly right: number };
  readonly alphaThreshold: number;
  readonly useAlpha: boolean;
  readonly bitdSectionId?: number;
  readonly bitdPath?: string;
  readonly bitdExists: boolean;
  readonly bitdBytes: number;
  readonly thumbnailSectionId?: number;
  readonly thumbnailPath?: string;
  readonly thumbnailExists?: boolean;
}

export interface HabboWindowLayoutResolvedMember {
  readonly castName: string;
  readonly castOrder: number;
  readonly member: number;
  readonly memberChunkId: number;
  readonly memberName: string;
  readonly memberType: string;
  readonly memberChunkPath: string;
  readonly memberChunkExists: boolean;
  readonly bitmap?: HabboWindowLayoutBitmapMetadata;
  readonly text?: {
    readonly textChunkPath: string;
    readonly textLength: number;
  };
}

export interface HabboWindowLayoutElement {
  readonly index: number;
  readonly memberName?: string;
  readonly media?: string;
  readonly locH?: number;
  readonly locV?: number;
  readonly width?: number;
  readonly height?: number;
  readonly ink?: number;
  readonly blend?: number;
  readonly locZ?: number;
  readonly active?: boolean;
  readonly palette?: string;
  readonly type?: string;
  readonly id?: string;
  readonly model?: string;
  readonly key?: string;
  readonly stretch?: string;
  readonly strech?: string;
  readonly flipH?: boolean | number | string;
  readonly flipV?: boolean | number | string;
  readonly properties: Readonly<Record<string, string | number>>;
  readonly candidateMembers?: readonly {
    readonly castName: string;
    readonly castOrder: number;
    readonly member: number;
    readonly memberChunkId: number;
    readonly memberType: string;
  }[];
  readonly resolvedMember?: HabboWindowLayoutResolvedMember;
  readonly unresolvedReason?: string;
}

export interface HabboExternalCastWindowLayout {
  readonly versionId: string;
  readonly release: string;
  readonly castName: string;
  readonly castOrder: number;
  readonly member: number;
  readonly memberChunkId: number;
  readonly memberName: string;
  readonly windowName: string;
  readonly textChunkPath: string;
  readonly elementCount: number;
  readonly rect?: readonly number[];
  readonly normalizedRect?: readonly number[];
  readonly border?: readonly number[];
  readonly clientRect?: readonly number[];
  readonly roomData?: Readonly<Record<string, string | number>>;
  readonly bounds: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number; readonly width: number; readonly height: number };
  readonly bitmapReferences: readonly HabboWindowLayoutResolvedMember[];
  readonly unresolvedReferences: readonly {
    readonly elementIndex: number;
    readonly memberName?: string;
    readonly media?: string;
    readonly reason: string;
  }[];
  readonly elements: readonly HabboWindowLayoutElement[];
}

export interface HabboExternalCastWindowLayoutSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly windowCount: number;
  readonly bitmapReferenceCount: number;
  readonly unresolvedReferenceCount: number;
  readonly windows: readonly HabboExternalCastWindowLayout[];
}

export interface HabboExternalCastVisualLayout extends Omit<HabboExternalCastWindowLayout, "windowName"> {
  readonly visualName: string;
}

export interface HabboExternalCastVisualLayoutSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly visualCount: number;
  readonly bitmapReferenceCount: number;
  readonly unresolvedReferenceCount: number;
  readonly visuals: readonly HabboExternalCastVisualLayout[];
}

export interface HabboWindowBitmapAsset {
  readonly id: string;
  readonly versionId: string;
  readonly release: string;
  readonly castName: string;
  readonly castOrder: number;
  readonly member: number;
  readonly memberChunkId: number;
  readonly memberName: string;
  readonly mediaType: "bitmap";
  readonly pixelFormat: "rgba8888";
  readonly alphaPolicy: string;
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly pitch: number;
  readonly regPoint: { readonly x: number; readonly y: number };
  readonly initialRect: { readonly top: number; readonly left: number; readonly bottom: number; readonly right: number };
  readonly sourceBitdPath: string;
  readonly sourceBitdBytes: number;
  readonly sourceMemberChunkPath: string;
  readonly paletteName: string;
  readonly layoutPaletteName?: string;
  readonly paletteCastName: string;
  readonly paletteMember: number;
  readonly paletteChunkPath: string;
  readonly paletteColorCount: number;
  readonly pngPath: string;
  readonly pngBytes: number;
  readonly inkAssetPaths?: Readonly<Record<string, string>>;
  readonly paletteRemapAssetPaths?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly ink36PngBytes?: number;
  readonly ink36AlphaPolicy?: string;
  readonly ink8PngBytes?: number;
  readonly ink8AlphaPolicy?: string;
}

export interface HabboWindowBitmapWindowEntry {
  readonly memberName: string;
  readonly windowName: string;
  readonly textChunkPath: string;
  readonly elementCount: number;
  readonly bitmapElementCount: number;
  readonly assetIds: readonly string[];
}

export interface HabboWindowBitmapAssetSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly windowCount: number;
  readonly assetCount: number;
  readonly unsupportedCount: number;
  readonly windows: readonly HabboWindowBitmapWindowEntry[];
  readonly assets: readonly HabboWindowBitmapAsset[];
  readonly unsupported: readonly {
    readonly windowName: string;
    readonly memberName: string;
    readonly reason: string;
  }[];
}

export interface HabboButtonElementPartAssetRef {
  readonly assetId: string;
  readonly castName: string;
  readonly member: number;
  readonly memberName: string;
  readonly width: number;
  readonly height: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
  readonly rotate?: number;
}

export interface HabboButtonElementTextSpec {
  readonly font: string;
  readonly fontSize: number;
  readonly fontStyle: string;
  readonly alignment: string;
  readonly color: string;
  readonly bgColor: string;
  readonly boxType: string;
  readonly marginH: number;
  readonly marginV: number;
}

export interface HabboButtonElementStateAsset {
  readonly state: string;
  readonly parts: Readonly<Partial<Record<"left" | "middle" | "right" | "top" | "bar" | "lift" | "bottom", HabboButtonElementPartAssetRef>>>;
  readonly text: HabboButtonElementTextSpec;
}

export interface HabboButtonElementAsset {
  readonly memberName: string;
  readonly castName: string;
  readonly castOrder: number;
  readonly member: number;
  readonly memberChunkId: number;
  readonly textChunkPath: string;
  readonly states: readonly HabboButtonElementStateAsset[];
}

export interface HabboButtonBitmapAssetSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly elementCount: number;
  readonly assetCount: number;
  readonly unsupportedCount: number;
  readonly elements: readonly HabboButtonElementAsset[];
  readonly assets: readonly HabboWindowBitmapAsset[];
  readonly unsupported: readonly {
    readonly elementName: string;
    readonly memberName: string;
    readonly reason: string;
  }[];
}

export interface HabboVisualBitmapVisualEntry {
  readonly memberName: string;
  readonly visualName: string;
  readonly textChunkPath: string;
  readonly elementCount: number;
  readonly bitmapElementCount: number;
  readonly assetIds: readonly string[];
}

export interface HabboVisualBitmapAssetSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly visualCount: number;
  readonly assetCount: number;
  readonly unsupportedCount: number;
  readonly visuals: readonly HabboVisualBitmapVisualEntry[];
  readonly assets: readonly HabboWindowBitmapAsset[];
  readonly unsupported: readonly {
    readonly layoutName: string;
    readonly memberName: string;
    readonly reason: string;
  }[];
}

export type HabboInternalBitmapAsset = HabboWindowBitmapAsset;

export interface HabboInternalBitmapAssetSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly assetCount: number;
  readonly assets: readonly HabboInternalBitmapAsset[];
}

export type HabboExternalBitmapAsset = HabboWindowBitmapAsset;

export interface HabboExternalBitmapAssetSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly castCount: number;
  readonly assetCount: number;
  readonly unsupportedCount: number;
  readonly assets: readonly HabboExternalBitmapAsset[];
  readonly unsupported: readonly {
    readonly castName: string;
    readonly memberName: string;
    readonly reason: string;
  }[];
}

export interface HabboFigurePartIndexEntry {
  readonly setid: number;
  readonly parts: Readonly<Record<string, string>>;
  readonly colors: readonly string[];
}

export interface HabboFigurePartIndexSet {
  readonly versionId: string;
  readonly release: string;
  readonly sourceId: string;
  readonly sourcePath: string;
  readonly sexes: Readonly<Record<"M" | "F", Readonly<Record<string, readonly HabboFigurePartIndexEntry[]>>>>;
}

export interface HabboDownloadCallback {
  readonly memberNumber: number;
  readonly handler: LingoSymbol;
  readonly targetId: LingoSymbol;
  readonly nextState: string;
}

export interface HabboCastLoadCallback {
  readonly loadId: number;
  readonly handler: LingoSymbol;
  readonly targetId: LingoSymbol;
  readonly nextState: string;
}

export interface HabboMessageRegistration {
  readonly message: LingoSymbol;
  readonly clientId: LingoSymbol;
  readonly method: LingoSymbol;
  readonly source?: string;
}

export interface HabboMessageCallRecord {
  readonly clientId: string;
  readonly method: string;
  readonly handled: boolean;
  readonly result: unknown;
}
