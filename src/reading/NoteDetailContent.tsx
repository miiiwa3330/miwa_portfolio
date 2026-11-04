"use client";

import type { ReactNode } from "react";
import { NOTES, PROJECTS, formatNoteDate, localizeNotes, localizeProjects, notePath, sortNotesNewestFirst } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import CornerBrackets from "@/ui/CornerBrackets";
import { useLanguage } from "@/state/LanguageContext";
import NoteList from "./NoteList";
import ProductList from "./ProductList";
import ArticlePager from "./ArticlePager";
import { adjacentEntries } from "./adjacentEntry";

type Props = {
  slug: string;
  bodyJa: ReactNode;
  bodyEn: ReactNode;
};

/** How many other entries to suggest under a note. */
const MORE_NOTES = 6;

export default function NoteDetailContent({ slug, bodyJa, bodyEn }: Props) {
  const { language } = useLanguage();
  const isJa = language === "ja";

  const sortedSources = sortNotesNewestFirst(NOTES);
  const localizedAll = localizeNotes(sortedSources, language);
  const pair = adjacentEntries(localizedAll, slug);
  if (!pair) return null;

  const { current: note, prev, next } = pair;
  const products = localizeProjects(
    PROJECTS.filter((p) => note.products.includes(p.slug)),
    language,
  );
  const more = sortedSources.filter((n) => n.slug !== slug).slice(0, MORE_NOTES);

  return (
    <ArticlePager
      prev={{
        href: notePath(prev.slug),
        title: prev.title,
        subtitle: prev.description,
        badge: formatNoteDate(prev.date, language),
      }}
      next={{
        href: notePath(next.slug),
        title: next.title,
        subtitle: next.description,
        badge: formatNoteDate(next.date, language),
      }}
    >
      <article>
        {/* Title header card matching full max-w-6xl width and industrial style */}
        <header className="group relative rounded-none bg-white border border-black/20 p-6 sm:p-8 md:p-10">
          <CornerBrackets
            size="lg"
            offset="card"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <time
            dateTime={note.date}
            className="inline-block text-neutral-100 font-mono text-xs font-bold bg-neutral-900 border border-neutral-700 px-2.5 py-0.5 rounded-none tabular-nums"
          >
            {formatNoteDate(note.date, language)}
          </time>
          <h1 className="mt-5 text-[1.75rem] sm:text-4xl md:text-[2.625rem] font-black leading-[1.35] tracking-tight text-neutral-950 [overflow-wrap:anywhere]">
            {note.title}
          </h1>
          <p className="mt-5 text-base sm:text-lg leading-[1.9] text-neutral-600">{note.description}</p>
          <p className="mt-6 pt-5 border-t border-black/10 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-neutral-500">
            {note.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-neutral-50 border border-black/15 text-neutral-700">
                #{tag}
              </span>
            ))}
          </p>
        </header>

        {/* Note body aligned to the full width container — corner brackets per "｜" (h2) prose section */}
        <div className="mt-10 bg-white border border-black/20 p-6 sm:p-8 md:p-12 relative">
          {isJa ? bodyJa : bodyEn}
        </div>
      </article>

      {products.length > 0 && (
        <section aria-labelledby="products-heading" className="mt-20">
          <SectionHeading id="products-heading" size="md" en="Products in This Note" className="mb-8">
            このノートに出てくるプロダクト
          </SectionHeading>
          <ProductList projects={products} titleAs="h3" columns={3} />
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-20">
          <SectionHeading id="more-heading" size="md" en="More Notes" className="mb-8">
            ほかのノート
          </SectionHeading>
          <NoteList notes={more} titleAs="h3" />
        </section>
      )}
    </ArticlePager>
  );
}

