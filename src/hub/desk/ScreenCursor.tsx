"use client";

import { useEffect, useRef } from "react";
import { cursorShown, hideRealCursorOverScreens, onDeskPointer } from "@/scene/deskPointer";

/**
 * The PC's cursor, drawn on its screen where the mouse on the desk puts it
 * (`deskPointer`, `cursorFromMouse`): slide the mouse and it moves. It is
 * shown only while the PC is in use — the reader's pointer on its screen
 * (then right under it), or its mouse in their hand — and then it stands in
 * for the real cursor, which is hidden (`cursorShown`,
 * `hideRealCursorOverScreens`, here for both machines' screens; 2026-10-23,
 * the user). Otherwise the real cursor is the only one.
 *
 * With the real cursor hidden, the page can no longer show its own over a
 * link or a text field — so this does: a hand over what can be clicked, a
 * text cursor over what can be typed in, the arrow elsewhere. Read off the
 * element under the pointer, as the browser would.
 *
 * Over the screen's HTML (laid out at `DESK_SCREEN_PX`) and never in the way
 * of it: it takes no pointer. Moved by writing its style from the channel,
 * not by React state, so a sliding mouse does not re-render the screen.
 */

type Shape = "arrow" | "hand" | "text";

/** The cursor the browser would show over an element of the page. */
function shapeOver(target: EventTarget | null): Shape {
  const el = target as HTMLElement | null;
  if (!el?.closest) return "arrow";
  if (el.closest('textarea, [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])')) return "text";
  if (el.closest('a[href], button, [role="button"], summary, label, select, .cursor-pointer')) return "hand";
  return "arrow";
}

export default function ScreenCursor() {
  const cursor = useRef<HTMLDivElement>(null);
  const shape = useRef<Shape>("arrow");
  const over = useRef(false);

  useEffect(() => hideRealCursorOverScreens(), []);

  useEffect(() => {
    const show = (next: Shape) => {
      const el = cursor.current;
      if (!el || el.dataset.shape === next) return;
      el.dataset.shape = next;
    };
    // The shape goes by what the reader's pointer is over, and only while it is on the screen.
    const move = (e: PointerEvent) => {
      shape.current = shapeOver(e.target);
      if (over.current) show(shape.current);
    };
    window.addEventListener("pointermove", move);
    const off = onDeskPointer((pointer) => {
      const el = cursor.current;
      if (!el) return;
      over.current = pointer.overScreen;
      el.style.transform = `translate(${pointer.cursor.x}px, ${pointer.cursor.y}px)`;
      el.style.visibility = cursorShown(pointer) ? "" : "hidden";
      show(pointer.overScreen ? shape.current : "arrow");
    });
    return () => {
      window.removeEventListener("pointermove", move);
      off();
    };
  }, []);

  return (
    <div ref={cursor} aria-hidden data-shape="arrow" className="group pointer-events-none absolute left-0 top-0 z-50" style={{ visibility: "hidden" }}>
      {/* Each shape is drawn with its point — the arrow's tip, the hand's fingertip, the text cursor's middle — at the div's top left. */}
      <svg width="26" height="38" viewBox="0 0 13 19" className="hidden group-data-[shape=arrow]:block drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        <path d="M0.5 0.5 L0.5 15.5 L4.2 12 L6.6 17.8 L9 16.8 L6.6 11.2 L11.6 11.2 Z" fill="#ffffff" stroke="#111111" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <svg width="34" height="44" viewBox="0 0 17 22" className="-translate-x-[13px] -translate-y-[2px] hidden group-data-[shape=hand]:block drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        <path
          d="M5 2.6 C5 1.7 5.7 1 6.5 1 C7.3 1 8 1.7 8 2.6 V8.6 C8.2 7.9 8.8 7.6 9.4 7.6 C10.1 7.6 10.7 8.1 10.8 8.8 C11 8.3 11.5 8 12.1 8 C12.8 8 13.4 8.6 13.4 9.3 C13.6 8.9 14 8.7 14.5 8.7 C15.3 8.7 15.9 9.3 15.9 10.1 V14.6 C15.9 17.9 13.8 20.6 10.6 20.6 H9.4 C7.6 20.6 6.2 19.8 5.2 18.4 L2 13.8 C1.5 13.1 1.6 12.1 2.3 11.6 C3 11.1 3.9 11.2 4.4 11.8 L5 12.6 Z"
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
      <svg width="26" height="36" viewBox="0 0 13 18" className="-translate-x-[13px] -translate-y-[18px] hidden group-data-[shape=text]:block">
        <path d="M3.5 1.5 Q6.5 1.5 6.5 4 Q6.5 1.5 9.5 1.5 M6.5 4 V14 M3.5 16.5 Q6.5 16.5 6.5 14 Q6.5 16.5 9.5 16.5" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M3.5 1.5 Q6.5 1.5 6.5 4 Q6.5 1.5 9.5 1.5 M6.5 4 V14 M3.5 16.5 Q6.5 16.5 6.5 14 Q6.5 16.5 9.5 16.5" fill="none" stroke="#111111" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
