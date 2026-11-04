"use client";

import { ArrowLeft, ArrowUp } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";

/**
 * The way back to the default view, from an area the camera has flown into.
 *
 * One component for both layouts because it is one control: a desktop pins it
 * to the bottom of the frame, a phone puts it just above the card rail (the
 * bottom of a phone's frame is the rail). Where it sits is a prop, and so is
 * whether the reader is getting up from the desk — 「立ち上がる」 there, not
 * 「戻る」 (2026-11-04, the user) — the labels, the icons and the shape are
 * stated once here rather than in places that would drift.
 *
 * The site's box style (square corners, a box label, a fine border), with the
 * corner brackets ("「」") on hover.
 */
export default function HomeButton({
  onClick,
  isJa = true,
  stand = false,
  className = "",
}: {
  onClick: () => void;
  isJa?: boolean;
  /** Seated at the desk: the way back is getting up. */
  stand?: boolean;
  /** Where it sits. Everything else about it is fixed. */
  className?: string;
}) {
  const label = stand ? (isJa ? "立ち上がる" : "STAND UP") : isJa ? "戻る" : "BACK";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`group z-40 pointer-events-auto h-12 flex items-center gap-2 font-mono font-bold text-xs sm:text-sm tracking-wider px-5 rounded-none shadow-sm active:scale-95 transition-all uppercase backdrop-blur-md bg-white/85 text-neutral-800 border border-black/20 hover:bg-white shadow-md ${className}`}
    >
      <CornerBrackets
        size="xs"
        offset="tight"
        strokeWidth="2"
        colorClass="border-neutral-900"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      />
      {stand ? (
        <ArrowUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
      ) : (
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
      )}
      <span>{label}</span>
    </button>
  );
}
