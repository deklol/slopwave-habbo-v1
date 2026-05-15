import figureAnimationManifest from "../../../../generated/runtime-data/figure-animation-manifest.json";
import type { HabboFigureTemplateAction } from "./HabboFigureData";

export interface HabboFigureAnimationActionSpec {
  readonly runtimeAction: string;
  readonly sourceActions: readonly string[];
  readonly sizes: readonly string[];
  readonly parts: readonly string[];
  readonly directions: readonly number[];
  readonly frames: readonly number[];
  readonly sourceMemberCount: number;
}

export interface HabboFigureSourceActionRuleRuntime {
  readonly sourceAction: string;
  readonly aliases: readonly string[];
  readonly runtimeActionWhenIdle?: HabboFigureTemplateAction;
  readonly stateFlags: readonly string[];
  readonly sourceFramePacing?: HabboFigureSourceActionFramePacingRuntime;
  readonly partActionRules: readonly HabboFigureSourceActionPartRuleRuntime[];
}

export interface HabboFigureSourceActionFramePacingRuntime {
  readonly source: string;
  readonly counterModulo?: number;
  readonly cycleLength?: number;
  readonly standingFrame?: number;
  readonly movingFrameSource?: string;
  readonly statusLifetime?: string;
}

export interface HabboFigureSourceActionPartRuleRuntime {
  readonly when: string;
  readonly parts: readonly string[];
  readonly action?: string;
  readonly actionFromStatusParam?: HabboFigureSourceActionParamRuntime;
  readonly frame?: HabboFigureSourceActionFrameRuntime;
  readonly phase?: HabboFigureSourceActionPhaseRuntime;
}

export interface HabboFigureSourceActionParamRuntime {
  readonly paramIndex: number;
  readonly prefix?: string;
  readonly charStart?: number;
  readonly charCount?: number;
  readonly sourceLingoWord?: number;
}

export interface HabboFigureSourceActionFrameRuntime {
  readonly source: string;
  readonly value?: number;
  readonly values?: readonly number[];
}

export interface HabboFigureSourceActionPhaseRuntime {
  readonly source: string;
  readonly modulo?: number;
  readonly remainder?: number;
}

export interface HabboFigureHumanRuntimeMetadata {
  readonly movement?: HabboFigureHumanMovementMetadata;
  readonly animationLoop?: HabboFigureHumanAnimationLoopMetadata;
  readonly statusActionInventory: readonly HabboFigureHumanStatusActionInventoryEntry[];
}

export interface HabboFigureHumanMovementMetadata {
  readonly sourceAction: string;
  readonly runtimeAction: string;
  readonly sourceFrameAction: string;
  readonly durationMs: number;
  readonly frames: readonly number[];
  readonly frameCycleLength: number;
}

export interface HabboFigureHumanAnimationLoopMetadata {
  readonly exitFrameCounterModulo?: number;
  readonly danceCounterModulo?: number;
}

export interface HabboFigureHumanStatusActionInventoryEntry {
  readonly sourceAction: string;
  readonly sourceHandlers: readonly string[];
  readonly stateAssignments: Readonly<Record<string, readonly number[]>>;
  readonly mainActions: readonly string[];
  readonly pActionWrites: Readonly<Record<string, readonly string[]>>;
  readonly statusParamWords: readonly number[];
  readonly referencedSourceActions: readonly string[];
}

interface RawFigureAnimationManifest {
  readonly releases?: readonly RawFigureAnimationRelease[];
}

interface RawFigureAnimationRelease {
  readonly versionId?: string;
  readonly release?: string;
  readonly actions?: readonly RawFigureAnimationAction[];
  readonly humanActionMetadata?: readonly RawFigureSourceActionRule[];
  readonly humanRuntimeMetadata?: RawFigureHumanRuntimeMetadata;
}

interface RawFigureAnimationAction {
  readonly runtimeAction?: string;
  readonly sourceActions?: readonly string[];
  readonly sizes?: readonly string[];
  readonly parts?: readonly string[];
  readonly directions?: readonly number[];
  readonly frames?: readonly number[];
  readonly sourceMemberCount?: number;
}

interface RawFigureSourceActionRule {
  readonly sourceAction?: string;
  readonly aliases?: readonly string[];
  readonly runtimeActionWhenIdle?: string;
  readonly stateFlags?: readonly string[];
  readonly sourceFramePacing?: RawFigureSourceActionFramePacing;
  readonly partActionRules?: readonly RawFigureSourceActionPartRule[];
}

