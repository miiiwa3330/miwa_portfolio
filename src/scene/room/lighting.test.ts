import { describe, expect, it } from "vitest";
import { AMBIENT_FLOOR, DEFAULT_LIGHTS, NEON_THEMES, flipLight, neonTheme } from "./lighting";

describe("flipLight", () => {
  it("turns the ceiling light and the desk lamp off and on again, each on its own", () => {
    const off = flipLight(DEFAULT_LIGHTS, "ceiling");
    expect(off).toEqual({ ...DEFAULT_LIGHTS, ceiling: false });
    expect(flipLight(off, "ceiling")).toEqual(DEFAULT_LIGHTS);
    expect(flipLight(DEFAULT_LIGHTS, "desk")).toEqual({ ...DEFAULT_LIGHTS, desk: false });
  });

  it("steps the neon round every colour pair and back to the first", () => {
    let lights = DEFAULT_LIGHTS;
    const seen = new Set<string>();
    for (let i = 0; i < NEON_THEMES.length; i++) {
      seen.add(neonTheme(lights).key);
      lights = flipLight(lights, "neon");
    }
    expect(seen.size).toBe(NEON_THEMES.length);
    expect(neonTheme(lights)).toBe(neonTheme(DEFAULT_LIGHTS));
  });

  it("does not touch the other switches", () => {
    // From a dark room, so that putting anything back to its default shows.
    const dark = { ceiling: false, desk: false, neon: 1 };
    expect(flipLight(dark, "neon")).toEqual({ ceiling: false, desk: false, neon: 2 });
    expect(flipLight(dark, "ceiling")).toEqual({ ceiling: true, desk: false, neon: 1 });
  });

  it("keeps the neon's number a real index into the colour pairs", () => {
    let lights = DEFAULT_LIGHTS;
    for (let i = 0; i < NEON_THEMES.length * 3; i++) {
      lights = flipLight(lights, "neon");
      expect(lights.neon).toBeGreaterThanOrEqual(0);
      expect(lights.neon).toBeLessThan(NEON_THEMES.length);
    }
  });
});

describe("the neon", () => {
  it("starts in the room's own cool and warm pair, cyan and amber", () => {
    expect(neonTheme(DEFAULT_LIGHTS).key).toBe("cyan-amber");
  });

  it("offers more than one pair, each with a cool and a warm colour", () => {
    expect(NEON_THEMES.length).toBeGreaterThan(1);
    for (const theme of NEON_THEMES) {
      expect(theme.cool).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.warm).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("AMBIENT_FLOOR", () => {
  it("keeps the room lit with every switch off, at the measured twice the prototype's", () => {
    // Literals, not restated: the prototype's floor was 0.6 / 0.25, and
    // twice that was the least that kept every area's subject at or above the
    // lit room's darkest (step 6). Halving it again leaves the bookcase at 31.
    expect(AMBIENT_FLOOR.hemisphere).toBeGreaterThanOrEqual(1.2);
    expect(AMBIENT_FLOOR.ambient).toBeGreaterThanOrEqual(0.5);
  });
});
