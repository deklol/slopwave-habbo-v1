export const HABBO_ROOM_HAND_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 10 - Container Hand Class.ls";

export const HABBO_ROOM_HAND_VISUAL = "habbo_hand.visual";
export const HABBO_ROOM_HAND_VISUALIZER_ID = "Hand_visualizer";

export const HABBO_ROOM_HAND_INITIAL_ORIGIN = {
  x: 694,
  y: -137
} as const;

export const HABBO_ROOM_HAND_ANIM_LOCS = [
  { x: -54, y: 27 },
  { x: -42, y: 21 },
  { x: -36, y: 18 },
  { x: -28, y: 14 },
  { x: -22, y: 11 },
  { x: -18, y: 9 },
  { x: -12, y: 6 },
  { x: -10, y: 5 },
  { x: -8, y: 4 }
] as const;

export type HabboRoomHandAnimationMode = "open" | "close";
export type HabboRoomHandStripMode = "new" | "next" | "last";

export type HabboRoomHandElementAction =
  | { readonly kind: "next"; readonly stripMode: HabboRoomHandStripMode }
  | { readonly kind: "item"; readonly index: number };

export interface HabboRoomHandStripItemLike {
  readonly id: string;
  readonly stripId?: string;
  readonly objectId?: string;
  readonly kind: "stuff" | "item";
  readonly className: string;
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly customData?: string;
}

export type HabboRoomHandPlacementAction =
  | {
      readonly kind: "active";
      readonly objectId: string;
      readonly stripId: string;
      readonly className: string;
      readonly width: number;
      readonly height: number;
      readonly direction: 0;
      readonly colors?: string;
    }
  | {
      readonly kind: "decor";
      readonly stripId: string;
      readonly className: "floor" | "wallpaper";
      readonly body: string;
    }
  | {
      readonly kind: "wall-item";
      readonly stripId: string;
      readonly objectId: string;
      readonly className: string;
      readonly itemType: string;
      readonly removeStripAtStart: boolean;
    }
  | {
      readonly kind: "unsupported";
      readonly stripId: string;
      readonly className: string;
      readonly reason: "unknown-item-class";
    };

export interface HabboRoomHandAnimationState {
  readonly mode: HabboRoomHandAnimationMode;
  readonly frame: number;
  readonly elapsedMs: number;
  readonly originX: number;
  readonly originY: number;
  readonly handMemberName: "room_hand_1" | "room_hand_2" | "room_hand_3";
  readonly maskVisible: boolean;
  readonly maskBlend: number;
  readonly itemsVisible: boolean;
  readonly nextVisible: boolean;
}

export interface HabboRoomHandAnimationStep {
  readonly state?: HabboRoomHandAnimationState;
  readonly changed: boolean;
  readonly removed: boolean;
}

export function createRoomHandOpenAnimationState(): HabboRoomHandAnimationState {
  return {
    mode: "open",
    frame: 1,
    elapsedMs: 0,
    originX: HABBO_ROOM_HAND_INITIAL_ORIGIN.x,
    originY: HABBO_ROOM_HAND_INITIAL_ORIGIN.y,
    handMemberName: "room_hand_1",
    maskVisible: true,
    maskBlend: 0,
    itemsVisible: false,
    nextVisible: false
  };
}

export function readRoomHandAnimationState(value: unknown): HabboRoomHandAnimationState | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Partial<HabboRoomHandAnimationState>;
  if (record.mode !== "open" && record.mode !== "close") {
    return undefined;
  }

  if (
    typeof record.frame !== "number"
    || typeof record.elapsedMs !== "number"
    || typeof record.originX !== "number"
    || typeof record.originY !== "number"
    || (record.handMemberName !== "room_hand_1" && record.handMemberName !== "room_hand_2" && record.handMemberName !== "room_hand_3")
    || typeof record.maskVisible !== "boolean"
    || typeof record.maskBlend !== "number"
    || typeof record.itemsVisible !== "boolean"
    || typeof record.nextVisible !== "boolean"
  ) {
    return undefined;
  }

  return {
    mode: record.mode,
    frame: clampRoomHandFrame(record.frame),
    elapsedMs: Math.max(0, record.elapsedMs),
    originX: record.originX,
    originY: record.originY,
    handMemberName: record.handMemberName,
    maskVisible: record.maskVisible,
    maskBlend: record.maskBlend,
    itemsVisible: record.itemsVisible,
    nextVisible: record.nextVisible
  };
}

export function roomHandItemElementIndex(elementId: string): number | undefined {
  const match = /^room_hand_item_(\d+)(?:_sd)?$/.exec(elementId);
  if (!match) {
    return undefined;
  }

  const index = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(index) ? index : undefined;
}

export function resolveRoomHandElementAction(
  elementId: string,
  nextVisible: boolean
): HabboRoomHandElementAction | undefined {
  if (elementId === "room_hand_next" && nextVisible) {
    return { kind: "next", stripMode: "next" };
  }

  const itemIndex = roomHandItemElementIndex(elementId);
  return itemIndex !== undefined ? { kind: "item", index: itemIndex } : undefined;
}

