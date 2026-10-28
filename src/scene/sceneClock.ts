/**
 * The diorama's own monotonic sense of time.
 *
 * Everything that moves on its own reads this instead of the renderer's clock,
 * keeping autonomous motion smooth across render-loop state transitions.
 *
 * Deliberately not React state. It is read inside `useFrame` by components
 * that must never re-render at 60Hz, the same reasoning as `markerScreen.ts`.
 */

export type SceneClock = {
  /** Scene time, given the renderer's own elapsed time for this frame. */
  time(elapsed: number): number;
  /** This frame's step — always realDelta since diorama time only flows forward. */
  delta(realDelta: number): number;
};

export function createSceneClock(): SceneClock {
  /**
   * The renderer's clock is not monotonic, so this carries the resets.
   *
   * `frameloop` is switched to `"demand"` while the detail page covers the
   * canvas and back to `"always"` when it starts to come off (see Scene.tsx and
   * Hub's `sceneObscured`). R3F's `setFrameloop` does `clock.stop();
   * clock.elapsedTime = 0; clock.start(); clock.elapsedTime = 0` — so
   * `elapsedTime` **restarts from zero twice per visit to a detail page**, and
   * everything whose position is a function of scene time teleports on that one
   * frame: the clouds, the marker pulse and the strike the leader line is drawn
   * from. The reveal happens while the reader is scrolling into a transparent
   * spacer, so it is in view when it lands.
   *
   * Absorbed here rather than by giving up the `demand` throttle, which is the
   * cheapest thing this page does for its battery. Everything downstream keeps
   * reading one number that only ever goes forward.
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
