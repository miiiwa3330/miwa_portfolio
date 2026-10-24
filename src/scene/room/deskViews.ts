import {
  HAND_Y,
  MAC,
  MAC_MOUSE,
  PIECES,
  SEATED_EYE_HEIGHT,
  holoFanPlace,
  macKeyboardPlace,
  macToDesk,
  monitorFace,
  pieceCentreDistance,
  pieceToWorld,
  viewDirection,
  zoomView,
  type MonitorKey,
} from "./layout";
import { MAC_CASE, macFace, macPictureCentre } from "./macCase";
import { floorSpot, headLean } from "../camera/roomCamera";

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
 * neighbour that way, if there is one — and the upper screen is a neighbour
 * of the left and the right ones too (2026-10-23, the user: 「左ー上、右ー上
 * 間の視点遷移も」): up from either, and left or right from it. Between the
 * left and the right there is no way but through the main screen.
 *
 * **The hologram fan is a fifth** (2026-10-25, the user: 「３Dホログラム
 * ファンへの視点を追加」「メインモニター・上モニター・縦置きモニター全てから
 * 移動できるように」). From the seat it is about 30° right and 14° up —
 * right of the upper screen, over the video one, up and to the right of the
 * main one — so the moves go the way it is seen (the user's choice over
 * keeping the upper and the video screens' old moves): right from the upper
 * screen, up from the video one, and **a diagonal swipe**, up and to the
 * right, from the main one. The upper and the video screens, which were
 * right and up of each other, are now diagonal of each other too: down and
 * to the right from the upper one, up and to the left from the video one.
 */

export type DeskView = "pc" | "camera" | "video" | "mac" | "fan";
export type Swipe = "left" | "right" | "up" | "down" | "upLeft" | "upRight" | "downLeft" | "downRight";
/** The four straight ways a swipe can go. */
export type Axis = "left" | "right" | "up" | "down";

export const DESK_VIEWS: readonly DeskView[] = ["pc", "camera", "video", "mac", "fan"];

const TOWARD: Record<DeskView, Partial<Record<Swipe, DeskView>>> = {
  pc: { left: "mac", right: "video", up: "camera", upRight: "fan" },
  mac: { right: "pc", up: "camera" },
  video: { left: "pc", up: "fan", upLeft: "camera" },
  camera: { down: "pc", left: "mac", right: "fan", downRight: "video" },
  fan: { left: "camera", down: "video", downLeft: "pc" },
};

/**
 * The view a swipe turns to from `view`: its neighbour that way, or itself
 * where there is none. A diagonal swipe with no neighbour that way is taken
 * as the straight way it went most (`axis`): a swipe a little off the
 * straight is still a straight swipe where there is nothing diagonal.
 */
export function deskViewToward(view: DeskView, swipe: Swipe, axis?: Axis): DeskView {
  return TOWARD[view][swipe] ?? (axis ? TOWARD[view][axis] : undefined) ?? view;
}

/**
 * The view whose screen is nearest the way a seated reader is looking —
 * where a swipe goes on from after they have looked round with the mouse
 * (`turnSeatedHead`).
 */
export function nearestDeskView(yaw: number, pitch: number): DeskView {
  const DEG = Math.PI / 180;
  const look = viewDirection(yaw / DEG, pitch / DEG);
  let best: DeskView = "pc";
  let bestDot = -Infinity;
  for (const view of DESK_VIEWS) {
    const pose = deskViewPose(view);
    const d = viewDirection(pose.yaw / DEG, pose.pitch / DEG);
    const dot = d[0] * look[0] + d[1] * look[1] + d[2] * look[2];
    if (dot > bestDot) [best, bestDot] = [view, dot];
  }
  return best;
}

/**
 * A seated pose with the head turned to `yaw` and `pitch` — looking round
 * with the mouse while sat (2026-10-25, the user: 「全く何にも関係ないところで、
 * クリックすると立っている時と同じように自由視点に」; they chose staying sat
 * over standing up). The eye stays over the seat: the pose's place moves
 * back along the new way, as `deskViewPose` places every view.
 */
export function turnSeatedHead<P extends DeskViewPose>(pose: P, yaw: number, pitch: number): P {
  const [sx, sz] = floorSpot(pose);
  return { ...pose, yaw, pitch, x: sx - Math.sin(yaw) * pose.forward, z: sz + Math.cos(yaw) * pose.forward };
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
  // The fan, like the upper and the video screens: a turn of the head.
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
 * the others look from their seat at their screen's middle — the fan's, its
 * middle (the Mac's as
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
    view === "mac"
      ? { yaw: MAC_SEAT_YAW, pitch: macSeatedPitch() }
      : aim(seat, seated.eyeHeight, desk(view === "fan" ? holoFanPlace().centre : monitorFace(view as MonitorKey).centre));
  // The eye over the seat: `floorSpot` puts it `forward` out along the yaw.
  return { x: seat[0] - Math.sin(yaw) * forward, z: seat[1] + Math.cos(yaw) * forward, yaw, pitch, forward, eyeHeight: seated.eyeHeight };
}

/**
 * **仮.** How much of the frame's width the Mac's picture takes while a game
 * is open on it — the 7 in 10 every zoom gives its subject (`zoomView`) —
 * and how long the zoom in and out takes.
 */
export const MAC_GAME_SHARE = 0.7;
export const MAC_ZOOM_SECONDS = 0.6;

/**
 * The view while a game is open on the Mac (2026-10-23, the user: 「ゲームを始め
 * たら、Mac の画面へズーム」「画角だけ狭める」): from the Mac's seat, the chair
 * and the body where they are, the head turned straight at the picture's
 * middle and the field of view narrowed till the picture is `MAC_GAME_SHARE`
 * of the frame's width (from 16%). The eye is the camera's own, which leans
 * out a little looking down (`headLean`): aimed from it, a few rounds settle
 * the pitch.
 */
export function macGamePose(): DeskViewPose & { hfov: number } {
  const seat = seatWorld(macSeatLocal());
  const { forward, eyeHeight } = zoomView("desk");
  const yaw = MAC_SEAT_YAW;
  const centre = desk(macToDesk(macPictureCentre()));
  const out = [Math.sin(yaw), -Math.cos(yaw)];
  let pitch = macSeatedPitch();
  let depth = 0;
  for (let i = 0; i < 4; i++) {
    const lean = headLean(pitch);
    const eye: [number, number] = [seat[0] + out[0] * lean, seat[1] + out[1] * lean];
    pitch = aim(eye, eyeHeight, centre).pitch;
    depth = Math.hypot(centre[0] - eye[0], centre[1] - eyeHeight, centre[2] - eye[1]);
  }
  const hfov = ((2 * Math.atan(MAC_CASE.picture.width / 2 / (MAC_GAME_SHARE * depth))) * 180) / Math.PI;
  return { x: seat[0] - out[0] * forward, z: seat[1] - out[1] * forward, yaw, pitch, forward, eyeHeight, hfov };
}

/**
 * Reading a swipe off a trackpad's wheel events. The trackpad's own
 * scrolling is "natural" by default on a Mac — the content follows the
 * fingers — so fingers going left scroll right (`deltaX` > 0) and fingers
 * going up scroll down (`deltaY` > 0). The user chose to look the way the
 * fingers go: fingers left, the screen on the left.
 *
 * One swipe is one stream of wheel events, and turns once: the deltas add
 * up until one way passes `SWIPE.threshold` px, then the stream is spent.
 * A trackpad keeps scrolling after the fingers lift — the momentum, in
 * deltas that only die away — so a spent stream ends at a pause of
 * `SWIPE.quiet` ms, **or as soon as the fingers are plainly on it again**:
 * the deltas turn back (a swipe back the other way), or — once they have
 * died down to under `SWIPE.faded` of their peak — grow again by
 * `SWIPE.regrow` (a new swipe the same way; still growing past the
 * threshold is the same fingers speeding up, and turned twice). Waiting for the pause alone,
 * a swipe back made before the momentum had died was taken as more of the
 * swipe before it, and did nothing (2026-10-23, the user). **仮**: the
 * threshold and the growth.
 */
export const SWIPE = { threshold: 40, quiet: 220, regrow: 1.5, faded: 0.6, least: 4, diagonal: Math.tan(Math.PI / 6) } as const;

export type SwipeLatch = {
  x: number;
  y: number;
  at: number;
  spent: boolean;
  /** The last event's delta, to tell momentum (dying away) from fingers (turning back, or growing again). */
  last: [number, number];
  /** Since the swipe was spent: the largest delta, and the smallest since it. */
  peak: number;
  low: number;
};

/** Whether a delta, after a spent swipe, is the fingers on the trackpad again rather than its momentum. */
function fingersAgain(latch: SwipeLatch, dx: number, dy: number): boolean {
  const now = Math.hypot(dx, dy);
  if (now < SWIPE.least) return false;
  const back = dx * latch.last[0] + dy * latch.last[1] < 0;
  return back || (latch.low < latch.peak * SWIPE.faded && now > latch.low * SWIPE.regrow);
}

/**
 * The way a swipe went: one of the four straight ways, or — when the smaller
 * of its two parts is at least `SWIPE.diagonal` of the larger, within 15° of
 * the diagonal (**仮**) — one of the four diagonals (2026-10-25, for the
 * hologram fan up and to the right of the main screen). Also the straight
 * way it went most, for where a diagonal leads nowhere (`deskViewToward`).
 */
export function swipeWay(x: number, y: number): { swipe: Swipe; axis: Axis } {
  const horizontal = x > 0 ? "left" : "right";
  const vertical = y > 0 ? "up" : "down";
  const axis: Axis = Math.abs(x) > Math.abs(y) ? horizontal : vertical;
  const diagonal = Math.min(Math.abs(x), Math.abs(y)) >= SWIPE.diagonal * Math.max(Math.abs(x), Math.abs(y));
  if (!diagonal) return { swipe: axis, axis };
  return { swipe: `${vertical}${horizontal === "left" ? "Left" : "Right"}`, axis };
}

export function feedSwipe(latch: SwipeLatch | null, dx: number, dy: number, time: number): { latch: SwipeLatch; swipe: Swipe | null; axis: Axis | null } {
  const size = Math.hypot(dx, dy);
  const fresh = !latch || time - latch.at >= SWIPE.quiet || (latch.spent && fingersAgain(latch, dx, dy));
  // A flicker (under `least`) is not a way the fingers went: the last way stays the momentum's.
  const last: [number, number] = fresh || size >= SWIPE.least ? [dx, dy] : latch.last;
  const next: SwipeLatch = fresh ? { x: 0, y: 0, at: time, spent: false, last, peak: 0, low: 0 } : { ...latch, at: time, last };
  next.x += dx;
  next.y += dy;
  // A flicker (under `least`) is neither: counted as the momentum dying, the next ordinary delta read as fingers growing again.
  if (next.spent && size >= SWIPE.least) {
    if (size > next.peak) next.peak = next.low = size;
    else next.low = Math.min(next.low, size);
  }
  if (next.spent || Math.max(Math.abs(next.x), Math.abs(next.y)) < SWIPE.threshold) return { latch: next, swipe: null, axis: null };
  next.spent = true;
  next.peak = next.low = size;
  return { latch: next, ...swipeWay(next.x, next.y) };
}
