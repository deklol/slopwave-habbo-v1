import "./styles.css";
import {
  formatMetricNumber,
  normalizeRareCatalogueOption,
  rareCatalogueOptionsForAdapter,
  readRuntimeMemorySnapshot,
  type RareCatalogueOption
} from "./runtimeControlData";
import {
  HabboRuntime,
  getHabboBootServices,
  getHabboRuntimeAvailability,
  getButtonBitmapAssetSet,
  getExternalCastGraph,
  getExternalCastTextFieldSet,
  getExternalCastVisualLayoutSet,
  getExternalCastWindowLayoutSet,
  getExternalBitmapAssetSet,
  getExternalFieldSet,
  getFigurePartIndexSet,
  getInternalBitmapAssetSet,
  getProjectorRaysLingoScripts,
  getProjectorRaysLingoScriptsByRelease,
  getProjectorRaysManifest,
  getProjectorRaysManifestByRelease,
  getProjectorRaysReleaseName,
  getProjectorRaysTextFieldSet,
  getVisualBitmapAssetSet,
  getWindowBitmapAssetSet,
  habboVersionAdapters,
  encodeHabboApproveNameRequest,
  encodeHabboCallForHelpRequest,
  encodeHabboFindUserRequest,
  encodeHabboLoginRequest,
  encodeHabboRegistrationRequest,
  encodeHabboV14HandshakeCommand,
  encodeV1TextClientPacket,
  Base64Vl64PacketWriter,
  decodeVl64,
  HABBO_CLUB_DEFAULT_UI_MODE,
  HABBO_CLUB_V7_SOURCE_UI_MODE,
  HabboWebSocketBridge,
  installDefaultHabboFigureAvailabilityPolicy,
  getHabboBridgePacketNameRegistry,
  hasProjectorRaysManifest,
  isHabboVersionId,
  loadHabboFigureAvailabilityPolicyOverride,
  normalizeHabboClubUiMode,
  type HabboBridgeEvent,
  type HabboClubUiMode,
  type HabboManifestSource,
  type HabboVersionAdapter,
  type HabboWindowInteractiveElement
} from "../habbo";
import {
  activateRelease1EntryForgotPasswordElement,
  activateRelease1EntryLoginElement,
  activateRelease1EntryHotelElement,
  activateRelease1EntryRegistrationElement,
  advanceRelease1EntryConnectionFlow,
  advanceRelease1EntryPostLoginTimeline,
  advanceRelease1EntryScoreAnimation,
  completeRelease1EntryEnterpriseError,
  completeRelease1EntrySystemBroadcast,
  completeRelease1EntryFlatLetIn,
  completeRelease1EntryFlatResults,
  completeRelease1EntryUnitMembers,
  completeRelease1EntryRegistrationNamePacket,
  completeRelease1EntryUnitsFromAllUnits,
  completeRelease1EntryLoginFromUserObject,
  completeRelease1EntryWalletBalance,
  activateRelease1CatalogueElement,
  handleRelease1CatalogueOrderInfoPacket,
  handleRelease1CataloguePurchaseResultPacket,
  markRelease1CatalogueTextRequestSent,
  readRelease1CatalogueTextRequests,
  activateRelease1PrivateRoomElement,
  activateRelease1MessengerElement,
  moveRelease1MessengerBy,
  syncRelease1MessengerIfOpen,
  completeRelease1EntryNavigatorRoomLoad,
  deferRelease1PrivateRoomBootstrapPacket,
  prepareRelease1PrivateRoomAfterFlatLetIn,
  prepareRelease1PrivateRoomObjectsPacket,
  prepareRelease1PrivateRoomStatusPacket,
  queueRelease1EntryRegistrationNameCheck,
  recordRelease1PrivateRoomReady,
  setRelease1EntryForgotPasswordFieldValue,
  setRelease1EntryRegistrationFieldValue,
  setRelease1EntryLoginFieldValue,
  submitRelease1EntryLoginField,
  validateRelease1EntryForgotPasswordField,
  hydrateRelease1EntryAvatarCasts,
  syncRelease1EntryAvatarSprites,
  syncRelease1EntryInteractions,
  syncRelease1EntryNavigatorRoomLoadProgress
} from "../habbo/compatibility/v1";
import { cataloguePageRequestBody } from "../habbo/ui/HabboCatalogueDialog";
import { PixiStageRenderer } from "../renderer";

const DIRECTOR_FONT_LOAD_TIMEOUT_MS = 1500;
const DEBUG_CONSOLE_MAX_RENDERED_LINES = 2500;
const RARE_CATALOGUE_STORAGE_KEY = "directorHabboRuntime.rareCatalogueChoices";
const RELEASE1_LOADER_RELEASE = "release1_roseau_dcr0910";
const RELEASE1_ENTRY_RELEASE = "release1_roseau_dcr0910-habbo_entry";

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("Missing #app host");
}

const firstAdapter = habboVersionAdapters[0];
if (!firstAdapter) {
  throw new Error("No Habbo version adapters registered");
}

const initialSearchParams = new URLSearchParams(window.location.search);
const standaloneRuntime = initialSearchParams.get("standalone") === "1"
  || initialSearchParams.get("gameOnly") === "1"
  || initialSearchParams.get("portable") === "1";
if (standaloneRuntime) {
  document.documentElement.classList.add("runtime-game-only");
}
const requestedAdapterId = initialSearchParams.get("version") ?? initialSearchParams.get("adapter");
const requestedAdapter = requestedAdapterId && isHabboVersionId(requestedAdapterId)
  ? habboVersionAdapters.find((candidate) => candidate.id === requestedAdapterId)
  : undefined;
const defaultAdapter = habboVersionAdapters.find((candidate) => candidate.id === "release7") ?? firstAdapter;
let adapter = requestedAdapter ?? defaultAdapter;
const requestedManifestSource = initialSearchParams.get("source") ?? initialSearchParams.get("manifest");
let manifestSource: HabboManifestSource = requestedManifestSource
  ? requestedManifestSource === "projectorrays" && hasProjectorRaysManifest(adapter.id)
    ? "projectorrays"
    : "probe"
  : hasProjectorRaysManifest(adapter.id)
    ? "projectorrays"
    : "probe";
let loaderLogoChoice: "original" | "dl" = initialSearchParams.has("loaderLogo")
  ? initialSearchParams.get("loaderLogo") === "dl" ? "dl" : "original"
  : "dl";
let habboClubUiMode: HabboClubUiMode = normalizeHabboClubUiMode(initialSearchParams.get("clubUi"));
let release1EntryPrewarm: Release1EntryPrewarm | undefined;
let runtime = createRuntime(adapter, manifestSource);
let renderer: PixiStageRenderer | undefined;
let bootContinuationTimers: number[] = [];
let directorDelayTimer: number | undefined;
let directorAnimationFrame: number | undefined;
let directorAnimationLastTime = 0;
let directorAnimationRenderInFlight = false;
let roomBootstrapFinalizeFrame: number | undefined;
let runtimeErrors: string[] = [];
let directorFontsPromise: Promise<void> | undefined;
let bridge: HabboWebSocketBridge | undefined;
let bridgeEvents: HabboBridgeEvent[] = [];
let debugConsoleState: DebugConsoleRenderState | undefined;
let trafficConsoleState: DebugConsoleRenderState | undefined;
let release14PendingLoginCredentials: { readonly username: string; readonly password: string; readonly passwordLength: number } | undefined;
let release1SessionCredentials: {
  readonly username: string;
  readonly password: string;
  readonly passwordLength: number;
  readonly authenticated: boolean;
} | undefined;
let release1BridgeAuthenticated = false;
let release1BridgeReloginSent = false;
let rareCatalogueChoiceByVersion = readStoredRareCatalogueChoices();
let runtimeFps = 0;
let runtimeFpsSampleStartedAt = window.performance.now();
let runtimeFpsSampleFrames = 0;
let lastBridgeSendTimestamp: number | undefined;
let lastBridgeLatencyMs: number | undefined;
let capturedRelease1NavigatorContextElement: string | undefined;

declare global {
  interface Window {
    __directorHabboDebug?: {
      runtime: HabboRuntime;
      adapter: HabboVersionAdapter;
      manifestSource: HabboManifestSource;
      habboClubUiMode: HabboClubUiMode;
    };
  }
}

function publishRuntimeDebugHandle(): void {
  window.__directorHabboDebug = {
    runtime,
    adapter,
    manifestSource,
    habboClubUiMode
  };
}

const toolbar = document.createElement("header");
toolbar.className = "runtime-toolbar";

const toolbarControls = document.createElement("div");
toolbarControls.className = "runtime-toolbar-controls";

const versionSelect = document.createElement("select");
versionSelect.className = "version-select";
versionSelect.setAttribute("aria-label", "Habbo version");
for (const candidate of habboVersionAdapters) {
  const option = document.createElement("option");
  option.value = candidate.id;
  option.textContent = candidate.label;
  versionSelect.append(option);
}
versionSelect.value = adapter.id;

const manifestSourceSelect = document.createElement("select");
manifestSourceSelect.className = "manifest-source-select";
manifestSourceSelect.setAttribute("aria-label", "Manifest source");
manifestSourceSelect.append(
  new Option("Adapter probe manifest", "probe"),
  new Option("ProjectorRays extracted manifest", "projectorrays")
);

const loaderLogoSelect = document.createElement("select");
loaderLogoSelect.className = "loader-logo-select";
loaderLogoSelect.setAttribute("aria-label", "Loader logo");
loaderLogoSelect.append(
  new Option("Original loader logo", "original"),
  new Option("dl_logo override", "dl")
);
loaderLogoSelect.value = loaderLogoChoice;

const clubUiSelect = document.createElement("select");
clubUiSelect.className = "club-ui-select";
clubUiSelect.setAttribute("aria-label", "Habbo Club UI mode");
clubUiSelect.append(
  new Option("Club UI: v14 status", HABBO_CLUB_DEFAULT_UI_MODE),
  new Option("Club UI: v7 source", HABBO_CLUB_V7_SOURCE_UI_MODE)
);
clubUiSelect.value = habboClubUiMode;

const rareCatalogueSelect = document.createElement("select");
rareCatalogueSelect.className = "rare-catalogue-select";
rareCatalogueSelect.setAttribute("aria-label", "Rare catalogue page");

const rareCatalogueApplyButton = document.createElement("button");
rareCatalogueApplyButton.className = "rare-catalogue-apply";
rareCatalogueApplyButton.type = "button";
rareCatalogueApplyButton.textContent = "Open rare page";

const rareCatalogueStatus = document.createElement("p");
rareCatalogueStatus.className = "rare-catalogue-status";
rareCatalogueStatus.textContent = "Requires the matching local server and bridge.";

const auratusReferenceLink = document.createElement("a");
auratusReferenceLink.className = "auratus-reference-link";
auratusReferenceLink.href = "/auratus-reference/";
auratusReferenceLink.target = "_blank";
auratusReferenceLink.rel = "noreferrer";
auratusReferenceLink.textContent = "Open Auratus/Libre v7 Reference";

const runtimeStatus = document.createElement("section");
runtimeStatus.className = "runtime-status";
runtimeStatus.setAttribute("aria-label", "Selected version runtime status");

const runtimeMetricsPanel = document.createElement("section");
runtimeMetricsPanel.className = "runtime-metrics-panel";
runtimeMetricsPanel.setAttribute("aria-label", "Runtime performance counters");

const stageHost = document.createElement("section");
stageHost.className = "stage-host";
stageHost.setAttribute("aria-label", runtime.movie.name);

const interactionLayer = document.createElement("div");
interactionLayer.className = "director-interaction-layer";

const stageColumn = document.createElement("section");
stageColumn.className = "stage-column";

const debugConsole = document.createElement("section");
debugConsole.className = "runtime-debug-console";
debugConsole.setAttribute("aria-label", "Director runtime debug log");

const trafficConsole = document.createElement("section");
trafficConsole.className = "runtime-traffic-console";
trafficConsole.setAttribute("aria-label", "Habbo bridge traffic log");

const debugPanel = document.createElement("aside");
debugPanel.className = "debug-panel";

toolbarControls.append(
  createControlGroup("Version", createControlField("Release", versionSelect), createControlField("Manifest", manifestSourceSelect)),
  createControlGroup("Runtime", createControlField("Loader logo", loaderLogoSelect), createControlField("Club UI", clubUiSelect)),
  createControlGroup("Rare", createControlField("Catalogue page", rareCatalogueSelect), rareCatalogueApplyButton, rareCatalogueStatus),
  createControlGroup("Reference", auratusReferenceLink)
);
toolbar.append(toolbarControls, runtimeStatus, runtimeMetricsPanel);
stageColumn.append(stageHost, debugConsole, trafficConsole);
app.append(toolbar, stageColumn, debugPanel);
publishRuntimeDebugHandle();
syncManifestSourceAvailability();
syncRuntimeAvailabilityUi();
syncRareCatalogueUi();
renderRuntimeMetricsPanel();

versionSelect.addEventListener("change", () => {
  const nextId = versionSelect.value;
  if (!isHabboVersionId(nextId)) {
    throw new Error(`Unknown version option: ${nextId}`);
  }

  const nextAdapter = habboVersionAdapters.find((candidate) => candidate.id === nextId);
  if (!nextAdapter) {
    throw new Error(`No adapter registered for ${nextId}`);
  }

  swapVersion(nextAdapter);
});

manifestSourceSelect.addEventListener("change", () => {
  const value = manifestSourceSelect.value;
  if (value !== "probe" && value !== "projectorrays") {
    throw new Error(`Unknown manifest source: ${value}`);
  }

  manifestSource = value;
  publishRuntimeDebugHandle();
  swapVersion(adapter);
});

loaderLogoSelect.addEventListener("change", () => {
  loaderLogoChoice = loaderLogoSelect.value === "dl" ? "dl" : "original";
  publishRuntimeDebugHandle();
  swapVersion(adapter);
});

clubUiSelect.addEventListener("change", () => {
  habboClubUiMode = normalizeHabboClubUiMode(clubUiSelect.value);
  publishRuntimeDebugHandle();
  swapVersion(adapter);
});

rareCatalogueSelect.addEventListener("change", () => {
  rareCatalogueChoiceByVersion = {
    ...rareCatalogueChoiceByVersion,
    [adapter.id]: rareCatalogueSelect.value
  };
  storeRareCatalogueChoices(rareCatalogueChoiceByVersion);
  syncRareCatalogueUi();
});

rareCatalogueApplyButton.addEventListener("click", () => {
  void openSelectedRareCataloguePage();
});

void boot();

window.addEventListener("error", (event) => {
  recordRuntimeError(event.message || String(event.error ?? "window error"));
});

window.addEventListener("unhandledrejection", (event) => {
  recordRuntimeError(String(event.reason ?? "unhandled rejection"));
});

window.addEventListener("pagehide", handleRuntimePageClose);
window.addEventListener("beforeunload", handleRuntimePageClose);

async function boot(): Promise<void> {
  await loadDirectorFonts();
  renderer = await PixiStageRenderer.create({ host: stageHost, movie: runtime.movie });
  stageHost.append(interactionLayer);
  stageHost.addEventListener("wheel", handleStageWheel, { passive: false });
  stageHost.addEventListener("mousedown", handleRelease1NavigatorContextCaptureMouseDown, true);
  stageHost.addEventListener("mouseup", handleRelease1NavigatorContextCaptureMouseUp, true);
  await renderRuntimeMovie();
  renderDebugPanel();
  scheduleExtractedBootContinuation(runtime);
  startDirectorAnimationLoop();
}

let runtimePageCloseHandled = false;

function handleRuntimePageClose(): void {
  if (runtimePageCloseHandled) {
    return;
  }
  runtimePageCloseHandled = true;

  if (adapter.id === "release1"
    && bridge?.connected === true
    && (runtime.movie.getProperty("roomActive") === true || runtime.movie.getProperty("roomEntryState") === "active")) {
    try {
      bridge.send(encodeV1TextClientPacket("GOAWAY"));
    } catch {
      // The socket may already be closing. The bridge close below is still enough to notify Roseau.
    }
  }

  bridge?.close();
}

function swapVersion(nextAdapter: HabboVersionAdapter): void {
  clearBootContinuationTimers();
  release1EntryPrewarm = undefined;
  clearDirectorDelayTimer();
  clearRoomBootstrapFinalizeFrame();
  closeBridge();
  adapter = nextAdapter;
  runtimeErrors = [];
  bridgeEvents = [];
  debugConsoleState = undefined;
  trafficConsoleState = undefined;
  syncManifestSourceAvailability();
  runtime = createRuntime(adapter, manifestSource);
  stageHost.setAttribute("aria-label", runtime.movie.name);
  publishRuntimeDebugHandle();
  syncRuntimeAvailabilityUi();
  syncRareCatalogueUi();
  renderRuntimeMetricsPanel();
  renderDebugPanel();
  void renderRuntimeMovie().then(() => {
    renderDebugPanel();
    scheduleExtractedBootContinuation(runtime);
  });
}

async function renderRuntimeMovie(options: { readonly syncInteractions?: boolean } = {}): Promise<void> {
  try {
    const shouldSyncInteractions = options.syncInteractions !== false;
    await loadDirectorFonts();
    await document.fonts?.ready;
    const release = getCurrentProjectorRelease();
    if (release && shouldSyncEntrySceneForRelease1()) {
      syncRelease1EntryAvatarSprites(runtime.movie, release);
      syncRelease1EntryNavigatorRoomLoadProgress(runtime.movie);
      syncRelease1EntryInteractions(runtime.movie, release);
    }
    if (release && adapter.id === "release1") {
      syncRelease1MessengerIfOpen(
        getHabboBootServices(runtime.movie) as unknown as Parameters<typeof syncRelease1MessengerIfOpen>[0],
        release
      );
    }
    await renderer?.renderMovie(runtime.movie);
    if (release) {
      const services = getHabboBootServices(runtime.movie);
      services.markRoomLoaderFrameRendered(release);
      if (services.completePendingRoomBootstrap(release)) {
        roomBootstrapFinalizeFrame = undefined;
        // Room Component updateProcess sends G_STAT in the same activation turn.
        // Keep the painted loader frame on screen until the bridge replies with
        // the real Auratus user/status payload instead of painting an empty room.
        await renderer?.renderMovie(runtime.movie);
        await nextAnimationFrame();
        await sendPendingMessengerRequests();
        await sendPendingPurseRequests();
        await sendPendingCatalogueRequests();
        await sendPendingClubRequests();
        await sendPendingCallForHelpRequests();
        await sendPendingRoomRequests();
        return;
      } else if (runtime.movie.getProperty("roomBootstrapPendingFinalize") === true) {
        scheduleRoomBootstrapFinalizeRender(runtime);
      }

      if (runtime.movie.getProperty("roomEntryState") === "ready-to-activate") {
        // The source hides the loader after all cached room objects/users are ready.
        // Browser image decoding can still be pending here, so paint the completed
        // loader once, warm the real room frame under it, then reveal the room.
        await waitForNextBrowserPaint();
        await renderer?.preloadCurrentFrameBitmapAssets(runtime.movie);
        runtime.movie.setProperty("roomPreRevealBitmapPreloadComplete", true);
        if (services.completeRoomActivationAfterPreload(release)) {
          if (adapter.id === "release1") {
            completeRelease1EntryNavigatorRoomLoad(runtime.movie);
          }
          await renderer?.renderMovie(runtime.movie);
        }
      }

      if (shouldSyncEntrySceneForRelease1()) {
        syncRelease1EntryInteractions(runtime.movie, release);
        syncRelease1MessengerIfOpen(
          getHabboBootServices(runtime.movie) as unknown as Parameters<typeof syncRelease1MessengerIfOpen>[0],
          release
        );
      }
    }
    const directorAlertRendered = release ? flushDirectorAlerts(release) : false;
    if (directorAlertRendered) {
      await renderer?.renderMovie(runtime.movie);
    }
    if (shouldSyncInteractions || directorAlertRendered) {
      syncInteractionLayer();
    }
    scheduleDirectorDelayExecution();
  } catch (error) {
    console.error("Failed to render Director movie", error);
    recordRuntimeError(`render: ${String(error)}`);
  }
}

interface DirectorAlertPayload {
  readonly alertId: string;
  readonly message: string;
  readonly body?: string;
  readonly visible?: boolean;
  readonly source?: readonly unknown[];
}

function flushDirectorAlerts(release: string): boolean {
  if (runtime.movie.getProperty("alertWindowVisible") === true) {
    return false;
  }

  const queuedAlerts = readDirectorAlertQueue("release1DirectorAlertQueue");
  const fallbackAlert = queuedAlerts.length === 0
    ? readDirectorAlert("release1DirectorAlert")
    : undefined;
  const alerts = queuedAlerts.length > 0
    ? queuedAlerts
    : fallbackAlert?.visible === true
      ? [fallbackAlert]
      : [];
  if (alerts.length === 0) {
    return false;
  }

  const [alert, ...remainingAlerts] = alerts;
  if (!alert) {
    return false;
  }

  runtime.movie.setProperty("release1DirectorAlertQueue", remainingAlerts);
  runtime.movie.setProperty("release1DirectorAlert", {
    ...alert,
    visible: false
  });

  const message = alert.message || alert.alertId;
  const handled = getHabboBootServices(runtime.movie).executeMessage("#alert", {
    id: alert.alertId,
    title: "",
    msg: message,
    modal: 1
  }, release);
  runtime.movie.setProperty("lastDirectorAlertRuntimeWindow", {
    alertId: alert.alertId,
    message,
    handled,
    remaining: remainingAlerts.length,
    source: alert.source
  });
  runtime.movie.debugLog.add("windows", handled ? "info" : "warn", `Director alert ${alert.alertId} runtimeWindow=${handled}`);
  return handled;
}

function hasActiveOrQueuedDirectorAlert(): boolean {
  if (runtime.movie.getProperty("alertWindowVisible") === true) {
    return true;
  }

  if (readDirectorAlertQueue("release1DirectorAlertQueue").length > 0) {
    return true;
  }

  return readDirectorAlert("release1DirectorAlert")?.visible === true;
}

function readDirectorAlertQueue(propertyName: string): readonly DirectorAlertPayload[] {
  const value = runtime.movie.getProperty(propertyName);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const alert = directorAlertPayload(entry);
    return alert?.visible === false ? [] : alert ? [alert] : [];
  });
}

function readDirectorAlert(propertyName: string): DirectorAlertPayload | undefined {
  return directorAlertPayload(runtime.movie.getProperty(propertyName));
}

