/**
 * The diorama's own sense of time: one number that only ever goes forward.
 *
 * Everything that moves on its own reads this instead of the renderer's clock.
 * It used to be what the pause button stopped (removed 2026-10-29); what is
 * left is the guard against the renderer's clock going backwards, below.
 *
 * Deliberately not React state. It is read inside `useFrame` by components
 * that must never re-render at 60Hz, the same reasoning as `markerScreen.ts`.
 */

export type SceneClock = {
  /** Scene time, given the renderer's own elapsed time for this frame. */
  time(elapsed: number): number;
  /** This frame's step. The renderer's own: kept as the one place a step is taken from, as `time` is. */
  delta(realDelta: number): number;
};

export function createSceneClock(): SceneClock {
  /**
   * The renderer's clock is not monotonic, so this carries the resets.
   *
   * R3F's `setFrameloop` does `clock.stop(); clock.elapsedTime = 0;
   * clock.start(); clock.elapsedTime = 0`, so every switch of `frameloop`
   * restarts `elapsedTime` from zero, and everything whose position is a
   * function of scene time would teleport on that one frame. Until 2026-10-30
   * the canvas was switched to `"demand"` behind the detail sheet and back,
   * twice per visit. Nothing switches it now; the guard stays, because it costs
   * a comparison a frame and the throttle is the first thing to reach for
   * again whenever the canvas is covered.
   */
  let lastElapsed = 0;
  let restarts = 0;

  /** The renderer's reading, made monotonic. */
  const now = (elapsed: number): number => {
    if (elapsed < lastElapsed) restarts += lastElapsed - elapsed;
    lastElapsed = elapsed;
    return elapsed + restarts;
  };

  return {
    time: (elapsed) => now(elapsed),
    delta: (realDelta) => realDelta,
  };
}

/** The one clock the whole diorama shares. */
export const sceneClock = createSceneClock();
