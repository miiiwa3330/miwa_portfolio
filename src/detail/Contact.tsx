"use client";

import { useState } from "react";
import DetailSection from "./DetailSection";
import { motion } from "framer-motion";
import { MessageSquare, Copy, Check } from "lucide-react";
import Link from "next/link";
import CornerBrackets from "@/ui/CornerBrackets";
import { useLanguage } from "@/state/LanguageContext";

export default function Contact() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("@miiiwa3330");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DetailSection id="contact" title={isJa ? "お問い合わせ" : "Contact"} className="mb-20">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="group p-8 sm:p-12 md:p-16 rounded-none bg-white border border-black/20 hover:border-black shadow-none relative"
        >
          <CornerBrackets size="lg" offset="card" strokeWidth="2" colorClass="border-neutral-900" className="opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-neutral-900 border border-neutral-700 text-neutral-100 font-mono text-[11px] font-bold uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" />
            <span>{isJa ? "ご連絡・ご相談いつでも歓迎です" : "Open to opportunities & chats"}</span>
          </div>

          <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-950 mb-4 tracking-tight">
            {isJa ? (
              <>
                一緒に<span className="underline decoration-2 underline-offset-4">面白いもの</span>を作りませんか？
              </>
            ) : (
              <>
                Let&apos;s build something <span className="underline decoration-2 underline-offset-4">amazing</span>
              </>
            )}
          </h3>

          <p className="text-neutral-600 mb-10 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            {isJa
              ? "プロダクト開発、ポートフォリオへのフィードバック、またはただの雑談でも大歓迎です！お気軽にご連絡ください。"
              : "I'm always open to discussing product development, feedback on my portfolio, or just having a chat! Feel free to reach out."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 font-mono">
            <Link
              href="https://x.com/miiiwa3330"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-none bg-neutral-900 hover:bg-black text-white font-bold border border-black transition-all active:scale-95 text-xs sm:text-sm uppercase"
            >
              <MessageSquare size={16} />
              <span>DM on X (@miiiwa3330)</span>
            </Link>

            <button
              onClick={handleCopy}
              className="relative flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-none bg-white hover:bg-neutral-100 text-neutral-800 font-bold border border-black/20 transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
            >
              {copied && <CornerBrackets size="xs" offset="tight" colorClass="border-emerald-600" />}
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700">{isJa ? "コピーしました！" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>{isJa ? "IDをコピー" : "Copy Handle"}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </DetailSection>
  );
}
