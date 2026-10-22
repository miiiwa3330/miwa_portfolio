import type { Stop } from "@/types";
import type { Direction } from "../direction";
import { RECTILINEAR, STEREOGRAPHIC } from "../camera/fisheye";
import { FIGURE, HIP_OVER_SEAT, PELVIS_BACK, seatedHipsFromEye } from "./figure";
import { M0110 } from "./macKeyboard";

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

export type { Stop };

/**
 * Chosen by the user in the room-lab prototype (2026-10-01) at 3.3 m, and
 * brought in to 3.0 m by the user (2026-10-02): the floor between the
 * furniture, about 5 m across, read as empty space.
 */
export const ROOM_RADIUS = 3.0;
/**
 * The room owner's eye (`room/figure.ts`, measured off the character sheet
 * at 168 cm): 1.49 m. It was 1.55 m, picked in the prototype before there
 * was a figure; the user chose to bring the camera down to the figure's eye
 * rather than make the figure 175 cm or shrink its head (2026-10-02).
 */
export const EYE_HEIGHT = FIGURE.eye;
/**
 * The perspective a zoom is drawn through — stepped in to an area, sat at
 * the PC, at the hologram — horizontal, in degrees. The user's 67° from the
 * prototype; it frames the subjects and keeps the text placed in the room
 * readable (`ZOOM_FILL`, the seat at the PC).
 */
export const STANDARD_HFOV = 67;
/**
 * The free view's standard stage, looking round the room: 90° across, a
 * game's first person (the user, 2026-10-02). At 67° the room looked as if
 * seen from two or three steps further in than the reader stands — at the
 * desk's 2.8 m, 2 steps back is what 67° → 98° undoes.
 */
export const FREE_HFOV = 90;
/** Stereographic fisheye, also chosen in the prototype. Horizontal, in degrees. */
export const FISHEYE_HFOV = 161;

/** The prototype's wall height. Not a user choice — nothing has been tuned against it yet. */
export const WALL_HEIGHT = 3.4;
/**
 * Eye height when sitting at the desk. Standing height looked down at the
 * monitor by 29° in the prototype and keystoned the text on it; sitting
 * brings the screen square to the camera.
 *
 * **Provisional (仮)**: 1.20 m since the figure (2026-10-02; 1.12 m before).
 * The figure sits tall for its legs, and holding 1.12 m meant hunching 34°
 * over the desk; at 1.20 m it leans in 13° (`SEATED_LEAN`) on a 42 cm seat.
 * The screen's top and the hands on the keyboard still both fit a 16:9
 * frame (37° of the 41° it spans, tested).
 */
export const SEATED_EYE_HEIGHT = 1.2;
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
 *
 * Re-fitted again for 3.0 m (2026-10-02), the widths kept: the 3.3 m angles
 * left the workbench 1.6° into the desk and the board 0.2° from the comms.
 * The pieces take 307° of the round there; with the PC held at 0, the rest
 * is shared out as an even gap of about 6.7° between each pair.
 */
export const PIECES: Record<PieceKey, Piece> = {
  desk: { angle: 0, width: 2.2, depth: 0.8 },
  shelf: { angle: 54, width: 1.6, depth: 0.45 },
  bookcase: { angle: 93, width: 1.3, depth: 0.35 },
  // The porthole is on the wall; this footprint is the hammock hung beneath it.
  porthole: { angle: 138, width: 2.0, depth: 0.5 },
  board: { angle: 196, width: 2.8, depth: 0.06 },
  comms: { angle: 245, width: 1.1, depth: 0.6 },
  door: { angle: 275, width: 1.0, depth: 0.1 },
  workbench: { angle: 308, width: 1.3, depth: 0.7 },
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
  /** How high the area's marker floats — clear of the top of the thing it marks. */
  markerY: number;
};

/**
 * The PC's three monitors, in the desk's own frame (`Piece`): one stood on
 * end on the desk's right, leaning back on a kickstand, plays a video, the
 * middle is the PC's own screen — the GUI the reader operates — and the one
 * above it shows the security camera (docs/room-migration.md; rearranged on
 * 2026-10-22, the Macintosh taking the desk's left).
 *
 * Each has its own size, given as it stands upright and level: `bezel`,
 * `screen` and `chin` (the frame may run further below the screen than
 * above it, the way a real monitor's does). Then it is placed: `x` and `y`
 * are the middle of its screen, `z` the middle of its front frame's depth
 * (not the housing behind it); `roll` turns the panel about its own face
 * (−π/2 is a quarter turn clockwise seen from the front — a pivoting stand
 * stood on end), then `pitch` tips its face down, then `yaw` turns it about
 * +Y (radians; a three.js `"YXZ"` Euler). `mount` is what holds it: its own
 * stand (`MONITOR_STANDS`), the arm (`MONITOR_ARM`), or a kickstand on its
 * back (`kickstand`).
 *
 * Both the monitors' meshes (`RoomScene`) and the HTML laid on the middle
 * screen (`room/screens.ts`) read these, so the two cannot drift apart.
 */
