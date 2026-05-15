export class LingoList<T = unknown> implements Iterable<T> {
  protected readonly values: T[];

  constructor(values: T[] = []) {
    this.values = [...values];
  }

  get count(): number {
    return this.values.length;
  }

  getAt(index: number): T {
    this.assertIndex(index);
    return this.values[index - 1] as T;
  }

  setAt(index: number, value: T): void {
    this.assertIndex(index);
    this.values[index - 1] = value;
  }

  add(value: T): void {
    this.values.push(value);
  }

  deleteAt(index: number): T {
    this.assertIndex(index);
    const [deleted] = this.values.splice(index - 1, 1);
    return deleted as T;
  }

  toArray(): T[] {
    return [...this.values];
  }

  [Symbol.iterator](): Iterator<T> {
    return this.values[Symbol.iterator]();
  }

  protected assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 1 || index > this.values.length) {
      throw new Error(`Lingo list index out of range: ${index}`);
    }
  }
}
