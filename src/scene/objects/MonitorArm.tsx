"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { MONITOR_ARM, PIECES, armJoints } from "../room/layout";

/**
 * The upper monitor's arm (`MONITOR_ARM`, `armJoints`): clamped to the
 * desk's back edge behind the Macintosh, a post, a lower beam leaning out to
 * the right, an elbow, an upper beam back in over the main monitor, a wrist
 * that swivels and a tilt head on the monitor's back plate — a reversed
 * 「く」 seen from the front (2026-10-22, the user).
 *
 * **Angular and mechanical, in metal** (the user): square-section steel, no
 * rounded edges, the joints as blocks on through-pins with hex bolt heads,
 * a parallel tension bar beside each beam, and the monitor's cable clipped
 * along it down to the desk. Drawn in the desk's frame (`Piece`).
 */

type Vec3 = [number, number, number];

/** The desk top's thickness (`DeskSet`'s): the clamp's jaws grip above and below it. */
const TOP_THICKNESS = 0.05;
/** The beams' square section: across in the arm's own plane, and through it. */
const BEAM = { across: 0.042, through: 0.03 } as const;
const BAR = { across: 0.012, through: 0.01, apart: 0.034 } as const;

function makeMaterials() {
  return {
    steel: new THREE.MeshStandardMaterial({ color: "#8a919b", roughness: 0.38, metalness: 0.75 }),
    joint: new THREE.MeshStandardMaterial({ color: "#50565e", roughness: 0.45, metalness: 0.7 }),
    bolt: new THREE.MeshStandardMaterial({ color: "#b4bac2", roughness: 0.25, metalness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#121315", roughness: 0.9, metalness: 0 }),
  };
}

type Materials = ReturnType<typeof makeMaterials>;

/**
 * A box's frame running from `from` to `to`: +Y along it, +X across it in the
 * front's plane (the arm lies roughly in a plane facing the room), +Z through.
 */
function beamFrame(from: Vec3, to: Vec3) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const along = b.clone().sub(a);
  const length = along.length();
  const y = along.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, new THREE.Vector3(0, 0, 1)).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return { centre: a.add(b).multiplyScalar(0.5), length, quaternion, x };
}

