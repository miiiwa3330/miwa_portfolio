import type { Framing } from "./roomCamera";

/**
 * How the camera is drawing right now: its lens, field of view and the two
 * shifts of the projection — the parts of the pose that decide where things
 * land on screen.
 *
 * The camera's controller writes it every frame; the fisheye renderer, the
 * markers and the click test read it in the same frame. A plain module value
 * rather than React state, for the reason `markerScreen.ts` and
 * `state/facingChannel.ts` give: a per-frame value in a context above the
 * `<Canvas>` re-renders the whole three.js tree each time it changes. DOM
 * consumers (HTML placed in the room hides itself while the lens is bent)
 * subscribe with `onLens`.
 */

const current: Framing = { hfov: 67, lens: 1, share: 0, lift: 0 };
const listeners = new Set<(lens: Readonly<Framing>) => void>();

/** The lens in effect right now. Safe to call from a frame, an effect or an event handler. */
export function lensNow(): Readonly<Framing> {
  return current;
}

/** Called by the camera each frame. A no-op when nothing changed. */
export function publishLens(framing: Framing): void {
  if (
    current.hfov === framing.hfov &&
    current.lens === framing.lens &&
    current.share === framing.share &&
    current.lift === framing.lift
  ) {
    return;
  }
  current.hfov = framing.hfov;
  current.lens = framing.lens;
  current.share = framing.share;
  current.lift = framing.lift;
  for (const listener of listeners) listener(current);
}

/** Subscribe to the lens changing. Delivers the current value at once; returns an unsubscribe. */
export function onLens(listener: (lens: Readonly<Framing>) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
