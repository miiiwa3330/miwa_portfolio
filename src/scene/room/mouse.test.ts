import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUTTON,
  EXG,
  LIP,
  MARKS,
  MOUSE_CLICKS,
  MOUSE_TRAVEL,
  PIECES,
  ROUND,
  SEAM,
  SIDE_BUTTONS,
  SLOT_LEAN,
  TONGUE,
  WING,
  basePoint,
  buttonAt,
  buttonShare,
  buttonsHeld,
  clampCursor,
  clampTravel,
  cursorFromMouse,
  fAt,
  leftEdgeAt,
  lipRound,
  mouseFromCursor,
  mouseParts,
  mouseSample,
  mouseSampleUrl,
  outlineAt,
  polylineAt,
  profileAt,
  ridgeAt,
  sampleTable,
  shellNormal,
  shellPoint,
  shoulderAt,
  sideButtonSpan,
  skirtPoint,
  splitGap,
  splitU,
  tailU,
  tongueEdges,
  tuckAt,
  uAt,
  wheelCentre,
  xAt,
  xOfFrac,
  zAt,
  type MouseButton,
  type Surface,
  type Walls,
} from "./mouse";
import { DESK_MAT, DESK_HANDS, HAND_Y, KEYBOARD, MOUSE, MUG } from "./layout";
import { HHKB } from "./keyboard";
import { DESK_SCREEN, DESK_SCREEN_PX, panelPoint, type Vec3 } from "./screens";

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

type Tri = { centre: V; normal: V; area: number; corners: number[] };
function triangles(positions: readonly number[], indices: readonly number[]): Tri[] {
  const at = (i: number): V => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
  const out: Tri[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const corners = [indices[t], indices[t + 1], indices[t + 2]];
    const [a, b, c] = corners.map(at);
    const n = cross(sub(b, a), sub(c, a));
    out.push({ centre: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3], normal: n, area: Math.hypot(...n) / 2, corners });
  }
  return out;
}

/**
 * The tips, where pieces taper to nothing — the body beside the top shell at
 * the front (which faces the monitor), the body by the tail's seam where it
 * leaves through the wall — and a rounded edge folds over on a face or two
 * of a square millimetre or less, a third of a pixel from the chair.
 */
const atTip = (t: Tri) => {
  const f = fAt(t.centre[2]);
  return f < 0.03 || f > 0.98;
};

/** The cosine under which a face counts as turned in: one seen edge-on (the step where the body is cut away round the side buttons, a sliver across one row) is neither in nor out. */
const EDGE_ON = -0.05;
const cosine = (a: V, b: V) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b) || 1);

/** Faces of a surface that turn against their own corners' normals. Slivers of a few hundredths of a square millimetre have no direction to speak of. */
function inwardFaces(s: Surface): number {
  return triangles(s.positions, s.indices).filter((t) => {
    if (t.area < 5e-8 || atTip(t)) return false;
    const n: V = [0, 0, 0];
    for (const c of t.corners) for (let k = 0; k < 3; k++) n[k] += s.normals[c * 3 + k];
    return cosine(t.normal, n) <= EDGE_ON;
  }).length;
}

/** Walls that face back into their own piece. */
function inwardWalls(w: Walls): number {
  return triangles(w.positions, w.indices).filter((t, i) => t.area > 1e-12 && !atTip(t) && cosine(t.normal, sub(t.centre, w.inside[Math.floor(i / 2)] as V)) <= EDGE_ON).length;
}

const parts = mouseParts();
/** Metres between two places across at `f`, seen from above (the slot is drawn there). */
const apart = (f: number, a: number, b: number) => xAt(f, b) - xAt(f, a);
/** Metres between two places across at `f`, along the shell (a cut is that wide on the surface, flank or top). */
const along = (f: number, a: number, b: number) => Math.hypot(...sub(shellPoint(f, b) as V, shellPoint(f, a) as V)) * Math.sign(b - a);

