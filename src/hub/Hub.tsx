"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useAppState } from "@/state/AppStateContext";
import { facingNow, publishFacing } from "@/state/facingChannel";
import type { SectionType } from "@/types";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import { useHandheld } from "@/state/useHandheld";
import Scene from "@/scene/Scene";
import TerminalOverlay from "@/terminal/TerminalOverlay";
import CardLeaderLine from "./card/CardLeaderLine";
import SectionCard from "./card/SectionCard";
import CardRail from "./card/CardRail";
import HubHeader from "./HubHeader";
import HubDock from "./HubDock";
import MobileMenu from "./MobileMenu";
import { navItemForSection, pathForSection } from "./nav";
import HomeButton from "./HomeButton";
import SemanticSEO from "./SemanticSEO";
import Hologram from "./about/Hologram";
import { adjacentSection } from "@/scene/room/tour";
import { RoomHtmlLayer, RoomPanel } from "./room/RoomHtml";
import DeskScreen from "./desk/DeskScreen";
import ScreenCursor from "./desk/ScreenCursor";
import { DESK_SCREEN, HOLOGRAM_PANEL } from "@/scene/room/screens";

export default function Hub() {
  const router = useRouter();
  const {
    activeSection,
    closePage,
    goHome,
    turnTo,
  } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  const handheld = useHandheld();

  /** The full-screen navigation panel. Rendered here so it covers the header. */
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Which area the card is about. With no section explicitly focused it is
   * whatever the camera is turned towards.
   */
  const cardSection = (): NonNullable<SectionType> | null => {
    const stop = activeSection ?? facingNow();
    return stop === "desk" ? null : stop;
  };

  const openCard = () => {
    const section = cardSection();
    if (section) {
      router.push(pathForSection(section));
    }
  };

  const stepCard = (step: number) => {
    const section = cardSection();
    if (section) turnTo(adjacentSection(section, step));
  };

  const anchorDotRef = useRef<HTMLSpanElement | null>(null);

  /**
   * Reset camera to default home view (seated at desk / diorama).
   */
  const closeToHome = (resetCamera: boolean) => {
    if (resetCamera) {
      publishFacing("desk");
      goHome();
    } else {
      if (activeSection) publishFacing(activeSection);
      closePage();
    }
  };

  const handleNav = (id: NonNullable<SectionType>) => {
    router.push(pathForSection(id));
  };

  // Whether the hologram is projecting the self-introduction.
  const aboutFocused = activeSection === "about";

  // Whether the reader is sitting at the PC. The PC's screen is HTML behind
  // the canvas (seen through a hole in it), so while seated the canvas lets
  // every gesture through to it. Turning the head is locked out at the desk
  // anyway, as it is in every focused area.
  const seated = activeSection === "desk";

  // The area the overlay talks about, if any. The desk is focused like an
  // area but is not one: it has no sheet, no card and no nav entry.
  const section = activeSection === "desk" ? null : activeSection;

  // Whether there is a card to show at all. Not during About, which is
  // frameless — it has no card and no leader line to anchor one to — and not
  // at the desk, which has neither.
  const cardShowing = activeSection !== "about" && activeSection !== "desk";

  return (
    <main className="w-full h-screen overflow-hidden relative font-sans">
      {/* Accessibility & Crawler semantic HTML for SEO and AdSense crawler review */}
      <SemanticSEO />
      {/* Bottom layer: flat space colour. Split out from the canvas (below)
          so the canvas itself can be left transparent — see Scene.tsx's own
          note on why there's no `<color attach="background">` there any
          more. */}
      <div className="fixed inset-0 w-full h-full z-0 bg-[#070a14]" />

      {/* HTML placed in the room, behind the canvas: the PC's screen, seen
          through the hole the canvas leaves for it (`ScreenHole`). Between
          the background and the canvas, so the room in front of it — the
          chair, the lamp — still covers it. */}
      <RoomHtmlLayer className="z-[5]">
        <RoomPanel panel={DESK_SCREEN} interactive={seated}>
          <DeskScreen isJa={isJa} onLeave={() => closeToHome(false)} openTerminal={openTerminal} />
          <ScreenCursor />
        </RoomPanel>
      </RoomHtmlLayer>

      {/* 3D scene, transparent, painted over both layers above. */}
      <div
        className={`fixed inset-0 w-full h-full z-10 touch-none ${seated ? "pointer-events-none" : ""}`}
      >
        <Scene
          interactive={!seated}
        />
      </div>

      {/* The hologram's self-introduction, in front of the canvas */}
      {handheld ? (
        aboutFocused && (
          <div className="fixed inset-x-4 top-[38%] bottom-28 z-[15]">
            <Hologram isJa={isJa} active onFinish={() => closeToHome(false)} />
          </div>
        )
      ) : (
        <RoomHtmlLayer className="z-[15]">
          <RoomPanel panel={HOLOGRAM_PANEL} interactive={aboutFocused} hidden={!aboutFocused}>
            <Hologram isJa={isJa} active={aboutFocused} onFinish={() => closeToHome(false)} />
          </RoomPanel>
        </RoomHtmlLayer>
      )}

      {/* --- PERSISTENT CHROME (always visible in both modes) --- */}
      <div className="fixed inset-0 pointer-events-none z-40 safe-inset">
        <div className="w-full h-full flex flex-col justify-between p-7 sm:p-9">
          <HubHeader
            activeSection={section}
            isJa={isJa}
            toggleLanguage={toggleLanguage}
            onLogoClick={() => closeToHome(true)}
            onNavClick={handleNav}
            onLightBackground={false}
            onClose={() => closeToHome(false)}
            handheld={handheld}
            onMenuOpen={() => setMenuOpen(true)}
          />

          {/* The card */}
          {cardShowing &&
            (handheld ? (
              <CardRail
                focusedSection={section}
                isJa={isJa}
                anchorRef={anchorDotRef}
                onOpen={openCard}
                onStep={stepCard}
                onHome={() => closeToHome(true)}
              />
            ) : (
              <div className="flex-1 flex items-center w-full">
                <SectionCard
                  focusedSection={section}
                  isJa={isJa}
                  anchorRef={anchorDotRef}
                  onOpen={openCard}
                  onStep={stepCard}
                />
              </div>
            ))}

          {/* The links-and-copyright dock */}
          {!handheld && <HubDock isJa={isJa} openTerminal={openTerminal} pageOpen={false} />}
        </div>
      </div>

      {/* Back button — placed at screen bottom-center when zoomed into an area */}
      {activeSection && (!handheld || !cardShowing) && (
        <HomeButton
          onClick={() => closeToHome(true)}
          isJa={isJa}
          className="fixed bottom-7 sm:bottom-9 left-1/2 -translate-x-1/2 z-50"
        />
      )}

      {/* The full-screen navigation */}
      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            isJa={isJa}
            current={navItemForSection(section)}
            onNavClick={handleNav}
            onClose={() => setMenuOpen(false)}
            openTerminal={openTerminal}
          />
        )}
      </AnimatePresence>

      {/* Dotted trail from the card out to the marker over its area */}
      <CardLeaderLine anchorRef={anchorDotRef} hidden={!!activeSection} />

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
