import type { ActDef, BossDef, GymTeacherBoss, LoanBoss, PromBoss, SpawnWave } from '../data/acts';
import { ALL_ACTS, rateAt, spawnStreams, whistleInterval } from '../data/acts';
import { enemyDef, type EnemyDef } from '../data/enemies';
import {
  ITEMS,
  OFFER_PATH_SEPARATOR,
  PATH_OPENS_AT,
  cooldownScale,
  damageScale,
  foldBonus,
  isActive,
  itemDef,
  levelBonus,
  offerIdFor,
  parseOfferId,
  type ActiveItem,
  type ItemDef,
  type LevelBonus,
  type PassiveItem,
} from '../data/items';
import { INHERITANCES, INHERITANCE_IDS, type InheritanceDef, type StatLine } from '../data/inheritances';
import { Grid } from './grid';

/**
 * The whole game, with no renderer in it.
 *
 * Everything that decides what happens lives here: movement, spawning,
 * collision, levelling, items, the boss. `ActScene` reads this and draws it;
 * the playtest bots run it directly with no browser at all.
 *
 * The split is not tidiness. Bots that re-implement the rules measure a
 * different game from the one people play, and their numbers would be worse
 * than no numbers — confidently wrong rather than absent. One rule set, two
 * front ends, so a bot result is a statement about the real game.
 *
 * Determinism is the other half: the only randomness is `this.rng`, seeded per
 * run, so a seed reproduces a run exactly and a failure found by a bot can be
 * replayed.
 */

export const PLAYER_BASE_SPEED = 190;
export const PLAYER_BASE_HP = 100;
/**
 * The player's collision radius before any item. The sim reads
 * `World.playerRadius`, which applies Growth Spurt; this stays the base.
 */
export const PLAYER_RADIUS = 16;
/** Seconds of immunity after a hit. Without it a crowd deletes you. */
export const IFRAMES = 0.6;
export const MAX_ACTIVE_ENEMIES = 1500;
export const DESPAWN_RADIUS = 1600;
export const DRIFT_SPREAD = (120 * Math.PI) / 180;
/**
 * Antibody drag: a curve with a floor, not a cap (G-025).
 *
 * The floor is an ASYMPTOTE on resulting speed, not a clamp on stack count.
 * Marginal drag is strictly positive at every count, so the fiftieth stack
 * still costs something and an enemy that spawns for five minutes keeps
 * mattering for all five.
 *
 * The previous form clamped with `max(FLOOR, ...)`, which flattened at about
 * 17 stacks. Under an honest instrument the operating range is 48-76, so the
 * cap WAS the operating point. Two consequences, and the second is why this is
 * a ruling rather than a tidy-up:
 *
 *   - Stacks 18 through 76 did nothing at all.
 *   - §8.4's dispersion condition passed at 2.5x while both of its terms sat
 *     above the clamp, so the careful policy and the careless one arrived at
 *     exactly the same speed. Experienced dispersion was 1.0x. A criterion
 *     reporting "working" while the property it detects has gone to zero is
 *     worse than a stale one, because nothing downstream ever asks again.
 *
 * §3.3 asks for three properties: no single stack feels unfair, the aggregate
 * is decisive, the player cannot say when it went wrong. A clamp keeps the
 * first and third and breaks the second the moment it is reached.
 *
 * PLACEHOLDER VALUES. Both numbers below are placeholders awaiting §11.5, the
 * session with a human. The shape is settled (G-025); neither value is.
 *
 * ANTIBODY_FLOOR is 0.65 because that is the RETIRED SAFETY-VALVE value from
 * §7.5 — a number chosen to prevent a death spiral, not to express an intended
 * worst case. It is not a design choice and should not be treated as one.
 * §3.3's intended worst case is that a careless run *ends*; a player at 65%
 * speed is inconvenienced. Cowork's starting guess is 0.35-0.45, offered to be
 * reacted to rather than as a proposal.
 */
export const ANTIBODY_DRAG_K = 0.03;
export const ANTIBODY_FLOOR = 0.65;
/** How close a gem has to be before it comes to the player. Appetite multiplies it. */
export const MAGNET_RADIUS = 96;
export const GEM_SPEED = 320;
export const RING_BAND = 6;
/** Spawn ring radius. Matches the 1280x720 viewport the game is authored at. */
export const SPAWN_RADIUS = 780;
/** The Egg is roughly 8x player height and does not move from centre. */
export const BOSS_RADIUS = 150;
/**
 * The Egg's constant radial pull, in pixels per second. **Zero: dropped.**
 *
 * G-019 reverses G-015. The pull was chosen to fix a participation problem that
 * did not exist — the 97% and 86% boss-HP-remaining that motivated it were two
 * defects in the playtest instrument, and with those fixed the short builds
 * participate fully with this at zero. What remained was characterisation, and
 * the A/B killed that too: motility, greedy-capacitation and random score
 * identically in both arms (56/56, 100/100, 94/94), so what shipped was a
 * range-dependent assist to the two builds that already wanted to be close
 * rather than the universal positional question G-015 described.
 *
 * The constant and the code path stay, deliberately (§8.2). Two reasons:
 *
 * 1. The §7.2 non-negotiable test stays live, and now guards against anyone
 *    reintroducing an inward force without re-deriving the slowest legal
 *    build. That is worth more than the feature was.
 * 2. It is the cheapest experiment available if the fight reads as a shooting
 *    gallery in front of a human, which is the one piece of evidence nobody
 *    has.
 *
 * **EXPIRY (§8.2).** If Justin plays the Egg fight and does not ask for
 * something in this space, delete this constant and `applyBossPull` at the next
 * close. An inert feature is a fossil; an expiry is what makes it a knob.
 */
export const BOSS_PULL = 0;

/**
 * How far ahead of the player an antibody appears (G-020).
 *
 * Antibodies stop entering at the arena edge. Survivability was never the
 * binding constraint on them — arrival was. A thing drifting at 34 against a
 * player at 190, which the bot routes around at 260px, does not need to be
 * tougher; it needs to not be approaching from somewhere the player is leaving.
 *
 * This is the tuning dial and it is monotonic between the two failure modes
 * §8.4 separates: a longer lead gives more time to change heading and fewer
 * stacks, a shorter lead gives less and more. Spawn rate is the second knob and
 * stays fixed until this one is settled.
 */
export const ANTIBODY_LEAD = 320;
/**
 * Calibrated against measured bot damage, not guessed.
 *
 * The first figure was 900, invented with no basis. Bots reached the boss in
 * 11 of 12 runs and left 75-99% of it standing, so the fight was not hard —
 * it was arithmetic that could not close. This is set so a build that has come
 * together kills it in roughly forty seconds and a build that has not, does
 * not. Expect the bots to move it again.
 */
export const BOSS_HP = 320;

/**
 * G-047: an evolution is paid at its weapon's max level. The generic
 * per-level scaling (damageScale, cooldownScale) reads this instead of the
 * item's own level, so Tantrum at level 1 keeps what Temper had at 8 and the
 * card that replaces a maxed weapon is never a downgrade. Everything else
 * (the levels table, paths) reads the item's own level.
 */
export function scalingLevel(def: ItemDef, level: number): number {
  if (!isActive(def) || !def.evolvesFrom) return level;
  const weapon = ITEMS[def.evolvesFrom.weapon];
  return weapon ? level + weapon.maxLevel - 1 : level;
}
/**
 * The Egg's light, which Prom borrows whole (ADOLESCENCE-ROSTER §4): seconds
 * in each phase of its machine, and the shot it fires. Named so Prom reads
 * these numbers rather than a copy of them; the Egg's machine uses them
 * exactly where it used the literals they replace. PLACEHOLDERS under both
 * acts' `provisional` labels, set when the Egg was built and never played.
 */
export const EGG_TELEGRAPH_SECONDS = 0.85;
export const EGG_ATTACK_SECONDS = 0.35;
export const EGG_IDLE_SECONDS = 1.6;
export const EGG_SHOT = { speed: 260, life: 4, damage: 12, radius: 10 } as const;
/**
 * How long the Gym Teacher's `attack` phase reads after the whistle blows,
 * before `idle`. The Egg's attack hold, reused. Presentation only: the whistle
 * is instantaneous and the cadence is measured whistle to whistle, so this
 * moves where `idle` starts and not how often he blows.
 */
export const WHISTLE_HOLD_SECONDS = 0.35;

/**
 * The Loan (COLLEGE-ROSTER §4). PLACEHOLDERS under `COLLEGE.provisional`,
 * beside the four on `LoanBoss` (interestSeconds 5, interestRate 0.06, cap 3,
 * invoices 3). None has been played:
 *   LOAN_OPENING_PER_STACK 0.1 — §4's opening balance, BOSS_HP plus a tenth of
 *     it for every invoice worn when it appears. Read off `dragStacks`: the
 *     act's only attach is tuition, so the stacks worn at the boss ARE the
 *     invoices;
 *   LOAN_INVOICE_SPREAD 0.16 — radians between neighbouring invoices in one
 *     statement, fanned about the player's heading at the lead: the Egg's fan
 *     spacing (and the Gym Teacher's `throwSpread`), for the reason his has
 *     one. Unspread, a statement is `invoices` envelopes on one point: one
 *     envelope to the eye, and all of them worn on one touch.
 * Its statement runs on the Egg's timings (EGG_IDLE_SECONDS,
 * EGG_TELEGRAPH_SECONDS, EGG_ATTACK_SECONDS) and it opens from BOSS_HP; both
 * are read, not copied.
 */
export const LOAN_OPENING_PER_STACK = 0.1;
export const LOAN_INVOICE_SPREAD = 0.16;

/**
 * How long ago "recently" is, for an enemy that lands where the player has
 * been (`spawnAt: 'trail'` — homework, SCHOOL-ROSTER §3.3).
 *
 * PLACEHOLDER (D-022), under SCHOOL's `provisional` label. The same class of
 * dial as ANTIBODY_LEAD, which G-020 showed decides whether an arrival
 * mechanic exists at all: too short and the pile lands on the player, too
 * long and it lands somewhere they have already forgotten. A person watching
 * where the paper lands behind them at the link is what moves it.
 */
export const TRAIL_SECONDS = 2.5;
/**
 * How often the player's position is written to the trail. By time rather
 * than once per step because the browser steps by frame delta, and a buffer
 * of N steps reaches back less far on a faster display. PLACEHOLDER as a
 * resolution rather than a dial: at base speed it lands a pile within ~10px
 * of where the player actually was. Move it only if that error shows.
 */
export const TRAIL_SAMPLE_SECONDS = 0.05;
/** Enough samples that the oldest is always older than TRAIL_SECONDS. */
const TRAIL_CAPACITY = Math.ceil(TRAIL_SECONDS / TRAIL_SAMPLE_SECONDS) + 2;
/**
 * The body of a `ranged` enemy's shot (the substitute, §3.5). The five numbers
 * that matter are on the def; these two are what is left. PLACEHOLDER, under
 * SCHOOL's `provisional` label: the radius is the Egg's shot radius, and the
 * reach is twice the enemy's range so a shot fired at the edge of it still
 * arrives. A person dodging it at the link is what moves them.
 */
export const RANGED_SHOT_RADIUS = 10;
export const RANGED_SHOT_REACH = 2;

/**
 * How far back the Egg's arrival sets a racer it appeared on top of (AUDIT
 * 30), in seconds of that racer's own swim: one on the boss point arrives
 * this long after the Egg, one at the corona's edge twice this long.
 *
 * PLACEHOLDER, the class Conception's `provisional` names for the race's
 * absorb count (set from bot runs, not played). Before it, a crowd already
 * inside the corona was absorbed on the first step and 12 of 31 "someone
 * else" deaths came 0.02s after the Egg appeared, untouched. One second is
 * long enough to see the Egg and the crowd turn for it, and no longer: the
 * race is still lost. A person asked "did you see it before the certificate?"
 * at the link is what moves it.
 */
export const RACE_PARTING_SECONDS = 1;

/**
 * How far the player must have moved from the last trail drop before the next
 * one lands (`mode: 'trail'`, Wake). AUDIT 27: the area was placed under the
 * player every cooldown whatever they did, so standing still stacked twelve
 * of them on one spot and dealt ~10x the damage of moving, while the card
 * says a cornered player "is holding a weapon that has stopped existing".
 * Measured from the last drop, not from a live area, so standing still for
 * longer than an area lives leaves nothing underfoot — which is the card.
 *
 * PLACEHOLDER, the class Conception's `provisional` names for the weapon
 * level tables (written, not played). Half a player radius because it is
 * under the 9.8px a level-8 Wake moves between drops at the antibody floor,
 * so no moving player lays fewer areas than before (measured: 334 and 758 a
 * minute at levels 1 and 8, unchanged at 30/60/144Hz), while standing still
 * or pressing into a wall lays none. Where it binds is a shuffle or an
 * engulf. A person playing Wake at the link — does creeping still feel like
 * a trail? — is what moves it.
 */
export const WAKE_MIN_SPACING = PLAYER_RADIUS / 2;

/** Seconds between a burst and its echo (a level bonus). */
export const ECHO_DELAY = 0.25;
/** How far a chaining shot looks for its next target. */
export const CHAIN_RADIUS = 180;
/** Damage a chained shot carries, as a fraction of the shot that hit. */
export const CHAIN_DAMAGE = 0.7;

/**
 * Seconds between Judgement picking its target and the bolt landing where
 * the target WAS (G-044): the telegraph, drawn as a ring closing on the spot.
 *
 * PLACEHOLDER, under Conception's `provisional` (its weapon tables clause):
 * long enough to see where it will land, short enough that a slow crowd is
 * still standing there. A person playing it at the link, asked "did you see
 * where it was going to land, and did anything get out of the way?", is what
 * moves it.
 */
export const STRIKE_DELAY = 0.35;
/**
 * How long a landed strike's flash is drawn. Its one hit is dealt on the
 * landing step (`landStrike`); this is presentation, a burst's 0.12s.
 * PLACEHOLDER, a reading-speed number nobody has looked at at the link.
 */
export const STRIKE_FLASH_SECONDS = 0.12;
/**
 * How long a sweep's arc is drawn after it swings. The hit is dealt on the
 * fire step; this is presentation only. PLACEHOLDER, like the flash.
 */
export const SWEEP_SECONDS = 0.18;
/**
 * The directions a sweep's arcs take, as turns from the facing: front, back,
 * left, right (G-044) — the line weapon's k order, in quarters. Its length is
 * the most arcs a sweep swings, whatever its level bonuses say.
 */
const SWEEP_TURNS = [0, Math.PI, -Math.PI / 2, Math.PI / 2] as const;

/**
 * XP from level `level` to the next. Fast early, steeper later, the survivors
 * shape: a first minute of rapid choices, then each level has to be earned.
 *
 * PLACEHOLDER (Conception's `provisional` names it). The three slopes and the
 * breakpoints were chosen to be cheaper than the old `round(5 + L*4.5)` for
 * the first levels and continuous at each break, and for nothing else. A
 * person playing at the link is what moves them.
 */
export function xpToNextLevel(level: number): number {
  if (level < 10) return 2 + 3 * level; // 5, 8, 11 ... 29
  if (level < 25) return 29 + 5 * (level - 9); // 34 ... 104
  return 104 + 7 * (level - 24); // 111, 118 ...
}

