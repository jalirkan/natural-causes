import { CONCEPTION } from '../../src/data/acts';
import { ITEMS, isActive } from '../../src/data/items';
import type { EnemyDef } from '../../src/data/enemies';
import { World, type Input, type WorldOptions } from '../../src/sim/world';

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
 */

/** Fixed timestep. Real frames vary; a measurement must not. */
const DT = 1 / 60;
/** Hard stop, in simulated seconds. Guards against a run that cannot end. */
const MAX_SECONDS = 420;
/** Never stand inside the Egg, whatever the build's reach is. */
const BOSS_STANDOFF_MIN = 175;

export interface BotPolicy {
  name: string;
  /** What it wants, best first. Falls back to whatever is offered. */
  priorities: string[];
}

/**
 * One policy per build the act is shaped around, plus the controls.
 *
 * "Greedy" exists to give Capacitation a policy that actually takes it, and
 * "random" exists because a build space that only looks good under its own
 * intended policies has not been tested.
 */
export const POLICIES: BotPolicy[] = [
  { name: 'midpiece+wake', priorities: ['midpiece', 'wake', 'capacitation', 'lash'] },
  { name: 'membrane+acrosome', priorities: ['membrane', 'acrosome', 'chemotaxis', 'lash'] },
  { name: 'motility', priorities: ['motility', 'midpiece', 'lash', 'capacitation'] },
  { name: 'greedy-capacitation', priorities: ['capacitation', 'membrane', 'acrosome', 'lash'] },
  { name: 'random', priorities: [] },
];

export interface RunResult {
  policy: string;
  seed: number;
  outcome: 'alive' | 'died' | 'won';
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
  /** Stacks when the run actually ended, for every run. */
  stacksAtEnd: number;
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
  /** Antibody contacts. Zero across a whole sample means the enemy never lands. */
  items: Record<string, number>;
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
    // what the run is actually holding.
    // Stand where the build's SHORTEST weapon works, not its longest.
    //
    // Using the longest was the bug: every run starts holding Lash at 420px,
    // so max-reach was always 420 and the bot parked at ~294px — outside
    // Acrosome's 246px effective reach against the Egg, in every single run.
    // The previous "fix" therefore never moved a short build closer, and the
    // resulting 97% boss-HP-remaining was the instrument, not the item.
    let reach = Infinity;
    for (const id of w.items.keys()) {
      const def = ITEMS[id];
      if (def && isActive(def) && def.damage > 0) reach = Math.min(reach, def.range);
    }
    if (!Number.isFinite(reach)) reach = 300;
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
}

function chooseOffer(
  policy: BotPolicy,
  offers: string[],
  levels: Map<string, number>,
  rng: () => number,
): string {
  // Two passes. A single pass down the priority list sinks every level into
  // the first item it names before touching the second — which measured
  // "membrane+acrosome" as five levels of Membrane and no Acrosome, and then
  // reported Acrosome as doing nothing to the boss. That is the instrument
  // describing its own greed. Spreading until each pick is established
  // approximates a player without pretending to be a good one.
  for (const want of policy.priorities) {
    if (offers.includes(want) && (levels.get(want) ?? 0) < SPREAD_BELOW) return want;
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
): RunResult {
  const options: WorldOptions = { act: CONCEPTION, seed };
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

  const state: BotState = { headingX: 1, headingY: 0, holdRemaining: 0, lastHp: world.hp };
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

  const maxSteps = MAX_SECONDS / DT;
  while (!world.dead && !world.won && steps < maxSteps) {
    if (!reached300 && world.time >= CONCEPTION.durationSeconds) {
      reached300 = true;
      stacksAt300 = world.dragStacks;
      itemSpeedAt300 = world.itemSpeed;
      hpAt300 = world.hp;
      hpFractionAt300 = world.hp / world.maxHp;
      killsAt300 = world.kills;
      enemiesAt300 = world.enemies.length;
    }
    if (world.offers) {
      world.choose(chooseOffer(policy, world.offers, world.items, rng));
      continue;
    }
    const inCrowdPhase = world.time < CONCEPTION.durationSeconds;
    world.step(DT, decideWithCadence(world, rng, state, DT));
    steps++;

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
    bossHpLeft: world.boss ? Math.round(world.boss.hp) : null,
    bossHpFraction: world.boss ? +(world.boss.hp / world.boss.maxHp).toFixed(3) : null,
    seconds: +world.time.toFixed(1),
    kills: world.kills,
    level: world.level,
    dragStacks: world.dragStacks,
    stacksAt300,
    reached300,
    stacksAtEnd: world.dragStacks,
    headingChangeRate: crowdSteps > 0 ? +(headingDelta / (crowdSteps * DT)).toFixed(3) : 0,
    itemSpeedAt300: +itemSpeedAt300.toFixed(1),
    hpAt300: +hpAt300.toFixed(1),
    hpFractionAt300: +hpFractionAt300.toFixed(3),
    killsAt300,
    enemiesAt300,
    meanSpeed: crowdSteps > 0 ? +(speedSum / crowdSteps).toFixed(1) : 0,
    items: Object.fromEntries(world.items),
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
      medianStacksAtEnd: median(runs.map((r) => r.stacksAtEnd)),
      meanHeadingChangeRate: +mean(runs.map((r) => r.headingChangeRate)).toFixed(3),
      meanItemSpeed: +mean(runs.map((r) => r.itemSpeedAt300)).toFixed(1),
      meanRealisedSpeed: +mean(runs.map((r) => r.meanSpeed)).toFixed(1),
      medianHpFractionAt300: median(runs.map((r) => r.hpFractionAt300)),
      medianKillsAt300: median(runs.map((r) => r.killsAt300)),
      medianEnemiesAt300: median(runs.map((r) => r.enemiesAt300)),
      reachedBoss: runs.filter((r) => r.bossHpFraction !== null).length,
      medianBossLeft: (() => {
        const reached = runs.filter((r) => r.bossHpFraction !== null);
        return reached.length ? median(reached.map((r) => r.bossHpFraction!)) : null;
      })(),
    };
  });
}

/** How often each item was taken at all, across every run. */
export function itemUptake(results: RunResult[]): Array<{ id: string; runs: number; share: number }> {
  const counts = new Map<string, number>();
  for (const id of Object.keys(ITEMS)) counts.set(id, 0);
  for (const r of results) {
    for (const id of Object.keys(r.items)) {
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
