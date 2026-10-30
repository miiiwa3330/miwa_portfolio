import { useSyncExternalStore } from "react";

/**
 * Which of the desk's machines the reader's own keyboard types on: the PC
 * (the HHKB) or the Macintosh (its M0110) — the one whose screen the
 * seated reader is looking at (`deskView`, 2026-10-23; before, the one last
 * pressed), the PC again on standing up. This is what tells the two
 * keyboards apart: without it, a key pressed while seated went down on both.
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

/** The machine the reader types on, re-rendering when it changes (rarely: a turn to or from the Mac). */
export function useDeskFocus(): Machine {
  return useSyncExternalStore(subscribe, deskFocusNow, () => "pc");
}
