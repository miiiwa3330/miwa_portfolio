"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  FOREARM,
  HEAD_BEHIND_EYE,
  HEAD_OVER_EYE,
  HIP_HALF,
  SHIN,
  SHOULDER_HALF,
  THIGH,
  TORSO_DEPTH,
  TORSO_HALF_WIDTH,
  UPPER_ARM,
  bodyJoints,
  type BodyJoints,
} from "../room/self";
import { FIGURE, TORSO } from "../room/figure";
import { bodyNow, viewNow } from "../camera/viewChannel";
import { seatShare } from "../room/seat";
import { deskPointerNow } from "../deskPointer";
import { HEAD_LAYER } from "../layers";
import { hash01 } from "../hash";
import { SKIN, makeFaceTexture } from "./figureTextures";

/**
 * The reader's own body — the room's owner, after the character sheet
 * (`reference/4/3.png`, Studio Wrong's look): messy black hair in clumps,
 * thin black glasses, a loose black T-shirt, wide black cargo trousers and
 * chunky grey sneakers, in the sheet's palette. Sized from the sheet
 * (`room/figure.ts`); its joints are `room/self.ts`'s.
 *
 * Every part is a rigid piece on a bone, moved every frame from the joints
 * (`placeBone`): the bones keep their lengths (the limbs bend, they never
 * stretch), so the pieces can be built at their real size once. The wide
 * trousers and the sleeves hide where the pieces meet.
 *
 * Moved every frame from the camera's published pose and the walk the camera
 * worked out from it (`bodyNow`), so it walks a flight, shuffles round a
 * drag and sits down at the PC without being told about any of them. Nothing
 * here takes the pointer: the reader's own rays start inside it. The head
 * and everything on it is on `HEAD_LAYER`: the reader's eye is inside it.
 */

/** The sheet's palette (top right of `reference/4/3.png`), sampled. */
const COLOURS = {
  shirt: "#2f2b2a",
  trousers: "#262223",
  hair: "#231f1e",
  frames: "#161213",
  shoeUpper: "#544c48",
  shoeSole: "#d2c3b6",
  outsole: "#2f2b2a",
  watch: "#141213",
} as const;

const noRaycast = () => null;

const X = new THREE.Vector3();
const Y = new THREE.Vector3();
const Z = new THREE.Vector3();
const ACROSS = new THREE.Vector3();
const OUT = [new THREE.Vector3(), new THREE.Vector3()];
const BASIS = new THREE.Matrix4();

/**
 * Put `object` at `from`, its +Y pointing at `to`, and its +X as near
 * `across` as that allows — so a part built along +Y lies along the bone,
 * turned the way the body faces (a pocket stays on the outside of the leg).
 */
function placeBone(object: THREE.Object3D | null | undefined, from: readonly number[], to: readonly number[], across: THREE.Vector3) {
  if (!object) return;
  object.position.set(from[0], from[1], from[2]);
  Y.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
  X.copy(across).addScaledVector(Y, -across.dot(Y)).normalize();
  Z.crossVectors(X, Y);
  object.quaternion.setFromRotationMatrix(BASIS.makeBasis(X, Y, Z));
}

/** A tube along +Y from 0 to `length`, `from` wide at the root and `to` at the end. */
function Limb({ length, from, to }: { length: number; from: number; to: number }) {
  return (
    <mesh position={[0, length / 2, 0]} raycast={noRaycast}>
      <cylinderGeometry args={[to, from, length, 14]} />
      <Skin />
    </mesh>
  );
}

/**
 * Skin, warmed from inside. Under the room's cool neon the sheet's skin tone
 * came out grey; a little emission of its own (through the face's own map,
 * so the eyes and brows stay dark) keeps it the colour the sheet paints it.
 */
function Skin({ map }: { map?: THREE.Texture }) {
  // With the face's map, the map carries the skin tone itself.
  // Less of it on the hands and arms: under the desk lamp they came out white.
  return (
    <meshStandardMaterial color={map ? "#ffffff" : SKIN} map={map} roughness={0.65} emissive="#93492a" emissiveIntensity={map ? 0.32 : 0.12} emissiveMap={map} />
  );
}

