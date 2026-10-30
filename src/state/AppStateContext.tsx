"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from "react";
import { hashForState, movedToPage, sectionFromHash } from "./sectionUrl";
import { pathForSection } from "@/hub/nav";
import type { Focus, SectionType } from "@/types";
import type { ViewZoom } from "@/scene/room/layout";
import { DEFAULT_LIGHTS, flipLight as flip, type LightSwitch, type RoomLights } from "@/scene/room/lighting";

interface AppStateContextType {
  /**
   * What the camera has stepped in to (null = standing in the middle of the
   * room): one of the areas, or the desk — the PC, which is focused like an
   * area but has no card.
   */
  activeSection: Focus;
  setActiveSection: (section: Focus) => void;
  /**
   * Step back out of the area, leaving the camera looking the way the area's
   * framing put it: you stay facing what you were just looking at. What
   * getting up from the PC and reading the hologram to the end do.
   */
  unfocus: () => void;
  /** Full reset: unfocus and fly the camera back to the default view. */
  goHome: () => void;
  /** Bumps every time goHome() runs; the camera watches it to reset its view. */
  homeNonce: number;
  /**
   * Ask the camera to turn to an area without focusing it — what swiping the
   * card does. Carries a nonce so asking twice for the same area still turns.
   */
  turnTo: (section: NonNullable<SectionType>) => void;
  turnRequest: { section: NonNullable<SectionType>; nonce: number } | null;
  /**
   * Which of the free view's two stages is in effect while no section is
   * focused — "standard" (the default) or "fisheye" (widened to take in the
   * room). Only ever changes in the free view; every way of leaving a section
   * resets it back to "standard", so "fisheye" is always a deliberate,
   * temporary choice (a pinch), never something you can
   * get stuck in.
   */
  viewZoom: ViewZoom;
  setViewZoom: (zoom: ViewZoom) => void;
  /**
   * The room's lights — the ceiling light, the desk lamp and the neon's
   * colours. The one copy: the switch plate in the room and the light menu in
   * the header both only call `flipLight` (see `scene/room/lighting.ts`).
   */
  lights: RoomLights;
  flipLight: (which: LightSwitch) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<Focus>(null);
  const [homeNonce, setHomeNonce] = useState(0);
  const [turnRequest, setTurnRequest] = useState<{ section: NonNullable<SectionType>; nonce: number } | null>(null);
  const [viewZoom, setViewZoom] = useState<ViewZoom>("standard");
  const [lights, setLights] = useState<RoomLights>(DEFAULT_LIGHTS);
  const flipLight = useCallback((which: LightSwitch) => setLights((current) => flip(current, which)), []);

  const turnTo = useCallback((section: NonNullable<SectionType>) => {
    setTurnRequest((previous) => ({ section, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const unfocus = useCallback(() => {
    setActiveSection(null);
    setViewZoom("standard");
  }, []);

  const goHome = useCallback(() => {
    unfocus();
    setHomeNonce((n) => n + 1);
  }, [unfocus]);

  // --- The URL ---------------------------------------------------------
  // Sitting at the PC is mirrored into the hash (`/#desk`), so the back button
  // gets up from the chair and the seat can be linked to; the old `/#products`
  // style links are sent on to their pages (see `sectionUrl.ts`).

  /** False until the hash we arrived with has been honoured. */
  const urlApplied = useRef(false);

  useEffect(() => {
    const applyUrl = (fromHistory: boolean) => {
      const section = sectionFromHash(window.location.hash);
      // Only on the hub: the provider lives in the root layout, and a reading
      // page's own `#` is a heading, not an area.
      if (movedToPage(section) && window.location.pathname === "/") {
        // replace, not assign: the old URL is not a step anyone wants to go
        // back to — it would only send them forward again.
        window.location.replace(pathForSection(section));
        return;
      }
      setActiveSection(section);
      // The same "always land at standard" normalization unfocus() carries —
      // otherwise the back button or a direct link could leave the visitor
      // stranded in the fisheye.
      setViewZoom("standard");
      // Going back to no section is a request to see the diorama again.
      if (fromHistory && !section) setHomeNonce((n) => n + 1);
      urlApplied.current = true;
    };

    // Honour a hash the visitor arrived with, deferred a frame rather than run
    // during render: the page is prerendered without it, so applying it in the
    // render pass would make the first client render disagree with the markup.
    const initial = requestAnimationFrame(() => applyUrl(false));
    const onPopState = () => applyUrl(true);

    window.addEventListener("popstate", onPopState);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    // Until the incoming hash has been read, writing to the URL would erase it.
    if (!urlApplied.current) return;

    const wanted = hashForState(activeSection);
    // Already correct — which is exactly the case when this state came *from*
    // the URL, so following a link or going back never pushes a second entry.
    if (window.location.hash === wanted) return;

    // pushState, not replaceState: sitting down is its own step back, which
    // is what makes the back button get up from the chair.
    window.history.pushState(null, "", wanted || window.location.pathname);
  }, [activeSection]);

  // Memoised so a re-render of the provider that changed none of this — a
  // parent re-rendering, a state set to the value it already held — does not
  // hand every consumer a new object. Every consumer here is above the
  // `<Canvas>`, whose setup effect has no dependency array and re-renders the
  // whole three.js tree when it runs (see `facingChannel` for the full note).
  const value = useMemo(
    () => ({
      activeSection, setActiveSection, unfocus, goHome, homeNonce,
      turnTo, turnRequest, viewZoom, setViewZoom, lights, flipLight,
    }),
    [activeSection, unfocus, goHome, homeNonce, turnTo, turnRequest, viewZoom, lights, flipLight]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
