import { cursorFromMouse } from "./room/mouse";

/**
 * The PC's mouse and its cursor, between the three things that show them:
 * the mouse on the desk (`objects/ExgMouse`, which owns the value), the
 * cursor drawn on the PC's screen (`hub/desk/ScreenCursor`), and the seated
 * reader's right hand, which rests on the mouse (`objects/Self`).
 *
 * A plain module value rather than React state, for the reason
 * `camera/viewChannel.ts` gives: it changes every frame the mouse slides,
 * and anything carried through React from above the `<Canvas>` re-renders
 * the whole three.js tree. See docs/scene-invariants.md, "React / R3F の境界".
 */
export type DeskPointer = {
  /** How far the mouse is from where it rests, in the desk's frame (metres, x and z). */
  mouse: [number, number];
  /** The cursor's place on the PC's screen, in its CSS px — always where the mouse puts it (`cursorFromMouse`). */
  cursor: { x: number; y: number };
  /** The reader's own pointer is on the PC's screen, so the drawn cursor stands aside for the real one. */
  overScreen: boolean;
};

const current: DeskPointer = { mouse: [0, 0], cursor: cursorFromMouse([0, 0]), overScreen: false };
const listeners = new Set<(pointer: Readonly<DeskPointer>) => void>();

/** Now. Safe to call from a frame, an effect or an event handler. */
export function deskPointerNow(): Readonly<DeskPointer> {
  return current;
}

/** Called by the mouse. A no-op when nothing changed. */
export function publishDeskPointer(next: DeskPointer): void {
  if (
    current.mouse[0] === next.mouse[0] &&
    current.mouse[1] === next.mouse[1] &&
    current.cursor.x === next.cursor.x &&
    current.cursor.y === next.cursor.y &&
    current.overScreen === next.overScreen
  )
    return;
  current.mouse = [next.mouse[0], next.mouse[1]];
  current.cursor = { ...next.cursor };
  current.overScreen = next.overScreen;
  for (const listener of listeners) listener(current);
}

/** Subscribe. Delivers the current value at once; returns an unsubscribe. */
export function onDeskPointer(listener: (pointer: Readonly<DeskPointer>) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
