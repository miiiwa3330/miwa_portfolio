import { describe, expect, it } from "vitest";
import {
  MAC_BACK,
  MAC_CASE,
  MAC_FACE_LENGTH,
  MAC_PROFILE,
  MAC_SIDE_VENTS,
  MAC_SIZE,
  MAC_TOP,
  MAC_TOP_SLOPE,
  macBodyOutline,
  macFace,
  macNotchWall,
  macPlinthOutline,
  macTopAt,
  profileRing,
  type ProfileCorner,
} from "./macCase";

const { width: W, height: H, depth: D } = MAC_SIZE;
const P = MAC_PROFILE;
const DEG = Math.PI / 180;

/** Whether (z, y) is inside a polygon (even–odd). */
function inside(poly: readonly { z: number; y: number }[], z: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && z < ((b.z - a.z) * (y - a.y)) / (b.y - a.y) + a.z) hit = !hit;
  }
  return hit;
}

describe("the Mac's side outline (the drawing's side view)", () => {
  const body = profileRing(macBodyOutline(false));

  it("is the 128K's size: from the back to the plate's foot, from the desk to the top's front corner", () => {
    const zs = body.map((p) => p.z).concat(P.faceFoot[0]);
    const ys = body.map((p) => p.y).concat(P.faceTop[1]);
    expect(Math.min(...zs)).toBeCloseTo(-D / 2, 12);
    expect(Math.max(...zs)).toBeCloseTo(D / 2, 12);
    expect(Math.min(...ys)).toBeCloseTo(0, 12);
    expect(Math.max(...ys)).toBeCloseTo(H, 12);
  });

  it("is a trapezoid, not a box: the front leans back 5–6°, the top falls 4–5° to the back", () => {
    expect(P.lean).toBeGreaterThan(5 * DEG);
    expect(P.lean).toBeLessThan(6 * DEG);
    // Back, not forward: the top of the face is further back than its foot.
    expect(P.faceTop[0]).toBeLessThan(P.faceFoot[0] - 0.025);
    expect(MAC_TOP_SLOPE).toBeGreaterThan(4 * DEG);
    expect(MAC_TOP_SLOPE).toBeLessThan(5 * DEG);
    expect(P.topBack[1]).toBeLessThan(P.topSeam[1] - 0.012);
  });

  it("takes the top's back corner off with a chamfer, 20–30 mm deep and 40–50 mm tall", () => {
    expect(P.topBack[0] - -D / 2).toBeGreaterThan(0.02);
    expect(P.topBack[0] - -D / 2).toBeLessThan(0.03);
    expect(P.topBack[1] - P.chamferFoot).toBeGreaterThan(0.04);
    expect(P.topBack[1] - P.chamferFoot).toBeLessThan(0.05);
  });

  it("stands the front plate, 15–17 mm thick all the way up, on a base set back 30–35 mm under it", () => {
    // The plate's back (the seam) runs parallel to its face.
    for (const y of [P.seamFoot, (P.seamFoot + H) / 2, P.topSeam[1] - 0.001]) {
      const front = P.faceFoot[0] - (y - P.faceFoot[1]) * Math.tan(P.lean);
      const square = (front - P.seamAt(y)) * Math.cos(P.lean);
      expect(square).toBeGreaterThan(0.015);
      expect(square).toBeLessThan(0.017);
    }
    expect(P.faceFoot[0] - P.plinthFront).toBeGreaterThan(0.03);
    expect(P.faceFoot[0] - P.plinthFront).toBeLessThan(0.035);
    expect(P.faceFoot[1]).toBeGreaterThan(0.045);
    expect(P.faceFoot[1]).toBeLessThan(0.05);
    // The seam comes down behind the base, and turns back under the case above the plate's foot.
    expect(P.seamBack).toBeLessThan(P.plinthFront);
    expect(P.seamFoot).toBeGreaterThan(P.faceFoot[1]);
  });

  it("has its normals pointing out of it all the way round, on every outline the Mac is built from", () => {
    const outlines: [string, ProfileCorner[]][] = [
      ["case", macBodyOutline(false)],
      ["the notched middle", macBodyOutline(true)],
      ["base", macPlinthOutline()],
    ];
    for (const [, corners] of outlines) {
      const ring = profileRing(corners);
      // Between each point and the next (a sharp corner's own point is on two sides at once).
      let probed = 0;
      ring.forEach((p, i) => {
        const q = ring[(i + 1) % ring.length];
        if (Math.hypot(q.z - p.z, q.y - p.y) < 1e-6) return;
        const nz = p.nz + q.nz;
        const ny = p.ny + q.ny;
        const n = Math.hypot(nz, ny);
        const z = (p.z + q.z) / 2;
        const y = (p.y + q.y) / 2;
        expect(inside(ring, z + (nz / n) * 0.0005, y + (ny / n) * 0.0005)).toBe(false);
        expect(inside(ring, z - (nz / n) * 0.0005, y - (ny / n) * 0.0005)).toBe(true);
        probed++;
      });
      expect(probed).toBeGreaterThan(5);
    }
  });

  it("leaves the case's edges square along the seam, where it meets the plate flush, and round elsewhere", () => {
    const seam = body.filter((p) => p.seam && p.y < P.topSeam[1] - MAC_CASE.edge - 1e-9);
    expect(seam.length).toBeGreaterThan(4);
    for (const p of seam) expect(p.edge).toBe(0);
    const top = body.filter((p) => !p.seam && p.y > P.chamferFoot);
    expect(top.length).toBeGreaterThan(2);
    for (const p of top) expect(p.edge).toBe(MAC_CASE.edge);
    // The seam's own walls are left out: the plate covers them.
    expect(body.filter((p) => p.open).length).toBeGreaterThan(0);
    for (const p of body.filter((q) => q.open)) expect(p.seam).toBe(true);
  });
});

