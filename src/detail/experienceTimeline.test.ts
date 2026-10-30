import { describe, expect, it } from "vitest";
import { buildTimelineRows, groupTimelineByYear } from "./experienceTimeline";

describe("buildTimelineRows", () => {
  it("shows the year only on the first entry of each year and parses months", () => {
    const rows = buildTimelineRows([
      { period: "2023.07", id: "a" },
      { period: "2023", id: "b" },
      { period: "2025", id: "c" },
      { period: "2025.05", id: "d" },
      { period: "2025.11", id: "e" },
    ]);

    expect(rows.map((r) => ({
      year: r.year,
      showYear: r.showYear,
      monthNumber: r.monthNumber,
      monthLabelEn: r.monthLabelEn,
    }))).toEqual([
      { year: "2023", showYear: true, monthNumber: 7, monthLabelEn: "Jul" },
      { year: "2023", showYear: false, monthNumber: null, monthLabelEn: null },
      { year: "2025", showYear: true, monthNumber: null, monthLabelEn: null },
      { year: "2025", showYear: false, monthNumber: 5, monthLabelEn: "May" },
      { year: "2025", showYear: false, monthNumber: 11, monthLabelEn: "Nov" },
    ]);
  });

  it("groups entries by year while preserving overall index and boundary flags", () => {
    const groups = groupTimelineByYear([
      { period: "2023.07", id: "a" },
      { period: "2023", id: "b" },
      { period: "2025.05", id: "c" },
    ]);

    expect(groups.map((g) => ({
      year: g.year,
      ids: g.rows.map((r) => r.entry.id),
      firstFlags: g.rows.map((r) => r.isFirstOverall),
      lastFlags: g.rows.map((r) => r.isLastOverall),
    }))).toEqual([
      { year: "2023", ids: ["a", "b"], firstFlags: [true, false], lastFlags: [false, false] },
      { year: "2025", ids: ["c"], firstFlags: [false], lastFlags: [true] },
    ]);
  });
});

