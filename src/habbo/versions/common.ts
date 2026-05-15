import type { HabboLoaderDescriptor, HabboProtocolDescriptor } from "../HabboVersionAdapter";

export const sharedUnsupported = [
  "original DCR/CCT extraction not wired yet",
  "external cast loading not implemented",
  "Lingo startup handlers not executing yet",
  "general browser TCP/MUS bridge coverage is version-specific and partial"
] as const;

export function earlyLoader(entryMovie: string): HabboLoaderDescriptor {
  return {
    entryMovie,
    loaderParameters: ["client.host", "client.port", "client.path"],
    externalVariables: ["connection.info.host", "connection.info.port"],
    castPathStrategy: "release-specific external casts from original loader variables",
    startupFlow: "load entry movie, resolve external casts, dispatch prepareMovie/startMovie handlers"
  };
}

export function v14Loader(entryMovie: string): HabboLoaderDescriptor {
  return {
    entryMovie,
    loaderParameters: ["connection.info.host", "connection.info.port", "connection.mus.host", "connection.mus.port"],
    externalVariables: ["sso.ticket", "client.reload.url", "external.variables.txt", "external.texts.txt"],
    castPathStrategy: "Kepler-www style dcr/gamedata paths, then extracted manifest paths",
    startupFlow: "load loader movie, fetch external variables/texts, connect main socket, optionally connect MUS for camera"
  };
}

export function textProtocol(
  primaryReference: string,
  loginCommands: readonly string[],
  bridge?: HabboProtocolDescriptor["bridge"]
): HabboProtocolDescriptor {
  return {
    kind: "v1-text-length",
    primaryReference,
    loginMode: "username-password",
    loginCommands,
    framing: "ASCII decimal length prefix followed by text command and arguments",
    browserTransport: "bridge-required",
    ...(bridge !== undefined ? { bridge } : {})
  };
}

export function base64Vl64Protocol(
  primaryReference: string,
  loginMode: "username-password" | "mixed",
  loginCommands: readonly string[],
  musRequired: boolean,
  commandIds: Readonly<Record<string, number>> = {},
  bridge?: HabboProtocolDescriptor["bridge"]
): HabboProtocolDescriptor {
  return {
    kind: musRequired ? "base64-vl64-mus" : "base64-vl64",
    primaryReference,
    loginMode,
    loginCommands,
    commandIds,
    framing: "3-byte Base64 packet length, 2-byte Base64 header, VL64 ints, Base64-length strings, byte 1 terminator",
    browserTransport: "bridge-required",
    ...(bridge !== undefined ? { bridge } : {}),
    mus: {
      required: musRequired,
      purpose: musRequired ? "camera/photo and legacy Multiuser paths" : "release-dependent camera or binary side channel",
      framing: "Director Multiuser/Xtra-compatible MUS messages over a separate socket"
    }
  };
}