describe("profileRing", () => {
  const square: ProfileCorner[] = [
    { z: 0, y: 0, radius: 0, edge: 0 },
    { z: 1, y: 0, radius: 0.2, edge: 0 },
    { z: 1, y: 1, radius: 0, edge: 0 },
    { z: 0, y: 1, radius: 0, edge: 0 },
  ];

  it("rounds a corner on an arc tangent to both sides, its normals out from one centre", () => {
    const ring = profileRing(square, 4);
    const arc = ring.filter((p) => p.z > 0.8 - 1e-9 && p.y < 0.2 + 1e-9 && !(p.z === 1 && p.y === 0));
    expect(arc).toHaveLength(5);
    for (const p of arc) expect(Math.hypot(p.z - 0.8, p.y - 0.2)).toBeCloseTo(0.2, 12);
    // Tangent: the arc starts on the bottom (normal down) and ends on the right side (normal right).
    expect(arc[0]).toMatchObject({ z: expect.closeTo(0.8, 12), y: expect.closeTo(0, 12), ny: expect.closeTo(-1, 12) });
    expect(arc[4]).toMatchObject({ z: expect.closeTo(1, 12), y: expect.closeTo(0.2, 12), nz: expect.closeTo(1, 12) });
  });

  it("gives a sharp corner two points, one with each side's normal", () => {
    const ring = profileRing(square, 4);
    const corner = ring.filter((p) => p.z === 1 && p.y === 1);
    expect(corner).toHaveLength(2);
    expect(corner[0].nz).toBeCloseTo(1, 12);
    expect(corner[1].ny).toBeCloseTo(1, 12);
  });

  it("grows an edge's round along a side when asked to", () => {
    const ring = profileRing(
      [
        { z: 0, y: 0, radius: 0, edge: 0, edgeEnd: 0.01 },
        { z: 1, y: 0, radius: 0, edge: 0.01 },
        { z: 1, y: 1, radius: 0, edge: 0.01 },
      ],
      4
    );
    expect(ring[1].edge).toBe(0);
    expect(ring[2].edge).toBe(0.01);
  });
});

describe("the Mac's face", () => {
  it("starts at the top's front corner and goes down the leaning plate to its foot", () => {
    expect(macFace(0, 0, 0)).toEqual([0, P.faceTop[1], P.faceTop[0]]);
    const foot = macFace(0.05, MAC_FACE_LENGTH, 0);
    expect(foot[0]).toBe(0.05);
    expect(foot[1]).toBeCloseTo(P.faceFoot[1], 12);
    expect(foot[2]).toBeCloseTo(P.faceFoot[0], 12);
  });

  it("points out forward and a little up, square to the face", () => {
    const o = macFace(0, 0.1, 0);
    const out = macFace(0, 0.1, 0.01);
    const down = macFace(0, 0.11, 0);
    const n = [0, out[1] - o[1], out[2] - o[2]];
    const d = [0, down[1] - o[1], down[2] - o[2]];
    expect(n[2]).toBeGreaterThan(0);
    expect(n[1]).toBeGreaterThan(0);
    expect(n[1] * d[1] + n[2] * d[2]).toBeCloseTo(0, 12);
  });

  it("keeps the screen's recess on the plate: under its rounded top edge, over its foot's", () => {
    const { recess, plate } = MAC_CASE;
    expect(recess.top).toBeGreaterThan(plate.edge);
    expect(recess.top + recess.height).toBeLessThan(MAC_FACE_LENGTH - plate.edge);
    expect(recess.width).toBeLessThan(W - 2 * plate.edge);
  });

  it("puts the keyboard's jack on the base, under the plate", () => {
    const { jack } = MAC_CASE;
    expect(jack.y + 0.005).toBeLessThan(P.faceFoot[1]);
    expect(jack.y - 0.005).toBeGreaterThan(0);
    expect(Math.abs(jack.x) + 0.004).toBeLessThan(W / 2);
  });
});

