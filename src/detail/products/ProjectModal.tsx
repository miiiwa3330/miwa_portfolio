"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import { useLanguage } from "@/state/LanguageContext";
import { productPath, type Project } from "@/data";
import { statusLabel } from "./catalog";
import { CategoryBadge, StatusBadge } from "./Badges";
import ProjectLinks, { type BlockedLink } from "./ProjectLinks";

type Props = {
  project: Project;
  onClose: () => void;
  onBlockedLink: (kind: BlockedLink) => void;
};

export default function ProjectModal({ project, onClose, onBlockedLink }: Props) {
  const { language } = useLanguage();

  // Escape closes. The dialog is the topmost layer, so this listener only
  // exists while it is mounted.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white border border-black/20 rounded-none overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        <CornerBrackets size="lg" offset="card" strokeWidth="2" colorClass="border-neutral-900" />

        <button
          onClick={onClose}
          aria-label={language === "ja" ? "閉じる" : "Close"}
          className="group absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-neutral-900/90 hover:bg-neutral-900 text-white rounded-none border border-black backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
          <X size={18} />
        </button>

        <div className="relative h-64 md:h-96 w-full shrink-0 border-b border-black/10 bg-neutral-100">
          <Image
            src={project.image}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>
          <div className="absolute top-6 left-6 z-20">
            <StatusBadge size="lg" status={project.status} label={statusLabel(project.status, language)} />
          </div>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 sm:gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-950 tracking-tight">
              {project.title}
            </h2>
            <CategoryBadge size="lg" category={project.category} />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-mono font-bold mb-3 border-b border-black/10 pb-2 text-xs tracking-widest uppercase text-neutral-600">
                Overview
              </h3>
              <p className="text-neutral-700 text-base sm:text-lg leading-relaxed">{project.description}</p>
            </div>

            <div>
              <h3 className="font-mono font-bold mb-3 border-b border-black/10 pb-2 text-xs tracking-widest uppercase text-neutral-600">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2 font-mono">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-neutral-50 border border-black/15 rounded-none text-neutral-800 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10 pt-6 border-t border-black/10 font-mono">
            <ProjectLinks
              project={project}
              onBlocked={onBlockedLink}
              iconSize={16}
              codeLabel="View Code"
              demoLabel="Play Now"
              codeClassName="flex-1 py-3 flex items-center justify-center gap-2 rounded-none bg-white hover:bg-neutral-100 border border-black/20 text-neutral-900 font-bold transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
              demoClassName="flex-1 py-3 flex items-center justify-center gap-2 rounded-none bg-neutral-900 hover:bg-black text-white border border-black font-bold transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
            />
            {/* The project's own page — the long write-up this modal only
                summarises. A route of this app, unlike Code/Play, so it is a
                next/link; the hub unmounts on the way, and the back button
                returns to #products. Same outline style as Code: Play stays
                the one filled button. */}
            <Link
              href={productPath(project.slug)}
              className="flex-1 py-3.5 sm:py-4 flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-gray-50 border border-black/10 text-gray-800 font-bold transition-all hover:scale-[1.01] active:scale-95 text-sm sm:text-base cursor-pointer whitespace-nowrap"
            >
              <BookOpen size={18} /> <span>Read More</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