describe("the EX-G's shape", () => {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let i = 0; i < parts.shell.positions.length; i += 3) {
    xs.push(parts.shell.positions[i]);
    ys.push(parts.shell.positions[i + 1]);
    zs.push(parts.shell.positions[i + 2]);
  }

  it("is the maker's S size: 71 × 108 × 52 mm", () => {
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(EXG.width, 3);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(EXG.length, 4);
    expect(Math.max(...ys)).toBeCloseTo(EXG.height, 3);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });

  it("reads its tables through their samples exactly", () => {
    const table = [0.2, 0.5, 0.9, 0.4, 0.1];
    table.forEach((v, i) => expect(sampleTable(table, i / 4)).toBeCloseTo(v, 12));
  });

  it("has the photo's outline from above: the wing's edge on the left, the wall on the right", () => {
    for (let f = 0.02; f < 1; f += 0.07) {
      const { left, right } = outlineAt(f);
      expect(shellPoint(f, -1)[0]).toBeCloseTo(left, 9);
      // The right wall's outermost point, above its foot's round.
      expect(Math.abs(Math.max(...[0.99, 0.995, 0.999].map((u) => shellPoint(f, u)[0])) - right)).toBeLessThan(1e-4);
      expect(shellPoint(f, 1)[0]).toBeLessThanOrEqual(right);
      for (let u = -0.95; u < 1; u += 0.1) {
        const x = shellPoint(f, u)[0];
        expect(x).toBeGreaterThanOrEqual(left - 1e-9);
        expect(x).toBeLessThanOrEqual(right + 1e-9);
      }
    }
  });

  it("is widest a third of the way from the tail and narrow at the buttons, as 2.png", () => {
    const width = (f: number) => outlineAt(f).right - outlineAt(f).left;
    expect(width(0.62)).toBeCloseTo(EXG.width, 3);
    expect(width(0.1)).toBeLessThan(0.75 * EXG.width);
    expect(width(0.95)).toBeLessThan(0.6 * EXG.width);
  });

  it("has the photo's silhouette from the side, within a millimetre (3.png)", () => {
    for (let f = 0.05; f <= 0.95; f += 0.05) {
      let top = 0;
      for (let u = -1; u <= 1; u += 0.01) top = Math.max(top, shellPoint(f, u)[1]);
      expect(Math.abs(top - profileAt(f).top), `f=${f.toFixed(2)}`).toBeLessThan(0.001);
    }
  });

  it("is highest left of the middle and falls away to the right — a right-handed mouse", () => {
    const f = 0.45;
    expect(shellPoint(f, -0.25)[1]).toBeGreaterThan(shellPoint(f, 0.5)[1]);
    expect(shellPoint(f, -0.6)[1]).toBeGreaterThan(shellPoint(f, 0.6)[1]);
  });

  it("meets the desk with an upright wall on the right, and lifts off it at the tips", () => {
    const f = 0.5;
    expect(shellPoint(f, 1)[1]).toBeCloseTo(profileAt(f).bottom, 9);
    expect(shellNormal(f, 0.999)[1]).toBeLessThan(0.2);
    expect(profileAt(0).bottom).toBeGreaterThan(0.01);
  });

  it("is smooth: no jump in the top's curvature along it or across it (the user saw ripples and a thin stripe the length of the mouse)", () => {
    // The largest change of the second difference between neighbouring steps.
    const jump = (h: (t: number) => number, lo: number, hi: number, d: number) => {
      const v: number[] = [];
      for (let t = lo; t <= hi + 1e-9; t += d) v.push(h(t));
      let worst = 0;
      for (let i = 1; i < v.length - 2; i++) worst = Math.max(worst, Math.abs(v[i + 2] - 3 * v[i + 1] + 3 * v[i] - v[i - 1]));
      return worst;
    };
    // Two parabolas meeting at the ridge, a straight-moving ridge and a curve
    // through the raw table samples gave 1.8–2.6e-5 along and 1.3–4.4e-7 across.
    for (const u of [-0.2, 0.3]) expect(jump((f) => shellPoint(f, u)[1], 0.1, 0.9, 0.002), `u=${u}`).toBeLessThan(2e-6);
    for (const f of [0.3, 0.5, 0.7]) expect(jump((u) => shellPoint(f, u)[1], -0.45, 0.7, 0.004), `f=${f}`).toBeLessThan(2e-7);
  });

  it("eases the photos' pixel steps out of the outline and the silhouette: one smooth bulge, not ripples", () => {
    // How often the curvature turns over along the mouse; through the raw
    // samples it did 19–21 times (the photos' ±0.5 px).
    const flips = (h: (t: number) => number) => {
      let n = 0;
      let last = 0;
      for (let t = 0.055; t < 0.945; t += 0.005) {
        const c = h(t + 0.005) - 2 * h(t) + h(t - 0.005);
        const sign = Math.abs(c) < 1e-9 ? 0 : Math.sign(c);
        if (sign && last && sign !== last) n++;
        if (sign) last = sign;
      }
      return n;
    };
    expect(flips((f) => outlineAt(f).left)).toBeLessThanOrEqual(5);
    expect(flips((f) => outlineAt(f).right)).toBeLessThanOrEqual(5);
    expect(flips((f) => profileAt(f).top)).toBeLessThanOrEqual(1);
  });

  it("points the shell's normal up on the top and out at the right wall", () => {
    expect(shellNormal(0.5, -0.25)[1]).toBeGreaterThan(0.9);
    expect(shellNormal(0.5, 0.995)[0]).toBeGreaterThan(0.8);
  });
});

