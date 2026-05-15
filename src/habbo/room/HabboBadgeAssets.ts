import { normalizeBadgeId } from "./HabboRoomSelection";

export function normalizeBadgeMemberId(value: unknown): string {
  return normalizeBadgeId(value).replace(/^badge\s+/i, "").trim();
}

export function isHabboClubBadge(value: unknown): boolean {
  return /^HC[12]$/i.test(normalizeBadgeMemberId(value));
}

export function badgeMemberName(value: unknown): string {
  const badgeId = normalizeBadgeMemberId(value);
  return badgeId ? `badge ${badgeId}` : "";
}
