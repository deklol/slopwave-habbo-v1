export interface HabboMessengerBuddy {
  readonly id: string;
  readonly name: string;
  readonly msg: string;
  readonly unit: string;
  readonly lastAccessTime: string;
  readonly online: boolean;
  readonly sex: "M" | "F";
  readonly emailOk?: boolean;
  readonly figure?: string;
}

export interface HabboMessengerBuddyList {
  readonly buddies: Readonly<Record<string, HabboMessengerBuddy>>;
  readonly online: readonly string[];
  readonly offline: readonly string[];
  readonly render: readonly string[];
}

export interface HabboMessengerMessage {
  readonly id: string;
  readonly senderID: string;
  readonly recipients: string;
  readonly time: string;
  readonly message: string;
  readonly figureData: string;
}

export interface HabboMessengerSearchResult {
  readonly name: string;
  readonly customText: string;
  readonly lastAccess: string;
  readonly location: string;
  readonly figureData: string;
  readonly sex: "M" | "F";
  readonly found: boolean;
}

export interface HabboMessengerRequest {
  readonly id: number;
  readonly command:
    | "MESSENGER_INIT"
    | "MESSENGER_SENDUPDATE"
    | "MESSENGER_MARKREAD"
    | "MESSENGER_SENDMSG"
    | "MESSENGER_SENDEMAILMSG"
    | "MESSENGER_ASSIGNPERSMSG"
    | "MESSENGER_ACCEPTBUDDY"
    | "MESSENGER_DECLINEBUDDY"
    | "MESSENGER_REQUESTBUDDY"
    | "MESSENGER_REMOVEBUDDY"
    | "FINDUSER";
  readonly status: "pending" | "sent";
  readonly body?: string;
  readonly name?: string;
  readonly context?: "MESSENGER";
  readonly receivers?: readonly string[];
  readonly message?: string;
  readonly messageId?: string;
  readonly senderId?: string;
}

export function createEmptyMessengerBuddyList(): HabboMessengerBuddyList {
  return {
    buddies: {},
    online: [],
    offline: [],
    render: []
  };
}

export function readMessengerRequests(value: unknown): HabboMessengerRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboMessengerRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "MESSENGER_INIT"
        || command === "MESSENGER_SENDUPDATE"
        || command === "MESSENGER_MARKREAD"
        || command === "MESSENGER_SENDMSG"
        || command === "MESSENGER_SENDEMAILMSG"
        || command === "MESSENGER_ASSIGNPERSMSG"
        || command === "MESSENGER_ACCEPTBUDDY"
        || command === "MESSENGER_DECLINEBUDDY"
        || command === "MESSENGER_REQUESTBUDDY"
        || command === "MESSENGER_REMOVEBUDDY"
        || command === "FINDUSER")
      && (record.status === "pending" || record.status === "sent");
  });
}

export function readMessengerBuddyList(value: unknown): HabboMessengerBuddyList {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return createEmptyMessengerBuddyList();
  }

  const record = value as Record<string, unknown>;
  const buddiesRecord = coerceRecord(record.buddies);
  const buddies: Record<string, HabboMessengerBuddy> = {};
  for (const [id, entry] of Object.entries(buddiesRecord)) {
    const buddy = readMessengerBuddy(entry);
    if (buddy) {
      buddies[id] = buddy;
    }
  }

  const online = Array.isArray(record.online) ? record.online.map((entry) => String(entry)).filter(Boolean) : [];
  const offline = Array.isArray(record.offline) ? record.offline.map((entry) => String(entry)).filter(Boolean) : [];
  const render = Array.isArray(record.render) ? record.render.map((entry) => String(entry)).filter(Boolean) : [...online, ...offline];
  return { buddies, online, offline, render };
}

export function parseMessengerBuddyListPacket(body: string): HabboMessengerBuddyList {
  const lines = body.split(/\r?\n|\r/);
  const buddies: Record<string, HabboMessengerBuddy> = {};
  const online: string[] = [];
  const offline: string[] = [];
  for (let index = 0; index < lines.length; index += 2) {
    const firstLine = lines[index] ?? "";
    const secondLine = lines[index + 1] ?? "";
    if (firstLine.trim().length <= 0) {
      continue;
    }

    const { info, support } = splitBuddyInfoAndSupport(firstLine);
    const tabParts = info.split("\t");
    const words = info.trim().split(/\s+/);
    const id = (tabParts[0] ?? words[0] ?? "").trim();
    const name = (tabParts[1] ?? words[1] ?? "").trim();
    const msg = (tabParts.length >= 3 ? tabParts.slice(2).join("\t") : words.slice(2).join(" ")).trim();
    const [unitRaw = "", lastAccessTime = ""] = secondLine.split("\t");
    const unit = unitRaw === "ENTERPRISESERVER" ? "Messenger" : unitRaw;
    const buddy: HabboMessengerBuddy = {
      id,
      name,
      msg,
      unit,
      lastAccessTime,
      online: unit.length > 2,
      emailOk: support.includes("email_ok"),
      sex: /sex=f/i.test(support) ? "F" : "M"
    };
    if (!id || !name) {
      continue;
    }
    buddies[id] = buddy;
    if (buddy.online) {
      online.push(name);
    } else {
      offline.push(name);
    }
  }

  online.sort((left, right) => left.localeCompare(right));
  offline.sort((left, right) => left.localeCompare(right));
  return {
    buddies,
    online,
    offline,
    render: [...online, ...offline]
  };
}

