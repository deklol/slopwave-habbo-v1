import { LingoList, LingoPropertyList, parseLingoLiteral } from "../../lingo";

export interface HabboRoomObjectPoint {
  readonly x: number;
  readonly y: number;
}

export class HabboRoomObjectClassProps {
  private constructor(private readonly props: LingoPropertyList<unknown> | undefined) {}

  static fromSource(source: string | undefined): HabboRoomObjectClassProps {
    if (!source) {
      return new HabboRoomObjectClassProps(undefined);
    }

    try {
      const parsed = parseLingoLiteral(source);
      return new HabboRoomObjectClassProps(parsed instanceof LingoPropertyList ? parsed : undefined);
    } catch {
      return new HabboRoomObjectClassProps(undefined);
    }
  }

  getInk(part: string): number {
    return this.getNumber(part, "ink", 8);
  }

  getBlend(part: string): number {
    return this.getNumber(part, "blend", 100);
  }

  getZShift(part: string, direction: number): number {
    const zShift = this.getList(part, "zshift");
    if (!zShift || zShift.count === 0) {
      return 0;
    }

    const normalizedDirection = normalizeDirection(direction);
    const lingoIndex = zShift.count <= normalizedDirection ? 1 : normalizedDirection + 1;
    return numberFromLingoValue(zShift.getAt(lingoIndex), 0);
  }

  getLocShift(part: string, direction: number): HabboRoomObjectPoint {
    const locShift = this.getList(part, "locshift");
    if (!locShift || locShift.count === 0) {
      return zeroPoint;
    }

    const normalizedDirection = normalizeDirection(direction);
    if (locShift.count <= normalizedDirection) {
      return zeroPoint;
    }

    return pointFromLingoValue(locShift.getAt(normalizedDirection + 1));
  }

  private getNumber(part: string, property: string, fallback: number): number {
    const value = this.getPartProperty(part, property);
    return numberFromLingoValue(value, fallback);
  }

  private getList(part: string, property: string): LingoList<unknown> | undefined {
    const value = this.getPartProperty(part, property);
    return value instanceof LingoList ? value : undefined;
  }

  private getPartProperty(part: string, property: string): unknown {
    const partProps = this.props?.getProp(part);
    if (!(partProps instanceof LingoPropertyList)) {
      return undefined;
    }

    return partProps.getProp(property);
  }
}

export function parseRoomObjectPartColors(value: string | undefined): readonly string[] {
  const items = (value && value.trim().length > 0 ? value : "0,0,0")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  while (items.length < 5) {
    items.push("*ffffff");
  }
  return items;
}

export function roomObjectPartColorToHex(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  // Numeric paletteIndex colors need palette resolution before they can be
  // faithfully applied. Leaving them undefined preserves the decoded source
  // bitmap instead of inventing a wrong RGB color.
  return undefined;
}

const zeroPoint: HabboRoomObjectPoint = { x: 0, y: 0 };

function normalizeDirection(value: number): number {
  const normalized = Math.trunc(value) % 8;
  return normalized < 0 ? normalized + 8 : normalized;
}

function numberFromLingoValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function pointFromLingoValue(value: unknown): HabboRoomObjectPoint {
  if (typeof value !== "string") {
    return zeroPoint;
  }

  const match = /^point\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/i.exec(value.trim());
  if (!match) {
    return zeroPoint;
  }

  return {
    x: Number.parseFloat(match[1] ?? "0") || 0,
    y: Number.parseFloat(match[2] ?? "0") || 0
  };
}
