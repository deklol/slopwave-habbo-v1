import { HabboPacketBodyReader } from "../../protocol";

export type HabboNavigatorView = "unit" | "flat" | "own" | "src" | "fav" | "mod" | "none";

export interface HabboNavigatorNodeInfo {
  readonly id: string;
  readonly nodeType: number;
  readonly name: string;
  readonly percentFilled: number;
  readonly parentid: string;
  readonly children?: Readonly<Record<string, HabboNavigatorNodeInfo>>;
  readonly unitStrId?: string;
  readonly port?: number;
  readonly door?: string | number;
  readonly casts?: readonly string[];
  readonly flatId?: string;
  readonly owner?: string;
  readonly usercount?: number;
  readonly maxUsers?: number;
  readonly description?: string;
  readonly nodeMask?: number;
  readonly usersInQueue?: number;
  readonly isVisible?: boolean;
}

export interface HabboNavigatorCategoryIndexEntry {
  readonly name: string;
  readonly parentid: string;
  readonly children: readonly string[];
}

export interface HabboNavigatorPacketResult {
  readonly node: HabboNavigatorNodeInfo;
  readonly categoryIndex: Readonly<Record<string, HabboNavigatorCategoryIndexEntry>>;
}

export interface HabboNavigatorRequest {
  readonly id: number;
  readonly command:
    | "NAVIGATE"
    | "GETUSERFLATCATS"
    | "GETFLATINFO"
    | "GOTOFLAT"
    | "SUSERF"
    | "SRCHF"
    | "GETFVRF"
    | "ADD_FAVORITE_ROOM"
    | "DEL_FAVORITE_ROOM"
    | "CREATEFLAT"
    | "SETFLATINFO"
    | "SETFLATCAT";
  readonly status: "pending" | "sent";
  readonly nodeId?: string;
  readonly nodeMask?: number;
  readonly flatId?: string;
  readonly roomType?: number;
  readonly userName?: string;
  readonly query?: string;
  readonly body?: string;
  readonly categoryId?: string;
  readonly depth?: number;
}

export interface HabboNavigatorHistory {
  readonly text: string;
  readonly items: readonly string[];
}

export function parseNavigatorNodeInfoPacket(body: string, release: string): HabboNavigatorPacketResult | undefined {
  const reader = new HabboPacketBodyReader(body);
  const usesRelease14NavigatorShape = release.startsWith("release14");
  const nodeMask = usesRelease14NavigatorShape ? reader.readInt() : undefined;
  const root = parseNavigatorNode(reader, usesRelease14NavigatorShape, nodeMask);
  if (!root) {
    return undefined;
  }

  const categoryIndex: Record<string, HabboNavigatorCategoryIndexEntry> = {
    [root.id]: {
      name: root.name,
      parentid: root.parentid,
      children: []
    }
  };
  const rootChildren: Record<string, HabboNavigatorNodeInfo> = {
    ...(coerceRecord(root.children) as Record<string, HabboNavigatorNodeInfo>)
  };

  while (!reader.exhausted) {
    const node = parseNavigatorNode(reader, usesRelease14NavigatorShape, nodeMask);
    if (!node) {
      break;
    }

    if (node.parentid === root.id) {
      rootChildren[node.id] = node;
    }

    const parentEntry = categoryIndex[node.parentid];
    if (parentEntry) {
      categoryIndex[node.parentid] = {
        ...parentEntry,
        children: [...parentEntry.children, node.id]
      };
    }

    if (node.nodeType === 0) {
      categoryIndex[node.id] = {
        name: node.name,
        parentid: node.parentid,
        children: Object.keys(coerceRecord(node.children))
      };
    }
  }

  return {
    node: {
      ...root,
      children: rootChildren
    },
    categoryIndex
  };
}

export function parseNavigatorUserFlatCategoriesPacket(body: string): Record<string, string> {
  const reader = new HabboPacketBodyReader(body);
  const count = reader.readInt();
  const categories: Record<string, string> = {};
  for (let index = 0; index < count && !reader.exhausted; index++) {
    const id = String(reader.readInt());
    categories[id] = reader.readString();
  }
  return categories;
}

export function parseNavigatorFlatResultsPacket(body: string, mode: HabboNavigatorView): HabboNavigatorNodeInfo {
  const children: Record<string, HabboNavigatorNodeInfo> = {};
  for (const line of body.split(/\r?\n|\r/)) {
    if (!line.trim()) {
      continue;
    }

    const parts = line.split("\t");
    const flatId = parts[0] ?? "";
    if (!flatId) {
      continue;
    }

    const id = `f_${flatId}`;
    children[id] = {
      id,
      flatId,
      nodeType: 2,
      name: parts[1] ?? "",
      owner: parts[2] ?? "",
      door: parts[3] ?? "open",
      port: Number.parseInt(parts[4] ?? "0", 10) || 0,
      usercount: Number.parseInt(parts[5] ?? "0", 10) || 0,
      description: parts[7] ?? "",
      percentFilled: 0,
      parentid: mode
    };
  }

  return {
    id: mode,
    nodeType: 0,
    name: mode,
    percentFilled: 0,
    parentid: "0",
    children
  };
}

export function isNavigatorNodeInfo(value: unknown): value is HabboNavigatorNodeInfo {
  return typeof value === "object"
    && value !== null
    && "id" in value
    && typeof value.id === "string"
    && "nodeType" in value
    && typeof value.nodeType === "number"
    && "name" in value
    && typeof value.name === "string";
}

