import {
  HAND_Y,
  MAC,
  MAC_MOUSE,
  PIECES,
  SEATED_EYE_HEIGHT,
  macKeyboardPlace,
  macToDesk,
  monitorFace,
  pieceCentreDistance,
  pieceToWorld,
  zoomView,
  type MonitorKey,
} from "./layout";
import { MAC_CASE, macFace } from "./macCase";

/**
 * Where the reader looks while sitting at the desk (2026-10-23, the user):
 * the desk has four screens — the main monitor, the camera's monitor over
 * it, the video monitor leaning on the right, and the Macintosh on the left
 * — and a two-finger swipe off the screens turns to one of them, never
 * stopping in between.
 *
 * - **The main, the upper and the right screens are looked at from the
 *   PC's seat**, turning the head: the body stays facing the desk, the hands
 *   on the HHKB and the mouse (`room/self.ts`).
 * - **The Macintosh is sat at** (the user: 「寄りながら向く、椅子と体も動かす」):
 *   the chair rolls left to straight in front of it and turns with it, and
 *   the hands go to its keyboard and mouse. Its seat is as far behind the
 *   desk's front edge as the PC's, so the body sits the same way — which
 *   brings the eye from 0.97 m to 0.83 m from the Mac's screen.
 *
 * The four are a cross, as they stand: the Mac left of the main screen, the
 * video monitor right of it, the camera's above it. A swipe goes to the
 * neighbour that way, if there is one.
 */

export type DeskView = "pc" | "camera" | "video" | "mac";
export type Swipe = "left" | "right" | "up" | "down";

export const DESK_VIEWS: readonly DeskView[] = ["pc", "camera", "video", "mac"];

const TOWARD: Record<DeskView, Partial<Record<Swipe, DeskView>>> = {
  pc: { left: "mac", right: "video", up: "camera" },
  mac: { right: "pc" },
  video: { left: "pc" },
  camera: { down: "pc" },
};

/** The view a swipe turns to from `view`: its neighbour that way, or itself where there is none. */
export function deskViewToward(view: DeskView, swipe: Swipe): DeskView {
  return TOWARD[view][swipe] ?? view;
}

/** The machine the reader's keyboard types on in a view: the one they are looking at. */
export function deskViewMachine(view: DeskView): "pc" | "mac" {
  return view === "mac" ? "mac" : "pc";
}

/**
 * **仮.** How long turning to a view takes, in seconds: a turn of the head,
 * or rolling over to the Mac and back.
 */
export function deskViewSeconds(from: DeskView, to: DeskView): number {
  return from === "mac" || to === "mac" ? 0.9 : 0.5;
}

type Vec3 = [number, number, number];
const desk = (local: readonly [number, number, number]): Vec3 => pieceToWorld(PIECES.desk, local);

/** The seated eye's distance from the desk's middle, towards the room: where the PC's seat is. */
function seatLocalZ(): number {
  return pieceCentreDistance(PIECES.desk) - zoomView("desk").forward;
}

/** The PC's seat, in the desk's frame (x, z): straight out from the main screen. */
export function pcSeatLocal(): [number, number] {
  return [0, seatLocalZ()];
}

/**
 * The Mac's seat, in the desk's frame (x, z): on the line straight out from
 * the Mac's front through its middle, as far from the desk's front edge as
 * the PC's seat.
 */
export function macSeatLocal(): [number, number] {
  const z = seatLocalZ();
  const out = (z - MAC.z) / Math.cos(MAC.yaw);
  return [MAC.x + out * Math.sin(MAC.yaw), z];
}

/** A seat in the room (world x, z). */
export function seatWorld(local: readonly [number, number]): [number, number] {
  const [x, , z] = desk([local[0], 0, local[1]]);
  return [x, z];
}

/** The way the reader faces at the Mac's seat, as the room measures yaw (radians, clockwise from above): the Mac turned towards the chair, the reader turned back to it. */
export const MAC_SEAT_YAW = -MAC.yaw;

/** The hands at the Mac, in the desk's frame: the left on its keyboard as on the HHKB (`DESK_HANDS`), the right on its mouse, wherever it has slid (`mouse`). */
export function macHandsLocal(mouse: readonly [number, number] = [0, 0]): [Vec3, Vec3] {
  const board = macKeyboardPlace();
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  const [lx, lz] = [-0.1, 0.06];
  return [
    [board.x + lx * c + lz * s, HAND_Y, board.z - lx * s + lz * c],
    [MAC_MOUSE.x + mouse[0], HAND_Y, MAC_MOUSE.z + 0.05 + mouse[1]],
  ];
}

