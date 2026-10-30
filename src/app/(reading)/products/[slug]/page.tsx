import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { NOTES, PROJECTS, localizeProject, localizeProjects, notesForProduct, productPath } from "@/data";
import { statusLabel } from "@/detail/products/catalog";
import { CategoryBadge, StatusBadge } from "@/detail/products/Badges";
import SectionHeading from "@/detail/SectionHeading";
import CornerBrackets from "@/ui/CornerBrackets";
import { readingMetadata } from "@/reading/pageMeta";
import ProductActions from "@/reading/ProductActions";
import ProductList from "@/reading/ProductList";
import NoteList from "@/reading/NoteList";
import ArticlePager from "@/reading/ArticlePager";
import ProseSections from "@/reading/ProseSections";
import { adjacentEntries } from "@/reading/adjacentEntry";

type Params = { params: Promise<{ slug: string }> };

// Only the catalogue's own slugs exist; anything else is a 404 rather than an
// attempt to render at request time, which a static export cannot do anyway.
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

/** The popup's small caps label above Overview and Tech Stack. */
const LABEL = "font-mono font-bold mb-3 border-b border-black/10 pb-2 text-xs tracking-widest uppercase text-neutral-600";

function findProject(slug: string) {
  const source = PROJECTS.find((p) => p.slug === slug);
  return source ? localizeProject(source, "ja") : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = findProject((await params).slug);
  if (!project) return {};
  return readingMetadata({
    path: productPath(project.slug),
    title: `${project.title} — 制作実績`,
    description: project.description,
    image: project.image,
  });
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const allLocalized = localizeProjects(PROJECTS, "ja");
  const pair = adjacentEntries(allLocalized, slug);
  if (!pair) notFound();

  const { current: project, prev, next } = pair;
  const { default: Body } = await import(`@/content/products/${slug}.mdx`);
  const notes = notesForProduct(NOTES, slug);
  const others = allLocalized.filter((p) => p.slug !== slug);

  return (
    <ArticlePager
      prev={{
        href: productPath(prev.slug),
        title: prev.title,
        subtitle: prev.description,
        badge: prev.category.toUpperCase(),
      }}
      next={{
        href: productPath(next.slug),
        title: next.title,
        subtitle: next.description,
        badge: next.category.toUpperCase(),
      }}
    >
      <article>
        {/* The header card, at the index pages' full max-w-6xl width */}
        <header className="relative group rounded-none bg-white border border-black/20 overflow-hidden">
          <CornerBrackets
            size="lg"
            offset="card"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div className="relative h-64 sm:h-80 md:h-[26rem] w-full bg-neutral-100">
            <Image
              src={project.image}
              alt={`${project.title} の画面`}
              fill
              priority
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute top-5 left-5 sm:top-6 sm:left-6">
              <StatusBadge size="lg" status={project.status} label={statusLabel(project.status, "ja")} />
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <h1 className="min-w-0 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-neutral-950 [overflow-wrap:anywhere]">
                {project.title}
              </h1>
              <CategoryBadge size="lg" category={project.category} />
            </div>

            <div className="mt-8 space-y-6">
              <section aria-labelledby="overview-heading">
                <h2 id="overview-heading" className={LABEL}>
                  Overview
                </h2>
                <p className="text-neutral-700 text-base sm:text-lg leading-relaxed">{project.description}</p>
              </section>
              <section aria-labelledby="stack-heading">
                <h2 id="stack-heading" className={LABEL}>
                  Tech Stack
                </h2>
                <ul className="flex flex-wrap gap-2 font-mono">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="px-2.5 py-1 bg-neutral-50 border border-black/15 rounded-none text-neutral-800 text-xs font-medium"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-black/10">
              <ProductActions project={project} />
            </div>
          </div>
        </header>

        {/* The write-up body aligned to the full width container — corner brackets per "｜" (h2) prose section */}
        <div className="mt-10 bg-white border border-black/20 p-6 sm:p-8 md:p-12 relative">
          <ProseSections Body={Body} />
        </div>

        <section
          aria-labelledby="try-heading"
          className="group mt-12 relative rounded-none bg-white border border-black/20 p-6 sm:p-8 md:p-10"
        >
          <CornerBrackets
            size="md"
            offset="card"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <h2 id="try-heading" className="text-xl sm:text-2xl font-black text-neutral-950 [overflow-wrap:anywhere]">
            {project.title} を触ってみる
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-[1.85] text-neutral-600">{project.description}</p>
          <div className="mt-6">
            <ProductActions project={project} />
          </div>
        </section>
      </article>

      {notes.length > 0 && (
        <section aria-labelledby="notes-heading" className="mt-20">
          <SectionHeading id="notes-heading" size="md" className="mb-8">
            このプロダクトについてのノート
          </SectionHeading>
          <NoteList notes={notes} titleAs="h3" />
        </section>
      )}

      <section aria-labelledby="others-heading" className="mt-20">
        <SectionHeading id="others-heading" size="md" className="mb-8">
          ほかの制作実績
        </SectionHeading>
        <ProductList projects={others} titleAs="h3" columns={3} />
      </section>
    </ArticlePager>
  );
}
