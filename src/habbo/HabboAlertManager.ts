import { LingoPropertyList, LingoSymbol } from "../lingo";

export interface HabboAlertDescriptor {
  readonly id: string;
  readonly titleKey?: string;
  readonly messageKey?: string;
  readonly linkKey?: string;
  readonly title: string;
  readonly message: string;
  readonly link: string;
  readonly modal: boolean;
  readonly template: "habbo_alert_a.window" | "habbo_alert_b.window" | "habbo_alert_c.window";
  readonly raw: unknown;
}

export class HabboAlertManager {
  private readonly activeAlerts = new Map<string, HabboAlertDescriptor>();

  show(rawPayload: unknown, getText: (key: string) => string | undefined): HabboAlertDescriptor {
    const payload = normalizeAlertPayload(rawPayload);
    const id = payload.id || "habbo_alert";
    const titleKey = payload.hasTitle ? payload.title : "win_error";
    const messageKey = payload.msg || "";
    const linkKey = payload.link || "";
    const title = resolveAlertText(titleKey, getText);
    const message = resolveAlertText(messageKey || String(rawPayload ?? ""), getText);
    const link = resolveAlertText(linkKey, getText);
    const template = link.length > 0
      ? "habbo_alert_c.window"
      : title.length > 0
        ? "habbo_alert_a.window"
        : "habbo_alert_b.window";
    const alert: HabboAlertDescriptor = {
      id,
      ...(titleKey ? { titleKey } : {}),
      ...(messageKey ? { messageKey } : {}),
      ...(linkKey ? { linkKey } : {}),
      title,
      message,
      link,
      modal: payload.modal,
      template,
      raw: rawPayload
    };

    this.activeAlerts.set(id, alert);
    return alert;
  }

  close(id: string): boolean {
    return this.activeAlerts.delete(id);
  }

  get(id: string): HabboAlertDescriptor | undefined {
    return this.activeAlerts.get(id);
  }

  list(): readonly HabboAlertDescriptor[] {
    return [...this.activeAlerts.values()];
  }
}

function normalizeAlertPayload(rawPayload: unknown): { readonly id: string; readonly title: string; readonly hasTitle: boolean; readonly msg: string; readonly link: string; readonly modal: boolean } {
  if (rawPayload instanceof LingoPropertyList) {
    return {
      id: stringifyLingoValue(rawPayload.getProp("#id")),
      title: stringifyLingoValue(rawPayload.getProp("#title")),
      hasTitle: rawPayload.hasProp("#title"),
      msg: stringifyLingoValue(rawPayload.getProp("#msg") ?? rawPayload.getProp("#Msg")),
      link: stringifyLingoValue(rawPayload.getProp("#link")),
      modal: isTruthyLingoValue(rawPayload.getProp("#modal"))
    };
  }

  if (typeof rawPayload === "object" && rawPayload !== null && !Array.isArray(rawPayload)) {
    const record = rawPayload as Record<string, unknown>;
    const hasTitle = Object.prototype.hasOwnProperty.call(record, "title")
      || Object.prototype.hasOwnProperty.call(record, "Title")
      || Object.prototype.hasOwnProperty.call(record, "#title");
    return {
      id: stringifyLingoValue(record.id ?? record["#id"]),
      title: stringifyLingoValue(record.title ?? record.Title ?? record["#title"]),
      hasTitle,
      msg: stringifyLingoValue(record.msg ?? record.Msg ?? record.message ?? record.Message ?? record["#msg"] ?? record["#Msg"]),
      link: stringifyLingoValue(record.link ?? record.Link ?? record["#link"]),
      modal: isTruthyLingoValue(record.modal ?? record.Modal ?? record["#modal"])
    };
  }

  return {
    id: "",
    title: "",
    hasTitle: false,
    msg: stringifyLingoValue(rawPayload),
    link: "",
    modal: false
  };
}

function resolveAlertText(keyOrText: string, getText: (key: string) => string | undefined): string {
  if (!keyOrText) {
    return "";
  }

  return getText(keyOrText) ?? keyOrText;
}

function stringifyLingoValue(value: unknown): string {
  if (value instanceof LingoSymbol) {
    return value.name;
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function isTruthyLingoValue(value: unknown): boolean {
  if (value instanceof LingoSymbol) {
    return value.name.length > 0;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }

  return Boolean(value);
}
