"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Menu, X } from "lucide-react";
import Wordmark from "@/ui/Wordmark";
import CornerBrackets from "@/ui/CornerBrackets";
import NavPills from "@/hub/NavPills";
import MobileMenu from "@/hub/MobileMenu";
import { pageLinkForPath } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";
import { useHandheld } from "@/state/useHandheld";

/**
 * The reading pages' header — the hub's parts on a light page: the dark
 * wordmark top left, the navigation, the language button, and the close
 * button (back into the room) on the right. Below xl the menu button opens
 * the same full-screen panel the hub's does.
 *
 * When the page's main heading scrolls out of the viewport, a compact title is
 * shown below "Miiiwa." separated by a rule: the heading's own words, or the
 * nav entry's name on a page whose heading cannot be found.
 *
 * Fixed at the top of the viewport and transparent, like the hub's, so the
 * title (Miiiwa.) and header controls stay put while reading. The text runs
 * underneath it; the user keeps it that way (devlog 2026-09-20).
 */
export default function ReadingHeader() {
  const pathname = usePathname();
  const current = pageLinkForPath(pathname);
  const fallbackTitle = current?.en ?? "";
  const { language, toggleLanguage } = useLanguage();
  const isJa = language === "ja";
  const handheld = useHandheld();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolledPastTitle, setScrolledPastTitle] = useState(false);
  const [headingText, setHeadingText] = useState("");

  useEffect(() => {
    const checkScroll = () => {
      const h1 = document.querySelector("main h1");
      if (h1) {
        const text = h1.textContent?.trim() || fallbackTitle;
        setHeadingText(text);
        const rect = h1.getBoundingClientRect();
        // Once the heading's bottom edge passes above the header logo (~80px), show compact sub-header
        setScrolledPastTitle(rect.bottom < 80);
      } else {
        setHeadingText(fallbackTitle);
        setScrolledPastTitle(window.scrollY > 120);
      }
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [pathname, fallbackTitle]);

  const compactTitle = headingText || fallbackTitle;

  return (
    <header className="fixed top-0 inset-x-0 z-40 pointer-events-none safe-inset">
      <div className="flex justify-between items-start w-full gap-3 sm:gap-6 p-7 sm:p-9">
        <div className="flex flex-col items-start pointer-events-auto">
          {/* A plain <a> on purpose: into the hub is a full load (see `leadsToHub`). */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            aria-label="Miiiwa. トップ（部屋）へ"
            className="font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-gray-900 hover:scale-[1.03] active:scale-[0.98] transition-transform select-none leading-none"
          >
            <Wordmark onLight />
          </a>

          <AnimatePresence>
            {scrolledPastTitle && compactTitle && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-2 pt-1.5 border-t border-neutral-900/40 w-full flex items-center gap-1.5 select-none"
              >
                <span aria-hidden="true" className="w-1 h-3.5 bg-[#ea580c] rounded-none shrink-0" />
                <span className="text-xs sm:text-sm font-black tracking-tight text-neutral-900 truncate max-w-[180px] sm:max-w-[260px]">
                  {compactTitle}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            title={isJa ? "閉じる" : "Close"}
            aria-label={isJa ? "閉じる" : "Close"}
            className="group relative w-12 h-12 rounded-none flex items-center justify-center bg-neutral-900/85 backdrop-blur-md hover:bg-neutral-900 text-white border border-black transition-all active:scale-95 pointer-events-auto cursor-pointer"
          >
            <CornerBrackets size="xs" offset="tight" strokeWidth="2" colorClass="border-white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
            <X className="w-4 h-4" />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && <MobileMenu isJa={isJa} current={current} onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </header>
  );
}
