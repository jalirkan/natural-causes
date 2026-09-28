/**
 * The item registry. ONE record, deliberately (CONCEPTION-ROSTER §5.3).
 *
 * Passives have no cooldown, damage or projectile speed and do not fit the
 * weapon shape. The obvious move is a second `PASSIVES` record — and that is
 * the trap: `content.test.ts` enforces `enables` and `tradesAway` by iterating
 * a collection, so a sibling collection is a content rule that silently stops
 * applying to a third of the act's items. That is precisely the failure
 * mechanism 5 exists to prevent. Evolutions live here too, for the same
 * reason: an `EVOLUTIONS` table beside this one is the same trap again.
 *
 * So there is one registry, discriminated by `kind`, and the test iterates it.
 * Adding a category cannot drop the rule, because there is nowhere else to put
 * an item.
 *
 * G-038 retires two things this header used to say. G-014 — "every item
 * subtracts" — is gone: upgrades gain, and a cost is a flavour an item MAY
 * have (Late Bloomer's is its timing). The thirty-item budget is gone too: it
 * was sized for items that reset per act, and items now persist across the
 * life and evolve. `enables` and `tradesAway` stay mandatory; `tradesAway` may
 * now name a shape or timing limit rather than a stat penalty.
 */

export type ItemKind = 'weapon' | 'control' | 'passive';

/**
 * The offer-card glyph vocabulary. One per item today; categories if it grows.
 * Every one has authored art in the icon atlas (tools/art/svg/conception/icon-*),
 * or its item's `iconPending` says the drawing is on its way.
 */
export type ItemIcon =
  | 'strike'
  | 'pierce'
  | 'burst'
  | 'trail'
  | 'pull'
  | 'speed'
  | 'guard'
  | 'clock'
  | 'orbit'
  | 'chain'
  | 'magnet'
  | 'grow'
  | 'slow'
  // The Office's (G-048): Calendar block's page, a day struck through.
  | 'block'
  | 'aura'
  | 'sweep'
  | 'bolt'
  | 'vendetta'
  | 'jump'
  | 'reach'
  | 'hindsight'
  | 'rut'
  // College: the Highlighter's stroke.
  | 'highlight'
  // Born in Family (G-050): the Strongly Worded Letter.
  | 'letter'
  // Born in Decline (G-051): the Nap's armchair, empty.
  | 'nap'
  // G-054's new control: Cry's teardrop, held at the top of its ring.
  | 'cry';

interface ItemBase {
  id: string;
  name: string;
  kind: ItemKind;
  /**
   * What build this makes possible. Required, over 30 characters.
   *
   * `enables` and `tradesAway` are the DESIGN record — they exist to force the
   * mechanism-5 argument and they are written for the roster document. They
   * are not offer-screen copy, and the offer screen tried to use them by
   * truncating at 78 characters, which produced sentences that stopped
   * mid-clause. `blurb` and the level texts are the player-facing copy.
   */
  enables: string;
  /** What it does not do — a stat, a shape or a timing. Over 30 characters. */
  tradesAway: string;
  /**
   * Which glyph the offer card wears. A semantic tag, not an image — the
   * renderer owns the drawing, so this file stays Node-safe.
   */
  icon: ItemIcon;
  /**
   * Set while the icon has no frame in the atlas: one sentence saying what
   * retires it. The renderer draws a labelled placeholder meanwhile, and a
   * content test requires either the frame or this sentence.
   */
  iconPending?: string;
  /**
   * Offer-card copy: ONE line, under 64 characters, carrying the mechanic and
   * the joke together. A gain/cost pair was tried first and read as homework
   * at decision speed — a survivors run decides in two seconds, and the
   * design argument already lives in `enables`/`tradesAway`.
   */
  blurb: string;
  maxLevel: number;
  /**
   * The act whose arrival puts this item in the pool, by act id. Absent means
   * the pool has had it since conception. An item born in a later act is
   * offered from that act on (ALL_ACTS order) for the rest of the life, and
   * never before it: nobody is taller at conception.
   */
  from?: string;
}

/**
 * What reaching a level ADDS, on top of the generic per-level damage and
 * cooldown scaling. Every field is cumulative across the levels owned:
 * counts sum, multipliers multiply, `echo` is on once any level grants it.
 * The sim reads these generically; it has no per-item level logic.
 */
export interface LevelBonus {
  /**
   * Extra shots or objects. Seeking: distinct next-nearest targets. Line: a
   * backward shot, then ±15° pairs. Orbit: more orbiters.
   */
  projectiles?: number;
  /** Extra enemies a shot passes through. */
  pierce?: number;
  /** Multiplier on radius: burst, trail, pull, shot size, orbit distance. */
  area?: number;
  /**
   * Multiplier on how long a trail or attractor lasts, and a burst's puddle
   * (Spilt Milk, G-054). On a `nap` it is how long the player sleeps, and
   * below 1 is the upgrade: a nap that ends sooner heals the same amount
   * faster (Power Nap). On a `cry` it is how long its slow holds (Longer),
   * never how long the ring takes to spread.
   */
  duration?: number;
  /** A burst repeats once, 0.25s later, wherever the player is then. */
  echo?: boolean;
  /** On hit, a seeking shot jumps to this many further nearby enemies. */
  chain?: number;
  /**
   * Multiplier on damage per hit, on top of the generic per-level scaling.
   * A `nap` hurts nothing, so on a nap it multiplies the heal instead
   * (`nap.heal`, Deep Sleep), and the generic scaling does not apply to it.
   */
  damage?: number;
  /** Multiplier on the cooldown (orbit and aura: the per-enemy re-hit). Below 1 is sooner. */
  cooldown?: number;
  /**
   * Multiplier on projectile speed; for `orbit`, on how fast the orbiters go round.
   * A `strike`'s delay divides by it (`strikeDelayAt`): the Letter's Registered arrives sooner.
   */
  speed?: number;
  /** Extra pixels a hit pushes a non-boss enemy away from the player. Adds to `knockback`. */
  knockback?: number;
  /**
   * College (the Highlighter): multiplier on a marking weapon's
   * `marks.multiplier` — how much more a marked enemy takes from everything.
   * Multiplies the multiplier itself (×1.5 with a `mark` of 1.1 is ×1.65),
   * like every multiplier here. How long the mark lasts is `duration`'s, as a
   * trail's is. Ignored by a weapon with no `marks`.
   */
  mark?: number;
}

export interface ItemLevel extends LevelBonus {
  /** The offer-card line for REACHING this level. Under 64 characters. */
  text: string;
}

/**
 * A branch of a weapon (G-043): a named direction its owner can push it in,
 * offered as its own card ("Mobile · Lullaby") once the weapon has opened
 * (`PATH_OPENS_AT`), levelled separately from the weapon, and read into the
 * same `LevelBonus` total as the weapon's own levels. Every field is
 * cumulative like a weapon's levels. A path has no `enables`/`tradesAway`:
 * the weapon's stand for it; what a path says is in its name and its lines.
 */
export interface ItemPath {
  /** Unique within the weapon; the offer id is `${weapon.id}/${path.id}`. */
  id: string;
  /** The life name, in the weapon's register: what this direction is called. */
  name: string;
  /** ONE line, under 64 characters: what pushing this way does. */
  blurb: string;
  maxLevel: number;
  /** Index = level - 1; length = maxLevel. */
  levels: ItemLevel[];
}

/** Separates weapon id and path id in an offer id. Neither side may contain it. */
export const OFFER_PATH_SEPARATOR = '/';

/**
 * PLACEHOLDER: the weapon level at which its paths join the offer pool. One
 * would offer a direction before the weapon has shown what it does; a person
 * playing at the link moves it.
 */
export const PATH_OPENS_AT = 2;

/** The item and, for a path offer (`weapon/path`), the path an offer id names. */
export function parseOfferId(id: string): { item: ItemDef; path?: ItemPath } {
  const at = id.indexOf(OFFER_PATH_SEPARATOR);
  if (at < 0) return { item: itemDef(id) };
  const item = itemDef(id.slice(0, at));
  if (!isActive(item)) throw new Error(`"${id}": paths belong to active items only`);
  const path = item.paths?.find((p) => p.id === id.slice(at + 1));
  if (!path) throw new Error(`Unknown path "${id}"`);
  return { item, path };
}

export function offerIdFor(item: Pick<ItemBase, 'id'>, path?: Pick<ItemPath, 'id'>): string {
  return path ? `${item.id}${OFFER_PATH_SEPARATOR}${path.id}` : item.id;
}

