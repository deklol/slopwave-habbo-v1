export const HABBO_CLUB_WINDOW_ID = "clubinfo1";
export const HABBO_CLUB_TITLE_KEY = "club_habbo.window.title";
export const HABBO_CLUB_FALLBACK_TITLE = "Habbo Club";
export const HABBO_CLUB_TEMPLATE = "habbo_full.window";
export const HABBO_CLUB_INTRO_LAYOUT = "habbo_club_intro.window";
export const HABBO_CLUB_ACTIVATE_LAYOUT = "habbo_club_activate.window";
export const HABBO_CLUB_RENEW_ACTIVE_LAYOUT = "habbo_club_renew1.window";
export const HABBO_CLUB_RENEW_MANAGED_LAYOUT = "habbo_club_renew2.window";
export const HABBO_CLUB_THANKS_LAYOUT = "habbo_club_thanks.window";
export const HABBO_CLUB_EXPIRED_LAYOUT = "habbo_club_expired.window";
export const HABBO_CLUB_PERMISSION_LAYOUT = "habbo_club_permission.window";
export const HABBO_CLUB_CONFIRM_LAYOUT = "habbo_club_confirm.window";

export const HABBO_CLUB_SOURCE_X = 200;
export const HABBO_CLUB_SOURCE_Y = 200;

export const HABBO_CLUB_PRODUCT_NAME = "club_habbo";
export const HABBO_CLUB_NOTIFY_CONNECTION_ERROR = 1001;
export const HABBO_CLUB_NOTIFY_EXPIRED = 550;

export interface HabboClubStatus {
  readonly command: "SCR_SINF" | "SCR_NOSUB";
  readonly productName: string;
  readonly status: string;
  readonly daysLeft: number | string;
  readonly totalDaysLeft?: number;
  readonly daysLeftInCurrentPeriod?: number;
  readonly elapsedPeriods?: number;
  readonly prepaidPeriods?: number;
  readonly responseFlag?: number;
}

export interface HabboClubRequest {
  readonly id: number;
  readonly command: "SCR_GINFO" | "SCR_SUBSCRIBE" | "SCR_EXTSCR" | "GETAVAILABLEBADGES";
  readonly status: "pending" | "sent";
  readonly body?: string;
  readonly days?: number;
  readonly price?: number;
  readonly selection?: 1 | 2 | 3;
  readonly periods?: 1 | 3 | 6;
  readonly sourceCommand?: "SCR_BUY" | "SCR_SUBSCRIBE" | "SCR_EXTSCR";
}

export type HabboClubTextLookup = (key: string) => string | undefined;
export type HabboClubSessionLookup = (key: string) => string | undefined;

export const HABBO_CLUB_INTERFACE_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_club/casts/External/ParentScript 2 - Club Interface Class.ls";

export const HABBO_CLUB_COMPONENT_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_club/casts/External/ParentScript 3 - Club Component Class.ls";

export const HABBO_CLUB_HANDLER_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_club/casts/External/ParentScript 4 - Club Handler Class.ls";

export type HabboClubAction =
  | { readonly kind: "layout"; readonly layout: string }
  | { readonly kind: "continue" }
  | { readonly kind: "choose-period"; readonly period: 1 | 2 | 3 }
  | { readonly kind: "confirm-period" }
  | { readonly kind: "extend-layout"; readonly layout: string }
  | { readonly kind: "toggle-parent-permission" }
  | { readonly kind: "open-net-page"; readonly variableKey: string; readonly appendIdentity?: boolean; readonly target?: "_new" }
  | { readonly kind: "close" };

