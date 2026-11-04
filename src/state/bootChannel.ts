"use client";

import { useSyncExternalStore } from "react";

/**
 * How far the room has got towards its first picture (2026-11-04, the user:
 * 「サイトアクセス時最初の画面が描画されるまでのローディング画面」), for the boot
 * screen (`hub/BootScreen.tsx`) to show:
 *
 *  - `html`: the prerendered page, before its scripts run
 *  - `hydrated`: the scripts have run (the boot screen's own effect says so)
 *  - `built`: the scene graph exists, nothing drawn yet (the canvas's `onCreated`)
 *  - `drawn`: the first frame has been drawn (`Scene`'s `FirstFrame`)
 *
 * **A subscription rather than state in `Hub`**, for `facingChannel`'s
 * reason: every render of `Hub` re-renders the whole three.js tree, and the
 * stage changes three times while that tree is being built for the first time.
 *
 * Only ever moves forward, and once per page load: coming back to the room
 * from a reading page builds a new canvas, but the boot screen is for arriving
 * at the site, not for every return.
 */

export const BOOT_STAGES = ["html", "hydrated", "built", "drawn"] as const;
export type BootStage = (typeof BOOT_STAGES)[number];

/** The boot screen's lines, in order — each is done once the stage after it is reached. */
export const BOOT_LINES = [
  { ja: "スクリプトの読み込み", en: "Loading scripts" },
  { ja: "部屋の組み立て", en: "Building the room" },
  { ja: "照明の点灯", en: "Turning on the lights" },
] as const;

/** Whichever of two stages is further along. */
export function laterStage(a: BootStage, b: BootStage): BootStage {
  return BOOT_STAGES.indexOf(b) > BOOT_STAGES.indexOf(a) ? b : a;
}

/** Where a boot line stands at a stage: line `i` is under way at stage `i`, and done after it. */
export function bootLineState(stage: BootStage, line: number): "done" | "doing" | "todo" {
  const at = BOOT_STAGES.indexOf(stage);
  return at > line ? "done" : at === line ? "doing" : "todo";
}

let current: BootStage = "html";
const listeners = new Set<() => void>();

/** The stage reached so far. */
export function bootNow(): BootStage {
  return current;
}

/** Say a stage has been reached. A no-op when it is not further along than the current one. */
export function publishBoot(stage: BootStage): void {
  const next = laterStage(current, stage);
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribeBoot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The server snapshot: the prerendered page is always before its scripts. */
function serverBoot(): BootStage {
  return "html";
}

/** The stage, as a value a component re-renders on. */
export function useBoot(): BootStage {
  return useSyncExternalStore(subscribeBoot, bootNow, serverBoot);
}
