"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Monoton } from "next/font/google";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import DetailSection from "./DetailSection";
import { groupTimelineByYear } from "./experienceTimeline";
import { useLanguage } from "@/state/LanguageContext";
import { EXPERIENCE, PROJECTS, localizeProjects, productPath, type Project } from "@/data";

const timelineYearFont = Monoton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

type Props = {
  /** Switch to Products with this project's modal open (optional). */
  onOpenProject?: (slug: string) => void;
};

export default function Experience({ onOpenProject }: Props = {}) {
  const router = useRouter();
  const { language } = useLanguage();
  const isJa = language === "ja";

  const projects = useMemo(
    () => new Map<string, Project>(localizeProjects(PROJECTS, language).map((p) => [p.slug, p])),
    [language]
  );

  const yearGroups = useMemo(() => groupTimelineByYear(EXPERIENCE), []);

  return (
    <DetailSection id="experience" title="Experience">
      <div className="max-w-5xl mx-auto">
        {yearGroups.map((group, groupIndex) => {
          const isLastGroup = groupIndex === yearGroups.length - 1;

          return (
            <div key={group.year} className="relative flex items-stretch">
              {/* Left column: Sticky 4-digit year in Monoton inline font */}
              <div
                className={`w-20 sm:w-32 md:w-36 shrink-0 pr-3 sm:pr-6 ${
                  isLastGroup ? "pb-2" : "pb-6 sm:pb-8"
                }`}
              >
                <div
                  data-timeline-year={group.year}
                  className="sticky top-28 sm:top-32 md:top-36 mt-4 sm:mt-5 h-9 flex items-center justify-end z-10"
                >
                  <span
                    className={`${timelineYearFont.className} inline-block text-xl sm:text-3xl md:text-4xl font-normal leading-none tracking-wider select-none text-[#ea580c]`}
                  >
                    {group.year}
                  </span>
                </div>
              </div>

              {/* Right side: All milestone rows belonging to this year */}
              <div className="flex-1 min-w-0">
                {group.rows.map((row) => {
                  const {
                    entry: exp,
                    index,
                    isFirstOverall: isFirst,
                    isLastOverall: isLast,
                    monthNumber,
                    monthLabelEn,
                  } = row;
                  const title = exp.title[language];
                  const project = exp.project ? projects.get(exp.project) : undefined;
                  const externalUrl = exp.url;
                  const open = project
                    ? () => {
                        if (onOpenProject) {
                          onOpenProject(project.slug);
                        } else {
                          router.push(productPath(project.slug));
                        }
                      }
                    : externalUrl
                      ? () => {
                          window.open(externalUrl, "_blank", "noopener,noreferrer");
                        }
                      : undefined;
                  const buttonProps = open
                    ? {
                        role: "button",
                        tabIndex: 0,
                        onClick: open,
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            open();
                          }
                        },
                        "aria-label": project
                          ? `${title} - ${isJa ? `${project.title} の紹介を開く` : `Open ${project.title}`}`
                          : `${title} - ${externalUrl}`,
                      }
                    : {};

                  return (
                    <motion.div
                      key={`${exp.period} ${exp.title.en}`}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                      className="group relative flex items-stretch"
                    >
                      {/* Axis column: Vertical dashed line + vermilion node */}
                      <div className="relative flex flex-col items-center w-5 sm:w-6 shrink-0">
                        {!isFirst && (
                          <div
                            aria-hidden="true"
                            className="absolute top-0 h-[34px] sm:h-[38px] left-1/2 -translate-x-1/2 border-l-2 border-dashed border-neutral-500/70"
                          />
                        )}
                        {!isLast && (
                          <div
                            aria-hidden="true"
                            className="absolute top-[34px] sm:top-[38px] bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-neutral-500/70"
                          />
                        )}
                        <div className="mt-4 sm:mt-5 h-9 flex items-center justify-center relative z-10">
                          <div
                            aria-hidden="true"
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#ea580c] shrink-0 transition-transform duration-200 group-hover:scale-125"
                          />
                        </div>
                      </div>

                      {/* Month column */}
                      <div className="w-11 sm:w-16 shrink-0 pl-2 sm:pl-3.5 select-none tabular-nums">
                        <div className="mt-4 sm:mt-5 h-9 flex items-center">
                          {monthNumber !== null && (
                            isJa ? (
                              <span className="inline-flex items-baseline text-neutral-900">
                                <span className="text-xl sm:text-2xl font-bold leading-none">
                                  {monthNumber}
                                </span>
                                <span className="text-xs sm:text-sm font-bold ml-0.5">月</span>
                              </span>
                            ) : (
                              <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900">
                                {monthLabelEn}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Right column: Milestone card */}
                      <div className={`flex-1 min-w-0 pl-2 sm:pl-4 ${isLast ? "pb-2" : "pb-6 sm:pb-8"}`}>
                        <div
                          {...buttonProps}
                          className={`relative group/card p-5 sm:p-6 rounded-none bg-white border border-black/20 shadow-none transition-all duration-200 ${
                            open
                              ? "hover:border-[#ea580c] cursor-pointer select-none focus-visible:outline-none"
                              : "hover:border-black"
                          }`}
                        >
                          <CornerBrackets
                            size="sm"
                            offset="tight"
                            strokeWidth="2"
                            colorClass={open ? "border-[#ea580c]" : "border-neutral-900"}
                            className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                          />
                          <h3 className="font-bold text-neutral-950 text-lg sm:text-xl mb-2">
                            {title}
                          </h3>
                          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
                            {exp.description[language]}
                          </p>

                          {project && (
                            <div className="mt-4 pt-4 border-t border-black/10 flex items-center gap-3">
                              <div className="relative w-16 aspect-[1200/630] shrink-0 overflow-hidden rounded-none border border-black/15 bg-neutral-100">
                                <Image src={project.image} alt="" fill sizes="64px" className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3">
                                <span className="min-w-0 text-sm font-bold text-neutral-900 leading-snug break-words">
                                  {project.title}
                                </span>
                                <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-mono font-bold text-neutral-900 group-hover/card:text-[#ea580c] group-hover/card:underline uppercase transition-colors">
                                  {isJa ? "紹介を見る" : "View"}
                                  <ChevronRight size={14} className="transition-transform duration-200 group-hover/card:translate-x-0.5" />
                                </span>
                              </div>
                            </div>
                          )}

                          {!project && externalUrl && (
                            <div className="mt-4 pt-4 border-t border-black/10 flex items-center justify-between gap-3">
                              <span className="min-w-0 text-xs sm:text-sm font-mono font-bold text-neutral-900 truncate">
                                {externalUrl}
                              </span>
                              <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-mono font-bold text-neutral-900 group-hover/card:text-[#ea580c] group-hover/card:underline uppercase transition-colors">
                                {isJa ? "サイトを見る" : "Visit"}
                                <ChevronRight size={14} className="transition-transform duration-200 group-hover/card:translate-x-0.5" />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </DetailSection>
  );
}
