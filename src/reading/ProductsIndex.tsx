"use client";

import { PROJECTS, localizeProjects, projectsByKind } from "@/data";
import SectionHeading from "@/detail/SectionHeading";
import { useLanguage } from "@/state/LanguageContext";
import ProductList from "./ProductList";

/**
 * Products index split into personal products and client work, updating section
 * headings and card prose when the reader toggles language.
 */
export default function ProductsIndex() {
  const { language } = useLanguage();
  const localized = localizeProjects(PROJECTS, language);
  const myProducts = projectsByKind(localized, "product");
  const clientWorks = projectsByKind(localized, "client");

  return (
    <div className="space-y-16 md:space-y-20">
      <section aria-labelledby="my-products-heading">
        <SectionHeading id="my-products-heading" size="md" en="My Products" className="mb-6 md:mb-8">
          マイプロダクト
        </SectionHeading>
        <ProductList projects={myProducts} titleAs="h3" />
      </section>

      <section aria-labelledby="client-work-heading">
        <SectionHeading id="client-work-heading" size="md" en="Client Work" className="mb-6 md:mb-8">
          クライアントワーク
        </SectionHeading>
        <ProductList projects={clientWorks} titleAs="h3" />
      </section>
    </div>
  );
}
