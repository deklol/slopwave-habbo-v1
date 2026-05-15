import type { DirectorMemberManifest, DirectorSpriteChannelManifest } from "../../runtime";
import {
  coerceRecord,
  directorFontFamily,
  estimateVolterTextWidth,
  numberFromUnknown
} from "../HabboSourceValueHelpers";
import {
  parseRoomChatPacket,
  roomChatStyle,
  trimRoomChatMessage,
  type HabboRoomChatMessage,
  type HabboRoomChatMode
} from "./HabboRoomChat";
import {
  darkenBrightRoomChatColor,
  readRoomChatMessages
} from "./HabboRoomChatData";
import { readRoomVisual } from "./HabboRoomData";
import { readSpriteManifestArray } from "./HabboRoomObjectSpritePlanning";
import type { HabboRoomUserRecord } from "./HabboRoomUserData";

const roomHandlerClassSource = "hh_room/casts/External/ParentScript 5 - Room Handler Class.ls";
const roomBalloonManagerClassSource = "hh_room/casts/External/ParentScript 22 - Balloon Manager.ls";
const release1DynamicWorldSource = "MemberScript/casts/External/MovieScript 4 - Dynamic World.ls";
const release1BalloonClassSource = "MemberScript/casts/External/ParentScript 8 - Balloon Class.ls";

export interface HabboRoomBalloonsRuntimeHost {
  [key: string]: any;
  nextRoomChatMessageId: number;
  readonly movie: {
    readonly stage: { readonly width: number; readonly height: number };
    readonly cast: {
      importOrCreateCastLib(cast: { readonly number: number; readonly name: string; readonly fileName: string; readonly members: readonly DirectorMemberManifest[] }): void;
    };
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
  };
}

export const ROOM_BALLOON_AUTO_SCROLL_MS = 4000;
export const ROOM_BALLOON_MAX_VISIBLE = 7;
export const ROOM_BALLOON_MOVE_OFFSET_V = 21;
export const ROOM_BALLOON_SCROLL_STEP = 3;
export const ROOM_BALLOON_START_V = ((ROOM_BALLOON_MAX_VISIBLE - 1) * ROOM_BALLOON_MOVE_OFFSET_V) - 1;

export interface HabboRoomBalloonPosition {
  readonly message: HabboRoomChatMessage;
  readonly slotIndex: number;
  readonly locV: number;
}

export function roomBalloonScrollDurationMs(tempo: number): number {
  const frames = ROOM_BALLOON_MOVE_OFFSET_V / ROOM_BALLOON_SCROLL_STEP;
  const frameMs = 1000 / Math.max(1, Math.round(tempo) || 1);
  return Math.round(frames * frameMs);
}

export function visibleRoomBalloons(
  messages: readonly HabboRoomChatMessage[],
  nowMs: number
): readonly HabboRoomBalloonPosition[] {
  if (messages.length === 0) {
    return [];
  }

  const sorted = [...messages].sort((left, right) => left.createdAtMs - right.createdAtMs);
  const visible: HabboRoomBalloonPosition[] = [];
  for (const message of sorted) {
    const newerCount = sorted.filter((candidate) => candidate.createdAtMs > message.createdAtMs).length;
    const ageMs = Math.max(0, nowMs - message.createdAtMs);
    const idleScrollCount = Math.floor(ageMs / ROOM_BALLOON_AUTO_SCROLL_MS);
    const slotIndex = newerCount + idleScrollCount;
    if (slotIndex >= ROOM_BALLOON_MAX_VISIBLE) {
      continue;
    }

    visible.push({
      message,
      slotIndex,
      locV: ROOM_BALLOON_START_V - (slotIndex * ROOM_BALLOON_MOVE_OFFSET_V)
    });
  }

  return visible.sort((left, right) => right.slotIndex - left.slotIndex);
}

export function retainVisibleRoomChatMessages(
  messages: readonly HabboRoomChatMessage[],
  nowMs: number
): readonly HabboRoomChatMessage[] {
  const visibleIds = new Set(visibleRoomBalloons(messages, nowMs).map((entry) => entry.message.id));
  return messages.filter((message) => visibleIds.has(message.id));
}

