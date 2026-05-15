import {
  DirectorScriptInstance,
  type DirectorEventContext,
  type DirectorMemberRef,
  type DirectorNetStream,
  type DirectorSpriteChannel
} from "../runtime";
import {
  getHabboBootServices,
  type HabboButtonBitmapAssetSet,
  type HabboExternalCastGraph,
  type HabboExternalBitmapAssetSet,
  type HabboExternalCastTextFieldSet,
  type HabboExternalCastVisualLayoutSet,
  type HabboExternalCastWindowLayoutSet,
  type HabboExternalFieldSet,
  type HabboFigurePartIndexSet,
  type HabboInternalBitmapAssetSet,
  type HabboTextFieldSet,
  type HabboVisualBitmapAssetSet,
  type HabboWindowBitmapAssetSet
} from "./HabboBootServices";

const releasesWithDebugPlaybackFlag = new Set(["release14.1_b8"]);
const release1RoseauDcr0910 = "release1_roseau_dcr0910";
const release1RoseauDcr0910HabboEntry = "release1_roseau_dcr0910-habbo_entry";
const release1LoaderTotalBytes = 856948;
const release1LoaderStreamProgressSteps = 4;
const release1LoaderProgressMember: DirectorMemberRef = { castLib: 1, member: 11 };

interface Release1LoaderStream {
  readonly stream: DirectorNetStream;
  readonly file: string;
  readonly fileIndex: number;
  bytes: number;
}

interface Release1LoaderState {
  loadNo: number;
  bytes: number;
  lastFraction: number;
  readonly files: readonly string[];
  readonly currentStreams: Release1LoaderStream[];
  complete: boolean;
}

interface Release1EntryLoaderState {
  readonly files: readonly string[];
  complete: boolean;
}

interface MutableLoaderSpriteChannel {
  loc: {
    x: number;
    y: number;
  };
  width: number | undefined;
  height: number | undefined;
}

export function applyProjectorRaysBootLingoOverrides(
  scripts: Map<string, DirectorScriptInstance>,
  release: string,
  textFieldSet?: HabboTextFieldSet,
  externalFieldSet?: HabboExternalFieldSet,
  externalCastGraph?: HabboExternalCastGraph,
  externalCastTextFieldSet?: HabboExternalCastTextFieldSet,
  externalCastWindowLayoutSet?: HabboExternalCastWindowLayoutSet,
  windowBitmapAssetSet?: HabboWindowBitmapAssetSet,
  externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet,
  visualBitmapAssetSet?: HabboVisualBitmapAssetSet,
  buttonBitmapAssetSet?: HabboButtonBitmapAssetSet,
  internalBitmapAssetSet?: HabboInternalBitmapAssetSet,
  externalBitmapAssetSet?: HabboExternalBitmapAssetSet,
  figurePartIndexSet?: HabboFigurePartIndexSet
): Map<string, DirectorScriptInstance> {
  if (release === release1RoseauDcr0910) {
    return applyRelease1LoaderLingoOverrides(scripts, release, textFieldSet);
  }

  if (release === release1RoseauDcr0910HabboEntry) {
    return applyRelease1EntryLingoOverrides(scripts, release);
  }

  scripts.set("1:1", createInitializationScript(release));
  scripts.set("1:2", createInitBehaviorScript(release));
  scripts.set("1:3", createLoopBehaviorScript(release));
  scripts.set(
    "2:4",
    createClientInitializationScript(
      release,
      textFieldSet,
      externalFieldSet,
      externalCastGraph,
      externalCastTextFieldSet,
      externalCastWindowLayoutSet,
      windowBitmapAssetSet,
      externalCastVisualLayoutSet,
      visualBitmapAssetSet,
      buttonBitmapAssetSet,
      internalBitmapAssetSet,
      externalBitmapAssetSet,
      figurePartIndexSet
    )
  );
  return scripts;
}

function applyRelease1EntryLingoOverrides(
  scripts: Map<string, DirectorScriptInstance>,
  release: string
): Map<string, DirectorScriptInstance> {
  scripts.set("1:2", createRelease1EntryFirstFrameLoadLoopBehaviorScript(release));
  scripts.set("1:3", createRelease1EntryLoadingSystemMovieScript(release));
  return scripts;
}

