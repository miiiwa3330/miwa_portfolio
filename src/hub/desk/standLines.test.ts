import { describe, expect, it } from "vitest";
import { pickStandLine, STAND_LINES } from "./standLines";

/** A random source that walks evenly through [0, 1) in `steps` steps (the middle of each, clear of rounding). */
function sweep(steps: number): () => number {
  let i = 0;
  return () => ((i++ % steps) + 0.5) / steps;
}

describe("STAND_LINES", () => {
  it("says every line in both languages", () => {
    expect(STAND_LINES.length).toBeGreaterThan(1);
    for (const line of STAND_LINES) {
      expect(line.ja.trim()).not.toBe("");
      expect(line.en.trim()).not.toBe("");
    }
  });
});

describe("pickStandLine", () => {
  it("can say any line first", () => {
    const random = sweep(STAND_LINES.length);
    const said = new Set(STAND_LINES.map(() => pickStandLine(null, random)));
    expect(said.size).toBe(STAND_LINES.length);
  });

  it("never says the same line twice in a row, and can say every other one", () => {
    const count = STAND_LINES.length;
    for (let previous = 0; previous < count; previous++) {
      const random = sweep(count - 1);
      const said = new Set(Array.from({ length: count - 1 }, () => pickStandLine(previous, random)));
      expect(said.has(previous)).toBe(false);
      expect(said.size).toBe(count - 1);
    }
  });

  it("stays inside the list at the ends of the random range", () => {
    const count = STAND_LINES.length;
    for (const r of [0, 0.999999]) {
      for (const previous of [null, 0, count - 1]) {
        const i = pickStandLine(previous, () => r);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(count);
      }
    }
  });
});
