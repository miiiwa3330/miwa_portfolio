/**
 * How the camera moves when nobody is flying it, and how much of the frame it
 * gives up to the card — the arithmetic the room's camera kept from the
 * planet's, where it was first measured (docs/planet-migration.md). The
 * names still say "orbit": the free view's turn on the spot is the same
 * damped chase the planet's orbit was, with yaw for azimuth and pitch for the
 * complement of the polar angle (see `asOrbit` in `Scene.tsx`).
 *
 * Free of three.js, so it is tested without a renderer.
 */

/**
 * Where the card rail's top edge sits on a phone, in px from the top of a
 * 390x844 frame — the size this layout was designed and measured against.
 *
 * Measured from the laid-out DOM rather than added up from the pieces: 664,
 * the top of the card in the middle. **Not the two beside it**, which report
 * 671 — they are scaled to 0.9 and so sit 7px lower than the box they are
 * laid out in, and `querySelector` returns one of them first.
 *
 * Not the HOME button above them either. That only exists while a section is
 * focused, which is exactly when the trail is hidden anyway
 * (`CardLeaderLine`'s own `hidden` prop), so it never covers a marker the
 * trail is pointing at.
 */
export const HANDHELD_RAIL_TOP_PX = 664;

/**
 * How fast the camera drifts along the tour path when nothing is driving it —
 * radians of great-circle arc per second.
 *
 * Lives here rather than in Scene.tsx, where it started, because
 * `ORBIT_RETURN_SPEED` below is derived from it: the relationship between the
 * two is what decides whether the camera ever finds its way back to the path
 * at all, and a constant that another constant depends on is not a local one.
 */
export const AUTO_ORBIT_SPEED = 0.032;

/**
 * How hard the rendered azimuth/polar chase their targets — the `λ` of
 * `MathUtils.damp`, i.e. the gap left over shrinks by `1 - exp(-λΔt)` every
 * frame. Roughly half a second to cover a gap of any size, which is inertia
 * for a drag in progress and a snap for anything larger.
 */
export const ORBIT_DAMP_LAMBDA = 5;

/**
 * How fast the camera drifts back onto the tour path once a drag lets go —
 * the same radians-of-arc-per-second `AUTO_ORBIT_SPEED` is in, and
 * deliberately a multiple of it.
 *
 * Asked for as "come back at about the speed it turns by itself". The damp
 * alone (`ORBIT_DAMP_LAMBDA`) takes about the same half-second whether the
 * drag pushed the camera 2° off the path or 30°, so the further you pulled the
 * planet the faster it was yanked out of your hand — measured at ~0.5s for a
 * 0.35 rad gap, i.e. some eleven times the idle drift's own pace over that
 * arc.
 *
 * **Not 1× `AUTO_ORBIT_SPEED`, because the destination is not standing still.**
 * The tour keeps advancing the whole time the camera is finding its way back
 * (see Scene.tsx's frame loop), so the point being chased is itself moving at
 * `AUTO_ORBIT_SPEED` along the path. Travelling at exactly that speed would
 * leave a camera trailing directly behind it closing at zero — following one
 * gap behind for ever. At twice the drift, that worst case closes at exactly
 * `AUTO_ORBIT_SPEED`, and a camera drifting sideways onto the path at twice it:
 * the same order as the idle rotation either way, which is what was asked,
 * rather than a snap.
 *
 * **Only the post-drag return is capped this way.** The wheel and the card's
 * swipe both move the camera along the path by an amount the reader just asked
 * for — a flick worth 0.4 rad would take six seconds at this speed, which
 * reads as the input having been ignored. See `returningRef` in Scene.tsx for
 * where the cap is switched on and off.
 */
export const ORBIT_RETURN_SPEED = AUTO_ORBIT_SPEED * 2;

/**
 * Fraction of the frame's width the free orbit gives up to the card on the
 * left. Carried over unchanged from stage 2's `HOME_CARD_SHARE` — a
 * dimensionless fraction, unaffected by which of `ORBIT_RADIUS`'s azimuth or
 * polar the camera currently sits at.
 */
export const ORBIT_CARD_SHARE = 0.22;

/**
 * Fraction of the frame's width the card occupies on the left. The camera aims
 * this far to the side of its subject, which slides the subject clear of the
 * card instead of sitting behind it.
 */
export const CARD_SHARE = 0.3;

