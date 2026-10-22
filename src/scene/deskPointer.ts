import { EXG_MAPPING, travelMapping, type TravelMapping } from "./room/mouse";
import { M0100_TRAVEL } from "./room/macMouse";

/**
 * A desk's mouse and its cursor, between the things that show them: the
 * mouse on the desk (which owns the value), the cursor drawn on its screen,
 * and — for the PC's — the seated reader's right hand, which rests on the
 * mouse (`objects/Self`). One channel per machine: the PC's (`ExgMouse`,
 * `hub/desk/ScreenCursor`) and the Macintosh's (`MacMouse`, the cursor drawn
 * in `Macintosh`).
 *
 * A plain module value rather than React state, for the reason
 * `camera/viewChannel.ts` gives: it changes every frame the mouse slides,
 * and anything carried through React from above the `<Canvas>` re-renders
 * the whole three.js tree. See docs/scene-invariants.md, "React / R3F の境界".
 */
export type DeskPointer = {
  /** How far the mouse is from where it rests, in the desk's frame (metres, x and z). */
  mouse: [number, number];
  /** The cursor's place on the screen, in its px — always where the mouse puts it (`cursorFromMouse`). */
  cursor: { x: number; y: number };
  /** The reader's own pointer is on the screen: the drawn cursor is right under it, and stands in for the real one, which is hidden (`hideRealCursorOverScreens`). */
  overScreen: boolean;
};

export type PointerChannel = {
  now: () => Readonly<DeskPointer>;
  /** Called by the mouse. A no-op when nothing changed. */
  publish: (next: DeskPointer) => void;
  /** Subscribe. Delivers the current value at once; returns an unsubscribe. */
  on: (listener: (pointer: Readonly<DeskPointer>) => void) => () => void;
};

function pointerChannel(mapping: TravelMapping): PointerChannel {
  const current: DeskPointer = { mouse: [0, 0], cursor: mapping.cursorFromMouse([0, 0]), overScreen: false };
  const listeners = new Set<(pointer: Readonly<DeskPointer>) => void>();
  return {
    now: () => current,
    publish: (next) => {
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
    },
    on: (listener) => {
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The Mac's mouse on its 512 × 342 screen. */
export const MAC_MAPPING = travelMapping(M0100_TRAVEL, { width: 512, height: 342 });

export const pcPointer = pointerChannel(EXG_MAPPING);
export const macPointer = pointerChannel(MAC_MAPPING);

/** The PC's channel by its old names. */
export const deskPointerNow = pcPointer.now;
export const publishDeskPointer = pcPointer.publish;
export const onDeskPointer = pcPointer.on;

/**
 * Hide the reader's own cursor while it is on either machine's screen, so
 * the cursor drawn there stands in for it (2026-10-23, the user: 「本物のカーソ
 * ルが画面内に重なったときは画面内のカーソルとして表示」). By an attribute on
 * the root that a rule in `globals.css` reads — over everything, the page's
 * links included, which would otherwise bring back their own hand. Returns
 * the undo.
 */
export function hideRealCursorOverScreens(): () => void {
  const root = document.documentElement;
  const sync = () => {
    const over = pcPointer.now().overScreen || macPointer.now().overScreen;
    if (over) root.setAttribute("data-screen-cursor", "");
    else root.removeAttribute("data-screen-cursor");
  };
  const offPc = pcPointer.on(sync);
  const offMac = macPointer.on(sync);
  return () => {
    offPc();
    offMac();
    root.removeAttribute("data-screen-cursor");
  };
}