/** The same, in the room. */
export function macHands(mouse: readonly [number, number] = [0, 0]): [Vec3, Vec3] {
  const [left, right] = macHandsLocal(mouse);
  return [desk(left), desk(right)];
}

/** A view's held pose, but for how it is drawn (the framing is the PC's zoom's): radians, as `RoomPose`. */
export type DeskViewPose = { x: number; z: number; yaw: number; pitch: number; forward: number; eyeHeight: number };

/** The yaw (radians, clockwise from above) and pitch from an eye to a point. */
function aim(eye: readonly [number, number], height: number, target: readonly number[]): { yaw: number; pitch: number } {
  const dx = target[0] - eye[0];
  const dz = target[2] - eye[1];
  return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(target[1] - height, Math.hypot(dx, dz)) };
}

/**
 * Where a seated reader at the Mac looks: half-way between the top of its
 * screen's recess and the nearer hand — so both are in the frame, as at the
 * PC (`seatedPitch`).
 */
export function macSeatedPitch(): number {
  const eye = seatWorld(macSeatLocal());
  const top = aim(eye, SEATED_EYE_HEIGHT, desk(macToDesk(macFace(0, MAC_CASE.recess.top, 0)))).pitch;
  const hands = macHands().map((h) => aim(eye, SEATED_EYE_HEIGHT, h).pitch);
  return (top + Math.min(...hands)) / 2;
}

/**
 * A view's held pose. The main screen's is the PC's zoom as it always was;
 * the others look from their seat at their screen's middle (the Mac's as
 * `macSeatedPitch`). Every one keeps the PC's step out (`forward`) and moves
 * its place back along the view instead, so the eye stays over its seat
 * whichever way it looks — a flight between two of them can then glide the
 * eye straight from seat to seat (`camera/walkFlight.ts`'s `seatedMove`).
 */
export function deskViewPose(view: DeskView): DeskViewPose {
  const seated = zoomView("desk");
  const forward = seated.forward;
  const DEG = Math.PI / 180;
  if (view === "pc") return { x: 0, z: 0, yaw: seated.yaw * DEG, pitch: seated.pitch * DEG, forward, eyeHeight: seated.eyeHeight };
  const seat = seatWorld(view === "mac" ? macSeatLocal() : pcSeatLocal());
  const { yaw, pitch } =
    view === "mac" ? { yaw: MAC_SEAT_YAW, pitch: macSeatedPitch() } : aim(seat, seated.eyeHeight, desk(monitorFace(view as MonitorKey).centre));
  // The eye over the seat: `floorSpot` puts it `forward` out along the yaw.
  return { x: seat[0] - Math.sin(yaw) * forward, z: seat[1] + Math.cos(yaw) * forward, yaw, pitch, forward, eyeHeight: seated.eyeHeight };
}

/**
 * Reading a swipe off a trackpad's wheel events. The trackpad's own
 * scrolling is "natural" by default on a Mac — the content follows the
 * fingers — so fingers going left scroll right (`deltaX` > 0) and fingers
 * going up scroll down (`deltaY` > 0). The user chose to look the way the
 * fingers go: fingers left, the screen on the left.
 *
 * One swipe is one stream of wheel events, and turns once: the deltas add
 * up until one way passes `SWIPE.threshold` px, then the stream is spent
 * until it falls quiet for `SWIPE.quiet` ms (a trackpad keeps coasting after
 * the fingers lift). **仮**: the threshold.
 */
export const SWIPE = { threshold: 40, quiet: 220 } as const;

export type SwipeLatch = { x: number; y: number; at: number; spent: boolean };

export function feedSwipe(latch: SwipeLatch | null, dx: number, dy: number, time: number): { latch: SwipeLatch; swipe: Swipe | null } {
  const next: SwipeLatch = !latch || time - latch.at >= SWIPE.quiet ? { x: 0, y: 0, at: time, spent: false } : { ...latch, at: time };
  next.x += dx;
  next.y += dy;
  if (next.spent || Math.max(Math.abs(next.x), Math.abs(next.y)) < SWIPE.threshold) return { latch: next, swipe: null };
  next.spent = true;
  const swipe: Swipe = Math.abs(next.x) > Math.abs(next.y) ? (next.x > 0 ? "left" : "right") : next.y > 0 ? "up" : "down";
  return { latch: next, swipe };
}