function directorAlertPayload(value: unknown): DirectorAlertPayload | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const alertId = typeof record.alertId === "string" ? record.alertId : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  if (!alertId || message === undefined) {
    return undefined;
  }

  const payload: DirectorAlertPayload = {
    alertId,
    message
  };
  if (typeof record.body === "string") {
    return {
      ...payload,
      body: record.body,
      ...(typeof record.visible === "boolean" ? { visible: record.visible } : {}),
      ...(Array.isArray(record.source) ? { source: record.source } : {})
    };
  }

  return {
    ...payload,
    ...(typeof record.visible === "boolean" ? { visible: record.visible } : {}),
    ...(Array.isArray(record.source) ? { source: record.source } : {})
  };
}

function scheduleRoomBootstrapFinalizeRender(targetRuntime: HabboRuntime): void {
  if (roomBootstrapFinalizeFrame !== undefined) {
    return;
  }

  roomBootstrapFinalizeFrame = window.requestAnimationFrame(() => {
    roomBootstrapFinalizeFrame = undefined;
    if (runtime !== targetRuntime) {
      return;
    }

    void renderRuntimeMovie().then(renderDebugPanel);
  });
}

function shouldSyncEntrySceneForRelease1(): boolean {
  return (adapter.id !== "release1" || runtime.movie.getProperty("release1PrivateRoomMovieActive") !== true)
    && runtime.movie.getProperty("alertWindowVisible") !== true;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitForNextBrowserPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function createControlGroup(title: string, ...children: readonly HTMLElement[]): HTMLElement {
  const group = document.createElement("section");
  group.className = "runtime-control-group";
  const heading = document.createElement("h2");
  heading.textContent = title;
  group.append(heading, ...children);
  return group;
}

function createControlField(labelText: string, control: HTMLElement): HTMLElement {
  const label = document.createElement("label");
  label.className = "runtime-control-field";
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text, control);
  return label;
}

async function loadDirectorFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  const fontFaceSet = document.fonts;
  directorFontsPromise ??= Promise.race([
    Promise.all([
      fontFaceSet.load('400 9px "Volter Goldfish"'),
      fontFaceSet.load('700 9px "Volter Goldfish"'),
      fontFaceSet.load('400 18px "Volter Goldfish"'),
      fontFaceSet.load('700 18px "Volter Goldfish"')
    ]).then(async () => {
      await fontFaceSet.ready;
      document.documentElement.dataset.directorFonts = "ready";
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(() => {
        document.documentElement.dataset.directorFonts = "timeout";
        resolve();
      }, DIRECTOR_FONT_LOAD_TIMEOUT_MS);
    })
  ]);

  await directorFontsPromise;
}

function recordRuntimeError(message: string): void {
  runtimeErrors = [message, ...runtimeErrors.filter((entry) => entry !== message)].slice(0, 12);
  runtime.movie.debugLog.add("error", "error", message);
  renderDebugPanel();
}

function createRuntime(nextAdapter: HabboVersionAdapter, source: HabboManifestSource): HabboRuntime {
  if (source === "projectorrays") {
    const extractedManifest = getProjectorRaysManifest(nextAdapter.id);
    if (extractedManifest) {
      const nextRuntime = new HabboRuntime(nextAdapter, extractedManifest, getProjectorRaysLingoScripts(nextAdapter.id));
      configureHabboBootServices(nextRuntime, nextAdapter);
      applyLoaderLogoChoice(nextRuntime);
      applyHabboClubUiMode(nextRuntime);
      runExtractedBootPreview(nextRuntime, nextAdapter);
      return nextRuntime;
    }
  }

  const nextRuntime = new HabboRuntime(nextAdapter);
  configureHabboBootServices(nextRuntime, nextAdapter);
  applyLoaderLogoChoice(nextRuntime);
  applyHabboClubUiMode(nextRuntime);
  return nextRuntime;
}

function configureHabboBootServices(nextRuntime: HabboRuntime, nextAdapter: HabboVersionAdapter): void {
  getHabboBootServices(nextRuntime.movie)
    .setTextFieldSet(getProjectorRaysTextFieldSet(nextAdapter.id))
    .setExternalFieldSet(getExternalFieldSet(nextAdapter.id))
    .setExternalCastGraph(getExternalCastGraph(nextAdapter.id))
    .setExternalCastTextFieldSet(getExternalCastTextFieldSet(nextAdapter.id))
    .setExternalCastWindowLayoutSet(getExternalCastWindowLayoutSet(nextAdapter.id))
    .setExternalCastVisualLayoutSet(getExternalCastVisualLayoutSet(nextAdapter.id))
    .setWindowBitmapAssetSet(getWindowBitmapAssetSet(nextAdapter.id))
    .setVisualBitmapAssetSet(getVisualBitmapAssetSet(nextAdapter.id))
    .setButtonBitmapAssetSet(getButtonBitmapAssetSet(nextAdapter.id))
    .setInternalBitmapAssetSet(getInternalBitmapAssetSet(nextAdapter.id))
    .setExternalBitmapAssetSet(getExternalBitmapAssetSet(nextAdapter.id))
    .setFigurePartIndexSet(getFigurePartIndexSet(nextAdapter.id));
  installDefaultHabboFigureAvailabilityPolicy(nextRuntime.movie, nextAdapter.id);
  void loadHabboFigureAvailabilityPolicyOverride(nextRuntime.movie, nextAdapter.id);
}

function createRelease1EntryRuntimeAfterLoader(
  nextAdapter: HabboVersionAdapter,
  loaderRuntime: HabboRuntime
): HabboRuntime | undefined {
  const handoff = readObjectProperty(loaderRuntime.movie, "release1GotoNetMovie");
  if (handoff?.movie !== "habbo_entry.dcr") {
    return undefined;
  }

  const prewarm = release1EntryPrewarm?.loaderRuntime === loaderRuntime
    ? release1EntryPrewarm
    : undefined;
  const entryRuntime = prewarm?.entryRuntime ?? createRelease1EntryRuntime(nextAdapter, loaderRuntime);
  if (!entryRuntime) {
    return undefined;
  }

  for (const property of ["release1LoaderComplete", "release1LoaderProgress", "release1LoaderStatus", "release1GotoNetMovie"]) {
    entryRuntime.movie.setProperty(property, loaderRuntime.movie.getProperty(property));
  }

  entryRuntime.movie.setProperty("release1LoaderHandoff", {
    fromRelease: RELEASE1_LOADER_RELEASE,
    toRelease: RELEASE1_ENTRY_RELEASE,
    movie: "habbo_entry.dcr",
    source: handoff.source
  });
  if (!prewarm) {
    startRelease1EntryPreview(entryRuntime, RELEASE1_ENTRY_RELEASE);
  }
  return entryRuntime;
}

function createRelease1EntryRuntime(
  nextAdapter: HabboVersionAdapter,
  loaderRuntime: HabboRuntime
): HabboRuntime | undefined {
  const entryManifest = getProjectorRaysManifestByRelease(RELEASE1_ENTRY_RELEASE);
  const scripts = getProjectorRaysLingoScriptsByRelease(RELEASE1_ENTRY_RELEASE, nextAdapter.id);
  if (!entryManifest || !scripts) {
    loaderRuntime.movie.unsupported.add({
      subsystem: "director",
      feature: "release1-entry-manifest-missing",
      detail: "release1 loader reached source gotoNetMovie(\"habbo_entry.dcr\"), but the generated habbo_entry ProjectorRays manifest or scripts are missing"
    });
    return undefined;
  }

  const entryRuntime = new HabboRuntime(nextAdapter, entryManifest, scripts);
  configureHabboBootServices(entryRuntime, nextAdapter);
  hydrateRelease1EntryAvatarCasts(entryRuntime.movie, getExternalBitmapAssetSet(nextAdapter.id));
  applyLoaderLogoChoice(entryRuntime);
  applyHabboClubUiMode(entryRuntime);
  return entryRuntime;
}

function applyLoaderLogoChoice(nextRuntime: HabboRuntime): void {
  if (loaderLogoChoice !== "dl") {
    nextRuntime.movie.setProperty("loaderLogoOverride", undefined);
    return;
  }

  nextRuntime.movie.setProperty("loaderLogoOverride", {
    assetPath: "generated/assets/loader-overrides/dl_logo.png",
    width: 35,
    height: 34,
    regPoint: { x: 17, y: 17 }
  });
}

function applyHabboClubUiMode(nextRuntime: HabboRuntime): void {
  nextRuntime.movie.setProperty("habboClubUiMode", habboClubUiMode);
}

function runExtractedBootPreview(nextRuntime: HabboRuntime, nextAdapter: HabboVersionAdapter): void {
  if (nextAdapter.id === "release1") {
    runRelease1ExtractedBootPreview(nextRuntime);
    return;
  }

  if (nextAdapter.id !== "release7" && nextAdapter.id !== "release14") {
    return;
  }

  const release = getProjectorRaysReleaseName(nextAdapter.id);
  if (!release) {
    return;
  }

  nextRuntime.movie.prepareMovie();
  nextRuntime.movie.go(5);
  nextRuntime.movie.dispatchEvent("exitFrame", [], "frame");
  const services = getHabboBootServices(nextRuntime.movie);
  services.updateCoreThreadState("load_params", release);
  services.updateCoreThreadState("load_casts", release);
  nextRuntime.movie.setProperty("pendingExtractedBootContinuation", {
    release,
    state: "cast-loading"
  });
}

function runRelease1ExtractedBootPreview(nextRuntime: HabboRuntime): void {
  const startFrame = scoreBehaviorStartFrame(nextRuntime, "1:4");
  const checkFrame = scoreBehaviorStartFrame(nextRuntime, "1:1");
  const gotoEntryFrame = scoreBehaviorStartFrame(nextRuntime, "1:8");
  if (startFrame === undefined || checkFrame === undefined || gotoEntryFrame === undefined) {
    nextRuntime.movie.unsupported.add({
      subsystem: "director",
      feature: "release1-loader-score-behavior-missing",
      detail: "release1 ProjectorRays preview expected loader behavior scripts 1:4, 1:1, and 1:8 in the extracted score"
    });
    return;
  }

  nextRuntime.movie.go(startFrame);
  nextRuntime.movie.dispatchEvent("exitFrame", [], "score");
  nextRuntime.movie.setProperty("pendingRelease1LoaderContinuation", {
    release: RELEASE1_LOADER_RELEASE,
    checkFrame,
    gotoEntryFrame,
    source: "extracted/projectorrays/release1_roseau_dcr0910/loader/casts/Internal/MovieScript 5 - Load Scripts.ls"
  });
  release1EntryPrewarm = undefined;
}

function startRelease1EntryPreview(nextRuntime: HabboRuntime, release: string): void {
  nextRuntime.movie.prepareMovie();
  nextRuntime.movie.go(1);
  nextRuntime.movie.setProperty("release1EntryState", {
    release,
    state: "opening",
    frame: nextRuntime.movie.currentFrameIndex,
    source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/chunks/VWLB-4356.bin"
  });
}

function finalizeRelease1EntryPreview(nextRuntime: HabboRuntime, release: string): void {
  try {
    const markerFrame = nextRuntime.movie.score.getMarker("login")?.frame ?? nextRuntime.movie.currentFrameIndex;
    const settledFrame = scoreMarkerLoopFrame(nextRuntime, "login");
    if (settledFrame !== undefined) {
      nextRuntime.movie.go(settledFrame);
    }
    nextRuntime.movie.setProperty("release1EntryState", {
      release,
      marker: "login",
      frame: nextRuntime.movie.currentFrameIndex,
      markerFrame,
      ...(settledFrame !== undefined ? { settledFrame } : {}),
      source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/chunks/VWLB-4356.bin"
    });
    nextRuntime.movie.debugLog.add("boot", "ok", `${release} entered source login marker frame=${markerFrame} settledFrame=${nextRuntime.movie.currentFrameIndex}`, {
      release,
      marker: "login",
      markerFrame,
      frame: nextRuntime.movie.currentFrameIndex
    });
    syncRelease1EntryInteractions(nextRuntime.movie, release);
  } catch (error) {
    nextRuntime.movie.unsupported.add({
      subsystem: "director",
      feature: "release1-entry-login-marker-missing",
      detail: `${release} habbo_entry source login marker could not be resolved: ${String(error)}`,
      source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/chunks/VWLB-4356.bin"
    });
  }
}

function scoreBehaviorStartFrame(nextRuntime: HabboRuntime, scriptKey: string): number | undefined {
  return nextRuntime.movie.score.behaviors.find((behavior) => behavior.scriptKey === scriptKey)?.startFrame;
}

function scoreMarkerLoopFrame(nextRuntime: HabboRuntime, markerName: string): number | undefined {
  const marker = nextRuntime.movie.score.getMarker(markerName);
  if (!marker) {
    return undefined;
  }

  const nextMarkerFrame = nextRuntime.movie.score.markers
    .map((entry) => entry.frame)
    .filter((frame) => frame > marker.frame)
    .sort((left, right) => left - right)[0];
  const sectionEnd = nextMarkerFrame ?? Number.POSITIVE_INFINITY;

  return nextRuntime.movie.score.behaviors
    .filter((behavior) => behavior.channel === 0 && behavior.startFrame >= marker.frame && behavior.startFrame < sectionEnd)
    .find((behavior) => {
      const scriptMember = nextRuntime.movie.cast.getMember(behavior.script);
      return scriptMember?.name?.toLowerCase().includes(`${markerName.toLowerCase()} loop`) === true;
    })?.startFrame;
}

function scheduleExtractedBootContinuation(targetRuntime: HabboRuntime): void {
  const release1Pending = targetRuntime.movie.getProperty("pendingRelease1LoaderContinuation");
  if (isRelease1LoaderContinuation(release1Pending)) {
    scheduleRelease1BootContinuation(targetRuntime, release1Pending);
    return;
  }

  const pending = targetRuntime.movie.getProperty("pendingExtractedBootContinuation");
  if (!isPendingBootContinuation(pending)) {
    return;
  }

  clearBootContinuationTimers();
  bootContinuationTimers.push(window.setTimeout(() => {
    if (runtime !== targetRuntime) {
      return;
    }

    const services = getHabboBootServices(targetRuntime.movie);
    const loadingBar = targetRuntime.movie.getProperty("lastLoadingBar");
    const loadId = typeof loadingBar === "object" && loadingBar !== null && "loadId" in loadingBar && typeof loadingBar.loadId === "number"
      ? loadingBar.loadId
      : 0;
    services.showLoadingBar(loadId, pending.release, "#window", 1);
    void renderRuntimeMovie().then(() => {
      if (runtime !== targetRuntime) {
        return;
      }

      renderDebugPanel();
      bootContinuationTimers.push(window.setTimeout(() => {
        if (runtime !== targetRuntime) {
          return;
        }

        services.updateCoreThreadState("validate_resources", pending.release);
        targetRuntime.movie.go(10);
        targetRuntime.movie.setProperty("pendingExtractedBootContinuation", undefined);
        runEntryHotelAnimation(targetRuntime, pending.release, services);
      }, 180));
    });
  }, 280));
}

function scheduleRelease1BootContinuation(targetRuntime: HabboRuntime, pending: Release1LoaderContinuation): void {
  clearBootContinuationTimers();
  const frameDelayMs = Math.max(33, Math.round(1000 / Math.max(1, targetRuntime.movie.tempo)));

  const runLoaderCheck = () => {
    if (runtime !== targetRuntime) {
      return;
    }

    targetRuntime.movie.go(pending.checkFrame);
    targetRuntime.movie.dispatchEvent("exitFrame", [], "score");
    advanceRelease1EntryPrewarm(targetRuntime);
    void renderRuntimeMovie({ syncInteractions: false }).then(() => {
      if (runtime !== targetRuntime) {
        return;
      }

      renderDebugPanel();
      if (targetRuntime.movie.getProperty("release1LoaderComplete") === undefined) {
        bootContinuationTimers.push(window.setTimeout(runLoaderCheck, frameDelayMs));
        return;
      }

      if (targetRuntime.movie.getProperty("release1GotoNetMovie") === undefined) {
        targetRuntime.movie.go(pending.gotoEntryFrame);
        targetRuntime.movie.dispatchEvent("exitFrame", [], "score");
      }
      completeRelease1EntryPrewarm(targetRuntime);
      targetRuntime.movie.setProperty("pendingRelease1LoaderContinuation", undefined);
      void renderRuntimeMovie({ syncInteractions: false }).then(() => {
        bootContinuationTimers.push(window.setTimeout(() => {
          finishRelease1LoaderHandoff(targetRuntime);
        }, frameDelayMs));
      });
    });
  };

  bootContinuationTimers.push(window.setTimeout(runLoaderCheck, frameDelayMs));
}

function advanceRelease1EntryPrewarm(loaderRuntime: HabboRuntime): void {
  const prewarm = ensureRelease1EntryPrewarm(loaderRuntime);
  if (!prewarm || prewarm.complete) {
    return;
  }

  const loginLoopFrame = prewarm.loginLoopFrame;
  if (loginLoopFrame === undefined) {
    finalizeRelease1EntryPreview(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE);
    prewarm.complete = true;
    return;
  }

  for (let index = 0; index < 2 && prewarm.entryRuntime.movie.currentFrameIndex < loginLoopFrame; index++) {
    advanceRelease1EntryOpeningFrame(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE, loginLoopFrame);
  }

  if (prewarm.entryRuntime.movie.currentFrameIndex >= loginLoopFrame) {
    finalizeRelease1EntryPreview(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE);
    prewarm.complete = true;
  }
}

function completeRelease1EntryPrewarm(loaderRuntime: HabboRuntime): void {
  const prewarm = ensureRelease1EntryPrewarm(loaderRuntime);
  if (!prewarm || prewarm.complete) {
    return;
  }

  const loginLoopFrame = prewarm.loginLoopFrame;
  if (loginLoopFrame === undefined) {
    finalizeRelease1EntryPreview(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE);
    prewarm.complete = true;
    return;
  }

  let guard = 0;
  while (prewarm.entryRuntime.movie.currentFrameIndex < loginLoopFrame && guard < loginLoopFrame + 4) {
    guard += 1;
    advanceRelease1EntryOpeningFrame(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE, loginLoopFrame);
  }
  finalizeRelease1EntryPreview(prewarm.entryRuntime, RELEASE1_ENTRY_RELEASE);
  prewarm.complete = true;
}

function ensureRelease1EntryPrewarm(loaderRuntime: HabboRuntime): Release1EntryPrewarm | undefined {
  if (release1EntryPrewarm?.loaderRuntime === loaderRuntime) {
    return release1EntryPrewarm;
  }

  const entryRuntime = createRelease1EntryRuntime(adapter, loaderRuntime);
  if (!entryRuntime) {
    return undefined;
  }

  startRelease1EntryPreview(entryRuntime, RELEASE1_ENTRY_RELEASE);
  release1EntryPrewarm = {
    loaderRuntime,
    entryRuntime,
    loginLoopFrame: scoreMarkerLoopFrame(entryRuntime, "login"),
    complete: false
  };
  loaderRuntime.movie.debugLog.add("boot", "info", "release1 prewarming habbo_entry during loader progress", {
    release: RELEASE1_ENTRY_RELEASE,
    source: "extracted/projectorrays/release1_roseau_dcr0910/habbo_entry/casts/Internal/MovieScript 3 - LoadingSystem.ls"
  });
  return release1EntryPrewarm;
}

function finishRelease1LoaderHandoff(loaderRuntime: HabboRuntime): void {
  if (runtime !== loaderRuntime || adapter.id !== "release1") {
    return;
  }

  const entryRuntime = createRelease1EntryRuntimeAfterLoader(adapter, loaderRuntime);
  if (!entryRuntime) {
    return;
  }

  runtime = entryRuntime;
  release1EntryPrewarm = undefined;
  directorAnimationLastTime = window.performance.now();
  stageHost.setAttribute("aria-label", runtime.movie.name);
  publishRuntimeDebugHandle();
  renderDebugPanel();
  const settled = readObjectProperty(entryRuntime.movie, "release1EntryState")?.marker === "login";
  void renderRuntimeMovie().then(() => {
    renderDebugPanel();
    if (!settled) {
      scheduleRelease1EntryOpening(entryRuntime, RELEASE1_ENTRY_RELEASE);
    }
  });
}

function scheduleRelease1EntryOpening(targetRuntime: HabboRuntime, release: string): void {
  const loginLoopFrame = scoreMarkerLoopFrame(targetRuntime, "login");
  if (loginLoopFrame === undefined) {
    finalizeRelease1EntryPreview(targetRuntime, release);
    void renderRuntimeMovie().then(renderDebugPanel);
    return;
  }

  const frameDelayMs = Math.max(33, Math.round(1000 / Math.max(1, targetRuntime.movie.tempo)));
  const stepEntryFrame = () => {
    if (runtime !== targetRuntime) {
      return;
    }

    if (targetRuntime.movie.currentFrameIndex >= loginLoopFrame) {
      finalizeRelease1EntryPreview(targetRuntime, release);
      void renderRuntimeMovie().then(renderDebugPanel);
      return;
    }

    advanceRelease1EntryOpeningFrame(targetRuntime, release, loginLoopFrame);
    void renderRuntimeMovie({ syncInteractions: false }).then(() => {
      if (runtime !== targetRuntime) {
        return;
      }

      renderDebugPanel();
      bootContinuationTimers.push(window.setTimeout(stepEntryFrame, frameDelayMs));
    });
  };

  bootContinuationTimers.push(window.setTimeout(stepEntryFrame, frameDelayMs));
}

function advanceRelease1EntryOpeningFrame(targetRuntime: HabboRuntime, release: string, loginLoopFrame: number): void {
  const beforeFrame = targetRuntime.movie.currentFrameIndex;
  if (beforeFrame >= loginLoopFrame) {
    return;
  }

  targetRuntime.movie.dispatchEvent("exitFrame", [], "frame");
  if (targetRuntime.movie.currentFrameIndex === beforeFrame) {
    targetRuntime.movie.advanceFrame(false);
  }
  advanceRelease1EntryScoreAnimation(targetRuntime.movie, release, 1000 / Math.max(1, targetRuntime.movie.tempo));
  if (targetRuntime.movie.currentFrameIndex > loginLoopFrame) {
    targetRuntime.movie.go(loginLoopFrame);
  }
}

