import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ANTIBODY_FLOOR, antibodyDragFor } from '../../src/sim/world';
import { ALL_ACTS, CONCEPTION, spawnStreams } from '../../src/data/acts';
import {
  BOSS_PHASE_MAX_SECONDS,
  FLOOR_HOLD_FRACTION,
  HUNT_CLEARANCE_PX,
  POLICIES,
  SHIELD_PULL_WEIGHT,
  SHOT_LOOKAHEAD_SECONDS,
  SHOT_MARGIN_PX,
  SHOT_SIDESTEP_WEIGHT,
  itemUptake,
  partial,
  pearson,
  bossHasShield,
  runOnce,
  setHeadingJitter,
  setInstrument,
  summarise,
  type RunResult,
} from './bots';

/**
 * CLI: `pnpm playtest -- --runs=200`
 *
 * Prints a report and writes the raw runs to tools/playtest/runs/ so a result
 * can be re-examined without regenerating it. Seeds are sequential and the
 * simulation is deterministic, so any row here can be replayed exactly.
 */

const argv = process.argv.slice(2);
const runsPerPolicy = Number(argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 60);
// `--act=school` runs any act with a schedule, startable in the browser or
// not. The bots' job on an act nobody has played is presence and ordering —
// does everything spawn, does the act get worse, does a bot survive it at
// all — never calibration (G-026, G-027).
const actArg = argv.find((a) => a.startsWith('--act='))?.slice(6);
const act = actArg === undefined ? CONCEPTION : ALL_ACTS.find((a) => a.id === actArg);
if (!act) {
  process.stderr.write(`No act "${actArg}". Known: ${ALL_ACTS.map((a) => a.id).join(', ')}\n`);
  process.exit(1);
}
// `--life` runs every act as one life (D-024). Every figure in the report's
// first-act sections is taken on the first act — the 300s marks while
// `actIndex` is 0, `median@death` and the chemotaxis levels at the step the
// life crosses — so a life's Conception figures are the same figures as a
// Conception-only run's. The life-wide figures are the win rate, the ending
// table and item uptake, and the uptake header says so.
const acts = argv.includes('--life') ? ALL_ACTS : [act];
const onlyPolicy = argv.find((a) => a.startsWith('--policy='))?.slice(9);
const pullArg = argv.find((a) => a.startsWith('--pull='))?.slice(7);
const bossPull = pullArg === undefined ? undefined : Number(pullArg);
const spawnArg = argv.find((a) => a.startsWith('--spawn='))?.slice(8);
const spawnOverride = spawnArg === 'edge' || spawnArg === 'lead' ? spawnArg : undefined;
const jitter = Number(argv.find((a) => a.startsWith('--jitter='))?.slice(9) ?? 0);
setHeadingJitter(jitter);
// Instrument arms (§10.5). Defaults are the re-baselined bot; --inertia=0 and
// --threat=0 reproduce the old one for the control arms.
const cadenceArg = argv.find((a) => a.startsWith('--cadence='))?.slice(10);
const threatArg = argv.find((a) => a.startsWith('--threat='))?.slice(9);
const cadence = cadenceArg === undefined ? 0.2 : Number(cadenceArg);
const threat = threatArg === undefined ? true : threatArg !== '0';
setInstrument(cadence, threat);

const policies = onlyPolicy ? POLICIES.filter((p) => p.name === onlyPolicy) : POLICIES;
if (policies.length === 0) {
  process.stderr.write(`No policy named "${onlyPolicy}"\n`);
  process.exit(1);
}

const started = Date.now();
const results: RunResult[] = [];
for (const policy of policies) {
  for (let i = 0; i < runsPerPolicy; i++) {
    results.push(runOnce(policy, 1000 + i, bossPull, spawnOverride, acts));
  }
}
const elapsed = (Date.now() - started) / 1000;

