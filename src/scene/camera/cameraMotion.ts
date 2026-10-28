/**
 * How the camera moves when nobody is flying it, and how much of the frame it
 * gives up to the card — the arithmetic the room's camera kept from the
 * planet's, where it was first measured (docs/planet-migration.md). The
 * names still say "orbit": the free view's turn on the spot is the same
 * damped chase the planet's orbit was, minus the idle drift.
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
 * How hard the rendered azimuth/polar chase their targets — the `λ` of
 * `MathUtils.damp`, i.e. the gap left over shrinks by `1 - exp(-λΔt)` every
 * frame. Roughly half a second to cover a gap of any size, which is inertia
 * for a drag in progress and a glide for a wheel or a card's step.
 */
export const ORBIT_DAMP_LAMBDA = 5;

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

/**
 * How much of the gap between where the view is turned and where it is asked
 * to turn it closes in one frame of `delta` seconds — `MathUtils.damp`'s
 * `1 - exp(-λΔt)`, applied to yaw and pitch alike.
 *
 * Real time, never the room's clock: a turn the reader asks for still has to
 * arrive.
 *
 * (On the planet this was capped on the way back from a drag, at twice the
 * idle drift's speed, because the drift kept moving the target away. The
 * room has no idle drift (2026-10-01), a drag leaves the view where it was let
 * go, and there is nothing to be capped. The cap and its measurements are in
 * docs/planet-archive.md.)
 */
export function dampFraction(delta: number): number {
  return delta > 0 ? 1 - Math.exp(-ORBIT_DAMP_LAMBDA * delta) : 0;
}

/**
 * **Provisional (仮).** How far the idle sway moves the view: a game's
 * first-person idle — the head never quite still, the chest rising and
 * falling — in place of the room turning by itself, which the user asked to
 * stop (2026-10-01). Degrees of yaw and pitch, and metres of eye height.
 */
export const SWAY_YAW_DEG = 0.45;
export const SWAY_PITCH_DEG = 0.3;
export const SWAY_BREATH_M = 0.006;

const TURN = Math.PI * 2;
const DEG = Math.PI / 180;

/**
 * The idle sway at time `t` (seconds on the room's clock): offsets in yaw and
 * pitch (radians, at most `SWAY_YAW_DEG` and `SWAY_PITCH_DEG`) and eye height
 * (metres, at most `SWAY_BREATH_M`).
 *
 * Each is two slow sine waves whose periods do not divide each other, so the
 * movement never visibly repeats; the eye height follows the slower pitch
 * wave, the way breathing lifts the head. The camera adds it on top of
 * whatever pose it holds, flights included, so only its size and its
 * smoothness matter.
 */
export function idleSway(t: number): { yaw: number; pitch: number; height: number } {
  return {
    yaw: SWAY_YAW_DEG * DEG * (0.65 * Math.sin((TURN * t) / 7.3) + 0.35 * Math.sin((TURN * t) / 3.1 + 1.3)),
    pitch: SWAY_PITCH_DEG * DEG * (0.7 * Math.sin((TURN * t) / 4.2 + 0.5) + 0.3 * Math.sin((TURN * t) / 2.3)),
    height: SWAY_BREATH_M * Math.sin((TURN * t) / 4.2 + 0.5),
  };
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

/**
 * How far the free view may look up or down, in radians. The planet clamped
 * its polar angle away from the poles; a room clamps the head instead.
 *
 * 70°, so that looking down reaches the reader's own feet (step 7): the body
 * stands under the eye, and at 55° the bottom of a 16:9 frame stopped at 75°
 * below level — the chest at the very edge, the legs never. 70° plus half
 * the frame's height comes to straight down.
 */
export const MAX_PITCH = 70 * DEG;

/**
 * **Provisional (仮).** Radians of turn per px the mouse moves while the room
 * has captured it (the Pointer Lock API) — 0.002, the drag's old rate: one
 * sweep across a 1440px screen turns the reader about 165°. Read in CSS px
 * with the OS's own pointer speed applied, not raw counts, so the reader's
 * own setting for their mouse or trackpad still holds.
 */
export const MOUSE_LOOK_SENSITIVITY = 0.002;

/**
 * Where the head points after the captured mouse moves by `movementX`/
 * `movementY` px: **the way a first-person game aims** (2026-10-02, the user
 * asked for it in place of dragging) — the mouse moving right turns the
 * reader right, moving up looks up. The opposite of the drag on a phone,
 * which grabs the room. Yaw grows to the right (`room/layout.ts`), pitch
 * upward; the pitch stops at `MAX_PITCH` either way.
 */
export function mouseLook(yaw: number, pitch: number, movementX: number, movementY: number): { yaw: number; pitch: number } {
  return {
    yaw: yaw + movementX * MOUSE_LOOK_SENSITIVITY,
    pitch: Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch - movementY * MOUSE_LOOK_SENSITIVITY)),
  };
}