describe("the thumb rest (12.png–16.png)", () => {
  /** The wing's top, just inside its edge's round. */
  const wingTop = (f: number) => {
    const { left, right } = outlineAt(f);
    return shellPoint(f, -1 + (2 * ROUND.lip) / (right - left));
  };

  it("stands the wing where the side view puts it (10.png), its edge rounding down from there", () => {
    for (const [f, share] of LIP) {
      const expected = Math.max(share * EXG.height, profileAt(f).bottom);
      expect(Math.abs(shellPoint(f, -1)[1] + lipRound(f) - expected), `f=${f}`).toBeLessThan(0.0006);
    }
  });

  it("rounds the wing's edge by ROUND.lip where it stands high, ending upright where the side under it begins", () => {
    for (const f of [0.45, 0.6, 0.7]) {
      expect(lipRound(f)).toBe(ROUND.lip);
      expect(Math.abs(shellNormal(f, -1)[1])).toBeLessThan(0.3);
    }
  });

  it("stands the wing at about half the height where it is highest, as the front view does (16.png: 0.49)", () => {
    const top = Math.max(...LIP.map(([, h]) => h));
    expect(top).toBeGreaterThan(0.42);
    expect(top).toBeLessThan(0.52);
  });

  it("scoops down from the shoulder: hollow below the line to the wing over its outer half, where the thumb lies; the wing's edge turned up", () => {
    for (const f of [0.45, 0.6, 0.7]) {
      const s = shoulderAt(f);
      const from = shellPoint(f, -s);
      const to = wingTop(f);
      let lowest = Infinity;
      for (let t = 0.05; t < 0.95; t += 0.05) {
        const u = -s - (1 - s) * t;
        const p = shellPoint(f, u);
        lowest = Math.min(lowest, p[1]);
        // Under the straight line from the shoulder to the wing: concave.
        const line = from[1] + ((to[1] - from[1]) * (p[0] - from[0])) / (to[0] - from[0]);
        if (t > 0.55) expect(p[1], `f=${f} t=${t.toFixed(2)}`).toBeLessThan(line);
      }
      // 15.png: the edge stands up where the wing is high.
      if (f >= 0.6) expect(lowest, `f=${f}`).toBeLessThan(to[1]);
    }
  });

  it("tucks the side in under the wing, 5 mm where the wing is highest (16.png), and down to the desk", () => {
    const top = LIP.reduce((best, p) => (p[1] > best[1] ? p : best))[0];
    expect(tuckAt(top)).toBeCloseTo(WING.tuck, 5);
    for (const f of [0.3, 0.6, 0.8]) {
      expect(skirtPoint(f, 1)[0]).toBeGreaterThan(skirtPoint(f, 0)[0]);
      expect(skirtPoint(f, 1)[1]).toBeCloseTo(profileAt(f).bottom, 9);
      expect(skirtPoint(f, 0)).toEqual(shellPoint(f, -1));
      expect(basePoint(f, -1)[0]).toBeCloseTo(skirtPoint(f, 1)[0], 9);
    }
  });
});

