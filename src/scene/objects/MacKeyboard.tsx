"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DESK_TOP_Y, MAC, macKeyboardPlace, macToDesk } from "../room/layout";
import { roundedRectOutline } from "../room/keyboard";
import { keycapMesh, legendAtlas } from "../room/keycaps";
import { M0110, M0110_TILT_DEG, MAC_CAPS, macKeyboardKeys, macPlaneHeightAt } from "../room/macKeyboard";
import { fillet, shapeOf, slab } from "./caseShapes";
import { makeMacLegendTexture, makeMacLipTexture } from "./macKeyboardLegends";

/**
 * The Macintosh's keyboard, an M0110 (`room/macKeyboard.ts`), in front of the
 * Mac (`macKeyboardPlace`), its coiled cord running back to the Mac's front:
 * a beige case with a wide front lip and a groove along it, the keys sunk in
 * a well, 58 gray caps and a tan space bar, printed small at the top left
 * (`macKeyboardLegends.ts`); the owner's name pressed into the lip where the
 * maker's apple is. Built as the HHKB is: all the caps one mesh
 * (`keycapMesh` with the M0110's cap shape), the case from outlines
 * (`caseShapes.ts`).
 *
 * **The keys do not move yet**: they will press when the Mac's game takes
 * the keyboard (step 8, docs/devlog/202610.md). Each vertex already knows its
 * key (`aKey`), as on the HHKB.
 *
 * Colours are `reference/4/マッキントッシュ2.webp`'s medians (sRGB): the caps'
 * tops `#a4a294`, the space bar `#c1ad73`, the lip `#bea87b`.
 */

const COLOURS = { cap: "#a4a294", space: "#c1ad73", case: "#bea87b", well: "#8a7f5d", groove: "#8f835c" } as const;
/** The rim stands this far over the plate, the well's floor this far under it; the case's top edge and corners are this round (**仮**). */
const RIM = 0.003;
const FLOOR = -0.002;
const EDGE = 0.002;
const CORNER = 0.007;
/** The groove along the lip, this far in from the front edge (**仮**, from the photo's line). */
const GROOVE_IN = 0.008;
/** The cord: where it leaves the keyboard (its frame) and enters the Mac (the Mac's frame), and the coil's radius, pitch and wire (**仮**). */
const CORD = { from: [-0.05, 0.012, -M0110.depth / 2] as const, to: [0.08, 0.015, MAC.depth / 2] as const, radius: 0.0045, pitch: 0.0042, wire: 0.0013 };

const KEYS = macKeyboardKeys();
const TILT = (M0110_TILT_DEG * Math.PI) / 180;

/** The case: the well's floor, the rim round it with its outer top edge rounded (the same three pieces as the HHKB's case). */
function useCase() {
  const parts = useMemo(() => {
    const top = (z: number) => macPlaneHeightAt(z, RIM);
    const floor = (z: number) => macPlaneHeightAt(z, FLOOR);
    const { block } = M0110;
    const c = 0.0012;
    const wellBack = -M0110.depth / 2 + block.back - c;
    const wellFront = wellBack + block.depth + 2 * c;
    const half = block.width / 2 + c;
    // The bottom row starts 1.25 units in: the case fills the blank left of the left Option.
    const notchX = -block.width / 2 + 1.25 * M0110.pitch - c;
    const notchZ = wellFront - M0110.pitch;
    const well = [
      { x: -half, z: wellBack },
      { x: half, z: wellBack },
      { x: half, z: wellFront },
      { x: notchX, z: wellFront },
      { x: notchX, z: notchZ },
      { x: -half, z: notchZ },
    ];
    const outer = roundedRectOutline(M0110.width, M0110.depth, CORNER, 6);
    const inner = roundedRectOutline(M0110.width - 2 * EDGE, M0110.depth - 2 * EDGE, CORNER - EDGE, 6);
    const rim = shapeOf(inner);
    rim.holes.push(new THREE.Path(well.map((p) => new THREE.Vector2(p.x, -p.z))));
    const skirt = shapeOf(outer);
    skirt.holes.push(new THREE.Path(inner.map((p) => new THREE.Vector2(p.x, -p.z))));
    return {
      floor: slab(shapeOf(well), () => 0, floor),
      rim: slab(rim, () => 0, top),
      skirt: slab(skirt, () => 0, (z) => top(z) - EDGE),
      round: fillet(outer, EDGE, top),
    };
  }, []);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  return parts;
}

