import type {
  HabboButtonBitmapAssetSet,
  HabboExternalCastWindowLayoutSet,
  HabboWindowBitmapAssetSet
} from "../HabboBootServices";

export const HABBO_ALERT_RELEASE7_SOURCE =
  "extracted/projectorrays/release7_20050729_2/hh_interface/casts/External/ParentScript 189 - Dialog Thread Class.ls";

const sharedAlertWindowNames = new Set([
  "habbo_basic.window",
  "habbo_alert_a.window",
  "habbo_alert_b.window",
  "habbo_alert_c.window"
]);

export function withRelease7AlertWindowLayouts(
  releaseSet: HabboExternalCastWindowLayoutSet | undefined,
  release7Set: HabboExternalCastWindowLayoutSet | undefined,
  options: { readonly versionId: string; readonly release: string }
): HabboExternalCastWindowLayoutSet | undefined {
  if (!release7Set) {
    return releaseSet;
  }

  const release7AlertWindows = release7Set.windows.filter((window) => sharedAlertWindowNames.has(window.memberName));
  if (release7AlertWindows.length === 0) {
    return releaseSet;
  }

  const baseSet = releaseSet ?? emptyWindowLayoutSet(options);
  const existingNames = new Set(baseSet.windows.map((window) => window.memberName.toLowerCase()));
  const compatibleWindows = release7AlertWindows.filter((window) => !existingNames.has(window.memberName.toLowerCase()));
  if (compatibleWindows.length === 0) {
    return baseSet;
  }

  return {
    ...baseSet,
    sourceId: `${baseSet.sourceId}+release7-alert-runtime`,
    windowCount: baseSet.windows.length + compatibleWindows.length,
    bitmapReferenceCount: baseSet.bitmapReferenceCount + compatibleWindows.reduce((count, window) => count + window.bitmapReferences.length, 0),
    unresolvedReferenceCount: baseSet.unresolvedReferenceCount + compatibleWindows.reduce((count, window) => count + window.unresolvedReferences.length, 0),
    windows: [...baseSet.windows, ...compatibleWindows]
  };
}

export function withRelease7AlertWindowBitmaps(
  releaseSet: HabboWindowBitmapAssetSet | undefined,
  release7Set: HabboWindowBitmapAssetSet | undefined,
  options: { readonly versionId: string; readonly release: string }
): HabboWindowBitmapAssetSet | undefined {
  if (!release7Set) {
    return releaseSet;
  }

  const release7AlertWindows = release7Set.windows.filter((window) => sharedAlertWindowNames.has(window.memberName));
  if (release7AlertWindows.length === 0) {
    return releaseSet;
  }

  const release7AlertAssetIds = new Set(release7AlertWindows.flatMap((window) => window.assetIds));
  const release7AlertAssets = release7Set.assets.filter((asset) => release7AlertAssetIds.has(asset.id));
  const release7AlertUnsupported = release7Set.unsupported.filter((entry) => {
    return sharedAlertWindowNames.has(entry.memberName) || sharedAlertWindowNames.has(entry.windowName);
  });
  const baseSet = releaseSet ?? emptyWindowBitmapAssetSet(options);
  const existingWindowNames = new Set(baseSet.windows.map((window) => window.memberName.toLowerCase()));
  const existingAssetIds = new Set(baseSet.assets.map((asset) => asset.id));
  const existingUnsupportedKeys = new Set(baseSet.unsupported.map((entry) => `${entry.windowName}:${entry.memberName}:${entry.reason}`));
  const compatibleWindows = release7AlertWindows.filter((window) => !existingWindowNames.has(window.memberName.toLowerCase()));
  const compatibleAssets = release7AlertAssets.filter((asset) => !existingAssetIds.has(asset.id));
  const compatibleUnsupported = release7AlertUnsupported.filter((entry) => !existingUnsupportedKeys.has(`${entry.windowName}:${entry.memberName}:${entry.reason}`));

  if (compatibleWindows.length === 0 && compatibleAssets.length === 0 && compatibleUnsupported.length === 0) {
    return baseSet;
  }

  return {
    ...baseSet,
    sourceId: `${baseSet.sourceId}+release7-alert-runtime`,
    windowCount: baseSet.windows.length + compatibleWindows.length,
    assetCount: baseSet.assets.length + compatibleAssets.length,
    unsupportedCount: baseSet.unsupported.length + compatibleUnsupported.length,
    windows: [...baseSet.windows, ...compatibleWindows],
    assets: [...baseSet.assets, ...compatibleAssets],
    unsupported: [...baseSet.unsupported, ...compatibleUnsupported]
  };
}

export function withRelease7AlertButtonBitmaps(
  releaseSet: HabboButtonBitmapAssetSet | undefined,
  release7Set: HabboButtonBitmapAssetSet | undefined,
  options: { readonly versionId: string; readonly release: string }
): HabboButtonBitmapAssetSet | undefined {
  if (!release7Set) {
    return releaseSet;
  }

  const baseSet = releaseSet ?? emptyButtonBitmapAssetSet(options);
  const existingElementNames = new Set(baseSet.elements.map((element) => element.memberName.toLowerCase()));
  const existingAssetIds = new Set(baseSet.assets.map((asset) => asset.id));
  const existingUnsupportedKeys = new Set(baseSet.unsupported.map((entry) => `${entry.elementName}:${entry.memberName}:${entry.reason}`));
  const compatibleElements = release7Set.elements.filter((element) => !existingElementNames.has(element.memberName.toLowerCase()));
  const compatibleAssets = release7Set.assets.filter((asset) => !existingAssetIds.has(asset.id));
  const compatibleUnsupported = release7Set.unsupported.filter((entry) => !existingUnsupportedKeys.has(`${entry.elementName}:${entry.memberName}:${entry.reason}`));

  if (compatibleElements.length === 0 && compatibleAssets.length === 0 && compatibleUnsupported.length === 0) {
    return baseSet;
  }

  return {
    ...baseSet,
    sourceId: `${baseSet.sourceId}+release7-alert-runtime-buttons`,
    elementCount: baseSet.elements.length + compatibleElements.length,
    assetCount: baseSet.assets.length + compatibleAssets.length,
    unsupportedCount: baseSet.unsupported.length + compatibleUnsupported.length,
    elements: [...baseSet.elements, ...compatibleElements],
    assets: [...baseSet.assets, ...compatibleAssets],
    unsupported: [...baseSet.unsupported, ...compatibleUnsupported]
  };
}

function emptyWindowLayoutSet(options: { readonly versionId: string; readonly release: string }): HabboExternalCastWindowLayoutSet {
  return {
    versionId: options.versionId,
    release: options.release,
    sourceId: `${options.versionId}-alert-compatibility`,
    windowCount: 0,
    bitmapReferenceCount: 0,
    unresolvedReferenceCount: 0,
    windows: []
  };
}

function emptyWindowBitmapAssetSet(options: { readonly versionId: string; readonly release: string }): HabboWindowBitmapAssetSet {
  return {
    versionId: options.versionId,
    release: options.release,
    sourceId: `${options.versionId}-alert-compatibility`,
    windowCount: 0,
    assetCount: 0,
    unsupportedCount: 0,
    windows: [],
    assets: [],
    unsupported: []
  };
}

function emptyButtonBitmapAssetSet(options: { readonly versionId: string; readonly release: string }): HabboButtonBitmapAssetSet {
  return {
    versionId: options.versionId,
    release: options.release,
    sourceId: `${options.versionId}-alert-compatibility`,
    elementCount: 0,
    assetCount: 0,
    unsupportedCount: 0,
    elements: [],
    assets: [],
    unsupported: []
  };
}
