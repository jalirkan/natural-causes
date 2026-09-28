import { ENEMIES } from '../data/enemies';
import { offerTitle } from '../data/item-text';
import { ITEMS, OFFER_PATH_SEPARATOR, isActive, offerIdFor, type ItemDef } from '../data/items';
import type { InputLog } from '../meta/input-log';
import type { World } from '../sim/world';
import { bossCheats, bossReadout } from './boss-cheats';
import type { DevState } from './state';

/**
 * The dev panel. Development builds only — `ActScene` imports it behind
 * `import.meta.env.DEV`, so Rollup drops this file and its dynamic import from
 * a production bundle entirely.
 *
 * **It touches the World only through its public surface.** Nothing here is a
 * flag inside `world.ts`, and that is the whole design: the playtest bots
 * import `World` directly, so a `godMode` field on the rules object is a field
 * that can be true during a measured run. God mode is "set hp back to full
 * after each step" and skip-to-boss is "assign `world.time`" — cheats the
 * simulation cannot see, because they happen outside it.
 *
 * The other rule is TAINT. Any action here latches `tainted`, the HUD says so
 * for the rest of the run, and only a restart clears it. §12.4 needs six
 * questions answered by a person playing honestly, and "was god mode still on
 * an hour ago?" is not a question anyone can answer from memory.
 */

export interface DevPanelHost {
  world: World;
  dev: DevState;
  /** This run's held headings. Read only; the scene feeds and stores it. */
  inputLog: InputLog;
  restart: () => void;
}

const CSS = `
#nc-dev{position:fixed;top:8px;right:8px;width:250px;max-height:calc(100vh - 16px);
overflow-y:auto;background:#1b1815f2;color:#efe7d6;font:11px/1.5 ui-monospace,monospace;
border:1px solid #6e6353;border-radius:4px;padding:8px 10px 10px;z-index:9;
-webkit-font-smoothing:antialiased}
#nc-dev h4{margin:9px 0 4px;font-size:10px;letter-spacing:.13em;color:#d2c6ac;
text-transform:uppercase;font-weight:400;border-bottom:1px solid #6e635355;padding-bottom:2px}
#nc-dev h4:first-of-type{margin-top:6px}
#nc-dev button{background:#2a2521;color:#efe7d6;border:1px solid #6e6353;border-radius:3px;
font:inherit;padding:2px 6px;margin:0 3px 3px 0;cursor:pointer}
#nc-dev button:hover{background:#3a332c}
#nc-dev button.on{background:#d2c6ac;color:#2a2521;border-color:#d2c6ac}
#nc-dev .row{display:flex;align-items:center;gap:4px;margin-bottom:2px}
#nc-dev .row span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nc-dev .lv{width:22px;text-align:right;color:#d2c6ac}
#nc-dev .row span.lv{flex:none}
#nc-dev .row span.path{padding-left:8px;color:#d2c6ac}
#nc-dev .hd{display:flex;justify-content:space-between;align-items:center;
font-size:10px;letter-spacing:.13em;color:#c4472e}
#nc-dev .note{color:#9a8f7d;font-size:10px;margin-top:8px;line-height:1.4}
`;

