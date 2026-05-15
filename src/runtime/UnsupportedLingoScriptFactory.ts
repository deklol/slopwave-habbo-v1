import { DirectorScriptInstance, type DirectorScriptType } from "./DirectorScriptInstance";
import type { DirectorEventContext } from "./DirectorEventRouter";

export interface IndexedLingoHandlerDeclaration {
  readonly name: string;
  readonly line: number;
  readonly parameters: readonly string[];
}

export interface IndexedLingoScript {
  readonly id: string;
  readonly release?: string;
  readonly castLib: number;
  readonly member: number;
  readonly castName?: string;
  readonly name?: string;
  readonly scriptType: DirectorScriptType;
  readonly assetPath?: string;
  readonly sourceStatus: string;
  readonly handlers: readonly IndexedLingoHandlerDeclaration[];
}

export interface IndexedLingoRelease {
  readonly release: string;
  readonly scripts: readonly IndexedLingoScript[];
}

export interface ProjectorRaysLingoHandlerIndex {
  readonly releases: readonly IndexedLingoRelease[];
}

export interface UnsupportedLingoScriptFactoryOptions {
  readonly release?: string;
}

export function createUnsupportedLingoScriptMap(
  scripts: readonly IndexedLingoScript[],
  options: UnsupportedLingoScriptFactoryOptions = {}
): Map<string, DirectorScriptInstance> {
  return new Map(scripts.map((script) => [script.id, createUnsupportedLingoScriptInstance(script, options)]));
}

export function createUnsupportedLingoScriptMapForRelease(
  index: ProjectorRaysLingoHandlerIndex,
  release: string
): Map<string, DirectorScriptInstance> {
  const indexedRelease = index.releases.find((candidate) => candidate.release === release);
  if (!indexedRelease) {
    throw new Error(`No indexed Lingo handlers for release ${release}`);
  }

  return createUnsupportedLingoScriptMap(indexedRelease.scripts, { release });
}

export function createUnsupportedLingoScriptInstance(
  script: IndexedLingoScript,
  options: UnsupportedLingoScriptFactoryOptions = {}
): DirectorScriptInstance {
  return new DirectorScriptInstance({
    id: script.id,
    name: script.name ?? `${script.castName ?? "cast"} ${script.id}`,
    type: script.scriptType,
    properties: {
      sourceStatus: script.sourceStatus,
      assetPath: script.assetPath,
      release: options.release ?? script.release
    },
    handlers: script.handlers.map((handler) => ({
      name: handler.name,
      handler: createUnsupportedHandler(script, handler, options)
    }))
  });
}

function createUnsupportedHandler(
  script: IndexedLingoScript,
  handler: IndexedLingoHandlerDeclaration,
  options: UnsupportedLingoScriptFactoryOptions
) {
  let reported = false;

  return (context: DirectorEventContext) => {
    if (!reported) {
      const release = options.release ?? script.release ?? "unknown release";
      const source = script.assetPath ?? `${script.castName ?? "cast"} ${script.id}`;
      context.movie.unsupported.add({
        subsystem: "lingo",
        feature: "lingo-handler-not-translated",
        detail: `${release} script ${script.id} (${script.name ?? "unnamed"}) handler ${handler.name} at ${source}:${handler.line}`,
        source
      });
      reported = true;
    }

    return undefined;
  };
}
