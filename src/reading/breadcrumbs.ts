import { NOTES, PROJECTS, localizeProject } from "@/data";
import { NAV, PAGE_LINKS } from "@/hub/nav";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BottomNavInfo = {
  breadcrumbs: BreadcrumbItem[];
  backHref: string;
  backLabel: string;
};

/**
 * Pure function that computes the breadcrumb trail and back button target
 * for any reading page path.
 */
export function bottomNavForPath(pathname: string, isJa: boolean): BottomNavInfo {
  const homeLabel = isJa ? "トップ" : "Home";
  const breadcrumbs: BreadcrumbItem[] = [{ label: homeLabel, href: "/" }];

  if (pathname.startsWith("/products/")) {
    const slug = pathname.slice("/products/".length).replace(/\/$/, "");
    const rawProject = PROJECTS.find((p) => p.slug === slug);
    const project = rawProject ? localizeProject(rawProject, isJa ? "ja" : "en") : null;
    const productsLabel = isJa ? "制作実績" : "Products";
    breadcrumbs.push({ label: productsLabel, href: "/products" });
    if (project) {
      breadcrumbs.push({ label: project.title });
    }
    return {
      breadcrumbs,
      backHref: "/products",
      backLabel: isJa ? "制作実績の一覧に戻る" : "Back to Products",
    };
  }

  if (pathname.startsWith("/notes/")) {
    const slug = pathname.slice("/notes/".length).replace(/\/$/, "");
    const note = NOTES.find((n) => n.slug === slug);
    const notesLabel = isJa ? "ノート" : "Note";
    breadcrumbs.push({ label: notesLabel, href: "/notes" });
    if (note) {
      breadcrumbs.push({ label: isJa ? note.title : (note.titleEn ?? note.title) });
    }
    return {
      breadcrumbs,
      backHref: "/notes",
      backLabel: isJa ? "ノートの一覧に戻る" : "Back to Notes",
    };
  }

  const allEntries = [...NAV, ...PAGE_LINKS];
  const matched = allEntries.find((entry) => pathname === entry.page || pathname === `${entry.page}/`);
  if (matched) {
    breadcrumbs.push({ label: isJa ? matched.ja : matched.en });
  } else if (pathname !== "/") {
    breadcrumbs.push({ label: "404 Not Found" });
  }

  return {
    breadcrumbs,
    backHref: "/",
    backLabel: isJa ? "トップへ戻る" : "Back to Home",
  };
}

