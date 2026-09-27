import type { Input } from '../sim/world';

/**
 * How long a player holds a heading: §12.4's sixth question, answered by
 * measurement rather than by asking.
 *
 * The bots re-decide their heading every `cadenceSeconds` (tools/playtest/
 * bots.ts), a 200ms PLACEHOLDER awaiting §11.5 because nobody has measured a
 * person. This is the instrument; its median hold is what the cadence is set
 * against. Compare like with like: a bot re-decision landing in the same
 * sector is not a new hold here, so put the bot's inputs through this log too
 * rather than reading a person's median against `cadenceSeconds` directly.
 *
 * Outside `World` for the reason dev cheats are: the bots must play the
 * identical game. Node-safe; storage is the scene's job.
 */

/** Compass sectors of 45°, centred on the axes. 0 is +x, counting toward +y (down the screen). */
export const SECTORS = 8;

/**
 * The quantised heading, or null when idle. Eight because each keyboard
 * direction lands on a sector's centre, so only a touch stick can sit near a
 * boundary. A heading exactly on one goes to the +y side.
 */
export function headingSector(input: Input): number | null {
  // `!(> 0)` rather than `=== 0`, so a NaN reads as idle, not as a direction.
  if (!(Math.hypot(input.moveX, input.moveY) > 0)) return null;
  const k = Math.round(Math.atan2(input.moveY, input.moveX) / (Math.PI / 4));
  return ((k % SECTORS) + SECTORS) % SECTORS;
}

/** `totalSeconds` is every recorded second: completed holds, the open one, and idle. */
export interface InputLogSummary {
  count: number;
  median: number;
  p90: number;
  idleSeconds: number;
  totalSeconds: number;
}

/** `sector` and `open` carry the unfinished hold, so a log saved mid-hold resumes it unsplit. */
export interface InputLogJSON {
  holds: number[];
  sector: number | null;
  open: number;
  idleSeconds: number;
  totalSeconds: number;
}

/**
 * A hold ends when the sector changes or the player goes idle. A wobble across
 * a boundary is a change, however brief: this measures what the hands did, not
 * what they meant, and a stick resting on a boundary should read as a flurry of
 * short holds rather than be smoothed into a long one. Input is logged, not
 * motion, so a stunned step still extends the hold.
 *
 * Idle is not a hold: the bots never stand still (they coast on the last
 * heading), so idle has nothing of theirs to compare with and is kept apart.
 */
export class InputLog {
  private done: number[] = [];
  private sector: number | null = null;
  private open = 0;
  private idle = 0;
  private total = 0;

  /** Call once per sim step, with the same input the sim received. */
  record(dt: number, input: Input): void {
    // A step with no time in it has no heading to measure; letting it change
    // sector would file a zero-second hold and drag the median toward nothing.
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    this.total += dt;
    const s = headingSector(input);
    if (s !== null && s === this.sector) {
      this.open += dt;
      return;
    }
    if (this.sector !== null) this.done.push(this.open);
    [this.sector, this.open] = [s, s === null ? 0 : dt];
    if (s === null) this.idle += dt;
  }

  /** Completed holds, in seconds, oldest first. The open hold joins when it ends. */
  holds(): readonly number[] {
    return this.done.slice();
  }

  summary(): InputLogSummary {
    // The bot report's own median and nearest-rank percentile (tools/playtest/
    // bots.ts), so a person's holds and a bot's are summarised by one rule.
    const s = [...this.done].sort((a, b) => a - b);
    const n = s.length;
    const median = n === 0 ? 0 : n % 2 ? s[n >> 1]! : (s[(n >> 1) - 1]! + s[n >> 1]!) / 2;
    const p90 = n === 0 ? 0 : s[Math.ceil(0.9 * n) - 1]!;
    return { count: n, median, p90, idleSeconds: this.idle, totalSeconds: this.total };
  }

  toJSON(): InputLogJSON {
    const { sector, open, idle, total } = this;
    return { holds: this.done.slice(), sector, open, idleSeconds: idle, totalSeconds: total };
  }

  /** Whatever is unreadable is dropped, as the ancestor log drops it. */
  static fromJSON(json: unknown): InputLog {
    const log = new InputLog();
    if (typeof json !== 'object' || json === null) return log;
    const r = json as Record<string, unknown>;
    const secs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
    if (Array.isArray(r.holds)) log.done = r.holds.filter((h): h is number => secs(h) > 0);
    const s = r.sector;
    if (typeof s === 'number' && Number.isInteger(s) && s >= 0 && s < SECTORS && secs(r.open) > 0) {
      [log.sector, log.open] = [s, secs(r.open)];
    }
    [log.idle, log.total] = [secs(r.idleSeconds), secs(r.totalSeconds)];
    return log;
  }
}
