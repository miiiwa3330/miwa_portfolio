/**
 * What the hologram fan is showing: the time, or the self-introduction
 * rolling up it (2026-10-25, the user: the PC's `自己紹介.holo` switches it;
 * the roll over, it goes back to the time). Set from the PC's screen
 * (`hub/desk/DeskScreen`) and by the fan when its roll is over; read by the
 * fan (`objects/HoloFan`).
 *
 * A plain module value, as `deskView` is: the PC's screen is HTML above the
 * canvas and the fan is in it, and nothing renders by it.
 */

export type FanShow = "clock" | "about";

let current: FanShow = "clock";
const listeners = new Set<(show: FanShow) => void>();

export function fanShowNow(): FanShow {
  return current;
}

/** Show the time or the self-introduction. Showing the self-introduction again starts it over. */
export function setFanShow(next: FanShow): void {
  if (next === current && next === "clock") return;
  current = next;
  for (const listener of listeners) listener(next);
}

/** Subscribe; returns an unsubscribe. */
export function onFanShow(listener: (show: FanShow) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
