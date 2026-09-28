import type { AreaState, BossState, EnemyState, HoldState, SweepState } from '../sim/world';

/**
 * Edges `ActScene.hearWorld` reads off the world, the ones with enough in
 * them to want a function: each compares what the world holds this frame
 * with what was heard last frame and says what arrived. The world never
 * knows; these only read it. No Phaser here, so they run under the unit
 * tests against a real World (src/scenes/__tests__/edges.test.ts).
 *
 * Every Office, Family and Decline edge is gated on a def id or a boss kind,
 * never an act index, so a sound follows its thing wherever the schedule puts
 * it and nowhere else.
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
export type VehicleSound = 'carPass' | 'carriage' | 'tape' | 'rain';

/**
 * Every def that pulls onto the field on the crossing engine, and what its
 * arrival sounds like. Driver's ed and College's deadline are a car; The
 * Office's commute is a train; Family's flat-pack (FAMILY-ROSTER §3.2) is
 * the tape torn off the box it came in; Decline's weather (DECLINE-ROSTER
 * §3.2) is the rain, a front coming in. One map, so a commute is never also
 * a car, a flat-pack is never either, and the weather is none of them.
 */
const VEHICLES: ReadonlyMap<string, VehicleSound> = new Map<string, VehicleSound>([
  ['drivers-ed', 'carPass'],
  ['deadline', 'carPass'],
  ['commute', 'carriage'],
  ['flat-pack', 'tape'],
  ['weather', 'rain'],
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

// --- Family ---------------------------------------------------------------

/**
 * The highest uid of `id` on the field, or `highest` when none is above it:
 * a result above `highest` is at least one `id` arriving since last frame,
 * however many did. Homework's counter as a function; the bill's doorbell
 * reads it (FAMILY-ROSTER §6). Uids are monotonic across the whole life, so
 * a late fee — one a bill set down, or the one the Mortgage sends from its
 * door for a missed window — is a bill arriving like any other, and rings.
 */
export function newestAbove(enemies: readonly { uid: number; def: { id: string } }[], id: string, highest: number): number {
  let top = highest;
  for (const e of enemies) if (e.def.id === id && e.uid > top) top = e.uid;
  return top;
}

/**
 * How many `id` are consulting now, for the phone's ring (§3.5): the group
 * chat's typing and the registrar's bell are counted the same way. A count
 * above last frame's is a consult starting. A count, so one starting on the
 * frame another ends is not heard: never twice, now and then not at all.
 */
export function consulting(enemies: readonly { consult: number; def: { id: string } }[], id: string): number {
  let n = 0;
  for (const e of enemies) if (e.def.id === id && e.consult > 0) n++;
  return n;
}

/** What `holdTaken` reads off the world: the hold's clock, the player, the field. */
interface HoldView {
  readonly engulfTimer: number;
  readonly x: number;
  readonly y: number;
  readonly playerRadius: number;
  readonly enemies: readonly Pick<EnemyState, 'x' | 'y' | 'radius' | 'def'>[];
}

/**
 * The def id of whatever took hold of the player since last frame, or null:
 * the toddler's hold (§3.4) is its squeak. The edge is `engulfTimer` rising.
 * It only counts down while a hold runs and is set to the full window on the
 * step one starts, so any rise is a new hold — including one taken on the
 * step the last let go, which "rising from zero" would miss: a toddler lets
 * go, and the next is already at the leg.
 *
 * Who took hold is private to the sim, so it is re-derived as
 * `resolveContact` chose it: the last engulfing body in the list within
 * touch, positions being where the contact read them (nothing later in the
 * step moves an enemy). If none is in touch now — something later in the
 * step moved the player off it, as a phone's call landing does — the nearest
 * engulfing body answers. Every schedule's engulfers are one def an act (the white cell,
 * the standardised test, the toddler), so either reading names the right one
 * there; only a field mixed by hand can tell them apart.
 */
export function holdTaken(w: HoldView, engulfBefore: number): string | null {
  if (!(w.engulfTimer > engulfBefore)) return null;
  let nearest: string | null = null;
  let nearestD2 = Infinity;
  for (let i = w.enemies.length - 1; i >= 0; i--) {
    const e = w.enemies[i]!;
    if (e.def.contact !== 'engulf' || !e.def.engulf) continue;
    const d2 = (e.x - w.x) ** 2 + (e.y - w.y) ** 2;
    const r = e.radius + w.playerRadius;
    if (d2 <= r * r) return e.def.id;
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = e.def.id;
    }
  }
  return nearest;
}

/**
 * The Mortgage's statement drafted (§4): its phase entering `telegraph`, on
 * the edge, as the Reorg's memo is. Gated on the kind, so the Egg's and the
 * Loan's telegraphs — the same machine — stay silent. The shot it announces
 * (DUE) fires on `bossShot`.
 */
export function statementDrafted(boss: Pick<BossState, 'kind' | 'phase'> | null, phaseBefore: string): boolean {
  return boss?.kind === 'mortgage' && boss.phase === 'telegraph' && phaseBefore !== 'telegraph';
}

/**
 * A window paid (§4): the Mortgage's `paid` rising since last frame. It is
 * set only at a window's end, so at most once a window; a missed window
 * leaves it where it was and sends a bill from the door instead, which the
 * doorbell already hears.
 */
export function instalmentPaid(boss: Pick<BossState, 'kind' | 'paid'> | null, paidBefore: number): boolean {
  return boss?.kind === 'mortgage' && boss.paid > paidBefore;
}

// --- Decline --------------------------------------------------------------
//
// Four of the act's five sounds are the Family patterns on Decline's ids,
// read in hearWorld: a medication arriving is `newestAbove(…, 'medication')`
// (the rattle), the weather entering is `vehiclesEntered`'s 'rain', a flight
// of stairs landing is `holdArrived(…, 'stairs')` (the creak), the insurance
// form consulting is `consulting(…, 'insurance-form')` (the stamp, DENIED).
// Time's tick is its own edge, below.

/**
 * The ranged defs whose shot has a sound of its own, or a silence, rather
 * than the substitute's ah-hem: the group chat's notification, the
 * substitute's own, the registrar's stamp, and the phone's and the form's
 * shots, which land silent because the consult already spoke (the ring;
 * DENIED's stamp). Any ranged def missing here borrows the ah-hem, so a new
 * aimed thing is never mute by accident — and a form's DENIED is never an
 * ah-hem by one.
 */
const OWN_VOICE: ReadonlySet<string> = new Set(['group-chat', 'substitute-teacher', 'registrar', 'phone-call', 'insurance-form']);

/** True for a ranged def whose shot borrows the substitute's ah-hem (`OWN_VOICE`). */
export function borrowsAhem(id: string): boolean {
  return !OWN_VOICE.has(id);
}

/**
 * The seconds Time counts aloud at its end (DECLINE-ROSTER §4, §6): the last
 * five of `secondsLeft`, one tick each.
 */
export const TIME_COUNTDOWN = 5;

/** The boss fields Time's tick reads. */
type ClockView = Pick<BossState, 'kind' | 'filed' | 'secondsLeft'> | null;

/**
 * Time's tick (DECLINE-ROSTER §4, §6): true on a frame the clock ticks. Two
 * edges, never two ticks:
 *
 *   - a quarter turn of the long hand: `filed` rising, the file read, one a
 *     quarter (the knee it lands is heard later, if worn, as the stamp);
 *   - the last TIME_COUNTDOWN seconds: the whole part of `secondsLeft`
 *     falling, 5 to 4 as five seconds are left through 1 to 0 as one is.
 *
 * Inside the countdown only the seconds tick. The quarter that falls there
 * (57s of a 60s clock) and the second it shares are summed on two clocks
 * (`handSeconds` up, `secondsLeft` down) and can land a step apart; heard as
 * both, they would be a double tick. The run-out — `secondsLeft` reaching 0
 * from a fraction — is no fall of the whole part and ticks nothing: the act's
 * end word and the certificate carry it. Time's arrival reads 60 against the
 * 0 heard before it, a rise. Gated on the kind, so no other boss's counter —
 * the Mortgage's `paid`, the Reorg's `restructures` — and no phase ever ticks.
 */
export function timeTicks(boss: ClockView, before: { filed: number; secondsLeft: number }): boolean {
  if (boss?.kind !== 'time') return false;
  if (boss.secondsLeft < TIME_COUNTDOWN) return Math.floor(boss.secondsLeft) < Math.floor(before.secondsLeft);
  return boss.filed > before.filed;
}

// --- The kid's things (G-054) ---------------------------------------------

/**
 * THE CRY CONTRACT, read in this one place. The Cry (`cry`, G-054) is the sim's
 * `World.cries`: a ring expanding from (x, y) over `seconds` to `maxRadius`,
 * its radius now `maxRadius * age / seconds`, gone when `age >= seconds`.
 * Written against that contract before the sim carries it, so this mirrors
 * the interface and reads the field as optional; when `CryState` is exported
 * from `src/sim/world.ts`, this type becomes `import type { CryState }` and
 * `criesOf` becomes `w.cries`, and nothing else changes.
 */
export interface CryState {
  x: number;
  y: number;
  age: number;
  seconds: number;
  maxRadius: number;
  source: string;
}

/** The world's cries, or none on a world that has no Cry (see the contract above). */
export function criesOf(w: object): readonly CryState[] {
  return (w as unknown as { cries?: readonly CryState[] }).cries ?? [];
}

/** What `criesBegun` remembers of last frame's cries: how many, and the youngest one's age. */
export interface CriesHeard {
  cries: number;
  youngestCry: number;
}

/** The youngest cry's age, or Infinity with none: what `CriesHeard.youngestCry` keeps. */
export function youngestCry(cries: readonly Pick<CryState, 'age'>[]): number {
  let youngest = Infinity;
  for (const c of cries) youngest = Math.min(youngest, c.age);
  return youngest;
}

/**
 * How many cries began since last frame (G-054): the count rising, each new
 * one counted once. Cries carry no serial, so a count alone would miss one
 * starting on the frame the last one ends; the ages cover that, since a cry
 * only ever ages — a cry younger than the youngest heard last frame is new.
 * The larger of the two readings, so a cry is never counted twice. A world
 * held still (a card up, the life over) changes neither, and is silent.
 */
export function criesBegun(cries: readonly Pick<CryState, 'age'>[], before: CriesHeard): number {
  const rose = cries.length - before.cries;
  const younger = cries.length > 0 && youngestCry(cries) < before.youngestCry ? 1 : 0;
  return Math.max(0, rose, younger);
}

/**
 * The weapons whose burst is Spilt Milk (G-054): the milk, and Tantrum, which
 * it becomes. Each burst lays a puddle, an area carrying the item's id as its
 * `source` (a zero-damage slow, `syncPuddles` draws it); the splat is heard
 * off that id and never off the act.
 */
export const SPILT_MILK: ReadonlySet<string> = new Set(['acrosome', 'tantrum']);

/**
 * The highest serial of a Spilt Milk area on the field, or `highest` when
 * none is above it: a result above `highest` is a burst since last frame, so
 * one splat however many landed. Area serials come off the world's one
 * monotonic counter, as the hostile shots' do, so anything laid since last
 * frame is above every serial that existed then; a puddle lying there for
 * seconds is heard once, when it lands. If a burst's own area is tagged too,
 * it lands on the puddle's step and is the same splat.
 */
export function splatAbove(areas: readonly Pick<AreaState, 'serial' | 'source'>[], highest: number): number {
  let top = highest;
  for (const a of areas) if (a.source !== undefined && SPILT_MILK.has(a.source) && a.serial > top) top = a.serial;
  return top;
}

/**
 * The sweeps whose swing is the rattle (G-054): the Rattle (`backhand`),
 * Decline's pill bottle at the other end of the life, the same sound. Its
 * evolution is the adult word, Backhand (`reach`), and swishes.
 */
const RATTLING_SWEEPS: ReadonlySet<string> = new Set(['backhand']);

/**
 * What the sweeps swung this frame sound like: the rattle for a Rattle, the
 * swish for any other, at most one of each however many arcs swung. Arcs are
 * aged before the swing (`updateSweeps` runs before `fireItems`), so one
 * swung on this frame's step reads 0 and one from the frame before reads a
 * whole step; half the frame's world time splits them with room for float.
 * `elapsed` is the world time this frame's steps covered; the caller hears
 * nothing while the world is held, where an arc sits still at its age.
 */
export function sweepsSwung(
  sweeps: readonly Pick<SweepState, 'age' | 'source'>[],
  elapsed: number,
): { swish: boolean; rattle: boolean } {
  let swish = false;
  let rattle = false;
  for (const s of sweeps) {
    if (!(s.age < elapsed / 2)) continue;
    if (RATTLING_SWEEPS.has(s.source)) rattle = true;
    else swish = true;
  }
  return { swish, rattle };
}