/** Fires something. `control` fires something that does no damage. */
export interface ActiveItem extends ItemBase {
  kind: 'weapon' | 'control';
  /**
   * Seconds between activations at level 1. For `orbit`, which never
   * activates, it is how often one orbiter may hit the same enemy.
   */
  cooldown: number;
  /** Damage per hit at level 1. Zero for control items. */
  damage: number;
  /**
   * How the effect is delivered. The sim switches on this. `aura` never
   * activates, like `orbit`: a ring of `radius` around the player hurts what
   * stands in it, each enemy once per cooldown. `sweep` swings an arc of `arc`
   * radians and `range` reach along the facing on its cooldown. `strike` picks
   * a random enemy within `range` (the nearest, with `strikeNearest`) and,
   * after a telegraph, lands a one-shot area of `radius` where it was (G-044).
   * `nap` never fires either: it waits for health to fall under its
   * `nap.threshold` and then stops the player (Decline, G-051; world.ts `nap`).
   * `cry` (G-054) spreads a ring from where the player stands to `radius`
   * over `range` seconds, on its cooldown; everything its edge crosses is
   * shoved `knockback` px outward and slowed to `slow` for `slowSeconds`,
   * once per cry (world.ts `updateCries`, `World.cries`).
   */
  mode:
    | 'seeking'
    | 'line'
    | 'burst'
    | 'trail'
    | 'attractor'
    | 'orbit'
    | 'field'
    | 'aura'
    | 'sweep'
    | 'strike'
    | 'nap'
    | 'cry';
  /**
   * Pixels. Meaning depends on mode: travel range, burst radius, pull radius,
   * orbit distance, a sweep's reach, a strike's targeting range. Seconds for
   * `trail`, `field`, `nap` (how long the player sleeps) and `cry` (how long
   * its ring takes to reach `radius`). Unused by `aura`, whose ring is `radius`.
   */
  range: number;
  /** Pixels per second. For `orbit`, the orbiters' speed along the circle. */
  projectileSpeed: number;
  radius: number;
  pierce: number;
  /** Index = level - 1; length = maxLevel. What each level adds. */
  levels: ItemLevel[];
  /**
   * G-043: the directions this weapon can be pushed in, each its own card
   * from `PATH_OPENS_AT`. Absent means the weapon only levels. The sim reads
   * a path's levels into the same bonus total as the weapon's own.
   */
  paths?: ItemPath[];
  /**
   * Pixels a hit pushes a non-boss enemy away from the player. On a `cry`,
   * how far its edge shoves what it crosses, away from where it started.
   */
  knockback?: number;
  /**
   * `sweep` only: the arc's full width, in radians, centred on the direction
   * it swings. Level bonuses do not widen it; `area` lengthens its reach.
   */
  arc?: number;
  /**
   * `field`: the attractor's area with a hold instead of a pull. Inside it
   * enemies, every projectile and the player move at this fraction of their
   * speed; overlapping fields take the slowest, they do not multiply. On a
   * `trail` (Baggage, G-046's Rut) each footprint holds the same way as it
   * hurts. On a `cry` (G-054) what its edge crosses moves at this fraction
   * for `slowSeconds`, by the same rule: the slowest hold on it wins.
   */
  slow?: number;
  /**
   * `cry` only (G-054): seconds the ring's `slow` stays on what it crossed,
   * wherever the shove put it. `duration` (a level's, or the Longer path's)
   * multiplies it.
   */
  slowSeconds?: number;
  /**
   * `burst` only (G-054, Spilt Milk and Tantrum): every burst, an echo's
   * included, also leaves a puddle where it went off: `radius` times the
   * burst's radius, lasting `seconds` (times `duration`), hurting nothing,
   * and holding what stands in it at `slow` exactly as Baggage's footprints
   * and Snooze's field hold (world.ts `slowAt`: the slowest area wins, so
   * two puddles are one). It never holds the player (`AreaState.owner`).
   */
  puddle?: { radius: number; seconds: number; slow: number };
  /**
   * `field` only: the field is a hold on `World.holds` instead of an area —
   * the meeting's edge (OFFICE-ROSTER §3.4) turned inside out, placed by the
   * player (Calendar block). Its edge walls the crowd both ways, as the
   * meeting's does, and never the player; `slow` still applies inside it, and
   * 1 is none. `range` is its seconds and `radius` its size, as a field's.
   */
  wall?: boolean;
  /**
   * `strike` only: seconds from the pick to the landing. Absent means
   * `STRIKE_DELAY` (world.ts). Zero is no telegraph: the bolt lands on the
   * step it is fired (Judgement, G-046's Hindsight). Either way it is
   * divided by the `speed` bonus (`strikeDelayAt`).
   */
  strikeDelay?: number;
  /**
   * `strike` only: mark the nearest enemies in range, nearest first, instead
   * of picking at random; no dice are drawn (the Letter, G-050). The mark is
   * where the target stood when it was picked, as every strike's is.
   */
  strikeNearest?: boolean;
  /**
   * `strike` only: what the card calls one landing, and more than one
   * (item-text.ts `strikeNoun`): the Letter's `letter`/`letters` and Tattle's
   * `tattle`/`tattles`, where the card would otherwise print `bolt`/`bolts`
   * (AUDIT 104), as Judgement's does. Words on the card only; the sim never
   * reads it.
   */
  noun?: { one: string; many: string };
  /**
   * Present on an evolution. It is never in the normal offer pool: when
   * `weapon` is at its max level and `with` is owned, the next level-up is
   * this one card, and taking it replaces `weapon`.
   */
  evolvesFrom?: { weapon: string; with: string };
  /**
   * College (the Highlighter): a shot from this weapon MARKS the enemy (or
   * the boss) it lands on. For `seconds` after the hit, everything that
   * damages it deals `multiplier` times as much — every shot, orbiter, area,
   * sweep, strike and aura, and this weapon's own next stroke. A second mark
   * on a marked enemy restarts the clock and does not multiply again.
   * `duration` (a level's or a path's) lengthens `seconds`; `mark` multiplies
   * `multiplier`. Read at the hit (world.ts `markFrom`, paid in `damageEnemy`
   * and, for the boss, `bossTakes`). `seeking` only: other modes ignore it.
   */
  marks?: { seconds: number; multiplier: number };
  /**
   * Decline (the Nap, G-051): `nap` mode only. When health is under
   * `threshold` of the maximum and the item is off its cooldown, the player
   * falls asleep for `range` seconds (times `duration`): they cannot move,
   * no contact hurts them (a hostile shot still does), and `heal` of the
   * maximum (times the `damage` bonus) comes back, evenly, over the window.
   * The clock keeps running. Read by world.ts `nap`; no dice.
   */
  nap?: { threshold: number; heal: number };
}

/** Changes the player rather than the field. Every multiplier is per level. */
export interface PassiveItem extends ItemBase {
  kind: 'passive';
  /** Multiplier on movement speed, per level, applied multiplicatively. */
  speedMultiplier: number;
  /** Multiplier on maximum health. */
  healthMultiplier: number;
  /** Multiplier on contact damage taken. */
  damageTakenMultiplier: number;
  /** Multiplier on every active item's cooldown. Below 1 is faster. */
  cooldownMultiplier: number;
  /** Multiplier on the radius at which gems come to the player. */
  pickupMultiplier: number;
  /**
   * Multiplier on every active item's reach: a shot's range, a burst's,
   * pull's or field's radius, an orbit's distance. A trail has none; it is
   * laid under the player.
   */
  reachMultiplier: number;
  /**
   * Multiplier on the player's collision radius (World.playerRadius): contact,
   * shots, rings, piles and pickup all read it. The one stat a passive may
   * raise as a cost, because it is a shape (Growth Spurt's).
   */
  sizeMultiplier: number;
  /**
   * Damage multiplier at the START of the act, ramping to `rampTo` by the end
   * of it. 1 and 1 means no ramp.
   */
  damageMultiplier: number;
  rampTo: number;
}

export type ItemDef = ActiveItem | PassiveItem;

/** The same bonus on every level from `from` to `to` inclusive. */
function each(from: number, to: number, bonus: LevelBonus): (level: number) => LevelBonus {
  return (level) => (level >= from && level <= to ? bonus : {});
}

/**
 * Builds a `levels` table from texts and per-level bonuses, so a table reads
 * as eight lines of copy with the mechanics beside them. Pure data at import.
 */
function table(
  texts: string[],
  bonuses: Record<number, LevelBonus> = {},
  every?: (level: number) => LevelBonus,
): ItemLevel[] {
  return texts.map((text, i) => {
    const level = i + 1;
    const a = every ? every(level) : {};
    const b = bonuses[level] ?? {};
    const out: ItemLevel = { text, ...a, ...b };
    // A level with both a per-level and a specific area multiplies them.
    if (a.area !== undefined && b.area !== undefined) out.area = a.area * b.area;
    return out;
  });
}

/*
 * PLACEHOLDER NUMBERS (Conception's `provisional` sentence names them): every
 * level table below — which level adds what, and by how much — was written to
 * make the shape playable, not measured. A person playing at the link moves
 * them.
 */
