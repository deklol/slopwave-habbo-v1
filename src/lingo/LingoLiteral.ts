import { LingoList } from "./LingoList";
import { LingoPropertyList } from "./LingoPropertyList";
import { LingoSymbol } from "./LingoSymbol";

export type LingoLiteralValue =
  | string
  | number
  | LingoSymbol
  | LingoList<LingoLiteralValue>
  | LingoPropertyList<LingoLiteralValue>;

export function parseLingoLiteral(source: string): LingoLiteralValue {
  const trimmed = source.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return parseLingoListLiteral(trimmed);
  }

  if (trimmed.startsWith("#") && /^#[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return new LingoSymbol(trimmed);
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return Number.parseFloat(trimmed);
  }

  return unquote(trimmed);
}

function parseLingoListLiteral(source: string): LingoList<LingoLiteralValue> {
  const inner = source.slice(1, -1).trim();
  if (!inner) {
    return new LingoList();
  }

  const parts = splitTopLevelComma(inner);
  const propertyEntries = parts
    .map((item) => {
      const colon = findTopLevelColon(item);
      if (colon === -1) {
        return undefined;
      }

      return [
        parseLingoPropertyKey(item.slice(0, colon).trim()),
        parseLingoLiteral(item.slice(colon + 1).trim())
      ] as const;
    });

  if (propertyEntries.every((entry) => entry !== undefined)) {
    return new LingoPropertyList(propertyEntries as Array<[string | number | LingoSymbol, LingoLiteralValue]>);
  }

  const values = parts.map((item) => parseLingoLiteral(item));
  return new LingoList(values);
}

function findTopLevelColon(source: string): number {
  let depth = 0;
  let quote: '"' | undefined;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote && source[index - 1] !== "\\") {
        quote = undefined;
      }
      continue;
    }

    if (char === '"') {
      quote = char;
      continue;
    }

    if (char === "[" || char === "(") {
      depth++;
      continue;
    }

    if (char === "]" || char === ")") {
      depth--;
      continue;
    }

    if (char === ":" && depth === 0) {
      return index;
    }
  }

  return -1;
}

function parseLingoPropertyKey(source: string): string | number | LingoSymbol {
  const trimmed = source.trim();
  if (trimmed.startsWith("#") && /^#[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return new LingoSymbol(trimmed);
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return unquote(trimmed);
}

function splitTopLevelComma(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | undefined;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote && source[index - 1] !== "\\") {
        quote = undefined;
      }
      continue;
    }

    if (char === '"') {
      quote = char;
      continue;
    }

    if (char === "[" || char === "(") {
      depth++;
      continue;
    }

    if (char === "]" || char === ")") {
      depth--;
      continue;
    }

    if (char === "," && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(source.slice(start).trim());
  return parts.filter((part) => part.length > 0);
}

function unquote(source: string): string {
  if (source.length >= 2 && source.startsWith('"') && source.endsWith('"')) {
    return source.slice(1, -1).replace(/\\"/g, '"');
  }

  return source;
}
