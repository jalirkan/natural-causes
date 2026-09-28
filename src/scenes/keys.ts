/**
 * Key events, taken once.
 *
 * Phaser 3.90 keeps a frame's DOM key events in a queue and re-runs the whole
 * queue on every new DOM key event until the frame ends; its only guard drops
 * a replay that matches the event processed just before it. So two key events
 * inside one frame re-fire the first: typing "Ma" arrived as "MMa", a P became
 * pause-then-unpause, a 1 chose a card and then the next offer's card unseen.
 *
 * A replay is the same event object, so the guard is identity — two genuine
 * presses are two objects and both count. Each wrapped handler keeps its own
 * record, so every handler listening to one event still hears it once.
 * No Phaser here, so it runs under the unit tests.
 */
export function oncePerEvent<E extends object>(handler: (e: E) => void): (e: E) => void {
  const taken = new WeakSet<E>();
  return (e: E) => {
    if (taken.has(e)) return;
    taken.add(e);
    handler(e);
  };
}
