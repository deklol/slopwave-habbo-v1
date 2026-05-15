import { DirectorMember, type DirectorMemberManifest, type DirectorMemberRef } from "./DirectorMember";

export interface DirectorCastLibManifest {
  number: number;
  name?: string;
  fileName?: string;
  preloadMode?: number;
  members: DirectorMemberManifest[];
}

export class DirectorCastLib {
  readonly number: number;
  readonly name: string | undefined;
  readonly fileName: string | undefined;
  preloadMode: number | undefined;
  private readonly membersByNumber = new Map<number, DirectorMember>();
  private readonly membersByName = new Map<string, DirectorMember>();

  constructor(manifest: DirectorCastLibManifest) {
    if (!Number.isInteger(manifest.number) || manifest.number <= 0) {
      throw new Error(`Invalid cast library number: ${manifest.number}`);
    }

    this.number = manifest.number;
    this.name = manifest.name;
    this.fileName = manifest.fileName;
    this.preloadMode = manifest.preloadMode;

    for (const memberManifest of manifest.members) {
      const member = new DirectorMember(this.number, memberManifest);
      if (this.membersByNumber.has(member.memberNumber)) {
        throw new Error(`Duplicate member ${member.memberNumber} in cast ${this.number}`);
      }

      this.membersByNumber.set(member.memberNumber, member);
      if (member.name) {
        this.membersByName.set(member.name.toLowerCase(), member);
      }
    }
  }

  get members(): readonly DirectorMember[] {
    return [...this.membersByNumber.values()];
  }

  getMember(memberNumber: number): DirectorMember | undefined {
    return this.membersByNumber.get(memberNumber);
  }

  getMemberByName(name: string): DirectorMember | undefined {
    return this.membersByName.get(name.toLowerCase());
  }
}

export class DirectorCast {
  private readonly libs = new Map<number, DirectorCastLib>();

  constructor(manifests: DirectorCastLibManifest[]) {
    for (const manifest of manifests) {
      const lib = new DirectorCastLib(manifest);
      if (this.libs.has(lib.number)) {
        throw new Error(`Duplicate cast library ${lib.number}`);
      }

      this.libs.set(lib.number, lib);
    }
  }

  get castLibs(): readonly DirectorCastLib[] {
    return [...this.libs.values()].sort((left, right) => left.number - right.number);
  }

  getCastLib(castLib: number): DirectorCastLib | undefined {
    return this.libs.get(castLib);
  }

  importCastLib(manifest: DirectorCastLibManifest): DirectorCastLib {
    if (!this.libs.has(manifest.number)) {
      throw new Error(`Cannot import cast library into missing slot ${manifest.number}`);
    }

    const lib = new DirectorCastLib(manifest);
    this.libs.set(lib.number, lib);
    return lib;
  }

  importOrCreateCastLib(manifest: DirectorCastLibManifest): DirectorCastLib {
    const lib = new DirectorCastLib(manifest);
    this.libs.set(lib.number, lib);
    return lib;
  }

  getMember(ref: DirectorMemberRef): DirectorMember | undefined {
    return this.libs.get(ref.castLib)?.getMember(ref.member);
  }

  getMemberByName(name: string, castLib?: number): DirectorMember | undefined {
    if (castLib !== undefined) {
      return this.libs.get(castLib)?.getMemberByName(name);
    }

    for (const lib of this.castLibs) {
      const member = lib.getMemberByName(name);
      if (member) {
        return member;
      }
    }

    return undefined;
  }
}
