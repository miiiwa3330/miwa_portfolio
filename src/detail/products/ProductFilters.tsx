"use client";

import { useLanguage } from "@/state/LanguageContext";
import CornerBrackets from "@/ui/CornerBrackets";
import {
  CATEGORY_FILTERS,
  STATUS_FILTERS,
  statusLabel,
  type CategoryFilter,
  type StatusFilter,
} from "./catalog";

type Props = {
  category: CategoryFilter;
  status: StatusFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
};

/**
 * Filter bar for products, styled in the loo100 aesthetic (radius: 0, box-label, fine border).
 * Selected filter boxes are enclosed in corner brackets ("「」").
 */
export default function ProductFilters({
  category,
  status,
  onCategoryChange,
  onStatusChange,
}: Props) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 sm:gap-6">
      {/* Category */}
      <div className="flex p-1 bg-white rounded-none border border-black/20 flex-wrap gap-1 justify-center md:justify-start w-full md:w-auto font-mono">
        {CATEGORY_FILTERS.map((value) => {
          const selected = category === value;
          return (
            <button
              key={value}
              onClick={() => onCategoryChange(value)}
              aria-pressed={selected}
              className={`group relative px-3.5 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                selected
                  ? "bg-neutral-900 text-neutral-100 border border-black shadow-sm"
                  : "text-neutral-700 hover:text-black hover:bg-neutral-100 border border-transparent"
              }`}
            >
              <CornerBrackets
                size="xs"
                offset="tight"
                strokeWidth="2"
                colorClass={selected ? "border-neutral-900" : "border-neutral-800"}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {value}
            </button>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex gap-1 p-1 bg-white rounded-none border border-black/20 ml-auto mr-auto md:mr-0 w-full md:w-auto overflow-x-auto custom-scrollbar font-mono">
        {STATUS_FILTERS.map((value) => {
          const selected = status === value;
          return (
            <button
              key={value}
              onClick={() => onStatusChange(value)}
              aria-pressed={selected}
              className={`group relative px-3 py-1.5 rounded-none text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                selected
                  ? "bg-neutral-900 text-neutral-100 border border-black shadow-sm"
                  : "text-neutral-600 hover:text-black hover:bg-neutral-100 border border-transparent"
              }`}
            >
              <CornerBrackets
                size="xs"
                offset="tight"
                strokeWidth="2"
                colorClass={selected ? "border-neutral-900" : "border-neutral-800"}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="flex items-center gap-1.5">
                {value !== "All" && (
                  <span
                    className={`w-1.5 h-1.5 rounded-none ${
                      value === "Public" ? "bg-emerald-500" : "bg-orange-500"
                    }`}
                  />
                )}
                <span>{statusLabel(value, language)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