export const ITEMS: Record<string, ItemDef> = {
  // --- 4.1 Weapons ------------------------------------------------------
  lash: {
    id: 'lash',
    name: 'Pointing',
    kind: 'weapon',
    mode: 'seeking',
    cooldown: 0.55,
    damage: 2,
    range: 420,
    projectileSpeed: 420,
    radius: 7,
    pierce: 1,
    maxLevel: 8,
    icon: 'strike',
    blurb: 'Points at whatever is nearest. It got you this far.',
    levels: table(
      [
        'Points at whatever is nearest. It got you this far.',
        'Points harder. It has had practice.',
        'A second finger, at the next-nearest thing.',
        'Points straight through one thing at another.',
        'A third finger. You were told it was rude.',
        'Harder still. You point with your whole arm now.',
        'A fourth. It is basically a personality now.',
        'Every point goes through one more. Everyone feels seen.',
      ],
      { 3: { projectiles: 1 }, 4: { pierce: 1 }, 5: { projectiles: 1 }, 7: { projectiles: 1 }, 8: { pierce: 1 } },
    ),
    // G-043 paths. PLACEHOLDER VALUES, every one: each path level's single
    // bonus field, each path's maxLevel and PATH_OPENS_AT were written to
    // make the branch playable, not measured, and a person playing at the
    // link moves them. They fold into the same total as the weapon's own
    // levels. The copy carries no numbers: the card prints them from these
    // fields (G-043).
    paths: [
      {
        id: 'twitch',
        name: 'Poke',
        blurb: 'Points sooner. You were asked to stop poking.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You were asked nicely to stop.',
            'Sooner again. You were asked less nicely.',
            'Before anything happens. Poke, poke, poke.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'overreaction',
        name: 'Blame',
        blurb: 'Hits harder. It was them, and you can prove it.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. It was definitely them.',
            'Harder again. You saw them do it.',
            'As hard as it gets. They started it.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'nerves',
        name: 'Both Hands',
        blurb: 'More fingers at once. Everyone did it.',
        maxLevel: 2,
        levels: table(
          [
            'One more at once. You found your other hand.',
            'Another. You are using your feet as well.',
          ],
          {},
          each(1, 2, { projectiles: 1 }),
        ),
      },
    ],
    enables:
      'The default build. Fires at whatever is nearest, so it rewards nothing and asks nothing — the baseline every other weapon is measured against.',
    tradesAway:
      'Choice. It only ever fires at whatever is nearest, never at what matters, so its extra shots spread over the closest things rather than the dangerous ones, and it has no area at all.',
  },

  motility: {
    id: 'motility',
    name: 'Spitball',
    kind: 'weapon',
    mode: 'line',
    cooldown: 0.9,
    damage: 4,
    range: 520,
    projectileSpeed: 640,
    radius: 10,
    pierce: 99,
    maxLevel: 8,
    icon: 'pierce',
    blurb: 'Forward, harder. The only direction you believe in.',
    levels: table(
      [
        'Forward, harder. The only direction you believe in.',
        'Harder. You chewed it longer.',
        'One over your shoulder. The teacher was looking.',
        'Harder again. It hits the board with a slap.',
        'Two more, either side of forward. A whole page, chewed.',
        'Harder. They stick where they land.',
        'Wider shots. You used the whole worksheet.',
        'At full strength. Detention was worth it.',
      ],
      { 3: { projectiles: 1 }, 5: { projectiles: 2 }, 7: { area: 1.35 } },
    ),
    paths: [
      {
        id: 'conviction',
        name: 'Soggy',
        blurb: 'Hits harder. You chewed it for a whole lesson.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. It is wetter than it needs to be.',
            'Harder again. You chewed it through lunch.',
            'As wet as it gets. Nobody will touch it.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'momentum',
        name: 'Straw',
        blurb: 'Faster shots. You found a straw.',
        maxLevel: 3,
        levels: table(
          [
            'Faster. The straw from lunch.',
            'Faster again. A bendy straw, straightened.',
            'Nothing slows it down. It is a pea-shooter now.',
          ],
          {},
          each(1, 3, { speed: 1.3 }),
        ),
      },
      {
        id: 'broadside',
        name: 'Back Row',
        blurb: 'More shots at once. The back row is in on it.',
        maxLevel: 3,
        levels: table(
          [
            'One more shot. Your friend has a straw too.',
            'Another. The whole back row is loaded.',
            'Another. It is a class activity now.',
          ],
          {},
          each(1, 3, { projectiles: 1 }),
        ),
      },
    ],
    enables:
      'A positioning build: line the crowd up along one axis and the whole column dies at once, which turns the act’s density from a threat into the reason the weapon works.',
    tradesAway:
      'Coverage. Until the backward shot arrives it fires only where the player is already pointed, and even fully grown it covers lines, never a circle — the gaps between them are where a crowd closes.',
  },

  acrosome: {
    id: 'acrosome',
    name: 'Spilt Milk',
    kind: 'weapon',
    mode: 'burst',
    cooldown: 1.4,
    damage: 5,
    range: 96,
    projectileSpeed: 0,
    radius: 96,
    pierce: 99,
    // G-054: every burst leaves a puddle that holds what stands in it.
    // PLACEHOLDER, all three: a person playing Spilt Milk at the link moves
    // them (Conception's `provisional`, its weapon tables clause).
    puddle: { radius: 0.8, seconds: 2.5, slow: 0.6 },
    maxLevel: 8,
    icon: 'burst',
    blurb: 'Goes everywhere at once. You will have to be near it.',
    levels: table(
      [
        'Goes everywhere at once. You will have to be near it.',
        'Spreads a little further. It found the rug.',
        'Wider again. It is under the fridge now.',
        'Spills twice. The second glass was to help.',
        'Wider. There is no use crying over it.',
        'Wider still. It reached the dog.',
        'Wider. Everyone lifts their feet.',
        'As wide as it gets. The floor is mostly milk.',
      ],
      { 4: { echo: true } },
      each(2, 8, { area: 1.1 }),
    ),
    paths: [
      {
        id: 'short-fuse',
        name: 'Butterfingers',
        blurb: 'Spills sooner. You were holding it wrong.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You were not looking.',
            'Sooner again. Both hands, and still.',
            'Spills at nothing. You get a sippy cup now.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'blast-radius',
        name: 'Full Carton',
        blurb: 'Wider. It was a full one.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. It was a new carton.',
            'Wider again. It was the big one.',
            'The whole kitchen. Nobody mentions it.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'slammed-door',
        name: 'Slippery',
        blurb: 'Throws them back. Nobody keeps their feet.',
        maxLevel: 3,
        levels: table(
          [
            'Pushes them away. Someone slipped.',
            'Further. Someone went right over.',
            'Further still. Nobody is standing up.',
          ],
          {},
          each(1, 3, { knockback: 25 }),
        ),
      },
    ],
    enables:
      'A body-check build that wants to be inside the crowd rather than away from it, and the only weapon in the act that scales with how bad the player’s position is; the puddle it leaves holds whatever walks in after. Maxed beside Restlessness, it becomes Tantrum.',
    tradesAway:
      'Range, entirely. It cannot touch the spermicide ring, it cannot open on a white cell safely, and every use of it is paid for in contact damage first. The puddle holds, it never hurts.',
  },

  wake: {
    id: 'wake',
    name: 'Legos',
    kind: 'weapon',
    mode: 'trail',
    cooldown: 0.18,
    damage: 2,
    range: 2.4,
    projectileSpeed: 0,
    radius: 26,
    pierce: 99,
    maxLevel: 8,
    icon: 'trail',
    blurb: 'Everything behind you regrets it. Keep moving.',
    levels: table(
      [
        'Everything behind you regrets it. Keep moving.',
        'Lingers longer. Nobody tidies them up.',
        'Longer again. Some are from last Christmas.',
        'Longer. They follow you into every room.',
        'Wider and longer. You got another set for your birthday.',
        'Longer. You no longer feel them underfoot.',
        'Longer. They have their own box, which is empty.',
        'Every piece you own, behind you. Keep moving.',
      ],
      { 5: { area: 1.2 }, 8: { area: 1.2 } },
      each(2, 8, { duration: 1.15 }),
    ),
    paths: [
      {
        id: 'hoarding',
        name: 'Lost Pieces',
        blurb: 'Lingers longer. Nobody ever finds the last one.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. One went under the couch.',
            'Longer again. One is in the vent now.',
            'It never goes. You will find it in your forties.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'dead-weight',
        name: 'Corner Up',
        blurb: 'Hurts more. Every one of them lands corner up.',
        maxLevel: 3,
        levels: table(
          [
            'Sharper. It landed corner up.',
            'Sharper again. You heard someone yell.',
            'The sharpest one you own. Always found barefoot.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'sprawl',
        name: 'Big Set',
        blurb: 'A wider trail. You tipped out the big set.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. It has a castle in it.',
            'Wider again. It has a spaceship too.',
            'Wider still. It covers the whole hallway.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
    ],
    enables:
      'A kiting build where the player never faces the crowd at all and kills by having already been somewhere, which is the only build in the act that rewards retreating.',
    tradesAway:
      'Everything about standing still. It deals no damage in front of the player, it cannot open a path, and a cornered player is holding a weapon that has stopped existing.',
  },

  // Evolution. Never offered by the roll; see `evolvesFrom`.
  tantrum: {
    id: 'tantrum',
    name: 'Tantrum',
    kind: 'weapon',
    mode: 'burst',
    // PLACEHOLDER: bigger and faster than a maxed Spilt Milk, and nothing
    // more considered than that.
    cooldown: 0.8,
    damage: 7,
    range: 210,
    projectileSpeed: 0,
    radius: 210,
    pierce: 99,
    knockback: 70,
    // G-054: Spilt Milk's puddle, kept through the evolution. PLACEHOLDER,
    // all three, as Spilt Milk's are.
    puddle: { radius: 0.8, seconds: 2.5, slow: 0.6 },
    maxLevel: 1,
    icon: 'burst',
    blurb: 'Everything nearby, at once, and then further away.',
    levels: table(['Everything nearby, at once, and then further away.']),
    evolvesFrom: { weapon: 'acrosome', with: 'midpiece' },
    enables:
      'The Spilt Milk build finished: the burst that needed the player inside the crowd now throws the crowd back out of it, so standing in the middle stops being the price of the weapon.',
    tradesAway:
      'Spilt Milk, which it replaces, and the choosing: it is offered alone the moment it is possible. The knockback also scatters a crowd that Candy or Legos wanted kept together.',
  },

  grudge: {
    id: 'grudge',
    name: 'Mobile',
    kind: 'weapon',
    mode: 'orbit',
    // Orbit never activates; this is how often one orbiter may hit one enemy.
    cooldown: 0.5,
    damage: 3,
    range: 70,
    projectileSpeed: 210,
    radius: 14,
    pierce: 99,
    maxLevel: 8,
    icon: 'orbit',
    blurb: 'You keep it close. It keeps going round.',
    levels: table(
      [
        'You keep it close. It keeps going round.',
        'Hits harder. It is wound up tighter.',
        'A second thing on a string. A little moon.',
        'Hung a little further out. Still close.',
        'A third. There is a star now.',
        'Harder. It clonks whoever leans in.',
        'A fourth. A duck, for some reason.',
        'The widest circle it makes. Keep it turning.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.15 }, 5: { projectiles: 1 }, 7: { projectiles: 1 }, 8: { area: 1.15 } },
    ),
    paths: [
      {
        id: 'company',
        name: 'The Farm',
        blurb: 'More things on strings. The farm came too.',
        maxLevel: 3,
        levels: table(
          [
            'One more hanging. A cow, on a string.',
            'Another. The pig was always going to be next.',
            'Another. It is a whole farm up there.',
          ],
          {},
          each(1, 3, { projectiles: 1 }),
        ),
      },
      {
        id: 'spiralling',
        name: 'Lullaby',
        blurb: 'Faster round. The tune keeps going.',
        maxLevel: 3,
        levels: table(
          [
            'Faster. The tune is stuck in your head.',
            'Faster again. You hum it at night.',
            'It never stops. You will hum it at your wedding.',
          ],
          {},
          each(1, 3, { speed: 1.3 }),
        ),
      },
      {
        id: 'weight',
        name: 'Wooden Ones',
        blurb: 'Hits harder. Somebody hung the wooden ones.',
        maxLevel: 3,
        levels: table(
          [
            'Heavier. The felt ones were swapped out.',
            'Heavier again. There is a brass bell.',
            'It weighs a ton. The ceiling hook is worried.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
    ],
    enables:
      'A build that stands its ground: the orbiters work at a fixed short distance whatever the player does, so it pairs with anything that brings the crowd close — Candy, Thick Skin, Spilt Milk.',
    tradesAway:
      'Reach. It never touches anything further than one orbit away, a fast enemy slips through the gap between orbiters, and it cannot aim at anything at all.',
  },

  // G-054: the weapon is Telephone, the kids' game (G-041 had named it
  // Gossip, because Group Chat is the Adolescence enemy, ADOLESCENCE-ROSTER
  // §3.5). The id stays so nothing that keys on it moves.
  'group-chat': {
    id: 'group-chat',
    name: 'Telephone',
    kind: 'weapon',
    mode: 'seeking',
    cooldown: 1.1,
    damage: 3,
    range: 380,
    projectileSpeed: 380,
    radius: 7,
    pierce: 1,
    maxLevel: 8,
    icon: 'chain',
    blurb: 'Tells one, and then everyone it knows.',
    levels: table(
      [
        'Tells one, and then everyone it knows.',
        'Hits harder. It changed a little on the way.',
        'Sooner. Someone is already whispering.',
        'Reaches one more. It was not meant to.',
        'Harder. It is not what you said any more.',
        'Sooner again. Everyone leans in.',
        'Reaches one more. The line goes round the room.',
        'At full volume. The whole school heard it wrong.',
      ],
      { 1: { chain: 2 }, 4: { chain: 1 }, 7: { chain: 1 } },
    ),
    paths: [
      {
        id: 'mutuals',
        name: 'Pass It On',
        blurb: 'Jumps to more of them. Pass it on.',
        maxLevel: 3,
        levels: table(
          [
            'Reaches one more. Pass it on.',
            'Another. Everyone passes it on.',
            'Another. Nobody is left out of it.',
          ],
          {},
          each(1, 3, { chain: 1 }),
        ),
      },
      {
        id: 'screenshots',
        name: 'Garbled',
        blurb: 'Hits harder. It got worse every time it was told.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. A word changed.',
            'Harder again. Most of the words changed.',
            'It will outlive you. Nobody remembers the first one.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'notifications',
        name: 'Cupped Hands',
        blurb: 'Sends sooner. It only takes a whisper.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You barely had to whisper.',
            'Sooner again. It went before you finished.',
            'Constant. It is always going round.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A crowd-clearing build for a seeking player: one shot becomes three in a dense crowd, so it scales with exactly the density that ends a Pointing run.',
    tradesAway:
      'Anything alone. Against a single target — a white cell, the boss — the chain has nowhere to go and it is a slow, ordinary shot on a long cooldown.',
  },

  // --- 4.2 Control ------------------------------------------------------
  chemotaxis: {
    id: 'chemotaxis',
    name: 'Candy',
    kind: 'control',
    mode: 'attractor',
    cooldown: 5.5,
    damage: 0,
    range: 330,
    projectileSpeed: 0,
    radius: 330,
    pierce: 0,
    maxLevel: 6,
    icon: 'pull',
    blurb: 'Everything finds it. Everything finds you.',
    levels: table(
      [
        'Everything finds it. Everything finds you.',
        'Pulls from further. It is the good kind.',
        'Further. Word got round the playground.',
        'Further again. You brought enough for everyone.',
        'Further. You did not bring enough for everyone.',
        'As far as it goes. Everyone is coming over.',
      ],
      {},
      each(2, 6, { area: 1.08 }),
    ),
    // G-043 paths on a control item. PLACEHOLDER VALUES, every one, under
    // Conception's `provisional` (its weapon level tables clause): each path
    // level's single bonus field and each maxLevel were written to make the
    // branch playable, not measured; a person playing at the link moves them.
    // No numbers in the copy: the card prints them from these fields.
    paths: [
      {
        id: 'magnetism',
        name: 'Wrapper',
        blurb: 'Pulls from further. They heard the wrapper.',
        maxLevel: 3,
        levels: table(
          [
            'Further. They heard it from the next room.',
            'Further again. They heard it from outside.',
            'From across town. Nobody knows how.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'staying-power',
        name: 'Lollipop',
        blurb: 'The pull lasts longer. It takes ages to finish.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. You are only halfway through it.',
            'Longer again. It is stuck to your hair.',
            'Nobody leaves. It is mostly stick now.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'small-talk',
        name: 'Pocketful',
        blurb: 'Pulls sooner. You never run out.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You had another in your pocket.',
            'Sooner again. Both pockets, and a sock.',
            'Sooner still. You are mostly pockets now.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'Every area weapon in the act at once, by choosing where the crowd will be instead of reacting to it. It is the item that makes Spilt Milk and Legos into builds rather than options.',
    // Extended 2026-08-01 after Run 5 (§10.2). Chemotaxis is the largest
    // measured driver of antibody stacks in the act — r=+0.462, 6.7 against
    // 3.3 — and its text did not mention them. The mechanic is intended
    // (G-023); the invisibility was the defect. A cost the player cannot
    // perceive is not a trade.
    tradesAway:
      'Its own damage, which is zero, and its safety margin: pulling a crowd into a tight point is exactly how a run ends for a player who has nothing to clear it with. It does not discriminate either, so it gathers the antibodies too, which are the one thing in the act that cannot be cleared at all.',
  },

  // G-054: Cry, the panic button, a kid's thing like the weapons and in the
  // pool from conception. On its cooldown a ring spreads from where the
  // player stands (`World.cries`, world.ts `updateCries`); everything its
  // edge crosses is shoved outward, as a hit's knockback shoves (arena and
  // meeting walls respected, the boss never moved), and slowed for a moment
  // by the slowest-wins rule every hold uses. Once per enemy per cry; a
  // hostile shot is untouched. It hurts nothing.
  //
  // PLACEHOLDER NUMBERS, every one, under Conception's `provisional` (its
  // weapon tables clause): the cooldown, the ring's seconds and radius, the
  // shove, the slow and its seconds, each level's bonus and every path value
  // were written to make it playable, not measured. Nobody has played it; a
  // person playing it at the link is what moves them. The copy carries no
  // figures (G-043): the card prints them from these fields.
  cry: {
    id: 'cry',
    name: 'Cry',
    kind: 'control',
    mode: 'cry',
    cooldown: 12,
    damage: 0,
    // Seconds the ring takes to reach its edge.
    range: 0.6,
    projectileSpeed: 0,
    // The ring's edge at its widest, px.
    radius: 260,
    pierce: 0,
    // How far the edge shoves what it crosses, px, away from where it started.
    knockback: 120,
    // What it crosses moves at this fraction of its speed...
    slow: 0.5,
    // ...for this many seconds, wherever the shove put it.
    slowSeconds: 1.2,
    maxLevel: 5,
    icon: 'cry',
    blurb: 'Everything stops and looks. It is not about them.',
    levels: table(
      [
        'Everything stops and looks. It is not about them.',
        'Further. It carries to the next aisle.',
        'They stay put longer. Everyone is staring.',
        'Sooner. It takes less and less to start.',
        'Further and longer. The whole shop has stopped.',
      ],
      { 2: { area: 1.1 }, 3: { duration: 1.2 }, 4: { cooldown: 0.9 }, 5: { area: 1.1, duration: 1.2 } },
    ),
    paths: [
      {
        id: 'louder',
        name: 'Louder',
        blurb: 'A wider ring. You found another octave.',
        maxLevel: 3,
        levels: table(
          [
            'Louder. The car alarm joined in.',
            'Louder again. The dogs have opinions.',
            'As loud as it gets. The windows hum.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'longer',
        name: 'Longer',
        blurb: 'The stare lasts longer. You held the note.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. You held your breath first.',
            'Longer again. It outlasted the ice cream.',
            'It never ends. Someone offers to carry you.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'again',
        name: 'Again',
        blurb: 'Sooner. You had one more left in you.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. It starts back up with no warning.',
            'Sooner again. You were only resting.',
            'Sooner still. Nobody remembers it stopping.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A panic button for any build: every so often everything within reach is shoved back out of it and held while it turns round, so a cornered player gets a gap to walk through, and a trail, a strike or a sweep gets a crowd that arrives late.',
    tradesAway:
      'Damage, which is none, and choosing when: it goes off on its cooldown whether or not anything is close, a hostile shot flies straight through it, and it pushes the crowd out of reach of every close weapon the player holds — Cooties, Spilt Milk and Mobile most of all.',
  },

  // --- 4.3 Passives -----------------------------------------------------
  midpiece: {
    id: 'midpiece',
    name: 'Restlessness',
    kind: 'passive',
    speedMultiplier: 1.1,
    healthMultiplier: 1,
    damageTakenMultiplier: 1,
    cooldownMultiplier: 0.93,
    pickupMultiplier: 1,
    reachMultiplier: 1,
    sizeMultiplier: 1,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    icon: 'speed',
    blurb: 'Faster, and your hands never stop.',
    enables:
      'Every build that depends on not being touched, and every weapon at once through the cooldown. It is also what turns a maxed Spilt Milk into Tantrum.',
    // G-038: it used to cost health (G-014). Its limit is now its shape.
    tradesAway:
      'Nothing on the stat line. Its limit is that it only multiplies: speed and cadence make a working build better, and a run with nothing worth repeating just fails sooner.',
  },

  membrane: {
    id: 'membrane',
    name: 'Thick Skin',
    kind: 'passive',
    speedMultiplier: 1,
    healthMultiplier: 1.06,
    damageTakenMultiplier: 0.85,
    cooldownMultiplier: 1,
    pickupMultiplier: 1,
    reachMultiplier: 1,
    sizeMultiplier: 1,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    icon: 'guard',
    blurb: 'Things still hurt. Less.',
    enables:
      'Standing inside the crowd on purpose, which is the precondition for the Spilt Milk build and the only way to farm the rival wave rather than outrun it.',
    // G-038: it used to cost speed (G-014). The 2026-08-01 note (§10.3) still
    // holds — item text describes an item, not a policy — so the limit named
    // here is what the item does not do, not a loop it might feed.
    tradesAway:
      'Nothing on the stat line. Its limit is that it only softens contact: it moves nobody out of a ring or off a white cell, and a crowd that is not cleared still arrives.',
  },

  capacitation: {
    id: 'capacitation',
    name: 'Late Bloomer',
    kind: 'passive',
    speedMultiplier: 1,
    healthMultiplier: 1,
    damageTakenMultiplier: 1,
    cooldownMultiplier: 1,
    pickupMultiplier: 1,
    reachMultiplier: 1,
    sizeMultiplier: 1,
    // Starts strictly worse than doing nothing and ends well ahead of it.
    damageMultiplier: 0.7,
    rampTo: 1.85,
    maxLevel: 5,
    icon: 'clock',
    // Every act: the ramp runs on the act clock, so it restarts at each
    // crossing (AUDIT part four, 26 — by design; the card now says so).
    blurb: 'Worthless for two minutes of every act, then unstoppable.',
    enables:
      'A late-act scaling build that outperforms every other item in the last ninety seconds, and it is the only item in the game whose power is a function of the act clock rather than the player.',
    tradesAway:
      'The opening two minutes, which are strictly worse than doing nothing, on a hard timer. It is a bet that the run reaches the point where it pays, and act one is exactly long enough for that bet to be wrong.',
  },

  appetite: {
    id: 'appetite',
    name: 'Appetite',
    kind: 'passive',
    speedMultiplier: 1,
    healthMultiplier: 1,
    damageTakenMultiplier: 1,
    cooldownMultiplier: 1,
    // PLACEHOLDER, like every level table.
    pickupMultiplier: 1.3,
    reachMultiplier: 1,
    sizeMultiplier: 1,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    icon: 'magnet',
    blurb: 'Everything on the floor is yours now.',
    enables:
      'A levelling build: gems come from further away, so a run reaches its max levels and its evolution sooner without walking into the crowd to collect them.',
    tradesAway:
      'Any effect on the fight itself. It kills nothing and blocks nothing, so a run that is losing now loses with more options on the table.',
  },

  // --- 4.4 Born at thirteen (ADOLESCENCE-ROSTER §6) ------------------------
  //
  // In the pool from Adolescence on, never before (`from`). One name each for
  // the life (G-039): they arrive at thirteen, so they never had another.
  // PLACEHOLDER NUMBERS under ADOLESCENCE's `provisional`, not Conception's:
  // every multiplier, the cooldown, radius, slow and duration were written to
  // make the two playable, from the direction panel's sketches, and nobody
  // has played either.

  'growth-spurt': {
    id: 'growth-spurt',
    name: 'Growth Spurt',
    kind: 'passive',
    from: 'adolescence',
    speedMultiplier: 1,
    healthMultiplier: 1,
    damageTakenMultiplier: 1,
    cooldownMultiplier: 1,
    pickupMultiplier: 1.1,
    reachMultiplier: 1.1,
    sizeMultiplier: 1.08,
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    icon: 'grow',
    blurb: 'Taller. Longer reach. Everyone can see you.',
    enables:
      'Reach: every weapon touches things from further away — shots fly further, bursts and fields are wider, the orbit swings wider — and gems come from further too, so a build that was one step short of the crowd is not.',
    tradesAway:
      'Threading gaps. The player is bigger in every sense the sim has: a wider body touches more of the crowd, catches more shots and rings, and no longer fits the space between two things it used to slip through.',
  },

  snooze: {
    id: 'snooze',
    name: 'Snooze',
    kind: 'control',
    from: 'adolescence',
    mode: 'field',
    // Seconds between fields at level 1; the generic per-level cooldown
    // scaling (World.activeCooldown) is what "levels come sooner" means.
    cooldown: 15,
    damage: 0,
    // Seconds the field lasts: nine more minutes, at one second a minute.
    range: 9,
    projectileSpeed: 0,
    radius: 170,
    pierce: 0,
    slow: 0.5,
    maxLevel: 6,
    icon: 'slow',
    blurb: 'Nine more minutes. Everything nearby also waits.',
    levels: table(
      [
        'Nine more minutes. Everything nearby also waits.',
        'Wider, and sooner. The alarm is across the room.',
        'Sooner again. You set it to go off early on purpose.',
        'Wider. The whole house is running late.',
        'Sooner. You no longer hear the first alarm.',
        'As wide as it goes. Nobody is getting up.',
      ],
      {},
      each(2, 6, { area: 1.08 }),
    ),
    // G-043 paths on a control item. PLACEHOLDER VALUES, every one, under
    // Adolescence's `provisional` (the items born there): each path level's
    // single bonus field and each maxLevel were written to make the branch
    // playable, not measured; a person playing at the link moves them. The
    // "nine" in the name is a word, not a figure: the card prints the figure.
    paths: [
      {
        id: 'nine-more',
        name: 'Nine More Minutes',
        blurb: 'Lasts longer. You hit the button without waking.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. Nine more, and then nine more.',
            'Longer again. You have stopped counting.',
            'It is somehow noon. The alarm gave up first.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'whole-house',
        name: 'Whole House',
        blurb: 'Wider. Nobody under this roof is up yet.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. Your brother slept through it too.',
            'Wider again. The dog will not get up either.',
            'The whole street. The bus is running late too.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'early-alarm',
        name: 'Early Alarm',
        blurb: 'Sooner. It goes off before you need it to.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You keep the clock a little fast.',
            'Sooner again. There is a backup alarm now.',
            'Sooner still. It goes off before you sleep.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'Builds that want the crowd held where it is: Legos lays more trail over a crowd that crosses it at half speed, Spilt Milk and Mobile get twice as long with everything inside, and an aimed shot through the field arrives late enough to step round.',
    tradesAway:
      'Escaping. The field is dropped where the player stands and holds the player too, so the one thing it cannot do is get anyone out of a crowd; a player caught inside it walks out at half speed with everything else.',
  },

  // --- Born at twenty-two: The Office (G-048) ------------------------------
  //
  // In the pool from The Office on, never before (`from`, G-039). The first
  // item born there, and a control: the meeting's hold (OFFICE-ROSTER §3.4)
  // turned inside out and placed by the player. It goes on `World.holds` with
  // the meetings (`wall`), one registry for holds, owned by the player
  // (`HoldState.owner`). PLACEHOLDER NUMBERS, every one, under OFFICE's
  // `provisional` (the act's items): the cooldown, the seconds (`range`), the
  // radius, each level's bonus and every path value were written to make it
  // playable, not measured; a person playing at the link moves them. The
  // "two minutes" in the copy is a word, not a figure: the card prints the
  // figure from these fields (G-043).

  'calendar-block': {
    id: 'calendar-block',
    name: 'Calendar Block',
    kind: 'control',
    from: 'office',
    mode: 'field',
    wall: true,
    // Seconds between blocks at level 1; the generic per-level cooldown
    // scaling (World.activeCooldown) makes every level come sooner too.
    cooldown: 14,
    damage: 0,
    // Seconds it lasts, as a field's `range` is.
    range: 2.5,
    projectileSpeed: 0,
    radius: 110,
    pierce: 0,
    // No slow: it walls, it does not hold anyone still.
    slow: 1,
    maxLevel: 5,
    icon: 'block',
    blurb: 'Nothing gets in or out. The only two minutes nobody can book.',
    levels: table(
      [
        'Nothing gets in or out. The only two minutes nobody can book.',
        'Wider. You booked the big room.',
        'Longer. It always runs over.',
        'Sooner. You block it before anyone else can.',
        'Wider and longer. The whole afternoon is taken.',
      ],
      { 2: { area: 1.1 }, 3: { duration: 1.2 }, 4: { cooldown: 0.9 }, 5: { area: 1.1, duration: 1.2 } },
    ),
    paths: [
      {
        id: 'recurring',
        name: 'Recurring',
        blurb: 'Sooner. It repeats until somebody notices.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. It is on every Tuesday now.',
            'Sooner again. Every morning, first thing.',
            'Sooner still. It has no end date.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'all-day',
        name: 'All Day',
        blurb: 'Lasts longer. Nobody asks what it was for.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. It ran into lunch.',
            'Longer again. It ran into the afternoon.',
            'All day. It was marked busy for a reason.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'private',
        name: 'Private',
        blurb: 'Wider. The details are hidden from everyone.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. The title just says busy.',
            'Wider again. The room is booked under no name.',
            'As wide as it goes. Nobody can see the details.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
    ],
    enables:
      'A breather build: for as long as it lasts nothing outside can reach the player and nothing inside can leave, so a cornered player gets a room with a fixed number of things in it, which is exactly what Spilt Milk, Cooties and Mobile want.',
    tradesAway:
      'Anything but the walk: it deals nothing, slows nothing and stops no shot either way. It stays where it was put, it keeps whatever was already inside in there with the player, and a commute or a patrol walks straight through it.',
  },

  // --- Born at eighteen (College) ------------------------------------------
  //
  // In the pool from College on, never before (`from`, G-039): the first
  // item that arrives at eighteen, with one name for the rest of the life.
  // A weapon that barely hurts and makes everything else hurt more: its
  // stroke MARKS what it lands on (`marks`), and every damage path in the sim
  // pays the mark through one gate (world.ts `damageEnemy`; `bossTakes` for
  // the boss). It is the pen, not the argument.
  // PLACEHOLDER NUMBERS, every one, under COLLEGE's `provisional`: the
  // cooldown, damage, range, speed, the mark's seconds and multiplier, the
  // levels table and every path were written to make it playable, not
  // measured, and nobody has played it. A person playing it at the link is
  // what moves them. The copy carries no numbers: the card prints them from
  // these fields (G-043).

  highlighter: {
    id: 'highlighter',
    name: 'Highlighter',
    kind: 'weapon',
    from: 'college',
    mode: 'seeking',
    cooldown: 1,
    // Low on purpose: the damage is everyone else's.
    damage: 1,
    range: 360,
    projectileSpeed: 480,
    radius: 7,
    pierce: 1,
    marks: { seconds: 3, multiplier: 1.5 },
    maxLevel: 8,
    icon: 'highlight',
    blurb: 'Marks what matters. Everything then hits what matters.',
    levels: table(
      [
        'Marks what matters. Everything then hits what matters.',
        'Marks last longer. You pressed down harder.',
        'A second stroke, on the next-nearest thing.',
        'Marked things take more. You went over it twice.',
        'Longer again. It shows through the back of the page.',
        'A third stroke. Most of the chapter matters now.',
        'Sooner. You highlight while you read, not after.',
        'Marked things take more again. It will be on the exam.',
      ],
      { 2: { duration: 1.2 }, 3: { projectiles: 1 }, 4: { mark: 1.1 }, 5: { duration: 1.2 }, 6: { projectiles: 1 }, 7: { cooldown: 0.85 }, 8: { mark: 1.1 } },
    ),
    paths: [
      {
        id: 'fluorescent',
        name: 'Fluorescent',
        blurb: 'The mark lasts longer. It does not come out in the wash.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. It bleeds through to the next page.',
            'Longer again. It is on your fingers too.',
            'It never fades. The book cannot be resold.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'every-page',
        name: 'Every Page',
        blurb: 'More strokes at once. Nothing gets left out.',
        maxLevel: 2,
        levels: table(
          [
            'One more stroke. The next line seemed important too.',
            'Another. The whole page is highlighted, so nothing is.',
          ],
          {},
          each(1, 2, { projectiles: 1 }),
        ),
      },
      {
        id: 'underline',
        name: 'Underline',
        blurb: 'Marked things take even more. It is underlined as well.',
        maxLevel: 3,
        levels: table(
          [
            'Underlined once. It might be on the test.',
            'Twice. It is definitely on the test.',
            'Three times, in pen. It is the whole test.',
          ],
          {},
          each(1, 3, { mark: 1.1 }),
        ),
      },
    ],
    enables:
      'A build for everything else the player holds: whatever it marks takes more from every weapon, area, orbit, sweep and strike for a few seconds, so it multiplies Tattle, Spilt Milk and Mobile instead of competing with them, and it marks the boss as readily as the crowd.',
    tradesAway:
      'Damage of its own, which is barely any, and anything alone: held with nothing else it marks things nobody then hits, and like Pointing it marks whatever is nearest rather than whatever matters.',
  },

  // --- 4.5 The classic three (G-044) --------------------------------------
  //
  // The aura, the melee swing and the caster a survivors player reaches for
  // in the first minute, each with one life-name (G-039), in the pool from
  // conception. PLACEHOLDER NUMBERS, all of them: the cooldowns, damage,
  // reaches, radii, the sweep's arc and knockback, every level table and
  // every path were written to make the three playable and have not been
  // played. They sit under Conception's `provisional` (its weapon level
  // tables clause); a person playing them at the link is what moves them.

  'personal-space': {
    id: 'personal-space',
    name: 'Cooties',
    kind: 'weapon',
    mode: 'aura',
    // Aura never activates; this is how often one enemy inside may be hit again.
    cooldown: 0.6,
    damage: 2,
    // Unused: the ring is `radius`.
    range: 0,
    projectileSpeed: 0,
    radius: 90,
    pierce: 99,
    maxLevel: 8,
    icon: 'aura',
    blurb: 'Whatever stands too close gets them. Circle, circle, dot, dot.',
    levels: table(
      [
        'Whatever stands too close gets them. Circle, circle, dot, dot.',
        'A little more room. Nobody wants to catch it.',
        'More room again. A note went round about it.',
        'It hurts more to be near you. It is a bad case.',
        'Wider. You get the whole bus seat.',
        'Wider. The other class has heard.',
        'It hurts more. There is no cootie shot for this.',
        'As much room as it gets. Nobody sits next to you.',
      ],
      { 2: { area: 1.1 }, 3: { area: 1.1 }, 4: { damage: 1.2 }, 5: { area: 1.1 }, 6: { area: 1.1 }, 7: { damage: 1.2 }, 8: { area: 1.1 } },
    ),
    paths: [
      {
        id: 'boundaries',
        name: 'Contagious',
        blurb: 'A wider ring. It spreads if you breathe on them.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. Someone sneezed.',
            'Wider again. The whole row has it.',
            'As wide as it goes. It is going round the school.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'cold-shoulder',
        name: 'No Take-Backs',
        blurb: 'It hurts more to be near you. No take-backs.',
        maxLevel: 3,
        levels: table(
          [
            'Hurts more. Double cooties.',
            'Hurts more again. Triple cooties.',
            'It hurts to be in the same room. Cooties forever.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
      {
        id: 'hovering',
        name: 'Tag',
        blurb: 'They keep coming back. They keep getting it again.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. They came back for more.',
            'Sooner again. You are it, and so are they.',
            'Sooner still. Nobody is safe at recess.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A build that never aims and never stops: the ring hurts whatever stands in it, so it rewards being inside the crowd for exactly as long as the player can afford it, and pairs with Thick Skin, Candy and Mobile.',
    tradesAway:
      'Reach and burst. It touches nothing further than arm’s length, it deals little to any one thing at a time, and a crowd it cannot kill fast enough is standing exactly where it also hurts the player.',
  },

  backhand: {
    id: 'backhand',
    name: 'Rattle',
    kind: 'weapon',
    mode: 'sweep',
    cooldown: 1.0,
    damage: 6,
    // The arc's reach, in pixels.
    range: 110,
    projectileSpeed: 0,
    radius: 0,
    pierce: 99,
    knockback: 20,
    arc: (100 * Math.PI) / 180,
    maxLevel: 8,
    icon: 'sweep',
    blurb: 'Swats whatever is in front of you. It was a toy.',
    levels: table(
      [
        'Swats whatever is in front of you. It was a toy.',
        'Harder. You have figured out the handle.',
        'One behind you as well. You shake it both ways.',
        'Longer reach. You grew a little.',
        'Harder. The beads inside are louder.',
        'Longer reach again. You let go of it once.',
        'One to your left. The other hand wants a go.',
        'Knocks them further. Nobody takes it off you now.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.15 }, 5: { damage: 1.2 }, 6: { area: 1.15 }, 7: { projectiles: 1 }, 8: { knockback: 20 } },
    ),
    paths: [
      {
        id: 'wingspan',
        name: 'Long Handle',
        blurb: 'Longer reach. The handle is longer than you.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. You hold it by the very end.',
            'Longer again. It reaches the top shelf.',
            'As long as it gets. Nobody is out of range.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'follow-through',
        name: 'Throw',
        blurb: 'Sends them further. Sometimes it leaves your hand.',
        maxLevel: 3,
        levels: table(
          [
            'Further. It got away from you.',
            'Further again. It went over the side of the crib.',
            'As far as it goes. Someone has to fetch it.',
          ],
          {},
          each(1, 3, { knockback: 25 }),
        ),
      },
      {
        id: 'snap',
        name: 'Shake',
        blurb: 'Swats sooner. You never stop shaking it.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. It never stops rattling.',
            'Sooner again. You shake it in your sleep.',
            'Sooner still. Nobody can hear themselves think.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A melee build that aims by walking: the arc hits everything in front of the player at once and shoves it back, so it rewards facing the crowd and pushing into it, and it clears the flanks a Spitball line leaves open.',
    tradesAway:
      'Everything behind and beside the player until the extra swats arrive, and anything past arm’s reach. It swings on its cooldown whether or not anything is there, so a player walking away from the crowd is swatting the air.',
  },

  judgement: {
    id: 'judgement',
    name: 'Tattle',
    kind: 'weapon',
    mode: 'strike',
    cooldown: 1.6,
    damage: 9,
    // How far away a target may be picked, in pixels.
    range: 300,
    projectileSpeed: 0,
    // What the tattle hits where it lands.
    radius: 48,
    pierce: 99,
    // The card's "+1 tattle", "3 tattles" (AUDIT 104's `noun`): what comes
    // down is being told on, not a bolt. Its evolution, Judgement, keeps bolts.
    noun: { one: 'tattle', many: 'tattles' },
    maxLevel: 8,
    icon: 'bolt',
    blurb: 'You told. It comes down on one of them.',
    levels: table(
      [
        'You told. It comes down on one of them.',
        'Harder. You told it with feeling.',
        'A second one, on someone else. You kept a list.',
        'Wider. Everyone near them gets told off too.',
        'Harder. You told them what you saw.',
        'A third, on someone else again. The list is long.',
        'Sooner. You no longer wait to be sure.',
        'As wide as it gets. The whole table loses recess.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.2 }, 5: { damage: 1.2 }, 6: { projectiles: 1 }, 7: { cooldown: 0.85 }, 8: { area: 1.2 } },
    ),
    paths: [
      {
        id: 'verdict',
        name: 'Grown-Up',
        blurb: 'Lands harder. You went straight to a grown-up.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. A teacher heard.',
            'Harder again. It went to the principal.',
            'As hard as it gets. Your parents were called.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
      {
        id: 'docket',
        name: 'The List',
        blurb: 'One more name on the list, every time.',
        maxLevel: 2,
        levels: table(
          ['Another one. The list gets longer.', 'Another. You were on it once yourself.'],
          {},
          each(1, 2, { projectiles: 1 }),
        ),
      },
      {
        id: 'summary',
        name: 'Nobody Asked',
        blurb: 'Sooner. Nobody asked, and you told anyway.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You did not wait to be asked.',
            'Sooner again. You told before it happened.',
            'Sooner still. You tell on people in your sleep.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A caster build for a player busy staying alive: it picks its own target anywhere in range, so it needs no aiming and no positioning, and a crowd packed tight takes the neighbours of whoever was picked.',
    tradesAway:
      'Choice and timing. It picks at random rather than what is dangerous, it lands where the target was a moment ago so anything fast has already left, and it never favours what is touching the player.',
  },

  // --- 4.6 Evolutions (G-046) ---
  //
  // G-047: an evolution is PAID AT ITS WEAPON'S MAX LEVEL — the generic
  // per-level damage and cooldown scaling (damageScale/cooldownScale) runs at
  // the weapon's maxLevel, not at the evolution's own level 1 — so its base
  // numbers below are written beside the weapon's base, a little above it,
  // and the card that replaces a maxed weapon is never a downgrade.------------------------------------------
  //
  // Five more, dealt as Tantrum is: never rolled, one card alone the level
  // after the weapon is maxed beside its partner (`readyEvolution`, which
  // takes them in registry order after Tantrum), each replacing its weapon
  // and the paths taken on it (`World.take`).
  //
  // PLACEHOLDER NUMBERS, every one, under Conception's `provisional` (its
  // weapon tables clause): each cooldown, damage, range, speed, radius,
  // pierce, knockback, arc, slow, strike delay and level-one bonus below was
  // written to make the five playable, not measured, and nobody has played
  // them. An evolution is paid at level one, so none of the generic per-level
  // scaling its maxed weapon had comes with it. A person playing them at the
  // link is what moves them. The copy carries no numbers: the card prints them
  // from these fields (G-043).

  vendetta: {
    id: 'vendetta',
    name: 'Grudge',
    kind: 'weapon',
    mode: 'orbit',
    // Orbit never activates; this is how often one fist may hit one enemy.
    cooldown: 0.4,
    damage: 4,
    range: 90,
    projectileSpeed: 260,
    radius: 16,
    pierce: 99,
    // Orbit hits push only when this is set (updateOrbiters). Mobile has none.
    knockback: 40,
    maxLevel: 1,
    icon: 'vendetta',
    blurb: 'Nobody remembers what started it. Everyone gets shoved.',
    levels: table(['Nobody remembers what started it. Everyone gets shoved.'], { 1: { projectiles: 3 } }),
    evolvesFrom: { weapon: 'grudge', with: 'membrane' },
    enables:
      'The Mobile build finished: what went round now comes round as fists that shove what they hit outward, so the orbit clears its own ring and keeps the crowd off a player who was standing in it on Thick Skin anyway.',
    tradesAway:
      'Mobile, which it replaces with any path taken on it, and the choosing: it is dealt alone the moment it is possible. The shove also leaves what it hits just outside the circle, where no fist reaches it until it walks back in.',
  },

  jumpiness: {
    id: 'jumpiness',
    name: 'Jumpiness',
    kind: 'weapon',
    mode: 'seeking',
    cooldown: 0.35,
    damage: 2.5,
    range: 460,
    projectileSpeed: 520,
    radius: 7,
    pierce: 1,
    maxLevel: 1,
    icon: 'jump',
    blurb: 'Flinches at everything, all the time. It is not a phase.',
    levels: table(['Flinches at everything, all the time. It is not a phase.'], { 1: { projectiles: 2 } }),
    evolvesFrom: { weapon: 'lash', with: 'midpiece' },
    enables:
      'The Pointing build finished: more flinches a second than a maxed Pointing, from further away and faster, so the weapon every life starts with fills the air around a player Restlessness already keeps on the move.',
    tradesAway:
      'Pointing, which it replaces with any path taken on it, and the choosing. It still fires at whatever is nearest rather than what matters, every flinch stops in the first thing it hits, and it has no area at all.',
  },

  reach: {
    id: 'reach',
    name: 'Backhand',
    kind: 'weapon',
    mode: 'sweep',
    cooldown: 1,
    damage: 7,
    // The circle's reach, in pixels.
    range: 150,
    projectileSpeed: 0,
    radius: 0,
    pierce: 99,
    knockback: 30,
    // The whole way round: inArc takes every bearing.
    arc: Math.PI * 2,
    maxLevel: 1,
    icon: 'reach',
    blurb: 'You grew into it. There is no behind you any more.',
    levels: table(['You grew into it. There is no behind you any more.']),
    evolvesFrom: { weapon: 'backhand', with: 'growth-spurt' },
    enables:
      'The Rattle build finished: the swat goes all the way round, so the melee build that had to face the crowd no longer has a back to be caught from, and Growth Spurt carries the circle further out.',
    tradesAway:
      'Rattle, which it replaces with any path taken on it, and the choosing. It swings less often than the rattle it replaced, it still touches nothing past arm’s length, and the shove scatters a crowd an area weapon wanted kept close.',
  },

  hindsight: {
    id: 'hindsight',
    name: 'Judgement',
    kind: 'weapon',
    mode: 'strike',
    cooldown: 1.3,
    damage: 10,
    // How far away a target may be picked, in pixels.
    range: 340,
    projectileSpeed: 0,
    // What each bolt hits where it lands.
    radius: 60,
    pierce: 99,
    // No telegraph: it lands on the step it is fired (strikeAt).
    strikeDelay: 0,
    maxLevel: 1,
    icon: 'hindsight',
    blurb: 'No warning. It was obvious afterwards.',
    levels: table(['No warning. It was obvious afterwards.'], { 1: { projectiles: 2 } }),
    evolvesFrom: { weapon: 'judgement', with: 'capacitation' },
    enables:
      'The Tattle build finished: the bolts come down the moment they are picked, so nothing fast gets out from under them, and Late Bloomer’s late-act damage lands on exactly the spot it was aimed at.',
    tradesAway:
      'Tattle, which it replaces with any path taken on it, and the choosing. It still picks at random rather than what is dangerous, it still ignores what is touching the player, and with no warning nobody can read where the next one falls.',
  },

  rut: {
    id: 'rut',
    name: 'Baggage',
    kind: 'weapon',
    mode: 'trail',
    cooldown: 0.18,
    damage: 2.5,
    // Seconds each footprint lasts.
    range: 3,
    projectileSpeed: 0,
    radius: 30,
    pierce: 99,
    // Each footprint holds what stands in it, as Snooze's field does (slowAt).
    slow: 0.6,
    maxLevel: 1,
    icon: 'rut',
    blurb: 'Everything behind you gets stuck in it. You keep going.',
    levels: table(['Everything behind you gets stuck in it. You keep going.'], { 1: { duration: 1.2 } }),
    evolvesFrom: { weapon: 'wake', with: 'snooze' },
    enables:
      'The Legos build finished: whatever follows the player across the trail is held in it while it hurts, so a chasing crowd spends longer in the footprints and arrives later.',
    tradesAway:
      'Legos, which it replaces with any path taken on it, and the choosing. It holds only what follows: the player walks their own trail at full speed, and a cornered player is still holding a weapon that has stopped existing.',
  },

  // --- 4.7 Born at thirty-four: Family (G-050) ----------------------------
  //
  // In the pool from Family on, never before (`from`), and the first item
  // the life meets there: the direction panel's Strongly Worded Letter. A
  // strike that marks the NEAREST problem where it stands now
  // (`strikeNearest`, no dice) and lands on that spot long after
  // (`strikeDelay`), whether or not the problem is still there. It holds its
  // mark as Tattle's does: a strike's area is placed at the pick and
  // never follows the target. Its Registered path is a `speed` path because a
  // strike's delay divides by `speed` (`strikeDelayAt`).
  //
  // PLACEHOLDER NUMBERS, every one, under FAMILY's `provisional` (the item
  // born there): the cooldown, damage, range, radius and delay come from the
  // panel's sketch (five seconds, 40, a 120px circle), and every level-table
  // entry, path value and path maxLevel was written to make it playable, not
  // measured. Nobody has played it; a person playing it at the link is what
  // moves them. The copy carries no figures (G-043): the card prints them,
  // and the blurb's "four to six" is an estimate a test holds the delay to.

  'strongly-worded-letter': {
    id: 'strongly-worded-letter',
    name: 'Strongly Worded Letter',
    kind: 'weapon',
    from: 'family',
    mode: 'strike',
    cooldown: 6,
    damage: 40,
    // How far away the nearest problem may be marked, in pixels.
    range: 360,
    projectileSpeed: 0,
    // What the letter hits where it lands: the mark, not the problem.
    radius: 120,
    pierce: 99,
    // Seconds from the mark to the landing, before Registered divides it.
    strikeDelay: 5,
    strikeNearest: true,
    // The card's "+1 letter", "3 letters": it is post, not a bolt.
    noun: { one: 'letter', many: 'letters' },
    maxLevel: 8,
    icon: 'letter',
    blurb: 'Arrives in four to six seconds. The problem has usually moved.',
    levels: table(
      [
        'Arrives in four to six seconds. The problem has usually moved.',
        'Harder. It went through several drafts.',
        'A second letter, about the next problem along.',
        'Wider. It raises the wider issue as well.',
        'A third letter. You have a folder for these now.',
        'Harder. It is printed on letterhead.',
        'Sent sooner. You no longer sleep on it.',
        'Wider. It lands exactly where the problem was. Usually.',
      ],
      { 2: { damage: 1.2 }, 3: { projectiles: 1 }, 4: { area: 1.15 }, 5: { projectiles: 1 }, 6: { damage: 1.2 }, 7: { cooldown: 0.85 }, 8: { area: 1.15 } },
    ),
    paths: [
      {
        id: 'cc',
        name: 'Cc',
        blurb: 'More letters at once. There is always a copy.',
        maxLevel: 2,
        levels: table(
          ['A copy, to the next problem along.', 'Another copy. The file is getting thick.'],
          {},
          each(1, 2, { projectiles: 1 }),
        ),
      },
      {
        id: 'registered',
        name: 'Registered',
        blurb: 'Arrives sooner. It has to be signed for.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. It has a tracking number now.',
            'Sooner again. Next day, before noon.',
            'Sooner still. The problem barely had time to move.',
          ],
          {},
          each(1, 3, { speed: 1.25 }),
        ),
      },
      {
        id: 'capital-letters',
        name: 'Capital Letters',
        blurb: 'Lands harder. Some of it is in capitals.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. The subject line is in capitals.',
            'Harder again. The whole thing is underlined.',
            'As hard as it gets. Every word is in capitals.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
    ],
    enables:
      'A build that brings the problem back to the mark: Candy’s pull or Snooze’s hold keeps a crowd standing where the letter was aimed, and then the heaviest single landing in the life comes down on all of it at once.',
    tradesAway:
      'Timing, entirely. It lands where the problem stood when the letter was sent, long after, so anything that moves has usually left; it never favours what is touching the player, and nothing it marks is hurt until it arrives.',
  },

  // --- 4.8 Born at fifty-five: Decline (G-051) ----------------------------
  //
  // In the pool from Decline on, never before (`from`), and the last item the
  // life meets: the direction panel's Nap (DECLINE-ROSTER §6), a control that
  // fires nothing. When health falls under its threshold and it is off its
  // cooldown the player falls asleep in the chair: stopped as the hall
  // monitor stops them (world.ts `nap`, through `stun`), untouched by
  // contact while it lasts, still hit by anything aimed, and healing evenly
  // across the window. The clock keeps running, and that is the joke, not a
  // tax (G-038): nothing else is taken. Its three levers are the ones a
  // control already has — `duration` (below 1: a shorter nap, the upgrade),
  // `cooldown` (sooner), and `damage`, which on a nap multiplies the heal.
  //
  // PLACEHOLDER NUMBERS, every one, under DECLINE's `provisional` (the item
  // born there): the threshold, the cooldown, the seconds (`range`) and the
  // heal come from the panel's sketch (under 30%, 45s, 1.5s, a quarter; its
  // "Lv5: 0.8s" is where the level table lands), and every level-table
  // entry, path value and path maxLevel was written to make it playable, not
  // measured. Nobody has played it; a person playing it at the link is what
  // moves them. The copy carries no figures (G-043): the card prints them.

  nap: {
    id: 'nap',
    name: 'Nap',
    kind: 'control',
    from: 'decline',
    mode: 'nap',
    // Seconds between naps at level 1; the generic per-level cooldown
    // scaling (World.activeCooldown) makes every level come sooner too.
    cooldown: 45,
    damage: 0,
    // Seconds asleep, as a field's `range` is its seconds.
    range: 1.5,
    projectileSpeed: 0,
    radius: 0,
    pierce: 0,
    // Under this share of the maximum it falls asleep; this share comes back.
    nap: { threshold: 0.3, heal: 0.25 },
    maxLevel: 5,
    icon: 'nap',
    blurb: 'You fell asleep in the chair. You feel better. It is later.',
    levels: table(
      [
        'You fell asleep in the chair. You feel better. It is later.',
        'Shorter. You were only resting your eyes.',
        'Heals more. You were properly out.',
        'Sooner. You nod off during the news now.',
        'Shorter still. Out and back before the adverts end.',
      ],
      // Level five lands on the panel's 0.8s: 1.5 × 0.8 × 2/3.
      { 2: { duration: 0.8 }, 3: { damage: 1.2 }, 4: { cooldown: 0.85 }, 5: { duration: 2 / 3 } },
    ),
    paths: [
      {
        id: 'power-nap',
        name: 'Power Nap',
        blurb: 'Shorter naps. You wake up before anyone notices.',
        maxLevel: 3,
        levels: table(
          [
            'Shorter. You set an alarm for it.',
            'Shorter again. You wake before your head drops.',
            'Barely a blink. Nobody saw you go.',
          ],
          {},
          each(1, 3, { duration: 0.85 }),
        ),
      },
      {
        id: 'habit',
        name: 'Habit',
        blurb: 'Sooner. Same chair, same time, every afternoon.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. Straight after lunch, as usual.',
            'Sooner again. After breakfast as well.',
            'Sooner still. Whenever you sit down.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'deep-sleep',
        name: 'Deep Sleep',
        blurb: 'Heals more. Nothing wakes you, not even the phone.',
        maxLevel: 2,
        levels: table(
          ['More. You drooled a little.', 'You wake up and ask what year it is.'],
          {},
          each(1, 2, { damage: 1.25 }),
        ),
      },
    ],
    enables:
      'A second wind for a build that stands in the crowd until it cannot: once health runs low the crowd’s touches stop landing for a moment and part of the maximum comes back, so Thick Skin, Cooties and Spilt Milk get up again instead of getting a certificate.',
    tradesAway:
      'Anything above the threshold, and anything soon after the last one: it waits for health to run low and then for its cooldown. Asleep, the player cannot move and a hostile shot still lands, and whatever walked up meanwhile is still there on waking.',
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

export function itemDef(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item "${id}"`);
  return def;
}

export function isActive(def: ItemDef): def is ActiveItem {
  return def.kind === 'weapon' || def.kind === 'control';
}

/**
 * The generic per-level scaling every active item gets, whatever its levels
 * table adds (PLACEHOLDERS, like the tables). Exported so the offer card can
 * print what the next level is worth from the same formula the sim uses.
 */
export function damageScale(level: number): number {
  return 1 + 0.2 * (level - 1);
}

/** Below 1 is sooner. Floors at 0.4, so no weapon fires more than 2.5x its base rate. */
export function cooldownScale(level: number): number {
  return Math.max(0.4, 1 - 0.08 * (level - 1));
}

/**
 * A strike's seconds from mark to landing: its delay divided by the `speed`
 * bonus its levels and paths add (the Letter's Registered). The sim lands it
 * by this and the card prints "arrives in" from it, so the two cannot drift.
 */
export function strikeDelayAt(delay: number, speed: number): number {
  return speed > 0 ? delay / speed : delay;
}

/** Every field a `Required<LevelBonus>` starts from: the identity for each. */
export function emptyBonus(): Required<LevelBonus> {
  return { projectiles: 0, pierce: 0, area: 1, duration: 1, echo: false, chain: 0, damage: 1, cooldown: 1, speed: 1, knockback: 0, mark: 1 };
}

/** Folds one level's bonus into a running total, in place. Counts sum, multipliers multiply, echo latches. */
export function foldBonus(into: Required<LevelBonus>, l: LevelBonus): void {
  into.projectiles += l.projectiles ?? 0;
  into.pierce += l.pierce ?? 0;
  into.area *= l.area ?? 1;
  into.duration *= l.duration ?? 1;
  into.echo ||= l.echo ?? false;
  into.chain += l.chain ?? 0;
  into.damage *= l.damage ?? 1;
  into.cooldown *= l.cooldown ?? 1;
  into.speed *= l.speed ?? 1;
  into.knockback += l.knockback ?? 0;
  // College (the Highlighter): a multiplier on the mark's multiplier, so it multiplies.
  into.mark *= l.mark ?? 1;
}

/**
 * Everything the levels an active item has reached add up to. Counts sum,
 * multipliers multiply, echo latches. The sim's only reading of `levels`.
 */
/**
 * Computed once per (item, level) and shared: the sim reads this every step
 * for orbit items, and the hot path must not allocate (AUDIT part three, 21).
 * Callers read it and never mutate it.
 */
const bonusCache = new WeakMap<ActiveItem, Array<Required<LevelBonus>>>();

export function levelBonus(def: ActiveItem, level: number): Required<LevelBonus> {
  let perLevel = bonusCache.get(def);
  if (!perLevel) bonusCache.set(def, (perLevel = []));
  const hit = perLevel[level];
  if (hit) return hit;
  const out = emptyBonus();
  perLevel[level] = out;
  for (const l of def.levels.slice(0, Math.max(0, level))) foldBonus(out, l);
  return out;
}