/** The act's clock, used wherever the report names the boss's arrival. */
const mark = act.durationSeconds;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const out: string[] = [];
for (const a of acts) {
  if (a.provisional) out.push(`ACT "${a.id}" IS PROVISIONAL — ${a.provisional}`);
}
if (acts.some((a) => a.provisional)) {
  out.push('Read presence and ordering below. Nothing here is a calibration.');
  out.push('');
}
const lifeName = acts.length === 1 ? act.name : `A life: ${acts.map((a) => a.name).join(' → ')}`;
out.push(
  `${lifeName}: ${results.length} runs across ${policies.length} policies in ${elapsed.toFixed(1)}s ` +
    `(${runsPerPolicy} per policy, seeds 1000..${1000 + runsPerPolicy - 1}` +
    `${bossPull === undefined ? '' : `, boss pull ${bossPull}`}` +
    `${spawnOverride === undefined ? '' : `, all spawns forced to ${spawnOverride}`}` +
    `${jitter > 0 ? `, heading jitter ${jitter} rad` : ''}` +
    `, cadence ${cadence}s, threat weighting ${threat ? 'on' : 'off'})`,
);
out.push('');
out.push('policy                 runs   win rate (95% CI)      median s   kills   lvl   boss left');
out.push('-'.repeat(84));
for (const s of summarise(results)) {
  const [lo, hi] = s.winRateInterval;
  out.push(
    `${s.policy.padEnd(22)} ${String(s.runs).padStart(4)}   ` +
      `${pct(s.winRate).padStart(4)} [${pct(lo)}-${pct(hi)}]`.padEnd(22) +
      // `seconds` is an accumulation of dt, so the median of an even-sized
      // sample lands on things like 357.79999999999995 and takes the column
      // width with it.
      `${s.medianSeconds.toFixed(1).padStart(8)}   ` +
      `${String(s.medianKills).padStart(5)}   ${String(s.medianLevel).padStart(3)}   ` +
      `${s.medianBossLeft === null ? '     -' : pct(s.medianBossLeft).padStart(6)}`,
  );
}

