import type { HabboWindowLayoutElement } from "../HabboBootServices";

export interface HabboWindowCloseMatch {
  readonly reason: "element-id" | "key" | "member";
  readonly value: string;
}

const closeElementIds = new Set([
  "close",
  "purse_close",
  "hubu_close",
  "game_close"
]);

const closeKeys = new Set([
  "close",
  "hubu_close"
]);

const closeMemberNames = [
  "button.close",
  "dialog_close",
  "kiosk_close",
  "link_close",
  "purse_close"
];

export function classifySourceWindowCloseElement(
  elementId: string,
  element?: HabboWindowLayoutElement
): HabboWindowCloseMatch | undefined {
  const normalizedId = normalizeCloseToken(elementId);
  if (closeElementIds.has(normalizedId)) {
    return { reason: "element-id", value: normalizedId };
  }

  const key = normalizeCloseToken(String(element?.key ?? element?.properties.key ?? ""));
  if (key && closeKeys.has(key)) {
    return { reason: "key", value: key };
  }

  const memberName = normalizeCloseToken(element?.resolvedMember?.memberName ?? element?.memberName ?? "");
  if (memberName && closeMemberNames.some((name) => memberName.includes(name))) {
    return { reason: "member", value: memberName };
  }

  return undefined;
}

function normalizeCloseToken(value: string): string {
  return value
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}
