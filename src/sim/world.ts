import type {
  ActDef,
  BossDef,
  GymTeacherBoss,
  LoanBoss,
  MortgageBoss,
  PromBoss,
  ReorgBoss,
  SpawnWave,
  TimeBoss,
} from '../data/acts';
import { ALL_ACTS, rateAt, spawnStreams, whistleInterval } from '../data/acts';
import { ENEMIES, enemyDef, type EnemyDef } from '../data/enemies';
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
  strikeDelayAt,
  type ActiveItem,
  type ItemDef,
  type LevelBonus,
  type PassiveItem,
} from '../data/items';
import { INHERITANCES, INHERITANCE_IDS, type InheritanceDef, type StatLine } from '../data/inheritances';
import { Grid } from './grid';
import { NO_RULES, RULES, type RuleId, type RunRules } from './rules';

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
 * The Reorg (OFFICE-ROSTER §4, G-004). PLACEHOLDERS under `OFFICE.provisional`,
 * beside the five on `ReorgBoss` (thresholds [2/3, 1/3], lateralMove 220,
 * memoShots 5, memoSpacing 64). None has been played:
 *   REORG_MIN_DISTANCE 300 — §4's "at least 300 px from the player": how near
 *     a restructure may set the chart down, measured from where the player
 *     stands before their own box is moved. At the Egg's shot speed a memo
 *     from here arrives in just over a second;
 *   REORG_MARGIN — how far inside the walls the chart lands: spawnBoss's
 *     margin (BOSS_RADIUS + 40), for spawnBoss's reason: the camera is held
 *     inside the arena and a boss past its edge is a bar over an empty screen.
 * REORG_RELOCATE_TRIES is a resolution, not a dial: rolls before the farthest
 * is taken. In a 3200×2200 field a roll lands within 300 px of the player at
 * most ~6% of the time, so eight misses in a row is ~1e-10 and the fallback
 * exists only so the loop is bounded.
 * The memo is the Egg's shot (EGG_SHOT) on the Egg's timings; both are read.
 */
export const REORG_MIN_DISTANCE = 300;
export const REORG_MARGIN = BOSS_RADIUS + 40;
export const REORG_RELOCATE_TRIES = 8;

/**
 * The Mortgage's door (FAMILY-ROSTER §4), px below the boss point: where a
 * missed window's late fee (`MortgageBoss.feeId`) is set down. Measured, not
 * chosen: boss-mortgage.svg draws the door (its mouth) centred on 0.80 of the
 * sprite's height and the body circle the sim's point stands for on 0.68, r
 * 0.30 (its own comment), so at BOSS_RADIUS the sprite is BOSS_RADIUS / 0.30
 * tall and the door is 0.12 of that below the point. Straight below, so it
 * needs no dice and no heading. If the drawing's door moves, this follows it.
 */
export const MORTGAGE_DOOR_BELOW = ((0.8 - 0.68) * BOSS_RADIUS) / 0.3;

/**
 * The floor under the insurance form's decisions (DECLINE-ROSTER §3.5,
 * `ranged.maxHpLoss`), as a share of the act's opening maximum health
 * (`World.openingMaxHp`, captured at the act's start): a landing decision
 * takes `maxHpLoss` of the maximum as it stands, and never takes it below
 * this share of what it was when the act began. At the floor a decision
 * takes nothing more. Read as `World.maxHpFloor`.
 *
 * PLACEHOLDER, a fifth — §3.5's own "a fifth of the act's opening maximum",
 * under `DECLINE.provisional`. Nobody has played it. It exists so the form
 * cannot decide the player out of existence without landing a hit; a person
 * who feels the ceiling come down at the link is what moves it.
 */
export const MAX_HP_FLOOR = 1 / 5;

/**
 * Time's long hand at rest (DECLINE-ROSTER §4, AUDIT 96), in radians: 60.6°
 * clockwise from twelve, pointing at two. Measured, not chosen: the drawer
 * measured it on `boss-time` (tools/art/svg/decline/boss-time.svg, "ten past
 * ten"), the holder frame, where the pose is baked in. In play Time is drawn
 * in its face frame without the long hand (D-029, AUDIT 148) and the
 * renderer draws the hand from `BossState.hand`, which is this at Time's
 * arrival, so the first frame's hand stands where the drawing's would. If
 * the drawing's rest pose moves, this follows it.
 */
export const TIME_HAND_REST = (60.6 * Math.PI) / 180;

/**
 * The file (DECLINE-ROSTER §4): one of `TIME_FILE_ID` at the player's lead
 * at every 1/TIME_FILES_PER_TURN of a turn of Time's long hand, counted from
 * its arrival, so the first lands a quarter turn in (`World.turnHand`). The
 * id is the roster's knee (§3.3), and a test pins it to a Decline enemy:
 * `TimeBoss` carries no id of its own (the Mortgage's `roomId` is the shape
 * that would), so it lives here, beside its cadence.
 *
 * PLACEHOLDER, 4 — §4's "a knee a quarter turn", under `DECLINE.provisional`.
 * Nobody has played it.
 */
export const TIME_FILES_PER_TURN = 4;
export const TIME_FILE_ID = 'your-knees';

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
  /**
   * `def.split` only (reply-all, OFFICE-ROSTER §3.1): how many splits deep
   * this one is. 0 for anything the schedule or a boss put on the field;
   * each child is its parent's plus one, and at `split.generations − 1` it
   * dies as any enemy does (`reapDead`). Set to 0 on every enemy by
   * `addEnemy`; optional so hand-built states need not carry it.
   */
  generation?: number;
  /**
   * `def.accrue` only (the bill, FAMILY-ROSTER §3.1): how many late fees this
   * one has issued, and `fee` on a bill that IS one. A fee never accrues.
   * Absent on everything else, and on a bill that has issued none; optional
   * so hand-built states need not carry them (`accrueFees`).
   */
  accrued?: number;
  fee?: boolean;
  /**
   * College (the Highlighter's `marks`): the life clock (`World.time`) at
   * which this enemy's mark runs out, and what the mark multiplies every hit
   * by until then. Set by a marking shot's hit (`markFrom`), paid in
   * `damageEnemy`; a mark past its time is simply not read. Absent on
   * anything never marked; optional so hand-built states need not carry them.
   */
  markedUntil?: number;
  markMultiplier?: number;
  /**
   * G-054 (Cry): the life clock (`World.time`) until which this enemy moves
   * at `slowedTo` of its speed, wherever it goes: a cry's edge crossed it and
   * shoved it, so the hold goes with it rather than staying on the floor. Read
   * beside the areas' and holds' slows by the one rule they share — the
   * slowest wins, nothing multiplies (`slowOn`). A later cry replaces it.
   * Absent on anything never cried at; optional so hand-built states need not
   * carry them.
   */
  slowedUntil?: number;
  slowedTo?: number;
}