// Everything from here to "state on arrival" is about the antibody, and only
// an act that fields one can say anything about it. On an act without the
// stream every stack figure is zero, the ordinal claim reads 0 > 0 and prints
// FAILS, and the report has announced a Conception failure over an act that
// never spawned the enemy. So the sections are skipped, and the report says
// so, rather than printed as zeros to be read past.
const hasAntibody = spawnStreams(act.waves).has('antibody');
if (!hasAntibody) {
  out.push('');
  out.push(`(no antibody stream in "${act.id}" — the stack, dispersion and dodge sections do not apply)`);
} else {
  // §8.4: report the distribution, not the median. A falsifier over a
  // distribution needs a level condition AND a dispersion condition, and the
  // median alone supplies neither at these counts.
  out.push('');
  out.push(`antibody stacks at ${mark}s — median below 3 means absent (§10.4); no upper bound`);
  out.push('-'.repeat(84));
  out.push(`policy                 median    p90    mean   n@${mark}   median@death`);
  for (const s of summarise(results)) {
    out.push(
      `${s.policy.padEnd(22)} ${String(s.medianStacksAt300).padStart(6)} ` +
        `${String(s.p90StacksAt300).padStart(6)} ${String(s.meanStacksAt300).padStart(7)}` +
        `${String(s.reached300).padStart(8)}${String(s.medianStacksAtEnd).padStart(15)}`,
    );
  }
  {
    const rows = summarise(results);
    const careful = Math.min(...rows.map((r) => r.meanStacksAt300));
    const careless = Math.max(...rows.map((r) => r.meanStacksAt300));
    const ratio = careful > 0 ? careless / careful : Infinity;
    out.push(
      `
spread, raw stack counts: careless ${careless.toFixed(1)} vs careful ` +
        `${careful.toFixed(1)} = ` +
        `${Number.isFinite(ratio) ? `${ratio.toFixed(1)}x` : 'undefined (careful is zero)'}`,
    );

    // §11.2 / G-026: a ratio is only meaningful if both terms sit where the
    // quantity still maps to player experience. Raw counts stopped doing that
    // once both terms cleared the old clamp, and the condition went on passing
    // at 2.5x while experienced dispersion was 1.0x. This is the reading that
    // matters.
    const drag = (stacks: number) => 1 - antibodyDragFor(stacks);
    const dCareful = drag(careful);
    const dCareless = drag(careless);
    const dRatio = dCareful > 0 ? dCareless / dCareful : Infinity;
    out.push(
      `spread, experienced drag:  careless ${(dCareless * 100).toFixed(1)}% vs careful ` +
        `${(dCareful * 100).toFixed(1)}% speed lost = ` +
        `${Number.isFinite(dRatio) ? `${dRatio.toFixed(2)}x` : 'undefined'}`,
    );
    // G-027: the 2.0x threshold is RETIRED. It was not stale — it was
    // unsatisfiable jointly with §3.3's severity intent, because the k that
    // reaches 2.0x caps the worst achievable drag at 30.2%, below the 35%
    // already judged too generous. What survives is the ordinal claim, which is
    // instrument-independent and is what a bot can actually establish.
    out.push(
      `  ordinal claim (G-027): careless > careful — ${dCareless > dCareful ? 'HOLDS' : 'FAILS'}. ` +
        `Magnitude is a human question, not a threshold.`,
    );
    out.push(
      `  (floor ${ANTIBODY_FLOOR} and k are placeholders awaiting §11.5 — §11.2, G-028)`,
    );
  }

  // §9.5 diagnostic: is the dodge bought with heading volatility or with speed?
  // §9.3 argues a fixed pixel lead is close to speed-neutral, because lateral
  // escape available is v x (L/v) and the speed cancels.
  out.push('');
  out.push('what buys the dodge — stacks against volatility and against speed');
  out.push('-'.repeat(84));
  out.push('policy                 stacks   turn rad/s   item speed   realised speed');
  for (const s of summarise(results)) {
    out.push(
      `${s.policy.padEnd(22)} ${String(s.meanStacksAt300).padStart(6)} ` +
        `${String(s.meanHeadingChangeRate).padStart(12)} ` +
        `${String(s.meanItemSpeed).padStart(12)} ` +
        `${String(s.meanRealisedSpeed).padStart(16)}`,
    );
  }
  {
    const stacks = results.map((r) => r.stacksAt300);
    const turn = pearson(stacks, results.map((r) => r.headingChangeRate));
    const itemSpeed = pearson(stacks, results.map((r) => r.itemSpeedAt300));
    const realised = pearson(stacks, results.map((r) => r.meanSpeed));
    const f = (c: { r: number; lo: number; hi: number }) => `r=${c.r} [${c.lo}, ${c.hi}]`;
    out.push('');
    out.push(`  stacks vs heading-change rate   ${f(turn)}   n=${turn.n}`);
    out.push(`  stacks vs item speed (exogenous) ${f(itemSpeed)}   n=${itemSpeed.n}`);
    out.push(`  stacks vs realised speed         ${f(realised)}   n=${realised.n}`);
    out.push(
      '  Realised speed is endogenous — stacks are one of the things that lower it —',
    );
    out.push('  so only the first two lines bear on the hypothesis.');
    const turnRates = results.map((r) => r.headingChangeRate);
    const speeds = results.map((r) => r.itemSpeedAt300);
    out.push('');
    out.push(`  partial: stacks vs turn, holding speed fixed   ${partial(stacks, turnRates, speeds)}`);
    out.push(`  partial: stacks vs speed, holding turn fixed   ${partial(stacks, speeds, turnRates)}`);

    // Chemotaxis pulls enemies toward a point, and antibodies are enemies. If a
    // player-placed attractor is dragging them onto the player, that is a
    // self-inflicted stack generator and it is neither speed nor volatility.
    // Levels as the first act ended: in a life, `items` also holds School's
    // picks, which cannot have produced a stack counted at 300s in Conception.
    const chemoLevel = (r: RunResult) => r.itemsAtFirstActEnd['chemotaxis'] ?? 0;
    const chemo = results.map(chemoLevel);
    const withChemo = results.filter((r) => chemoLevel(r) > 0);
    const without = results.filter((r) => chemoLevel(r) === 0);
    const avg = (rs: RunResult[]) =>
      rs.length === 0 ? 0 : +(rs.reduce((a, b) => a + b.stacksAt300, 0) / rs.length).toFixed(1);
    const c = pearson(stacks, chemo);
    out.push('');
    out.push(`  stacks vs chemotaxis level      r=${c.r} [${c.lo}, ${c.hi}]   n=${c.n}`);
    out.push(
      `  mean stacks with chemotaxis ${avg(withChemo)} (n=${withChemo.length})` +
        `  vs without ${avg(without)} (n=${without.length})`,
    );
    out.push(`  partial: stacks vs chemotaxis, holding speed fixed  ${partial(stacks, chemo, speeds)}`);
  }
}

