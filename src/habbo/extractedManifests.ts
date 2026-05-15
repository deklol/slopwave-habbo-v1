import {
  createUnsupportedLingoScriptMapForRelease,
  type DirectorMovieManifest,
  type DirectorScriptInstance,
  type ProjectorRaysLingoHandlerIndex
} from "../runtime";
import type { HabboVersionId } from "./HabboVersionAdapter";
import release1ProjectorRaysManifest from "../../generated/runtime-data/release1_roseau_dcr0910-projectorrays-manifest.json";
import release1HabboEntryProjectorRaysManifest from "../../generated/runtime-data/release1_roseau_dcr0910-habbo_entry-projectorrays-manifest.json";
import release1GfPrivateProjectorRaysManifest from "../../generated/runtime-data/release1_roseau_dcr0910-gf_private-projectorrays-manifest.json";
import projectorRaysLingoHandlerIndex from "../../generated/runtime-data/projectorrays-lingo-handler-index.json";
import projectorRaysTextFields from "../../generated/runtime-data/projectorrays-text-fields.json";
import externalFields from "../../generated/runtime-data/external-fields.json";
import externalCastGraph from "../../generated/runtime-data/external-cast-graph.json";
import externalCastTextFields from "../../generated/runtime-data/external-cast-text-fields.json";
import externalCastWindowLayouts from "../../generated/runtime-data/external-cast-window-layout-index.json";
import externalCastVisualLayouts from "../../generated/runtime-data/external-cast-visual-layout-index.json";
import windowBitmapAssets from "../../generated/runtime-data/window-bitmap-assets.json";
import visualBitmapAssets from "../../generated/runtime-data/visual-bitmap-assets.json";
import buttonBitmapAssets from "../../generated/runtime-data/button-bitmap-assets.json";
import internalBitmapAssets from "../../generated/runtime-data/internal-bitmap-assets.json";
import externalBitmapAssets from "../../generated/runtime-data/external-bitmap-assets.json";
import figurePartIndex from "../../generated/runtime-data/figure-part-index.json";
import { applyProjectorRaysBootLingoOverrides } from "./ProjectorRaysBootLingo";
import type {
  HabboExternalCastGraph,
  HabboExternalBitmapAssetSet,
  HabboExternalCastTextFieldSet,
  HabboExternalCastVisualLayoutSet,
  HabboExternalCastWindowLayoutSet,
  HabboExternalFieldSet,
  HabboButtonBitmapAssetSet,
  HabboFigurePartIndexSet,
  HabboInternalBitmapAssetSet,
  HabboTextFieldSet,
  HabboVisualBitmapAssetSet,
  HabboWindowBitmapAssetSet
} from "./HabboBootServices";
import {
  withRelease7AlertButtonBitmaps,
  withRelease7AlertWindowBitmaps,
  withRelease7AlertWindowLayouts
} from "./ui/HabboAlertCompatibilityOverrides";

const projectorRaysManifests: Partial<Record<HabboVersionId, DirectorMovieManifest>> = {
  release1: release1ProjectorRaysManifest as DirectorMovieManifest
};

const projectorRaysManifestsByRelease = new Map<string, DirectorMovieManifest>([
  ["release1_roseau_dcr0910", release1ProjectorRaysManifest as DirectorMovieManifest],
  ["release1_roseau_dcr0910-habbo_entry", release1HabboEntryProjectorRaysManifest as DirectorMovieManifest],
  ["release1_roseau_dcr0910-gf_private", release1GfPrivateProjectorRaysManifest as DirectorMovieManifest]
]);

const projectorRaysReleaseNames: Partial<Record<HabboVersionId, string>> = {
  release1: "release1_roseau_dcr0910"
};

export type HabboManifestSource = "probe" | "projectorrays";

export function getProjectorRaysManifest(versionId: HabboVersionId): DirectorMovieManifest | undefined {
  return projectorRaysManifests[versionId];
}

export function getProjectorRaysManifestByRelease(release: string): DirectorMovieManifest | undefined {
  return projectorRaysManifestsByRelease.get(release);
}

export function getProjectorRaysManifestsByVersion(versionId: HabboVersionId): readonly DirectorMovieManifest[] {
  switch (versionId) {
    case "release1":
      return [
        release1ProjectorRaysManifest as DirectorMovieManifest,
        release1HabboEntryProjectorRaysManifest as DirectorMovieManifest,
        release1GfPrivateProjectorRaysManifest as DirectorMovieManifest
      ];
    default:
      return [];
  }
}

export function hasProjectorRaysManifest(versionId: HabboVersionId): boolean {
  return getProjectorRaysManifest(versionId) !== undefined;
}

export function getProjectorRaysReleaseName(versionId: HabboVersionId): string | undefined {
  return projectorRaysReleaseNames[versionId];
}

export function getProjectorRaysLingoScripts(versionId: HabboVersionId): Map<string, DirectorScriptInstance> | undefined {
  const release = getProjectorRaysReleaseName(versionId);
  if (!release) {
    return undefined;
  }

  const scripts = createUnsupportedLingoScriptMapForRelease(projectorRaysLingoHandlerIndex as ProjectorRaysLingoHandlerIndex, release);
  return applyProjectorRaysBootLingoOverrides(
    scripts,
    release,
    getProjectorRaysTextFieldSetByRelease(release),
    getExternalFieldSet(versionId),
    getExternalCastGraph(versionId),
    getExternalCastTextFieldSet(versionId),
    getExternalCastWindowLayoutSet(versionId),
    getWindowBitmapAssetSet(versionId),
    getExternalCastVisualLayoutSet(versionId),
    getVisualBitmapAssetSet(versionId),
    getButtonBitmapAssetSet(versionId),
    getInternalBitmapAssetSet(versionId),
    getExternalBitmapAssetSet(versionId),
    getFigurePartIndexSet(versionId)
  );
}