interface RawFigureSourceActionFramePacing {
  readonly source?: string;
  readonly counterModulo?: number;
  readonly cycleLength?: number;
  readonly standingFrame?: number;
  readonly movingFrameSource?: string;
  readonly statusLifetime?: string;
}

interface RawFigureSourceActionPartRule {
  readonly when?: string;
  readonly parts?: readonly string[];
  readonly action?: string;
  readonly actionFromStatusParam?: RawFigureSourceActionParam;
  readonly frame?: RawFigureSourceActionFrame;
  readonly phase?: RawFigureSourceActionPhase;
}

interface RawFigureSourceActionParam {
  readonly paramIndex?: number;
  readonly prefix?: string;
  readonly charStart?: number;
  readonly charCount?: number;
  readonly sourceLingoWord?: number;
}

interface RawFigureSourceActionFrame {
  readonly source?: string;
  readonly value?: number;
  readonly values?: readonly number[];
}

interface RawFigureSourceActionPhase {
  readonly source?: string;
  readonly modulo?: number;
  readonly remainder?: number;
}

interface RawFigureHumanRuntimeMetadata {
  readonly movement?: RawFigureHumanMovementMetadata;
  readonly animationLoop?: RawFigureHumanAnimationLoopMetadata;
  readonly statusActionInventory?: readonly RawFigureHumanStatusActionInventoryEntry[];
}

interface RawFigureHumanMovementMetadata {
  readonly sourceAction?: string;
  readonly runtimeAction?: string;
  readonly sourceFrameAction?: string;
  readonly durationMs?: number;
  readonly frames?: readonly number[];
  readonly frameCycleLength?: number;
}

interface RawFigureHumanAnimationLoopMetadata {
  readonly exitFrameCounterModulo?: number;
  readonly danceCounterModulo?: number;
}

interface RawFigureHumanStatusActionInventoryEntry {
  readonly sourceAction?: string;
  readonly sourceHandlers?: readonly string[];
  readonly stateAssignments?: Readonly<Record<string, readonly number[]>>;
  readonly mainActions?: readonly string[];
  readonly pActionWrites?: Readonly<Record<string, readonly string[]>>;
  readonly statusParamWords?: readonly number[];
  readonly referencedSourceActions?: readonly string[];
}

const fallbackDirections = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const fallbackStaticActions = ["std", "smile", "sit", "lay"] as const;
const fallbackFramesByAction: Readonly<Record<HabboFigureTemplateAction, readonly number[]>> = {
  std: [0],
  walk: [0, 1, 2, 3],
  wave: [0, 1],
  smile: [0],
  sit: [0],
  lay: [0]
};

const manifest = figureAnimationManifest as RawFigureAnimationManifest;

export function getFigureAnimationActionSpecRuntime(
  release: string,
  action: HabboFigureTemplateAction
): HabboFigureAnimationActionSpec {
  const raw = findReleaseAction(release, action);
  if (!raw) {
    return fallbackActionSpec(action);
  }

  return {
    runtimeAction: action,
    sourceActions: cleanStrings(raw.sourceActions),
    sizes: cleanStrings(raw.sizes),
    parts: cleanStrings(raw.parts),
    directions: cleanNumbers(raw.directions),
    frames: cleanNumbers(raw.frames),
    sourceMemberCount: Number.isFinite(raw.sourceMemberCount) ? raw.sourceMemberCount as number : 0
  };
}

export function getFigureAnimationFramesRuntime(release: string, action: HabboFigureTemplateAction): readonly number[] {
  const frames = getFigureAnimationActionSpecRuntime(release, action).frames;
  return frames.length > 0 ? frames : fallbackFramesByAction[action];
}

export function getFigureSourceActionSpecRuntime(release: string, sourceAction: string): HabboFigureAnimationActionSpec {
  const normalized = sourceAction.trim();
  const raw = findReleaseSourceAction(release, normalized);
  if (!raw) {
    return {
      runtimeAction: normalized,
      sourceActions: normalized.length > 0 ? [normalized] : [],
      sizes: [],
      parts: [],
      directions: fallbackDirections,
      frames: [0],
      sourceMemberCount: 0
    };
  }

  return {
    runtimeAction: raw.runtimeAction ?? normalized,
    sourceActions: cleanStrings(raw.sourceActions),
    sizes: cleanStrings(raw.sizes),
    parts: cleanStrings(raw.parts),
    directions: cleanNumbers(raw.directions),
    frames: cleanNumbers(raw.frames),
    sourceMemberCount: Number.isFinite(raw.sourceMemberCount) ? raw.sourceMemberCount as number : 0
  };
}

