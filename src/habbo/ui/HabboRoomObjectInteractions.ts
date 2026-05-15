import roomObjectProgramSources from "../../../generated/runtime-data/room-object-program-sources.json";

export const HABBO_ROOM_ACTIVE_OBJECT_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_room/casts/External/ParentScript 18 - Active Object Class.ls";

export interface HabboRoomObjectInteractionRecord {
  readonly id: string;
  readonly className: string;
  readonly x?: number;
  readonly y?: number;
  readonly direction?: readonly number[] | string;
  readonly props?: Readonly<Record<string, string>>;
}

export type HabboRoomObjectSelectAction =
  | {
      readonly kind: "move";
      readonly tile: { readonly x: number; readonly y: number };
      readonly sourceClassName: string;
      readonly sourcePath: string;
    }
  | {
      readonly kind: "set-stuff-data";
      readonly key: string;
      readonly value: string;
      readonly sourceClassName: string;
      readonly sourcePath: string;
    }
  | {
      readonly kind: "teleport";
      readonly useTile: { readonly x: number; readonly y: number } | undefined;
      readonly stateKey: string | undefined;
      readonly stateValue: string | undefined;
      readonly sourceClassName: string;
      readonly sourcePath: string;
    };

export interface HabboRoomObjectSourceFrameOptions {
  readonly animationTick?: number;
  readonly timedStateActive?: boolean | undefined;
}

export interface HabboRoomObjectSourcePartStateOptions extends HabboRoomObjectSourceFrameOptions {
  readonly baseMemberName?: string;
}

export interface HabboRoomObjectSourcePartState {
  readonly memberName?: string;
  readonly frame?: number;
  readonly ink?: number;
  readonly blend?: number;
  readonly locZRelative?: {
    readonly referencePart: string;
    readonly offset: number;
  };
}

export interface HabboRoomObjectSourceVisibleOptions {
  readonly visibilityAnimationActive?: boolean | undefined;
  readonly visibilityAnimationTick?: number | undefined;
  readonly timedStateActive?: boolean | undefined;
}

export interface HabboRoomObjectSourceTimedState {
  readonly key: string;
  readonly triggerValue: string;
  readonly durationFrames: number;
  readonly closeValue?: string;
  readonly sourceClassName: string;
  readonly sourcePath: string;
}

export interface HabboRoomObjectSourceAnimation {
  readonly durationFrames: number;
  readonly partIndexes: readonly number[];
  readonly sourceClassName: string;
  readonly sourcePath: string;
  readonly handlerSourcePath: string;
}

interface RoomObjectProgramSource {
  readonly sourcePath: string;
  readonly packetSends?: readonly string[];
  readonly stateKeys?: readonly string[];
  readonly setStuffDataSends?: readonly { readonly key: string; readonly value?: string }[];
  readonly prepareSource?: string;
  readonly selectSource?: string;
  readonly animateSource?: string;
  readonly updateSource?: string;
  readonly updateStuffdataSource?: string;
  readonly handlers?: Readonly<Record<string, string>>;
}

const roomObjectPrograms = (roomObjectProgramSources as {
  readonly programs?: Readonly<Record<string, RoomObjectProgramSource>>;
}).programs ?? {};

const roomHandlerPrograms = (roomObjectProgramSources as {
  readonly roomHandlers?: Readonly<Record<string, { readonly sourcePath: string; readonly source: string }>>;
}).roomHandlers ?? {};

export function sourceClassValueContains(sourceClassValue: string | undefined, sourceClassName: string): boolean {
  return sourceClassValue?.toLowerCase().includes(sourceClassName.toLowerCase()) === true;
}

export function resolveRoomObjectSelectAction(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined,
  options: { readonly doubleClick?: boolean } = {}
): HabboRoomObjectSelectAction | undefined {
  const program = sourceClassNamesFromValue(sourceClassValue)
    .map((sourceClassName) => ({ sourceClassName, source: roomObjectPrograms[sourceClassName] }))
    .find((candidate) => candidate.source?.selectSource && candidate.sourceClassName !== "Active Object Class");
  if (!program?.source) {
    return undefined;
  }

  const selectSource = program.source.selectSource ?? "";
  if (options.doubleClick === true) {
    const stuffData = parseSetStuffDataAction(selectSource, object.props);
    if (sourceSelectStartsDoorTraversal(program.source, selectSource)) {
      return {
        kind: "teleport",
        useTile: resolveTeleporterUseTile(object),
        stateKey: stuffData?.key,
        stateValue: stuffData?.value,
        sourceClassName: program.sourceClassName,
        sourcePath: program.source.sourcePath
      };
    }

    if (stuffData) {
      return {
        kind: "set-stuff-data",
        key: stuffData.key,
        value: stuffData.value,
        sourceClassName: program.sourceClassName,
        sourcePath: program.source.sourcePath
      };
    }
  }

  const move = parseMoveAction(selectSource, object);
  if (move) {
    return {
      kind: "move",
      tile: move,
      sourceClassName: program.sourceClassName,
      sourcePath: program.source.sourcePath
    };
  }

  return undefined;
}

export function roomObjectHasSourceSelectOverride(sourceClassValue: string | undefined): boolean {
  return sourceClassNamesFromValue(sourceClassValue)
    .some((sourceClassName) => sourceClassName !== "Active Object Class" && Boolean(roomObjectPrograms[sourceClassName]?.selectSource));
}

