import type { ReactNode } from "react";
import { useMDXComponents } from "@/mdx-components";
import CornerBrackets from "@/ui/CornerBrackets";
import { splitMdxBody } from "./splitMdxBody";

type Props = {
  Body: (props: { components?: ReturnType<typeof useMDXComponents> }) => ReactNode;
};

/**
 * Renders an MDX body grouped by its `h2` ("｜" bar) headings so each `｜`
 * prose unit displays corner brackets ("「」") when hovered.
 *
 * The body is called as a function rather than rendered as `<Body />`: the
 * grouping needs its top-level blocks, and a rendered element only exposes
 * itself. A compiled MDX body is a plain function (no hooks; its
 * `useMDXComponents` is ours, which is not one either), so calling it on the
 * server is safe. A `wrapper` in `mdx-components.tsx` would break the split
 * silently (one frame round everything) — see `splitMdxBody`.
 */
export default function ProseSections({ Body }: Props) {
  const components = useMDXComponents();
  const sections = splitMdxBody(Body({ components }), components.h2);

  return (
    <div className="space-y-8 sm:space-y-10">
      {sections.map((sectionNodes, idx) => (
        <div
          key={idx}
          className="group/prose relative p-4 sm:p-5 -mx-4 sm:-mx-5 transition-colors"
        >
          <CornerBrackets
            size="md"
            offset="tight"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover/prose:opacity-100 transition-opacity"
          />
          <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            {sectionNodes}
          </div>
        </div>
      ))}
    </div>
  );
}
