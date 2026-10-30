/**
 * Splits a flat list of top-level prose nodes into sections delimited by
 * `h2` ("｜" bar) headings.
 *
 * - Any leading nodes that appear before the first `h2` (such as an opening
 *   lead paragraph in a note) form the first section.
 * - Each `h2` starts a new section and includes all subsequent paragraphs,
 *   `h3` subheadings, lists, code blocks, and tables until the next `h2`.
 */
export function groupProseByHeading<T>(
  items: readonly T[],
  isHeading: (item: T) => boolean,
  isIgnorable: (item: T) => boolean = () => false,
): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];

  for (const item of items) {
    if (isIgnorable(item)) continue;

    if (isHeading(item)) {
      if (current.length > 0) {
        groups.push(current);
      }
      current = [item];
    } else {
      current.push(item);
    }
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}
