"use client";

import { useEffect, useRef } from "react";
import { onDeskPointer } from "@/scene/deskPointer";

/**
 * The PC's cursor, drawn on its screen where the mouse on the desk puts it
 * (`deskPointer`, `cursorFromMouse`): slide the mouse and it moves. While
 * the reader's own pointer is on the screen it stands aside — the real
 * cursor is right there, and the mouse has gone to where it is.
 *
 * Over the screen's HTML (laid out at `DESK_SCREEN_PX`) and never in the way
 * of it: it takes no pointer. Moved by writing its style from the channel,
 * not by React state, so a sliding mouse does not re-render the screen.
 */
export default function ScreenCursor() {
  const arrow = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onDeskPointer(({ cursor, overScreen }) => {
        const el = arrow.current;
        if (!el) return;
        el.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
        el.style.visibility = overScreen ? "hidden" : "";
      }),
    []
  );
  return (
    <div ref={arrow} aria-hidden className="pointer-events-none absolute left-0 top-0 z-50" style={{ visibility: "hidden" }}>
      {/* The arrow's tip is the cursor's point: at the div's top left. */}
      <svg width="26" height="38" viewBox="0 0 13 19" className="block drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
        <path d="M0.5 0.5 L0.5 15.5 L4.2 12 L6.6 17.8 L9 16.8 L6.6 11.2 L11.6 11.2 Z" fill="#ffffff" stroke="#111111" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
