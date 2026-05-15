import { LingoList, LingoPropertyList, LingoSymbol, parseLingoLiteral } from "../lingo";
import type { DirectorMemberType } from "../runtime";
import type { HabboWindowLayoutElement } from "./boot/HabboBootResourceTypes";
import type { HabboThreadModules } from "./boot/HabboBootManagers";

export const HABBO_DIRECTOR_FONT_FAMILY = "\"Volter Goldfish\"";

export interface LoadingBarProps {
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly bgColor: string;
}

export function normalizeSymbolish(value: unknown): string {
  if (value instanceof LingoSymbol) {
    return value.name;
  }

  const text = String(value ?? "");
  return text.startsWith("#") ? text.slice(1) : text;
}

export function coerceRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function sanitizeDirectorSingleLineInput(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

export function sanitizeRoomKioskRoomNameInput(value: string): string {
  return sanitizeDirectorSingleLineInput(replaceChars(value, "/", ""));
}

export function sanitizeRoomKioskPasswordInput(value: string, permittedCharacters: string): string {
  let sanitized = "";
  for (const char of sanitizeDirectorSingleLineInput(value)) {
    const code = char.charCodeAt(0);
    if (code <= 31 || code >= 128) {
      continue;
    }
    if (permittedCharacters.length === 0 || permittedCharacters.includes(char)) {
      sanitized += char;
    }
    if (sanitized.length >= 32) {
      break;
    }
  }
  return sanitized;
}

export function roomKioskPasswordFromTempValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join("");
  }

  return sanitizeDirectorSingleLineInput(String(value ?? ""));
}

export function replaceChars(value: string, from: string, to: string): string {
  if (from === to || from.length === 0) {
    return value;
  }

  return value.split(from).join(to);
}

export function replaceChunks(value: string, from: string, to: string): string {
  return replaceChars(value, from, to);
}

export function lingoPropertyEntries(value: unknown): Array<[unknown, unknown]> {
  if (value instanceof LingoPropertyList) {
    return value.entriesArray();
  }

  if (typeof value === "string" && value.trim().startsWith("[") && value.trim().endsWith("]")) {
    const parsed = parseLingoLiteral(value);
    return parsed instanceof LingoPropertyList ? parsed.entriesArray() : [];
  }

  return [];
}

export function lingoCharFromValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String.fromCharCode(Math.trunc(value));
  }

  const text = String(value ?? "");
  return /^-?\d+$/.test(text) ? String.fromCharCode(Number.parseInt(text, 10)) : text;
}

export function readStringList(value: unknown): readonly string[] {
  if (value instanceof LingoList) {
    return value.toArray().map((entry) => String(entry)).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\s+|,/).map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

export function truthySessionValue(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "0" && normalized !== "false";
  }
  return value !== undefined && value !== null;
}

export function parseLoadingBarProps(value: unknown): LoadingBarProps {
  const text = typeof value === "string" ? value : "";
  return {
    width: numberFromPropList(text, "width") ?? 128,
    height: numberFromPropList(text, "height") ?? 16,
    color: colorFromPropList(text, "color") ?? "#808080",
    bgColor: colorFromPropList(text, "bgColor") ?? "#000000"
  };
}

export function numberFromPropList(text: string, name: string): number | undefined {
  const match = new RegExp(`#${name}:\\s*(-?\\d+)`).exec(text);
  if (!match?.[1]) {
    return undefined;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function colorFromPropList(text: string, name: string): string | undefined {
  const match = new RegExp(`#${name}:\\s*rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)`, "i").exec(text);
  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }

  return rgbToHex(Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), Number.parseInt(match[3], 10));
}

export function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0")).join("")}`;
}

export function directorPaletteIndexColor(index: number): string {
  const palette = createSystemMacPalette();
  const color = palette[Math.max(0, Math.min(255, Math.trunc(index)))] ?? { red: 0, green: 0, blue: 0 };
  return rgbToHex(color.red, color.green, color.blue);
}

