import { HANDHELD_RAIL_TOP_PX, easeInOutCubic, orbitCardShare, sectionCardShare, wrapAngle } from "./cameraMotion";
import { hfovForZoom, horizontalAt, lensForZoom, viewDirection, type RoomView, type ViewZoom } from "../room/layout";
import { RECTILINEAR, lensPixelsPerRadian, projectLens, unprojectLens } from "./fisheye";
import type { Stop } from "@/types";
import type { Direction } from "../direction";

/**
 * The camera inside the room: where it stands, which way it looks, and how
 * wide it sees — and the flights between two of those.
 *
 * The planet's camera (docs/planet-migration.md) sat on a sphere and
 * looked in at the centre; this one stands at the centre (or a step out from
 * it, for a zoom) and looks out. **Up is always world +Y**: the room is never
 * on its side, so none of the planet's per-building roll (`sectionUp`) has a
 * counterpart here.
 */

const DEG = Math.PI / 180;

/**
 * Everything about a frame the camera can be asked to hold. Angles in
 * radians (yaw clockwise from above, the room's own convention — see
 * `room/layout.ts`), field of view in degrees, as three.js takes it.
 */
export type RoomPose = {
  yaw: number;
  pitch: number;
  /** How far the camera has stepped out from the centre, along `yaw`. */
  forward: number;
  eyeHeight: number;
  /** Horizontal field of view, in degrees. */
  hfov: number;
  /** The lens's `k` (`camera/fisheye.ts`): 1 an ordinary perspective, 2 the stereographic fisheye. */
  lens: number;
  /** The share of the frame's width given up to the card on the left; see `projectionShiftPx`. */
  share: number;
  /** The share of the frame's height given up to the card rail along a phone's bottom; see `projectionLiftPx`. */
  lift: number;
};

/** How a pose is drawn, as opposed to where it stands and looks. */
export type Framing = Pick<RoomPose, "hfov" | "lens" | "share" | "lift">;

/** A `RoomView` (degrees, from `room/layout.ts`) as a pose, drawn with `framing`. */
export function poseFromView(view: RoomView, framing: Framing): RoomPose {
  return { yaw: view.yaw * DEG, pitch: view.pitch * DEG, forward: view.forward, eyeHeight: view.eyeHeight, ...framing };
}

/**
 * Whether a pose has to be drawn through the fisheye's cube map rather than
 * straight through a perspective camera — any lens bent at all, including
 * part-way through a flight between the two.
 */
export function lensBends(lens: number): boolean {
  return lens > 1 + 1e-4;
}

/**
 * How far the eye moves forward as the head tips down, in metres. The head
 * turns about the neck, so the eyes come forward of the body when looking
 * down — which is how anyone sees their own feet past their chest (step 7:
 * with the eye held straight over the body, looking down showed only the top
 * of the chest). Nothing happens looking up. **Provisional (仮)**: 7 cm at
 * the deepest look down (70°); at 12 cm the feet ended up behind the eye.
 */
export const HEAD_LEAN = 0.07;
/**
 * Below this the head stays over the body: every area's standing view and the
 * seated one look within ±10° of level, and leaning there would put the
 * camera a few centimetres off the point the view was aimed from.
 */
export const LEAN_FROM = 15 * DEG;
const LEAN_FULL = 70 * DEG;

export function headLean(pitch: number): number {
  return HEAD_LEAN * Math.max(0, Math.min(1, (-pitch - LEAN_FROM) / (LEAN_FULL - LEAN_FROM)));
}

/** Where the camera stands and the point it looks at — one metre straight ahead. */
export function placeCamera(pose: RoomPose): { position: [number, number, number]; target: [number, number, number] } {
  const [hx, hz] = horizontalAt(pose.yaw / DEG);
  const out = pose.forward + headLean(pose.pitch);
  const position: [number, number, number] = [hx * out, pose.eyeHeight, hz * out];
  const [dx, dy, dz] = viewDirection(pose.yaw / DEG, pose.pitch / DEG);
  return { position, target: [position[0] + dx, position[1] + dy, position[2] + dz] };
}

/**
 * The camera's own axes in the world: to the right, up, and the way it looks.
 * Up stays in the vertical plane through the view direction — the room never
 * rolls — so `right` is always horizontal.
 */
export function cameraBasis(pose: RoomPose): { right: Direction; up: Direction; forward: Direction } {
  const forward = viewDirection(pose.yaw / DEG, pose.pitch / DEG);
  const [hx, hz] = horizontalAt(pose.yaw / DEG);
  // forward × world up, which is horizontal: (-hz, 0, hx) for a level view.
  const right: Direction = [-hz, 0, hx];
  const up: Direction = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  return { right, up, forward };
}

