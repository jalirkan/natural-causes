/**
 * The act's document: the paper a life is handed as it crosses into the next
 * act (DIRECTION-PANEL-2026-09-27: "beating it issues the act's DOCUMENT ...
 * built from real run stats"). The death certificate's siblings, in the same
 * mid-century register (G-038 kept the pamphlet for documents): an office, a
 * title, ruled fields, a stamp.
 *
 * Every value is read off the world at the crossing, or off the name the title
 * asked for; the copy is data in `DOCUMENTS`, one entry per act id, and none of
 * it types a number. An act with no entry issues nothing yet.
 *
 * Node-safe and pure, as `certificate.ts` is: `ActScene.showDocument` draws
 * what this returns and decides nothing about what it says.
 */
import type { ActDef } from './acts';
import { ITEMS, OFFER_PATH_SEPARATOR, isActive } from './items';
import { DEFAULT_NAME, misspell } from '../meta/name';
import { WIDE_FLOOR } from '../scenes/certificate';
import type { World } from '../sim/world';

/** What a document reads: the world at the crossing, nothing it could change. */
export type DocumentWorld = Pick<
  World,
  'seed' | 'kills' | 'level' | 'items' | 'pathLevels' | 'taxStacks' | 'wornBy' | 'inheritance'
>;

/** What the form is filled in with that the world does not hold. */
export interface DocumentForm {
  /** The name given at the title (`src/meta/name.ts`); blank reads as `DEFAULT_NAME`. */
  name: string;
  /** Seconds on the finished act's clock when its boss let go. */
  clock: number;
}

export interface ActDocument {
  kind: string;
  /**
   * In the certificate's small-caps casing (`ActScene.smallCaps`): a capital
   * is set large, the rest capitalised small, so "Report Card" prints as
   * REPORT CARD.
   */
  title: string;
  /** Printed label and typed value, in reading order. */
  fields: [string, string][];
  stamp: string;
  /** The office that issues it, printed over the title as the certificate prints OFFICE OF VITAL STATISTICS. */
  line: string;
}

/** The longest value a form's rule holds on one line (`PAPER_TYPE`). */
export const VALUE_MAX = 40;

/** A table read by threshold: the first row whose floor `n` reaches, else the last. Rows run highest first. */
type Bands = readonly (readonly [number, string])[];

interface DocumentDef<C> {
  kind: string;
  title: string;
  line: string;
  stamp: string;
  /** The document's own copy: its labels, lines and tables. */
  copy: C;
  /** Method syntax on purpose: the registry holds each entry at `DocumentDef<unknown>`. */
  fields(world: DocumentWorld, form: DocumentForm, copy: C): [string, string][];
}

/** Infers an entry's copy, so each entry's `fields` is checked against its own tables. */
const doc = <C>(d: DocumentDef<C>): DocumentDef<C> => d;

/**
 * One document per act id: the only list of them (CONCEPTION-ROSTER §5.3).
 * Decline has none, and is not owed one: its paper is the death certificate
 * (DECLINE-ROSTER §4, G-049), which `certificate.ts` already is. A paper is
 * handed over at a crossing, so the last act in the life hands its paper to
 * nobody: The
 * Office's is seen once Family follows it in `ACTS`, and Family's only once
 * an act follows Family (AUDIT seven, 52's shape).
 */
