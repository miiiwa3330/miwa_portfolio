"use client";

import { useSyncExternalStore } from "react";
import type { Stop } from "@/scene/room/layout";

/**
 * Which stop the camera is currently turned towards — one of the five areas,
 * or the desk, which is on the tour but has no card.
 *
 * Published by the scene as it turns, and read by the card — so the card can
 * never disagree with what is actually on screen. Card and camera never write
 * to each other; this only ever flows one way (see `facingStop`).
 *
 * **A subscription rather than a piece of `AppStateContext`, because of what
 * it costs to sit above the `<Canvas>`.** This changes several times a lap of
 * the idle drift, and every context change re-renders `Hub`, and therefore
 * `<Canvas>` — whose setup effect in R3F 9 has *no dependency array*, so each
 * one re-runs `configure()` and re-renders the entire three.js tree (the
 * planet, the five landmarks, `FillerCity`'s 290 buildings, every decoration).
 * `React.memo` cannot help: `its-fine`'s context bridge, which is how R3F gets
 * context values across the reconciler boundary, reads every context above the
 * canvas during the canvas's own render, so the canvas subscribes to them
 * whether its props changed or not — and memoising it would instead cut
 * `CameraController` off from the context changes it does need.
 *
 * So the answer is to stop putting a per-lap value in a context that sits above
 * the canvas. Same reasoning, and the same shape, as `scene/markerScreen.ts`
 * and `hub/about/aboutScroll.ts`.
 *
 * Only `SectionCard` re-renders on a change (via `useFacing`, below): it is the
 * one thing that displays the answer. `SectionMarkers` reads `facingNow()` inside
 * its frame loop, and `Hub`'s handlers read it when they fire.
 */

/** The desk is where the tour starts, so it is what the first paint shows. */
let current: Stop = "desk";
const listeners = new Set<() => void>();

/** The area in front right now. Safe to call during render, an effect, or a frame. */
export function facingNow(): Stop {
  return current;
}

/** Say which area is in front. A no-op when it hasn't changed. */
export function publishFacing(section: Stop): void {
  if (section === current) return;
  current = section;
  for (const listener of listeners) listener();
}

/** Subscribe to the area in front changing. Returns an unsubscribe function. */
export function subscribeFacing(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The area in front, as a value a component re-renders on.
 *
 * The server snapshot is the same getter: the site is a static export, so the
 * prerendered HTML holds the tour's own starting area and the first client
 * render agrees with it — nothing has published by then, since only the frame
 * loop does and it has not run.
 */
export function useFacing(): Stop {
  return useSyncExternalStore(subscribeFacing, facingNow, facingNow);
}