export type MonitorKey = "video" | "gui" | "camera";
export type Monitor = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  mount: "stand" | "arm" | "kickstand";
  /** The front frame: its outside size and its depth. */
  bezel: { width: number; height: number; depth: number };
  /** The lit area inside it. */
  screen: { width: number; height: number };
  /** How much more frame there is under the screen than over it. */
  chin: number;
};

/** The desk's working surface: where the keyboard, the mouse and the monitors' stands stand. */
export const DESK_TOP_Y = 0.775;

/** The monitors the desk was first built with, all one size. */
const PLAIN_MONITOR = {
  y: 1.08,
  pitch: 0,
  roll: 0,
  mount: "stand",
  bezel: { width: 0.66, height: 0.42, depth: 0.04 },
  screen: { width: 0.62, height: 0.38 },
  chin: 0,
} as const;

/**
 * The main monitor is a **Dell UltraSharp U3223QE** (31.5", 16:9; 2026-10-22,
 * the user asked for a larger one): the panel without its stand is 712.6 ×
 * 410.0 × 55.8 mm and its viewable area 697.3 × 392.2 mm (the maker's spec
 * as resellers list it). The side frames are (712.6 − 697.3) / 2 = 7.65 mm;
 * the top is taken to be as thin as the sides (**仮**), which leaves 10.15 mm
 * under the screen. `depth` is the panel's thickness at its edge (**仮**,
 * 18 mm); the housing behind it bulges out to the full 55.8 mm
 * (`MONITOR_STANDS.gui.housingDepth`).
 *
 * Its screen's surface stays where the first, smaller monitor's was (z −0.125 m
 * in the desk's frame): the seat is framed from it, and the seat does not
 * move (docs/scene-invariants.md).
 */
const MAIN_FRAME_SIDE = 0.00765;
const MAIN_MONITOR: Omit<Monitor, "x" | "z" | "yaw"> = {
  y: 1.08,
  pitch: 0,
  roll: 0,
  mount: "stand",
  bezel: { width: 0.7126, height: 0.41, depth: 0.018 },
  screen: { width: 0.6973, height: 0.3922 },
  chin: 0.41 - 0.3922 - 2 * MAIN_FRAME_SIDE,
};

/**
 * The monitor above the main one, on the arm: the first monitor, as it was,
 * tipped 10° down towards the seat (**仮**) and set back behind the main
 * one's housing, 3 cm clear of its top edge (**仮**).
 */
const UPPER_PITCH = 0.17;
const UPPER_GAP = 0.03;
const MAIN_TOP = MAIN_MONITOR.y + (MAIN_MONITOR.bezel.height - MAIN_MONITOR.chin) / 2;
const UPPER_Y = MAIN_TOP + UPPER_GAP + PLAIN_MONITOR.bezel.height / 2;

/** A point in a monitor's own frame turned as the monitor is (roll, then pitch, then yaw; three.js "YXZ"), not yet moved to its place. */
function turnMonitor(m: Pick<Monitor, "yaw" | "pitch" | "roll">, local: readonly [number, number, number]): [number, number, number] {
  const { yaw, pitch, roll } = m;
  const rx = local[0] * Math.cos(roll) - local[1] * Math.sin(roll);
  const ry = local[0] * Math.sin(roll) + local[1] * Math.cos(roll);
  const py = ry * Math.cos(pitch) - local[2] * Math.sin(pitch);
  const pz = ry * Math.sin(pitch) + local[2] * Math.cos(pitch);
  return [rx * Math.cos(yaw) + pz * Math.sin(yaw), py, -rx * Math.sin(yaw) + pz * Math.cos(yaw)];
}

/** The corners of a monitor's frame, in its own frame. */
function frameCorners(m: Pick<Monitor, "bezel" | "chin">): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) out.push([(x * m.bezel.width) / 2, -m.chin / 2 + (y * m.bezel.height) / 2, (z * m.bezel.depth) / 2]);
  return out;
}

/**
 * The video monitor is a **Dell P2422H** (23.8", 16:9) without its stand,
 * stood on end on the desk's right in front of the arm, leaning back on a
 * kickstand on its back (2026-10-22, the user: 「立てかけ式」, 「モニターに
 * 支えをつけて」). 537.8 × 318.5 × 52.1 mm, a viewable area of 527.04 ×
 * 296.46 mm (the maker's spec as resellers list it). Side frames
 * (537.8 − 527.04) / 2 = 5.38 mm, the top taken to be as thin (**仮**), so
 * 16.66 mm under the screen; turned a quarter clockwise, that strip is on
 * its left. **仮**: it leans back 15°, is turned 0.3 rad in towards the
 * chair, and where it stands. Its height is not chosen: it rests its lowest
 * corner on the desk.
 */
