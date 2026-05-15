import { LingoList } from "./LingoList";
import { LingoSymbol } from "./LingoSymbol";

export type LingoPropertyKey = string | number | LingoSymbol;

interface LingoPropertyEntry<T> {
  key: LingoPropertyKey;
  normalizedKey: string;
  value: T;
}

export class LingoPropertyList<T = unknown> extends LingoList<T> {
  private readonly entries: LingoPropertyEntry<T>[];

  constructor(entries: Array<[LingoPropertyKey, T]> = []) {
    super(entries.map((entry) => entry[1]));
    this.entries = entries.map(([key, value]) => ({
      key,
      normalizedKey: LingoPropertyList.normalizeKey(key),
      value
    }));
  }

  override get count(): number {
    return this.entries.length;
  }

  override getAt(index: number): T {
    this.assertEntryIndex(index);
    return this.entries[index - 1]?.value as T;
  }

  override setAt(index: number, value: T): void {
    this.assertEntryIndex(index);
    const entry = this.entries[index - 1];
    if (!entry) {
      throw new Error(`Lingo property list index out of range: ${index}`);
    }

    entry.value = value;
  }

  override add(value: T): void {
    this.addProp(this.entries.length + 1, value);
  }

  addProp(key: LingoPropertyKey, value: T): void {
    const normalizedKey = LingoPropertyList.normalizeKey(key);
    const existing = this.entries.find((entry) => entry.normalizedKey === normalizedKey);
    if (existing) {
      existing.value = value;
      return;
    }

    this.entries.push({ key, normalizedKey, value });
  }

  getProp(key: LingoPropertyKey): T | undefined {
    return this.entries.find((entry) => entry.normalizedKey === LingoPropertyList.normalizeKey(key))?.value;
  }

  getPropAt(index: number): LingoPropertyKey {
    this.assertEntryIndex(index);
    return this.entries[index - 1]?.key as LingoPropertyKey;
  }

  hasProp(key: LingoPropertyKey): boolean {
    return this.entries.some((entry) => entry.normalizedKey === LingoPropertyList.normalizeKey(key));
  }

  deleteProp(key: LingoPropertyKey): T | undefined {
    const normalizedKey = LingoPropertyList.normalizeKey(key);
    const index = this.entries.findIndex((entry) => entry.normalizedKey === normalizedKey);
    if (index === -1) {
      return undefined;
    }

    const [deleted] = this.entries.splice(index, 1);
    return deleted?.value;
  }

  override deleteAt(index: number): T {
    this.assertEntryIndex(index);
    const [deleted] = this.entries.splice(index - 1, 1);
    return deleted?.value as T;
  }

  override toArray(): T[] {
    return this.entries.map((entry) => entry.value);
  }

  entriesArray(): Array<[LingoPropertyKey, T]> {
    return this.entries.map((entry) => [entry.key, entry.value]);
  }

  override [Symbol.iterator](): Iterator<T> {
    return this.toArray()[Symbol.iterator]();
  }

  private assertEntryIndex(index: number): void {
    if (!Number.isInteger(index) || index < 1 || index > this.entries.length) {
      throw new Error(`Lingo property list index out of range: ${index}`);
    }
  }

  private static normalizeKey(key: LingoPropertyKey): string {
    if (key instanceof LingoSymbol) {
      return key.name.toLowerCase();
    }

    if (typeof key === "number") {
      return String(key);
    }

    return key.replace(/^#/, "").toLowerCase();
  }
}
