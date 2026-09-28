/**
 * The HUD's health bar as arithmetic (AUDIT 122, 123): where its live track
 * ends, how long its empty tail is, how far its fill runs and where the floor
 * is marked, in HUD pixels from the track's left end. `ActScene.drawHud`
 * draws exactly this; no Phaser here, so a unit test reads the same numbers
 * the scene draws (src/scenes/__tests__/health-bar.test.ts).
 *
 * The track is the maximum the items give (`World.itemsMaxHp`), never the
 * act's opening maximum: a Thick Skin taken after a decision lengthens the
 * whole track by its own multiplier, and the decision still shows as the
 * same share of it. The live track ends at the maximum now (`World.maxHp`),
 * and what the insurance form's decisions took (DECLINE-ROSTER §3.5) is the
 * tail from there to the end. In every act nothing decides, the tail is
 * zero and nothing else is drawn.
 */
export interface HealthBar {
  /** Pixels of live track: the maximum now against the items' maximum. Whole. */
  live: number;
  /** Pixels of empty tail: what decisions took, `width − live`. Zero when nothing has. */
  tail: number;
  /** Pixels of fill: health now, held inside the live track as drawn. Not otherwise rounded, as the fill never was. */
  fill: number;
  /**
   * Pixels to the floor's tick (`World.maxHpFloor`, where the cuts stop), or
   * null when none is drawn: only while a tail shows, since until a decision
   * lands there are no cuts for it to stop. Whole, inside the track.
   */
  floorAt: number | null;
}

/** What the bar reads off the world. `itemsMaxHp` ≥ `maxHp` in the sim; a smaller one is read as `maxHp`. */
export interface HealthBarInput {
  hp: number;
  maxHp: number;
  itemsMaxHp: number;
  maxHpFloor: number;
}

export function healthBar(width: number, w: HealthBarInput): HealthBar {
  const track = Math.max(w.itemsMaxHp > 0 ? w.itemsMaxHp : w.maxHp, w.maxHp);
  if (!(track > 0) || !(width > 0)) return { live: Math.max(0, width), tail: 0, fill: 0, floorAt: null };
  const live = Math.round((width * w.maxHp) / track);
  const tail = width - live;
  // Held inside the live track as drawn: the track is rounded to a pixel and
  // full health must not spill a fraction of one into the tail.
  const fill = Math.min(live, (width * Math.min(w.maxHp, Math.max(0, w.hp))) / track);
  const floor = Math.round((width * w.maxHpFloor) / track);
  const floorAt = tail > 0 && w.maxHpFloor > 0 && floor < width ? floor : null;
  return { live, tail, fill, floorAt };
}