const PIVOT_FRAME_SIDE = (0.5378 - 0.52704) / 2;
const LEANING_MONITOR: Omit<Monitor, "y"> = {
  x: 0.56,
  z: -0.16,
  yaw: -0.3,
  pitch: -0.26,
  roll: -Math.PI / 2,
  mount: "kickstand",
  bezel: { width: 0.5378, height: 0.3185, depth: 0.018 },
  screen: { width: 0.52704, height: 0.29646 },
  chin: 0.3185 - 0.29646 - 2 * PIVOT_FRAME_SIDE,
};
const LEANING_Y = DESK_TOP_Y - Math.min(...frameCorners(LEANING_MONITOR).map((c) => turnMonitor(LEANING_MONITOR, c)[1]));

export const MONITORS: Record<MonitorKey, Monitor> = {
  video: { ...LEANING_MONITOR, y: LEANING_Y },
  gui: { ...MAIN_MONITOR, x: 0, z: -0.139, yaw: 0 },
  camera: { ...PLAIN_MONITOR, x: 0, y: UPPER_Y, z: -0.2, yaw: 0, pitch: UPPER_PITCH, mount: "arm" },
};

/**
 * A point in a monitor's own frame — as it stands upright: origin at its
 * screen's middle and frame's mid-depth, +X right, +Y up, +Z out of the
 * screen — in the desk's frame.
 */
export function monitorToDesk(key: MonitorKey, local: readonly [number, number, number]): [number, number, number] {
  const m = MONITORS[key];
  const [tx, ty, tz] = turnMonitor(m, local);
  return [m.x + tx, m.y + ty, m.z + tz];
}

/**
 * The two Dell monitors' whole depth, from the frame's front to the back of
 * the housing: the U3223QE's 55.8 mm and the P2422H's 52.1 mm (the maker's
 * spec, without stands).
 */
export type DellMonitorKey = "gui" | "video";
export const DELL_HOUSING_DEPTH: Record<DellMonitorKey, number> = { gui: 0.0558, video: 0.0521 };

/**
 * The video monitor's kickstand: a leg hinged on the back of its housing,
 * `hingeUp` above the screen's middle along the panel, opened `spread` off
 * the panel's back and reaching down to the desk. **仮**, both.
 */
export const KICKSTAND = { hingeUp: 0.06, spread: 0.55, width: 0.06, thickness: 0.004 } as const;

/** The kickstand's hinge and foot, in the desk's frame. */
export function kickstand(): { hinge: [number, number, number]; foot: [number, number, number] } {
  const m = MONITORS.video;
  const normal = turnMonitor(m, [0, 0, 1]);
  // Up along the panel as it leans: at right angles to its face and to the horizontal along it.
  const across: [number, number, number] = [Math.cos(m.yaw), 0, -Math.sin(m.yaw)];
  const up: [number, number, number] = [
    normal[1] * across[2] - normal[2] * across[1],
    normal[2] * across[0] - normal[0] * across[2],
    normal[0] * across[1] - normal[1] * across[0],
  ];
  const back = m.bezel.depth / 2 - DELL_HOUSING_DEPTH.video;
  const hinge: [number, number, number] = [0, 1, 2].map((i) => [m.x, m.y, m.z][i] + up[i] * KICKSTAND.hingeUp + normal[i] * back) as [number, number, number];
  // Down the panel's back and out behind it.
  const leg = [0, 1, 2].map((i) => -up[i] * Math.cos(KICKSTAND.spread) - normal[i] * Math.sin(KICKSTAND.spread));
  const reach = (hinge[1] - DESK_TOP_Y) / -leg[1];
  return { hinge, foot: [0, 1, 2].map((i) => hinge[i] + leg[i] * reach) as [number, number, number] };
}

/**
 * The stands of the monitors that have one — the U3223QE's. `lowest` is
 * how far the panel's bottom edge is over the desk with the stand at its
 * lowest; `travel` how far it rises; `depth` the panel's front to the back
 * of the base. From the maker's spec: 469.3 mm tall at its lowest, so its
 * bottom is 59.3 mm over the desk; it rises 150 mm; 233.2 mm deep.
 *
 * **仮**: the base's width, thickness, corners and how far it is set back
 * from the panel's front, and the column's section — no photo of the stand
 * from the side.
 */
