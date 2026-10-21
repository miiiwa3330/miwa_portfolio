"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { MONITOR_BEZEL, MONITOR_Y, MOUSE, PIECES } from "../room/layout";

/**
 * The PC's desk and everything on it, built from rounded forms rather than
 * bare boxes: a steel-edged top on a drawer unit either side, three monitors
 * on stands, a mouse on a desk mat (the keyboard is `HhkbKeyboard`), an arm lamp, a mug and a pen pot. **Step 1 of the PC's build-up
 * (form): materials are plain colours — the wear and printed labels come in
 * the next step.**
 *
 * Everything is in the desk's own frame (`Piece` in `RoomScene`), and what
 * other code leans on does not move: the monitors' screen faces
 * (`MONITOR_FACE_Z`, where the PC's HTML is laid), the keyboard's and mouse's
 * place and height (where the seated hands rest, `DESK_HANDS`), and the
 * lamp's bulb (where the desk light is).
 */

const TOP_Y = 0.75;
const TOP_THICKNESS = 0.05;
/** The desk's working surface. */
const SURFACE_Y = TOP_Y + TOP_THICKNESS / 2;

export type DeskMaterials = ReturnType<typeof makeMaterials>;

function makeMaterials() {
  return {
    top: new THREE.MeshStandardMaterial({ color: "#4b4a45", roughness: 0.5, metalness: 0.65 }),
    steel: new THREE.MeshStandardMaterial({ color: "#6a6e75", roughness: 0.4, metalness: 0.85 }),
    painted: new THREE.MeshStandardMaterial({ color: "#3d4148", roughness: 0.6, metalness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: "#14161a", roughness: 0.85, metalness: 0.3 }),
    plastic: new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.42, metalness: 0.1 }),
    mat: new THREE.MeshStandardMaterial({ color: "#101216", roughness: 0.95, metalness: 0 }),
    paper: new THREE.MeshStandardMaterial({ color: "#b9b09a", roughness: 0.9, metalness: 0 }),
    ceramic: new THREE.MeshStandardMaterial({ color: "#d9d4c7", roughness: 0.35, metalness: 0, side: THREE.DoubleSide }),
    coffee: new THREE.MeshStandardMaterial({ color: "#2a1a10", roughness: 0.2, metalness: 0 }),
    shade: new THREE.MeshStandardMaterial({ color: "#3a3d44", roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
    led: new THREE.MeshBasicMaterial({ color: "#3dff8a", toneMapped: false }),
  };
}

/** One set of materials for the whole desk, freed with it. */
export function useDeskMaterials(): DeskMaterials {
  const materials = useMemo(() => makeMaterials(), []);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return materials;
}

type Vec3 = [number, number, number];

function Slab({
  size,
  at,
  material,
  radius = 0.004,
  rotation,
}: {
  size: Vec3;
  at: Vec3;
  material: THREE.Material;
  radius?: number;
  rotation?: Vec3;
}) {
  return <RoundedBox args={size} radius={Math.min(radius, Math.min(...size) / 2 - 1e-4)} smoothness={3} position={at} rotation={rotation} material={material} />;
}

