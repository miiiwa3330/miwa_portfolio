/**
 * The Macintosh 128K's case in its own frame — origin on the desk under its
 * middle, +X to the right seen from the front, +Y up, +Z out of the screen.
 * `objects/Macintosh.tsx` draws it; the screen's panel (`screens.ts`), the
 * pen pot on its top, and the keyboard's and the mouse's cords read it.
 * Where it stands on the desk is `layout.ts`'s (`MAC`, `macToDesk`).
 *
 * **Its side is not a box but a trapezoid** (2026-10-23, the user, with
 * `reference/4/マッキントッシュ7〜12`): the front leans back, the top falls
 * towards the back, a chamfer takes the top's back corner, and the front
 * plate stops above the desk on a base set back under it. The outline is
 * measured in the dimensioned drawing マッキントッシュ12.png (its side view);
 * the side photo マッキントッシュ10.png agrees (its front edge leans 0.11 px
 * per px against its back edge's 0.02 — the drawing's 0.097 once the
 * photo's own tilt is taken out).
 */

/** A colour (sRGB hex) scaled channel by channel: a darker tone of the same plastic. */
export function macTone(hex: string, [r, g, b]: readonly [number, number, number]): string {
  const n = parseInt(hex.slice(1), 16);
  const scale = (v: number, k: number) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, "0");
  return `#${scale(n >> 16, r)}${scale((n >> 8) & 255, g)}${scale(n & 255, b)}`;
}

/** The Mac's, its keyboard's and its mouse's plastic: one colour for all three (see `MAC_COLOURS`). */
const PLASTIC = "#cebc96";

/**
 * The colours of the Mac, its keyboard (M0110) and its mouse (M0100), in
 * sRGB — **one plastic, yellowed with age, as in マッキントッシュ7.png**
 * (2026-10-23, the user: 「7.png の色にして。白すぎ、もう少し黄ばむべき」; the
 * first values, `#ccc3ac` from 4〜6.png, were too white). Medians of photo
 * 7's lit faces: the Mac's front `#c2b593`, the keyboard's case `#d9c296`,
 * the mouse's side `#cfbd99` — the plastic is their mean; the keys `#8b744e`,
 * the space bar `#d6c197`, the mouse's button `#8a724d`, the keyboard's
 * coiled cord `#6d5436` (two places on it: `#6b5334`, `#6e5537`; the mouse's
 * cord is too thin to read off the floor behind it). The darker tones
 * (recesses, grooves, seams, cords) are the plastic scaled by what each was
 * against the first plastic, so they keep their contrast; the seam by photo
 * 10's own (its seam `#8c6d3a` against the side beside it `#ddbd89`).
 */
export const MAC_COLOURS = {
  plastic: PLASTIC,
  cap: "#8b744e",
  space: "#d6c197",
  button: "#8a724d",
  coil: "#6d5436",
  /** The floppy slot's strip, the top's vent panels, the handle's shadowed parts. */
  shade: macTone(PLASTIC, [0.83, 0.82, 0.78]),
  /** The base's sunk mark. */
  sunk: macTone(PLASTIC, [0.9, 0.89, 0.87]),
  seam: macTone(PLASTIC, [0.63, 0.58, 0.42]),
  /** The keyboard's well round its keys, and the mouse's parting line. */
  well: macTone(PLASTIC, [0.7, 0.69, 0.65]),
  groove: macTone(PLASTIC, [0.61, 0.6, 0.57]),
  /** The mouse's sunk mark, its button's dark gap, and its cord. */
  mark: macTone(PLASTIC, [0.91, 0.9, 0.9]),
  gap: macTone(PLASTIC, [0.28, 0.28, 0.23]),
  cord: macTone(PLASTIC, [0.95, 0.95, 0.92]),
} as const;

/** The 128K's size, 9.6 × 13.6 × 10.9 in — the drawing's 24.4 × 34.5 × 27.7 cm. */
export const MAC_SIZE = { width: 0.244, height: 0.345, depth: 0.277 } as const;

