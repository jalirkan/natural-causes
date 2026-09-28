import { describe, expect, it } from 'vitest';
import { ACTS, ADOLESCENCE, COLLEGE, CONCEPTION, SCHOOL } from '../acts';
import {
  DOCUMENTS,
  PAPER_NARROW_TITLE,
  PAPER_SHEET,
  PAPER_TYPE,
  VALUE_MAX,
  actDocument,
  paperType,
  type ActDocument,
  type DocumentWorld,
} from '../documents';
import { INHERITANCES } from '../inheritances';
import { ITEM_IDS, ITEMS, isActive, offerIdFor } from '../items';
import { DEFAULT_NAME, NAME_MAX, misspell } from '../../meta/name';
import { NARROW_WIDTH, WIDE_FLOOR } from '../../scenes/certificate';
import { World } from '../../sim/world';

/**
 * The act's document at the crossing: one per act id, every value off the
 * world. The expectations are read off the record's own tables where they
 * are placeholders, so moving a band in `documents.ts` moves the test.
 */

function world(over: Partial<DocumentWorld> = {}): DocumentWorld {
  return {
    seed: 7,
    kills: 0,
    level: 1,
    items: new Map([['lash', 1]]),
    pathLevels: new Map(),
    taxStacks: 0,
    inheritance: null,
    ...over,
  };
}

const value = (d: ActDocument | null, label: string): string => {
  const f = d!.fields.find(([l]) => l === label);
  expect(f, `no field "${label}" on the ${d!.kind}`).toBeDefined();
  return f![1];
};

function expectClean(d: ActDocument | null): void {
  expect(d).not.toBeNull();
  for (const s of [d!.title, d!.stamp, d!.line]) expect(s.trim()).not.toBe('');
  for (const [label, v] of d!.fields) {
    expect(label.trim(), `${d!.kind}: a field with no label`).not.toBe('');
    expect(v.trim(), `${d!.kind}: "${label}" is blank`).not.toBe('');
    expect(v, `${d!.kind}: "${label}" reads ${v}`).not.toMatch(/\b(NaN|undefined|null|Infinity)\b/);
    expect(v.length, `${d!.kind}: "${label}" is ${v.length} characters: ${v}`).toBeLessThanOrEqual(VALUE_MAX);
  }
}

describe('actDocument', () => {
  it('issues each act its own paper', () => {
    const kinds = [
      [CONCEPTION, 'birth-certificate', 'CERTIFICATE OF LIVE BIRTH', 'FILED'],
      [SCHOOL, 'report-card', 'REPORT CARD', 'SEE ME'],
      [ADOLESCENCE, 'yearbook', 'YEARBOOK', 'SIGNED'],
      [COLLEGE, 'diploma', 'DIPLOMA', 'PAID IN PART'],
    ] as const;
    for (const [act, kind, title, stamp] of kinds) {
      const d = actDocument(world(), 'Justin', act, 300);
      expect(d?.kind).toBe(kind);
      // Printed in small caps, so the record keeps the casing that says which letters are large.
      expect(d?.title.toUpperCase()).toBe(title);
      expect(d?.stamp).toBe(stamp);
      expectClean(d);
    }
  });

  it('issues nothing for an act it has no paper for', () => {
    expect(actDocument(world(), 'Justin', { id: 'family' }, 300)).toBeNull();
    expect(actDocument(world(), 'Justin', { id: '' }, 300)).toBeNull();
    expect(actDocument(world(), 'Justin', { id: 'toString' }, 300)).toBeNull();
  });

  it('has an entry for every act in the life, and only for acts that exist', () => {
    const ids = ACTS.map((a) => a.id);
    for (const id of Object.keys(DOCUMENTS)) expect(ids).toContain(id);
    for (const act of ACTS) expect(actDocument(world(), 'Justin', act, 0), act.id).not.toBeNull();
  });

  it('prints Nobody for a player who gave no name', () => {
    const d = actDocument(world(), '  ', CONCEPTION, 0);
    expect(value(d, 'NAME OF CHILD')).toBe(DEFAULT_NAME);
  });
});

