"use client";

import { useEffect, useRef } from "react";
import { MARKER_TRAIL_GLOW, MARKER_TRAIL_INK, markerClearance } from "@/scene/markerBolt";
import { onMarkerScreen, type MarkerScreenPoint } from "@/scene/camera/markerScreen";
import { useFacing } from "@/state/facingChannel";

/**
 * The bolt of lightning from the card out to the marker floating over its area.
 *
 * DOM rather than 3D, deliberately: the trail is a flat annotation that should
 * always sit on top, so putting it in the scene would only buy it depth
 * testing it does not want. (The markers are the mirror image — they *do*
 * want to be hidden behind buildings, so they live in WebGL.)
 *
 * Nothing here goes through React state. The scene pushes the marker's screen
 * position every frame and the polyline's points are written straight to the
 * DOM; re-rendering this component sixty times a second would be competing
 * with the renderer for the same main thread.
 *
 * Both ends are measured the same way: from the *edge* of the mark they leave,
 * outwards by a fixed clearance. The card's dot is an element and is measured;
 * the marker is drawn in WebGL at a size the scene sets in screen pixels and
 * publishes, so neither end's extent is ever estimated here.
 *
 * The far end takes one extra step. The marker is a lightning bolt, not a disc,
 * so "the edge" depends on which way the trail is coming from — `halfHeight`
 * goes through `markerClearance()` with the trail's own direction rather than
 * being subtracted outright, which would leave the ink stopping five pixels
 * short whenever the trail arrives across the bolt rather than along it.
 *
 * The shape between those two ends belongs to `lightningPath()`, which is pure
 * and tested; this file only maps its axis-relative points onto the screen and
 * writes them out. It redraws itself whenever the scene's `strike` turns over —
 * the same instant the marker at the far end flashes, since both come off the
 * one `FLICKER_PERIOD` in `markerBolt.ts`. So it reads as a single strike
 * rather than as two animations sharing a screen.
 */

const STROKE_WIDTH = 2;

/** The halo, laid down as a wider stroke along the dotted path. */
const GLOW_STROKE_WIDTH = 5;

/**
 * A round linecap puts ink half a stroke beyond the last vertex, at both ends.
 * Both clearances below are ink-to-ink, so that overhang comes off the top.
 */
const CAP = STROKE_WIDTH / 2;

/** Clear space between the marker bolt's edge and the start of the ink. */
const MARKER_GAP = 9;

/** Clear space between the card's anchor dot and the start of the ink. */
const CARD_GAP = 17;

/** Below this there is no room for a trail worth drawing. */
const MIN_TRAIL = 48;

/**
 * How long the anchor is re-measured for after anything that could have moved
 * it, before the trail goes back to its cached rectangle.
 *
 * `getBoundingClientRect` forces the browser to flush style and layout, and
 * `draw()` is called from inside the scene's own frame loop — so this used to
 * be one forced layout per frame, for as long as the diorama was on screen. The
 * anchor does not move for the vast majority of those frames: it sits on the
 * card *stack*, which is a fixed box in a centred flex row.
 *
 * It does move for a moment when the card changes — each area's copy is a
 * different height and the stack is vertically centred, and `SectionCard`'s
 * entrance spring takes a few hundred milliseconds to place the new one — and
 * when the window is resized. Both restart this window, which is comfortably
 * longer than that spring settles in (its slow pole is a ~64ms time constant).
 */
const ANCHOR_SETTLE_MS = 450;

type Props = {
  /**
   * The dot on the card that the trail leaves from — the element itself, so
   * its centre and radius are measured rather than restated here. Hidden
   * whenever this is absent.
   */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Suppressed while an area is focused: the area itself fills the frame. */
  hidden: boolean;
};

