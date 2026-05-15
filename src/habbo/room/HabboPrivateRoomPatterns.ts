import type { HabboRoomPattern } from "./HabboRoomData";
import { rgbToHex } from "../HabboSourceValueHelpers";

export function resolvePrivateRoomFloorMemberName(memberName: string, pattern: HabboRoomPattern): string | undefined {
  if (/^floor\d/i.test(memberName)) {
    const floorToken = pattern.type.toLowerCase().startsWith("floor") ? pattern.type : `floor${pattern.type}`;
    return memberName.replace(/^floor\d+/i, floorToken);
  }

  const flatMatch = /^(flat_(?:floor|sfloor|sstair|stair)_)\d(_.+)$/i.exec(memberName);
  if (flatMatch?.[1] && flatMatch[2]) {
    const flatPatternToken = pattern.type.replace(/^floor/i, "");
    return `${flatMatch[1]}${flatPatternToken}${flatMatch[2]}`;
  }

  return undefined;
}

export function resolvePrivateRoomWallMemberName(memberName: string, pattern: HabboRoomPattern): string | undefined {
  const release1Match = /^(left|right|leftmask|rightmask)wall\d+(.+)$/i.exec(memberName);
  if (release1Match?.[1] && release1Match[2]) {
    const wallToken = pattern.type.toLowerCase().startsWith("wall") ? pattern.type : `wall${pattern.type}`;
    return `${release1Match[1]}${wallToken}${release1Match[2]}`;
  }

  const match = /^(left|right|corner)_([^_]+)_\d(.+)$/i.exec(memberName);
  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }

  const wallPatternToken = pattern.type.replace(/^wall/i, "");
  return `${match[1]}_${match[2]}_${wallPatternToken}${match[3]}`;
}

export function isPrivateRoomFloorVisualElement(memberName: string, typeDef: string | undefined): boolean {
  if (typeDef === "floor") {
    return true;
  }

  return /^floor\d/i.test(memberName) || /^flat_(?:floor|sfloor|sstair|stair)_\d_/i.test(memberName);
}

export function isPrivateRoomWallVisualElement(memberName: string, typeDef: string | undefined): boolean {
  if (typeDef === "wallleft" || typeDef === "wallright") {
    return true;
  }

  return /^(left|right|corner)_[^_]+_\d/i.test(memberName)
    || /^(left|right|leftmask|rightmask)wall\d/i.test(memberName);
}

export function colorForPrivateRoomWallMember(memberName: string, pattern: HabboRoomPattern): string {
  const normalized = memberName.toLowerCase();
  if (normalized.startsWith("right_") || normalized.startsWith("rightwall")) {
    return pattern.color;
  }

  if (normalized.startsWith("corner_")) {
    const data = normalized.slice(-8);
    return data.charAt(1) === "a" ? pattern.color : offsetHexColor(pattern.color, -16);
  }

  return offsetHexColor(pattern.color, -16);
}

function offsetHexColor(color: string, amount: number): string {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match?.[1] || !match[2] || !match[3]) {
    return color;
  }

  return rgbToHex(
    Number.parseInt(match[1], 16) + amount,
    Number.parseInt(match[2], 16) + amount,
    Number.parseInt(match[3], 16) + amount
  );
}
