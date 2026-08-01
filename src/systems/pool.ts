/**
 * A fixed-capacity pool of active entities backed by a plain array.
 *
 * Horde survival means hundreds of things alive at once and hundreds more
 * created and destroyed per minute. Allocating per spawn hands the garbage
 * collector a steady stream of short-lived objects, and a GC pause in a game
 * where a frame decides whether you get hit is a bug, not a hiccup.
 *
 * Deliberately not Phaser's Group: this owns its own update order and swap
 * removal, which is most of what the movement and collision systems need.
 */
export class Pool<T> {
  readonly items: T[] = [];
  private readonly free: T[] = [];

  constructor(
    private readonly create: () => T,
    private readonly reset: (item: T) => void,
  ) {}

  /** Live count. Iterate `items` directly for the hot path. */
  get active(): number {
    return this.items.length;
  }

  spawn(): T {
    const item = this.free.pop() ?? this.create();
    this.items.push(item);
    return item;
  }

  /**
   * Swap-remove by index. O(1), and it reorders `items` — callers iterating
   * while releasing must walk backwards.
   */
  releaseAt(i: number): void {
    const item = this.items[i]!;
    const last = this.items.pop()!;
    if (i < this.items.length) this.items[i] = last;
    this.reset(item);
    this.free.push(item);
  }

  releaseAll(): void {
    for (let i = this.items.length - 1; i >= 0; i--) this.releaseAt(i);
  }
}
