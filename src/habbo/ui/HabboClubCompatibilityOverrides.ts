import type {
  HabboExternalCastWindowLayoutSet,
  HabboWindowBitmapAssetSet
} from "../HabboBootServices";
import type { HabboClubStatus } from "./HabboClubDialog";

export type HabboClubUiMode = "release14-status" | "release7-source";
export type HabboClubPeriodSelection = 1 | 2 | 3;
export type HabboClubPeriodCount = 1 | 3 | 6;

export interface HabboClubPeriodChoice {
  readonly selection: HabboClubPeriodSelection;
  readonly periods: HabboClubPeriodCount;
  readonly days: number;
  readonly price: number;
}

export const HABBO_CLUB_DEFAULT_UI_MODE: HabboClubUiMode = "release14-status";
export const HABBO_CLUB_V7_SOURCE_UI_MODE: HabboClubUiMode = "release7-source";

export const HABBO_CLUB_V14_SOURCE =
  "extracted/projectorrays/release14.1_b8/hh_club/casts/External/ParentScript 2 - Club Interface Class.ls";

export const HABBO_CLUB_V14_STATUS_LAYOUT = "habbo_club_status.window";
export const HABBO_CLUB_V14_BUY_LAYOUT = "habbo_club_buy.window";
export const HABBO_CLUB_V14_BUY_JP_LAYOUT = "habbo_club_buy_jp.window";
export const HABBO_CLUB_V14_CONFIRM_LAYOUT = "release14.habbo_club_confirm.window";
export const HABBO_CLUB_V14_ENDED_LAYOUT = "habbo_club_ended.window";

const release14ClubWindowNames = new Set([
  HABBO_CLUB_V14_STATUS_LAYOUT,
  HABBO_CLUB_V14_BUY_LAYOUT,
  HABBO_CLUB_V14_BUY_JP_LAYOUT,
  "habbo_club_confirm.window",
  HABBO_CLUB_V14_ENDED_LAYOUT
]);

const release14ClubWindowAliases = new Map([
  ["habbo_club_confirm.window", HABBO_CLUB_V14_CONFIRM_LAYOUT]
]);

const fallbackPeriodChoices: Readonly<Record<HabboClubPeriodSelection, HabboClubPeriodChoice>> = {
  1: { selection: 1, periods: 1, days: 30, price: 25 },
  2: { selection: 2, periods: 3, days: 93, price: 60 },
  3: { selection: 3, periods: 6, days: 186, price: 105 }
};

export function normalizeHabboClubUiMode(value: unknown): HabboClubUiMode {
  switch (String(value ?? "").toLowerCase()) {
    case "release7-source":
    case "v7":
    case "source":
      return HABBO_CLUB_V7_SOURCE_UI_MODE;
    default:
      return HABBO_CLUB_DEFAULT_UI_MODE;
  }
}

export function resolveRelease14ClubLayout(
  status: HabboClubStatus,
  hasPayByCashUrl: boolean
): string {
  if (status.status === "inactive") {
    return hasPayByCashUrl ? HABBO_CLUB_V14_BUY_JP_LAYOUT : HABBO_CLUB_V14_BUY_LAYOUT;
  }

  const compatibleStatus = compatibleRelease14ClubStatus(status);
  if (compatibleStatus.daysLeft === 0 && compatibleStatus.elapsedPeriods > 0) {
    return HABBO_CLUB_V14_ENDED_LAYOUT;
  }

  return HABBO_CLUB_V14_STATUS_LAYOUT;
}

export function compatibleRelease14ClubStatus(status: HabboClubStatus): {
  readonly daysLeft: number;
  readonly elapsedPeriods: number;
  readonly prepaidPeriods: number;
} {
  const sourceDaysLeft = status.daysLeftInCurrentPeriod ?? status.daysLeft;
  const rawDaysLeft = typeof sourceDaysLeft === "number" && Number.isFinite(sourceDaysLeft)
    ? Math.max(0, Math.trunc(sourceDaysLeft))
    : 0;
  const derivedPrepaid = rawDaysLeft > 31 ? Math.floor((rawDaysLeft - 1) / 31) : 0;
  const derivedDaysLeft = rawDaysLeft > 31 ? ((rawDaysLeft - 1) % 31) + 1 : rawDaysLeft;

  return {
    daysLeft: status.daysLeftInCurrentPeriod ?? derivedDaysLeft,
    elapsedPeriods: status.elapsedPeriods ?? 0,
    prepaidPeriods: status.prepaidPeriods ?? derivedPrepaid
  };
}

export function resolveHabboClubPeriodChoice(
  selection: HabboClubPeriodSelection,
  getText: (key: string) => string | undefined
): HabboClubPeriodChoice {
  const fallback = fallbackPeriodChoices[selection];
  const days = numberText(getText(`habboclub_price${selection}.days`), fallback.days);
  const price = numberText(getText(`habboclub_price${selection}`), fallback.price);
  return {
    ...fallback,
    days,
    price
  };
}

export function withRelease14ClubWindowLayouts(
  releaseSet: HabboExternalCastWindowLayoutSet | undefined,
  release14Set: HabboExternalCastWindowLayoutSet | undefined
): HabboExternalCastWindowLayoutSet | undefined {
  if (!releaseSet) {
    return releaseSet;
  }

  const release14ClubWindows = release14Set?.windows.filter((window) => release14ClubWindowNames.has(window.memberName));
  if (!release14ClubWindows || release14ClubWindows.length === 0) {
    return releaseSet;
  }

  const existingNames = new Set(releaseSet.windows.map((window) => window.memberName.toLowerCase()));
  const compatibleWindows = release14ClubWindows
    .map((window) => {
      const alias = release14ClubWindowAliases.get(window.memberName);
      if (!alias) {
        return window;
      }

      return {
        ...window,
        memberName: alias,
        windowName: alias.replace(/\.window$/i, "")
      };
    })
    .filter((window) => !existingNames.has(window.memberName.toLowerCase()));
  if (compatibleWindows.length === 0) {
    return releaseSet;
  }

  return {
    ...releaseSet,
    windowCount: releaseSet.windows.length + compatibleWindows.length,
    bitmapReferenceCount: releaseSet.bitmapReferenceCount + compatibleWindows.reduce((count, window) => count + window.bitmapReferences.length, 0),
    unresolvedReferenceCount: releaseSet.unresolvedReferenceCount + compatibleWindows.reduce((count, window) => count + window.unresolvedReferences.length, 0),
    windows: [...releaseSet.windows, ...compatibleWindows]
  };
}

export function withRelease14ClubWindowBitmaps(
  releaseSet: HabboWindowBitmapAssetSet | undefined,
  release14Set: HabboWindowBitmapAssetSet | undefined
): HabboWindowBitmapAssetSet | undefined {
  if (!releaseSet || !release14Set || release14Set.assets.length === 0) {
    return releaseSet;
  }

  return {
    ...releaseSet,
    assetCount: releaseSet.assets.length + release14Set.assets.length,
    unsupportedCount: releaseSet.unsupportedCount + release14Set.unsupportedCount,
    assets: [...releaseSet.assets, ...release14Set.assets],
    windows: [...releaseSet.windows, ...release14Set.windows],
    unsupported: [...releaseSet.unsupported, ...release14Set.unsupported]
  };
}

function numberText(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
