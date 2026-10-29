import { describe, expect, it } from "vitest";
import { adjacentEntries } from "./adjacentEntry";

const sample = [
  { slug: "first", title: "First" },
  { slug: "second", title: "Second" },
  { slug: "third", title: "Third" },
];

describe("adjacentEntries", () => {
  it("returns previous and next items for a middle entry", () => {
    const res = adjacentEntries(sample, "second");
    expect(res).toEqual({
      prev: sample[0],
      current: sample[1],
      next: sample[2],
      index: 1,
      total: 3,
    });
  });

  it("wraps around from the first entry to the last for prev", () => {
    const res = adjacentEntries(sample, "first");
    expect(res?.prev).toBe(sample[2]);
    expect(res?.next).toBe(sample[1]);
  });

  it("wraps around from the last entry to the first for next", () => {
    const res = adjacentEntries(sample, "third");
    expect(res?.prev).toBe(sample[1]);
    expect(res?.next).toBe(sample[0]);
  });

  it("returns null for an unknown slug or empty list", () => {
    expect(adjacentEntries(sample, "unknown")).toBeNull();
    expect(adjacentEntries([], "first")).toBeNull();
  });
});