function runEntryHotelAnimation(targetRuntime: HabboRuntime, release: string, services: ReturnType<typeof getHabboBootServices>): void {
  const startedAt = window.performance.now();
  let loginDelayExecuted = false;
  const totalDurationMs = 1320;
  const frameDelayMs = Math.max(16, Math.round(1000 / Math.max(1, targetRuntime.movie.tempo)));

  const renderAnimationFrame = () => {
    if (runtime !== targetRuntime) {
      return;
    }

    const elapsedMs = window.performance.now() - startedAt;
    services.advanceEntryHotelAnimation(elapsedMs, release);
    if (!loginDelayExecuted && elapsedMs >= 1000) {
      services.runScheduledDelays(1000, release);
      loginDelayExecuted = true;
    }

    void renderRuntimeMovie().then(() => {
      if (runtime !== targetRuntime) {
        return;
      }

      renderDebugPanel();
      if (elapsedMs < totalDurationMs) {
        bootContinuationTimers.push(window.setTimeout(renderAnimationFrame, frameDelayMs));
      }
    });
  };

  renderAnimationFrame();
}

function clearBootContinuationTimers(): void {
  for (const timer of bootContinuationTimers) {
    window.clearTimeout(timer);
  }
  bootContinuationTimers = [];
}

function clearDirectorDelayTimer(): void {
  if (directorDelayTimer !== undefined) {
    window.clearTimeout(directorDelayTimer);
    directorDelayTimer = undefined;
  }
}

function clearRoomBootstrapFinalizeFrame(): void {
  if (roomBootstrapFinalizeFrame !== undefined) {
    window.cancelAnimationFrame(roomBootstrapFinalizeFrame);
    roomBootstrapFinalizeFrame = undefined;
  }
}

function recordRuntimeAnimationFrame(now: number): void {
  runtimeFpsSampleFrames += 1;
  const elapsedMs = now - runtimeFpsSampleStartedAt;
  if (elapsedMs < 1000) {
    return;
  }

  runtimeFps = (runtimeFpsSampleFrames * 1000) / elapsedMs;
  runtimeFpsSampleFrames = 0;
  runtimeFpsSampleStartedAt = now;
  renderRuntimeMetricsPanel();
}

function startDirectorAnimationLoop(): void {
  if (directorAnimationFrame !== undefined) {
    return;
  }

  directorAnimationLastTime = window.performance.now();
  const tick = (now: number) => {
    directorAnimationFrame = window.requestAnimationFrame(tick);
    recordRuntimeAnimationFrame(now);
    const release = getCurrentProjectorRelease();
    if (!release) {
      directorAnimationLastTime = now;
      return;
    }

    const deltaMs = Math.max(0, now - directorAnimationLastTime);
    directorAnimationLastTime = now;
    const services = getHabboBootServices(runtime.movie);
    const release1EntryFlowChanged = advanceRelease1EntryConnectionFlow(runtime.movie, release);
    const release1EntryPostLoginChanged = advanceRelease1EntryPostLoginTimeline(runtime.movie, release, deltaMs);
    const release1EntryScoreChanged = advanceRelease1EntryScoreAnimation(runtime.movie, release, deltaMs);
    const entryHotelChanged = services.advanceEntryHotelAnimationFrame(deltaMs, release);
    const loginChanged = services.advanceLoginUserFoundAnimation(deltaMs, release);
    const roomUsersChanged = services.advanceRoomUserAnimations(deltaMs, release);
    const roomObjectsChanged = services.advanceRoomObjectAnimations(deltaMs, release);
    const roomHandChanged = services.advanceRoomHandAnimation(deltaMs, release);
    const roomChatChanged = services.advanceRoomChatBalloons(deltaMs, release);
    const badgeEffectChanged = services.advanceBadgeEffectAnimation(deltaMs, release);
    const changed = release1EntryFlowChanged || release1EntryPostLoginChanged || release1EntryScoreChanged || entryHotelChanged || loginChanged || roomUsersChanged || roomObjectsChanged || roomHandChanged || roomChatChanged || badgeEffectChanged;
    if (!changed || directorAnimationRenderInFlight) {
      return;
    }

    directorAnimationRenderInFlight = true;
    const animationOnlySpriteRender = (entryHotelChanged || roomObjectsChanged || roomUsersChanged)
      && !release1EntryFlowChanged
      && !release1EntryPostLoginChanged
      && !release1EntryScoreChanged
      && !loginChanged
      && !roomHandChanged
      && !roomChatChanged
      && !badgeEffectChanged;
    const renderPromise = animationOnlySpriteRender
      ? renderer?.updateOverlaySprites(runtime.movie) ?? Promise.resolve()
      : renderRuntimeMovie({ syncInteractions: release1EntryFlowChanged || release1EntryPostLoginChanged || !release1EntryScoreChanged });
    if (animationOnlySpriteRender) {
      void renderPromise.finally(() => {
        directorAnimationRenderInFlight = false;
      });
    } else {
      void renderPromise
        .then(renderDebugPanel)
        .finally(() => {
          directorAnimationRenderInFlight = false;
        });
    }
  };

  directorAnimationFrame = window.requestAnimationFrame(tick);
}

function scheduleDirectorDelayExecution(): void {
  if (directorDelayTimer !== undefined) {
    return;
  }

  const release = getCurrentProjectorRelease();
  if (!release) {
    return;
  }

  const targetRuntime = runtime;
  const services = getHabboBootServices(targetRuntime.movie);
  const delays = services.getPendingDelays();
  if (delays.length === 0) {
    return;
  }

  const nextDelayMs = Math.max(0, Math.min(...delays.map((delay) => {
    const value = delay.delayMs;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  })));
  directorDelayTimer = window.setTimeout(() => {
    directorDelayTimer = undefined;
    if (runtime !== targetRuntime) {
      return;
    }

    services.runScheduledDelays(nextDelayMs, release);
    void sendPendingNavigatorRequests().then(sendPendingMessengerRequests).then(sendPendingPurseRequests).then(sendPendingCatalogueRequests).then(sendPendingClubRequests).then(sendPendingCallForHelpRequests).then(sendPendingRoomRequests).then(() => renderRuntimeMovie()).then(() => {
      renderDebugPanel();
      scheduleDirectorDelayExecution();
    });
  }, nextDelayMs);
}

function isPendingBootContinuation(value: unknown): value is { readonly release: string; readonly state: string } {
  return typeof value === "object"
    && value !== null
    && "release" in value
    && typeof value.release === "string"
    && "state" in value
    && typeof value.state === "string";
}

interface Release1LoaderContinuation {
  readonly release: string;
  readonly checkFrame: number;
  readonly gotoEntryFrame: number;
  readonly source: string;
}

interface Release1EntryPrewarm {
  readonly loaderRuntime: HabboRuntime;
  readonly entryRuntime: HabboRuntime;
  readonly loginLoopFrame: number | undefined;
  complete: boolean;
}

function isRelease1LoaderContinuation(value: unknown): value is Release1LoaderContinuation {
  return typeof value === "object"
    && value !== null
    && "release" in value
    && value.release === RELEASE1_LOADER_RELEASE
    && "checkFrame" in value
    && typeof value.checkFrame === "number"
    && Number.isFinite(value.checkFrame)
    && "gotoEntryFrame" in value
    && typeof value.gotoEntryFrame === "number"
    && Number.isFinite(value.gotoEntryFrame)
    && "source" in value
    && typeof value.source === "string";
}

function syncManifestSourceAvailability(): void {
  const extractedOption = [...manifestSourceSelect.options].find((option) => option.value === "projectorrays");
  const hasExtractedManifest = hasProjectorRaysManifest(adapter.id);
  if (extractedOption) {
    extractedOption.disabled = !hasExtractedManifest;
  }

  if (!hasExtractedManifest && manifestSource === "projectorrays") {
    manifestSource = "probe";
  }

  manifestSourceSelect.value = manifestSource;
}

function syncRuntimeAvailabilityUi(): void {
  const availability = getHabboRuntimeAvailability(adapter.id);
  runtimeStatus.className = `runtime-status runtime-status-${availability.status}`;
  runtimeStatus.innerHTML = `
    <strong>${escapeHtml(availability.label)}</strong>
    <span>${escapeHtml(availability.summary)}</span>
    ${availability.command ? `<code>${escapeHtml(availability.command)}</code>` : ""}
  `;

  if (availability.route) {
    auratusReferenceLink.href = availability.route;
    auratusReferenceLink.textContent = `Open ${availability.label}`;
    auratusReferenceLink.removeAttribute("aria-disabled");
    auratusReferenceLink.tabIndex = 0;
    auratusReferenceLink.classList.remove("is-disabled");
  } else {
    auratusReferenceLink.removeAttribute("href");
    auratusReferenceLink.textContent = `No playable route for ${adapter.id} yet`;
    auratusReferenceLink.setAttribute("aria-disabled", "true");
    auratusReferenceLink.tabIndex = -1;
    auratusReferenceLink.classList.add("is-disabled");
  }
}

function syncRareCatalogueUi(): void {
  const options = rareCatalogueOptionsForAdapter(adapter.id);
  const selected = normalizeRareCatalogueOption(adapter.id, rareCatalogueChoiceByVersion[adapter.id]);
  rareCatalogueSelect.replaceChildren();

  if (options.length === 0) {
    rareCatalogueSelect.append(new Option(`No rare source pages for ${adapter.id}`, ""));
    rareCatalogueSelect.disabled = true;
    rareCatalogueApplyButton.disabled = true;
    rareCatalogueApplyButton.title = "No source-backed rare catalogue pages are registered for this adapter";
    setRareCatalogueStatus(`No rare catalogue source pages for ${adapter.id}.`, "warn");
    return;
  }

  for (const option of options) {
    rareCatalogueSelect.append(new Option(option.label, option.id));
  }

  rareCatalogueSelect.disabled = false;
  rareCatalogueSelect.value = selected?.id ?? options[0]?.id ?? "";
  const canRequestCatalogue = adapter.protocol.commandIds?.["GET_CATALOG_PAGE"] !== undefined;
  rareCatalogueApplyButton.disabled = !canRequestCatalogue;
  rareCatalogueApplyButton.title = canRequestCatalogue
    ? `${selected?.source ?? "Source-backed rare catalogue page"}; requires a connected local server and bridge`
    : `${adapter.id} does not define GET_CATALOG_PAGE`;
  setRareCatalogueStatus(
    canRequestCatalogue ? "Opens through the live catalogue bridge." : `${adapter.id} cannot request catalogue pages.`,
    canRequestCatalogue ? "idle" : "warn"
  );
}

async function openSelectedRareCataloguePage(): Promise<void> {
  const option = getSelectedRareCatalogueOption();
  const release = getCurrentProjectorRelease();
  if (!option || !release) {
    recordRuntimeError(`rare catalogue control unavailable for ${adapter.id}`);
    setRareCatalogueStatus(`Rare catalogue control unavailable for ${adapter.id}.`, "error");
    return;
  }

  if (adapter.protocol.commandIds?.["GET_CATALOG_PAGE"] === undefined) {
    recordRuntimeError(`${adapter.id} does not define GET_CATALOG_PAGE`);
    setRareCatalogueStatus(`${adapter.id} cannot request catalogue pages.`, "error");
    return;
  }

  rareCatalogueChoiceByVersion = {
    ...rareCatalogueChoiceByVersion,
    [adapter.id]: option.id
  };
  storeRareCatalogueChoices(rareCatalogueChoiceByVersion);

  const services = getHabboBootServices(runtime.movie);
  const catalogueOpened = services.executeMessage("#show_catalogue", undefined, release);
  const requests = readPendingCatalogueRequests();
  const nextId = Math.max(0, ...requests.map((request) => request.id)) + 1;
  const request: PendingCatalogueRequest = {
    id: nextId,
    command: "GET_CATALOG_PAGE",
    status: "pending",
    pageId: option.pageId,
    body: cataloguePageRequestBody("production", option.pageId, "en")
  };
  runtime.movie.setProperty("catalogueActivePageId", option.pageId);
  runtime.movie.setProperty("catalogueLoading", true);
  runtime.movie.setProperty("pendingCatalogueRequests", [...requests, request]);
  runtime.movie.setProperty("lastRareCatalogueControl", {
    adapter: adapter.id,
    optionId: option.id,
    pageId: option.pageId,
    source: option.source,
    catalogueOpened
  });
  setRareCatalogueStatus(`Opening ${option.label}. Waiting for server response.`, "pending");
  runtime.movie.debugLog.add("catalogue", "info", `rare control queued page=${option.pageId} ${option.label}`, {
    source: option.source,
    catalogueOpened
  });
  if (!catalogueOpened) {
    runtime.movie.debugLog.add("catalogue", "warn", "rare control could not open the catalogue shell; server request is still queued if bridge is available");
  }

  await renderRuntimeMovie();
  await sendPendingCatalogueRequests();
  await renderRuntimeMovie();
  const sent = readPendingCatalogueRequests().some((candidate) => candidate.id === request.id && candidate.status === "sent");
  setRareCatalogueStatus(
    sent ? `Requested ${option.label}. Waiting for catalogue packet.` : `Queued ${option.label}. Start the local server and bridge if nothing arrives.`,
    sent ? "pending" : "warn"
  );
  renderDebugPanel();
}

function getSelectedRareCatalogueOption(): RareCatalogueOption | undefined {
  return normalizeRareCatalogueOption(adapter.id, rareCatalogueSelect.value);
}

function setRareCatalogueStatus(message: string, tone: "idle" | "pending" | "warn" | "error"): void {
  rareCatalogueStatus.textContent = message;
  rareCatalogueStatus.dataset.tone = tone;
}

function readStoredRareCatalogueChoices(): Record<string, string> {
  try {
    const value = window.localStorage.getItem(RARE_CATALOGUE_STORAGE_KEY);
    if (!value) {
      return {};
    }

    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => {
      return typeof entry[0] === "string" && typeof entry[1] === "string";
    }));
  } catch {
    return {};
  }
}

function storeRareCatalogueChoices(choices: Readonly<Record<string, string>>): void {
  try {
    window.localStorage.setItem(RARE_CATALOGUE_STORAGE_KEY, JSON.stringify(choices));
  } catch {
    runtime.movie.debugLog.add("app", "warn", "rare catalogue choice could not be saved to localStorage");
  }
}

function renderRuntimeMetricsPanel(): void {
  const memory = readRuntimeMemorySnapshot();
  runtimeMetricsPanel.innerHTML = `
    <div class="runtime-metric">
      <strong>FPS</strong>
      <span>${escapeHtml(formatMetricNumber(runtimeFps, ""))}</span>
    </div>
    <div class="runtime-metric">
      <strong>Memory</strong>
      <span>${escapeHtml(memory.usedText)}</span>
    </div>
    <div class="runtime-metric">
      <strong>Heap</strong>
      <span>${escapeHtml(memory.totalText)} / ${escapeHtml(memory.limitText)}</span>
    </div>
    <div class="runtime-metric">
      <strong>Latency</strong>
      <span>${escapeHtml(formatMetricNumber(lastBridgeLatencyMs, " ms"))}</span>
    </div>
  `;
  runtimeMetricsPanel.title = memory.supported
    ? "Memory uses the browser performance.memory heap counters"
    : "This browser does not expose performance.memory heap counters";
}

function renderDebugPanel(): void {
  const movie = runtime.movie;
  const availability = getHabboRuntimeAvailability(adapter.id);
  const memory = readRuntimeMemorySnapshot();
  const rareOption = getSelectedRareCatalogueOption();
  const assetSummary = readObjectProperty(movie, "assetRequestSummary");
  debugPanel.innerHTML = `
    <h1>${escapeHtml(movie.name)}</h1>
    <dl>
      <dt>Adapter</dt><dd>${escapeHtml(adapter.id)}</dd>
      <dt>Playable</dt><dd>${escapeHtml(availability.label)}</dd>
      <dt>Release</dt><dd>${escapeHtml(adapter.releaseBand)}</dd>
      <dt>Manifest</dt><dd>${escapeHtml(manifestSource)}</dd>
      <dt>Loader Logo</dt><dd>${escapeHtml(loaderLogoChoice)}</dd>
      <dt>Movie</dt><dd>${escapeHtml(movie.id)}</dd>
      <dt>Stage</dt><dd>${movie.stage.width} x ${movie.stage.height}</dd>
      <dt>Frame</dt><dd>${movie.currentFrameIndex}</dd>
      <dt>Frames</dt><dd>${movie.score.frames.length}</dd>
      <dt>Behaviors</dt><dd>${movie.score.behaviors.length}</dd>
      <dt>Movie Scripts</dt><dd>${runtime.scriptAttachments.movieScripts.length}</dd>
      <dt>Score Scripts</dt><dd>${runtime.scriptAttachments.scoreBehaviors.filter((attachment) => attachment.attached).length}</dd>
      <dt>Casts</dt><dd>${movie.cast.castLibs.length}</dd>
      <dt>Sprites</dt><dd>${movie.currentFrame.sprites.length}</dd>
      <dt>Entry Visual Sprites</dt><dd>${readEntryVisualSpriteCount(movie)}</dd>
      <dt>Window Sprites</dt><dd>${readWindowSpriteCount(movie)}</dd>
      <dt>Loading Bar</dt><dd>${readLoadingBarVisible(movie) ? "visible" : "hidden"}</dd>
      <dt>Thread State</dt><dd>${escapeHtml(readStringProperty(movie, "coreThreadState") ?? "n/a")}</dd>
      <dt>Requested Casts</dt><dd>${readArrayProperty(movie, "coreThreadCastList").length}</dd>
      <dt>Resolved Casts</dt><dd>${readLastCastLoadList(movie, "resolvedCasts").length}</dd>
      <dt>Missing Casts</dt><dd>${readLastCastLoadList(movie, "missingCasts").length}</dd>
      <dt>Interactives</dt><dd>${readInteractiveElements(movie).length}</dd>
      <dt>Login Attempt</dt><dd>${escapeHtml(readLoginAttempt(movie))}</dd>
      <dt>Protocol</dt><dd>${escapeHtml(adapter.protocol.kind)}</dd>
      <dt>Login</dt><dd>${escapeHtml(adapter.protocol.loginMode)}</dd>
      <dt>Commands</dt><dd>${escapeHtml(adapter.protocol.loginCommands.join(", "))}</dd>
      <dt>Transport</dt><dd>${escapeHtml(adapter.protocol.browserTransport)}</dd>
      <dt>MUS</dt><dd>${adapter.protocol.mus?.required ? "required" : "not required"}</dd>
      <dt>Crypto</dt><dd>${escapeHtml(readCryptoDebugState())}</dd>
      <dt>FPS</dt><dd>${escapeHtml(formatMetricNumber(runtimeFps, ""))}</dd>
      <dt>Memory</dt><dd>${escapeHtml(memory.usedText)} used, ${escapeHtml(memory.totalText)} heap</dd>
      <dt>Latency</dt><dd>${escapeHtml(formatMetricNumber(lastBridgeLatencyMs, " ms"))}</dd>
      <dt>Assets</dt><dd>${escapeHtml(formatAssetRequestSummary(assetSummary))}</dd>
      <dt>Rare Page</dt><dd>${escapeHtml(rareOption ? `${rareOption.label} (${rareOption.pageId})` : "n/a")}</dd>
      <dt>Unsupported</dt><dd>${runtime.snapshot().unsupportedCount}</dd>
      <dt>Last Error</dt><dd>${escapeHtml(runtimeErrors[0] ?? "none")}</dd>
    </dl>
    <h2>Live Casts</h2>
    ${renderCastLoadSummary(movie)}
    <h2>Recent Unsupported</h2>
    ${renderUnsupportedSummary(movie)}
    <h2>Runtime Errors</h2>
    ${renderList(runtimeErrors.length > 0 ? runtimeErrors : ["none"])}
    <h2>Evidence</h2>
    ${renderList(adapter.sourceEvidence)}
    <h2>Runtime Status</h2>
    ${renderList(availability.notes)}
    <h2>Open Work</h2>
    ${renderList(adapter.unsupported)}
  `;
  renderRuntimeMetricsPanel();
  renderDebugConsole(movie);
  renderTrafficConsole(movie);
}

function renderDebugConsole(movie: HabboRuntime["movie"]): void {
  debugConsole.style.width = `${movie.stage.width}px`;
  const state = ensureDebugConsoleState(movie);
  state.subtitle.textContent = `${adapter.id} / ${manifestSource} / frame ${movie.currentFrameIndex}`;
  const wasPinnedToBottom = isDebugConsolePinnedToBottom(state.lines);

  const snapshotLines = buildDebugConsoleSnapshotLines(movie);
  const snapshotSignature = snapshotLines.map((line) => `${line.level}\t${line.channel}\t${line.text}`).join("\n");
  if (snapshotSignature !== state.lastSnapshotSignature) {
    appendDebugConsoleDivider(state, "state snapshot");
    for (const line of snapshotLines) {
      appendDebugConsoleLine(state, line);
    }
    state.lastSnapshotSignature = snapshotSignature;
  }

  for (const entry of movie.debugLog.list()) {
    if (entry.sequence <= state.lastSequence) {
      continue;
    }
    appendDebugConsoleLine(state, {
      level: entry.level,
      channel: entry.channel,
      text: `#${entry.sequence} ${entry.message}${entry.data === undefined ? "" : ` data=${formatUnknown(entry.data)}`}`
    });
    state.lastSequence = entry.sequence;
  }

  for (const entry of movie.unsupported.list()) {
    const key = `${entry.feature}\t${entry.detail}`;
    if (state.seenUnsupported.has(key)) {
      continue;
    }
    state.seenUnsupported.add(key);
    appendDebugConsoleLine(state, {
      level: "warn",
      channel: "unsupported",
      text: `${entry.feature}: ${entry.detail}`
    });
  }

  if (runtimeErrors.length === 0 && !state.reportedNoErrors) {
    appendDebugConsoleLine(state, {
      level: "ok",
      channel: "errors",
      text: "none"
    });
    state.reportedNoErrors = true;
  } else {
    for (const error of runtimeErrors) {
      if (state.seenErrors.has(error)) {
        continue;
      }
      state.seenErrors.add(error);
      appendDebugConsoleLine(state, {
        level: "error",
        channel: "error",
        text: error
      });
    }
  }

  trimDebugConsoleLines(state);
  if (wasPinnedToBottom) {
    state.lines.scrollTop = state.lines.scrollHeight;
  }
}