export default function CardLeaderLine({ anchorRef, hidden }: Props) {
  const groupRef = useRef<SVGGElement | null>(null);
  const glowRef = useRef<SVGPathElement | null>(null);
  const trunkRef = useRef<SVGPathElement | null>(null);

  // Not to draw with — the trail never names an area — but to know when the
  // card underneath it has been swapped, which is the one thing that moves the
  // anchor. See `ANCHOR_SETTLE_MS`.
  const facing = useFacing();

  // The desk has no card, so there is nothing for a trail to leave from.
  const off = hidden || facing === "desk";

  useEffect(() => {
    if (off) return;

    let cachedRect: DOMRect | null = null;
    let settledAt = performance.now() + ANCHOR_SETTLE_MS;
    const remeasure = () => {
      cachedRect = null;
      settledAt = performance.now() + ANCHOR_SETTLE_MS;
    };

    /** The anchor's box: measured while it could still be moving, cached after. */
    const anchorRect = (anchor: HTMLElement): DOMRect => {
      if (cachedRect === null || performance.now() < settledAt) {
        cachedRect = anchor.getBoundingClientRect();
      }
      return cachedRect;
    };

    window.addEventListener("resize", remeasure);

    const draw = ({ x, y, halfHeight, visible }: MarkerScreenPoint) => {
      const group = groupRef.current;
      const glow = glowRef.current;
      const trunk = trunkRef.current;
      if (!group || !glow || !trunk) return;

      /**
       * The dot on the card is the trail's near end, so it goes with the
       * trail — a lone dot in the corner of a card with nothing leaving it
       * reads as a stray mark, which is the same reason it is dropped
       * outright once an area is focused (`SectionCard`).
       *
       * It matters more than it used to. The trail is only drawn while the
       * facing area's marker is actually on screen, and at the "near" orbit's
       * lean (see `NEAR_VERTICAL_SHARE`) that area spends much of a lap below
       * the frame — so the trail comes and goes where it used to be more or
       * less permanent. Written straight to the style for the same reason
       * nothing else here goes through React: this runs every frame.
       */
      const setAnchorShown = (shown: boolean) => {
        const anchor = anchorRef.current;
        if (anchor) anchor.style.opacity = shown ? "1" : "0";
      };

      const hide = () => {
        group.style.opacity = "0";
        setAnchorShown(false);
      };

      // No anchor means there is nothing to draw *from*, so the trail goes
      // away — rather than returning and leaving the last frame's path on
      // screen. A stale line is the worse failure of the two: it stays put
      // while the scene turns under it, which reads as the trail having come
      // loose from the dot rather than as anything being missing.
      const anchor = anchorRef.current;
      if (!anchor || !visible) return hide();

      const rect = anchorRect(anchor);
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const startRadius = Math.max(rect.width, rect.height) / 2;

      const dx = x - startX;
      const dy = y - startY;
      const span = Math.hypot(dx, dy);

      const unitX = dx / span;
      const unitY = dy / span;

      // Where the ink starts and stops, both a fixed clearance out from the
      // edge of the mark at that end. The marker's extent comes from the scene:
      // `halfHeight` is the number the sprite was sized to this very frame, in
      // the same CSS pixels this SVG is drawn in, and `markerClearance` turns
      // it into how far the bolt's ink actually reaches back along the trail —
      // the direction *from* the marker *towards* the card, which is why the
      // unit vector goes in negated.
      const from = startRadius + CARD_GAP + CAP;
      const reach = span - markerClearance(halfHeight, -unitX, -unitY) - MARKER_GAP - CAP;
      if (reach - from < MIN_TRAIL) return hide();
      group.style.opacity = "1";
      setAnchorShown(true);

      const x1 = startX + unitX * from;
      const y1 = startY + unitY * from;
      const x2 = startX + unitX * reach;
      const y2 = startY + unitY * reach;

      const linePath = `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
      trunk.setAttribute("d", linePath);
      glow.setAttribute("d", linePath);
    };

    const unsubscribe = onMarkerScreen(draw);
    return () => {
      window.removeEventListener("resize", remeasure);
      unsubscribe();
    };
    // `facing` is a dependency for its side effect alone: a new card means a
    // new anchor position, and re-running this restarts the measuring window.
  }, [anchorRef, off, facing]);

  if (off) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
      <g ref={groupRef} style={{ opacity: 0, transition: "opacity 240ms ease" }}>
        {/* The halo first, with dashed stroke */}
        <path
          ref={glowRef}
          fill="none"
          stroke={MARKER_TRAIL_GLOW}
          strokeWidth={GLOW_STROKE_WIDTH}
          strokeDasharray="4 4"
        />
        <path
          ref={trunkRef}
          fill="none"
          stroke={MARKER_TRAIL_INK}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray="4 4"
        />
      </g>
    </svg>
  );
}
