import type { BossState, HoldState } from '../sim/world';

/**
 * Edges `ActScene.hearWorld` reads off the world, the ones with enough in
 * them to want a function: each compares what the world holds this frame
 * with what was heard last frame and says what arrived. The world never
 * knows; these only read it. No Phaser here, so they run under the unit
 * tests against a real World (src/scenes/__tests__/edges.test.ts).
 *
 * Every Office edge is gated on a def id or a boss kind, never an act index,
 * so a sound follows its thing wherever the schedule puts it and nowhere else.
 */

/**
 * The def ids whose worn stacks rose since last frame: `World.wornBy` against
 * last frame's copy of it. Per def rather than the total, so a ping and an
 * invoice landing in The Office are two sounds, and an invoice is still an
 * invoice there. A def missing from either map counts 0; a count that fell
 * (the crossing takes the pings off) is not an arrival.
 */
export function wornGained(now: ReadonlyMap<string, number>, before: ReadonlyMap<string, number>): string[] {
  const gained: string[] = [];
  for (const [id, n] of now) if (n > (before.get(id) ?? 0)) gained.push(id);
  return gained;
}

/**
 * True when a hold spawned as `source` is on the field that was not on last
 * frame's list. Holds carry no uid and leave by swap-remove, so a count would
 * miss one arriving on the frame another ends; the object is the identity
 * instead (`addEnemy` builds a fresh one for every hold). `before` must be a
 * copy of last frame's list, not the live array.
 */
export function holdArrived(now: readonly HoldState[], before: readonly HoldState[], source: string): boolean {
  for (const h of now) if (h.source === source && !before.includes(h)) return true;
  return false;
}

/** A vehicle's arrival sound: the crossing engine's defs, and nothing else. */
export type VehicleSound = 'carPass' | 'carriage';

/**
 * Every def that pulls onto the field on the crossing engine, and what its
 * arrival sounds like. Driver's ed and College's deadline are a car; The
 * Office's commute is a train. One map, so a commute is never also a car.
 */
const VEHICLES: ReadonlyMap<string, VehicleSound> = new Map<string, VehicleSound>([
  ['drivers-ed', 'carPass'],
  ['deadline', 'carPass'],
  ['commute', 'carriage'],
]);

/**
 * The vehicles that entered since last frame, by the sound each makes, and
 * the new highest vehicle uid. Uids are monotonic across the whole life, so a
 * vehicle uid above the highest heard is new; one counter serves every
 * vehicle, because anything created since last frame is above every uid that
 * existed then. At most one of each sound, however many arrived.
 */
export function vehiclesEntered(
  enemies: readonly { uid: number; def: { id: string } }[],
  highest: number,
): { sounds: Set<VehicleSound>; highest: number } {
  const sounds = new Set<VehicleSound>();
  let top = highest;
  for (const e of enemies) {
    if (e.uid <= highest) continue;
    const sound = VEHICLES.get(e.def.id);
    if (!sound) continue;
    sounds.add(sound);
    top = Math.max(top, e.uid);
  }
  return { sounds, highest: top };
}

/** The boss fields the Office's boss edges read. */
type BossView = Pick<BossState, 'kind' | 'phase' | 'restructures'> | null;

/**
 * A meeting closing round the player since last frame (OFFICE-ROSTER §3.4,
 * §4): a meeting hold that was not there, or the Reorg's `restructures`
 * rising. The restructure seats its meeting through the spawn cap
 * (MAX_ACTIVE_ENEMIES), so at the cap it seats none and only the count says
 * it happened; under the cap both edges are true on one frame, and this is
 * one answer for the two, so a restructure is heard once either way.
 */
export function meetingCloses(
  holds: readonly HoldState[],
  boss: BossView,
  before: { holds: readonly HoldState[]; restructures: number },
): boolean {
  if (holdArrived(holds, before.holds, 'meeting')) return true;
  return boss?.kind === 'reorg' && boss.restructures > before.restructures;
}

/**
 * The Reorg drafting a memo (§4): its phase entering `telegraph`, on the
 * edge, as Prom's slow song and the Gym Teacher's whistle are heard. Gated on
 * the kind, so the Egg's telegraph — the same machine — stays silent.
 */
export function memoDrafted(boss: BossView, phaseBefore: string): boolean {
  return boss?.kind === 'reorg' && boss.phase === 'telegraph' && phaseBefore !== 'telegraph';
}
