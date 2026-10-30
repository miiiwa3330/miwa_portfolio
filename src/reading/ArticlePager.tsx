import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export type PagerTarget = {
  href: string;
  /** App name (or note title) shown in the slide-out title card and mobile bottom nav. */
  title: string;
};

type Props = {
  prev: PagerTarget;
  next: PagerTarget;
  children: React.ReactNode;
};

/**
 * Wraps a product or note detail page with prev/next navigation:
 * - Main content sits in the standard `max-w-6xl` container (matching the index).
 * - Floating vermilion round buttons (`#ea580c`) with arrow-only icons sit at the
 *   exact midpoint between the viewport edge (`0`) and the main card edge
 *   (`50% - 34rem`), i.e. `25% - 17rem`.
 * - Hovering a button slides out a title card from the viewport edge right above
 *   the button, displaying only the app/entry name.
 */
export default function ArticlePager({ prev, next, children }: Props) {
  return (
    <div className="relative overflow-x-clip">
      {/* Left floating arrow button — centered between left screen edge and card left edge */}
      <Link
        href={prev.href}
        aria-label={`前の記事: ${prev.title}`}
        className="peer/prev hidden xl:flex fixed left-[calc(25%-17rem)] -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
      >
        <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
      </Link>

      {/* Left title card — emerges from the left screen edge above the button on hover */}
      <div
        aria-hidden="true"
        className="hidden xl:block fixed left-0 bottom-[calc(50%+3.25rem)] z-30 w-[calc(50%-35rem)] -translate-x-full opacity-0 peer-hover/prev:translate-x-0 peer-hover/prev:opacity-100 peer-focus-visible/prev:translate-x-0 peer-focus-visible/prev:opacity-100 transition-all duration-300 ease-out pointer-events-none"
      >
        <div className="rounded-none bg-white border border-l-0 border-black/25 px-4 py-3.5 shadow-sm">
          <div className="text-sm font-black text-neutral-950 leading-snug break-words line-clamp-2">
            {prev.title}
          </div>
        </div>
      </div>

      {/* Right floating arrow button — centered between right screen edge and card right edge */}
      <Link
        href={next.href}
        aria-label={`次の記事: ${next.title}`}
        className="peer/next hidden xl:flex fixed right-[calc(25%-17rem)] translate-x-1/2 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-lg items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
      >
        <ArrowRight className="w-6 h-6 stroke-[2.5]" />
      </Link>

      {/* Right title card — emerges from the right screen edge above the button on hover */}
      <div
        aria-hidden="true"
        className="hidden xl:block fixed right-0 bottom-[calc(50%+3.25rem)] z-30 w-[calc(50%-35rem)] translate-x-full opacity-0 peer-hover/next:translate-x-0 peer-hover/next:opacity-100 peer-focus-visible/next:translate-x-0 peer-focus-visible/next:opacity-100 transition-all duration-300 ease-out pointer-events-none"
      >
        <div className="rounded-none bg-white border border-r-0 border-black/25 px-4 py-3.5 shadow-sm text-right">
          <div className="text-sm font-black text-neutral-950 leading-snug break-words line-clamp-2">
            {next.title}
          </div>
        </div>
      </div>

      {/* Main container — exact same width (`max-w-6xl`) as the index pages */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {children}

        {/* Mobile / tablet prev-next switcher at bottom of article */}
        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 xl:hidden">
          <Link
            href={prev.href}
            className="flex items-center gap-2.5 p-3.5 sm:p-4 bg-white border border-black/20 hover:border-black transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center shrink-0">
              <ArrowLeft size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">{prev.title}</div>
            </div>
          </Link>

          <Link
            href={next.href}
            className="flex items-center justify-end gap-2.5 p-3.5 sm:p-4 bg-white border border-black/20 hover:border-black transition-colors text-right"
          >
            <div className="min-w-0">
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