export interface EnemyState {
  /** Monotonic. Lets a piercing shot avoid re-hitting without a Set per shot. */
  uid: number;
  hitBySerial: number;
  /** The same for one-shot areas. Shared with shots, a shot landing mid-burst re-armed the burst (AUDIT part four, 24). */
  hitByAreaSerial: number;
  def: EnemyDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  age: number;
  hitFlash: number;
  /**
   * Size and worth, per instance rather than per definition.
   *
   * They were read off `def` everywhere until homework arrived, and homework
   * merges: two piles become one larger pile, so an enemy's radius, drawn
   * size and XP stop being properties of its kind. Every other enemy in the
   * game initialises these from its def and never changes them, so nothing
   * about Conception moves.
   */
  radius: number;
  displaySize: number;
  xp: number;
  /**
   * `def.ranged` only (the substitute, §3.5): seconds left in the current
   * consult, zero when it is not consulting, and seconds before it may begin
   * another. Every other enemy carries two zeros and never reads them.
   */
  consult: number;
  reload: number;
  /**
   * `def.weakPoint` only (the group project, COLLEGE-ROSTER §3.4): which of
   * the four quadrants about its centre holds all its hp, 0–3, rolled at
   * spawn from the world's dice (`addEnemy`). Quadrant k covers bearings
   * [k·π/2, (k+1)·π/2) from the centre, by `Math.atan2`. Absent on every
   * other enemy, which every hit reads as "anywhere counts" (`hitsWeakPoint`).
   */
  weakQuadrant?: number;
}

export interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  radius: number;
  /** Shots aimed at the player: the boss's, and a `ranged` enemy's. */
  hostile: boolean;
  /**
   * The enemy that fired a hostile shot, so a death to it names that enemy
   * on the certificate. Absent on the boss's shots, which name the boss.
   */
  owner?: EnemyDef;
  /**
   * The item id that fired this, or 'boss'. Presentation metadata: the
   * renderer draws a Lash shot and a Motility shot as different objects, and
   * radius/pierce heuristics are a bug waiting to happen. Optional so tests
   * and tools that hand-build projectiles are not forced to care.
   */
  source?: string;
  /** Identifies this shot to enemies it has already hit. */
  serial: number;
  /** On an enemy hit, jump to this many more nearby enemies. Absent is 0. */
  chain?: number;
  /** An enemy this shot passes through without hitting: where a chain left from. */
  skipUid?: number;
}

/**
 * One weapon's merged bonus (`World.bonusFor`) and the levels it was folded
 * at, which every read compares against the live ones.
 */
interface MergedBonus {
  def: ActiveItem;
  level: number;
  /** The offer id of each of `def.paths`, in order. Made once, never per read. */
  keys: string[];
  /** Each path's level when `bonus` was folded, in the same order. */
  at: number[];
  bonus: Required<LevelBonus>;
}

/**
 * Something circling the player. Recomputed from `time` every step, so it is
 * deterministic and has no state of its own; the renderer reads positions.
 */
export interface OrbiterState {
  x: number;
  y: number;
  /** The item this belongs to. */
  source: string;
  radius: number;
}

/**
 * An aura's ring around the player (Personal Space, G-044), this step. Pooled
 * and rebuilt every step like the orbiters; the renderer reads it.
 */
export interface AuraState {
  x: number;
  y: number;
  /** Honest: the radius the sim hurts within, bonuses and reach applied. */
  radius: number;
  /** The item this belongs to. */
  source: string;
}

/**
 * One arc a sweep swung (Backhand, G-044). Its hit was dealt on the step it
 * swung; this lives `seconds` so the renderer can draw where it went.
 */
export interface SweepState {
  /** Where the player stood when it swung. */
  x: number;
  y: number;
  /** The arc's centre line, radians. */
  angle: number;
  /** Pixels, bonuses and reach applied. */
  reach: number;
  /** Full width, radians. */
  arc: number;
  age: number;
  seconds: number;
  source: string;
}

export interface RingState {
  x: number;
  y: number;
  age: number;
  seconds: number;
  maxRadius: number;
  damage: number;
  /** What burst. Optional so hand-built rings in tests need not care. */
  cause?: EnemyDef;
}

/**
 * What the certificate says. Set once, when the run ends either way.
 *
 * A run is one life (D-024), so the win is also a death — of natural causes,
 * at the end of the last act — and it gets the same record as any other. The
 * renderer prints it; the bots tally it. Age is read off the act's declared
 * years at the moment it happened.
 */
export interface Certificate {
  outcome: 'died' | 'won';
  actId: string;
  actName: string;
  /** Index of the act it happened in; how far the life got. */
  actIndex: number;
  age: number;
  /** Enemy id, 'boss', 'someone-else' (the race was lost) or 'natural-causes'. */
  causeId: string;
  /** What the certificate prints after "of". */
  cause: string;
}

/** The thing that hurt the player, carried to `die` so the certificate can name it. */
type Cause = EnemyDef | 'boss' | 'someone-else';

export interface AreaState {
  x: number;
  y: number;
  age: number;
  seconds: number;
  radius: number;
  damage: number;
  /** Attractors pull instead of hurting. */
  pull: boolean;
  /**
   * A field (Snooze): enemies, projectiles and the player whose centre is
   * inside it move at this fraction of their speed. Absent on every other
   * area. It neither pulls nor hurts.
   */
  slow?: number;
  /**
   * True for a lingering field, false for a one-shot burst.
   *
   * Ticking damage is scaled by dt, so a short-lived area was delivering a
   * fraction of its listed damage while a long-lived one delivered many times
   * it: Acrosome's 0.12s burst landed 0.72x its number and Wake's 2.4s trail
   * landed 14.4x. That is not a balance problem, it is two different effects
   * sharing one formula.
   */
  tick: boolean;
  /** One-shot areas hit each enemy once. Reuses the projectile serial trick. */
  serial: number;
  /** Pixels a hit pushes a non-boss enemy away from the player. */
  knockback?: number;
  /**
   * A strike (Judgement, G-044): seconds until it lands. While above zero
   * nothing is hurt and `age` does not run; on landing it deals its one hit
   * (`landStrike`) and then stays at zero, so the renderer and the boss's area
   * pass can tell a strike from a burst for its whole life. Absent on every
   * other area.
   */
  delay?: number;
  /** The item that made this area, where one did and the renderer needs it. Presentation metadata. */
  source?: string;
}

export interface GemState {
  x: number;
  y: number;
  value: number;
}

export interface BossState {
  /** The act's `boss.kind`, copied at spawn so a renderer need not look it up. */
  kind: BossDef['kind'];
  x: number;
  y: number;
  /**
   * For the Loan, the balance: it opens at 1/`cap` of `maxHp` and compounds
   * toward it, so a bar drawn as hp/maxHp starts part full and fills — the
   * filling is the fight. For every other kind, health left.
   */
  hp: number;
  /** For the Loan, the cap: `cap` × the opening balance, where it forecloses. */
  maxHp: number;
  /**
   * `idle` → `telegraph` → `attack`, then back. For the Gym Teacher the
   * telegraph is the whistle rising and `attack` begins on the step it blows;
   * for Prom it is the lights going down and `attack` begins on the ring;
   * for the Loan it is the tape jerking and `attack` begins on the statement.
   * The exit, for every kind, is `absorbing`: the word is the Egg's, and it
   * means the outcome has latched (G-033) and `finishAct` follows the timer —
   * the Gym Teacher's stopwatch click and `ActDef.endWord` play in it.
   */
  phase: 'idle' | 'telegraph' | 'attack' | 'absorbing';
  /** Seconds left in the current phase. */
  timer: number;
  /**
   * True while it cannot be damaged: the Gym Teacher with any of his
   * `enemyId` alive on the field (§9); Prom with the player farther than its
   * `floorRadius` from the ball (ADOLESCENCE-ROSTER §4). Always false for the
   * Egg and the Loan. Plain state for the renderer and the bots; the sim reads
   * the field and the player itself.
   */
  shielded: boolean;
  /**
   * Rings of spots Prom has fired this act. Ring n leaves at bearings
   * (n/2 + i) × 2π/spots, so each is turned half a spacing from the last; a
   * renderer turning the ball's facets with the light can read the same
   * count. Zero for the kinds that fire no ring.
   */
  rings: number;
  /**
   * The Loan's interest clock: seconds until its balance next compounds,
   * counting down from `interestSeconds`, set at spawn and carried (never
   * reset) at each tick. Read-only outside the sim; a renderer that wants the
   * tape to jerk on the tick sees it wrap upward between two frames, and
   * 1 − interestIn/interestSeconds is the progress to the next one. Zero for
   * the kinds that never compound.
   */
  interestIn: number;
}

export interface Input {
  moveX: number;
  moveY: number;
}

export interface WorldOptions {
  /**
   * The life, in order. One act is a life of one act, and that is the browser
   * today (`ACTS`); the bots run `ALL_ACTS`. `act` is the older spelling and
   * means `acts: [act]`; every existing caller and test uses it and nothing
   * about a one-act run changed when the sequence arrived.
   */
  acts?: ActDef[];
  act?: ActDef;
  seed?: number;
  /** Items the run starts with. */
  startingItems?: string[];
  /**
   * Overrides the Egg's pull, for A/B experiments only.
   *
   * Exists so the pull can be isolated from everything else that changed in
   * the same pass. Not a difficulty setting — the shipped value is BOSS_PULL.
   */
  bossPull?: number;
  /**
   * Forces every enemy's entry point, for A/B experiments only.
   *
   * G-020 and G-019 landed together and §8.5 assumed they could not confound
   * each other. They can: antibody stacks cost speed, so moving where
   * antibodies arrive moves every policy's effective speed, and a slower
   * short-range build participates in the boss fight less. This isolates it.
   */
  spawnOverride?: 'edge' | 'lead';
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The drag curve, exported so the playtest report can convert stack counts
 * into experienced speed without duplicating the formula.
 *
 * A ratio of stack counts is only meaningful if both terms sit where the
 * quantity still maps to player experience (G-026). Reading dispersion off
 * raw counts is what let §8.4 pass while measuring nothing.
 */
export function antibodyDragFor(stacks: number): number {
  return ANTIBODY_FLOOR + (1 - ANTIBODY_FLOOR) / (1 + stacks * ANTIBODY_DRAG_K);
}

/**
 * The playfield, in world pixels.
 *
 * Lives here rather than in `config.ts` because the boss needs it and the
 * simulation must stay Node-safe for the bots. `config.ts` re-exports these.
 *
 * The player is clamped to these inside `step()` — see `clampPlayer`. It used
 * to be done by `ActScene` afterwards, which gave the bots a field with no
 * walls and measurably distorted every baseline (AUDIT.md finding 11).
 */
export const ARENA_WIDTH = 3200;
export const ARENA_HEIGHT = 2200;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Removes index `i` in O(1). Reorders the array — walk backwards. */
function swapRemove<T>(arr: T[], i: number): void {
  const last = arr.pop()!;
  if (i < arr.length) arr[i] = last;
}

/**
 * Whether a hit at (x, y) on `e` counts (COLLEGE-ROSTER §3.4, the group
 * project). Always, for an enemy with no weak point. Otherwise only when the
 * bearing from its centre to (x, y) falls in `e.weakQuadrant` — a shot by
 * where it strikes, an orbiter by where it is, a sweep by where the player
 * swung from — or, for an area, when (x, y) is within `cover` of its centre:
 * an area over the centre covers all four, and one that only reaches the rim
 * lands on the side facing its own centre. A hit that does not count does
 * nothing and does not flash; the callers skip it whole.
 */
export function hitsWeakPoint(e: EnemyState, x: number, y: number, cover = 0): boolean {
  const q = e.weakQuadrant;
  if (q === undefined) return true;
  const dx = x - e.x;
  const dy = y - e.y;
  if (cover > 0 && dx * dx + dy * dy <= cover * cover) return true;
  let bearing = Math.atan2(dy, dx);
  if (bearing < 0) bearing += Math.PI * 2;
  // `& 3`: a bearing a hair under zero wraps to exactly 2π, which is quadrant 0.
  return (Math.floor(bearing / (Math.PI / 2)) & 3) === q;
}

export class World {
  /** The acts this life passes through, in order. */
  readonly life: readonly ActDef[];
  /** Which act is playing. Advances when a boss falls; never goes back. */
  actIndex = 0;
  /** Seconds into the current act. `time` is the whole life. */
  actTime = 0;
  readonly seed: number;
  private readonly rng: () => number;
  private streams: Map<string, SpawnWave[]>;
  private readonly accumulators = new Map<string, number>();
  private readonly cooldowns = new Map<string, number>();
  private readonly grid = new Grid<EnemyState>();
  /** Reused query buffer. The hot path must not allocate. */
  private readonly near: EnemyState[] = [];
  /**
   * Solid enemies, refilled during the movement pass each step.
   *
   * Rebuilt rather than maintained, for the reason `Grid` gives: there is no
   * stale state to get wrong, and a pile killed last step cannot be pushed
   * out of by this one.
   */
  private readonly solids: EnemyState[] = [];
  /**
   * The widest enemy alive, for query padding.
   *
   * Every grid query padded by a flat 64px, which was true of every enemy in
   * Conception and stops being true the moment two homework piles merge: a
   * shot aimed at the edge of a 90px pile would be looked up in cells the
   * pile is not in and pass through it.
   */
  private maxEnemyRadius = 0;
  private nextUid = 1;
  private nextSerial = 1;
  private bossHitSerial = 0;
  /** A second query buffer, for a lookup made while `near` is being walked. */
  private readonly near2: EnemyState[] = [];
  /** Snooze fields this pass, so 1500 movers do not each walk every area. */
  private readonly fields: AreaState[] = [];
  /** Bursts owed an echo: which item, and at what life-clock time. */
  private echoes: { id: string; at: number }[] = [];
  /**
   * When each orbiter last hit each enemy, per item: key uid*64+orbiter index.
   * Pruned when it grows; an entry older than the item's cooldown means nothing.
   */
  private readonly orbitHits = new Map<string, Map<number, number>>();
  private readonly orbitBossHits = new Map<string, Map<number, number>>();
  /** Orbiter objects, reused across steps; `orbiters` holds this step's. */
  private readonly orbiterPool: OrbiterState[] = [];
  /**
   * `bonusFor`'s cache, per weapon id. Validated on every read by comparing
   * the weapon's level and each path's level with the ones it was folded at
   * (numbers; the offer ids are made once), not by a version counter: the dev
   * panel and tests write `items` and `pathLevels` directly, and a counter
   * only sees writes that go through the sim.
   */
  private readonly mergedBonus = new Map<string, MergedBonus>();
  /** Where each trail item last dropped an area, for WAKE_MIN_SPACING. Per act. */
  private readonly trailDrops = new Map<string, { x: number; y: number }>();
  /**
   * When each enemy may next be hurt by each aura item, keyed by uid: the
   * time, not the last hit, so a continuous re-hit carries its overshoot and
   * the rate is the same at every frame rate (AUDIT 23). Pruned when large.
   */
  private readonly auraHits = new Map<string, Map<number, number>>();
  /** The same for the boss, per aura item. */
  private readonly auraBossHits = new Map<string, number>();
  /** Aura rings, reused across steps; `auras` holds this step's. */
  private readonly auraPool: AuraState[] = [];
  /** Uids one sweep has hit, so overlapping arcs hit an enemy once. Reused. */
  private readonly swept = new Set<number>();
  /** A strike's candidates, reused. Emptied after every pick. */
  private readonly strikeCandidates: EnemyState[] = [];

  /**
   * The life clock, in seconds. Assigning it moves the ACT clock by the same
   * amount, so "skip to the boss" in the dev panel and the tests' `w.time =
   * durationSeconds` still do what they say in the first act and mean "jump
   * the clock" in a later one. `step` advances both directly.
   */
  private _time = 0;
  get time(): number {
    return this._time;
  }
  set time(value: number) {
    this.actTime += value - this._time;
    this._time = value;
  }
  dead = false;
  won = false;
  /** Set when the run ends, for the bots' report. */
  outcome: 'alive' | 'died' | 'won' = 'alive';
  /** The record of how it ended. Null while alive. */
  certificate: Certificate | null = null;
  /** The enemy whose engulf is ticking, so a death to it can be named. */
  private engulfBy: EnemyDef | null = null;

