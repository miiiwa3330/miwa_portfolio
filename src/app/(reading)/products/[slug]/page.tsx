import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS, localizeProject, productPath } from "@/data";
import { readingMetadata } from "@/reading/pageMeta";
import ProseSections from "@/reading/ProseSections";
import ProductDetailContent from "@/reading/ProductDetailContent";

type Params = { params: Promise<{ slug: string }> };

// Only the catalogue's own slugs exist; anything else is a 404 rather than an
// attempt to render at request time, which a static export cannot do anyway.
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map(({ slug }) => ({ slug }));
}

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
  if (!PROJECTS.some((p) => p.slug === slug)) notFound();

  const [{ default: BodyJa }, { default: BodyEn }] = await Promise.all([
    import(`@/content/products/${slug}.mdx`),
    import(`@/content/products/en/${slug}.mdx`),
  ]);

  return (
    <ProductDetailContent
      slug={slug}
      bodyJa={<ProseSections Body={BodyJa} />}
      bodyEn={<ProseSections Body={BodyEn} />}
    />
  );
}