// Over the runs that got there. A policy none of whose runs reached the mark
// has no arrival state, and prints as such rather than as a healthy zero.
out.push('');
out.push(`state on arrival at the boss (${mark}s) — where a swing lives if not in the stacks`);
out.push('-'.repeat(84));
out.push(`policy                  hp%   kills   alive   stacks   n@${mark}`);
for (const s of summarise(results)) {
  const none = s.reached300 === 0;
  out.push(
    `${s.policy.padEnd(22)} ${(none ? '-' : pct(s.medianHpFractionAt300)).padStart(5)} ` +
      `${String(none ? '-' : s.medianKillsAt300).padStart(7)} ` +
      `${String(none ? '-' : s.medianEnemiesAt300).padStart(7)} ` +
      `${String(none ? '-' : s.medianStacksAt300).padStart(8)}` +
      `${String(s.reached300).padStart(8)}`,
  );
}

// The only things in the game aimed at the player: the Egg's volley and a
// ranged enemy's shot (AUDIT part three). Counts, not rates — shots inside a
// run are not independent, and this section exists to show that aimed
// pressure is present and whom it comes from, not how often it lands. An act
// in which no shot ever came at anyone is skipped rather than printed as
// zeros, the way the antibody sections are.
out.push('');
if (results.every((r) => r.shotsSeen === 0)) {
  out.push(`(no aimed shot came at any bot in "${act.id}" — the aimed-shot section does not apply)`);
} else {
  out.push('aimed shots — seen, hit, and by whom (totals over the policy’s runs; counts, not rates)');
  out.push('-'.repeat(84));
  out.push('policy                   seen     hit   runs hit   by whom, hit of seen');
  for (const s of summarise(results)) {
    const blind = POLICIES.find((p) => p.name === s.policy)?.blindToShots === true;
    const by = Object.entries(s.shotsBy)
      .sort((a, b) => b[1].seen - a[1].seen)
      .map(([id, c]) => `${id} ${c.hit}/${c.seen}`)
      .join(', ');
    out.push(
      `${`${s.policy}${blind ? ' (blind)' : ''}`.padEnd(22)} ${String(s.shotsSeen).padStart(6)} ` +
        `${String(s.shotsHit).padStart(7)} ${`${s.runsHitByShot}/${s.runs}`.padStart(10)}   ${by || '-'}`,
    );
  }
  out.push(
    `  seen: would pass within reach + ${SHOT_MARGIN_PX}px inside ${SHOT_LOOKAHEAD_SECONDS}s had the bot stood still.`,
  );
  out.push(
    `  Every policy sidesteps (weight ${SHOT_SIDESTEP_WEIGHT}) except the blind control. All three are`,
  );
  out.push('  PLACEHOLDERS in bots.ts — the bot’s, not the game’s.');
}