describe('the birth certificate', () => {
  it('logs the act clock as the time of arrival, the kills as the rivals, and what the Egg dealt', () => {
    const d = actDocument(world({ kills: 2352, inheritance: INHERITANCES['precocity']! }), 'Justin', CONCEPTION, 305.9);
    expect(d!.fields).toEqual([
      ['NAME OF CHILD', 'Justin'],
      ['TIME OF ARRIVAL', '05:05'],
      ['RIVALS OUTLASTED', '2352'],
      ['INHERITED', 'Precocity'],
    ]);
  });

  it('says nothing yet when nothing was dealt', () => {
    expect(value(actDocument(world(), 'Justin', CONCEPTION, 0), 'INHERITED')).toBe('nothing yet');
    expect(value(actDocument(world(), 'Justin', CONCEPTION, 0), 'TIME OF ARRIVAL')).toBe('00:00');
    expect(value(actDocument(world(), 'Justin', CONCEPTION, Number.NaN), 'TIME OF ARRIVAL')).toBe('00:00');
  });

  it('reads a real crossing: the kills, the clock and the inheritance the world holds', () => {
    const w = new World({ acts: ACTS, seed: 11 });
    for (let i = 0; i < 600; i++) {
      if (w.offers) w.choose(w.offers[0]!);
      else w.step(1 / 60, { moveX: 0, moveY: 0 });
      w.hp = w.maxHp;
    }
    // As the dev panel skips: through the life clock, so the act clock moves with it.
    w.time += w.act.durationSeconds - w.actTime;
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    w.boss!.hp = 0;
    w.boss!.phase = 'absorbing';
    w.boss!.timer = 0;
    w.step(1 / 60, { moveX: 0, moveY: 0 });
    expect(w.actIndex).toBe(1);
    // ActScene's clock: the life time the new act began at, less the finished act's start (zero).
    const d = actDocument(w, 'Justin', CONCEPTION, w.time - w.actTime);
    expectClean(d);
    expect(value(d, 'RIVALS OUTLASTED')).toBe(String(w.kills));
    expect(value(d, 'INHERITED')).toBe(w.inheritance!.name);
    expect(value(d, 'TIME OF ARRIVAL')).toMatch(/^05:0\d$/);
  });
});

describe('the report card', () => {
  const school = DOCUMENTS.school.copy;

  it('misspells the name once, as the substitute does, and the same way for the same life', () => {
    const d = actDocument(world({ seed: 1234 }), 'Justin', SCHOOL, 300);
    const name = value(d, 'NAME OF PUPIL');
    expect(name).not.toBe('Justin');
    expect(name).toBe(misspell('Justin', 1234));
    expect(value(actDocument(world({ seed: 1234 }), 'Justin', SCHOOL, 300), 'NAME OF PUPIL')).toBe(name);
  });

  it('grades the level from D up to A, and writes the kills as participation', () => {
    const grade = (level: number) => value(actDocument(world({ level }), 'Justin', SCHOOL, 0), 'GRADE');
    expect(grade(1)).toBe('D');
    expect(grade(999)).toBe('A');
    const letters = school.grades.map(([floor]) => grade(floor));
    expect(letters).toEqual(['A', 'B', 'C', 'D']);
    // Below each floor is the next letter down.
    for (let i = 0; i < school.grades.length - 1; i++) expect(grade(school.grades[i]![0] - 1)).toBe(letters[i + 1]);
    expect(value(actDocument(world({ kills: 2910 }), 'Justin', SCHOOL, 0), 'PARTICIPATION')).toBe('2910');
  });

  it('comments by the kills, one line a band', () => {
    const comment = (kills: number) => value(actDocument(world({ kills }), 'Justin', SCHOOL, 0), 'COMMENTS');
    const said = school.remarks.map(([floor]) => comment(floor));
    expect(new Set(said).size).toBe(school.remarks.length);
    expect(comment(0)).toBe(school.remarks[school.remarks.length - 1]![1]);
  });
});

describe('the yearbook', () => {
  const book = DOCUMENTS.adolescence.copy;
  const likely = (items: [string, number][]) =>
    value(actDocument(world({ items: new Map(items) }), 'Justin', ADOLESCENCE, 0), 'MOST LIKELY TO');

  it('says what the life is most likely to do by the item held highest', () => {
    expect(likely([['lash', 2], ['grudge', 5]])).toBe('hold it against you');
    expect(likely([['lash', 2], ['chemotaxis', 6], ['grudge', 5]])).toBe('be everywhere');
    expect(likely([['lash', 3], ['capacitation', 4]])).toBe('peak later');
    // A tie goes to the one held longest.
    expect(likely([['lash', 4], ['grudge', 4]])).toBe('overreact');
    expect(likely([['grudge', 4], ['lash', 4]])).toBe('hold it against you');
  });

  it('falls back on one line for nothing held, or an item nobody wrote one for', () => {
    expect(likely([])).toBe(book.otherwise);
    expect(likely([['no-such-item', 9]])).toBe(book.otherwise);
    expect(value(actDocument(world({ items: new Map() }), 'Justin', ADOLESCENCE, 0), 'ACTIVITIES')).toBe(book.none);
  });

  it('has six lines, each for an item that exists', () => {
    expect(new Set(Object.values(book.lines)).size).toBe(6);
    for (const id of Object.keys(book.lines)) expect(ITEMS[id], id).toBeDefined();
    expect(Object.values(book.lines)).toContain(book.otherwise);
  });

  it('lists the clubs by name, highest first, at most four and never past the rule', () => {
    const acts = (items: [string, number][]) =>
      value(actDocument(world({ items: new Map(items) }), 'Justin', ADOLESCENCE, 0), 'ACTIVITIES');
    expect(acts([['lash', 1], ['grudge', 3], ['membrane', 2]])).toBe('Grudge, Thick Skin, Reflex');
    const all = ITEM_IDS.map((id, i): [string, number] => [id, i + 1]);
    const listed = acts(all).split(', ');
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.length).toBeLessThanOrEqual(book.clubs);
    for (const n of listed) expect(Object.values(ITEMS).map((d) => d.name)).toContain(n);
  });
});