const { width: W, height: H, depth: D } = MAC_SIZE;

/**
 * The drawing's side view (マッキントッシュ12.png, 800 × 360 px; front to the
 * right), at the centres of its lines. The lines are least-squares fits:
 * the front and the seam behind the front plate over rows 60–245 (at most
 * 0.43 px off), the top over columns 350–490, the chamfer over 327–340.
 * Its scale is its own extents: the back (x 324) to the front plate's foot
 * is the depth, the bottom (y 306.03) to the top's front corner the height —
 * 1.325 and 1.338 mm to the px, as the drawing's dimension arrows give
 * (325–533 and 47–306 px) to a pixel.
 */
export const MAC_DRAWING = {
  back: 324,
  bottom: 306.03,
  /** x = slope·y + at. */
  frontLine: { slope: 0.09666, at: 506.98 },
  seamLine: { slope: 0.09685, at: 494.92 },
  /** y = slope·x + at. */
  topLine: { slope: -0.076264, at: 87.1904 },
  chamferLine: { slope: -1.74945, at: 661.799 },
  /** The front plate's underside, the base's front under it, and the seam turning back under the case and down to the desk. */
  plateFoot: 270,
  plinthFront: 508.5,
  seamFoot: 254.1,
  seamBack: 493.5,
  /**
   * The radius of the seam's turn down to the desk, and of the base's front
   * into the plate's underside (4 px, rows 255–261 and 271–276). Where the
   * seam turns back under the case (3 px) it is drawn sharp: the case's side
   * of that corner rounds outward and the plate makes up the rest, so a
   * rounded case would leave a nick between the two.
   */
  seamDown: 4,
} as const;

const DR = MAC_DRAWING;
const frontX = (y: number) => DR.frontLine.slope * y + DR.frontLine.at;
const seamX = (y: number) => DR.seamLine.slope * y + DR.seamLine.at;
/** Where a line x = s·y + a meets the top. */
const onTop = (line: { slope: number; at: number }) => {
  const y = (DR.topLine.slope * line.at + DR.topLine.at) / (1 - DR.topLine.slope * line.slope);
  return { x: line.slope * y + line.at, y };
};
const DRAWING_FRONT = frontX(DR.plateFoot);
const DRAWING_TOP = onTop(DR.frontLine).y;
const PER_PX = { z: D / (DRAWING_FRONT - DR.back), y: H / (DR.bottom - DRAWING_TOP) };

/** A point of the drawing's side view, in the Mac's frame: [z, y]. */
export function fromDrawing(x: number, y: number): [number, number] {
  return [-D / 2 + (x - DR.back) * PER_PX.z, (DR.bottom - y) * PER_PX.y];
}

const topBack = (() => {
  const x = (DR.topLine.at - DR.chamferLine.at) / (DR.chamferLine.slope - DR.topLine.slope);
  return fromDrawing(x, DR.topLine.slope * x + DR.topLine.at);
})();
const topSeam = (() => {
  const p = onTop(DR.seamLine);
  return fromDrawing(p.x, p.y);
})();
const lean = Math.atan((DR.frontLine.slope * PER_PX.z) / PER_PX.y);
const midY = (DRAWING_TOP + DR.plateFoot) / 2;

/**
 * The side outline's points and sizes, in metres in the Mac's frame
 * ([z, y] for points): all from `MAC_DRAWING`.
 */
