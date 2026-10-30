"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import DetailSection from "./DetailSection";
import { useLanguage } from "@/state/LanguageContext";
import { EXPERIENCE, PROJECTS, localizeProjects, productPath, type Project } from "@/data";

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

  return (
    <DetailSection id="experience" title="Experience">
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-orange-500 before:via-orange-300 before:to-gray-200">
        {EXPERIENCE.map((exp, index) => {
          const title = exp.title[language];
          const project = exp.project ? projects.get(exp.project) : undefined;
          const open = project
            ? () => {
                if (onOpenProject) {
                  onOpenProject(project.slug);
                } else {
                  router.push(productPath(project.slug));
                }
              }
            : undefined;
          const buttonProps = project && open
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
                "aria-label": `${title} - ${isJa ? `${project.title} の紹介を開く` : `Open ${project.title}`}`,
              }
            : {};
          return (
            <motion.div
              key={`${exp.period} ${exp.title.en}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              {/* Timeline node */}
              <div
                className="flex items-center justify-center w-6 h-6 rounded-none border-2 border-[#fffdf7] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 shadow-none transition-transform duration-200 group-hover:scale-110 bg-neutral-900"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-none" />
              </div>

              {/* Timeline card. A milestone tied to a project is itself the way
                  to that project, so the whole card takes the tap — a phone
                  has no hover to discover a smaller target with. */}
              <div
                {...buttonProps}
                className={`relative group/card w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-5 sm:p-6 rounded-none bg-white border border-black/20 shadow-none transition-all duration-200 ${
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <h3 className="font-bold text-neutral-950 text-lg sm:text-xl">
                    {title}
                  </h3>
                  <span className="text-neutral-100 font-mono text-[10px] font-bold bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-none w-fit shrink-0 uppercase">
                    {exp.period}
                  </span>
                </div>
                <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
                  {exp.description[language]}
                </p>

                {project && (
                  <div className="mt-4 pt-4 border-t border-black/10 flex items-center gap-3">
                    <div className="relative w-16 aspect-[1200/630] shrink-0 overflow-hidden rounded-none border border-black/15 bg-neutral-100">
                      <Image src={project.image} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    {/* Stacked on a phone: side by side, the call to action
                        left a one-word name like "Synesthesium" no room. */}
                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3">
                      <span className="min-w-0 text-sm font-bold text-neutral-900 leading-snug break-words">
                        {project.title}
                      </span>
                      <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-mono font-bold text-neutral-900 group-hover/card:underline uppercase">
                        {isJa ? "紹介を見る" : "View"}
                        <ChevronRight size={14} className="transition-transform duration-200 group-hover/card:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </DetailSection>
  );
}
