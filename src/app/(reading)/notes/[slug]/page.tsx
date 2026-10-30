import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOTES, PROJECTS, formatNoteDate, localizeProjects, notePath, sortNotesNewestFirst } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import CornerBrackets from "@/ui/CornerBrackets";
import { readingMetadata } from "@/reading/pageMeta";
import NoteList from "@/reading/NoteList";
import ProductList from "@/reading/ProductList";
import ArticlePager from "@/reading/ArticlePager";
import { adjacentEntries } from "@/reading/adjacentEntry";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return NOTES.map(({ slug }) => ({ slug }));
}

/** How many other entries to suggest under a note. */
const MORE_NOTES = 6;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const note = NOTES.find((n) => n.slug === slug);
  if (!note) return {};
  return readingMetadata({ path: notePath(note.slug), title: note.title, description: note.description });
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  const sortedNotes = sortNotesNewestFirst(NOTES);
  const pair = adjacentEntries(sortedNotes, slug);
  if (!pair) notFound();

  const { current: note, prev, next } = pair;
  const { default: Body } = await import(`@/content/notes/${slug}.mdx`);
  const products = localizeProjects(
    PROJECTS.filter((p) => note.products.includes(p.slug)),
    "ja"
  );
  const more = sortedNotes.filter((n) => n.slug !== slug).slice(0, MORE_NOTES);

  return (
    <ArticlePager
      prev={{
        href: notePath(prev.slug),
        title: prev.title,
      }}
      next={{
        href: notePath(next.slug),
        title: next.title,
      }}
    >
      <article>
        {/* Title header card matching full max-w-6xl width and industrial style */}
        <header className="relative rounded-none bg-white border border-black/20 p-6 sm:p-8 md:p-10">
          <CornerBrackets size="lg" offset="card" strokeWidth="2" colorClass="border-neutral-900" />

          <time
            dateTime={note.date}
            className="inline-block text-neutral-100 font-mono text-xs font-bold bg-neutral-900 border border-neutral-700 px-2.5 py-0.5 rounded-none tabular-nums"
          >
            {formatNoteDate(note.date)}
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

        {/* Note body aligned to the full width container */}
        <div className="mt-10 bg-white border border-black/20 p-6 sm:p-8 md:p-12 relative">
          <CornerBrackets size="lg" offset="card" strokeWidth="2" colorClass="border-neutral-900" />
          <div className="max-w-4xl">
            <Body />
          </div>
        </div>
      </article>

      {products.length > 0 && (
        <section aria-labelledby="products-heading" className="mt-20">
          <SectionHeading id="products-heading" size="md" className="mb-8">
            このノートに出てくるプロダクト
          </SectionHeading>
          <ProductList projects={products} titleAs="h3" columns={3} />
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-heading" className="mt-20">
          <SectionHeading id="more-heading" size="md" className="mb-8">
            ほかのノート
          </SectionHeading>
          <NoteList notes={more} titleAs="h3" />
        </section>
      )}
    </ArticlePager>
  );
}
