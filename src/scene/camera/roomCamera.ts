import { easeInOutCubic, wrapAngle } from "./cameraLayout";
import { MAX_FLIGHT_STEP } from "./cameraFlight";
import { horizontalAt, viewDirection, type RoomView } from "../room/layout";

/**
 * The camera inside the room: where it stands, which way it looks, and how
 * wide it sees — and the flights between two of those.
 *
 * The planet's camera (`cameraLayout.ts`'s `orbitPose`) sat on a sphere and
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
  /** The share of the frame's width given up to the card on the left; see `projectionShiftPx`. */
  share: number;
};

/** A `RoomView` (degrees, from `room/layout.ts`) as a pose, at a field of view and card share. */
export function poseFromView(view: RoomView, hfov: number, share: number): RoomPose {
  return { yaw: view.yaw * DEG, pitch: view.pitch * DEG, forward: view.forward, eyeHeight: view.eyeHeight, hfov, share };
}

/** Where the camera stands and the point it looks at — one metre straight ahead. */
export function placeCamera(pose: RoomPose): { position: [number, number, number]; target: [number, number, number] } {
  const [hx, hz] = horizontalAt(pose.yaw / DEG);
  const position: [number, number, number] = [hx * pose.forward, pose.eyeHeight, hz * pose.forward];
  const [dx, dy, dz] = viewDirection(pose.yaw / DEG, pose.pitch / DEG);
  return { position, target: [position[0] + dx, position[1] + dy, position[2] + dz] };
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
    hfov: mix(from.hfov, to.hfov),
    share: mix(from.share, to.share),
  };
}

/**
 * A flight from one pose to another — the room's counterpart of
 * `cameraFlight.ts`'s `Flight`, keeping its two rules:
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