export type MonitorStand = {
  lowest: number;
  travel: number;
  depth: number;
  base: { width: number; thickness: number; corner: number; setBack: number };
  column: { width: number; depth: number };
};
export const MONITOR_STANDS: { readonly gui: MonitorStand } = {
  gui: {
    lowest: 0.4693 - 0.41,
    travel: 0.15,
    depth: 0.2332,
    base: { width: 0.25, thickness: 0.012, corner: 0.035, setBack: 0.012 },
    column: { width: 0.07, depth: 0.028 },
  },
};

/**
 * The Macintosh on the desk, left of the main monitor (2026-10-22, the
 * user; first planned on the right, then swapped with the video monitor):
 * the middle of its footprint, its turn in towards the chair, and its size —
 * the Macintosh 128K's, 9.6 × 13.6 × 10.9 in (W × H × D;
 * `reference/4/マッキントッシュ1〜3` are the machine). **仮**: the place and
 * the turn.
 */
export const MAC = { x: -0.55, z: -0.15, yaw: 0.25, width: 0.244, height: 0.345, depth: 0.276 } as const;

/** A point in the Macintosh's own frame (origin on the desk under its middle, +Z out of its screen), in the desk's frame. */
export function macToDesk(local: readonly [number, number, number]): [number, number, number] {
  const c = Math.cos(MAC.yaw);
  const s = Math.sin(MAC.yaw);
  return [MAC.x + local[0] * c + local[2] * s, DESK_TOP_Y + local[1], MAC.z - local[0] * s + local[2] * c];
}

/**
 * The Mac's case and front, in its own frame (`objects/Macintosh.tsx` draws
 * them; the screen's HTML panel, the pen pot on its top and the mouse's
 * cursor read them too). Measured in マッキントッシュ2.webp at 3.5 px to the
 * millimetre across the front: the screen's recess starts 19 mm under the
 * top and is 212 × 172 mm, the glass in it 196 × 152 mm. The picture is
 * 512 × 342 px at the 128K's 72 dpi (180.6 × 120.7 mm). The front plate
 * stops short of the desk: under it the case's base (`plinth`) is set back
 * — 45 mm tall, read off マッキントッシュ4.png and 6.png (the plate is
 * 635 px of the Mac's 730 there, 0.47 mm to the px); its top edge is rounded
 * over about 12 mm (the plate's top band in 4.png). **仮**: the front
 * plate's thickness, how far it stands proud of the case; how far the base
 * is set back; the recess's depth and how far its inner edge sits up; the
 * tube's bulge; the rails on the top.
 */
export const MAC_CASE = {
  plate: { thickness: 0.03, proud: 0.004, edge: 0.012, corner: 0.016 },
  plinth: { height: 0.045, setBack: 0.012 },
  /** The keyboard's jack on the base, right of middle (4.png, 6.png): its middle's x and height. */
  jack: { x: 0.075, y: 0.022 },
  recess: { width: 0.212, height: 0.172, corner: 0.016, top: 0.019, depth: 0.028, lift: 0.004 },
  glass: { width: 0.196, height: 0.152, corner: 0.012, bulge: 0.005 },
  picture: { width: 0.1806, height: 0.1207, px: { width: 512, height: 342 } },
  /** The two rails along the back of the top, their tops level with the front plate's. */
  rail: { width: 0.085, height: 0.012, front: 0.05 },
} as const;

/** The middle of the Mac's picture, in its own frame: centred in the glass, on its face. */
export function macPictureCentre(): [number, number, number] {
  const { recess } = MAC_CASE;
  return [0, MAC.height - recess.top - recess.height / 2 + recess.lift, MAC.depth / 2 - recess.depth + 0.0006];
}

/**
 * The pen pot (`DeskSet`), on the Mac's left rail (2026-10-22, the user: 「ペン立て
 * はマッキントッシュの上に」): its middle in the Mac's frame, standing on the
 * rail's top, and its radius.
 */
export const PEN_POT = {
  local: [-(MAC.width / 2 - MAC_CASE.plate.proud - MAC_CASE.rail.width / 2), MAC.height, -0.045] as [number, number, number],
  radius: 0.037,
} as const;

/** How far in front of the Mac's front its keyboard's case starts (**仮**: the cord's slack, as in マッキントッシュ3). */
const MAC_KEYBOARD_GAP = 0.025;

/** The Mac's keyboard (an M0110, `room/macKeyboard.ts`): straight in front of the Mac, turned as it is. */
export function macKeyboardPlace(): { x: number; z: number; yaw: number } {
  const [x, , z] = macToDesk([0, 0, MAC.depth / 2 + MAC_KEYBOARD_GAP + M0110.depth / 2]);
  return { x, z, yaw: MAC.yaw };
}

