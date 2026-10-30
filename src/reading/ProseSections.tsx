import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { useMDXComponents } from "@/mdx-components";
import CornerBrackets from "@/ui/CornerBrackets";
import { groupProseByHeading } from "./groupProseByHeading";

type Props = {
  Body: (props: { components?: ReturnType<typeof useMDXComponents> }) => ReactNode;
};

/**
 * Renders an MDX body grouped by its `h2` ("｜" bar) headings so each `｜`
 * prose unit displays corner brackets ("「」") when hovered/selected.
 */
export default function ProseSections({ Body }: Props) {
  const components = useMDXComponents();
  const root = Body({ components });
  const rawNodes: ReactNode[] =
    isValidElement<{ children?: ReactNode }>(root) && root.type === Fragment
      ? Children.toArray(root.props.children)
      : Children.toArray(root);

  const sections = groupProseByHeading(
    rawNodes,
    (node) => isValidElement(node) && (node.type === components.h2 || node.type === "h2"),
    (node) => typeof node === "string" && node.trim() === "",
  );

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