function renderTrafficConsole(movie: HabboRuntime["movie"]): void {
  trafficConsole.style.width = `${movie.stage.width}px`;
  const state = ensureTrafficConsoleState(movie);
  state.subtitle.textContent = `${bridge?.connected ? "connected" : "not connected"} / ${bridge?.url ?? getDefaultBridgeUrl()} / ${bridgeEvents.length} events`;
  const wasPinnedToBottom = isDebugConsolePinnedToBottom(state.lines);
  state.lines.replaceChildren();

  if (bridgeEvents.length === 0) {
    appendDebugConsoleLine(state, {
      level: bridge?.connected ? "ok" : "warn",
      channel: "server",
      text: `bridge=${bridge?.connected ? "connected" : "not-connected"} url=${bridge?.url ?? getDefaultBridgeUrl()} events=0`
    });
  } else {
    for (const event of bridgeEvents) {
      appendDebugConsoleLine(state, {
        level: event.direction === "error" ? "error" : event.direction === "receive" ? "ok" : "info",
        channel: event.direction,
        text: `${formatBridgeEventTimestamp(event.timestamp)} ${event.text}`
      });
    }
  }

  if (wasPinnedToBottom) {
    state.lines.scrollTop = state.lines.scrollHeight;
  }
}

interface DebugLogLine {
  readonly level: "info" | "ok" | "warn" | "error";
  readonly channel: string;
  readonly text: string;
}

interface DebugConsoleRenderState {
  readonly movieId: string;
  readonly subtitle: HTMLSpanElement;
  readonly lines: HTMLDivElement;
  readonly seenUnsupported: Set<string>;
  readonly seenErrors: Set<string>;
  lastSequence: number;
  lastSnapshotSignature: string;
  reportedNoErrors: boolean;
}

function ensureDebugConsoleState(movie: HabboRuntime["movie"]): DebugConsoleRenderState {
  if (debugConsoleState?.movieId === movie.id) {
    return debugConsoleState;
  }

  debugConsole.replaceChildren();
  const header = document.createElement("div");
  header.className = "debug-console-header";
  const title = document.createElement("h2");
  title.textContent = "Director Debug Log";
  const subtitle = document.createElement("span");
  header.append(title, subtitle);

  const lines = document.createElement("div");
  lines.className = "debug-console-lines";
  lines.setAttribute("role", "log");
  lines.setAttribute("aria-live", "polite");
  debugConsole.append(header, lines);

  debugConsoleState = {
    movieId: movie.id,
    subtitle,
    lines,
    seenUnsupported: new Set<string>(),
    seenErrors: new Set<string>(),
    lastSequence: 0,
    lastSnapshotSignature: "",
    reportedNoErrors: false
  };
  return debugConsoleState;
}

function ensureTrafficConsoleState(movie: HabboRuntime["movie"]): DebugConsoleRenderState {
  if (trafficConsoleState?.movieId === movie.id) {
    return trafficConsoleState;
  }

  trafficConsole.replaceChildren();
  const header = document.createElement("div");
  header.className = "debug-console-header";
  const title = document.createElement("h2");
  title.textContent = "Bridge Traffic";
  const subtitle = document.createElement("span");
  header.append(title, subtitle);

  const lines = document.createElement("div");
  lines.className = "debug-console-lines";
  lines.setAttribute("role", "log");
  lines.setAttribute("aria-live", "polite");
  trafficConsole.append(header, lines);

  trafficConsoleState = {
    movieId: movie.id,
    subtitle,
    lines,
    seenUnsupported: new Set<string>(),
    seenErrors: new Set<string>(),
    lastSequence: 0,
    lastSnapshotSignature: "",
    reportedNoErrors: false
  };
  return trafficConsoleState;
}

function appendDebugConsoleLine(state: DebugConsoleRenderState, line: DebugLogLine): void {
  const row = document.createElement("div");
  row.className = `debug-log-line debug-log-${line.level}`;
  const channel = document.createElement("span");
  channel.className = "debug-log-channel";
  channel.textContent = `[${line.channel}]`;
  const text = document.createElement("span");
  text.textContent = line.text;
  row.append(channel, text);
  state.lines.append(row);
}

function appendDebugConsoleDivider(state: DebugConsoleRenderState, label: string): void {
  const row = document.createElement("div");
  row.className = "debug-log-line debug-log-divider";
  const channel = document.createElement("span");
  channel.className = "debug-log-channel";
  channel.textContent = "[debug]";
  const text = document.createElement("span");
  text.textContent = label;
  row.append(channel, text);
  state.lines.append(row);
}

function isDebugConsolePinnedToBottom(lines: HTMLDivElement): boolean {
  return lines.scrollHeight - lines.scrollTop - lines.clientHeight <= 6;
}

function trimDebugConsoleLines(state: DebugConsoleRenderState): void {
  while (state.lines.childElementCount > DEBUG_CONSOLE_MAX_RENDERED_LINES) {
    state.lines.firstElementChild?.remove();
  }
}

function formatBridgeEventTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

interface PendingNavigatorRequest {
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

interface PendingMessengerRequest {
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

interface PendingPurseRequest {
  readonly id: number;
  readonly command: "GETUSERCREDITLOG" | "REDEEM_VOUCHER";
  readonly status: "pending" | "sent";
  readonly code?: string;
}

interface PendingCatalogueRequest {
  readonly id: number;
  readonly command: "GET_CATALOG_INDEX" | "GET_CATALOG_PAGE" | "PURCHASE_FROM_CATALOG";
  readonly status: "pending" | "sent";
  readonly body?: string;
  readonly pageId?: string;
}

interface PendingClubRequest {
  readonly id: number;
  readonly command: "SCR_GINFO" | "SCR_SUBSCRIBE" | "SCR_EXTSCR" | "GETAVAILABLEBADGES";
  readonly status: "pending" | "sent";
  readonly body?: string;
  readonly days?: number;
  readonly price?: number;
  readonly selection?: 1 | 2 | 3;
  readonly periods?: 1 | 3 | 6;
  readonly sourceCommand?: "SCR_BUY" | "SCR_SUBSCRIBE" | "SCR_EXTSCR";
}

interface PendingCallForHelpRequest {
  readonly id: number;
  readonly command: "CRYFORHELP";
  readonly status: "pending" | "sent";
  readonly message: string;
  readonly roomType: 0 | 1;
  readonly markerOrCasts: string;
  readonly roomName: string;
  readonly roomId: string;
  readonly roomOwner?: string;
  readonly roomPort?: number;
  readonly roomDoor?: number;
}

interface PendingRoomRequest {
  readonly id: number;
  readonly command:
    | "ROOM_DIRECTORY"
    | "TRYFLAT"
    | "GOTOFLAT"
    | "GETROOMAD"
    | "G_HMAP"
    | "G_USRS"
    | "G_OBJS"
    | "G_ITEMS"
    | "G_STAT"
    | "MOVE"
    | "CHAT"
    | "SHOUT"
    | "WHISPER"
    | "LOOKTO"
    | "STOP"
    | "DANCE"
    | "WAVE"
    | "MODERATOR"
    | "QUIT"
    | "SETBADGE"
    | "ADDSTRIPITEM"
    | "GETSTRIP"
    | "FLATPROPBYITEM"
    | "PLACESTUFF"
    | "MOVESTUFF"
    | "REMOVEITEM"
    | "REMOVESTUFF"
    | "SETSTUFFDATA"
    | "GETDOORFLAT"
    | "GOVIADOOR"
    | "INTODOOR"
    | "DOORGOIN"
    | "USEITEM";
  readonly status: "pending" | "sent";
  readonly roomId?: string;
  readonly isPublic?: boolean;
  readonly doorId?: number;
  readonly password?: string;
  readonly x?: number;
  readonly y?: number;
  readonly message?: string;
  readonly action?: string;
  readonly level?: string;
  readonly badge?: string;
  readonly visible?: number;
  readonly objectId?: string;
  readonly stripType?: "stuff" | "item";
  readonly stripMode?: "new" | "next" | "last";
  readonly direction?: number;
  readonly key?: string;
  readonly value?: string;
  readonly body?: string;
}

function buildDebugConsoleSnapshotLines(movie: HabboRuntime["movie"]): DebugLogLine[] {
  const lines: DebugLogLine[] = [];
  const coreThreadState = readStringProperty(movie, "coreThreadState") ?? "n/a";
  const requestedCasts = readArrayProperty(movie, "coreThreadCastList");
  const resolvedCasts = readLastCastLoadList(movie, "resolvedCasts");
  const missingCasts = readLastCastLoadList(movie, "missingCasts");
  const importedCasts = readLastCastLoadList(movie, "importedCastLibs");
  const unsupported = movie.unsupported.list();
  const roomUsers = readArrayProperty(movie, "roomUsers");
  const roomActiveObjects = readArrayProperty(movie, "roomActiveObjects");
  const roomChatMessages = readArrayProperty(movie, "roomChatMessages");
  const roomVisualSprites = readArrayProperty(movie, "roomVisualOverlaySprites");
  const roomObjectSprites = readArrayProperty(movie, "roomObjectOverlaySprites");
  const roomUserSprites = readArrayProperty(movie, "roomUserOverlaySprites");
  const roomChatSprites = readArrayProperty(movie, "roomChatOverlaySprites");
  const roomCoverSprites = readArrayProperty(movie, "roomCoverOverlaySprites");

  lines.push({
    level: "info",
    channel: "runtime",
    text: `movie=${movie.id} stage=${movie.stage.width}x${movie.stage.height} frame=${movie.currentFrameIndex}/${movie.score.frames.length} tempo=${movie.tempo} behaviors=${movie.score.behaviors.length} casts=${movie.cast.castLibs.length} sprites=${movie.currentFrame.sprites.length}`
  });
  lines.push({
    level: "info",
    channel: "boot",
    text: `thread=${coreThreadState} loadingBar=${readLoadingBarVisible(movie) ? "visible" : "hidden"} logo=${readLogoVisible(movie) ? "visible" : "hidden"} pending=${formatPendingContinuation(movie)} unsupported=${unsupported.length}`
  });
  lines.push({
    level: missingCasts.length > 0 ? "warn" : requestedCasts.length > 0 ? "ok" : "info",
    channel: "casts",
    text: `requested=${requestedCasts.length} resolved=${resolvedCasts.length} imported=${importedCasts.length} missing=${missingCasts.length}`
  });
  const download = readObjectProperty(movie, "lastQueuedDownload");
  if (download) {
    lines.push({
      level: "info",
      channel: "download",
      text: `queued member=${formatUnknown(download.memberName)} url=${formatUnknown(download.url)} priority=${formatUnknown(download.priority)}`
    });
  }

  for (const graphEntry of readArrayProperty(movie, "lastCastGraphResolution")) {
    const entry = asRecord(graphEntry);
    if (!entry) {
      continue;
    }
    const resolved = entry.resolved === true;
    lines.push({
      level: resolved ? "ok" : "warn",
      channel: "cast",
      text: `${formatUnknown(entry.name)} ${resolved ? "resolved" : "missing"} slot=${formatUnknown(entry.assignedCastLib)} members=${formatUnknown(entry.memberCount)} source=${formatUnknown(entry.expectedSourcePath)}`
    });
  }

  if (missingCasts.length > 0) {
    lines.push({
      level: "warn",
      channel: "casts",
      text: `missing=${compactList(missingCasts, 20)}`
    });
  }

  lines.push({
    level: "info",
    channel: "windows",
    text: `entrySprites=${readEntryVisualSpriteCount(movie)} entryAnimation=${formatEntryAnimation(movie)} windowSprites=${readWindowSpriteCount(movie)} interactives=${readInteractiveElements(movie).length} fields=${formatWindowFieldLengths(movie)}`
  });
  lines.push({
    level: "info",
    channel: "overlays",
    text: `roomVisual=${roomVisualSprites.length} roomObjects=${roomObjectSprites.length} roomUsers=${roomUserSprites.length} roomChat=${roomChatSprites.length} roomCover=${roomCoverSprites.length} director=${readArrayProperty(movie, "directorOverlaySprites").length}`
  });
  lines.push({
    level: movie.getProperty("roomEntryState") === "active" ? "ok" : readLoadingBarVisible(movie) || movie.getProperty("roomLoaderVisible") === true ? "info" : "warn",
    channel: "room",
    text: `state=${formatUnknown(movie.getProperty("roomEntryState"))} wire=${formatUnknown(movie.getProperty("roomWirePhase"))} active=${formatUnknown(movie.getProperty("roomActive"))} loader=${formatUnknown(movie.getProperty("roomLoaderVisible"))} progress=${formatUnknown(movie.getProperty("roomLoaderProgress"))} renderedFrames=${formatUnknown(movie.getProperty("roomLoaderRenderedFrames"))}/${formatUnknown(movie.getProperty("roomBootstrapFinalizeFrameFence"))} bootstrapPending=${formatUnknown(movie.getProperty("roomBootstrapPendingFinalize"))}`
  });
  lines.push({
    level: "info",
    channel: "room",
    text: `data=${formatCurrentRoomData(movie)} users=${roomUsers.length} activeObjects=${roomActiveObjects.length} chat=${roomChatMessages.length} packets=${formatRoomPacketFlags(movie)} pending=${formatPendingRoomRequests(movie)}`
  });
  const roomShowFailure = readObjectProperty(movie, "lastRoomShowFailure");
  if (roomShowFailure) {
    lines.push({
      level: "warn",
      channel: "room",
      text: `showRoomFailure reason=${formatUnknown(roomShowFailure.reason)} marker=${formatUnknown(roomShowFailure.marker)} candidates=${formatUnknown(roomShowFailure.candidates)}`
    });
  }
  const roomReadyTransition = readObjectProperty(movie, "lastRoomReadyTransition");
  if (roomReadyTransition) {
    lines.push({
      level: roomReadyTransition.accepted === false ? "warn" : "info",
      channel: "room",
      text: `roomReady step=${formatUnknown(roomReadyTransition.step ?? roomReadyTransition.reason)} marker=${formatUnknown(roomReadyTransition.marker)}`
    });
  }
  lines.push({
    level: "info",
    channel: "selection",
    text: `object=${formatUnknown(movie.getProperty("selectedRoomObjectType"))}:${formatUnknown(movie.getProperty("selectedRoomObjectId"))} name=${formatUnknown(movie.getProperty("selectedRoomObjectName"))} user=${formatUnknown(movie.getProperty("selectedRoomUserId"))} badge=${formatUnknown(movie.getProperty("selectedRoomUserBadge"))}`
  });
  lines.push({
    level: readLoginAttempt(movie) === "none" ? "info" : "ok",
    channel: "login",
    text: `attempt=${readLoginAttempt(movie)} action=${formatLastLoginAction(movie)}`
  });
  lines.push({
    level: "info",
    channel: "network",
    text: `protocol=${adapter.protocol.kind} login=${adapter.protocol.loginMode} commands=${adapter.protocol.loginCommands.join(",")} transport=${adapter.protocol.browserTransport} mus=${adapter.protocol.mus?.required ? "required" : "not-required"}`
  });
  lines.push({
    level: bridge?.connected ? "ok" : "warn",
    channel: "server",
    text: `bridge=${bridge?.connected ? "connected" : "not-connected"} url=${bridge?.url ?? getDefaultBridgeUrl()} events=${bridgeEvents.length}`
  });

  return lines;
}

function syncInteractionLayer(): void {
  const movie = runtime.movie;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  const activeDirectorId = activeElement?.dataset.directorId;
  const activeSelectionStart = activeElement instanceof HTMLInputElement ? activeElement.selectionStart : undefined;
  const activeSelectionEnd = activeElement instanceof HTMLInputElement ? activeElement.selectionEnd : undefined;
  const elements = orderInteractiveElementsForDom(readInteractiveElements(movie));
  interactionLayer.style.width = `${movie.stage.width}px`;
  interactionLayer.style.height = `${movie.stage.height}px`;
  interactionLayer.replaceChildren();
  if (elements.length === 0) {
    interactionLayer.hidden = true;
    return;
  }

  interactionLayer.hidden = false;
  for (const element of elements) {
    const control = createInteractionControl(element);
    interactionLayer.append(control);
  }

  if (activeDirectorId) {
    const nextActive = interactionLayer.querySelector<HTMLInputElement>(`input[data-director-id="${CSS.escape(activeDirectorId)}"]`);
    if (nextActive) {
      window.requestAnimationFrame(() => {
        nextActive.focus();
        const end = nextActive.value.length;
        nextActive.setSelectionRange(activeSelectionStart ?? end, activeSelectionEnd ?? activeSelectionStart ?? end);
      });
    }
  }
}

function createInteractionControl(element: HabboInteractiveElement): HTMLElement {
  if (element.kind === "field") {
    const input = document.createElement("input");
    input.className = "director-field-control";
    input.dataset.directorId = element.id;
    input.name = element.id;
    input.type = element.password ? "password" : "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.readOnly = element.editable === false;
    input.tabIndex = element.editable === false ? -1 : 0;
    input.value = readWindowFieldValue(element.id);
    input.setAttribute("aria-label", element.label ?? element.id);
    input.style.left = `${element.x}px`;
    input.style.top = `${element.y}px`;
    input.style.width = `${element.width}px`;
    input.style.height = `${element.height}px`;
    input.style.fontSize = `${Math.max(1, Math.round(element.fontSize ?? 9))}px`;
    input.style.lineHeight = `${element.height}px`;
    input.style.textAlign = element.textAlign ?? "left";
    input.style.color = element.renderValue === true ? "#000000" : "transparent";
    input.style.setProperty("-webkit-text-fill-color", element.renderValue === true ? "#000000" : "transparent");
    input.style.zIndex = String(interactiveElementDomPriority(element));
    input.addEventListener("mousedown", () => {
      const release = getCurrentProjectorRelease();
      if (!release) {
        return;
      }

      if (getHabboBootServices(runtime.movie).bringWindowToFront(element.windowId, release)) {
        window.setTimeout(() => {
          void renderRuntimeMovie().then(renderDebugPanel);
        }, 0);
      }
    });
    input.addEventListener("input", () => {
      const release = getCurrentProjectorRelease();
      if (!release) {
        return;
      }
      if (!setRelease1EntryLoginFieldValue(runtime.movie, element.id, input.value)
        && !setRelease1EntryForgotPasswordFieldValue(runtime.movie, element.id, input.value)
        && !setRelease1EntryRegistrationFieldValue(runtime.movie, element.id, input.value)) {
        getHabboBootServices(runtime.movie).setWindowFieldValue(element.id, input.value, release);
      }
      void renderRuntimeMovie().then(renderDebugPanel);
    });
    input.addEventListener("blur", () => {
      if (hasActiveOrQueuedDirectorAlert()) {
        return;
      }

      if (!queueRelease1EntryRegistrationNameCheck(runtime.movie, element.id)) {
        validateRelease1EntryForgotPasswordField(runtime.movie, element.id);
        return;
      }

      void sendRelease1RegistrationNameCheckRequests()
        .then(() => renderRuntimeMovie())
        .then(renderDebugPanel);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const release = getCurrentProjectorRelease();
        if (!release) {
          return;
        }

        if (submitRelease1EntryLoginField(runtime.movie, element.id)) {
          void sendServerActionForElement(element.id)
            .then(sendRelease1RegistrationNameCheckRequests)
            .then(sendRelease1ForgotPasswordRequest)
            .then(sendRelease1NavigatorTextRequests)
            .then(sendPendingNavigatorRequests)
            .then(sendPendingMessengerRequests)
            .then(sendPendingPurseRequests)
            .then(sendPendingCatalogueRequests)
            .then(sendPendingClubRequests)
            .then(sendPendingCallForHelpRequests)
            .then(sendPendingRoomRequests)
            .then(() => renderRuntimeMovie())
            .then(renderDebugPanel);
          return;
        }

        const handled = getHabboBootServices(runtime.movie).submitWindowField(element.id, release, { shiftKey: event.shiftKey });
        if (!handled) {
          const fallbackElement = element.id.startsWith("login_")
            ? "login_ok"
            : element.id.startsWith("forgot_password_")
              ? "forgot_password_send_button"
              : "reg_next_button";
          activateWindowElement(fallbackElement);
          return;
        }

        void sendPendingMessengerRequests()
          .then(sendPendingPurseRequests)
          .then(sendPendingCatalogueRequests)
          .then(sendPendingClubRequests)
          .then(sendPendingCallForHelpRequests)
          .then(sendPendingRoomRequests)
          .then(() => renderRuntimeMovie())
          .then(renderDebugPanel);
      }
    });
    return input;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "director-hotspot-control";
  button.dataset.directorId = element.id;
  button.dataset.directorKind = element.kind;
  button.setAttribute("aria-label", element.label ?? element.id);
  button.style.left = `${element.x}px`;
  button.style.top = `${element.y}px`;
  button.style.width = `${element.width}px`;
  button.style.height = `${element.height}px`;
  button.style.cursor = cursorForInteractiveElement(element);
  button.style.zIndex = String(interactiveElementDomPriority(element));
  if (element.enabled === false) {
    button.style.pointerEvents = "none";
  }
  if (element.kind === "drag") {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const release = getCurrentProjectorRelease();
      if (!release) {
        return;
      }

      if (getHabboBootServices(runtime.movie).bringWindowToFront(element.windowId, release)) {
        void renderRuntimeMovie().then(renderDebugPanel);
      }
      let lastClientX = event.clientX;
      let lastClientY = event.clientY;
      const moveWindow = (moveEvent: MouseEvent): void => {
        moveEvent.preventDefault();
        const layerRect = interactionLayer.getBoundingClientRect();
        const scaleX = layerRect.width > 0 ? runtime.movie.stage.width / layerRect.width : 1;
        const scaleY = layerRect.height > 0 ? runtime.movie.stage.height / layerRect.height : 1;
        const deltaX = (moveEvent.clientX - lastClientX) * scaleX;
        const deltaY = (moveEvent.clientY - lastClientY) * scaleY;
        lastClientX = moveEvent.clientX;
        lastClientY = moveEvent.clientY;
        const moved = adapter.id === "release1" && element.windowId === "#release1_messenger"
          ? moveRelease1MessengerBy(
            getHabboBootServices(runtime.movie) as unknown as Parameters<typeof moveRelease1MessengerBy>[0],
            deltaX,
            deltaY,
            release
          )
          : getHabboBootServices(runtime.movie).moveWindowById(element.windowId, deltaX, deltaY, release);
        if (moved) {
          void renderRuntimeMovie();
        }
      };
      const stopDrag = (): void => {
        window.removeEventListener("mousemove", moveWindow);
        window.removeEventListener("mouseup", stopDrag);
        void renderRuntimeMovie().then(renderDebugPanel);
      };
      window.addEventListener("mousemove", moveWindow);
      window.addEventListener("mouseup", stopDrag);
    });
    return button;
  }
  if (element.kind === "room") {
    let pointerRenderQueued = false;
    // Room Interface Class registers floor movement on Director mouseDown.
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      activateWindowElement(element.id, {
        ...getDirectorLocalPoint(event, button, element),
        event: "mouseDown"
      });
    });
    button.addEventListener("mousemove", (event) => {
      const localPoint = getDirectorLocalPoint(event, button, element);
      if (pointerRenderQueued) {
        return;
      }

      pointerRenderQueued = true;
      window.requestAnimationFrame(() => {
        pointerRenderQueued = false;
        const release = getCurrentProjectorRelease();
        if (!release) {
          return;
        }

        getHabboBootServices(runtime.movie).updateRoomPointer(release, localPoint);
        void renderRuntimeMovie();
      });
    });
    button.addEventListener("mouseleave", () => {
      getHabboBootServices(runtime.movie).clearRoomPointer();
      void renderRuntimeMovie();
    });
  } else if (element.kind === "room_object" || element.kind === "room_user") {
    let pointerRenderQueued = false;
    button.addEventListener("mousemove", (event) => {
      const point = getDirectorStagePoint(event);
      if (pointerRenderQueued) {
        return;
      }

      pointerRenderQueued = true;
      window.requestAnimationFrame(() => {
        pointerRenderQueued = false;
        const release = getCurrentProjectorRelease();
        if (!release) {
          return;
        }

        getHabboBootServices(runtime.movie).updateRoomPointer(release, {
          localX: point.x,
          localY: point.y
        });
        void renderRuntimeMovie();
      });
    });
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const point = getDirectorStagePoint(event);
      activateWindowElement(element.id, {
        localX: point.x,
        localY: point.y,
        windowId: element.windowId,
        event: "mouseDown",
        doubleClick: event.detail >= 2
      });
    });
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      const point = getDirectorStagePoint(event);
      activateWindowElement(element.id, {
        localX: point.x,
        localY: point.y,
        windowId: element.windowId,
        event: "mouseDown",
        doubleClick: true
      });
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
    });
  }
  if (element.kind === "scrollbar") {
    button.addEventListener("click", (event) => activateWindowElement(element.id, {
      ...getDirectorLocalPoint(event, button, element),
      windowId: element.windowId
    }));
    button.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateWindowElement(element.id, { scrollDelta: event.deltaY, windowId: element.windowId });
    }, { passive: false });
  } else if (element.kind === "button" || element.kind === "link") {
    let pressed = false;
    const releasePressedControl = (event: MouseEvent, force = false): void => {
      if (!pressed && !force) {
        return;
      }

      pressed = false;
      delete button.dataset.directorPressed;
      activateWindowElement(element.id, {
        ...getDirectorLocalPoint(event, button, element),
        windowId: element.windowId,
        event: "mouseUp"
      });
    };
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      pressed = true;
      button.dataset.directorPressed = "true";
      if (isOpenAlertRuntimeControl(element)) {
        window.addEventListener("mouseup", releasePressedControl, { once: true });
      }
      activateWindowElement(element.id, {
        ...getDirectorLocalPoint(event, button, element),
        windowId: element.windowId,
        event: "mouseDown",
        doubleClick: event.detail >= 2
      });
      void renderRuntimeMovie({ syncInteractions: false }).then(renderDebugPanel);
    });
    button.addEventListener("mouseup", (event) => {
      event.preventDefault();
      releasePressedControl(event, true);
    });
    button.addEventListener("mouseleave", () => {
      if (!pressed) {
        return;
      }

      pressed = false;
      delete button.dataset.directorPressed;
      const release = getCurrentProjectorRelease();
      if (release && getHabboBootServices(runtime.movie).releasePressedWindowElement(release)) {
        void renderRuntimeMovie().then(renderDebugPanel);
      }
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (isOpenAlertRuntimeControl(element)) {
        releasePressedControl(event, true);
      }
    });
  } else if (element.kind !== "room" && element.kind !== "room_object" && element.kind !== "room_user") {
    button.addEventListener("click", (event) => activateWindowElement(element.id, {
      ...getDirectorLocalPoint(event, button, element),
      windowId: element.windowId
    }));
  }
  return button;
}

