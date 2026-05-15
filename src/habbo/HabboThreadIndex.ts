import { LingoList, parseLingoLiteral } from "../lingo";

export interface HabboThreadModules {
  readonly interface?: readonly string[];
  readonly component?: readonly string[];
  readonly handler?: readonly string[];
}

export interface HabboThreadIndexDefinition {
  readonly threadId: string;
  readonly modules: HabboThreadModules;
  readonly multipleDefinition: boolean;
}

export function resolveThreadIndexDefinitions(properties: Readonly<Record<string, string>>): readonly HabboThreadIndexDefinition[] {
  const rawThreadId = properties["thread.id"];
  if (!rawThreadId) {
    return [];
  }

  const threadIds = lingoListValues(rawThreadId);
  const multipleDefinition = threadIds.length > 1;
  return threadIds.map((threadId) => ({
    threadId,
    modules: resolveThreadModules(properties, threadId, multipleDefinition),
    multipleDefinition
  }));
}

function resolveThreadModules(
  properties: Readonly<Record<string, string>>,
  threadId: string,
  multipleDefinition: boolean
): HabboThreadModules {
  const modules: Partial<Record<keyof HabboThreadModules, readonly string[]>> = {};
  const prefix = multipleDefinition ? `${threadId}.` : "";

  for (const moduleName of ["interface", "component", "handler"] as const) {
    const value = properties[`${prefix}${moduleName}.class`];
    if (value) {
      modules[moduleName] = classNamesFromValue(value);
    }
  }

  return modules;
}

function classNamesFromValue(value: unknown): readonly string[] {
  if (value instanceof LingoList) {
    return value.toArray().map((entry) => String(entry));
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  if (typeof value === "string") {
    const parsed = parseLingoLiteral(value);
    if (parsed instanceof LingoList) {
      return parsed.toArray().map((entry) => String(entry));
    }
    return [String(parsed)];
  }

  return [String(value)];
}

function lingoListValues(value: string): readonly string[] {
  const parsed = parseLingoLiteral(value);
  if (parsed instanceof LingoList) {
    return parsed.toArray().map((entry) => String(entry));
  }

  return [String(parsed)];
}
