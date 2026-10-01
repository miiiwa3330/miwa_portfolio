"use client";

import { ZoomIn } from "lucide-react";

export type ZoomStage = "fisheye" | "standard" | "zoom";

type Props = {
  isJa: boolean;
  stage: ZoomStage;
  onSelect: (stage: ZoomStage) => void;
};

const STAGES: { key: ZoomStage; ja: string; en: string }[] = [
  { key: "fisheye", ja: "魚眼", en: "Fisheye" },
  { key: "standard", ja: "標準", en: "Default" },
  { key: "zoom", ja: "ズーム", en: "Zoom" },
];

const NEXT: Record<ZoomStage, ZoomStage> = {
  fisheye: "standard",
  standard: "zoom",
  zoom: "fisheye",
};

// Fill goes from white to solid orange as the stages step inward, so the
// button's own color carries "how zoomed in" — no separate legend needed.
const FILL: Record<ZoomStage, string> = {
  fisheye: "bg-white text-gray-800",
  standard: "bg-orange-300 text-gray-900",
  zoom: "bg-orange-500 text-white",
};

/**
 * The desktop/no-touch equivalent of the two-finger pinch (Scene.tsx's
 * `useViewInput`): fisheye/standard switch the free view's stage the same way
 * a pinch does, and a third stage — reached by neither pinch nor drag — steps
 * in to whichever section the camera is currently facing, the same
 * destination a marker click reaches.
 *
 * One button, stepped through the three stages by successive clicks
 * (fisheye → standard → zoom → fisheye …) rather than a hover-revealed picker: a
 * control that has to appear on hover before it can be used doesn't have a
 * touch equivalent, and this one does — every stage is reachable with a tap.
 */
export default function ZoomControl({ isJa, stage, onSelect }: Props) {
  const current = STAGES.find((s) => s.key === stage) ?? STAGES[1];
  const label = isJa ? current.ja : current.en;

  return (
    <button
      onClick={() => onSelect(NEXT[stage])}
      title={isJa ? `ズーム: ${label}` : `Zoom: ${label}`}
      aria-label={isJa ? `ズーム: ${label}` : `Zoom: ${label}`}
      className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border border-black/5 pointer-events-auto shadow-sm ${FILL[stage]}`}
    >
      <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  );
}
