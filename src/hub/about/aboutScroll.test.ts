import { describe, expect, it } from "vitest";
import { ABOUT_SETTLE_MS, aboutScrollProgress, autoScrollStep, shouldReturnHome } from "./aboutScroll";

describe("aboutScrollProgress", () => {
  it("is 0 at the top and 1 once scrollTop reaches proseBottom", () => {
    expect(aboutScrollProgress(0, 2000)).toBe(0);
    expect(aboutScrollProgress(2000, 2000)).toBe(1);
  });

  it("reads the middle proportionally", () => {
    expect(aboutScrollProgress(1000, 2000)).toBeCloseTo(0.5, 9);
  });

  // proseBottom <= 0 means the ref hasn't been measured yet (a first frame
  // before layout) — reading that as 0 rather than dividing by it keeps a
  // reader from being sent straight home before a word has scrolled past.
  it("stays at 0 when proseBottom is not known yet", () => {
    expect(aboutScrollProgress(0, 0)).toBe(0);
    expect(aboutScrollProgress(500, 0)).toBe(0);
    expect(aboutScrollProgress(500, -100)).toBe(0);
  });

  it("clamps past proseBottom rather than reporting more than 1", () => {
    // Scrolled into the trailing spacer, past the prose block's own bottom
    // edge — still fully progressed, not overshot.
    expect(aboutScrollProgress(2600, 2000)).toBe(1);
    // Rubber-banding at the top hands back a negative scrollTop.
    expect(aboutScrollProgress(-80, 2000)).toBe(0);
  });

  it("never leaves the 0..1 range for any input", () => {
    for (const top of [-500, 0, 37, 1999, 5000]) {
      for (const proseBottom of [2000, 801, 800, 1]) {
        const progress = aboutScrollProgress(top, proseBottom);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("shouldReturnHome", () => {
  const settled = ABOUT_SETTLE_MS + 1;

  it("returns once the column has been read to the end", () => {
    expect(shouldReturnHome(1, settled)).toBe(true);
  });

  // Literals, not ABOUT_RETURN_AT: written against the constant this would
  // hold for any threshold at all, including the old 0.995. The whole point
  // of the redefinition (see aboutScrollProgress) is that progress 1 already
  // means the text is fully gone, with real headroom before the column's
  // actual scroll ceiling — so unlike the old scrollHeight-based progress,
  // nothing here needs an early fudge for momentum stopping short, and
  // firing before exactly 1 would take the camera home while a sliver of
  // the last line was still on screen.
  it("does not fire until progress reaches exactly 1", () => {
    expect(shouldReturnHome(0.999, settled)).toBe(false);
    expect(shouldReturnHome(1, settled)).toBe(true);
  });

  it("stays put part way down", () => {
    expect(shouldReturnHome(0, settled)).toBe(false);
    expect(shouldReturnHome(0.5, settled)).toBe(false);
    expect(shouldReturnHome(0.98, settled)).toBe(false);
  });

  // A wheel already coasting when the area was opened arrives during the
  // entrance animation, and without the delay would bounce it straight back.
  it("ignores a scroll that lands while the column is still arriving", () => {
    expect(shouldReturnHome(1, 0)).toBe(false);
    expect(shouldReturnHome(1, ABOUT_SETTLE_MS)).toBe(false);
  });
});

describe("autoScrollStep", () => {
  /** A round line height, so the expected steps are easy to read. */
  const LINE = 100;

  it("is zero for no elapsed time", () => {
    expect(autoScrollStep(0, LINE)).toBe(0);
  });

  // Literals, not the constant: this is checking the multiplication itself
  // happens, not restating whatever the rate is set to. 0.3 of a line a second
  // of a 100px line is 30px/s, so 0.05s is 1.5px.
  it("scales linearly with elapsed time below the clamp", () => {
    expect(autoScrollStep(0.05, LINE)).toBeCloseTo(1.5, 9);
    expect(autoScrollStep(0.1, LINE)).toBeCloseTo(3, 9);
  });

  // The whole point of measuring the pace in lines: the same elapsed time has
  // to carry the reader over the same amount of *text* whatever size it is
  // rendered at. Doubling the type doubles the pixels travelled, so the words
  // still go by at one rate — which is what a pixel rate could not do (it made
  // the crawl four times slower to read the moment the type was enlarged to
  // match reference/image9.jpg).
  it("travels twice as far when the type is twice as large", () => {
    expect(autoScrollStep(0.1, 200)).toBeCloseTo(2 * autoScrollStep(0.1, 100), 9);
  });

  // The case the clamp exists for: a backgrounded tab's next rAF callback can
  // arrive seconds after the last one, and advancing the column by that much
  // in a single step would jump over lines — or past ABOUT_RETURN_AT — rather
  // than simply keep the crawl playing at its usual pace.
  it("clamps a large gap instead of jumping the column forward", () => {
    expect(autoScrollStep(1, LINE)).toBeCloseTo(3, 9);
    expect(autoScrollStep(5, LINE)).toBeCloseTo(3, 9);
  });

  // `getComputedStyle(...).lineHeight` reports the keyword `normal` on an
  // element that never set one, and reads back as NaN. Moving the column by
  // NaN sets scrollTop to 0 and pins the crawl at the top forever, which is a
  // far worse failure than simply not auto-playing.
  it("refuses a line height it cannot use, rather than producing NaN", () => {
    expect(autoScrollStep(0.1, NaN)).toBe(0);
    expect(autoScrollStep(0.1, 0)).toBe(0);
    expect(autoScrollStep(0.1, -20)).toBe(0);
  });
});

