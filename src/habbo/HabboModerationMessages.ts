export function normalizeModeratorErrorMessage(body: string): string {
  const text = String(body ?? "").replaceAll("\u0000", "").trim();
  const marker = "mod_warn";
  const markerIndex = text.toLowerCase().indexOf(marker);
  if (markerIndex < 0) {
    return text;
  }

  const afterMarker = text.slice(markerIndex + marker.length);
  return afterMarker.replace(/^[/:\s]+/, "").trim() || text;
}

export function normalizeModeratorAlertMessage(body: string): string {
  return String(body ?? "").replaceAll("\u0000", "").trim();
}

export function normalizeSystemBroadcastMessage(body: string): string {
  return String(body ?? "")
    .replaceAll("\u0000", "")
    .replaceAll("\\r", "\r")
    .replaceAll("\r\n", "\r")
    .replaceAll("\n", "\r")
    .replace(/<br\s*\/?>/gi, "\r");
}
