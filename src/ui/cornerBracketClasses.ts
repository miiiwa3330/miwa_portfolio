export type CornerSize = "xs" | "sm" | "md" | "lg";
export type CornerOffset = "none" | "tight" | "normal" | "loose" | "card";

export type CornerBracketConfig = {
  size?: CornerSize;
  offset?: CornerOffset;
  colorClass?: string;
  strokeWidth?: "1" | "2";
};

export type CornerClasses = {
  container: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
};

export const CORNER_SIZE_CLASSES: Record<CornerSize, string> = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

/**
 * Positive insets so brackets sit cleanly inside element boundaries (like the "ノート" button)
 * instead of poking outside as protruding lines.
 */
export const CORNER_OFFSET_CLASSES: Record<CornerOffset, string> = {
  none: "inset-0",
  tight: "inset-0.5",
  normal: "inset-1",
  loose: "inset-1.5",
  card: "inset-2",
};

/**
 * Pure helper returning Tailwind class names for a 4-corner bracket frame ("「」").
 * Draws four L-shaped corners around a bounding box to visually mark it as selected/active.
 */
export function cornerBracketClasses(config: CornerBracketConfig = {}): CornerClasses {
  const size = CORNER_SIZE_CLASSES[config.size ?? "sm"];
  const offset = CORNER_OFFSET_CLASSES[config.offset ?? "normal"];
  const color = config.colorClass ?? "border-current";
  const stroke = config.strokeWidth === "1" ? "border" : "border-2";

  return {
    container: `pointer-events-none absolute ${offset} z-20`,
    topLeft: `absolute top-0 left-0 ${size} ${stroke} border-r-0 border-b-0 ${color}`,
    topRight: `absolute top-0 right-0 ${size} ${stroke} border-l-0 border-b-0 ${color}`,
    bottomLeft: `absolute bottom-0 left-0 ${size} ${stroke} border-r-0 border-t-0 ${color}`,
    bottomRight: `absolute bottom-0 right-0 ${size} ${stroke} border-l-0 border-t-0 ${color}`,
  };
}
