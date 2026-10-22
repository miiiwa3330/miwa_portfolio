import {
  KEYBOARD,
  MOUSE,
  MUG,
  MONITORS,
  MAC,
  PEN_POT,
  macToDesk,
  PIECES,
  SUBJECTS,
  pieceToWorld,
  type PieceKey,
} from "@/scene/room/layout";
import { viewFrom, type OrbitView, type Vec3 } from "./orbit";

/**
 * What the lab can show. A part is one room piece (`Piece` in `RoomScene`,
 * drawn where it stands in the room, so the room's lights fall on it as they
 * do for the reader) and a place to look at it from: a few parts are the same
 * piece seen from different spots — the desk is one piece with a monitor, a
 * keyboard, a lamp on it.
 *
 * Places are written in the piece's own frame (+Z towards the room's centre,
 * `pieceToWorld`) and turned into world points here, so a part cannot drift
 * from where its piece stands. Adding a part is one line in `PARTS`. The
 * small things on the desk (mug, pens, drawers) are looked at by eye-balled
 * points: a miss only aims the camera a little off, nothing else reads them.
 */

/** Which of the room's drawing functions a part is. `shell` is the walls, floor and ceiling. */
export type LabPiece = PieceKey | "shell";

export type LabPart = {
  id: string;
  label: string;
  group: string;
  piece: LabPiece;
  /** World points: what the camera looks at, and where it first stands. */
  target: Vec3;
  eye: Vec3;
};

/** A part seen from the front: `look` is the point in the piece's frame, `from` where the eye is, in the same frame. */
function onPiece(id: string, label: string, group: string, piece: PieceKey, look: Vec3, from: Vec3): LabPart {
  return { id, label, group, piece, target: pieceToWorld(PIECES[piece], look), eye: pieceToWorld(PIECES[piece], from) };
}

/** A piece's own subject (what the room's camera frames), from a distance that fits its width. */
function subjectOf(id: string, label: string, group: string, stop: keyof typeof SUBJECTS): LabPart {
  const { piece, local, frameWidth } = SUBJECTS[stop];
  return onPiece(id, label, group, piece, local, [local[0], local[1] + 0.1, local[2] + frameWidth * 1.4]);
}

const DESK = "机と PC";
const FURNITURE = "家具";
const ROOM = "部屋";
const GUI = MONITORS.gui;
/** The hologram's middle, as the room's camera frames it (`SUBJECTS`). */
const HOLO_X = SUBJECTS.about.local[0];

export const PARTS: readonly LabPart[] = [
  onPiece("desk", "机の全体", DESK, "desk", [0, 0.95, 0], [0, 1.25, 2.6]),
  onPiece("desk-monitor", "モニター（中央、U3223QE）", DESK, "desk", [GUI.x, GUI.y, GUI.z], [GUI.x + 0.15, GUI.y + 0.1, 1.1]),
  onPiece("desk-video", "モニター（右、縦置き P2422H）", DESK, "desk", [MONITORS.video.x, MONITORS.video.y, MONITORS.video.z], [MONITORS.video.x - 0.25, MONITORS.video.y + 0.05, 0.9]),
  onPiece("desk-arm", "モニター（上）とアーム", DESK, "desk", [0.35, 1.3, -0.25], [0.45, 1.45, 1.6]),
  onPiece("desk-mac", "Macintosh", DESK, "desk", [MAC.x, 0.95, MAC.z], [MAC.x + 0.25, 1.1, 0.55]),
  onPiece("desk-mac-keyboard", "Mac のキーボード（M0110）", DESK, "desk", [MAC.x + 0.06, 0.8, 0.07], [MAC.x + 0.12, 1.02, 0.42]),
  onPiece("desk-keyboard", "キーボード（HHKB）", DESK, "desk", [KEYBOARD.x, KEYBOARD.y + 0.02, KEYBOARD.z], [KEYBOARD.x, KEYBOARD.y + 0.3, KEYBOARD.z + 0.32]),
  onPiece("desk-mouse", "マウス（EX-G）", DESK, "desk", [MOUSE.x, MOUSE.y + 0.025, MOUSE.z], [MOUSE.x - 0.12, MOUSE.y + 0.16, MOUSE.z + 0.2]),
  onPiece("desk-lamp", "アームランプ", DESK, "desk", [-0.4, 1.45, -0.15], [0.1, 1.6, 0.9]),
  onPiece("desk-mug", "マグ", DESK, "desk", [MUG.x, 0.83, MUG.z], [MUG.x, 1.0, MUG.z + 0.5]),
  onPiece("desk-pens", "ペン立て（Mac の上）", DESK, "desk", macToDesk([PEN_POT.local[0], PEN_POT.local[1] + 0.06, PEN_POT.local[2]]), [-0.5, 1.4, 0.5]),
  onPiece("desk-drawers", "引き出し", DESK, "desk", [0.8, 0.4, 0.375], [0.8, 0.55, 1.2]),
  onPiece("desk-under", "机の下（箱とケース）", DESK, "desk", [0.41, 0.2, -0.15], [0.41, 0.45, 1.1]),
  onPiece("hologram", "ホログラムの装置", DESK, "desk", [HOLO_X, 0.9, 0.0], [HOLO_X, 1.15, 0.9]),
  subjectOf("shelf", "展示棚", FURNITURE, "products"),
  subjectOf("bookcase", "本棚", FURNITURE, "skills"),
  subjectOf("board", "調査ボード", FURNITURE, "experience"),
  subjectOf("comms", "通信端末", FURNITURE, "contact"),
  onPiece("porthole", "丸窓とハンモック", FURNITURE, "porthole", [0, 1.3, 0], [0, 1.4, 3.2]),
  onPiece("door", "扉", FURNITURE, "door", [0, 1.05, 0], [0, 1.2, 2.6]),
  onPiece("workbench", "作業台", FURNITURE, "workbench", [0, 0.9, 0], [0, 1.2, 2.3]),
  { id: "shell", label: "壁・床・天井", group: ROOM, piece: "shell", target: [0, 1.5, 0], eye: [0, 1.9, 2.5] },
];

const byId = new Map(PARTS.map((part) => [part.id, part]));

/** The part for an id from the URL, or the first part for a missing or unknown one. */
export function partFor(id: string | null): LabPart {
  return (id !== null ? byId.get(id) : undefined) ?? PARTS[0];
}

/** How a part is first looked at. */
export function defaultView(part: LabPart): OrbitView {
  return viewFrom(part.target, part.eye);
}

/** The parts by group, in the order the groups first appear. */
export function partGroups(): { group: string; parts: LabPart[] }[] {
  const groups: { group: string; parts: LabPart[] }[] = [];
  for (const part of PARTS) {
    const found = groups.find((g) => g.group === part.group);
    if (found) found.parts.push(part);
    else groups.push({ group: part.group, parts: [part] });
  }
  return groups;
}