describe('the diploma', () => {
  const dip = DOCUMENTS.college.copy;
  const diploma = (over: Partial<DocumentWorld>) => actDocument(world(over), 'Justin', COLLEGE, 0);

  it('carries the tuition invoices forward as the balance', () => {
    expect(value(diploma({ taxStacks: 0 }), 'BALANCE CARRIED FORWARD')).toBe(`0 ${dip.invoices}`);
    expect(value(diploma({ taxStacks: 1 }), 'BALANCE CARRIED FORWARD')).toBe(`1 ${dip.invoice}`);
    expect(value(diploma({ taxStacks: 7 }), 'BALANCE CARRIED FORWARD')).toBe(`7 ${dip.invoices}`);
  });

  it('confers the degree of the weapon held highest, never a passive or a control item', () => {
    const items = new Map([['lash', 2], ['grudge', 5], ['membrane', 8], ['chemotaxis', 7]]);
    expect(value(diploma({ items }), 'CONFERRED THE DEGREE OF')).toBe('Bachelor of Grudges');
    expect(value(diploma({ items: new Map([['membrane', 3]]) }), 'CONFERRED THE DEGREE OF')).toBe(dip.general);
    for (const id of Object.keys(dip.degrees)) expect(ITEMS[id]?.kind, id).toBe('weapon');
  });

  it('honours the path taken furthest, or attendance', () => {
    expect(value(diploma({}), 'WITH HONOURS IN')).toBe(dip.attendance);
    const grudge = ITEMS['grudge']!;
    if (!isActive(grudge) || !grudge.paths) throw new Error('Grudge has no paths');
    const [a, b] = grudge.paths;
    const pathLevels = new Map([
      [offerIdFor(grudge, a!), 1],
      [offerIdFor(grudge, b!), 3],
    ]);
    expect(value(diploma({ pathLevels }), 'WITH HONOURS IN')).toBe(b!.name);
    expect(value(diploma({ pathLevels: new Map([['grudge/no-such-path', 9]]) }), 'WITH HONOURS IN')).toBe(dip.attendance);
  });
});

describe('every document fits its form', () => {
  it('no value is blank, NaN or over the rule, for any item held highest, any path, any name', () => {
    const names = ['', 'A', 'Justin', 'X'.repeat(NAME_MAX), 'Mary-Jane O’Neil'.slice(0, NAME_MAX)];
    const paths = Object.values(ITEMS).flatMap((d) => (isActive(d) ? (d.paths ?? []).map((p) => offerIdFor(d, p)) : []));
    const worlds: DocumentWorld[] = [
      world(),
      world({ items: new Map(), kills: -3, level: 0, taxStacks: -1 }),
      world({ kills: 99999999, level: 999, taxStacks: 999, inheritance: INHERITANCES['constitution']! }),
      // Every item held, each highest in turn, every path taken.
      ...ITEM_IDS.map((top) =>
        world({
          items: new Map([[top, 99], ...ITEM_IDS.filter((id) => id !== top).map((id): [string, number] => [id, 8])]),
          pathLevels: new Map(paths.map((p) => [p, 3])),
          inheritance: INHERITANCES['sensitivity']!,
        }),
      ),
    ];
    for (const act of ACTS)
      for (const w of worlds) for (const name of names) for (const clock of [0, 305.2, 5999]) expectClean(actDocument(w, name, act, clock));
  });
});

describe('the paper', () => {
  // FIT on an 844×390 landscape phone: the 16:9 canvas at the screen's height.
  const landscape = (390 * 16) / 9 / 1280;
  const column = PAPER_SHEET.width - 2 * PAPER_SHEET.margin;

  it('is its 1280 size on a canvas shown 1280 CSS px across or more', () => {
    expect(paperType(1)).toEqual(PAPER_TYPE);
    expect(paperType(1.5)).toEqual(PAPER_TYPE);
  });

  it('reads on an 844×390 phone held sideways, and a full rule still fits on one line', () => {
    const type = paperType(landscape);
    for (const k of ['line', 'label', 'hint'] as const) expect(type[k] * landscape).toBeGreaterThanOrEqual(WIDE_FLOOR.print);
    for (const k of ['value', 'title'] as const) expect(type[k] * landscape).toBeGreaterThanOrEqual(WIDE_FLOOR.value);
    for (const t of [PAPER_TYPE, type]) expect(0.6 * t.value * VALUE_MAX + 6).toBeLessThanOrEqual(column);
  });

  it('sets every title inside the upright phone column', () => {
    // As smallCaps sets it: capitals at the size, the rest at 0.78, 3px apart.
    const room = NARROW_WIDTH - 2 * 20 - 2 * 40;
    for (const def of Object.values(DOCUMENTS)) {
      const width = [...def.title].reduce(
        (sum, ch) => sum + 0.6 * (ch !== ch.toLowerCase() ? PAPER_NARROW_TITLE : Math.round(PAPER_NARROW_TITLE * 0.78)) + 3,
        0,
      );
      expect(width, def.title).toBeLessThanOrEqual(room);
    }
  });
});
