import { macStart, type MacState } from "./finder";

/**
 * What the Macintosh is showing (`finder.ts`), between the things that use
 * it: the Mac (`objects/Macintosh`, which changes it from the presses, the
 * keys and the time, and draws it), its keyboard (whose arrows press the
 * letters while a game is open) and the camera (`Scene`, which zooms to the
 * Mac's screen while a game is open).
 *
 * A plain module value, as `deskView` is: it changes every tick of a game,
 * and nothing above the canvas renders by it. `onMacOpen` hears only a game
 * opening or closing, not every tick.
 */

let current: MacState = macStart(Math.random);
const listeners = new Set<(state: MacState) => void>();
const openListeners = new Set<(open: boolean) => void>();

export function macNow(): MacState {
  return current;
}

/** Whether a game is open on the Mac (the view is zoomed to its screen then). */
export function macPlaying(): boolean {
  return current.open !== null;
}

/** Called by the Mac. A no-op when nothing changed. */
export function setMac(next: MacState): void {
  if (next === current) return;
  const opened = (next.open !== null) !== (current.open !== null);
  current = next;
  for (const listener of listeners) listener(next);
  if (opened) for (const listener of openListeners) listener(next.open !== null);
}

/** Subscribe to every change; returns an unsubscribe. */
export function onMac(listener: (state: MacState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe to a game opening or closing; returns an unsubscribe. */
export function onMacOpen(listener: (open: boolean) => void): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}