/**
 * The Mac's mouse, an M0100 (`room/macMouse.ts`): where it rests on the mat,
 * right of the Mac's keyboard and left of the HHKB (**仮**).
 */
export const MAC_MOUSE = { x: -0.235, z: 0.19, y: DESK_TOP_Y } as const;

/**
 * The upper monitor's arm (2026-10-22, the user: from the back of the desk's
 * right — where the Macintosh was first to go, the video monitor now leaning
 * in front of it — a reversed 「く」, ">" seen from the front, in angular
 * metal). Its joints, in the desk's frame: clamped to the desk's back edge, a
 * post up, the lower beam leaning out to the right to the elbow, the upper
 * beam back in over the main monitor to the wrist, and a short bracket to
 * the tilt head on the monitor's back plate (`head`, in the monitor's own
 * frame). **仮**: every joint's place — chosen for the shape, not measured.
 */
export const MONITOR_ARM = {
  /** The clamp's middle on the desk's top, its post's foot. */
  clamp: [0.66, 0, -PIECES.desk.depth / 2 + 0.035],
  postHeight: 0.14,
  /** How far the elbow stands out right of the post, and how high (desk frame). */
  elbow: { out: 0.24, y: 1.33, z: -0.345 },
  /** The wrist: this far right of the head and behind it. */
  wrist: { right: 0.13, back: 0.045 },
  /** The back plate screwed to the monitor's housing (VESA 100), in the monitor's own frame: its middle, size and thickness. */
  plate: { y: 0.01, z: -0.058, size: 0.12, thickness: 0.006 },
  /** The tilt head, in the monitor's own frame: behind the middle of its back plate. */
  head: [0, 0.01, -0.085],
} as const;

/** The arm's joints in the desk's frame, from the desk up to the monitor. */
export function armJoints(): Record<"clamp" | "shoulder" | "elbow" | "wrist" | "head", [number, number, number]> {
  const [cx, , cz] = MONITOR_ARM.clamp;
  const top = DESK_TOP_Y;
  const head = monitorToDesk("camera", MONITOR_ARM.head);
  return {
    clamp: [cx, top, cz],
    shoulder: [cx, top + MONITOR_ARM.postHeight, cz],
    elbow: [cx + MONITOR_ARM.elbow.out, MONITOR_ARM.elbow.y, MONITOR_ARM.elbow.z],
    wrist: [head[0] + MONITOR_ARM.wrist.right, head[1], head[2] - MONITOR_ARM.wrist.back],
    head,
  };
}

/**
 * The arm lamp, on the upper monitor's arm (2026-10-22, the user: 「アーム
 * ランプは上のモニターのアームスタンドに接続し、上のモニターの左側から出て
 * いる感じ」): a bar clamped to the arm's head runs left behind the monitor;
 * past its left edge the lamp's own two arms come out, the first up and out,
 * the second down and forward to the shade over the desk's left. The bulb is
 * the desk light. **仮**: every joint's place.
 */
export const DESK_LAMP = {
  /** How far behind the monitor's back the bar runs, and how far past its left edge it reaches. */
  bar: { back: 0.035, past: 0.03 },
  elbow: [-0.5, 1.64, -0.14] as [number, number, number],
  head: [-0.45, 1.4, -0.01] as [number, number, number],
  /** The bulb, this far under the head, in the shade's mouth. */
  drop: 0.08,
} as const;

/** The lamp's joints in the desk's frame: where its bar is clamped to the arm, where the bar ends and the lamp's arms begin, the elbow, the head and the bulb. */
export function lampJoints(): Record<"clamp" | "shoulder" | "elbow" | "head" | "bulb", [number, number, number]> {
  const head = armJoints().head;
  const upper = MONITORS.camera;
  const z = head[2] - DESK_LAMP.bar.back;
  const left = upper.x - upper.bezel.width / 2 - DESK_LAMP.bar.past;
  return {
    clamp: [head[0], head[1], z],
    shoulder: [left, head[1], z],
    elbow: DESK_LAMP.elbow,
    head: DESK_LAMP.head,
    bulb: [DESK_LAMP.head[0], DESK_LAMP.head[1] - DESK_LAMP.drop, DESK_LAMP.head[2]],
  };
}

/** The middle of a monitor's frame (where its stand or arm holds it), in its own frame: off the screen's middle by half the chin. */
export function monitorFrameMiddle(key: MonitorKey): [number, number, number] {
  return [0, -MONITORS[key].chin / 2, 0];
}

/** The corners of a monitor's frame in the desk's frame, however it is turned. */
export function monitorCorners(key: MonitorKey): [number, number, number][] {
  return frameCorners(MONITORS[key]).map((c) => monitorToDesk(key, c));
}

