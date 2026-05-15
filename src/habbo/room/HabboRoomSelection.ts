export interface HabboRoomSelectionUser {
  readonly id: string;
  readonly name: string;
  readonly custom?: string;
  readonly badge?: string;
  readonly figureRaw?: string;
  readonly figure?: Readonly<Record<string, unknown>>;
  readonly sex?: "M" | "F";
  readonly dirHead?: number;
  readonly dirBody?: number;
  readonly infoImageDirHead?: number;
  readonly infoImageDirBody?: number;
  readonly x?: number;
  readonly y?: number;
}

export interface HabboRoomUserInfo {
  readonly selectedId: string;
  readonly selectedType: "user";
  readonly name: string;
  readonly custom: string;
  readonly badge: string;
  readonly figureRaw?: string;
  readonly figure?: Readonly<Record<string, unknown>>;
  readonly sex?: "M" | "F";
  readonly dirHead?: number;
  readonly dirBody?: number;
}

export type HabboRoomSelectableObjectKind = "active" | "passive" | "item";

export interface HabboRoomSelectionObject {
  readonly id: string;
  readonly className: string;
  readonly kind: HabboRoomSelectableObjectKind;
  readonly custom?: string;
  readonly itemType?: string;
}

export interface HabboRoomObjectInfo {
  readonly selectedId: string;
  readonly selectedType: HabboRoomSelectableObjectKind;
  readonly className: string;
  readonly name: string;
  readonly custom: string;
  readonly smallMemberName: string;
}

export function roomUserInteractiveId(userId: string): string {
  return `room_user:${userId}`;
}

export function parseRoomUserInteractiveId(elementId: string): string | undefined {
  return elementId.startsWith("room_user:") ? elementId.slice("room_user:".length) : undefined;
}

export function roomObjectInteractiveId(kind: HabboRoomSelectableObjectKind, objectId: string): string {
  return `room_object:${kind}:${objectId}`;
}

export function parseRoomObjectInteractiveId(elementId: string): { readonly kind: HabboRoomSelectableObjectKind; readonly objectId: string } | undefined {
  const parts = elementId.split(":");
  if (parts.length !== 3 || parts[0] !== "room_object") {
    return undefined;
  }

  const kind = parts[1];
  if (kind !== "active" && kind !== "passive" && kind !== "item") {
    return undefined;
  }

  const objectId = parts[2] ?? "";
  return objectId.length > 0 ? { kind, objectId } : undefined;
}

export function buildRoomUserInfo(user: HabboRoomSelectionUser): HabboRoomUserInfo {
  return {
    selectedId: user.id,
    selectedType: "user",
    name: user.name,
    custom: user.custom ?? "",
    badge: normalizeBadgeId(user.badge),
    ...(user.figureRaw !== undefined ? { figureRaw: user.figureRaw } : {}),
    ...(user.figure !== undefined ? { figure: user.figure } : {}),
    ...(user.sex !== undefined ? { sex: user.sex } : {}),
    ...(user.infoImageDirHead !== undefined || user.dirHead !== undefined ? { dirHead: user.infoImageDirHead ?? user.dirHead } : {}),
    ...(user.infoImageDirBody !== undefined || user.dirBody !== undefined ? { dirBody: user.infoImageDirBody ?? user.dirBody } : {})
  };
}

export function buildRoomObjectInfo(object: HabboRoomSelectionObject, lookupText: (key: string) => string | undefined): HabboRoomObjectInfo {
  const className = object.className;
  const sourceName = object.kind === "item"
    ? roomItemNameKey(object)
    : `furni_${className}_name`;
  const sourceCustom = object.kind === "item"
    ? roomItemDescriptionKey(object)
    : `furni_${className}_desc`;

  return {
    selectedId: object.id,
    selectedType: object.kind,
    className,
    name: lookupText(sourceName) ?? sourceName,
    custom: lookupText(sourceCustom) ?? sourceCustom,
    smallMemberName: roomObjectSmallMemberName(object)
  };
}

export function normalizeBadgeId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function nextBadgeIndex(currentIndex: number, badgeCount: number, direction: -1 | 1): number {
  if (badgeCount <= 0) {
    return 1;
  }

  const next = currentIndex + direction;
  if (next < 1) {
    return badgeCount;
  }

  if (next > badgeCount) {
    return 1;
  }

  return next;
}

export function resolveRoomUserControlType(selectedUserId: string, ownUserId: string, roomOwner: boolean, roomController: boolean): string {
  if (selectedUserId === ownUserId) {
    return "personal";
  }

  if (roomOwner) {
    return "owner";
  }

  if (roomController) {
    return "ctrl";
  }

  return "friend";
}

function roomObjectSmallMemberName(object: HabboRoomSelectionObject): string {
  if (object.kind === "item") {
    if (object.className === "poster" && object.itemType) {
      return `${object.className}_${object.itemType}_small`;
    }

    return `${object.className}_small`;
  }

  return `${object.className}_small`;
}

function roomItemNameKey(object: HabboRoomSelectionObject): string {
  if (object.className === "poster" && object.itemType) {
    return `poster_${object.itemType}_name`;
  }

  if (object.className === "post.it" || object.className === "post.it.vd" || object.className === "photo") {
    return `wallitem_${object.className}_name`;
  }

  return `wallitem_${object.className}_name`;
}

function roomItemDescriptionKey(object: HabboRoomSelectionObject): string {
  if (object.className === "poster" && object.itemType) {
    return `poster_${object.itemType}_desc`;
  }

  if (object.className === "post.it" || object.className === "post.it.vd" || object.className === "photo") {
    return `wallitem_${object.className}_desc`;
  }

  return `wallitem_${object.className}_desc`;
}