export function resolveRoomObjectSourcePartState(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined,
  part: string,
  options: HabboRoomObjectSourcePartStateOptions = {}
): HabboRoomObjectSourcePartState | undefined {
  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source) {
    return undefined;
  }

  const partIndex = sourcePartIndex(part.toLowerCase());
  if (!Number.isInteger(partIndex) || partIndex < 1) {
    return undefined;
  }

  const frameKey = resolveSourceFramePropertyKey(program.source);
  const active = frameKey ? roomObjectPropIsTruthy(roomObjectPropValue(object.props, frameKey)) : undefined;
  const timedState = resolveRoomObjectSourceTimedState(object, sourceClassValue);
  const timedStateInactive = timedState?.key.toLowerCase() === frameKey?.toLowerCase() && options.timedStateActive === false;
  const effectiveActive = timedStateInactive ? false : active;
  const context: SourcePartStateContext = {
    objectId: object.id,
    part,
    partIndex,
    active: effectiveActive,
    animationTick: options.animationTick ?? 0,
    ...(options.baseMemberName !== undefined ? { baseMemberName: options.baseMemberName } : {})
  };
  const state: MutableSourcePartState = {};

  const stateHandlerSource = sourceStateHandlerChain(program.source, effectiveActive);
  applySourcePartMutations(state, stateHandlerSource, context);

  const updateSource = program.source.updateSource ?? "";
  if (effectiveActive !== false && sourceUpdateMentionsPart(updateSource, part.toLowerCase(), partIndex)) {
    applySourcePartMutations(state, updateSource, context);
  }

  return Object.keys(state).length === 0 ? undefined : state;
}

export function resolveRoomObjectSourcePartFrame(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined,
  part: string,
  options: HabboRoomObjectSourceFrameOptions = {}
): number | undefined {
  const state = resolveRoomObjectSourcePartState(object, sourceClassValue, part, options);
  if (state?.frame !== undefined) {
    return state.frame;
  }

  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source) {
    return undefined;
  }

  const frameKey = resolveSourceFramePropertyKey(program.source);
  if (!frameKey) {
    return undefined;
  }

  const updateSource = program.source.updateSource ?? "";
  const lowerPart = part.toLowerCase();
  const partIndex = sourcePartIndex(lowerPart);
  if (!sourceUpdateMentionsPart(updateSource, lowerPart, partIndex)) {
    return undefined;
  }

  const value = object.props?.[frameKey] ?? object.props?.[frameKey.toUpperCase()] ?? object.props?.[frameKey.toLowerCase()];
  if (!roomObjectPropIsTruthy(value)) {
    return 0;
  }

  const timedState = resolveRoomObjectSourceTimedState(object, sourceClassValue);
  if (timedState?.key.toLowerCase() === frameKey.toLowerCase() && options.timedStateActive === false) {
    return 0;
  }

  return resolveSourceAnimatedFrame(updateSource, partIndex, object.id, lowerPart, options.animationTick ?? 0)
    ?? resolveSourceStaticActiveFrame(updateSource, partIndex, lowerPart)
    ?? 1;
}

export function resolveRoomObjectSourcePartVisible(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined,
  part: string,
  options: HabboRoomObjectSourceVisibleOptions = {}
): boolean | undefined {
  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source) {
    return undefined;
  }

  const partIndex = part.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
  if (!Number.isInteger(partIndex) || partIndex < 1 || partIndex > 26) {
    return undefined;
  }

  const source = `${program.source.prepareSource ?? ""}\n${program.source.updateSource ?? ""}`;
  const partReference = `pSprList\\s*\\[\\s*${partIndex}\\s*\\]`;
  if (options.visibilityAnimationActive === true && sourceVisibilityAnimationMentionsPart(program.source.updateSource ?? "", partIndex)) {
    if (options.timedStateActive === true && sourceVisibilityAnimationHidesWhenPrimaryFrameIsActive(program.source.updateSource ?? "")) {
      return false;
    }
    return sourceVisibilityAnimationVisible(program.source.updateSource ?? "", partIndex, object.id, options.visibilityAnimationTick ?? 0);
  }

  if (new RegExp(`${partReference}[^\\r\\n]*(?:visible\\s*=\\s*0|blend\\s*=\\s*0)`, "i").test(source)) {
    return false;
  }
  if (new RegExp(`${partReference}[^\\r\\n]*(?:visible\\s*=\\s*1|blend\\s*=\\s*100)`, "i").test(source)) {
    return true;
  }
  return undefined;
}

export function roomObjectSourceHasAnimatedUpdate(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined
): boolean {
  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source?.updateSource) {
    return false;
  }

  const frameKey = resolveSourceFramePropertyKey(program.source);
  if (!frameKey) {
    return false;
  }

  const value = object.props?.[frameKey] ?? object.props?.[frameKey.toUpperCase()] ?? object.props?.[frameKey.toLowerCase()];
  if (!roomObjectPropIsTruthy(value)) {
    return false;
  }

  return sourceHasAnimationPattern(program.source.updateSource);
}

export function resolveRoomObjectSourceAnimationPreloadTicks(sourceClassValue: string | undefined): readonly number[] {
  const program = firstRoomObjectProgram(sourceClassValue);
  const updateSource = program?.source.updateSource ?? "";
  if (!sourceHasAnimationPattern(updateSource)) {
    return [];
  }

  const span = resolveSourceAnimationPreloadTickSpan(updateSource);
  return Array.from({ length: span }, (_, index) => index);
}

export function resolveRoomObjectSourcePacketAnimation(
  packetName: string,
  sourceClassValue: string | undefined
): HabboRoomObjectSourceAnimation | undefined {
  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source?.animateSource || !program.source.updateSource) {
    return undefined;
  }

  const handlerName = `handle_${packetName.toLowerCase()}`;
  const handler = roomHandlerPrograms[handlerName];
  if (!handler?.source || !new RegExp(`\\.animate\\s*\\(`, "i").test(handler.source)) {
    return undefined;
  }

  const partIndexes = sourceVisibilityAnimationPartIndexes(program.source.updateSource);
  if (partIndexes.length === 0) {
    return undefined;
  }

  return {
    durationFrames: resolveSourceAnimateDuration(program.source.animateSource, handler.source),
    partIndexes,
    sourceClassName: program.sourceClassName,
    sourcePath: program.source.sourcePath,
    handlerSourcePath: handler.sourcePath
  };
}

export function resolveRoomObjectSourceTimedState(
  object: HabboRoomObjectInteractionRecord,
  sourceClassValue: string | undefined
): HabboRoomObjectSourceTimedState | undefined {
  const program = firstRoomObjectProgram(sourceClassValue);
  if (!program?.source) {
    return undefined;
  }

  const timedState = parseSourceTimedState(program.sourceClassName, program.source);
  if (!timedState) {
    return undefined;
  }

  const value = roomObjectPropValue(object.props, timedState.key);
  if (value === undefined) {
    return undefined;
  }

  return timedState;
}

