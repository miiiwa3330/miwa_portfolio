"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import { leadsToHub } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";
import { bottomNavForPath } from "./breadcrumbs";

/**
 * The foot of every reading page:
 * 1. Above the footer hairline: the breadcrumb trail and a "Back" button.
 * 2. Below the hairline: the copyright and the privacy policy.
 */
export default function ReadingFooter() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isJa = language === "ja";
  const { breadcrumbs, backHref, backLabel } = bottomNavForPath(pathname, isJa);

  const backButtonContent = (
    <>
      <CornerBrackets
        size="xs"
        offset="tight"
        strokeWidth="2"
        colorClass="border-white"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
      <span>{backLabel}</span>
    </>
  );

  const backButtonClass =
    "group relative inline-flex items-center gap-2 bg-neutral-900 hover:bg-black text-white font-mono font-bold py-3 px-6 rounded-none border border-black transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer";

  return (
    <div className="mt-20">
      {/* Breadcrumb trail and Back button placed right above the footer */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-8 border-t border-black/15">
          <nav aria-label="パンくずリスト" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-mono text-neutral-600">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={index} className="inline-flex items-center gap-1.5">
                  {index > 0 && <ChevronRight size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />}
                  {crumb.href && !isLast ? (
                    leadsToHub(crumb.href) ? (
                      <a href={crumb.href} className="hover:text-[#ea580c] underline underline-offset-4 transition-colors font-bold text-neutral-800">
                        {crumb.label}
                      </a>
                    ) : (
                      <Link href={crumb.href} className="hover:text-[#ea580c] underline underline-offset-4 transition-colors font-bold text-neutral-800">
                        {crumb.label}
                      </Link>
                    )
                  ) : (
                    <span aria-current="page" className="font-bold text-neutral-950 truncate max-w-[240px] sm:max-w-[360px]">
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>

          <div>
            {leadsToHub(backHref) ? (
              <a href={backHref} className={backButtonClass}>
                {backButtonContent}
              </a>
            ) : (
              <Link href={backHref} className={backButtonClass}>
                {backButtonContent}
              </Link>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-mono text-gray-500">
            <span>© {new Date().getFullYear()} Miiiwa</span>
            <span aria-hidden="true">•</span>
            <Link
              href="/privacy"
              className="whitespace-nowrap py-2 underline underline-offset-2 hover:text-orange-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
