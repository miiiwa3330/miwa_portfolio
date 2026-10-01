"use client";

import { useEffect, useRef } from "react";
import { aboutParagraphs } from "./aboutCopy";
import { aboutScrollProgress, autoScrollStep, shouldReturnHome } from "./aboutScroll";
import { sceneClock } from "@/scene/sceneClock";

/**
 * The self-introduction, as the hologram on the desk projects it: lines of
 * light rising through the air over the device (docs/room-migration.md, step 5).
 *
 * It plays by itself while About is focused — a fraction of a line a second,
 * on the diorama's clock, so the pause button stops it — and when the last
 * line has risen out of the top the reader is taken back to the middle of the
 * room (`onFinish`). The wheel and a finger scroll it natively on top of
 * that; the auto-play notices and carries on from wherever they left it.
 *
 * Fills its parent: on a desktop that is the hologram's panel in the room
 * (`HOLOGRAM_PANEL`, drawn by `RoomPanel` in front of the canvas); on a phone,
 * a flat layer over the lower part of the frame (see `Hub`).
 *
 * No `overflow: hidden` (see `RoomHtmlLayer`): the column scrolls with
 * `overflow-y: auto`, and the fade at both ends is a mask, not a clip.
 */
export default function Hologram({
  isJa,
  active,
  onFinish,
}: {
  isJa: boolean;
  /** Whether About is focused and this is on screen — the only time it plays. */
  active: boolean;
  onFinish: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const prose = useRef<HTMLDivElement>(null);

  // The latest `onFinish` for the loop below, which must not restart when the
  // caller hands in a new function.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const column = scroller.current;
    const text = prose.current;
    if (!active || !column || !text) return;

    column.scrollTop = 0;
    // Where the auto-play has got to, unrounded — the browser rounds what it
    // is given, and a fraction of a pixel a frame would round to nothing.
    let position = 0;
    // What the loop last wrote. A `scrollTop` that has moved away from it was
    // moved by the reader (a wheel, a finger), and the auto-play carries on
    // from there rather than dragging the text back.
    let written = 0;
    const openedAt = performance.now();
    let last = openedAt;
    let lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    let frame = 0;

    const tick = (now: number) => {
      const real = Math.max(0, (now - last) / 1000);
      last = now;
      if (Math.abs(column.scrollTop - written) > 1) position = column.scrollTop;
      if (!Number.isFinite(lineHeight)) lineHeight = parseFloat(getComputedStyle(text).lineHeight);
      position = Math.min(position + autoScrollStep(sceneClock.delta(real), lineHeight), column.scrollHeight - column.clientHeight);
      column.scrollTop = position;
      written = column.scrollTop;

      const progress = aboutScrollProgress(column.scrollTop, text.offsetTop + text.offsetHeight);
      if (shouldReturnHome(progress, now - openedAt)) {
        onFinishRef.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div
      className="relative w-full h-full text-[#9ff6ff]"
      style={{
        background: "linear-gradient(to top, rgba(47,232,255,0.16), rgba(47,232,255,0.04) 60%, transparent)",
      }}
    >
      <div
        ref={scroller}
        // `relative`, so the prose's offsetTop is measured from the column.
        className="relative w-full h-full overflow-y-auto pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
      >
        {/* The first lines start a third of the way down rather than below
            the bottom edge: the reader has just stepped in to read, and an
            empty hologram for the first few seconds reads as broken. */}
        <div aria-hidden className="h-[35%]" />
        <div ref={prose} className="px-10 text-[22px] leading-[1.8] [text-shadow:0_0_8px_rgba(47,232,255,0.85)]">
          <p className="font-mono text-[14px] tracking-[0.3em] text-[#2fe8ff]">ABOUT ME</p>
          <h2 className="mt-1 mb-6 text-[30px] font-bold">{isJa ? "自己紹介" : "About"}</h2>
          <div className="space-y-6">
            {aboutParagraphs(isJa).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
        {/* Room for the last line to rise all the way out of the top. */}
        <div aria-hidden className="h-full" />
      </div>
      {/* Scan lines over the light. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(159,246,255,0.18) 0 1px, transparent 1px 4px)" }}
      />
    </div>
  );
}