export const MAC_PROFILE = {
  /** How far the front leans back from upright (5.5°). */
  lean,
  /** The top's rise towards the front (4.4°): its back corner and where it meets the seam. */
  topBack,
  topSeam,
  /** The top of the back, where the chamfer starts. */
  chamferFoot: fromDrawing(DR.back, DR.chamferLine.slope * DR.back + DR.chamferLine.at)[1],
  /** The front plate: its top front corner, its foot's front corner, and its thickness square to its face (15.9 mm). */
  faceTop: fromDrawing(frontX(DRAWING_TOP), DRAWING_TOP),
  faceFoot: fromDrawing(DRAWING_FRONT, DR.plateFoot),
  thickness: (frontX(midY) - seamX(midY)) * PER_PX.z * Math.cos(lean),
  /** The base under the plate (part of the front's moulding): its front, set back 32.6 mm under the plate, and the seam behind it. */
  plinthFront: fromDrawing(DR.plinthFront, 0)[0],
  seamBack: fromDrawing(DR.seamBack, 0)[0],
  seamFoot: fromDrawing(0, DR.seamFoot)[1],
  /** Where the seam (the plate's back) is at a height. */
  seamAt: (y: number) => fromDrawing(seamX(DR.bottom - y / PER_PX.y), 0)[0],
  seamDown: DR.seamDown * PER_PX.z,
} as const;

/** How high the top is at a depth (it falls 4.4° towards the back). */
export function macTopAt(z: number): number {
  const [z0, y0] = MAC_PROFILE.topBack;
  const [z1, y1] = MAC_PROFILE.topSeam;
  return y0 + ((z - z0) * (y1 - y0)) / (z1 - z0);
}

/** The top's slope, as an angle (rising towards the front). */
export const MAC_TOP_SLOPE = Math.atan2(MAC_PROFILE.topSeam[1] - MAC_PROFILE.topBack[1], MAC_PROFILE.topSeam[0] - MAC_PROFILE.topBack[0]);

/**
 * A point on or off the front's face, in the Mac's frame: `across` it,
 * `down` it from its top edge (along the leaning face), `out` of it. The
 * face's own frame — what a three.js group at `faceTop` turned `−lean`
 * about X gives — has its top edge at y = 0, so a point `down` it is at
 * y = −down there.
 */
export function macFace(across: number, down: number, out: number): [number, number, number] {
  const [z0, y0] = MAC_PROFILE.faceTop;
  const c = Math.cos(lean);
  const s = Math.sin(lean);
  return [across, y0 - down * c + out * s, z0 + down * s + out * c];
}

/** The front plate's length down its face, top to foot. */
export const MAC_FACE_LENGTH = (MAC_PROFILE.faceTop[1] - MAC_PROFILE.faceFoot[1]) / Math.cos(lean);

/**
 * The front plate's parts, on its face (`down` from its top edge, `out` of
 * it). Measured in マッキントッシュ2.webp at 3.5 px to the millimetre across
 * the front: the screen's recess starts 19 mm under the top and is
 * 212 × 172 mm, the glass in it 196 × 152 mm. The picture is 512 × 342 px
 * at the 128K's 72 dpi (180.6 × 120.7 mm). The plate's corners, seen from
 * the front, are rounded 6 mm (5–6.6 mm in マッキントッシュ2's top right,
 * where 16 mm was the first value) — the case's edges' round, so the plate
 * and the case behind it meet flush; its face's edge is rounded over about
 * 12 mm (4.png's top band). **仮**: the recess's depth and how far its inner
 * edge sits up, the tube's bulge.
 */
export const MAC_CASE = {
  plate: { edge: 0.012, corner: 0.006 },
  /** The case's edges, along its sides (5–6.6 mm, as the plate's corners). */
  edge: 0.006,
  /** The keyboard's jack on the base, right of middle (4.png, 6.png): its middle's x and height. */
  jack: { x: 0.075, y: 0.022 },
  recess: { width: 0.212, height: 0.172, corner: 0.016, top: 0.019, depth: 0.028, lift: 0.004 },
  glass: { width: 0.196, height: 0.152, corner: 0.012, bulge: 0.005 },
  picture: { width: 0.1806, height: 0.1207, px: { width: 512, height: 342 } },
} as const;

/** The middle of the Mac's picture, in its own frame: centred in the glass, on its face. */
export function macPictureCentre(): [number, number, number] {
  const { recess } = MAC_CASE;
  return macFace(0, recess.top + recess.height / 2 - recess.lift, -recess.depth + 0.0006);
}

