import { useSyncExternalStore } from "react";

/**
 * Which of the desk's machines the reader's own keyboard types on: the PC
 * (the HHKB) or the Macintosh (its M0110). The one last used — a key, the
 * mouse or the screen pressed — while seated; the PC again on standing up.
 * Until the virtual cursor (step 6, docs/devlog/202610.md) moves the gaze
 * between screens, this is what tells the two keyboards apart: before it,
 * a key pressed while seated went down on both.
 */
export type Machine = "pc" | "mac";

let current: Machine = "pc";
const listeners = new Set<() => void>();

export function deskFocusNow(): Machine {
  return current;
}

export function setDeskFocus(next: Machine): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The machine the reader types on, re-rendering when it changes (rarely: a click on the other machine). */
export function useDeskFocus(): Machine {
  return useSyncExternalStore(subscribe, deskFocusNow, () => "pc");
}
