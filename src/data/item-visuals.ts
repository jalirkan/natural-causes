import iconsAtlasPng from '../../assets/atlas/icons.png';
import iconsAtlasJson from '../../assets/atlas/icons.json';
import type { ItemIcon } from './items';

/**
 * The offer cards' art. Game-wide (items are not act-scoped), so it is its own
 * atlas rather than a tenant of an act's — loading School should not re-fetch
 * the cards.
 *
 * Through the same pipeline as every sprite (G-034): the icons are OBJECTS
 * FROM THE LIFE in the mid-century register — a printer's manicule for
 * Reflex, a sneaker for Restlessness, an umbrella for Thick Skin, an alarm
 * clock for the late bloomer — quantised to the locked palette and mechanically
 * checked against the ink card surface they actually sit on. Every icon that
 * also rides the field (a shot, an orbiter, a stamp) is authored SVG in rose,
 * bone and ink, and a law-10 test holds it to that (laws.test.ts).
 *
 * Grudge, Gossip, Appetite, Growth Spurt and Snooze are drawn rather than
 * generated (G-038, `tools/art/svg/conception/icon-{orbit,chain,magnet,grow,slow}.svg`)
 * and go through the same CONFORM and CHECK: a fist standing in an orbit ring,
 * three dots on one bent line, a plate between a fork and a knife, a rule on
 * end with an arrow past its top, a bell-less clock with a z. The frame name
 * is the icon tag, not the item — Appetite's tag is `magnet` (its mechanic,
 * pickup reach), so its plate is `icon-magnet.png`; Charisma's horseshoe
 * magnet is `pull`; Snooze's clock is `slow`, and Capacitation's twin-bell
 * clock is `clock`.
 *
 * G-044's three are drawn too (`icon-{aura,sweep,bolt}.svg`): a velvet rope
 * barrier for Personal Space, an open hand mid-swing for Backhand, a gavel
 * about to land for Judgement. All three also appear on the field (the ring,
 * the sweep's edge, the bolt's target), so they keep to rose, bone and ink.
 */
export const ITEM_ICON_ATLAS = {
  key: 'nc-icons',
  png: iconsAtlasPng,
  json: iconsAtlasJson as object,
};

export function itemIconFrame(icon: ItemIcon): string {
  return `icon-${icon}.png`;
}
