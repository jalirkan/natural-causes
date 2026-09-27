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
 * `orbit`, `chain` and `magnet` have no art in the atlas yet — see
 * `iconPending`.
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
  | 'magnet';

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
}

export interface ItemLevel extends LevelBonus {
  /** The offer-card line for REACHING this level. Under 64 characters. */
  text: string;
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
  /** How the effect is delivered. The sim switches on this. */
  mode: 'seeking' | 'line' | 'burst' | 'trail' | 'attractor' | 'orbit';
  /**
   * Pixels. Meaning depends on mode: travel range, burst radius, pull radius,
   * orbit distance. Seconds for `trail`.
   */
  range: number;
  /** Pixels per second. For `orbit`, the orbiters' speed along the circle. */
  projectileSpeed: number;
  radius: number;
  pierce: number;
  /** Index = level - 1; length = maxLevel. What each level adds. */
  levels: ItemLevel[];
  /** Pixels a hit pushes a non-boss enemy away from the player. */
  knockback?: number;
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
   * Damage multiplier at the START of the act, ramping to `rampTo` by the end
   * of it. 1 and 1 means no ramp.
   */
  damageMultiplier: number;
  rampTo: number;
}

export type ItemDef = ActiveItem | PassiveItem;

/** Placeholder for icons the atlas does not hold yet (G-038's authored-SVG step). */
const ICON_PENDING =
  'No icon art exists yet; the renderer draws a lettered ring until the authored SVG icon set (G-038) lands in the atlas.';

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
    damage: 14,
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
    iconPending: ICON_PENDING,
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
    iconPending: ICON_PENDING,
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
    // Starts strictly worse than doing nothing and ends well ahead of it.
    damageMultiplier: 0.7,
    rampTo: 1.85,
    maxLevel: 5,
    icon: 'clock',
    blurb: 'Worthless for two minutes, then unstoppable.',
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
    damageMultiplier: 1,
    rampTo: 1,
    maxLevel: 5,
    icon: 'magnet',
    iconPending: ICON_PENDING,
    blurb: 'Everything on the floor is yours now.',
    enables:
      'A levelling build: gems come from further away, so a run reaches its max levels and its evolution sooner without walking into the crowd to collect them.',
    tradesAway:
      'Any effect on the fight itself. It kills nothing and blocks nothing, so a run that is losing now loses with more options on the table.',
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
 * Everything the levels an active item has reached add up to. Counts sum,
 * multipliers multiply, echo latches. The sim's only reading of `levels`.
 */
export function levelBonus(def: ActiveItem, level: number): Required<LevelBonus> {
  const out: Required<LevelBonus> = { projectiles: 0, pierce: 0, area: 1, duration: 1, echo: false, chain: 0 };
  for (const l of def.levels.slice(0, Math.max(0, level))) {
    out.projectiles += l.projectiles ?? 0;
    out.pierce += l.pierce ?? 0;
    out.area *= l.area ?? 1;
    out.duration *= l.duration ?? 1;
    out.echo ||= l.echo ?? false;
    out.chain += l.chain ?? 0;
  }
  return out;
}