export function handleRoomChatPacketRuntime(host: HabboRoomBalloonsRuntimeHost, body: string, mode: HabboRoomChatMode, release: string): boolean {
    const packet = parseRoomChatPacket(body, mode);
    if (!packet) {
      host.recordUnsupportedOnce(`room-chat-packet-parse-failed:${mode}`, {
        subsystem: "network",
        feature: "room-chat-packet-parse-failed",
        detail: `${release} Room Handler Class received ${mode}, but the browser body reader could not decode the user id and message`,
        source: `extracted/projectorrays/${release}/${roomHandlerClassSource}`
      });
      return false;
    }

    const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
    const user = users[packet.userId] ?? Object.values(users).find((candidate) => candidate.id === packet.userId);
    if (!user) {
      host.logDebug("room", "warn", `${mode} ignored missing user=${packet.userId}`);
      return false;
    }

    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    const roomData = visual?.roomData;
    const anchorX = roomData
      ? host.resolveRoomUserScreenPosition(user, roomData, 0, 0).screen.x
      : undefined;
    const message: HabboRoomChatMessage = {
      ...packet,
      id: `room.chat.${host.nextRoomChatMessageId++}`,
      name: user.name,
      color: darkenBrightRoomChatColor(user.figure.ch?.color ?? "#eeeeee"),
      createdAtMs: Math.max(
        numberFromUnknown(host.movie.getProperty("roomChatElapsedMs")),
        ...readRoomChatMessages(host.movie.getProperty("roomChatMessages")).map((entry) => entry.createdAtMs + 1),
        0
      ),
      ...(anchorX !== undefined ? { anchorX } : {})
    };
    host.movie.setProperty("roomChatElapsedMs", message.createdAtMs);
    const nextMessages = [...readRoomChatMessages(host.movie.getProperty("roomChatMessages")), message].slice(-7);
    host.movie.setProperty("roomChatMessages", nextMessages);
    host.movie.setProperty("lastRoomChatMessage", message);
    host.renderRoomChatBalloons(release);
    host.logDebug("room", "ok", `${mode} user=${user.name} length=${message.message.length}`);
    return true;
  }