  /**
   * Set to the middle of the arena by the constructor.
   *
   * These defaulted to (0, 0) and only `ActScene` moved the player to the
   * centre, so every bot run started in the top-left CORNER. With no walls in
   * the simulation that was invisible; adding them made it a real handicap and
   * it broke two tests that had been passing only because the player could
   * flee off the field forever.
   */
  x = 0;
  y = 0;
  facingX = 1;
  facingY = 0;
  hp = PLAYER_BASE_HP;
  invulnerable = 0;
  engulfTimer = 0;
  engulfSlow = 1;
  engulfDps = 0;
  dragStacks = 0;
  /**
   * Worn stacks whose attach carries a `tax` (tuition, COLLEGE-ROSTER §3.3),
   * and what they leave of every gem: the product of (1 − tax) over each one,
   * multiplied in as it is worn. Read through `taxStacks` and `xpTax`.
   */
  private taxedStacks = 0;
  private xpTaxFactor = 1;
  /**
   * The part of `dragStacks`, `taxedStacks` and `xpTaxFactor` that crosses
   * (`attach.persists`): restored at every crossing instead of zero. Per
   * life; nothing takes it off.
   */
  private persistentStacks = 0;
  private persistentTaxedStacks = 0;
  private persistentTaxFactor = 1;
  /**
   * Seconds left of a `contactStun` (the hall monitor, §3.4). While it runs
   * `movePlayer` ignores input. Refreshed by a touch, never extended past it.
   */
  stunTimer = 0;
  /**
   * Where the player has been: a ring of (time, x, y), one sample every
   * TRAIL_SAMPLE_SECONDS, for `spawnAt: 'trail'`. Typed arrays so the step
   * that writes it does not allocate.
   */
  private readonly trailT = new Float64Array(TRAIL_CAPACITY);
  private readonly trailX = new Float64Array(TRAIL_CAPACITY);
  private readonly trailY = new Float64Array(TRAIL_CAPACITY);
  /** Next slot to write. */
  private trailHead = 0;
  private trailCount = 0;

  level = 1;
  xp = 0;
  xpToNext = xpToNextLevel(1);
  kills = 0;
  /** Levels reached but not yet spent. See `presentOffers`. */
  private pendingLevels = 0;
  /** Non-null while a level-up is waiting. The world does not advance. */
  offers: string[] | null = null;
  readonly items = new Map<string, number>();
  /**
   * G-043: each weapon path's level, keyed by its offer id (`grudge/company`),
   * levelled apart from the weapon and folded into its bonus by `bonusFor`.
   * Read-only outside the sim (the renderer draws pips from it); the dev
   * panel and tests may write it, and the next read of the bonus sees that.
   */
  readonly pathLevels = new Map<string, number>();
  /**
   * The Egg's drop (G-017, G-042): dealt once, from `rng`, at the first
   * crossing, and kept for every act after it. Null in Conception. Its stat
   * line goes through `passiveProduct`, its XP price through `xpCost`, and
   * its unasked levels through `takeUnaskedLevels` — the paths the items use.
   */
  inheritance: InheritanceDef | null = null;

  enemies: EnemyState[] = [];
  projectiles: ProjectileState[] = [];
  rings: RingState[] = [];
  areas: AreaState[] = [];
  gems: GemState[] = [];
  /** Everything circling the player this step. Read-only outside the sim. */
  orbiters: OrbiterState[] = [];
  /** Every aura ring around the player this step (G-044). Read-only outside the sim. */
  readonly auras: AuraState[] = [];
  /** Arcs swung in the last SWEEP_SECONDS, for drawing (G-044). Read-only outside the sim. */
  readonly sweeps: SweepState[] = [];
  boss: BossState | null = null;
  /**
   * Racers that reached the boss this act (`ActDef.race`). Reset per act.
   * Read by the renderer against `raceTarget`.
   */
  raceAbsorbed = 0;

  readonly bossPull: number;
  readonly spawnOverride: 'edge' | 'lead' | undefined;

  constructor(options: WorldOptions) {
    const life = options.acts ?? (options.act ? [options.act] : []);
    if (life.length === 0) throw new Error('A World needs at least one act');
    this.life = life;
    this.bossPull = options.bossPull ?? BOSS_PULL;
    this.spawnOverride = options.spawnOverride;
    this.seed = options.seed ?? 1;
    this.rng = mulberry32(this.seed);
    this.streams = spawnStreams(this.act.waves);
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;
    for (const id of options.startingItems ?? ['lash']) this.items.set(id, 1);
  }

  /** The act that is playing. */
  get act(): ActDef {
    return this.life[this.actIndex]!;
  }

  /**
   * The act's race, if its boss is one that is raced for: the Egg (G-006) and
   * Prom, which borrows it (ADOLESCENCE-ROSTER §4). A `race` declared beside
   * any other boss is read as absent, so the someone-else loss cannot reach
   * an act whose boss nobody swims to. Every reader of the race goes through
   * this.
   */
  private get race(): ActDef['race'] {
    const kind = this.act.boss.kind;
    return kind === 'egg' || kind === 'prom' ? this.act.race : undefined;
  }

  /** How many racers reaching the boss loses the act; 0 when it has no race. */
  get raceTarget(): number {
    return this.race?.absorb ?? 0;
  }

  /**
   * True for an enemy swimming for the boss rather than the player: the act
   * has a race, the boss is up, and this is the racing kind. Derived rather
   * than flagged at spawn, so it cannot disagree with the act it is in.
   */
  private isRacing(e: EnemyState): boolean {
    const race = this.race;
    return this.boss !== null && race !== undefined && e.def.id === race.enemyId;
  }

  /** How many acts the life has got through, not counting the one playing. */
  get actsCleared(): number {
    return this.actIndex;
  }

  /**
   * Age, in the act's declared years, read off the act clock.
   *
   * Presentation and the certificate use it; nothing in the rules does. The
   * boss phase holds at the act's last year, which is where the boss is.
   */
  get age(): number {
    const { from, to } = this.act.age;
    const progress = Math.min(1, this.actTime / this.act.durationSeconds);
    return from + (to - from) * progress;
  }

  // --- derived stats ----------------------------------------------------

