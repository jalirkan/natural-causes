/**
 * A uniform spatial grid, rebuilt every step.
 *
 * Without it the simulation is O(queries x enemies): Wake alone keeps around
 * thirteen damage areas alive at once, and against the 1500-enemy cap that is
 * ~20,000 distance checks per step for one item, before projectiles or contact.
 * A single 420-second bot run came to roughly a billion operations and did not
 * finish — which made the playtest bots useless, not merely slow.
 *
 * Rebuilding each step rather than maintaining incrementally is deliberate:
 * every enemy moves every frame, so an incremental structure would be rewritten
 * anyway, and this way there is no stale state to get wrong.
 */

export interface HasPosition {
  x: number;
  y: number;
}

const CELL = 96;

export class Grid<T extends HasPosition> {
  private readonly cells = new Map<number, T[]>();
  /** Cleared arrays kept for reuse, so a rebuild allocates nothing. */
  private readonly spare: T[][] = [];

  private static key(cx: number, cy: number): number {
    // Cantor-ish pack. Coordinates are small enough that this never collides
    // in a field of a few thousand pixels.
    return (cx + 4096) * 16384 + (cy + 4096);
  }

  build(items: T[]): void {
    for (const list of this.cells.values()) {
      list.length = 0;
      this.spare.push(list);
    }
    this.cells.clear();

    for (const item of items) {
      const key = Grid.key(Math.floor(item.x / CELL), Math.floor(item.y / CELL));
      let list = this.cells.get(key);
      if (!list) {
        list = this.spare.pop() ?? [];
        this.cells.set(key, list);
      }
      list.push(item);
    }
  }

  /**
   * Appends everything within `radius` of the point into `out`.
   *
   * `out` is caller-owned and reused, so the hot path allocates nothing. The
   * result is a superset filtered by cell, not by exact distance — callers
   * already do a precise check.
   */
  query(x: number, y: number, radius: number, out: T[]): void {
    out.length = 0;
    const minX = Math.floor((x - radius) / CELL);
    const maxX = Math.floor((x + radius) / CELL);
    const minY = Math.floor((y - radius) / CELL);
    const maxY = Math.floor((y + radius) / CELL);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const list = this.cells.get(Grid.key(cx, cy));
        if (!list) continue;
        for (const item of list) out.push(item);
      }
    }
  }
}
