import type { DirectorMemberManifest, DirectorSpriteChannelManifest } from "../../runtime";
import { parseLoadingBarProps } from "../HabboSourceValueHelpers";

export interface HabboLoadingBarRuntimeHost {
  readonly movie: {
    readonly stage: { readonly width: number; readonly height: number };
    readonly cast: {
      importOrCreateCastLib(cast: { readonly number: number; readonly name: string; readonly fileName: string; readonly members: readonly DirectorMemberManifest[] }): void;
    };
    setProperty(key: string, value: unknown): void;
  };

  getVariable(name: string): unknown;
  getRuntimeLoadingCastSlot(): number;
  syncDirectorOverlaySprites(): void;
  logDebug(subsystem: string, level: "info" | "warn" | "error" | "ok", message: string, data?: unknown): void;
  recordUnsupportedOnce(key: string, entry: unknown): void;
}

export function showLoadingBarRuntime(
  host: HabboLoadingBarRuntimeHost,
  loadId: number,
  release: string,
  buffer: "#window" | "#stage" = "#window",
  percent = 0
): void {
  const props = parseLoadingBarProps(host.getVariable("loading.bar.props"));
  const clampedPercent = Math.max(0, Math.min(1, percent));
  const castLib = host.getRuntimeLoadingCastSlot();
  const outerWidth = props.width;
  const outerHeight = props.height;
  const innerWidth = Math.max(0, outerWidth - 2);
  const innerHeight = Math.max(0, outerHeight - 2);
  const fillWidth = Math.max(0, Math.round((outerWidth - 4) * clampedPercent));
  const fillHeight = Math.max(0, outerHeight - 4);
  const x = Math.round((host.movie.stage.width - outerWidth) / 2);
  const y = Math.round((host.movie.stage.height - outerHeight) / 2);

  const members: DirectorMemberManifest[] = [
    {
      number: 1,
      name: "runtime.loading.border",
      type: "bitmap",
      width: outerWidth,
      height: outerHeight,
      color: props.color
    },
    {
      number: 2,
      name: "runtime.loading.background",
      type: "bitmap",
      width: innerWidth,
      height: innerHeight,
      color: props.bgColor
    },
    {
      number: 3,
      name: "runtime.loading.fill",
      type: "bitmap",
      width: fillWidth,
      height: fillHeight,
      color: props.color
    }
  ];

  host.movie.cast.importOrCreateCastLib({
    number: castLib,
    name: "runtime_loading_bar",
    fileName: "runtime-loading-bar",
    members
  });

  const sprites: DirectorSpriteChannelManifest[] = [
    {
      channel: 9001,
      member: { castLib, member: 1 },
      loc: { x, y },
      width: outerWidth,
      height: outerHeight,
      ink: 0,
      blend: 100,
      visible: true
    },
    {
      channel: 9002,
      member: { castLib, member: 2 },
      loc: { x: x + 1, y: y + 1 },
      width: innerWidth,
      height: innerHeight,
      ink: 0,
      blend: 100,
      visible: true
    },
    ...(fillWidth > 0
      ? [
          {
            channel: 9003,
            member: { castLib, member: 3 },
            loc: { x: x + 2, y: y + 2 },
            width: fillWidth,
            height: fillHeight,
            ink: 0,
            blend: 100,
            visible: true
          } satisfies DirectorSpriteChannelManifest
        ]
      : [])
  ];

  host.movie.setProperty("loadingBarOverlaySprites", sprites);
  host.movie.setProperty("lastLoadingBar", {
    loadId,
    buffer,
    props: host.getVariable("loading.bar.props"),
    parsedProps: props,
    percent: clampedPercent,
    spriteCount: sprites.length,
    rect: { x, y, width: outerWidth, height: outerHeight }
  });
  host.movie.setProperty("loadingBarVisible", true);
  host.movie.setProperty("runtimeLoadingCastLib", castLib);
  host.syncDirectorOverlaySprites();
  host.logDebug("loading", "info", `showLoadingBar loadId=${loadId} percent=${clampedPercent} sprites=${sprites.length}`);
  host.recordUnsupportedOnce("loading-bar-rendering-partial", {
    subsystem: "habbo",
    feature: "loading-bar-rendering-partial",
    detail: `${release} Loading Bar Class is modeled as a centered generated Director overlay from loading.bar.props; full window object buffering and prepare timing are not implemented yet`,
    source: `extracted/projectorrays/${release}/fuse_client/casts/External/ParentScript 69 - Loading Bar Class.ls`
  });
}

export function hideLoadingBarRuntime(host: HabboLoadingBarRuntimeHost): void {
  host.movie.setProperty("loadingBarOverlaySprites", []);
  host.movie.setProperty("loadingBarVisible", false);
  host.syncDirectorOverlaySprites();
  host.logDebug("loading", "ok", "hideLoadingBar");
}