export const DOCUMENTS = {
  conception: doc({
    kind: 'birth-certificate',
    title: 'Certificate of Live Birth',
    line: 'OFFICE OF VITAL STATISTICS',
    stamp: 'FILED',
    copy: {
      name: 'NAME OF CHILD',
      time: 'TIME OF ARRIVAL',
      rivals: 'RIVALS OUTLASTED',
      inherited: 'INHERITED',
      /** Only a life that crosses without the Egg's roll (a test fixture) reads it. */
      nothing: 'nothing yet',
    },
    fields: (w, f, c) => [
      [c.name, nameOf(f)],
      [c.time, arrival(f.clock)],
      [c.rivals, count(w.kills)],
      [c.inherited, w.inheritance?.name ?? c.nothing],
    ],
  }),

  school: doc({
    kind: 'report-card',
    title: 'Report Card',
    line: 'BOARD OF EDUCATION',
    stamp: 'SEE ME',
    copy: {
      name: 'NAME OF PUPIL',
      participation: 'PARTICIPATION',
      grade: 'GRADE',
      comments: 'COMMENTS',
      /**
       * PLACEHOLDER: the level as a letter. The bots cross School on a level
       * 23–44 build (PLAYTEST-FINDINGS 2026-09-28, and a probe of twelve
       * policies at seeds 1000–1001), so A is the top of that range and D
       * the bottom of it and below. Presence, not calibration: nobody has
       * played it, and a person's level at the link is what moves it.
       */
      grades: [
        [42, 'A'],
        [35, 'B'],
        [28, 'C'],
        [0, 'D'],
      ] as Bands,
      /**
       * PLACEHOLDER: the teacher's comment by the life's kills so far. The
       * same probe crossed School on 2,577–3,003; the bands are written
       * around that and not measured on anyone.
       */
      remarks: [
        [3000, 'Must learn to keep hands to self.'],
        [2000, 'Does not know own strength.'],
        [1000, 'Works well with others.'],
        [0, 'A pleasure to have in class.'],
      ] as Bands,
    },
    fields: (w, f, c) => [
      // The substitute's joke (SCHOOL-ROSTER §3.5), once, in ink.
      [c.name, misspell(nameOf(f), w.seed)],
      [c.participation, count(w.kills)],
      [c.grade, band(c.grades, w.level)],
      [c.comments, band(c.remarks, w.kills)],
    ],
  }),

  adolescence: doc({
    kind: 'yearbook',
    title: 'Yearbook',
    line: 'THE YEARBOOK COMMITTEE',
    stamp: 'SIGNED',
    copy: {
      name: 'NAME',
      likely: 'MOST LIKELY TO',
      activities: 'ACTIVITIES',
      /**
       * Six lines, by the item held at the highest level. A tie goes to the
       * one held longest, so a life that never outgrew Reflex overreacts.
       */
      lines: {
        grudge: 'hold it against you',
        vendetta: 'hold it against you',
        judgement: 'hold it against you',
        hindsight: 'hold it against you',
        chemotaxis: 'be everywhere',
        'group-chat': 'be everywhere',
        midpiece: 'be everywhere',
        capacitation: 'peak later',
        snooze: 'peak later',
        lash: 'overreact',
        jumpiness: 'overreact',
        acrosome: 'overreact',
        tantrum: 'overreact',
        motility: 'never change',
        wake: 'never change',
        rut: 'never change',
        membrane: 'never change',
        'personal-space': 'take up space',
        backhand: 'take up space',
        reach: 'take up space',
        appetite: 'take up space',
        'growth-spurt': 'take up space',
      } as Record<string, string>,
      /** An item nobody has written a line for, or nothing held at all. */
      otherwise: 'peak later',
      /** Clubs listed, at most; fewer when their names overrun the rule. */
      clubs: 4,
      none: 'none',
    },
    fields: (w, f, c) => {
      const top = ranked(w.items)[0];
      return [
        [c.name, nameOf(f)],
        [c.likely, (top && own(c.lines, top.id)) ?? c.otherwise],
        [c.activities, packed(ranked(w.items).map((e) => e.name), c.clubs) || c.none],
      ];
    },
  }),

  college: doc({
    kind: 'diploma',
    title: 'Diploma',
    line: 'OFFICE OF THE REGISTRAR',
    stamp: 'PAID IN PART',
    copy: {
      name: 'NAME OF GRADUATE',
      degree: 'CONFERRED THE DEGREE OF',
      honours: 'WITH HONOURS IN',
      balance: 'BALANCE CARRIED FORWARD',
      /** By the weapon held at the highest level; an evolution is the finished build, so a master's. */
      degrees: {
        lash: 'Bachelor of Reflexes',
        motility: 'Bachelor of Stubbornness',
        acrosome: 'Bachelor of Temper',
        wake: 'Bachelor of Baggage',
        grudge: 'Bachelor of Grudges',
        'group-chat': 'Bachelor of Gossip',
        'personal-space': 'Bachelor of Personal Space',
        backhand: 'Bachelor of Backhands',
        judgement: 'Bachelor of Judgement',
        tantrum: 'Master of Tantrums',
        vendetta: 'Master of Vendettas',
        jumpiness: 'Master of Jumpiness',
        reach: 'Master of Reach',
        hindsight: 'Master of Hindsight',
        rut: 'Master of Ruts',
      } as Record<string, string>,
      /** A weapon nobody has written a degree for, or none held. */
      general: 'Bachelor of General Studies',
      /** No path taken on anything. */
      attendance: 'attendance',
      invoice: 'invoice',
      invoices: 'invoices',
    },
    fields: (w, f, c) => {
      const weapon = ranked(w.items).find((e) => e.kind === 'weapon');
      const path = furthestPath(w.pathLevels);
      const owed = whole(w.taxStacks);
      return [
        [c.name, nameOf(f)],
        [c.degree, (weapon && own(c.degrees, weapon.id)) ?? c.general],
        [c.honours, path ?? c.attendance],
        [c.balance, `${owed} ${owed === 1 ? c.invoice : c.invoices}`],
      ];
    },
  }),

  office: doc({
    kind: 'performance-review',
    title: 'Performance Review',
    line: 'HUMAN RESOURCES',
    stamp: 'MEETS',
    copy: {
      name: 'NAME OF EMPLOYEE',
      title: 'TITLE',
      rating: 'OVERALL RATING',
      growth: 'AREAS FOR GROWTH',
      /**
       * By the weapon held at the highest level: the job the build turned
       * into. An evolution has been promoted, which is the same job with
       * "Head of" in front of it.
       */
      titles: {
        lash: 'Rapid Response',
        motility: 'Compliance',
        acrosome: 'Facilities',
        wake: 'Logistics',
        grudge: 'Grievances',
        'group-chat': 'Internal Communications',
        'personal-space': 'Culture',
        backhand: 'Operations',
        judgement: 'Legal',
        tantrum: 'Head of Facilities',
        vendetta: 'Head of Grievances',
        jumpiness: 'Head of Rapid Response',
        reach: 'Head of Culture',
        hindsight: 'Head of Legal',
        rut: 'Head of Compliance',
      } as Record<string, string>,
      /** A weapon nobody has written a title for, or none held. */
      general: 'General Services',
      /**
       * PLACEHOLDER: the level as a rating. The bots reach The Reorg at
       * level 36–51 (PLAYTEST-FINDINGS 2026-09-28, the five-act life); the
       * bands are written around that and measured on nobody.
       */
      ratings: [
        [50, 'Exceeds expectations'],
        [40, 'Meets expectations'],
        [30, 'Developing'],
        [0, 'Needs improvement'],
      ] as Bands,
      /**
       * PLACEHOLDER: the reviewer's note, by how many paths the build has
       * taken. Whichever it is, it is a criticism.
       */
      growths: [
        [3, 'Spreads self thin.'],
        [1, 'Could show more initiative.'],
        [0, 'Shows little interest in growth.'],
      ] as Bands,
    },
    fields: (w, f, c) => {
      const weapon = ranked(w.items).find((e) => e.kind === 'weapon');
      const taken = [...w.pathLevels.values()].filter((level) => level > 0).length;
      return [
        [c.name, nameOf(f)],
        [c.title, (weapon && own(c.titles, weapon.id)) ?? c.general],
        [c.rating, band(c.ratings, w.level)],
        [c.growth, band(c.growths, taken)],
      ];
    },
  }),

  family: doc({
    kind: 'mortgage-statement',
    title: 'Mortgage Statement',
    line: 'THE LENDER',
    // The act ends on EQUITY: the twelfth instalment is paid (FAMILY-ROSTER §4).
    stamp: 'SETTLED',
    copy: {
      name: 'NAME OF BORROWER',
      term: 'TERM',
      file: 'NOTICES ON FILE',
      remarks: 'REMARKS',
      /**
       * The level as the loan's term: a mortgage longer than the act that took
       * it out. The probe below crossed Family at level 42–56, so for every
       * bot the term runs past the act's twenty-one years.
       */
      year: 'year',
      years: 'years',
      /**
       * The def whose worn stacks are the notices (`World.wornBy`, by def id):
       * the HOA letter, which persists, so every one worn in the act is still
       * on file at the crossing (FAMILY-ROSTER §3.3).
       */
      letter: 'hoa-letter',
      notice: 'notice',
      notices: 'notices',
      /** Nothing worn: the file is empty, and says so in words. */
      none: 'no notices',
      /**
       * PLACEHOLDER: the lender's remark by the life's kills so far, highest
       * first. A probe of the twelve policies over `ALL_ACTS` (seeds
       * 1000–1001, `runOnce`, 18 lives reaching Family) left The Office on
       * 5,327–7,027 kills and crossed Family on 5,698–7,393, with The
       * Mortgage still fighting as the Egg. Presence, not calibration: the
       * bands are written around that range so each is reachable, nobody has
       * played Family, and a person's kills at the link is what moves them.
       */
      standing: [
        [7000, 'Prompt payer.'],
        [6000, 'Account in good standing.'],
        [5000, 'A reminder has been sent.'],
        [0, 'Late fees assessed.'],
      ] as Bands,
    },
    fields: (w, f, c) => {
      const filed = whole(w.wornBy.get(c.letter) ?? 0);
      return [
        [c.name, nameOf(f)],
        // A forty-eight-year mortgage on a twenty-one-year act is the joke.
        [c.term, tally(whole(w.level), c.year, c.years)],
        [c.file, filed > 0 ? tally(filed, c.notice, c.notices) : c.none],
        [c.remarks, band(c.standing, w.kills)],
      ];
    },
  }),
};

