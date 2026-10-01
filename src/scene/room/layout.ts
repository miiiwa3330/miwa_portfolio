import type { SectionType } from "@/types";
import type { Direction } from "../planet/geometry";

/**
 * The room the camera stands in: one round room inside a rocket colony, seen
 * from its centre (see docs/room-migration.md for the requirements and the
 * prototypes these numbers came from).
 *
 * **Angles are yaw in degrees, clockwise seen from above, with the desktop PC
 * at 0.** Clockwise because scrolling forward turns the reader to the right,
 * and the PC's right-hand neighbour is the first area in the header's nav
 * order — so turning right walks the room in the same order the nav lists it.
 */

const DEG = Math.PI / 180;

/** A place the tour stops at: the five areas, plus the desktop PC that is not one of them. */
export type Stop = NonNullable<SectionType> | "desk";

/** Chosen by the user in `sandbox/room-lab.html` (2026-10-01). */
export const ROOM_RADIUS = 3.3;
export const EYE_HEIGHT = 1.55;
export const STANDARD_HFOV = 67;
/** Stereographic fisheye, also chosen in the prototype. Horizontal, in degrees. */
export const FISHEYE_HFOV = 161;

/** The prototype's wall height. Not a user choice — nothing has been tuned against it yet. */
export const WALL_HEIGHT = 3.4;
/**
 * Eye height when sitting at the desk. Standing height looked down at the
 * monitor by 29° in the prototype and keystoned the text on it; sitting
 * brings the screen square to the camera.
 */
export const SEATED_EYE_HEIGHT = 1.12;
/** How much of the screen's width a zoomed-in subject fills. */
export const ZOOM_FILL = 0.7;
/** The closest a zoom may bring the camera to a subject's face, in metres. */
export const ZOOM_MIN_CLEARANCE = 0.4;
/** Furniture backs onto the wall with this much air between them. */
const WALL_GAP = 0.02;
/** The least clear angle, in degrees, between two neighbouring pieces' footprints. */
export const MIN_PIECE_GAP = 3;

/**
 * A piece of furniture, flat-backed, standing against the curved wall.
 *
 * Its local frame: +X to the right as seen from the room's centre, +Y up, and
 * **+Z towards the centre** — so its front face is at local z = +depth/2 and
 * its back at -depth/2. The prototype once measured zoom distances to the back
 * by getting this sign wrong (see docs/room-migration.md, prototype 2).
 */
export type Piece = { angle: number; width: number; depth: number };

export type PieceKey = "desk" | "shelf" | "bookcase" | "porthole" | "board" | "comms" | "door" | "workbench";

/**
 * The floor plan. Order and neighbours were set with the user; the angles and
 * a few widths were re-fitted from the prototype's 4.5 m room to 3.3 m so that
 * no two footprints touch. Kept at the prototype's sizes, the desk and the
 * workbench overlapped by 1.6° and the door sat 2.4° from the workbench.
 */
export const PIECES: Record<PieceKey, Piece> = {
  desk: { angle: 0, width: 2.2, depth: 0.8 },
  shelf: { angle: 68, width: 1.6, depth: 0.45 },
  bookcase: { angle: 112, width: 1.3, depth: 0.35 },
  // The porthole is on the wall; this footprint is the hammock hung beneath it.
  porthole: { angle: 165, width: 2.0, depth: 0.5 },
  board: { angle: 218, width: 2.8, depth: 0.06 },
  comms: { angle: 260, width: 1.1, depth: 0.6 },
  door: { angle: 286, width: 1.0, depth: 0.1 },
  workbench: { angle: 316, width: 1.3, depth: 0.7 },
};

export const PIECE_KEYS = Object.keys(PIECES) as PieceKey[];

/** The horizontal unit vector at `yaw`, as [x, z]. Yaw 0 is world -Z. */
export function horizontalAt(yawDeg: number): [number, number] {
  const a = yawDeg * DEG;
  return [Math.sin(a), -Math.cos(a)];
}

/** Where the camera looks when turned to `yaw` and tilted up by `pitch`. */
export function viewDirection(yawDeg: number, pitchDeg: number): Direction {
  const [x, z] = horizontalAt(yawDeg);
  const c = Math.cos(pitchDeg * DEG);
  return [x * c, Math.sin(pitchDeg * DEG), z * c];
}

/** The yaw a horizontal position or direction lies at, in [0, 360). */
export function yawOf(x: number, z: number): number {
  return ((Math.atan2(x, -z) / DEG) % 360 + 360) % 360;
}

/**
 * How far a piece's centre stands from the room's centre.
 *
 * A flat back against a curved wall touches it only at the two back corners,
 * and those sit `sagitta` nearer the centre than the wall does at the middle.
 * Measuring from the middle instead would push both back corners through the
 * wall.
 */
export function pieceCentreDistance(piece: Piece): number {
  const half = piece.width / 2;
  const sagitta = ROOM_RADIUS - Math.sqrt(ROOM_RADIUS * ROOM_RADIUS - half * half);
  return ROOM_RADIUS - sagitta - piece.depth / 2 - WALL_GAP;
}

/** A point given in a piece's own frame, in world coordinates. */
export function pieceToWorld(piece: Piece, local: readonly [number, number, number]): [number, number, number] {
  const [fx, fz] = horizontalAt(piece.angle);
  // Right of the view direction: forward × up.
  const rx = -fz;
  const rz = fx;
  const out = pieceCentreDistance(piece) - local[2];
  return [fx * out + rx * local[0], local[1], fz * out + rz * local[0]];
}

