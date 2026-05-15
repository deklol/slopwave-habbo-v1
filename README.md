# Habbo V1 Browser Runtime

This repository is a standalone Habbo release1 browser runtime package. It contains the built browser client, the V1-relevant TypeScript runtime source, source-derived assets and JSON metadata, the Roseau V1 server, and the small bridge/launcher tools required to run it locally.

It is intentionally not the full multi-version development workspace. It excludes the internal docs, reference captures, extraction scratch files, Auratus workspace, Kepler workspace, and the v7/v14 adapter source that this V1 package does not need.

This is a small part of a bigger archiving/restoration project for pre-flash Habbo. I wanted to continue doing my part to preserve some of the golden days of the intenet.

## What It Is

This is a browser-native Director/Shockwave compatibility runtime for Habbo release1.

It is not the old Shockwave plugin running in a wrapper. It is not a hand-remade Habbo clone. It is also not a complete generic Shockwave emulator. The runtime supports the Director and Lingo behavior that this Habbo client needs, using extracted source data and assets from the original client.

In practice, the stack works like this:

- Original Director/Shockwave client material is extracted into browser-readable data: bitmap assets, cast/member manifests, score/frame data, text fields, window layouts, and Lingo source references.
- The browser runtime loads those source-derived manifests. Buttons, fields, avatars, catalogue images, room objects, and toolbar icons resolve back to original cast members, score sprites, behavior ids, or generated metadata.
- TypeScript implements the compatibility runtime layer. It models the Director pieces Habbo depends on: movie state, cast/member lookup, sprite channels, registration points, score frame flow, field text, window procedures, Director-style mouse/key events, and Lingo-compatible message dispatch.
- Lingo is handled through source-backed TypeScript compatibility handlers. The runtime does not execute every original bytecode instruction yet. Instead, implemented flows are traced from the original Lingo source and mapped to runtime APIs with the same data shape and event behavior.
- PixiJS renders the final Director sprite/channel output to canvas/WebGL. Pixi is only the renderer. It does not own Habbo state, room logic, packet flow, or UI rules.
- JSON under `app/dist/habbo-config` centralizes editable source-derived data for figure parts, animations, furni metadata, and catalogue pages. Those files make server customization easier without changing runtime code.
- Roseau provides the old Habbo release1 server protocol. A small WebSocket bridge connects the modern browser to Roseau's TCP-style protocol flow.

The practical model is:

```text
extracted Director data
-> source-derived manifests and JSON
-> TypeScript Director/Lingo compatibility runtime
-> PixiJS renderer
-> browser client
-> WebSocket bridge
-> Roseau V1 server
```

## Requirements

- Node.js 20 or newer.
- Java 17 or newer.
- MySQL or MariaDB.

## Credits

- Thanks to ProjectorRays for Director/Shockwave decompilation and extraction tooling used in the source-data workflow: https://github.com/ProjectorRays/ProjectorRays
- Thanks to Quackster for Roseau server: https://github.com/Quackster/Roseau (This package includes a slightly modified Roseau server path so the V1 browser runtime can connect through the WebSocket bridge and preserve the old release1 room/session flow.)
- Thanks to dirplayer for Shockwave runtime inspiration: https://github.com/igorlira/dirplayer-rs
- Thanks to LibreShockwave for Director/Shockwave parsing and runtime reference material: https://github.com/Quackster/LibreShockwave
- Thanks to Project Dragon for inspiration around modern source-derived metadata and content configuration: https://gitlab.com/asgardjoe/dragon

## License

The original Slopwave Habbo V1 browser runtime, packaging scripts, bridge code, and glue code in this repository are released under the MIT License. You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies, but the copyright notice and license text must stay with copies or substantial portions of the software.

Bundled third-party components and source-derived client assets keep their own licenses, notices, and rights. Roseau is credited above and includes its own AGPL license text under `server/Roseau-master/LICENCE.txt`.

## Repository Layout

```text
src/
  V1 browser runtime TypeScript source plus shared Director, Lingo, Pixi, room, window, protocol, and source-backed Habbo runtime modules needed by release1.

public/
  Editable public config and fonts copied into app/dist when rebuilding.

app/dist/
  Built browser runtime, generated assets, fonts, config, and index page.

app/dist/habbo-config/
  Editable V1 JSON for figure availability, animation metadata, furni metadata, and catalogue data.

payload/
  Compressed runtime payloads. The launcher and unpack tool extract these on demand so the repo stays small.

server/Roseau-master/
  Roseau release1 server files and SQL seed.

server/roseau-classes/
  Compatibility override classes compiled for this runtime package.

tools/roseau-ws-bridge.mjs
  WebSocket to Roseau TCP bridge used by the browser runtime.

start-v1.mjs
  Starts Roseau, the bridge, and a static HTTP server.

start-v1.ps1
  Windows convenience wrapper for the Node launcher.
```

## Build From Source

Install the JavaScript toolchain:

```powershell
npm install
```

Unpack the source-derived runtime JSON used by the TypeScript imports:

```powershell
npm run unpack
```

Type-check the V1 runtime source:

```powershell
npm run typecheck
```

Build the browser runtime from TypeScript:

```powershell
npm run build
```

The build writes to:

```text
app/dist/
```

The source-derived runtime JSON is stored compressed in `payload/source-runtime-data.tar.gz` and extracted into `generated/runtime-data/` when needed. Generated loose files are ignored by git.

## Setup

1. Install Node.js 20 or newer.
2. Install Java 17 or newer.
3. Install MySQL or MariaDB.
4. Create the Roseau database and import the seed:

```sql
CREATE DATABASE roseau;
```

Import:

```text
server/Roseau-master/tools/roseau.sql
```

5. Edit the database settings:

```text
server/Roseau-master/roseau.properties
```

Set these values for your machine:

```text
mysql.hostname=127.0.0.1
mysql.username=roseau
mysql.password=123
mysql.database=roseau
```

6. Start the runtime:

```powershell
node start-v1.mjs
```

7. Open:

```text
http://127.0.0.1:5173/
```

The portable index defaults to release1, the ProjectorRays manifest, and a game-only black page. You can still add query parameters manually for debugging if needed.

Default test login, when the Roseau database contains the seeded account:

```text
dek / 111111
```

## Ports

```text
5173   HTTP static browser runtime
12320  WebSocket bridge
37120  Roseau main TCP server
37119  Roseau private-room TCP server
```

These can be changed with environment variables:

```text
VITE_PORT
ROSEAU_WS_PORT
ROSEAU_TCP_PORT
```

## Customizing Content

Editable runtime content lives in:

```text
app/dist/habbo-config/
```

Important files include:

- figure availability JSON
- human animation metadata
- furni metadata
- catalogue data

The client still outputs native V1 figure strings and V1 room/catalogue packets. The JSON layer is there so content can be changed without editing TypeScript.

## Current Scope

Major v1 slices included in this build:

- release1 login and hotel view flow
- private-room entry and movement
- room chat
- hand inventory open/select/pagination
- immediate place, rotate, move, and pickup room object lifecycle
- v1 catalogue first playable JSON-backed path
- purse/help/messenger first playable runtime slices

This package is a playable compatibility build, not a final full Shockwave emulator.
