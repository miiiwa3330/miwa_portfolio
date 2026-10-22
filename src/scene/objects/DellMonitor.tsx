"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { DELL_HOUSING_DEPTH, DESK_TOP_Y, MONITORS, MONITOR_STANDS, monitorFrameMiddle, type DellMonitorKey } from "../room/layout";

/**
 * The two Dell monitors (`MONITORS`): the main one, a U3223QE on its stand
 * (`MONITOR_STANDS`), and the video one, a P2422H stood on end without its
 * stand, leaning on a kickstand (`Kickstand`, drawn in the desk's frame).
 * Each is a front frame barely wider than the screen and a back that swells
 * into a housing behind the lower middle; the U3223QE's stand is a leaning
 * column and a flat base. The
 * owner's name is printed on the frame under the screen, where the maker's
 * logo is (as the keyboard's "Miiiwa Professional3" and the mouse's
 * "Miiiwa").
 *
 * Drawn in the monitor's group (`RoomScene`, turned by its yaw and pitch):
 * origin at the middle of the screen and of the frame's depth, +Z out of the
 * screen. The panel — frame, housing, name, light and the caller's glass
 * (`children`) — turns on its pivot by the monitor's `roll`; the stand
 * does not, it stands on the desk.
 *
 * **Step 1 (form).** Plain materials; dust and fingerprints come later.
 * **仮**: the housing's outline and how far it swells, the column's lean,
 * where the joystick and the light sit — read from the models' general look,
 * not from photos.
 */

/** How each model looks beyond its measured size: its colours, and its housing (outline, corner, middle's height, rolled edge). */
const LOOKS: Record<DellMonitorKey, { shell: string; stand: string; housing: { width: number; height: number; corner: number; y: number; bevel: number } }> = {
  // Platinum silver back and stand.
  gui: { shell: "#b5b8bc", stand: "#a3a7ad", housing: { width: 0.5, height: 0.28, corner: 0.05, y: -0.04, bevel: 0.014 } },
  // All black.
  video: { shell: "#1d1f23", stand: "#25272b", housing: { width: 0.36, height: 0.2, corner: 0.04, y: -0.03, bevel: 0.012 } },
};

function makeMaterials(which: DellMonitorKey) {
  const look = LOOKS[which];
  return {
    frame: new THREE.MeshStandardMaterial({ color: "#0f1012", roughness: 0.55, metalness: 0.1 }),
    shell: new THREE.MeshStandardMaterial({ color: look.shell, roughness: 0.42, metalness: 0.25 }),
    stand: new THREE.MeshStandardMaterial({ color: look.stand, roughness: 0.32, metalness: 0.7 }),
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

export default function DellMonitor({ which, children }: { which: DellMonitorKey; children?: ReactNode }) {
  const monitor = MONITORS[which];
  const stand = which === "gui" ? MONITOR_STANDS.gui : null;
  const housingLook = LOOKS[which].housing;
  const frame = monitor.bezel;
  // The frame's front and back faces, and its middle's height (it runs further down than up: `chin`).
  const front = frame.depth / 2;
  const back = -frame.depth / 2;
  const frameY = monitorFrameMiddle(which)[1];
  // The strip of frame under the screen, where the name and the light are.
  const under = (frame.height - monitor.screen.height + monitor.chin) / 2;
  const underY = -monitor.screen.height / 2 - under / 2;
  const housingBack = front - DELL_HOUSING_DEPTH[which];
  /** The desk's top, in the monitor's frame. */
  const desk = DESK_TOP_Y - monitor.y;

  const m = useMemo(() => makeMaterials(which), [which]);
  const name = useMemo(() => makeNameTexture(), []);
  const housing = useMemo(
    () => pillow(housingLook.width, housingLook.height, housingLook.corner, back - housingBack + 0.004, housingLook.bevel),
    [housingLook, back, housingBack]
  );
  const base = useMemo(() => {
    if (!stand) return null;
    const { width, thickness, corner, setBack } = stand.base;
    const depth = stand.depth - setBack;
    const geometry = pillow(width, depth, corner, thickness, 0.003);
    // Laid flat: the outline's +Y runs back from the front edge.
    geometry.rotateX(-Math.PI / 2);
    return { geometry, depth };
  }, [stand]);
  useEffect(
    () => () => {
      Object.values(m).forEach((material) => material.dispose());
      name.dispose();
      housing.dispose();
      base?.geometry.dispose();
    },
    [m, name, housing, base]
  );

  // The column runs from the back of the base up to the pivot behind the
  // middle of the panel, leaning forward. Its foot is a little in from the
  // base's back edge. The pivot is the frame's middle as the panel is turned.
  const column = useMemo(() => {
    if (!stand) return null;
    const [mx, my] = monitorFrameMiddle(which);
    const pivotY = mx * Math.sin(monitor.roll) + my * Math.cos(monitor.roll);
    const foot = new THREE.Vector3(0, desk + stand.base.thickness, front - stand.depth + 0.05);
    const top = new THREE.Vector3(0, pivotY + 0.02, housingBack - stand.column.depth / 2 + 0.004);
    const along = top.clone().sub(foot);
    return {
      at: foot.clone().add(top).multiplyScalar(0.5).toArray() as [number, number, number],
      length: along.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize()),
    };
  }, [which, monitor.roll, desk, stand, front, housingBack]);

  return (
    <>
      <group rotation={[0, 0, monitor.roll]}>
        {/* The frame: a thin black front on the shell's edge. */}
        <RoundedBox args={[frame.width, frame.height, 0.004]} radius={0.0019} smoothness={3} position={[0, frameY, front - 0.002]} material={m.frame} />
        <RoundedBox args={[frame.width, frame.height, frame.depth - 0.004]} radius={0.004} smoothness={3} position={[0, frameY, -0.002]} material={m.shell} />
        {/* The housing swelling out behind the lower middle. */}
        <mesh geometry={housing} position={[0, housingLook.y, housingBack]} material={m.shell} />
        {/* The ports, facing down out of the housing's underside. */}
        <mesh position={[0, housingLook.y - housingLook.height / 2 + 0.006, (back + housingBack) / 2]} material={m.dark}>
          <boxGeometry args={[housingLook.width * 0.55, 0.002, (back - housingBack) * 0.6]} />
        </mesh>
        {/* The joystick behind the right of the screen, where the hand finds it. */}
        <mesh position={[frame.width / 2 - 0.06, frameY - frame.height / 2 + 0.035, back - 0.004]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
          <cylinderGeometry args={[0.0045, 0.0045, 0.008, 12]} />
        </mesh>
        {/* The name under the screen, and the power light at the frame's bottom right. */}
        <mesh position={[0, underY, front + 0.0003]}>
          <planeGeometry args={[Math.min(0.042, under * 4), Math.min(0.042, under * 4) * (48 / 256)]} />
          <meshBasicMaterial map={name} transparent toneMapped={false} />
        </mesh>
        <mesh position={[frame.width / 2 - 0.03, underY, front + 0.0003]} material={m.light}>
          <planeGeometry args={[0.004, 0.0012]} />
        </mesh>
        {children}
      </group>
      {stand && column && base && (
        <>
          {/* The stand. */}
          <RoundedBox
            args={[stand.column.width, column.length, stand.column.depth]}
            radius={0.008}
            smoothness={3}
            position={column.at}
            quaternion={column.quaternion}
            material={m.stand}
          />
          <mesh geometry={base.geometry} position={[0, desk, front - stand.base.setBack - base.depth / 2]} material={m.stand} />
        </>
      )}
    </>
  );
}
