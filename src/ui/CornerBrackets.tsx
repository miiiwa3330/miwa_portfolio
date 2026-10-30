import { cornerBracketClasses, type CornerBracketConfig } from "./cornerBracketClasses";

type Props = CornerBracketConfig & {
  className?: string;
};

/**
 * Visual 4-corner bracket frame ("「」") to enclose a rectangular element.
 * Part of the site's box style (square corners, monochrome, fine lines; see
 * docs/tech.md): drawn round whatever is hovered or selected.
 */
export default function CornerBrackets({
  size = "sm",
  offset = "normal",
  colorClass = "border-current",
  strokeWidth = "2",
  className = "",
}: Props) {
  const classes = cornerBracketClasses({ size, offset, colorClass, strokeWidth });

  return (
    <span aria-hidden="true" className={`${classes.container} ${className}`}>
      <span className={classes.topLeft} />
      <span className={classes.topRight} />
      <span className={classes.bottomLeft} />
      <span className={classes.bottomRight} />
    </span>
  );
}
