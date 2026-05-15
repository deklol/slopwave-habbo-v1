import type { DirectorMovieManifest } from "../../runtime";
import type { HabboVersionId } from "../HabboVersionAdapter";

export interface AdapterProbeManifestOptions {
  readonly id: HabboVersionId;
  readonly label: string;
  readonly releaseBand: string;
  readonly accentColor: string;
  readonly protocolLabel: string;
}

export function createAdapterProbeManifest(options: AdapterProbeManifestOptions): DirectorMovieManifest {
  return {
    id: `habbo-${options.id}-adapter-probe`,
    name: `${options.label} Adapter Probe`,
    stage: {
      width: 320,
      height: 200,
      backgroundColor: "#12181f"
    },
    casts: [
      {
        number: 1,
        name: "Adapter Probe Cast",
        members: [
          {
            number: 1,
            name: "probe_background",
            type: "bitmap",
            width: 320,
            height: 200,
            color: "#1a2733",
            regPoint: { x: 0, y: 0 }
          },
          {
            number: 2,
            name: "release_band",
            type: "text",
            text: options.releaseBand,
            fontSize: 13,
            color: "#e8eef2",
            regPoint: { x: 0, y: 0 }
          },
          {
            number: 3,
            name: "adapter_label",
            type: "text",
            text: options.label,
            fontSize: 15,
            color: "#ffffff",
            regPoint: { x: 0, y: 0 }
          },
          {
            number: 4,
            name: "protocol_label",
            type: "text",
            text: options.protocolLabel,
            fontSize: 11,
            color: "#b8c6cf",
            regPoint: { x: 0, y: 0 }
          },
          {
            number: 5,
            name: "probe_accent",
            type: "bitmap",
            width: 196,
            height: 10,
            color: options.accentColor,
            regPoint: { x: 0, y: 0 }
          }
        ]
      }
    ],
    score: {
      frameRate: 15,
      markers: [{ name: "start", frame: 1 }],
      frames: [
        {
          index: 1,
          sprites: [
            {
              channel: 1,
              member: { castLib: 1, member: 1 },
              loc: { x: 0, y: 0 },
              width: 320,
              height: 200,
              visible: true,
              ink: 0,
              blend: 100
            },
            {
              channel: 2,
              member: { castLib: 1, member: 2 },
              loc: { x: 24, y: 24 },
              visible: true,
              ink: 0,
              blend: 100
            },
            {
              channel: 3,
              member: { castLib: 1, member: 3 },
              loc: { x: 24, y: 48 },
              visible: true,
              ink: 0,
              blend: 100
            },
            {
              channel: 4,
              member: { castLib: 1, member: 4 },
              loc: { x: 24, y: 76 },
              visible: true,
              ink: 0,
              blend: 100
            },
            {
              channel: 5,
              member: { castLib: 1, member: 5 },
              loc: { x: 24, y: 108 },
              width: 196,
              height: 10,
              visible: true,
              ink: 0,
              blend: 100
            }
          ]
        }
      ]
    }
  };
}
