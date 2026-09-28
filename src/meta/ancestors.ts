import type { Certificate } from '../sim/world';
import { RULES, type RuleId } from '../sim/rules';
import { ageYears, hudRules } from '../scenes/certificate';

/**
 * The ancestor log: every life that ends is remembered, and the title shows
 * the last few, so "live again" has a history behind it.
 *
 * Meta-state, and so outside `World` for the reason dev cheats are: the bots
 * play the sim headless and must never see it. It lives in the browser's
 * localStorage, which can be absent or can throw (private windows, blocked
 * site data, previews); every touch is wrapped so that case is a quiet no-op
 * and the game plays exactly as if nobody had lived before. No Phaser here.
 */

export interface Ancestor {
  outcome: Certificate['outcome'];
  actName: string;
  /** Raw age off the certificate; `obituary` rounds it the way the certificate does. */
  age: number;
  cause: string;
  /** Epoch ms the life ended. */
  at: number;
  /**
   * The name on the form. Optional: lives recorded before the run had a name
   * carry none and print as they always did. Nothing is migrated.
   */
  name?: string;
  /**
   * The rules the life was played under (G-055), as the certificate had them.
   * Kept only for a ruled life: a record without them — every one written
   * before rules existed, and every plain life since — reads as none. Nothing
   * is migrated.
   */
  rules?: RuleId[];
}

/** One key, beside `nc-muted`. */
export const ANCESTORS_KEY = 'nc-ancestors';
/** How many lives are kept. Older ones are forgotten, as they are. */
export const ANCESTORS_CAP = 50;

/** Reading `localStorage` itself can throw when site data is blocked. */
function store(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function isAncestor(a: unknown): a is Ancestor {
  if (typeof a !== 'object' || a === null) return false;
  const r = a as Record<string, unknown>;
  return (
    (r.outcome === 'died' || r.outcome === 'won') &&
    typeof r.actName === 'string' &&
    typeof r.age === 'number' &&
    typeof r.cause === 'string' &&
    typeof r.at === 'number' &&
    (r.name === undefined || typeof r.name === 'string') &&
    (r.rules === undefined || (Array.isArray(r.rules) && r.rules.every(isRule)))
  );
}

/**
 * A rule the registry holds. A record naming one it does not (a later build's
 * rule, a hand-edited key) is unreadable, and so reads as nobody, as any
 * other malformed entry does: an obituary cannot print a rule it cannot name.
 */
function isRule(id: unknown): id is RuleId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(RULES, id);
}

/** Oldest first, as stored. Anything unreadable reads as nobody. */
function load(): Ancestor[] {
  try {
    const raw = store()?.getItem(ANCESTORS_KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isAncestor) : [];
  } catch {
    return [];
  }
}

/**
 * Remember a life that has ended, under the name the scene held for it.
 * Keeps the newest `ANCESTORS_CAP`. A blank name is not recorded.
 */
export function recordLife(cert: Certificate, name?: string): void {
  try {
    const s = store();
    if (!s) return;
    const list = load();
    const life: Ancestor = {
      outcome: cert.outcome,
      actName: cert.actName,
      age: cert.age,
      cause: cert.cause,
      at: Date.now(),
    };
    if (name?.trim()) life.name = name.trim();
    // Read defensively: inside this try, a throw would lose the life unseen.
    if (cert.rules && cert.rules.length > 0) life.rules = [...cert.rules];
    list.push(life);
    s.setItem(ANCESTORS_KEY, JSON.stringify(list.slice(-ANCESTORS_CAP)));
  } catch {
    // Quota, blocked storage: the life goes unrecorded, the game goes on.
  }
}

/** The newest `n` lives, most recent first. */
export function recentLives(n: number): Ancestor[] {
  if (n <= 0) return [];
  return load().slice(-n).reverse();
}

/**
 * One line on the title, in the certificate's words but as an obituary:
 * "Nobody · Age 9 · School · Homework", or "Justin · Age 12 · natural causes"
 * for the win. A life recorded before names existed prints without one. A
 * ruled life (G-055) ends with its rules as the HUD named them:
 * "Age 9 · School · Homework · couch potato".
 */
export function obituary(a: Ancestor): string {
  const who = a.name?.trim() ? `${a.name.trim()} · ` : '';
  const age = `${who}Age ${ageYears(a.age)}`;
  const rules = a.rules && a.rules.length > 0 ? ` · ${hudRules(a.rules)}` : '';
  if (a.outcome === 'won') return `${age} · natural causes${rules}`;
  return `${age} · ${a.actName} · ${a.cause}${rules}`;
}