export function renderRoomChatBalloonsRuntime(host: HabboRoomBalloonsRuntimeHost, release: string): void {
    const messages = readRoomChatMessages(host.movie.getProperty("roomChatMessages"));
    const positions = visibleRoomBalloons(messages, numberFromUnknown(host.movie.getProperty("roomChatElapsedMs")));
    if (positions.length === 0) {
      host.movie.setProperty("roomChatOverlaySprites", []);
      host.syncDirectorOverlaySprites();
      return;
    }

    if (release.startsWith("release1_roseau_dcr0910") && renderRelease1RoomChatBalloonsRuntime(host, release, positions)) {
      return;
    }

    const leftAsset = host.getBitmapAssetByMemberName("balloon.left", ["hh_room"]);
    const middleAsset = host.getBitmapAssetByMemberName("balloon.middle", ["hh_room"]);
    if (!leftAsset || !middleAsset) {
      host.recordUnsupportedOnce("room-balloon-assets-missing", {
        subsystem: "habbo",
        feature: "room-balloon-assets-missing",
        detail: `${release} Balloon Manager Class needs balloon.left and balloon.middle bitmap members, but one or both could not be resolved from loaded room casts`,
        source: `extracted/projectorrays/${release}/${roomBalloonManagerClassSource}`
      });
      return;
    }

    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    const roomData = visual?.roomData;
    const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
    const runtimeCastLib = host.getRuntimeRoomChatCastSlot();
    const maxWidth = Math.max(1, host.movie.stage.width - 10);
    const leftMargin = host.getIntVariable("balloons.leftmargin", 0);
    const rightMargin = host.getIntVariable("balloons.rightmargin", host.movie.stage.width);
    // Balloon Manager copies the original member images into an 8-bit buffer
    // with [#color: tBalloonColor]. Using pre-matted ink8 strips here removes
    // the black shape pixels before the source color operation can happen.
    const leftPath = leftAsset.pngPath;
    const middlePath = middleAsset.pngPath;
    const leftWidth = Math.max(1, leftAsset.width);
    const rightWidth = leftWidth;
    const height = Math.max(1, leftAsset.height);
    const members: DirectorMemberManifest[] = [];
    const sprites: DirectorSpriteChannelManifest[] = [];
    const roomUserSprites = readSpriteManifestArray(host.movie.getProperty("roomUserOverlaySprites"));
    const locZBase = roomUserSprites.reduce((max, sprite) => Math.max(max, sprite.locZ ?? 0), 0) + 20;

    for (let index = 0; index < positions.length; index++) {
      const position = positions[index];
      if (!position) {
        continue;
      }
      const message = position.message;

      const user = users[message.userId] ?? Object.values(users).find((candidate) => candidate.id === message.userId);
      const style = roomChatStyle(message.mode);
      const text = trimRoomChatMessage(message.message);
      const nameText = `${message.name}: `;
      const fullText = `${nameText}${text}`;
      const sourceTextWidth = estimateVolterTextWidth(fullText) + (leftWidth * 4);
      const textWidth = Math.min(Math.max(1, sourceTextWidth), maxWidth - 16 - leftWidth);
      const width = Math.min(maxWidth, Math.max(leftWidth + rightWidth + 1, textWidth + 16));
      const middleWidth = Math.max(1, width - leftWidth - rightWidth);
      const nameWidth = Math.min(textWidth, estimateVolterTextWidth(nameText));
      const messageWidth = Math.max(1, textWidth - nameWidth);
      const memberNumber = index + 1;
      const headScreen = user && roomData
        ? host.resolveRoomUserScreenPosition(user, roomData, 0, 0).screen
        : { x: host.movie.stage.width / 2, y: 0, locZ: 0 };
      const centerX = typeof message.anchorX === "number" ? message.anchorX : headScreen.x;
      const clampedCenterX = Math.max(leftMargin + (width / 2), Math.min(rightMargin - (width / 2), centerX));
      const centerY = position.locV;

      members.push({
        number: memberNumber,
        name: `runtime.room.chat.${message.id}`,
        type: "bitmap",
        width,
        height,
        regPoint: { x: Math.round(width / 2), y: Math.round(height / 2) },
        composite: {
          width,
          height,
          layers: [
            {
              fillColor: "#ffffff",
              x: 0,
              y: 0,
              width,
              height
            },
            {
              assetPath: leftPath,
              x: 0,
              y: 0,
              width: leftWidth,
              height,
              sourceWidth: leftWidth,
              sourceHeight: height,
              tint: message.color,
              copyPixelsColor: true,
              ink: 0
            },
            {
              assetPath: middlePath,
              x: leftWidth,
              y: 0,
              width: middleWidth,
              height,
              sourceWidth: middleAsset.width,
              sourceHeight: middleAsset.height,
              tint: message.color,
              copyPixelsColor: true,
              ink: 0
            },
            {
              assetPath: leftPath,
              x: leftWidth + middleWidth,
              y: 0,
              width: rightWidth,
              height,
              sourceWidth: leftWidth,
              sourceHeight: height,
              flipH: true,
              tint: message.color,
              copyPixelsColor: true,
              ink: 0
            },
            {
              text: nameText,
              x: 8,
              y: 5,
              width: nameWidth,
              height: 11,
              color: "#000000",
              fontFamily: directorFontFamily("Volter (Goldfish)"),
              fontSize: 9,
              fontWeight: "700",
              fontStyle: "normal",
              lineHeight: 10
            },
            {
              text,
              x: 8 + nameWidth,
              y: 5,
              width: messageWidth,
              height: 11,
              color: "#000000",
              fontFamily: directorFontFamily("Volter (Goldfish)"),
              fontSize: 9,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              lineHeight: 10
            }
          ]
        }
      });
      sprites.push({
        channel: 5000 + memberNumber,
        member: {
          castLib: runtimeCastLib,
          member: memberNumber
        },
        loc: {
          x: clampedCenterX,
          y: centerY
        },
        width,
        height,
        locZ: locZBase + index,
        visible: true,
        ink: 8
      });
    }

    host.movie.cast.importOrCreateCastLib({
      number: runtimeCastLib,
      name: "runtime_room_chat",
      fileName: "runtime-room-chat",
      members
    });
    host.resourceManager.preIndexMembers();
    host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
    host.movie.setProperty("runtimeRoomChatCastLib", runtimeCastLib);
    host.movie.setProperty("roomChatOverlaySprites", sprites);
    host.syncDirectorOverlaySprites();
    host.recordUnsupportedOnce("room-balloon-manager-rendering-partial", {
      subsystem: "habbo",
      feature: "room-balloon-manager-rendering-partial",
      detail: `${release} Balloon Manager Class now decodes room chat packets and renders source-backed balloon bitmaps with source constants and idle autoscroll; pulse opening and exact alpha-hit event broker routing remain partial`,
      source: `extracted/projectorrays/${release}/${roomBalloonManagerClassSource}`
    });
  }

