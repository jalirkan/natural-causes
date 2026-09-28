import { CONCEPTION, type ActDef, type BossDef } from '../../src/data/acts';
import { ITEMS, OFFER_PATH_SEPARATOR, isActive } from '../../src/data/items';
import type { EnemyDef } from '../../src/data/enemies';
import {
  World,
  type EnemyState,
  type Input,
  type ProjectileState,
  type WorldOptions,
} from '../../src/sim/world';

/**
 * Automated playtest bots. The part of PLAN.md that genuinely runs for hours
 * and produces real numbers rather than impressions.
 *
 * They drive `World` directly — the same rules the browser runs, not a
 * re-implementation. A bot result that came from a second copy of the rules
 * would be confidently wrong rather than absent, which is worse than having no
 * numbers at all.
 *
 * Every run is seeded and deterministic, so a seed that produces an
 * interesting death can be replayed exactly.
 *
 * The bot's own numbers are PLACEHOLDERS, each labelled where it is declared,
 * and none of them is a game number — moving one changes the player the bot
 * is, never the game: the decision cadence (`cadenceSeconds`, 0.2s), the
 * aimed-shot sidestep (`SHOT_LOOKAHEAD_SECONDS` 0.6s, `SHOT_SIDESTEP_WEIGHT`
 * 0.8, `SHOT_MARGIN_PX` 8px) and the shield reading (`SHIELD_PULL_WEIGHT` 0.7,
 * `HUNT_CLEARANCE_PX` 40px, `FLOOR_HOLD_FRACTION` 0.8). What retires them is a
 * human input log (§11.5), not a bot run.
 */

/** Fixed timestep. Real frames vary; a measurement must not. */
const DT = 1 / 60;
/**
 * Hard stop, in simulated seconds past the boss's arrival. Guards against a
 * run that cannot end. Relative to the act's clock rather than a fixed 420,
 * which was 300 + 120 with the 300 assumed.
 */
export const BOSS_PHASE_MAX_SECONDS = 120;
/** Never stand inside the Egg, whatever the build's reach is. */
const BOSS_STANDOFF_MIN = 175;

export interface BotPolicy {
  name: string;
  /** What it wants, best first. Falls back to whatever is offered. */
  priorities: string[];
  /**
   * Does not steer from aimed shots. Only the control has it: sidestepping is
   * how a person plays, not a build, and a blind arm is what lets the report
   * show what the sidestep changed. The shot tally counts either way.
   */
  blindToShots?: true;
  /**
   * Does not read a boss's shield: neither hunts the Gym Teacher's last ball
   * nor keeps to Prom's floor, and plays both as it plays the Egg. The
   * control again, for the same reason: the report's shield section is only
   * a reading of the hunt if one arm does not hunt.
   */
  blindToShield?: true;
}

/**
 * One policy per build the act is shaped around, plus the controls.
 *
 * "Greedy" exists to give Capacitation a policy that actually takes it, and
 * "random" exists because a build space that only looks good under its own
 * intended policies has not been tested.
 */
export const POLICIES: BotPolicy[] = [
  // G-043: each build names one path right after its weapon, so the report
  // exercises paths (a path is offered once its weapon is at PATH_OPENS_AT).
  { name: 'midpiece+wake', priorities: ['midpiece', 'wake', 'wake/hoarding', 'capacitation', 'lash'] },
  { name: 'membrane+acrosome', priorities: ['membrane', 'acrosome', 'acrosome/blast-radius', 'chemotaxis', 'lash'] },
  { name: 'motility', priorities: ['motility', 'motility/broadside', 'midpiece', 'lash', 'capacitation'] },
  { name: 'greedy-capacitation', priorities: ['capacitation', 'membrane', 'acrosome', 'acrosome/short-fuse', 'lash'] },
  // G-038: exercises the evolution. Temper to max beside Restlessness makes
  // the next level-up a one-card Tantrum offer, which takes Temper's paths too.
  { name: 'acrosome+midpiece', priorities: ['acrosome', 'acrosome/slammed-door', 'midpiece', 'membrane', 'lash'] },
  {
    name: 'grudge+group-chat',
    priorities: ['grudge', 'grudge/company', 'group-chat', 'group-chat/mutuals', 'appetite', 'lash'],
  },
  { name: 'random', priorities: [], blindToShots: true, blindToShield: true },
  // G-044: the three classic archetypes, each beside what its build wants.
  { name: 'personal-space+membrane', priorities: ['personal-space', 'personal-space/boundaries', 'membrane', 'lash'] },
  { name: 'backhand+midpiece', priorities: ['backhand', 'backhand/wingspan', 'midpiece', 'lash'] },
  { name: 'judgement+appetite', priorities: ['judgement', 'judgement/docket', 'appetite', 'lash'] },
];