export function resolveTeleporterUseTile(object: HabboRoomObjectInteractionRecord): { readonly x: number; readonly y: number } | undefined {
  if (object.x === undefined || object.y === undefined) {
    return undefined;
  }

  const direction = roomObjectBaseDirection(object);
  switch (direction) {
    case 0:
      return { x: object.x, y: object.y - 1 };
    case 2:
      return { x: object.x + 1, y: object.y };
    case 4:
      return { x: object.x, y: object.y + 1 };
    case 6:
      return { x: object.x - 1, y: object.y };
    default:
      return undefined;
  }
}

export function roomObjectBaseDirection(object: HabboRoomObjectInteractionRecord): number {
  const raw = Array.isArray(object.direction)
    ? object.direction[0]
    : typeof object.direction === "string"
      ? object.direction.split(/[,\s]+/).find(Boolean)
      : 0;
  const number = Number(raw ?? 0);
  if (!Number.isFinite(number)) {
    return 0;
  }

  const normalized = Math.trunc(number) % 8;
  return normalized < 0 ? normalized + 8 : normalized;
}

export function roomObjectPropIsTruthy(value: string | undefined): boolean {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "ON" || normalized === "O" || normalized === "1" || normalized === "I";
}

export function roomObjectPropValue(props: Readonly<Record<string, string>> | undefined, key: string): string | undefined {
  return props?.[key] ?? props?.[key.toUpperCase()] ?? props?.[key.toLowerCase()];
}

export function oppositeRoomObjectPropValue(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "TRUE":
      return "FALSE";
    case "FALSE":
      return "TRUE";
    case "ON":
      return "OFF";
    case "OFF":
      return "ON";
    case "1":
    case "I":
      return "0";
    case "0":
      return "1";
    case "O":
      return "I";
    default:
      return undefined;
  }
}

function firstRoomObjectProgram(sourceClassValue: string | undefined): { readonly sourceClassName: string; readonly source: RoomObjectProgramSource } | undefined {
  return sourceClassNamesFromValue(sourceClassValue)
    .map((sourceClassName) => ({ sourceClassName, source: roomObjectPrograms[sourceClassName] }))
    .find((candidate): candidate is { readonly sourceClassName: string; readonly source: RoomObjectProgramSource } => (
      candidate.sourceClassName !== "Active Object Class" && candidate.source !== undefined
    ));
}

function sourceClassNamesFromValue(sourceClassValue: string | undefined): readonly string[] {
  if (!sourceClassValue) {
    return [];
  }

  return [...sourceClassValue.matchAll(/"([^"]+ Class(?: EX)?)"/g)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined && value.length > 0)
    .filter((value, index, all) => all.indexOf(value) === index);
}

interface SourcePartStateContext {
  readonly objectId: string;
  readonly part: string;
  readonly partIndex: number;
  readonly active: boolean | undefined;
  readonly animationTick: number;
  readonly baseMemberName?: string;
}

type MutableSourcePartState = {
  memberName?: string;
  frame?: number;
  ink?: number;
  blend?: number;
  locZRelative?: {
    referencePart: string;
    offset: number;
  };
};

function sourceStateHandlerChain(source: RoomObjectProgramSource, active: boolean | undefined): string {
  if (active === undefined) {
    return "";
  }

  const entry = active ? "setOn" : "setOff";
  return sourceHandlerWithCallees(source.handlers, entry, new Set());
}

function sourceHandlerWithCallees(
  handlers: Readonly<Record<string, string>> | undefined,
  handlerName: string,
  seen: Set<string>
): string {
  const source = sourceHandlerByName(handlers, handlerName);
  if (!source) {
    return "";
  }

  const key = handlerName.toLowerCase();
  if (seen.has(key)) {
    return "";
  }
  seen.add(key);

  const callees = [...source.matchAll(/\bme\.(\w+)\s*\(/gi)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined && value.length > 0);
  return [
    source,
    ...callees.map((callee) => sourceHandlerWithCallees(handlers, callee, seen))
  ].filter(Boolean).join("\n");
}

function sourceHandlerByName(
  handlers: Readonly<Record<string, string>> | undefined,
  handlerName: string
): string | undefined {
  if (!handlers) {
    return undefined;
  }

  const direct = handlers[handlerName];
  if (direct) {
    return direct;
  }

  const lowerName = handlerName.toLowerCase();
  const entry = Object.entries(handlers).find(([name]) => name.toLowerCase() === lowerName);
  return entry?.[1];
}

function applySourcePartMutations(state: MutableSourcePartState, source: string, context: SourcePartStateContext): void {
  if (!source || !new RegExp(`pSprList\\s*\\[\\s*${context.partIndex}\\s*\\]`, "i").test(source)) {
    return;
  }

  const memberName = context.baseMemberName
    ? resolveSourceMemberNameMutation(source, context)
    : undefined;
  if (memberName) {
    state.memberName = memberName;
    const frame = sourceFrameFromMemberName(memberName);
    if (frame !== undefined) {
      state.frame = frame;
    }
  }

  const ink = resolveSourceNumericSpriteAssignment(source, context, "ink");
  if (ink !== undefined) {
    state.ink = ink;
  }

  const blend = resolveSourceNumericSpriteAssignment(source, context, "blend");
  if (blend !== undefined) {
    state.blend = blend;
  }

  const locZRelative = resolveSourceLocZRelativeAssignment(source, context);
  if (locZRelative) {
    state.locZRelative = locZRelative;
  }
}

function resolveSourceMemberNameMutation(source: string, context: SourcePartStateContext): string | undefined {
  if (!context.baseMemberName) {
    return undefined;
  }

  for (const match of source.matchAll(/(\w+)\s*=\s*(\w+)\.char\s*\[\s*1\s*\.\.\s*(?:length\(\s*\2\s*\)|\2\.length)\s*-\s*(\d+)\s*\]\s*&\s*([^\r\n]+)/gi)) {
    const newNameVariable = match[1];
    const removeCount = Number.parseInt(match[3] ?? "", 10);
    const suffixExpression = match[4];
    if (!newNameVariable || !Number.isFinite(removeCount) || removeCount < 0 || !suffixExpression) {
      continue;
    }

    const usagePattern = new RegExp(`getmemnum\\(\\s*${escapeRegExp(newNameVariable)}\\s*\\)[\\s\\S]{0,1200}?pSprList\\s*\\[\\s*${context.partIndex}\\s*\\]\\s*\\.\\s*castNum`, "i");
    if (!usagePattern.test(source)) {
      continue;
    }

    const suffix = evaluateSourceConcatSuffix(suffixExpression, source, context);
    if (suffix === undefined) {
      continue;
    }

    const prefix = context.baseMemberName.slice(0, Math.max(0, context.baseMemberName.length - removeCount));
    return `${prefix}${suffix}`;
  }

  return undefined;
}

function evaluateSourceConcatSuffix(
  expression: string,
  source: string,
  context: SourcePartStateContext
): string | undefined {
  const pieces = expression.split("&").map((piece) => piece.trim()).filter(Boolean);
  if (pieces.length === 0) {
    return undefined;
  }

  const values: string[] = [];
  for (const piece of pieces) {
    const quoted = piece.match(/^"([^"]*)"$/);
    if (quoted) {
      values.push(quoted[1] ?? "");
      continue;
    }

    if (/^-?\d+$/.test(piece)) {
      values.push(piece);
      continue;
    }

    const randomExpression = piece.match(/^random\((\d+)\)(?:\s*-\s*(\d+))?$/i);
    if (randomExpression) {
      const count = Number.parseInt(randomExpression[1] ?? "", 10);
      const subtract = Number.parseInt(randomExpression[2] ?? "0", 10);
      if (Number.isFinite(count) && count > 0 && Number.isFinite(subtract)) {
        values.push(String(sourcePseudoRandomFrame(count, subtract, `${context.objectId}:${context.part}:suffix:${context.animationTick}`)));
        continue;
      }
    }

    if (/^pActive$/i.test(piece)) {
      values.push(context.active ? "1" : "0");
      continue;
    }

    if (/^pAnim(?:Frm|Frame)$/i.test(piece) || /^pFrame$/i.test(piece)) {
      values.push(String(sourceAnimationCounter(source, context)));
      continue;
    }

    if (/^EMPTY$/i.test(piece)) {
      values.push("");
      continue;
    }

    return undefined;
  }

  return values.join("");
}

