import { describe, expect, it } from "vitest";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { contentSlugs, readContent, type ContentKind } from "@/content/contentFiles.testutil";
import { splitMdxBody } from "./splitMdxBody";

/** Stands in for `mdx-components.tsx`'s `h2`: what matters is that it is a component, not the string. */
const H2 = () => null;
const P = () => null;
const COMPONENTS = { h2: H2, p: P };

/** The `##` headings in the source, outside code blocks. */
function h2Count(mdx: string): number {
  return mdx.replace(/```[\s\S]*?```/g, "").split("\n").filter((line) => line.startsWith("## ")).length;
}

/** Whether anything comes before the first `##` (outside code blocks). */
function hasLead(mdx: string): boolean {
  const body = mdx.replace(/```[\s\S]*?```/g, "x");
  const first = body.search(/^## /m);
  return (first === -1 ? body : body.slice(0, first)).trim() !== "";
}

/** The body compiled as the build compiles it, and called as `ProseSections` calls it. */
async function render(mdx: string) {
  const { default: Body } = await evaluate(mdx, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    useMDXComponents: () => COMPONENTS,
  });
  return Body({ components: COMPONENTS });
}

describe("splitMdxBody, over the real bodies", () => {
  for (const kind of ["products", "notes"] as ContentKind[]) {
    for (const slug of contentSlugs(kind)) {
      it(`frames each heading of ${kind}/${slug} on its own`, async () => {
        const mdx = readContent(kind, slug);
        const sections = splitMdxBody(await render(mdx), H2);
        expect(sections.length).toBe(h2Count(mdx) + (hasLead(mdx) ? 1 : 0));
      });
    }
  }

  it("has bodies with headings to split, so the loop above is not vacuous", () => {
    const counts = contentSlugs("notes").map((slug) => h2Count(readContent("notes", slug)));
    expect(Math.max(...counts)).toBeGreaterThan(1);
  });
});

describe("splitMdxBody", () => {
  it("starts each group at its heading and keeps what follows with it", async () => {
    const sections = splitMdxBody(await render("Lead.\n\n## One\n\nA.\n\nB.\n\n## Two\n\nC.\n"), H2);
    expect(sections.map((group) => group.length)).toEqual([1, 3, 2]);
  });

  it("splits on the component the body was given for `##`, and on nothing else", async () => {
    const body = await render("Lead.\n\n## One\n\nA.\n");
    expect(splitMdxBody(body, () => null)).toHaveLength(1);
  });
});