/** What a mark is written on: an enemy or the boss (College, `markFrom`). */
interface Markable {
  markedUntil?: number;
  markMultiplier?: number;
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
  /**
   * `ranged.pull` only (the phone call, FAMILY-ROSTER §3.5): the enemy that
   * fired it, and where it stood when it did. A landing pulls the player
   * toward the shooter where it is at the hit, or toward (`fromX`, `fromY`)
   * if it has left the field (`pullToward`). Absent on every other shot.
   */
  shooter?: EnemyState;
  fromX?: number;
  fromY?: number;
  /**
   * College: a shot from a def with `marks` (the Highlighter) carries the
   * mark it leaves, levels and paths already folded in: seconds (`duration`
   * applied) and multiplier (`mark` applied). Absent on every other shot.
   */
  markSeconds?: number;
  markMultiplier?: number;
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
 * A cry (G-054): a ring spreading from where the player stood when it went
 * off. Its radius now is `maxRadius * age / seconds`; it is gone once `age`
 * reaches `seconds`. Everything its edge crosses is shoved outward and
 * slowed, once per cry (`updateCries`). Never on `rings`: those are hostile
 * hazards the bots dodge, and this one is the player's. `source` is the item
 * that cried, for the renderer.
 */
export interface CryState { x: number; y: number; age: number; seconds: number; maxRadius: number; source: string }

/** A cry as the sim runs it: what its edge does, and whom it has already done it to. */
interface Cry extends CryState {
  /** Pixels its edge shoves what it crosses, bonuses applied. */
  shove: number;
  /** The fraction of speed what it crosses moves at, and for how long. */
  slow: number;
  slowSeconds: number;
  /** Uids its edge has crossed: once per enemy per cry. */
  crossed: Set<number>;
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
  /**
   * The rules the life was played under (G-055, `rules.ts`), in the
   * registry's order; empty for a plain life. The form prints each one's
   * `certificate` line and the ancestors keep them.
   */
  rules: RuleId[];
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
  /**
   * A strike: the seconds `delay` started from, so the renderer can draw the
   * telegraph as a fraction of its own wait (the Letter's five seconds, not
   * Judgement's STRIKE_DELAY). Presentation metadata, like `source`.
   */
  telegraph?: number;
  /** The item that made this area, where one did and the renderer needs it. Presentation metadata. */
  source?: string;
  /**
   * `'player'` on an area an item laid for the crowd and not for its holder:
   * Spilt Milk's puddle (G-054), put down where the player stands. Its `slow`
   * holds enemies and shots by the one rule (`slowAt`) and never the player
   * (`slowAtPlayer` skips it, as it skips a damaging trail). Absent on
   * Snooze's field, which holds everyone, its holder included.
   */
  owner?: 'player';
}

/**
 * A hold (OFFICE-ROSTER §3.4, the meeting): a place, not a body. An enemy
 * whose def carries `hold` becomes one of these where it is spawned and is
 * never on the field as an enemy (`addEnemy`), so no target, hit, contact or
 * cull can reach it. It contracts from `from` to `to` over `seconds`, holds at
 * `to` for `holdSeconds`, then ends (`updateHolds`). Inside it everything
 * moves at `slow` (`slowAt`, the same reading Snooze's field has); its edge is
 * a wall for the crowd both ways (`wallHolds`) and never for the player. No
 * damage, no drop, nothing on the certificate.
 */
export interface HoldState {
  x: number;
  y: number;
  /** Honest: the radius it slows and walls at, this step. */
  radius: number;
  from: number;
  to: number;
  seconds: number;
  holdSeconds: number;
  age: number;
  slow: number;
  /**
   * The enemy id it was spawned as, and the renderer draws that def's frame;
   * for a player's hold, the item id that placed it.
   */
  source: string;
  /**
   * Absent for an enemy's hold (the meeting). `'player'` for one an item put
   * down (Calendar block's `wall`, OFFICE's first item): the same wall on the
   * same list, with no enemy def behind `source`, so the renderer draws the
   * item's icon for it instead of chairs.
   */
  owner?: 'player';
}

/**
 * How far to the right side of a hold's edge the wall sets an enemy, px. An
 * enemy set exactly on the edge is read as inside by `d <= radius`, and one
 * pushed back out would walk in on the next step; float error either way is
 * far below this. Invisible at any zoom.
 */
const HOLD_EDGE = 0.01;

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
   * filling is the fight. For Time, inert: BOSS_HP from its arrival to its
   * end, because nothing is accepted from anything (`bossTakes`); its bar is
   * `secondsLeft`. For every other kind, health left.
   */
  hp: number;
  /** For the Loan, the cap: `cap` × the opening balance, where it forecloses. */
  maxHp: number;
  /**
   * `idle` → `telegraph` → `attack`, then back. For the Gym Teacher the
   * telegraph is the whistle rising and `attack` begins on the step it blows;
   * for Prom it is the lights going down and `attack` begins on the ring;
   * for the Loan it is the tape jerking and `attack` begins on the statement;
   * for the Reorg it is the memo drafted and `attack` begins on the memo, and
   * a restructure sets it back to `idle`; for the Mortgage it is the
   * statement drafted and `attack` begins on its one shot (DUE). The
   * Mortgage's window clock (`windowTimer`) runs beside it, not in it. Time
   * stays `idle` until its clock (`secondsLeft`) runs out.
   * The exit, for every kind, is `absorbing`: the word is the Egg's, and it
   * means the outcome has latched (G-033) and `finishAct` follows the timer —
   * the Gym Teacher's stopwatch click and `ActDef.endWord` play in it. Time
   * reaches it by running out, not by falling (`timePhase`).
   */
  phase: 'idle' | 'telegraph' | 'attack' | 'absorbing';
  /** Seconds left in the current phase. */
  timer: number;
  /**
   * True while it cannot be damaged: the Gym Teacher with any of his
   * `enemyId` alive on the field (§9); Prom with the player farther than its
   * `floorRadius` from the ball (ADOLESCENCE-ROSTER §4). Always false for the
   * Egg, the Loan, the Reorg and the Mortgage. Plain state for the renderer and the bots;
   * the sim reads the field and the player itself. Always false for Time too:
   * a shield is a thing that opens, and nothing opens Time — it is not
   * shielded, it is untouchable (`bossTakes`), and nothing reads it as a
   * shield to be got round.
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
  /**
   * How many of its `thresholds` the Reorg has restructured at this act, in
   * order: 0 until its health first reaches two thirds, then 1, then 2, and
   * never more than there are thresholds. Read-only outside the sim; the
   * renderer greys the chart's rows from it. Zero for the kinds that never
   * restructure.
   */
  restructures: number;
  /**
   * The Mortgage's windows paid (FAMILY-ROSTER §4), 0 to `instalments`: the
   * bar's notches. Set at each window's end from the health left, so between
   * windows hp is exactly maxHp × (instalments − paid) / instalments and
   * hp/maxHp reads paid twelfths. At `instalments` it is paid off: the exit.
   * Zero for every other kind.
   */
  paid: number;
  /**
   * The Mortgage's window clock: seconds left in the current window, counting
   * down from `instalmentSeconds`, set at spawn and carried at each window's
   * end as the Loan's interest clock is. Zero for every other kind.
   */
  windowTimer: number;
  /**
   * Damage the Mortgage has accepted this window, 0 to one instalment
   * (maxHp / instalments): what the gate (`bossTakes`) let through. Equal to
   * one instalment once the window is met; everything after it is lost. Back
   * to 0 at each window's end, when a short window is refunded to hp. Zero for
   * every other kind.
   */
  accepted: number;
  /**
   * Time's clock (DECLINE-ROSTER §4): seconds until the life ends, won,
   * counting down from `TimeBoss.seconds` at its arrival and held at 0 once
   * it gets there, the step the outcome latches (`timePhase`). Its bar: the
   * renderer and the bots read this, never `hp`, which Time's gate never
   * moves (hp and maxHp stay BOSS_HP, inert). Zero for every other kind.
   */
  secondsLeft: number;
  /**
   * Time's long hand (DECLINE-ROSTER §4): its angle in radians, clockwise
   * from twelve, wrapped to [0, 2π). World axes are the screen's, +x right
   * and +y down, so 0 points up the screen (twelve), π/2 at three, π at six,
   * and the hand points along (sin hand, −cos hand); increasing is clockwise
   * as the player sees it, the sense of Phaser's `rotation`. TIME_HAND_REST
   * (pointing at two, the drawn pose) at Time's arrival, then 2π every
   * `TimeBoss.sweepSeconds` while its clock runs — never faster, never reset
   * — and where it is when the clock runs out: the hands stop. The hazard is
   * `sweepLength` × `sweepWidth` from the boss point along it (`fromHand`);
   * the short hand is drawing only. Zero for every other kind.
   */
  hand: number;
  /**
   * Time's file (DECLINE-ROSTER §4): how many times it has been read since
   * Time's arrival, one at every 1/TIME_FILES_PER_TURN of the long hand's
   * turn (a quarter turn), each a knee at the player's lead — or none, at
   * MAX_ACTIVE_ENEMIES, and still counted. A whole count. Zero for every
   * other kind.
   */
  filed: number;
  /**
   * College: a Highlighter stroke marks the boss as it marks an enemy (the
   * same fields, `EnemyState.markedUntil`), and `bossTakes` pays the mark on
   * every kind — a marked Loan pays down faster; a marked Mortgage still takes
   * no more than its instalment. Absent until the first mark.
   */
  markedUntil?: number;
  markMultiplier?: number;
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
  /**
   * Items the run starts with. Absent is Pointing (`lash`), or nothing under
   * One Trick, whose life starts empty-handed (G-055).
   */
  startingItems?: string[];
  /**
   * The rules the life is played under (G-055, `rules.ts`). Absent is
   * `NO_RULES`. Enforced here, so a bot plays a ruled life exactly as a
   * person does; a rule is the game, not a cheat, and taints nothing.
   */
  rules?: RunRules;
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

/** An angle in radians, wrapped to [0, 2π). */
function turnOf(angle: number): number {
  const TAU = Math.PI * 2;
  const a = angle % TAU;
  return a < 0 ? a + TAU : a;
}

/**
 * How far the point (x, y) is from Time's long hand (DECLINE-ROSTER §4): a
 * rectangle `length` px long and `width` px across, from the pivot (px, py)
 * along `angle` — radians clockwise from twelve in world axes, where +x is
 * right and +y is down, so the hand points along (sin angle, −cos angle).
 * One side of the pivot only: the long hand, and nothing behind it (the
 * short hand is drawn and harmless). 0 on or inside the rectangle. A body of
 * radius r touches the hand when this is at most r. The sim's contact
 * (`World.turnHand`) and the bots' reading of it both call this, so they
 * read one shape.
 */
export function fromHand(
  px: number,
  py: number,
  angle: number,
  length: number,
  width: number,
  x: number,
  y: number,
): number {
  const ux = Math.sin(angle);
  const uy = -Math.cos(angle);
  const dx = x - px;
  const dy = y - py;
  const along = dx * ux + dy * uy;
  const across = Math.abs(dx * uy - dy * ux);
  const a = along < 0 ? -along : along > length ? along - length : 0;
  const c = Math.max(0, across - width / 2);
  return Math.hypot(a, c);
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
  /**
   * Seconds Time's long hand has run since its arrival (`turnHand`): the
   * hand's angle and the file's count are both read off this one sum, so
   * neither drifts from the other. Set at every boss's arrival; only Time
   * reads it.
   */
  private handSeconds = 0;
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
   * The body holding the player, from the touch until the window ends, and
   * what its hold does to every cooldown meanwhile (FAMILY-ROSTER §3.4:
   * `engulf.cooldownMultiplier`, 1 for a hold without one). The body is kept
   * so an engulf that `releases` can take exactly that one off the field.
   */
  private engulfer: EnemyState | null = null;
  private engulfCooldown = 1;
  /**
   * The player's own movement this step — the walk, the Egg's pull and the
   * walls, nothing an enemy did to them — for `coy` (FAMILY-ROSTER §3.4). Only
   * its direction is read. Zero when stunned, pressed into a wall or still.
   */
  private movedX = 0;
  private movedY = 0;
  /**
   * The insurance form's decisions this act (DECLINE-ROSTER §3.5,
   * `ranged.maxHpLoss`): the share of the maximum health the items give that
   * is left, the product of (1 − maxHpLoss) over every decision that landed,
   * held at the floor (`maxHpFloor`). 1 until one lands, and back to 1 at
   * every crossing: "for the rest of the act". Read through `maxHp`.
   */
  private maxHpShare = 1;
  /**
   * The maximum health the items gave when this act began, before any
   * decision: what MAX_HP_FLOOR is a share of. Set by the constructor and by
   * `beginAct`, and read through `openingMaxHp`.
   */
  private actOpeningMaxHp = PLAYER_BASE_HP;

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
   * Worn stacks whose attach carries a `cooldownMultiplier` (the ping,
   * OFFICE-ROSTER §3.3), and the product of their multipliers, which
   * `cooldownFactor` multiplies in. Read through `pingStacks` and
   * `attentionFactor`. They come off at the crossing unless the attach
   * `persists`, as the drag does; the ping's does not.
   */
  private cooldownStacks = 0;
  private attention = 1;
  private persistentCooldownStacks = 0;
  private persistentAttention = 1;
  /**
   * Stacks worn, by the id of the def that attached them (AUDIT six, 38): the
   * persisting ones through every crossing, the rest until the next. For
   * drawing each stack in its own act's frame; `dragStacks` stays the
   * number the sim moves the player by. Read through `wornBy`.
   */
  private readonly worn = new Map<string, number>();
  private readonly persistentWorn = new Map<string, number>();
  /**
   * Seconds left of a `contactStun` (the hall monitor, §3.4). While it runs
   * `movePlayer` ignores input. Refreshed by a touch, never extended past it.
   */
  stunTimer = 0;
  /**
   * Decline's Nap (items.ts `nap`, world.ts `nap`): seconds left asleep, 0
   * awake. Public so the renderer and the bots can see it; while it runs no
   * contact hurts the player, and the stop itself is `stunTimer`'s. `napRate`
   * is the health a second the nap running now gives back.
   */
  napTimer = 0;
  private napRate = 0;
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
  /** Meetings (OFFICE-ROSTER §3.4) on the field. Read-only outside the sim. */
  readonly holds: HoldState[] = [];
  gems: GemState[] = [];
  /** Everything circling the player this step. Read-only outside the sim. */
  orbiters: OrbiterState[] = [];
  /** Every aura ring around the player this step (G-044). Read-only outside the sim. */
  readonly auras: AuraState[] = [];
  /** Arcs swung in the last SWEEP_SECONDS, for drawing (G-044). Read-only outside the sim. */
  readonly sweeps: SweepState[] = [];
  /** Cries still spreading (G-054), what the renderer reads as `cries`. */
  private readonly cryList: Cry[] = [];
  boss: BossState | null = null;
  /**
   * Racers that reached the boss this act (`ActDef.race`). Reset per act.
   * Read by the renderer against `raceTarget`.
   */
  raceAbsorbed = 0;

  readonly bossPull: number;
  readonly spawnOverride: 'edge' | 'lead' | undefined;
  /**
   * The life's rules (G-055), each once, in the registry's order: what the
   * sim enforces (`movePlayer`, `rollOffers`) and the certificate prints.
   */
  readonly rules: RunRules;

  constructor(options: WorldOptions) {
    const life = options.acts ?? (options.act ? [options.act] : []);
    if (life.length === 0) throw new Error('A World needs at least one act');
    this.life = life;
    this.bossPull = options.bossPull ?? BOSS_PULL;
    this.spawnOverride = options.spawnOverride;
    const given = options.rules ?? NO_RULES;
    // A rule the registry does not hold would be one nothing enforces: refused,
    // as a life with no acts is, rather than played as a plain life.
    for (const id of given) {
      if (!Object.prototype.hasOwnProperty.call(RULES, id)) throw new Error(`No rule "${String(id)}" in the registry`);
    }
    this.rules = Object.freeze((Object.keys(RULES) as RuleId[]).filter((id) => given.includes(id)));
    this.seed = options.seed ?? 1;
    this.rng = mulberry32(this.seed);
    this.streams = spawnStreams(this.act.waves);
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;
    for (const id of options.startingItems ?? (this.oneTrick ? [] : ['lash'])) this.items.set(id, 1);
    this.actOpeningMaxHp = this.itemMaxHp;
    // One Trick's opening offer (G-055): a life under it that holds no weapon
    // is dealt three before its first step, by the roll a level-up uses
    // (`rollOffers` deals weapons alone while none is held), so the first
    // thing a person does is choose. Not a level: `level` and the bar stay
    // where they are; only the choice is owed. Never an empty offer (AUDIT 1).
    if (this.oneTrick && !this.holdsWeapon) {
      const opening = this.rollOffers();
      if (opening.length > 0) this.offers = opening;
    }
  }

  /** Couch Potato (G-055): the stick turns the player and never carries them. */
  private get couchPotato(): boolean {
    return this.rules.includes('couch-potato');
  }

  /** One Trick (G-055): no weapon but the one chosen from the opening offer. */
  private get oneTrick(): boolean {
    return this.rules.includes('one-trick');
  }

  /**
   * The offer up is One Trick's opening (G-055): the rule is on, no weapon is
   * held yet, and a choice is waiting. The renderer's header says so, where a
   * level-up's names the level; this one is not a level.
   */
  get choosingTrick(): boolean {
    return this.offers !== null && this.oneTrick && !this.holdsWeapon;
  }

  /** The player holds a weapon, or what one became (every evolution is a weapon). */
  private get holdsWeapon(): boolean {
    for (const id of this.items.keys()) if (ITEMS[id]?.kind === 'weapon') return true;
    return false;
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

  /**
   * The ceiling on health: what the items give (`itemMaxHp`), less what the
   * insurance form has decided this act (DECLINE-ROSTER §3.5) — each landing
   * decision took `maxHpLoss` of it as it stood — and never below the floor
   * (`maxHpFloor`) nor above what the items give. Every reader of the
   * maximum reads this: the HUD's bar, the pause sheet's `health`, a heal,
   * the crossing's refill. Exactly `itemMaxHp` in every act nothing decides.
   */
  get maxHp(): number {
    const full = this.itemMaxHp;
    if (this.maxHpShare >= 1) return full;
    return Math.min(full, Math.max(full * this.maxHpShare, this.maxHpFloor));
  }

  /** The maximum health the items give, before any decision (Thick Skin's line). */
  private get itemMaxHp(): number {
    return PLAYER_BASE_HP * this.passiveProduct((d) => d.healthMultiplier);
  }

  /**
   * The maximum health the items give now, with no decision applied: the
   * base times every passive's `healthMultiplier` and the inheritance's, with
   * no `maxHpLoss` taken. What `maxHp` would be if nothing had decided, so a
   * HUD drawing the maximum against it shows a decision's loss even after a
   * later Thick Skin (AUDIT 122). Moves with the items; never with a
   * decision. Read-only.
   */
  get itemsMaxHp(): number {
    return this.itemMaxHp;
  }

  /**
   * The maximum health this act began with, before any decision: the length a
   * HUD can draw the maximum's bar against, so a shrinking maximum shows as a
   * shrinking bar rather than as a full one (DECLINE-ROSTER §5). Read-only.
   */
  get openingMaxHp(): number {
    return this.actOpeningMaxHp;
  }

  /**
   * Where the insurance form's decisions stop (MAX_HP_FLOOR of the act's
   * opening maximum), in health. Read-only; the HUD can mark it.
   */
  get maxHpFloor(): number {
    return MAX_HP_FLOOR * this.actOpeningMaxHp;
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
   * Every worn stack off, and the tax with them. DEV ONLY: nothing in the
   * rules calls it. The dev panel's "no drag" (AUDIT 42) must take the tax
   * off with the drag, and the tax is private. The persisting part is left
   * alone, so the next crossing restores it as it would have.
   */
  shedWornStacks(): void {
    this.dragStacks = 0;
    this.taxedStacks = 0;
    this.xpTaxFactor = 1;
    // The pings and the by-def record go with them (OFFICE-ROSTER §3.3; AUDIT 42),
    // and the notices' cost to reach, which is read off that record.
    this.cooldownStacks = 0;
    this.attention = 1;
    this.worn.clear();
  }

  /**
   * What the pings worn do to every cooldown: the product of their
   * `cooldownMultiplier`s (two pings, 1.06²), 1 with none. Already inside
   * `cooldownFactor`; exposed for the HUD.
   */
  get attentionFactor(): number {
    return this.attention;
  }

  /** Worn stacks that carry a cooldown multiplier (pings), for the HUD. */
  get pingStacks(): number {
    return this.cooldownStacks;
  }

  /**
   * Stacks worn, by the def id that attached them — `{ tuition: 2, ping: 1 }`
   * — so a renderer can draw a College invoice in The Office (AUDIT six, 38).
   * Read-only; `dragStacks` is the sim's number.
   */
  get wornBy(): ReadonlyMap<string, number> {
    return this.worn;
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

  /** Every cry still spreading (G-054), for drawing. Never `rings`, which are hostile. */
  get cries(): readonly CryState[] {
    return this.cryList;
  }

  /**
   * The player's own hold: every field that holds them (Snooze's) but never
   * a damaging trail (Rut's, G-046), which is laid where the player stands
   * and would otherwise hold them for as long as they kept moving. A trail
   * holds what follows; the player walks it at full speed. A meeting holds
   * them too (OFFICE-ROSTER §3.4), and never walls them in. Nor does an area
   * an item laid for the crowd (`owner`, Spilt Milk's puddle, G-054): it goes
   * down under the player every burst, and would hold its holder too.
   */
  private slowAtPlayer(): number {
    let k = 1;
    for (const f of this.areas) {
      if (f.slow === undefined || f.slow >= k || f.damage > 0 || f.owner === 'player') continue;
      if ((this.x - f.x) ** 2 + (this.y - f.y) ** 2 <= f.radius * f.radius) k = f.slow;
    }
    return this.slowInHolds(this.x, this.y, k);
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
   * The movement multiplier at a point: the slowest Snooze field or meeting
   * (`holds`) whose area holds it, 1 outside all of them. Slowest rather than
   * product, so two overlapping fields are one field and not a standstill.
   * Reads `areas` directly; the per-entity passes collect the fields once
   * instead. The holds are always read whole: there are a few at most.
   */
  slowAt(x: number, y: number, fields: readonly AreaState[] = this.areas): number {
    let k = 1;
    for (const f of fields) {
      if (f.slow === undefined || f.slow >= k) continue;
      if ((x - f.x) ** 2 + (y - f.y) ** 2 <= f.radius * f.radius) k = f.slow;
    }
    return this.slowInHolds(x, y, k);
  }

  /**
   * `k` (what the floor holds `e` at: `slowAt`), or what a cry left on `e`
   * while it lasts, if slower (G-054): the slowest wins, as between fields.
   */
  private slowOn(e: EnemyState, k: number): number {
    const to = e.slowedTo;
    return to !== undefined && to < k && e.slowedUntil !== undefined && this._time < e.slowedUntil ? to : k;
  }

  /** `k`, or the slowest hold whose centre-within-radius holds the point, if slower. */
  private slowInHolds(x: number, y: number, k: number): number {
    for (const h of this.holds) {
      if (h.slow >= k) continue;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.radius * h.radius) k = h.slow;
    }
    return k;
  }

  /**
   * True when nothing on the field slows a mover: no Snooze field collected
   * and no hold. The per-entity passes skip `slowAt` entirely then.
   */
  private unheld(fields: readonly AreaState[]): boolean {
    return fields.length === 0 && this.holds.length === 0;
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

  /**
   * Restlessness: every active item's cooldown, multiplied. And the pings
   * worn (`attentionFactor`, OFFICE-ROSTER §3.3), which are 1 until one is,
   * and a hand held (`engulfCooldownFactor`, FAMILY-ROSTER §3.4), which is 1
   * outside a hold that carries one. Every weapon's cadence, an orbiter's and
   * an aura's re-hit read this through `activeCooldown`.
   */
  get cooldownFactor(): number {
    return this.passiveProduct((d) => d.cooldownMultiplier) * this.attention * this.engulfCooldownFactor;
  }

  /**
   * What the hold running now does to every cooldown: the engulfer's
   * `engulf.cooldownMultiplier` while its window runs, 1 otherwise and for a
   * hold without one (the white cell's, the test's). Already inside
   * `cooldownFactor`; exposed for the HUD.
   */
  get engulfCooldownFactor(): number {
    return this.engulfTimer > 0 ? this.engulfCooldown : 1;
  }

  /**
   * The body holding the player while a hold's window runs (an engulf: the
   * white cell's, the toddler's), else null. The one the sim chose at the
   * touch, not whichever engulfer is touching now, so a renderer or a sound
   * need not guess between two (AUDIT 81, 112); its `def` is what holds.
   * Null once the window is over, or zeroed from outside (dev god mode). A
   * body killed mid-hold is still the holder until the window ends, and is
   * no longer in `enemies`. Read-only.
   */
  get heldBy(): Readonly<EnemyState> | null {
    return this.engulfTimer > 0 ? this.engulfer : null;
  }

  /**
   * Appetite: how far away a gem starts coming to the player. And the
   * notices worn (`pickupFactor`, FAMILY-ROSTER §3.3): the lawn ends closer.
   */
  get magnetRadius(): number {
    return MAGNET_RADIUS * this.passiveProduct((d) => d.pickupMultiplier) * this.pickupFactor;
  }

  /**
   * What the notices worn do to the pickup radius: each worn stack of a def
   * whose attach carries `pickup` multiplies it once (two HOA letters, 0.93²),
   * 1 with none. Read off `wornBy`, by the registry's def for each id, so it
   * crosses exactly as the record does — a persisting notice's cost stays on
   * with it (`beginAct`), and the dev panel's shed takes it off with the rest.
   * Already inside `magnetRadius`; exposed for the HUD.
   */
  get pickupFactor(): number {
    let k = 1;
    for (const [id, n] of this.worn) {
      const pickup = ENEMIES[id]?.attach?.pickup;
      if (pickup !== undefined) k *= pickup ** n;
    }
    return k;
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

    const fromX = this.x;
    const fromY = this.y;
    this.movePlayer(dt, input);
    this.applyBossPull(dt);
    // Unconditional, and after every path that can move the player. Hanging it
    // off `movePlayer` meant a frame with no input did not clamp at all, so any
    // other way of setting a position escaped the field.
    this.clampPlayer();
    // What the player did this step, for `coy`: read before anything else in
    // the step moves them (a pile's push, a phone's pull, a restructure).
    this.movedX = this.x - fromX;
    this.movedY = this.y - fromY;
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
    // After firing, so a cry spreads on the step it goes off (G-054).
    this.updateCries(dt);
    this.moveProjectiles(dt);
    this.updateRings(dt);
    this.updateAreas(dt);
    this.updateHolds(dt);
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
    // Couch Potato (G-055): the walk is refused and the turn is not. Facing
    // is the aim — Pointing's line, the Backhand's arc, where a lead lands —
    // so the stick still points it; only the carrying is ignored. Everything
    // that moves the player from outside (a pull, a pile's push, a
    // restructure) is outside this function and still does. A stun still
    // refuses the turn above, as it always has.
    if (this.couchPotato) return;
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
      let fx = this.facingX;
      let fy = this.facingY;
      // A hold that would land with the player inside it — the stairs at a
      // wall the player faces, pulled back onto them by the clamp below
      // (AUDIT 93) — lands at the lead behind them instead, as the Mortgage's
      // room does (`landOffPlayer`): a refuge set down over the player walls
      // the crowd in with them. Read off where they stand; no dice.
      if (def.hold && this.leadLandsOnPlayer(def, fx, fy)) {
        fx = -fx;
        fy = -fy;
      }
      x = this.x + fx * ANTIBODY_LEAD;
      y = this.y + fy * ANTIBODY_LEAD;
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
    } else if ((this.spawnOverride ?? def.spawnAt) === 'player') {
      // OFFICE-ROSTER §3.4: the meeting is called where the player stands,
      // and the hold is centred on them. No dice: nothing about it is chosen.
      x = this.x;
      y = this.y;
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
   * but where they started. Null for a def with `hold`, which becomes a hold
   * instead of a body.
   */
  private addEnemy(def: EnemyDef, x: number, y: number, vx: number, vy: number): EnemyState | null {
    // A hold is a place, not a body (OFFICE-ROSTER §3.4): it goes on `holds`
    // where it was placed and never on `enemies`, so no pass that walks the
    // crowd — targets, hits, contact, the grid, the cull, the cap — can see
    // it. Here rather than in `spawnEnemy`, so whatever places one (a wave,
    // the Reorg's threshold) gets a hold and nothing else. No dice drawn.
    if (def.hold) {
      const { from, to, seconds, holdSeconds, slow } = def.hold;
      // A hold with no contraction (the stairs, DECLINE-ROSTER §3.4:
      // `seconds` 0) is at `to` from the step it lands, before its first
      // `updateHolds` — the walk that walls this step reads the radius here.
      const radius = seconds > 0 ? from : to;
      this.holds.push({ x, y, radius, from, to, seconds, holdSeconds, age: 0, slow, source: def.id });
      return null;
    }
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
      generation: 0,
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
      // A fee is pushed past `i` and is not walked until the next step.
      if (e.def.accrue && e.fee !== true) this.accrueFees(e, e.def.accrue);
      if (e.def.merge) this.solids.push(e);

      // Snooze and a meeting hold the walk and nothing else: fuses and
      // consults keep time. So does a cry's slow, carried by the enemy (G-054).
      const mdt = dt * this.slowOn(e, this.unheld(fields) ? 1 : this.slowAt(e.x, e.y, fields));
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
        // The toddler wants to be chased (FAMILY-ROSTER §3.4); a racer does not care.
        const coy = e.def.coy;
        const speed = coy && !racing ? e.def.speed * this.coyness(e, coy) : e.def.speed;
        e.x += ((tx - e.x) / d) * speed * mdt;
        e.y += ((ty - e.y) / d) * speed * mdt;
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

      // A meeting's edge (OFFICE-ROSTER §3.4), against where it stood before
      // the walk. Here, in the one loop that has both positions: the grid
      // holds last step's cells, so it cannot say who was where.
      if (this.holds.length > 0) this.wallHolds(e, fromX, fromY);

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
   * The bill's late fees (FAMILY-ROSTER §3.1, `accrue`): each time an enemy's
   * age passes another `seconds` it issues one more of its own def, up to
   * `fees` in all, and the fee is flagged and never accrues. A frame longer
   * than `seconds` issues what it owes at once, never past `fees`.
   *
   * Set down touching it (its radius plus the def's from its centre) across
   * the line from it to the player, the first fee on one side and the second
   * on the other, so two fees flank the bill rather than stack on it — the
   * split's spread, by index. No dice: the place is arithmetic, and
   * `addEnemy` rolls only for a weak point, which nothing that accrues
   * carries, so no seed's later rolls move. Capped by MAX_ACTIVE_ENEMIES like
   * any spawn: at the cap the fee is not issued, and is not owed after.
   */
  private accrueFees(e: EnemyState, accrue: NonNullable<EnemyDef['accrue']>): void {
    let issued = e.accrued ?? 0;
    while (issued < accrue.fees && e.age >= (issued + 1) * accrue.seconds) {
      issued++;
      e.accrued = issued;
      if (this.enemies.length >= MAX_ACTIVE_ENEMIES) continue;
      const across = Math.atan2(this.y - e.y, this.x - e.x) + ((issued % 2 === 1 ? 1 : -1) * Math.PI) / 2;
      const d = e.radius + e.def.radius;
      const fee = this.addEnemy(e.def, e.x + Math.cos(across) * d, e.y + Math.sin(across) * d, 0, 0);
      if (fee) fee.fee = true;
    }
  }

  /**
   * The toddler's speed, as a share of its own (FAMILY-ROSTER §3.4, `coy`):
   * `flee` while the player's movement this step points away from it,
   * `approach` while it points toward it, 1 while the player did not move or
   * moved exactly across the line. Read off what the player did (`movedX`,
   * `movedY`), not where they face: a stunned player, or one pressed into a
   * wall, is standing still. No dice.
   */
  private coyness(e: EnemyState, coy: NonNullable<EnemyDef['coy']>): number {
    const toward = this.movedX * (e.x - this.x) + this.movedY * (e.y - this.y);
    return toward < 0 ? coy.flee : toward > 0 ? coy.approach : 1;
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
        const fromX = e.x;
        const fromY = e.y;
        e.x += ((a.x - e.x) / d) * strength;
        e.y += ((a.y - e.y) / d) * strength;
        // A meeting's edge holds against the pull as against the walk.
        if (this.holds.length > 0) this.wallHolds(e, fromX, fromY);
      }
    }
  }

  /**
   * The boss as a seeking target, if it exists and is in range of its edge.
   * Never Time (DECLINE-ROSTER §4): nothing hurts it, and a weapon does not
   * aim at what it cannot hurt (AUDIT part three, 22; `nearestEnemies`).
   */
  private bossAsTarget(within: number): { x: number; y: number } | null {
    const b = this.boss;
    if (!b || b.phase === 'absorbing' || b.kind === 'time') return null;
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
      // Nor a nap: it waits for low health, not a cooldown (`nap`).
      if (def.mode === 'nap') continue;

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
          const shot: ProjectileState = {
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
          };
          // College (the Highlighter): the stroke carries its mark, with
          // `duration` on the seconds and `mark` on the multiplier.
          if (def.marks) {
            shot.markSeconds = def.marks.seconds * bonus.duration;
            shot.markMultiplier = def.marks.multiplier * bonus.mark;
          }
          this.projectiles.push(shot);
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
        if (def.wall) {
          // Calendar block: the meeting's hold turned inside out, put down
          // where the player stands and left there. On `holds` with the
          // meetings, so the one wall (`wallHolds`) keeps the crowd outside
          // out and the crowd inside in, and never the player; it does not
          // contract (`from` is `to`, no `seconds`) and ends `holdSeconds`
          // later (`updateHolds`). Its `slow` of 1 holds nothing still
          // (`slowInHolds` skips it). No dice.
          const r = radius * reach;
          this.holds.push({
            x: this.x,
            y: this.y,
            radius: r,
            from: r,
            to: r,
            seconds: 0,
            holdSeconds: def.range * bonus.duration,
            age: 0,
            slow: def.slow ?? 1,
            source: def.id,
            owner: 'player',
          });
          return true;
        }
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
      case 'nap':
        // Never fired; see `nap`, which resolveContact runs.
        return false;
      case 'cry': {
        // G-054: a ring from where the player stands, on its cooldown whether
        // or not anything is near — a cry does not wait for an audience. Its
        // edge does the work as it spreads (`updateCries`). Growth Spurt's
        // reach widens it as it widens a burst; Longer (`duration`) holds
        // what it crosses longer. No dice.
        this.cryList.push({
          x: this.x,
          y: this.y,
          age: 0,
          seconds: def.range,
          maxRadius: radius * reach,
          source: def.id,
          shove: (def.knockback ?? 0) + bonus.knockback,
          slow: def.slow ?? 1,
          slowSeconds: (def.slowSeconds ?? 0) * bonus.duration,
          crossed: new Set(),
        });
        return true;
      }
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
            this.damageEnemy(e, damage);
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
        // spare shot does. Nothing in range: retry sooner. The Letter
        // (`strikeNearest`, G-050) marks the nearest instead and draws no
        // dice; every strike's wait divides by its `speed` bonus.
        const bolts = 1 + bonus.projectiles;
        const delay = strikeDelayAt(def.strikeDelay ?? STRIKE_DELAY, bonus.speed);
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
          const pick = def.strikeNearest ? this.nearestIndex(pool) : Math.floor(this.rng() * pool.length);
          const e = pool[pick]!;
          swapRemove(pool, pick);
          // A bolt with no delay (Hindsight) has already landed: not at what it killed.
          if (e.hp <= 0) continue;
          this.strikeAt(def, e.x, e.y, radius, damage, delay);
          aimed++;
        }
        pool.length = 0;
        if (aimed < bolts) {
          const boss = this.bossAsTarget(range);
          if (boss) {
            this.strikeAt(def, boss.x, boss.y, radius, damage, delay);
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
   * The index in `pool` of the enemy nearest the player; the first on a tie,
   * so the pick is the grid's order and never the dice (`strikeNearest`).
   */
  private nearestIndex(pool: readonly EnemyState[]): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i]!;
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = i;
      }
    }
    return best;
  }

  /**
   * One strike, telegraphed: it lands after `delay` — its item's
   * `strikeDelay`, or STRIKE_DELAY, divided by its `speed` bonus
   * (`strikeDelayAt`) — through updateAreas → landStrike, at (x, y) whatever
   * has moved since. A delay of zero (Hindsight, G-046) lands here, on the
   * fire step. `fireItems` runs before `updateAreas`, but `updateStrike`
   * reads a delay of zero as already landed and only ages the flash, so
   * waiting for it would never land at all.
   */
  private strikeAt(def: ActiveItem, x: number, y: number, radius: number, damage: number, delay: number): void {
    const wait = Math.max(0, delay);
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
      delay: wait,
      telegraph: wait,
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
      this.damageEnemy(e, a.damage);
      e.hitFlash = 0.08;
    }
    const b = this.boss;
    if (b && (b.x - a.x) ** 2 + (b.y - a.y) ** 2 <= (a.radius + BOSS_RADIUS) ** 2) this.damageBoss(a.damage);
  }

  /**
   * Cries (G-054): each ring's edge runs from nothing to `maxRadius` over
   * `seconds`. Every enemy whose body the edge has reached is crossed, once
   * per cry: shoved `shove` px straight out from where the cry went off, by
   * the knockback every hit uses (`knockBack`: the arena's and the meetings'
   * walls hold, a pile or a patrol line is not moved, and the boss is never
   * in `enemies`), and slowed to `slow` for `slowSeconds` (`slowOn`). Not
   * what cannot be hurt either (G-018): no knockback has ever reached it. A
   * hostile shot is untouched. The edge is read at the step's end, so the
   * last step reaches the full radius before the ring goes.
   */
  private updateCries(dt: number): void {
    for (let i = this.cryList.length - 1; i >= 0; i--) {
      const c = this.cryList[i]!;
      c.age += dt;
      const radius = c.maxRadius * Math.min(1, c.seconds > 0 ? c.age / c.seconds : 1);
      this.grid.query(c.x, c.y, radius + this.queryPad, this.near);
      for (const e of this.near) {
        if (e.def.invulnerable || e.hp <= 0 || c.crossed.has(e.uid)) continue;
        const r = radius + e.radius;
        if ((e.x - c.x) ** 2 + (e.y - c.y) ** 2 > r * r) continue;
        c.crossed.add(e.uid);
        if (c.shove > 0) this.knockBack(e, c.shove, c.x, c.y);
        if (c.slow < 1 && c.slowSeconds > 0) {
          e.slowedTo = c.slow;
          e.slowedUntil = this._time + c.slowSeconds;
        }
      }
      if (c.age >= c.seconds) swapRemove(this.cryList, i);
    }
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
        this.damageEnemy(e, damage);
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
    // G-054 (Spilt Milk, Tantrum): the puddle it leaves. Snooze's shape — no
    // damage, no pull, a `slow` that `slowAt` reads, so a crowd in two
    // puddles is held once — owned by the player, so it never holds them.
    const puddle = def.puddle;
    if (puddle) {
      this.areas.push({
        x: this.x,
        y: this.y,
        age: 0,
        seconds: puddle.seconds * bonus.duration,
        radius: area.radius * puddle.radius,
        damage: 0,
        pull: false,
        slow: puddle.slow,
        tick: true,
        serial: this.nextSerial++,
        source: def.id,
        owner: 'player',
      });
    }
  }

  /**
   * The one gate every damage path to an enemy goes through: shots, a boss
   * shot on a racer, orbiters, auras, sweeps, landing strikes, bursts and
   * ticking areas. Its callers have already decided the enemy is hit (in
   * reach, on its weak point, not already hit by this serial); this decides
   * what the hit is worth. The flash, the knockback and the reap stay with
   * the callers.
   *
   * College (the Highlighter): while an enemy is marked, every hit is worth
   * its mark's multiplier. One multiplication, here and in `bossTakes`, so no
   * weapon can be written that forgets it; a damage path that subtracts hp
   * any other way is a path the mark does not reach.
   */
  private damageEnemy(e: EnemyState, amount: number): void {
    e.hp -= amount * this.markOn(e);
  }

  /** What a mark multiplies a hit on `t` by now: its multiplier while it runs, else 1. */
  private markOn(t: Markable): number {
    return t.markedUntil !== undefined && this._time < t.markedUntil ? (t.markMultiplier ?? 1) : 1;
  }

  /**
   * A marking shot (`ProjectileState.markSeconds`) has landed on `t`: it is
   * marked from now for the shot's seconds at the shot's multiplier. A mark on
   * a marked target replaces it — the clock restarts, the multiplier is the
   * newer one, and nothing multiplies twice. No dice.
   */
  private markFrom(p: ProjectileState, t: Markable): void {
    if (p.markSeconds === undefined) return;
    t.markedUntil = this._time + p.markSeconds;
    t.markMultiplier = p.markMultiplier ?? 1;
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
    this.bossTakes(b, amount);
  }

  /**
   * The one gate every damage path to the boss goes through: the shots and
   * the areas in `updateBoss`, and `damageBoss` (sweeps, landing strikes,
   * auras, orbiters). Its callers have already decided the boss is hit (in
   * reach, not shielded, not absorbing); this decides what the hit is worth.
   * True when the blow ended the fight, so a damage pass stops there.
   *
   * Every kind but the Mortgage: the health falls by the whole amount, and at
   * zero the outcome latches — `absorbing`, the Egg's exit, which every boss
   * uses. It does not die. The eyes close, the corona parts, and the player
   * wins by being permitted to stop existing separately from it.
   *
   * The Mortgage (FAMILY-ROSTER §4): the window's instalment is the most it
   * accepts. What is still owed this window (one instalment less `accepted`)
   * and what is left of the balance bound the take; the rest of the blow is
   * lost. The last take that meets the instalment sets `accepted` to it
   * exactly, so "met" is an equality and no sum of float slivers can fall a
   * hair short of it. It never latches here, even at zero: whether the
   * window was paid, and whether that was the last, is `mortgagePhase`'s,
   * at the window's end — so the fight lasts every window of the schedule.
   *
   * Time (DECLINE-ROSTER §4): accepts nothing, ever. Every path above reaches
   * it and does nothing — a shot is spent on the clock as on a shield, an
   * area, an orbiter, an aura, a sweep or a strike leave no mark — and its
   * health never moves. Its fight ends on its clock (`timePhase`), never here.
   */
  private bossTakes(b: BossState, amount: number): boolean {
    // College: the mark is paid here for every path to the boss, as
    // `damageEnemy` pays it for the crowd — before the Mortgage's cap below,
    // so a marked Mortgage still takes no more than the window owes.
    amount *= this.markOn(b);
    const boss = this.act.boss;
    if (boss.kind === 'time') return false;
    if (boss.kind === 'mortgage') {
      const instalment = b.maxHp / boss.instalments;
      const owed = instalment - b.accepted;
      const take = Math.min(amount, owed, b.hp);
      if (!(take > 0)) return false;
      b.hp -= take;
      b.accepted = take === owed ? instalment : b.accepted + take;
      return false;
    }
    b.hp -= amount;
    if (!(b.hp <= 0)) return false;
    b.hp = 0;
    b.phase = 'absorbing';
    b.timer = 1.8;
    return true;
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
          this.damageEnemy(e, damage);
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
      // Held by Snooze or a meeting, hostile or not. Its life is held with it,
      // so a shot through a field arrives late rather than falling short.
      const pdt = this.unheld(fields) ? dt : dt * this.slowAt(p.x, p.y, fields);
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
          this.damageEnemy(e, a.damage * dt * 6);
        } else {
          if (e.hitByAreaSerial === a.serial) continue;
          e.hitByAreaSerial = a.serial;
          this.damageEnemy(e, a.damage);
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
   * A meeting's life (OFFICE-ROSTER §3.4): its radius runs linearly from
   * `from` to `to` over `seconds`, stays at `to` for `holdSeconds`, and then
   * it is gone. The edge carries the crowd with it (`moveHoldEdge`): an enemy
   * the wall held in is taken inward as the room closes, or the next step's
   * wall would read it as outside and let it walk away.
   */
  private updateHolds(dt: number): void {
    for (let i = this.holds.length - 1; i >= 0; i--) {
      const h = this.holds[i]!;
      h.age += dt;
      if (h.age >= h.seconds + h.holdSeconds) {
        swapRemove(this.holds, i);
        continue;
      }
      const was = h.radius;
      // `seconds` 0 (the stairs, DECLINE-ROSTER §3.4) divides by nothing: at `to`.
      const t = h.seconds > 0 ? Math.min(1, h.age / h.seconds) : 1;
      h.radius = h.from + (h.to - h.from) * t;
      if (h.radius !== was) this.moveHoldEdge(h, was);
    }
  }

  /**
   * Keeps the wall's two sides true across a change of radius: whatever was
   * inside at `was` and is outside now is set just inside the new edge, and
   * whatever was outside and is inside now just outside it, each along the
   * centre line. Walks every enemy once per hold, allocation-free: there are
   * a few holds at most, and the grid would miss anything added since it was
   * built this step (a split, a throw).
   */
  private moveHoldEdge(h: HoldState, was: number): void {
    const was2 = was * was;
    const now2 = h.radius * h.radius;
    for (const e of this.enemies) {
      if (!World.walledByHolds(e.def)) continue;
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      const d2 = dx * dx + dy * dy;
      const wasIn = d2 <= was2;
      if (wasIn === d2 <= now2) continue;
      this.setOnHoldEdge(e, h, dx, dy, Math.sqrt(d2), wasIn);
    }
  }

  /**
   * A meeting's edge is a wall for the crowd both ways (OFFICE-ROSTER §3.4):
   * an enemy that stood outside a hold at (`fromX`, `fromY`) and has come in
   * is set back just outside its edge, and one that stood inside and has left
   * is set back just inside, along the centre line through where it got to.
   * Inside is the centre within the radius, as `slowAt` reads it. Called
   * wherever the crowd is moved — the walk, the pull, a shove — with where
   * the enemy stood before; the holds against this one enemy, and there are
   * a few holds at most. The player is never walled.
   */
  private wallHolds(e: EnemyState, fromX: number, fromY: number): void {
    if (!World.walledByHolds(e.def)) return;
    for (const h of this.holds) {
      const r2 = h.radius * h.radius;
      const wasIn = (fromX - h.x) ** 2 + (fromY - h.y) ** 2 <= r2;
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      const d2 = dx * dx + dy * dy;
      if (wasIn === d2 <= r2) continue;
      this.setOnHoldEdge(e, h, dx, dy, Math.sqrt(d2), wasIn);
    }
  }

  /** Sets `e` on `h`'s edge along the centre line: just inside it if `inside`, else just outside. */
  private setOnHoldEdge(e: EnemyState, h: HoldState, dx: number, dy: number, d: number, inside: boolean): void {
    const at = Math.max(0, inside ? h.radius - HOLD_EDGE : h.radius + HOLD_EDGE);
    // On the centre exactly there is no line; any consistent one will do.
    const nx = d < 0.001 ? 1 : dx / d;
    const ny = d < 0.001 ? 0 : dy / d;
    e.x = h.x + nx * at;
    e.y = h.y + ny * at;
  }

  /**
   * What a meeting's edge holds: the crowd, not the room (AUDIT 28 and 33's
   * rule, as the pull and the shove read it). A pile, a patrol line and
   * anything `static` are the arena's shape — carried by a closing meeting, a
   * review would stay moved for the rest of the act and a ping would be
   * brought to the player — and a `cross` mover took its heading at spawn and
   * does not care who is in a meeting: a commute passes straight through.
   */
  private static walledByHolds(def: EnemyDef): boolean {
    return def.merge !== true && def.patrol !== true && def.movement !== 'cross' && def.movement !== 'static';
  }

  /**
   * Pushes an enemy straight away from the player — or from (`fromX`,
   * `fromY`), where a cry went off (G-054) — held inside the arena. The boss
   * is never in `enemies`, so it is never pushed.
   */
  private knockBack(e: EnemyState, distance: number, fromX = this.x, fromY = this.y): void {
    // The crowd, not the room (AUDIT 33; 28's rule for the pull).
    if (e.def.merge === true || e.def.patrol === true) return;
    const dx = e.x - fromX;
    const dy = e.y - fromY;
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
    const wasX = e.x;
    const wasY = e.y;
    e.x += nx * distance;
    e.y += ny * distance;
    if (inside) {
      e.x = clamp(e.x, 0, ARENA_WIDTH);
      e.y = clamp(e.y, 0, ARENA_HEIGHT);
    }
    // A meeting's edge holds against a shove as against the walk.
    if (this.holds.length > 0) this.wallHolds(e, wasX, wasY);
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
          this.damageEnemy(e, p.damage);
          e.hitFlash = 0.08;
          // Paid first, then written: the stroke that marks is not itself marked.
          this.markFrom(p, e);
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
      this.damageEnemy(e, p.damage);
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
      // Removed first: the last element moves into `i` and has been visited;
      // any children are pushed past it and are alive, so none is reaped here.
      swapRemove(this.enemies, i);
      this.kills++;
      // The medication (DECLINE-ROSTER §3.1): taking it is killing it. Never
      // past the maximum, never lowering a health already at it, and nothing
      // once the outcome has latched. No dice.
      const heal = e.def.killHeal;
      if (heal !== undefined && heal > 0 && !this.outcomeDecided && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + heal);
      }
      const split = e.def.split;
      const generation = e.generation ?? 0;
      if (split && generation < split.generations - 1) this.splitFrom(e, split, generation + 1);
      else this.gems.push({ x: e.x, y: e.y, value: e.xp });
    }
  }

  /**
   * Reply-all (OFFICE-ROSTER §3.1): a killed `split` enemy short of its last
   * generation becomes `children` of itself where it died, each at
   * `scale ** generation` of the def's hp, radius and drawn size, and drops
   * nothing — only the last generation drops the XP. The same def: one
   * registry, a generation on the state.
   *
   * Spread by index, not by the dice, so no seed's later rolls move: evenly
   * about the parent, starting across the line to the player (two children
   * land side by side, one each side of that line), each its own radius from
   * the centre, so two touch and do not stack. They carry the parent's
   * hit serials, so the shot or burst that killed it does not also land on
   * them — each split is one kill's worth of work, not a chain in one hit.
   * Capped by MAX_ACTIVE_ENEMIES like any spawn: at the cap a split is short
   * of children, and still drops nothing.
   */
  private splitFrom(parent: EnemyState, split: NonNullable<EnemyDef['split']>, generation: number): void {
    const def = parent.def;
    const k = split.scale ** generation;
    const radius = def.radius * k;
    const across = Math.atan2(this.y - parent.y, this.x - parent.x) + Math.PI / 2;
    for (let c = 0; c < split.children && this.enemies.length < MAX_ACTIVE_ENEMIES; c++) {
      const angle = across + (c * 2 * Math.PI) / split.children;
      const x = parent.x + Math.cos(angle) * radius;
      const y = parent.y + Math.sin(angle) * radius;
      const e = this.addEnemy(def, x, y, parent.vx, parent.vy);
      // A hold def never splits and addEnemy returns null for one (§3.4).
      if (!e) continue;
      e.hp = def.hp * k;
      e.radius = radius;
      e.displaySize = def.displaySize * k;
      e.generation = generation;
      e.hitBySerial = parent.hitBySerial;
      e.hitByAreaSerial = parent.hitByAreaSerial;
    }
  }

  private resolveContact(dt: number): void {
    // See outcomeDecided: the engulf tick and attach damage do not go through
    // hurt(), so the guard has to sit above them too.
    if (this.outcomeDecided) return;
    if (this.engulfTimer > 0) {
      this.engulfTimer -= dt;
      // A hold with no damage (the toddler's, FAMILY-ROSTER §3.4) never
      // touches health, and no engulf sets i-frames.
      if (this.engulfDps > 0) {
        this.hp -= this.engulfDps * dt * this.damageTaken;
        if (this.hp <= 0) return this.die(this.engulfBy ?? 'boss');
      }
    }
    // The window is over — run out, or zeroed from outside (the dev panel's
    // god mode) — so the hand is let go. Before the touches below, so another
    // engulfer can take it on this step.
    if (this.engulfer && this.engulfTimer <= 0) this.release();

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
          this.engulfer = e;
          this.engulfCooldown = e.def.engulf.cooldownMultiplier ?? 1;
        }
        continue;
      }
      // Asleep (Decline's Nap): no touch lands, as i-frames skip it; a shot below still does.
      if (this.invulnerable > 0 || this.napTimer > 0) continue;
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
      // The review's rating (OFFICE-ROSTER §3.5): a share of the bar to the
      // next level, taken from the progress along it and never below it, so
      // a level already reached is never taken back.
      const xpLoss = p.owner?.ranged?.xpLoss;
      if (xpLoss !== undefined) this.xp = Math.max(0, this.xp - xpLoss * this.xpToNext);
      // The insurance form's decision (DECLINE-ROSTER §3.5): after the damage,
      // the maximum loses `maxHpLoss` of what it is now, for the rest of the
      // act, never below the floor. Not on a body the decision just killed.
      const maxHpLoss = p.owner?.ranged?.maxHpLoss;
      if (maxHpLoss !== undefined && !this.dead) this.decide(maxHpLoss);
      // The registrar's hold (COLLEGE-ROSTER §3.5): the monitor's stop, by
      // post, and its i-frames run from the END of the stop for the reason the
      // contact branch above gives (AUDIT part three, 18).
      const stun = p.owner?.ranged?.stun;
      if (stun !== undefined) {
        this.stun(stun);
        this.invulnerable = Math.max(this.invulnerable, stun + IFRAMES);
      }
      // The phone's call (FAMILY-ROSTER §3.5): after the damage and the stop,
      // the player is moved toward the phone. Not a body the call just killed.
      const pull = p.owner?.ranged?.pull;
      if (pull !== undefined && !this.dead) this.pullToward(p, pull);
    }

