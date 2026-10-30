import { describe, expect, it } from "vitest";
import { EXPERIENCE } from "./experience";
import { PROJECTS } from "./projects";

const parsePeriod = (period: string) => {
  const [year, month] = period.split(".");
  return {
    year: Number(year),
    month: month !== undefined ? Number(month) : undefined,
  };
};

describe("the Experience timeline", () => {
  it("writes every period as a year or a year and month", () => {
    for (const e of EXPERIENCE) {
      expect(e.period, e.title.ja).toMatch(/^\d{4}(\.(0[1-9]|1[0-2]))?$/);
    }
  });

  // Rendered in array order, so an entry filed in the wrong place would sit in
  // the wrong place on screen with nothing to say so.
  it("runs oldest first", () => {
    const parsed = EXPERIENCE.map((e) => parsePeriod(e.period));
    for (let i = 1; i < parsed.length; i++) {
      const prev = parsed[i - 1];
      const curr = parsed[i];
      const label = `${EXPERIENCE[i].period} ${EXPERIENCE[i].title.ja}`;
      expect(curr.year, label).toBeGreaterThanOrEqual(prev.year);
      if (curr.year === prev.year && prev.month !== undefined && curr.month !== undefined) {
        expect(curr.month, label).toBeGreaterThanOrEqual(prev.month);
      }
    }
  });

  it("gives every milestone prose in both languages", () => {
    for (const e of EXPERIENCE) {
      expect(e.title.en, e.title.ja).toBeTruthy();
      expect(e.description.ja, e.title.ja).toBeTruthy();
      expect(e.description.en, e.title.ja).toBeTruthy();
    }
  });

  // A slug that matches nothing would leave a card that looks tappable and
  // opens Products with no project in front of it.
  it("links only to projects that exist", () => {
    const slugs = new Set(PROJECTS.map((p) => p.slug));
    const linked = EXPERIENCE.filter((e) => e.project);
    expect(linked.length).toBeGreaterThan(0);
    for (const e of linked) {
      expect(slugs.has(e.project!), `${e.title.ja} -> ${e.project}`).toBe(true);
    }
  });
});
