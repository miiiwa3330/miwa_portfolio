"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MONITORS, ROOM_RADIUS, WALL_HEIGHT, horizontalAt, monitorGlass } from "../room/layout";
import { HEAD_LAYER } from "../layers";

/**
 * The right-hand monitor's security camera: a camera high on the wall that
 * films the room as it is now — the owner standing in the middle included,
 * turning as the reader turns (docs/room-migration.md, "自分自身").
 *
 * **Drawn ten times a second, not every frame.** It is the room drawn a
 * second time, from another camera (the same kind of cost as the fisheye);
 * a feed this small and this grainy does not need sixty. Real time, not the
 * room's clock: the pause button freezes the room, not the reader, and the
 * reader is what it films.
 *
 * This component is the monitor's screen as well, placed inside the
 * monitor's own group, so it can take its own screen out of the picture
 * while filming — a texture drawn into while it is being read from is a
 * feedback loop WebGL refuses.
 */

/** **Provisional (仮).** */
const FEED_INTERVAL = 0.1;
const SCREEN = MONITORS.camera.screen;
const GLASS = monitorGlass("camera");
const FEED_PX = { width: 320, height: Math.round((320 * SCREEN.height) / SCREEN.width) };
/** Where the camera hangs: high on the wall to the desk's right, looking down at the middle of the room. */
const MOUNT_YAW = 40;
// Inside the ring of pipes under the ceiling (`RoomScene`'s `Shell`): mounted
// among them, the nearest pipe ran across the top third of the picture.
const MOUNT_DISTANCE = ROOM_RADIUS - 0.45;
const MOUNT_HEIGHT = WALL_HEIGHT - 0.5;
const LOOK_AT: [number, number, number] = [0, 1.0, 0];

export function securityCameraMount(): [number, number, number] {
  const [x, z] = horizontalAt(MOUNT_YAW);
  return [x * MOUNT_DISTANCE, MOUNT_HEIGHT, z * MOUNT_DISTANCE];
}

/** The camera's own body on the wall. */
export function SecurityCameraBody() {
  const mount = securityCameraMount();
  const look = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(...mount);
    object.lookAt(...LOOK_AT);
    return object.quaternion.clone();
  }, [mount]);
  return (
    <group position={mount} quaternion={look}>
      <mesh>
        <boxGeometry args={[0.1, 0.08, 0.18]} />
        <meshStandardMaterial color="#d8dbe0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, -0.095]}>
        <circleGeometry args={[0.025, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.035, 0.03, -0.091]}>
        <circleGeometry args={[0.006, 8]} />
        <meshBasicMaterial color="#ff2a2a" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The feed, on the monitor's screen. Rendered inside that monitor's group. */
export function SecurityFeed() {
  const screen = useRef<THREE.Mesh>(null);
  const since = useRef(FEED_INTERVAL);
  const target = useMemo(
    () => new THREE.WebGLRenderTarget(FEED_PX.width, FEED_PX.height, { type: THREE.HalfFloatType }),
    []
  );
  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(70, SCREEN.width / SCREEN.height, 0.05, 20);
    c.position.set(...securityCameraMount());
    c.lookAt(...LOOK_AT);
    c.updateMatrixWorld();
    // It sees the owner's head; nothing else of the room is kept from it.
    c.layers.enable(HEAD_LAYER);
    return c;
  }, []);
  useEffect(() => () => target.dispose(), [target]);

  useFrame((state, delta) => {
    since.current += delta;
    if (since.current < FEED_INTERVAL || !screen.current) return;
    since.current = 0;
    const { gl, scene } = state;
    const previous = gl.getRenderTarget();
    screen.current.visible = false;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(previous);
    screen.current.visible = true;
  });

  return (
    <mesh ref={screen} position={[0, 0, GLASS.z + GLASS.thickness / 2 + 0.0002]}>
      <planeGeometry args={[SCREEN.width, SCREEN.height]} />
      {/* A slight green cast, the way a cheap security feed looks. */}
      <meshBasicMaterial map={target.texture} color="#cfe8d4" />
    </mesh>
  );
}