describe("the Mac's top", () => {
  const { notch, handle, grille } = MAC_TOP;

  it("cuts the handle's notch from the back, down to a floor over the chamfer's foot, out through the chamfer", () => {
    expect(notch.floor).toBeGreaterThan(P.chamferFoot);
    expect(notch.floor).toBeLessThan(P.topBack[1]);
    const middle = profileRing(macBodyOutline(true));
    // The middle has no top behind the notch's front: nothing of it over the floor there.
    for (const p of middle) if (p.z < -D / 2 + notch.depth - 1e-9) expect(p.y).toBeLessThanOrEqual(notch.floor + 1e-9);
    // The notch's walls are inside the case's outline.
    const full = profileRing(macBodyOutline(false));
    const [a, b, c, d] = macNotchWall();
    const mid = { z: (a[0] + b[0] + c[0] + d[0]) / 4, y: (a[1] + b[1] + c[1] + d[1]) / 4 };
    expect(inside(full, mid.z, mid.y)).toBe(true);
  });

  it("bridges the notch's front with the handle, under the top", () => {
    expect(handle.to).toBe(notch.depth);
    expect(handle.from).toBeLessThan(handle.to);
    expect(handle.drop + handle.thickness).toBeLessThan(macTopAt(-D / 2 + handle.to) - notch.floor);
  });

  it("puts each vent panel on its half of the top, beside the notch, between the chamfer and the plate", () => {
    expect(grille.inset + grille.width).toBeLessThan(W / 2 - notch.width / 2);
    expect(-D / 2 + grille.from).toBeGreaterThan(P.topBack[0]);
    expect(-D / 2 + grille.to).toBeLessThan(P.topSeam[0]);
    const { count, pitch, length, width } = MAC_TOP.slots;
    expect((count - 1) * pitch + width).toBeLessThan(grille.to - grille.from);
    expect(length).toBeLessThan(grille.width);
  });
});

describe("the Mac's sides and back", () => {
  it("runs the side vents under the seam's turn, inside the case's side", () => {
    for (const y of MAC_SIDE_VENTS.rows) {
      expect(y - MAC_SIDE_VENTS.slot / 2).toBeGreaterThan(0);
      expect(y + MAC_SIDE_VENTS.slot / 2).toBeLessThan(P.seamFoot);
    }
    for (const [from, to] of [...MAC_SIDE_VENTS.left, ...MAC_SIDE_VENTS.right]) {
      expect(from).toBeGreaterThan(0);
      expect(-D / 2 + to).toBeLessThan(P.seamBack);
    }
  });

  it("has three runs of long slots on the left and seven of short ones on the right", () => {
    expect(MAC_SIDE_VENTS.left).toHaveLength(3);
    expect(MAC_SIDE_VENTS.right).toHaveLength(7);
    const length = ([from, to]: readonly number[]) => to - from;
    for (const run of MAC_SIDE_VENTS.left) expect(length(run)).toBeGreaterThan(0.05);
    for (const run of MAC_SIDE_VENTS.right) expect(length(run)).toBeLessThan(0.03);
  });

  it("keeps the back's parts on the back and clear of each other", () => {
    const { badge, nameplate, label, socket, switch: power, ports, slot, strip } = MAC_BACK;
    const boxes = [
      { x: badge.x, y: badge.y, width: badge.size, height: badge.size },
      nameplate,
      label,
      socket,
      power,
      slot,
      strip,
      ...ports.at.map((x, i) => ({ x, y: ports.y, width: ports.widths[i], height: ports.height })),
    ];
    for (const b of boxes) {
      expect(Math.abs(b.x) + b.width / 2).toBeLessThan(W / 2 - MAC_CASE.edge);
      expect(b.y - b.height / 2).toBeGreaterThan(0);
      expect(b.y + b.height / 2).toBeLessThan(P.chamferFoot);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const apart = Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || Math.abs(a.y - b.y) >= (a.height + b.height) / 2;
        expect(apart).toBe(true);
      }
  });

  it("puts the power switch on the left seen from the front, the ports on the right", () => {
    expect(MAC_BACK.switch.x).toBeLessThan(0);
    expect(MAC_BACK.ports.at[0]).toBeGreaterThan(0);
  });
});