function createSystemMacPalette(): readonly { readonly red: number; readonly green: number; readonly blue: number }[] {
  const colors: { red: number; green: number; blue: number }[] = [];
  const cube = [255, 204, 153, 102, 51, 0];
  for (const red of cube) {
    for (const green of cube) {
      for (const blue of cube) {
        if (red === 0 && green === 0 && blue === 0) {
          continue;
        }
        colors.push({ red, green, blue });
      }
    }
  }

  const ramps = [238, 221, 187, 170, 136, 119, 85, 68, 34, 17];
  for (const red of ramps) {
    colors.push({ red, green: 0, blue: 0 });
  }
  for (const green of ramps) {
    colors.push({ red: 0, green, blue: 0 });
  }
  for (const blue of ramps) {
    colors.push({ red: 0, green: 0, blue });
  }
  for (const value of ramps) {
    colors.push({ red: value, green: value, blue: value });
  }
  colors.push({ red: 0, green: 0, blue: 0 });
  return colors;
}

export function numberFromUnknown(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function directorNumberFromUnknown(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function directorFrameDurationMs(tempo: number): number {
  return 1000 / Math.max(1, Number.isFinite(tempo) ? Math.trunc(tempo) : 24);
}

export function directorLine(text: string, oneBasedIndex: number): string | undefined {
  if (!Number.isFinite(oneBasedIndex) || oneBasedIndex <= 0) {
    return undefined;
  }

  const line = text.split(/\r?\n|\r/)[Math.trunc(oneBasedIndex) - 1]?.trim();
  return line && line.length > 0 ? line : undefined;
}

export function stringProperty(properties: Readonly<Record<string, string | number>>, name: string): string | undefined {
  const value = properties[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function stringListProperty(properties: Readonly<Record<string, string | number>>, name: string): string[] {
  const value = stringProperty(properties, name);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
    }
  } catch {
    // Director window props sometimes arrive as a stringified list, and sometimes as plain text.
  }

  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter((entry) => entry.length > 0);
}

export function numberProperty(properties: Readonly<Record<string, string | number>>, name: string): number | undefined {
  const value = properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function booleanProperty(properties: Readonly<Record<string, string | number>>, name: string): boolean {
  const value = properties[name];
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }

  return false;
}

export function textAlignProperty(properties: Readonly<Record<string, string | number>>): "left" | "center" | "right" {
  return textAlignFromString(stringProperty(properties, "alignment"));
}

export function textAlignFromString(value: string | undefined): "left" | "center" | "right" {
  const normalized = value?.toLowerCase();
  if (normalized === "center" || normalized === "right") {
    return normalized;
  }

  return "left";
}

export function labelForElement(texts: ReadonlyMap<string, string>, element: HabboWindowLayoutElement): string {
  return texts.get(element.key ?? "") ?? element.key ?? "";
}

export function capitalizeMenuLabel(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function directorFontFamily(font: string | undefined): string {
  const normalized = font?.toLowerCase().replaceAll("\"", "").trim();
  switch (normalized) {
    case "v":
    case "vb":
    case "volter":
    case "volter goldfish":
    case "volter (goldfish)":
    case "volter(goldfish)":
      return HABBO_DIRECTOR_FONT_FAMILY;
    default:
      return HABBO_DIRECTOR_FONT_FAMILY;
  }
}

export function estimateVolterTextWidth(text: string): number {
  return Math.max(1, text.length * 6);
}

export function directorFontWeight(font: string | undefined, fontStyle: string | undefined): string {
  const normalizedFont = font?.toLowerCase();
  const normalizedStyle = fontStyle?.toLowerCase() ?? "";
  if (normalizedFont === "vb" || normalizedStyle.includes("bold")) {
    return "700";
  }

  return "400";
}

export function directorFontStyle(fontStyle: string | undefined): string {
  return fontStyle?.toLowerCase().includes("italic") ? "italic" : "normal";
}

export function directorFontUnderline(fontStyle: string | undefined): boolean {
  return fontStyle?.toLowerCase().includes("underline") ?? false;
}

export function countWindowElements(text: string): number {
  return text.match(/\[#member:/g)?.length ?? 0;
}

export function parseWindowRect(text: string): readonly number[] | undefined {
  const match = text.match(/<rect>[\s\S]*?\[([^\]]+)\]/);
  if (!match?.[1]) {
    return undefined;
  }

  const values = match[1]
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry));

  return values.length === 4 ? values : undefined;
}

export function normalizeSymbolKey(value: LingoSymbol | string): string {
  return (value instanceof LingoSymbol ? value.name : value.replace(/^#/, "")).toLowerCase();
}

export function readLingoPacketWord(value: string | undefined, wordIndex: number): string | undefined {
  if (!value || wordIndex < 1) {
    return undefined;
  }

  return value
    .split(/[\s\u0000-\u001f]+/)
    .filter((word) => word.length > 0)[wordIndex - 1];
}

export function normalizeCastName(value: string): string {
  return value.replace(/\.[^.]+$/, "").toLowerCase();
}

export function normalizePaletteName(value: string): string {
  return value.toLowerCase().replace(/[_\s.-]+/g, " ").trim();
}

export function normalizeMemberName(value: string): string {
  return value.trim().toLowerCase();
}

export function stripMemberAliasSuffix(value: string): string {
  return value.trim().replace(/\*$/, "");
}

export function normalizeRoomObjectClassName(value: string): string {
  return value.replace(/\*.*$/, "").trim().toLowerCase();
}

export function roommaticUseTile(x: number, y: number, direction: number): { readonly x: number; readonly y: number } | undefined {
  switch (direction) {
    case 0:
      return { x, y: y - 1 };
    case 2:
      return { x: x + 1, y };
    case 4:
      return { x, y: y + 1 };
    case 6:
      return { x: x - 1, y };
    default:
      return undefined;
  }
}

export function makeThreadModuleObjectId(threadId: LingoSymbol, moduleName: "interface" | "component" | "handler"): string {
  return `#${threadId.name}_${moduleName}`;
}

export function threadModulesFromProperties(properties: Readonly<Record<string, string>>): HabboThreadModules {
  const modules: Partial<Record<keyof HabboThreadModules, readonly string[]>> = {};

  for (const moduleName of ["interface", "component", "handler"] as const) {
    const value = properties[`${moduleName}.class`];
    if (value) {
      modules[moduleName] = classNamesFromValue(value);
    }
  }

  return modules;
}

export function toDirectorMemberType(type: string): DirectorMemberType {
  switch (type) {
    case "bitmap":
    case "text":
    case "field":
    case "sound":
    case "script":
    case "palette":
    case "shape":
    case "unknown":
      return type;
    default:
      return "unknown";
  }
}

export function resolveKnownBitmapFallbackColor(memberName: string | undefined): string | undefined {
  if (memberName?.toLowerCase() === "entry_pixel") {
    return "#000000";
  }

  return undefined;
}

export function coerceVariableFieldValue(rawValue: string): unknown {
  const value = rawValue.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return parseLingoLiteral(value);
  }

  if (!value.includes(" ")) {
    if (value.startsWith("#")) {
      return new LingoSymbol(value);
    }

    if (/^-?\d+$/.test(value)) {
      return Number.parseInt(value, 10);
    }
  }

  if (!value.includes(" ") && /^-?\d+\.\d+$/.test(value)) {
    return Number.parseFloat(value);
  }

  return value;
}

export function normalizeTextFieldValue(rawValue: string): string {
  return rawValue
    .replaceAll("\\r", "\r")
    .replaceAll("\\t", "\t")
    .replaceAll("\\s", " ")
    .replaceAll("<BR>", "\r");
}

export function classNamesFromValue(value: unknown): readonly string[] {
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