describe("the pieces", () => {
  const rows = Array.from({ length: 199 }, (_, i) => (i + 1) / 200);

  it("turn every face outwards, and every cut's walls out of their piece", () => {
    expect(inwardFaces(parts.shell)).toBe(0);
    // Not the dark inside: it is only seen through a cut, and where the shell
    // turns tighter than the inside's depth (the thumb's shoulder at the
    // front) it folds over itself — inside the mouse (the next test).
    expect(inwardFaces(parts.dpi.surface)).toBe(0);
    expect(inwardWalls(parts.walls)).toBe(0);
    expect(inwardWalls(parts.dpi.walls)).toBe(0);
    for (const which of ["forward", "back"] as const) {
      expect(inwardFaces(parts.side[which].surface)).toBe(0);
      expect(inwardWalls(parts.side[which].walls)).toBe(0);
    }
  });

  it("stand a cut's width apart, left to right: body, top shell, (split,) top shell, body", () => {
    for (const f of rows) {
      const spans = [PIECES.bodyLeft(f), PIECES.topLeft(f), PIECES.topRight(f), PIECES.bodyRight(f)].filter((s): s is readonly [number, number] => !!s);
      for (let i = 1; i < spans.length; i++) {
        const gap = along(f, spans[i - 1][1], spans[i][0]);
        const halves = !!PIECES.topLeft(f) && !!PIECES.topRight(f) && i === 2 && splitGap(f) === 0;
        if (halves) expect(gap, `f=${f}`).toBeCloseTo(0, 9);
        // Two half widths, each sized at its own edge on a curving shell: within a fifth of the whole.
        else {
          expect(gap, `f=${f} #${i}`).toBeGreaterThan(1.8 * SEAM.gap);
          // Not opened wide on a steep flank (it was 3.7 mm under the thumb's shoulder, sized from above) —
          // except where the side buttons sit in the body (the next tests but one).
          const atSide = f > SIDE_BUTTONS.forward.from - 0.01 && f < SIDE_BUTTONS.back.to + 0.01;
          if (i !== 2 && !(i === 1 && atSide)) expect(gap, `f=${f} #${i}`).toBeLessThan(2.4 * SEAM.gap);
        }
      }
    }
  });

  it("cut the split from the front notch to the slot, open the slot, and join the halves behind it (the palm is one piece)", () => {
    expect(splitGap(0.03)).toBe(SEAM.gap);
    const middle = (MARKS.slot.front + MARKS.slot.back) / 2;
    expect(splitGap(middle)).toBeCloseTo(MARKS.slot.halfWidth, 9);
    expect(splitGap(MARKS.slot.back + 0.01)).toBe(0);
    const l = PIECES.topLeft(middle)!;
    const r = PIECES.topRight(middle)!;
    expect(apart(middle, l[1], r[0])).toBeCloseTo(2 * MARKS.slot.halfWidth, 6);
    expect(PIECES.topLeft(0.6)![1]).toBeCloseTo(PIECES.topRight(0.6)![0], 12);
  });

  it("fits the wheel and the DPI button inside the slot", () => {
    const [x, , z] = wheelCentre();
    const f = fAt(z);
    expect(f).toBeCloseTo(MARKS.wheel.f, 9);
    expect(x).toBeCloseTo(xOfFrac(polylineAt(MARKS.split, f)), 9);
    expect(MARKS.wheel.width / 2).toBeLessThan(splitGap(f));
    for (let f2 = MARKS.dpi.front; f2 <= MARKS.dpi.back; f2 += 0.005) {
      const d = PIECES.dpi(f2);
      if (!d) continue;
      expect(apart(f2, d[0], d[1]) / 2).toBeLessThan(splitGap(f2));
    }
  });

  it("stands the wheel a few millimetres proud of the shell", () => {
    const [x, y, z] = wheelCentre();
    const f = fAt(z);
    expect(y + MARKS.wheel.radius - shellPoint(f, uAt(f, x))[1]).toBeCloseTo(MARKS.wheel.rise, 9);
  });

  it("closes the top shell behind the palm where 6.png does, and runs the tail's seam on from there", () => {
    const end = TONGUE.left[TONGUE.left.length - 1][1];
    expect(TONGUE.right[TONGUE.right.length - 1][1]).toBe(end);
    const e = tongueEdges(end)!;
    expect(e.right - e.left).toBeCloseTo(0, 9);
    expect(tailU(end)).toBeCloseTo(e.left, 9);
    expect(tongueEdges(end + 0.001)).toBe(null);
  });

  it("puts the logo on the top shell", () => {
    const { logo } = MARKS;
    for (const f of logo.f) {
      const e = tongueEdges(f)!;
      for (const x of logo.xFrac) {
        const u = uAt(f, xOfFrac(x));
        expect(u).toBeGreaterThan(e.left);
        expect(u).toBeLessThan(e.right);
      }
    }
  });

  it("cuts the body away round the side buttons, a cut's width clear of them", () => {
    for (let f = SIDE_BUTTONS.forward.from; f <= SIDE_BUTTONS.back.to; f += 0.01) {
      const which = f <= SIDE_BUTTONS.forward.to ? "forward" : f >= SIDE_BUTTONS.back.from ? "back" : null;
      if (!which) continue;
      const side = PIECES.side(which)(f)!;
      const body = PIECES.bodyLeft(f)!;
      const top = PIECES.topLeft(f)!;
      for (const gap of [along(f, body[1], side[0]), along(f, side[1], top[0])]) {
        expect(gap).toBeGreaterThan(1.8 * SEAM.gap);
        expect(gap).toBeLessThan(2.4 * SEAM.gap);
      }
    }
  });

  it("rounds every cut edge down into its cut by ROUND.edge (the user: the corners were too sharp)", () => {
    const { positions } = parts.shell;
    for (const f of [0.2, 0.5, 0.7]) {
      const edge = PIECES.topLeft(f)![0];
      const s = shellPoint(f, edge);
      const n = shellNormal(f, edge);
      const rounded: V = [s[0] - n[0] * ROUND.edge, s[1] - n[1] * ROUND.edge, s[2] - n[2] * ROUND.edge];
      let nearest = Infinity;
      for (let i = 0; i < positions.length; i += 3) nearest = Math.min(nearest, Math.hypot(positions[i] - rounded[0], positions[i + 1] - rounded[1], positions[i + 2] - rounded[2]));
      // The edge's vertex lies where the round ends upright, not on the shell (the unrounded corner).
      expect(nearest, `f=${f}`).toBeLessThan(0.00005);
    }
  });

  it("lays the dark inside within the shell: in from the wing's edge (so not under it, beside the side tucking in), under the side's silhouette", () => {
    const { positions } = parts.inside;
    for (let i = 0; i < positions.length; i += 3) {
      const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
      const f = fAt(z);
      // Pushed in along the normal, a point moves along a little too: allow the outline a step either side.
      const near = [-0.02, 0, 0.02].map((d) => outlineAt(Math.min(1, Math.max(0, f + d))));
      expect(x).toBeGreaterThan(Math.min(...near.map((o) => o.left)) + 0.001);
      expect(x).toBeLessThan(Math.max(...near.map((o) => o.right)) + 1e-9);
      expect(y).toBeLessThan(profileAt(Math.min(1, Math.max(0, f))).top - 0.3 * SEAM.depth + 1e-9);
    }
    // A pressed button does not reach it.
    expect(0.3 * SEAM.depth).toBeLessThan(SEAM.depth);
    expect(SEAM.depth).toBeGreaterThan(BUTTON.travel);
  });
});

