import type { DirectorMemberManifest } from "../../runtime";
import type {
  HabboButtonElementTextSpec,
  HabboExternalCastVisualLayout,
  HabboWindowLayoutElement
} from "../boot/HabboBootResourceTypes";
import {
  directorFontFamily,
  directorFontStyle,
  directorFontUnderline,
  directorFontWeight
} from "../HabboSourceValueHelpers";
import type { HabboWindowRecord } from "./HabboWindowTypes";
import { isEditableWindowField } from "./HabboWindowLayoutHelpers";

export function createRuntimeWindowFieldMember(
  number: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  geometry: { readonly width: number; readonly height: number },
  localizedText: string | undefined,
  editableText: string | undefined,
  textScrollY = 0,
  editableOverride?: boolean
): DirectorMemberManifest {
  const properties = element.properties;
  const baseEditable = isEditableWindowField(element);
  const editable = editableOverride ?? baseEditable;
  const key = element.key ?? "";
  const text = baseEditable ? editableText ?? "" : localizedText ?? key;
  const backgroundColor = stringProperty(properties, "txtBgColor") ?? stringProperty(properties, "bgColor");
  const lineHeight = resolveRuntimeWindowTextLineHeight(element);

  return {
    number,
    name: `runtime.${window.id.name}.${element.id ?? element.memberName ?? number}`,
    type: baseEditable ? "field" : "text",
    width: geometry.width,
    height: geometry.height,
    text,
    color: stringProperty(properties, "txtColor") ?? stringProperty(properties, "color") ?? "#000000",
    ...(backgroundColor !== undefined ? { backgroundColor } : {}),
    fontSize: numberProperty(properties, "fontSize") ?? 12,
    fontFamily: directorFontFamily(stringProperty(properties, "font")),
    fontWeight: directorFontWeight(stringProperty(properties, "font"), stringProperty(properties, "fontStyle")),
    fontStyle: directorFontStyle(stringProperty(properties, "fontStyle")),
    underline: directorFontUnderline(stringProperty(properties, "fontStyle")),
    textAlign: textAlignProperty(properties),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    wordWrap: booleanProperty(properties, "wordWrap"),
    textScrollY,
    editable
  };
}

export function resolveRuntimeWindowTextLineHeight(element: HabboWindowLayoutElement): number | undefined {
  const properties = element.properties;
  const lineHeight = numberProperty(properties, "lineHeight");
  if (lineHeight !== undefined && lineHeight > 0) {
    return lineHeight;
  }

  const fixedLineSpace = numberProperty(properties, "fixedLineSpace");
  if (fixedLineSpace !== undefined && fixedLineSpace > 0) {
    return fixedLineSpace;
  }

  const fontSize = numberProperty(properties, "fontSize") ?? 12;
  if (directorFontFamily(stringProperty(properties, "font")).includes("Volter Goldfish")) {
    return Math.max(1, Math.round(fontSize + 1));
  }

  return undefined;
}

export function createRuntimeButtonShapeMember(
  number: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  width: number,
  height: number
): DirectorMemberManifest {
  return {
    number,
    name: `runtime.${window.id.name}.${element.id ?? number}.button.shape`,
    type: "shape",
    width,
    height,
    backgroundColor: "#eeeeee",
    borderColor: "#000000",
    borderWidth: 1,
    borderRadius: 4
  };
}

export function createRuntimeEntryVisualShapeMember(
  number: number,
  visual: HabboExternalCastVisualLayout,
  element: HabboWindowLayoutElement
): DirectorMemberManifest {
  const width = Math.max(1, Math.round(element.width ?? 1));
  const height = Math.max(1, Math.round(element.height ?? 1));
  const fill = stringProperty(element.properties, "color") ?? stringProperty(element.properties, "bgColor") ?? "#000000";
  return {
    number,
    name: `runtime.${visual.visualName}.${element.id ?? element.memberName ?? element.index}.shape.${element.index}`,
    type: "shape",
    width,
    height,
    backgroundColor: fill
  };
}

export function createRuntimeButtonTextMember(
  number: number,
  window: HabboWindowRecord,
  element: HabboWindowLayoutElement,
  label: string,
  width: number,
  textSpec?: HabboButtonElementTextSpec
): DirectorMemberManifest {
  const font = textSpec?.font ?? "VB";
  const fontStyle = textSpec?.fontStyle ?? "plain";
  return {
    number,
    name: `runtime.${window.id.name}.${element.id ?? number}.button.text`,
    type: "text",
    width,
    height: 11,
    text: label,
    color: textSpec?.color ?? "#000000",
    fontSize: textSpec?.fontSize ?? 9,
    fontFamily: directorFontFamily(font),
    fontWeight: directorFontWeight(font, fontStyle),
    fontStyle: directorFontStyle(fontStyle),
    textAlign: textSpec?.alignment ? textAlignFromString(textSpec.alignment) : textAlignProperty(element.properties),
    lineHeight: 11,
    wordWrap: false
  };
}

export function createRuntimeNavigatorTextMember(
  number: number,
  window: HabboWindowRecord,
  elementId: string,
  geometry: { readonly width: number; readonly height: number },
  text: string,
  wordWrap: boolean,
  options: { readonly backgroundColor?: string; readonly lineHeight?: number } = {}
): DirectorMemberManifest {
  return {
    number,
    name: `runtime.${window.id.name}.${elementId}.feedImage`,
    type: "text",
    width: geometry.width,
    height: geometry.height,
    text,
    color: "#000000",
    ...(options.backgroundColor !== undefined ? { backgroundColor: options.backgroundColor } : {}),
    fontSize: 9,
    fontFamily: directorFontFamily("Volter (Goldfish)"),
    fontWeight: "400",
    lineHeight: options.lineHeight ?? 10,
    wordWrap,
    textAlign: "left"
  };
}

function stringProperty(properties: Readonly<Record<string, string | number>>, name: string): string | undefined {
  const value = properties[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberProperty(properties: Readonly<Record<string, string | number>>, name: string): number | undefined {
  const value = properties[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanProperty(properties: Readonly<Record<string, string | number>>, name: string): boolean {
  const value = properties[name];
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value !== "" && value !== "0";
  }

  return false;
}

function textAlignProperty(properties: Readonly<Record<string, string | number>>): "left" | "center" | "right" {
  return textAlignFromString(stringProperty(properties, "alignment"));
}

function textAlignFromString(value: string | undefined): "left" | "center" | "right" {
  const normalized = value?.toLowerCase();
  if (normalized === "center" || normalized === "right") {
    return normalized;
  }

  return "left";
}
