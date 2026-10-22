"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MAC_MOUSE } from "../room/layout";
import { MAC_COLOURS } from "../room/macCase";
import { M0100, M0100_BUTTON, M0100_CORD, M0100_MARK, M0100_SHAPE, M0100_TOP, macMouseCord, onMacButton } from "../room/macMouse";
import { MAC_SCREEN } from "../room/screens";
import { MAC_MAPPING, macPointer } from "../deskPointer";
import { useDeskMouse, type MousePart } from "./useDeskMouse";
import { shapeOf, slab } from "./caseShapes";
import { roundedRectOutline, type OutlinePoint } from "../room/keyboard";

/**
 * The Macintosh's mouse, an M0100 (`room/macMouse.ts`, its measurements):
 * straight walls most of the way up, then the top slopes in — steeply at
 * the sides and the front, long and low at the back — to a flat top; one
 * square button in a slightly grayer beige, sunk in its opening at the top's
 * front; the sunk square of the maker's mark at the top's back left, with
 * Miiiwa's "M" in place of the maker's apple; the parting line between the
 * two shells low round the sides; its cord out of the front, back to the
 * Mac's mouse port — following the mouse as it slides (`macMouseCord`).
 *
 * **It moves as the PC's mouse does** (`useDeskMouse`, shared with the
 * EX-G): pressed, its button clicks; held still, it is in the hand and
 * slides; and while the reader's pointer is on the Mac's screen it goes
 * where the pointer is, and the reader's buttons press its one button. Its
 * place is the cursor's on the Mac's screen (`macPointer`, drawn by
 * `Macintosh`). The click is the EX-G's recording for now (**仮**).
 *
 * Colours are `MAC_COLOURS` (photo 7's): the Mac's plastic, and the button
 * `#8a724d`, the keys' grey-brown (the first value, 4.png's `#bbab93`, was
 * too light).
 */

const COLOURS = {
  case: MAC_COLOURS.plastic,
  button: MAC_COLOURS.button,
  gap: MAC_COLOURS.gap,
  line: MAC_COLOURS.well,
  mark: MAC_COLOURS.mark,
  cord: MAC_COLOURS.cord,
} as const;
const { width: W, length: L, height: H } = M0100;
const S = M0100_SHAPE;
/** The button's opening round it, and the button's own thickness and how far its top sits under the top. */
const OPENING = { gap: 0.0008, depth: 0.004, corner: 0.0012 } as const;
const BUTTON = { thickness: 0.003, under: 0.0003 } as const;
/** The cord's tube along `macMouseCord` (resting on the desk and the mat), the mouse `at` where it has slid to and the cord dragging after it from `trail`. */
function cordTube(at: readonly [number, number], trail: readonly [number, number]): THREE.TubeGeometry {
  const points = macMouseCord(at, trail);
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  return new THREE.TubeGeometry(path, 4 * (points.length - 1), M0100_CORD.wire, 6, false);
}

/** An outline (top view) at a height, moved along the mouse by `dz`. */
type Ring = { points: OutlinePoint[]; y: number; dz: number };