export interface RunResult {
  policy: string;
  seed: number;
  outcome: 'alive' | 'died' | 'won';
  /** Where the life got to (D-024). Index and id of the act it ended in. */
  actIndex: number;
  actId: string;
  /** Age at the end, in the act's declared years. */
  age: number;
  /** What the certificate says, or null if the run hit the step cap alive. */
  cause: string | null;
  seconds: number;
  kills: number;
  level: number;
  dragStacks: number;
  /** Stacks at the 300s mark — the moment §7.6's prediction is stated about. */
  stacksAt300: number;
  /**
   * Mean absolute heading change per second across the crowd phase, radians.
   *
   * §9.3's hypothesis: antibodies spawn on the player's instantaneous heading,
   * so a build that changes direction constantly leaves the placement stale
   * before it matters. If that is the mechanism, this correlates with stacks
   * and speed does not.
   */
  headingChangeRate: number;
  /** Speed from items alone at 300s. Exogenous — what the build chose. */
  itemSpeedAt300: number;
  /**
   * Whether the run survived to the 300s mark at all.
   *
   * Without this, a run that dies at 124s reports stacksAt300 = 0 — its
   * initial value — and a table of medians reads 0 while the means read 20.
   * Stack statistics are computed over this subset only.
   */
  reached300: boolean;
  /**
   * Stacks when the run actually ended, for every run. In a life that is the
   * LAST act's value, and the threshold clears the drag, so a run that
   * crossed reads whatever it picked up after the crossing.
   */
  stacksAtEnd: number;
  /**
   * Stacks on the last step of the first act — the Conception figure the
   * report's `median@death` column means. For a run that never crossed, the
   * first act's end is the run's end and this equals `stacksAtEnd`.
   */
  stacksAtFirstActEnd: number;
  /** State on arrival at the boss. If a swing is not in the stacks, it is here. */
  hpAt300: number;
  hpFractionAt300: number;
  killsAt300: number;
  enemiesAt300: number;
  /** Realised mean speed across the crowd phase. Endogenous: stacks lower it. */
  meanSpeed: number;
  /** How much of the boss was left when the run ended. Null if it never spawned. */
  bossHpLeft: number | null;
  bossHpFraction: number | null;
  /** Item levels when the run ended — over the whole life, every act's picks. */
  items: Record<string, number>;
  /**
   * Item levels when the first act ended, before any pick made across or
   * after the threshold. What a first-act statistic (the chemotaxis
   * correlation) must read; equal to `items` for a run that never crossed.
   */
  itemsAtFirstActEnd: Record<string, number>;
  /**
   * Hostile shots that came at the bot: each one counted once, the first time
   * it would have passed within reach inside the look-ahead had the bot stood
   * still (`threatens`). Counted for every policy, the blind one included, so
   * the arms are compared on the same predicate.
   */
  shotsSeen: number;
  /** Hostile shots that hurt the bot. Every one is also in `shotsSeen`. */
  shotsHit: number;
  /** The same two counts by who fired: the enemy's id, or 'boss'. */
  shotsBy: Record<string, { seen: number; hit: number }>;
  /** What the Egg dealt at the first crossing (G-042); null if the life never crossed. */
  inheritance: string | null;
  /**
   * Seconds of fight against a boss that can be shielded (`bossHasShield`:
   * every kind but the Egg), from its arrival until the outcome latches
   * (`absorbing`) or the run ends. Summed over the life's shieldable fights;
   * zero for a run that never met one.
   */
  bossFightSeconds: number;
  /** Of `bossFightSeconds`, the seconds `World.boss.shielded` was up. */
  bossShieldedSeconds: number;
}

/**
 * The movement policy, shared by every build so that item choice is the
 * variable under test.
 *
 * It is deliberately mediocre: run from the local crowd, drift toward loose
 * gems, and leave a ring if one is expanding into you. A bot that plays
 * perfectly measures the ceiling, and the ceiling is not what a difficulty
 * curve has to be fair to.
 */
/**
 * Instrument settings (§10.5). Both default ON — the re-baselined bot.
 *
 * They are separately switchable because §9.2 requires a control arm per
 * change, and these two will interact: a bot that holds a heading AND ignores
 * harmless enemies moves differently from one that does either alone.
 */
/**
 * PLACEHOLDER, 200ms. Awaiting §11.5 — the value is calibrated from an input
 * log of a human playing, not chosen here.
 *
 * Replaces the first-order lag from Run 6 (§11.4). A lag models a slow
 * ACTUATOR; a human is a fast actuator with a slow CONTROLLER. Keyboard input
 * is discrete and reversal is instantaneous — what a person cannot do is
 * decide sixty times a second. So the constraint belongs on the decision, not
 * on the turn, and the bot now holds a chosen direction between
 * re-evaluations rather than easing toward one.
 *
 * Zero disables the hold entirely, which reproduces the pre-Run-6 thrashing
 * bot and is what a control arm needs.
 */
let cadenceSeconds = 0.2;
let threatWeighting = true;
export function setInstrument(cadence: number, threat: boolean): void {
  cadenceSeconds = cadence;
  threatWeighting = threat;
}

/**
 * How much a given enemy should be avoided, in units of "white cell contact".
 *
 * The old policy repelled from everything within 260px with no weighting, so a
 * 0-damage antibody pushed exactly as hard as a 14-damage white cell. Under
 * G-020 that handed the bot a defensive screen made of harmless obstacles and
 * moved midpiece+wake from 69% to 100% — an instrument artefact that first
 * presented as a design result.
 *
 * Engulf damage is counted over its whole duration, because that is what the
 * contact actually costs.
 */
function threatOf(def: EnemyDef): number {
  if (!threatWeighting) return 1;
  const engulf = def.engulf ? def.engulf.damagePerSecond * def.engulf.seconds : 0;
  return (def.contactDamage + engulf) / 14;
}

/**
 * Heading noise, radians of standard deviation per step.
 *
 * The intervention that separates §9.3's two candidate mechanisms. Rotating
 * the movement vector changes how much the player turns and leaves the
 * magnitude — the speed — untouched, so an arm with jitter differs from the
 * control in volatility and in nothing else. Correlation could not separate
 * them because the policy set is collinear; this does not have to.
 */
let headingJitter = 0;
export function setHeadingJitter(radians: number): void {
  headingJitter = radians;
}

// --- aimed shots -------------------------------------------------------------
//
// AUDIT part three: the bots never read `w.projectiles`, so they walked through
// every aimed shot — the Egg's volley and the substitute's — and every boss-
// phase and School reading was a reading of a player who does not look. These
// three numbers make the bot look. They are the bot's, not the game's.