  /**
   * Product of a passive multiplier across every level the player owns, and
   * the inheritance, which is one level of a passive nobody chose (G-042).
   */
  private passiveProduct(pick: (d: StatLine) => number): number {
    let out = 1;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || def.kind !== 'passive') continue;
      out *= pick(def) ** level;
    }
    if (this.inheritance) out *= pick(this.inheritance.stats);
    return out;
  }

  get maxHp(): number {
    return PLAYER_BASE_HP * this.passiveProduct((d) => d.healthMultiplier);
  }

  /**
   * Speed multiplier from attached antibodies (G-025).
   *
   * Approaches ANTIBODY_FLOOR asymptotically and never reaches it, so every
   * additional stack costs something and no count is a cliff.
   */
  get antibodyDrag(): number {
    return antibodyDragFor(this.dragStacks);
  }

  /**
   * What a gem is worth to the player, as a share of its value: 1 until an
   * invoice is worn, then (1 − tax) per taxed stack, compounding (§3.3; two
   * tuition leave 0.92²). Applied where XP is collected (`updateGems`,
   * `beginAct`), never to the gem's own `value`.
   */
  get xpTax(): number {
    return this.xpTaxFactor;
  }

  /** Worn stacks that carry a tax, for the HUD and the Loan's opening balance. */
  get taxStacks(): number {
    return this.taxedStacks;
  }

  /**
   * Speed from items alone — no antibody drag, no engulf.
   *
   * The exogenous half of the player's speed: what the build chose, rather
   * than what happened to it. Correlating stacks against *realised* speed is
   * circular, because stacks are one of the things that lowers realised speed.
   * This is the variable §9.3's speed hypothesis is actually about.
   */
  get itemSpeed(): number {
    return PLAYER_BASE_SPEED * this.passiveProduct((d) => d.speedMultiplier);
  }

  /** Movement speed ignoring transient effects. The pull is measured against this. */
  get baseSpeed(): number {
    return PLAYER_BASE_SPEED * this.passiveProduct((d) => d.speedMultiplier) * this.antibodyDrag;
  }

  get speed(): number {
    return this.baseSpeed * (this.engulfTimer > 0 ? this.engulfSlow : 1) * this.slowAtPlayer();
  }

  /**
   * The player's own hold: every field that holds them (Snooze's) but never
   * a damaging trail (Rut's, G-046), which is laid where the player stands
   * and would otherwise hold them for as long as they kept moving. A trail
   * holds what follows; the player walks it at full speed.
   */
  private slowAtPlayer(): number {
    let k = 1;
    for (const f of this.areas) {
      if (f.slow === undefined || f.slow >= k || f.damage > 0) continue;
      if ((this.x - f.x) ** 2 + (this.y - f.y) ** 2 <= f.radius * f.radius) k = f.slow;
    }
    return k;
  }

  /**
   * Growth Spurt: the player's collision radius. Every contact the sim
   * resolves against the player reads this — enemies (engulf and attach
   * among them), hostile shots, rings, piles, and the gem pickup.
   */
  get playerRadius(): number {
    // Partial: the inheritance's stat line carries neither field, and reads 1.
    return PLAYER_RADIUS * this.passiveProduct((d: Partial<PassiveItem>) => d.sizeMultiplier ?? 1);
  }

  /** Growth Spurt: every active item's reach, multiplied (see `reachMultiplier`). */
  get reach(): number {
    return this.passiveProduct((d: Partial<PassiveItem>) => d.reachMultiplier ?? 1);
  }

  /**
   * The movement multiplier at a point: the slowest Snooze field whose area
   * holds it, 1 outside all of them. Slowest rather than product, so two
   * overlapping fields are one field and not a standstill. Reads `areas`
   * directly; the per-entity passes collect the fields once instead.
   */
  slowAt(x: number, y: number, fields: readonly AreaState[] = this.areas): number {
    let k = 1;
    for (const f of fields) {
      if (f.slow === undefined || f.slow >= k) continue;
      if ((x - f.x) ** 2 + (y - f.y) ** 2 <= f.radius * f.radius) k = f.slow;
    }
    return k;
  }

  /** The live Snooze fields, into a reused buffer, for a pass over many movers. */
  private collectFields(): AreaState[] {
    this.fields.length = 0;
    for (const a of this.areas) if (a.slow !== undefined) this.fields.push(a);
    return this.fields;
  }

  get damageTaken(): number {
    return this.passiveProduct((d) => d.damageTakenMultiplier);
  }

  /** Capacitation: below baseline early, well above it late. Per act. */
  get damageDealt(): number {
    const progress = Math.min(1, this.actTime / this.act.durationSeconds);
    let out = 1;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || def.kind !== 'passive') continue;
      const at = def.damageMultiplier + (def.rampTo - def.damageMultiplier) * progress;
      out *= at ** level;
    }
    return out;
  }

  /** Restlessness: every active item's cooldown, multiplied. */
  get cooldownFactor(): number {
    return this.passiveProduct((d) => d.cooldownMultiplier);
  }

  /** Appetite: how far away a gem starts coming to the player. */
  get magnetRadius(): number {
    return MAGNET_RADIUS * this.passiveProduct((d) => d.pickupMultiplier);
  }

  private activeDamage(def: ItemDef, level: number): number {
    if (!isActive(def)) return 0;
    return def.damage * damageScale(scalingLevel(def, level)) * this.bonusFor(def, level).damage * this.damageDealt;
  }

  private activeCooldown(def: ItemDef, level: number): number {
    if (!isActive(def)) return Infinity;
    return (
      def.cooldown * cooldownScale(scalingLevel(def, level)) * this.bonusFor(def, level).cooldown * this.cooldownFactor
    );
  }

  /**
   * Everything a weapon's own levels and its paths' levels add, as one total
   * (G-043): the sim's only reading of a weapon's bonus. It runs every step
   * for an orbit and on every shot otherwise, so it allocates only when a
   * level has changed (AUDIT part three, 21) and otherwise returns the object
   * it returned last time. A weapon with no paths, or none taken, gets
   * `levelBonus` itself. Callers read it and never mutate it.
   */
  private bonusFor(def: ActiveItem, level: number): Required<LevelBonus> {
    const paths = def.paths;
    if (!paths || paths.length === 0) return levelBonus(def, level);
    let m = this.mergedBonus.get(def.id);
    if (!m || m.def !== def) {
      const keys = paths.map((p) => offerIdFor(def, p));
      m = { def, level: NaN, keys, at: keys.map(() => NaN), bonus: levelBonus(def, level) };
      this.mergedBonus.set(def.id, m);
    }
    let fresh = m.level === level;
    for (let i = 0; fresh && i < m.keys.length; i++) fresh = (this.pathLevels.get(m.keys[i]!) ?? 0) === m.at[i];
    if (fresh) return m.bonus;

    m.level = level;
    let bonus = levelBonus(def, level);
    let copied = false;
    for (let i = 0; i < paths.length; i++) {
      const owned = this.pathLevels.get(m.keys[i]!) ?? 0;
      m.at[i] = owned;
      if (owned <= 0) continue;
      // `levelBonus` is shared by every World: copy before the first fold.
      if (!copied) {
        bonus = { ...bonus };
        copied = true;
      }
      for (const l of paths[i]!.levels.slice(0, owned)) foldBonus(bonus, l);
    }
    m.bonus = bonus;
    return bonus;
  }

  // --- the step ---------------------------------------------------------

  step(dt: number, input: Input): void {
    // A pending level-up freezes the world. The choice is the only input.
    if (this.offers || this.dead || this.won) return;

    this._time += dt;
    this.actTime += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    this.movePlayer(dt, input);
    this.applyBossPull(dt);
    // Unconditional, and after every path that can move the player. Hanging it
    // off `movePlayer` meant a frame with no input did not clamp at all, so any
    // other way of setting a position escaped the field.
    this.clampPlayer();
    this.recordTrail();
    if (!this.boss) this.spawn(dt);
    this.moveEnemies(dt);
    this.resolveRace();
    if (this.dead) return;
    // Rebuilt after movement so every query this step sees current positions.
    this.grid.build(this.enemies);
    this.resolveSolids();
    this.applyAttractors(dt);
    // Aged before firing, so an arc swung this step is drawn from age zero.
    this.updateSweeps(dt);
    this.fireItems(dt);
    this.moveProjectiles(dt);
    this.updateRings(dt);
    this.updateAreas(dt);
    this.updateOrbiters();
    this.updateAuras(dt);
    this.updateGems(dt);
    this.resolveHits();
    this.resolveContact(dt);
    this.updateBoss(dt);
    // A gem collected earlier in the step the outcome latched opened an offer
    // `presentOffers` could not yet refuse; it goes back in the queue (AUDIT 29).
    if (this.offers && this.outcomeDecided) {
      this.offers = null;
      this.pendingLevels++;
    }

    if (!this.boss && this.actTime >= this.act.durationSeconds) this.spawnBoss();
  }

  private movePlayer(dt: number, input: Input): void {
    if (this.stunned(dt)) return;
    const len = Math.hypot(input.moveX, input.moveY);
    if (len === 0) return;
    const nx = input.moveX / len;
    const ny = input.moveY / len;
    this.facingX = nx;
    this.facingY = ny;
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }

  /**
   * The arena has walls, and they belong HERE.
   *
   * `ActScene` used to do this after `step()`, which meant the bots simulated a
   * field a player could walk out of forever. That is not a tidiness point: a
   * cornered player cannot keep running, and measuring it showed the bots were
   * playing a materially easier game — median survival 92s against 76s, 174
   * kills against 109, over thirty seeds of identical input. Every baseline
   * taken before this was biased in the same direction, and re-running them
   * moved the ranking of builds, not just the difficulty: motility fell 33% to
   * 8% because a cornered player fires into the wall they are facing.
   */
  private clampPlayer(): void {
    this.x = clamp(this.x, 0, ARENA_WIDTH);
    this.y = clamp(this.y, 0, ARENA_HEIGHT);
  }

  /**
   * G-015. Constant magnitude, no falloff, no dependence on the boss's health
   * or on anything the player does. The fight is an orbit. The Egg's alone:
   * the Gym Teacher never touches the player (§9), so `--pull` does not reach
   * School's fight.
   */
  private applyBossPull(dt: number): void {
    const b = this.boss;
    if (!b || b.kind !== 'egg') return;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    if (d < 1) return;
    this.x += ((b.x - this.x) / d) * this.bossPull * dt;
    this.y += ((b.y - this.y) / d) * this.bossPull * dt;
  }

  /** One concurrent stream per enemy, each with its own rate and accumulator. */
  private spawn(dt: number): void {
    for (const [enemyId, stream] of this.streams) {
      const rate = rateAt(stream, this.actTime);
      if (rate === 0) continue;
      const acc = (this.accumulators.get(enemyId) ?? 0) + rate * dt;
      let whole = Math.floor(acc);
      this.accumulators.set(enemyId, acc - whole);
      while (whole > 0 && this.enemies.length < MAX_ACTIVE_ENEMIES) {
        whole--;
        this.spawnEnemy(enemyId);
      }
    }
  }

  /**
   * Enemies that belong to the arena rather than to the player's neighbourhood
   * (SCHOOL-ROSTER.md §3).
   *
   * The distance cull exists so drifters that wandered off do not accumulate.
   * These three are the opposite case: a dodgeball bounces "indefinitely", a
   * hall monitor patrols end to end, and homework is the enemy that changes
   * the shape of the room. Culling any of them at 1600px would mean the room
   * quietly reset itself every time the player walked away from it.
   */
  private static belongsToArena(def: EnemyDef): boolean {
    return def.bounce === true || def.patrol === true || def.movement === 'static';
  }

  spawnEnemy(id: string): void {
    const def = enemyDef(id);
    let x: number;
    let y: number;

    if ((this.spawnOverride ?? def.spawnAt) === 'lead') {
      // G-020: already where the player is going. It does not pursue, steer or
      // react — the player's own forward motion does all the closing, which is
      // the most law-8-compliant behaviour available. It is also whyThisStage
      // made literal: the record was opened before they arrived.
      x = this.x + this.facingX * ANTIBODY_LEAD;
      y = this.y + this.facingY * ANTIBODY_LEAD;
      // What stays where it lands is held inside the arena (AUDIT 31): acne
      // spawned past a wall the player faced was never reachable again.
      if (def.movement === 'static') {
        x = clamp(x, def.radius, ARENA_WIDTH - def.radius);
        y = clamp(y, def.radius, ARENA_HEIGHT - def.radius);
      }
    } else if ((this.spawnOverride ?? def.spawnAt) === 'trail') {
      // SCHOOL-ROSTER §3.3: where the player has recently been. Merging below
      // happens on this point, so paper dropped behind a player who keeps
      // coming back the same way becomes one growing pile.
      const at = this.trailPosition();
      x = at.x;
      y = at.y;
      // An arrival inside the player's reach lands at its edge instead
      // (AUDIT 35): 95% of hormone hits were the hormone's first step, drawn
      // under the player. It still chases from there, so standing still is
      // still standing where it arrives — one step later, and seen.
      const reach = this.playerRadius + def.radius + 2;
      const ddx = x - this.x;
      const ddy = y - this.y;
      const dd = Math.hypot(ddx, ddy);
      if (dd < reach) {
        const nx = dd < 0.001 ? -this.facingX || 1 : ddx / dd;
        const ny = dd < 0.001 ? -this.facingY : ddy / dd;
        x = this.x + nx * reach;
        y = this.y + ny * reach;
      }
    } else {
      const angle = this.rng() * Math.PI * 2;
      x = this.x + Math.cos(angle) * SPAWN_RADIUS;
      y = this.y + Math.sin(angle) * SPAWN_RADIUS;
    }
    let vx = 0;
    let vy = 0;

    if (def.movement === 'cross') {
      // Aimed at where the player happens to be now, and never corrected.
      const d = Math.hypot(this.x - x, this.y - y) || 1;
      vx = ((this.x - x) / d) * def.speed;
      vy = ((this.y - y) / d) * def.speed;
    } else if (def.movement === 'drift') {
      // A current that crosses the arena. See D-019 for why this is not a
      // uniformly random heading.
      const inbound = Math.atan2(this.y - y, this.x - x);
      const spread = (this.rng() - 0.5) * DRIFT_SPREAD;
      vx = Math.cos(inbound + spread) * def.speed;
      vy = Math.sin(inbound + spread) * def.speed;
    }

    // Merge on arrival (SCHOOL-ROSTER.md §3.3). A pile that lands on an
    // existing pile does not become a second pile; the one already there gets
    // bigger, tougher and worth more.
    //
    // Conserving rather than choosing: the merged radius is area-preserving
    // (r = hypot(r1, r2)) and hp and XP are summed, so the paper that arrived
    // is the paper that is there. The roster says the merged shape is LARGER
    // and leaves the rest to playtest — "playtest owns the number, not the
    // shape" — and conservation is the only growth rule available that
    // introduces no free parameter for playtest to have to own.
    // A linear scan, deliberately: piles arrive rarely and the alternative is
    // the spatial grid, which holds LAST step's positions — a pile that landed
    // earlier in this same step would not be in it, and two piles would end up
    // on top of each other exactly when the act is at its busiest.
    if (def.merge) {
      for (const pile of this.enemies) {
        if (pile.def.id !== def.id || pile.hp <= 0) continue;
        if (Math.hypot(pile.x - x, pile.y - y) >= pile.radius + def.radius) continue;
        const grown = Math.hypot(pile.radius, def.radius);
        pile.displaySize *= grown / pile.radius;
        pile.radius = grown;
        pile.hp += def.hp;
        pile.xp += def.xp;
        return;
      }
    }

    this.addEnemy(def, x, y, vx, vy);
  }

  /**
   * The one constructor for an enemy on the field. `spawnEnemy` decides where
   * and how fast; the Gym Teacher's throw decides both itself; every field is
   * set here, so a thrown ball and a spawned one cannot differ in anything
   * but where they started.
   */
  private addEnemy(def: EnemyDef, x: number, y: number, vx: number, vy: number): EnemyState {
    const e: EnemyState = {
      uid: this.nextUid++,
      hitBySerial: 0,
      hitByAreaSerial: 0,
      def,
      x, y, vx, vy,
      hp: def.hp,
      age: 0,
      hitFlash: 0,
      radius: def.radius,
      displaySize: def.displaySize,
      xp: def.xp,
      consult: 0,
      reload: 0,
    };
    // Rolled for a weak point and for nothing else, so no other enemy draws
    // from the dice and every seed without one replays exactly as it did.
    if (def.weakPoint) e.weakQuadrant = Math.floor(this.rng() * 4);
    this.enemies.push(e);
    return e;
  }

  private moveEnemies(dt: number): void {
    this.solids.length = 0;
    this.maxEnemyRadius = 0;
    const fields = this.collectFields();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.radius > this.maxEnemyRadius) this.maxEnemyRadius = e.radius;
      if (e.def.merge) this.solids.push(e);

      // Snooze holds the walk and nothing else: fuses and consults keep time.
      const mdt = fields.length === 0 ? dt : dt * this.slowAt(e.x, e.y, fields);
      // Where it stood before this step's walk: a reversal below reflects at
      // most this step's travel past the edge, never distance it came in with.
      const fromX = e.x;
      const fromY = e.y;
      const ranged = e.def.ranged;
      if (ranged && this.consultClipboard(e, ranged, dt)) {
        // Standing still with the clipboard up. The consult is the telegraph
        // (§3.5), so it does not also walk through it.
      } else if (e.def.movement === 'chase' || this.isRacing(e)) {
        // The same steering either way; a racer's target is the boss (G-006).
        const racing = this.isRacing(e);
        const tx = racing ? this.boss!.x : this.x;
        const ty = racing ? this.boss!.y : this.y;
        const d = Math.hypot(tx - e.x, ty - e.y) || 1;
        e.x += ((tx - e.x) / d) * e.def.speed * mdt;
        e.y += ((ty - e.y) / d) * e.def.speed * mdt;
      } else if (e.def.movement !== 'static') {
        e.x += e.vx * mdt;
        e.y += e.vy * mdt;
      }

      // The arena edge, for the two enemies that have a relationship with it.
      //
      // The test is "past the bound AND still heading further out", not "past
      // the bound", because both of these enter from the spawn ring, which is
      // outside the arena more often than not. Without the second half a
      // dodgeball would turn around before it ever arrived.
      if (e.def.bounce === true || e.def.patrol === true) {
        const outX = (e.x < 0 && e.vx < 0) || (e.x > ARENA_WIDTH && e.vx > 0);
        const outY = (e.y < 0 && e.vy < 0) || (e.y > ARENA_HEIGHT && e.vy > 0);
        if (outX || outY) {
          // The overshoot is carried, not dropped (AUDIT part five, minor; part
          // four's 16 is the same rule for a cooldown): the enemy ends the step
          // as far inside the edge as it would have gone past it. Turning round
          // wherever the frame left it drove the overshoot twice, a lag of up
          // to two steps' travel per reversal, so a car's place on its line
          // depended on the frame rate. Capped at this step's travel, so an
          // enemy already outside is turned, never pulled in.
          const edgeX = e.vx > 0 ? ARENA_WIDTH : 0;
          const edgeY = e.vy > 0 ? ARENA_HEIGHT : 0;
          const pastX = outX ? Math.min(Math.abs(e.x - edgeX), Math.abs(e.x - fromX)) : 0;
          const pastY = outY ? Math.min(Math.abs(e.y - edgeY), Math.abs(e.y - fromY)) : 0;
          if (e.def.patrol === true) {
            // Reverse BOTH components: it comes back along the line it went
            // out on, which is what makes a patrol a line rather than a path.
            // The time since it first crossed, back along the line.
            const t = Math.max(
              pastX === 0 ? 0 : pastX / Math.abs(e.vx),
              pastY === 0 ? 0 : pastY / Math.abs(e.vy),
            );
            e.x -= 2 * e.vx * t;
            e.y -= 2 * e.vy * t;
            e.vx = -e.vx;
            e.vy = -e.vy;
          } else {
            // Reflect only the component that crossed, which is what makes a
            // bounce go somewhere new.
            if (outX) {
              e.x -= 2 * Math.sign(e.vx) * pastX;
              e.vx = -e.vx;
            }
            if (outY) {
              e.y -= 2 * Math.sign(e.vy) * pastY;
              e.vy = -e.vy;
            }
          }
        }
      }

      if (e.def.burst && e.age >= e.def.burst.fuseSeconds) {
        this.rings.push({
          cause: e.def,
          x: e.x,
          y: e.y,
          age: 0,
          seconds: e.def.burst.ringSeconds,
          maxRadius: e.def.burst.ringRadius,
          damage: e.def.burst.ringDamage,
        });
        swapRemove(this.enemies, i);
        continue;
      }

      if (
        e.def.movement !== 'chase' &&
        !World.belongsToArena(e.def) &&
        Math.hypot(e.x - this.x, e.y - this.y) > DESPAWN_RADIUS
      ) {
        swapRemove(this.enemies, i);
      }
    }
  }

  /**
   * The race (`ActDef.race`, G-006): a racer touching the boss's corona is
   * gone — no gem, no kill, it simply got there — and counts toward the act's
   * `absorb`. Reaching it is someone else's life, and the player's ends.
   * Nothing counts once the outcome is decided (G-033's latch).
   */
  private resolveRace(): void {
    const b = this.boss;
    const race = this.race;
    if (!b || !race || this.outcomeDecided) return;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.def.id !== race.enemyId || e.hp <= 0) continue;
      const r = BOSS_RADIUS + e.radius;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > r * r) continue;
      swapRemove(this.enemies, i);
      this.raceAbsorbed++;
      if (this.raceAbsorbed >= race.absorb) {
        this.die('someone-else');
        return;
      }
    }
  }

  /**
   * Homework is solid, to the player and to everything else (§3.3).
   *
   * Position-based rather than force-based: an overlapping mover is placed on
   * the pile's edge along the line it came in on. A pile does not push back
   * over time, it is simply somewhere you are not, which is the whole content
   * of "by minute four the room the player started in is a corridor".
   *
   * Costs nothing in an act with no piles: `solids` is filled during the
   * movement pass that was already walking the array, and this returns on the
   * first line.
   */
  private resolveSolids(): void {
    if (this.solids.length === 0) return;
    const body = this.playerRadius;

    for (const s of this.solids) {
      if (s.hp <= 0) continue;

      const need = s.radius + body;
      const dx = this.x - s.x;
      const dy = this.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < need) {
        // A pile that lands exactly on the player has no direction to push
        // them; any consistent one will do, and this one is deterministic.
        if (d < 0.001) this.x = s.x + need;
        else {
          this.x = s.x + (dx / d) * need;
          this.y = s.y + (dy / d) * need;
        }
      }

      this.grid.query(s.x, s.y, s.radius + this.maxEnemyRadius, this.near);
      for (const e of this.near) {
        // Piles do not push each other: merging is what happens when two of
        // them meet, and it happens on arrival.
        if (e === s || e.def.merge === true || e.hp <= 0) continue;
        const r = s.radius + e.radius;
        const ex = e.x - s.x;
        const ey = e.y - s.y;
        const ed = Math.hypot(ex, ey);
        if (ed >= r) continue;
        if (ed < 0.001) {
          e.x = s.x + r;
        } else {
          e.x = s.x + (ex / ed) * r;
          e.y = s.y + (ey / ed) * r;
        }
      }
    }

    // Pushing the player off a pile can push them off the field.
    this.clampPlayer();
  }

  /**
   * Attractors pull the crowd toward a point. Chemotaxis is the only thing in
   * the act that moves an enemy against its own behaviour.
   *
   * Driven from the areas rather than from the enemies: there are a handful of
   * areas and up to 1500 enemies, so asking "who is near this attractor" is
   * cheap and asking every enemy "is any attractor near me" is not.
   *
   * It pulls the crowd, not the room (AUDIT 28). A pile, a patrol line and
   * anything `static` are the arena's shape (SCHOOL-ROSTER §3); pulled, two
   * piles ended 1px apart unmerged (merging is on arrival only) and a patrol
   * line stayed moved for the rest of the act. Chasers, drifters and crossers
   * still come, the dodgeball among them: it has a heading, and bending one
   * is what the pull is for.
   */
  private applyAttractors(dt: number): void {
    for (const a of this.areas) {
      if (!a.pull) continue;
      this.grid.query(a.x, a.y, a.radius, this.near);
      for (const e of this.near) {
        if (e.def.merge === true || e.def.patrol === true || e.def.movement === 'static') continue;
        const d = Math.hypot(a.x - e.x, a.y - e.y);
        if (d > a.radius || d < 1) continue;
        const strength = (1 - d / a.radius) * 130 * dt;
        e.x += ((a.x - e.x) / d) * strength;
        e.y += ((a.y - e.y) / d) * strength;
      }
    }
  }

  /** The boss as a seeking target, if it exists and is in range of its edge. */
  private bossAsTarget(within: number): { x: number; y: number } | null {
    const b = this.boss;
    if (!b || b.phase === 'absorbing') return null;
    const d = Math.hypot(b.x - this.x, b.y - this.y);
    return d - BOSS_RADIUS <= within ? { x: b.x, y: b.y } : null;
  }

  /** Grid padding: the flat 64 was every enemy in Conception, and is not every pile. */
  private get queryPad(): number {
    return this.maxEnemyRadius > 64 ? this.maxEnemyRadius : 64;
  }

  /**
   * Up to `n` distinct enemies within range, nearest first, into `out`.
   * Selection by repeated scan: n is a handful and the neighbourhood is small.
   */
  private nearestEnemies(within: number, n: number, out: EnemyState[]): EnemyState[] {
    out.length = 0;
    this.grid.query(this.x, this.y, within, this.near);
    const limit = within * within;
    for (let k = 0; k < n; k++) {
      let best: EnemyState | null = null;
      let bestD = limit;
      for (const e of this.near) {
        // Not at what it cannot hurt: a shot spent on an antibody passes
        // through it and is gone (AUDIT part three, 22), and acne never
        // leaves, so one spot on the floor blocked Prom (AUDIT 32).
        if (e.def.invulnerable || out.includes(e)) continue;
        const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
        if (d2 < bestD) {
          bestD = d2;
          best = e;
        }
      }
      if (!best) break;
      out.push(best);
    }
    return out;
  }

  private fireItems(dt: number): void {
    // Echoes first: a burst owed from 0.25s ago goes off where the player is
    // now, if the item that owed it is still held (an evolution removes it).
    for (let i = this.echoes.length - 1; i >= 0; i--) {
      const echo = this.echoes[i]!;
      if (echo.at > this._time) continue;
      swapRemove(this.echoes, i);
      const level = this.items.get(echo.id);
      const def = ITEMS[echo.id];
      if (!level || !def || !isActive(def)) continue;
      this.burst(def, level, this.activeDamage(def, level));
    }

    for (const [id, level] of this.items) {
      const def = itemDef(id);
      if (!isActive(def)) continue;
      // Orbiters do not activate; they are always there (updateOrbiters).
      if (def.mode === 'orbit') continue;
      // Nor does an aura (updateAuras).
      if (def.mode === 'aura') continue;

      const remaining = (this.cooldowns.get(id) ?? 0) - dt;
      if (remaining > 0) {
        this.cooldowns.set(id, remaining);
        continue;
      }

      const damage = this.activeDamage(def, level);
      const fired = this.fireOne(def, level, damage);
      // `remaining` is the overshoot (<= 0) and carries, or the rate depends on the frame rate (AUDIT part four, 23).
      this.cooldowns.set(id, remaining + (fired ? this.activeCooldown(def, level) : 0.1));
    }
  }

  /** Returns false if the item had nothing to do, so it retries sooner. */
  private fireOne(def: ItemDef, level: number, damage: number): boolean {
    if (!isActive(def)) return false;
    // What the levels owned add (items.ts `levels`, and its paths' levels).
    // Generic: no item is named below, only the bonus fields.
    const bonus = this.bonusFor(def, level);
    const radius = def.radius * bonus.area;
    const pierce = def.pierce + bonus.pierce;
    // Growth Spurt. A shot's range, a pull's or a field's radius; the burst
    // applies it in `burst`, the orbit in `updateOrbiters`, a trail has none.
    const reach = this.reach;

    switch (def.mode) {
      case 'seeking': {
        // The boss is a target. It was not, and that meant Lash — the weapon
        // every run starts with — could not touch the Egg at all: with normal
        // spawning stopped there was often nothing in `enemies`, so a seeking
        // weapon simply never fired. It only ever hit the boss by accident,
        // when a shot aimed at a rival happened to pass through it.
        //
        // Extra shots go to DISTINCT next-nearest targets; with fewer enemies
        // than shots, the boss takes one, and the rest are not fired.
        const want = 1 + bonus.projectiles;
        const range = def.range * reach;
        const targets: { x: number; y: number }[] = this.nearestEnemies(range, want, []);
        if (targets.length < want) {
          const boss = this.bossAsTarget(range);
          if (boss) targets.push(boss);
        }
        if (targets.length === 0) return false;
        const speed = def.projectileSpeed * bonus.speed;
        for (const target of targets) {
          const d = Math.hypot(target.x - this.x, target.y - this.y) || 1;
          this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: ((target.x - this.x) / d) * speed,
            vy: ((target.y - this.y) / d) * speed,
            life: range / speed,
            damage,
            pierce,
            radius,
            hostile: false,
            source: def.id,
            serial: this.nextSerial++,
            chain: bonus.chain,
          });
        }
        return true;
      }
      case 'line': {
        // Along the player's facing, whatever is there. Extra shots: first
        // straight backwards, then pairs either side of forward, 15° apart.
        const facing = Math.atan2(this.facingY, this.facingX);
        const speed = def.projectileSpeed * bonus.speed;
        for (let k = 0; k <= bonus.projectiles; k++) {
          let angle = facing;
          if (k === 1) angle += Math.PI;
          else if (k > 1) {
            const pair = Math.floor(k / 2);
            angle += (k % 2 === 0 ? 1 : -1) * pair * ((15 * Math.PI) / 180);
          }
          this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: (def.range * reach) / speed,
            damage,
            pierce,
            radius,
            hostile: false,
            source: def.id,
            serial: this.nextSerial++,
          });
        }
        return true;
      }
      case 'burst': {
        this.burst(def, level, damage);
        if (bonus.echo) this.echoes.push({ id: def.id, at: this._time + ECHO_DELAY });
        return true;
      }
      case 'trail': {
        // Not while the player is still standing on the last one (AUDIT 27).
        // Returning false retries sooner, as a seeking weapon with no target does.
        const last = this.trailDrops.get(def.id);
        if (last && (this.x - last.x) ** 2 + (this.y - last.y) ** 2 < WAKE_MIN_SPACING * WAKE_MIN_SPACING) {
          return false;
        }
        if (last) {
          last.x = this.x;
          last.y = this.y;
        } else this.trailDrops.set(def.id, { x: this.x, y: this.y });
        const trail: AreaState = {
          x: this.x,
          y: this.y,
          age: 0,
          seconds: def.range * bonus.duration,
          radius,
          damage,
          pull: false,
          tick: true,
          serial: this.nextSerial++,
        };
        // Rut (G-046): a trail that holds as well as hurts. `slowAt` reads any
        // area with a `slow`, so whatever crosses a footprint is held, and so
        // is the player, since each one is laid where the player stands.
        if (def.slow !== undefined) trail.slow = def.slow;
        this.areas.push(trail);
        return true;
      }
      case 'attractor': {
        this.areas.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: 3.2 * bonus.duration,
          radius: radius * reach,
          damage: 0,
          pull: true,
          tick: true,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'field': {
        // Snooze: the attractor's area, dropped where the player stands, with
        // a hold instead of a pull. Movement reads it (`slowAt`); nothing that
        // deals damage does, because its damage is zero.
        this.areas.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: def.range * bonus.duration,
          radius: radius * reach,
          damage: 0,
          pull: false,
          slow: def.slow ?? 1,
          tick: true,
          serial: this.nextSerial++,
        });
        return true;
      }
      case 'orbit':
        // Never fired; see updateOrbiters.
        return false;
      case 'aura':
        // Never fired; see updateAuras.
        return false;
      case 'sweep': {
        // Backhand (G-044): an arc along the facing, swung on its cooldown
        // whether or not anything is in it — a swat does not wait for a
        // target. Extra arcs go behind, then left, then right (SWEEP_TURNS).
        // Every enemy in any arc is hit once per swing, however the arcs
        // overlap; the boss likewise.
        const facing = Math.atan2(this.facingY, this.facingX);
        const arcs = Math.min(SWEEP_TURNS.length, 1 + bonus.projectiles);
        const sweepReach = def.range * bonus.area * reach;
        const width = def.arc ?? Math.PI / 2;
        const knockback = (def.knockback ?? 0) + bonus.knockback;
        const b = this.boss;
        let bossHit = false;
        this.swept.clear();
        this.grid.query(this.x, this.y, sweepReach + this.queryPad, this.near);
        for (let k = 0; k < arcs; k++) {
          const angle = facing + SWEEP_TURNS[k]!;
          for (const e of this.near) {
            if (e.def.invulnerable || e.hp <= 0 || this.swept.has(e.uid)) continue;
            if (!this.inArc(e.x, e.y, e.radius, angle, width, sweepReach)) continue;
            this.swept.add(e.uid);
            // A sweep lands on the side the player swung from (§3.4).
            if (!hitsWeakPoint(e, this.x, this.y)) continue;
            e.hp -= damage;
            e.hitFlash = 0.08;
            if (knockback > 0) this.knockBack(e, knockback);
          }
          if (!bossHit && b && this.inArc(b.x, b.y, BOSS_RADIUS, angle, width, sweepReach)) {
            bossHit = true;
            this.damageBoss(damage);
          }
          this.sweeps.push({
            x: this.x,
            y: this.y,
            angle,
            reach: sweepReach,
            arc: width,
            age: 0,
            seconds: SWEEP_SECONDS,
            source: def.id,
          });
        }
        return true;
      }
      case 'strike': {
        // Judgement (G-044): distinct random enemies within range, picked
        // with the world's own dice so a seed replays them, and after
        // STRIKE_DELAY a one-shot area where each one WAS. With fewer
        // enemies than bolts the boss takes one, as a seeking weapon's
        // spare shot does. Nothing in range: retry sooner.
        const bolts = 1 + bonus.projectiles;
        const range = def.range * reach;
        const limit = range * range;
        const pool = this.strikeCandidates;
        pool.length = 0;
        this.grid.query(this.x, this.y, range, this.near);
        for (const e of this.near) {
          // Not at what it cannot hurt (AUDIT part three, 22).
          if (e.def.invulnerable || e.hp <= 0) continue;
          if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 <= limit) pool.push(e);
        }
        let aimed = 0;
        while (aimed < bolts && pool.length > 0) {
          const pick = Math.floor(this.rng() * pool.length);
          const e = pool[pick]!;
          swapRemove(pool, pick);
          // A bolt with no delay (Hindsight) has already landed: not at what it killed.
          if (e.hp <= 0) continue;
          this.strikeAt(def, e.x, e.y, radius, damage);
          aimed++;
        }
        pool.length = 0;
        if (aimed < bolts) {
          const boss = this.bossAsTarget(range);
          if (boss) {
            this.strikeAt(def, boss.x, boss.y, radius, damage);
            aimed++;
          }
        }
        return aimed > 0;
      }
    }
  }

  /**
   * Whether a body of radius `r` at (x, y) is inside a sweep's arc: within
   * reach of its edge, and within half the arc of its bearing from the
   * player, widened by the body's own angular size so what overlaps the drawn
   * wedge is what is hit. A body over the player's centre is in every arc.
   */
  private inArc(x: number, y: number, r: number, angle: number, width: number, reach: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > (reach + r) * (reach + r)) return false;
    const d = Math.sqrt(d2);
    if (d <= r) return true;
    // A full circle (Reach, G-046) takes every bearing. The wrapped test below
    // already would, |off| <= π with a body's width to spare; this says so
    // without leaning on the float at exactly π.
    if (width >= Math.PI * 2) return true;
    // Wrapped to [-π, π]: a bearing of 179° and an arc at -179° are 2° apart.
    let off = Math.atan2(dy, dx) - angle;
    off -= Math.PI * 2 * Math.floor((off + Math.PI) / (Math.PI * 2));
    return Math.abs(off) <= width / 2 + Math.asin(r / d);
  }

  /**
   * One strike, telegraphed: it lands after its item's `strikeDelay`, or
   * STRIKE_DELAY (updateAreas → landStrike). A delay of zero (Hindsight,
   * G-046) lands here, on the fire step. `fireItems` runs before
   * `updateAreas`, but `updateStrike` reads a delay of zero as already landed
   * and only ages the flash, so waiting for it would never land at all.
   */
  private strikeAt(def: ActiveItem, x: number, y: number, radius: number, damage: number): void {
    const a: AreaState = {
      x,
      y,
      age: 0,
      seconds: STRIKE_FLASH_SECONDS,
      radius,
      damage,
      pull: false,
      tick: false,
      serial: this.nextSerial++,
      delay: Math.max(0, def.strikeDelay ?? STRIKE_DELAY),
      source: def.id,
    };
    this.areas.push(a);
    if (a.delay === 0) this.landStrike(a);
  }

  /**
   * A strike's life inside `updateAreas`: held for its telegraph, one hit on
   * landing, then its flash. It never reaches the burst path below it, whose
   * one-hit mark is a single serial per enemy: two bolts landing on one crowd
   * would take turns re-arming each other and hit every step of the flash.
   */
  private updateStrike(a: AreaState, i: number, dt: number): void {
    if (a.delay! > 0) {
      a.delay! -= dt;
      if (a.delay! > 0) return;
      // The overshoot is time since it landed (AUDIT 23's carry).
      a.age = -a.delay!;
      a.delay = 0;
      this.landStrike(a);
    } else a.age += dt;
    if (a.age >= a.seconds) swapRemove(this.areas, i);
  }

  /** The bolt lands: everything within its radius takes its damage once, the boss too. */
  private landStrike(a: AreaState): void {
    this.grid.query(a.x, a.y, a.radius + this.queryPad, this.near);
    for (const e of this.near) {
      if (e.def.invulnerable || e.hp <= 0) continue;
      const r = a.radius + e.radius;
      if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > r * r) continue;
      if (!hitsWeakPoint(e, a.x, a.y, a.radius)) continue;
      e.hp -= a.damage;
      e.hitFlash = 0.08;
    }
    const b = this.boss;
    if (b && (b.x - a.x) ** 2 + (b.y - a.y) ** 2 <= (a.radius + BOSS_RADIUS) ** 2) this.damageBoss(a.damage);
  }

  /** Sweeps are drawn for SWEEP_SECONDS after they swing, then dropped. */
  private updateSweeps(dt: number): void {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const s = this.sweeps[i]!;
      s.age += dt;
      if (s.age >= s.seconds) swapRemove(this.sweeps, i);
    }
  }

  /**
   * Aura items (Personal Space, G-044): a ring of the item's radius around
   * the player, always on, hurting each enemy whose body reaches into it at
   * most once per the item's cooldown, and the boss likewise. Like the orbit
   * it never activates. `auras` is rebuilt from a pool every step, so holding
   * it does not allocate (AUDIT part three, 21).
   */
  private updateAuras(dt: number): void {
    this.auras.length = 0;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || !isActive(def) || def.mode !== 'aura') continue;
      // Through bonusFor, so a path (Boundaries) widens the ring (G-043).
      const radius = def.radius * this.bonusFor(def, level).area * this.reach;
      const damage = this.activeDamage(def, level);
      // Through activeCooldown like every weapon: levels, paths and
      // Restlessness shorten the re-hit (AUDIT part three, 19).
      const cooldown = this.activeCooldown(def, level);

      let a = this.auraPool[this.auras.length];
      if (!a) this.auraPool.push((a = { x: 0, y: 0, radius: 0, source: id }));
      a.x = this.x;
      a.y = this.y;
      a.radius = radius;
      a.source = id;
      this.auras.push(a);

      let hits = this.auraHits.get(id);
      if (!hits) this.auraHits.set(id, (hits = new Map()));
      if (hits.size > 4096) {
        for (const [uid, next] of hits) if (this._time - next >= cooldown) hits.delete(uid);
      }
      this.grid.query(this.x, this.y, radius + this.queryPad, this.near);
      for (const e of this.near) {
        if (e.def.invulnerable || e.hp <= 0) continue;
        const r = radius + e.radius;
        if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r * r) continue;
        const next = hits.get(e.uid);
        if (next !== undefined && this._time < next) continue;
        // Off the weak point it does nothing, the re-hit clock included (§3.4).
        if (!hitsWeakPoint(e, this.x, this.y, radius)) continue;
        hits.set(e.uid, this.nextAuraHit(next, cooldown, dt));
        e.hp -= damage;
        e.hitFlash = 0.08;
      }

      const b = this.boss;
      if (b && b.phase !== 'absorbing') {
        const r = radius + BOSS_RADIUS;
        const next = this.auraBossHits.get(id);
        if ((b.x - this.x) ** 2 + (b.y - this.y) ** 2 <= r * r && (next === undefined || this._time >= next)) {
          this.auraBossHits.set(id, this.nextAuraHit(next, cooldown, dt));
          this.damageBoss(damage);
        }
      }
    }
    this.reapDead();
  }

  /**
   * When an aura may next hurt what it just hurt. Held inside continuously it
   * is `cooldown` after the time it was due, so the step's overshoot carries
   * (AUDIT 23); due longer ago than a step (it walked out and back in), a full
   * cooldown from now, so a return is never hit twice inside one cooldown.
   */
  private nextAuraHit(due: number | undefined, cooldown: number, dt: number): number {
    return due !== undefined && this._time - due < dt ? due + cooldown : this._time + cooldown;
  }

  /** One burst at the player, sized by the item's level bonuses. */
  private burst(def: ActiveItem, level: number, damage: number): void {
    const bonus = this.bonusFor(def, level);
    const area: AreaState = {
      x: this.x,
      y: this.y,
      age: 0,
      seconds: 0.12,
      radius: def.radius * bonus.area * this.reach,
      damage,
      pull: false,
      tick: false,
      serial: this.nextSerial++,
    };
    const knockback = (def.knockback ?? 0) + bonus.knockback;
    if (knockback > 0) area.knockback = knockback;
    this.areas.push(area);
  }

  /**
   * Damage to the boss from anything but the two older paths in updateBoss.
   * The shield is read live, not off `b.shielded`: orbiters run before
   * `updateBoss` refreshes it, and a ball this step killed has stopped
   * shielding him.
   */
  private damageBoss(amount: number): void {
    const b = this.boss;
    if (!b || b.phase === 'absorbing' || this.shieldUp()) return;
    b.hp -= amount;
    if (b.hp <= 0) {
      b.hp = 0;
      b.phase = 'absorbing';
      b.timer = 1.8;
    }
  }

  /**
   * Orbit items: N objects on a circle around the player, placed from the life
   * clock alone (so a seed replays them exactly), each hitting any enemy it
   * touches at most once per the item's cooldown.
   */
  private updateOrbiters(): void {
    this.orbiters.length = 0;
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || !isActive(def) || def.mode !== 'orbit') continue;
      const bonus = this.bonusFor(def, level);
      const count = 1 + bonus.projectiles;
      const distance = def.range * bonus.area * this.reach;
      // `speed` (a path's spin) multiplies the angular rate, not the distance.
      const omega = (def.projectileSpeed * bonus.speed) / distance;
      const damage = this.activeDamage(def, level);
      // Through activeCooldown like every other weapon, so levels and
      // Restlessness shorten the re-hit (AUDIT part three, 19).
      const cooldown = this.activeCooldown(def, level);
      let hits = this.orbitHits.get(id);
      if (!hits) this.orbitHits.set(id, (hits = new Map()));
      if (hits.size > 4096) {
        for (const [key, at] of hits) if (this._time - at >= cooldown) hits.delete(key);
      }

      for (let i = 0; i < count; i++) {
        const angle = this._time * omega + (i * Math.PI * 2) / count;
        // Pooled: one object per orbiter slot for the life of the World, so
        // holding Grudge does not allocate every step (AUDIT part three, 21).
        let o = this.orbiterPool[this.orbiters.length];
        if (!o) this.orbiterPool.push((o = { x: 0, y: 0, source: id, radius: 0 }));
        o.x = this.x + Math.cos(angle) * distance;
        o.y = this.y + Math.sin(angle) * distance;
        o.source = id;
        o.radius = def.radius;
        this.orbiters.push(o);

        this.grid.query(o.x, o.y, o.radius + this.queryPad, this.near);
        for (const e of this.near) {
          if (e.def.invulnerable || e.hp <= 0) continue;
          const r = e.radius + o.radius;
          if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 > r * r) continue;
          const key = e.uid * 64 + i;
          const last = hits.get(key);
          if (last !== undefined && this._time - last < cooldown) continue;
          // By where it is; off the weak point the touch spends nothing (§3.4).
          if (!hitsWeakPoint(e, o.x, o.y)) continue;
          hits.set(key, this._time);
          e.hp -= damage;
          e.hitFlash = 0.08;
          // Vendetta (G-046): a fist that shoves. Grudge carries no knockback and never pushes.
          if (def.knockback) this.knockBack(e, def.knockback + bonus.knockback);
        }

        const b = this.boss;
        if (b && b.phase !== 'absorbing') {
          const r = BOSS_RADIUS + o.radius;
          let bossHits = this.orbitBossHits.get(id);
          if (!bossHits) this.orbitBossHits.set(id, (bossHits = new Map()));
          const bossKey = i;
          const last = bossHits.get(bossKey);
          if ((b.x - o.x) ** 2 + (b.y - o.y) ** 2 <= r * r && (last === undefined || this._time - last >= cooldown)) {
            bossHits.set(bossKey, this._time);
            this.damageBoss(damage);
          }
        }
      }
    }
    this.reapDead();
  }

  private moveProjectiles(dt: number): void {
    const fields = this.collectFields();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      // Held by Snooze, hostile or not. Its life is held with it, so a shot
      // through a field arrives late rather than falling short.
      const pdt = fields.length === 0 ? dt : dt * this.slowAt(p.x, p.y, fields);
      p.x += p.vx * pdt;
      p.y += p.vy * pdt;
      p.life -= pdt;
      if (p.life <= 0) swapRemove(this.projectiles, i);
    }
  }

  private updateRings(dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.age += dt;
      if (r.age >= r.seconds) {
        swapRemove(this.rings, i);
        continue;
      }
      if (this.invulnerable > 0) continue;
      const radius = r.maxRadius * (r.age / r.seconds);
      const d = Math.hypot(this.x - r.x, this.y - r.y);
      if (Math.abs(d - radius) <= RING_BAND + this.playerRadius) this.hurt(r.damage, r.cause ?? 'boss');
    }
  }

  private updateAreas(dt: number): void {
    for (let i = this.areas.length - 1; i >= 0; i--) {
      const a = this.areas[i]!;
      if (a.delay !== undefined) {
        this.updateStrike(a, i, dt);
        continue;
      }
      a.age += dt;
      if (a.age >= a.seconds) {
        swapRemove(this.areas, i);
        continue;
      }
      if (a.pull || a.damage <= 0) continue;
      this.grid.query(a.x, a.y, a.radius + this.queryPad, this.near);
      for (const e of this.near) {
        if (e.def.invulnerable || e.hp <= 0) continue;
        if (Math.hypot(e.x - a.x, e.y - a.y) > a.radius + e.radius) continue;
        // Covering the centre covers all four quadrants (§3.4). A burst that
        // misses here keeps its one hit, and lands if the centre comes under it.
        if (!hitsWeakPoint(e, a.x, a.y, a.radius)) continue;
        if (a.tick) {
          e.hp -= a.damage * dt * 6;
        } else {
          if (e.hitByAreaSerial === a.serial) continue;
          e.hitByAreaSerial = a.serial;
          e.hp -= a.damage;
          if (a.knockback) this.knockBack(e, a.knockback);
        }
        e.hitFlash = 0.08;
      }
    }
    // Once, after every area — not once per area. Reaping inside the loop
    // made this O(areas x enemies), which is exactly the cost the grid was
    // added to remove: Wake alone keeps ~13 areas alive against a 1500-enemy
    // cap, so it was ~20,000 needless checks a frame for one item.
    this.reapDead();
  }

  /**
   * Pushes an enemy straight away from the player, held inside the arena. The
   * boss is never in `enemies`, so it is never pushed.
   */
  private knockBack(e: EnemyState, distance: number): void {
    // The crowd, not the room (AUDIT 33; 28's rule for the pull).
    if (e.def.merge === true || e.def.patrol === true) return;
    const dx = e.x - this.x;
    const dy = e.y - this.y;
    const d = Math.hypot(dx, dy);
    // Standing exactly on the player: any consistent direction will do.
    const nx = d < 0.001 ? 1 : dx / d;
    const ny = d < 0.001 ? 0 : dy / d;
    // Held inside the arena only if it was inside: clamping an enemy that is
    // still out on the spawn ring pulled it TOWARD the player (AUDIT part
    // three, 20). Merging piles are not moved: a knocked pile would stack on
    // another without merging, since piles merge only on arrival.
    if (e.def.merge) return;
    const inside = e.x >= 0 && e.x <= ARENA_WIDTH && e.y >= 0 && e.y <= ARENA_HEIGHT;
    e.x += nx * distance;
    e.y += ny * distance;
    if (inside) {
      e.x = clamp(e.x, 0, ARENA_WIDTH);
      e.y = clamp(e.y, 0, ARENA_HEIGHT);
    }
  }

  private updateGems(dt: number): void {
    const magnet = this.magnetRadius;
    const body = this.playerRadius;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i]!;
      const d = Math.hypot(this.x - g.x, this.y - g.y);
      if (d < magnet) {
        g.x += ((this.x - g.x) / (d || 1)) * GEM_SPEED * dt;
        g.y += ((this.y - g.y) / (d || 1)) * GEM_SPEED * dt;
      }
      if (d < body) {
        // Less every invoice worn (§3.3). Unrounded: a 1-XP gem is the act's
        // commonest, and rounding it would leave it untaxed to the ninth
        // invoice and worthless from there — a cliff, which G-025 refused the
        // drag for the same reason.
        this.gainXp(g.value * this.xpTaxFactor);
        swapRemove(this.gems, i);
      }
    }
  }

  private resolveHits(): void {
    for (let pi = this.projectiles.length - 1; pi >= 0; pi--) {
      const p = this.projectiles[pi]!;
      if (p.hostile) {
        this.hitRacer(p, pi);
        continue;
      }
      this.grid.query(p.x, p.y, p.radius + this.queryPad, this.near);
      for (const e of this.near) {
        // You cannot shoot a document (G-018).
        if (e.def.invulnerable || e.hitBySerial === p.serial || e.hp <= 0) continue;
        if (e.uid === p.skipUid) continue;
        const r = e.radius + p.radius;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;

        e.hitBySerial = p.serial;
        // By where it strikes (COLLEGE-ROSTER §3.4). Off the weak point it
        // does nothing — no hp, no flash, no chain — and is still spent as a
        // hit, so a seeking shot does not pass through and take it from the
        // far side on the same flight.
        if (hitsWeakPoint(e, p.x, p.y)) {
          e.hp -= p.damage;
          e.hitFlash = 0.08;
          if (p.chain && p.chain > 0) this.chainFrom(p, e);
        }
        if (--p.pierce <= 0) {
          swapRemove(this.projectiles, pi);
          break;
        }
      }
    }
    this.reapDead();
  }

  /**
   * A boss shot thins the race: it hits the first racer it touches, for its
   * full damage, and is consumed exactly as it is on the player. It hits
   * nothing else in the crowd. Killed racers go through `reapDead` like any
   * other kill, so they drop their gem.
   *
   * The boss's shots only: those with no `owner`. Conception has no ranged
   * enemy, so until Prom this was the same thing as "every hostile shot"; at
   * Prom the group chat is still typing, and its notifications are aimed at
   * the player, not at the dance.
   */
  private hitRacer(p: ProjectileState, pi: number): void {
    if (!this.boss || !this.race || p.owner) return;
    this.grid.query(p.x, p.y, p.radius + this.queryPad, this.near);
    for (const e of this.near) {
      if (e.hp <= 0 || e.def.invulnerable || !this.isRacing(e)) continue;
      const r = e.radius + p.radius;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;
      e.hp -= p.damage;
      e.hitFlash = 0.08;
      swapRemove(this.projectiles, pi);
      return;
    }
  }

  /**
   * A chaining shot hit `from`: one new shot to each of up to `p.chain` of the
   * nearest other enemies within CHAIN_RADIUS that this shot has not hit, at
   * reduced damage. One hop — the new shots do not chain again.
   *
   * Uses the second query buffer: this runs inside a walk of `near`.
   */
  private chainFrom(p: ProjectileState, from: EnemyState): void {
    this.grid.query(from.x, from.y, CHAIN_RADIUS + this.queryPad, this.near2);
    const picked: EnemyState[] = [];
    const limit = CHAIN_RADIUS * CHAIN_RADIUS;
    for (let k = 0; k < (p.chain ?? 0); k++) {
      let best: EnemyState | null = null;
      let bestD = limit;
      for (const e of this.near2) {
        if (e === from || e.hp <= 0 || e.def.invulnerable || e.hitBySerial === p.serial) continue;
        if (picked.includes(e)) continue;
        const d2 = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
        if (d2 < bestD) {
          bestD = d2;
          best = e;
        }
      }
      if (!best) break;
      picked.push(best);
    }
    const speed = Math.hypot(p.vx, p.vy) || 1;
    for (const target of picked) {
      const d = Math.hypot(target.x - from.x, target.y - from.y) || 1;
      this.projectiles.push({
        x: from.x,
        y: from.y,
        vx: ((target.x - from.x) / d) * speed,
        vy: ((target.y - from.y) / d) * speed,
        life: (CHAIN_RADIUS * 1.5) / speed,
        damage: p.damage * CHAIN_DAMAGE,
        pierce: 1,
        radius: p.radius,
        hostile: false,
        ...(p.source !== undefined ? { source: p.source } : {}),
        serial: this.nextSerial++,
        skipUid: from.uid,
      });
    }
  }

  /**
   * Sweeps out everything killed this step.
   *
   * Damage is applied through grid queries, which hand back enemies rather
   * than indices, so removal is deferred to one pass instead of being done
   * inside a loop that would invalidate the array it is walking.
   */
  private reapDead(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.hp > 0) continue;
      this.gems.push({ x: e.x, y: e.y, value: e.xp });
      swapRemove(this.enemies, i);
      this.kills++;
    }
  }

  private resolveContact(dt: number): void {
    // See outcomeDecided: the engulf tick and attach damage do not go through
    // hurt(), so the guard has to sit above them too.
    if (this.outcomeDecided) return;
    if (this.engulfTimer > 0) {
      this.engulfTimer -= dt;
      this.hp -= this.engulfDps * dt * this.damageTaken;
      if (this.hp <= 0) return this.die(this.engulfBy ?? 'boss');
    }

    const body = this.playerRadius;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      const r = e.radius + body;
      if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r * r) continue;

      // It is not doing anything to anyone. Distinct from zero damage, which
      // would still take the `hurt` path and hand out i-frames.
      if (e.def.contact === 'none') continue;

      if (e.def.contact === 'attach') {
        this.wear(e.def);
        swapRemove(this.enemies, i);
        this.hp -= e.def.contactDamage * this.damageTaken;
        if (this.hp <= 0) return this.die(e.def);
        continue;
      }
      if (e.def.contact === 'engulf' && e.def.engulf) {
        if (this.engulfTimer <= 0) {
          this.engulfTimer = e.def.engulf.seconds;
          this.engulfSlow = e.def.engulf.slow;
          this.engulfDps = e.def.engulf.damagePerSecond;
          this.engulfBy = e.def;
        }
        continue;
      }
      if (this.invulnerable > 0) continue;
      this.hurt(e.def.contactDamage, e.def);
      if (e.def.contactStun !== undefined) {
        this.stun(e.def.contactStun);
        // The i-frames run from the END of the stop, not from the hit. Main's
        // audit (part three, 18) found a stop equal to IFRAMES let a crossing
        // monitor stop the player seven times running, because both expired
        // on one frame and contact ran before movement; the same shape holds
        // here whatever the placeholder values are.
        this.invulnerable = Math.max(this.invulnerable, e.def.contactStun + IFRAMES);
      }
      // `break`, not `return`. Returning here skipped the boss-shot loop
      // below for the whole frame, so on any frame the player was touching a
      // rival a boss projectile passed through them and stayed alive to be
      // re-evaluated later. The i-frames just set will stop it doing damage;
      // it still has to be consumed.
      break;
    }

    // Hostile shots: the boss's and a `ranged` enemy's. The only things in
    // the game that were aimed. A shot with an owner names it on the
    // certificate; the boss's have none and name the boss.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (!p.hostile) continue;
      const r = p.radius + body;
      if ((p.x - this.x) ** 2 + (p.y - this.y) ** 2 > r * r) continue;
      swapRemove(this.projectiles, i);
      if (this.invulnerable > 0) continue;
      this.hurt(p.damage, p.owner ?? 'boss');
      // The registrar's hold (COLLEGE-ROSTER §3.5): the monitor's stop, by
      // post, and its i-frames run from the END of the stop for the reason the
      // contact branch above gives (AUDIT part three, 18).
      const stun = p.owner?.ranged?.stun;
      if (stun !== undefined) {
        this.stun(stun);
        this.invulnerable = Math.max(this.invulnerable, stun + IFRAMES);
      }
    }
  }

  /**
   * G-033: the outcome latches the moment the Egg reaches zero. The absorb is
   * presentation, and nothing that happens during presentation can change what
   * already happened. Without this, a rival wandering through the final 1.8
   * seconds turned a win into "you did not make it" (AUDIT finding 10).
   */
  private get outcomeDecided(): boolean {
    return this.dead || this.won || this.boss?.phase === 'absorbing';
  }

  /**
   * One attach stack on the player: a drag stack, always; for tuition, a
   * share of every gem from now on (`attach.tax`) and a stack that stays on
   * through the crossing (`attach.persists`, COLLEGE-ROSTER §3.3).
   */
  private wear(def: EnemyDef): void {
    this.dragStacks++;
    const tax = def.attach?.tax ?? 0;
    const persists = def.attach?.persists === true;
    if (tax > 0) {
      this.taxedStacks++;
      this.xpTaxFactor *= 1 - tax;
    }
    if (!persists) return;
    this.persistentStacks++;
    if (tax > 0) {
      this.persistentTaxedStacks++;
      this.persistentTaxFactor *= 1 - tax;
    }
  }

  private hurt(amount: number, cause: Cause): void {
    if (this.outcomeDecided) return;
    this.hp -= amount * this.damageTaken;
    this.invulnerable = IFRAMES;
    if (this.hp <= 0) this.die(cause);
  }

  private die(cause: Cause): void {
    this.hp = 0;
    this.dead = true;
    this.outcome = 'died';
    this.certificate = {
      outcome: 'died',
      actId: this.act.id,
      actName: this.act.name,
      actIndex: this.actIndex,
      age: this.age,
      causeId: typeof cause === 'string' ? cause : cause.id,
      cause: cause === 'boss' ? this.act.bossName : cause === 'someone-else' ? 'Someone else' : cause.name,
    };
  }

  // --- School's three placeholders (D-022) ------------------------------
  //
  // SCHOOL-ROSTER §3.3, §3.4, §3.5. Each is data-driven off an EnemyDef field
  // and does nothing for an enemy without it, so Conception runs through
  // these as no-ops. Every number they read is a PLACEHOLDER under SCHOOL's
  // `provisional` label.

  /**
   * The substitute's attack, for any enemy with `ranged`. Returns true while
   * it is standing still.
   *
   * Idle until the player is within range and no cooldown is running; then
   * consults for `consultSeconds`, not moving; then fires one shot at where
   * the player is when the consult ends, and resumes. The cooldown runs from
   * the shot. Moving during the consult is how the telegraph is read; moving
   * after the shot is how it is dodged, because it is never corrected.
   */
  private consultClipboard(e: EnemyState, r: NonNullable<EnemyDef['ranged']>, dt: number): boolean {
    if (e.reload > 0) e.reload = Math.max(0, e.reload - dt);
    if (e.consult > 0) {
      e.consult -= dt;
      if (e.consult > 0) return true;
      e.consult = 0;
      e.reload = r.cooldownSeconds;
      this.fireRanged(e, r);
      return true;
    }
    if (e.reload > 0) return false;
    if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r.range * r.range) return false;
    e.consult = r.consultSeconds;
    return true;
  }

  /**
   * One hostile shot. `source` is the enemy's id so the renderer can tell it
   * from the Egg's (gold is the shot's colour, G-031, and is presentation);
   * `owner` is what the certificate names.
   */
  private fireRanged(e: EnemyState, r: NonNullable<EnemyDef['ranged']>): void {
    const d = Math.hypot(this.x - e.x, this.y - e.y) || 1;
    this.projectiles.push({
      x: e.x,
      y: e.y,
      vx: ((this.x - e.x) / d) * r.projectileSpeed,
      vy: ((this.y - e.y) / d) * r.projectileSpeed,
      life: (r.range * RANGED_SHOT_REACH) / r.projectileSpeed,
      damage: r.damage,
      pierce: 1,
      radius: RANGED_SHOT_RADIUS,
      hostile: true,
      source: e.def.id,
      owner: e.def,
      serial: this.nextSerial++,
    });
  }

  /** The hall monitor's stop. Refreshes the window; never stacks past it. */
  private stun(seconds: number): void {
    if (seconds > this.stunTimer) this.stunTimer = seconds;
  }

  /** True, and spends a step of it, while a stun is running. */
  private stunned(dt: number): boolean {
    if (this.stunTimer <= 0) return false;
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    return true;
  }

  /** Writes the player's position to the trail, at most once per sample interval. */
  private recordTrail(): void {
    if (this.trailCount > 0) {
      const newest = (this.trailHead + TRAIL_CAPACITY - 1) % TRAIL_CAPACITY;
      if (this._time - this.trailT[newest]! < TRAIL_SAMPLE_SECONDS) return;
    }
    this.trailT[this.trailHead] = this._time;
    this.trailX[this.trailHead] = this.x;
    this.trailY[this.trailHead] = this.y;
    this.trailHead = (this.trailHead + 1) % TRAIL_CAPACITY;
    if (this.trailCount < TRAIL_CAPACITY) this.trailCount++;
  }

  /**
   * Where the player was TRAIL_SECONDS ago: the newest sample at least that
   * old. Early in a life, when nothing is that old, the oldest place on
   * record; before the first step, where the player is.
   */
  private trailPosition(): { x: number; y: number } {
    if (this.trailCount === 0) return { x: this.x, y: this.y };
    const target = this._time - TRAIL_SECONDS;
    let i = (this.trailHead + TRAIL_CAPACITY - 1) % TRAIL_CAPACITY;
    for (let n = 0; n < this.trailCount; n++) {
      if (this.trailT[i]! <= target) return { x: this.trailX[i]!, y: this.trailY[i]! };
      i = (i + TRAIL_CAPACITY - 1) % TRAIL_CAPACITY;
    }
    const oldest = (this.trailHead + TRAIL_CAPACITY - this.trailCount) % TRAIL_CAPACITY;
    return { x: this.trailX[oldest]!, y: this.trailY[oldest]! };
  }

  // --- the life ---------------------------------------------------------

  /**
   * The boss is down and its exit has played. Either the next act begins or,
   * after the last one, the player dies of natural causes and that is the win.
   */
  private finishAct(): void {
    if (this.actIndex + 1 < this.life.length) {
      this.beginAct(this.actIndex + 1);
      return;
    }
    this.won = true;
    this.outcome = 'won';
    this.certificate = {
      outcome: 'won',
      actId: this.act.id,
      actName: this.act.name,
      actIndex: this.actIndex,
      age: this.act.age.to,
      causeId: 'natural-causes',
      cause: 'natural causes',
    };
  }

  /**
   * The threshold between acts. What crosses it is the player: items, level,
   * the XP still on the ground (collected now rather than lost — you leave
   * with what you earned), and tuition's invoices (`attach.persists`). What
   * does not is the act: its crowd, its projectiles and fields, every other
   * attach's drag, and the boss. Health is
   * restored, because arriving at School on three hit points after the Egg is
   * a death with extra steps. PLACEHOLDER: full heal is the simplest rule
   * with no number in it; a person playing the crossing decides otherwise.
   *
   * The first crossing also deals the inheritance (G-042), before the heal so
   * the heal reaches its ceiling; every crossing takes its unasked levels.
   */
  private beginAct(index: number): void {
    // Collected as any gem is, so at whatever the invoices worn leave of it.
    for (const g of this.gems) this.xp += g.value * this.xpTaxFactor;
    this.gems.length = 0;

    this.actIndex = index;
    this.actTime = 0;
    this.streams = spawnStreams(this.act.waves);
    this.accumulators.clear();
    this.cooldowns.clear();
    this.echoes.length = 0;
    this.orbitHits.clear();
    this.orbitBossHits.clear();
    this.trailDrops.clear();
    this.orbiters.length = 0;
    this.auraHits.clear();
    this.auraBossHits.clear();
    this.auras.length = 0;
    this.sweeps.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.rings.length = 0;
    this.areas.length = 0;
    this.solids.length = 0;
    this.maxEnemyRadius = 0;
    this.grid.build(this.enemies);
    this.boss = null;
    this.raceAbsorbed = 0;
    // The act's attach stacks come off here, except a persisting attach's:
    // tuition's invoices, and the share of every gem they take, cross with
    // the player and stay for the rest of the life. That is College's whole
    // bet (COLLEGE-ROSTER §2, G-045): every attach before it cost something
    // for an act; this one costs the future, and the Office inherits it.
    this.dragStacks = this.persistentStacks;
    this.taxedStacks = this.persistentTaxedStacks;
    this.xpTaxFactor = this.persistentTaxFactor;
    this.engulfTimer = 0;
    this.engulfSlow = 1;
    this.engulfDps = 0;
    this.engulfBy = null;
    this.invulnerable = 0;
    this.stunTimer = 0;
    if (!this.inheritance) this.inherit();
    this.takeUnaskedLevels();
    this.hp = this.maxHp;
    // Levels earned from that XP, and any owed from the absorb (AUDIT 29),
    // are offered before the new act's first step, exactly as a mid-act
    // pickup would be. After the boss is cleared, or `presentOffers` would
    // still read the old act's outcome as latched.
    this.settleXp();
  }

  /**
   * The Egg's drop (G-017, G-042): one roll of the world's own dice, so a
   * seed reproduces it. Never asked, never offered, never rolled again.
   * Constitution's price applies from the bar the player is already on.
   */
  private inherit(): void {
    const id = INHERITANCE_IDS[Math.floor(this.rng() * INHERITANCE_IDS.length)]!;
    this.inheritance = INHERITANCES[id]!;
    this.xpToNext = this.xpCost(this.level);
  }

  /**
   * Precocity's level (G-042): the first card of an offer the player never
   * sees, taken before the act's first step. `rollOffers` deals it, so it
   * comes from exactly the pool a level-up would have, and nothing else.
   */
  private takeUnaskedLevels(): void {
    for (let n = this.inheritance?.levelsPerAct ?? 0; n > 0; n--) {
      const id = this.rollOffers()[0];
      if (!id) return;
      this.level++;
      this.xpToNext = this.xpCost(this.level);
      // A path card is as dealable as an item (G-043); `take` levels either.
      this.take(id);
    }
  }

  // --- levelling --------------------------------------------------------

  /** XP from `level` to the next, at the inheritance's price (Constitution's cost). */
  private xpCost(level: number): number {
    return Math.round(xpToNextLevel(level) * (this.inheritance?.xpMultiplier ?? 1));
  }

  private gainXp(value: number): void {
    this.xp += value;
    this.settleXp();
  }

  /** Turns accumulated XP into queued levels and offers the next one. */
  private settleXp(): void {
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.xpCost(this.level);
      // Levels QUEUE. Assigning `offers` here discarded a pending one: two
      // gems collected in the same frame — routine once white cells drop 12
      // apiece — took the player from level 1 to level 3 and presented a
      // single choice for both.
      this.pendingLevels++;
    }
    this.presentOffers();
  }

  /**
   * Hands the player the next queued choice, if there is one to make.
   *
   * `rollOffers` returns an empty array once every item is at max level, and
   * an empty array is truthy: `step()` opens with `if (this.offers) return`,
   * so assigning one froze the world permanently behind a panel listing
   * nothing, with no key that would dismiss it. A level with nothing to offer
   * is still a level; it is just not a decision.
   *
   * Nor while the outcome is latched (AUDIT 29). `step()` freezes on offers,
   * so gems collected during the Egg's absorb held the ending behind three
   * cards — on the last act, a decision in a life already over. The level
   * still counts and stays queued; `beginAct` offers it at the crossing, and
   * after the last act nobody is asked.
   */
  private presentOffers(): void {
    if (this.outcomeDecided) return;
    while (!this.offers && this.pendingLevels > 0) {
      this.pendingLevels--;
      // An evolution is not a choice: when one is ready, the level IS it.
      const evolution = this.readyEvolution();
      if (evolution) {
        this.offers = [evolution];
        break;
      }
      const rolled = this.rollOffers();
      if (rolled.length > 0) this.offers = rolled;
    }
  }

  /**
   * The evolution the player has earned and not taken, if any: its weapon at
   * max level, its partner owned at any level. Registry order breaks a tie.
   */
  readyEvolution(): string | null {
    for (const def of Object.values(ITEMS)) {
      if (!isActive(def) || !def.evolvesFrom || this.items.has(def.id)) continue;
      const weapon = ITEMS[def.evolvesFrom.weapon];
      if (!weapon) continue;
      if ((this.items.get(weapon.id) ?? 0) < weapon.maxLevel) continue;
      if ((this.items.get(def.evolvesFrom.with) ?? 0) < 1) continue;
      return def.id;
    }
    return null;
  }

  /**
   * Three choices: upgrades to what you have, things you do not, and (G-043)
   * the paths of every weapon that has opened.
   */
  private rollOffers(): string[] {
    // Evolutions are never rolled, and a weapon an owned evolution replaced
    // is not offered again as if it were new.
    const replaced = new Set<string>();
    for (const id of this.items.keys()) {
      const def = ITEMS[id];
      if (def && isActive(def) && def.evolvesFrom) replaced.add(def.evolvesFrom.weapon);
    }
    // An item born in a later act (`from`) is not in the pool until the life
    // has reached that act, in ALL_ACTS order. An act missing from ALL_ACTS
    // (a test's fixture) comes before all of them.
    const here = ALL_ACTS.findIndex((a) => a.id === this.act.id);
    const pool = Object.keys(ITEMS).filter((id) => {
      const def = ITEMS[id]!;
      if (isActive(def) && def.evolvesFrom) return false;
      if (replaced.has(id)) return false;
      if (def.from !== undefined && ALL_ACTS.findIndex((a) => a.id === def.from) > here) return false;
      return (this.items.get(id) ?? 0) < def.maxLevel;
    });
    // G-043: each path of an owned weapon at PATH_OPENS_AT or above, until the
    // path is at its own max. Appended after the items, in registry order, so
    // a life with no weapon opened rolls the pool, and draws the rng, exactly
    // as it did before paths existed; once one opens, the pool is longer and
    // every later draw moves. A replaced weapon's paths stay out with it.
    // PLACEHOLDER: no cap on how many path cards one offer may hold, so three
    // directions of one weapon is a legal offer.
    for (const id of Object.keys(ITEMS)) {
      const def = ITEMS[id]!;
      if (!isActive(def) || !def.paths || replaced.has(id)) continue;
      if ((this.items.get(id) ?? 0) < PATH_OPENS_AT) continue;
      for (const path of def.paths) {
        const offer = offerIdFor(def, path);
        if ((this.pathLevels.get(offer) ?? 0) < path.maxLevel) pool.push(offer);
      }
    }
    const picked: string[] = [];
    while (picked.length < 3 && picked.length < pool.length) {
      const candidate = pool[Math.floor(this.rng() * pool.length)]!;
      if (!picked.includes(candidate)) picked.push(candidate);
    }
    return picked.length > 0 ? picked : [];
  }

  /** Take one of the pending offers. Unblocks the world. */
  choose(id: string): void {
    if (!this.offers || !this.offers.includes(id)) return;
    const before = this.maxHp;
    this.take(id);
    // No passive lowers max health any more (G-038), but the clamp costs
    // nothing and a future one would need it: keep current health inside the
    // new ceiling without silently healing past it.
    const after = this.maxHp;
    if (after < before) this.hp = Math.min(this.hp, after);
    else this.hp += after - before;
    this.offers = null;
    this.presentOffers();
  }

  /**
   * One level of what an offer id names, asked (`choose`) or not
   * (`takeUnaskedLevels`): a path's own level (G-043), or an item's, where an
   * evolution replaces its weapon.
   */
  private take(id: string): void {
    const { item, path } = parseOfferId(id);
    if (path) {
      this.pathLevels.set(id, (this.pathLevels.get(id) ?? 0) + 1);
      return;
    }
    if (isActive(item) && item.evolvesFrom) {
      // The weapon becomes the evolution; it does not sit beside it.
      const weapon = item.evolvesFrom.weapon;
      this.items.delete(weapon);
      this.cooldowns.delete(weapon);
      // PLACEHOLDER decision: its paths go with it. The evolution is a new
      // item, not the weapon grown, and Tantrum's card already says it
      // replaces Temper; a directed Temper is still replaced.
      const prefix = weapon + OFFER_PATH_SEPARATOR;
      for (const key of this.pathLevels.keys()) if (key.startsWith(prefix)) this.pathLevels.delete(key);
      this.mergedBonus.delete(weapon);
    }
    this.items.set(id, (this.items.get(id) ?? 0) + 1);
  }

  // --- the boss ---------------------------------------------------------

  private spawnBoss(): void {
    // The act stops producing. Everything already on the field stays.
    //
    // Placed 420px above the player, then held inside the arena. Unclamped,
    // a player standing in the top of the field got an Egg at negative y:
    // the camera is bounded by the arena and cannot scroll to it, and the
    // player cannot walk above y=0 to bring it into view, so the fight was a
    // health bar over an empty screen. Reachable from anywhere in the top
    // quarter of the field.
    //
    // Every kind stands where this puts them and never moves. The Gym Teacher
    // and Prom share the placement, the health and the first idle: §9 and
    // ADOLESCENCE-ROSTER §4 change what the boss does, not where it is or how
    // long it takes to kill. Prom therefore usually arrives with the player
    // 420px away, off its floor, and the first thing asked is to step onto
    // it; held inside the arena from the top of the field, it can land nearer.
    const margin = BOSS_RADIUS + 40;
    this.boss = {
      kind: this.act.boss.kind,
      x: clamp(this.x, margin, ARENA_WIDTH - margin),
      y: clamp(this.y - 420, margin, ARENA_HEIGHT - margin),
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      phase: 'idle',
      timer: 2.2,
      shielded: false,
      rings: 0,
      interestIn: 0,
    };
    // The Loan opens at what the player carried in (COLLEGE-ROSTER §4): a
    // tenth more per invoice worn, and its cap is `cap` times that, so the bar
    // opens 1/cap full. The act's only attach is tuition, so every stack
    // worn here is an invoice.
    const loan = this.act.boss;
    if (loan.kind === 'loan') {
      const opening = BOSS_HP * (1 + LOAN_OPENING_PER_STACK * this.dragStacks);
      this.boss.hp = opening;
      this.boss.maxHp = opening * loan.cap;
      this.boss.interestIn = loan.interestSeconds;
    }
    // Read once it stands: Prom's shield is the player's distance from it.
    this.boss.shielded = this.shieldUp();
    this.partRace(this.boss);
  }

  /**
   * The Egg appears where it appears, and the crowd may already be there
   * (AUDIT 30). Every racer inside the corona's absorb radius is set outside
   * it on its own bearing from the boss (bearing 0 on the boss point exactly,
   * so no randomness), at one to two RACE_PARTING_SECONDS of its swim: the
   * disc maps onto an annulus in the same radial order, so they still race
   * and arrive over the following second or two, nearest first. None of them
   * is absorbed on the step after the spawn; racers already outside are not
   * touched, and arrive when they arrive.
   */
  private partRace(b: BossState): void {
    if (!this.race) return;
    for (const e of this.enemies) {
      if (!this.isRacing(e) || e.hp <= 0) continue;
      const r = BOSS_RADIUS + e.radius;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const nx = d < 0.001 ? 1 : dx / d;
      const ny = d < 0.001 ? 0 : dy / d;
      const out = r + e.def.speed * RACE_PARTING_SECONDS * (1 + d / r);
      e.x = b.x + nx * out;
      e.y = b.y + ny * out;
    }
  }

  /**
   * §9: nobody leaves until the equipment is put away. True while the act's
   * boss is the Gym Teacher and any of his `enemyId` is alive. A linear scan,
   * like the merge: once a step for `updateBoss`, and on the rare orbiter hit.
   *
   * ADOLESCENCE-ROSTER §4: nobody wins Prom from the wall. True while the
   * player is farther than `floorRadius` from the ball, centre to centre, and
   * read at the player's position this step, which has already moved.
   */
  private shieldUp(): boolean {
    const boss = this.act.boss;
    if (boss.kind === 'prom') {
      const b = this.boss;
      return b !== null && (this.x - b.x) ** 2 + (this.y - b.y) ** 2 > boss.floorRadius ** 2;
    }
    if (boss.kind !== 'gym-teacher') return false;
    for (const e of this.enemies) if (e.def.id === boss.enemyId && e.hp > 0) return true;
    return false;
  }

  private updateBoss(dt: number): void {
    const b = this.boss;
    if (!b) return;

    if (b.phase === 'absorbing') {
      b.timer -= dt;
      if (b.timer <= 0) this.finishAct();
      return;
    }

    // Read after every kill this step has made (each damage pass reaps), so a
    // ball killed this frame opens the gap this frame. The Egg is never shielded.
    b.shielded = this.shieldUp();

    // Damage first, every frame. Folding this in after the phase timer would
    // mean the boss could only be hurt on the frames it changed phase.
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      if (p.hostile) continue;
      const r = BOSS_RADIUS + p.radius;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 > r * r) continue;
      if (b.shielded) {
        // It reaches him and does nothing: stopped, as the Egg stops a shot,
        // without the damage.
        swapRemove(this.projectiles, i);
        continue;
      }
      b.hp -= p.damage;
      swapRemove(this.projectiles, i);
      if (b.hp <= 0) {
        // It does not die. The eyes close, the corona parts, and the player
        // wins by being permitted to stop existing separately from it.
        b.hp = 0;
        b.phase = 'absorbing';
        b.timer = 1.8;
        return;
      }
    }
    for (const a of this.areas) {
      // A strike deals its one hit on the boss where it lands (landStrike).
      if (a.delay !== undefined) continue;
      // Shielded, a burst does not spend its one hit on him either: if the
      // shield drops inside its lifetime, it lands then.
      if (a.pull || a.damage <= 0 || b.shielded) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > a.radius + BOSS_RADIUS) continue;
      if (a.tick) b.hp -= a.damage * dt * 6;
      else if (a.serial !== this.bossHitSerial) {
        this.bossHitSerial = a.serial;
        b.hp -= a.damage;
      } else continue;
      if (b.hp <= 0) {
        b.hp = 0;
        b.phase = 'absorbing';
        b.timer = 1.8;
        return;
      }
    }

    // Above the phase timer: interest runs every step, not on phase changes.
    if (this.act.boss.kind === 'loan') return this.loanPhase(b, this.act.boss, dt);

    // It does not move from where it is. It has already decided.
    b.timer -= dt;
    if (b.timer > 0) return;

    const boss = this.act.boss;
    if (boss.kind === 'gym-teacher') {
      this.gymTeacherPhase(b, boss);
      return;
    }
    if (boss.kind === 'prom') {
      this.promPhase(b, boss);
      return;
    }

    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer = EGG_TELEGRAPH_SECONDS;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer = EGG_ATTACK_SECONDS;
      this.bossAttack(b);
    } else {
      b.phase = 'idle';
      b.timer = EGG_IDLE_SECONDS;
    }
  }

  private bossAttack(b: BossState): void {
    const spread = 5;
    const base = Math.atan2(this.y - b.y, this.x - b.x);
    for (let i = 0; i < spread; i++) {
      const angle = base + (i - (spread - 1) / 2) * 0.16;
      this.projectiles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * EGG_SHOT.speed,
        vy: Math.sin(angle) * EGG_SHOT.speed,
        life: EGG_SHOT.life,
        damage: EGG_SHOT.damage,
        pierce: 1,
        radius: EGG_SHOT.radius,
        hostile: true,
        source: 'boss',
        serial: this.nextSerial++,
      });
    }
  }

  /**
   * The Gym Teacher's machine (SCHOOL-ROSTER §9): idle, the whistle rising,
   * the whistle. Called when a phase's timer has run out. The overshoot is
   * carried rather than dropped, so the cadence is the same at every frame
   * rate (AUDIT 16); the Egg's machine above predates that and is left as it
   * is.
   */
  private gymTeacherPhase(b: BossState, boss: GymTeacherBoss): void {
    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer += boss.telegraphSeconds;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer += WHISTLE_HOLD_SECONDS;
      this.whistle(b, boss);
    } else {
      // Whistle to whistle is the interval at the health he has now; the
      // telegraph and the hold are inside it, not added to it.
      b.phase = 'idle';
      const interval = whistleInterval(boss, b.hp / b.maxHp);
      b.timer += Math.max(0, interval - boss.telegraphSeconds - WHISTLE_HOLD_SECONDS);
    }
  }

  /**
   * The whistle. Every living `enemyId` on the field is relaunched at where
   * the player is now, at its own def's full speed, and `thrown` more leave
   * his position in a fan centred on the same line. Nothing here is aimed
   * by him at the player except the balls: he never fires, and a death to
   * one names the ball (`hurt` takes the enemy's def), which §9 says is right.
   */
  private whistle(b: BossState, boss: GymTeacherBoss): void {
    const def = enemyDef(boss.enemyId);
    for (const e of this.enemies) {
      if (e.def.id !== def.id || e.hp <= 0) continue;
      let dx = this.x - e.x;
      let dy = this.y - e.y;
      let d = Math.hypot(dx, dy);
      if (d < 0.001) {
        // Already on the player: keep its heading at full speed, rather than
        // aim it at nothing and leave a ball standing still forever.
        dx = e.vx;
        dy = e.vy;
        d = Math.hypot(dx, dy);
        if (d < 0.001) continue;
      }
      e.vx = (dx / d) * e.def.speed;
      e.vy = (dy / d) * e.def.speed;
    }

    const base = Math.atan2(this.y - b.y, this.x - b.x);
    for (let i = 0; i < boss.thrown && this.enemies.length < MAX_ACTIVE_ENEMIES; i++) {
      const angle = base + (i - (boss.thrown - 1) / 2) * boss.throwSpread;
      this.addEnemy(def, b.x, b.y, Math.cos(angle) * def.speed, Math.sin(angle) * def.speed);
    }
    b.shielded = this.shieldUp();
  }

  /**
   * Prom's machine (ADOLESCENCE-ROSTER §4): idle, it turns; the lights go
   * down; the ring. The Egg's three phases at the Egg's timings, carried as
   * the Gym Teacher's are rather than reset as the Egg's still are, so the
   * cadence is the same at every frame rate (AUDIT 16).
   */
  private promPhase(b: BossState, boss: PromBoss): void {
    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer += EGG_TELEGRAPH_SECONDS;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer += EGG_ATTACK_SECONDS;
      this.ring(b, boss);
    } else {
      b.phase = 'idle';
      b.timer += EGG_IDLE_SECONDS;
    }
  }

  /**
   * The light: `spots` of the Egg's shot leaving the ball in every direction,
   * evenly spaced, the ring turned half a spacing from the last so the spots
   * sweep the room. Aimed at nobody, so no bearing reads the player. No
   * `owner`: a death to one names the boss (`bossName`), and they thin the
   * racers as the Egg's do (`hitRacer`).
   */
  private ring(b: BossState, boss: PromBoss): void {
    const spacing = (Math.PI * 2) / boss.spots;
    // A third of a spacing, not half: half retraced itself every other ring
    // (32 lanes for the whole fight, and a still spot between two of them
    // took nothing — AUDIT 36); a third gives 48 and the safest still spot on
    // the floor takes six a minute.
    const turn = (b.rings * spacing) / 3;
    for (let i = 0; i < boss.spots; i++) {
      const angle = turn + i * spacing;
      this.projectiles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * EGG_SHOT.speed,
        vy: Math.sin(angle) * EGG_SHOT.speed,
        life: EGG_SHOT.life,
        damage: EGG_SHOT.damage,
        pierce: 1,
        radius: EGG_SHOT.radius,
        hostile: true,
        source: 'boss',
        serial: this.nextSerial++,
      });
    }
    b.rings++;
  }

  /**
   * The Loan's step (COLLEGE-ROSTER §4), called every step it is not
   * absorbing, after the damage passes: a kill this step latched `absorbing`
   * and returned before this, so the player's last hit beats the tick.
   *
   * Interest: every `interestSeconds`, the balance grows by `interestRate` of
   * itself, held at `maxHp`. One tick a step at most, the overshoot carried
   * (AUDIT 16): a frame longer than the interval catches up over the next
   * steps rather than looping, so no `interestSeconds` can hang the step.
   * Foreclosure is the balance reaching the cap: not damage, so no health,
   * armour or i-frames stand in front of it, and it goes straight to `die`
   * as the lost race and the engulf do. Its cause is 'boss', which prints the
   * act's `bossName`.
   *
   * The statement is the Egg's machine at the Egg's timings, carried as
   * Prom's is: idle; the tape jerks (telegraph); the invoices (attack). It
   * never fires at the player, never moves and never shields (`shieldUp` has
   * no branch for it).
   */
  private loanPhase(b: BossState, boss: LoanBoss, dt: number): void {
    b.interestIn -= dt;
    if (b.interestIn <= 0) {
      b.interestIn += boss.interestSeconds;
      b.hp = Math.min(b.hp * (1 + boss.interestRate), b.maxHp);
      if (b.hp >= b.maxHp) {
        if (!this.outcomeDecided) this.die('boss');
        return;
      }
    }

    b.timer -= dt;
    if (b.timer > 0) return;
    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer += EGG_TELEGRAPH_SECONDS;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer += EGG_ATTACK_SECONDS;
      this.statement(boss);
    } else {
      b.phase = 'idle';
      b.timer += EGG_IDLE_SECONDS;
    }
  }

  /**
   * The statement: `invoices` of the act's `enemyId` at the player's lead,
   * through `spawnEnemy` — the act's own arrival, with its clamp — one per
   * heading in a fan of LOAN_INVOICE_SPREAD about the player's. The heading
   * is turned for each call and put back after, so the placement is written
   * once, in `spawnEnemy`. A lead placement draws no dice; under a
   * `spawnOverride` of 'edge' each invoice draws its angle, as the act's own
   * spawns do. Capped by MAX_ACTIVE_ENEMIES like any spawn.
   */
  private statement(boss: LoanBoss): void {
    const fx = this.facingX;
    const fy = this.facingY;
    for (let i = 0; i < boss.invoices && this.enemies.length < MAX_ACTIVE_ENEMIES; i++) {
      const turn = (i - (boss.invoices - 1) / 2) * LOAN_INVOICE_SPREAD;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      this.facingX = fx * c - fy * s;
      this.facingY = fx * s + fy * c;
      this.spawnEnemy(boss.enemyId);
    }
    this.facingX = fx;
    this.facingY = fy;
  }
}
