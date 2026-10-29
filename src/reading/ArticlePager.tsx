import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type PagerTarget = {
  href: string;
  /** Short label shown inside the round floating button (e.g. title or category). */
  shortLabel: string;
  /** Full title shown in the peeking side card and bottom nav. */
  title: string;
  /** Subtitle / description for the peeking side card. */
  subtitle?: string;
  /** Optional badge text (e.g. date or category). */
  badge?: string;
};

type Props = {
  prev: PagerTarget;
  next: PagerTarget;
  children: React.ReactNode;
};

/**
 * Wraps a product or note detail page in a carousel-like layout inspired by
 * bukka_now's result screen:
 * - Main content sits in the standard `max-w-6xl` container (matching the index).
 * - On wide screens, the previous and next entries peek in from the left and
 *   right viewport edges.
 * - Floating vermilion round buttons (`#ea580c`) on the left and right switch
 *   directly to the previous / next entry.
 */
export default function ArticlePager({ prev, next, children }: Props) {
  return (
    <div className="relative overflow-x-clip">
      {/* Left floating round button (bukka_now style) */}
      <Link
        href={prev.href}
        aria-label={`前の記事: ${prev.title}`}
        title={prev.title}
        className="hidden lg:flex fixed left-3 xl:left-6 top-1/2 -translate-y-1/2 z-30 w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg flex-col items-center justify-center gap-0.5 px-2 transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
      >
        <ArrowLeft className="w-5 h-5 xl:w-6 xl:h-6 stroke-[2.5]" />
        <span className="text-[10px] xl:text-[11px] font-bold leading-tight max-w-full truncate">
          {prev.shortLabel}
        </span>
      </Link>

      {/* Right floating round button (bukka_now style) */}
      <Link
        href={next.href}
        aria-label={`次の記事: ${next.title}`}
        title={next.title}
        className="hidden lg:flex fixed right-3 xl:right-6 top-1/2 -translate-y-1/2 z-30 w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg flex-col items-center justify-center gap-0.5 px-2 transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
      >
        <ArrowRight className="w-5 h-5 xl:w-6 xl:h-6 stroke-[2.5]" />
        <span className="text-[10px] xl:text-[11px] font-bold leading-tight max-w-full truncate">
          {next.shortLabel}
        </span>
      </Link>

      {/* Left peeking card on desktop viewports */}
      <div
        aria-hidden="true"
        className="hidden xl:block absolute right-[calc(50%+41rem)] top-4 w-[32rem] pointer-events-auto opacity-60 hover:opacity-95 transition-opacity"
      >
        <Link
          href={prev.href}
          tabIndex={-1}
          className="block rounded-none bg-white border border-black/25 p-8 shadow-none"
        >
          {prev.badge && (
            <span className="inline-block font-mono text-xs font-bold text-neutral-100 bg-neutral-900 px-2.5 py-0.5 mb-3">
              {prev.badge}
            </span>
          )}
          <div className="text-xl font-black text-neutral-950 truncate border-b border-black/10 pb-3 mb-4">
            {prev.title}
          </div>
          {prev.subtitle && (
            <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed">
              {prev.subtitle}
            </p>
          )}
        </Link>
      </div>

      {/* Right peeking card on desktop viewports */}
      <div
        aria-hidden="true"
        className="hidden xl:block absolute left-[calc(50%+41rem)] top-4 w-[32rem] pointer-events-auto opacity-60 hover:opacity-95 transition-opacity"
      >
        <Link
          href={next.href}
          tabIndex={-1}
          className="block rounded-none bg-white border border-black/25 p-8 shadow-none"
        >
          {next.badge && (
            <span className="inline-block font-mono text-xs font-bold text-neutral-100 bg-neutral-900 px-2.5 py-0.5 mb-3">
              {next.badge}
            </span>
          )}
          <div className="text-xl font-black text-neutral-950 truncate border-b border-black/10 pb-3 mb-4">
            {next.title}
          </div>
          {next.subtitle && (
            <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed">
              {next.subtitle}
            </p>
          )}
        </Link>
      </div>

      {/* Main container — exact same width (`max-w-6xl`) as the index pages */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {children}

        {/* Mobile / tablet prev-next switcher at bottom of article */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:hidden">
          <Link
            href={prev.href}
            className="flex items-center gap-2.5 p-3.5 sm:p-4 bg-white border border-black/20 hover:border-black transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center shrink-0">
              <ArrowLeft size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-500">Prev</div>
              <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">{prev.title}</div>
            </div>
          </Link>

          <Link
            href={next.href}
            className="flex items-center justify-end gap-2.5 p-3.5 sm:p-4 bg-white border border-black/20 hover:border-black transition-colors text-right"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-bold uppercase text-neutral-500">Next</div>
              <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">{next.title}</div>
            </div>
            <span className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center shrink-0">
              <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