export function getFigureSourceActionFramesRuntime(release: string, sourceAction: string): readonly number[] {
  const frames = getFigureSourceActionSpecRuntime(release, sourceAction).frames;
  return frames.length > 0 ? frames : [0];
}

export function getFigureSourceActionRuleRuntime(
  release: string,
  sourceAction: string
): HabboFigureSourceActionRuleRuntime | undefined {
  const normalized = sourceAction.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  const raw = findRelease(release)?.humanActionMetadata?.find((entry) => {
    return entry.sourceAction === normalized || entry.aliases?.includes(normalized) === true;
  });
  if (!raw?.sourceAction) {
    return undefined;
  }

  return {
    sourceAction: raw.sourceAction,
    aliases: cleanStrings(raw.aliases),
    ...(isFigureTemplateAction(raw.runtimeActionWhenIdle) ? { runtimeActionWhenIdle: raw.runtimeActionWhenIdle } : {}),
    stateFlags: cleanStrings(raw.stateFlags),
    ...(raw.sourceFramePacing ? { sourceFramePacing: cleanSourceActionFramePacing(raw.sourceFramePacing) } : {}),
    partActionRules: cleanPartActionRules(raw.partActionRules)
  };
}

export function getFigureHumanRuntimeMetadataRuntime(release: string): HabboFigureHumanRuntimeMetadata | undefined {
  const raw = findRelease(release)?.humanRuntimeMetadata;
  if (!raw) {
    return undefined;
  }

  return {
    ...(raw.movement ? { movement: cleanHumanMovementMetadata(raw.movement) } : {}),
    ...(raw.animationLoop ? { animationLoop: cleanHumanAnimationLoopMetadata(raw.animationLoop) } : {}),
    statusActionInventory: cleanHumanStatusActionInventory(raw.statusActionInventory)
  };
}

export function getFigureHumanMovementDurationMsRuntime(release: string): number | undefined {
  const durationMs = getFigureHumanRuntimeMetadataRuntime(release)?.movement?.durationMs;
  return typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined;
}

export function getFigureHumanStatusActionInventoryEntryRuntime(
  release: string,
  sourceAction: string
): HabboFigureHumanStatusActionInventoryEntry | undefined {
  const normalized = sourceAction.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  return getFigureHumanRuntimeMetadataRuntime(release)?.statusActionInventory.find((entry) => entry.sourceAction === normalized);
}

export function normalizeFigureSourceActionFrameRuntime(release: string, sourceAction: string, frame: number): number {
  const frames = getFigureSourceActionFramesRuntime(release, sourceAction);
  if (frames.length === 0) {
    return 0;
  }

  const safeFrame = Number.isFinite(frame) ? Math.trunc(frame) : 0;
  const index = ((safeFrame % frames.length) + frames.length) % frames.length;
  return frames[index] ?? 0;
}

export function normalizeFigureAnimationFrameRuntime(release: string, action: HabboFigureTemplateAction, frame: number): number {
  const frames = getFigureAnimationFramesRuntime(release, action);
  if (frames.length === 0) {
    return 0;
  }

  const safeFrame = Number.isFinite(frame) ? Math.trunc(frame) : 0;
  const index = ((safeFrame % frames.length) + frames.length) % frames.length;
  return frames[index] ?? 0;
}

export function getFigureAnimationDirectionsRuntime(release: string): readonly number[] {
  const entry = findRelease(release);
  if (!entry) {
    return fallbackDirections;
  }

  const directions = new Set<number>();
  for (const action of entry.actions ?? []) {
    for (const direction of cleanNumbers(action.directions)) {
      directions.add(direction);
    }
  }

  const sorted = [...directions].sort((left, right) => left - right);
  return sorted.length > 0 ? sorted : fallbackDirections;
}

export function getFigureStaticPreloadActionsRuntime(release: string): readonly HabboFigureTemplateAction[] {
  const entry = findRelease(release);
  if (!entry) {
    return fallbackStaticActions;
  }

  const available = new Set((entry.actions ?? []).map((action) => action.runtimeAction));
  const actions = fallbackStaticActions.filter((action) => available.has(action));
  return actions.length > 0 ? actions : fallbackStaticActions;
}

