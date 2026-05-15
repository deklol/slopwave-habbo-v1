import type { HabboClubRequest, HabboClubStatus } from "../../ui/HabboClubDialog";

export function readClubRequests(value: unknown): HabboClubRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboClubRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "SCR_GINFO"
        || command === "SCR_SUBSCRIBE"
        || command === "SCR_EXTSCR"
        || command === "GETAVAILABLEBADGES")
      && (record.status === "pending" || record.status === "sent");
  });
}

export function readClubStatus(value: unknown): HabboClubStatus | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Partial<HabboClubStatus>;
  if (
    (record.command !== "SCR_SINF" && record.command !== "SCR_NOSUB")
    || typeof record.productName !== "string"
    || typeof record.status !== "string"
    || (typeof record.daysLeft !== "number" && typeof record.daysLeft !== "string")
  ) {
    return undefined;
  }

  return {
    command: record.command,
    productName: record.productName,
    status: record.status,
    daysLeft: record.daysLeft,
    ...(typeof record.totalDaysLeft === "number" ? { totalDaysLeft: record.totalDaysLeft } : {}),
    ...(typeof record.daysLeftInCurrentPeriod === "number" ? { daysLeftInCurrentPeriod: record.daysLeftInCurrentPeriod } : {}),
    ...(typeof record.elapsedPeriods === "number" ? { elapsedPeriods: record.elapsedPeriods } : {}),
    ...(typeof record.prepaidPeriods === "number" ? { prepaidPeriods: record.prepaidPeriods } : {}),
    ...(typeof record.responseFlag === "number" ? { responseFlag: record.responseFlag } : {})
  };
}