function Plain({ size, at, material }: { size: Vec3; at: Vec3; material: THREE.Material }) {
  return (
    <mesh position={at} material={material}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** A straight round bar between two points. */
function Rod({ from, to, radius, material }: { from: Vec3; to: Vec3; radius: number; material: THREE.Material }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
    </mesh>
  );
}

function Ball({ at, radius, material }: { at: Vec3; radius: number; material: THREE.Material }) {
  return (
    <mesh position={at} material={material}>
      <sphereGeometry args={[radius, 12, 8]} />
    </mesh>
  );
}

/** A hollow vessel turned on a lathe: the profile is (radius, height) pairs, outside going up and inside coming down. */
function useVessel(profile: [number, number][]): THREE.LatheGeometry {
  const geometry = useMemo(() => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 28), [profile]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

const MUG_PROFILE: [number, number][] = [
  [0, 0],
  [0.033, 0],
  [0.038, 0.005],
  [0.04, 0.1],
  [0.0365, 0.1],
  [0.0355, 0.01],
  [0, 0.008],
];
const POT_PROFILE: [number, number][] = [
  [0, 0],
  [0.036, 0],
  [0.037, 0.11],
  [0.034, 0.11],
  [0.033, 0.006],
  [0, 0.006],
];

/** The desk itself: the top, the apron under it, two drawer units, the panel at the back and the cases underneath. */
export function DeskBody({ m }: { m: DeskMaterials }) {
  const { width, depth } = PIECES.desk;
  const unitDepth = depth - 0.05;
  const unitFront = unitDepth / 2;
  return (
    <>
      <Slab size={[width, TOP_THICKNESS, depth]} at={[0, TOP_Y, 0]} material={m.top} radius={0.008} />
      {/* The steel edge along the front of the top, where hands and sleeves wear the paint off. */}
      <Plain size={[width - 0.012, 0.016, 0.006]} at={[0, TOP_Y, depth / 2 + 0.002]} material={m.steel} />
      {/* The apron between the units, set back, and the panel behind the knees. */}
      <Plain size={[width - 1.1, 0.09, 0.02]} at={[0, TOP_Y - TOP_THICKNESS / 2 - 0.045, depth / 2 - 0.085]} material={m.painted} />
      <Plain size={[width - 1.1, 0.56, 0.012]} at={[0, 0.43, -depth / 2 + 0.03]} material={m.dark} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 - 0.3), 0, 0]}>
          <Slab size={[0.5, 0.67, unitDepth]} at={[0, 0.385, 0]} material={m.painted} radius={0.006} />
          {/* The plinth, set back from the front so the unit stands off the floor. */}
          <Plain size={[0.5, 0.05, unitDepth - 0.05]} at={[0, 0.025, -0.02]} material={m.dark} />
          {[0, 1, 2].map((i) => {
            const y = 0.7075 - 0.1025 - i * 0.217;
            const faceFront = unitFront + 0.008;
            return (
              <group key={i}>
                <Slab size={[0.46, 0.205, 0.02]} at={[0, y, unitFront - 0.002]} material={m.painted} radius={0.004} />
                <Rod from={[-0.1, y + 0.045, faceFront + 0.012]} to={[0.1, y + 0.045, faceFront + 0.012]} radius={0.006} material={m.steel} />
                {[-0.1, 0.1].map((x) => (
                  <Rod key={x} from={[x, y + 0.045, faceFront]} to={[x, y + 0.045, faceFront + 0.012]} radius={0.004} material={m.steel} />
                ))}
                {/* The slot for a paper label. */}
                <Slab size={[0.075, 0.032, 0.004]} at={[0, y - 0.045, faceFront + 0.001]} material={m.paper} radius={0.001} />
              </group>
            );
          })}
        </group>
      ))}
      {/* Under the desk: a bin on the left, a flight case with latches on the right. */}
      <Slab size={[0.22, 0.34, 0.3]} at={[-0.41, 0.17 + 0.0, -0.2]} material={m.dark} radius={0.01} />
      <Slab size={[0.22, 0.32, 0.3]} at={[0.41, 0.16, -0.2]} material={m.painted} radius={0.008} />
      <Plain size={[0.224, 0.012, 0.304]} at={[0.41, 0.16, -0.2]} material={m.steel} />
      {[-0.06, 0.06].map((x) => (
        <Slab key={x} size={[0.03, 0.045, 0.01]} at={[0.41 + x, 0.2, -0.05]} material={m.steel} radius={0.002} />
      ))}
      <Slab size={[0.09, 0.012, 0.03]} at={[0.41, 0.328, -0.2]} material={m.steel} radius={0.004} />
    </>
  );
}

/**
 * A monitor on its stand: a thin front frame (the screen's glass is laid on
 * it by the caller, as `children`), a rear housing, a neck and a base. The
 * frame is `MONITOR_BEZEL` exactly — the glass and the PC's HTML are placed
 * from that.
 */
export function DeskMonitor({ m, children }: { m: DeskMaterials; children?: ReactNode }) {
  const { width, height, depth } = MONITOR_BEZEL;
  const deskLevel = SURFACE_Y - MONITOR_Y;
  // The neck runs from the base's top up into the housing.
  const neckBottom = deskLevel + 0.012;
  const neckTop = -0.12;
  return (
    <>
      <Slab size={[width, height, depth]} at={[0, 0, 0]} material={m.plastic} radius={0.008} />
      <Slab size={[width * 0.66, height * 0.58, 0.04]} at={[0, 0.01, -0.035]} material={m.plastic} radius={0.016} />
      <Plain size={[0.05, neckTop - neckBottom, 0.025]} at={[0, (neckTop + neckBottom) / 2, -0.056]} material={m.steel} />
      <Slab size={[0.26, 0.012, 0.18]} at={[0, deskLevel + 0.006, -0.04]} material={m.steel} radius={0.005} />
      {/* The power light, in the frame under the screen's bottom right corner. */}
      <mesh position={[width / 2 - 0.011, -height / 2 + 0.01, depth / 2 + 0.0005]} material={m.led}>
        <boxGeometry args={[0.004, 0.004, 0.001]} />
      </mesh>
      {children}
    </>
  );
}

