"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TORSO_DEPTH, TORSO_HALF_WIDTH, bodyJoints } from "../room/self";
import { viewNow } from "../camera/viewChannel";
import { HEAD_LAYER } from "../layers";

/**
 * The reader's own body, standing where the camera stands (`room/self.ts`
 * has where every joint goes). **Provisional (仮) look**: a hooded figure
 * of capsules and spheres, until what the owner looks like is decided — it
 * has to read the same in the security camera, looking down, and at the desk.
 *
 * Moved every frame from the camera's published pose, so it follows a
 * flight, a drag or a zoom without being told about any of them. Nothing
 * here takes the pointer: the reader's own rays start inside it.
 */

const HOODIE = "#2b3242";
const TROUSERS = "#1b1e26";
const SKIN = "#c99a7a";

const UP = new THREE.Vector3(0, 1, 0);
const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** Stretch a unit-tall cylinder between two points. */
function placeLimb(mesh: THREE.Object3D | undefined, from: number[], to: number[]) {
  if (!mesh) return;
  a.set(from[0], from[1], from[2]);
  b.set(to[0], to[1], to[2]);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  const length = a.distanceTo(b);
  b.sub(a).normalize();
  mesh.quaternion.setFromUnitVectors(UP, b);
  mesh.scale.set(1, Math.max(length, 1e-3), 1);
}

const noRaycast = () => null;

function Limb({ radius, color, name }: { radius: number; color: string; name: string }) {
  return (
    <mesh name={name} raycast={noRaycast}>
      <cylinderGeometry args={[radius, radius, 1, 10]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export default function Self() {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const headGeometry = useMemo(() => new THREE.SphereGeometry(0.11, 20, 14), []);
  useEffect(() => () => headGeometry.dispose(), [headGeometry]);

  // The head is for other cameras only (see `HEAD_LAYER`).
  useEffect(() => {
    head.current?.traverse((object) => object.layers.set(HEAD_LAYER));
  }, []);

  useFrame(() => {
    const parts = body.current;
    if (!parts) return;
    const part = (name: string) => parts.getObjectByName(name);
    const j = bodyJoints(viewNow().pose);
    // The torso is upright and flatter front to back than across, turned
    // with the body rather than stretched like a limb.
    const torso = part("torso");
    if (torso) {
      torso.position.set((j.hips[0] + j.neck[0]) / 2, (j.hips[1] + j.neck[1]) / 2, (j.hips[2] + j.neck[2]) / 2);
      torso.rotation.set(0, -j.yaw, 0);
      torso.scale.set(TORSO_HALF_WIDTH, j.neck[1] - j.hips[1], TORSO_DEPTH);
    }
    placeLimb(part("neck"), j.neck, j.head);
    placeLimb(part("shoulders"), j.shoulders[0], j.shoulders[1]);
    for (const i of [0, 1]) {
      placeLimb(part(`upperArm${i}`), j.shoulders[i], j.elbows[i]);
      placeLimb(part(`foreArm${i}`), j.elbows[i], j.hands[i]);
      placeLimb(part(`thigh${i}`), j.hips, j.knees[i]);
      placeLimb(part(`shin${i}`), j.knees[i], j.feet[i]);
      part(`hand${i}`)?.position.set(j.hands[i][0], j.hands[i][1], j.hands[i][2]);
    }
    if (head.current) {
      head.current.position.set(j.head[0], j.head[1], j.head[2]);
      head.current.rotation.set(0, -j.yaw, 0);
    }
  });

  return (
    <group ref={body}>
      <Limb radius={1} color={HOODIE} name="torso" />
      <Limb radius={0.07} color={HOODIE} name="shoulders" />
      <Limb radius={0.045} color={SKIN} name="neck" />
      {[0, 1].map((i) => (
        <group key={i}>
          <Limb radius={0.05} color={HOODIE} name={`upperArm${i}`} />
          <Limb radius={0.042} color={HOODIE} name={`foreArm${i}`} />
          <Limb radius={0.075} color={TROUSERS} name={`thigh${i}`} />
          <Limb radius={0.06} color={TROUSERS} name={`shin${i}`} />
          <mesh name={`hand${i}`} raycast={noRaycast}>
            <sphereGeometry args={[0.045, 12, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <group ref={head}>
        <mesh geometry={headGeometry} raycast={noRaycast}>
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        {/* The hood, pulled back over the crown: the face comes through its front. */}
        <mesh position={[0, 0.02, 0.03]} scale={[1.12, 1.08, 1.12]} geometry={headGeometry} raycast={noRaycast}>
          <meshStandardMaterial color={HOODIE} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}