function applyRelease1LoaderLingoOverrides(
  scripts: Map<string, DirectorScriptInstance>,
  release: string,
  textFieldSet?: HabboTextFieldSet
): Map<string, DirectorScriptInstance> {
  scripts.set("1:1", createRelease1CheckloadBehaviorScript(release));
  scripts.set("1:4", createRelease1StartLoadingBehaviorScript(release));
  scripts.set("1:5", createRelease1LoadScriptsMovieScript(release, textFieldSet));
  scripts.set("1:7", createRelease1LoopBehaviorScript(release));
  scripts.set("1:8", createRelease1GotoEntryBehaviorScript(release));
  return scripts;
}

function createRelease1CheckloadBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:1",
    name: "BehaviorScript 1",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/loader/casts/Internal/BehaviorScript 1.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: (context) => context.movie.dispatchEvent("checkload", [], "movie").handled
      }
    ]
  });
}

function createRelease1StartLoadingBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:4",
    name: "BehaviorScript 4",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/loader/casts/Internal/BehaviorScript 4.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: (context) => context.movie.dispatchEvent("startLoading", [], "movie").handled
      }
    ]
  });
}

function createRelease1LoopBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:7",
    name: "BehaviorScript 7",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/loader/casts/Internal/BehaviorScript 7.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: (context) => {
          context.movie.goCurrentFrame();
          return context.movie.currentFrameIndex;
        }
      }
    ]
  });
}

function createRelease1GotoEntryBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:8",
    name: "BehaviorScript 8",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/loader/casts/Internal/BehaviorScript 8.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: (context) => release1GotoEntryMovie(context, release)
      }
    ]
  });
}

function createRelease1LoadScriptsMovieScript(release: string, textFieldSet?: HabboTextFieldSet): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:5",
    name: "Load Scripts",
    type: "movie",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`,
      sourceTotalBytes: release1LoaderTotalBytes
    },
    handlers: [
      {
        name: "startLoading",
        handler: (context) => release1StartLoading(context, release, textFieldSet)
      },
      {
        name: "nextLoad",
        handler: (context) => release1NextLoad(context, release)
      },
      {
        name: "loadComplete",
        handler: (context) => release1LoadComplete(context, release)
      },
      {
        name: "checkload",
        handler: (context) => release1Checkload(context, release)
      },
      {
        name: "updateBar",
        handler: (context) => release1UpdateBar(context, release)
      }
    ]
  });
}

function release1StartLoading(context: DirectorEventContext, release: string, textFieldSet?: HabboTextFieldSet): boolean {
  const files = release1LoadList(textFieldSet);
  if (files.length === 0) {
    context.movie.unsupported.add({
      subsystem: "habbo",
      feature: "release1-loader-loadlist-missing",
      detail: `${release} startLoading expected extracted field "loadlist" from loader.dcr`,
      source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
    });
    return false;
  }

  const state: Release1LoaderState = {
    loadNo: 0,
    bytes: 0,
    lastFraction: 0,
    files,
    currentStreams: [],
    complete: false
  };
  context.movie.setProperty("release1LoaderState", state);
  context.movie.setProperty("release1LoaderStatus", "Loading Habbo Hotel... (0%)");
  context.movie.unsupported.add({
    subsystem: "director",
    feature: "stream-byte-progress-partial",
    detail: `${release} loader uses getStreamStatus(#bytesSoFar) and spriteBox on sprite 3; this runtime paces the extracted loadlist and clips the source progress sprite, but browser-local files still use estimated per-file byte totals until real stream bytes are exposed`,
    source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
  });

  release1UpdateBar(context, release);
  release1NextLoad(context, release);
  release1NextLoad(context, release);
  return true;
}

function release1NextLoad(context: DirectorEventContext, release: string): boolean {
  const state = release1LoaderState(context);
  if (!state) {
    return false;
  }

  state.loadNo += 1;
  if (state.loadNo <= state.files.length) {
    const file = state.files[state.loadNo - 1] ?? "";
    const bytesTotal = release1EstimatedFileBytes(state.files.length, state.loadNo);
    const stream = context.movie.net.preloadNetThing(file, {
      status: "loading",
      bytesLoaded: 0,
      bytesTotal
    });
    state.currentStreams.push({
      stream,
      file,
      fileIndex: state.loadNo,
      bytes: 0
    });
    context.movie.debugLog.add("boot", "info", `${release} preload ${state.loadNo}/${state.files.length} ${file}`, {
      release,
      file,
      source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
    });
    return true;
  }

  if (state.currentStreams.length === 0) {
    return release1LoadComplete(context, release);
  }

  return false;
}