/** The walls between two outlines with the same number of points (one height to another). */
function loft(a: Ring, b: Ring): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const r of [a, b]) for (const p of r.points) positions.push(p.x, r.y, p.z + r.dz);
  const n = a.points.length;
  // Wound to face out: the first quad's normal against its outline's outward normal.
  const v = (i: number) => new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
  const facing = new THREE.Vector3().subVectors(v(1), v(0)).cross(new THREE.Vector3().subVectors(v(n + 1), v(0)));
  const out = facing.x * a.points[0].nx + facing.z * a.points[0].nz > 0;
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (out) indices.push(i, j, n + j, i, n + j, n + i);
    else indices.push(i, n + j, j, i, n + i, n + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The mark: Miiiwa's "M" pressed into a sunk rounded square, drawn as its shadowed rim and the letter's outline. */
function makeMark(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLOURS.mark;
  ctx.beginPath();
  ctx.roundRect(1, 1, 62, 62, 9);
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 62, 44, 0.55)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = "bold 40px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(70, 62, 44, 0.5)";
  ctx.strokeText("M", 32, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function MacMouse({ typing }: { typing: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const button = useRef<THREE.Mesh>(null);

  const mark = useMemo(() => makeMark(), []);
  const materials = useMemo(
    () => ({
      case: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.6, metalness: 0 }),
      button: new THREE.MeshStandardMaterial({ color: COLOURS.button, roughness: 0.55, metalness: 0 }),
      gap: new THREE.MeshStandardMaterial({ color: COLOURS.gap, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
      line: new THREE.MeshStandardMaterial({ color: COLOURS.line, roughness: 0.8, metalness: 0 }),
      mark: new THREE.MeshStandardMaterial({ map: mark, roughness: 0.65, metalness: 0, transparent: true }),
      cord: new THREE.MeshStandardMaterial({ color: COLOURS.cord, roughness: 0.5, metalness: 0 }),
    }),
    [mark]
  );

  const shape = useMemo(() => {
    const foot = roundedRectOutline(W, L, S.corner, 6);
    const top = roundedRectOutline(M0100_TOP.width, M0100_TOP.length, S.topCorner, 6);
    // The flat top, with the button's opening through it.
    const lid = shapeOf(top);
    const opening = roundedRectOutline(M0100_BUTTON.width + 2 * OPENING.gap, M0100_BUTTON.length + 2 * OPENING.gap, OPENING.corner, 4);
    const openingAt = M0100_BUTTON.z - M0100_TOP.z;
    lid.holes.push(new THREE.Path(opening.map((p) => new THREE.Vector2(p.x, -(p.z + openingAt)))));
    const lidGeometry = new THREE.ShapeGeometry(lid, 6);
    lidGeometry.rotateX(-Math.PI / 2);
    lidGeometry.translate(0, H, M0100_TOP.z);
    // The line between the shells: a band a hair proud of the walls, round their rounded corners.
    const proud = 0.0003;
    const band = shapeOf(roundedRectOutline(W + 2 * proud, L + 2 * proud, S.corner + proud, 6));
    band.holes.push(new THREE.Path(foot.map((p) => new THREE.Vector2(p.x, -p.z))));
    return {
      walls: loft({ points: foot, y: 0, dz: 0 }, { points: foot, y: S.shoulder, dz: 0 }),
      slopes: loft({ points: foot, y: S.shoulder, dz: 0 }, { points: top, y: H, dz: M0100_TOP.z }),
      lid: lidGeometry,
      opening: loft({ points: opening, y: H, dz: M0100_BUTTON.z }, { points: opening, y: H - OPENING.depth, dz: M0100_BUTTON.z }),
      line: slab(band, () => S.parting.from, () => S.parting.to),
    };
  }, []);

  // The cord, in the desk's frame: rebuilt in place while the mouse, or the cord dragging after it, moves.
  const cord = useMemo(() => cordTube([0, 0], [0, 0]), []);
  const motion = useRef({ at: [0, 0] as [number, number], trail: [0, 0] as [number, number] });
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const m = motion.current;
    const at: [number, number] = [g.position.x - MAC_MOUSE.x, g.position.z - MAC_MOUSE.z];
    const settle = 1 - Math.exp(-delta * M0100_CORD.follow);
    const trail: [number, number] = [m.trail[0] + (at[0] - m.trail[0]) * settle, m.trail[1] + (at[1] - m.trail[1]) * settle];
    const moved = Math.hypot(at[0] - m.at[0], at[1] - m.at[1]) > 1e-6 || Math.hypot(trail[0] - m.trail[0], trail[1] - m.trail[1]) > 1e-6;
    if (!moved) return;
    m.at = at;
    m.trail = Math.hypot(at[0] - trail[0], at[1] - trail[1]) < 1e-5 ? at : trail;
    const next = cordTube(m.at, m.trail);
    (cord.attributes.position as THREE.BufferAttribute).copyArray(next.attributes.position.array).needsUpdate = true;
    (cord.attributes.normal as THREE.BufferAttribute).copyArray(next.attributes.normal.array).needsUpdate = true;
    cord.computeBoundingSphere();
    next.dispose();
  });
  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(shape).forEach((g) => g.dispose());
      cord.dispose();
      mark.dispose();
    },
    [materials, shape, cord, mark]
  );

  const rest = H - BUTTON.under - BUTTON.thickness / 2;
  const bind = useDeskMouse({
    group,
    machine: "mac",
    rest: MAC_MOUSE,
    mapping: MAC_MAPPING,
    panel: MAC_SCREEN,
    channel: macPointer,
    seated: typing,
    buttons: [0],
    partOf: (_object, local): MousePart => (local.y > H - 0.003 && onMacButton(local.x, local.z) ? 0 : "body"),
    pieces: () => [body.current, button.current].filter((o): o is THREE.Group | THREE.Mesh => !!o),
    onPress: (depth) => {
      if (button.current) button.current.position.y = rest - M0100_BUTTON.travel * depth[0];
    },
  });

  return (
    <>
      <group ref={group} position={[MAC_MOUSE.x, MAC_MOUSE.y, MAC_MOUSE.z]} {...bind}>
        <group ref={body}>
          <mesh geometry={shape.walls} material={materials.case} />
          <mesh geometry={shape.slopes} material={materials.case} />
          <mesh geometry={shape.lid} material={materials.case} />
        </group>
        {/* The button's opening, dark down its sides, and the button sunk in it. */}
        <mesh geometry={shape.opening} material={materials.gap} raycast={() => null} />
        <RoundedBox ref={button} args={[M0100_BUTTON.width, BUTTON.thickness, M0100_BUTTON.length]} radius={0.0008} smoothness={2} position={[0, rest, M0100_BUTTON.z]} material={materials.button} />
        {/* The sunk mark at the top's back left. */}
        <mesh position={[M0100_MARK.x, H + 0.0002, M0100_MARK.z]} rotation={[-Math.PI / 2, 0, 0]} material={materials.mark} raycast={() => null}>
          <planeGeometry args={[M0100_MARK.size, M0100_MARK.size]} />
        </mesh>
        {/* The line between the two shells, low round the sides. */}
        <mesh geometry={shape.line} material={materials.line} raycast={() => null} />
      </group>
      {/* The cord, outside the mouse's group: one end follows the mouse, the other stays in the Mac's port. */}
      <mesh geometry={cord} material={materials.cord} raycast={() => null} frustumCulled={false} />
    </>
  );
}