const sourceActions: Readonly<Record<string, HabboClubAction>> = {
  club_expired_link: { kind: "layout", layout: HABBO_CLUB_ACTIVATE_LAYOUT },
  button_buy: { kind: "layout", layout: HABBO_CLUB_ACTIVATE_LAYOUT },
  button_paycoins: { kind: "layout", layout: HABBO_CLUB_ACTIVATE_LAYOUT },
  habboclub_continue: { kind: "continue" },
  parent_permission_checkbox: { kind: "toggle-parent-permission" },
  club_change_subscription: { kind: "open-net-page", variableKey: "club_change_url", appendIdentity: true },
  club_link_whatis: { kind: "open-net-page", variableKey: "club_info_url" },
  button_paycash: { kind: "open-net-page", variableKey: "club_paybycash_url", appendIdentity: true, target: "_new" },
  club_link_paycash: { kind: "open-net-page", variableKey: "club_paybycash_url", appendIdentity: true, target: "_new" },
  club_button_extend: { kind: "extend-layout", layout: "habbo_club_buy.window" },
  club_button_1_period: { kind: "choose-period", period: 1 },
  club_button_2_period: { kind: "choose-period", period: 2 },
  club_button_3_period: { kind: "choose-period", period: 3 },
  club_confirm_ok: { kind: "confirm-period" },
  club_confirm_cancel: { kind: "close" },
  club_button_close: { kind: "close" },
  club_intro_link: { kind: "open-net-page", variableKey: "club_info_url" },
  club_general_infolink: { kind: "open-net-page", variableKey: "club_info_url" },
  club_isp_change: { kind: "open-net-page", variableKey: "club_change_url", appendIdentity: true },
  club_isp_buy: { kind: "open-net-page", variableKey: "club_paybycash_url", appendIdentity: true, target: "_new" },
  button_cancel: { kind: "close" },
  welcom_club_ok: { kind: "close" },
  close: { kind: "close" }
};

export function resolveClubAction(elementId: string): HabboClubAction | undefined {
  return sourceActions[elementId];
}

export function clubStatusFromNoSubscription(body: string): HabboClubStatus {
  return {
    command: "SCR_NOSUB",
    productName: body.trim() || HABBO_CLUB_PRODUCT_NAME,
    status: "inactive",
    daysLeft: 0
  };
}

export function clubStatusFromSubscriptionInfo(body: string, getText: HabboClubTextLookup): HabboClubStatus {
  const parts = body.includes("\t") ? body.split("\t") : body.trim().split(/\s+/);
  const productName = normalizeClubProductName((parts[0] ?? "").trim());
  const statusText = (parts[1] ?? "").trim() || "active";
  const rawDaysLeft = (parts[2] ?? "").trim();
  const daysLeftNumber = Number.parseInt(rawDaysLeft, 10);
  const elapsedPeriods = optionalInteger(parts[3]);
  const prepaidPeriods = optionalInteger(parts[4]);
  const responseFlag = optionalInteger(parts[5]);
  const totalDaysLeft = Number.isFinite(daysLeftNumber)
    ? calculateTotalClubDays(daysLeftNumber, prepaidPeriods)
    : undefined;
  return {
    command: "SCR_SINF",
    productName,
    status: statusText,
    daysLeft: rawDaysLeft === "-" || !Number.isFinite(daysLeftNumber)
      ? getText("club_member") ?? "Member"
      : daysLeftNumber,
    ...(totalDaysLeft !== undefined ? { totalDaysLeft } : {}),
    ...(Number.isFinite(daysLeftNumber) && (elapsedPeriods !== undefined || prepaidPeriods !== undefined)
      ? { daysLeftInCurrentPeriod: daysLeftNumber }
      : {}),
    ...(elapsedPeriods !== undefined ? { elapsedPeriods } : {}),
    ...(prepaidPeriods !== undefined ? { prepaidPeriods } : {}),
    ...(responseFlag !== undefined ? { responseFlag } : {})
  };
}

export function resolveClubStatusLayout(status: HabboClubStatus): string {
  if (status.status === "inactive") {
    return HABBO_CLUB_INTRO_LAYOUT;
  }

  return typeof status.daysLeft === "number"
    ? HABBO_CLUB_RENEW_ACTIVE_LAYOUT
    : HABBO_CLUB_RENEW_MANAGED_LAYOUT;
}

