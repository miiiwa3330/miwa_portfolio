import * as THREE from "three";
import type { OutlinePoint } from "../room/keyboard";

/**
 * Pieces for building a keyboard's case from top-view outlines: standing an
 * outline up between two heights, and rounding its top edge. Shared by the
 * HHKB (`HhkbKeyboard`) and the Macintosh's keyboard (`MacKeyboard`), which
 * build their cases the same way — see `HhkbKeyboard`'s `useCase` for why
 * not with three.js's extrusion bevel.
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
