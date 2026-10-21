import { capFoot, capTop, capTopHeight, plateToBoard, type Key } from "./keyboard";

/**
 * Every key cap of the keyboard as one mesh, so the whole board is one draw
 * call: positions in the keyboard's frame (`room/keyboard.ts`), texture
 * coordinates into the legend atlas, and for each vertex the key it belongs
 * to (the shader pushes a pressed key's vertices down, and a click finds the
 * key from the face it hit) and whether the key is a gray one.
 *
 * A cap is a tapered box: a foot on the plate, a smaller top that leans with
 * its row and is dished across (`capTopHeight`), and four sloping sides. The
 * top is split into strips across so the dish curves; the sides get their
 * own vertices, so they shade flat while the top shades smooth.
 */

/** The legend atlas: pixels for the depth of a key top, and the canvas's width. */
export const LEGEND_CELL = 128;
export const ATLAS_WIDTH = 2048;
const ATLAS_PAD = 4;
/** The atlas's top left corner is left blank: the caps' sides look it up, so they take the cap's colour unprinted. */
const BLANK_CORNER = 8;

export type AtlasCell = { left: number; top: number; width: number; height: number };
export type LegendAtlas = { width: number; height: number; cells: AtlasCell[]; blank: [number, number] };

/**
 * Where each key's legend is drawn in the atlas. A cell has the proportions
 * of the key's top, so the text is not stretched on the cap; cells are packed
 * in shelves left to right.
 */
export function legendAtlas(keys: readonly Key[]): LegendAtlas {
  const cells: AtlasCell[] = [];
  let x = BLANK_CORNER + ATLAS_PAD;
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
  return { width: ATLAS_WIDTH, height, cells, blank: [2.5 / ATLAS_WIDTH, 1 - 2.5 / height] };
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

type V3 = [number, number, number];

/** How many strips a key top is split into across: enough for its dish to read as a curve. */
function strips(key: Key): number {
  return Math.max(4, Math.round(key.units * 6));
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
    const n = strips(key);
    const vertex = (plate: V3, uv: [number, number]): number => {
      const p = plateToBoard(plate);
      positions.push(p[0], p[1], p[2]);
      uvs.push(uv[0], uv[1]);
      owner.push(key.index);
      mods.push(key.mod ? 1 : 0);
      return positions.length / 3 - 1;
    };
    // a → b → c → d, counter-clockwise seen from outside.
    const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d);

    const topPoint = (u: number, v: number): V3 => [key.x + u * top.width, capTopHeight(key, u, v), key.z + top.dz + v * top.depth];
    const footPoint = (u: number, v: number): V3 => [key.x + u * foot.width, 0, key.z + v * foot.depth];
    const atlasUv = (u: number, v: number): [number, number] => [
      (cell.left + (u + 0.5) * cell.width) / atlas.width,
      1 - (cell.top + (v + 0.5) * cell.height) / atlas.height,
    ];

    // The top: back and front edges, n strips across, shared vertices so the dish shades smooth.
    const back: number[] = [];
    const front: number[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n - 0.5;
      back.push(vertex(topPoint(u, -0.5), atlasUv(u, -0.5)));
      front.push(vertex(topPoint(u, 0.5), atlasUv(u, 0.5)));
    }
    for (let i = 0; i < n; i++) quad(back[i], front[i], front[i + 1], back[i + 1]);

    // The front and back sides follow the top's edge, strip by strip.
    for (let i = 0; i < n; i++) {
      const u0 = i / n - 0.5;
      const u1 = (i + 1) / n - 0.5;
      const f = [footPoint(u0, 0.5), footPoint(u1, 0.5), topPoint(u1, 0.5), topPoint(u0, 0.5)].map((p) => vertex(p, atlas.blank));
      quad(f[0], f[1], f[2], f[3]);
      const b = [footPoint(u1, -0.5), footPoint(u0, -0.5), topPoint(u0, -0.5), topPoint(u1, -0.5)].map((p) => vertex(p, atlas.blank));
      quad(b[0], b[1], b[2], b[3]);
    }
    // The left and right sides.
    const left = [footPoint(-0.5, -0.5), footPoint(-0.5, 0.5), topPoint(-0.5, 0.5), topPoint(-0.5, -0.5)].map((p) => vertex(p, atlas.blank));
    quad(left[0], left[1], left[2], left[3]);
    const right = [footPoint(0.5, 0.5), footPoint(0.5, -0.5), topPoint(0.5, -0.5), topPoint(0.5, 0.5)].map((p) => vertex(p, atlas.blank));
    quad(right[0], right[1], right[2], right[3]);
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    keys: new Float32Array(owner),
    mods: new Float32Array(mods),
    indices: new Uint32Array(indices),
  };
}