function Cloth({ color }: { color: string }) {
  // Cotton and canvas: matte, with a soft sheen where the light grazes.
  return <meshPhysicalMaterial color={color} roughness={0.92} sheen={0.6} sheenRoughness={0.8} sheenColor="#5c5654" />;
}

/** The hair: a cap over the skull and clumps on it, as the sheet draws it (シンプルな束で表現). */
function useHair() {
  const clump = useMemo(() => {
    // A flattened teardrop, root at the origin and tip up +Y.
    const profile = [
      [0, 0],
      [0.45, 0.06],
      [0.5, 0.3],
      [0.38, 0.65],
      [0.16, 0.92],
      [0, 1],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(profile, 8);
  }, []);
  const layout = useMemo(() => {
    // Head-local: −Z forward, +X right, +Y up; the cap's centre and size.
    // Reaching a little under the skull at the back (the skull's bottom is 12.4 cm under its middle).
    const centre = new THREE.Vector3(0, 0, 0.015);
    const size = new THREE.Vector3(0.132, 0.155, 0.135);
    const on = (azimuth: number, elevation: number) => {
      const a = (azimuth * Math.PI) / 180;
      const e = (elevation * Math.PI) / 180;
      const n = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
      return { point: n.clone().multiply(size).add(centre), normal: n };
    };
    const clumps: THREE.Matrix4[] = [];
    const add = (azimuth: number, elevation: number, length: number, width: number, droop: number, sweep: number, seed: number) => {
      const { point, normal } = on(azimuth, elevation);
      // Down the head from the crown, tilted out by `droop`'s complement, swept sideways.
      const down = on(azimuth, elevation - 5).point.sub(point).normalize();
      const side = new THREE.Vector3().crossVectors(normal, down).normalize();
      const dir = down
        .clone()
        .multiplyScalar(droop)
        .addScaledVector(normal, 1 - droop)
        .addScaledVector(side, sweep + (hash01(seed) - 0.5) * 0.4)
        .normalize();
      const x = new THREE.Vector3().crossVectors(dir, normal).normalize();
      const z = new THREE.Vector3().crossVectors(x, dir);
      const m = new THREE.Matrix4().makeBasis(x, dir, z);
      m.scale(new THREE.Vector3(width, length * (0.85 + hash01(seed + 7) * 0.3), width * 0.55));
      m.setPosition(point.addScaledVector(normal, -0.012));
      clumps.push(m);
    };
    let seed = 900;
    // The crown: short tufts every way, a little untidy.
    for (let i = 0; i < 12; i++) add(i * 30 + hash01(seed++) * 20, 58 + hash01(seed++) * 18, 0.08, 0.065, 0.8, 0.2, seed++);
    // Sides and back, falling over the ears' tops and to the nape.
    for (let i = 0; i < 16; i++) add(55 + i * 16 + hash01(seed++) * 8, 18 + hash01(seed++) * 22, 0.11, 0.07, 0.88, 0, seed++);
    // The fringe, down to the brows and swept a little to one side.
    for (let i = 0; i < 9; i++) add(-44 + i * 11 + hash01(seed++) * 5, 34 + hash01(seed++) * 10, 0.1, 0.065, 0.92, 0.35, seed++);
    // The nape, short.
    for (let i = 0; i < 7; i++) add(140 + i * 13 + hash01(seed++) * 6, -8 + hash01(seed++) * 14, 0.07, 0.06, 0.92, 0, seed++);
    // Strays.
    for (let i = 0; i < 6; i++) add(hash01(seed++) * 360, 30 + hash01(seed++) * 40, 0.06, 0.035, 0.75, 0.8, seed++);
    return { clumps, centre, size };
  }, []);
  const cap = useMemo(() => {
    // A sphere whose lower edge follows a hairline: at the brows in front,
    // over the ears' tops at the sides, and right down under the back of the
    // head to the nape — the skull is an ellipsoid, and from behind (or from
    // the security camera, above and behind) its round underside showed bare
    // below any cap cut level all round (2026-10-02). Vertices under the
    // line are pulled up onto it.
    const g = new THREE.SphereGeometry(1, 36, 24);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      const azimuth = Math.abs(Math.atan2(v.x, -v.z)) / (Math.PI / 180);
      const elevation = Math.asin(Math.max(-1, Math.min(1, v.y))) / (Math.PI / 180);
      const line = azimuth <= 90 ? 12 - 27 * (azimuth / 90) : -15 - 75 * ((azimuth - 90) / 90);
      if (elevation < line) {
        const e = (line * Math.PI) / 180;
        const horizontal = Math.hypot(v.x, v.z) || 1;
        v.set((v.x / horizontal) * Math.cos(e), Math.sin(e), (v.z / horizontal) * Math.cos(e));
        p.setXYZ(k, v.x, v.y, v.z);
      }
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => [clump, cap].forEach((g) => g.dispose()), [clump, cap]);
  return { clump, cap, ...layout };
}

/**
 * Put every part of a `FigureModel` where the joints say, the head turned
 * to `pitch` as well as the body's yaw. Called every frame.
 */
export function poseFigure(root: THREE.Object3D | null, j: BodyJoints, pitch: number) {
  if (!root) return;
  const part = (name: string) => root.getObjectByName(name);
  const right = ACROSS.set(Math.cos(j.yaw), 0, Math.sin(j.yaw));

  placeBone(part("torso"), j.hips, j.neck, right);
  placeBone(part("neck"), j.neck, j.head, right);
  for (const i of [0, 1]) {
    const side = i === 0 ? -1 : 1;
    const out = OUT[i].set(right.x * side, 0, right.z * side);
    const hip = [j.hips[0] + right.x * side * HIP_HALF, j.hips[1], j.hips[2] + right.z * side * HIP_HALF];
    placeBone(part(`thigh${i}`), hip, j.knees[i], out);
    placeBone(part(`shin${i}`), j.knees[i], j.feet[i], out);
    placeBone(part(`upperArm${i}`), j.shoulders[i], j.elbows[i], out);
    placeBone(part(`foreArm${i}`), j.elbows[i], j.hands[i], out);
    const shoe = part(`shoe${i}`);
    if (shoe) {
      shoe.position.set(j.feet[i][0], j.feet[i][1], j.feet[i][2]);
      shoe.rotation.set(0, -j.yaw, 0);
    }
  }
  const head = part("head");
  if (head) {
    head.position.set(j.head[0], j.head[1], j.head[2]);
    head.rotation.set(pitch, -j.yaw, 0, "YXZ");
  }
}

/**
 * The figure's parts, built once at their real sizes and named for
 * `poseFigure`. Drawn twice in the room: as the reader's own body (`Self`)
 * and as the hologram's projection of them (`HologramSelf`).
 */
export function FigureModel({ ref }: { ref?: React.Ref<THREE.Group> }) {
  const hairInstances = useRef<THREE.InstancedMesh>(null);

  const face = useMemo(() => makeFaceTexture(), []);
  useEffect(() => () => face.dispose(), [face]);
  const hair = useHair();
  const shirtGeometry = useMemo(() => {
    // From the hem (7 cm over the hip joints, standing) to just over the shoulders.
    const hem = FIGURE.waist - FIGURE.hip + 0.02;
    const top = TORSO - (FIGURE.neckBase - FIGURE.shoulder) + 0.06;
    const g = new RoundedBoxGeometry(TORSO_HALF_WIDTH * 2 + 0.02, top - hem, TORSO_DEPTH * 2, 4, 0.06);
    g.translate(0, (top + hem) / 2, 0);
    return g;
  }, []);
  const seatGeometry = useMemo(() => {
    // The trousers' seat: from under the shirt's hem down past the dropped crotch.
    const top = FIGURE.waist - FIGURE.hip + 0.04;
    const bottom = FIGURE.crotch - FIGURE.hip + 0.04;
    const g = new RoundedBoxGeometry((HIP_HALF + FIGURE.legRadius) * 2, top - bottom, TORSO_DEPTH * 2 - 0.01, 3, 0.05);
    g.translate(0, (top + bottom) / 2, 0);
    return g;
  }, []);
  const shoeGeometry = useMemo(() => new RoundedBoxGeometry(0.12, 0.08, 0.28, 3, 0.035), []);
  const soleGeometry = useMemo(() => new RoundedBoxGeometry(0.125, 0.035, 0.29, 2, 0.015), []);
  const lensFrame = useMemo(() => {
    // One rim of the glasses: a rounded rectangle, 5 × 3.4 cm.
    const w = 0.025;
    const h = 0.017;
    const r = 0.008;
    const corners: [number, number, number][] = [
      [w - r, h - r, 0],
      [-w + r, h - r, Math.PI / 2],
      [-w + r, -h + r, Math.PI],
      [w - r, -h + r, (3 * Math.PI) / 2],
    ];
    const points: THREE.Vector3[] = [];
    for (const [cx, cy, start] of corners) {
      for (let k = 0; k <= 6; k++) {
        const a = start + (k / 6) * (Math.PI / 2);
        points.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
      }
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 40, 0.0022, 6, true);
  }, []);
  useEffect(
    () => () => [shirtGeometry, seatGeometry, shoeGeometry, soleGeometry, lensFrame].forEach((g) => g.dispose()),
    [shirtGeometry, seatGeometry, shoeGeometry, soleGeometry, lensFrame]
  );

  // The hair is instanced once.
  useEffect(() => {
    const mesh = hairInstances.current;
    if (mesh) {
      hair.clumps.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [hair]);

  const sleeve = FIGURE.sleevesHalf - SHOULDER_HALF;
  return (
    <group ref={ref}>
      {/* Torso: +Y up the spine from the hip joints, −Z the front. */}
      <group name="torso">
        <mesh geometry={shirtGeometry} raycast={noRaycast}>
          <Cloth color={COLOURS.shirt} />
        </mesh>
        <mesh geometry={seatGeometry} raycast={noRaycast}>
          <Cloth color={COLOURS.trousers} />
        </mesh>
      </group>
      <group name="neck">
        <mesh position={[0, 0.05, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.034, 0.036, 0.1, 14]} />
          <Skin />
        </mesh>
        {/* The crew neck's ribbing. */}
        <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.048, 0.012, 8, 20]} />
          <Cloth color={COLOURS.shirt} />
        </mesh>
      </group>
      {[0, 1].map((i) => {
        const side = i === 0 ? -1 : 1;
        return (
          <group key={i}>
            {/* The trouser leg, wide and straight; a cargo pocket on the outside of the thigh. */}
            <group name={`thigh${i}`}>
              <mesh position={[0, THIGH / 2, 0]} raycast={noRaycast}>
                <cylinderGeometry args={[FIGURE.legRadius, FIGURE.legRadius + 0.006, THIGH + 0.04, 16]} />
                <Cloth color={COLOURS.trousers} />
              </mesh>
              <mesh position={[FIGURE.legRadius - 0.005, THIGH * 0.7, 0]} raycast={noRaycast}>
                <boxGeometry args={[0.03, 0.15, 0.13]} />
                <Cloth color={COLOURS.trousers} />
              </mesh>
            </group>
            <group name={`shin${i}`}>
              <mesh position={[0, SHIN / 2 - 0.02, 0]} raycast={noRaycast}>
                <cylinderGeometry args={[FIGURE.legRadius + 0.01, FIGURE.legRadius, SHIN + 0.0, 16]} />
                <Cloth color={COLOURS.trousers} />
              </mesh>
              <mesh raycast={noRaycast}>
                <sphereGeometry args={[FIGURE.legRadius, 14, 10]} />
                <Cloth color={COLOURS.trousers} />
              </mesh>
            </group>
            {/* The arm: a short wide sleeve over the upper arm, then skin. A watch on the left wrist. */}
            <group name={`upperArm${i}`}>
              <mesh position={[0, 0.11, 0]} raycast={noRaycast}>
                <cylinderGeometry args={[sleeve * 0.85, sleeve * 0.62, 0.24, 14, 1, true]} />
                <meshPhysicalMaterial color={COLOURS.shirt} roughness={0.92} sheen={0.6} sheenRoughness={0.8} sheenColor="#5c5654" side={THREE.DoubleSide} />
              </mesh>
              <Limb length={UPPER_ARM} from={0.038} to={0.034} />
            </group>
            <group name={`foreArm${i}`}>
              <Limb length={FOREARM - 0.05} from={0.034} to={0.028} />
              {/* The hand, flattened, its middle at the bone's end. */}
              <mesh position={[0, FOREARM - 0.01, 0]} scale={[0.03, 0.05, 0.016]} raycast={noRaycast}>
                <sphereGeometry args={[1, 12, 10]} />
                <Skin />
              </mesh>
              {side < 0 && (
                <mesh position={[0, FOREARM - 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast}>
                  <torusGeometry args={[0.03, 0.009, 6, 16]} />
                  <meshStandardMaterial color={COLOURS.watch} roughness={0.5} />
                </mesh>
              )}
            </group>
            {/* The sneaker: a dark upper on a thick pale sole, the toe out in front (−Z). */}
            <group name={`shoe${i}`}>
              <mesh geometry={soleGeometry} position={[0, 0.0175, -0.06]} raycast={noRaycast}>
                <meshStandardMaterial color={COLOURS.shoeSole} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.004, -0.06]} raycast={noRaycast}>
                <boxGeometry args={[0.122, 0.008, 0.285]} />
                <meshStandardMaterial color={COLOURS.outsole} roughness={0.9} />
              </mesh>
              <mesh geometry={shoeGeometry} position={[0, 0.07, -0.05]} raycast={noRaycast}>
                <meshStandardMaterial color={COLOURS.shoeUpper} roughness={0.75} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* The head: its middle behind and above the eye; −Z is where it looks. */}
      <group name="head">
        <mesh scale={[FIGURE.faceHalf + 0.002, FIGURE.eye - FIGURE.chin + HEAD_OVER_EYE, 0.115]} raycast={noRaycast}>
          <sphereGeometry args={[1, 40, 24]} />
          <Skin map={face} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (FIGURE.faceHalf - 0.004), -0.03, 0.01]} scale={[0.014, 0.03, 0.022]} raycast={noRaycast}>
            <sphereGeometry args={[1, 10, 8]} />
            <Skin />
          </mesh>
        ))}
        {/* The hair: a cap, tipped back so its front edge sits at the hairline, and the clumps on it. */}
        <mesh geometry={hair.cap} position={hair.centre} scale={hair.size} raycast={noRaycast}>
          <meshStandardMaterial color={COLOURS.hair} roughness={0.7} />
        </mesh>
        <instancedMesh ref={hairInstances} args={[hair.clump, undefined, hair.clumps.length]} raycast={noRaycast}>
          <meshStandardMaterial color={COLOURS.hair} roughness={0.65} />
        </instancedMesh>
        {/* The glasses: two thin rims, a bridge, and the arms back to the ears. */}
        <group position={[0, -HEAD_OVER_EYE, -HEAD_BEHIND_EYE - 0.03]}>
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={lensFrame} position={[side * 0.034, 0, 0]} raycast={noRaycast}>
              <meshStandardMaterial color={COLOURS.frames} roughness={0.35} metalness={0.2} />
            </mesh>
          ))}
          <mesh position={[0, 0.006, 0]} rotation={[0, 0, Math.PI / 2]} raycast={noRaycast}>
            <cylinderGeometry args={[0.002, 0.002, 0.018, 6]} />
            <meshStandardMaterial color={COLOURS.frames} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.058, 0.008, 0.055]} raycast={noRaycast}>
              <boxGeometry args={[0.003, 0.004, 0.11]} />
              <meshStandardMaterial color={COLOURS.frames} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** The reader's own body, where the camera is. Its head is on `HEAD_LAYER`: the reader's eye is inside it. */
export default function Self() {
  const body = useRef<THREE.Group>(null);
  useEffect(() => {
    body.current?.getObjectByName("head")?.traverse((object) => object.layers.set(HEAD_LAYER));
  }, []);
  useFrame(() => {
    const { gait, held } = bodyNow();
    const pose = viewNow().pose;
    poseFigure(body.current, bodyJoints(pose, gait, seatShare(held), deskPointerNow().mouse), pose.pitch);
  });
  return <FigureModel ref={body} />;
}