function renderRelease1RoomChatBalloonsRuntime(
  host: HabboRoomBalloonsRuntimeHost,
  release: string,
  positions: readonly HabboRoomBalloonPosition[]
): boolean {
    const pulseAsset = release1RoomBalloonAsset(host, "balloonpulse");
    if (!pulseAsset) {
      host.recordUnsupportedOnce?.("release1-room-balloon-pulse-missing", {
        subsystem: "habbo",
        feature: "release1-room-balloon-pulse-missing",
        detail: `${release} Balloon Class requested balloonpulse, but no release1 bitmap asset was available`,
        source: `extracted/projectorrays/${release}/${release1BalloonClassSource}`
      });
      return false;
    }

    const visual = readRoomVisual(host.movie.getProperty("currentRoomVisual"));
    const roomData = visual?.roomData;
    const users = coerceRecord(host.objectManager.getObject("#room_component")?.get("userObjects")) as Record<string, HabboRoomUserRecord>;
    const runtimeCastLib = host.getRuntimeRoomChatCastSlot();
    const maxH = host.movie.stage.width;
    const members: DirectorMemberManifest[] = [];
    const sprites: DirectorSpriteChannelManifest[] = [];
    const roomUserSprites = readSpriteManifestArray(host.movie.getProperty("roomUserOverlaySprites"));
    const locZBase = Math.max(10000000, roomUserSprites.reduce((max, sprite) => Math.max(max, sprite.locZ ?? 0), 0) + 20);

    for (let index = 0; index < positions.length; index += 1) {
      const position = positions[index];
      if (!position) {
        continue;
      }

      const message = position.message;
      const user = users[message.userId] ?? Object.values(users).find((candidate) => candidate.id === message.userId || candidate.name === message.userId);
      const style = roomChatStyle(message.mode);
      const text = trimRoomChatMessage(message.message);
      const nameText = `${message.name}: `;
      const fullText = `${nameText}${text}`;
      const sourceWidth = Math.max(25, Math.min(575, Math.ceil((estimateVolterTextWidth(fullText) + 60) / 25) * 25));
      const textBoxAsset = release1RoomBalloonAsset(host, `textbox_${sourceWidth}`);
      if (!textBoxAsset) {
        host.recordUnsupportedOnce?.(`release1-room-balloon-textbox-missing:${sourceWidth}`, {
          subsystem: "habbo",
          feature: "release1-room-balloon-textbox-missing",
          detail: `${release} Balloon Class requested textbox_${sourceWidth}, but no release1 bitmap asset was available`,
          source: `extracted/projectorrays/${release}/${release1BalloonClassSource}`
        });
        continue;
      }

      const headScreen = user && roomData
        ? host.resolveRoomUserScreenPosition(user, roomData, 0, 0).screen
        : { x: host.movie.stage.width / 2, y: 0, locZ: 0 };
      const width = Math.max(sourceWidth, textBoxAsset.width);
      const height = Math.max(1, textBoxAsset.height);
      const rawDestX = (typeof message.anchorX === "number" ? message.anchorX : headScreen.x) + 36;
      const destX = Math.max(1 + (width / 2), Math.min(maxH - (width / 2), rawDestX));
      const destY = 99 - (position.slotIndex * 22);
      const nameWidth = Math.min(width - 50, estimateVolterTextWidth(nameText));
      const messageWidth = Math.max(1, width - 50 - nameWidth);
      const memberNumber = index + 1;

      members.push({
        number: memberNumber,
        name: `runtime.room.chat.${message.id}`,
        type: "bitmap",
        width,
        height,
        regPoint: { x: Math.round(width / 2), y: Math.round(height / 2) },
        composite: {
          width,
          height,
          layers: [
            {
              assetPath: textBoxAsset.pngPath,
              x: 0,
              y: 0,
              width,
              height,
              sourceWidth: textBoxAsset.width,
              sourceHeight: textBoxAsset.height,
              ink: 8
            },
            {
              text: nameText,
              x: 25,
              y: 5,
              width: nameWidth,
              height: 11,
              color: "#000000",
              fontFamily: directorFontFamily("Volter (Goldfish)"),
              fontSize: 9,
              fontWeight: "700",
              fontStyle: "normal",
              lineHeight: 10
            },
            {
              text,
              x: 25 + nameWidth,
              y: 5,
              width: messageWidth,
              height: 11,
              color: "#000000",
              fontFamily: directorFontFamily("Volter (Goldfish)"),
              fontSize: 9,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              lineHeight: 10
            }
          ]
        }
      });
      sprites.push({
        channel: 5000 + memberNumber,
        member: {
          castLib: runtimeCastLib,
          member: memberNumber
        },
        loc: {
          x: destX,
          y: destY
        },
        width,
        height,
        locZ: locZBase + index,
        visible: true,
        ink: 8
      });
    }

    if (members.length === 0) {
      host.movie.setProperty("roomChatOverlaySprites", []);
      host.syncDirectorOverlaySprites();
      return true;
    }

    host.movie.cast.importOrCreateCastLib({
      number: runtimeCastLib,
      name: "runtime_room_chat",
      fileName: "runtime-room-chat",
      members
    });
    host.resourceManager.preIndexMembers();
    host.movie.setProperty("indexedMemberCount", host.resourceManager.indexedMemberCount);
    host.movie.setProperty("runtimeRoomChatCastLib", runtimeCastLib);
    host.movie.setProperty("roomChatOverlaySprites", sprites);
    host.movie.setProperty("release1RoomChatBalloonRender", {
      messageCount: members.length,
      source: [
        `extracted/projectorrays/${release}/${release1DynamicWorldSource}`,
        `extracted/projectorrays/${release}/${release1BalloonClassSource}`
      ]
    });
    host.syncDirectorOverlaySprites();
    host.recordUnsupportedOnce?.("release1-room-balloon-animation-partial", {
      subsystem: "habbo",
      feature: "release1-room-balloon-animation-partial",
      detail: `${release} Balloon Class now uses release1 textbox assets and source placement constants for final chat bubbles; pulse and zoom phases remain partial`,
      source: `extracted/projectorrays/${release}/${release1BalloonClassSource}`
    });
    return true;
  }