export function attachDevPanel(host: DevPanelHost): () => void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const root = document.createElement('div');
  root.id = 'nc-dev';
  document.body.append(root);

  let open = true;

  /** Every mutation goes through here, so nothing can cheat without tainting. */
  const act = (fn: () => void) => () => {
    fn();
    host.dev.tainted = true;
    render();
  };

  const button = (label: string, onClick: () => void, on = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    if (on) b.className = 'on';
    b.onclick = (e) => {
      onClick();
      // Buttons keep focus after a click and Phaser reads keys off the window,
      // so WASD would land on the button instead of the player.
      (e.currentTarget as HTMLElement).blur();
    };
    return b;
  };

  const section = (title: string, ...kids: Node[]): void => {
    const h = document.createElement('h4');
    h.textContent = title;
    root.append(h, ...kids);
  };

  const line = (...kids: Node[]): HTMLDivElement => {
    const d = document.createElement('div');
    d.className = 'row';
    d.append(...kids);
    return d;
  };

  function render(): void {
    const w = host.world;
    const d = host.dev;
    root.textContent = '';

    const head = document.createElement('div');
    head.className = 'hd';
    head.append(document.createTextNode(d.tainted ? 'DEV · RUN TAINTED' : 'DEV MODE'));
    head.append(button('hide', () => toggle()));
    root.append(head);

    section(
      'run',
      line(
        button('god', act(() => (d.god = !d.god)), d.god),
        button('no drag', act(() => (d.noDrag = !d.noDrag)), d.noDrag),
      ),
      line(
        button('empty field', act(() => (d.emptyField = !d.emptyField)), d.emptyField),
        button('clear now', act(() => (w.enemies.length = 0))),
      ),
      line(
        ...[0.25, 0.5, 1, 2, 4].map((s) =>
          button(`${s}x`, act(() => (d.timeScale = s)), d.timeScale === s),
        ),
      ),
      line(button('restart (R)', () => host.restart())),
    );

    const clock = document.createElement('span');
    // The ACT's clock against the act's length: the life clock runs on
    // through every act, and "skip to boss" means this act's boss.
    const dur = w.act.durationSeconds;
    const m = Math.floor(w.actTime / 60);
    clock.textContent = `${w.act.name.toLowerCase()} ${m}:${String(Math.floor(w.actTime % 60)).padStart(2, '0')} / ${
      Math.floor(dur / 60)
    }:${String(dur % 60).padStart(2, '0')}`;
    section(
      'time',
      line(clock),
      line(
        button('+30s', act(() => (w.time += 30))),
        button('+60s', act(() => (w.time += 60))),
        // The boss spawns at the end of the step that crosses the duration.
        button('skip to boss', act(() => (w.time += Math.max(0, w.act.durationSeconds - w.actTime)))),
      ),
    );

    // Read only: this run's held headings (src/meta/input-log.ts) beside the
    // bots' cadence, a PLACEHOLDER in tools/playtest/bots.ts. Not like for
    // like — a bot re-deciding into the same sector is one hold, not two.
    const held = host.inputLog.summary();
    const text = (s: string): HTMLSpanElement => {
      const span = document.createElement('span');
      span.textContent = s;
      return span;
    };
    const heldNote = document.createElement('div');
    heldNote.className = 'note';
    heldNote.textContent = d.tainted
      ? 'Tainted: this log will not be saved at the run’s end.'
      : 'Saved when the run ends. A bot re-decision is not a hold.';
    section(
      'held headings',
      line(text(`n ${held.count}  median ${held.median.toFixed(2)}s  p90 ${held.p90.toFixed(2)}s`)),
      line(text('bots re-decide every 0.2s')),
      heldNote,
    );

    /**
     * G-043: one row per path of an owned active item, under its level row,
     * written straight into `world.pathLevels`. No sim hook is needed for the
     * write to land: `World.bonusFor` compares the weapon's level and every
     * path's level against the ones its cached total was folded at on every
     * read, so the next shot (or the next step, for an orbit or aura) sees
     * it. A path of an item not held is not shown — and not kept, see below.
     */
    const pathRows = (def: ItemDef, owned: number): HTMLDivElement[] => {
      if (owned <= 0 || !isActive(def) || !def.paths) return [];
      return def.paths.map((path) => {
        const key = offerIdFor(def, path);
        const at = w.pathLevels.get(key) ?? 0;
        const name = document.createElement('span');
        name.className = 'path';
        name.textContent = `· ${path.name}`;
        // Under its weapon's row, the path's name alone reads; the hover is
        // the card's whole title ("Grudge · Company").
        name.title = offerTitle(key);
        const lv = document.createElement('span');
        lv.className = 'lv';
        lv.textContent = `${at}/${path.maxLevel}`;
        const set = (n: number) => () => {
          if (n <= 0) w.pathLevels.delete(key);
          else w.pathLevels.set(key, Math.min(path.maxLevel, n));
        };
        return line(name, lv, button('−', act(set(at - 1))), button('+', act(set(at + 1))));
      });
    };

    /**
     * A removed item takes its path levels with it, as the weapon an
     * evolution replaces does in `World.take` (G-043, kept by G-046):
     * otherwise they wait unseen and return when the item is added again.
     */
    const dropPaths = (id: string): void => {
      const prefix = id + OFFER_PATH_SEPARATOR;
      for (const key of [...w.pathLevels.keys()]) if (key.startsWith(prefix)) w.pathLevels.delete(key);
    };

    const itemRows = Object.values(ITEMS).flatMap((def) => {
      const owned = w.items.get(def.id) ?? 0;
      const name = document.createElement('span');
      name.textContent = def.name;
      const lv = document.createElement('span');
      lv.className = 'lv';
      lv.textContent = `${owned}/${def.maxLevel}`;
      const set = (n: number) => () => {
        if (n <= 0) {
          w.items.delete(def.id);
          dropPaths(def.id);
        } else w.items.set(def.id, Math.min(def.maxLevel, n));
        // Thick Skin moves maxHp, and removing it must pull the current
        // value back under the new ceiling.
        w.hp = Math.min(w.hp, w.maxHp);
      };
      return [
        line(name, lv, button('−', act(set(owned - 1))), button('+', act(set(owned + 1)))),
        ...pathRows(def, owned),
      ];
    });

    section(
      'items',
      ...itemRows,
      line(
        button(
          'max all',
          act(() => {
            // Not the evolutions: holding one beside the weapon it replaces is
            // a state play cannot reach. Maxing is what makes one ready.
            for (const def of Object.values(ITEMS)) {
              if ('evolvesFrom' in def && def.evolvesFrom) continue;
              w.items.set(def.id, def.maxLevel);
            }
            // And every path of every item now held (G-043), written as the
            // path rows write it; `bonusFor` sees it on its next read.
            for (const id of w.items.keys()) {
              const def = ITEMS[id];
              if (!def || !isActive(def) || !def.paths) continue;
              for (const path of def.paths) w.pathLevels.set(offerIdFor(def, path), path.maxLevel);
            }
            w.hp = Math.min(w.hp, w.maxHp);
          }),
        ),
        button(
          'clear',
          act(() => {
            w.items.clear();
            // Paths go with their items: a cleared Reflex is a fresh one.
            w.pathLevels.clear();
            w.items.set('lash', 1);
          }),
        ),
      ),
      line(
        // Through the real path — a gem worth the remaining XP — so this
        // exercises the offer queue rather than going around it. Worth it
        // AFTER the tax (AUDIT 42): collection multiplies by `xpTax`, so with
        // an invoice worn a gem of exactly what is left fell short and
        // levelled nobody. Rounded up past float, so it cannot land a hair under.
        button(
          'level up',
          act(() => {
            const need = (w.xpToNext - w.xp) / w.xpTax;
            w.gems.push({ x: w.x, y: w.y, value: Math.max(1, Math.ceil(need + 1e-9)) });
          }),
        ),
      ),
    );

    // This act's enemies only. The registry holds every act's, and an atlas
    // holds one act's — a button that spawns a School clique into Conception
    // spawns a real enemy with no frame to draw it, which reads as a renderer
    // bug and is a dev panel offering something that does not exist.
    section(
      'spawn',
      ...Object.values(ENEMIES)
        .filter((def) => def.act === w.act.id)
        .map((def) =>
          line(
            button(`1x ${def.name}`, act(() => w.spawnEnemy(def.id))),
            button('10x', act(() => { for (let i = 0; i < 10; i++) w.spawnEnemy(def.id); })),
          ),
        ),
    );

    const boss = w.boss;
    if (boss) {
      // Named by the act (AUDIT 42): every act has a boss now, and only one is
      // the Egg. The readout and the buttons are chosen per kind in
      // boss-cheats.ts (Time's clock, the Mortgage's window); each button is
      // a cheat through `act`, so it taints, and its hover says what it writes.
      section(
        w.act.bossName,
        line(document.createTextNode(bossReadout(boss, w.act.boss))),
        line(
          ...bossCheats(boss).map((cheat) => {
            // Only on the boss it was drawn for: a click in the half second
            // after a crossing must not write a Mortgage cheat into Time.
            const b = button(cheat.label, act(() => w.boss === boss && cheat.apply(boss)));
            b.title = cheat.hint;
            return b;
          }),
        ),
      );
    }

    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = d.tainted
      ? 'This run is tainted and cannot answer §12.4. Restart for a clean one.'
      : 'Nothing used yet — this run still counts. ` toggles this panel.';
    root.append(note);
  }

  function toggle(): void {
    open = !open;
    root.style.display = open ? '' : 'none';
    if (open) render();
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === '`' || e.key === '~') {
      e.preventDefault();
      toggle();
    }
  };
  window.addEventListener('keydown', onKey);

  render();
  // The clock and the boss section are live; the rest only changes on click.
  const timer = window.setInterval(() => open && render(), 500);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener('keydown', onKey);
    root.remove();
    style.remove();
  };
}
