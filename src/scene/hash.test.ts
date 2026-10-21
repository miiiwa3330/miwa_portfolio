import { describe, expect, it } from "vitest";
import { hash01, hashRange } from "./hash";

describe("hash01", () => {
  it("returns the same value for the same seed", () => {
    expect(hash01(42)).toBe(hash01(42));
    expect(hash01(-3.75)).toBe(hash01(-3.75));
  });

  it("stays inside [0, 1)", () => {
    for (let i = -500; i < 500; i++) {
      const v = hash01(i * 0.37);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("decorrelates nearby seeds, which is what makes the room look varied", () => {
    const values = Array.from({ length: 200 }, (_, i) => hash01(i));
    expect(new Set(values).size).toBeGreaterThan(190);
  });

  it("spreads roughly evenly across the unit interval", () => {
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 5000; i++) buckets[Math.floor(hash01(i * 1.7) * 10)]++;
    for (const count of buckets) expect(count).toBeGreaterThan(250); // 50% of uniform
  });
});

describe("hashRange", () => {
  it("stays within the requested bounds", () => {
    for (let i = 0; i < 500; i++) {
      const v = hashRange(i, -14, 14);
      expect(v).toBeGreaterThanOrEqual(-14);
      expect(v).toBeLessThan(14);
    }
  });

  it("is deterministic", () => {
    expect(hashRange(7, 0.4, 1)).toBe(hashRange(7, 0.4, 1));
  });

  it("collapses to a point when min equals max", () => {
    expect(hashRange(9, 5, 5)).toBe(5);
  });
});