function findReleaseAction(release: string, action: HabboFigureTemplateAction): RawFigureAnimationAction | undefined {
  return findRelease(release)?.actions?.find((entry) => entry.runtimeAction === action);
}

function findReleaseSourceAction(release: string, sourceAction: string): RawFigureAnimationAction | undefined {
  return findRelease(release)?.actions?.find((entry) => {
    return entry.runtimeAction === sourceAction || entry.sourceActions?.includes(sourceAction) === true;
  });
}

function findRelease(release: string): RawFigureAnimationRelease | undefined {
  return manifest.releases?.find((entry) => {
    return entry.release === release || entry.versionId === release || (entry.versionId ? release.startsWith(entry.versionId) : false);
  });
}

function fallbackActionSpec(action: HabboFigureTemplateAction): HabboFigureAnimationActionSpec {
  return {
    runtimeAction: action,
    sourceActions: [],
    sizes: [],
    parts: [],
    directions: fallbackDirections,
    frames: fallbackFramesByAction[action],
    sourceMemberCount: 0
  };
}

function cleanPartActionRules(
  rules: readonly RawFigureSourceActionPartRule[] | undefined
): readonly HabboFigureSourceActionPartRuleRuntime[] {
  if (!rules) {
    return [];
  }

  return rules
    .map(cleanPartActionRule)
    .filter((rule): rule is HabboFigureSourceActionPartRuleRuntime => rule !== undefined);
}

function cleanSourceActionFramePacing(
  raw: RawFigureSourceActionFramePacing
): HabboFigureSourceActionFramePacingRuntime {
  return {
    source: typeof raw.source === "string" && raw.source.length > 0 ? raw.source : "unknown",
    ...(Number.isFinite(raw.counterModulo) ? { counterModulo: Math.max(1, Math.trunc(raw.counterModulo as number)) } : {}),
    ...(Number.isFinite(raw.cycleLength) ? { cycleLength: Math.max(1, Math.trunc(raw.cycleLength as number)) } : {}),
    ...(Number.isFinite(raw.standingFrame) ? { standingFrame: Math.max(0, Math.trunc(raw.standingFrame as number)) } : {}),
    ...(typeof raw.movingFrameSource === "string" && raw.movingFrameSource.length > 0 ? { movingFrameSource: raw.movingFrameSource } : {}),
    ...(typeof raw.statusLifetime === "string" && raw.statusLifetime.length > 0 ? { statusLifetime: raw.statusLifetime } : {})
  };
}

function cleanPartActionRule(
  rule: RawFigureSourceActionPartRule
): HabboFigureSourceActionPartRuleRuntime | undefined {
  const when = typeof rule.when === "string" && rule.when.length > 0 ? rule.when : "always";
  const parts = cleanStrings(rule.parts);
  if (parts.length === 0) {
    return undefined;
  }

  return {
    when,
    parts,
    ...(typeof rule.action === "string" && rule.action.length > 0 ? { action: rule.action } : {}),
    ...(rule.actionFromStatusParam ? { actionFromStatusParam: cleanActionParam(rule.actionFromStatusParam) } : {}),
    ...(rule.frame ? { frame: cleanActionFrame(rule.frame) } : {}),
    ...(rule.phase ? { phase: cleanActionPhase(rule.phase) } : {})
  };
}

function cleanActionParam(param: RawFigureSourceActionParam): HabboFigureSourceActionParamRuntime {
  return {
    paramIndex: Number.isFinite(param.paramIndex) ? Math.max(0, Math.trunc(param.paramIndex as number)) : 0,
    ...(typeof param.prefix === "string" && param.prefix.length > 0 ? { prefix: param.prefix } : {}),
    ...(Number.isFinite(param.charStart) ? { charStart: Math.max(0, Math.trunc(param.charStart as number)) } : {}),
    ...(Number.isFinite(param.charCount) ? { charCount: Math.max(0, Math.trunc(param.charCount as number)) } : {}),
    ...(Number.isFinite(param.sourceLingoWord) ? { sourceLingoWord: Math.max(1, Math.trunc(param.sourceLingoWord as number)) } : {})
  };
}

function cleanActionFrame(frame: RawFigureSourceActionFrame): HabboFigureSourceActionFrameRuntime {
  return {
    source: typeof frame.source === "string" && frame.source.length > 0 ? frame.source : "constant",
    ...(Number.isFinite(frame.value) ? { value: Math.trunc(frame.value as number) } : {}),
    ...(frame.values ? { values: cleanNumbers(frame.values) } : {})
  };
}