/** The mouse, its mat under the keyboard and mouse, and nothing else that moves. */
export function DeskMouse({ m }: { m: DeskMaterials }) {
  return (
    <>
      <Slab size={[0.8, 0.003, 0.3]} at={[0.1, SURFACE_Y + 0.0015 - 0.0, 0.09]} material={m.mat} radius={0.0012} />
      <Slab size={[0.06, 0.03, 0.1]} at={[MOUSE.x, MOUSE.y, MOUSE.z]} material={m.plastic} radius={0.013} />
      <Plain size={[0.0015, 0.0012, 0.04]} at={[MOUSE.x, MOUSE.y + 0.0156, MOUSE.z - 0.025]} material={m.dark} />
      <mesh position={[MOUSE.x, MOUSE.y + 0.0158, MOUSE.z - 0.022]} rotation={[0, 0, Math.PI / 2]} material={m.steel}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.008, 12]} />
      </mesh>
    </>
  );
}

/**
 * The arm lamp: a weighted base, two arms on ball joints, and a conical
 * shade over `bulb` — the point the desk light shines from (`RoomScene`).
 * `on` lights the opening of the shade.
 */
export function DeskLamp({ m, x, bulb, on }: { m: DeskMaterials; x: number; bulb: Vec3; on: boolean }) {
  const base: Vec3 = [x, SURFACE_Y + 0.0125, 0.22];
  const pivot: Vec3 = [x, SURFACE_Y + 0.03, 0.22];
  const elbow: Vec3 = [x, 1.14, 0.12];
  const head: Vec3 = [x, 1.285, bulb[2] - 0.0];
  const shadeHeight = 0.085;
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffcf8a", toneMapped: false }), []);
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <>
      <mesh position={base} material={m.painted}>
        <cylinderGeometry args={[0.065, 0.072, 0.025, 28]} />
      </mesh>
      <Rod from={pivot} to={elbow} radius={0.007} material={m.steel} />
      <Rod from={elbow} to={head} radius={0.007} material={m.steel} />
      <Ball at={pivot} radius={0.014} material={m.steel} />
      <Ball at={elbow} radius={0.016} material={m.steel} />
      <mesh position={[bulb[0], bulb[1] + shadeHeight / 2, bulb[2]]} material={m.shade}>
        <cylinderGeometry args={[0.026, 0.07, shadeHeight, 28, 1, true]} />
      </mesh>
      <Ball at={head} radius={0.012} material={m.steel} />
      {/* The bulb's glow in the shade's mouth, as bright as the desk light is on. */}
      <mesh position={bulb} rotation={[Math.PI / 2, 0, 0]} material={glow} visible={on}>
        <circleGeometry args={[0.062, 24]} />
      </mesh>
    </>
  );
}

/** What lives on the desk besides the machines: a mug on a coaster, and a pot of pens. */
export function DeskSmalls({ m }: { m: DeskMaterials }) {
  const mug = useVessel(MUG_PROFILE);
  const pot = useVessel(POT_PROFILE);
  const pens = useMemo(
    () =>
      ["#ff6a1a", "#2fe8ff", "#e8e8e8", "#c0262d", "#2e4f8b"].map((color, i) => ({
        color,
        x: (i - 2) * 0.009,
        z: ((i * 7) % 5 - 2) * 0.007,
        lean: (i - 2) * 0.12,
        turn: ((i * 3) % 5 - 2) * 0.1,
      })),
    []
  );
  return (
    <>
      <mesh position={[0.55, SURFACE_Y + 0.002, 0.2]} material={m.dark}>
        <cylinderGeometry args={[0.052, 0.052, 0.004, 28]} />
      </mesh>
      <group position={[0.55, SURFACE_Y + 0.004, 0.2]}>
        <mesh geometry={mug} material={m.ceramic} />
        <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.coffee}>
          <circleGeometry args={[0.036, 24]} />
        </mesh>
        <mesh position={[0.04, 0.055, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.ceramic}>
          <torusGeometry args={[0.024, 0.005, 8, 16, Math.PI]} />
        </mesh>
      </group>
      <group position={[-0.68, SURFACE_Y, 0.28]}>
        <mesh geometry={pot} material={m.painted} />
        {pens.map((pen) => (
          <mesh key={pen.color} position={[pen.x, 0.1, pen.z]} rotation={[pen.turn, 0, pen.lean]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.15, 8]} />
            <meshStandardMaterial color={pen.color} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </>
  );
}
