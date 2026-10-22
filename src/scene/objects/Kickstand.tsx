"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { KICKSTAND, MONITORS, kickstand } from "../room/layout";

/**
 * The video monitor's kickstand (`KICKSTAND`, `kickstand()`): a black steel
 * leg hinged on the back of the P2422H's housing, opened out behind it and
 * standing on the desk on a rubber foot — what lets the panel, stood on end
 * without its own stand, lean back by itself (2026-10-22, the user: 「モニター
 * に支えをつけて」). Drawn in the desk's frame.
 */
export default function Kickstand() {
  const materials = useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({ color: "#26282c", roughness: 0.4, metalness: 0.75 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.9, metalness: 0 }),
    }),
    []
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const leg = useMemo(() => {
    const { hinge, foot } = kickstand();
    const a = new THREE.Vector3(...hinge);
    const b = new THREE.Vector3(...foot);
    const y = b.clone().sub(a);
    const length = y.length();
    y.normalize();
    // Its width runs along the panel, level.
    const yaw = MONITORS.video.yaw;
    const x = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const z = new THREE.Vector3().crossVectors(x, y);
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    return { hinge, foot, centre: a.add(b).multiplyScalar(0.5).toArray() as [number, number, number], length, quaternion };
  }, []);

  return (
    <>
      <group position={leg.centre} quaternion={leg.quaternion}>
        <mesh material={materials.steel}>
          <boxGeometry args={[KICKSTAND.width, leg.length, KICKSTAND.thickness]} />
        </mesh>
        {/* A rib pressed down its middle, so the thin plate holds the weight. */}
        <mesh position={[0, 0, KICKSTAND.thickness / 2 + 0.001]} material={materials.steel}>
          <boxGeometry args={[KICKSTAND.width * 0.3, leg.length * 0.8, 0.002]} />
        </mesh>
      </group>
      {/* The hinge: a barrel across the top of the leg. */}
      <group position={leg.hinge} quaternion={leg.quaternion}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={materials.steel}>
          <cylinderGeometry args={[0.006, 0.006, KICKSTAND.width + 0.01, 12]} />
        </mesh>
      </group>
      {/* The foot, a rubber strip on the desk. */}
      <group position={[leg.foot[0], leg.foot[1] + 0.003, leg.foot[2]]} rotation={[0, MONITORS.video.yaw, 0]}>
        <mesh material={materials.rubber}>
          <boxGeometry args={[KICKSTAND.width + 0.006, 0.006, 0.016]} />
        </mesh>
      </group>
    </>
  );
}
