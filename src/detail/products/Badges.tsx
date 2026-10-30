import type { ProjectCategory, ProjectStatus } from "@/data";

/*
 * The two coloured labels every rendering of a project carries — the hub's
 * card and popup, and the reading pages' cards and write-ups. Kept here so a
 * status or a category is the same colour wherever it appears.
 *
 * No hooks and no "use client": server-rendered reading pages use them too.
 * The caller resolves the label's language.
 */

type Size = "sm" | "lg";

type StatusProps = {
  status: ProjectStatus;
  label: string;
  /** `sm` on a card, `lg` over a large image. */
  size?: Size;
};

export function StatusBadge({ status, label, size = "sm" }: StatusProps) {
  const isPublic = status === "Public";
  const lg = size === "lg";
  return (
    <span
      className={`inline-flex items-center rounded-none font-mono font-bold border ${
        lg ? "gap-2 px-3 py-1.5 text-xs sm:text-sm" : "gap-1.5 px-2 py-0.5 text-[11px]"
      } ${
        isPublic
          ? "bg-white text-emerald-800 border-emerald-600/40"
          : "bg-white text-neutral-800 border-neutral-400"
      }`}
    >
      <span
        className={`rounded-none ${lg ? "w-2 h-2" : "w-1.5 h-1.5"} ${
          isPublic ? "bg-emerald-600" : "bg-neutral-600"
        }`}
      />
      <span>{label}</span>
    </span>
  );
}

type CategoryProps = {
  category: ProjectCategory;
  size?: Size;
};

export function CategoryBadge({ category, size = "sm" }: CategoryProps) {
  return (
    <span
      className={`shrink-0 rounded-none font-mono text-[10px] font-bold uppercase tracking-wider border border-black/20 ${
        size === "lg" ? "px-2.5 py-1" : "px-2 py-0.5"
      } bg-neutral-900 text-neutral-100`}
    >
      {category}
    </span>
  );
}
