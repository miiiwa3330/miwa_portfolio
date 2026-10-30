import type { ExperienceSource } from "@/data/experience";

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export type TimelineRow<T extends { period: string }> = {
  entry: T;
  year: string;
  /** True only on the first entry of a given year so repeated years are omitted. */
  showYear: boolean;
  /** 1–12 when `period` is `YYYY.MM`, or `null` when `period` is a bare year `YYYY`. */
  monthNumber: number | null;
  /** Short English month name ("Jan".."Dec") when `monthNumber` is present. */
  monthLabelEn: string | null;
};

/**
 * Transforms chronological `EXPERIENCE` entries into display rows for the
 * single-axis timeline layout:
 * - Extracts the 4-digit year and marks `showYear: true` only when the year
 *   changes from the previous row.
 * - Parses optional `.MM` suffixes into numeric month (`1`–`12`) and English
 *   short month label.
 */
export function buildTimelineRows<T extends { period: string }>(
  entries: readonly T[],
): TimelineRow<T>[] {
  let prevYear = "";

  return entries.map((entry) => {
    const [year, rawMonth] = entry.period.split(".");
    const showYear = year !== prevYear;
    prevYear = year;

    const monthNumber = rawMonth ? Number(rawMonth) : null;
    const monthLabelEn =
      monthNumber !== null && monthNumber >= 1 && monthNumber <= 12
        ? EN_MONTHS[monthNumber - 1]
        : null;

    return {
      entry,
      year,
      showYear,
      monthNumber,
      monthLabelEn,
    };
  });
}

export type ExperienceTimelineRow = TimelineRow<ExperienceSource>;

export type TimelineIndexedRow<T extends { period: string }> = TimelineRow<T> & {
  index: number;
  isFirstOverall: boolean;
  isLastOverall: boolean;
};

export type TimelineYearGroup<T extends { period: string }> = {
  year: string;
  rows: TimelineIndexedRow<T>[];
};

/**
 * Groups chronological timeline rows by 4-digit year so each year's label can
 * act as a `position: sticky` header spanning all milestones of that year.
 */
export function groupTimelineByYear<T extends { period: string }>(
  entries: readonly T[],
): TimelineYearGroup<T>[] {
  const flat = buildTimelineRows(entries);
  const groups: TimelineYearGroup<T>[] = [];

  flat.forEach((row, index) => {
    const indexed: TimelineIndexedRow<T> = {
      ...row,
      index,
      isFirstOverall: index === 0,
      isLastOverall: index === flat.length - 1,
    };
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.year !== row.year) {
      groups.push({ year: row.year, rows: [indexed] });
    } else {
      lastGroup.rows.push(indexed);
    }
  });

  return groups;
}


