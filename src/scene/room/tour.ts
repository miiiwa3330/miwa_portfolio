import type { Direction } from "../direction";
import type { SectionType } from "@/types";
import { STOP_ORDER, standardView, viewDirection, yawDelta, yawOf, type Stop } from "./layout";

/**
 * The tour around the room: one full turn on the spot, through every stop.
 *
 * **Why not the planet's `buildTour`.** Reading its latitude as pitch and its
 * longitude as yaw looked like a free reuse, but its longitude grows towards
 * what is, from inside the room, the reader's *left* — the tour would scroll
 * anticlockwise, against the nav order. And the reason it interpolates in
 * latitude/longitude space with an arc-length re-parameterisation (great
 * circles bulging towards the poles, docs/scene-invariants.md) has no
 * counterpart on a horizontal ring.
 *
 * **`u` is the fraction of the turn, by yaw — not of arc length.** Turning the
 * head at a steady rate is what idle drift and the wheel should feel like, and
 * the pitch changes between stops are a few degrees, so the two would differ
 * only slightly anyway. `length` is the turn itself, 2π, so
 * `AUTO_ORBIT_SPEED / length` stays a turn rate in radians per second, as
 * `Scene.tsx` already reads it.
 */
export type Anchor = { yaw: number; pitch: number };

/** A closed path the camera's view turns along. */
export type Tour = {
  /** The view direction at `u`, the fraction of the turn. */
  direction(u: number): Direction;
  /** The `u` at which the path passes anchor `index`. */
  anchorU(index: number): number;
  /** The `u` whose direction is closest to `dir`. */
  nearestU(dir: Direction): number;
  /** One full turn, in radians — so a turn rate over it is a fraction a second. */
  length: number;
  /** The visiting order the path was built from, as indices into the input. */
  order: number[];
};

const TURN = 360;

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function buildRingTour(anchors: Anchor[]): Tour {
  const n = anchors.length;
  if (n === 0) {
    const ahead: Direction = viewDirection(0, 0);
    return { direction: () => ahead, anchorU: () => 0, nearestU: () => 0, length: 2 * Math.PI, order: [] };
  }

  // Visiting order: turning right from the first anchor.
  const start = anchors[0].yaw;
  const offset = (yaw: number) => (((yaw - start) % TURN) + TURN) % TURN;
  const order = anchors.map((_, i) => i).sort((a, b) => offset(anchors[a].yaw) - offset(anchors[b].yaw));
  const yaws = order.map((i) => offset(anchors[i].yaw));
  const pitches = order.map((i) => anchors[i].pitch);

  const wrapU = (u: number) => ((u % 1) + 1) % 1;

  /** Pitch at `yawFromStart`, a closed Catmull-Rom through the anchors' pitches. */
  const pitchAt = (yawFromStart: number): number => {
    if (n === 1) return pitches[0];
    let i = n - 1;
    for (let k = 0; k < n; k++) if (yaws[k] <= yawFromStart) i = k;
    const next = (i + 1) % n;
    const span = (yaws[next] - yaws[i] + TURN) % TURN || TURN;
    const t = (((yawFromStart - yaws[i]) % TURN) + TURN) % TURN / span;
    const at = (k: number) => pitches[((k % n) + n) % n];
    return catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), t);
  };

  const direction = (u: number): Direction => {
    const yawFromStart = wrapU(u) * TURN;
    return viewDirection(start + yawFromStart, pitchAt(yawFromStart));
  };

  const anchorU = (index: number) => offset(anchors[((index % n) + n) % n].yaw) / TURN;

  const nearestU = (dir: Direction): number => {
    // Straight up or down has no yaw; stay at the start rather than invent one.
    if (Math.hypot(dir[0], dir[2]) < 1e-9) return 0;
    return wrapU(yawDelta(start, yawOf(dir[0], dir[2])) / TURN);
  };

  return { direction, anchorU, nearestU, length: 2 * Math.PI, order };
}

/** The room's own tour, through every stop's standing view. */
export const ROOM_TOUR: Tour = buildRingTour(STOP_ORDER.map((stop) => standardView(stop)));

/** Where on the tour a stop sits. */
export function stopU(stop: Stop): number {
  return ROOM_TOUR.anchorU(STOP_ORDER.indexOf(stop));
}

/** The stop `step` places along the tour from `stop` (negative goes back). */
export function adjacentStop(stop: Stop, step: number): Stop {
  const n = STOP_ORDER.length;
  const i = STOP_ORDER.indexOf(stop);
  return STOP_ORDER[(((i + step) % n) + n) % n];
}

/** The areas alone, in tour order — the stops a card can be about. */
export const SECTION_ORDER = STOP_ORDER.filter((stop): stop is NonNullable<SectionType> => stop !== "desk");

/**
 * The area `step` places from `section`, skipping the desk.
 *
 * The card's own step (wheel or swipe on the card) moves between the areas
 * only. The desk is on the tour — scrolling the room stops there — but it has
 * no card (docs/room-migration.md), so a card step that landed on it would
 * leave nothing on screen to step back from.
 */
export function adjacentSection(section: NonNullable<SectionType>, step: number): NonNullable<SectionType> {
  const n = SECTION_ORDER.length;
  const i = SECTION_ORDER.indexOf(section);
  return SECTION_ORDER[(((i + step) % n) + n) % n];
}