/**
 * The share of the frame's width to give up to the card, for the free orbit
 * and for a focused section — zero on a phone.
 *
 * One mechanism for every case (`projectionShiftPx` in `roomCamera.ts`);
 * only the number changes. On a phone the card is a strip across the bottom
 * rather than a panel on the left, so there is nothing beside the subject to
 * aim past: pushing it sideways anyway would shove it towards an edge for no
 * reason. The clearance it does need is vertical, and `cardLift` is where
 * that lives.
 *
 * The desktop numbers assume the card takes a slice of the width. Measured at
 * 390x844 the card was 334px of 390 — 86% — so the assumption does not
 * survive a phone at any share; 0.3 of the width simply moved the subject
 * from behind one part of the card to behind another.
 */
export function orbitCardShare(handheld: boolean): number {
  return handheld ? 0 : ORBIT_CARD_SHARE;
}

/** The same, for a section's close-up. */
export function sectionCardShare(handheld: boolean): number {
  return handheld ? 0 : CARD_SHARE;
}

/** Where on the orbit the camera is, in the angles Scene.tsx keeps as its truth. */
export type OrbitAngles = { azimuth: number; polar: number };

/**
 * The great-circle angle between two points on the orbit — how far the camera
 * actually has to travel to get from one to the other.
 *
 * Not the difference in either angle, and not the two differences added up: a
 * turn of azimuth covers `sin(polar)` times as much arc as the same turn of
 * polar does, and none at all at a pole. Anything that wants to move the
 * camera at a speed measured in arc (`AUTO_ORBIT_SPEED`, `ORBIT_RETURN_SPEED`)
 * has to ask in these terms or the same nominal speed would mean something
 * different at every latitude.
 *
 * Written out as the spherical law of cosines rather than built from two
 * vectors and dotted, because this runs inside the frame loop.
 */
export function orbitArcBetween(a: OrbitAngles, b: OrbitAngles): number {
  const cosine =
    Math.sin(a.polar) * Math.sin(b.polar) * Math.cos(a.azimuth - b.azimuth) +
    Math.cos(a.polar) * Math.cos(b.polar);
  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

/**
 * How much of the gap between `from` and `to` the camera closes this frame, as
 * a fraction of it — applied to azimuth and polar alike.
 *
 * One fraction for both is not a simplification: `MathUtils.damp` *is* a lerp
 * by `1 - exp(-λΔt)`, so this reproduces exactly what a pair of `damp()` calls
 * did. Having the fraction in hand rather than hidden inside them is what lets
 * it be capped — `maxArcPerSecond` bounds how much of the sphere the camera may
 * cross in a second however far away the target is, which is the difference
 * between drifting home and being snapped home (see `ORBIT_RETURN_SPEED`).
 *
 * The cap stops binding by itself once the gap is down to about
 * `maxArcPerSecond / ORBIT_DAMP_LAMBDA` radians, where the damp is the slower
 * of the two again — so a capped return ends by handing back to the damp for
 * the last fraction of a degree, with no threshold of its own to tune.
 */
export function orbitStepFraction(
  from: OrbitAngles,
  to: OrbitAngles,
  delta: number,
  maxArcPerSecond: number = Infinity
): number {
  if (delta <= 0) return 0;
  const damped = 1 - Math.exp(-ORBIT_DAMP_LAMBDA * delta);
  const arc = orbitArcBetween(from, to);
  // Nowhere to go: the cap has no gap to be a fraction of, and dividing by it
  // would hand back NaN — which `setLookAt` would take without complaint and
  // paint as nothing at all.
  if (arc <= 0 || !Number.isFinite(maxArcPerSecond)) return damped;
  return Math.min(damped, (maxArcPerSecond * delta) / arc);
}

/**
 * Eased progress for a camera flight: still at both ends, quickest in the
 * middle.
 *
 * Symmetrical rather than an ease-*out*, which is what camera-controls' own
 * `smoothTime` damping gives you. A damped flight spends most of its travel in
 * its first moments, and the flight that matters most here — backing out of a
 * section once the detail page is dismissed — begins with the sheet still
 * sliding off the screen. Nearly all of the movement therefore happened behind
 * an opaque panel, and what was left when the canvas came back into view was
 * the last tenth of it: a snap, not a camera pulling back. Holding the start
 * still buys that half-second back.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Wraps an angle (in radians) into (-π, π]. */
export function wrapAngle(angle: number): number {
  const turn = Math.PI * 2;
  return ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
}