describe("the buttons", () => {
  it("bend about the hinge: nothing behind it, most at the front", () => {
    expect(buttonShare(BUTTON.hinge + 0.01, -0.2)).toEqual([0, 0]);
    expect(buttonShare(0.03, -0.3)[0]).toBeGreaterThan(buttonShare(0.3, -0.3)[0]);
  });

  it("share the lever between left and right by the side of the split", () => {
    const f = 0.2;
    const lever = (BUTTON.hinge - f) / BUTTON.hinge;
    const c = splitU(f);
    expect(buttonShare(f, c - 0.3)).toEqual([lever, 0]);
    expect(buttonShare(f, c + 0.3)).toEqual([0, lever]);
    const [l, r] = buttonShare(f, c);
    expect(l + r).toBeCloseTo(lever, 12);
  });

  it("take a click anywhere on the top shell up to the reach — out to the thumb's side, behind the hinge (the user: bigger)", () => {
    const f = 0.45;
    const e = tongueEdges(f)!;
    expect(f).toBeGreaterThan(BUTTON.hinge);
    expect(buttonAt(f, e.left + 0.01)).toBe("left");
    expect(buttonAt(0.1, tongueEdges(0.1)!.left + 0.01)).toBe("left");
    expect(buttonAt(0.1, splitU(0.1) + 0.05)).toBe("right");
    expect(buttonAt(f, e.left - 0.05)).toBe(null);
    expect(buttonAt(BUTTON.reach + 0.02, splitU(0.5))).toBe(null);
  });

  it("lean the slot about 8°, its rear end right", () => {
    expect((SLOT_LEAN * 180) / Math.PI).toBeGreaterThan(7);
    expect((SLOT_LEAN * 180) / Math.PI).toBeLessThan(10);
  });

  it("put the side buttons on the thumb's flank, between the seams the photos show (6.png, 10.png)", () => {
    for (const which of ["forward", "back"] as const) {
      const { positions } = parts.side[which].surface;
      for (let i = 0; i < positions.length; i += 3) {
        expect(positions[i]).toBeLessThan(0);
        // Under the side silhouette at its own place along: 10.png shows them inside it.
        const f = fAt(positions[i + 2]);
        expect(positions[i + 1]).toBeLessThan(profileAt(f).top);
      }
    }
    expect(SIDE_BUTTONS.forward.to).toBeLessThan(SIDE_BUTTONS.back.from);
    const lowerAt = (f: number) => polylineAt(SIDE_BUTTONS.lower.map(([at, share]) => [share, at] as const), f);
    for (let f = SIDE_BUTTONS.forward.from; f <= SIDE_BUTTONS.back.to; f += 0.02) {
      const { upper, lower } = sideButtonSpan(f);
      expect(lower).toBeLessThan(upper);
      expect(shellPoint(f, lower)[1] / EXG.height).toBeCloseTo(lowerAt(f), 6);
    }
  });

  it("runs the side buttons' upper edge along the top shell's left edge — one line, not two", () => {
    for (let f = SIDE_BUTTONS.forward.from; f <= SIDE_BUTTONS.back.to; f += 0.01) {
      expect(sideButtonSpan(f).upper).toBe(tongueEdges(f)!.left);
    }
  });

  it("passes the shell within a millimetre of the side buttons' upper seam, where both photos put it (what `leftEdgeAt` is solved from, eased)", () => {
    for (const [f, share] of SIDE_BUTTONS.upper) {
      const u = sideButtonSpan(f).upper;
      expect(Math.abs(shellPoint(f, u)[1] - share * EXG.height), `f=${f}`).toBeLessThan(0.001);
      expect(u).toBeLessThan(ridgeAt(f));
    }
  });

  it("drops the thumb's side towards the tail, into the thumb rest", () => {
    expect(leftEdgeAt(0.6)).toBeLessThan(leftEdgeAt(0.35));
  });

  it("press the side buttons in, out of the thumb's flank", () => {
    for (const which of ["forward", "back"] as const) expect(parts.side[which].normal[0]).toBeLessThan(0);
  });

  it("read MouseEvent.buttons as the buttons it names", () => {
    expect(buttonsHeld(1)).toEqual([0]);
    expect(buttonsHeld(2)).toEqual([2]);
    expect(buttonsHeld(4)).toEqual([1]);
    expect(buttonsHeld(8)).toEqual([3]);
    expect(buttonsHeld(16)).toEqual([4]);
    expect(buttonsHeld(3)).toEqual([0, 2]);
    expect(buttonsHeld(0)).toEqual([]);
  });
});

