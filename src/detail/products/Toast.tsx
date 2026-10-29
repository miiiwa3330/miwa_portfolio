"use client";

import { motion } from "framer-motion";
import CornerBrackets from "@/ui/CornerBrackets";

/** Transient message pinned to the bottom of the viewport, styled in loo100 aesthetic. */
export default function Toast({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 50, x: "-50%" }}
      role="status"
      className="fixed bottom-10 left-1/2 z-[9999] px-5 py-2.5 rounded-none bg-neutral-900 border border-neutral-700 text-neutral-100 font-mono text-xs font-bold whitespace-nowrap shadow-xl"
    >
      <CornerBrackets size="xs" offset="tight" colorClass="border-neutral-100" />
      {children}
    </motion.div>
  );
}
