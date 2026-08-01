import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  POLICIES,
  itemUptake,
  partial,
  pearson,
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
const onlyPolicy = argv.find((a) => a.startsWith('--policy='))?.slice(9);
const pullArg = argv.find((a) => a.startsWith('--pull='))?.slice(7);
const bossPull = pullArg === undefined ? undefined : Number(pullArg);
const spawnArg = argv.find((a) => a.startsWith('--spawn='))?.slice(8);
const spawnOverride = spawnArg === 'edge' || spawnArg === 'lead' ? spawnArg : undefined;
const jitter = Number(argv.find((a) => a.startsWith('--jitter='))?.slice(9) ?? 0);
setHeadingJitter(jitter);
// Instrument arms (§10.5). Defaults are the re-baselined bot; --inertia=0 and
// --threat=0 reproduce the old one for the control arms.
const inertiaArg = argv.find((a) => a.startsWith('--inertia='))?.slice(10);
const threatArg = argv.find((a) => a.startsWith('--threat='))?.slice(9);
const tau = inertiaArg === undefined ? 0.22 : Number(inertiaArg);
const threat = threatArg === undefined ? true : threatArg !== '0';
setInstrument(tau, threat);

const policies = onlyPolicy ? POLICIES.filter((p) => p.name === onlyPolicy) : POLICIES;
if (policies.length === 0) {
  process.stderr.write(`No policy named "${onlyPolicy}"\n`);
  process.exit(1);
}

const started = Date.now();
const results: RunResult[] = [];
for (const policy of policies) {
  for (let i = 0; i < runsPerPolicy; i++) results.push(runOnce(policy, 1000 + i, bossPull, spawnOverride));
}
const elapsed = (Date.now() - started) / 1000;

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const out: string[] = [];
out.push(
  `${results.length} runs across ${policies.length} policies in ${elapsed.toFixed(1)}s ` +
    `(${runsPerPolicy} per policy, seeds 1000..${1000 + runsPerPolicy - 1}` +
    `${bossPull === undefined ? '' : `, boss pull ${bossPull}`}` +
    `${spawnOverride === undefined ? '' : `, all spawns forced to ${spawnOverride}`}` +
    `${jitter > 0 ? `, heading jitter ${jitter} rad` : ''}` +
    `, inertia tau ${tau}s, threat weighting ${threat ? 'on' : 'off'})`,
);
out.push('');
out.push('policy                 runs   win rate (95% CI)      median s   kills   lvl   boss left');
out.push('-'.repeat(84));
for (const s of summarise(results)) {
  const [lo, hi] = s.winRateInterval;
  out.push(
    `${s.policy.padEnd(22)} ${String(s.runs).padStart(4)}   ` +
      `${pct(s.winRate).padStart(4)} [${pct(lo)}-${pct(hi)}]`.padEnd(22) +
      `${String(s.medianSeconds).padStart(8)}   ` +
      `${String(s.medianKills).padStart(5)}   ${String(s.medianLevel).padStart(3)}   ` +
      `${s.medianBossLeft === null ? '     -' : pct(s.medianBossLeft).padStart(6)}`,
  );
}

// §8.4: report the distribution, not the median. A falsifier over a
// distribution needs a level condition AND a dispersion condition, and the
// median alone supplies neither at these counts.
out.push('');
out.push('antibody stacks at 300s — working band is median 4-12, careless >= 2x careful');
out.push('-'.repeat(84));
out.push('policy                 median    p90    mean   n@300   median@death');
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
spread: careless ${careless.toFixed(1)} vs careful ${careful.toFixed(1)} ` +
      `= ${Number.isFinite(ratio) ? `${ratio.toFixed(1)}x` : 'undefined (careful is zero)'}` +
      `  — needs >= 2.0x`,
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
  const chemo = results.map((r) => r.items['chemotaxis'] ?? 0);
  const withChemo = results.filter((r) => (r.items['chemotaxis'] ?? 0) > 0);
  const without = results.filter((r) => (r.items['chemotaxis'] ?? 0) === 0);
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

out.push('');
out.push('state on arrival at the boss (300s) — where a swing lives if not in the stacks');
out.push('-'.repeat(84));
out.push('policy                  hp%   kills   alive   stacks');
for (const s of summarise(results)) {
  out.push(
    `${s.policy.padEnd(22)} ${pct(s.medianHpFractionAt300).padStart(5)} ` +
      `${String(s.medianKillsAt300).padStart(7)} ${String(s.medianEnemiesAt300).padStart(7)} ` +
      `${String(s.medianStacksAt300).padStart(8)}`,
  );
}

out.push('');
out.push('item uptake — share of runs that took it at least once, rarest first');
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
writeFileSync(file, `${JSON.stringify({ runsPerPolicy, elapsed, results }, null, 2)}\n`);
writeFileSync(resolve(process.cwd(), 'tools/playtest/runs/latest.txt'), `${report}\n`);
