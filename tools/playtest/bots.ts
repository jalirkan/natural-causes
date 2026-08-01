import { CONCEPTION } from '../../src/data/acts';
import { ITEMS, isActive } from '../../src/data/items';
import { World, type Input } from '../../src/sim/world';

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
function decideMove(w: World): Input {
  let ax = 0;
  let ay = 0;

  for (const e of w.enemies) {
    const dx = w.x - e.x;
    const dy = w.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d > 260 || d < 1) continue;
    const weight = (260 - d) / 260;
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
  if (len < 0.001) return { moveX: 1, moveY: 0 };
  return { moveX: ax / len, moveY: ay / len };
}

/** Level past which a greedy policy should look at its other picks first. */
const SPREAD_BELOW = 3;

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

export function runOnce(policy: BotPolicy, seed: number, bossPull?: number): RunResult {
  const world = new World(
    bossPull === undefined ? { act: CONCEPTION, seed } : { act: CONCEPTION, seed, bossPull },
  );
  // A separate stream for choices, so a policy change does not shift spawns.
  let a = (seed * 2654435761) >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let steps = 0;
  let stacksAt300 = 0;
  const maxSteps = MAX_SECONDS / DT;
  while (!world.dead && !world.won && steps < maxSteps) {
    if (stacksAt300 === 0 && world.time >= CONCEPTION.durationSeconds) {
      stacksAt300 = world.dragStacks;
    }
    if (world.offers) {
      world.choose(chooseOffer(policy, world.offers, world.items, rng));
      continue;
    }
    world.step(DT, decideMove(world));
    steps++;
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
    items: Object.fromEntries(world.items),
  };
}

// ---------------------------------------------------------------------------
// Reporting. Portfolio convention: any statistic shown carries its uncertainty,
// and a rate from a handful of runs is not a rate.
// ---------------------------------------------------------------------------

/** Wilson score interval. Sane at small n, unlike normal approximation. */
export function wilson(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (centre - spread) / d), Math.min(1, (centre + spread) / d)];
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
  medianStacksAt300: number;
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
      medianStacksAt300: median(runs.map((r) => r.stacksAt300)),
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
