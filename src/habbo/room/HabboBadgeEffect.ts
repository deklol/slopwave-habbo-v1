import { normalizeBadgeId } from "./HabboRoomSelection";

export interface HabboBadgeEffectPoint {
  readonly x: number;
  readonly y: number;
}

export interface HabboBadgeEffectStep {
  readonly elapsedMs: number;
  readonly frame: number;
  readonly point: HabboBadgeEffectPoint;
  readonly changed: boolean;
}

const badgeEffectFrameCount = 9;
const badgeEffectFrameDurationMs = 200;

export function isBadgeEffectBadge(badgeId: string): boolean {
  return normalizeBadgeId(badgeId).replace(/^badge\s+/i, "").trim().toUpperCase() === "HC2";
}

export function badgeEffectFrame(elapsedMs: number): number {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return Math.floor(safeElapsed / badgeEffectFrameDurationMs) % badgeEffectFrameCount + 1;
}

export function nextBadgeEffectStep(
  previousElapsedMs: number,
  previousFrame: number,
  previousPoint: HabboBadgeEffectPoint | undefined,
  deltaMs: number,
  bounds: { readonly width: number; readonly height: number }
): HabboBadgeEffectStep {
  const elapsedMs = Math.max(0, previousElapsedMs) + Math.max(0, deltaMs);
  const frame = badgeEffectFrame(elapsedMs);
  const cycle = Math.floor(elapsedMs / (badgeEffectFrameDurationMs * badgeEffectFrameCount));
  const shouldMove = frame === 1 && frame !== previousFrame;
  const point = previousPoint && !shouldMove
    ? previousPoint
    : deterministicBadgeEffectPoint(cycle, bounds);

  return {
    elapsedMs,
    frame,
    point,
    changed: frame !== previousFrame || shouldMove || previousPoint === undefined
  };
}

export function deterministicBadgeEffectPoint(
  cycle: number,
  bounds: { readonly width: number; readonly height: number }
): HabboBadgeEffectPoint {
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));
  return {
    x: Math.floor((cycle * 17 + 5) % width),
    y: Math.floor((cycle * 11 + 3) % height)
  };
}
