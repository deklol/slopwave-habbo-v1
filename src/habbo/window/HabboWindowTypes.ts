import type { LingoSymbol } from "../../lingo";

export interface HabboDelayRecord {
  readonly id: string;
  readonly clientId: LingoSymbol;
  readonly method: LingoSymbol;
  readonly delayMs: number;
  readonly argument?: unknown;
  readonly source?: string;
}

export interface HabboWindowProcedureRecord {
  readonly handler: LingoSymbol;
  readonly clientId: LingoSymbol;
  readonly event: LingoSymbol;
}

export interface HabboWindowRecord {
  readonly id: LingoSymbol;
  readonly template?: string;
  title?: string;
  x?: number;
  y?: number;
  locZ?: number;
  contentResizeWidth?: number;
  contentResizeHeight?: number;
  mergedLayout?: {
    readonly memberName: string;
    readonly textChunkPath: string;
    readonly elementCount: number;
    readonly rect?: readonly number[];
    readonly normalizedRect?: readonly number[];
    readonly border?: readonly number[];
    readonly clientRect?: readonly number[];
  };
  readonly registeredClients: LingoSymbol[];
  readonly procedures: HabboWindowProcedureRecord[];
  focusedElement?: string;
}

export interface HabboWindowInteractiveElement {
  readonly id: string;
  readonly windowId: string;
  readonly kind: "field" | "button" | "link" | "scrollbar" | "dropmenu" | "drag" | "room" | "room_user" | "room_object";
  readonly x: number;
  readonly y: number;
  readonly locZ?: number;
  readonly width: number;
  readonly height: number;
  readonly enabled?: boolean;
  readonly label?: string;
  readonly editable?: boolean;
  readonly password?: boolean;
  readonly cursor?: string;
  readonly fontSize?: number;
  readonly textAlign?: "left" | "center" | "right";
  readonly renderValue?: boolean;
  readonly clientId?: string;
  readonly scrollClientX?: number;
  readonly scrollClientY?: number;
  readonly scrollClientWidth?: number;
  readonly scrollClientHeight?: number;
}

export interface HabboWindowElementOverride {
  readonly visible?: boolean;
  readonly editable?: boolean;
  readonly blend?: number;
  readonly cursor?: string | 0;
  readonly locH?: number;
  readonly locV?: number;
  readonly width?: number;
  readonly height?: number;
  readonly offsetH?: number;
  readonly offsetV?: number;
  readonly resizeWidth?: number;
  readonly resizeHeight?: number;
}

export type HabboWindowElementEventKind = "mouseDown" | "mouseUp" | "keyDown";

export interface HabboWindowElementActivation {
  readonly localX?: number;
  readonly localY?: number;
  readonly scrollDelta?: number;
  readonly windowId?: string;
  readonly event?: HabboWindowElementEventKind;
  readonly doubleClick?: boolean;
}
