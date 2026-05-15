import type { HabboVersionId } from "./HabboVersionAdapter";

export type HabboRuntimeAvailabilityStatus =
  | "playable-reference"
  | "extracted-preview"
  | "adapter-only";

export interface HabboRuntimeAvailability {
  readonly versionId: HabboVersionId;
  readonly status: HabboRuntimeAvailabilityStatus;
  readonly label: string;
  readonly summary: string;
  readonly route?: string;
  readonly command?: string;
  readonly notes: readonly string[];
}

const adapterOnlyNotes = [
  "Version adapter metadata exists.",
  "No local playable route or validated server path exists yet."
] as const;

export const habboRuntimeAvailability: Readonly<Record<HabboVersionId, HabboRuntimeAvailability>> = {
  release1: {
    versionId: "release1",
    status: "extracted-preview",
    label: "Roseau login partial",
    summary: "release1 can load the extracted loader, log in through the local Roseau bridge, run the source welcome sequence, reach the hotel toolbar, and open the first source-recorded Navigator shell.",
    route: "/?version=release1&manifest=projectorrays",
    command: "node tools/dev/start-local-v1.mjs",
    notes: [
      "Compiled release1 Roseau DCR/CCT inputs are downloaded and extracted locally.",
      "The TypeScript runtime follows the source loader loadlist into habbo_entry.dcr, resolves XMED-backed login fields, and renders the extracted source login and welcome frames.",
      "The local Roseau text protocol bridge covers login, user object, wallet balance, buddy bootstrap, and public-unit bootstrap for the current proof route.",
      "Registration submit, private-room loading, public-room loading, catalogue, hand, and full Navigator parity remain partial."
    ]
  },
  release5: {
    versionId: "release5",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release5 is a likely early target, but it does not have a playable local route yet.",
    notes: adapterOnlyNotes
  },
  release6: {
    versionId: "release6",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release6 source/compiled coverage is incomplete and no playable local route exists yet.",
    notes: adapterOnlyNotes
  },
  release7: {
    versionId: "release7",
    status: "playable-reference",
    label: "Playable v7 reference",
    summary: "release7 can be played through the local Auratus/LibreShockwave reference route.",
    route: "/auratus-reference/",
    command: "npm run dev:v7",
    notes: [
      "Auratus is validated here only as a v7 server.",
      "The route uses repo-local v7 DCR/CCT assets and the modified LibreShockwave player.",
      "This is a reference/player path pending licence and performance decisions, not proof that other versions work."
    ]
  },
  release8: {
    versionId: "release8",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release8 source/compiled coverage is incomplete and no playable local route exists yet.",
    notes: adapterOnlyNotes
  },
  release9: {
    versionId: "release9",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release9 has protocol/server reference metadata, but no playable local route yet.",
    notes: adapterOnlyNotes
  },
  release10: {
    versionId: "release10",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release10 is a placeholder adapter target without a playable local route yet.",
    notes: adapterOnlyNotes
  },
  release11: {
    versionId: "release11",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release11 is a placeholder adapter target without a playable local route yet.",
    notes: adapterOnlyNotes
  },
  release12: {
    versionId: "release12",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release12 is a placeholder adapter target without a playable local route yet.",
    notes: adapterOnlyNotes
  },
  release13: {
    versionId: "release13",
    status: "adapter-only",
    label: "Adapter only",
    summary: "release13 source trees exist, but no playable local route or validated server path exists yet.",
    notes: adapterOnlyNotes
  },
  release14: {
    versionId: "release14",
    status: "extracted-preview",
    label: "Extracted preview",
    summary: "release14 has ProjectorRays extracted manifest data, but the browser route is not playable yet.",
    notes: [
      "Compiled release14.1_b8 DCR/CCT inputs are downloaded and extracted locally.",
      "The TypeScript path can inspect/render manifest metadata, but it does not execute the full Director client yet.",
      "No validated local v14 server/client bridge is wired into the browser runtime yet."
    ]
  }
};

export function getHabboRuntimeAvailability(versionId: HabboVersionId): HabboRuntimeAvailability {
  return habboRuntimeAvailability[versionId];
}
