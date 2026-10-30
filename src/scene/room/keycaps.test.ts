import { describe, expect, it } from "vitest";
import { CAP, keyboardKeys, plateToBoard, ROW_PROFILE, HHKB } from "./keyboard";
import { ATLAS_WIDTH, capRing, keycapMesh, legendAtlas } from "./keycaps";

const keys = keyboardKeys();
const atlas = legendAtlas(keys);
const mesh = keycapMesh(keys, atlas);

const point = (i: number) => [mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe("the legend atlas", () => {
  it("gives every key a cell, inside the canvas, none overlapping", () => {
    expect(atlas.cells.length).toBe(keys.length);
    for (const c of atlas.cells) {
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.left + c.width).toBeLessThanOrEqual(ATLAS_WIDTH);
      expect(c.top + c.height).toBeLessThanOrEqual(atlas.height);
    }
    for (let a = 0; a < atlas.cells.length; a++) {
      for (let b = a + 1; b < atlas.cells.length; b++) {
        const p = atlas.cells[a];
        const q = atlas.cells[b];
        const apart = p.left + p.width <= q.left || q.left + q.width <= p.left || p.top + p.height <= q.top || q.top + q.height <= p.top;
        expect(apart, `${keys[a].id} / ${keys[b].id}`).toBe(true);
      }
    }
  });

  it("is a power of two tall, and no bigger than it needs", () => {
    expect(Math.log2(atlas.height) % 1).toBe(0);
    const used = Math.max(...atlas.cells.map((c) => c.top + c.height));
    expect(atlas.height).toBeLessThan(used * 2);
  });

  it("gives a wider key a wider cell, in the proportion of its top", () => {
    const space = atlas.cells[keys.find((k) => k.id === "space")!.index];
    const q = atlas.cells[keys.find((k) => k.id === "q")!.index];
    expect(space.width / q.width).toBeGreaterThan(5);
  });
});

describe("the key caps' mesh", () => {
  it("says for every vertex which key it is, and whether that key is gray", () => {
    const count = mesh.positions.length / 3;
    expect(mesh.keys.length).toBe(count);
    expect(mesh.mods.length).toBe(count);
    expect(new Set(Array.from(mesh.keys)).size).toBe(60);
    for (let i = 0; i < count; i++) expect(mesh.mods[i]).toBe(keys[mesh.keys[i]].mod ? 1 : 0);
  });

  it("faces every triangle outwards, away from its own key's middle", () => {
    let inward = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a, b, c] = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]];
      const key = keys[mesh.keys[a]];
      const middle = plateToBoard([key.x, ROW_PROFILE[key.row].height / 2, key.z]);
      const normal = cross(sub(point(b), point(a)), sub(point(c), point(a)));
      const centroid = [0, 1, 2].map((k) => (point(a)[k] + point(b)[k] + point(c)[k]) / 3);
      if (dot(normal, sub(centroid, middle)) <= 0) inward++;
    }
    expect(inward).toBe(0);
  });

  it("keeps every triangle within one key", () => {
    for (let t = 0; t < mesh.indices.length; t += 3) {
      expect(mesh.keys[mesh.indices[t + 1]]).toBe(mesh.keys[mesh.indices[t]]);
      expect(mesh.keys[mesh.indices[t + 2]]).toBe(mesh.keys[mesh.indices[t]]);
    }
  });

  it("stays above the desk and under the maker's 40 mm", () => {
    for (let i = 1; i < mesh.positions.length; i += 3) {
      expect(mesh.positions[i]).toBeGreaterThan(0);
      expect(mesh.positions[i]).toBeLessThanOrEqual(HHKB.height + 1e-9);
    }
  });

  it("maps texture coordinates inside the atlas", () => {
    for (const uv of mesh.uvs) {
      expect(uv).toBeGreaterThanOrEqual(0);
      expect(uv).toBeLessThanOrEqual(1);
    }
  });

  it("stays a small mesh: under 9,000 vertices for the whole board", () => {
    expect(mesh.positions.length / 3).toBeLessThan(9000);
  });

  it("rounds every cap's corners: no vertex at the corner of its foot or of its top", () => {
    for (const key of keys) {
      const foot = { w: key.units * HHKB.pitch - CAP.footGap, d: HHKB.pitch - CAP.footGap };
      const corner = plateToBoard([key.x + foot.w / 2, 0, key.z + foot.d / 2]);
      let nearest = Infinity;
      for (let i = 0; i < mesh.keys.length; i++) {
        if (mesh.keys[i] !== key.index) continue;
        nearest = Math.min(nearest, Math.hypot(point(i)[0] - corner[0], point(i)[1] - corner[1], point(i)[2] - corner[2]));
      }
      // A rounded corner of radius r leaves its square corner r(√2 − 1) away: about 0.41 mm for the 1 mm
      // the photos show. A fixed floor, not one worked out from CAP.footRadius — that would shrink with it.
      expect(nearest, key.id).toBeGreaterThan(0.0003);
    }
  });
});

describe("a cap's ring", () => {
  const ring = capRing(0.01, -0.02, 0.018, 0.017, 0.001, 3, 2);

  it("has the corners' points and the straight edges' splits, in the same count for any size", () => {
    // Four corners of 3 segments (4 points each), front and back split in 3, the sides in 2.
    expect(ring.length).toBe(4 * 4 + 2 * 2 + 2 * 1);
    expect(capRing(0, 0, 0.1, 0.05, 0.004, 3, 2).length).toBe(ring.length);
  });

  it("stays on its rectangle, centred where it is asked", () => {
    const xs = ring.map((p) => p.x);
    const zs = ring.map((p) => p.z);
    expect(Math.min(...xs)).toBeCloseTo(0.01 - 0.009, 12);
    expect(Math.max(...xs)).toBeCloseTo(0.01 + 0.009, 12);
    expect(Math.min(...zs)).toBeCloseTo(-0.02 - 0.0085, 12);
    expect(Math.max(...zs)).toBeCloseTo(-0.02 + 0.0085, 12);
  });

  it("goes round without doubling back: every step turns the same way", () => {
    let turns = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const c = ring[(i + 2) % ring.length];
      const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
      expect(cross).toBeGreaterThanOrEqual(-1e-12);
      turns += cross > 1e-12 ? 1 : 0;
    }
    expect(turns).toBeGreaterThan(0);
  });
});

