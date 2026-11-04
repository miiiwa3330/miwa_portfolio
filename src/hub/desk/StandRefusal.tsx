"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppState } from "@/state/AppStateContext";
import { pickStandLine, STAND_LINES } from "./standLines";

/** How long a line stays up (ms) — long enough to read the longest one twice. */
const SHOW_MS = 2800;

/**
 * The line the reader says to themselves when they try to get up from the
 * desk and are kept in the chair (`SEAT_LOCKED`): one of `STAND_LINES`, at
 * random, just above BACK. Each try says a new one and starts its time
 * over.
 */
export default function StandRefusal({ isJa }: { isJa: boolean }) {
  const { standRefusals } = useAppState();
  const [shown, setShown] = useState<{ line: number; nonce: number } | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (standRefusals === 0) return;
    const line = pickStandLine(lastRef.current);
    lastRef.current = line;
    setShown({ line, nonce: standRefusals });
    const timer = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [standRefusals]);

  const line = shown && STAND_LINES[shown.line];
  return (
    <div aria-live="polite" className="fixed inset-x-4 bottom-[92px] sm:bottom-[100px] z-50 flex justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        {shown && line && (
          <motion.p
            key={shown.nonce}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="max-w-full px-5 py-3 text-center text-sm sm:text-base font-bold text-white bg-black/70 backdrop-blur-md border border-white/20 shadow-md"
          >
            {isJa ? line.ja : line.en}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
