import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOTES, notePath } from "@/data";
import { readingMetadata } from "@/reading/pageMeta";
import ProseSections from "@/reading/ProseSections";
import NoteDetailContent from "@/reading/NoteDetailContent";
import JsonLd from "@/reading/JsonLd";
import { bottomNavForPath } from "@/reading/breadcrumbs";
import { breadcrumbJsonLd, noteJsonLd } from "@/reading/structuredData";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return NOTES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const note = NOTES.find((n) => n.slug === slug);
  if (!note) return {};
  return readingMetadata({ path: notePath(note.slug), title: note.title, description: note.description });
}

export default async function NotePage({ params }: Params) {
  const { slug } = await params;
  const note = NOTES.find((n) => n.slug === slug);
  if (!note) notFound();

  const [{ default: BodyJa }, { default: BodyEn }] = await Promise.all([
    import(`@/content/notes/${slug}.mdx`),
    import(`@/content/notes/en/${slug}.mdx`),
  ]);

  const path = notePath(slug);
  return (
    <>
      <JsonLd data={noteJsonLd(note)} />
      <JsonLd data={breadcrumbJsonLd(bottomNavForPath(path, true).breadcrumbs, path)} />
      <NoteDetailContent
        slug={slug}
        bodyJa={<ProseSections Body={BodyJa} />}
        bodyEn={<ProseSections Body={BodyEn} />}
      />
    </>
  );
}
