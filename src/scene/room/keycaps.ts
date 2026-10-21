import { CAP, capFoot, capTop, capTopHeight, plateToBoard, roundedRectOutline, type Key } from "./keyboard";

/**
 * Every key cap of the keyboard as one mesh, so the whole board is one draw
 * call: positions in the keyboard's frame (`room/keyboard.ts`), texture
 * coordinates into the legend atlas, and for each vertex the key it belongs
 * to (the shader pushes a pressed key's vertices down, and a click finds the
 * key from the face it hit) and whether the key is a gray one.
 *
 * A cap is lofted through rings of rounded rectangles (`capRing`): the foot
 * on the plate, the top's edge, then over a small round onto the top, which
 * leans with its row and is dished across (`capTopHeight`); two smaller rings
 * and the middle shape the dish. Every corner is rounded (`CAP.footRadius`,
 * `topRadius`, `topRound`) — the user's close-ups show no sharp edge on a
 * cap. Vertices are shared all round, so the cap shades smooth; the sides
 * take the texture's colour at the top's edge, which is unprinted.
 */

/** The legend atlas: pixels for the depth of a key top, and the canvas's width. */
export const LEGEND_CELL = 128;
export const ATLAS_WIDTH = 2048;
const ATLAS_PAD = 4;

export type AtlasCell = { left: number; top: number; width: number; height: number };
export type LegendAtlas = { width: number; height: number; cells: AtlasCell[] };

/**
 * Where each key's legend is drawn in the atlas. A cell has the proportions
 * of the key's top, so the text is not stretched on the cap; cells are packed
 * in shelves left to right.
 */
export function legendAtlas(keys: readonly Key[]): LegendAtlas {
  const cells: AtlasCell[] = [];
  let x = ATLAS_PAD;
  let y = 0;
  for (const key of keys) {
    const top = capTop(key);
    const width = Math.round((LEGEND_CELL * top.width) / top.depth);
    if (x + width + ATLAS_PAD > ATLAS_WIDTH) {
      x = ATLAS_PAD;
      y += LEGEND_CELL + ATLAS_PAD;
    }
    cells.push({ left: x, top: y, width, height: LEGEND_CELL });
    x += width + ATLAS_PAD;
  }
  const used = y + LEGEND_CELL;
  let height = 1;
  while (height < used) height *= 2;
  return { width: ATLAS_WIDTH, height, cells };
}

export type KeycapMesh = {
  positions: Float32Array;
  uvs: Float32Array;
  /** Per vertex: the key's index. */
  keys: Float32Array;
  /** Per vertex: 1 for a gray key, 0 for a white one. */
  mods: Float32Array;
  indices: Uint32Array;
};

/** How many segments to each rounded corner of a cap. */
const ARC_STEPS = 3;

/**
 * A rounded rectangle as a ring of points for lofting, centred on (x, z):
 * the corners from `roundedRectOutline`, and the straight edges split —
 * front and back into `along` segments (so the dish curves along them),
 * the sides into `across`. Rings made with the same counts line up point for
 * point, so two of them can be joined with quads.
 */
export function capRing(x: number, z: number, width: number, depth: number, radius: number, along: number, across: number): { x: number; z: number }[] {
  const corners = roundedRectOutline(width, depth, radius, ARC_STEPS);
  const perCorner = ARC_STEPS + 1;
  const ring: { x: number; z: number }[] = [];
  for (let c = 0; c < 4; c++) {
    for (let i = 0; i < perCorner; i++) ring.push(corners[c * perCorner + i]);
    // The edge from this corner's last point to the next corner's first: right side, front, left side, back.
    const from = corners[c * perCorner + perCorner - 1];
    const to = corners[((c + 1) % 4) * perCorner];
    const segments = c % 2 === 0 ? across : along;
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      ring.push({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
    }
  }
  return ring.map((p) => ({ x: x + p.x, z: z + p.z }));
}

export function keycapMesh(keys: readonly Key[], atlas: LegendAtlas): KeycapMesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const owner: number[] = [];
  const mods: number[] = [];
  const indices: number[] = [];

  for (const key of keys) {
    const cell = atlas.cells[key.index];
    const foot = capFoot(key);
    const top = capTop(key);
    const topZ = key.z + top.dz;
    const along = Math.max(2, Math.round(key.units * 3));
    const across = 2;
    // Where a point lies on the top, from −½ to ½ each way; outside the top (the foot) it is clamped to the edge.
    const uv = (x: number, z: number): [number, number] => [
      Math.max(-0.5, Math.min(0.5, (x - key.x) / top.width)),
      Math.max(-0.5, Math.min(0.5, (z - topZ) / top.depth)),
    ];
    const ringAt = (points: { x: number; z: number }[], height: (u: number, v: number) => number): number[] =>
      points.map(({ x, z }) => {
        const [u, v] = uv(x, z);
        const p = plateToBoard([x, height(u, v), z]);
        positions.push(p[0], p[1], p[2]);
        // The texture follows the top; the sides take the colour at the top's edge, which is unprinted.
        uvs.push((cell.left + (u + 0.5) * cell.width) / atlas.width, 1 - (cell.top + (v + 0.5) * cell.height) / atlas.height);
        owner.push(key.index);
        mods.push(key.mod ? 1 : 0);
        return positions.length / 3 - 1;
      });
    const surface = (u: number, v: number) => capTopHeight(key, u, v);
    const r = CAP.topRadius;
    const f = CAP.topRound;
    const rings = [
      // The foot, on the plate.
      ringAt(capRing(key.x, key.z, foot.width, foot.depth, CAP.footRadius, along, across), () => 0),
      // The top's edge, just under the round onto the top.
      ringAt(capRing(key.x, topZ, top.width, top.depth, r, along, across), (u, v) => surface(u, v) - f),
      // The top itself, the round's width in, and two rings further in for the dish.
      ...[1, 0.66, 0.33].map((scale) =>
        ringAt(
          capRing(key.x, topZ, (top.width - 2 * f) * scale, (top.depth - 2 * f) * scale, Math.max(1e-4, (r - f) * scale), along, across),
          surface
        )
      ),
    ];
    const [cu, cv] = uv(key.x, topZ);
    const middle = ringAt([{ x: key.x, z: topZ }], () => surface(cu, cv))[0];
    // Join each ring to the next, outward faces counter-clockwise; close the top with a fan.
    for (let k = 0; k + 1 < rings.length; k++) {
      const a = rings[k];
      const b = rings[k + 1];
      for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        indices.push(a[i], b[i], b[j], a[i], b[j], a[j]);
      }
    }
    const last = rings[rings.length - 1];
    for (let i = 0; i < last.length; i++) indices.push(last[i], middle, last[(i + 1) % last.length]);
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    keys: new Float32Array(owner),
    mods: new Float32Array(mods),
    indices: new Uint32Array(indices),
  };
}