function release1LoadComplete(context: DirectorEventContext, release: string): boolean {
  const state = release1LoaderState(context);
  if (!state) {
    return false;
  }

  state.complete = true;
  state.lastFraction = 1;
  release1UpdateBar(context, release);

  const entryFrame = release1ScoreBehaviorStartFrame(context, "1:8");
  context.movie.setProperty("release1LoaderComplete", {
    release,
    fileCount: state.files.length,
    nextMovie: "habbo_entry.dcr",
    source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
  });

  if (entryFrame === undefined) {
    context.movie.unsupported.add({
      subsystem: "director",
      feature: "release1-loader-ok-marker-unresolved",
      detail: `${release} loadComplete calls go("ok"), but the generated marker parser has not resolved VWLB labels yet`,
      source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
    });
    return false;
  }

  context.movie.go(entryFrame);
  return true;
}

function release1Checkload(context: DirectorEventContext, release: string): boolean {
  const state = release1LoaderState(context);
  if (!state) {
    return false;
  }

  let changed = false;
  if (!state.complete) {
    changed = release1AdvanceOneLoaderStream(state) || changed;
  }

  let guard = 0;
  while (!state.complete && guard < state.files.length + 4) {
    guard += 1;
    const completedIndex = state.currentStreams.findIndex((entry) => entry.stream.status === "complete");
    if (completedIndex < 0) {
      break;
    }

    const [completed] = state.currentStreams.splice(completedIndex, 1);
    if (completed) {
      completed.bytes = completed.stream.bytesLoaded ?? completed.bytes;
      state.bytes += completed.bytes;
      changed = true;
      release1NextLoad(context, release);
    }

    if (state.currentStreams.length === 0 && state.loadNo > state.files.length) {
      release1LoadComplete(context, release);
      return true;
    }
  }

  release1UpdateBar(context, release);
  if (!state.complete) {
    context.movie.go(Math.max(context.movie.score.firstFrameIndex, context.frameIndex - 3));
  }

  return changed;
}

function release1UpdateBar(context: DirectorEventContext, release: string): boolean {
  const state = release1LoaderState(context);
  if (!state) {
    return false;
  }

  const queued = Math.min(state.loadNo, state.files.length);
  const completed = Math.min(state.files.length, Math.max(0, queued - state.currentStreams.length));
  const inFlightBytes = state.currentStreams.reduce((total, entry) => total + entry.bytes, 0);
  const loadedBytes = Math.min(release1LoaderTotalBytes, state.bytes + inFlightBytes);
  const fraction = state.complete || state.files.length === 0
    ? 1
    : Math.max(state.lastFraction, loadedBytes / release1LoaderTotalBytes);
  state.lastFraction = fraction;
  const percent = Math.floor(fraction * 100);
  const status = state.complete ? "Going to Habbo Hotel ..." : `Loading Habbo Hotel... (${percent}%)`;
  context.movie.cast.getMemberByName("status")?.setText(status);
  release1ApplyLoaderProgressSpriteBox(context, fraction);
  context.movie.setProperty("release1LoaderStatus", status);
  context.movie.setProperty("release1LoaderProgress", {
    release,
    completedFiles: completed,
    queuedFiles: queued,
    totalFiles: state.files.length,
    fraction,
    bytesLoaded: loadedBytes,
    sourceTotalBytes: release1LoaderTotalBytes,
    source: `extracted/projectorrays/${release}/loader/casts/Internal/MovieScript 5 - Load Scripts.ls`
  });
  return true;
}

function release1AdvanceOneLoaderStream(state: Release1LoaderState): boolean {
  const active = state.currentStreams.find((entry) => entry.stream.status === "loading");
  if (!active) {
    return false;
  }

  const bytesTotal = active.stream.bytesTotal ?? release1EstimatedFileBytes(state.files.length, active.fileIndex);
  const step = Math.max(1, Math.ceil(bytesTotal / release1LoaderStreamProgressSteps));
  const bytesLoaded = Math.min(bytesTotal, (active.stream.bytesLoaded ?? 0) + step);
  active.stream.bytesLoaded = bytesLoaded;
  active.bytes = bytesLoaded;
  if (bytesLoaded >= bytesTotal) {
    active.stream.status = "complete";
  }
  return true;
}