/** A world point in the camera's own space: +X right, +Y up, looking down -Z (three.js's convention). */
export function toCameraSpace(pose: RoomPose, point: readonly [number, number, number]): Direction {
  const { position } = placeCamera(pose);
  const { right, up, forward } = cameraBasis(pose);
  const d = [point[0] - position[0], point[1] - position[1], point[2] - position[2]];
  const dot = (a: readonly number[]) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return [dot(right), dot(up), -dot(forward)];
}

/**
 * The vertical field of view, in degrees, that gives `hfov` across a frame of
 * this aspect ratio. three.js's `PerspectiveCamera.fov` is vertical; the room
 * is specified horizontally (the user picked 67° looking across the room, not
 * up it), so the width is what has to hold still when the window changes shape.
 */
export function verticalFov(hfovDeg: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((hfovDeg * DEG) / 2) / aspect)) / DEG;
}

/**
 * How far to slide the projection, in px, so the subject sits `share` of the
 * half-width to the right of centre — clear of the card on the left.
 *
 * The planet did this by moving the camera sideways (`focalOffsetX`, a focal
 * offset in world units at the subject's distance). Shifting the projection
 * instead puts the subject in exactly the same place on screen without moving
 * the camera off the centre of the room, and it is a share of the width, so it
 * is right for any window without being recomputed on resize. Negative: the
 * visible window moves left, so the scene inside it moves right.
 */
export function projectionShiftPx(share: number, width: number): number {
  return (-share * width) / 2;
}

/**
 * How far to slide the projection, in px, so the subject sits `lift` of the
 * half-height above centre — clear of a phone's card rail along the bottom.
 * `projectionShiftPx`'s vertical counterpart: positive moves the visible
 * window down, so the scene inside it moves up.
 */
export function projectionLiftPx(lift: number, height: number): number {
  return (lift * height) / 2;
}

/**
 * Where a camera-space direction lands on screen, in CSS px from the frame's
 * top-left — through the pose's lens and its shifts. `null` if the lens
 * cannot show that direction at all.
 *
 * The one projection every screen-space thing in the room uses: the markers
 * and the dotted lines to them, the click test, and the fisheye shader
 * (which is its inverse, `screenRay`, run per pixel). For a perspective with
 * no shift it is exactly what three.js's camera does.
 */
export function projectToScreen(
  dir: Direction,
  framing: Framing,
  width: number,
  height: number
): { x: number; y: number } | null {
  const p = projectLens(dir, (framing.hfov * DEG) / 2, width / height, framing.lens);
  if (!p) return null;
  return { x: ((p.x + framing.share) * 0.5 + 0.5) * width, y: (0.5 - (p.y + framing.lift) * 0.5) * height };
}

/** The camera-space direction seen at a point on screen, in CSS px — `projectToScreen` backwards. */
export function screenRay(x: number, y: number, framing: Framing, width: number, height: number): Direction {
  const ndcX = (x / width) * 2 - 1 - framing.share;
  const ndcY = 1 - (y / height) * 2 - framing.lift;
  return unprojectLens(ndcX, ndcY, (framing.hfov * DEG) / 2, width / height, framing.lens);
}

/**
 * How many CSS px one world unit spans, for something `distance` away in
 * camera-space direction `dir` — what a marker is sized with (`lensPixelsPerRadian`).
 */
export function pixelsPerUnitAt(dir: Direction, distance: number, framing: Framing, width: number): number {
  const length = Math.hypot(dir[0], dir[1], dir[2]);
  const theta = Math.acos(Math.max(-1, Math.min(1, -dir[2] / length)));
  return lensPixelsPerRadian(theta, (framing.hfov * DEG) / 2, framing.lens, width / 2) / distance;
}

/** The frame `HANDHELD_RAIL_TOP_PX` was measured in (390×844). */
const HANDHELD_FRAME_HEIGHT_PX = 844;

/**
 * **Provisional (仮) — waiting on the user.** How far a phone lifts the
 * subject: to the middle of the band above the card rail.
 *
 * The rail's top edge was measured at 664 of 844 px; the middle of the band
 * above it is at 332, 90px above the frame's centre — 0.21 of the half-height.
 * The planet leaned its subject *down* instead (`HANDHELD_VERTICAL_SHARE`, to
 * bring the horizon in) and was capped by that same rail; the room has no
 * horizon to show, and what the rail covers is the floor.
 */
