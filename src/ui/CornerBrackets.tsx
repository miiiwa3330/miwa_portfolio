import { cornerBracketClasses, type CornerBracketConfig } from "./cornerBracketClasses";

type Props = CornerBracketConfig & {
  className?: string;
};

/**
 * Visual 4-corner bracket frame ("「」") to enclose a rectangular element.
 * Follows the industrial / HUD aesthetic (zero radius, monochrome, sharp corners)
 * used in loo100 and Cyberpunk/sci-fi displays.
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