function cleanActionPhase(phase: RawFigureSourceActionPhase): HabboFigureSourceActionPhaseRuntime {
  return {
    source: typeof phase.source === "string" && phase.source.length > 0 ? phase.source : "unknown",
    ...(Number.isFinite(phase.modulo) ? { modulo: Math.max(1, Math.trunc(phase.modulo as number)) } : {}),
    ...(Number.isFinite(phase.remainder) ? { remainder: Math.max(0, Math.trunc(phase.remainder as number)) } : {})
  };
}

function cleanHumanMovementMetadata(raw: RawFigureHumanMovementMetadata): HabboFigureHumanMovementMetadata {
  return {
    sourceAction: typeof raw.sourceAction === "string" && raw.sourceAction.length > 0 ? raw.sourceAction : "mv",
    runtimeAction: typeof raw.runtimeAction === "string" && raw.runtimeAction.length > 0 ? raw.runtimeAction : "walk",
    sourceFrameAction: typeof raw.sourceFrameAction === "string" && raw.sourceFrameAction.length > 0 ? raw.sourceFrameAction : "wlk",
    durationMs: Number.isFinite(raw.durationMs) ? Math.max(1, Math.trunc(raw.durationMs as number)) : 500,
    frames: cleanNumbers(raw.frames),
    frameCycleLength: Number.isFinite(raw.frameCycleLength) ? Math.max(1, Math.trunc(raw.frameCycleLength as number)) : 4
  };
}

function cleanHumanAnimationLoopMetadata(raw: RawFigureHumanAnimationLoopMetadata): HabboFigureHumanAnimationLoopMetadata {
  return {
    ...(Number.isFinite(raw.exitFrameCounterModulo)
      ? { exitFrameCounterModulo: Math.max(1, Math.trunc(raw.exitFrameCounterModulo as number)) }
      : {}),
    ...(Number.isFinite(raw.danceCounterModulo)
      ? { danceCounterModulo: Math.max(1, Math.trunc(raw.danceCounterModulo as number)) }
      : {})
  };
}

function cleanHumanStatusActionInventory(
  entries: readonly RawFigureHumanStatusActionInventoryEntry[] | undefined
): readonly HabboFigureHumanStatusActionInventoryEntry[] {
  if (!entries) {
    return [];
  }

  return entries
    .map(cleanHumanStatusActionInventoryEntry)
    .filter((entry): entry is HabboFigureHumanStatusActionInventoryEntry => entry !== undefined);
}

function cleanHumanStatusActionInventoryEntry(
  raw: RawFigureHumanStatusActionInventoryEntry
): HabboFigureHumanStatusActionInventoryEntry | undefined {
  if (typeof raw.sourceAction !== "string" || raw.sourceAction.length === 0) {
    return undefined;
  }

  return {
    sourceAction: raw.sourceAction,
    sourceHandlers: cleanStrings(raw.sourceHandlers),
    stateAssignments: cleanNumberRecord(raw.stateAssignments),
    mainActions: cleanStrings(raw.mainActions),
    pActionWrites: cleanStringRecord(raw.pActionWrites),
    statusParamWords: cleanNumbers(raw.statusParamWords),
    referencedSourceActions: cleanStrings(raw.referencedSourceActions)
  };
}

function isFigureTemplateAction(action: string | undefined): action is HabboFigureTemplateAction {
  return action === "std" || action === "walk" || action === "wave" || action === "smile" || action === "sit" || action === "lay";
}

function cleanNumbers(values: readonly number[] | undefined): readonly number[] {
  if (!values) {
    return [];
  }

  return [...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Math.trunc(value)))]
    .sort((left, right) => left - right);
}

function cleanStrings(values: readonly string[] | undefined): readonly string[] {
  if (!values) {
    return [];
  }

  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function cleanNumberRecord(
  record: Readonly<Record<string, readonly number[]>> | undefined
): Readonly<Record<string, readonly number[]>> {
  if (!record || typeof record !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, cleanNumbers(values)])
  );
}

function cleanStringRecord(
  record: Readonly<Record<string, readonly string[]>> | undefined
): Readonly<Record<string, readonly string[]>> {
  if (!record || typeof record !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, cleanStrings(values)])
  );
}
