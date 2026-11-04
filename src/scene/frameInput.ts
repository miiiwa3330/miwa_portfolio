/**
 * The reader's mouse and keys over the PC's browser (`hub/desk/PcBrowser`),
 * for the room. The browser shows miiiwa.com in an `<iframe>`, a document of
 * its own: what happens in it never reaches this window's listeners, so the
 * mouse on the desk (`useDeskMouse`), the cursor drawn on the screen
 * (`hub/desk/ScreenCursor`) and the keyboard (`useKeyPresses`) would stop
 * the moment the reader's pointer or focus went into the page. The browser
 * listens in the frame (same origin) and passes them on here.
 *
 * A plain module value with listeners, as `deskPointer.ts` is: it changes
 * with every move of the pointer.
 */
export type FrameInput =
  /** The pointer over the frame, `at` in the PC screen's px (`frameToScreen`); `at` null as it leaves. `buttons` as `PointerEvent.buttons`. */
  | { kind: "pointer"; type: "move" | "down" | "up"; at: { x: number; y: number } | null; buttons: number; target: EventTarget | null }
  | { kind: "wheel"; deltaY: number }
  | { kind: "key"; type: "down" | "up"; code: string };

export type FrameInputChannel = {
  emit: (input: FrameInput) => void;
  on: (listener: (input: FrameInput) => void) => () => void;
};

function frameInputChannel(): FrameInputChannel {
  const listeners = new Set<(input: FrameInput) => void>();
  return {
    emit: (input) => {
      for (const listener of listeners) listener(input);
    },
    on: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The PC's browser — the one frame in the room. */
export const pcFrameInput = frameInputChannel();

/**
 * A point in the frame's own px (its `clientX`/`clientY`) on the PC's screen,
 * in the screen's px: the frame's top left on the screen, and how much larger
 * the frame is drawn than it is laid out (`transform: scale`).
 */
export function frameToScreen(point: { x: number; y: number }, origin: { x: number; y: number }, scale: number): { x: number; y: number } {
  return { x: origin.x + point.x * scale, y: origin.y + point.y * scale };
}