function release1EstimatedFileBytes(totalFiles: number, fileIndex: number): number {
  if (totalFiles <= 0) {
    return release1LoaderTotalBytes;
  }

  const base = Math.floor(release1LoaderTotalBytes / totalFiles);
  const remainder = release1LoaderTotalBytes % totalFiles;
  return base + (fileIndex <= remainder ? 1 : 0);
}

function release1ApplyLoaderProgressSpriteBox(context: DirectorEventContext, fraction: number): void {
  const progressMember = context.movie.cast.getMember(release1LoaderProgressMember);
  if (!progressMember?.width || !progressMember.height) {
    return;
  }

  const clippedWidth = Math.max(1, Math.round(progressMember.width * Math.max(0, Math.min(1, fraction))));
  for (const frame of context.movie.score.frames) {
    for (const sprite of frame.sprites) {
      if (
        sprite.member.castLib === release1LoaderProgressMember.castLib
        && sprite.member.member === release1LoaderProgressMember.member
      ) {
        release1SetProgressSpriteWidth(sprite, progressMember.regPoint.x, progressMember.width, progressMember.height, clippedWidth);
      }
    }
  }
}

function release1SetProgressSpriteWidth(
  spriteChannel: DirectorSpriteChannel,
  regX: number,
  sourceWidth: number,
  sourceHeight: number,
  clippedWidth: number
): void {
  const sprite = mutableLoaderSprite(spriteChannel);
  const previousWidth = sprite.width ?? sourceWidth;
  const previousLeft = sprite.loc.x - Math.round((regX * previousWidth) / sourceWidth);
  sprite.width = clippedWidth;
  sprite.height = sourceHeight;
  sprite.loc.x = previousLeft + Math.round((regX * clippedWidth) / sourceWidth);
}

function release1GotoEntryMovie(context: DirectorEventContext, release: string): boolean {
  context.movie.setProperty("release1LoaderStatus", "Going to Habbo Hotel ...");
  context.movie.setProperty("release1GotoNetMovie", {
    release,
    movie: "habbo_entry.dcr",
    source: `extracted/projectorrays/${release}/loader/casts/Internal/BehaviorScript 8.ls`
  });
  context.movie.debugLog.add("boot", "ok", `${release} gotoNetMovie habbo_entry.dcr`, {
    release,
    movie: "habbo_entry.dcr"
  });
  return true;
}

function createRelease1EntryLoadingSystemMovieScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:3",
    name: "LoadingSystem",
    type: "movie",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/MovieScript 3 - LoadingSystem.ls`
    },
    handlers: [
      {
        name: "prepareMovie",
        handler: (context) => release1EntryPrepareMovie(context, release)
      }
    ]
  });
}

function createRelease1EntryFirstFrameLoadLoopBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:2",
    name: "FirstFrameloadLoop",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/BehaviorScript 2 - FirstFrameloadLoop.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: (context) => release1EntryFirstFrameLoadLoop(context, release)
      }
    ]
  });
}

function release1EntryPrepareMovie(context: DirectorEventContext, release: string): boolean {
  const files = release1EntryPreloadList(context);
  for (const file of files) {
    context.movie.net.preloadNetThing(file, { status: "complete" });
  }

  context.movie.setProperty("release1EntryLoaderState", {
    files,
    complete: files.length > 0
  } satisfies Release1EntryLoaderState);
  context.movie.setProperty("release1EntryPreloadFiles", files);
  context.movie.debugLog.add("boot", "info", `${release} prepareMovie preloaded ${files.length} entry resources`, {
    release,
    files,
    source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/MovieScript 3 - LoadingSystem.ls"
  });
  context.movie.unsupported.add({
    subsystem: "director",
    feature: "release1-entry-stream-progress-partial",
    detail: `${release} LoadingSystem/LoaderParent source preloads the entry movie and every non-Internal non-DCR castLib; runtime queues the source-derived files as complete but does not yet expose per-file getStreamStatus byte progress to LoaderStatusBar`,
    source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/ParentScript 1 - LoaderParent.ls"
  });
  return files.length > 0;
}

function release1EntryFirstFrameLoadLoop(context: DirectorEventContext, release: string): boolean {
  const state = release1EntryLoaderState(context);
  if (!state) {
    context.movie.goCurrentFrame();
    return false;
  }

  const complete = state.files.length > 0 && state.files.every((file) => context.movie.net.getStreamStatus(file) === "complete");
  if (!complete) {
    context.movie.goCurrentFrame();
    return false;
  }

  state.complete = true;
  context.movie.setProperty("release1EntryLoaderComplete", {
    release,
    fileCount: state.files.length,
    source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/ParentScript 1 - LoaderParent.ls"
  });
  context.movie.go(context.frameIndex + 1);
  return true;
}

function release1EntryPreloadList(context: DirectorEventContext): readonly string[] {
  const files = ["habbo_entry.dcr"];
  for (const castLib of context.movie.cast.castLibs) {
    if ((castLib.name ?? "") === "Internal") {
      continue;
    }

    const fileName = castLib.fileName ?? "";
    if (fileName.toLowerCase().endsWith(".dcr")) {
      continue;
    }

    const sourceName = castLib.name?.trim();
    if (sourceName) {
      files.push(`${sourceName}.cct`);
    }
  }

  return files;
}

function release1EntryLoaderState(context: DirectorEventContext): Release1EntryLoaderState | undefined {
  const value = context.movie.getProperty("release1EntryLoaderState");
  if (typeof value !== "object" || value === null || !("files" in value)) {
    return undefined;
  }

  return value as Release1EntryLoaderState;
}

function release1LoadList(textFieldSet?: HabboTextFieldSet): readonly string[] {
  const loadlist = textFieldSet?.fields.find((field) => field.memberName === "loadlist");
  return loadlist?.text.split(/\r\n?|\n/).map((line) => line.trim()).filter(Boolean) ?? [];
}

function release1LoaderState(context: DirectorEventContext): Release1LoaderState | undefined {
  const value = context.movie.getProperty("release1LoaderState");
  if (typeof value !== "object" || value === null || !("files" in value) || !("currentStreams" in value)) {
    return undefined;
  }

  return value as Release1LoaderState;
}

function mutableLoaderSprite(sprite: DirectorSpriteChannel): MutableLoaderSpriteChannel {
  return sprite as unknown as MutableLoaderSpriteChannel;
}

function release1ScoreBehaviorStartFrame(context: DirectorEventContext, scriptKey: string): number | undefined {
  return context.movie.score.behaviors.find((behavior) => behavior.scriptKey === scriptKey)?.startFrame;
}

function createInitializationScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:1",
    name: "Initialization",
    type: "movie",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/habbo/casts/Internal/MovieScript 1 - Initialization.ls`
    },
    handlers: [
      {
        name: "prepareMovie",
        handler: (context) => prepareMovie(context, release)
      },
      {
        name: "stopMovie",
        handler: (context) => stopMovie(context)
      }
    ]
  });
}

function createInitBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:2",
    name: "Init",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/habbo/casts/Internal/BehaviorScript 2 - Init.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: initExitFrame
      }
    ]
  });
}

function createLoopBehaviorScript(release: string): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "1:3",
    name: "Loop",
    type: "behavior",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/habbo/casts/Internal/BehaviorScript 3 - Loop.ls`
    },
    handlers: [
      {
        name: "exitFrame",
        handler: loopExitFrame
      }
    ]
  });
}

function createClientInitializationScript(
  release: string,
  textFieldSet?: HabboTextFieldSet,
  externalFieldSet?: HabboExternalFieldSet,
  externalCastGraph?: HabboExternalCastGraph,
  externalCastTextFieldSet?: HabboExternalCastTextFieldSet,
  externalCastWindowLayoutSet?: HabboExternalCastWindowLayoutSet,
  windowBitmapAssetSet?: HabboWindowBitmapAssetSet,
  externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet,
  visualBitmapAssetSet?: HabboVisualBitmapAssetSet,
  buttonBitmapAssetSet?: HabboButtonBitmapAssetSet,
  internalBitmapAssetSet?: HabboInternalBitmapAssetSet,
  externalBitmapAssetSet?: HabboExternalBitmapAssetSet,
  figurePartIndexSet?: HabboFigurePartIndexSet
): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: "2:4",
    name: "Client Initialization Script",
    type: "movie",
    properties: {
      release,
      translationStatus: "source-backed-manual-translation",
      source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 4 - Client Initialization Script.ls`
    },
    handlers: [
      {
        name: "startClient",
        handler: (context) =>
          startClient(
            context,
            release,
            textFieldSet,
            externalFieldSet,
            externalCastGraph,
            externalCastTextFieldSet,
            externalCastWindowLayoutSet,
            windowBitmapAssetSet,
            externalCastVisualLayoutSet,
            visualBitmapAssetSet,
            buttonBitmapAssetSet,
            internalBitmapAssetSet,
            externalBitmapAssetSet,
            figurePartIndexSet
          )
      },
      {
        name: "stopClient",
        handler: (context) => stopClientHandler(context, release)
      },
      {
        name: "resetClient",
        handler: (context) => resetClient(context, release)
      }
    ]
  });
}

