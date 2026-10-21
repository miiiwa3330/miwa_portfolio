/**
 * Reading the hologram's self-introduction to the end is how you leave it.
 *
 * The text plays by itself (`autoScrollStep`), a few lines a second on the
 * diorama's clock, and when its last line has scrolled away the camera goes
 * back to the middle of the room like any other area being left. The wheel
 * and a finger scroll it natively on top of that.
 *
 * Carried over from the self-introduction crawl that this replaced (step 5 of
 * docs/room-migration.md): the pace in lines rather than pixels, playing by
 * itself, and finishing as the way out. Not carried over: the scroll *being*
 * the camera's trip home (`aboutReturn`, gone with the crawl), and with it the
 * wheel's slow-down and catch-up, which existed only so the camera driven by
 * `scrollTop` would not judder.
 *
 * The arithmetic lives here rather than inline for the same reason the sheet's
 * does: the awkward cases are all about numbers, and they are worth pinning
 * down without a DOM.
 */

/**
 * The scroll progress (see `aboutScrollProgress`) that counts as "done".
 *
 * Exactly 1, not a hair before it — the previous version of this fired at
 * 0.995 to dodge momentum scrolling stopping a pixel or two short of the
 * column's actual scroll ceiling, but that meant the camera (and the "close
 * About" call) went home while a sliver of the last line was still on
 * screen, which is the opposite of what was asked for. Now that progress 1
 * means "the prose block's own bottom edge has scrolled past the top of the
 * box" rather than "the column has reached its scroll ceiling" (see
 * `aboutScrollProgress`), there is real headroom past that point before the
 * ceiling — the trailing spacer in Hologram.tsx is sized to guarantee it — so a
 * browser stopping short of its true maximum has nothing to strand here.
 */
export const ABOUT_RETURN_AT = 1;

/**
 * How long after the text appears before reaching its end can send the
 * reader away.
 *
 * A wheel already in motion when the area was opened would otherwise arrive
 * during the zoom and bounce straight back home.
 */
export const ABOUT_SETTLE_MS = 500;

/**
 * How fast the column advances on its own, once open, in **lines of text per
 * real second**.
 *
 * A real crawl runs with nobody's hand on it — reaching for a wheel to move
 * something styled after one would be a strange first ask of a reader. Slow
 * on purpose: this is the piece of the page meant to be read, not scrolled
 * past, and the wheel is still there for anyone who wants to go faster or
 * back up to re-read a line.
 *
 * **Lines, not pixels** — it was 22px/s, then 14px/s. A pixel rate silently
 * encodes a type size: when the crawl was resized to match
 * `reference/image9.jpg` (roughly 14 characters to a line, a character about
 * a tenth of the frame's height) the column grew from 3,553px to 7,881px for
 * exactly the same words, and 14px/s turned a 115-second read into an
 * eight-minute one without anybody changing the speed. It also meant the
 * crawl ran at four different reading speeds across the four breakpoints the
 * type steps through. A line is the unit a reader actually consumes, so
 * holding *that* rate fixed is what keeps the pace the same everywhere.
 *
 * The crawl ran at half a line a second over 14-character lines — about 7
 * characters a second, a deliberate amble below reading speed, so the wheel
 * was an accelerator rather than a necessity. **Provisional (仮):** the
 * hologram's lines hold about 25 characters (`HOLOGRAM_PX`, 22px type), so
 * the same 7 a second is 0.3 lines.
 */
export const ABOUT_AUTO_SCROLL_LINES_PER_SECOND = 0.3;

/**
 * The most one frame of auto-scroll is allowed to advance the column, in
 * seconds of (already pause-discounted) time.
 *
 * Same reasoning as `MAX_FLIGHT_STEP` in `Scene.tsx`: a backgrounded tab's
 * next `requestAnimationFrame` can arrive with a multi-second gap since the
 * last one, and advancing the column by that much in one step would jump
 * straight over lines — or over `ABOUT_RETURN_AT`; a reader stepping back to
 * the tab could find the text already gone.
 */
const MAX_AUTO_SCROLL_STEP_SECONDS = 0.1;

/**
 * How far the column should auto-advance for one frame's real time step, in
 * pixels.
 *
 * Takes the step already run through `sceneClock.delta()` — zero while
 * paused — so the caller doesn't need its own pause branch; a zero in is a
 * zero out.
 *
 * `lineHeightPx` is the column's own computed line height, read from the DOM
 * by the caller rather than restated here: it is the one number that already
 * tracks every breakpoint's type size, and it is what turns a rate in lines
 * into a rate in pixels. A non-finite or zero value (a browser that has not
 * laid the column out yet, or reports `line-height: normal`) yields no
 * movement rather than a NaN scrollTop that would strand the column.
 */
export function autoScrollStep(deltaSeconds: number, lineHeightPx: number): number {
  if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0) return 0;
  return (
    Math.min(deltaSeconds, MAX_AUTO_SCROLL_STEP_SECONDS) *
    ABOUT_AUTO_SCROLL_LINES_PER_SECOND *
    lineHeightPx
  );
}

/**
 * How far through the column the reader is, 0 to 1 — measured against the
 * prose block's own bottom edge, not the column's total scroll range.
 *
 * `proseBottom` is `prose.offsetTop + prose.offsetHeight` (Hologram.tsx):
 * a fixed document-space pixel, the position the last line sits at before any
 * scrolling. Once `scrollTop` reaches it, that line has scrolled past the top
 * of the box — the same document position the browser's own overflow clip
 * removes it at — so progress reaching 1 and the text actually being gone are
 * the same event, not an early proxy for it. This used to be measured against
 * `scrollHeight - clientHeight` (the column's true scroll ceiling), which
 * doesn't distinguish "the text is gone" from "there's a trailing spacer's
 * worth of nothing still left to scroll through" — the column could report
 * 1.0 while a fully legible line was still on screen, or the reverse.
 *
 * Returns 0 when `proseBottom` isn't known yet (a ref not mounted, or a first
 * frame before layout), rather than `scrollTop / 0` reading as "read to the
 * end" and throwing the reader home before they had seen a word of it.
 */
export function aboutScrollProgress(scrollTop: number, proseBottom: number): number {
  if (proseBottom <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / proseBottom));
}

/** Whether this scroll position, at this age, means "take me home". */
export function shouldReturnHome(progress: number, sinceOpenedMs: number): boolean {
  return progress >= ABOUT_RETURN_AT && sinceOpenedMs > ABOUT_SETTLE_MS;
}