function orderInteractiveElementsForDom(elements: readonly HabboInteractiveElement[]): HabboInteractiveElement[] {
  return elements
    .map((element, index) => ({ element, index }))
    .sort((left, right) => {
      const priorityDelta = interactiveElementDomPriority(left.element) - interactiveElementDomPriority(right.element);
      return priorityDelta !== 0 ? priorityDelta : left.index - right.index;
    })
    .map((entry) => entry.element);
}

function interactiveElementDomPriority(element: HabboInteractiveElement): number {
  const directorLocZPriority = element.locZ !== undefined && Number.isFinite(element.locZ)
    ? Math.trunc(element.locZ / 1000) * 100
    : 0;
  const nonRoomWindowPriorityOffset = element.windowId !== undefined
    && element.windowId !== "Room"
    && element.windowId !== "room"
    ? 100
    : 0;
  switch (element.kind) {
    case "room":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 10;
    case "drag":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 20;
    case "room_object":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 30;
    case "room_user":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 35;
    case "dropmenu":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 45;
    case "field":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 50;
    case "scrollbar":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 60;
    case "link":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 70;
    case "button":
      return directorLocZPriority + nonRoomWindowPriorityOffset + 80;
    default:
      return directorLocZPriority + nonRoomWindowPriorityOffset + 40;
  }
}

function cursorForInteractiveElement(element: HabboWindowInteractiveElement): string {
  if (element.kind === "drag") {
    return "move";
  }

  if (element.cursor === "cursor.finger") {
    return "pointer";
  }

  if (element.kind === "button"
    || element.kind === "link"
    || element.kind === "scrollbar"
    || element.kind === "dropmenu"
    || element.kind === "room_user") {
    return "pointer";
  }

  if (element.kind === "field" && element.editable) {
    return "text";
  }

  return "default";
}

function isOpenAlertRuntimeControl(element: HabboWindowInteractiveElement): boolean {
  if (runtime.movie.getProperty("alertWindowVisible") !== true) {
    return false;
  }

  return element.windowId === "#habbo_alert"
    && (element.id === "alert_ok" || element.id === "close" || element.id === "alert_link");
}

function handleStageWheel(event: WheelEvent): void {
  if (event.deltaY === 0) {
    return;
  }

  const release = getCurrentProjectorRelease();
  if (!release) {
    return;
  }

  const point = getDirectorStagePoint(event);
  const scrollbar = [...readInteractiveElements(runtime.movie)].reverse().find((element) => {
    if (element.kind !== "scrollbar") {
      return false;
    }

    return pointInsideRect(point.x, point.y, element.x, element.y, element.width, element.height)
      || (
        element.scrollClientX !== undefined
        && element.scrollClientY !== undefined
        && element.scrollClientWidth !== undefined
        && element.scrollClientHeight !== undefined
        && pointInsideRect(point.x, point.y, element.scrollClientX, element.scrollClientY, element.scrollClientWidth, element.scrollClientHeight)
      );
  });
  if (!scrollbar) {
    return;
  }

  event.preventDefault();
  activateWindowElement(scrollbar.id, {
    scrollDelta: event.deltaY,
    windowId: scrollbar.windowId
  });
}

function getDirectorStagePoint(event: MouseEvent): { readonly x: number; readonly y: number } {
  const rect = interactionLayer.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      x: event.offsetX,
      y: event.offsetY
    };
  }

  return {
    x: ((event.clientX - rect.left) * runtime.movie.stage.width) / rect.width,
    y: ((event.clientY - rect.top) * runtime.movie.stage.height) / rect.height
  };
}

function handleRelease1NavigatorContextCaptureMouseDown(event: MouseEvent): void {
  const element = release1NavigatorContextElementAtEvent(event);
  capturedRelease1NavigatorContextElement = element?.id;
  if (!element) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
}

function handleRelease1NavigatorContextCaptureMouseUp(event: MouseEvent): void {
  const capturedElementId = capturedRelease1NavigatorContextElement;
  capturedRelease1NavigatorContextElement = undefined;
  if (!capturedElementId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const releaseElement = release1NavigatorContextElementAtEvent(event);
  if (releaseElement?.id !== capturedElementId) {
    return;
  }

  const point = getDirectorStagePoint(event);
  activateWindowElement(capturedElementId, {
    localX: point.x,
    localY: point.y,
    event: "mouseUp",
    doubleClick: event.detail >= 2
  });
}

function release1NavigatorContextElementAtEvent(event: MouseEvent): HabboInteractiveElement | undefined {
  if (adapter.id !== "release1") {
    return undefined;
  }

  const point = getDirectorStagePoint(event);
  return [...readInteractiveElements(runtime.movie)].reverse().find((element) => {
    return element.id.startsWith("release1_navigator_context_")
      && pointInsideRect(point.x, point.y, element.x, element.y, element.width, element.height);
  });
}

function pointInsideRect(x: number, y: number, left: number, top: number, width: number, height: number): boolean {
  return x >= left && y >= top && x < left + width && y < top + height;
}

function getDirectorLocalPoint(event: MouseEvent, control: HTMLElement, element: HabboInteractiveElement): { readonly localX: number; readonly localY: number } {
  const rect = control.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      localX: event.offsetX,
      localY: event.offsetY
    };
  }

  return {
    localX: ((event.clientX - rect.left) * element.width) / rect.width,
    localY: ((event.clientY - rect.top) * element.height) / rect.height
  };
}

function activateWindowElement(elementId: string, activation?: { readonly localX?: number; readonly localY?: number; readonly scrollDelta?: number; readonly windowId?: string; readonly event?: "mouseDown" | "mouseUp" | "keyDown"; readonly doubleClick?: boolean }): void {
  const release = getCurrentProjectorRelease();
  if (!release) {
    return;
  }

  const release1CustomElement = adapter.id === "release1" && elementId.startsWith("release1_");
  const release1MessengerHandledFirst = release1CustomElement && activateRelease1MessengerElement(
    getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1MessengerElement>[0],
    elementId,
    activation,
    release
  );
  const release1HandledFirst = release1CustomElement && !release1MessengerHandledFirst && activateRelease1EntryHotelElement(runtime.movie, elementId, activation);
  const release1PrivateRoomHandledFirst = adapter.id === "release1" && !release1HandledFirst
    && activateRelease1PrivateRoomElement(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1PrivateRoomElement>[0],
      elementId,
      activation,
      release
    );
  const release1CatalogueHandledFirst = adapter.id === "release1" && !release1HandledFirst && !release1PrivateRoomHandledFirst
    && activateRelease1CatalogueElement(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1CatalogueElement>[0],
      elementId,
      activation,
      release
    );
  const handled = release1CustomElement
    ? false
    : getHabboBootServices(runtime.movie).activateWindowElement(elementId, release, activation);
  const release1Handled = release1MessengerHandledFirst || release1HandledFirst || release1PrivateRoomHandledFirst || release1CatalogueHandledFirst || (!handled && !release1CustomElement && (
    activateRelease1EntryLoginElement(runtime.movie, elementId, activation)
    || activateRelease1EntryForgotPasswordElement(runtime.movie, elementId, activation)
    || activateRelease1EntryHotelElement(runtime.movie, elementId, activation)
    || activateRelease1PrivateRoomElement(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1PrivateRoomElement>[0],
      elementId,
      activation,
      release
    )
    || activateRelease1CatalogueElement(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1CatalogueElement>[0],
      elementId,
      activation,
      release
    )
    || activateRelease1MessengerElement(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof activateRelease1MessengerElement>[0],
      elementId,
      activation,
      release
    )
    || activateRelease1EntryRegistrationElement(runtime.movie, elementId, activation)
  ));
  if (release1Handled && adapter.id === "release1") {
    getHabboBootServices(runtime.movie).consumeRelease1NavigatorGoAway(release);
  }
  if (handled || release1Handled) {
    void sendServerActionForElement(elementId)
      .then(sendRelease1RegistrationNameCheckRequests)
      .then(sendRelease1ForgotPasswordRequest)
      .then(sendRelease1NavigatorTextRequests)
      .then(sendRelease1CatalogueTextRequests)
      .then(sendPendingNavigatorRequests)
      .then(sendPendingMessengerRequests)
      .then(sendPendingPurseRequests)
      .then(sendPendingCatalogueRequests)
      .then(sendPendingClubRequests)
      .then(sendPendingCallForHelpRequests)
      .then(sendPendingRoomRequests)
      .then(() => renderRuntimeMovie())
      .then(renderDebugPanel);
  }

  if (!handled && !release1Handled && activation?.event === "mouseDown") {
    return;
  }

  void renderRuntimeMovie().then(renderDebugPanel);
}

async function sendServerActionForElement(elementId: string): Promise<void> {
  if (manifestSource !== "projectorrays") {
    return;
  }

  try {
    if (adapter.id === "release1" && isRelease1LoginSubmitElement(elementId) && hasPendingRelease1LoginConnectLoop()) {
      await sendRelease1LoginRequest();
      return;
    }

    if (elementId === "login_ok") {
      if (adapter.id === "release1") {
        await sendRelease1LoginRequest();
        return;
      }

      if (adapter.protocol.commandIds?.["TRY_LOGIN"] === undefined) {
        return;
      }

      const attempt = readObjectProperty(runtime.movie, "lastLoginAttempt");
      if (attempt?.accepted !== true) {
        return;
      }

      const username = String(attempt.userName ?? "");
      const password = readWindowFieldValue("login_password");

      if (adapter.id === "release14") {
        await queueRelease14Login(username, password);
        return;
      }

      const server = await ensureBridge();
      server.send(encodeHabboLoginRequest(adapter, { username, password }));
      runtime.movie.debugLog.add("server", "info", `sent TRY_LOGIN user=${username} passwordLength=${password.length}`);
      renderDebugPanel();
      return;
    }

    if (adapter.id === "release1") {
      if (elementId === "reg_figure_next_button") {
        await sendRelease1RegistrationRequest();
        return;
      }

      if (elementId.startsWith("release1_change_habbo_")) {
        await sendRelease1UpdateInfoRequest();
        return;
      }

      if (elementId.startsWith("release1_open_navigator_")) {
        const server = await ensureBridge();
        server.send(encodeV1TextClientPacket("INITUNITLISTENER"));
        runtime.movie.debugLog.add("server", "info", "release1 sent INITUNITLISTENER from Navigator icon");
        renderDebugPanel();
        return;
      }

      if (elementId === "release1_navigator_public_list") {
        if (runtime.movie.getProperty("release1NavigatorSuppressUnitUsersOnce") === true) {
          runtime.movie.setProperty("release1NavigatorSuppressUnitUsersOnce", false);
          return;
        }

        await sendRelease1UnitUsersRequest();
        return;
      }

      if (elementId.startsWith("release1_open_purse_")) {
        const server = await ensureBridge();
        server.send(encodeV1TextClientPacket("GETCREDITS"));
        runtime.movie.debugLog.add("server", "info", "release1 sent GETCREDITS from Purse icon");
        renderDebugPanel();
        return;
      }

      if (elementId.startsWith("release1_open_messenger_")) {
        const messengerState = readObjectProperty(runtime.movie, "release1EntryMessengerState");
        if (messengerState?.open !== true || runtime.movie.getProperty("messengerReady") === true) {
          return;
        }

        const server = await ensureBridge();
        server.send(encodeV1TextClientPacket("MESSENGERINIT"));
        runtime.movie.debugLog.add("server", "info", "release1 sent MESSENGERINIT from Messenger icon");
        renderDebugPanel();
      }
      return;
    }

    if (adapter.id !== "release7") {
      return;
    }

    if (elementId === "reg_next_button") {
      await sendRegistrationNameApprovalRequest();
      return;
    }

    if (elementId === "reg_done_button" || elementId === "reg_ready") {
      const props = readObjectProperty(runtime.movie, "lastRegistrationSubmitProps");
      if (!props) {
        return;
      }

      const server = await ensureBridge();
      server.send(encodeHabboRegistrationRequest(adapter, props));
      runtime.movie.debugLog.add("server", "info", `sent REGISTER name=${String(props.name ?? "")} passwordLength=${String(props.passwordLength ?? 0)}`);
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`server bridge: ${String(error)}`);
  }
}

function hasPendingRelease1LoginConnectLoop(): boolean {
  const attempt = readObjectProperty(runtime.movie, "lastLoginAttempt");
  const action = readObjectProperty(runtime.movie, "lastLoginAction");
  const globals = readObjectProperty(runtime.movie, "release1EntryGlobals");
  const epLogin = readObjectProperty(runtime.movie, "release1EntryEpLogin");
  return attempt?.accepted === true
    && action?.action === "connectloop"
    && globals?.gGoTo === "login"
    && epLogin?.status !== "sent";
}

function isRelease1LoginSubmitElement(elementId: string): boolean {
  return elementId === "login_ok"
    || elementId === "login_password"
    || elementId === "loginpw"
    || elementId === "loginpwshow";
}

async function sendRelease1UnitUsersRequest(): Promise<void> {
  const request = readObjectProperty(runtime.movie, "release1EntryNavigatorUnitUsersRequest");
  if (request?.command !== "GETUNITUSERS" || request.status === "sent") {
    return;
  }

  const body = String(request.body ?? "");
  if (!body) {
    return;
  }

  const server = await ensureBridge();
  server.send(encodeV1TextClientPacket("GETUNITUSERS", [body]));
  runtime.movie.setProperty("release1EntryNavigatorUnitUsersRequest", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `release1 sent GETUNITUSERS ${body}`);
  renderDebugPanel();
}

async function sendRelease1NavigatorTextRequests(): Promise<void> {
  if (adapter.id !== "release1") {
    return;
  }

  const value = runtime.movie.getProperty("release1EntryNavigatorTextRequests");
  if (!Array.isArray(value)) {
    return;
  }

  const requests = value.filter((entry): entry is {
    readonly id: number;
    readonly command: "SEARCHBUSYFLATS" | "SEARCHFLAT" | "SEARCHFLATFORUSER" | "GETUNITUSERS" | "TRYFLAT" | "GOTOFLAT";
    readonly body: string;
    readonly status: "pending" | "sent";
    readonly source: string;
  } => {
    const request = asRecord(entry);
    return typeof request?.id === "number"
      && (request.command === "SEARCHBUSYFLATS"
        || request.command === "SEARCHFLAT"
        || request.command === "SEARCHFLATFORUSER"
        || request.command === "GETUNITUSERS"
        || request.command === "TRYFLAT"
        || request.command === "GOTOFLAT")
      && typeof request.body === "string"
      && (request.status === "pending" || request.status === "sent")
      && typeof request.source === "string";
  });
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  const server = await ensureBridge();
  if (pending.some((request) => release1TextRequestRequiresAuthenticatedSession(request.command)) && !release1BridgeAuthenticated) {
    sendRelease1VersionCheckIfNeeded(server);
    sendRelease1ReloginIfNeeded(server);
    runtime.movie.debugLog.add("server", "info", "release1 deferred private-room navigator request until USEROBJECT");
    renderDebugPanel();
    return;
  }

  const sentIds = new Set<number>();
  const release = getCurrentProjectorRelease();
  const services = release ? getHabboBootServices(runtime.movie) : undefined;
  for (const request of pending) {
    server.send(encodeV1TextClientPacket(request.command, request.body ? [request.body] : []));
    runtime.movie.debugLog.add("server", "info", `release1 sent ${request.command} ${request.body}`);
    if ((request.command === "TRYFLAT" || request.command === "GOTOFLAT") && services && release) {
      services.markRoomRequestSent(request, release);
    }
    sentIds.add(request.id);
  }

  runtime.movie.setProperty("release1EntryNavigatorTextRequests", requests.map((request) => (
    sentIds.has(request.id) ? { ...request, status: "sent" } : request
  )));
  renderDebugPanel();
}

async function sendRelease1CatalogueTextRequests(): Promise<void> {
  if (adapter.id !== "release1") {
    return;
  }

  const requests = readRelease1CatalogueTextRequests(runtime.movie);
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  const server = await ensureBridge();
  for (const request of pending) {
    server.send(encodeV1TextClientPacket(request.command, request.body ? [request.body] : []));
    markRelease1CatalogueTextRequestSent(runtime.movie, request.id);
    runtime.movie.debugLog.add("server", "info", `release1 sent ${request.command} ${request.body}`);
  }
  renderDebugPanel();
}

async function sendRelease1RegistrationNameCheckRequests(): Promise<void> {
  if (adapter.id !== "release1") {
    return;
  }

  const findRequest = readObjectProperty(runtime.movie, "release1EntryRegistrationNameAvailabilityCheck");
  const approveRequest = readObjectProperty(runtime.movie, "release1EntryRegistrationNameApprovalCheck");
  if (findRequest?.status !== "pending" && approveRequest?.status !== "pending") {
    return;
  }

  const server = await ensureBridge();
  if (findRequest?.command === "FINDUSER" && findRequest.status === "pending") {
    const name = String(findRequest.name ?? "");
    if (name) {
      server.send(encodeV1TextClientPacket("FINDUSER", [name]));
      runtime.movie.setProperty("release1EntryRegistrationNameAvailabilityCheck", {
        ...findRequest,
        status: "sent"
      });
      runtime.movie.debugLog.add("server", "info", `release1 sent FINDUSER name=${name}`);
    }
  }

  if (approveRequest?.command === "APPROVENAME" && approveRequest.status === "pending") {
    const name = String(approveRequest.name ?? "");
    if (name) {
      server.send(encodeV1TextClientPacket("APPROVENAME", [name]));
      runtime.movie.setProperty("release1EntryRegistrationNameApprovalCheck", {
        ...approveRequest,
        status: "sent"
      });
      runtime.movie.debugLog.add("server", "info", `release1 sent APPROVENAME name=${name}`);
    }
  }
  renderDebugPanel();
}

async function sendRelease1UpdateInfoRequest(): Promise<void> {
  if (adapter.id !== "release1") {
    return;
  }

  const request = readObjectProperty(runtime.movie, "release1EntryUpdateInfoRequest");
  if (request?.command !== "INFORETRIEVE" || request.status === "sent" || request.status === "received") {
    return;
  }

  const username = String(request.username ?? "");
  const password = String(request.password ?? "");
  if (!username || !password) {
    return;
  }

  const server = await ensureBridge();
  sendRelease1VersionCheckIfNeeded(server);
  server.send(encodeV1TextClientPacket("INFORETRIEVE", [username, password]));
  runtime.movie.setProperty("release1EntryUpdateInfoRequest", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `release1 sent update INFORETRIEVE user=${username}`);
  renderDebugPanel();
}

