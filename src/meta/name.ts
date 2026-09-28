/**
 * The name on the form: the one thing the player tells the game about
 * themselves, asked at the title and remembered between visits.
 *
 * Meta-state, outside `World` for the reason the ancestor log is: the sim and
 * the bots never know it. The substitute teacher's shot is this name spelled
 * wrong (SCHOOL-ROSTER §3.5) and the certificate prints it (G-002); both are
 * presentation, so both read it here. Storage can be absent or throw, and
 * every touch is wrapped so that case plays as a first visit. No Phaser here.
 */

/** One key, beside `nc-muted` and `nc-ancestors`. */
export const NAME_KEY = 'nc-name';
/** What the title accepts. Twelve fits a form's box and a shot in flight. */
export const NAME_MAX = 12;
/**
 * The name of a player who gave none — a tap on a phone, Enter on an empty
 * field. The substitute misspells it and the certificate prints it; that is
 * the joke, not a fallback that leaked.
 */
export const DEFAULT_NAME = 'Nobody';

const LETTER = /\p{L}/u;
/** Letters, spaces, hyphens, apostrophes: the characters a name is made of. */
const NAME_CHAR = /^[\p{L} '’-]$/u;

/** Whether the title should let this key's character into a name. */
export function isNameChar(ch: string): boolean {
  return NAME_CHAR.test(ch);
}

/**
 * A name as the form would hold it: only name characters, runs of spaces
 * collapsed, ends trimmed, at most `NAME_MAX`. Null when no letter is left —
 * a name of hyphens is no name.
 */
export function cleanName(raw: string): string | null {
  const kept = [...raw].filter(isNameChar).join('').replace(/ +/g, ' ').trim();
  const name = [...kept].slice(0, NAME_MAX).join('').trim();
  return LETTER.test(name) ? name : null;
}

/** Reading `localStorage` itself can throw when site data is blocked. */
function store(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * The name written on this page, once one has been. Storage carries a name to
 * the next visit; this carries it from the title to the act, so a private
 * window that refuses the write still has the substitute misspell the name
 * the player typed rather than print "Nobody" over it.
 */
let written: { name: string | null } | undefined;

/** The remembered name, or null: never given, unreadable, or no storage. */
export function readPlayerName(): string | null {
  if (written) return written.name;
  try {
    const raw = store()?.getItem(NAME_KEY);
    return typeof raw === 'string' ? cleanName(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Remember a name for the next visit. A name with no letters forgets the old
 * one, so a player who erased their name to be Nobody stays Nobody.
 */
export function writePlayerName(name: string): void {
  const clean = cleanName(name);
  written = { name: clean };
  try {
    const s = store();
    if (!s) return;
    if (clean) s.setItem(NAME_KEY, clean);
    else s.removeItem(NAME_KEY);
  } catch {
    // Quota, blocked storage: this page keeps it; the next visit asks again.
  }
}

/** A small integer hash (murmur3's finaliser), so a seed picks a mistake without `Math.random`. */
function hash(seed: number, salt: number): number {
  let h = Math.imul((seed | 0) ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** `ch` in the case `like` is in; a two-letter slip capitalises only its first ("Ph", not "PH"). */
function caseOf(ch: string, like: string): string {
  const lower = ch.toLowerCase();
  return like !== like.toLowerCase() ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
}

/** Vowels a hurried hand writes for each other. */
const VOWEL_SLIPS: Record<string, string[]> = {
  a: ['e', 'o'],
  e: ['a', 'i'],
  i: ['e', 'y'],
  o: ['a', 'u'],
  u: ['o', 'e'],
  y: ['i'],
};

/** First letters misheard or misread: the sound-alikes and the look-alikes. */
const FIRST_SLIPS: Record<string, string[]> = {
  a: ['e', 'o'],
  b: ['p', 'd'],
  c: ['k', 's'],
  d: ['t', 'b'],
  e: ['a', 'i'],
  f: ['v', 'ph'],
  g: ['j', 'q'],
  h: ['n', 'k'],
  i: ['e', 'y'],
  j: ['g', 'y'],
  k: ['c', 'q'],
  l: ['r', 'i'],
  m: ['n', 'w'],
  n: ['m', 'h'],
  o: ['a', 'u'],
  p: ['b', 'f'],
  q: ['k', 'g'],
  r: ['l', 'w'],
  s: ['z', 'c'],
  t: ['d', 'f'],
  u: ['o', 'v'],
  v: ['f', 'w'],
  w: ['v', 'r'],
  x: ['z', 'ks'],
  y: ['j', 'i'],
  z: ['s', 'x'],
};

type Slip = (chars: string[], pick: (n: number) => number) => string[] | null;

/** Indices of the letters in a name (not its spaces, hyphens, apostrophes). */
const lettersIn = (chars: string[]) => chars.flatMap((c, i) => (LETTER.test(c) ? [i] : []));

/** Two neighbouring letters swapped. Each position keeps its case, so the first letter's holds. */
const swap: Slip = (chars, pick) => {
  const pairs = lettersIn(chars).filter(
    (i) => i + 1 < chars.length && LETTER.test(chars[i + 1]!) && chars[i]!.toLowerCase() !== chars[i + 1]!.toLowerCase(),
  );
  // Past the first letter when the name allows it: "Jsutin" is a slip, "Ujstin" a different name.
  const inner = pairs.filter((i) => i > lettersIn(chars)[0]!);
  const from = inner.length > 0 ? inner : pairs;
  if (from.length === 0) return null;
  const i = from[pick(from.length)]!;
  const out = [...chars];
  out[i] = caseOf(chars[i + 1]!, chars[i]!);
  out[i + 1] = caseOf(chars[i]!, chars[i + 1]!);
  return out;
};

/**
 * One letter written twice, and a lower-case one where there is one: "Justtin",
 * not "Mary-Jjane". The copy wears its letter's case, except a doubled first
 * letter's, so a lone "A" doubles to "Aa" and "JUSTIN" to "JUSSTIN".
 */
const double: Slip = (chars, pick) => {
  const letters = lettersIn(chars);
  const inner = letters.length > 1 ? letters.slice(1) : letters;
  const small = inner.filter((i) => chars[i] === chars[i]!.toLowerCase());
  const from = small.length > 0 ? small : inner;
  const i = from[pick(from.length)]!;
  const out = [...chars];
  out.splice(i + 1, 0, i === letters[0] ? chars[i]!.toLowerCase() : chars[i]!);
  return out;
};

/** One letter left out — never the first, so the name keeps its initial and is never empty. */
const drop: Slip = (chars, pick) => {
  const inner = lettersIn(chars).slice(1);
  if (inner.length === 0) return null;
  const out = [...chars];
  out.splice(inner[pick(inner.length)]!, 1);
  return out;
};

/** One vowel written as another. */
const vowel: Slip = (chars, pick) => {
  const at = lettersIn(chars).filter((i) => VOWEL_SLIPS[chars[i]!.toLowerCase()]);
  if (at.length === 0) return null;
  const i = at[pick(at.length)]!;
  const options = VOWEL_SLIPS[chars[i]!.toLowerCase()]!;
  const out = [...chars];
  out[i] = caseOf(options[pick(options.length)]!, chars[i]!);
  return out;
};

/** The first letter wrong, in its own case: Justin to Gustin, Kate to Cate. */
const initial: Slip = (chars, pick) => {
  const i = lettersIn(chars)[0]!;
  const options = FIRST_SLIPS[chars[i]!.toLowerCase()];
  if (!options) return null;
  const out = [...chars];
  out[i] = caseOf(options[pick(options.length)]!, chars[i]!);
  return out;
};

const SLIPS: Slip[] = [swap, double, drop, vowel, initial];

/**
 * The name as the substitute writes it (SCHOOL-ROSTER §3.5): one plausible
 * mistake — two letters swapped, one doubled, one dropped, a vowel changed,
 * the first letter wrong — chosen by the seed, so a shot keeps its spelling
 * for its whole flight and the next shot gets it wrong differently.
 *
 * Never the name itself (every slip changes something, and doubling always
 * applies), never empty, and the first letter keeps its case. A name with no
 * letters is misspelled as `DEFAULT_NAME`.
 */
export function misspell(name: string, seed: number): string {
  const chars = [...(LETTER.test(name) ? name : DEFAULT_NAME)];
  let draw = 0;
  const pick = (n: number) => hash(seed, draw++) % n;
  const start = pick(SLIPS.length);
  for (let k = 0; k < SLIPS.length; k++) {
    const out = SLIPS[(start + k) % SLIPS.length]!(chars, pick);
    if (out) return out.join('');
  }
  // Unreachable: `double` applies to any name with a letter.
  return chars.join('') + chars[chars.length - 1]!.toLowerCase();
}