function release1RoomBalloonAsset(host: HabboRoomBalloonsRuntimeHost, memberName: string): {
  readonly memberName: string;
  readonly pngPath: string;
  readonly width: number;
  readonly height: number;
} | undefined {
    const getter = host.getBitmapAssetByMemberName as
      | ((name: string, preferredCasts?: readonly string[]) => { readonly memberName: string; readonly pngPath: string; readonly width: number; readonly height: number } | undefined)
      | undefined;
    return getter?.call(host, memberName, ["interface_gfx", "gf_gamehall", "Goldfish_prv_gfx", "MemberScript"]);
  }


export function advanceRoomChatBalloonsRuntime(host: HabboRoomBalloonsRuntimeHost, deltaMs: number, release: string): boolean {
    const messages = readRoomChatMessages(host.movie.getProperty("roomChatMessages"));
    if (messages.length === 0) {
      return false;
    }

    const previousElapsed = numberFromUnknown(host.movie.getProperty("roomChatElapsedMs"));
    const nextElapsed = previousElapsed + Math.max(0, deltaMs);
    const previousSignature = host.roomBalloonPositionSignature(messages, previousElapsed);
    const retainedMessages = retainVisibleRoomChatMessages(messages, nextElapsed);
    const nextSignature = host.roomBalloonPositionSignature(retainedMessages, nextElapsed);
    host.movie.setProperty("roomChatElapsedMs", nextElapsed);
    if (retainedMessages.length !== messages.length) {
      host.movie.setProperty("roomChatMessages", retainedMessages);
    }

    if (previousSignature === nextSignature && retainedMessages.length === messages.length) {
      return false;
    }

    host.renderRoomChatBalloons(release);
    return true;
  }


export function roomBalloonPositionSignatureRuntime(host: HabboRoomBalloonsRuntimeHost, messages: readonly HabboRoomChatMessage[], elapsedMs: number): string {
    return visibleRoomBalloons(messages, elapsedMs)
      .map((entry) => `${entry.message.id}:${entry.slotIndex}:${entry.locV}`)
      .join("|");
  }

