import type { SectionType } from "@/types";
import { NOTES, PROJECTS } from "@/data";
import { leadsToHub, NAV, PAGE_LINKS } from "@/hub/nav";

/** A file on the PC's desktop: an area, or the notes. */
export type FileKey = NonNullable<SectionType> | "notes";

/**
 * What the PC's window shows (2026-11-04, the user: 「PC内PCでボタンを押した時は、
 * 画面遷移せずにそのPC内で表示されるように」). A link inside it that leads to
 * one of the site's own pages opens that page here instead — the files'
 * pages, and a product's or a note's write-up.
 */
export type PcPage =
  | { kind: "file"; file: FileKey }
  | { kind: "product"; slug: string }
  | { kind: "note"; slug: string };

/** Each file's page, as the site's own pages are addressed. */
const FILE_PAGES: { file: FileKey; page: string }[] = [
  ...NAV.map((item) => ({ file: item.section as FileKey, page: item.page })),
  ...PAGE_LINKS.map((link) => ({ file: "notes" as const, page: link.page })),
];

/**
 * Where a link clicked inside the PC goes, read from its `href` attribute as
 * written: `"desktop"` for the room's own page (the window closes), a page
 * the window can show, or null where it cannot — another site, `/archive`,
 * `/privacy`, a slug that does not exist — and the link is left to do what
 * it does.
 */
export function pcPageForHref(href: string): PcPage | "desktop" | null {
  // Root-relative only: `//host/...` is another site, as is a full URL.
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  if (leadsToHub(href)) return "desktop";
  const path = href.replace(/[?#].*$/, "").replace(/\/$/, "");

  const file = FILE_PAGES.find((entry) => entry.page === path);
  if (file) return { kind: "file", file: file.file };

  const [, section, slug, ...rest] = path.split("/");
  if (!slug || rest.length > 0) return null;
  if (section === "products" && PROJECTS.some((p) => p.slug === slug)) return { kind: "product", slug };
  if (section === "notes" && NOTES.some((n) => n.slug === slug)) return { kind: "note", slug };
  return null;
}