export function resolveRoomHandPlacementAction(item: HabboRoomHandStripItemLike): HabboRoomHandPlacementAction {
  const stripId = String(item.stripId ?? item.id).trim();
  const objectId = String(item.objectId ?? item.id).trim();
  const className = item.className.trim();
  if (item.kind === "stuff") {
    return {
      kind: "active",
      objectId: objectId || stripId,
      stripId,
      className,
      width: safePositiveInt(item.width, 1),
      height: safePositiveInt(item.height, 1),
      direction: 0,
      ...(item.color !== undefined && item.color.trim().length > 0 ? { colors: item.color.trim() } : {})
    };
  }

  if (className === "floor" || className === "wallpaper") {
    return {
      kind: "decor",
      stripId,
      className,
      body: `${className}/${stripId}`
    };
  }

  if (className === "poster" || className === "post.it" || className === "post.it.vd" || className === "photo" || className === "Chess") {
    return {
      kind: "wall-item",
      stripId,
      objectId: objectId || stripId,
      className,
      itemType: String(item.customData ?? "").trim(),
      removeStripAtStart: !className.includes("post.it")
    };
  }

  return {
    kind: "unsupported",
    stripId,
    className,
    reason: "unknown-item-class"
  };
}

export function startRoomHandCloseAnimation(state: HabboRoomHandAnimationState): HabboRoomHandAnimationState {
  return {
    ...state,
    mode: "close",
    elapsedMs: 0,
    nextVisible: false
  };
}

export function advanceRoomHandAnimationState(
  state: HabboRoomHandAnimationState,
  deltaMs: number,
  frameDurationMs: number,
  showNext: boolean
): HabboRoomHandAnimationStep {
  const safeFrameDuration = Math.max(1, frameDurationMs);
  let elapsedMs = Math.max(0, state.elapsedMs + Math.max(0, deltaMs));
  if (elapsedMs < safeFrameDuration) {
    return {
      state: {
        ...state,
        elapsedMs
      },
      changed: false,
      removed: false
    };
  }

  let nextState = state;
  let changed = false;
  while (elapsedMs >= safeFrameDuration) {
    elapsedMs -= safeFrameDuration;
    const step = nextRoomHandFrame(nextState, showNext);
    changed = changed || step.changed;
    if (step.removed || !step.state) {
      return {
        changed: true,
        removed: true
      };
    }
    nextState = {
      ...step.state,
      elapsedMs
    };
    if (nextState.mode === "open" && nextState.frame >= HABBO_ROOM_HAND_ANIM_LOCS.length) {
      break;
    }
  }

  return {
    state: nextState,
    changed,
    removed: false
  };
}

function nextRoomHandFrame(
  state: HabboRoomHandAnimationState,
  showNext: boolean
): HabboRoomHandAnimationStep {
  if (state.mode === "open") {
    if (state.frame >= HABBO_ROOM_HAND_ANIM_LOCS.length) {
      return {
        state: {
          ...state,
          nextVisible: showNext
        },
        changed: state.nextVisible !== showNext,
        removed: false
      };
    }

    const loc = HABBO_ROOM_HAND_ANIM_LOCS[state.frame - 1] ?? { x: 0, y: 0 };
    const frame = clampRoomHandFrame(state.frame + 1);
    const nextState = applyRoomHandOpenFrame({
      ...state,
      frame,
      originX: state.originX + loc.x,
      originY: state.originY + loc.y,
      nextVisible: frame >= HABBO_ROOM_HAND_ANIM_LOCS.length && showNext
    });
    return {
      state: nextState,
      changed: true,
      removed: false
    };
  }

  const loc = HABBO_ROOM_HAND_ANIM_LOCS[state.frame - 1] ?? { x: 0, y: 0 };
  const frame = clampRoomHandFrame(state.frame - 1);
  if (frame <= 1) {
    return {
      changed: true,
      removed: true
    };
  }

  return {
    state: applyRoomHandCloseFrame({
      ...state,
      frame,
      originX: state.originX - loc.x,
      originY: state.originY - loc.y,
      nextVisible: false
    }),
    changed: true,
    removed: false
  };
}

function applyRoomHandOpenFrame(state: HabboRoomHandAnimationState): HabboRoomHandAnimationState {
  if (state.frame >= 6) {
    return {
      ...state,
      handMemberName: "room_hand_3",
      maskVisible: false,
      maskBlend: 0,
      itemsVisible: true
    };
  }

  if (state.frame >= 4) {
    return {
      ...state,
      handMemberName: "room_hand_2",
      maskVisible: true,
      maskBlend: 100,
      itemsVisible: false
    };
  }

  return {
    ...state,
    handMemberName: "room_hand_1",
    maskVisible: true,
    maskBlend: 0,
    itemsVisible: false
  };
}

function applyRoomHandCloseFrame(state: HabboRoomHandAnimationState): HabboRoomHandAnimationState {
  if (state.frame >= 7) {
    return {
      ...state,
      handMemberName: "room_hand_3",
      maskVisible: false,
      maskBlend: 0,
      itemsVisible: true
    };
  }

  if (state.frame >= 6) {
    return {
      ...state,
      handMemberName: "room_hand_2",
      maskVisible: true,
      maskBlend: 100,
      itemsVisible: true
    };
  }

  if (state.frame >= 4) {
    return {
      ...state,
      handMemberName: "room_hand_1",
      maskVisible: false,
      maskBlend: 0,
      itemsVisible: false
    };
  }

  return {
    ...state,
    handMemberName: "room_hand_1",
    maskVisible: false,
    maskBlend: 0,
    itemsVisible: false
  };
}

function clampRoomHandFrame(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.min(HABBO_ROOM_HAND_ANIM_LOCS.length, Math.trunc(value)));
}

function safePositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(value));
}
