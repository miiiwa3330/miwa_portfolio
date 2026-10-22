import * as THREE from "three";
import type { OutlinePoint } from "../room/keyboard";
import type { ProfilePoint } from "../room/macCase";

/**
 * Pieces for building a keyboard's case from top-view outlines: standing an
 * outline up between two heights, and rounding its top edge. Shared by the
 * HHKB (`HhkbKeyboard`) and the Macintosh's keyboard (`MacKeyboard`), which
 * build their cases the same way — see `HhkbKeyboard`'s `useCase` for why
 * not with three.js's extrusion bevel. And for the Macintosh itself, a case
 * from its side outline (`profilePrism`) and its seam (`sideRibbon`).
 */

/**
 * A top-view outline as a three.js shape (shape y is −z, so `slab` can stand
 * it up), wound counter-clockwise. That winding matters: three.js puts a
 * shape's holes the right way round only when it has to reverse the shape
 * itself, so a clockwise shape kept its holes as given — and the rim's hole
 * walls faced into the rim, showing black edges round the tray.
 */
export function shapeOf(points: readonly { x: number; z: number }[]): THREE.Shape {
  const vectors = points.map((p) => new THREE.Vector2(p.x, -p.z));
  return new THREE.Shape(THREE.ShapeUtils.isClockWise(vectors) ? vectors.reverse() : vectors);
}

/** A shape stood up between two heights that may slope with depth (`bottom(z)`, `top(z)`). No bevel: see `useCase`. */
export function slab(shape: THREE.Shape, bottom: (z: number) => number, top: (z: number) => number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    position.setY(i, position.getY(i) < 0.5 ? bottom(z) : top(z));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A quarter-round swept round `outline`: from its wall, `edge` under `top`,
 * up and in to the top, `edge` inside the outline. Smooth-shaded; at its
 * bottom the normal is the wall's, at its top the top's, so it joins both
 * without a crease.
 */
export function fillet(outline: readonly OutlinePoint[], edge: number, top: (z: number) => number, steps = 4): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = (j / steps) * (Math.PI / 2);
    const inward = edge * (1 - Math.cos(a));
    for (const p of outline) {
      const x = p.x - p.nx * inward;
      const z = p.z - p.nz * inward;
      positions.push(x, top(z) - edge + edge * Math.sin(a), z);
    }
  }
  const n = outline.length;
  const indices: number[] = [];
  for (let j = 0; j < steps; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = (j + 1) * n + i;
      const c = (j + 1) * n + ((i + 1) % n);
      const d = j * n + ((i + 1) % n);
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A side outline (`room/macCase.ts`'s `profileRing`, in z and y) stood out
 * across X from `x0` to `x1`: its walls (but not along the outline's open
 * stretches, hidden behind something else), and on each side asked for, its
 * edges rounded by each point's `edge` and the flat side that closes it —
 * or, given an outline for that side (z, y), only that much of it: where the
 * side is inside the case but for one patch, the rest of it would show
 * wherever the case is seen into (the Mac's screen's recess).
 * Every vertex carries its own normal, so a sharp corner (two points in one
 * place) stays sharp while the rounds stay smooth; every triangle is wound to
 * face the way its normals point.
 */
export function profilePrism(
  ring: readonly ProfilePoint[],
  x0: number,
  x1: number,
  sides: { round: readonly [boolean, boolean]; cap: readonly [boolean | readonly (readonly [number, number])[], boolean | readonly (readonly [number, number])[]] },
  steps = 4
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    return positions.length / 3 - 1;
  };
  const at = (i: number, k: number) => positions[3 * i + k];
  const triangle = (a: number, b: number, c: number) => {
    const u = [at(b, 0) - at(a, 0), at(b, 1) - at(a, 1), at(b, 2) - at(a, 2)];
    const v = [at(c, 0) - at(a, 0), at(c, 1) - at(a, 1), at(c, 2) - at(a, 2)];
    const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    let facing = 0;
    for (const i of [a, b, c]) for (let k = 0; k < 3; k++) facing += g[k] * normals[3 * i + k];
    if (facing < 0) indices.push(a, c, b);
    else indices.push(a, b, c);
  };
  const n = ring.length;
  const edgeOf = (p: ProfilePoint, side: 0 | 1) => (sides.round[side] ? p.edge : 0);

  // The walls, from where the left round ends to where the right one starts.
  const wall = ring.map((p) => [
    vertex(x0 + edgeOf(p, 0), p.y, p.z, 0, p.ny, p.nz),
    vertex(x1 - edgeOf(p, 1), p.y, p.z, 0, p.ny, p.nz),
  ]);
  for (let i = 0; i < n; i++) {
    if (ring[i].open) continue;
    const j = (i + 1) % n;
    triangle(wall[i][0], wall[i][1], wall[j][1]);
    triangle(wall[i][0], wall[j][1], wall[j][0]);
  }

  for (const side of [0, 1] as const) {
    const sign = side === 0 ? -1 : 1;
    const xs = side === 0 ? x0 : x1;
    if (sides.round[side]) {
      // A quarter round at each point, from its wall out to the flat side.
      const rows = ring.map((p) =>
        Array.from({ length: steps + 1 }, (_, k) => {
          const a = (k / steps) * (Math.PI / 2);
          const e = p.edge;
          const inward = e * (1 - Math.cos(a));
          return vertex(xs - sign * e * (1 - Math.sin(a)), p.y - p.ny * inward, p.z - p.nz * inward, sign * Math.sin(a), p.ny * Math.cos(a), p.nz * Math.cos(a));
        })
      );
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        for (let k = 0; k < steps; k++) {
          triangle(rows[i][k], rows[i][k + 1], rows[j][k + 1]);
          triangle(rows[i][k], rows[j][k + 1], rows[j][k]);
        }
      }
    }
    const cap = sides.cap[side];
    if (cap) {
      // The flat side: the outline drawn in by the rounds (or the patch given).
      const contour: THREE.Vector2[] = [];
      const outline = cap === true ? ring.map((p) => [p.z - p.nz * edgeOf(p, side), p.y - p.ny * edgeOf(p, side)] as const) : cap;
      for (const [z, y] of outline) {
        const point = new THREE.Vector2(z, y);
        if (!contour.length || contour[contour.length - 1].distanceTo(point) > 1e-7) contour.push(point);
      }
      if (contour[0].distanceTo(contour[contour.length - 1]) <= 1e-7) contour.pop();
      const ids = contour.map((p) => vertex(xs, p.y, p.x, sign, 0, 0));
      for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, [])) triangle(ids[a], ids[b], ids[c]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A flat strip `width` wide along a path in a side plane at `x` (points in
 * z and y with their normals in that plane), facing `sign` along X: the
 * case's seam drawn on its sides.
 */
export function sideRibbon(path: readonly { z: number; y: number; nz: number; ny: number }[], x: number, sign: 1 | -1, width: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  path.forEach((p, i) => {
    positions.push(x, p.y + (p.ny * width) / 2, p.z + (p.nz * width) / 2, x, p.y - (p.ny * width) / 2, p.z - (p.nz * width) / 2);
    if (i === 0) return;
    const a = 2 * (i - 1);
    // Wound to face +X or −X.
    if (sign > 0) indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    else indices.push(a, a + 3, a + 1, a, a + 2, a + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