async function sendRelease1ForgotPasswordRequest(): Promise<void> {
  if (adapter.id !== "release1") {
    return;
  }

  const request = readObjectProperty(runtime.movie, "release1EntryForgotPasswordRequest");
  if (request?.command !== "SEND_USERPASS_TO_EMAIL" || request.status === "sent") {
    return;
  }

  const name = String(request.name ?? "");
  const email = String(request.email ?? "");
  if (!name) {
    return;
  }

  const server = await ensureBridge();
  sendRelease1VersionCheckIfNeeded(server);
  server.send(encodeV1TextClientPacket("SEND_USERPASS_TO_EMAIL", [name, email]));
  runtime.movie.setProperty("release1EntryForgotPasswordRequest", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `release1 sent SEND_USERPASS_TO_EMAIL name=${name} emailLength=${email.length}`);
  renderDebugPanel();
}

async function sendRelease1LoginRequest(): Promise<void> {
  const attempt = readObjectProperty(runtime.movie, "lastLoginAttempt");
  if (attempt?.accepted !== true) {
    return;
  }

  const release = getCurrentProjectorRelease();
  if (release) {
    for (let step = 0; step < 3 && advanceRelease1EntryConnectionFlow(runtime.movie, release); step++) {
      // Advance source connectloop -> EPConnectionWait -> Get user info before sending.
    }
  }

  const epLogin = readObjectProperty(runtime.movie, "release1EntryEpLogin");
  if (epLogin?.command !== "LOGIN" || epLogin.status === "sent") {
    return;
  }

  const username = String(epLogin.username ?? attempt.userName ?? "");
  const password = readWindowFieldValue("login_password") || readWindowFieldValue("loginpw");
  if (!username || !password) {
    return;
  }

  const server = await ensureBridge();
  rememberRelease1SessionCredentials(username, password, false);
  sendRelease1VersionCheckIfNeeded(server);
  server.send(encodeHabboLoginRequest(adapter, { username, password }));
  server.send(encodeV1TextClientPacket("MESSENGERINIT"));
  server.send(encodeV1TextClientPacket("UNIQUEMACHINEID", ["director-habbo-runtime"]));
  server.send(encodeV1TextClientPacket("INFORETRIEVE", [username, password]));
  runtime.movie.setProperty("release1EntryEpLogin", {
    ...epLogin,
    status: "sent",
    followup: ["MESSENGERINIT", "UNIQUEMACHINEID", "INFORETRIEVE"]
  });
  runtime.movie.debugLog.add("server", "info", `release1 sent LOGIN/INFORETRIEVE user=${username} passwordLength=${password.length}`);
  renderDebugPanel();
}

async function sendRelease1RegistrationRequest(): Promise<void> {
  const request = readObjectProperty(runtime.movie, "release1EntryRegisterRequest");
  if ((request?.command !== "REGISTER" && request?.command !== "UPDATE") || request.status === "sent") {
    return;
  }

  const body = String(request.body ?? "");
  if (!body) {
    return;
  }

  const fields = release1RegistrationFieldsFromBody(body);
  const server = await ensureBridge();
  sendRelease1VersionCheckIfNeeded(server);
  if (request.command === "REGISTER") {
    server.send(encodeHabboRegistrationRequest(adapter, { sourceBody: body }));
  } else {
    server.send(encodeV1TextClientPacket("UPDATE", [body]));
  }
  runtime.movie.setProperty("release1EntryRegisterRequest", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `release1 sent ${request.command} name=${fields.name ?? ""} passwordLength=${fields.password?.length ?? 0}`);

  if (fields.name && fields.password) {
    rememberRelease1SessionCredentials(fields.name, fields.password, false);
    server.send(encodeHabboLoginRequest(adapter, { username: fields.name, password: fields.password }));
    server.send(encodeV1TextClientPacket("MESSENGERINIT"));
    server.send(encodeV1TextClientPacket("UNIQUEMACHINEID", ["director-habbo-runtime"]));
    server.send(encodeV1TextClientPacket("INFORETRIEVE", [fields.name, fields.password]));
    runtime.movie.setProperty("release1EntryPostRegisterLogin", {
      status: "sent",
      command: request.command,
      username: fields.name,
      passwordLength: fields.password.length,
      source: "extracted/projectorrays/release1_roseau_dcr0910/GoldFish/casts/External/BehaviorScript 33 - do registeration.ls"
    });
    runtime.movie.debugLog.add("server", "info", `release1 sent post-${request.command.toLowerCase()} LOGIN/INFORETRIEVE user=${fields.name} passwordLength=${fields.password.length}`);
  }

  renderDebugPanel();
}

function sendRelease1VersionCheckIfNeeded(server: HabboWebSocketBridge): void {
  if (adapter.id !== "release1" || runtime.movie.getProperty("release1VersionCheckSent") === true) {
    return;
  }

  server.send(encodeV1TextClientPacket("VERSIONCHECK"));
  runtime.movie.setProperty("release1VersionCheckSent", true);
  runtime.movie.debugLog.add("server", "info", "release1 sent VERSIONCHECK");
}