/** How far the lowest corner of a monitor's frame is above the desk's top. */
export function monitorBottomOverDesk(key: MonitorKey): number {
  return Math.min(...monitorCorners(key).map((c) => c[1])) - DESK_TOP_Y;
}

/** The lit glass in front of a monitor's frame: its centre's depth in the monitor's frame, and its thickness. */
export function monitorGlass(key: MonitorKey): { z: number; thickness: number } {
  return { z: MONITORS[key].bezel.depth / 2 + 0.002, thickness: 0.005 };
}

/**
 * The screen's surface, in the monitor's frame — where HTML is laid on it
 * (`room/screens.ts`): half a millimetre proud of the glass, so the cut-out
 * that shows the HTML through (`ScreenHole`) wins the depth test against the
 * glass behind it.
 */
export function monitorFaceZ(key: MonitorKey): number {
  const glass = monitorGlass(key);
  return glass.z + glass.thickness / 2 + 0.0005;
}

/** A monitor's screen surface in the desk's frame: its centre, and how far it is turned about +Y (radians). */
export function monitorFace(key: MonitorKey): { centre: [number, number, number]; yaw: number } {
  return { centre: monitorToDesk(key, [0, 0, monitorFaceZ(key)]), yaw: MONITORS[key].yaw };
}

export const SUBJECTS: Record<Stop, Subject> = {
  // The middle monitor's face. Framed on the one monitor, not the whole desk:
  // framing the desk shrank the 22px body text to about 6px. The marker
  // floats over the monitor above it (its top is at about 1.73 m).
  desk: { piece: "desk", local: monitorFace("gui").centre, frameWidth: 0.8, zoomEyeHeight: SEATED_EYE_HEIGHT, markerY: 1.95 },
  // The hologram stands on the same desk, to the PC's right.
  about: { piece: "desk", local: [0.95, 1.45, 0.05], frameWidth: 0.9, zoomEyeHeight: 1.45, markerY: 1.85 },
  products: { piece: "shelf", local: [0, 1.2, PIECES.shelf.depth / 2], frameWidth: 1.6, zoomEyeHeight: EYE_HEIGHT, markerY: 2.2 },
  skills: { piece: "bookcase", local: [0, 1.35, PIECES.bookcase.depth / 2], frameWidth: 1.3, zoomEyeHeight: EYE_HEIGHT, markerY: 2.65 },
  experience: { piece: "board", local: [0, 1.55, PIECES.board.depth / 2], frameWidth: 2.9, zoomEyeHeight: EYE_HEIGHT, markerY: 2.45 },
  contact: { piece: "comms", local: [0, 1.15, PIECES.comms.depth / 2], frameWidth: 1.1, zoomEyeHeight: EYE_HEIGHT, markerY: 1.75 },
};

export const STOP_KEYS = Object.keys(SUBJECTS) as Stop[];

/** The investigation board's frame: as wide as the board's footprint plus a 5 cm border each side, and this tall, round its subject's height. */
export const BOARD_FRAME = { width: PIECES.board.width + 0.1, height: 1.6 } as const;

/** A subject's focus point in world coordinates. */
export function subjectPoint(stop: Stop): [number, number, number] {
  const subject = SUBJECTS[stop];
  return pieceToWorld(PIECES[subject.piece], subject.local);
}

/**
 * Where a stop's marker floats: above its subject, pulled a little towards the
 * centre so the thing it marks (a shelf's top, the board's frame) does not cut
 * through the sprite — markers are depth-tested so that furniture in front can
 * hide them.
 */
export const MARKER_PULL = 0.15;

export function markerPoint(stop: Stop): [number, number, number] {
  const [x, , z] = subjectPoint(stop);
  const d = Math.hypot(x, z);
  const k = (d - MARKER_PULL) / d;
  return [x * k, SUBJECTS[stop].markerY, z * k];
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
  // Sitting down at the PC is a place, not a framing: the reader sits in the
  // chair, so the distance is the same on every screen — the one the
  // standard view's width frames the monitor at. A narrower phone sees the
  // screen fill more of its width from the same seat, rather than being sat
  // further back, behind the chair.
  const frameHfov = stop === "desk" ? STANDARD_HFOV : hfovDeg;
  const standOff = subject.frameWidth / 2 / ZOOM_FILL / Math.tan((frameHfov * DEG) / 2);
  const forward = Math.max(0, Math.min(face - ZOOM_MIN_CLEARANCE, face - standOff));
  const pitch =
    stop === "desk"
      ? seatedPitch(forward)
      : Math.atan2(y - subject.zoomEyeHeight, face - forward) / DEG;
  return { yaw: subjectYaw(stop), pitch, forward, eyeHeight: subject.zoomEyeHeight };
}

