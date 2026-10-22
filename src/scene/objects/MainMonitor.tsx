"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { KEYBOARD, MAIN_STAND, MONITORS } from "../room/layout";

/**
 * The main monitor, a Dell UltraSharp U3223QE (`MONITORS.gui`,
 * `MAIN_STAND`): a black front frame barely wider than the screen, a silver
 * back that swells into a housing behind the lower middle, a leaning column
 * and a flat base. The owner's name is printed on the frame under the
 * screen, where the maker's logo is (as the keyboard's "Miiiwa
 * Professional3" and the mouse's "Miiiwa").
 *
 * Drawn in the monitor's own group (`RoomScene`): origin at the middle of the
 * screen and of the frame's depth, +Z out of the screen. The screen's glass is
 * the caller's (`children`), laid on the frame as on the other monitors.
 *
 * **Step 1 (form).** Plain materials; dust and fingerprints come later.
 * **仮**: the housing's outline and how far it swells, the column's lean,
 * where the joystick and the light sit — read from the model's
 * general look, not from a photo.
 */

const MONITOR = MONITORS.gui;
const FRAME = MONITOR.bezel;
/** The frame's front and back faces, and its middle's height (it runs further down than up: `chin`). */
const FRONT = FRAME.depth / 2;
const BACK = -FRAME.depth / 2;
const FRAME_Y = -MONITOR.chin / 2;
/** The strip of frame under the screen, where the name and the light are. */
const UNDER = (FRAME.height - MONITOR.screen.height + MONITOR.chin) / 2;
const UNDER_Y = -MONITOR.screen.height / 2 - UNDER / 2;
/** The desk's top, in the monitor's frame. */
const DESK = KEYBOARD.y - MONITOR.y;

/** The housing behind the screen: its outline seen from behind, how far it swells, and its middle's height. */
const HOUSING = { width: 0.5, height: 0.28, corner: 0.05, y: -0.04, bevel: 0.014 } as const;
const HOUSING_BACK = FRONT - MAIN_STAND.housingDepth;

function makeMaterials() {
  return {
    frame: new THREE.MeshStandardMaterial({ color: "#0f1012", roughness: 0.55, metalness: 0.1 }),
    shell: new THREE.MeshStandardMaterial({ color: "#b5b8bc", roughness: 0.42, metalness: 0.25 }),
    stand: new THREE.MeshStandardMaterial({ color: "#a3a7ad", roughness: 0.32, metalness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: "#1b1c1f", roughness: 0.7, metalness: 0.2 }),
    light: new THREE.MeshBasicMaterial({ color: "#f4f7ff", toneMapped: false }),
  };
}

/** A rounded rectangle centred on the origin. */
function roundedRect(width: number, height: number, corner: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(corner, w, h);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

/**
 * A rounded rectangle pushed out along +Z with its edges rolled over by
 * `bevel`: the outline is shrunk by the bevel first, so the finished piece is
 * `width` × `height` and spans `0` to `depth`.
 */
function pillow(width: number, height: number, corner: number, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const shape = roundedRect(width - 2 * bevel, height - 2 * bevel, Math.max(0, corner - bevel));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 6,
    curveSegments: 10,
  });
  geometry.translate(0, 0, bevel);
  return geometry;
}

/** The owner's name, the way the maker's logo sits on the frame under the screen. */
function makeNameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#8d9096";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '600 34px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillText("Miiiwa", canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default function MainMonitor({ children }: { children?: ReactNode }) {
  const m = useMemo(() => makeMaterials(), []);
  const name = useMemo(() => makeNameTexture(), []);
  const housing = useMemo(
    () => pillow(HOUSING.width, HOUSING.height, HOUSING.corner, BACK - HOUSING_BACK + 0.004, HOUSING.bevel),
    []
  );
  const base = useMemo(() => {
    const { width, thickness, corner, setBack } = MAIN_STAND.base;
    const depth = MAIN_STAND.depth - setBack;
    const geometry = pillow(width, depth, corner, thickness, 0.003);
    // Laid flat: the outline's +Y runs back from the front edge.
    geometry.rotateX(-Math.PI / 2);
    return { geometry, depth };
  }, []);
  useEffect(
    () => () => {
      Object.values(m).forEach((material) => material.dispose());
      name.dispose();
      housing.dispose();
      base.geometry.dispose();
    },
    [m, name, housing, base]
  );

  // The column runs from the back of the base up into the housing, leaning
  // forward. Its foot is a little in from the base's back edge.
  const column = useMemo(() => {
    const foot = new THREE.Vector3(0, DESK + MAIN_STAND.base.thickness, FRONT - MAIN_STAND.depth + 0.05);
    const top = new THREE.Vector3(0, HOUSING.y + 0.06, HOUSING_BACK - MAIN_STAND.column.depth / 2 + 0.004);
    const along = top.clone().sub(foot);
    return {
      at: foot.clone().add(top).multiplyScalar(0.5).toArray() as [number, number, number],
      length: along.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize()),
    };
  }, []);

  return (
    <>
      {/* The frame: a thin black front on a silver edge. */}
      <RoundedBox args={[FRAME.width, FRAME.height, 0.004]} radius={0.0019} smoothness={3} position={[0, FRAME_Y, FRONT - 0.002]} material={m.frame} />
      <RoundedBox args={[FRAME.width, FRAME.height, FRAME.depth - 0.004]} radius={0.004} smoothness={3} position={[0, FRAME_Y, -0.002]} material={m.shell} />
      {/* The housing swelling out behind the lower middle. */}
      <mesh geometry={housing} position={[0, HOUSING.y, HOUSING_BACK]} material={m.shell} />
      {/* The ports, facing down out of the housing's underside. */}
      <mesh position={[0, HOUSING.y - HOUSING.height / 2 + 0.006, (BACK + HOUSING_BACK) / 2]} material={m.dark}>
        <boxGeometry args={[HOUSING.width * 0.55, 0.002, (BACK - HOUSING_BACK) * 0.6]} />
      </mesh>
      {/* The joystick behind the right of the screen, where the hand finds it. */}
      <mesh position={[FRAME.width / 2 - 0.06, -FRAME.height / 2 + 0.035, BACK - 0.004]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.008, 12]} />
      </mesh>
      {/* The name under the screen, and the power light at the frame's bottom right. */}
      <mesh position={[0, UNDER_Y, FRONT + 0.0003]}>
        <planeGeometry args={[0.042, 0.042 * (48 / 256)]} />
        <meshBasicMaterial map={name} transparent toneMapped={false} />
      </mesh>
      <mesh position={[FRAME.width / 2 - 0.03, UNDER_Y, FRONT + 0.0003]} material={m.light}>
        <planeGeometry args={[0.004, 0.0012]} />
      </mesh>
      {/* The stand. */}
      <RoundedBox
        args={[MAIN_STAND.column.width, column.length, MAIN_STAND.column.depth]}
        radius={0.008}
        smoothness={3}
        position={column.at}
        quaternion={column.quaternion}
        material={m.stand}
      />
      <mesh geometry={base.geometry} position={[0, DESK, FRONT - MAIN_STAND.base.setBack - base.depth / 2]} material={m.stand} />
      {children}
    </>
  );
}
