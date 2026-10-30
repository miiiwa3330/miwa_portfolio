"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import { formatNoteDate, localizeNotes, notePath, type NoteSource } from "@/data";
import { useLanguage } from "@/state/LanguageContext";

type Props = {
  notes: readonly NoteSource[];
  /** Heading level of each entry's title — `h2` on the index, `h3` under a section heading. */
  titleAs?: "h2" | "h3";
};

/**
 * Notes as cards in the voice of the hub's Experience timeline: the date in
 * the same orange pill as a milestone's period, a bold title, the summary,
 * and the "›" call to action at the foot. The whole card is the link.
 *
 * Two columns at most, unlike the products' three: a note's title is a
 * sentence (the longest runs to 27 characters), not a product's name.
 */
export default function NoteList({ notes, titleAs: Title = "h2" }: Props) {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const localizedNotes = localizeNotes(notes, language);

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[repeat(2,minmax(0,1fr))] gap-6">
      {localizedNotes.map((note) => (
        <li key={note.slug} className="flex">
          <Link
            href={notePath(note.slug)}
            className="group relative flex-1 flex flex-col p-5 sm:p-6 rounded-none bg-white border border-black/20 hover:border-black motion-safe:hover:-translate-y-1 transition-[border-color,transform] duration-200 focus-visible:outline-none"
          >
            <CornerBrackets size="sm" offset="normal" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />

            <time
              dateTime={note.date}
              className="self-start text-neutral-100 font-mono text-[10px] font-bold bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-none tabular-nums uppercase"
            >
              {formatNoteDate(note.date, language)}
            </time>
            <Title className="mt-3 font-bold text-neutral-950 text-lg sm:text-xl leading-[1.5] group-hover:underline transition-colors [overflow-wrap:anywhere]">
              {note.title}
            </Title>
            <p className="mt-2 flex-1 text-neutral-600 text-sm sm:text-base leading-relaxed">{note.description}</p>
            <div className="mt-4 pt-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 font-mono">
              <span className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-neutral-500">
                {note.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </span>
              <span className="ml-auto inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-bold text-neutral-900 group-hover:underline uppercase">
                {isJa ? "読む" : "Read"}
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="motion-safe:group-hover:translate-x-0.5 transition-transform duration-200"
                />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
