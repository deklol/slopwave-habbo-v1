export class LingoSymbol {
  readonly name: string;
  private readonly normalized: string;

  constructor(name: string) {
    if (!name) {
      throw new Error("Lingo symbol requires a name");
    }

    this.name = name.startsWith("#") ? name.slice(1) : name;
    this.normalized = this.name.toLowerCase();
  }

  equals(other: LingoSymbol | string): boolean {
    const otherName = other instanceof LingoSymbol ? other.name : other.replace(/^#/, "");
    return this.normalized === otherName.toLowerCase();
  }

  toString(): string {
    return `#${this.name}`;
  }

  valueOf(): string {
    return this.toString();
  }
}