describe("the mouse and the cursor", () => {
  it("rests in the screen's middle", () => {
    expect(cursorFromMouse([0, 0])).toEqual({ x: DESK_SCREEN_PX.width / 2, y: DESK_SCREEN_PX.height / 2 });
  });

  it("maps the travel onto the whole screen, in its proportions", () => {
    expect(MOUSE_TRAVEL.width / MOUSE_TRAVEL.depth).toBeCloseTo(DESK_SCREEN_PX.width / DESK_SCREEN_PX.height, 9);
    expect(cursorFromMouse([-MOUSE_TRAVEL.width / 2, -MOUSE_TRAVEL.depth / 2])).toEqual({ x: 0, y: 0 });
    const far = cursorFromMouse([MOUSE_TRAVEL.width / 2, MOUSE_TRAVEL.depth / 2]);
    expect(far.x).toBeCloseTo(DESK_SCREEN_PX.width, 9);
    expect(far.y).toBeCloseTo(DESK_SCREEN_PX.height, 9);
  });

  it("moves the cursor right for right and down for towards the reader", () => {
    expect(cursorFromMouse([0.02, 0]).x).toBeGreaterThan(DESK_SCREEN_PX.width / 2);
    expect(cursorFromMouse([0, 0.02]).y).toBeGreaterThan(DESK_SCREEN_PX.height / 2);
  });

  it("is one place for one place, both ways", () => {
    for (const c of [
      { x: 0, y: 0 },
      { x: 310, y: 700 },
      { x: 1239, y: 1 },
    ]) {
      const back = cursorFromMouse(mouseFromCursor(c));
      expect(back.x).toBeCloseTo(c.x, 9);
      expect(back.y).toBeCloseTo(c.y, 9);
    }
  });

  it("keeps the cursor on the screen", () => {
    expect(clampCursor({ x: -5, y: 900 })).toEqual({ x: 0, y: DESK_SCREEN_PX.height });
    expect(clampCursor({ x: 300, y: 200 })).toEqual({ x: 300, y: 200 });
  });

  it("keeps the mouse inside its travel", () => {
    expect(clampTravel([1, -1])).toEqual([MOUSE_TRAVEL.width / 2, -MOUSE_TRAVEL.depth / 2]);
    expect(cursorFromMouse([1, 1]).x).toBeCloseTo(DESK_SCREEN_PX.width, 9);
  });

  it("travels on the mat, clear of the keyboard and of the mug", () => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cx = MOUSE.x + (sx * MOUSE_TRAVEL.width) / 2;
        const cz = MOUSE.z + (sz * MOUSE_TRAVEL.depth) / 2;
        // The outline at this corner of the travel, sampled all round.
        for (let f = 0; f <= 1; f += 0.02) {
          for (const u of [-1, 1]) {
            const [x, , z] = shellPoint(f, u);
            const px = cx + x;
            const pz = cz + z;
            expect(px).toBeGreaterThan(DESK_MAT.x - DESK_MAT.width / 2);
            expect(px).toBeLessThan(DESK_MAT.x + DESK_MAT.width / 2);
            expect(pz).toBeGreaterThan(DESK_MAT.z - DESK_MAT.depth / 2);
            expect(pz).toBeLessThan(DESK_MAT.z + DESK_MAT.depth / 2);
            expect(px, "keyboard").toBeGreaterThan(KEYBOARD.x + HHKB.width / 2 + 0.01);
            expect(Math.hypot(px - MUG.x, pz - MUG.z), "mug").toBeGreaterThan(MUG.radius + 0.01);
          }
        }
      }
    }
  });

  it("stays under the resting right hand", () => {
    const [hx, , hz] = DESK_HANDS[1];
    const f = fAt(hz - MOUSE.z);
    expect(f).toBeLessThan(1);
    expect(MOUSE.y + profileAt(f).top).toBeLessThan(HAND_Y);
    expect(hx).toBe(MOUSE.x);
  });
});