/**
 * The keyboard and the mouse on the desk, in its frame, and how high the
 * hands rest over them. **Provisional (仮)** placement: the keyboard stands
 * 8 cm out from the desk's middle, close enough under the screen that a
 * seated reader sees both their hands and the whole screen at once.
 * `KEYBOARD` is where it stands: the middle of its case, on the desk's top
 * (`y`). Its size is the HHKB's (`room/keyboard.ts`). `MOUSE` likewise:
 * where the mouse rests, the middle of its outline on the desk's top — it
 * slides from there (`MOUSE_TRAVEL`, `room/mouse.ts`), and the right hand
 * goes with it.
 */
export const KEYBOARD = { x: 0, z: 0.08, y: DESK_TOP_Y } as const;
export const MOUSE = { x: 0.36, z: 0.1, y: DESK_TOP_Y } as const;
/** The mug's coaster on the desk, right of the mouse (the mouse's travel keeps clear of it). */
export const MUG = { x: 0.55, z: 0.2, radius: 0.052 } as const;
/** The mat under the keyboard and the mouse: its middle and size. */
export const DESK_MAT = { x: 0.1, z: 0.09, width: 0.8, depth: 0.3 } as const;
export const HAND_Y = 0.82;
/**
 * Where the seated hands rest, in the desk's frame: the left on the near
 * half of the keyboard, the right on the back of the mouse. Nearer the
 * reader than the keys' middle, because the figure's arms (`room/self.ts`)
 * have a length now: the keyboard's middle is 66 cm in front of the seated
 * eye, past the reach of a 168 cm figure.
 */
export const DESK_HANDS: readonly [readonly [number, number, number], readonly [number, number, number]] = [
  [KEYBOARD.x - 0.1, HAND_Y, KEYBOARD.z + 0.06],
  [MOUSE.x, HAND_Y, MOUSE.z + 0.05],
];

/**
 * Where a seated reader looks: half-way between the top of the screen and
 * their hands on the keyboard (degrees, up positive) — so both are in the
 * frame. Looking at the screen's centre instead, the hands sat about 4°
 * below the bottom of a 16:9 frame, and the requirement is to see them.
 */
export function seatedPitch(forward: number): number {
  const desk = pieceCentreDistance(PIECES.desk);
  const top = MONITORS.gui.y + MONITORS.gui.screen.height / 2;
  const screenAway = desk - monitorFace("gui").centre[2] - forward;
  const handsAway = desk - Math.max(DESK_HANDS[0][2], DESK_HANDS[1][2]) - forward;
  const up = Math.atan2(top - SEATED_EYE_HEIGHT, screenAway);
  const down = Math.atan2(HAND_Y - SEATED_EYE_HEIGHT, handsAway);
  return (up + down) / 2 / DEG;
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

/**
 * The free view's two stages: standing at the centre and looking, or the
 * widened fisheye that takes in the room — the room's counterpart of the
 * planet's near/far altitudes. (A zoom into one stop is the third stage, and
 * is a focused section rather than a value of this.)
 */
export type ViewZoom = "standard" | "fisheye";

/**
 * The frame every phone number on the site is chosen against: 390×844.
 * Phones differ in shape only a little around it (0.46–0.5).
 */
export const HANDHELD_REFERENCE_ASPECT = 390 / 844;

/** The horizontal field of view, in degrees, that a vertical one comes to across a frame of `aspect`. */
function horizontalFromVertical(vfovDeg: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((vfovDeg * DEG) / 2) * aspect)) / DEG;
}

/**
 * **Provisional (仮) — waiting on the user.** The phone's standard stage, stated
 * vertically: 78° up and down a portrait frame, about 41° across it.
 *
 * A separate constant rather than `STANDARD_HFOV` re-tuned, because the
 * user's 67° is a width chosen on a landscape screen: kept as a width on a
 * 0.46-aspect phone it comes to about 110° vertically, and the ceiling took
 * the top third of the frame (step 2). Stated vertically because on a
 * portrait frame the height is the long side, the one that decides how much
 * ceiling and floor come in. Picked from shots at 70/78/86° (step 3 of
 * docs/room-migration.md), not from a reference photo — there is none for a
 * phone.
 */
export const HANDHELD_STANDARD_VFOV = 78;
export const HANDHELD_STANDARD_HFOV = horizontalFromVertical(HANDHELD_STANDARD_VFOV, HANDHELD_REFERENCE_ASPECT);

/**
 * **Provisional (仮) — waiting on the user.** The phone's fisheye, across:
 * 90°, which the stereographic lens stretches to about 168° up and down a
 * portrait frame.
 *
 * The desktop's 161° across a phone would reach some 245° vertically — past
 * straight up and straight down, the room folding over onto itself. The
 * fisheye is for taking in the room around the reader, which on a portrait
 * frame the height already does, so the width is held to what the standard
 * view's ~41° roughly doubles to.
 */