/**
 * The top, from the drawing's plan (マッキントッシュ12.png's "Plan": the case
 * 578–762 × 74–283.5 px, 1.326 and 1.322 mm to the px), photo 11 (the back
 * from above) and photo 8. Lengths along the top are from the back,
 * level (as the plan shows them).
 *
 * - **The handle's notch**: the middle of the top's back is cut away,
 *   83.5 mm wide (638.5–701.5 px) and 126.3 mm in from the back, open to
 *   the back through the chamfer; the handle is a bar across its front,
 *   95.8–126.3 mm from the back. **仮** (photo 11 only, at an angle): the
 *   notch's floor 300 mm up (about 20 mm over the chamfer's foot), the bar's
 *   top 2 mm under the top and 6 mm thick.
 * - **The vents**: on each side of the notch a rounded panel, 13.9–66.3 mm
 *   in from the side and 45.6–195.7 mm from the back (corners 8 mm), of 23
 *   slots 42.4 mm long at 6.13 mm (rows 114–216 px); and on the chamfer's
 *   two halves 7 slots each (photo 11, counted down two columns of each). **仮**:
 *   the chamfer's slots' length and spacing, taken as the top's.
 */
export const MAC_TOP = {
  notch: { width: 0.0835, depth: 0.1263, floor: 0.3 },
  handle: { from: 0.0958, to: 0.1263, drop: 0.002, thickness: 0.006 },
  grille: { inset: 0.0139, width: 0.0524, from: 0.0456, to: 0.1957, corner: 0.008 },
  slots: { count: 23, length: 0.0424, pitch: 0.00613, width: 0.0016 },
  chamferSlots: 7,
} as const;

/**
 * The vents low on the sides (rows from the drawing, 282.5–297.5 px: 11.4
 * to 31.5 mm up; the left photo 10 agrees to 2 mm). The two sides differ:
 * seen from the front, the **left** has long slots in three runs with ribs
 * between them (photo 10: 11.5–71.1, 80.6–139.6, 149.1–208.9 mm from the
 * back) and the programmer's switch clipped over them at the back (photo
 * 4); the **right** has seven runs of short slots (the drawing: 334–482 px,
 * 23.2 mm long at 28.9 mm; photo 6). Photos 4 and 6 show the front too, so
 * they settle which side is which; photo 10 and the drawing's side view are
 * the other way round, and lend only the shape and the spacing.
 */
export const MAC_SIDE_VENTS = {
  rows: [282.5, 286, 289.5, 293.5, 297.5].map((y) => fromDrawing(0, y)[1]),
  slot: 0.0018,
  left: [
    [0.0115, 0.0711],
    [0.0806, 0.1396],
    [0.1491, 0.2089],
  ],
  right: [334, 356, 378, 400, 422, 443, 465].map((x) => [(x - DR.back) * PER_PX.z, (x + 17.5 - DR.back) * PER_PX.z]),
  /** The programmer's switch over the left's slots, at the back (photo 4): its middle from the back and up, its length and height, how far it stands out. **仮** */
  switch: { z: 0.029, y: 0.024, length: 0.03, height: 0.024, out: 0.005 },
} as const;

/**
 * The back's parts (photo 11, the back from behind on the left and above):
 * measured by mapping the photo's back onto the case along its top edge —
 * the case's sides and the notch's walls (±41.75 mm) as four marks on it —
 * and down from it. **All 仮**: the photo is at a steep angle and blurred,
 * and the drawing has no back view. x is the Mac's own (+X right seen from
 * the front): seen from behind, the photo's left is +X. The power switch
 * comes out on the left seen from the front, the ports on the right.
 */
