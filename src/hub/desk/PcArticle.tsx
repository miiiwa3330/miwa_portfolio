"use client";

import { useEffect, useState, type ComponentProps } from "react";
import ProseSections from "@/reading/ProseSections";
import ProductDetailContent from "@/reading/ProductDetailContent";
import NoteDetailContent from "@/reading/NoteDetailContent";

type Body = ComponentProps<typeof ProseSections>["Body"];

/**
 * A product's or a note's write-up, in the PC's window: the very component
 * its page draws (`/products/[slug]`, `/notes/[slug]`), so the two cannot say
 * different things. The page reads the MDX on the server; in here it is
 * fetched when opened, so the room's own bundle carries none of it.
 */
export default function PcArticle({ kind, slug, isJa }: { kind: "product" | "note"; slug: string; isJa: boolean }) {
  const [bodies, setBodies] = useState<{ key: string; ja: Body; en: Body } | null>(null);
  const key = `${kind}/${slug}`;

  useEffect(() => {
    let live = true;
    const load =
      kind === "product"
        ? Promise.all([import(`@/content/products/${slug}.mdx`), import(`@/content/products/en/${slug}.mdx`)])
        : Promise.all([import(`@/content/notes/${slug}.mdx`), import(`@/content/notes/en/${slug}.mdx`)]);
    load.then(([ja, en]) => {
      if (live) setBodies({ key, ja: ja.default, en: en.default });
    });
    return () => {
      live = false;
    };
  }, [kind, slug, key]);

  // The previous write-up's body is not shown under this one's title.
  if (!bodies || bodies.key !== key) {
    return <p className="px-10 py-10 font-mono text-sm text-neutral-500">{isJa ? "読み込み中…" : "Loading…"}</p>;
  }
  const Content = kind === "product" ? ProductDetailContent : NoteDetailContent;
  return (
    <div className="py-6">
      <Content slug={slug} embedded bodyJa={<ProseSections Body={bodies.ja} />} bodyEn={<ProseSections Body={bodies.en} />} />
    </div>
  );
}
