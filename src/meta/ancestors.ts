import type { Certificate } from '../sim/world';
import { ageYears } from '../scenes/certificate';

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
    typeof r.at === 'number'
  );
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

/** Remember a life that has ended. Keeps the newest `ANCESTORS_CAP`. */
export function recordLife(cert: Certificate): void {
  try {
    const s = store();
    if (!s) return;
    const list = load();
    list.push({
      outcome: cert.outcome,
      actName: cert.actName,
      age: cert.age,
      cause: cert.cause,
      at: Date.now(),
    });
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
 * "Age 9 · School · Homework", or "Age 12 · natural causes" for the win.
 */
export function obituary(a: Ancestor): string {
  const age = `Age ${ageYears(a.age)}`;
  if (a.outcome === 'won') return `${age} · natural causes`;
  return `${age} · ${a.actName} · ${a.cause}`;
}
