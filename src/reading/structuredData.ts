import { notePath, type NoteSource } from "@/data";
import { SITE_URL, siteUrl } from "@/data/site";
import type { BreadcrumbItem } from "./breadcrumbs";

/**
 * Structured data (JSON-LD, schema.org) for search engines: what the pages
 * are, said in a form they read without guessing — the site and who makes
 * it, a note as a post with its date, where a write-up sits in the site.
 * Rendered by `JsonLd` as a `<script>` in the page (Next 16's own guide,
 * `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`).
 *
 * Only what the page itself shows: structured data that says more than the
 * page is against Google's guidelines.
 */

const CONTEXT = "https://schema.org";

/** The site's maker, as the footer and the contact page name them. */
const AUTHOR = {
  "@type": "Person",
  name: "Miiiwa",
  url: SITE_URL,
  sameAs: ["https://github.com/miiiwa1121", "https://x.com/miiiwa3330"],
};

/** The top page: the site, and who makes it. */
export function websiteJsonLd() {
  return { "@context": CONTEXT, "@type": "WebSite", name: "Miiiwa Portfolio", url: SITE_URL, inLanguage: "ja", author: AUTHOR };
}

/** A note: a post, with the day the work it tells of was done (`NoteSource.date`). */
export function noteJsonLd(note: NoteSource) {
  const url = siteUrl(notePath(note.slug));
  return {
    "@context": CONTEXT,
    "@type": "BlogPosting",
    headline: note.title,
    description: note.description,
    datePublished: note.date,
    author: AUTHOR,
    url,
    mainEntityOfPage: url,
    inLanguage: "ja",
    keywords: note.tags.join(", "),
  };
}

/**
 * Where a page sits: the trail its footer draws (`bottomNavForPath`). The
 * last crumb has no link of its own there; it is the page, at `path`.
 */
export function breadcrumbJsonLd(crumbs: readonly BreadcrumbItem[], path: string) {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: siteUrl(crumb.href ?? path),
    })),
  };
}

/** The `<script>`'s text: JSON, with `<` escaped so no string in it can close the tag. */
export function jsonLdText(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
