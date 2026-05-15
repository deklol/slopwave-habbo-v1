export interface HabboPurseRequest {
  readonly id: number;
  readonly command: "GETUSERCREDITLOG" | "REDEEM_VOUCHER";
  readonly status: "pending" | "sent";
  readonly code?: string;
}

export function readPurseRequests(value: unknown): HabboPurseRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboPurseRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "GETUSERCREDITLOG" || command === "REDEEM_VOUCHER")
      && (record.status === "pending" || record.status === "sent");
  });
}