function resolveSourceNumericSpriteAssignment(
  source: string,
  context: SourcePartStateContext,
  property: "ink" | "blend"
): number | undefined {
  const delayAssignment = resolveSourceDelayGatedNumericAssignment(source, context, property);
  if (delayAssignment !== undefined) {
    return delayAssignment;
  }

  const matches = [...source.matchAll(new RegExp(`pSprList\\s*\\[\\s*${context.partIndex}\\s*\\]\\s*\\.\\s*${property}\\s*=\\s*(-?\\d+)`, "gi"))];
  const last = matches[matches.length - 1];
  if (!last) {
    return undefined;
  }

  const value = Number.parseInt(last[1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

function resolveSourceLocZRelativeAssignment(
  source: string,
  context: SourcePartStateContext
): { readonly referencePart: string; readonly offset: number } | undefined {
  const matches = [...source.matchAll(new RegExp(
    `pSprList\\s*\\[\\s*${context.partIndex}\\s*\\]\\s*\\.\\s*locZ\\s*=\\s*(?:\\w+\\.)?pSprList\\s*\\[\\s*(\\d+)\\s*\\]\\s*\\.\\s*locZ\\s*([+-])\\s*(\\d+)`,
    "gi"
  ))];
  if (matches.length === 0) {
    return undefined;
  }

  const candidates = matches
    .map((match) => {
      const referenceIndex = Number.parseInt(match[1] ?? "", 10);
      const sign = match[2] === "-" ? -1 : 1;
      const offset = Number.parseInt(match[3] ?? "", 10) * sign;
      if (!Number.isInteger(referenceIndex) || referenceIndex < 1 || !Number.isFinite(offset)) {
        return undefined;
      }

      return {
        referencePart: String.fromCharCode("a".charCodeAt(0) + referenceIndex - 1),
        offset
      };
    })
    .filter((candidate): candidate is { readonly referencePart: string; readonly offset: number } => candidate !== undefined);
  const unique = candidates.filter((candidate, index, all) => (
    all.findIndex((entry) => entry.referencePart === candidate.referencePart && entry.offset === candidate.offset) === index
  ));
  return unique.length === 1 ? unique[0] : undefined;
}

function resolveSourceDelayGatedNumericAssignment(
  source: string,
  context: SourcePartStateContext,
  property: "ink" | "blend"
): number | undefined {
  const cycle = sourceDelayCycle(source);
  if (!cycle) {
    return undefined;
  }

  const branchAssignments = [...source.matchAll(new RegExp(`if\\s+${escapeRegExp(cycle.variable)}\\s*=\\s*(\\d+)\\s+then([\\s\\S]*?)(?=\\r?\\n\\s*(?:else|end\\s+if))`, "gi"))]
    .map((match) => {
      const delay = Number.parseInt(match[1] ?? "", 10);
      const block = match[2] ?? "";
      const value = resolveDirectNumericSpriteAssignment(block, context.partIndex, property);
      return Number.isFinite(delay) && value !== undefined ? { delay, value } : undefined;
    })
    .filter((value): value is { readonly delay: number; readonly value: number } => value !== undefined);
  if (branchAssignments.length === 0) {
    return undefined;
  }

  const beforeUpdateDelay = sourceDelayBeforeUpdate(context.animationTick, cycle.initial, cycle.modulo);
  const direct = branchAssignments.find((entry) => entry.delay === beforeUpdateDelay);
  if (direct) {
    return direct.value;
  }

  const tick = Math.max(0, Math.trunc(context.animationTick));
  const ranked = branchAssignments
    .map((entry) => ({
      value: entry.value,
      distance: sourceDelayDistanceSince(tick, cycle.initial, cycle.modulo, entry.delay)
    }))
    .filter((entry) => entry.distance >= 0)
    .sort((left, right) => left.distance - right.distance);
  return ranked[0]?.value;
}

function resolveDirectNumericSpriteAssignment(
  source: string,
  partIndex: number,
  property: "ink" | "blend"
): number | undefined {
  const match = source.match(new RegExp(`pSprList\\s*\\[\\s*${partIndex}\\s*\\]\\s*\\.\\s*${property}\\s*=\\s*(-?\\d+)`, "i"));
  const value = Number.parseInt(match?.[1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

function sourceDelayCycle(source: string): { readonly variable: string; readonly modulo: number; readonly initial: number } | undefined {
  const match = source.match(/\b(p\w*delay\w*)\s*=\s*\(\s*\1\s*\+\s*1\s*\)\s*mod\s*(\d+)/i);
  const variable = match?.[1];
  const modulo = Number.parseInt(match?.[2] ?? "", 10);
  if (!variable || !Number.isFinite(modulo) || modulo <= 0) {
    return undefined;
  }

  return { variable, modulo, initial: 1 };
}

function sourceDelayBeforeUpdate(tick: number, initial: number, modulo: number): number {
  const normalizedTick = Math.max(0, Math.trunc(tick));
  if (normalizedTick <= 0) {
    return initial % modulo;
  }
  return moduloNumber(initial + normalizedTick - 1, modulo);
}

function sourceDelayDistanceSince(tick: number, initial: number, modulo: number, delay: number): number {
  if (tick <= 0) {
    return -1;
  }

  for (let distance = 0; distance < modulo; distance++) {
    if (sourceDelayBeforeUpdate(tick - distance, initial, modulo) === delay) {
      return distance;
    }
  }
  return -1;
}

function sourceAnimationCounter(source: string, context: SourcePartStateContext): number {
  const moduloMatch = source.match(/\bpAnim(?:Frm|Frame)\s*=\s*\(\s*pAnim(?:Frm|Frame)\s*\+\s*1\s*\)\s*mod\s*(\d+)/i);
  const modulo = Number.parseInt(moduloMatch?.[1] ?? "", 10);
  if (Number.isFinite(modulo) && modulo > 0) {
    const cycle = sourceDelayCycle(source);
    const divisor = cycle?.modulo ?? 1;
    return Math.floor(Math.max(0, Math.trunc(context.animationTick)) / divisor) % modulo;
  }

  const maxMatch = source.match(/pAnimFrame\s*>\s*(\d+)/i);
  const maxFrame = Number.parseInt(maxMatch?.[1] ?? "", 10);
  if (Number.isFinite(maxFrame) && maxFrame > 0) {
    return (Math.max(0, Math.trunc(context.animationTick)) % maxFrame) + 1;
  }

  return Math.max(0, Math.trunc(context.animationTick));
}

function sourceFrameFromMemberName(memberName: string): number | undefined {
  const match = memberName.match(/_(\d+)$/);
  const value = Number.parseInt(match?.[1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

function moduloNumber(value: number, modulo: number): number {
  const normalized = Math.trunc(value) % modulo;
  return normalized < 0 ? normalized + modulo : normalized;
}

function parseSetStuffDataAction(
  selectSource: string,
  props: Readonly<Record<string, string>> | undefined
): { readonly key: string; readonly value: string } | undefined {
  const call = selectSource.match(/send\("SETSTUFFDATA",\s*([^\r\n]+)/i);
  if (!call) {
    return undefined;
  }

  const expression = call[1] ?? "";
  const compact = expression.replace(/\s+/g, " ");
  const packedLiteral = compact.match(/me\.getID\(\)\s*&\s*"\/([^"/]+)\/([^"]*)"/i);
  if (packedLiteral) {
    return {
      key: packedLiteral[1] ?? "",
      value: packedLiteral[2] ?? ""
    };
  }

  const separatedLiteral = compact.match(/me\.getID\(\)\s*&\s*"\/"\s*&\s*"([^"]+)"\s*&\s*"\/"\s*&\s*"([^"]+)"/i);
  if (separatedLiteral) {
    return {
      key: separatedLiteral[1] ?? "",
      value: separatedLiteral[2] ?? ""
    };
  }

  const variableValue = compact.match(/me\.getID\(\)\s*&\s*"\/"\s*&\s*"([^"]+)"\s*&\s*"\/"\s*&\s*([A-Za-z][A-Za-z0-9_]*)/i);
  if (!variableValue) {
    return undefined;
  }

  const key = variableValue[1];
  const variableName = variableValue[2];
  if (!key || !variableName) {
    return undefined;
  }
  const value = resolveSourceVariableValue(selectSource, variableName, props?.[key]);
  return value === undefined ? undefined : { key, value };
}

function sourceSelectStartsDoorTraversal(source: RoomObjectProgramSource, selectSource: string): boolean {
  if (!/send\("INTODOOR"/i.test(selectSource)) {
    return false;
  }

  return source.packetSends?.some((packet) => packet.toUpperCase() === "GETDOORFLAT") === true;
}

function parseMoveAction(
  selectSource: string,
  object: HabboRoomObjectInteractionRecord
): { readonly x: number; readonly y: number } | undefined {
  if (!/send\("MOVE"/i.test(selectSource)) {
    return undefined;
  }

  const directionalBlock = extractDirectionCaseBlock(selectSource, roomObjectBaseDirection(object));
  return parseMoveCoordinates(directionalBlock ?? selectSource, object);
}

function extractDirectionCaseBlock(source: string, direction: number): string | undefined {
  if (!/case\s+me\.pDirection\[1\]\s+of/i.test(source)) {
    return undefined;
  }

  const match = source.match(new RegExp(`\\b${direction}:([\\s\\S]*?)(?=\\r?\\n\\s*(?:\\d+:|end case))`, "i"));
  return match?.[1];
}

function parseMoveCoordinates(
  source: string,
  object: HabboRoomObjectInteractionRecord
): { readonly x: number; readonly y: number } | undefined {
  const move = source.match(/send\("MOVE",\s*\[#short:\s*([^,\]]+),\s*#short:\s*([^\]]+)\]/i);
  if (!move) {
    return undefined;
  }

  const xExpression = move[1];
  const yExpression = move[2];
  if (!xExpression || !yExpression) {
    return undefined;
  }

  const x = evaluateLocExpression(xExpression, object);
  const y = evaluateLocExpression(yExpression, object);
  if (x === undefined || y === undefined) {
    return undefined;
  }

  return { x, y };
}

function evaluateLocExpression(expression: string, object: HabboRoomObjectInteractionRecord): number | undefined {
  const match = expression.replace(/\s+/g, "").match(/^me\.(pLocX|locX|pLocY|locY)([+-]\d+)?$/i);
  if (!match) {
    return undefined;
  }

  const axisSource = match[1];
  if (!axisSource) {
    return undefined;
  }

  const axis = axisSource.toLowerCase().includes("x") ? "x" : "y";
  const base = axis === "x" ? object.x : object.y;
  if (base === undefined) {
    return undefined;
  }

  const offset = match[2] ? Number.parseInt(match[2], 10) : 0;
  return base + offset;
}

function resolveSourceVariableValue(source: string, variableName: string, current: string | undefined): string | undefined {
  const randomMatch = source.match(new RegExp(`${escapeRegExp(variableName)}\\s*=\\s*random\\((\\d+)\\)\\s*-\\s*(\\d+)`, "i"));
  if (randomMatch) {
    const count = Number.parseInt(randomMatch[1] ?? "", 10);
    const subtract = Number.parseInt(randomMatch[2] ?? "", 10);
    if (Number.isFinite(count) && count > 0) {
      return String(Math.max(0, Math.floor(Math.random() * count) + 1 - subtract));
    }
  }

  const literals = [...source.matchAll(new RegExp(`${escapeRegExp(variableName)}\\s*=\\s*"([^"]*)"`, "gi"))]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
  if (literals.length === 0) {
    return undefined;
  }
  if (literals.length === 1) {
    return literals[0] ?? "";
  }

  const normalizedCurrent = String(current ?? "").trim().toUpperCase();
  const existingIndex = literals.findIndex((literal) => literal.trim().toUpperCase() === normalizedCurrent);
  if (existingIndex >= 0) {
    return literals[(existingIndex + 1) % literals.length];
  }

  return roomObjectPropIsTruthy(current) ? literals[0] : literals[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveSourceFramePropertyKey(source: RoomObjectProgramSource): string | undefined {
  const selectKey = source.selectSource ? parseSetStuffDataKey(source.selectSource) : undefined;
  if (selectKey && source.updateSource) {
    return selectKey;
  }

  const prepareSource = source.prepareSource ?? "";
  const updateStuffdataSource = source.updateStuffdataSource ?? "";
  const updateSource = source.updateSource ?? "";
  const propertySources = `${prepareSource}\n${updateStuffdataSource}`;
  const candidates = [
    ...propertySources.matchAll(/tdata\["([^"]+)"\]/gi),
    ...propertySources.matchAll(/value\("([^"]+)"\)/gi)
  ]
    .map((match) => match[1])
    .filter((key): key is string => key !== undefined && key.length > 0)
    .concat(source.stateKeys ?? [])
    .filter((key, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === key.toLowerCase()) === index);

  return candidates.find((key) => updateSource.toLowerCase().includes(key.toLowerCase()))
    ?? (candidates.length === 1 ? candidates[0] : undefined);
}

function parseSetStuffDataKey(selectSource: string): string | undefined {
  const call = selectSource.match(/send\("SETSTUFFDATA",\s*([^\r\n]+)/i);
  if (!call) {
    return undefined;
  }

  const expression = call[1]?.replace(/\s+/g, " ") ?? "";
  return expression.match(/me\.getID\(\)\s*&\s*"\/([^"/]+)\//i)?.[1]
    ?? expression.match(/me\.getID\(\)\s*&\s*"\/"\s*&\s*"([^"]+)"/i)?.[1];
}

function sourceUpdateMentionsPart(source: string, part: string, partIndex: number): boolean {
  if (!source) {
    return false;
  }

  const normalized = source.toLowerCase();
  return normalized.includes(`"${part}"`)
    || normalized.includes(`_${part}_`)
    || normalized.includes(`#${part}`)
    || normalized.includes(`value("${part}")`)
    || new RegExp(`psprlist\\s*\\[\\s*${partIndex}\\s*\\]`, "i").test(source)
    || sourceListLoopMentionsPart(source, partIndex)
    || sourceRangeLoopMentionsPart(source, partIndex)
    || normalized.includes(`repeat with tpart`)
    || normalized.includes(`repeat with j`);
}

function sourcePartIndex(part: string): number {
  return part.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
}

function sourceHasAnimationPattern(source: string): boolean {
  return /member\.name[\s\S]{0,240}random\(\d+\)\s*-\s*\d+/i.test(source)
    || /getmemnum\("[^"]+"\s*&\s*random\(\d+\)\)/i.test(source)
    || /tAnim\s*=\s*\[[^\]]+\]/i.test(source)
    || /pAnimFrame\s*>\s*\d+/i.test(source)
    || /pAnim(?:Frm|Frame)\s*=\s*\(\s*pAnim(?:Frm|Frame)\s*\+\s*1\s*\)\s*mod\s*\d+/i.test(source);
}

function resolveSourceAnimationPreloadTickSpan(source: string): number {
  const spans: number[] = [];
  const tickMultiplier = /pTiming\s*=\s*not\s+pTiming|pSync\s*=\s*not\s+pSync/i.test(source) ? 2 : 1;
  for (const match of source.matchAll(/random\((\d+)\)(?:\s*-\s*\d+)?/gi)) {
    const count = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(count) && count > 0) {
      spans.push(count * tickMultiplier);
    }
  }

  const moduloMatch = source.match(/\bpAnim(?:Frm|Frame)\s*=\s*\(\s*pAnim(?:Frm|Frame)\s*\+\s*1\s*\)\s*mod\s*(\d+)/i);
  const modulo = Number.parseInt(moduloMatch?.[1] ?? "", 10);
  if (Number.isFinite(modulo) && modulo > 0) {
    const delayCycle = sourceDelayCycle(source);
    spans.push(modulo * (delayCycle?.modulo ?? 1));
  }

  const maxFrameMatch = source.match(/pAnimFrame\s*>\s*(\d+)/i);
  const maxFrame = Number.parseInt(maxFrameMatch?.[1] ?? "", 10);
  if (Number.isFinite(maxFrame) && maxFrame > 0) {
    spans.push(maxFrame);
  }

  const sequence = parseSourceAnimationSequence(source);
  if (sequence.length > 0) {
    spans.push(sequence.length);
  }

  const span = Math.max(1, ...spans);
  // Runtime safety guard only. The span is source-derived above, and this cap
  // prevents malformed decompiled handlers from creating unbounded preload work.
  return Math.min(192, span * 2);
}

function parseSourceTimedState(
  sourceClassName: string,
  source: RoomObjectProgramSource
): HabboRoomObjectSourceTimedState | undefined {
  const updateStuffdataSource = source.updateStuffdataSource ?? "";
  const updateSource = source.updateSource ?? "";
  if (!updateStuffdataSource || !updateSource) {
    return undefined;
  }

  const triggeredBranch = updateStuffdataSource.match(/if\s+tValue\s*=\s*"([^"]+)"\s+then([\s\S]*?)(?:else|end\s+if)/i);
  if (!triggeredBranch) {
    return undefined;
  }

  const triggerValue = triggeredBranch[1] ?? "";
  const timerAssignment = (triggeredBranch[2] ?? "").match(/\b(p[A-Za-z0-9_]*timer[A-Za-z0-9_]*)\s*=\s*(\d+)/i);
  if (!timerAssignment) {
    return undefined;
  }

  const timerProperty = timerAssignment[1] ?? "";
  const durationFrames = Number.parseInt(timerAssignment[2] ?? "", 10);
  if (!timerProperty || !Number.isFinite(durationFrames) || durationFrames <= 0) {
    return undefined;
  }

  const timerPropertyPattern = escapeRegExp(timerProperty);
  if (!new RegExp(`${timerPropertyPattern}\\s*=\\s*${timerPropertyPattern}\\s*-\\s*1`, "i").test(updateSource)) {
    return undefined;
  }

  const key = resolveSourceFramePropertyKey(source) ?? source.stateKeys?.[0];
  if (!key) {
    return undefined;
  }

  const closeValue = source.setStuffDataSends
    ?.find((send) => send.key.toLowerCase() === key.toLowerCase() && !sourceValueEquals(send.value, triggerValue))
    ?.value;

  return {
    key,
    triggerValue,
    durationFrames,
    ...(closeValue !== undefined ? { closeValue } : {}),
    sourceClassName,
    sourcePath: source.sourcePath
  };
}

export function sourceValueEquals(left: string | undefined, right: string | undefined): boolean {
  return String(left ?? "").trim().toUpperCase() === String(right ?? "").trim().toUpperCase();
}

function resolveSourceAnimatedFrame(
  updateSource: string,
  partIndex: number,
  objectId: string,
  part: string,
  animationTick: number
): number | undefined {
  if (!sourceHasAnimationPattern(updateSource)) {
    return undefined;
  }

  const block = sourceMutationBlockForPart(updateSource, partIndex) ?? updateSource;
  const tick = effectiveSourceAnimationTick(updateSource, animationTick);
  if (/\bpAnim(?:Frm|Frame)\s*=\s*\(\s*pAnim(?:Frm|Frame)\s*\+\s*1\s*\)\s*mod\s*\d+/i.test(block)) {
    return sourceAnimationCounter(block, {
      objectId,
      part,
      partIndex,
      active: true,
      animationTick
    });
  }

  const explicitMemberRandom = resolveSourceExplicitMemberRandomFrame(updateSource, block, tick);
  if (explicitMemberRandom !== undefined) {
    return explicitMemberRandom;
  }

  const randomMatch = block.match(/random\((\d+)\)\s*-\s*(\d+)/i);
  if (randomMatch) {
    const count = Number.parseInt(randomMatch[1] ?? "", 10);
    const subtract = Number.parseInt(randomMatch[2] ?? "", 10);
    if (Number.isFinite(count) && count > 0 && Number.isFinite(subtract)) {
      return sourcePseudoRandomFrame(count, subtract, `${objectId}:${part}:${tick}`);
    }
  }

  const sequence = parseSourceAnimationSequence(updateSource);
  if (sequence.length > 0 && (block.includes("tAnim") || new RegExp(`pSprList\\s*\\[\\s*${partIndex}\\s*\\]`, "i").test(block))) {
    return sequence[tick % sequence.length] ?? 0;
  }

  if (!/pAnimFrame/i.test(block)) {
    return undefined;
  }

  const maxMatch = updateSource.match(/pAnimFrame\s*>\s*(\d+)/i);
  const maxFrame = Number.parseInt(maxMatch?.[1] ?? "", 10);
  if (!Number.isFinite(maxFrame) || maxFrame <= 0) {
    return undefined;
  }
  return (tick % maxFrame) + 1;
}

function resolveSourceExplicitMemberRandomFrame(updateSource: string, block: string, tick: number): number | undefined {
  if (!/castNum\s*=\s*tmember\.number|tmember\.number/i.test(block)) {
    return undefined;
  }

  const match = updateSource.match(/tmember\s*=\s*member\(\s*(?:abs\(\s*)?getmemnum\("([^"]+)"\s*&\s*random\((\d+)\)\s*\)?\s*\)/i);
  if (!match) {
    return undefined;
  }

  const count = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(count) || count <= 0) {
    return undefined;
  }

  return (Math.max(0, Math.trunc(tick)) % count) + 1;
}

function resolveSourceAnimateDuration(animateSource: string, handlerSource: string): number {
  const argument = handlerSource.match(/\.animate\(\s*(\d+)\s*\)/i);
  if (argument) {
    const duration = Number.parseInt(argument[1] ?? "", 10);
    if (Number.isFinite(duration) && duration > 0) {
      return duration;
    }
  }

  const defaultTime = animateSource.match(/if\s+voidp\([^)]+\)\s+then[\s\S]*?\b\w+\s*=\s*(\d+)/i);
  const duration = Number.parseInt(defaultTime?.[1] ?? "", 10);
  return Number.isFinite(duration) && duration > 0 ? duration : 1;
}

function sourceVisibilityAnimationPartIndexes(updateSource: string): readonly number[] {
  const indexes = [...updateSource.matchAll(/pSprList\s*\[\s*(\d+)\s*\]\s*\.\s*visible\s*=/gi)]
    .map((match) => Number.parseInt(match[1] ?? "", 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  return indexes.filter((value, index, all) => all.indexOf(value) === index);
}

function sourceVisibilityAnimationMentionsPart(updateSource: string, partIndex: number): boolean {
  return sourceVisibilityAnimationPartIndexes(updateSource).includes(partIndex);
}

function sourceVisibilityAnimationHidesWhenPrimaryFrameIsActive(updateSource: string): boolean {
  return /member\.name[\s\S]*?char\s*\[\s*length\(tName\)\s*\]\s*=\s*"1"[\s\S]*?visible\s*=\s*0/i.test(updateSource);
}

function sourceVisibilityAnimationVisible(updateSource: string, partIndex: number, objectId: string, animationTick: number): boolean {
  const tick = Math.max(0, Math.trunc(animationTick));
  const partBlock = sourceVisibilityAnimationBlockForPart(updateSource, partIndex) ?? updateSource;
  const modulo = partBlock.match(/tVisible\s*=\s*[^\r\n]*mod\s*(\d+)/i);
  if (modulo) {
    const divisor = Number.parseInt(modulo[1] ?? "", 10);
    if (Number.isFinite(divisor) && divisor > 0 && tick % divisor === 0) {
      return false;
    }
  }

  const randomGate = partBlock.match(/random\((\d+)\)\s*>\s*(\d+)/i);
  if (randomGate) {
    const count = Number.parseInt(randomGate[1] ?? "", 10);
    const threshold = Number.parseInt(randomGate[2] ?? "", 10);
    if (Number.isFinite(count) && count > 0 && Number.isFinite(threshold)) {
      return sourcePseudoRandomFrame(count, 0, `${objectId}:visible:${partIndex}:${tick}`) > threshold;
    }
  }

  return tick % 2 === 1;
}

function sourceVisibilityAnimationBlockForPart(updateSource: string, partIndex: number): string | undefined {
  const direct = new RegExp(`pSprList\\s*\\[\\s*${partIndex}\\s*\\]\\s*\\.\\s*visible\\s*=`, "i").exec(updateSource);
  if (!direct) {
    return undefined;
  }
  const start = Math.max(0, updateSource.lastIndexOf("if", direct.index));
  const end = Math.min(updateSource.length, direct.index + 500);
  return updateSource.slice(start, end);
}

function resolveSourceStaticActiveFrame(updateSource: string, partIndex: number, part: string): number | undefined {
  const block = sourceMutationBlockForPart(updateSource, partIndex) ?? updateSource;
  if (new RegExp(`"${part}"`, "i").test(block) || /"\s*1\s*"/.test(block) || /pActive|pSwitch/i.test(block)) {
    return 1;
  }
  return undefined;
}

function sourceMutationBlockForPart(source: string, partIndex: number): string | undefined {
  const listLoop = sourceListLoopBlockForPart(source, partIndex);
  if (listLoop) {
    return listLoop;
  }

  const rangeLoop = sourceRangeLoopBlockForPart(source, partIndex);
  if (rangeLoop) {
    return rangeLoop;
  }

  const direct = new RegExp(`pSprList\\s*\\[\\s*${partIndex}\\s*\\]`, "i").exec(source);
  if (!direct) {
    return undefined;
  }
  const start = direct.index;
  const rest = source.slice(start + 1);
  const nextDirect = rest.search(/\bpSprList\s*\[\s*\d+\s*\]/i);
  const end = nextDirect >= 0 ? start + 1 + nextDirect : Math.min(source.length, start + 900);
  return source.slice(start, end);
}

function sourceListLoopMentionsPart(source: string, partIndex: number): boolean {
  return sourceListLoopBlockForPart(source, partIndex) !== undefined;
}

function sourceListLoopBlockForPart(source: string, partIndex: number): string | undefined {
  for (const match of source.matchAll(/repeat\s+with\s+\w+\s+in\s+\[([^\]]+)\]([\s\S]*?)end\s+repeat/gi)) {
    const values = String(match[1] ?? "").split(",").map((value) => Number.parseInt(value.trim(), 10));
    if (values.includes(partIndex)) {
      return match[2] ?? "";
    }
  }
  return undefined;
}

function sourceRangeLoopMentionsPart(source: string, partIndex: number): boolean {
  return sourceRangeLoopBlockForPart(source, partIndex) !== undefined;
}

function sourceRangeLoopBlockForPart(source: string, partIndex: number): string | undefined {
  for (const match of source.matchAll(/repeat\s+with\s+\w+\s*=\s*(\d+)\s+to\s+(\d+)([\s\S]*?)end\s+repeat/gi)) {
    const start = Number.parseInt(match[1] ?? "", 10);
    const end = Number.parseInt(match[2] ?? "", 10);
    if (Number.isFinite(start) && Number.isFinite(end) && partIndex >= start && partIndex <= end) {
      return match[3] ?? "";
    }
  }
  return undefined;
}

function parseSourceAnimationSequence(source: string): readonly number[] {
  const match = source.match(/tAnim\s*=\s*\[([^\]]+)\]/i);
  if (!match) {
    return [];
  }
  return String(match[1] ?? "")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

function effectiveSourceAnimationTick(source: string, animationTick: number): number {
  const skipFrames = /pTiming\s*=\s*not\s+pTiming|pSync\s*=\s*not\s+pSync/i.test(source) ? 2 : 1;
  const tick = Math.max(0, Math.trunc(animationTick));
  return Math.floor(tick / skipFrames);
}

function sourcePseudoRandomFrame(count: number, subtract: number, seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % count) + 1 - subtract;
}