describe("the PC's screen under a ray", () => {
  const n = DESK_SCREEN.normal;
  const from = (p: Vec3, back = 0.8): Vec3 => [p[0] + n[0] * back, p[1] + n[1] * back, p[2] + n[2] * back];
  const towards = (from: Vec3, to: Vec3): Vec3 => {
    const d = sub(to as V, from as V);
    const l = Math.hypot(...d);
    return [d[0] / l, d[1] / l, d[2] / l];
  };

  it("finds the middle in the middle", () => {
    const eye = from(DESK_SCREEN.centre);
    const hit = panelPoint(DESK_SCREEN, eye, towards(eye, DESK_SCREEN.centre))!;
    expect(hit.x).toBeCloseTo(DESK_SCREEN_PX.width / 2, 6);
    expect(hit.y).toBeCloseTo(DESK_SCREEN_PX.height / 2, 6);
  });

  it("reads left to right and top to bottom", () => {
    const eye = from(DESK_SCREEN.centre);
    const { centre, right, up, width, height } = DESK_SCREEN;
    const topLeft: Vec3 = [0, 1, 2].map((i) => centre[i] - (right[i] * width) / 4 + (up[i] * height) / 4) as Vec3;
    const hit = panelPoint(DESK_SCREEN, eye, towards(eye, topLeft))!;
    expect(hit.x).toBeCloseTo(DESK_SCREEN_PX.width / 4, 6);
    expect(hit.y).toBeCloseTo(DESK_SCREEN_PX.height / 4, 6);
  });

  it("misses beside it, behind the eye and from behind", () => {
    const eye = from(DESK_SCREEN.centre);
    const { centre, right, width } = DESK_SCREEN;
    const beside: Vec3 = [0, 1, 2].map((i) => centre[i] + right[i] * width) as Vec3;
    expect(panelPoint(DESK_SCREEN, eye, towards(eye, beside))).toBe(null);
    expect(panelPoint(DESK_SCREEN, eye, towards(DESK_SCREEN.centre, eye))).toBe(null);
    const behind = from(DESK_SCREEN.centre, -0.8);
    expect(panelPoint(DESK_SCREEN, behind, towards(behind, DESK_SCREEN.centre))).toBe(null);
  });
});