export function mergeMessengerBuddyLists(current: HabboMessengerBuddyList, update: HabboMessengerBuddyList): HabboMessengerBuddyList {
  const buddies = {
    ...current.buddies,
    ...update.buddies
  };
  const online = new Set(current.online);
  const offline = new Set(current.offline);
  for (const buddy of Object.values(update.buddies)) {
    online.delete(buddy.name);
    offline.delete(buddy.name);
    if (buddy.online) {
      online.add(buddy.name);
    } else {
      offline.add(buddy.name);
    }
  }
  const onlineList = [...online].sort((left, right) => left.localeCompare(right));
  const offlineList = [...offline].sort((left, right) => left.localeCompare(right));
  return {
    buddies,
    online: onlineList,
    offline: offlineList,
    render: [...onlineList, ...offlineList]
  };
}

export function parseMessengerBuddyRequestsPacket(body: string): readonly string[] {
  return body
    .replace(/\u0002/g, "/")
    .split(/[\r\n\t/]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry.toUpperCase() !== "BUDDYADDREQUESTS");
}

export function parseMessengerMessagePacket(body: string): HabboMessengerMessage | undefined {
  const lines = body.split(/\r?\n|\r/);
  const id = lines[0] ?? "";
  const senderID = lines[1] ?? "";
  if (!id || !senderID) {
    return undefined;
  }
  const meaningfulLines = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
  const figureData = meaningfulLines.length > 5 ? meaningfulLines[meaningfulLines.length - 1] ?? "" : "";
  const messageEnd = figureData ? meaningfulLines.length - 1 : meaningfulLines.length;

  return {
    id,
    senderID,
    recipients: lines[2] ?? "",
    time: lines[3] ?? "",
    message: meaningfulLines.slice(4, Math.max(4, messageEnd)).join("\r"),
    figureData
  };
}

export function readMessengerMessage(value: unknown): HabboMessengerMessage | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "");
  const senderID = String(record.senderID ?? "");
  if (!id || !senderID) {
    return undefined;
  }
  return {
    id,
    senderID,
    recipients: String(record.recipients ?? ""),
    time: String(record.time ?? ""),
    message: String(record.message ?? ""),
    figureData: String(record.figureData ?? "")
  };
}

export function parseMessengerMemberInfoPacket(body: string, fallbackName: string): HabboMessengerSearchResult | undefined {
  const lines = body.split(/\r?\n|\r/);
  const first = lines[0]?.trim() ?? "";
  if (first.toUpperCase().startsWith("MESSENGER")) {
    const sex = String(lines[6] ?? "M").toUpperCase().startsWith("F") ? "F" : "M";
    return {
      name: lines[1] ?? fallbackName,
      customText: stripEnclosingQuotes(lines[2] ?? ""),
      lastAccess: lines[3] ?? "",
      location: lines[4] ?? "",
      figureData: lines[5] ?? "",
      sex,
      found: true
    };
  }

  const name = first || fallbackName;
  if (!name) {
    return undefined;
  }

  return {
    name,
    customText: "",
    lastAccess: "",
    location: "",
    figureData: "",
    sex: "M",
    found: true
  };
}

export function readMessengerSearchResult(value: unknown): HabboMessengerSearchResult | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const name = String(record.name ?? "");
  if (!name) {
    return undefined;
  }
  return {
    name,
    customText: String(record.customText ?? ""),
    lastAccess: String(record.lastAccess ?? ""),
    location: String(record.location ?? ""),
    figureData: String(record.figureData ?? ""),
    sex: String(record.sex ?? "M").toUpperCase().startsWith("F") ? "F" : "M",
    found: record.found !== false
  };
}

export function parseMessengerNoSuchUserName(body: string): string {
  const words = body.trim().split(/\s+/);
  if (words[0]?.toUpperCase() === "MESSENGER") {
    return words[1] ?? "";
  }
  return words[0] ?? "";
}

function readMessengerBuddy(value: unknown): HabboMessengerBuddy | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const name = String(record.name ?? "").trim();
  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name,
    msg: String(record.msg ?? ""),
    unit: String(record.unit ?? ""),
    lastAccessTime: String(record.lastAccessTime ?? record.last_access_time ?? ""),
    online: Boolean(record.online),
    sex: String(record.sex ?? "M").toUpperCase().startsWith("F") ? "F" : "M",
    emailOk: Boolean(record.emailOk),
    ...(typeof record.figure === "string" ? { figure: record.figure } : {})
  };
}

function splitBuddyInfoAndSupport(line: string): { readonly info: string; readonly support: string } {
  const slashIndex = line.indexOf("/");
  if (slashIndex < 0) {
    return { info: line, support: "" };
  }

  const beforeSupport = line.slice(0, slashIndex);
  const support = line.slice(slashIndex + 1);
  return { info: beforeSupport, support };
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stripEnclosingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return trimmed.slice(1, -1);
  }
  return value;
}