export const MAC_BACK = {
  /** The maker's badge (a rainbow apple and "Macintosh"; here a rainbow "M" and "Miiiwa"). */
  badge: { x: 0.0885, y: 0.2475, size: 0.016 },
  nameplate: { x: 0.0555, y: 0.2475, width: 0.047, height: 0.015 },
  label: { x: -0.0055, y: 0.1375, width: 0.061, height: 0.125 },
  socket: { x: -0.051, y: 0.113, width: 0.022, height: 0.03 },
  switch: { x: -0.0635, y: 0.158, width: 0.015, height: 0.032 },
  /** The ports in a row low down (x of each, its width; all 10 mm tall at 49 mm up). The first is the mouse's. */
  ports: { y: 0.049, height: 0.01, at: [0.094, 0.061, 0.028, -0.002], widths: [0.021, 0.029, 0.021, 0.021] },
  slot: { x: 0.11, y: 0.0965, width: 0.004, height: 0.027 },
  strip: { x: -0.1, y: 0.2305, width: 0.024, height: 0.097 },
} as const;

export type ProfileCorner = {
  z: number;
  y: number;
  /** The corner's round in the outline (0: sharp). */
  radius: number;
  /** How round the case's edges are along the side from here to the next corner. */
  edge: number;
  /** …and at the next corner, if it changes along the way (`edge` to this). */
  edgeEnd?: number;
  /** No wall from here to the next corner (hidden behind something else). */
  open?: boolean;
};

export type ProfilePoint = {
  z: number;
  y: number;
  /** The outward normal, in the outline's plane. */
  nz: number;
  ny: number;
  edge: number;
  /** Whether the wall from this point to the next is left out. */
  open: boolean;
  /** Whether the point is on a segment marked open (for the seam's line). */
  seam: boolean;
};

/**
 * A side outline going round counter-clockwise (z to the right, y up), its
 * corners rounded to their radii in `arcSteps` steps, as points with their
 * outward normals. A sharp corner gives two points in the same place, one
 * with each side's normal, so the walls either side of it stay flat.
 */
export function profileRing(corners: readonly ProfileCorner[], arcSteps = 4): ProfilePoint[] {
  const n = corners.length;
  const points: ProfilePoint[] = [];
  for (let i = 0; i < n; i++) {
    const prev = corners[(i + n - 1) % n];
    const c = corners[i];
    const next = corners[(i + 1) % n];
    const la = Math.hypot(c.z - prev.z, c.y - prev.y);
    const lb = Math.hypot(next.z - c.z, next.y - c.y);
    const a = { z: (c.z - prev.z) / la, y: (c.y - prev.y) / la };
    const b = { z: (next.z - c.z) / lb, y: (next.y - c.y) / lb };
    // Counter-clockwise, the outside is to the right of the way round.
    const na = { z: a.y, y: -a.z };
    const nb = { z: b.y, y: -b.z };
    const turn = a.z * b.y - a.y * b.z;
    const bothOpen = !!prev.open && !!c.open;
    const arriving = prev.edgeEnd ?? prev.edge;
    if (c.radius === 0 || Math.abs(turn) < 1e-9) {
      points.push({ z: c.z, y: c.y, nz: na.z, ny: na.y, edge: arriving, open: bothOpen, seam: !!prev.open });
      points.push({ z: c.z, y: c.y, nz: nb.z, ny: nb.y, edge: c.edge, open: !!c.open, seam: !!c.open });
      continue;
    }
    const s = Math.sign(turn);
    const phi = Math.acos(Math.max(-1, Math.min(1, a.z * b.z + a.y * b.y)));
    const t = c.radius * Math.tan(phi / 2);
    const start = { z: c.z - a.z * t, y: c.y - a.y * t };
    // The centre is inside a convex corner (left of the way round), outside a concave one.
    const centre = { z: start.z - s * a.y * c.radius, y: start.y + s * a.z * c.radius };
    const from = Math.atan2(start.y - centre.y, start.z - centre.z);
    for (let k = 0; k <= arcSteps; k++) {
      const angle = from + (s * phi * k) / arcSteps;
      const pz = centre.z + c.radius * Math.cos(angle);
      const py = centre.y + c.radius * Math.sin(angle);
      points.push({
        z: pz,
        y: py,
        nz: (s * (pz - centre.z)) / c.radius,
        ny: (s * (py - centre.y)) / c.radius,
        edge: arriving + ((c.edge - arriving) * k) / arcSteps,
        open: k === arcSteps ? !!c.open : bothOpen,
        seam: bothOpen || (k === 0 && !!prev.open) || (k === arcSteps && !!c.open),
      });
    }
  }
  return points;
}

