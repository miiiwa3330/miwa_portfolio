"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CURVE_MIRROR, curveMirror, mirrorCapAngle, mirrorRimDepth } from "../room/mirror";
import { HEAD_LAYER } from "../layers";

/**
 * The curve mirror over the investigation board (`room/mirror.ts` has where
 * it hangs and why): an orange-backed convex glass on a bracket off the wall,
 * reflecting the room as it is now — the owner standing in it included.
 *
 * **The reflection is real**: the room is drawn into a cube map from the
 * glass, and the glass looks up the cube along each reflected ray. From a
 * convex mirror every reflected ray leaves almost the same point, so one
 * cube from there is close to exact — unlike a flat mirror, which needs the
 * room drawn again from behind the glass for every viewer.
 *
 * **One face a frame**, round the six: a full cube every sixth frame (ten
 * times a second at sixty) for the cost of one more small drawing of the
 * room a frame, rather than six at once every so often. The first frame
 * draws all six, so it is never seen half black. Real time, as the security
 * camera.
 */

/**
 * **Provisional (仮).** The cube's face, in px. The glass is about 500 px
 * across on a desktop (a thousand on Retina) and shows some 120° of the
 * room; at 256 the reflection came out soft.
 */
const FACE_PX = 512;
const ORANGE = "#f0641e";

const UP = new THREE.Vector3(0, 1, 0);

export default function CurveMirror() {
  const { mount, centre, normal } = useMemo(() => curveMirror(), []);
  const mirror = useRef<THREE.Group>(null);
  const face = useRef(-1);

  const target = useMemo(
    () =>
      new THREE.WebGLCubeRenderTarget(FACE_PX, {
        type: THREE.HalfFloatType,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      }),
    []
  );
  /** The six cameras, built on the first frame (three.js state the frame loop owns, as `LensRenderer`'s). */
  const cubeRef = useRef<THREE.CubeCamera | null>(null);
  useEffect(() => () => target.dispose(), [target]);

  // The glass faces `normal`, its top kept up.
  const facing = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(...centre);
    object.up.copy(UP);
    object.lookAt(centre[0] + normal[0], centre[1] + normal[1], centre[2] + normal[2]);
    return object.quaternion.clone();
  }, [centre, normal]);

  // The bracket: from the wall to the back of the mirror.
  const bracket = useMemo(() => {
    const from = new THREE.Vector3(...mount);
    const to = new THREE.Vector3(...centre).addScaledVector(new THREE.Vector3(...normal), -(mirrorRimDepth() + CURVE_MIRROR.back));
    const length = from.distanceTo(to);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, to.clone().sub(from).normalize());
    return { position: from.clone().add(to).multiplyScalar(0.5), quaternion, length };
  }, [mount, centre, normal]);

  const { radius, curvature, back } = CURVE_MIRROR;
  const cap = mirrorCapAngle();
  // How far back from the glass's middle its rim is.
  const rimZ = -mirrorRimDepth();

  useFrame(({ gl, scene }) => {
    const group = mirror.current;
    if (!group) return;
    if (!cubeRef.current) {
      const camera = new THREE.CubeCamera(0.05, 60, target);
      // Just in front of the glass, where the reflected rays leave from.
      camera.position.set(centre[0] + normal[0] * 0.02, centre[1] + normal[1] * 0.02, centre[2] + normal[2] * 0.02);
      // It shows the owner's head (`Self`), as the security camera does.
      camera.layers.enable(HEAD_LAYER);
      camera.updateMatrixWorld();
      cubeRef.current = camera;
    }
    const cube = cubeRef.current;
    if (cube.coordinateSystem !== gl.coordinateSystem) {
      cube.coordinateSystem = gl.coordinateSystem;
      cube.updateCoordinateSystem();
    }
    const faces = cube.children as THREE.PerspectiveCamera[];
    const previous = gl.getRenderTarget();
    const previousFace = gl.getActiveCubeFace();
    // The glass reads the cube; it must not be in the picture drawn into it.
    group.visible = false;
    const draw = (i: number) => {
      gl.setRenderTarget(target, i);
      gl.render(scene, faces[i]);
    };
    if (face.current < 0) {
      faces.forEach((_, i) => draw(i));
      face.current = 0;
    } else {
      draw(face.current);
      face.current = (face.current + 1) % 6;
    }
    group.visible = true;
    gl.setRenderTarget(previous, previousFace);
  });

  return (
    <>
      <mesh position={bracket.position} quaternion={bracket.quaternion}>
        <cylinderGeometry args={[0.018, 0.018, bracket.length, 10]} />
        <meshStandardMaterial color="#8a8e96" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={mount}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color="#4a4e56" metalness={0.6} roughness={0.5} />
      </mesh>
      <group ref={mirror} position={centre} quaternion={facing}>
        {/* The glass: a cap of the sphere, its middle at the origin, bulging towards +Z. */}
        <mesh position={[0, 0, -curvature]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[curvature, 48, 12, 0, Math.PI * 2, 0, cap]} />
          <meshBasicMaterial envMap={target.texture} color="#d9dde0" />
        </mesh>
        {/* The orange rim and back, and a short hood over the top. */}
        <mesh position={[0, 0, rimZ]}>
          <torusGeometry args={[radius + 0.006, 0.025, 10, 64]} />
          <meshStandardMaterial color={ORANGE} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, rimZ - back / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius + 0.01, radius + 0.01, back, 40]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
        <mesh position={[0, radius + 0.02, rimZ + 0.02]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[radius * 1.5, 0.012, 0.09]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
      </group>
    </>
  );
}