/** The coiled cord: a helix wound round a path that leaves the keyboard's back, lies on the desk and climbs to the Mac's jack. */
function useCord(): THREE.TubeGeometry {
  const geometry = useMemo(() => {
    const place = macKeyboardPlace();
    const c = Math.cos(place.yaw);
    const s = Math.sin(place.yaw);
    const board = (p: readonly [number, number, number]) =>
      new THREE.Vector3(place.x + p[0] * c + p[2] * s, DESK_TOP_Y + p[1], place.z - p[0] * s + p[2] * c);
    const from = board(CORD.from);
    const to = new THREE.Vector3(...macToDesk(CORD.to));
    const lying = DESK_TOP_Y + CORD.radius + CORD.wire;
    const path = new THREE.CatmullRomCurve3([
      from,
      new THREE.Vector3(from.x, lying, from.z - 0.012),
      new THREE.Vector3((from.x + to.x) / 2 + 0.03, lying, (from.z + to.z) / 2),
      new THREE.Vector3(to.x, lying, to.z + 0.015),
      to,
    ]);
    const turns = path.getLength() / CORD.pitch;
    const samples = Math.ceil(turns * 10);
    const frames = path.computeFrenetFrames(samples, false);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const a = t * turns * Math.PI * 2;
      const p = path.getPointAt(t);
      points.push(p.addScaledVector(frames.normals[i], CORD.radius * Math.cos(a)).addScaledVector(frames.binormals[i], CORD.radius * Math.sin(a)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), samples, CORD.wire, 5, false);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export default function MacKeyboard() {
  const atlas = useMemo(() => legendAtlas(KEYS, MAC_CAPS), []);
  const caps = useMemo(() => {
    const mesh = keycapMesh(KEYS, atlas, MAC_CAPS);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
    g.setAttribute("aKey", new THREE.BufferAttribute(mesh.keys, 1));
    const cap = new THREE.Color(COLOURS.cap);
    const space = new THREE.Color(COLOURS.space);
    const colours = new Float32Array(mesh.keys.length * 3);
    mesh.keys.forEach((k, i) => (KEYS[k].mod ? space : cap).toArray(colours, i * 3));
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [atlas]);
  const legends = useMemo(() => makeMacLegendTexture(KEYS, atlas), [atlas]);
  const lip = useMemo(() => makeMacLipTexture(), []);
  const shell = useCase();
  const cord = useCord();
  const materials = useMemo(
    () => ({
      caps: new THREE.MeshStandardMaterial({ vertexColors: true, map: legends, roughness: 0.58, metalness: 0 }),
      case: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.62, metalness: 0 }),
      well: new THREE.MeshStandardMaterial({ color: COLOURS.well, roughness: 0.75, metalness: 0 }),
      groove: new THREE.MeshStandardMaterial({ color: COLOURS.groove, roughness: 0.7, metalness: 0 }),
      cord: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.55, metalness: 0 }),
    }),
    [legends]
  );
  useEffect(
    () => () => {
      [caps, legends, lip, ...Object.values(materials)].forEach((x) => x.dispose());
    },
    [caps, legends, lip, materials]
  );

  const place = macKeyboardPlace();
  // The lip: in front of the well, on the tilted top. The groove runs along it; the name sits at its left.
  const lipZ = (M0110.depth / 2 - GROOVE_IN + (-M0110.depth / 2 + M0110.block.back + M0110.block.depth)) / 2;
  const onLip = (x: number, z: number, lift: number): [number, number, number] => [x, macPlaneHeightAt(z, RIM) + lift, z];

  return (
    <>
      <group position={[place.x, DESK_TOP_Y, place.z]} rotation={[0, place.yaw, 0]}>
        <mesh geometry={shell.rim} material={materials.case} />
        <mesh geometry={shell.skirt} material={materials.case} />
        <mesh geometry={shell.round} material={materials.case} />
        <mesh geometry={shell.floor} material={materials.well} />
        <mesh position={onLip(0, M0110.depth / 2 - GROOVE_IN, 0.0002)} rotation={[TILT - Math.PI / 2, 0, 0]} material={materials.groove}>
          <planeGeometry args={[M0110.width - 2 * CORNER, 0.0012]} />
        </mesh>
        <mesh position={onLip(-M0110.block.width / 2 + 0.03, lipZ, 0.0002)} rotation={[TILT - Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.032, 0.008]} />
          <meshStandardMaterial map={lip} transparent depthWrite={false} roughness={0.62} />
        </mesh>
        <mesh geometry={caps} material={materials.caps} />
      </group>
      <mesh geometry={cord} material={materials.cord} />
    </>
  );
}