function prepareMovie(context: DirectorEventContext, release: string): boolean {
  const castLib = context.movie.cast.getCastLib(2);
  if (!castLib) {
    context.movie.unsupported.add({
      subsystem: "director",
      feature: "missing-boot-castlib",
      detail: `${release} prepareMovie expected castLib(2)`
    });
    return false;
  }

  if (releasesWithDebugPlaybackFlag.has(release)) {
    context.movie.setProperty("debugPlaybackEnabled", 0);
  }

  castLib.preloadMode = 1;
  if (castLib.fileName) {
    context.movie.net.preloadNetThing(castLib.fileName, { status: "complete" });
  } else {
    context.movie.unsupported.add({
      subsystem: "director",
      feature: "missing-castlib-filename",
      detail: `${release} prepareMovie could not preload castLib(2) because fileName is missing`
    });
  }

  context.movie.unsupported.add({
    subsystem: "director",
    feature: "stage-move-to-front",
    detail: `${release} prepareMovie calls moveToFront(the stage); browser window z-order is not modeled`
  });
  context.movie.setProperty("exitLock", 1);
  context.movie.puppetTempo(15);

  return context.movie.net.netDone();
}

function stopMovie(context: DirectorEventContext): boolean {
  const stopClient = context.movie.dispatchEvent("stopClient", [], "movie");
  context.movie.go(1);
  return stopClient.handled;
}

function startClient(
  context: DirectorEventContext,
  release: string,
  textFieldSet?: HabboTextFieldSet,
  externalFieldSet?: HabboExternalFieldSet,
  externalCastGraph?: HabboExternalCastGraph,
  externalCastTextFieldSet?: HabboExternalCastTextFieldSet,
  externalCastWindowLayoutSet?: HabboExternalCastWindowLayoutSet,
  windowBitmapAssetSet?: HabboWindowBitmapAssetSet,
  externalCastVisualLayoutSet?: HabboExternalCastVisualLayoutSet,
  visualBitmapAssetSet?: HabboVisualBitmapAssetSet,
  buttonBitmapAssetSet?: HabboButtonBitmapAssetSet,
  internalBitmapAssetSet?: HabboInternalBitmapAssetSet,
  externalBitmapAssetSet?: HabboExternalBitmapAssetSet,
  figurePartIndexSet?: HabboFigurePartIndexSet
): boolean {
  return getHabboBootServices(context.movie)
    .setTextFieldSet(textFieldSet)
    .setExternalFieldSet(externalFieldSet)
    .setExternalCastGraph(externalCastGraph)
    .setExternalCastTextFieldSet(externalCastTextFieldSet)
    .setExternalCastWindowLayoutSet(externalCastWindowLayoutSet)
    .setExternalCastVisualLayoutSet(externalCastVisualLayoutSet)
    .setWindowBitmapAssetSet(windowBitmapAssetSet)
    .setVisualBitmapAssetSet(visualBitmapAssetSet)
    .setButtonBitmapAssetSet(buttonBitmapAssetSet)
    .setInternalBitmapAssetSet(internalBitmapAssetSet)
    .setExternalBitmapAssetSet(externalBitmapAssetSet)
    .setFigurePartIndexSet(figurePartIndexSet)
    .startClient(release);
}

function stopClientHandler(context: DirectorEventContext, release: string): boolean {
  return getHabboBootServices(context.movie).stopClient(release);
}

function resetClient(context: DirectorEventContext, release: string): boolean {
  context.movie.unsupported.add({
    subsystem: "lingo",
    feature: "reset-client-not-translated",
    detail: `${release} resetClient is indexed but not translated because browser reload/navigation semantics need a separate adapter decision`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/MovieScript 4 - Client Initialization Script.ls`
  });
  return false;
}

function initExitFrame(context: DirectorEventContext): boolean {
  if (context.movie.net.netDone()) {
    return context.movie.dispatchEvent("startClient", [], "movie").handled;
  }

  context.movie.goCurrentFrame();
  return false;
}

function loopExitFrame(context: DirectorEventContext): number {
  context.movie.goCurrentFrame();
  return context.movie.currentFrameIndex;
}
