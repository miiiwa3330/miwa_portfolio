import type { Metadata } from "next";
import { PROJECTS, localizeProjects } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import { readingMetadata } from "@/reading/pageMeta";
import ProductList from "@/reading/ProductList";

const DESCRIPTION =
  "Miiiwa が作ってきたプロダクトの一覧です。ブラウザで遊べるゲームや Web サービスから、開発中のアプリまで。それぞれのページに、作った理由と中身の話を書いています。";

export const metadata: Metadata = readingMetadata({
  path: "/products",
  title: "制作実績",
  description: DESCRIPTION,
  type: "website",
});

export default function ProductsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <SectionHeading as="h1" en="Products" className="mb-10 md:mb-14">制作実績</SectionHeading>
      <ProductList projects={localizeProjects(PROJECTS, "ja")} />
    </div>
  );
}
