import type { HabboWindowInteractiveElement, HabboWindowRecord } from "./HabboWindowTypes";
import { normalizeSymbolKey } from "../HabboSourceValueHelpers";

export function isHabboWindowInteractiveElement(value: unknown): value is HabboWindowInteractiveElement {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<HabboWindowInteractiveElement>;
  return typeof candidate.id === "string"
    && typeof candidate.windowId === "string"
    && (candidate.kind === "field"
      || candidate.kind === "button"
      || candidate.kind === "link"
      || candidate.kind === "scrollbar"
      || candidate.kind === "dropmenu"
      || candidate.kind === "drag"
      || candidate.kind === "room"
      || candidate.kind === "room_user"
      || candidate.kind === "room_object")
    && typeof candidate.x === "number"
    && typeof candidate.y === "number"
    && typeof candidate.width === "number"
    && typeof candidate.height === "number";
}

export function mergeWindowInteractiveElements(
  left: HabboWindowInteractiveElement,
  right: HabboWindowInteractiveElement
): HabboWindowInteractiveElement {
  const minX = Math.min(left.x, right.x);
  const minY = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  const label = left.label ?? right.label;
  const editable = left.editable ?? right.editable;
  const password = left.password ?? right.password;
  const cursor = left.cursor ?? right.cursor;
  const textAlign = left.textAlign ?? right.textAlign;
  const clientId = left.clientId ?? right.clientId;
  const scrollClientX = left.scrollClientX ?? right.scrollClientX;
  const scrollClientY = left.scrollClientY ?? right.scrollClientY;
  const scrollClientWidth = left.scrollClientWidth ?? right.scrollClientWidth;
  const scrollClientHeight = left.scrollClientHeight ?? right.scrollClientHeight;
  return {
    ...left,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    ...(label !== undefined ? { label } : {}),
    ...(editable !== undefined ? { editable } : {}),
    ...(password !== undefined ? { password } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    ...(textAlign !== undefined ? { textAlign } : {}),
    ...(clientId !== undefined ? { clientId } : {}),
    ...(scrollClientX !== undefined ? { scrollClientX } : {}),
    ...(scrollClientY !== undefined ? { scrollClientY } : {}),
    ...(scrollClientWidth !== undefined ? { scrollClientWidth } : {}),
    ...(scrollClientHeight !== undefined ? { scrollClientHeight } : {})
  };
}

export function dedupeWindowInteractiveElements(
  elements: readonly HabboWindowInteractiveElement[]
): HabboWindowInteractiveElement[] {
  const byKey = new Map<string, HabboWindowInteractiveElement>();
  for (const element of elements) {
    byKey.set(windowInteractiveElementKey(element), element);
  }
  return [...byKey.values()];
}

function windowInteractiveElementKey(element: HabboWindowInteractiveElement): string {
  return `${element.windowId}\u0000${element.kind}\u0000${element.id}`;
}

export function windowScrollKey(window: HabboWindowRecord, clientId: string): string {
  return `${normalizeSymbolKey(window.id)}:${clientId}`;
}
