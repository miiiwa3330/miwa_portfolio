import type { SectionType } from "@/types";

type Label = { ja: string; en: string };

/**
 * One area of the room, and its dedicated static reading page.
 */
export type NavItem = Label & {
  section: NonNullable<SectionType>;
  page: string;
};

/**
 * A standalone page off the hub, drawn after the areas past a divider
 * ("｜" on the header, a rule in the full-screen menu).
 */
export type PageLink = Label & {
  page: string;
};

/** Whatever a navigation drawing may light: an area or a page. */
export type NavEntry = NavItem | PageLink;

/**
 * The areas, in the order they are drawn — the same list on the hub, in the
 * full-screen menu and on the reading pages.
 */
export const NAV: readonly NavItem[] = [
  { section: "about", page: "/about", ja: "自己紹介", en: "About me" },
  { section: "products", page: "/products", ja: "制作実績", en: "Products" },
  { section: "skills", page: "/skills", ja: "技術スタック", en: "Skills" },
  { section: "experience", page: "/experience", ja: "経歴・活動", en: "Experience" },
  { section: "contact", page: "/contact", ja: "お問い合わせ", en: "Contact" },
];

/**
 * The pages off the hub, drawn after `NAV`.
 */
export const PAGE_LINKS: readonly PageLink[] = [{ page: "/notes", ja: "ノート", en: "Note" }];

/** A stable identity for an entry — React keys. */
export function navKey(item: NavEntry): string {
  return "section" in item ? item.section : item.page;
}

/** Root-relative path for a section. */
export function pathForSection(section: NonNullable<SectionType>): string {
  const item = NAV.find((i) => i.section === section);
  return item ? item.page : `/${section}`;
}

/**
 * Whether a link drawn off the hub goes into the hub — and so has to be a
 * plain <a>, a full page load, rather than next/link.
 */
export function leadsToHub(href: string): boolean {
  return href === "/" || href.startsWith("/#");
}

/** The entry lit on the hub: the open (or focused) area, if any. */
export function navItemForSection(section: SectionType): NavItem | undefined {
  return section ? NAV.find((item) => item.section === section) : undefined;
}

/** The entry lit on a page off the hub: the nav entry whose page contains it. */
export function pageLinkForPath(pathname: string): NavEntry | undefined {
  const allEntries: readonly NavEntry[] = [...NAV, ...PAGE_LINKS];
  return allEntries.find((entry) => pathname === entry.page || pathname.startsWith(`${entry.page}/`));
}
