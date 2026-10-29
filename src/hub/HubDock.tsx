"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Monitor, Terminal } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { GithubIcon, XIcon } from "@/ui/icons";
import CornerBrackets from "@/ui/CornerBrackets";
import Footer from "./Footer";

const MotionLink = motion.create(Link);

type Props = {
  isJa: boolean;
  openTerminal: () => void;
  pageOpen: boolean;
};

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.2,
    x: -24,
    filter: "blur(4px)",
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 480,
      damping: 22,
      mass: 0.8,
    },
  },
};

export default function HubDock({ isJa, openTerminal, pageOpen }: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="flex justify-between items-end w-full gap-4">
      {/* Links tucked behind a PC icon — revealed on hover (or tap) with spring stagger animation */}
      <div
        className="flex items-center pointer-events-auto"
        onMouseEnter={() => setToolsOpen(true)}
        onMouseLeave={() => setToolsOpen(false)}
      >
        <motion.button
          onClick={() => setToolsOpen((o) => !o)}
          title={isJa ? "リンク" : "Links"}
          aria-expanded={toolsOpen}
          aria-label={isJa ? "リンク" : "Links"}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`group relative w-10 h-10 rounded-none flex items-center justify-center transition-colors border ${toolsOpen
              ? "bg-neutral-900 text-neutral-100 border-black"
              : "bg-white text-neutral-800 border-black/20 hover:bg-neutral-100"
            }`}
        >
          <CornerBrackets
            size="xs"
            offset="tight"
            strokeWidth="2"
            colorClass={toolsOpen ? "border-neutral-900" : "border-neutral-800"}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <Monitor size={16} />
        </motion.button>

        <AnimatePresence>
          {toolsOpen && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex items-center gap-2 ml-2"
            >
              <MotionLink
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                href="/notes"
                title={isJa ? "ノート" : "Notes"}
                aria-label={isJa ? "ノート" : "Notes"}
                className="group relative w-10 h-10 bg-white rounded-none flex items-center justify-center text-neutral-800 hover:text-black hover:bg-neutral-100 transition-colors border border-black/20 shrink-0"
              >
                <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen size={16} />
              </MotionLink>

              <motion.a
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                href="https://github.com/miiiwa1121"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
                aria-label="GitHub"
                className="group relative w-10 h-10 bg-white rounded-none flex items-center justify-center text-neutral-800 hover:text-black hover:bg-neutral-100 transition-colors border border-black/20 shrink-0"
              >
                <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <GithubIcon size={16} />
              </motion.a>

              <motion.a
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                href="https://x.com/miiiwa3330"
                target="_blank"
                rel="noopener noreferrer"
                title="X"
                aria-label="X"
                className="group relative w-10 h-10 bg-white rounded-none flex items-center justify-center text-neutral-800 hover:text-black hover:bg-neutral-100 transition-colors border border-black/20 shrink-0"
              >
                <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <XIcon size={15} />
              </motion.a>

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={openTerminal}
                title="Terminal mode"
                aria-label="Terminal mode"
                className="group relative w-10 h-10 bg-white rounded-none flex items-center justify-center text-emerald-700 hover:text-emerald-900 hover:bg-neutral-100 transition-colors border border-black/20 shrink-0"
              >
                <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <Terminal size={16} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer (only on Home screen, bottom right) */}
      <div className="absolute bottom-9 right-12 pointer-events-auto">
        {!pageOpen && <Footer />}
      </div>
    </div>
  );
}