/**
 * The angles a piece's footprint covers, seen from the centre — measured at
 * its front corners, which subtend more than its back ones.
 */
export function pieceSpan(piece: Piece): { from: number; to: number } {
  const front = pieceCentreDistance(piece) - piece.depth / 2;
  const half = Math.atan(piece.width / 2 / front) / DEG;
  return { from: piece.angle - half, to: piece.angle + half };
}

/**
 * What the camera frames at each stop: a point on a piece, how wide a thing it
 * has to fit, and the eye height a zoom brings the camera to.
 */
export type Subject = {
  piece: PieceKey;
  /** The focus point, in the piece's own frame. */
  local: readonly [number, number, number];
  frameWidth: number;
  zoomEyeHeight: number;
};

export const SUBJECTS: Record<Stop, Subject> = {
  // The centre monitor's face, 0.13 m behind the desk's middle. Framed on
  // the one monitor, not the whole desk: framing the desk shrank the 22px body
  // text to about 6px.
  desk: { piece: "desk", local: [0, 1.08, -0.13], frameWidth: 0.8, zoomEyeHeight: SEATED_EYE_HEIGHT },
  // The hologram stands on the same desk, to the PC's right.
  about: { piece: "desk", local: [0.95, 1.45, 0.05], frameWidth: 0.9, zoomEyeHeight: 1.45 },
  products: { piece: "shelf", local: [0, 1.2, PIECES.shelf.depth / 2], frameWidth: 1.6, zoomEyeHeight: EYE_HEIGHT },
  skills: { piece: "bookcase", local: [0, 1.35, PIECES.bookcase.depth / 2], frameWidth: 1.3, zoomEyeHeight: EYE_HEIGHT },
  experience: { piece: "board", local: [0, 1.55, PIECES.board.depth / 2], frameWidth: 2.9, zoomEyeHeight: EYE_HEIGHT },
  contact: { piece: "comms", local: [0, 1.15, PIECES.comms.depth / 2], frameWidth: 1.1, zoomEyeHeight: EYE_HEIGHT },
};

export const STOP_KEYS = Object.keys(SUBJECTS) as Stop[];

/** A subject's focus point in world coordinates. */
export function subjectPoint(stop: Stop): [number, number, number] {
  const subject = SUBJECTS[stop];
  return pieceToWorld(PIECES[subject.piece], subject.local);
}

/** The yaw a stop's subject lies at from the centre. */
export function subjectYaw(stop: Stop): number {
  const [x, , z] = subjectPoint(stop);
  return yawOf(x, z);
}

/** How far a stop's subject is from the centre, horizontally. */
export function subjectDistance(stop: Stop): number {
  const [x, , z] = subjectPoint(stop);
  return Math.hypot(x, z);
}

/** The stops in the order turning right reaches them, starting from the PC. */
export const STOP_ORDER: Stop[] = [...STOP_KEYS].sort((a, b) => {
  const from = subjectYaw("desk");
  const ya = (subjectYaw(a) - from + 360) % 360;
  const yb = (subjectYaw(b) - from + 360) % 360;
  return ya - yb;
});

/** A camera framing: which way it looks, how far it has stepped out from the centre, and at what height. */
export type RoomView = { yaw: number; pitch: number; forward: number; eyeHeight: number };

/** Standing at the centre, turned to face a stop. */
export function standardView(stop: Stop): RoomView {
  const [, y] = subjectPoint(stop);
  return {
    yaw: subjectYaw(stop),
    pitch: Math.atan2(y - EYE_HEIGHT, subjectDistance(stop)) / DEG,
    forward: 0,
    eyeHeight: EYE_HEIGHT,
  };
}

/**
 * Stepped in towards a stop until its subject fills `ZOOM_FILL` of the screen
 * width, at the subject's own eye height.
 *
 * The same reasoning as the planet's `frameDistance`: a half-width `w/2` seen
 * from `d` away spans `(w/2)/d` of a rectilinear frame whose own half-span is
 * `tan(hfov/2)`. Never steps back past the centre, nor closer than
 * `ZOOM_MIN_CLEARANCE` to the subject's face.
 */
export function zoomView(stop: Stop, hfovDeg: number = STANDARD_HFOV): RoomView {
  const subject = SUBJECTS[stop];
  const [, y] = subjectPoint(stop);
  const face = subjectDistance(stop);
  const standOff = subject.frameWidth / 2 / ZOOM_FILL / Math.tan((hfovDeg * DEG) / 2);
  const forward = Math.max(0, Math.min(face - ZOOM_MIN_CLEARANCE, face - standOff));
  return {
    yaw: subjectYaw(stop),
    pitch: Math.atan2(y - subject.zoomEyeHeight, face - forward) / DEG,
    forward,
    eyeHeight: subject.zoomEyeHeight,
  };
}

/** The signed difference `to - from` in degrees, wrapped into (-180, 180]. */
export function yawDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/**
 * Which stop is in front of a camera looking along `dir`. By yaw alone — the
 * question is which part of the room the reader has turned to, and looking up
 * at the ceiling or down at the floor does not change that.
 */
export function facingStop(dir: Direction): Stop {
  const yaw = yawOf(dir[0], dir[2]);
  let best: Stop = STOP_ORDER[0];
  let bestDiff = Infinity;
  for (const stop of STOP_ORDER) {
    const diff = Math.abs(yawDelta(yaw, subjectYaw(stop)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = stop;
    }
  }
  return best;
}