export function getProjectorRaysLingoScriptsByRelease(
  release: string,
  versionId: HabboVersionId
): Map<string, DirectorScriptInstance> | undefined {
  if (!projectorRaysManifestsByRelease.has(release)) {
    return undefined;
  }

  const scripts = createUnsupportedLingoScriptMapForRelease(projectorRaysLingoHandlerIndex as ProjectorRaysLingoHandlerIndex, release);
  return applyProjectorRaysBootLingoOverrides(
    scripts,
    release,
    getProjectorRaysTextFieldSetByRelease(release),
    getExternalFieldSet(versionId),
    getExternalCastGraph(versionId),
    getExternalCastTextFieldSet(versionId),
    getExternalCastWindowLayoutSet(versionId),
    getWindowBitmapAssetSet(versionId),
    getExternalCastVisualLayoutSet(versionId),
    getVisualBitmapAssetSet(versionId),
    getButtonBitmapAssetSet(versionId),
    getInternalBitmapAssetSet(versionId),
    getExternalBitmapAssetSet(versionId),
    getFigurePartIndexSet(versionId)
  );
}

export const getProjectorRaysUnsupportedLingoScripts = getProjectorRaysLingoScripts;

export function getProjectorRaysTextFieldSet(versionId: HabboVersionId): HabboTextFieldSet | undefined {
  const release = getProjectorRaysReleaseName(versionId);
  return release ? getProjectorRaysTextFieldSetByRelease(release) : undefined;
}

export function getExternalFieldSet(versionId: HabboVersionId): HabboExternalFieldSet | undefined {
  return (externalFields as { releases: HabboExternalFieldSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getExternalCastGraph(versionId: HabboVersionId): HabboExternalCastGraph | undefined {
  return (externalCastGraph as unknown as { releases: HabboExternalCastGraph[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getExternalCastTextFieldSet(versionId: HabboVersionId): HabboExternalCastTextFieldSet | undefined {
  return (externalCastTextFields as { releases: HabboExternalCastTextFieldSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getExternalCastWindowLayoutSet(versionId: HabboVersionId): HabboExternalCastWindowLayoutSet | undefined {
  const releaseSet = (externalCastWindowLayouts as { releases: HabboExternalCastWindowLayoutSet[] }).releases.find((entry) => entry.versionId === versionId);
  const release7Set = (externalCastWindowLayouts as { releases: HabboExternalCastWindowLayoutSet[] }).releases.find((entry) => entry.versionId === "release7");
  if (versionId === "release1") {
    return withRelease7AlertWindowLayouts(releaseSet, release7Set, { versionId, release: projectorRaysReleaseNames.release1 ?? "release1_roseau_dcr0910" });
  }
  return releaseSet;
}

export function getExternalCastVisualLayoutSet(versionId: HabboVersionId): HabboExternalCastVisualLayoutSet | undefined {
  return (externalCastVisualLayouts as { releases: HabboExternalCastVisualLayoutSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getWindowBitmapAssetSet(versionId: HabboVersionId): HabboWindowBitmapAssetSet | undefined {
  const releaseSet = (windowBitmapAssets as { releases: HabboWindowBitmapAssetSet[] }).releases.find((entry) => entry.versionId === versionId);
  const release7Set = (windowBitmapAssets as { releases: HabboWindowBitmapAssetSet[] }).releases.find((entry) => entry.versionId === "release7");
  if (versionId === "release1") {
    return withRelease7AlertWindowBitmaps(releaseSet, release7Set, { versionId, release: projectorRaysReleaseNames.release1 ?? "release1_roseau_dcr0910" });
  }
  return releaseSet;
}

export function getVisualBitmapAssetSet(versionId: HabboVersionId): HabboVisualBitmapAssetSet | undefined {
  return (visualBitmapAssets as { releases: HabboVisualBitmapAssetSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getButtonBitmapAssetSet(versionId: HabboVersionId): HabboButtonBitmapAssetSet | undefined {
  const releaseSet = (buttonBitmapAssets as { releases: HabboButtonBitmapAssetSet[] }).releases.find((entry) => entry.versionId === versionId);
  if (versionId === "release1") {
    const release7Set = (buttonBitmapAssets as { releases: HabboButtonBitmapAssetSet[] }).releases.find((entry) => entry.versionId === "release7");
    return withRelease7AlertButtonBitmaps(releaseSet, release7Set, { versionId, release: projectorRaysReleaseNames.release1 ?? "release1_roseau_dcr0910" });
  }
  return releaseSet;
}

export function getInternalBitmapAssetSet(versionId: HabboVersionId): HabboInternalBitmapAssetSet | undefined {
  return (internalBitmapAssets as { releases: HabboInternalBitmapAssetSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getExternalBitmapAssetSet(versionId: HabboVersionId): HabboExternalBitmapAssetSet | undefined {
  return (externalBitmapAssets as { releases: HabboExternalBitmapAssetSet[] }).releases.find((entry) => entry.versionId === versionId);
}

export function getFigurePartIndexSet(versionId: HabboVersionId): HabboFigurePartIndexSet | undefined {
  return (figurePartIndex as { releases: HabboFigurePartIndexSet[] }).releases.find((entry) => entry.versionId === versionId);
}

function getProjectorRaysTextFieldSetByRelease(release: string): HabboTextFieldSet | undefined {
  return (projectorRaysTextFields as { releases: HabboTextFieldSet[] }).releases.find((entry) => entry.release === release);
}