export const HANDHELD_FISHEYE_HFOV = 90;

/** The horizontal field of view a free-view stage is drawn at, on the frame `handheld` names. */
export function hfovForZoom(zoom: ViewZoom, handheld: boolean): number {
  if (handheld) return zoom === "standard" ? HANDHELD_STANDARD_HFOV : HANDHELD_FISHEYE_HFOV;
  return zoom === "standard" ? FREE_HFOV : FISHEYE_HFOV;
}

/** The horizontal field of view a zoom is drawn at: the reading perspective, not the free view's wider one. */
export function zoomHfov(handheld: boolean): number {
  return handheld ? HANDHELD_STANDARD_HFOV : STANDARD_HFOV;
}

/**
 * The lens a free-view stage is drawn through (`camera/fisheye.ts`): an
 * ordinary perspective for the standard view, stereographic for the fisheye.
 * A zoom is always a perspective — HTML placed in the room (the PC's screen,
 * the hologram) can only be drawn through one.
 */
export function lensForZoom(zoom: ViewZoom): number {
  return zoom === "standard" ? RECTILINEAR : STEREOGRAPHIC;
}

/**
 * How far behind the seated eye the chair's back stands: behind the leaning
 * body's back, which is behind its hips (`room/figure.ts`). The chair is
 * where the reader sits down at the PC, so it is placed from the seated
 * body rather than by eye.
 */
export const CHAIR_BACK_BEHIND_EYE = seatedHipsFromEye().back + PELVIS_BACK;
/** The top of the chair's back above the floor (see `RoomScene`'s chair). */
export const CHAIR_BACK_HEIGHT = 0.98;
/** The chair's seat: the top of its cushion — under the seated hips — and how far it sits in front of the back (towards the desk). */
export const CHAIR_SEAT_TOP = SEATED_EYE_HEIGHT - seatedHipsFromEye().down - HIP_OVER_SEAT;
export const CHAIR_SEAT_FORWARD = 0.25;
/** The cushion: its width, and its depth either side of `CHAIR_SEAT_FORWARD`. */
export const CHAIR_SEAT = { width: 0.5, depth: 0.48 } as const;

/**
 * Where the chair's back stands, as `z` in the desk's frame (+Z towards the
 * room's centre): `CHAIR_BACK_BEHIND_EYE` behind the seated eye.
 *
 * Placed by hand before (0.6 m out from the desk's middle), it stood 13 cm
 * *in front of* the seated eye — out of a desktop's frame, but filling the
 * bottom half of a phone's (step 4).
 */
export function chairBackZ(): number {
  return pieceCentreDistance(PIECES.desk) - (zoomView("desk").forward - CHAIR_BACK_BEHIND_EYE);
}

/** The wall's upright ribs: one every 22.5°, at the panels' seams. */
export const RIB_STEP = 22.5;
/** How far, in degrees, a rib keeps clear of the edge of the door or the porthole. */
export const RIB_CLEARANCE = 4;

/**
 * Where the wall's upright ribs stand — every `RIB_STEP` round the room,
 * except where one would run down through the door or across the porthole.
 * Behind the other furniture they are simply hidden.
 */
export function wallRibAngles(): number[] {
  return Array.from({ length: 360 / RIB_STEP }, (_, i) => i * RIB_STEP + RIB_STEP / 2).filter((angle) =>
    (["door", "porthole"] as const).every((key) => {
      const { from, to } = pieceSpan(PIECES[key]);
      return Math.abs(yawDelta((from + to) / 2, angle)) > (to - from) / 2 + RIB_CLEARANCE;
    })
  );
}

/**
 * The floor and the ceiling are square boards cut by the wall, not discs, and
 * split an odd number of times: **no vertex may sit straight under or over
 * the camera.** The fisheye's cube cameras look along the room's axes, and a
 * disc's centre vertex lies exactly on four of their camera planes (w = 0);
 * the floor's triangles then came out in front of the desk in the fisheye
 * (2026-10-01). The square's corners are outside the round wall, never seen,
 * and its UVs are the disc's own bounding square, so the floor texture lands
 * where it did.
 */
export const FLOOR_SEGMENTS = 9;

/** Where the floor's (and the ceiling's) grid lines run, along either axis, in metres from the centre. */
export function floorGridLines(): number[] {
  return Array.from({ length: FLOOR_SEGMENTS + 1 }, (_, k) => -ROOM_RADIUS + (k * 2 * ROOM_RADIUS) / FLOOR_SEGMENTS);
}