function release1RegistrationFieldsFromBody(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of body.split(/\r?\n|\r/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    fields[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return fields;
}

async function queueRelease14Login(username: string, password: string): Promise<void> {
  const state = readRelease14LoginFlowState();
  release14PendingLoginCredentials = {
    username,
    password,
    passwordLength: password.length
  };
  runtime.movie.setProperty("release14LoginFlow", {
    ...state,
    pendingCredentials: {
      username,
      passwordLength: password.length
    },
    loginSent: false
  });

  const server = await ensureBridge();
  if (readRelease14LoginFlowState().sessionParametersReceived === true) {
    sendRelease14PendingLogin(server);
    return;
  }

  runtime.movie.debugLog.add("server", "info", "release14 login queued; waiting for HELLO/SESSION_PARAMETERS handshake");
  renderDebugPanel();
}

function rememberRelease1SessionCredentials(username: string, password: string, authenticated: boolean): void {
  release1SessionCredentials = {
    username,
    password,
    passwordLength: password.length,
    authenticated
  };
  runtime.movie.setProperty("release1BridgeSession", {
    username,
    passwordLength: password.length,
    authenticated,
    source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/room/Room.java"
  });
}

function markRelease1BridgeAuthenticated(usernameHint?: string): void {
  release1BridgeAuthenticated = true;
  release1BridgeReloginSent = true;
  const credentials = release1SessionCredentials;
  if (credentials) {
    rememberRelease1SessionCredentials(usernameHint ?? credentials.username, credentials.password, true);
    return;
  }

  runtime.movie.setProperty("release1BridgeSession", {
    username: usernameHint ?? "",
    passwordLength: 0,
    authenticated: true,
    source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/outgoing/USEROBJECT.java"
  });
}

function markRelease1BridgeUnauthenticated(): void {
  release1BridgeAuthenticated = false;
  release1BridgeReloginSent = false;
  if (release1SessionCredentials) {
    rememberRelease1SessionCredentials(release1SessionCredentials.username, release1SessionCredentials.password, false);
  }
}

function handleRelease1BridgeConnectionEvent(event: HabboBridgeEvent): void {
  if (adapter.id !== "release1") {
    return;
  }

  if (event.direction === "connect") {
    release1BridgeAuthenticated = false;
    release1BridgeReloginSent = false;
    runtime.movie.setProperty("release1VersionCheckSent", false);
    runtime.movie.setProperty("release1BridgeSession", {
      ...(asRecord(runtime.movie.getProperty("release1BridgeSession")) ?? {}),
      authenticated: false,
      reconnecting: release1SessionCredentials?.authenticated === true,
      source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/server/SessionManager.java"
    });
  } else if (event.direction === "disconnect") {
    release1BridgeAuthenticated = false;
    release1BridgeReloginSent = false;
  }
}

function sendRelease1ReloginIfNeeded(server: HabboWebSocketBridge): void {
  if (adapter.id !== "release1" || release1BridgeAuthenticated || release1BridgeReloginSent) {
    return;
  }

  const credentials = release1SessionCredentials;
  if (!credentials?.authenticated) {
    return;
  }

  release1BridgeReloginSent = true;
  server.send(encodeHabboLoginRequest(adapter, { username: credentials.username, password: credentials.password }));
  server.send(encodeV1TextClientPacket("MESSENGERINIT"));
  server.send(encodeV1TextClientPacket("UNIQUEMACHINEID", ["director-habbo-runtime"]));
  server.send(encodeV1TextClientPacket("INFORETRIEVE", [credentials.username, credentials.password]));
  runtime.movie.setProperty("release1BridgeSession", {
    username: credentials.username,
    passwordLength: credentials.passwordLength,
    authenticated: false,
    reloginSent: true,
    source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/game/room/Room.java"
  });
  runtime.movie.debugLog.add("server", "info", `release1 relogin sent user=${credentials.username} passwordLength=${credentials.passwordLength}`);
}

function release1TextRequestRequiresAuthenticatedSession(command: string): boolean {
  return command === "TRYFLAT" || command === "GOTOFLAT";
}

function release1RoomRequestRequiresAuthenticatedSession(command: string): boolean {
  return command !== "QUIT";
}

function readRelease1UserObjectName(body: string): string | undefined {
  const match = /(?:^|\s)name=([^\r\n\s]+)/i.exec(body);
  return match?.[1];
}

interface Release14LoginFlowState {
  readonly initCryptoSent?: boolean;
  readonly generateKeySent?: boolean;
  readonly sessionParametersReceived?: boolean;
  readonly loginSent?: boolean;
  readonly crypto?: {
    readonly clientToServer: boolean;
    readonly serverToClient: boolean;
    readonly rawBody: string;
    readonly source: string;
  };
  readonly pendingCredentials?: {
    readonly username: string;
    readonly passwordLength: number;
  };
}

async function handleRelease1BridgePacket(packet: { readonly header: string; readonly name: string; readonly body: string }, release: string): Promise<boolean> {
  const server = bridge;
  if (!server?.connected) {
    return false;
  }

  if (packet.name === "HELLO") {
    sendRelease1VersionCheckIfNeeded(server);
    sendRelease1ReloginIfNeeded(server);
    return true;
  }

  if (packet.name === "ENCRYPTION_OFF") {
    runtime.movie.setProperty("release1EncryptionState", {
      enabled: false,
      source: "extracted/projectorrays/release1_roseau_dcr0910/MessengerScript/casts/External/MovieScript 1 - EnterpriseServer Connection Scripts.ls"
    });
    runtime.movie.debugLog.add("server", "info", "release1 ENCRYPTION_OFF");
    return true;
  }

  if (packet.name === "SECRET_KEY") {
    runtime.movie.setProperty("release1SecretKey", {
      key: packet.body.replace(/^[\r\n]+/, ""),
      source: "src/Roseau-master/Roseau-master/Roseau-Server/src/main/java/org/alexdev/roseau/messages/outgoing/SECRET_KEY.java"
    });
    runtime.movie.debugLog.add("server", "info", "release1 SECRET_KEY received");
    return true;
  }

  if (completeRelease1EntryRegistrationNamePacket(runtime.movie, packet.name, packet.body)) {
    return true;
  }

  if (packet.name === "ERROR") {
    markRelease1BridgeUnauthenticated();
    if (completeRelease1EntryEnterpriseError(runtime.movie, packet.body)) {
      return true;
    }
  }

  if (packet.name === "SYSTEMBROADCAST" && completeRelease1EntrySystemBroadcast(runtime.movie, packet.body)) {
    return true;
  }

  if (packet.name === "USEROBJ") {
    completeRelease1EntryLoginFromUserObject(runtime.movie, packet.body);
    markRelease1BridgeAuthenticated(readRelease1UserObjectName(packet.body));
    const serverAfterUserObj = bridge;
    if (serverAfterUserObj?.connected) {
      serverAfterUserObj.send(encodeV1TextClientPacket("GETCREDITS"));
      serverAfterUserObj.send(encodeV1TextClientPacket("INITUNITLISTENER"));
      runtime.movie.debugLog.add("server", "info", "release1 sent GETCREDITS after USEROBJECT");
      runtime.movie.debugLog.add("server", "info", "release1 sent INITUNITLISTENER after USEROBJECT");
    }
    return true;
  }

  if (packet.name === "WALLETBALANCE") {
    completeRelease1EntryWalletBalance(runtime.movie, packet.body);
    return true;
  }

  if (packet.name === "ORDERINFO") {
    return handleRelease1CatalogueOrderInfoPacket(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof handleRelease1CatalogueOrderInfoPacket>[0],
      packet.body,
      release
    );
  }

  if (packet.name === "ADDSTRIPITEM"
    || packet.name === "PURCHASE_ADDSTRIPITEM"
    || packet.name === "PURCHASE_OK"
    || packet.name === "PURCHASE_NOBALANCE"
    || packet.name === "PURCHASE_ERROR") {
    return handleRelease1CataloguePurchaseResultPacket(
      getHabboBootServices(runtime.movie) as unknown as Parameters<typeof handleRelease1CataloguePurchaseResultPacket>[0],
      packet.name,
      packet.body,
      release
    );
  }

  if (packet.name === "ALLUNITS") {
    completeRelease1EntryUnitsFromAllUnits(runtime.movie, packet.body);
    return true;
  }

  if (packet.name === "UNITMEMBERS") {
    completeRelease1EntryUnitMembers(runtime.movie, packet.body);
    return true;
  }

  if (packet.name === "FLAT_LETIN") {
    if (completeRelease1EntryFlatLetIn(runtime.movie)) {
      prepareRelease1PrivateRoomAfterFlatLetIn(getHabboBootServices(runtime.movie) as unknown as Parameters<typeof prepareRelease1PrivateRoomAfterFlatLetIn>[0], release);
      await sendRelease1NavigatorTextRequests();
    }
    return true;
  }

  if (packet.name === "ROOM_READY") {
    recordRelease1PrivateRoomReady(getHabboBootServices(runtime.movie) as unknown as Parameters<typeof recordRelease1PrivateRoomReady>[0], packet.body);
    return true;
  }

  if (deferRelease1PrivateRoomBootstrapPacket(
    getHabboBootServices(runtime.movie) as unknown as Parameters<typeof deferRelease1PrivateRoomBootstrapPacket>[0],
    packet.name,
    packet.body,
    release
  )) {
    return true;
  }

  if (packet.name === "OBJECTS") {
    prepareRelease1PrivateRoomObjectsPacket(getHabboBootServices(runtime.movie) as unknown as Parameters<typeof prepareRelease1PrivateRoomObjectsPacket>[0], packet.body, release);
    return false;
  }

  if (packet.name === "STATUS") {
    prepareRelease1PrivateRoomStatusPacket(getHabboBootServices(runtime.movie) as unknown as Parameters<typeof prepareRelease1PrivateRoomStatusPacket>[0], release);
    return false;
  }

  if (packet.name === "FLAT_RESULTS") {
    completeRelease1EntryFlatResults(runtime.movie, packet.header, packet.body);
    return true;
  }

  return false;
}

async function handleRelease14BridgePacket(packet: { readonly name: string; readonly body: string }): Promise<void> {
  const server = bridge;
  if (!server?.connected) {
    return;
  }

  if (packet.name === "HELLO") {
    const state = readRelease14LoginFlowState();
    if (state.initCryptoSent !== true) {
      server.send(encodeHabboV14HandshakeCommand(adapter, "INIT_CRYPTO"));
      runtime.movie.setProperty("release14LoginFlow", {
        ...state,
        initCryptoSent: true
      });
      runtime.movie.debugLog.add("server", "info", "release14 HELLO handled; sent INIT_CRYPTO");
    }
    return;
  }

  if (packet.name === "CRYPTO_PARAMETERS") {
    const state = readRelease14LoginFlowState();
    const serverToClient = parseRelease14CryptoServerToClientFlag(packet.body);
    if (state.generateKeySent !== true) {
      server.send(encodeHabboV14HandshakeCommand(adapter, "GENERATEKEY"));
      runtime.movie.setProperty("release14LoginFlow", {
        ...state,
        crypto: {
          clientToServer: true,
          serverToClient,
          rawBody: packet.body,
          source: "release14 Login Handler Class.handleCryptoParameters and Kepler CRYPTO_PARAMETERS"
        },
        generateKeySent: true
      });
      runtime.movie.debugLog.add("server", "info", `release14 CRYPTO_PARAMETERS handled c2s=true s2c=${serverToClient}; sent GENERATEKEY`);
    }
    return;
  }

  if (packet.name === "SESSION_PARAMETERS") {
    const state = {
      ...readRelease14LoginFlowState(),
      sessionParametersReceived: true
    };
    runtime.movie.setProperty("release14LoginFlow", state);
    runtime.movie.debugLog.add("server", "info", "release14 SESSION_PARAMETERS handled; login may proceed");
    sendRelease14PendingLogin(server);
    return;
  }

  if (packet.name === "PING") {
    server.send(encodeHabboV14HandshakeCommand(adapter, "PONG"));
    runtime.movie.debugLog.add("server", "info", "release14 PING handled; sent PONG");
  }
}

function sendRelease14PendingLogin(server: HabboWebSocketBridge): void {
  const state = readRelease14LoginFlowState();
  if (state.loginSent === true || !state.pendingCredentials || !release14PendingLoginCredentials) {
    return;
  }

  server.send(encodeHabboLoginRequest(adapter, {
    username: release14PendingLoginCredentials.username,
    password: release14PendingLoginCredentials.password
  }));
  runtime.movie.setProperty("release14LoginFlow", {
    ...state,
    loginSent: true
  });
  runtime.movie.debugLog.add("server", "info", `sent TRY_LOGIN user=${release14PendingLoginCredentials.username} passwordLength=${release14PendingLoginCredentials.passwordLength}`);
}

function readRelease14LoginFlowState(): Release14LoginFlowState {
  const state = runtime.movie.getProperty("release14LoginFlow");
  if (typeof state !== "object" || state === null) {
    return {};
  }
  return state as Release14LoginFlowState;
}

function parseRelease14CryptoServerToClientFlag(body: string): boolean {
  try {
    return decodeVl64(body).value !== 0;
  } catch {
    runtime.movie.debugLog.add("server", "warn", `release14 CRYPTO_PARAMETERS body could not be decoded: ${body}`);
    return false;
  }
}

function readCryptoDebugState(): string {
  if (adapter.id !== "release14") {
    return "n/a";
  }

  const state = readRelease14LoginFlowState();
  const crypto = state.crypto;
  if (!crypto) {
    return `pending init=${state.initCryptoSent === true ? "sent" : "no"} key=${state.generateKeySent === true ? "sent" : "no"} session=${state.sessionParametersReceived === true ? "yes" : "no"}`;
  }

  return `c2s=${crypto.clientToServer ? "on" : "off"} s2c=${crypto.serverToClient ? "on" : "off"} body=${crypto.rawBody || "empty"} session=${state.sessionParametersReceived === true ? "yes" : "no"}`;
}

function updateBridgeLatency(event: HabboBridgeEvent): void {
  if (event.direction === "send") {
    lastBridgeSendTimestamp = event.timestamp;
    return;
  }

  if (event.direction === "receive" && lastBridgeSendTimestamp !== undefined) {
    lastBridgeLatencyMs = Math.max(0, event.timestamp - lastBridgeSendTimestamp);
    renderRuntimeMetricsPanel();
  }
}

async function ensureBridge(): Promise<HabboWebSocketBridge> {
  if (!bridge) {
    bridge = new HabboWebSocketBridge(getDefaultBridgeUrl(), getHabboBridgePacketNameRegistry(adapter.id));
    bridge.onEvent((event) => {
      handleRelease1BridgeConnectionEvent(event);
      updateBridgeLatency(event);
      bridgeEvents = [event, ...bridgeEvents.filter((entry) => entry !== event)].slice(0, 80);
      runtime.movie.debugLog.add("server", event.direction === "error" ? "error" : event.direction === "receive" ? "ok" : "info", event.text);
      void handleBridgeEvent(event);
      renderDebugPanel();
    });
  }

  await bridge.connect();
  return bridge;
}

async function handleBridgeEvent(event: HabboBridgeEvent): Promise<void> {
  if (manifestSource !== "projectorrays" || event.direction !== "receive") {
    return;
  }

  const release = getCurrentProjectorRelease();
  const release1Handled = adapter.id === "release1" && event.packet
    ? await handleRelease1BridgePacket(event.packet, release ?? "")
    : false;

  if (release && event.packet && !release1Handled) {
    getHabboBootServices(runtime.movie).handleBridgePacket(event.packet.name, event.packet.body, release);
  }

  if (adapter.id === "release14" && event.packet) {
    await handleRelease14BridgePacket(event.packet);
  }

  if (adapter.id !== "release7" && adapter.id !== "release14" && adapter.id !== "release1" && event.packet?.name !== "LOGINOK" && event.packet?.name !== "USEROBJ") {
    await renderRuntimeMovie();
    renderDebugPanel();
    return;
  }

  if (event.packet?.name === "NAMEAPPROVED") {
    await sendRegistrationNameAvailabilityRequest();
    await sendPendingNavigatorRequests();
    await sendPendingMessengerRequests();
    await sendPendingPurseRequests();
    await sendPendingCatalogueRequests();
    await sendPendingClubRequests();
    await sendPendingCallForHelpRequests();
    await sendPendingRoomRequests();
    await renderRuntimeMovie();
    renderDebugPanel();
    return;
  }

  if (event.packet?.name === "REGISTRATIONOK") {
    await sendRegistrationLoginFollowup();
    await sendPendingNavigatorRequests();
    await sendPendingMessengerRequests();
    await sendPendingPurseRequests();
    await sendPendingCatalogueRequests();
    await sendPendingClubRequests();
    await sendPendingCallForHelpRequests();
    await sendPendingRoomRequests();
    await renderRuntimeMovie();
    renderDebugPanel();
    return;
  }

  if (event.packet?.name === "LOGINOK") {
    await sendPostLoginRequests();
    await sendPendingNavigatorRequests();
    await sendPendingMessengerRequests();
    await sendPendingPurseRequests();
    await sendPendingCatalogueRequests();
    await sendPendingClubRequests();
    await sendPendingCallForHelpRequests();
    await sendPendingRoomRequests();
    await renderRuntimeMovie();
    renderDebugPanel();
    return;
  }

  if (event.packet?.name === "USEROBJ" && adapter.id === "release7") {
    recordUserObject(event.packet.body);
  }

  await sendPendingNavigatorRequests();
  await sendPendingMessengerRequests();
  await sendPendingPurseRequests();
  await sendPendingCatalogueRequests();
  await sendPendingClubRequests();
  await sendPendingCallForHelpRequests();
  await sendPendingRoomRequests();
  await renderRuntimeMovie();
  renderDebugPanel();
}

async function sendRegistrationNameApprovalRequest(): Promise<void> {
  const request = readObjectProperty(runtime.movie, "lastRegistrationNameCheck");
  if (request?.command !== "APPROVENAME" || request.status !== "pending") {
    return;
  }

  const name = String(request.name ?? "");
  if (!name) {
    return;
  }

  const server = await ensureBridge();
  server.send(encodeHabboApproveNameRequest(adapter, name));
  runtime.movie.setProperty("lastRegistrationNameCheck", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `sent APPROVENAME name=${name}`);
  renderDebugPanel();
}

async function sendRegistrationNameAvailabilityRequest(): Promise<void> {
  const request = readObjectProperty(runtime.movie, "lastRegistrationNameAvailabilityCheck");
  if (request?.command !== "FINDUSER" || request.status !== "pending") {
    return;
  }

  const name = String(request.name ?? "");
  const context = String(request.context ?? "REGNAME");
  if (!name) {
    return;
  }

  const server = await ensureBridge();
  server.send(encodeHabboFindUserRequest(adapter, name, context));
  runtime.movie.setProperty("lastRegistrationNameAvailabilityCheck", {
    ...request,
    status: "sent"
  });
  runtime.movie.debugLog.add("server", "info", `sent FINDUSER name=${name} context=${context}`);
  renderDebugPanel();
}

async function sendRegistrationLoginFollowup(): Promise<void> {
  const props = readObjectProperty(runtime.movie, "lastRegistrationSubmitProps");
  const username = String(props?.name ?? "");
  const password = String(props?.password ?? "");
  if (!username || !password) {
    return;
  }

  const server = await ensureBridge();
  server.send(encodeCommandRequest("SET_UID", { type: "string", value: "director-habbo-runtime" }));
  server.send(encodeHabboLoginRequest(adapter, { username, password }));
  runtime.movie.debugLog.add("server", "info", `registration followup sent SET_UID and TRY_LOGIN user=${username} passwordLength=${password.length}`);
}

async function sendPostLoginRequests(): Promise<void> {
  const sentKey = `${adapter.id}PostLoginRequestsSent`;
  if (runtime.movie.getProperty(sentKey) === true) {
    return;
  }

  runtime.movie.setProperty(sentKey, true);
  const server = await ensureBridge();
  const commands = adapter.id === "release14"
    ? ["GET_INFO", "GET_CREDITS", "GETAVAILABLEBADGES", "GET_SOUND_SETTING"] as const
    : ["GET_INFO", "GET_CREDITS", "MESSENGER_INIT", "SCR_GINFO", "GETAVAILABLEBADGES"] as const;
  for (const command of commands) {
    if (adapter.protocol.commandIds?.[command] === undefined) {
      continue;
    }

    server.send(encodeCommandRequest(command));
    runtime.movie.debugLog.add("server", "info", `post-login sent ${command}`);
  }
}

type CommandArg =
  | { readonly type: "int"; readonly value: number }
  | { readonly type: "short"; readonly value: number }
  | { readonly type: "booleanByte"; readonly value: boolean }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "raw"; readonly value: string };

function encodeCommandRequest(command: string, ...args: readonly CommandArg[]): Uint8Array {
  const commandId = adapter.protocol.commandIds?.[command];
  if (commandId === undefined) {
    throw new Error(`${adapter.id} does not define command id ${command}`);
  }

  const writer = new Base64Vl64PacketWriter(commandId);
  for (const arg of args) {
    if (arg.type === "int") {
      writer.writeInt(arg.value);
    } else if (arg.type === "short") {
      writer.writeShort(arg.value);
    } else if (arg.type === "booleanByte") {
      writer.writeBooleanByte(arg.value);
    } else if (arg.type === "string") {
      writer.writeString(arg.value);
    } else {
      writer.writeRaw(arg.value);
    }
  }
  return writer.toClientRequest();
}

async function sendPendingNavigatorRequests(): Promise<void> {
  if ((adapter.id !== "release7" && adapter.id !== "release14") || manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingNavigatorRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      if (request.command === "NAVIGATE") {
        const nodeId = Number.parseInt(request.nodeId ?? "", 10);
        if (!Number.isFinite(nodeId) || nodeId <= 0) {
          continue;
        }

        const depth = request.depth ?? 1;
        if (adapter.id === "release14") {
          const nodeMask = Number.isFinite(request.nodeMask) ? Number(request.nodeMask) : 0;
          server.send(encodeCommandRequest(
            "NAVIGATE",
            { type: "int", value: nodeMask },
            { type: "int", value: nodeId },
            { type: "int", value: depth }
          ));
          runtime.movie.debugLog.add("server", "info", `sent NAVIGATE mask=${nodeMask} node=${nodeId} depth=${depth}`);
        } else {
          server.send(encodeCommandRequest(
            "NAVIGATE",
            { type: "int", value: nodeId },
            { type: "int", value: depth }
          ));
          runtime.movie.debugLog.add("server", "info", `sent NAVIGATE node=${nodeId} depth=${depth}`);
        }
        sentIds.add(request.id);
      } else if (request.command === "GETUSERFLATCATS") {
        server.send(encodeCommandRequest("GETUSERFLATCATS"));
        runtime.movie.debugLog.add("server", "info", "sent GETUSERFLATCATS");
        sentIds.add(request.id);
      } else if (request.command === "SUSERF") {
        const userName = String(request.userName ?? "").trim();
        if (!userName) {
          continue;
        }

        server.send(encodeCommandRequest("SUSERF", { type: "raw", value: userName }));
        runtime.movie.debugLog.add("server", "info", `sent SUSERF user=${userName}`);
        sentIds.add(request.id);
      } else if (request.command === "SRCHF") {
        const query = String(request.query ?? "").trim();
        if (!query) {
          continue;
        }

        server.send(encodeCommandRequest("SRCHF", { type: "raw", value: query }));
        runtime.movie.debugLog.add("server", "info", `sent SRCHF query=${query}`);
        sentIds.add(request.id);
      } else if (request.command === "GETFVRF") {
        server.send(encodeCommandRequest("GETFVRF"));
        runtime.movie.debugLog.add("server", "info", "sent GETFVRF");
        sentIds.add(request.id);
      } else if (request.command === "ADD_FAVORITE_ROOM" || request.command === "DEL_FAVORITE_ROOM") {
        const flatId = String(request.flatId ?? "").trim();
        if (!flatId) {
          continue;
        }

        if (adapter.id === "release14") {
          const roomType = Number.isFinite(request.roomType) ? Number(request.roomType) : 0;
          const roomId = Number.parseInt(flatId, 10);
          if (!Number.isFinite(roomId)) {
            continue;
          }

          server.send(encodeCommandRequest(request.command, { type: "int", value: roomType }, { type: "int", value: roomId }));
          runtime.movie.debugLog.add("server", "info", `sent ${request.command} roomType=${roomType} room=${roomId}`);
        } else {
          server.send(encodeCommandRequest(request.command, { type: "raw", value: flatId }));
          runtime.movie.debugLog.add("server", "info", `sent ${request.command} flat=${flatId}`);
        }
        sentIds.add(request.id);
      } else if (request.command === "CREATEFLAT") {
        const body = String(request.body ?? "");
        if (!body) {
          continue;
        }

        server.send(encodeCommandRequest("CREATEFLAT", { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", "sent CREATEFLAT");
        sentIds.add(request.id);
      } else if (request.command === "SETFLATINFO") {
        const body = String(request.body ?? "");
        if (!body) {
          continue;
        }

        server.send(encodeCommandRequest("SETFLATINFO", { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", "sent SETFLATINFO");
        sentIds.add(request.id);
      } else if (request.command === "SETFLATCAT") {
        const flatId = Number.parseInt(request.flatId ?? "", 10);
        const categoryId = Number.parseInt(request.categoryId ?? "", 10);
        if (!Number.isFinite(flatId) || !Number.isFinite(categoryId)) {
          continue;
        }

        server.send(encodeCommandRequest("SETFLATCAT", { type: "int", value: flatId }, { type: "int", value: categoryId }));
        runtime.movie.debugLog.add("server", "info", `sent SETFLATCAT flat=${flatId} category=${categoryId}`);
        sentIds.add(request.id);
      } else if (request.command === "GOTOFLAT") {
        const flatId = String(request.flatId ?? "").trim();
        if (!flatId) {
          continue;
        }

        // v7 GOTOFLAT uses a raw room id body, unlike NAVIGATE's VL64 arguments.
        server.send(encodeCommandRequest("GOTOFLAT", { type: "raw", value: flatId }));
        runtime.movie.debugLog.add("server", "info", `sent GOTOFLAT flat=${flatId}`);
        sentIds.add(request.id);
      }
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingNavigatorRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`navigator bridge: ${String(error)}`);
  }
}

async function sendPendingMessengerRequests(): Promise<void> {
  if (manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingMessengerRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  if (adapter.id === "release1") {
    await sendPendingRelease1MessengerRequests(pending, requests);
    return;
  }

  if (adapter.id !== "release7") {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      if (request.command === "FINDUSER") {
        const name = String(request.name ?? "").trim();
        const context = String(request.context ?? "MESSENGER");
        if (!name) {
          continue;
        }
        server.send(encodeHabboFindUserRequest(adapter, name, context));
        runtime.movie.debugLog.add("server", "info", `sent FINDUSER name=${name} context=${context}`);
        sentIds.add(request.id);
      } else if (request.body !== undefined) {
        server.send(encodeCommandRequest(request.command, { type: "raw", value: String(request.body) }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        sentIds.add(request.id);
      } else {
        server.send(encodeCommandRequest(request.command));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        sentIds.add(request.id);
      }
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingMessengerRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`messenger bridge: ${String(error)}`);
  }
}

async function sendPendingRelease1MessengerRequests(
  pending: readonly PendingMessengerRequest[],
  requests: readonly PendingMessengerRequest[]
): Promise<void> {
  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      if (request.command === "FINDUSER") {
        const name = String(request.name ?? "").trim();
        if (!name) {
          continue;
        }
        server.send(encodeV1TextClientPacket("FINDUSER", [name]));
        runtime.movie.debugLog.add("server", "info", `release1 sent FINDUSER name=${name}`);
        sentIds.add(request.id);
        continue;
      }

      const body = String(request.body ?? request.name ?? "");
      const header = request.command === "MESSENGER_INIT" ? "MESSENGERINIT" : request.command;
      server.send(encodeV1TextClientPacket(header, body ? [body] : []));
      runtime.movie.debugLog.add("server", "info", `release1 sent ${header}`);
      sentIds.add(request.id);
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingMessengerRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`release1 messenger bridge: ${String(error)}`);
  }
}

async function sendPendingPurseRequests(): Promise<void> {
  if (adapter.id !== "release7" || manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingPurseRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      if (request.command === "REDEEM_VOUCHER") {
        const code = String(request.code ?? "").trim();
        if (!code) {
          continue;
        }

        server.send(encodeCommandRequest("REDEEM_VOUCHER", { type: "string", value: code }));
        runtime.movie.debugLog.add("server", "info", `sent REDEEM_VOUCHER length=${code.length}`);
        sentIds.add(request.id);
      } else {
        server.send(encodeCommandRequest(request.command));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        sentIds.add(request.id);
      }
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingPurseRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`purse bridge: ${String(error)}`);
  }
}

async function sendPendingCatalogueRequests(): Promise<void> {
  if ((adapter.id !== "release7" && adapter.id !== "release14") || manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingCatalogueRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      const body = String(request.body ?? "");
      if (body.length > 0) {
        server.send(encodeCommandRequest(request.command, { type: "raw", value: body }));
      } else {
        server.send(encodeCommandRequest(request.command));
      }
      runtime.movie.debugLog.add("server", "info", `sent ${request.command}${request.pageId ? ` page=${request.pageId}` : ""}`);
      sentIds.add(request.id);
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingCatalogueRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`catalogue bridge: ${String(error)}`);
  }
}

async function sendPendingClubRequests(): Promise<void> {
  if (adapter.id !== "release7" || manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingClubRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      if (request.body !== undefined) {
        server.send(encodeCommandRequest(request.command, { type: "raw", value: String(request.body) }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        sentIds.add(request.id);
      } else {
        server.send(encodeCommandRequest(request.command));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        sentIds.add(request.id);
      }
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingClubRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`club bridge: ${String(error)}`);
  }
}

async function sendPendingCallForHelpRequests(): Promise<void> {
  if (adapter.id !== "release7" || manifestSource !== "projectorrays") {
    return;
  }

  const requests = readPendingCallForHelpRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  try {
    const server = await ensureBridge();
    const sentIds = new Set<number>();
    for (const request of pending) {
      server.send(encodeHabboCallForHelpRequest(adapter, request));
      runtime.movie.debugLog.add("server", "info", `sent CRYFORHELP room=${request.roomId} type=${request.roomType} length=${request.message.length}`);
      sentIds.add(request.id);
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingCallForHelpRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`call-for-help bridge: ${String(error)}`);
  }
}

async function sendPendingRoomRequests(): Promise<void> {
  if (manifestSource !== "projectorrays") {
    return;
  }

  const release = getCurrentProjectorRelease();
  if (!release) {
    return;
  }

  const requests = readPendingRoomRequests();
  const pending = requests.filter((request) => request.status === "pending");
  if (pending.length === 0) {
    return;
  }

  if (adapter.id === "release1") {
    await sendPendingRelease1RoomRequests(pending, requests, release);
    return;
  }

  if (adapter.protocol.commandIds?.["ROOM_DIRECTORY"] === undefined) {
    return;
  }

  try {
    const server = await ensureBridge();
    if (pending.some((request) => release1RoomRequestRequiresAuthenticatedSession(request.command)) && !release1BridgeAuthenticated) {
      sendRelease1VersionCheckIfNeeded(server);
      sendRelease1ReloginIfNeeded(server);
      runtime.movie.debugLog.add("server", "info", "release1 deferred room request until USEROBJECT");
      renderDebugPanel();
      return;
    }

    const services = getHabboBootServices(runtime.movie);
    const sentIds = new Set<number>();
    const markSent = (request: PendingRoomRequest) => {
      services.markRoomRequestSent(request, release);
      sentIds.add(request.id);
    };
    for (const request of pending) {
      if (request.command === "ROOM_DIRECTORY") {
        const roomId = Number.parseInt(String(request.roomId ?? ""), 10);
        if (!Number.isFinite(roomId) || roomId <= 0) {
          continue;
        }

        server.send(encodeCommandRequest(
          "ROOM_DIRECTORY",
          { type: "booleanByte", value: request.isPublic === true },
          { type: "int", value: roomId },
          { type: "int", value: request.doorId ?? 0 }
        ));
        runtime.movie.debugLog.add("server", "info", `sent ROOM_DIRECTORY room=${roomId} public=${request.isPublic === true}`);
        markSent(request);
      } else if (request.command === "TRYFLAT") {
        const roomId = String(request.roomId ?? "").trim();
        if (!roomId) {
          continue;
        }

        const body = request.password ? `${roomId}/${request.password}` : roomId;
        server.send(encodeCommandRequest("TRYFLAT", { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", `sent TRYFLAT room=${roomId}`);
        markSent(request);
      } else if (request.command === "GOTOFLAT") {
        const roomId = String(request.roomId ?? "").trim();
        if (!roomId) {
          continue;
        }

        server.send(encodeCommandRequest("GOTOFLAT", { type: "raw", value: roomId }));
        runtime.movie.debugLog.add("server", "info", `sent GOTOFLAT room=${roomId}`);
        markSent(request);
      } else if (request.command === "MOVE") {
        const x = Number(request.x);
        const y = Number(request.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          continue;
        }

        server.send(encodeCommandRequest(
          "MOVE",
          // Room Interface Class sends MOVE with [#short: x, #short: y].
          { type: "short", value: Math.trunc(x) },
          { type: "short", value: Math.trunc(y) }
        ));
        runtime.movie.debugLog.add("server", "info", `sent MOVE x=${Math.trunc(x)} y=${Math.trunc(y)}`);
        markSent(request);
      } else if (request.command === "CHAT" || request.command === "SHOUT" || request.command === "WHISPER") {
        const message = String(request.message ?? "");
        if (!message) {
          continue;
        }

        server.send(encodeCommandRequest(request.command, { type: "string", value: message }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command} length=${message.length}`);
        markSent(request);
      } else if (request.command === "LOOKTO") {
        const x = Number(request.x);
        const y = Number(request.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          continue;
        }

        server.send(encodeCommandRequest("LOOKTO", { type: "raw", value: `${Math.trunc(x)} ${Math.trunc(y)}` }));
        runtime.movie.debugLog.add("server", "info", `sent LOOKTO x=${Math.trunc(x)} y=${Math.trunc(y)}`);
        markSent(request);
      } else if (request.command === "STOP") {
        const action = String(request.action ?? "");
        if (!action) {
          continue;
        }

        server.send(encodeCommandRequest("STOP", { type: "raw", value: action }));
        runtime.movie.debugLog.add("server", "info", `sent STOP ${action}`);
        markSent(request);
      } else if (request.command === "MODERATOR") {
        const level = String(request.level ?? "").trim();
        if (!level) {
          continue;
        }

        server.send(encodeCommandRequest("Moderator", { type: "raw", value: level }));
        runtime.movie.debugLog.add("server", "info", `sent Moderator ${level}`);
        markSent(request);
      } else if (request.command === "ADDSTRIPITEM") {
        const objectId = String(request.objectId ?? "").trim();
        const stripType = request.stripType === "item" ? "item" : request.stripType === "stuff" ? "stuff" : "";
        if (!objectId || !stripType) {
          continue;
        }

        server.send(encodeCommandRequest("ADDSTRIPITEM", { type: "raw", value: `new ${stripType} ${objectId}` }));
        runtime.movie.debugLog.add("server", "info", `sent ADDSTRIPITEM type=${stripType} id=${objectId}`);
        markSent(request);
      } else if (request.command === "GETSTRIP") {
        const mode = request.stripMode === "next" ? "next" : request.stripMode === "last" ? "last" : "new";
        server.send(encodeCommandRequest("GETSTRIP", { type: "raw", value: mode }));
        runtime.movie.debugLog.add("server", "info", `sent GETSTRIP mode=${mode}`);
        markSent(request);
      } else if (request.command === "FLATPROPBYITEM" || request.command === "PLACESTUFF") {
        const body = String(request.body ?? "").trim();
        if (!body) {
          continue;
        }

        server.send(encodeCommandRequest(request.command, { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command} body=${body}`);
        markSent(request);
      } else if (request.command === "MOVESTUFF") {
        const objectId = String(request.objectId ?? "").trim();
        const x = Number(request.x);
        const y = Number(request.y);
        const direction = Number(request.direction);
        if (!objectId || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(direction)) {
          continue;
        }

        server.send(encodeCommandRequest(
          "MOVESTUFF",
          { type: "raw", value: `${objectId} ${Math.trunc(x)} ${Math.trunc(y)} ${Math.trunc(direction) % 8}` }
        ));
        runtime.movie.debugLog.add("server", "info", `sent MOVESTUFF id=${objectId} x=${Math.trunc(x)} y=${Math.trunc(y)} direction=${Math.trunc(direction) % 8}`);
        markSent(request);
      } else if (request.command === "SETSTUFFDATA") {
        const objectId = String(request.objectId ?? "").trim();
        const key = String(request.key ?? "").trim();
        const value = String(request.value ?? "").trim();
        if (!objectId || !key) {
          continue;
        }

        server.send(encodeCommandRequest("SETSTUFFDATA", { type: "raw", value: `${objectId}/${key}/${value}` }));
        runtime.movie.debugLog.add("server", "info", `sent SETSTUFFDATA id=${objectId} ${key}=${value}`);
        markSent(request);
      } else if (request.command === "GETDOORFLAT" || request.command === "INTODOOR" || request.command === "DOORGOIN") {
        const objectId = String(request.objectId ?? "").trim();
        if (!objectId) {
          continue;
        }

        server.send(encodeCommandRequest(request.command, { type: "raw", value: objectId }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command} id=${objectId}`);
        markSent(request);
      } else if (request.command === "GOVIADOOR") {
        const body = String(request.body ?? "").trim();
        if (!body) {
          continue;
        }

        server.send(encodeCommandRequest("GOVIADOOR", { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", `sent GOVIADOOR body=${body}`);
        markSent(request);
      } else if (request.command === "USEITEM") {
        const body = String(request.body ?? request.objectId ?? "").trim();
        if (!body) {
          continue;
        }

        server.send(encodeCommandRequest("USEITEM", { type: "raw", value: body }));
        runtime.movie.debugLog.add("server", "info", `sent USEITEM body=${body}`);
        markSent(request);
      } else if (request.command === "REMOVEITEM" || request.command === "REMOVESTUFF") {
        const objectId = String(request.objectId ?? "").trim();
        if (!objectId) {
          continue;
        }

        server.send(encodeCommandRequest(request.command, { type: "raw", value: objectId }));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command} id=${objectId}`);
        markSent(request);
      } else if (request.command === "SETBADGE") {
        const badge = String(request.badge ?? "");
        if (!badge) {
          continue;
        }

        server.send(encodeCommandRequest(
          "SETBADGE",
          { type: "string", value: badge },
          { type: "int", value: request.visible ?? 1 }
        ));
        runtime.movie.debugLog.add("server", "info", `sent SETBADGE badge=${badge} visible=${request.visible ?? 1}`);
        markSent(request);
      } else {
        server.send(encodeCommandRequest(request.command));
        runtime.movie.debugLog.add("server", "info", `sent ${request.command}`);
        markSent(request);
      }
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingRoomRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`room bridge: ${String(error)}`);
  }
}

async function sendPendingRelease1RoomRequests(
  pending: readonly PendingRoomRequest[],
  requests: readonly PendingRoomRequest[],
  release: string
): Promise<void> {
  try {
    const server = await ensureBridge();
    const services = getHabboBootServices(runtime.movie);
    const sentIds = new Set<number>();
    for (const request of pending) {
      const encoded = encodeRelease1RoomRequest(request);
      if (!encoded) {
        continue;
      }

      server.send(encodeV1TextClientPacket(encoded.header, encoded.args));
      runtime.movie.debugLog.add("server", "info", `release1 sent ${encoded.header}${encoded.log ? ` ${encoded.log}` : ""}`);
      services.markRoomRequestSent(request, release);
      sentIds.add(request.id);
    }

    if (sentIds.size > 0) {
      runtime.movie.setProperty("pendingRoomRequests", requests.map((request) => (
        sentIds.has(request.id) ? { ...request, status: "sent" } : request
      )));
      renderDebugPanel();
    }
  } catch (error) {
    recordRuntimeError(`release1 room bridge: ${String(error)}`);
  }
}

function encodeRelease1RoomRequest(request: PendingRoomRequest): { readonly header: string; readonly args: readonly string[]; readonly log?: string } | undefined {
  if (request.command === "MOVE") {
    const x = Number(request.x);
    const y = Number(request.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return undefined;
    }
    return { header: "Move", args: [String(Math.trunc(x)), String(Math.trunc(y))], log: `x=${Math.trunc(x)} y=${Math.trunc(y)}` };
  }

  if (request.command === "LOOKTO") {
    const x = Number(request.x);
    const y = Number(request.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return undefined;
    }
    return { header: "LOOKTO", args: [String(Math.trunc(x)), String(Math.trunc(y))], log: `x=${Math.trunc(x)} y=${Math.trunc(y)}` };
  }

  if (request.command === "CHAT" || request.command === "SHOUT" || request.command === "WHISPER") {
    const message = String(request.message ?? "");
    return message ? { header: request.command, args: [message], log: `length=${message.length}` } : undefined;
  }

  if (request.command === "STOP") {
    const action = String(request.action ?? "");
    return action ? { header: "STOP", args: [action], log: action } : undefined;
  }

  if (request.command === "DANCE") {
    return { header: "Dance", args: [] };
  }

  if (request.command === "WAVE") {
    return { header: "WAVE", args: [] };
  }

  if (request.command === "MODERATOR") {
    const level = String(request.level ?? "").trim();
    return level ? { header: "Moderator", args: [level], log: level } : undefined;
  }

  if (request.command === "QUIT") {
    return { header: "GOAWAY", args: [] };
  }

  if (request.command === "GETSTRIP") {
    return { header: "GETSTRIP", args: [request.stripMode ?? "new"], log: request.stripMode ?? "new" };
  }

  if (request.command === "ADDSTRIPITEM") {
    const objectId = String(request.objectId ?? "");
    if (!objectId) {
      return undefined;
    }
    return {
      header: "ADDSTRIPITEM",
      args: [request.stripMode ?? "new", request.stripType ?? "stuff", objectId],
      log: objectId
    };
  }

  if (request.command === "MOVESTUFF") {
    const objectId = String(request.objectId ?? "");
    const x = Number(request.x);
    const y = Number(request.y);
    if (!objectId || !Number.isFinite(x) || !Number.isFinite(y)) {
      return undefined;
    }
    const args = [objectId, String(Math.trunc(x)), String(Math.trunc(y))];
    if (request.direction !== undefined && Number.isFinite(Number(request.direction))) {
      args.push(String(Math.trunc(Number(request.direction))));
    }
    return { header: "MOVESTUFF", args, log: objectId };
  }

  if (request.command === "PLACESTUFF") {
    const body = String(request.body ?? "").trim();
    if (!body) {
      return undefined;
    }
    return {
      header: body.includes(":w=") ? "PLACEITEMFROMSTRIP" : "PLACESTUFFFROMSTRIP",
      args: [body],
      log: body
    };
  }

  if (request.command === "FLATPROPBYITEM") {
    const body = String(request.body ?? "").trim();
    if (!body) {
      return undefined;
    }
    return { header: "FLATPROPERTYBYITEM", args: [body.startsWith("/") ? body : `/${body}`], log: body };
  }

  if (request.command === "REMOVESTUFF" || request.command === "REMOVEITEM") {
    const objectId = String(request.objectId ?? "");
    return objectId ? { header: request.command, args: [objectId], log: objectId } : undefined;
  }

  if (request.command === "SETSTUFFDATA") {
    const body = String(request.body ?? "").trim();
    if (body) {
      return { header: "SETSTUFFDATA", args: [body.startsWith("/") ? body : `/${body}`], log: body };
    }
    const objectId = String(request.objectId ?? "");
    const key = String(request.key ?? "");
    const value = String(request.value ?? "");
    return objectId && key ? { header: "SETSTUFFDATA", args: [`/${objectId}/${key}/${value}`], log: `${objectId}/${key}` } : undefined;
  }

  if (request.command === "INTODOOR") {
    const objectId = String(request.objectId ?? "");
    return objectId ? { header: "IntoDoor", args: [objectId], log: objectId } : undefined;
  }

  return undefined;
}

function readPendingNavigatorRequests(): PendingNavigatorRequest[] {
  const value = runtime.movie.getProperty("pendingNavigatorRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingNavigatorRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingNavigatorRequest>;
    return typeof request.id === "number"
      && (request.command === "NAVIGATE"
        || request.command === "GETUSERFLATCATS"
        || request.command === "GETFLATINFO"
        || request.command === "GOTOFLAT"
        || request.command === "SUSERF"
        || request.command === "SRCHF"
        || request.command === "GETFVRF"
        || request.command === "ADD_FAVORITE_ROOM"
        || request.command === "DEL_FAVORITE_ROOM"
        || request.command === "CREATEFLAT"
        || request.command === "SETFLATINFO"
        || request.command === "SETFLATCAT")
      && (request.status === "pending" || request.status === "sent");
  });
}

function readPendingMessengerRequests(): PendingMessengerRequest[] {
  const value = runtime.movie.getProperty("pendingMessengerRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingMessengerRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingMessengerRequest>;
    return typeof request.id === "number"
      && (request.command === "MESSENGER_INIT"
        || request.command === "MESSENGER_SENDUPDATE"
        || request.command === "MESSENGER_MARKREAD"
        || request.command === "MESSENGER_SENDMSG"
        || request.command === "MESSENGER_SENDEMAILMSG"
        || request.command === "MESSENGER_ASSIGNPERSMSG"
        || request.command === "MESSENGER_ACCEPTBUDDY"
        || request.command === "MESSENGER_DECLINEBUDDY"
        || request.command === "MESSENGER_REQUESTBUDDY"
        || request.command === "MESSENGER_REMOVEBUDDY"
        || request.command === "FINDUSER")
      && (request.status === "pending" || request.status === "sent");
  });
}

function readPendingPurseRequests(): PendingPurseRequest[] {
  const value = runtime.movie.getProperty("pendingPurseRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingPurseRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingPurseRequest>;
    return typeof request.id === "number"
      && (request.command === "GETUSERCREDITLOG" || request.command === "REDEEM_VOUCHER")
      && (request.status === "pending" || request.status === "sent");
  });
}

function readPendingCatalogueRequests(): PendingCatalogueRequest[] {
  const value = runtime.movie.getProperty("pendingCatalogueRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingCatalogueRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingCatalogueRequest>;
    return typeof request.id === "number"
      && (request.command === "GET_CATALOG_INDEX"
        || request.command === "GET_CATALOG_PAGE"
        || request.command === "PURCHASE_FROM_CATALOG")
      && (request.status === "pending" || request.status === "sent");
  });
}

function readPendingClubRequests(): PendingClubRequest[] {
  const value = runtime.movie.getProperty("pendingClubRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingClubRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingClubRequest>;
    return typeof request.id === "number"
      && (request.command === "SCR_GINFO"
        || request.command === "SCR_SUBSCRIBE"
        || request.command === "SCR_EXTSCR"
        || request.command === "GETAVAILABLEBADGES")
      && (request.status === "pending" || request.status === "sent");
  });
}

function readPendingCallForHelpRequests(): PendingCallForHelpRequest[] {
  const value = runtime.movie.getProperty("pendingCallForHelpRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingCallForHelpRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingCallForHelpRequest>;
    return typeof request.id === "number"
      && request.command === "CRYFORHELP"
      && (request.status === "pending" || request.status === "sent")
      && typeof request.message === "string"
      && (request.roomType === 0 || request.roomType === 1)
      && typeof request.markerOrCasts === "string"
      && typeof request.roomName === "string"
      && typeof request.roomId === "string";
  });
}

function readPendingRoomRequests(): PendingRoomRequest[] {
  const value = runtime.movie.getProperty("pendingRoomRequests");
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is PendingRoomRequest => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const request = entry as Partial<PendingRoomRequest>;
    return typeof request.id === "number"
      && (request.command === "ROOM_DIRECTORY"
        || request.command === "TRYFLAT"
        || request.command === "GOTOFLAT"
        || request.command === "GETROOMAD"
        || request.command === "G_HMAP"
        || request.command === "G_USRS"
        || request.command === "G_OBJS"
        || request.command === "G_ITEMS"
        || request.command === "G_STAT"
        || request.command === "MOVE"
        || request.command === "CHAT"
        || request.command === "SHOUT"
        || request.command === "WHISPER"
        || request.command === "LOOKTO"
        || request.command === "STOP"
        || request.command === "DANCE"
        || request.command === "WAVE"
        || request.command === "QUIT"
        || request.command === "SETBADGE"
        || request.command === "ADDSTRIPITEM"
        || request.command === "GETSTRIP"
        || request.command === "FLATPROPBYITEM"
        || request.command === "PLACESTUFF"
        || request.command === "MOVESTUFF"
        || request.command === "REMOVEITEM"
        || request.command === "REMOVESTUFF"
        || request.command === "SETSTUFFDATA"
        || request.command === "GETDOORFLAT"
        || request.command === "GOVIADOOR"
        || request.command === "INTODOOR"
        || request.command === "DOORGOIN"
        || request.command === "USEITEM")
      && (request.status === "pending" || request.status === "sent");
  });
}

