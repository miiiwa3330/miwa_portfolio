"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FigureModel, poseFigure } from "./Self";
import { bodyJoints } from "../room/self";
import { FIGURE } from "../room/figure";
import { EYE_HEIGHT } from "../room/layout";
import { stepBob } from "../room/gait";
import { bodyNow, viewNow } from "../camera/viewChannel";
import { sceneClock } from "../sceneClock";

/**
 * The hologram on the desk projects the room's owner — the reader
 * themselves (the user, 2026-10-02): the same figure as the body
 * (`FigureModel`), a quarter of its size, drawn in light, turning slowly in
 * the beam over the device — floating where the wireframe it replaced did,
 * because standing on the device it was behind the right-hand monitor. It
 * moves as the reader does: it walks when they walk and looks up and down
 * when they do, standing on the spot while it turns. (It stands
 * at the PC too — sitting, the hands reach for a keyboard the hologram does
 * not have.)
 *
 * Out of the way while the hologram projects the self-introduction: the
 * text stands where the figure is (as the wireframe it replaced was).
 */

/** **Provisional (仮).** A quarter size: 42 cm tall. */
const SCALE = 0.25;
/** How fast it turns, in radians a second of the room's clock. */
const TURN_RATE = 0.5;

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    vec4 local = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      n = mat3(instanceMatrix) * n;
    #endif
    vec4 world = modelMatrix * local;
    vHeight = world.y;
    vNormal = normalize(mat3(modelMatrix) * n);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Light, not stuff: brightest at the outline, scan lines rolling up through
// it, a faint flicker.
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    float scan = 0.55 + 0.45 * sin(vHeight * 900.0 - uTime * 8.0);
    float flicker = 0.9 + 0.1 * sin(uTime * 23.0) * sin(uTime * 7.0);
    gl_FragColor = vec4(uColor * (0.16 + 1.1 * rim) * scan * flicker, 1.0);
  }
`;

export default function HologramSelf({ at, visible }: { at: readonly [number, number, number]; visible: boolean }) {
  const figure = useRef<THREE.Group>(null);
  const turntable = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial | null>(null);

  // Every part of the figure drawn in the one material of light.
  useEffect(() => {
    const light = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color("#2fe8ff") } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    material.current = light;
    figure.current?.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).material = light;
    });
    return () => light.dispose();
  }, []);

  useFrame((state) => {
    const t = sceneClock.time(state.clock.elapsedTime);
    if (material.current) material.current.uniforms.uTime.value = t;
    if (turntable.current) turntable.current.rotation.y = t * TURN_RATE;
    const { gait } = bodyNow();
    const pose = viewNow().pose;
    // The reader's own pose, at the device's middle and facing its front, standing.
    const standing = { ...pose, yaw: 0, forward: 0, eyeHeight: EYE_HEIGHT + stepBob(gait) };
    poseFigure(figure.current, bodyJoints(standing, gait, 0), pose.pitch);
  });

  return (
    // Its middle where the hologram's subject is: in the beam, clear over the monitors' tops.
    <group position={[at[0], at[1] - (FIGURE.stature * SCALE) / 2, at[2]]} visible={visible}>
      <group ref={turntable} scale={SCALE}>
        <FigureModel ref={figure} />
      </group>
    </group>
  );
}