/**
 * PLACEHOLDER, 0.6s. How far ahead the bot reads a shot's path. At the Egg's
 * and the substitute's 260px/s that is ~156px of warning; the base 190px/s
 * clears a dead-on shot's reach in ~0.18s, and a decision can be up to one
 * cadence (0.2s) late, so this is about the least that lets a sidestep land.
 * Awaiting a human input log (§11.5), like the cadence.
 */
export const SHOT_LOOKAHEAD_SECONDS = 0.6;
/**
 * PLACEHOLDER, 0.8. The sidestep's pull, in the same units as the rest of the
 * steering: above a gem's 0.55, so a person does not walk into a shot for XP,
 * and below a threat-1 contact enemy's full-strength push (1.0 at touching;
 * the white cell's is 1.9), so a person does not dodge a shot into a body.
 * The sum over every threatening shot is capped at this, so a five-shot volley
 * is one sidestep and not five.
 */
export const SHOT_SIDESTEP_WEIGHT = 0.8;
/**
 * PLACEHOLDER, 8px. Added to the contact reach (player radius + shot radius)
 * when judging a pass as a threat: a shot that would graze is dodged too, and
 * a bot one pixel outside the path is not pulled straight back into it.
 */
export const SHOT_MARGIN_PX = 8;

/**
 * True when a hostile shot, held to its current velocity, passes within
 * reach of where the player stands now inside the look-ahead — and inside the
 * shot's own remaining life, since a shot that expires short is no threat.
 *
 * The player is taken as standing still: the question a person asks of a shot
 * is "will it hit me if I stay here", and that is the question a sidestep
 * answers. Shared by the steering and the tally, so "seen" means exactly what
 * the bot reacts to.
 */
export function threatens(w: World, p: ProjectileState): boolean {
  if (!p.hostile) return false;
  const dx = w.x - p.x;
  const dy = w.y - p.y;
  const v2 = p.vx * p.vx + p.vy * p.vy;
  const horizon = Math.min(SHOT_LOOKAHEAD_SECONDS, Math.max(0, p.life));
  // Time of the nearest pass, clamped to the window: a shot moving away is
  // nearest now, and one still far out is nearest at the horizon.
  const t = v2 > 0 ? Math.min(horizon, Math.max(0, (dx * p.vx + dy * p.vy) / v2)) : 0;
  const mx = p.x + p.vx * t - w.x;
  const my = p.y + p.vy * t - w.y;
  // The player's radius as the world has it: Growth Spurt makes it wider.
  const reach = w.playerRadius + p.radius + SHOT_MARGIN_PX;
  return mx * mx + my * my <= reach * reach;
}

/**
 * The sidestep: for every threatening shot, a unit push perpendicular to its
 * path, toward the side of the path the player already stands on. A shot dead
 * on (the Egg's centre shot is aimed exactly at the player) has no side, so
 * the bot keeps going the way it was already heading — which is what a person
 * does. Summed, then capped at SHOT_SIDESTEP_WEIGHT.
 */
function sidestep(w: World, state: BotState): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const p of w.projectiles) {
    if (!threatens(w, p)) continue;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < 1e-9) continue;
    const nx = -p.vy / speed;
    const ny = p.vx / speed;
    let side = (w.x - p.x) * nx + (w.y - p.y) * ny;
    if (Math.abs(side) < 1e-6) side = state.headingX * nx + state.headingY * ny;
    // Heading straight along the path too: any fixed side, so it is replayable.
    if (Math.abs(side) < 1e-6) side = 1;
    const s = side > 0 ? 1 : -1;
    sx += nx * s;
    sy += ny * s;
  }
  const len = Math.hypot(sx, sy);
  if (len === 0) return { x: 0, y: 0 };
  const k = SHOT_SIDESTEP_WEIGHT / Math.max(1, len);
  return { x: sx * k, y: sy * k };
}

// --- the boss's shield -------------------------------------------------------
//
// SCHOOL-ROSTER §9: the Gym Teacher takes no damage while any of his balls
// lives. ADOLESCENCE-ROSTER §4: Prom takes none while the player is off its
// floor. A bot that reads neither sits in the fight until the step cap — 8 of
// 52 School fights did, "because no bot hunts the last ball" — and then the
// cap, not the design, answers "a fight or a chore?". The bot cannot aim (every
// weapon picks its own target, the nearest), so reading the shield is only a
// matter of where it walks. These three numbers are the bot's, not the game's.

/**
 * PLACEHOLDER, 0.7. The pull toward what opens a shielded boss: the Gym
 * Teacher's nearest ball, or Prom's floor. Above a gem's 0.55, so a person
 * does not leave the last ball bouncing to pick up XP; below a threat-1
 * contact enemy's full-strength push (1.0 at touching) and a ring's 1.6, so
 * the pull does not walk the bot into a body. Awaiting §11.5, like the rest.
 */
export const SHIELD_PULL_WEIGHT = 0.7;
/**
 * PLACEHOLDER, 40px. The nearest the hunt walks to a ball, past contact reach
 * (player radius + ball radius). The hunt otherwise stops where the boss
 * standoff does, at the build's shortest weapon's reach × 0.7 (capped at
 * 300); this floor is for a build whose shortest item names no distance
 * (Wake's `range` is seconds of trail), which would walk to touching.
 */
export const HUNT_CLEARANCE_PX = 40;
/**
 * PLACEHOLDER, 0.8. How far onto Prom's floor the bot walks before it holds:
 * pulled toward the ball while farther than this share of `floorRadius`, not
 * pulled at all inside it. Read off the floor rather than off `shielded`,
 * which drops at the edge, so the bot does not hover where one sidestep puts
 * the shield back up.
 */
export const FLOOR_HOLD_FRACTION = 0.8;