    // Decline's Nap (`nap`), last in the pass the engulf's tick opens: it
    // reads the health the touches and shots above left, and a nap's final
    // step still sleeps through them, because the timer they read runs down
    // here, after them.
    this.nap(dt);
  }

  /**
   * The end of a hold (FAMILY-ROSTER §3.4, `engulf.releases`): the engulfer
   * lets go and leaves the field, delighted. Not a kill — `kills` does not
   * move, no gem, no XP — and not a death: it is simply gone, as a racer that
   * reached the Egg is. A hold without `releases` (the white cell's) ends
   * with its body still on the field, as it always did. No dice.
   */
  private release(): void {
    const e = this.engulfer;
    this.engulfer = null;
    this.engulfCooldown = 1;
    if (!e || e.def.engulf?.releases !== true) return;
    const i = this.enemies.indexOf(e);
    if (i >= 0) swapRemove(this.enemies, i);
  }

  /**
   * A landing call moves the player `pull` px toward whoever made it
   * (FAMILY-ROSTER §3.5): the shooter where it stands now, or, if it has left
   * the field, the point the shot was fired from; a hand-built shot carrying
   * neither is followed back along its own flight. Never past the target, so
   * a call from nearer than `pull` sets the player on the phone (it touches
   * nobody), and held inside the arena. Instant: it crosses whatever is in
   * the way, and a pile or room it lands the player in pushes them out on
   * the next step (`resolveSolids`). No dice.
   */
  private pullToward(p: ProjectileState, pull: number): void {
    const s = p.shooter;
    // A linear scan, on a landing call only: calls are rare and the phone is static.
    const here = s !== undefined && s.hp > 0 && this.enemies.includes(s);
    const tx = here ? s.x : p.fromX;
    const ty = here ? s.y : p.fromY;
    let nx: number;
    let ny: number;
    let reach = pull;
    if (tx !== undefined && ty !== undefined) {
      const d = Math.hypot(tx - this.x, ty - this.y);
      if (d < 0.001) return;
      nx = (tx - this.x) / d;
      ny = (ty - this.y) / d;
      reach = Math.min(pull, d);
    } else {
      const v = Math.hypot(p.vx, p.vy);
      if (v < 0.001) return;
      nx = -p.vx / v;
      ny = -p.vy / v;
    }
    this.x += nx * reach;
    this.y += ny * reach;
    this.clampPlayer();
  }

  /**
   * One landing decision (DECLINE-ROSTER §3.5, `ranged.maxHpLoss`): the
   * maximum health is multiplied by (1 − `share`) and current health held
   * inside it, never below `maxHpFloor` — at the floor it takes nothing more.
   * Stored as a share of what the items give (`maxHpShare`), so a Thick Skin
   * taken after a decision raises the maximum by its own multiplier and the
   * decision still stands. Never raises health. No dice.
   */
  private decide(share: number): void {
    const full = this.itemMaxHp;
    if (!(full > 0) || !(share > 0)) return;
    const floor = Math.min(1, this.maxHpFloor / full);
    this.maxHpShare = Math.max(floor, this.maxHpShare * (1 - share));
    if (this.hp > this.maxHp) this.hp = this.maxHp;
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
   * One attach stack on the player: a drag stack for any attach with a drag;
   * for tuition, a share of every gem from now on (`attach.tax`) and a stack
   * that stays on through the crossing (`attach.persists`, COLLEGE-ROSTER
   * §3.3); for the ping, a multiplier on every cooldown
   * (`attach.cooldownMultiplier`, OFFICE-ROSTER §3.3). Every stack is also
   * counted by the kind that attached it (`wornBy`), so a renderer can draw
   * each in its own frame (AUDIT six, 38).
   *
   * The ping's drag is 0 and it adds no drag stack: the drag is one curve
   * over `dragStacks` (`antibodyDrag`), not a per-def figure, so a stack
   * counted there costs speed whatever its def says.
   */
  private wear(def: EnemyDef): void {
    const attach = def.attach;
    const drags = (attach?.drag ?? 0) > 0;
    const tax = attach?.tax ?? 0;
    const cooldown = attach?.cooldownMultiplier;
    const persists = attach?.persists === true;
    if (drags) this.dragStacks++;
    if (tax > 0) {
      this.taxedStacks++;
      this.xpTaxFactor *= 1 - tax;
    }
    if (cooldown !== undefined) {
      this.cooldownStacks++;
      this.attention *= cooldown;
    }
    this.worn.set(def.id, (this.worn.get(def.id) ?? 0) + 1);
    if (!persists) return;
    if (drags) this.persistentStacks++;
    if (tax > 0) {
      this.persistentTaxedStacks++;
      this.persistentTaxFactor *= 1 - tax;
    }
    if (cooldown !== undefined) {
      this.persistentCooldownStacks++;
      this.persistentAttention *= cooldown;
    }
    this.persistentWorn.set(def.id, (this.persistentWorn.get(def.id) ?? 0) + 1);
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
      rules: [...this.rules],
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
    const shot: ProjectileState = {
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
    };
    // Only a call that pulls carries who made it and from where (`pullToward`);
    // every other act's shots are built exactly as they were.
    if (r.pull !== undefined) {
      shot.shooter = e;
      shot.fromX = e.x;
      shot.fromY = e.y;
    }
    this.projectiles.push(shot);
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

  /**
   * Decline's Nap (items.ts `nap`, DECLINE-ROSTER §6, G-051): the one verb a
   * `nap` item has, run at the end of `resolveContact`. Generic: it names no
   * item, only the mode and its `nap` numbers.
   *
   * Asleep (`napTimer`), health comes back at `napRate`, evenly over the
   * window, never past the maximum. Every held nap counts its cooldown down
   * on `cooldowns` (fireItems skips it); off cooldown, awake, and with
   * health under its `threshold` share of the maximum, the player falls
   * asleep for `range` × `duration` seconds and `heal` × `damage` of the
   * maximum is owed over them. The stop is the hall monitor's (`stun`, so
   * movePlayer ignores the input and the renderer squashes the swim); the
   * touches are skipped in `resolveContact` while `napTimer` runs; a hostile
   * shot still lands. The clock keeps running: that is the joke, and the
   * only cost (G-038). Never once the outcome has latched — the absorb, a
   * death, the win — and in any act once held, as every item is. No dice.
   */
  private nap(dt: number): void {
    if (this.outcomeDecided) return;
    if (this.napTimer > 0) {
      const t = Math.min(dt, this.napTimer);
      this.napTimer -= t;
      this.hp = Math.min(this.maxHp, this.hp + this.napRate * t);
    }
    for (const [id, level] of this.items) {
      const def = ITEMS[id];
      if (!def || !isActive(def) || def.mode !== 'nap' || !def.nap) continue;
      const left = Math.max(0, (this.cooldowns.get(id) ?? 0) - dt);
      this.cooldowns.set(id, left);
      if (left > 0 || this.napTimer > 0 || !(this.hp < def.nap.threshold * this.maxHp)) continue;
      const b = this.bonusFor(def, level);
      const seconds = def.range * b.duration;
      if (!(seconds > 0)) continue;
      this.napTimer = seconds;
      this.napRate = (def.nap.heal * b.damage * this.maxHp) / seconds;
      this.stun(seconds);
      this.cooldowns.set(id, this.activeCooldown(def, level));
    }
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
   * The boss is down, or Time has run out (`timePhase`), and its exit has
   * played. Either the next act begins or, after the last one, the player
   * dies of natural causes and that is the win.
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
      rules: [...this.rules],
    };
  }

  /**
   * The threshold between acts. What crosses it is the player: items, level,
   * the XP still on the ground (collected now rather than lost — you leave
   * with what you earned), and tuition's invoices and the HOA's notices
   * (`attach.persists`), with what each costs. What
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
    this.cryList.length = 0;
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.rings.length = 0;
    this.areas.length = 0;
    this.holds.length = 0;
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
    // The pings are the day, not debt (OFFICE-ROSTER §3.3): off at the door.
    this.cooldownStacks = this.persistentCooldownStacks;
    this.attention = this.persistentAttention;
    this.worn.clear();
    for (const [id, n] of this.persistentWorn) this.worn.set(id, n);
    this.engulfTimer = 0;
    this.engulfSlow = 1;
    this.engulfDps = 0;
    this.engulfBy = null;
    this.engulfer = null;
    this.engulfCooldown = 1;
    this.movedX = 0;
    this.movedY = 0;
    this.invulnerable = 0;
    this.stunTimer = 0;
    this.napTimer = 0;
    this.napRate = 0;
    if (!this.inheritance) this.inherit();
    this.takeUnaskedLevels();
    // The form's decisions are "for the rest of the act" (DECLINE-ROSTER
    // §3.5): off at the door, and the floor re-read from the maximum the next
    // act opens with, after the unasked levels (a Thick Skin among them).
    this.maxHpShare = 1;
    this.actOpeningMaxHp = this.itemMaxHp;
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
    // One Trick (G-055). Holding no weapon, the roll is weapons alone, and
    // only the kid's (no `from`): the opening offer. That is also the guard
    // for a life that somehow holds none with no offer up (a world built by
    // hand, a weapon taken away from outside): its next level deals weapons
    // again, not passives it could not fight with. Holding one, no other
    // weapon enters the pool, ever; its own levels, its paths, its
    // evolution (dealt, not rolled), the passives and the controls come as
    // they always have. Off the rule, nothing here draws or filters.
    const trick = this.oneTrick ? (this.holdsWeapon ? 'held' : 'choosing') : null;
    const pool = Object.keys(ITEMS).filter((id) => {
      const def = ITEMS[id]!;
      if (isActive(def) && def.evolvesFrom) return false;
      if (replaced.has(id)) return false;
      if (trick === 'choosing' && (def.kind !== 'weapon' || def.from !== undefined)) return false;
      if (trick === 'held' && def.kind === 'weapon' && !this.items.has(id)) return false;
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
      if (!isActive(def) || !def.paths || replaced.has(id) || trick === 'choosing') continue;
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
      restructures: 0,
      paid: 0,
      windowTimer: 0,
      accepted: 0,
      secondsLeft: 0,
      hand: 0,
      filed: 0,
    };
    this.handSeconds = 0;
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
    // The Mortgage's first window opens as it stands (FAMILY-ROSTER §4), and
    // from here every one is `instalmentSeconds` long.
    const mortgage = this.act.boss;
    if (mortgage.kind === 'mortgage') this.boss.windowTimer = mortgage.instalmentSeconds;
    // Time's clock starts as it stands (DECLINE-ROSTER §4). Its health stays
    // BOSS_HP and nothing ever moves it: its bar is `secondsLeft`. Its long
    // hand starts at the drawn rest pose and turns from here.
    const time = this.act.boss;
    if (time.kind === 'time') {
      this.boss.secondsLeft = time.seconds;
      this.boss.hand = TIME_HAND_REST;
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
      // The exit is the last payment however it came: a window's end, or a
      // write that set `absorbing` directly (the dev panel's kill, the tests'
      // crossings) with hp at zero, which derives every window paid.
      if (this.act.boss.kind === 'mortgage') b.paid = this.paidFrom(b, this.act.boss);
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
      // Spent either way: a shot into a window already met is the overflow,
      // and it is lost, not held for the next one (FAMILY-ROSTER §4).
      swapRemove(this.projectiles, i);
      const ended = this.bossTakes(b, p.damage);
      // A Highlighter stroke marks him as it marks the crowd; shielded, above,
      // it reached him and did nothing, the mark included.
      this.markFrom(p, b);
      if (ended) return;
    }
    for (const a of this.areas) {
      // A strike deals its one hit on the boss where it lands (landStrike).
      if (a.delay !== undefined) continue;
      // Shielded, a burst does not spend its one hit on him either: if the
      // shield drops inside its lifetime, it lands then.
      if (a.pull || a.damage <= 0 || b.shielded) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > a.radius + BOSS_RADIUS) continue;
      let amount: number;
      if (a.tick) amount = a.damage * dt * 6;
      else if (a.serial !== this.bossHitSerial) {
        this.bossHitSerial = a.serial;
        amount = a.damage;
      } else continue;
      if (this.bossTakes(b, amount)) return;
    }

    // Above the phase timer: interest runs every step, not on phase changes.
    if (this.act.boss.kind === 'loan') return this.loanPhase(b, this.act.boss, dt);
    // Above it too: a threshold is read off the health every step, not on a timer.
    if (this.act.boss.kind === 'reorg') return this.reorgPhase(b, this.act.boss, dt);
    // And the window clock: it runs every step, beside the statement.
    if (this.act.boss.kind === 'mortgage') return this.mortgagePhase(b, this.act.boss, dt);
    // And Time's: its clock, its hand and its file run every step.
    if (this.act.boss.kind === 'time') return this.timePhase(b, this.act.boss, dt);

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

    // The Egg's machine.
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

  /**
   * The Reorg's step (OFFICE-ROSTER §4, G-004), called every step it is not
   * absorbing, after the damage passes: a kill this step latched `absorbing`
   * and returned before this, so the blow that empties the chart never
   * restructures it.
   *
   * The threshold watcher: health over the opening (`maxHp`, which for the
   * Reorg never moves) against the next of `thresholds` not yet passed, in
   * order — `restructures` is its index. At or below it, the chart
   * restructures and the step ends there. One restructure a step: a blow that
   * crosses two thresholds restructures on this step and the next, so each
   * threshold is one restructure, once, and `restructures` counts it.
   *
   * The memo is the Egg's machine at the Egg's timings, carried as the Loan's
   * is: idle; the memo drafted (telegraph); the memo (attack). It never
   * shields (`shieldUp` has no branch for it) and is never raced for (`race`
   * reads only the Egg and Prom). Nothing in it reads the health left: the
   * same monster and the same memo at every threshold, everything moved.
   *
   * Nothing of it runs once the player has died this step (resolveHits comes
   * first): a restructure then would shove the body away from what killed it
   * and seat a meeting round the death.
   */
  private reorgPhase(b: BossState, boss: ReorgBoss, dt: number): void {
    if (this.dead) return;
    const next = boss.thresholds[b.restructures];
    if (next !== undefined && b.hp / b.maxHp <= next) {
      this.restructure(b, boss);
      return;
    }

    b.timer -= dt;
    if (b.timer > 0) return;
    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer += EGG_TELEGRAPH_SECONDS;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer += EGG_ATTACK_SECONDS;
      this.memo(b, boss);
    } else {
      b.phase = 'idle';
      b.timer += EGG_IDLE_SECONDS;
    }
  }

  /**
   * The memo: `memoShots` of the Egg's shot in a column across the line from
   * the chart to the player, `memoSpacing` apart and centred on that line,
   * every one with the same velocity — at where the player is now, at the
   * Egg's speed — so the column travels as one rank and only its middle shot
   * is aimed. The bearing is the Egg's (atan2, so a player on the boss point
   * is fired at along +x, as the Egg's fan is). No owner: a death to one
   * names the boss (`bossName`), and it would thin a race if there were one.
   *
   * Between two shots is open only when `memoSpacing` exceeds twice the
   * shot's radius plus the player's — 2 × (10 + 16) = 52 px at base size.
   * At the roster's 36 the rank is solid: it is dodged around, not through.
   * Flagged, not moved (D-022).
   */
  private memo(b: BossState, boss: ReorgBoss): void {
    const bearing = Math.atan2(this.y - b.y, this.x - b.x);
    const ux = Math.cos(bearing);
    const uy = Math.sin(bearing);
    for (let i = 0; i < boss.memoShots; i++) {
      const offset = (i - (boss.memoShots - 1) / 2) * boss.memoSpacing;
      this.projectiles.push({
        x: b.x - uy * offset,
        y: b.y + ux * offset,
        vx: ux * EGG_SHOT.speed,
        vy: uy * EGG_SHOT.speed,
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
   * One restructure (§4), in this order:
   *   1. The chart moves. Up to REORG_RELOCATE_TRIES points rolled inside the
   *      arena, REORG_MARGIN in from every wall; the first at least
   *      REORG_MIN_DISTANCE from the player is taken, else the farthest
   *      rolled.
   *   2. The player's box moves sideways: `lateralMove` px across the line
   *      from the player to where the chart now is, the side rolled, then
   *      held inside the arena (`clampPlayer`), with i-frames. Across and
   *      never along, so short of a wall it takes the player no nearer the
   *      chart — the distance becomes hypot(d, lateralMove) — which is
   *      "never up". At a wall the clamp takes the part of the move that
   *      points out, and what is left can be nearer.
   *   3. A meeting closes around them: one `meetingId` through `spawnEnemy`,
   *      the act's own arrival, so where it lands is its def's `spawnAt`, and
   *      what it does there is its def's. Capped by MAX_ACTIVE_ENEMIES like
   *      any spawn.
   *   4. The memo starts over: idle, a fresh EGG_IDLE_SECONDS, a memo in its
   *      telegraph dropped. Memos already fired fly on.
   * Nothing is added: the same health, the same memo.
   *
   * Dice, in order: two per roll (x, then y), then one for the side. The
   * meeting draws what its placement draws: a lead or player arrival none,
   * the edge override (`spawnOverride`) one.
   */
  private restructure(b: BossState, boss: ReorgBoss): void {
    b.restructures++;

    let best = -1;
    let bestX = b.x;
    let bestY = b.y;
    for (let i = 0; i < REORG_RELOCATE_TRIES; i++) {
      const x = REORG_MARGIN + this.rng() * (ARENA_WIDTH - 2 * REORG_MARGIN);
      const y = REORG_MARGIN + this.rng() * (ARENA_HEIGHT - 2 * REORG_MARGIN);
      const d = Math.hypot(x - this.x, y - this.y);
      if (d > best) {
        best = d;
        bestX = x;
        bestY = y;
      }
      // Every earlier roll was nearer than REORG_MIN_DISTANCE, so the first
      // roll far enough is also the farthest yet.
      if (d >= REORG_MIN_DISTANCE) break;
    }
    b.x = bestX;
    b.y = bestY;

    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const d = Math.hypot(dx, dy);
    // Never zero in practice (the fallback is the farthest of
    // REORG_RELOCATE_TRIES rolls); the guard is for the arithmetic.
    const ax = d < 0.001 ? 1 : dx / d;
    const ay = d < 0.001 ? 0 : dy / d;
    const side = this.rng() < 0.5 ? -1 : 1;
    this.x += -ay * side * boss.lateralMove;
    this.y += ax * side * boss.lateralMove;
    this.clampPlayer();
    this.invulnerable = Math.max(this.invulnerable, IFRAMES);

    if (this.enemies.length < MAX_ACTIVE_ENEMIES) this.spawnEnemy(boss.meetingId);

    b.phase = 'idle';
    b.timer = EGG_IDLE_SECONDS;
  }

  /**
   * The Mortgage's step (FAMILY-ROSTER §4), called every step it is not
   * absorbing, after the damage passes have run through `bossTakes`.
   *
   * The window clock: `windowTimer` counts down from `instalmentSeconds`,
   * one window closing a step at most, the overshoot carried (AUDIT 16) as
   * the Loan's interest clock is, so the schedule is the same at every frame
   * rate and no `instalmentSeconds` can hang the step. At the close
   * (`closeWindow`) the window is paid or missed, the balance is set from
   * what was paid, and the house grows.
   *
   * The statement is the Egg's machine at the Egg's timings, carried as the
   * Loan's is: idle; the statement drafted (telegraph); DUE (attack), one
   * shot. It never moves, never shields (`shieldUp` has no branch for it)
   * and is never raced for (`race` reads only the Egg and Prom).
   *
   * Nothing of it runs once the player has died this step (resolveHits comes
   * first): a window closing then would build a room round the body, or pay
   * the house off over it.
   */
  private mortgagePhase(b: BossState, boss: MortgageBoss, dt: number): void {
    if (this.dead) return;
    b.windowTimer -= dt;
    if (b.windowTimer <= 0) {
      b.windowTimer += boss.instalmentSeconds;
      this.closeWindow(b, boss);
      if (b.phase === 'absorbing') return;
    }

    b.timer -= dt;
    if (b.timer > 0) return;
    if (b.phase === 'idle') {
      b.phase = 'telegraph';
      b.timer += EGG_TELEGRAPH_SECONDS;
    } else if (b.phase === 'telegraph') {
      b.phase = 'attack';
      b.timer += EGG_ATTACK_SECONDS;
      this.due(b);
    } else {
      b.phase = 'idle';
      b.timer += EGG_IDLE_SECONDS;
    }
  }

  /**
   * One window's end (§4), in this order:
   *   1. Paid or missed. Paid is `accepted` equal to one instalment (the gate
   *      sets it exactly on the take that meets it). Missed, the balance does
   *      not move: what the window accepted goes back on the health.
   *   2. The balance. `paid` is read off the health, round((maxHp − hp) /
   *      instalment), held to 0..instalments, and the health set back to
   *      maxHp × (instalments − paid) / instalments, so between windows the
   *      bar reads paid twelfths exactly. Untouched, that is the last `paid`
   *      plus one for a paid window and plus none for a missed one. Read off
   *      the health rather than counted so a write to it from outside the
   *      sim (the dev panel's −50% and kill) stays consistent: half the
   *      health gone is six instalments paid, and none left is all of them.
   *   3. Paid off, the exit: `absorbing`, as every boss falls (`bossTakes`),
   *      and nothing is built on the way out — the door opens instead.
   *   4. Otherwise the house grows: one room at the player's lead, paid or
   *      missed, and a missed window sends one late fee from the door.
   *      Each capped by MAX_ACTIVE_ENEMIES like any spawn.
   */
  private closeWindow(b: BossState, boss: MortgageBoss): void {
    const instalment = b.maxHp / boss.instalments;
    const met = b.accepted >= instalment;
    if (!met) b.hp += b.accepted;
    b.accepted = 0;
    b.paid = this.paidFrom(b, boss);
    b.hp = (b.maxHp * (boss.instalments - b.paid)) / boss.instalments;
    if (b.paid >= boss.instalments) {
      b.hp = 0;
      b.phase = 'absorbing';
      b.timer = 1.8;
      return;
    }
    this.buildRoom(boss);
    if (!met) this.lateFee(b, boss);
  }

  /** Windows paid, read off the health (`closeWindow`, step 2). */
  private paidFrom(b: BossState, boss: MortgageBoss): number {
    const instalment = b.maxHp / boss.instalments;
    const paid = Math.round((b.maxHp - b.hp) / instalment);
    return Math.min(boss.instalments, Math.max(0, paid));
  }

  /** A room at the player's lead, or behind them at a wall (`landOffPlayer`). */
  private buildRoom(boss: MortgageBoss): void {
    this.landOffPlayer(boss.roomId);
  }

  /**
   * One `id` at the player's lead, through `spawnEnemy`: the act's own
   * arrival (the Mortgage's room is `spawnAt: 'lead'`, static, merging; Time's
   * knee is `spawnAt: 'lead'`, static, attaching), so where it lands, the
   * clamp that holds a static inside the arena and the merge onto a room
   * already there are all written once, there. The lead is ANTIBODY_LEAD
   * ahead, farther than a room's or a knee's radius, so it never lands on
   * the player — except at a wall they face, where the clamp pulls it back
   * onto them: then it lands at the lead behind them instead, the heading
   * turned for the call and put back after, as the Loan's statement turns it.
   * The turn is read off where the player stands, never rolled. A lead
   * placement draws no dice; under a `spawnOverride` of 'edge' it draws its
   * angle, as every arrival does there. Capped by MAX_ACTIVE_ENEMIES like any
   * spawn. The Mortgage's rooms and Time's file land here.
   */
  private landOffPlayer(id: string): void {
    if (this.enemies.length >= MAX_ACTIVE_ENEMIES) return;
    const def = enemyDef(id);
    const fx = this.facingX;
    const fy = this.facingY;
    if ((this.spawnOverride ?? def.spawnAt) === 'lead' && this.leadLandsOnPlayer(def, fx, fy)) {
      this.facingX = -fx;
      this.facingY = -fy;
    }
    this.spawnEnemy(id);
    this.facingX = fx;
    this.facingY = fy;
  }

  /**
   * True when `def` set at the lead along (fx, fy), as `spawnEnemy` would,
   * overlaps the player: its body, or for a hold (the stairs) the hold as it
   * lands — `to` for one that never contracts, `from` otherwise — so a hold
   * turned by this never lands with the player inside it, which is more than
   * never on its centre (AUDIT 93).
   */
  private leadLandsOnPlayer(def: EnemyDef, fx: number, fy: number): boolean {
    let x = this.x + fx * ANTIBODY_LEAD;
    let y = this.y + fy * ANTIBODY_LEAD;
    if (def.movement === 'static') {
      x = clamp(x, def.radius, ARENA_WIDTH - def.radius);
      y = clamp(y, def.radius, ARENA_HEIGHT - def.radius);
    }
    const hold = def.hold;
    const r = hold ? (hold.seconds > 0 ? hold.from : hold.to) : def.radius;
    return Math.hypot(x - this.x, y - this.y) < r + this.playerRadius;
  }

  /**
   * The late fee: one `feeId` (the act's bill) at the door, MORTGAGE_DOOR_BELOW
   * straight below the boss point and held inside the arena, standing still
   * until its own movement takes it (a bill chases). Through `addEnemy`, as
   * the Gym Teacher's throw is, because the door is the placement: the bill's
   * own arrival is the edge, which would roll an angle. A whole bill, not a
   * `fee`: it accrues fees of its own, left alone (§3.1). No dice.
   */
  private lateFee(b: BossState, boss: MortgageBoss): void {
    if (this.enemies.length >= MAX_ACTIVE_ENEMIES) return;
    const def = enemyDef(boss.feeId);
    const x = clamp(b.x, def.radius, ARENA_WIDTH - def.radius);
    const y = clamp(b.y + MORTGAGE_DOOR_BELOW, def.radius, ARENA_HEIGHT - def.radius);
    this.addEnemy(def, x, y, 0, 0);
  }

  /**
   * The statement: one of the Egg's shot at where the player is now, at the
   * Egg's speed, damage, life and radius — the fan's middle shot, alone. The
   * bearing is the Egg's (atan2, so a player on the boss point is fired at
   * along +x). No owner, so a death to it names the boss (`bossName`) and it
   * carries none of a ranged enemy's stun, rating or pull. The renderer draws
   * it as the word DUE.
   */
  private due(b: BossState): void {
    const bearing = Math.atan2(this.y - b.y, this.x - b.x);
    this.projectiles.push({
      x: b.x,
      y: b.y,
      vx: Math.cos(bearing) * EGG_SHOT.speed,
      vy: Math.sin(bearing) * EGG_SHOT.speed,
      life: EGG_SHOT.life,
      damage: EGG_SHOT.damage,
      pierce: 1,
      radius: EGG_SHOT.radius,
      hostile: true,
      source: 'boss',
      serial: this.nextSerial++,
    });
  }

  /**
   * Time (DECLINE-ROSTER §4): its clock runs down from `seconds`, and while it
   * runs the long hand turns and the file is read (`turnHand`). When it
   * reaches zero the hands stop — the step the clock runs out does not turn
   * them — and the outcome latches exactly as a boss falling latches it
   * (`bossTakes`): `absorbing` for the exit every boss takes (1.8s, the act's
   * `endWord` shown in it), then `finishAct`, which after the last act is the
   * win — natural causes at the act's `age.to`. A Time before the last act
   * would be a crossing, as any boss is.
   *
   * Nothing hurts it, so the only other way its fight ends is a write from
   * outside the sim: the dev panel's kill sets `absorbing` itself (handled
   * above, in `updateBoss`), and health written to zero alone is read as the
   * clock run out, so no boss stands at zero forever. Nothing of it runs
   * once the player has died this step: a death on the last step is a death.
   * No shots, no fan, no phases. No dice.
   */
  private timePhase(b: BossState, time: TimeBoss, dt: number): void {
    if (this.dead) return;
    b.secondsLeft = Math.max(0, b.secondsLeft - dt);
    if (b.secondsLeft > 0 && b.hp > 0) {
      this.turnHand(b, time, dt);
      return;
    }
    b.secondsLeft = 0;
    b.phase = 'absorbing';
    b.timer = 1.8;
  }

  /**
   * Time's long hand and its file (DECLINE-ROSTER §4), one step of each.
   *
   *   1. The hand turns: `hand` is TIME_HAND_REST plus a full turn for every
   *      `sweepSeconds` it has run (`handSeconds`), clockwise, wrapped to
   *      [0, 2π). Read off the sum each step, never added to itself, so it
   *      neither drifts nor runs faster at a longer step.
   *   2. The hand touches: a player whose body reaches the rectangle
   *      `sweepLength` × `sweepWidth` from the boss point along it
   *      (`fromHand`) takes the Egg's shot damage (EGG_SHOT.damage) through
   *      `hurt`, which gives the usual IFRAMES, unless i-frames are already
   *      running. A death to it names the act's `bossName`, Time. It is not
   *      a touch: the Nap's sleep (`napTimer`), which skips touches, does not
   *      skip it, and a sleeper on the line is hit — the clock keeps running.
   *      The hand passes over everything else: it walls nothing and nothing
   *      walls it, a hold included.
   *   3. The file: at every 1/TIME_FILES_PER_TURN of a turn since its
   *      arrival (`filed` counts them), one TIME_FILE_ID at the player's lead
   *      through the Mortgage's room placement (`landOffPlayer`): at the
   *      lead, or behind the player at a wall — never on them — and none at
   *      MAX_ACTIVE_ENEMIES. Not on a body the hand has just killed.
   *
   * Every number it reads is a PLACEHOLDER under `DECLINE.provisional` but
   * TIME_HAND_REST, which is the drawing's. No dice.
   */
  private turnHand(b: BossState, time: TimeBoss, dt: number): void {
    this.handSeconds += dt;
    b.hand = turnOf(TIME_HAND_REST + (Math.PI * 2 * this.handSeconds) / time.sweepSeconds);
    if (
      this.invulnerable <= 0 &&
      fromHand(b.x, b.y, b.hand, time.sweepLength, time.sweepWidth, this.x, this.y) <= this.playerRadius
    ) {
      this.hurt(EGG_SHOT.damage, 'boss');
      if (this.dead) return;
    }
    const due = Math.floor((this.handSeconds * TIME_FILES_PER_TURN) / time.sweepSeconds);
    while (b.filed < due) {
      b.filed++;
      this.landOffPlayer(TIME_FILE_ID);
    }
  }
}
