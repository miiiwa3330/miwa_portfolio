"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  FACE_COPY_FRAGMENT_SHADER,
  LENS_FRAGMENT_SHADER,
  LENS_VERTEX_SHADER,
  STEREOGRAPHIC,
  cubeFaceSize,
} from "./camera/fisheye";
import { lensBends } from "./camera/roomCamera";
import { viewNow } from "./camera/viewChannel";
import { hfovForZoom } from "./room/layout";
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
 * **Each face is antialiased, and as fine as the screen needs.** Drawn
 * straight into the cube (as `CubeCamera.update` does), the faces had no
 * antialiasing and a fixed 1024 px, which a retina screen stretched ~1.85× —
 * every edge a magnified staircase (2026-10-01, "魚眼時にオブジェクトがガビガビ").
 * Now each face is drawn into one multisampled half-float target, then
 * tone-mapped into the cube (8-bit sRGB, so the cube costs a quarter of a
 * half-float one), which is mip-mapped for the face corners, where the cube
 * is denser than the screen.
 *
 * Takes over R3F's rendering outright (a positive `useFrame` priority), so it
 * runs after everything else has moved for the frame.
 */

const DEG = Math.PI / 180;

/**
 * **Provisional (仮).** The largest cube face, in px. At 1536 the cube is
 * about 75 MB with its mipmaps and the multisampled working target about
 * 94 MB; a phone is held to 1024 (about 33 MB and 42 MB).
 */
const FACE_CAP = 1536;
const HANDHELD_FACE_CAP = 1024;
/** MSAA samples for the working target — the canvas's own antialiasing is 4× on most devices. */
const FACE_SAMPLES = 4;

type LensRig = {
  size: number;
  work: THREE.WebGLRenderTarget;
  target: THREE.WebGLCubeRenderTarget;
  cube: THREE.CubeCamera;
  copy: THREE.ShaderMaterial;
  copyScene: THREE.Scene;
  lens: THREE.ShaderMaterial;
  lensScene: THREE.Scene;
  screen: THREE.OrthographicCamera;
};

function fullScreen(material: THREE.ShaderMaterial): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  return scene;
}

function makeLensRig(size: number): LensRig {
  const work = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, samples: FACE_SAMPLES });
  const target = new THREE.WebGLCubeRenderTarget(size, {
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  // The same near and far as the main camera (Scene.tsx's <Canvas>). Only its
  // six child cameras are used: each is pointed at its face the way three.js
  // lays a cube map out.
  const cube = new THREE.CubeCamera(0.05, 60, target);
  const copy = new THREE.ShaderMaterial({
    uniforms: { uFace: { value: work.texture }, uExposure: { value: 1 } },
    vertexShader: LENS_VERTEX_SHADER,
    fragmentShader: FACE_COPY_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const lens = new THREE.ShaderMaterial({
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
    // The cube is already tone-mapped; only the screen's encoding is left.
    toneMapped: false,
  });
  const screen = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { size, work, target, cube, copy, copyScene: fullScreen(copy), lens, lensScene: fullScreen(lens), screen };
}

function disposeRig(rig: LensRig) {
  rig.work.dispose();
  rig.target.dispose();
  rig.copy.dispose();
  rig.lens.dispose();
}

/** Draw the room into the cube: each face antialiased in `work`, then tone-mapped into its face. */
function drawCube(gl: THREE.WebGLRenderer, scene: THREE.Scene, rig: LensRig, position: THREE.Vector3) {
  const { cube, target, work, copyScene, copy, screen } = rig;
  cube.position.copy(position);
  cube.updateMatrixWorld();
  if (cube.coordinateSystem !== gl.coordinateSystem) {
    cube.coordinateSystem = gl.coordinateSystem;
    cube.updateCoordinateSystem();
  }
  copy.uniforms.uExposure.value = gl.toneMappingExposure;
  const faces = cube.children as THREE.PerspectiveCamera[];
  const previous = gl.getRenderTarget();
  faces.forEach((face, i) => {
    gl.setRenderTarget(work);
    gl.render(scene, face);
    // Mipmaps once, after the last face (as `CubeCamera.update` does).
    target.texture.generateMipmaps = i === faces.length - 1;
    gl.setRenderTarget(target, i);
    gl.render(copyScene, screen);
  });
  target.texture.generateMipmaps = true;
  gl.setRenderTarget(previous);
}

export default function LensRenderer() {
  const handheld = useHandheld();
  const rig = useRef<LensRig | null>(null);

  // Built on first use and kept: most visits never open the fisheye, and the
  // faces are the one large allocation in the scene.
  useEffect(
    () => () => {
      if (rig.current) disposeRig(rig.current);
      rig.current = null;
    },
    []
  );

  useFrame((state) => {
    const { gl, scene, camera, size } = state;
    const lens = viewNow().pose;
    if (!lensBends(lens.lens)) {
      gl.render(scene, camera);
      return;
    }

    // Sized for the fisheye stage on this screen. Rebuilt only if a resize
    // moves the need by more than a step, so a ragged resize does not
    // reallocate every frame.
    const wanted = cubeFaceSize(size.width, gl.getPixelRatio(), hfovForZoom("fisheye", handheld), STEREOGRAPHIC, handheld ? HANDHELD_FACE_CAP : FACE_CAP);
    if (rig.current && Math.abs(rig.current.size - wanted) >= 128) {
      disposeRig(rig.current);
      rig.current = null;
    }
    if (!rig.current) rig.current = makeLensRig(wanted);

    drawCube(gl, scene, rig.current, camera.position);
    const material = rig.current.lens;
    material.uniforms.uRot.value.setFromMatrix4(camera.matrixWorld);
    material.uniforms.uHalf.value = (lens.hfov * DEG) / 2;
    material.uniforms.uAspect.value = size.width / size.height;
    material.uniforms.uK.value = lens.lens;
    material.uniforms.uShift.value.set(lens.share, lens.lift);
    gl.render(rig.current.lensScene, rig.current.screen);
  }, 1);

  return null;
}