/** A boss that can be shielded: every kind but the Egg, which never is (acts.ts). */
export function bossHasShield(boss: BossDef): boolean {
  return boss.kind !== 'egg';
}

/**
 * The Gym Teacher's shield, as the bot sees it: while he is shielded, the
 * nearest living `enemyId` on the field; otherwise null. The same predicate
 * the sim's `shieldUp` scans for.
 */
function shieldBall(w: World): EnemyState | null {
  const def = w.act.boss;
  if (!w.boss || !w.boss.shielded || def.kind !== 'gym-teacher') return null;
  let best: EnemyState | null = null;
  let bestD = Infinity;
  for (const e of w.enemies) {
    if (e.def.id !== def.enemyId || e.hp <= 0) continue;
    const d = (e.x - w.x) ** 2 + (e.y - w.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/**
 * The build's range notion: the SHORTEST reach among the damaging active
 * items held, or 300 with none. Stand where the shortest weapon works, not
 * the longest.
 *
 * Using the longest was the bug: every run starts holding Lash at 420px,
 * so max-reach was always 420 and the bot parked at ~294px — outside
 * Acrosome's 246px effective reach against the Egg, in every single run.
 * The previous "fix" therefore never moved a short build closer, and the
 * resulting 97% boss-HP-remaining was the instrument, not the item.
 */
function shortestReach(w: World): number {
  let reach = Infinity;
  for (const id of w.items.keys()) {
    const def = ITEMS[id];
    if (def && isActive(def) && def.damage > 0) reach = Math.min(reach, def.range);
  }
  return Number.isFinite(reach) ? reach : 300;
}

function decideMove(w: World, rng: () => number, state: BotState): Input {
  let ax = 0;
  let ay = 0;

  for (const e of w.enemies) {
    const threat = threatOf(e.def);
    if (threat <= 0) continue;
    const dx = w.x - e.x;
    const dy = w.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d > 260 || d < 1) continue;
    const weight = ((260 - d) / 260) * threat;
    ax += (dx / d) * weight;
    ay += (dy / d) * weight;
  }

  for (const r of w.rings) {
    const radius = r.maxRadius * (r.age / r.seconds);
    const dx = w.x - r.x;
    const dy = w.y - r.y;
    const d = Math.hypot(dx, dy) || 1;
    // Only flee a band that is about to sweep over you.
    if (Math.abs(d - radius) < 90) {
      ax += (dx / d) * 1.6;
      ay += (dy / d) * 1.6;
    }
  }

  if (state.watchesShots) {
    const s = sidestep(w, state);
    ax += s.x;
    ay += s.y;
  }

  if (w.gems.length > 0) {
    let best = w.gems[0]!;
    let bestD = Infinity;
    for (const g of w.gems) {
      const d = (g.x - w.x) ** 2 + (g.y - w.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    }
    const d = Math.hypot(best.x - w.x, best.y - w.y) || 1;
    ax += ((best.x - w.x) / d) * 0.55;
    ay += ((best.y - w.y) / d) * 0.55;
  }

  if (w.boss) {
    // Engage at a distance the build can actually reach from.
    //
    // A fixed 300px standoff measured Acrosome (96px burst) and Wake (26px
    // trail) as doing almost nothing to the boss, because the bot never got
    // close enough to use them. That is the instrument reporting its own
    // movement policy rather than the item, so the standoff is derived from
    // what the run is actually holding (`shortestReach`).
    const reach = shortestReach(w);
    // The Gym Teacher, shielded: the ball is the target and he is not. The
    // standoff and the orbit are dropped while it lives — circling a man who
    // cannot be hurt is not what a person does, and the orbit's 0.75 beside
    // the standoff's 0.9 would outvote the hunt wherever the ball lay beyond
    // him. Walk to the build's range of the nearest ball, never to contact:
    // inside it the hunt adds nothing, and the contact push above keeps the
    // distance. The weapons do the rest, as they choose (the nearest thing).
    const ball = state.readsShield ? shieldBall(w) : null;
    if (ball) {
      const d = Math.hypot(ball.x - w.x, ball.y - w.y) || 1;
      const hold = Math.max(
        w.playerRadius + ball.radius + HUNT_CLEARANCE_PX,
        Math.min(reach * 0.7, 300),
      );
      if (d > hold) {
        ax += ((ball.x - w.x) / d) * SHIELD_PULL_WEIGHT;
        ay += ((ball.y - w.y) / d) * SHIELD_PULL_WEIGHT;
      }
    } else {
      const standoff = Math.max(BOSS_STANDOFF_MIN, Math.min(reach * 0.7, 300));
      const d = Math.hypot(w.boss.x - w.x, w.boss.y - w.y) || 1;
      const toX = (w.boss.x - w.x) / d;
      const toY = (w.boss.y - w.y) / d;
      const want = d > standoff ? 0.9 : -0.9;
      ax += toX * want;
      ay += toY * want;
      // Orbit. G-015 makes the fight an orbit rather than a standoff, and a bot
      // that can only move radially measures its own inability to circle rather
      // than the mechanic. Added at the same time as the pull, which does weaken
      // the before/after comparison — noted rather than hidden.
      ax += -toY * 0.75;
      ay += toX * 0.75;
      // Prom's floor: pulled onto it until well inside, then held — nothing
      // more is added, and the standoff and orbit above go on as for the Egg.
      const def = w.act.boss;
      if (state.readsShield && def.kind === 'prom' && d > def.floorRadius * FLOOR_HOLD_FRACTION) {
        ax += toX * SHIELD_PULL_WEIGHT;
        ay += toY * SHIELD_PULL_WEIGHT;
      }
    }
  }

  const len = Math.hypot(ax, ay);
  let nx: number;
  let ny: number;
  if (len < 0.001) {
    // Coasting on the last heading is part of the cadence change, not a free
    // extra: with cadence at zero the control arm must reproduce the old bot
    // exactly, and the old bot snapped to +x whenever the forces cancelled.
    if (cadenceSeconds > 0) {
      nx = state.headingX;
      ny = state.headingY;
    } else {
      state.headingX = 1;
      state.headingY = 0;
      return { moveX: 1, moveY: 0 };
    }
  } else {
    nx = ax / len;
    ny = ay / len;
  }

  state.headingX = nx;
  state.headingY = ny;

  if (headingJitter > 0) {
    // Box-Muller for a normal deviate, then rotate. Rotation preserves
    // magnitude exactly, so speed is untouched by construction.
    const u = Math.max(1e-9, rng());
    const angle = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()) * headingJitter;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const rx = nx * c - ny * sn;
    const ry = nx * sn + ny * c;
    nx = rx;
    ny = ry;
  }
  return { moveX: nx, moveY: ny };
}

/** Level past which a greedy policy should look at its other picks first. */
const SPREAD_BELOW = 3;

interface BotState {
  headingX: number;
  headingY: number;
  /** Seconds until the current decision expires. */
  holdRemaining: number;
  /** Health at the last decision, to detect a damage event. */
  lastHp: number;
  /** False only for a policy that is `blindToShots`. */
  watchesShots: boolean;
  /** False only for a policy that is `blindToShield`. */
  readsShield: boolean;
}

function freshState(policy: BotPolicy, w: World): BotState {
  return {
    headingX: w.facingX,
    headingY: w.facingY,
    holdRemaining: 0,
    lastHp: w.hp,
    watchesShots: !policy.blindToShots,
    readsShield: !policy.blindToShield,
  };
}

/**
 * One decision, as a fresh bot under `policy` would make it facing the way
 * the player faces. The tests' view of the steering; `runOnce` holds and
 * re-decides through the cadence instead.
 */
export function decideOnce(policy: BotPolicy, w: World): Input {
  return decideMove(w, () => 0.5, freshState(policy, w));
}

/**
 * The aimed-shot tally. `look` before each `world.step`, `settle` after.
 *
 * World records nothing about what hurt the player, so a hit is inferred from
 * the outside: health fell on a step in which a hostile shot the bot could see
 * vanished within contact reach, the i-frames had run out, and the fall was
 * at least that shot's damage (or the player died). One per step at most,
 * because the first shot to hurt grants i-frames and the rest are consumed
 * harmlessly.
 *
 * Known limits, both rare: a shot fired AND consumed inside one step (a
 * substitute firing from touching distance) is never in view and is missed;
 * a contact or ring hurting for at least a shot's damage on the very step a
 * racer ate a shot beside the player is counted as that shot.
 */
export class ShotLog {
  seen = 0;
  hit = 0;
  readonly by: Record<string, { seen: number; hit: number }> = {};
  private readonly counted = new WeakSet<ProjectileState>();
  private readonly inView: ProjectileState[] = [];
  private readonly alive = new Set<ProjectileState>();
  private hpBefore = 0;
  private iframesBefore = 0;

  look(w: World): void {
    this.hpBefore = w.hp;
    this.iframesBefore = w.invulnerable;
    this.inView.length = 0;
    for (const p of w.projectiles) {
      if (!p.hostile) continue;
      this.inView.push(p);
      if (!this.counted.has(p) && threatens(w, p)) this.see(p);
    }
  }

  settle(w: World, dt: number): void {
    const fell = this.hpBefore - w.hp;
    // `step` ticks the i-frames down before anything can hurt; this is its
    // arithmetic exactly, so a shot is never credited through i-frames.
    if (fell <= 0 || Math.max(0, this.iframesBefore - dt) > 0) return;
    this.alive.clear();
    for (const p of w.projectiles) if (p.hostile) this.alive.add(p);
    // Backwards, as `resolveContact` walks them, so the shot credited is the
    // one the world most likely let through when two arrive together.
    for (let i = this.inView.length - 1; i >= 0; i--) {
      const p = this.inView[i]!;
      if (this.alive.has(p)) continue;
      const reach = w.playerRadius + p.radius;
      if ((p.x - w.x) ** 2 + (p.y - w.y) ** 2 > reach * reach) continue;
      if (w.hp > 0 && fell < p.damage * w.damageTaken - 1e-9) continue;
      if (!this.counted.has(p)) this.see(p);
      this.hit++;
      this.tally(p).hit++;
      return;
    }
  }

  private see(p: ProjectileState): void {
    this.counted.add(p);
    this.seen++;
    this.tally(p).seen++;
  }

  private tally(p: ProjectileState): { seen: number; hit: number } {
    const id = p.owner?.id ?? 'boss';
    return (this.by[id] ??= { seen: 0, hit: 0 });
  }
}

/**
 * The bot's pick from one offer. `world` supplies the levels already owned: an
 * item's from `items`, a path's (`grudge/company`, G-043) from `pathLevels`.
 */
export function chooseOffer(
  policy: BotPolicy,
  offers: string[],
  world: Pick<World, 'items' | 'pathLevels'>,
  rng: () => number,
): string {
  const owned = (id: string): number =>
    (id.includes(OFFER_PATH_SEPARATOR) ? world.pathLevels.get(id) : world.items.get(id)) ?? 0;
  // An evolution is offered alone and is not a choice (G-038).
  if (offers.length === 1) return offers[0]!;
  // Two passes. A single pass down the priority list sinks every level into
  // the first item it names before touching the second — which measured
  // "membrane+acrosome" as five levels of Membrane and no Acrosome, and then
  // reported Acrosome as doing nothing to the boss. That is the instrument
  // describing its own greed. Spreading until each pick is established
  // approximates a player without pretending to be a good one.
  for (const want of policy.priorities) {
    if (offers.includes(want) && owned(want) < SPREAD_BELOW) return want;
  }
  for (const want of policy.priorities) {
    if (offers.includes(want)) return want;
  }
  return offers[Math.floor(rng() * offers.length)] ?? offers[0]!;
}

/**
 * Decision cadence with one interrupt (§11.4).
 *
 * Holds the last decision for `cadenceSeconds`, then re-decides. The single
 * interrupt is TAKING DAMAGE: a pure zero-order hold commits for the whole
 * interval regardless of what happens, so the bot walks into things a person
 * would obviously react to — which would swing the antibody measurement from
 * understating to overstating. A damage event is discrete, needs no threshold
 * and no new tuning parameter, and is exactly what a person reacts to.
 *
 * Antibodies deal zero damage and so never trigger it. That is intended: a
 * human does not panic-turn for a harmless drifting shape either.
 *
 * Known consequence, not a defect: the white cell's engulf deals damage over
 * its whole duration, so it re-decides every frame for those 0.9 seconds. That
 * is still "reacts to being damaged", but it is continuous rather than
 * discrete and is worth knowing when reading engulf-heavy runs.
 */
function decideWithCadence(w: World, rng: () => number, state: BotState, dt: number): Input {
  const tookDamage = w.hp < state.lastHp;
  state.lastHp = w.hp;

  if (cadenceSeconds <= 0) return decideMove(w, rng, state);

  state.holdRemaining -= dt;
  if (state.holdRemaining > 0 && !tookDamage) {
    return { moveX: state.headingX, moveY: state.headingY };
  }
  state.holdRemaining = cadenceSeconds;
  return decideMove(w, rng, state);
}

export function runOnce(
  policy: BotPolicy,
  seed: number,
  bossPull?: number,
  spawnOverride?: 'edge' | 'lead',
  acts: ActDef[] = [CONCEPTION],
): RunResult {
  const options: WorldOptions = { acts, seed };
  // The instrument's "300s mark" is the FIRST act's crowd phase, so every
  // Conception figure reads exactly as it did before there were lives.
  const act = acts[0]!;
  if (bossPull !== undefined) options.bossPull = bossPull;
  if (spawnOverride !== undefined) options.spawnOverride = spawnOverride;
  const world = new World(options);
  // A separate stream for choices, so a policy change does not shift spawns.
  let a = (seed * 2654435761) >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const state = freshState(policy, world);
  const shots = new ShotLog();
  let steps = 0;
  let stacksAt300 = 0;
  let reached300 = false;
  let itemSpeedAt300 = world.itemSpeed;
  let hpAt300 = world.hp;
  let hpFractionAt300 = 1;
  let killsAt300 = 0;
  let enemiesAt300 = 0;
  // Heading volatility and realised speed, accumulated over the CROWD phase
  // only — antibodies stop spawning when the boss arrives, so boss-phase
  // manoeuvring is not part of what produced the stacks.
  let headingDelta = 0;
  let speedSum = 0;
  let crowdSteps = 0;
  let prevFx = world.facingX;
  let prevFy = world.facingY;
  // The first act's end state (D-024). The threshold clears the drag, and
  // picks made after it are School's, so both are taken on the step the life
  // crosses — before the loop can answer a queued offer in the new act. The
  // stacks are the last value act 0 showed from outside, because by the time
  // `actIndex` reads 1 they are already zero. Null until the crossing; a run
  // that never crosses takes the run's end, which IS its first act's end.
  let stacksLastSeenInFirstAct = world.dragStacks;
  let stacksAtFirstActEnd: number | null = null;
  let itemsAtFirstActEnd: Record<string, number> | null = null;
  // The shield, read after each step: `updateBoss` sets it inside the step,
  // so the flag after it is the one the step was played under.
  let bossFightSeconds = 0;
  let bossShieldedSeconds = 0;

  const lifeSeconds = acts.reduce((n, a) => n + a.durationSeconds + BOSS_PHASE_MAX_SECONDS, 0);
  const maxSteps = lifeSeconds / DT;
  while (!world.dead && !world.won && steps < maxSteps) {
    if (!reached300 && world.actIndex === 0 && world.time >= act.durationSeconds) {
      reached300 = true;
      stacksAt300 = world.dragStacks;
      itemSpeedAt300 = world.itemSpeed;
      hpAt300 = world.hp;
      hpFractionAt300 = world.hp / world.maxHp;
      killsAt300 = world.kills;
      enemiesAt300 = world.enemies.length;
    }
    if (world.offers) {
      world.choose(chooseOffer(policy, world.offers, world, rng));
      continue;
    }
    const inCrowdPhase = world.actIndex === 0 && world.time < act.durationSeconds;
    const input = decideWithCadence(world, rng, state, DT);
    shots.look(world);
    // Held from before the step: the crossing step also deals Precocity's
    // unasked level (G-042), which is School's, not the first act's.
    const itemsBeforeStep = stacksAtFirstActEnd === null ? Object.fromEntries(world.items) : null;
    world.step(DT, input);
    shots.settle(world, DT);
    steps++;

    if (world.boss && world.boss.phase !== 'absorbing' && bossHasShield(world.act.boss)) {
      bossFightSeconds += DT;
      if (world.boss.shielded) bossShieldedSeconds += DT;
    }

    if (stacksAtFirstActEnd === null) {
      if (world.actIndex === 0) {
        stacksLastSeenInFirstAct = world.dragStacks;
      } else {
        stacksAtFirstActEnd = stacksLastSeenInFirstAct;
        itemsAtFirstActEnd = itemsBeforeStep;
      }
    }

    if (inCrowdPhase) {
      // Angle between successive headings. atan2 of the cross and dot products
      // gives the signed turn without a quadrant special case.
      const cross = prevFx * world.facingY - prevFy * world.facingX;
      const dot = prevFx * world.facingX + prevFy * world.facingY;
      headingDelta += Math.abs(Math.atan2(cross, dot));
      speedSum += world.speed;
      crowdSteps++;
      prevFx = world.facingX;
      prevFy = world.facingY;
    }
  }

  return {
    policy: policy.name,
    seed,
    outcome: world.outcome,
    actIndex: world.actIndex,
    actId: world.act.id,
    age: +world.age.toFixed(1),
    cause: world.certificate?.cause ?? null,
    bossHpLeft: world.boss ? Math.round(world.boss.hp) : null,
    bossHpFraction: world.boss ? +(world.boss.hp / world.boss.maxHp).toFixed(3) : null,
    seconds: +world.time.toFixed(1),
    kills: world.kills,
    level: world.level,
    dragStacks: world.dragStacks,
    stacksAt300,
    reached300,
    stacksAtEnd: world.dragStacks,
    stacksAtFirstActEnd: stacksAtFirstActEnd ?? world.dragStacks,
    headingChangeRate: crowdSteps > 0 ? +(headingDelta / (crowdSteps * DT)).toFixed(3) : 0,
    itemSpeedAt300: +itemSpeedAt300.toFixed(1),
    hpAt300: +hpAt300.toFixed(1),
    hpFractionAt300: +hpFractionAt300.toFixed(3),
    killsAt300,
    enemiesAt300,
    meanSpeed: crowdSteps > 0 ? +(speedSum / crowdSteps).toFixed(1) : 0,
    items: Object.fromEntries(world.items),
    itemsAtFirstActEnd: itemsAtFirstActEnd ?? Object.fromEntries(world.items),
    shotsSeen: shots.seen,
    shotsHit: shots.hit,
    shotsBy: shots.by,
    inheritance: world.inheritance?.id ?? null,
    bossFightSeconds: +bossFightSeconds.toFixed(1),
    bossShieldedSeconds: +bossShieldedSeconds.toFixed(1),
  };
}

// ---------------------------------------------------------------------------
// Reporting. Portfolio convention: any statistic shown carries its uncertainty,
// and a rate from a handful of runs is not a rate.
// ---------------------------------------------------------------------------

/**
 * Pearson correlation with a Fisher-z 95% interval.
 *
 * The interval is not decoration. An r of 0.4 at n=16 and an r of 0.4 at n=80
 * are different claims, and this file's first rule is that the interval is the
 * result.
 */
export function pearson(xs: number[], ys: number[]): { r: number; lo: number; hi: number; n: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return { r: 0, lo: -1, hi: 1, n };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return { r: 0, lo: -1, hi: 1, n };
  const r = num / Math.sqrt(dx * dy);
  // Fisher z transform, back-transformed.
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  const lo = Math.tanh(z - 1.96 * se);
  const hi = Math.tanh(z + 1.96 * se);
  return { r: +r.toFixed(3), lo: +lo.toFixed(3), hi: +hi.toFixed(3), n };
}

/**
 * Correlation of x with y, holding z fixed.
 *
 * Needed because heading volatility and item speed are collinear across the
 * policy set — the fast builds are also the kiting builds — so their raw
 * correlations with stacks are not separable claims.
 */
export function partial(xs: number[], ys: number[], zs: number[]): number {
  const rxy = pearson(xs, ys).r;
  const rxz = pearson(xs, zs).r;
  const ryz = pearson(ys, zs).r;
  const denom = Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
  return denom === 0 ? 0 : +((rxy - rxz * ryz) / denom).toFixed(3);
}

/** Wilson score interval. Sane at small n, unlike normal approximation. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
}

/**
 * Nearest-rank percentile. Used for the antibody's 90th (§8.4).
 *
 * At integer counts near zero the median saturates and hides the tail —
 * "1, 2, 1, 1, 1" is compatible with a great many different distributions,
 * including one where a careless run carries fifteen.
 */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * s.length);
  return s[Math.min(s.length - 1, Math.max(0, rank - 1))]!;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export interface PolicySummary {
  policy: string;
  runs: number;
  wins: number;
  winRate: number;
  winRateInterval: [number, number];
  medianSeconds: number;
  medianKills: number;
  medianLevel: number;
  medianDragStacks: number;
  reached300: number;
  medianStacksAt300: number;
  medianStacksAtEnd: number;
  p90StacksAt300: number;
  meanStacksAt300: number;
  meanHeadingChangeRate: number;
  meanItemSpeed: number;
  meanRealisedSpeed: number;
  medianHpFractionAt300: number;
  medianKillsAt300: number;
  medianEnemiesAt300: number;
  /** Median share of the boss still standing when the run ended. */
  medianBossLeft: number | null;
  reachedBoss: number;
  /** The life: median age at the end, and how many runs ended in each act. */
  medianAge: number;
  endedIn: Record<string, number>;
  /** Causes on the certificate, most common first. */
  causes: Array<[string, number]>;
  /**
   * Aimed shots over every run of the policy, and how many runs any shot hit.
   * Totals, not rates: shots within a run are not independent draws.
   */
  shotsSeen: number;
  shotsHit: number;
  runsHitByShot: number;
  shotsBy: Record<string, { seen: number; hit: number }>;
  /**
   * The shield (`bossFightSeconds`, `bossShieldedSeconds`): how many runs met
   * a shieldable boss, both totals over them, and the median fight. Totals,
   * as the shots are.
   */
  bossFights: number;
  bossFightSeconds: number;
  bossShieldedSeconds: number;
  medianBossFightSeconds: number | null;
  /** Runs that hit the step cap alive — in one act, the 120s past the boss. */
  runsAtCap: number;
}

export function summarise(results: RunResult[]): PolicySummary[] {
  const byPolicy = new Map<string, RunResult[]>();
  for (const r of results) {
    const list = byPolicy.get(r.policy);
    if (list) list.push(r);
    else byPolicy.set(r.policy, [r]);
  }

  return [...byPolicy.entries()].map(([policy, runs]) => {
    const wins = runs.filter((r) => r.outcome === 'won').length;
    return {
      policy,
      runs: runs.length,
      wins,
      winRate: wins / runs.length,
      winRateInterval: wilson(wins, runs.length),
      medianSeconds: median(runs.map((r) => r.seconds)),
      medianKills: median(runs.map((r) => r.kills)),
      medianLevel: median(runs.map((r) => r.level)),
      medianDragStacks: median(runs.map((r) => r.dragStacks)),
      // Stacks only over runs that reached the mark. A run that died at 124s
      // has no 300s measurement, and counting it as zero is not a measurement.
      reached300: runs.filter((r) => r.reached300).length,
      medianStacksAt300: median(runs.filter((r) => r.reached300).map((r) => r.stacksAt300)),
      p90StacksAt300: percentile(runs.filter((r) => r.reached300).map((r) => r.stacksAt300), 90),
      meanStacksAt300: +mean(runs.filter((r) => r.reached300).map((r) => r.stacksAt300)).toFixed(1),
      // The FIRST act's end, not the life's: the threshold clears the drag,
      // and reading `stacksAtEnd` printed 0 for every run that crossed.
      medianStacksAtEnd: median(runs.map((r) => r.stacksAtFirstActEnd)),
      meanHeadingChangeRate: +mean(runs.map((r) => r.headingChangeRate)).toFixed(3),
      meanItemSpeed: +mean(runs.map((r) => r.itemSpeedAt300)).toFixed(1),
      meanRealisedSpeed: +mean(runs.map((r) => r.meanSpeed)).toFixed(1),
      // Same rule as the stacks, and the same defect: these three kept their
      // starting values (HP 1.0, 0 kills, 0 enemies) for runs that died before
      // the mark, and the median over all runs then read a dead run as a
      // healthy arrival. Found by review on 2026-09-27; the first School
      // reading was written off the wrong figures. INSTRUMENT.
      medianHpFractionAt300: median(runs.filter((r) => r.reached300).map((r) => r.hpFractionAt300)),
      medianKillsAt300: median(runs.filter((r) => r.reached300).map((r) => r.killsAt300)),
      medianEnemiesAt300: median(runs.filter((r) => r.reached300).map((r) => r.enemiesAt300)),
      reachedBoss: runs.filter((r) => r.bossHpFraction !== null).length,
      medianBossLeft: (() => {
        const reached = runs.filter((r) => r.bossHpFraction !== null);
        return reached.length ? median(reached.map((r) => r.bossHpFraction!)) : null;
      })(),
      medianAge: median(runs.map((r) => r.age)),
      endedIn: runs.reduce<Record<string, number>>((acc, r) => {
        acc[r.actId] = (acc[r.actId] ?? 0) + 1;
        return acc;
      }, {}),
      causes: [...runs.reduce<Map<string, number>>((m, r) => {
        if (r.cause !== null) m.set(r.cause, (m.get(r.cause) ?? 0) + 1);
        return m;
      }, new Map()).entries()].sort((a, b) => b[1] - a[1]),
      shotsSeen: runs.reduce((n, r) => n + r.shotsSeen, 0),
      shotsHit: runs.reduce((n, r) => n + r.shotsHit, 0),
      runsHitByShot: runs.filter((r) => r.shotsHit > 0).length,
      shotsBy: runs.reduce<Record<string, { seen: number; hit: number }>>((acc, r) => {
        for (const [id, c] of Object.entries(r.shotsBy)) {
          const t = (acc[id] ??= { seen: 0, hit: 0 });
          t.seen += c.seen;
          t.hit += c.hit;
        }
        return acc;
      }, {}),
      bossFights: runs.filter((r) => r.bossFightSeconds > 0).length,
      bossFightSeconds: +runs.reduce((n, r) => n + r.bossFightSeconds, 0).toFixed(1),
      bossShieldedSeconds: +runs.reduce((n, r) => n + r.bossShieldedSeconds, 0).toFixed(1),
      medianBossFightSeconds: (() => {
        const fought = runs.filter((r) => r.bossFightSeconds > 0);
        return fought.length ? median(fought.map((r) => r.bossFightSeconds)) : null;
      })(),
      runsAtCap: runs.filter((r) => r.outcome === 'alive').length,
    };
  });
}

/** How often each item was taken at all, across every run. */
export function itemUptake(results: RunResult[]): Array<{ id: string; runs: number; share: number }> {
  const counts = new Map<string, number>();
  for (const id of Object.keys(ITEMS)) counts.set(id, 0);
  for (const r of results) {
    // Held at the end, plus what an evolution consumed: Tantrum removes
    // Temper, so reading only the final items undercounted Temper in exactly
    // the runs that took it to max. INSTRUMENT (local session, 2026-09-27).
    const took = new Set(Object.keys(r.items));
    for (const id of Object.keys(r.items)) {
      const def = ITEMS[id];
      if (def && isActive(def) && def.evolvesFrom) took.add(def.evolvesFrom.weapon);
    }
    for (const id of took) {
      // `lash` is granted at the start, so taking it is only a real choice
      // above level 1.
      if (id === 'lash' && r.items[id] === 1) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, n]) => ({ id, runs: n, share: n / Math.max(1, results.length) }))
    .sort((a, b) => a.share - b.share);
}

export { ITEMS, isActive };
