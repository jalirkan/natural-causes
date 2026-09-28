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
  | 'aura'
  | 'sweep'
  | 'bolt'
  | 'vendetta'
  | 'jump'
  | 'reach'
  | 'hindsight'
  | 'rut';

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
  /** Multiplier on how long a trail or attractor lasts. */
  duration?: number;
  /** A burst repeats once, 0.25s later, wherever the player is then. */
  echo?: boolean;
  /** On hit, a seeking shot jumps to this many further nearby enemies. */
  chain?: number;
  /** Multiplier on damage per hit, on top of the generic per-level scaling. */
  damage?: number;
  /** Multiplier on the cooldown (orbit and aura: the per-enemy re-hit). Below 1 is sooner. */
  cooldown?: number;
  /** Multiplier on projectile speed; for `orbit`, on how fast the orbiters go round. */
  speed?: number;
  /** Extra pixels a hit pushes a non-boss enemy away from the player. Adds to `knockback`. */
  knockback?: number;
}

export interface ItemLevel extends LevelBonus {
  /** The offer-card line for REACHING this level. Under 64 characters. */
  text: string;
}

/**
 * A branch of a weapon (G-043): a named direction its owner can push it in,
 * offered as its own card ("Grudge · Company") once the weapon has opened
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
   * a random enemy within `range` and, after a telegraph, lands a one-shot
   * area of `radius` where it was (G-044).
   */
  mode: 'seeking' | 'line' | 'burst' | 'trail' | 'attractor' | 'orbit' | 'field' | 'aura' | 'sweep' | 'strike';
  /**
   * Pixels. Meaning depends on mode: travel range, burst radius, pull radius,
   * orbit distance, a sweep's reach, a strike's targeting range. Seconds for
   * `trail` and `field`. Unused by `aura`, whose ring is `radius`.
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
  /** Pixels a hit pushes a non-boss enemy away from the player. */
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
   * `trail` (Rut, G-046) each footprint holds the same way as it hurts.
   */
  slow?: number;
  /**
   * `strike` only: seconds from the pick to the landing. Absent means
   * `STRIKE_DELAY` (world.ts). Zero is no telegraph: the bolt lands on the
   * step it is fired (Hindsight, G-046).
   */
  strikeDelay?: number;
  /**
   * Present on an evolution. It is never in the normal offer pool: when
   * `weapon` is at its max level and `with` is owned, the next level-up is
   * this one card, and taking it replaces `weapon`.
   */
  evolvesFrom?: { weapon: string; with: string };
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
    name: 'Reflex',
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
    blurb: 'Flinches at whatever is nearest. It got you this far.',
    levels: table(
      [
        'Flinches at whatever is nearest. It got you this far.',
        'Flinches harder. It has had practice.',
        'A second flinch, at the next-nearest thing.',
        'Flinches straight through one thing into another.',
        'A third flinch. Nobody nearby is safe.',
        'Harder still. You do not even notice anymore.',
        'A fourth flinch. It is basically a personality.',
        'Every flinch goes through one more of them.',
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
        name: 'Twitch',
        blurb: 'Flinches sooner every time. It saw that coming.',
        maxLevel: 3,
        levels: table(
          [
            'Flinches sooner. You were already braced.',
            'Sooner again. You flinch at your own shadow.',
            'Before anything happens. Jumpy is a lifestyle.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'overreaction',
        name: 'Overreaction',
        blurb: 'Every flinch hits harder than the thing deserved.',
        maxLevel: 3,
        levels: table(
          [
            'Harder than it needed to be. Much harder.',
            'Harder again. Someone brushed past you.',
            'Wildly out of proportion. It felt justified.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'nerves',
        name: 'Nerves',
        blurb: 'More flinches at once. Everything is a threat now.',
        maxLevel: 2,
        levels: table(
          [
            'One more flinch at once. You are on edge.',
            'Another. You have not relaxed since conception.',
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
    name: 'Stubbornness',
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
        'Harder. You have made your mind up.',
        'One shot backwards. You hate that it works.',
        'Harder again. Nobody talks you out of anything.',
        'Two more, either side of forward. Still forward.',
        'Harder. The direction has become a principle.',
        'Wider shots. The line is now a lane.',
        'At full strength. You were right all along.',
      ],
      { 3: { projectiles: 1 }, 5: { projectiles: 2 }, 7: { area: 1.35 } },
    ),
    paths: [
      {
        id: 'conviction',
        name: 'Conviction',
        blurb: 'Hits harder. You are not changing your mind.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. You have never once been wrong.',
            'Harder again. Evidence only makes it worse.',
            'Unshakeable. You would die on this hill.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'momentum',
        name: 'Momentum',
        blurb: 'Faster shots. Stopping was never the plan.',
        maxLevel: 3,
        levels: table(
          [
            'Faster. You decided before you left.',
            'Faster again. Brakes are for people with doubts.',
            'Nothing slows it down. Nothing ever has.',
          ],
          {},
          each(1, 3, { speed: 1.3 }),
        ),
      },
      {
        id: 'broadside',
        name: 'Broadside',
        blurb: 'More shots at once. Stubborn in several directions.',
        maxLevel: 3,
        levels: table(
          [
            'One more shot. Still forward, just more of it.',
            'Another. You are right in more directions now.',
            'Another. A whole front of being right.',
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
    name: 'Temper',
    kind: 'weapon',
    mode: 'burst',
    cooldown: 1.4,
    damage: 5,
    range: 96,
    projectileSpeed: 0,
    radius: 96,
    pierce: 99,
    maxLevel: 8,
    icon: 'burst',
    blurb: 'Hurts everything you touch. You will have to touch them.',
    levels: table(
      [
        'Hurts everything you touch. You will have to touch them.',
        'Reaches a little further. So does your reputation.',
        'Wider again. People have started to step back.',
        'Goes off twice. The second one is about the first.',
        'Wider. Everyone within reach has an opinion now.',
        'Wider still. It is not you, it is everyone.',
        'Wider. The room goes quiet when you walk in.',
        'As wide as it gets. Something has to give.',
      ],
      { 4: { echo: true } },
      each(2, 8, { area: 1.1 }),
    ),
    paths: [
      {
        id: 'short-fuse',
        name: 'Short Fuse',
        blurb: 'Goes off sooner. It never took much.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. It does not take much any more.',
            'Sooner again. Breakfast was enough.',
            'Goes off at nothing. Everyone walks on eggshells.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
      {
        id: 'blast-radius',
        name: 'Blast Radius',
        blurb: 'Wider. The bystanders are involved now.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. The next table can hear it.',
            'Wider again. The neighbours can hear it.',
            'The whole street heard. Nobody mentions it.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'slammed-door',
        name: 'Slammed Door',
        blurb: 'Throws them back. You needed the room anyway.',
        maxLevel: 3,
        levels: table(
          [
            'Pushes them away. The frame rattles.',
            'Further. The pictures fall off the wall.',
            'Further still. The door will not close again.',
          ],
          {},
          each(1, 3, { knockback: 25 }),
        ),
      },
    ],
    enables:
      'A body-check build that wants to be inside the crowd rather than away from it, and the only weapon in the act that scales with how bad the player’s position is. Maxed beside Restlessness, it becomes Tantrum.',
    tradesAway:
      'Range, entirely. It cannot touch the spermicide ring, it cannot open on a white cell safely, and every use of it is paid for in contact damage first.',
  },

  wake: {
    id: 'wake',
    name: 'Baggage',
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
        'Lingers longer. You never quite put it down.',
        'Lingers longer. Some of it is still from school.',
        'Longer again. It follows you into every room.',
        'Wider and longer. You take up two seats now.',
        'Longer. You have stopped noticing the weight.',
        'Longer. It has its own luggage.',
        'The widest trail you can carry. Keep moving.',
      ],
      { 5: { area: 1.2 }, 8: { area: 1.2 } },
      each(2, 8, { duration: 1.15 }),
    ),
    paths: [
      {
        id: 'hoarding',
        name: 'Hoarding',
        blurb: 'Lingers longer. You never throw anything away.',
        maxLevel: 3,
        levels: table(
          [
            'Lingers longer. You kept the receipts.',
            'Longer again. The boxes have boxes.',
            'It never goes. You might need it someday.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'dead-weight',
        name: 'Dead Weight',
        blurb: 'Hurts more. Some of it was always heavy.',
        maxLevel: 3,
        levels: table(
          [
            'Heavier. It hurts whoever steps in it.',
            'Heavier again. You feel it in your back.',
            'The heaviest thing you own. You still own it.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'sprawl',
        name: 'Sprawl',
        blurb: 'A wider trail. Your things are everywhere.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. It spills into the next lane.',
            'Wider again. It needs a room of its own.',
            'Wider still. It takes up the whole hallway.',
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
    // PLACEHOLDER: bigger and faster than a maxed Temper, and nothing more
    // considered than that.
    cooldown: 0.8,
    damage: 7,
    range: 210,
    projectileSpeed: 0,
    radius: 210,
    pierce: 99,
    knockback: 70,
    maxLevel: 1,
    icon: 'burst',
    blurb: 'Everything nearby, at once, and then further away.',
    levels: table(['Everything nearby, at once, and then further away.']),
    evolvesFrom: { weapon: 'acrosome', with: 'midpiece' },
    enables:
      'The Temper build finished: the burst that needed the player inside the crowd now throws the crowd back out of it, so standing in the middle stops being the price of the weapon.',
    tradesAway:
      'Temper, which it replaces, and the choosing: it is offered alone the moment it is possible. The knockback also scatters a crowd that Charisma or Baggage wanted kept together.',
  },

  grudge: {
    id: 'grudge',
    name: 'Grudge',
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
        'Hits harder. You have been rehearsing it.',
        'A second grudge. They keep each other company.',
        'Held a little further out. Still close.',
        'A third. You have a rotation now.',
        'Harder. You remember exactly what they said.',
        'A fourth. You never forgot a single one.',
        'The widest circle of grievance. Keep it turning.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.15 }, 5: { projectiles: 1 }, 7: { projectiles: 1 }, 8: { area: 1.15 } },
    ),
    paths: [
      {
        id: 'company',
        name: 'Company',
        blurb: 'More fists. A grudge loves company.',
        maxLevel: 3,
        levels: table(
          [
            'One more fist. It found an old friend.',
            'Another. They meet on Thursdays.',
            'Another. It is a support group now.',
          ],
          {},
          each(1, 3, { projectiles: 1 }),
        ),
      },
      {
        id: 'spiralling',
        name: 'Spiralling',
        blurb: 'Faster round. You cannot stop thinking about it.',
        maxLevel: 3,
        levels: table(
          [
            'Faster. You went over it again last night.',
            'Faster again. You replay it in the shower.',
            'It never stops. You win the argument every time.',
          ],
          {},
          each(1, 3, { speed: 1.3 }),
        ),
      },
      {
        id: 'weight',
        name: 'Weight',
        blurb: 'Hits harder. It gets heavier every year.',
        maxLevel: 3,
        levels: table(
          [
            'Heavier. You add to it every day.',
            'Heavier again. It is accruing interest.',
            'It weighs a ton. You would never put it down.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
    ],
    enables:
      'A build that stands its ground: the orbiters work at a fixed short distance whatever the player does, so it pairs with anything that brings the crowd close — Charisma, Thick Skin, Temper.',
    tradesAway:
      'Reach. It never touches anything further than one orbit away, a fast enemy slips through the gap between orbiters, and it cannot aim at anything at all.',
  },

  // G-041: the weapon is Gossip. Group Chat is the Adolescence enemy
  // (ADOLESCENCE-ROSTER §3.5); the id stays so nothing that keys on it moves.
  'group-chat': {
    id: 'group-chat',
    name: 'Gossip',
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
    blurb: 'Hits one, and then everyone it knows.',
    levels: table(
      [
        'Hits one, and then everyone it knows.',
        'Hits harder. Somebody screenshotted it.',
        'Sends sooner. Someone is always typing.',
        'Reaches one more person. It was not meant to.',
        'Harder. Now it is a thread.',
        'Sooner again. Everyone has notifications on.',
        'Reaches one more. Nobody has left the chat.',
        'At full volume. The whole school has seen it.',
      ],
      { 1: { chain: 2 }, 4: { chain: 1 }, 7: { chain: 1 } },
    ),
    paths: [
      {
        id: 'mutuals',
        name: 'Mutuals',
        blurb: 'Jumps to more of them. Everyone knows someone.',
        maxLevel: 3,
        levels: table(
          [
            'Reaches one more. You have a friend in common.',
            'Another. They were in the same year.',
            'Another. Nobody here is a stranger.',
          ],
          {},
          each(1, 3, { chain: 1 }),
        ),
      },
      {
        id: 'screenshots',
        name: 'Screenshots',
        blurb: 'Hits harder. There is proof, and it is cropped.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. Somebody took a screenshot.',
            'Harder again. It was cropped for context.',
            'It will outlive you. Nothing is ever deleted.',
          ],
          {},
          each(1, 3, { damage: 1.25 }),
        ),
      },
      {
        id: 'notifications',
        name: 'Notifications',
        blurb: 'Sends sooner. Nobody has their phone on silent.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. Someone is always typing.',
            'Sooner again. The badge never clears.',
            'Constant. You check it in your sleep.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A crowd-clearing build for a seeking player: one shot becomes three in a dense crowd, so it scales with exactly the density that ends a Reflex run.',
    tradesAway:
      'Anything alone. Against a single target — a white cell, the boss — the chain has nowhere to go and it is a slow, ordinary shot on a long cooldown.',
  },

  // --- 4.2 Control ------------------------------------------------------
  chemotaxis: {
    id: 'chemotaxis',
    name: 'Charisma',
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
    blurb: 'Everything finds you attractive.',
    levels: table(
      [
        'Everything finds you attractive.',
        'Pulls from further. Your reputation precedes you.',
        'Further. People cross rooms for this.',
        'Further again. Strangers know your name.',
        'Further. It is a problem, honestly.',
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
        name: 'Magnetism',
        blurb: 'Pulls from further. They heard about you first.',
        maxLevel: 3,
        levels: table(
          [
            'Further. You come up at parties you missed.',
            'Further again. Friends of friends have opinions.',
            'From across town. Nobody remembers meeting you.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'staying-power',
        name: 'Staying Power',
        blurb: 'The pull lasts longer. Nobody wants to leave first.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. They stay for one more story.',
            'Longer again. Somebody missed the last bus.',
            'Nobody leaves. The party is wherever you are.',
          ],
          {},
          each(1, 3, { duration: 1.25 }),
        ),
      },
      {
        id: 'small-talk',
        name: 'Small Talk',
        blurb: 'Pulls sooner. You never run out of things to say.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You remember everyone by name.',
            'Sooner again. You ask about their weekend.',
            'Sooner still. Even the wallflowers come over.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'Every area weapon in the act at once, by choosing where the crowd will be instead of reacting to it. It is the item that makes Temper and Baggage into builds rather than options.',
    // Extended 2026-08-01 after Run 5 (§10.2). Chemotaxis is the largest
    // measured driver of antibody stacks in the act — r=+0.462, 6.7 against
    // 3.3 — and its text did not mention them. The mechanic is intended
    // (G-023); the invisibility was the defect. A cost the player cannot
    // perceive is not a trade.
    tradesAway:
      'Its own damage, which is zero, and its safety margin: pulling a crowd into a tight point is exactly how a run ends for a player who has nothing to clear it with. It does not discriminate either, so it gathers the antibodies too, which are the one thing in the act that cannot be cleared at all.',
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
      'Every build that depends on not being touched, and every weapon at once through the cooldown. It is also what turns a maxed Temper into Tantrum.',
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
      'Standing inside the crowd on purpose, which is the precondition for the Temper build and the only way to farm the rival wave rather than outrun it.',
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
      'Builds that want the crowd held where it is: Baggage lays more trail over a crowd that crosses it at half speed, Temper and Grudge get twice as long with everything inside, and an aimed shot through the field arrives late enough to step round.',
    tradesAway:
      'Escaping. The field is dropped where the player stands and holds the player too, so the one thing it cannot do is get anyone out of a crowd; a player caught inside it walks out at half speed with everything else.',
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
    name: 'Personal Space',
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
    blurb: 'Whatever stands too close gets hurt. You did ask nicely.',
    levels: table(
      [
        'Whatever stands too close gets hurt. You did ask nicely.',
        'A little more room. You need it.',
        'More room again. People have started to notice.',
        'It hurts more to be near you now.',
        'Wider. You take both armrests.',
        'Wider. Strangers cross the road.',
        'It hurts more. Hugging is off the table.',
        'As much room as it gets. Nobody sits next to you.',
      ],
      { 2: { area: 1.1 }, 3: { area: 1.1 }, 4: { damage: 1.2 }, 5: { area: 1.1 }, 6: { area: 1.1 }, 7: { damage: 1.2 }, 8: { area: 1.1 } },
    ),
    paths: [
      {
        id: 'boundaries',
        name: 'Boundaries',
        blurb: 'A wider ring. You have been reading about this.',
        maxLevel: 3,
        levels: table(
          [
            'Wider. You said it out loud this time.',
            'Wider again. You have a therapist now.',
            'As wide as it goes. It is healthy, apparently.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'cold-shoulder',
        name: 'Cold Shoulder',
        blurb: 'It hurts more to be near you. You do not look up.',
        maxLevel: 3,
        levels: table(
          [
            'Hurts more. You answer in single words.',
            'Hurts more again. You have stopped answering.',
            'It hurts to be in the same room as you.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
      {
        id: 'hovering',
        name: 'Hovering',
        blurb: 'They hover. It costs them sooner every time.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. They are still standing there.',
            'Sooner again. They read over your shoulder.',
            'Sooner still. They have not taken the hint.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A build that never aims and never stops: the ring hurts whatever stands in it, so it rewards being inside the crowd for exactly as long as the player can afford it, and pairs with Thick Skin, Charisma and Grudge.',
    tradesAway:
      'Reach and burst. It touches nothing further than arm’s length, it deals little to any one thing at a time, and a crowd it cannot kill fast enough is standing exactly where it also hurts the player.',
  },

  backhand: {
    id: 'backhand',
    name: 'Backhand',
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
    blurb: 'Swats whatever is in front of you. It was a compliment.',
    levels: table(
      [
        'Swats whatever is in front of you. It was a compliment.',
        'Harder. You are only being honest.',
        'One behind you as well. You had eyes back there.',
        'Longer reach. You mean it in the nicest way.',
        'Harder. It is not a criticism, it is a note.',
        'Longer reach again. It lands from across the room.',
        'One to your left. That hand has opinions too.',
        'Knocks them further. They will think about it later.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.15 }, 5: { damage: 1.2 }, 6: { area: 1.15 }, 7: { projectiles: 1 }, 8: { knockback: 20 } },
    ),
    paths: [
      {
        id: 'wingspan',
        name: 'Wingspan',
        blurb: 'Longer reach. You were always going to grow into it.',
        maxLevel: 3,
        levels: table(
          [
            'Longer. Your arms caught up with your opinions.',
            'Longer again. You can reach the top shelf.',
            'As long as it gets. Nobody is out of range.',
          ],
          {},
          each(1, 3, { area: 1.15 }),
        ),
      },
      {
        id: 'follow-through',
        name: 'Follow-Through',
        blurb: 'Sends them further. You always finish the thought.',
        maxLevel: 3,
        levels: table(
          [
            'Further. You meant every word.',
            'Further again. You said it louder.',
            'As far as it goes. They will not be back soon.',
          ],
          {},
          each(1, 3, { knockback: 25 }),
        ),
      },
      {
        id: 'snap',
        name: 'Snap',
        blurb: 'Swats sooner. You have stopped counting first.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. You did not let them finish.',
            'Sooner again. You started before they did.',
            'Sooner still. There is no pause to regret it in.',
          ],
          {},
          each(1, 3, { cooldown: 0.85 }),
        ),
      },
    ],
    enables:
      'A melee build that aims by walking: the arc hits everything in front of the player at once and shoves it back, so it rewards facing the crowd and pushing into it, and it clears the flanks a Stubbornness line leaves open.',
    tradesAway:
      'Everything behind and beside the player until the extra swats arrive, and anything past arm’s reach. It swings on its cooldown whether or not anything is there, so a player walking away from the crowd is swatting the air.',
  },

  judgement: {
    id: 'judgement',
    name: 'Judgement',
    kind: 'weapon',
    mode: 'strike',
    cooldown: 1.6,
    damage: 9,
    // How far away a target may be picked, in pixels.
    range: 300,
    projectileSpeed: 0,
    // What the bolt hits where it lands.
    radius: 48,
    pierce: 99,
    maxLevel: 8,
    icon: 'bolt',
    blurb: 'Something up there has opinions. It comes down on one of them.',
    levels: table(
      [
        'Something up there has opinions. It comes down on one of them.',
        'Harder. The opinions have hardened into views.',
        'A second one, on someone else. There is a list.',
        'Wider. It takes the neighbours with it.',
        'Harder. It has read your file.',
        'A third, on someone else again. The list is long.',
        'Sooner. It no longer waits for all the facts.',
        'As wide as it gets. Everyone nearby is implicated.',
      ],
      { 3: { projectiles: 1 }, 4: { area: 1.2 }, 5: { damage: 1.2 }, 6: { projectiles: 1 }, 7: { cooldown: 0.85 }, 8: { area: 1.2 } },
    ),
    paths: [
      {
        id: 'verdict',
        name: 'Verdict',
        blurb: 'Lands harder. The deliberation was brief.',
        maxLevel: 3,
        levels: table(
          [
            'Harder. Nobody else was consulted.',
            'Harder again. The appeal was denied.',
            'As hard as it gets. The ruling is not reviewed.',
          ],
          {},
          each(1, 3, { damage: 1.3 }),
        ),
      },
      {
        id: 'docket',
        name: 'Docket',
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
        name: 'Summary',
        blurb: 'Sooner. Nobody has time for a full hearing.',
        maxLevel: 3,
        levels: table(
          [
            'Sooner. The hearing was a formality.',
            'Sooner again. It skips the hearing.',
            'Sooner still. It decided before you arrived.',
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
    name: 'Vendetta',
    kind: 'weapon',
    mode: 'orbit',
    // Orbit never activates; this is how often one fist may hit one enemy.
    cooldown: 0.4,
    damage: 4,
    range: 90,
    projectileSpeed: 260,
    radius: 16,
    pierce: 99,
    // Orbit hits push only when this is set (updateOrbiters).
    knockback: 40,
    maxLevel: 1,
    icon: 'vendetta',
    blurb: 'Nobody remembers what started it. Everyone gets shoved.',
    levels: table(['Nobody remembers what started it. Everyone gets shoved.'], { 1: { projectiles: 3 } }),
    evolvesFrom: { weapon: 'grudge', with: 'membrane' },
    enables:
      'The Grudge build finished: every fist now shoves what it hits outward, so the orbit clears its own ring and keeps the crowd off a player who was standing in it on Thick Skin anyway.',
    tradesAway:
      'Grudge, which it replaces with any path taken on it, and the choosing: it is dealt alone the moment it is possible. The shove also leaves what it hits just outside the circle, where no fist reaches it until it walks back in.',
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
      'The Reflex build finished: more flinches a second than a maxed Reflex, from further away and faster, so the weapon every life starts with fills the air around a player Restlessness already keeps on the move.',
    tradesAway:
      'Reflex, which it replaces with any path taken on it, and the choosing. It still fires at whatever is nearest rather than what matters, every flinch stops in the first thing it hits, and it has no area at all.',
  },

  reach: {
    id: 'reach',
    name: 'Reach',
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
      'The Backhand build finished: the swat goes all the way round, so the melee build that had to face the crowd no longer has a back to be caught from, and Growth Spurt carries the circle further out.',
    tradesAway:
      'Backhand, which it replaces with any path taken on it, and the choosing. It swings less often than the hand it replaced, it still touches nothing past arm’s length, and the shove scatters a crowd an area weapon wanted kept close.',
  },

  hindsight: {
    id: 'hindsight',
    name: 'Hindsight',
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
      'The Judgement build finished: the bolts come down the moment they are picked, so nothing fast gets out from under them, and Late Bloomer’s late-act damage lands on exactly the spot it was aimed at.',
    tradesAway:
      'Judgement, which it replaces with any path taken on it, and the choosing. It still picks at random rather than what is dangerous, it still ignores what is touching the player, and with no warning nobody can read where the next one falls.',
  },

  rut: {
    id: 'rut',
    name: 'Rut',
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
      'The Baggage build finished: whatever follows the player across the trail is held in it while it hurts, so a chasing crowd spends longer in the footprints and arrives later.',
    tradesAway:
      'Baggage, which it replaces with any path taken on it, and the choosing. It holds only what follows: the player walks their own trail at full speed, and a cornered player is still holding a weapon that has stopped existing.',
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

/** Every field a `Required<LevelBonus>` starts from: the identity for each. */
export function emptyBonus(): Required<LevelBonus> {
  return { projectiles: 0, pierce: 0, area: 1, duration: 1, echo: false, chain: 0, damage: 1, cooldown: 1, speed: 1, knockback: 0 };
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
