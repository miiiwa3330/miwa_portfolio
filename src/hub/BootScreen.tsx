"use client";

import { useEffect, useState } from "react";
import { BOOT_LINES, bootLineState, publishBoot, useBoot } from "@/state/bootChannel";

/** How long the screen takes to fade once the room is drawn (ms). */
const FADE_MS = 500;

/**
 * What covers the room until its first frame is drawn: Miiiwa. OS booting,
 * the same OS as the PC's taskbar (2026-11-04). In the prerendered HTML, so
 * it is there before any script runs. Each line is done when that stage has
 * really been reached (`bootChannel`), not on a timer.
 *
 * The building and the first frame block the main thread, so nothing here
 * moves by script: the cursor blinks by a CSS animation of its opacity, which
 * the compositor runs on its own.
 */
export default function BootScreen({ isJa }: { isJa: boolean }) {
  const stage = useBoot();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    publishBoot("hydrated");
  }, []);

  const drawn = stage === "drawn";
  useEffect(() => {
    if (!drawn) return;
    const timer = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [drawn]);

  if (gone) return null;
  return (
    <div
      role="status"
      aria-busy={!drawn}
      aria-label={isJa ? "読み込み中" : "Loading"}
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-[#070a14] text-white transition-opacity ease-out ${drawn ? "opacity-0 pointer-events-none" : ""}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="px-6">
        <p className="text-3xl sm:text-4xl font-black tracking-tight">
          Miiiwa<span className="text-orange-500">.</span>
          <span className="ml-2 font-mono font-normal text-white/60 text-base sm:text-lg">OS</span>
        </p>
        <ul className="mt-6 space-y-2 font-mono text-sm sm:text-[15px]">
          {BOOT_LINES.map((line, i) => {
            const state = bootLineState(stage, i);
            return (
              <li key={line.en} className={`flex items-center gap-3 ${state === "todo" ? "text-white/30" : "text-white/85"}`}>
                <span className={`whitespace-pre ${state === "done" ? "text-emerald-400" : ""}`}>
                  {state === "done" ? "[  OK  ]" : "[      ]"}
                </span>
                <span>{isJa ? line.ja : line.en}</span>
                {state === "doing" && (
                  <span aria-hidden className="inline-block w-2 h-4 bg-orange-500 animate-pulse motion-reduce:animate-none" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
