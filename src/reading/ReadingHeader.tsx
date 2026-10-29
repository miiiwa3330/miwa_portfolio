"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Globe, Menu, X } from "lucide-react";
import Wordmark from "@/ui/Wordmark";
import CornerBrackets from "@/ui/CornerBrackets";
import NavPills from "@/hub/NavPills";
import MobileMenu from "@/hub/MobileMenu";
import { pageLinkForPath } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";
import { useHandheld } from "@/state/useHandheld";

/**
 * The reading pages' header — the hub's own, as it looks while the detail
 * sheet is up: the dark wordmark top left, the white pill of navigation,
 * language button, and the close button on the right. Below xl the menu button
 * opens the same full-screen panel.
 *
 * Drawn to match the hub's header furniture pixel-for-pixel so that moving
 * between a hub section and a reading page creates no visual discrepancy.
 *
 * Fixed at the top of the viewport and transparent, like the hub's, so the
 * title (Miiiwa.) and header controls stay put while reading. The text runs
 * underneath it; the user keeps it that way (devlog 2026-09-20).
 */
export default function ReadingHeader() {
  const pathname = usePathname();
  // Lights "ノート" on the notes; no area is ever lit off the hub.
  const current = pageLinkForPath(pathname);
  const { language, toggleLanguage } = useLanguage();
  const isJa = language === "ja";
  const handheld = useHandheld();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none safe-inset">
      <div className="flex justify-between items-center sm:items-start w-full gap-3 sm:gap-6 p-7 sm:p-9">
        {/* A plain <a> on purpose: into the hub is a full load (see `leadsToHub`). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          aria-label="Miiiwa. トップ（惑星）へ"
          className="pointer-events-auto font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 hover:scale-[1.03] active:scale-[0.98] transition-transform select-none"
        >
          <Wordmark onLight />
        </a>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative pointer-events-auto">
          {!handheld && (
            <>
              {/* Desktop navigation — from xl (1280px) up. */}
              <NavPills isJa={isJa} current={current} onLight className="hidden xl:flex" />

              {/* Narrow window, mouse: panel button */}
              <button
                onClick={() => setMenuOpen(true)}
                title={isJa ? "セクション一覧" : "Menu"}
                aria-haspopup="dialog"
                aria-label={isJa ? "セクション一覧" : "Menu"}
                className="group relative xl:hidden w-12 h-12 rounded-none flex items-center justify-center hover:bg-black active:scale-95 transition-all duration-150 border border-black pointer-events-auto bg-neutral-900 text-neutral-100"
              >
                <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <Menu size={20} />
              </button>
            </>
          )}

          <button
            onClick={toggleLanguage}
            title="Toggle language"
            aria-label="Toggle language"
            className="group relative h-12 px-4 bg-neutral-900/85 backdrop-blur-md rounded-none flex items-center gap-1.5 text-neutral-100 hover:bg-neutral-900 active:scale-95 transition-all duration-150 border border-black pointer-events-auto font-mono text-xs sm:text-sm"
          >
            <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
            <Globe className="w-4 h-4 text-[#ea580c]" />
            <span className="font-bold w-6">{isJa ? "JP" : "EN"}</span>
          </button>

          {!handheld && (
            /* eslint-disable-next-line @next/next/no-html-link-for-pages */
            <a
              href="/"
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="group relative w-12 h-12 rounded-none flex items-center justify-center bg-neutral-900/85 backdrop-blur-md hover:bg-neutral-900 text-white border border-black transition-all active:scale-95 pointer-events-auto cursor-pointer"
            >
              <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
              <X className="w-4 h-4" />
            </a>
          )}

          {handheld && (
            /* eslint-disable-next-line @next/next/no-html-link-for-pages */
            <a
              href="/"
              title={isJa ? "閉じる" : "Close"}
              aria-label={isJa ? "閉じる" : "Close"}
              className="group relative w-12 h-12 rounded-none flex items-center justify-center bg-neutral-900/85 backdrop-blur-md hover:bg-neutral-900 text-white border border-black active:scale-95 transition-transform pointer-events-auto"
            >
              <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
              <X className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && <MobileMenu isJa={isJa} current={current} onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </header>
  );
}
