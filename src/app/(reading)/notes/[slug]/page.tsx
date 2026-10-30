import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOTES, notePath } from "@/data";
import { readingMetadata } from "@/reading/pageMeta";
import ProseSections from "@/reading/ProseSections";
import NoteDetailContent from "@/reading/NoteDetailContent";

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
  if (!NOTES.some((n) => n.slug === slug)) notFound();

  const [{ default: BodyJa }, { default: BodyEn }] = await Promise.all([
    import(`@/content/notes/${slug}.mdx`),
    import(`@/content/notes/en/${slug}.mdx`),
  ]);

  return (
    <NoteDetailContent
      slug={slug}
      bodyJa={<ProseSections Body={BodyJa} />}
      bodyEn={<ProseSections Body={BodyEn} />}
    />
  );
}
