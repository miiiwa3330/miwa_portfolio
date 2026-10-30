import Link from "next/link";
import CornerBrackets from "@/ui/CornerBrackets";
import { NAV, PAGE_LINKS, navKey, type NavEntry } from "./nav";

type Props = {
  isJa: boolean;
  /** The entry drawn lit. */
  current: NavEntry | undefined;
  className?: string;
  /** On the reading pages' light background: a dark bar, so it still reads as the hub's. */
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
 * The five areas, then a divider, then the pages off the hub (`PAGE_LINKS`).
 * Every entry is a page (`next/link`), on the hub too: an area's write-up has
 * been a page of its own since 2026-10-30, not a sheet opened over the room.
 *
 * The site's box style: square corners, a box label, a fine border, half
 * see-through over a blur. Inverted (dark bar, white lit entry) on the reading
 * pages' light background.
 */
export default function NavPills({ isJa, current, className = "", onLight = false }: Props) {
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

        return (
          <Link
            key={navKey(item)}
            href={item.page}
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
