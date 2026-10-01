"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LENS_FRAGMENT_SHADER, LENS_VERTEX_SHADER } from "./camera/fisheye";
import { lensBends } from "./camera/roomCamera";
import { lensNow } from "./camera/lensChannel";
import { useHandheld } from "@/state/useHandheld";

/**
 * Draws the frame — straight through the camera for the standard view and a
 * zoom, through the fisheye's cube map whenever the lens is bent at all.
 *
 * The fisheye cannot be a camera setting: a perspective camera can only draw
 * k = 1 (`camera/fisheye.ts`). So, as in `sandbox/room-lab.html`, the room is
 * drawn six times from where the camera stands, into the faces of a cube, and
 * a full-screen quad looks every pixel's direction up in it through the lens.
 * **That is six draws of the room per frame**, only in the fisheye and on the
 * way in and out of it; whether real devices keep up is still to be measured
 * (docs/room-migration.md).
 *
 * Takes over R3F's rendering outright (a positive `useFrame` priority), so it
 * runs after everything else has moved for the frame.
 */

const DEG = Math.PI / 180;

/**
 * **Provisional (仮).** Each cube face's size, in px. At 1024 the faces carry
 * about 512 px per radian at their centres, close to what the 161° lens puts
 * at the centre of a 1600 px frame (≈ 470); a phone's 390 px frame needs far
 * less. Half-float faces (the room is lit past 1.0 before tone mapping) cost
 * 8 bytes a pixel: 48 MB of video memory at 1024, 12 MB at 512.
 */
const FACE_PX = 1024;
const HANDHELD_FACE_PX = 512;

type LensRig = {
  target: THREE.WebGLCubeRenderTarget;
  cube: THREE.CubeCamera;
  material: THREE.ShaderMaterial;
  quad: THREE.Scene;
  screen: THREE.OrthographicCamera;
};

function makeLensRig(facePx: number): LensRig {
  const target = new THREE.WebGLCubeRenderTarget(facePx, { type: THREE.HalfFloatType });
  // The same near and far as the main camera (Scene.tsx's <Canvas>).
  const cube = new THREE.CubeCamera(0.05, 60, target);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCube: { value: target.texture },
      uRot: { value: new THREE.Matrix3() },
      uHalf: { value: 1 },
      uAspect: { value: 1 },
      uK: { value: 2 },
      uShift: { value: new THREE.Vector2() },
    },
    vertexShader: LENS_VERTEX_SHADER,
    fragmentShader: LENS_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Scene();
  quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const screen = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { target, cube, material, quad, screen };
}

export default function LensRenderer() {
  const handheld = useHandheld();
  const rig = useRef<LensRig | null>(null);

  // Built on first use and kept: most visits never open the fisheye, and the
  // faces are the one large allocation in the scene.
  useEffect(
    () => () => {
      rig.current?.target.dispose();
      rig.current?.material.dispose();
      rig.current = null;
    },
    []
  );

  useFrame((state) => {
    const { gl, scene, camera, size } = state;
    const lens = lensNow();
    if (!lensBends(lens.lens)) {
      gl.render(scene, camera);
      return;
    }

    if (!rig.current) rig.current = makeLensRig(handheld ? HANDHELD_FACE_PX : FACE_PX);
    const { cube, material, quad, screen } = rig.current;
    cube.position.copy(camera.position);
    cube.update(gl, scene);
    material.uniforms.uRot.value.setFromMatrix4(camera.matrixWorld);
    material.uniforms.uHalf.value = (lens.hfov * DEG) / 2;
    material.uniforms.uAspect.value = size.width / size.height;
    material.uniforms.uK.value = lens.lens;
    material.uniforms.uShift.value.set(lens.share, lens.lift);
    gl.render(quad, screen);
  }, 1);

  return null;
}