/** The registry as the scene reads it: any act id, an entry or nothing. */
const REGISTRY: Record<string, DocumentDef<unknown> | undefined> = DOCUMENTS;

/**
 * The finished act's document, from the world as the crossing left it: null
 * for an act that issues none yet.
 */
export function actDocument(
  world: DocumentWorld,
  name: string,
  finished: Pick<ActDef, 'id'>,
  clock: number,
): ActDocument | null {
  const def = own(REGISTRY, finished.id);
  if (!def) return null;
  return {
    kind: def.kind,
    title: def.title,
    fields: def.fields(world, { name, clock }, def.copy),
    stamp: def.stamp,
    line: def.line,
  };
}

// --- reading the world --------------------------------------------------

/** A key's own entry: an act or item id of "toString" is not a document. */
function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function nameOf(f: DocumentForm): string {
  return f.name.trim() || DEFAULT_NAME;
}

/** A counter as typed on a form: a whole number, never negative, never NaN. */
function count(n: number): string {
  return String(whole(n));
}

/** `count`'s number, for a value typed with a noun after it. */
function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** A whole number and its noun, singular for one: "1 notice", "3 notices". */
function tally(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The act clock as a time of day, mm:ss: a birth is logged by the clock on the wall. */
function arrival(seconds: number): string {
  const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function band(rows: Bands, n: number): string {
  for (const [floor, word] of rows) if (n >= floor) return word;
  return rows[rows.length - 1]![1];
}

/**
 * The items held, highest level first; a tie keeps the order they were first
 * taken in (the map's). An id the registry no longer knows is skipped.
 */
function ranked(items: ReadonlyMap<string, number>): { id: string; name: string; kind: string }[] {
  return [...items.entries()]
    .filter(([id, level]) => own(ITEMS, id) !== undefined && level > 0)
    .map(([id, level], order) => ({ id, level, order, name: ITEMS[id]!.name, kind: ITEMS[id]!.kind }))
    .sort((a, b) => b.level - a.level || a.order - b.order);
}

/** Up to `most` names, joined as a list, skipping any that would run the rule past `VALUE_MAX`. */
function packed(names: string[], most: number): string {
  const kept: string[] = [];
  for (const n of names) {
    if (kept.length >= most) break;
    if ([...kept, n].join(', ').length <= VALUE_MAX) kept.push(n);
  }
  return kept.join(', ');
}

/** The path taken furthest, by name; a tie goes to the one taken first. Null when none is. */
function furthestPath(paths: ReadonlyMap<string, number>): string | null {
  let best: { name: string; level: number } | null = null;
  for (const [offer, level] of paths) {
    const [itemId, pathId] = offer.split(OFFER_PATH_SEPARATOR);
    const item = itemId ? own(ITEMS, itemId) : undefined;
    const path = item && isActive(item) ? item.paths?.find((p) => p.id === pathId) : undefined;
    if (!path || !(level > 0)) continue;
    if (!best || level > best.level) best = { name: path.name, level };
  }
  return best?.name ?? null;
}

// --- the paper's type ---------------------------------------------------

/** The paper on the 1280×720 canvas: narrower than the certificate's, since a document holds four fields and no receipt. */
export const PAPER_SHEET = { width: 880, margin: 48 } as const;

/**
 * The paper's type on a canvas shown 1280 CSS px across, in game px. A value
 * of `VALUE_MAX` characters at `value` fits the sheet's rule on one line.
 */
export const PAPER_TYPE = {
  /** The issuing office. */
  line: 13,
  /** A field's printed label. */
  label: 14,
  /** A value typed on its rule. */
  value: 30,
  /** The title's capitals; the rest is set at 0.78 of it. */
  title: 32,
  /** "any key to continue", on the scrim under the sheet. */
  hint: 18,
} as const;

export type PaperType = Record<keyof typeof PAPER_TYPE, number>;

/**
 * The paper's type for a canvas shown at `cssPerGamePx` CSS px per game px,
 * raised to the certificate's floors (`WIDE_FLOOR`) where FIT shows it small —
 * a landscape phone at 0.54 — and never set smaller than at 1280.
 */
export function paperType(cssPerGamePx: number): PaperType {
  const r = cssPerGamePx > 0 ? Math.min(1, cssPerGamePx) : 1;
  const type = { ...PAPER_TYPE } as PaperType;
  for (const k of Object.keys(type) as (keyof PaperType)[]) {
    const floor = k === 'value' || k === 'title' ? WIDE_FLOOR.value : WIDE_FLOOR.print;
    type[k] = Math.max(PAPER_TYPE[k], Math.ceil(floor / r - 1e-9));
  }
  return type;
}

/**
 * The title's capitals on an upright phone's canvas (`NARROW_WIDTH`): the
 * certificate's 50 is sized for "Certificate of Death", and the birth
 * certificate's title is five letters longer than the 600px column holds at it.
 */
export const PAPER_NARROW_TITLE = 40;
