"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/state/LanguageContext";
import CornerBrackets from "@/ui/CornerBrackets";
import type { Project } from "@/data";
import { CARD_TAG_COUNT, statusLabel } from "./catalog";
import { CategoryBadge, StatusBadge } from "./Badges";
import ProjectLinks, { type BlockedLink } from "./ProjectLinks";

type Props = {
  project: Project;
  onOpen: (project: Project) => void;
  onBlockedLink: (kind: BlockedLink) => void;
};

export default function ProjectCard({ project, onOpen, onBlockedLink }: Props) {
  const { language } = useLanguage();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(project);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${project.title} - ${language === "ja" ? "詳細を見る" : "View details"}`}
      className="group relative rounded-none bg-white border border-black/20 overflow-hidden flex flex-col hover:border-black transition-all duration-200 cursor-pointer text-left select-none shadow-none focus-visible:outline-none"
    >
      <CornerBrackets size="sm" offset="normal" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />

      <div className="relative w-full overflow-hidden h-48 bg-neutral-100 border-b border-black/10">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3.5 right-3.5 z-20">
          <StatusBadge status={project.status} label={statusLabel(project.status, language)} />
        </div>

        <div className="absolute bottom-2.5 left-2.5 z-20 bg-neutral-900 text-neutral-100 px-2 py-0.5 rounded-none opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-700">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
            {language === "ja" ? "クリックで詳細" : "Click to view"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-lg font-bold text-neutral-900 group-hover:underline transition-colors line-clamp-1">
            {project.title}
          </h3>
          <CategoryBadge category={project.category} />
        </div>

        <p className="text-sm text-neutral-600 mb-4 flex-1 line-clamp-2 leading-relaxed">
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-5 font-mono">
          {project.tags.slice(0, CARD_TAG_COUNT).map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 bg-neutral-50 border border-black/15 rounded-none text-neutral-700 font-medium">
              {tag}
            </span>
          ))}
          {project.tags.length > CARD_TAG_COUNT && (
            <span className="text-[11px] px-2 py-0.5 bg-neutral-50 border border-black/15 rounded-none text-neutral-500 font-medium">
              +{project.tags.length - CARD_TAG_COUNT}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-black/10 mt-auto justify-between font-mono">
          <ProjectLinks
            project={project}
            onBlocked={onBlockedLink}
            codeLabel="Code"
            demoLabel="Play"
            codeClassName="flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-black transition-colors z-20 relative px-2 py-1 rounded-none hover:bg-neutral-100 border border-transparent hover:border-black/20"
            demoClassName="flex items-center gap-1.5 text-xs font-bold text-neutral-900 hover:text-black transition-colors z-20 relative px-2 py-1 rounded-none hover:bg-neutral-100 border border-transparent hover:border-black/20"
          />
        </div>
      </div>
    </motion.div>
  );
}
