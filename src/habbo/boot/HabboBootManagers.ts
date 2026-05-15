import { LingoSymbol } from "../../lingo";
import type { DirectorMemberRef, DirectorMovie } from "../../runtime";

export interface HabboManagerRecord {
  readonly id: LingoSymbol;
  readonly className: string;
  readonly classNames: readonly string[];
}

export interface HabboThreadRecord {
  readonly id: LingoSymbol;
  readonly initField: LingoSymbol;
  readonly sourceCastName?: string;
  readonly castLib?: number;
  readonly modules?: HabboThreadModules;
}

export interface HabboThreadModules {
  readonly interface?: readonly string[];
  readonly component?: readonly string[];
  readonly handler?: readonly string[];
}

export class HabboVariableObject {
  private readonly values = new Map<string, unknown>();

  constructor(
    readonly id: LingoSymbol,
    readonly className: string
  ) {}

  set(key: string, value: unknown): void {
    this.values.set(key, value);
  }

  get(key: string): unknown {
    return this.values.get(key);
  }

  exists(key: string): boolean {
    return this.values.has(key);
  }

  entries(): readonly (readonly [string, unknown])[] {
    return [...this.values.entries()];
  }
}

export class HabboObjectManager {
  private readonly managers = new Map<string, HabboManagerRecord>();
  private readonly objects = new Map<string, HabboVariableObject>();

  managerExists(id: LingoSymbol | string): boolean {
    return this.managers.has(normalizeSymbolKey(id));
  }

  registerManager(id: LingoSymbol | string, className: string | readonly string[]): HabboManagerRecord {
    const symbol = id instanceof LingoSymbol ? id : new LingoSymbol(id);
    const classNames = Array.isArray(className) ? className : [className];
    const record: HabboManagerRecord = {
      id: symbol,
      className: classNames[classNames.length - 1] ?? "",
      classNames
    };
    this.managers.set(normalizeSymbolKey(symbol), record);
    return record;
  }

  removeManager(id: LingoSymbol | string): boolean {
    return this.managers.delete(normalizeSymbolKey(id));
  }

  getManager(id: LingoSymbol | string): HabboManagerRecord | undefined {
    return this.managers.get(normalizeSymbolKey(id));
  }

  listManagers(): readonly HabboManagerRecord[] {
    return [...this.managers.values()];
  }

  createObject(id: LingoSymbol | string, className: string): HabboVariableObject {
    const symbol = id instanceof LingoSymbol ? id : new LingoSymbol(id);
    const object = new HabboVariableObject(symbol, className);
    this.objects.set(normalizeSymbolKey(symbol), object);
    return object;
  }

  getObject(id: LingoSymbol | string): HabboVariableObject | undefined {
    return this.objects.get(normalizeSymbolKey(id));
  }

  objectExists(id: LingoSymbol | string): boolean {
    return this.objects.has(normalizeSymbolKey(id));
  }

  removeObject(id: LingoSymbol | string): boolean {
    return this.objects.delete(normalizeSymbolKey(id));
  }

  listObjects(): readonly HabboVariableObject[] {
    return [...this.objects.values()];
  }

  deconstruct(): void {
    this.managers.clear();
    this.objects.clear();
  }
}

export class HabboResourceManager {
  private readonly membersByName = new Map<string, DirectorMemberRef>();

  constructor(private readonly movie: DirectorMovie) {}

  preIndexMembers(): boolean {
    this.membersByName.clear();
    for (const cast of this.movie.cast.castLibs) {
      for (const member of cast.members) {
        if (member.name) {
          this.membersByName.set(member.name.toLowerCase(), member.ref());
        }
      }
    }

    return true;
  }

  getMemberRef(name: string): DirectorMemberRef | undefined {
    return this.membersByName.get(name.toLowerCase());
  }

  get indexedMemberCount(): number {
    return this.membersByName.size;
  }
}

export class HabboThreadManager {
  private readonly threads = new Map<string, HabboThreadRecord>();

  create(id: LingoSymbol | string, initField: LingoSymbol | string, metadata: Omit<HabboThreadRecord, "id" | "initField"> = {}): boolean {
    const threadId = id instanceof LingoSymbol ? id : new LingoSymbol(id);
    const threadKey = normalizeSymbolKey(threadId);
    if (this.threads.has(threadKey)) {
      return false;
    }

    const init = initField instanceof LingoSymbol ? initField : new LingoSymbol(initField);
    this.threads.set(threadKey, {
      id: threadId,
      initField: init,
      ...metadata
    });
    return true;
  }

  exists(id: LingoSymbol | string): boolean {
    return this.threads.has(normalizeSymbolKey(id));
  }

  get(id: LingoSymbol | string): HabboThreadRecord | undefined {
    return this.threads.get(normalizeSymbolKey(id));
  }

  remove(id: LingoSymbol | string): boolean {
    return this.threads.delete(normalizeSymbolKey(id));
  }

  initAll(): number {
    return this.threads.size;
  }

  listThreads(): readonly HabboThreadRecord[] {
    return [...this.threads.values()];
  }
}

function normalizeSymbolKey(value: LingoSymbol | string): string {
  return (value instanceof LingoSymbol ? value.name : value.replace(/^#/, "")).toLowerCase();
}