export const HANDHELD_CARD_LIFT = 1 - HANDHELD_RAIL_TOP_PX / HANDHELD_FRAME_HEIGHT_PX;

/** The lift for a frame with a card on it: only a phone's rail needs one. */
export function cardLift(handheld: boolean): number {
  return handheld ? HANDHELD_CARD_LIFT : 0;
}

/** How the free view is drawn at a stage: its lens and width, and the shifts that clear the card. */
export function freeFraming(zoom: ViewZoom, handheld: boolean): Framing {
  return { hfov: hfovForZoom(zoom, handheld), lens: lensForZoom(zoom), share: orbitCardShare(handheld), lift: cardLift(handheld) };
}

/**
 * How a zoom into `stop` is drawn: always through the standard view's
 * perspective — the HTML placed in the room can only be drawn through one —
 * and shifted clear of the card only where there is a card. The desk and
 * the hologram have none: what the reader stepped in for (the PC's screen,
 * the hologram's text) sits square in the frame.
 */
export function zoomFraming(stop: Stop, handheld: boolean): Framing {
  const bare = stop === "desk" || stop === "about";
  return {
    hfov: hfovForZoom("standard", handheld),
    lens: RECTILINEAR,
    share: bare ? 0 : sectionCardShare(handheld),
    lift: bare ? 0 : cardLift(handheld),
  };
}

/**
 * `t` of the way from one pose to another. Yaw by the short way round, the
 * rest straight; easing is the flight's business, not this function's.
 */
export function blendRoomPose(from: RoomPose, to: RoomPose, t: number): RoomPose {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    yaw: from.yaw + wrapAngle(to.yaw - from.yaw) * t,
    pitch: mix(from.pitch, to.pitch),
    forward: mix(from.forward, to.forward),
    eyeHeight: mix(from.eyeHeight, to.eyeHeight),
    // The lens and the field of view travel together, so the standard view
    // bends into the fisheye over the flight rather than swapping in a frame.
    hfov: mix(from.hfov, to.hfov),
    lens: mix(from.lens, to.lens),
    share: mix(from.share, to.share),
    lift: mix(from.lift, to.lift),
  };
}

/**
 * The largest step one frame may contribute to a flight, in seconds.
 *
 * A backstop for a stall part way through, not a frame-rate policy: the clamp
 * only bites below 10fps, where the flight would stretch in wall-clock time
 * rather than skip. Set at 1/30 first (on the planet), which quietly turned
 * every flight on a device rendering slower than 30fps into a slow-motion
 * one — measured at headless SwiftShader's ~3fps, a 1.2s flight took twelve
 * seconds. The time before a flight existed is handled by `primed` instead.
 */
export const MAX_FLIGHT_STEP = 1 / 10;

/**
 * A flight from one pose to another, keeping the two rules the planet's
 * flights were measured into:
 *
 * - **No time is charged on the first frame** (`primed`). A flight begins in an
 *   effect, between two frames; the gap before it is not time it has run for.
 *   Behind the detail page that gap is the heartbeat's full second.
 * - **A flight that ends in the free view hands back its angles** (`land`).
 *   The free view's yaw/pitch refs are a separate source of truth from the
 *   camera; a flight that does not update them on landing leaves the next idle
 *   frame damping from where the camera stood *before* the flight.
 */
export type RoomFlight = {
  from: RoomPose;
  to: RoomPose;
  elapsed: number;
  duration: number;
  primed: boolean;
  land: { yaw: number; pitch: number } | null;
};

export function beginRoomFlight(from: RoomPose, to: RoomPose, duration: number, land: RoomFlight["land"]): RoomFlight {
  return { from, to, elapsed: 0, duration, primed: false, land };
}

export type RoomFlightFrame = {
  pose: RoomPose;
  done: boolean;
  /** The free view's angles to take up, on the landing frame of a flight that has them; otherwise null. */
  landed: { yaw: number; pitch: number } | null;
};

/** Advance a flight by one frame. Mutates `flight`'s clock. */
export function advanceRoomFlight(flight: RoomFlight, delta: number): RoomFlightFrame {
  if (flight.primed) flight.elapsed += Math.min(delta, MAX_FLIGHT_STEP);
  flight.primed = true;
  const t = flight.duration > 0 ? Math.min(1, flight.elapsed / flight.duration) : 1;
  const done = t >= 1;
  return {
    pose: blendRoomPose(flight.from, flight.to, easeInOutCubic(t)),
    done,
    landed: done ? flight.land : null,
  };
}
