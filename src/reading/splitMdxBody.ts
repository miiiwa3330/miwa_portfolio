import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { groupProseByHeading } from "./groupProseByHeading";

/**
 * An MDX body's top-level nodes, split into one group per `h2` ("｜" bar)
 * heading, with any lead before the first heading as a group of its own.
 *
 * `root` is what the compiled MDX component returns when called as a function
 * (`Body({ components })`): a Fragment whose children are the top-level
 * blocks, with the newlines between them as strings. `h2` is the component the
 * body was given for `##` headings — the compiled body renders `##` as that
 * component, not as the string `"h2"`, once one is given.
 *
 * Silent when it goes wrong: a root of any other shape comes out as a single
 * group, and the page still renders, with one frame round the whole body.
 * `splitMdxBody.test.ts` runs it over every real MDX body for that reason.
 */
export function splitMdxBody(root: ReactNode, h2: unknown): ReactNode[][] {
  const nodes: ReactNode[] =
    isValidElement<{ children?: ReactNode }>(root) && root.type === Fragment
      ? Children.toArray(root.props.children)
      : Children.toArray(root);

  return groupProseByHeading(
    nodes,
    (node) => isValidElement(node) && (node.type === h2 || node.type === "h2"),
    (node) => typeof node === "string" && node.trim() === "",
  );
}
