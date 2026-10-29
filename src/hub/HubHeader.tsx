"use client";

import { Globe, Menu, X } from "lucide-react";
import type { SectionType } from "@/types";
import Wordmark from "@/ui/Wordmark";
import CornerBrackets from "@/ui/CornerBrackets";
import { navItemForSection } from "./nav";
import NavPills from "./NavPills";
import LightMenu from "./LightMenu";

type Props = {
  activeSection: SectionType;
  isJa: boolean;
  toggleLanguage: () => void;
  onLogoClick: () => void;
  onNavClick: (id: NonNullable<SectionType>) => void;
  /** True while the white detail sheet covers the canvas — see the logo below. */
  onLightBackground: boolean;
  onClose?: () => void;
  /** Phone-sized touch screen: a different set of controls entirely. */
  handheld: boolean;
  /** Opens the full-screen panel. Owned by `Hub`, which renders the panel. */
  onMenuOpen: () => void;
};

export default function HubHeader({
  activeSection,
  isJa,
  toggleLanguage,
  onLogoClick,
  onNavClick,
  onLightBackground,
  onClose,
  handheld,
  onMenuOpen,
}: Props) {
  return (
    <header className="flex justify-between items-center sm:items-start w-full gap-3 sm:gap-6 relative">
      {/*
       * Logo → full reset. Text only, no frame/icon.
       *
       * The colour has to follow what is behind it. The header sits at z-40
       * and the detail sheet at z-20, so the logo keeps floating over the
       * sheet once a section is opened — and the sheet is white.
       */}
      <button
        onClick={onLogoClick}
        aria-label="Miiiwa."
        className={`pointer-events-auto font-black text-3xl sm:text-4xl md:text-5xl tracking-tight hover:scale-[1.03] active:scale-[0.98] transition-transform select-none ${
          onLightBackground ? "text-gray-900" : "text-white"
        }`}
      >
        <Wordmark onLight={onLightBackground} />
      </button>

      {/*
       * Right-hand controls.
       *
       * A phone gets two of them, in this order: language, then the menu.
       * A desktop gets language and the light menu, and the navigation pills
       * from xl up.
       */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative">
        {!handheld && (
          <>
            {/* Desktop navigation — from xl (1280px) up, not lg. The five
                areas, "｜" and Note need about 1,190px of window beside the
                logo and the round buttons.
                Below xl the menu button below takes over, as it already did
                for narrow windows. `whitespace-nowrap` so a label can never
                break mid-word if the widths shift again. */}
            <NavPills
              isJa={isJa}
              current={navItemForSection(activeSection)}
              onSectionClick={onNavClick}
              onLight={onLightBackground}
              className="hidden xl:flex"
            />

            {/* Narrow window, mouse: the same panel a phone gets, since the
                navigation above has nowhere to sit. */}
            <button
              onClick={onMenuOpen}
              title={isJa ? "セクション一覧" : "Menu"}
              aria-haspopup="dialog"
              aria-label={isJa ? "セクション一覧" : "Menu"}
              className={`group relative xl:hidden w-12 h-12 rounded-none flex items-center justify-center active:scale-95 transition-all duration-150 pointer-events-auto backdrop-blur-md ${
                onLightBackground
                  ? "bg-neutral-900/85 text-neutral-100 hover:bg-neutral-900 border border-black"
                  : "bg-white/85 text-neutral-800 hover:bg-white border border-black/20"
              }`}
            >
              <CornerBrackets
                size="xs"
                offset="tight"
                strokeWidth="2"
                colorClass={onLightBackground ? "border-white" : "border-neutral-900"}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <Menu size={20} />
            </button>
          </>
        )}

        <button
          onClick={toggleLanguage}
          title="Toggle language"
          aria-label="Toggle language"
          className={`group relative h-12 px-4 rounded-none flex items-center gap-1.5 active:scale-95 transition-all duration-150 pointer-events-auto font-mono text-xs sm:text-sm backdrop-blur-md ${
            onLightBackground
              ? "bg-neutral-900/85 text-neutral-100 hover:bg-neutral-900 border border-black"
              : "bg-white/85 text-neutral-800 hover:bg-white border border-black/20"
          }`}
        >
          <CornerBrackets
            size="xs"
            offset="tight"
            strokeWidth="2"
            colorClass={onLightBackground ? "border-white" : "border-neutral-900"}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <Globe className="w-4 h-4 text-[#ea580c]" />
          <span className="font-bold w-6">{isJa ? "JP" : "EN"}</span>
        </button>

        {onLightBackground ? (
          <button
            onClick={onClose}
            title={isJa ? "閉じる" : "Close"}
            aria-label={isJa ? "閉じる" : "Close"}
            className="group relative w-12 h-12 rounded-none flex items-center justify-center active:scale-95 transition-all duration-150 pointer-events-auto bg-neutral-900/85 text-neutral-100 hover:bg-neutral-900 border border-black backdrop-blur-md cursor-pointer"
          >
            <CornerBrackets
              size="xs"
              offset="tight"
              strokeWidth="2"
              colorClass="border-white"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <X className="w-4 h-4" />
          </button>
        ) : (
          <>
            <LightMenu isJa={isJa} />
            {handheld && (
              <button
                onClick={onMenuOpen}
                title={isJa ? "セクション一覧" : "Menu"}
                aria-haspopup="dialog"
                aria-label={isJa ? "セクション一覧" : "Menu"}
                className="group relative w-12 h-12 rounded-none flex items-center justify-center active:scale-95 transition-transform pointer-events-auto bg-white/85 text-neutral-800 hover:bg-white border border-black/20 backdrop-blur-md"
              >
                <CornerBrackets
                  size="xs"
                  offset="tight"
                  strokeWidth="2"
                  colorClass="border-neutral-900"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <Menu size={20} />
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
