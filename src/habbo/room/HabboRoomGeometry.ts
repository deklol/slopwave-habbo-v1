import type { DirectorMember } from "../../runtime";

export interface HabboRoomCoordinate {
  readonly x: number;
  readonly y: number;
  readonly locZ: number;
}

export interface HabboScreenRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function roomCoordinateToStage(
  roomData: Readonly<Record<string, string | number>>,
  rectLeft: number,
  rectTop: number,
  x: number,
  y: number,
  h: number
): HabboRoomCoordinate {
  const factorX = numberFromRoomData(roomData, "factorx", 64);
  const factorY = numberFromRoomData(roomData, "factory", 32);
  const factorH = numberFromRoomData(roomData, "factorh", 32);
  const offsetX = numberFromRoomData(roomData, "offsetx", 0);
  const offsetY = numberFromRoomData(roomData, "offsety", 0);
  const offsetZ = numberFromRoomData(roomData, "offsetz", 0);
  return {
    x: directorInteger(rectLeft + ((x - y) * (factorX * 0.5)) + offsetX),
    y: directorInteger(rectTop + ((y + x) * (factorY * 0.5)) + offsetY - (h * factorH)),
    locZ: directorInteger((1000 * (x + y + 1)) + offsetZ)
  };
}

export function spriteRectForLoc(
  loc: Pick<HabboRoomCoordinate, "x" | "y">,
  member: Pick<DirectorMember, "width" | "height" | "regPoint">
): HabboScreenRect {
  const left = loc.x - member.regPoint.x;
  const top = loc.y - member.regPoint.y;
  return {
    left,
    top,
    right: left + (member.width ?? 0),
    bottom: top + (member.height ?? 0)
  };
}

export function rectsIntersect(left: HabboScreenRect, right: HabboScreenRect): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

export function directorInteger(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function roomStageToWorldCoordinate(
  roomData: Readonly<Record<string, string | number>>,
  locX: number,
  locY: number,
  heightMapText: string
): { readonly x: number; readonly y: number; readonly h: number } | undefined {
  const heightMap = parseRoomHeightMap(heightMapText);
  if (heightMap.length === 0) {
    return undefined;
  }

  const factorX = numberFromRoomData(roomData, "factorx", 64);
  const factorY = numberFromRoomData(roomData, "factory", 32);
  const factorH = numberFromRoomData(roomData, "factorh", 32);
  const offsetX = numberFromRoomData(roomData, "offsetx", 0);
  const offsetY = numberFromRoomData(roomData, "offsety", 0);
  const tryResolve = (heightOffset: number): { readonly x: number; readonly y: number; readonly h: number } | undefined => {
    const x = directorInteger(((locX - factorY - offsetX) / factorX) + ((locY + (heightOffset * factorH) - offsetY) / factorY));
    const y = directorInteger(((locY + (heightOffset * factorH) - offsetY) / factorY) - ((locX - factorY - offsetX) / factorX));
    const height = heightAtRoomCoordinate(heightMap, x, y);
    return height === heightOffset ? { x, y, h: height } : undefined;
  };

  const flatTile = tryResolve(0);
  if (flatTile) {
    return flatTile;
  }

  for (let height = 1; height <= 9; height++) {
    const elevatedTile = tryResolve(height);
    if (elevatedTile) {
      return elevatedTile;
    }
  }

  return undefined;
}

export function parseRoomHeightMap(text: string): number[][] {
  const rows: number[][] = [];
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  const rawRows = normalized.includes("\n") ? normalized.split("\n") : normalized.split(/\s+/);
  for (const rawLine of rawRows) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    const row: number[] = [];
    for (const char of line) {
      if (char === "x") {
        row.push(200000);
      } else if (char === "y") {
        row.push(0);
      } else if (char >= "A" && char < "I") {
        row.push(char.charCodeAt(0) - "A".charCodeAt(0));
      } else {
        const parsed = Number.parseInt(char, 10);
        row.push(Number.isFinite(parsed) ? parsed : 200000);
      }
    }
    rows.push(row);
  }
  return rows;
}

export function heightAtRoomCoordinate(heightMap: readonly (readonly number[])[], x: number, y: number): number {
  if (y < 0 || y >= heightMap.length) {
    return -1;
  }

  const row = heightMap[y];
  if (!row || x < 0 || x >= row.length) {
    return -1;
  }

  const height = row[x] ?? -1;
  return height >= 100000 ? -1 : height;
}

export function numberFromRoomData(roomData: Readonly<Record<string, string | number>>, key: string, fallback: number): number {
  const value = roomData[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
