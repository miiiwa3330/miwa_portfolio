import Link from "next/link";

export type PagerTarget = {
  href: string;
  /** Full title shown in the button tooltip and mobile bottom nav. */
  title: string;
  /** Rendered article content (everything except the "other entries" section) for the side preview. */
  content: React.ReactNode;
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
 * - On wide screens, the full previous and next entries (excluding the bottom
 *   "other entries" section) peek in from the left and right viewport edges,
 *   aligned with the top edge of the main card and non-clickable.
 * - Floating vermilion chevron (`＜` / `＞`) buttons (`#ea580c`) sit at the exact
 *   midpoint between the viewport edge and the main card edge (`25% - 17rem`).
 */
export default function ArticlePager({ prev, next, children }: Props) {
  return (
    <div className="relative overflow-x-clip">
      {/* Left floating chevron (＜) button — centered between left screen edge and card left edge */}
      <Link
        href={prev.href}
        aria-label={`前の記事: ${prev.title}`}
        title={prev.title}
        className="hidden xl:flex fixed left-[calc(25%-17rem)] -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 w-24 h-28 items-center justify-center text-[#ea580c] hover:text-[#c2410c] drop-shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer select-none"
      >
        <svg viewBox="0 0 72 104" fill="none" className="w-full h-full" aria-hidden="true">
          <path
            d="M52 14L20 52L52 90"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          />
        </svg>
      </Link>

      {/* Right floating chevron (＞) button — centered between right screen edge and card right edge */}
      <Link
        href={next.href}
        aria-label={`次の記事: ${next.title}`}
        title={next.title}
        className="hidden xl:flex fixed right-[calc(25%-17rem)] translate-x-1/2 top-1/2 -translate-y-1/2 z-30 w-24 h-28 items-center justify-center text-[#ea580c] hover:text-[#c2410c] drop-shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer select-none"
      >
        <svg viewBox="0 0 72 104" fill="none" className="w-full h-full" aria-hidden="true">
          <path
            d="M20 14L52 52L20 90"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeMiterlimit="10"
          />
        </svg>
      </Link>

      {/* Left peeking article on desktop viewports — top-aligned with main card (`top-4 sm:top-6`) and non-clickable */}
      <div
        aria-hidden="true"
        inert
        className="hidden xl:block absolute right-[calc(50%+41rem)] top-4 sm:top-6 w-[68rem] max-h-[calc(100%-1.5rem)] overflow-hidden pointer-events-none select-none opacity-60"
      >
        {prev.content}
      </div>

      {/* Right peeking article on desktop viewports — top-aligned with main card (`top-4 sm:top-6`) and non-clickable */}
      <div
        aria-hidden="true"
        inert
        className="hidden xl:block absolute left-[calc(50%+41rem)] top-4 sm:top-6 w-[68rem] max-h-[calc(100%-1.5rem)] overflow-hidden pointer-events-none select-none opacity-60"
      >
        {next.content}
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
            <svg viewBox="0 0 72 104" fill="none" className="w-6 h-8 text-[#ea580c] shrink-0" aria-hidden="true">
              <path
                d="M52 14L20 52L52 90"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeMiterlimit="10"
              />
            </svg>
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
            <svg viewBox="0 0 72 104" fill="none" className="w-6 h-8 text-[#ea580c] shrink-0" aria-hidden="true">
              <path
                d="M20 14L52 52L20 90"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeMiterlimit="10"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
