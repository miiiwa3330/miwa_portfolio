export type AdjacentPair<T> = {
  prev: T;
  current: T;
  next: T;
  index: number;
  total: number;
};

/**
 * Pure function to find the previous and next entries in a list (wrapping around
 * at the ends so both left and right navigation buttons are always available).
 */
export function adjacentEntries<T extends { slug: string }>(
  items: readonly T[],
  slug: string
): AdjacentPair<T> | null {
  const total = items.length;
  if (total === 0) return null;
  const index = items.findIndex((item) => item.slug === slug);
  if (index === -1) return null;

  const prevIndex = (index - 1 + total) % total;
  const nextIndex = (index + 1) % total;

  return {
    prev: items[prevIndex]!,
    current: items[index]!,
    next: items[nextIndex]!,
    index,
    total,
  };
}