export function readNavigatorRequests(value: unknown): HabboNavigatorRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is HabboNavigatorRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const command = record.command;
    return typeof record.id === "number"
      && (command === "NAVIGATE"
        || command === "GETUSERFLATCATS"
        || command === "GETFLATINFO"
        || command === "GOTOFLAT"
        || command === "SUSERF"
        || command === "SRCHF"
        || command === "GETFVRF"
        || command === "ADD_FAVORITE_ROOM"
        || command === "DEL_FAVORITE_ROOM"
        || command === "CREATEFLAT"
        || command === "SETFLATINFO"
        || command === "SETFLATCAT")
      && (record.status === "pending" || record.status === "sent");
  });
}

export function readNavigatorHistoryItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => typeof entry === "string" ? entry : "")
    .filter((entry) => entry.length > 0);
}

export function navigatorViewForWindow(windowName: string): HabboNavigatorView {
  if (windowName.startsWith("nav_pr")) {
    return "unit";
  }
  if (windowName === "nav_gr0" || windowName.startsWith("nav_gr_password")) {
    return "flat";
  }
  if (windowName.startsWith("nav_gr_own")) {
    return "own";
  }
  if (windowName.startsWith("nav_gr_src")) {
    return "src";
  }
  if (windowName.startsWith("nav_gr_fav")) {
    return "fav";
  }
  if (windowName.includes("mod") || windowName.includes("modify")) {
    return "mod";
  }
  return "none";
}

export function navigatorStatusIndex(node: HabboNavigatorNodeInfo): number {
  const status = Number.isFinite(node.percentFilled)
    ? node.percentFilled / 100
    : (node.usercount ?? 0) / 25;
  if (status <= 0) {
    return 1;
  }
  if (status < 0.34) {
    return 2;
  }
  if (status < 0.78) {
    return 3;
  }
  return 4;
}

export function navigatorStatusColor(statusIndex: number): string {
  switch (statusIndex) {
    case 2:
      return navigatorPaletteIndexColor(128);
    case 3:
      return navigatorPaletteIndexColor(129);
    case 4:
      return navigatorPaletteIndexColor(130);
    default:
      return navigatorPaletteIndexColor(81);
  }
}

export function navigatorPaletteIndexColor(index: number): string {
  // Source: hh_navigator/nav_ui_palette, CLUT-432.bin. Navigator Window Interface Class
  // uses paletteIndex(81), 82, 128, 129, and 130 when generating room-list buffers.
  switch (index) {
    case 81:
      return "#c0c0c0";
    case 82:
      return "#dadada";
    case 128:
      return "#63c07f";
    case 129:
      return "#eacd5d";
    case 130:
      return "#ee636c";
    default:
      return "#dadada";
  }
}

export function navigatorDoorIconName(door: string | number | undefined): string {
  const normalized = String(door ?? "open").toLowerCase();
  if (normalized === "closed" || normalized === "1") {
    return "door_closed";
  }
  if (normalized === "password" || normalized === "2") {
    return "door_password";
  }
  return "door_open";
}

function parseNavigatorNode(
  reader: HabboPacketBodyReader,
  usesRelease14NavigatorShape: boolean,
  nodeMask?: number
): HabboNavigatorNodeInfo | undefined {
  const nodeId = reader.readInt();
  if (nodeId <= 0) {
    return undefined;
  }

  const nodeType = reader.readInt();
  const name = reader.readString();
  const percentFilled = reader.readInt();
  const maxUsers = usesRelease14NavigatorShape ? reader.readInt() : undefined;
  const parentid = String(reader.readInt());
  if (!usesRelease14NavigatorShape) {
    reader.readInt();
  }

  if (nodeType === 1) {
    const unitStrId = reader.readString();
    const port = reader.readInt();
    const door = reader.readInt();
    const casts = reader.readString().split(",").filter(Boolean);
    const usersInQueue = usesRelease14NavigatorShape ? reader.readInt() : undefined;
    const isVisible = usesRelease14NavigatorShape ? reader.readBooleanByte() : undefined;
    return {
      id: String(nodeId),
      nodeType,
      name,
      percentFilled,
      parentid,
      ...(maxUsers !== undefined ? { maxUsers } : {}),
      ...(nodeMask !== undefined ? { nodeMask } : {}),
      unitStrId,
      port,
      door,
      casts,
      ...(usersInQueue !== undefined ? { usersInQueue } : {}),
      ...(isVisible !== undefined ? { isVisible } : {})
    };
  }

  if (nodeType === 2) {
    const flatCount = reader.readInt();
    const children: Record<string, HabboNavigatorNodeInfo> = {};
    for (let index = 0; index < flatCount; index++) {
      const flatId = String(reader.readInt());
      const id = `f_${flatId}`;
      children[id] = {
        id,
        flatId,
        nodeType: 2,
        name: reader.readString(),
        owner: reader.readString(),
        door: reader.readString(),
        usercount: reader.readInt(),
        ...(usesRelease14NavigatorShape ? { maxUsers: reader.readInt() } : {}),
        description: reader.readString(),
        percentFilled: 0,
        parentid: String(nodeId),
        ...(nodeMask !== undefined ? { nodeMask } : {})
      };
    }

    return {
      id: String(nodeId),
      nodeType: 0,
      name,
      percentFilled,
      parentid,
      ...(maxUsers !== undefined ? { maxUsers } : {}),
      ...(nodeMask !== undefined ? { nodeMask } : {}),
      children
    };
  }

  return {
    id: String(nodeId),
    nodeType,
    name,
    percentFilled,
    parentid,
    ...(maxUsers !== undefined ? { maxUsers } : {}),
    ...(nodeMask !== undefined ? { nodeMask } : {}),
    children: {}
  };
}

function coerceRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