/** A square-section beam, with a thin tension bar alongside it at `bar` (−1 or +1 across), ending in small lugs. */
function Beam({ from, to, m, bar }: { from: Vec3; to: Vec3; m: Materials; bar?: -1 | 1 }) {
  const { centre, length, quaternion } = useMemo(() => beamFrame(from, to), [from, to]);
  return (
    <group position={centre} quaternion={quaternion}>
      <mesh material={m.steel}>
        <boxGeometry args={[BEAM.across, length, BEAM.through]} />
      </mesh>
      {/* The flange along its face, so it reads as folded plate rather than a bar. */}
      <mesh position={[0, 0, BEAM.through / 2 + 0.0015]} material={m.joint}>
        <boxGeometry args={[BEAM.across * 0.55, length * 0.82, 0.003]} />
      </mesh>
      {/* Bolts through the beam's face, a third of the way from each end. */}
      {[-1, 1].map((end) => (
        <Bolt key={end} at={[0, (end * length) / 3, BEAM.through / 2 + 0.003]} axis="z" m={m} />
      ))}
      {bar && (
        <>
          <mesh position={[bar * BAR.apart, 0, -BEAM.through / 4]} material={m.steel}>
            <boxGeometry args={[BAR.across, length * 0.86, BAR.through]} />
          </mesh>
          {[-1, 1].map((end) => (
            <mesh key={end} position={[(bar * BAR.apart) / 2, end * length * 0.43, -BEAM.through / 4]} material={m.joint}>
              <boxGeometry args={[BAR.apart + BAR.across, 0.016, BAR.through + 0.004]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/** A hex bolt head, along `axis`. */
function Bolt({ at, axis, m, size = 0.0065 }: { at: Vec3; axis: "x" | "y" | "z"; m: Materials; size?: number }) {
  const rotation: Vec3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={at} rotation={rotation} material={m.bolt}>
      <cylinderGeometry args={[size, size, 0.005, 6]} />
    </mesh>
  );
}

/** A joint: a block on a through-pin along `axis`, bolted at both ends. */
function Joint({ at, size, axis, m }: { at: Vec3; size: number; axis: "x" | "y" | "z"; m: Materials }) {
  const reach = size / 2 + 0.006;
  const offset = (d: number): Vec3 => [at[0] + (axis === "x" ? d : 0), at[1] + (axis === "y" ? d : 0), at[2] + (axis === "z" ? d : 0)];
  const pinRotation: Vec3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <>
      <mesh position={at} material={m.joint}>
        <boxGeometry args={[size, size, size]} />
      </mesh>
      <mesh position={at} rotation={pinRotation} material={m.steel}>
        <cylinderGeometry args={[size * 0.28, size * 0.28, size + 0.008, 12]} />
      </mesh>
      <Bolt at={offset(reach)} axis={axis} m={m} size={size * 0.2} />
      <Bolt at={offset(-reach)} axis={axis} m={m} size={size * 0.2} />
    </>
  );
}

/** The monitor's cable, clipped along the arm from the head down to the back edge of the desk. */
function useCable(points: Vec3[]): THREE.TubeGeometry {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.2);
    return new THREE.TubeGeometry(curve, 96, 0.0035, 6, false);
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export default function MonitorArm() {
  const m = useMemo(() => makeMaterials(), []);
  useEffect(() => () => Object.values(m).forEach((material) => material.dispose()), [m]);
  const j = useMemo(() => armJoints(), []);
  const [cx, top, cz] = j.clamp;
  const deskBack = -PIECES.desk.depth / 2;
  const under = top - TOP_THICKNESS;

  // The cable runs behind the beams (−Z), with slack between the clips.
  const cable = useCable(
    useMemo(() => {
      const behind = (p: Vec3, dx = 0, dy = 0): Vec3 => [p[0] + dx, p[1] + dy, p[2] - BEAM.through / 2 - 0.006];
      return [
        behind(j.head, 0, -0.03),
        behind(j.wrist, -0.02, -0.03),
        behind([(j.wrist[0] + j.elbow[0]) / 2, (j.wrist[1] + j.elbow[1]) / 2 - 0.035, (j.wrist[2] + j.elbow[2]) / 2]),
        behind(j.elbow, -0.03, -0.04),
        behind([(j.elbow[0] + j.shoulder[0]) / 2 - 0.02, (j.elbow[1] + j.shoulder[1]) / 2, (j.elbow[2] + j.shoulder[2]) / 2]),
        behind(j.shoulder, -0.035, -0.02),
        [cx - 0.04, top + 0.01, deskBack + 0.004],
        [cx - 0.05, top - 0.12, deskBack - 0.012],
      ];
    }, [j, cx, top, deskBack])
  );

  return (
    <group>
      {/* The clamp: a jaw on the desk's top, a spine down its back edge, a jaw under it pushed up by a screw. */}
      <mesh position={[cx, top + 0.006, (deskBack + cz + 0.04) / 2]} material={m.steel}>
        <boxGeometry args={[0.085, 0.012, cz + 0.04 - deskBack]} />
      </mesh>
      <mesh position={[cx, (top + 0.012 + under - 0.04) / 2, deskBack - 0.006]} material={m.steel}>
        <boxGeometry args={[0.085, top + 0.012 - (under - 0.04), 0.012]} />
      </mesh>
      <mesh position={[cx, under - 0.034, deskBack + 0.03]} material={m.steel}>
        <boxGeometry args={[0.085, 0.012, 0.06]} />
      </mesh>
      <mesh position={[cx, under - 0.016, deskBack + 0.04]} material={m.rubber}>
        <boxGeometry args={[0.05, 0.006, 0.04]} />
      </mesh>
      <mesh position={[cx, under - 0.07, deskBack + 0.04]} material={m.bolt}>
        <cylinderGeometry args={[0.006, 0.006, 0.07, 10]} />
      </mesh>
      <mesh position={[cx, under - 0.105, deskBack + 0.04]} rotation={[0, 0, Math.PI / 2]} material={m.joint}>
        <cylinderGeometry args={[0.005, 0.005, 0.07, 8]} />
      </mesh>
      {[-0.028, 0.028].map((dx) => (
        <Bolt key={dx} at={[cx + dx, top + 0.0145, cz]} axis="y" m={m} />
      ))}

      {/* The post, with a collar where the shoulder turns on it. */}
      <mesh position={[cx, top + 0.012 + (MONITOR_ARM.postHeight - 0.012) / 2, cz]} material={m.steel}>
        <boxGeometry args={[0.048, MONITOR_ARM.postHeight - 0.012, 0.048]} />
      </mesh>
      <mesh position={[cx, j.shoulder[1] - 0.04, cz]} material={m.joint}>
        <boxGeometry args={[0.06, 0.018, 0.06]} />
      </mesh>
      <Bolt at={[cx + 0.031, j.shoulder[1] - 0.04, cz]} axis="x" m={m} />

      <Joint at={j.shoulder} size={0.066} axis="z" m={m} />
      <Beam from={j.shoulder} to={j.elbow} m={m} bar={-1} />
      <Joint at={j.elbow} size={0.07} axis="z" m={m} />
      <Beam from={j.elbow} to={j.wrist} m={m} bar={1} />
      <Joint at={j.wrist} size={0.056} axis="y" m={m} />
      {/* The bracket from the wrist to the head, and the head's tilt hinge. */}
      <Beam from={j.wrist} to={j.head} m={m} />
      <Joint at={j.head} size={0.05} axis="x" m={m} />

      <mesh geometry={cable} material={m.rubber} />
    </group>
  );
}