// The Gym Teacher's balls and Prom's floor (SCHOOL-ROSTER §9, ADOLESCENCE-
// ROSTER §4). Whether a shielded fight ends, and how much of it the shield
// was up — presence, not a rate: "a fight or a chore?" is a person's question,
// and this only says whether the bot got to ask it. An act whose boss has no
// shield (the Egg) is skipped with a note, as the antibody sections are.
out.push('');
const shieldActs = acts.filter((a) => bossHasShield(a.boss));
if (shieldActs.length === 0) {
  out.push(`(the boss of "${act.id}" has no shield — the shield section does not apply)`);
} else {
  out.push(
    `the boss's shield — seconds up, of the fight` +
      `${acts.length > 1 ? ` (${shieldActs.map((a) => a.id).join(' + ')}, pooled)` : ''}` +
      ` (totals over the policy’s fights; counts, not rates)`,
  );
  out.push('-'.repeat(84));
  out.push('policy                 fights    up s   of fight s   up      median fight s   at cap');
  for (const s of summarise(results)) {
    const blind = POLICIES.find((p) => p.name === s.policy)?.blindToShield === true;
    const share = s.bossFightSeconds > 0 ? pct(s.bossShieldedSeconds / s.bossFightSeconds) : '-';
    out.push(
      `${`${s.policy}${blind ? ' (blind)' : ''}`.padEnd(22)} ${String(s.bossFights).padStart(6)} ` +
        `${s.bossShieldedSeconds.toFixed(1).padStart(7)} ${s.bossFightSeconds.toFixed(1).padStart(12)}   ` +
        `${share.padEnd(6)} ${(s.medianBossFightSeconds === null ? '-' : s.medianBossFightSeconds.toFixed(1)).padStart(16)}` +
        `${`${s.runsAtCap}/${s.runs}`.padStart(9)}`,
    );
  }
  out.push(
    `  at cap: alive at the step cap, ${BOSS_PHASE_MAX_SECONDS}s past the boss` +
      `${acts.length > 1 ? ' per act, summed over the life' : ''}. Every policy but the blind control`,
  );
  out.push(
    `  hunts the nearest ball / walks onto the floor to ${FLOOR_HOLD_FRACTION} of its radius (pull ` +
      `${SHIELD_PULL_WEIGHT}, ball clearance ${HUNT_CLEARANCE_PX}px) — PLACEHOLDERS in bots.ts.`,
  );
}

// The certificate, tallied (D-024). Where the life ended, at what age, and of
// what. This is the table a person would want first; it is last because the
// ones above it existed first.
out.push('');
out.push('how it ended — median age, the act it ended in, and the certificate');
out.push('-'.repeat(84));
out.push('policy                   age   ended in                      of');
for (const s of summarise(results)) {
  const endedIn = Object.entries(s.endedIn)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${id} ${n}`)
    .join(', ');
  const causes = s.causes
    .slice(0, 3)
    .map(([cause, n]) => `${cause} ${n}`)
    .join(', ');
  // One decimal: a median of two ages is a half-year, and 15.149999999999999 is not an age.
  out.push(`${s.policy.padEnd(22)} ${s.medianAge.toFixed(1).padStart(5)}   ${endedIn.padEnd(29)} ${causes}`);
}

// What the Egg dealt (G-042), for presence: a roll that never appears is a
// defect; the shares are dice, not a finding (G-026).
if (acts.length > 1) {
  const dealt = new Map<string, number>();
  for (const r of results) dealt.set(r.inheritance ?? 'never crossed', (dealt.get(r.inheritance ?? 'never crossed') ?? 0) + 1);
  const shares = [...dealt].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${n} (${pct(n / results.length)})`);
  out.push('', `inherited — ${shares.join(', ')}`);
}

out.push('');
out.push(
  `item uptake — share of runs that took it at least once${acts.length > 1 ? ' over the life' : ''}, rarest first`,
);
out.push('-'.repeat(84));
for (const item of itemUptake(results)) {
  out.push(`${item.id.padEnd(22)} ${String(item.runs).padStart(4)}   ${pct(item.share).padStart(4)}`);
}
out.push('');
out.push(
  'A win rate from a handful of runs is not a win rate — the interval is the ' +
    'result, not the point estimate.',
);

const report = out.join('\n');
process.stdout.write(`${report}\n`);

const file = resolve(process.cwd(), 'tools/playtest/runs/latest.json');
mkdirSync(dirname(file), { recursive: true });
writeFileSync(
  file,
  `${JSON.stringify({ acts: acts.map((a) => a.id), runsPerPolicy, elapsed, results }, null, 2)}\n`,
);
writeFileSync(resolve(process.cwd(), 'tools/playtest/runs/latest.txt'), `${report}\n`);
