"use client";

import { motion } from "framer-motion";
import CornerBrackets from "@/ui/CornerBrackets";
import SectionHeading from "./SectionHeading";
import { useLanguage } from "@/state/LanguageContext";
import { aboutParagraphs } from "@/hub/about/aboutCopy";

export default function About() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const paragraphs = aboutParagraphs(isJa);

  return (
    <div className="py-8 md:py-12">
      <SectionHeading as="h1" className="mb-10 md:mb-14">About</SectionHeading>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left column: Summary profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-4 group relative bg-white border border-black/20 p-6 sm:p-8"
        >
          <CornerBrackets
            size="md"
            offset="card"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-none bg-[#ea580c]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-600">
              {isJa ? "プロフィール" : "Profile"}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight mb-2">
            Miiiwa
          </h2>
          <p className="font-mono text-sm font-bold text-neutral-500 mb-6">
            Student Software Engineer / 27卒
          </p>

          <div className="space-y-4 pt-4 border-t border-black/10 font-mono text-xs sm:text-sm">
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[11px]">Motto</span>
              <span className="font-bold text-neutral-900">{isJa ? "「面白いを最優先！」" : '"Fun First!"'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[11px]">Affiliation</span>
              <span className="font-bold text-neutral-900">42tokyo / 大学情報系</span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider text-[11px]">Interests</span>
              <span className="font-bold text-neutral-900">Web / AI / 3D / Novel UX</span>
            </div>
          </div>
        </motion.div>

        {/* Right column: Long-form self-introduction text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-8 bg-white border border-black/20 p-6 sm:p-10 relative group"
        >
          <CornerBrackets
            size="lg"
            offset="card"
            strokeWidth="2"
            colorClass="border-neutral-900"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />

          <div className="prose prose-neutral max-w-none space-y-6 text-neutral-800 text-base sm:text-lg leading-relaxed">
            {paragraphs.map((p, index) => (
              <p key={index} className="leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