function recordUserObject(body: string): void {
  const fields: Record<string, string> = {};
  for (const line of body.split(/\r?\n|\r/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    fields[line.slice(0, separator)] = line.slice(separator + 1);
  }

  runtime.movie.setProperty("lastUserObject", fields);
  runtime.movie.setProperty("lastLoginAttempt", {
    accepted: true,
    userName: fields.name ?? readObjectProperty(runtime.movie, "lastLoginAttempt")?.userName ?? "",
    passwordLength: readObjectProperty(runtime.movie, "lastLoginAttempt")?.passwordLength ?? 0,
    action: "userobj"
  });
  runtime.movie.debugLog.add("server", "ok", `USEROBJ parsed user=${fields.name ?? "unknown"} figure=${fields.figure ?? "n/a"}`);
}

function closeBridge(): void {
  bridge?.close();
  bridge = undefined;
  release14PendingLoginCredentials = undefined;
  lastBridgeSendTimestamp = undefined;
  lastBridgeLatencyMs = undefined;
}

function getDefaultBridgeUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("serverWs");
  if (override) {
    return override;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname || "127.0.0.1";
  const port = adapter.protocol.bridge?.defaultWebSocketPort ?? 1232;
  return `${protocol}//${hostname}:${port}`;
}

function readWindowFieldValue(elementId: string): string {
  const value = runtime.movie.getProperty("windowFieldValues") ?? runtime.movie.getProperty("loginFieldValues");
  if (typeof value !== "object" || value === null) {
    return "";
  }

  const fields = value as Record<string, unknown>;
  const fieldValue = fields[elementId];
  return typeof fieldValue === "string" ? fieldValue : "";
}

function getCurrentProjectorRelease(): string | undefined {
  return manifestSource === "projectorrays" ? getProjectorRaysReleaseName(adapter.id) : undefined;
}

interface HabboInteractiveElement {
  readonly id: string;
  readonly windowId: string;
  readonly kind: "field" | "button" | "link" | "scrollbar" | "dropmenu" | "drag" | "room" | "room_user" | "room_object";
  readonly x: number;
  readonly y: number;
  readonly locZ?: number;
  readonly width: number;
  readonly height: number;
  readonly enabled?: boolean;
  readonly label?: string;
  readonly editable?: boolean;
  readonly password?: boolean;
  readonly cursor?: string;
  readonly fontSize?: number;
  readonly textAlign?: "left" | "center" | "right";
  readonly renderValue?: boolean;
  readonly scrollClientX?: number;
  readonly scrollClientY?: number;
  readonly scrollClientWidth?: number;
  readonly scrollClientHeight?: number;
}

function readInteractiveElements(movie: HabboRuntime["movie"]): HabboInteractiveElement[] {
  const value = movie.getProperty("windowInteractiveElements");
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeHabboInteractiveElements(value.filter((entry): entry is HabboInteractiveElement => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const candidate = entry as HabboInteractiveElement;
    return typeof candidate.id === "string"
      && typeof candidate.windowId === "string"
      && (candidate.kind === "field" || candidate.kind === "button" || candidate.kind === "link" || candidate.kind === "scrollbar" || candidate.kind === "dropmenu" || candidate.kind === "drag" || candidate.kind === "room" || candidate.kind === "room_user" || candidate.kind === "room_object")
      && typeof candidate.x === "number"
      && typeof candidate.y === "number"
      && (candidate.locZ === undefined || typeof candidate.locZ === "number")
      && typeof candidate.width === "number"
      && typeof candidate.height === "number"
      && (candidate.enabled === undefined || typeof candidate.enabled === "boolean");
  }));
}

function dedupeHabboInteractiveElements(elements: readonly HabboInteractiveElement[]): HabboInteractiveElement[] {
  const byKey = new Map<string, HabboInteractiveElement>();
  for (const element of elements) {
    byKey.set(`${element.windowId}\u0000${element.kind}\u0000${element.id}`, element);
  }
  return [...byKey.values()];
}

function readEntryVisualSpriteCount(movie: HabboRuntime["movie"]): number {
  const visuals = movie.getProperty("entryVisuals");
  if (typeof visuals === "object" && visuals !== null && "spriteCount" in visuals && typeof visuals.spriteCount === "number") {
    return visuals.spriteCount;
  }

  return 0;
}

function readWindowSpriteCount(movie: HabboRuntime["movie"]): number {
  const visuals = movie.getProperty("windowVisuals");
  if (typeof visuals === "object" && visuals !== null && "spriteCount" in visuals && typeof visuals.spriteCount === "number") {
    return visuals.spriteCount;
  }

  return 0;
}

function readLoadingBarVisible(movie: HabboRuntime["movie"]): boolean {
  return movie.getProperty("loadingBarVisible") === true;
}

function readLogoVisible(movie: HabboRuntime["movie"]): boolean {
  return movie.getProperty("logoVisible") === true;
}

function readLoginAttempt(movie: HabboRuntime["movie"]): string {
  const value = movie.getProperty("lastLoginAttempt");
  if (typeof value !== "object" || value === null) {
    return "none";
  }

  const attempt = value as Record<string, unknown>;
  return `${attempt.accepted === true ? "accepted" : "rejected"} ${String(attempt.userName ?? "")}`.trim();
}

function formatPendingContinuation(movie: HabboRuntime["movie"]): string {
  const pending = readObjectProperty(movie, "pendingExtractedBootContinuation");
  if (!pending) {
    return "none";
  }

  return `${formatUnknown(pending.state)} ${formatUnknown(pending.release)}`.trim();
}

function formatLoginFieldLengths(movie: HabboRuntime["movie"]): string {
  const fields = readObjectProperty(movie, "loginFieldValues");
  if (!fields) {
    return "none";
  }

  const fieldSummaries = Object.entries(fields).map(([field, value]) => {
    return `${field}:${typeof value === "string" ? value.length : 0}`;
  });
  return fieldSummaries.length > 0 ? fieldSummaries.join(", ") : "none";
}

function formatWindowFieldLengths(movie: HabboRuntime["movie"]): string {
  const fields = readObjectProperty(movie, "windowFieldValues") ?? readObjectProperty(movie, "loginFieldValues");
  if (!fields) {
    return "none";
  }

  const fieldSummaries = Object.entries(fields).map(([field, value]) => {
    return `${field}:${typeof value === "string" ? value.length : 0}`;
  });
  return fieldSummaries.length > 0 ? compactList(fieldSummaries, 14) : "none";
}

function formatEntryAnimation(movie: HabboRuntime["movie"]): string {
  const animation = readObjectProperty(movie, "entryVisualAnimation");
  if (!animation) {
    return "none";
  }

  return `${formatUnknown(animation.phase)} ${formatUnknown(animation.elapsedMs)}ms source=${formatUnknown(animation.source)}`;
}

function formatLastLoginAction(movie: HabboRuntime["movie"]): string {
  const action = readObjectProperty(movie, "lastLoginAction");
  if (!action) {
    return "none";
  }

  return Object.entries(action).map(([key, value]) => `${key}=${formatUnknown(value)}`).join(" ");
}

function formatCurrentRoomData(movie: HabboRuntime["movie"]): string {
  const roomData = readObjectProperty(movie, "currentRoomData");
  if (!roomData) {
    return "none";
  }

  return [
    `id=${formatUnknown(roomData.id)}`,
    `type=${formatUnknown(roomData.type)}`,
    `name=${formatUnknown(roomData.name)}`,
    `door=${formatUnknown(roomData.doorId)}`
  ].join(" ");
}

function formatRoomPacketFlags(movie: HabboRuntime["movie"]): string {
  const flags = readObjectProperty(movie, "roomPacketFlags");
  if (!flags) {
    return "none";
  }

  return [
    "heightmap",
    "users",
    "objects",
    "activeObjects",
    "items",
    "status"
  ].map((key) => `${key}=${formatUnknown(flags[key])}`).join(" ");
}

function formatPendingRoomRequests(movie: HabboRuntime["movie"]): string {
  const requests = readArrayProperty(movie, "pendingRoomRequests")
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);
  if (requests.length === 0) {
    return "none";
  }

  return compactList(requests.map((request) => {
    const target = request.roomId !== undefined
      ? ` room=${formatUnknown(request.roomId)}`
      : request.x !== undefined || request.y !== undefined
        ? ` x=${formatUnknown(request.x)} y=${formatUnknown(request.y)}`
        : "";
    return `${formatUnknown(request.id)}:${formatUnknown(request.command)}:${formatUnknown(request.status)}${target}`;
  }), 14);
}

function renderCastLoadSummary(movie: HabboRuntime["movie"]): string {
  const lastCastLoad = readObjectProperty(movie, "lastCastLoad");
  const graph = readArrayProperty(movie, "lastCastGraphResolution");
  if (!lastCastLoad && graph.length === 0) {
    return "<p>none</p>";
  }

  const resolved = readLastCastLoadList(movie, "resolvedCasts");
  const missing = readLastCastLoadList(movie, "missingCasts");
  const imported = readLastCastLoadList(movie, "importedCastLibs");
  const requested = readLastCastLoadList(movie, "casts");
  return `
    <dl class="debug-subgrid">
      <dt>Load ID</dt><dd>${escapeHtml(String(lastCastLoad?.loadId ?? "n/a"))}</dd>
      <dt>Requested</dt><dd>${escapeHtml(compactList(requested))}</dd>
      <dt>Resolved</dt><dd>${escapeHtml(compactList(resolved))}</dd>
      <dt>Imported</dt><dd>${escapeHtml(compactList(imported.map((entry) => formatCastImport(entry))))}</dd>
      <dt>Missing</dt><dd>${escapeHtml(compactList(missing))}</dd>
    </dl>
  `;
}

function renderUnsupportedSummary(movie: HabboRuntime["movie"]): string {
  const unsupported = movie.unsupported.list().slice(-10).reverse();
  if (unsupported.length === 0) {
    return renderList(["none"]);
  }

  return renderList(unsupported.map((entry) => `${entry.feature}: ${entry.detail}`));
}

function readStringProperty(movie: HabboRuntime["movie"], name: string): string | undefined {
  const value = movie.getProperty(name);
  return typeof value === "string" ? value : undefined;
}

function readObjectProperty(movie: HabboRuntime["movie"], name: string): Record<string, unknown> | undefined {
  const value = movie.getProperty(name);
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function readArrayProperty(movie: HabboRuntime["movie"], name: string): readonly unknown[] {
  const value = movie.getProperty(name);
  return Array.isArray(value) ? value : [];
}

function readLastCastLoadList(movie: HabboRuntime["movie"], key: string): readonly unknown[] {
  const lastCastLoad = readObjectProperty(movie, "lastCastLoad");
  const value = lastCastLoad?.[key];
  return Array.isArray(value) ? value : [];
}

function formatAssetRequestSummary(summary: Record<string, unknown> | undefined): string {
  if (!summary) {
    return "n/a";
  }

  const categoryText = formatAssetCategoryCounts(asRecord(summary.byCategory));
  return `requests=${readNumberRecordValue(summary, "totalRequests")} unique=${readNumberRecordValue(summary, "uniqueAssets")} network=${readNumberRecordValue(summary, "networkLoads")} memory=${readNumberRecordValue(summary, "memoryHits")} pending=${readNumberRecordValue(summary, "pendingHits")} failed=${readNumberRecordValue(summary, "failures")} categories=${categoryText}`;
}

function formatAssetCategoryCounts(value: Record<string, unknown> | undefined): string {
  if (!value) {
    return "none";
  }

  const entries = Object.entries(value)
    .map(([key, count]) => [key, typeof count === "number" ? count : 0] as const)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([key, count]) => `${key}:${count}`);
  return entries.length > 0 ? entries.join(",") : "none";
}

function readNumberRecordValue(value: Record<string, unknown>, key: string): number {
  const entry = value[key];
  return typeof entry === "number" && Number.isFinite(entry) ? entry : 0;
}

function compactList(items: readonly unknown[], limit = 8): string {
  if (items.length === 0) {
    return "none";
  }

  const formatted = items.slice(0, limit).map((item) => typeof item === "string" ? item : JSON.stringify(item));
  const suffix = items.length > limit ? ` +${items.length - limit}` : "";
  return `${formatted.join(", ")}${suffix}`;
}

function formatCastImport(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return String(value);
  }

  const entry = value as Record<string, unknown>;
  const castName = typeof entry.castName === "string" ? entry.castName : "unknown";
  const castLib = typeof entry.castLib === "number" ? entry.castLib : "?";
  const memberCount = typeof entry.memberCount === "number" ? entry.memberCount : "?";
  return `${castName}->${castLib} (${memberCount})`;
}

function formatUnknown(value: unknown): string {
  if (value === undefined) {
    return "n/a";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderList(items: readonly string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
