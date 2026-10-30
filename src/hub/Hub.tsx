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
  const { activeSection, unfocus, goHome, turnTo } = useAppState();
  const { language, toggleLanguage } = useLanguage();
  const { openTerminal } = useTerminal();
  const isJa = language === "ja";

  // The one place the question "is this a phone" is asked for the overlay.
  // The scene asks it separately (see `CameraController`) rather than being
  // told, so that neither can be rendered against an answer the other did
  // not get — they read the same media query.
  const handheld = useHandheld();

  /** The full-screen navigation panel. Rendered here so it covers the header. */
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Which area the card is about. With no section explicitly focused it is
   * whatever the camera is turned towards, so turning round the room leafs
   * through the areas.
   *
   * A function, called at the moment an answer is needed, rather than a value
   * computed each render: reading `facing` here would re-render this component
   * — and with it the `<Canvas>` and the whole three.js tree — several times a
   * lap of the idle drift. See `facingChannel`.
   */
  //
  // Null while the desk is in front: it is on the tour but has no card, so
  // there is no area for the card's own handlers to act on (and the card is
  // not on screen to fire them — see `SectionCard`).
  const cardSection = (): NonNullable<SectionType> | null => {
    const stop = activeSection ?? facingNow();
    return stop === "desk" ? null : stop;
  };

  // An area's write-up is a page of its own (`/products`, …), not a sheet
  // over the room (2026-10-30).
  const openCard = () => {
    const section = cardSection();
    if (section) router.push(pathForSection(section));
  };

  const stepCard = (step: number) => {
    const section = cardSection();
    if (section) turnTo(adjacentSection(section, step));
  };

  // The dotted trail starts from a dot on the card's corner. The trail measures
  // that element itself, so its size and position are stated once, in the
  // card's own markup, rather than restated as numbers at the drawing end.
  const anchorDotRef = useRef<HTMLSpanElement | null>(null);

  /**
   * Step back out of an area. `resetCamera` separates the two intents: getting
   * up from the PC and reading the hologram to the end leave the camera on the
   * area just used, while the logo and BACK are a deliberate "take me back to
   * the start" and fly to the one fixed default view.
   */
  const closeToHome = (resetCamera: boolean) => {
    // Say where the camera will end up facing in the same breath as sending it
    // there. `facing` is otherwise only recomputed once the camera is idle, so
    // for the half second the flight home takes it still held the area that
    // was in front *before* this one was opened — and the card and the trail,
    // which both read it, pointed at the wrong spot until the flight landed.
    if (resetCamera) {
      // The tour's own starting point (u = 0), the desk, is what HOME actually
      // flies to — see the destination effect's "reset" branch in Scene.tsx.
      publishFacing("desk");
      goHome();
    } else {
      if (activeSection) publishFacing(activeSection);
      unfocus();
    }
  };

  // Whether the hologram is projecting the self-introduction.
  const aboutFocused = activeSection === "about";

  // Whether the reader is sitting at the PC. The PC's screen is HTML behind
  // the canvas (seen through a hole in it), so while seated the canvas lets
  // every gesture through to it. Turning the head is locked out at the desk
  // anyway, as it is in every focused area.
  const seated = activeSection === "desk";

  // The area the overlay talks about, if any. The desk is focused like an
  // area but is not one: it has no page, no card and no nav entry.
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
      {/* z-10, not -z-10. Behind a negative index the canvas painted *under*
          <main> and stopped hit-testing entirely, which silently killed every
          click and hover in the scene — buildings included. Everything meant
          to sit over it carries its own higher z-index. */}
      {/* touch-none: without it, a two-finger gesture here is read by the
          browser as native pinch-zoom (or pan) before useViewInput's own
          pointer handlers see it — the pointers get cancelled out from under
          the pinch-to-orbit-zoom logic. Paired with the page's own
          maximumScale/userScalable in layout.tsx, which stops the same
          gesture from zooming the page anywhere outside the canvas. */}
      {/* pointer-events-none while seated: the PC's screen is HTML *behind*
          the canvas (z-5 under z-10, needed for the occlusion above), so the
          canvas would otherwise catch every gesture meant for it.
          `interactive={!seated}` on Scene itself is the other half of this —
          see its own prop comment for why turning off pointer-events on just
          this wrapper div is not enough by itself. */}
      <div
        className={`fixed inset-0 w-full h-full z-10 touch-none ${seated ? "pointer-events-none" : ""}`}
      >
        <Scene
          interactive={!seated}
        />
      </div>

      {/* The hologram's self-introduction, in front of the canvas: a
          hologram has to let the room show through it (no cut-out), and
          nothing stands between it and the reader. On a phone the panel in
          the room is too small to read at any zoom the frame allows, so the
          same text is projected flat over the lower part of the frame instead
          — provisional, see docs/room-migration.md (step 5). */}
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
      {/* `safe-inset` on the outside and the usual padding on the inside:
          padding cannot be written twice on one element, and a phone's notch
          and home indicator have to be cleared *in addition to* the design's
          own margin, not instead of it. */}
      <div className="fixed inset-0 pointer-events-none z-40 safe-inset">
        <div className="w-full h-full flex flex-col justify-between p-7 sm:p-9">
          <HubHeader
            activeSection={section}
            isJa={isJa}
            toggleLanguage={toggleLanguage}
            onLogoClick={() => closeToHome(true)}
            handheld={handheld}
            onMenuOpen={() => setMenuOpen(true)}
          />

          {/* The card. Same two jobs either way — say what is in front, and
              step to the next area — in the two shapes the screen allows: a
              stack in the middle of a desktop frame, a strip across the
              bottom of a phone's. Both read `facing` themselves and both send
              a step back as a request; see `CardRail` for why the phone's is
              not a scroll container. */}
          {cardShowing &&
            (handheld ? (
              <CardRail
                focusedSection={section}
                isJa={isJa}
                anchorRef={anchorDotRef}
                onOpen={openCard}
                onStep={stepCard}
                // The BACK button, moved onto the rail's own corner — the
                // desktop keeps it at the bottom of the frame, where on a
                // phone it landed on top of the rail itself.
                onHome={() => closeToHome(true)}
              />
            ) : (
              <div className="flex-1 flex items-center w-full">
                <SectionCard
                  focusedSection={section}
                  isJa={isJa}
                  anchorRef={anchorDotRef}
                  // Both read the area in front when they fire rather than
                  // closing over it, so this component never has to re-render
                  // for it — see `facingChannel` for why that matters here.
                  onOpen={openCard}
                  onStep={stepCard}
                />
              </div>
            ))}

          {/* The links-and-copyright dock. A phone has neither: the links
              moved into the full-screen menu, and the bottom-right corner the
              copyright sat in is the card rail's now — at 390px the privacy
              link ran off the frame there anyway, measured. */}
          {!handheld && <HubDock isJa={isJa} openTerminal={openTerminal} withFooter />}
        </div>
      </div>

      {/* BACK button — zoomed into an area. On a phone only where there is no
          card rail (the desk, About): the bottom of the frame is otherwise
          the rail — the button landed on top of the rail, the links button
          and the copyright all at once (measured at 390x844) — and the rail
          carries its own copy, just above the card; see `CardRail`. */}
      {activeSection && (!handheld || !cardShowing) && (
        <HomeButton
          onClick={() => closeToHome(true)}
          isJa={isJa}
          className="fixed bottom-7 sm:bottom-9 left-1/2 -translate-x-1/2 z-50"
        />
      )}

      {/* The full-screen navigation. Above the header (z-50), so its own close
          button can land on the hamburger's footprint. */}
      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            isJa={isJa}
            current={navItemForSection(section)}
            onClose={() => setMenuOpen(false)}
            openTerminal={openTerminal}
          />
        )}
      </AnimatePresence>

      {/* Dotted trail from the card out to the marker over its area. It only
          has a job in the free view: it is what says "the card is about that
          spot over there". Focusing an area answers that question by filling
          the frame with the spot itself, so the trail — and the marker it
          points at — both withdraw. Unmounting cleanly here (rather than
          just losing its anchor when the dot above disappears) keeps it from
          freezing mid-draw at its last position. */}
      <CardLeaderLine anchorRef={anchorDotRef} hidden={!!activeSection} />

      {/* Terminal easter egg */}
      <TerminalOverlay />
    </main>
  );
}
