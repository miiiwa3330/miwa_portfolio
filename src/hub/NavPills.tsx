import Link from "next/link";
import type { SectionType } from "@/types";
import CornerBrackets from "@/ui/CornerBrackets";
import { NAV, PAGE_LINKS, leadsToHub, navKey, offHubHref, type NavEntry } from "./nav";

type Props = {
  isJa: boolean;
  /** The entry drawn lit. */
  current: NavEntry | undefined;
  /**
   * Given on the hub, where an area is a camera flight rather than a page:
   * its entry becomes a button that calls this. Without it (the reading
   * pages) every area is a link — see `offHubHref`, and `leadsToHub`
   * for why the ones into the hub are plain <a>. The page links after the
   * divider are next/link everywhere.
   */
  onSectionClick?: (id: NonNullable<SectionType>) => void;
  className?: string;
  onLight?: boolean;
};

const itemClass = (lit: boolean, onLight: boolean) => {
  if (onLight) {
    return `group relative h-8.5 sm:h-9 px-3.5 sm:px-4 flex items-center justify-center rounded-none text-xs sm:text-sm font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-150 ${lit
      ? "bg-white text-neutral-900 border border-white shadow-sm"
      : "text-neutral-300 hover:text-white hover:bg-neutral-800/80 border border-transparent"
    }`;
  }
  return `group relative h-8.5 sm:h-9 px-3.5 sm:px-4 flex items-center justify-center rounded-none text-xs sm:text-sm font-mono font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-150 ${lit
    ? "bg-neutral-900 text-neutral-100 border border-black shadow-sm"
    : "text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100/80 border border-transparent"
  }`;
};

/**
 * The box navigation bar in the header's top right — the hub's and the
 * reading pages', drawn by this one component so the two cannot drift apart.
 * Styled in the loo100 aesthetic (radius: 0, box-label, fine border).
 * Inverted to dark container + white selection when viewing detail pages on light background.
 * Semi-transparent with backdrop-blur for subtle frosted glass look.
 */
export default function NavPills({ isJa, current, onSectionClick, className = "", onLight = false }: Props) {
  const bracketColor = (lit: boolean) => {
    if (onLight) return lit ? "border-neutral-900" : "border-white";
    return lit ? "border-neutral-900" : "border-neutral-800";
  };

  return (
    <nav
      aria-label={isJa ? "メニュー" : "Menu"}
      className={`h-12 gap-1.5 pointer-events-auto px-2 rounded-none shadow-none backdrop-blur-md flex items-center transition-colors duration-200 ${
        onLight
          ? "bg-neutral-900/85 border border-black text-neutral-100"
          : "bg-white/85 border border-black/20 text-neutral-800"
      } ${className}`}
    >
      {NAV.map((item) => {
        const lit = item === current;
        const label = isJa ? item.ja : item.en;

        if (onSectionClick) {
          const id = item.section;
          return (
            <button key={navKey(item)} onClick={() => onSectionClick(id)} className={itemClass(lit, onLight)}>
              <CornerBrackets
                size="xs"
                offset="tight"
                strokeWidth="2"
                colorClass={bracketColor(lit)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {label}
            </button>
          );
        }
        const href = offHubHref(item);
        const linkProps = { href, "aria-current": lit ? ("page" as const) : undefined, className: itemClass(lit, onLight) };
        return leadsToHub(href) ? (
          <a key={navKey(item)} {...linkProps}>
            <CornerBrackets
              size="xs"
              offset="tight"
              strokeWidth="2"
              colorClass={bracketColor(lit)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            {label}
          </a>
        ) : (
          <Link key={navKey(item)} {...linkProps}>
            <CornerBrackets
              size="xs"
              offset="tight"
              strokeWidth="2"
              colorClass={bracketColor(lit)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            {label}
          </Link>
        );
      })}

      {/* The "｜" between the areas and the pages off the hub. */}
      <span aria-hidden="true" className={`self-center w-px h-5 mx-1.5 ${onLight ? "bg-neutral-700" : "bg-neutral-300"}`} />

      {PAGE_LINKS.map((link) => {
        const lit = link === current;
        return (
          <Link
            key={navKey(link)}
            href={link.page}
            aria-current={lit ? "page" : undefined}
            className={itemClass(lit, onLight)}
          >
            <CornerBrackets
              size="xs"
              offset="tight"
              strokeWidth="2"
              colorClass={bracketColor(lit)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            {isJa ? link.ja : link.en}
          </Link>
        );
      })}
    </nav>
  );
}
