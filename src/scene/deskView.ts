import { deskViewMachine, type DeskView } from "./room/deskViews";
import { setDeskFocus } from "./deskFocus";

/**
 * Which of the desk's screens (and the hologram fan) a seated reader is looking at
 * (`room/deskViews.ts`): the PC's main screen when they sit down, and
 * another when they swipe to it. `Scene` turns the camera to it; the
 * reader's keyboard types on the machine it belongs to (`deskFocus`, the
 * user's choice: 「見ている画面の機械」).
 *
 * A plain module value, as `deskFocus` is: it is read from the frame loop
 * and from event handlers, and nothing above the canvas renders by it.
 */

let current: DeskView = "pc";
const listeners = new Set<(view: DeskView) => void>();

export function deskViewNow(): DeskView {
  return current;
}

/**
 * Look at another screen. A no-op when already there — unless `again`: the
 * reader has looked away from it with the mouse (`turnSeatedHead`), and is
 * turned back to it.
 */
export function setDeskView(next: DeskView, again = false): void {
  setDeskFocus(deskViewMachine(next));
  if (next === current && !again) return;
  current = next;
  for (const listener of listeners) listener(next);
}

/** Subscribe; returns an unsubscribe. */
export function onDeskView(listener: (view: DeskView) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