describe("the click sounds", () => {
  it("walk every recorded click, never the same one twice running", () => {
    for (const button of [0, 1, 2, 3, 4] as MouseButton[]) {
      const used = Array.from({ length: 24 }, (_, i) => mouseSample(button, i));
      expect(new Set(used).size).toBe(MOUSE_CLICKS);
      for (let i = 1; i < used.length; i++) expect(used[i]).not.toBe(used[i - 1]);
    }
  });

  it("serves every clip it can ask for, and none it never asks for", () => {
    const asked: string[] = [];
    for (let n = 1; n <= MOUSE_CLICKS; n++) {
      for (const part of ["down", "up"] as const) {
        const url = mouseSampleUrl(n, part);
        expect(existsSync(join(process.cwd(), "public", url)), url).toBe(true);
        asked.push(url.split("/").pop()!);
      }
    }
    const served = readdirSync(join(process.cwd(), "public", "sounds", "mouse")).filter((f) => f.endsWith(".mp3"));
    expect(served.sort()).toEqual(asked.sort());
    expect(mouseSampleUrl(3, "up")).toBe("/sounds/mouse/click-03-up.mp3");
  });
});

it("measures f from the front tip", () => {
  expect(zAt(0)).toBeCloseTo(-EXG.length / 2, 12);
  expect(fAt(zAt(0.3))).toBeCloseTo(0.3, 12);
});