const P = MAC_PROFILE;
const { edge: E } = MAC_CASE;
const back = -D / 2;
const notchFront = back + MAC_TOP.notch.depth;
/** Where the notch's floor meets the chamfer. */
const floorBack = back + ((MAC_TOP.notch.floor - P.chamferFoot) * (P.topBack[0] - back)) / (P.topBack[1] - P.chamferFoot);

/**
 * The case behind the front plate, seen from the side: along the bottom,
 * up the seam under it, forward under the plate, up the plate's back (open:
 * the plate covers it), back along the top, down the chamfer and the back.
 * With `notched`, the middle part's outline: the top stops at the handle's
 * notch, which goes down to its floor and back out through the chamfer.
 *
 * Its edges along the sides are square at the seam (flush with the plate's
 * sides) and round elsewhere; over the seam's last `edge` under the top they
 * grow to the full round, so the case's top corners there come in as the
 * plate's rounded corners do.
 */
export function macBodyOutline(notched: boolean): ProfileCorner[] {
  const top: ProfileCorner[] = notched
    ? [
        { z: notchFront, y: macTopAt(notchFront), radius: 0, edge: E },
        { z: notchFront, y: MAC_TOP.notch.floor, radius: 0, edge: E },
        { z: floorBack, y: MAC_TOP.notch.floor, radius: 0, edge: E },
      ]
    : [{ z: P.topBack[0], y: P.topBack[1], radius: 0, edge: E }];
  return [
    { z: back, y: 0, radius: 0, edge: 0 },
    { z: P.seamBack, y: 0, radius: 0, edge: 0, open: true },
    { z: P.seamBack, y: P.seamFoot, radius: P.seamDown, edge: 0, open: true },
    { z: P.seamAt(P.seamFoot), y: P.seamFoot, radius: 0, edge: 0, open: true },
    { z: P.seamAt(P.topSeam[1] - E), y: P.topSeam[1] - E, radius: 0, edge: 0, edgeEnd: E, open: true },
    { z: P.topSeam[0], y: P.topSeam[1], radius: 0, edge: E },
    ...top,
    { z: back, y: P.chamferFoot, radius: 0, edge: E },
  ];
}

/**
 * The base under the front plate, seen from the side (the front's moulding
 * comes down behind the plate into it): along the bottom, up its front,
 * forward under the plate to the plate's back, up that to the seam's turn,
 * back under the case and down. Its front edges are rounded as the case's.
 */
export function macPlinthOutline(): ProfileCorner[] {
  const plateFoot = P.faceFoot[1];
  return [
    { z: P.seamBack, y: 0, radius: 0, edge: 0 },
    { z: P.plinthFront, y: 0, radius: 0, edge: E },
    { z: P.plinthFront, y: plateFoot, radius: P.seamDown, edge: E },
    { z: P.seamAt(plateFoot), y: plateFoot, radius: 0, edge: 0 },
    { z: P.seamAt(P.seamFoot), y: P.seamFoot, radius: 0, edge: 0 },
    { z: P.seamBack, y: P.seamFoot, radius: P.seamDown, edge: 0 },
  ];
}

/**
 * The handle's notch's walls, seen from the side: the part of each half of
 * the case behind the notch's front and over its floor.
 */
export function macNotchWall(): [number, number][] {
  return [
    [notchFront, MAC_TOP.notch.floor],
    [notchFront, macTopAt(notchFront)],
    [P.topBack[0], P.topBack[1]],
    [floorBack, MAC_TOP.notch.floor],
  ];
}

/** The handle's notch's half width: the two halves of the top are outside it. */
export const MAC_NOTCH_HALF = MAC_TOP.notch.width / 2;

/** The case's half width. */
export const MAC_HALF_WIDTH = W / 2;
