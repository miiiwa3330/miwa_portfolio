"use client";

import { ArrowLeft } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";

/**
 * The way back to the default overview, from an area the camera has flown into.
 *
 * Styled in the loo100 aesthetic (radius: 0, box-label, fine border).
 * Enclosed in corner brackets ("「」") as an active target.
 */
export default function HomeButton({
  onClick,
  isJa = true,
  onLight = false,
  className = "",
}: {
  onClick: () => void;
  isJa?: boolean;
  onLight?: boolean;
  /** Where it sits. Everything else about it is fixed. */
  className?: string;
}) {
  const label = isJa ? "戻る" : "BACK";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group z-40 pointer-events-auto h-12 flex items-center gap-2 font-mono font-bold text-xs sm:text-sm tracking-wider px-5 rounded-none shadow-sm active:scale-95 transition-all uppercase backdrop-blur-md ${
        onLight
          ? "bg-neutral-900/85 text-neutral-100 border border-black hover:bg-neutral-900"
          : "bg-white/85 text-neutral-800 border border-black/20 hover:bg-white shadow-md"
      } ${className}`}
    >
      <CornerBrackets
        size="xs"
        offset="tight"
        strokeWidth="2"
        colorClass={onLight ? "border-white" : "border-neutral-900"}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      <span>{label}</span>
    </button>
  );
}