export function clubEntryBarText(status: HabboClubStatus | undefined, getText: HabboClubTextLookup): {
  readonly text1: string;
  readonly text2: string;
} {
  if (status?.status === "active") {
    const linkTemplate = getText("club_habbo.bottombar.link.member") ?? "%days% days";
    return {
      text1: getText("club_habbo.bottombar.text.member") ?? "Habbo Club",
      text2: linkTemplate.replaceAll("%days%", String(displayClubDaysLeft(status)))
    };
  }

  return {
    text1: getText("club_habbo.bottombar.text.notmember") ?? "Habbo Club",
    text2: getText("club_habbo.bottombar.link.notmember") ?? "Join!"
  };
}

export function clubHiddenElementsForLayout(layoutName: string, getText: HabboClubTextLookup): readonly string[] {
  const hidden: string[] = [];
  const hasPayByCashUrl = isClubHttpUrl(getText("club_paybycash_url"));
  const hasClubInfoUrl = isClubHttpUrl(getText("club_info_url"));

  if (layoutName === HABBO_CLUB_INTRO_LAYOUT && !hasPayByCashUrl) {
    hidden.push("club_link_paycash");
  }
  if (layoutName === HABBO_CLUB_INTRO_LAYOUT && !hasClubInfoUrl) {
    hidden.push("club_link_whatis");
  }
  if (layoutName === HABBO_CLUB_RENEW_ACTIVE_LAYOUT && !hasPayByCashUrl) {
    hidden.push("button_paycash");
  }

  return hidden;
}

export function clubTextOverridesForLayout(
  layoutName: string,
  status: HabboClubStatus | undefined,
  email: string,
  getText: HabboClubTextLookup
): Readonly<Record<string, string>> {
  const overrides: Record<string, string> = {};

  if (layoutName === HABBO_CLUB_RENEW_ACTIVE_LAYOUT && status) {
    const text = getText("club_txt_renew1");
    if (text !== undefined) {
      overrides.club_txt_renew1 = text.replaceAll("%days%", String(status.daysLeft));
    }
  }

  if (layoutName === HABBO_CLUB_THANKS_LAYOUT) {
    const text = getText("habboclub_thanks") ?? getText("club_txt_thanks");
    if (text !== undefined) {
      overrides.club_txt_thanks = text.replaceAll("%email%", email);
    }
  }

  return overrides;
}

export function resolveClubOpenNetPageUrl(
  action: Extract<HabboClubAction, { readonly kind: "open-net-page" }>,
  getText: HabboClubTextLookup,
  getSession: HabboClubSessionLookup
): string | undefined {
  const rawUrl = getText(action.variableKey);
  if (!rawUrl) {
    return undefined;
  }

  if (!action.appendIdentity) {
    return rawUrl;
  }

  const userName = getSession("user_name") ?? "";
  let url = `${rawUrl}${encodeURIComponent(userName)}`;
  const checksum = getSession("user_checksum");
  if (checksum !== undefined) {
    url = `${url}&sum=${encodeURIComponent(checksum)}`;
  }
  return url;
}

export function shouldRefreshClubWindowAfterStatus(status: HabboClubStatus): boolean {
  return status.status === "active";
}

function isClubHttpUrl(value: string | undefined): boolean {
  return typeof value === "string" && value.toLowerCase().startsWith("http");
}

function displayClubDaysLeft(status: HabboClubStatus): number | string {
  return status.totalDaysLeft ?? status.daysLeft;
}

function calculateTotalClubDays(daysLeft: number, prepaidPeriods: number | undefined): number {
  if (prepaidPeriods === undefined || prepaidPeriods <= 0) {
    return daysLeft;
  }
  return Math.max(0, daysLeft) + (Math.max(0, prepaidPeriods) * 31);
}

function normalizeClubProductName(value: string): string {
  if (!value || value === HABBO_CLUB_PRODUCT_NAME || value.endsWith("ub_habbo")) {
    return HABBO_CLUB_PRODUCT_NAME;
  }
  return value;
}

function optionalInteger(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}
