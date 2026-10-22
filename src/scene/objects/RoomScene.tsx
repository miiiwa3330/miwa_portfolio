"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BOARD_FRAME,
  MONITORS,
  monitorGlass,
  DESK_LAMP_BASE,
  PIECES,
  ROOM_RADIUS,
  SUBJECTS,
  WALL_HEIGHT,
  CHAIR_BACK_HEIGHT,
  CHAIR_SEAT,
  CHAIR_SEAT_FORWARD,
  CHAIR_SEAT_TOP,
  horizontalAt,
  pieceCentreDistance,
  pieceToWorld,
  wallRibAngles,
  FLOOR_SEGMENTS,
  type MonitorKey,
  type PieceKey,
} from "../room/layout";
import { DESK_SCREEN, HOLOGRAM_PANEL, type Panel } from "../room/screens";
import { useAppState } from "@/state/AppStateContext";
import { useCursor } from "@react-three/drei";
import { AMBIENT_FLOOR, neonTheme, type LightSwitch, type NeonTheme, type RoomLights } from "../room/lighting";
import { pointerClaim } from "../pointerClaim";
import { makeCityTexture, makeFloorTexture, makeVideo, makeWallTexture } from "./roomTextures";
import { panelShown } from "../camera/cssView";
import { bodyNow, viewNow } from "../camera/viewChannel";
import { chairPlacement } from "../room/seat";
import { SCREEN_HOLE_LAYER } from "../layers";
import { hash01 } from "../hash";
import { sceneClock } from "../sceneClock";
import SectionMarkers from "./SectionMarkers";
import Self from "./Self";
import CurveMirror from "./CurveMirror";
import HologramSelf from "./HologramSelf";
import { SecurityCameraBody, SecurityFeed } from "./SecurityCamera";
import { DeskBody, DeskLamp, DeskMat, DeskMonitor, DeskSmalls, useDeskMaterials } from "./DeskSet";
import DellMonitor from "./DellMonitor";
import MonitorArm from "./MonitorArm";
import Kickstand from "./Kickstand";
import Macintosh from "./Macintosh";
import MacKeyboard from "./MacKeyboard";
import ExgMouse from "./ExgMouse";
import HhkbKeyboard from "./HhkbKeyboard";

/**
 * The room the camera stands in — **placeholder shapes** (step 2 of
 * docs/room-migration.md). Where everything stands comes from
 * `scene/room/layout.ts`; what it looks like is boxes and cylinders until the
 * step that builds the furniture properly (step 8). Kept close to
 * the room-lab prototype, which the user tuned the room's size and views in.
 */

const DEG = Math.PI / 180;

/** A piece of furniture's own frame: local +Z faces the centre, +X is to the right seen from there. */
function Piece({ name, children }: { name: PieceKey; children: ReactNode }) {
  const piece = PIECES[name];
  const distance = pieceCentreDistance(piece);
  const [x, z] = horizontalAt(piece.angle);
  return (
    // rotation.y = -angle turns local +Z to point back at the centre — the
    // frame `pieceToWorld` assumes.
    <group position={[x * distance, 0, z * distance]} rotation={[0, -piece.angle * DEG, 0]}>
      {children}
    </group>
  );
}

type BoxProps = {
  size: [number, number, number];
  at: [number, number, number];
  color: string;
  glow?: string;
  glowStrength?: number;
  rotation?: [number, number, number];
};

function Box({ size, at, color, glow, glowStrength = 2, rotation }: BoxProps) {
  return (
    <mesh position={at} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.75}
        metalness={0.35}
        emissive={glow ?? "#000000"}
        emissiveIntensity={glow ? glowStrength : 0}
      />
    </mesh>
  );
}

const RIB_ANGLES = wallRibAngles();

/**
 * The cables slung under the ceiling (`reference/4/2.png`): each runs from a
 * point near the top of the wall to the ring round the ceiling light, sagging
 * on the way.
 */
function useCables(): THREE.TubeGeometry[] {
  const cables = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * 360 + hash01(i + 400) * 18;
        const [x, z] = horizontalAt(angle);
        const [ex, ez] = horizontalAt(angle + 40 + hash01(i + 410) * 60);
        const from = new THREE.Vector3(x * (ROOM_RADIUS - 0.1), WALL_HEIGHT - 0.1 - hash01(i + 420) * 0.2, z * (ROOM_RADIUS - 0.1));
        const to = new THREE.Vector3(ex * 0.6, WALL_HEIGHT - 0.06, ez * 0.6);
        const mid = from.clone().lerp(to, 0.5);
        mid.y -= 0.25 + hash01(i + 430) * 0.35;
        return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 24, 0.012 + hash01(i + 440) * 0.014, 6);
      }),
    []
  );
  useEffect(() => () => cables.forEach((c) => c.dispose()), [cables]);
  return cables;
}


export function Shell({ ceiling, neon }: { ceiling: boolean; neon: NeonTheme }) {
  const wall = useMemo(() => makeWallTexture(), []);
  const floor = useMemo(() => makeFloorTexture(), []);
  useEffect(
    () => () => {
      wall.dispose();
      floor.dispose();
    },
    [wall, floor]
  );
  const cables = useCables();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_RADIUS * 2, ROOM_RADIUS * 2, FLOOR_SEGMENTS, FLOOR_SEGMENTS]} />
        {/* A little gloss, so the neon pools on it the way it does in the reference. */}
        <meshStandardMaterial map={floor} roughness={0.32} metalness={0.55} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 128, 1, true]} />
        <meshStandardMaterial map={wall} roughness={0.75} metalness={0.4} side={THREE.BackSide} />
      </mesh>
      {RIB_ANGLES.map((angle) => {
        const [x, z] = horizontalAt(angle);
        return (
          <mesh key={angle} position={[x * (ROOM_RADIUS - 0.04), WALL_HEIGHT / 2, z * (ROOM_RADIUS - 0.04)]} rotation={[0, -angle * DEG, 0]}>
            <boxGeometry args={[0.1, WALL_HEIGHT, 0.08]} />
            <meshStandardMaterial color="#2a2e35" roughness={0.6} metalness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_RADIUS * 2, ROOM_RADIUS * 2, FLOOR_SEGMENTS, FLOOR_SEGMENTS]} />
        <meshStandardMaterial color="#15171b" roughness={0.9} />
      </mesh>
      {[
        [ROOM_RADIUS - 0.25, WALL_HEIGHT - 0.18, 0.06],
        [ROOM_RADIUS - 0.45, WALL_HEIGHT - 0.3, 0.04],
        [ROOM_RADIUS - 0.33, WALL_HEIGHT - 0.12, 0.03],
      ].map(([radius, y, tube]) => (
        <mesh key={radius} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, tube, 8, 96]} />
          <meshStandardMaterial color="#3b3f47" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}
      {cables.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial color={i % 4 === 0 ? "#3a2a1c" : "#101216"} roughness={0.7} />
        </mesh>
      ))}
      {/* A strip of the neon's cool colour round the top of the wall. */}
      <mesh position={[0, WALL_HEIGHT - 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ROOM_RADIUS - 0.06, 0.012, 6, 128]} />
        <meshBasicMaterial color={neon.cool} toneMapped={false} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 8, 48]} />
        <meshStandardMaterial color="#000000" emissive="#ffe0b8" emissiveIntensity={ceiling ? 1.5 : 0.04} />
      </mesh>
    </group>
  );
}

/**
 * A cut-out in the picture where HTML placed in the room shows through: a
 * rectangle that writes depth, and colour and alpha of zero. The HTML sits in
 * a layer *behind* the canvas (`hub/room/RoomHtml.tsx`), so anything in front
 * of the screen — the chair, the lamp — still draws over it, which HTML laid
 * over the canvas could never do (prototype 2, docs/room-migration.md).
 *
 * Shown exactly when the HTML is (`panelShown`), so there is never a hole
 * with nothing behind it. Only the reader's own camera draws it
 * (`SCREEN_HOLE_LAYER`); through the fisheye, the screen's lit face shows.
 */
function ScreenHole({ panel }: { panel: Panel }) {
  const mesh = useRef<THREE.Mesh>(null);
  const quaternion = useMemo(() => {
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...panel.right),
      new THREE.Vector3(...panel.up),
      new THREE.Vector3(...panel.normal)
    );
    return new THREE.Quaternion().setFromRotationMatrix(basis);
  }, [panel]);
  useEffect(() => {
    mesh.current?.layers.set(SCREEN_HOLE_LAYER);
  }, []);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = panelShown(panel, viewNow().pose);
  });
  return (
    <mesh ref={mesh} position={panel.centre} quaternion={quaternion}>
      <planeGeometry args={[panel.width, panel.height]} />
      {/* No blending, so the zero alpha is written as it is rather than mixed
          with what was already drawn there. */}
      <meshBasicMaterial color="#000000" opacity={0} blending={THREE.NoBlending} toneMapped={false} />
    </mesh>
  );
}

/**
 * The left monitor's video — a procedural loop until there is footage
 * (`makeVideo`). Repainted about fifteen times a second on the room's clock,
 * so the pause button stops it like everything else that moves by itself.
 *
 * Drawn in the panel's own frame, which the monitor's `roll` has stood on
 * end: the picture is turned back by the same amount, so it plays upright,
 * as a portrait picture on a monitor pivoted to portrait does.
 */
const VIDEO_PX_PER_METRE = 600;
function VideoFeed() {
  const { screen, roll } = MONITORS.video;
  const glass = monitorGlass("video");
  // A quarter turn swaps which of the screen's sides is across the picture.
  const quarter = Math.abs(Math.sin(roll)) > 0.5;
  const across = quarter ? screen.height : screen.width;
  const up = quarter ? screen.width : screen.height;
  const video = useMemo(() => makeVideo(Math.round(across * VIDEO_PX_PER_METRE), Math.round(up * VIDEO_PX_PER_METRE)), [across, up]);
  useEffect(() => () => video.texture.dispose(), [video]);
  const last = useRef(-1);
  useFrame((state) => {
    const t = sceneClock.time(state.clock.elapsedTime);
    if (Math.abs(t - last.current) < 1 / 15) return;
    last.current = t;
    video.draw(t);
  });
  return (
    <mesh position={[0, 0, glass.z + glass.thickness / 2 + 0.0002]} rotation={[0, 0, -roll]}>
      <planeGeometry args={[across, up]} />
      <meshBasicMaterial map={video.texture} />
    </mesh>
  );
}

/** The lit colour each monitor shows where no HTML is drawn on it: the fisheye's view, and the other two screens. */
const MONITOR_GLOW: Record<MonitorKey, string> = { video: "#c45ad0", gui: "#1f5f9e", camera: "#3a3d3a" };

/**
 * The desk and the PC. `typing` makes the keyboard and the mouse follow the
 * reader's own keys, pointer and clicks; by default, while the reader sits at
 * the PC.
 */
export function Desk({ typing }: { typing?: boolean }) {
  const holoX = SUBJECTS.about.local[0];
  // The hologram is projecting the self-introduction while About is focused.
  // Read from the app's state, which changes only when an area is entered or
  // left — cheap enough to re-render the desk on.
  const { activeSection, lights } = useAppState();
  const projecting = activeSection === "about";
  const seated = activeSection === "desk";
  const lamp = lights.desk;
  const m = useDeskMaterials();
  // Where the cone of light meets the bottom of the text.
  const beamTop = SUBJECTS.about.local[1] - HOLOGRAM_PANEL.height / 2;
  return (
    <Piece name="desk">
      <DeskBody m={m} />
      <DeskSmalls m={m} />
      {/* Three monitors: the video on end on a kickstand (a P2422H), the PC's own screen (a U3223QE), and the security camera above it on its arm. */}
      {(Object.keys(MONITORS) as MonitorKey[]).map((key) => {
        const { x, y, z, yaw, pitch, screen } = MONITORS[key];
        const glass = monitorGlass(key);
        const lit = (
          <>
            <Box
              size={[screen.width, screen.height, glass.thickness]}
              at={[0, 0, glass.z]}
              color="#000000"
              glow={MONITOR_GLOW[key]}
              glowStrength={1.2}
            />
            {key === "camera" && <SecurityFeed />}
            {key === "video" && <VideoFeed />}
          </>
        );
        return (
          <group key={key} position={[x, y, z]} rotation={[pitch, yaw, 0, "YXZ"]}>
            {key === "gui" || key === "video" ? (
              <DellMonitor which={key}>{lit}</DellMonitor>
            ) : (
              <DeskMonitor m={m} monitor={MONITORS[key]}>
                {lit}
              </DeskMonitor>
            )}
          </group>
        );
      })}
      <MonitorArm />
      <Kickstand />
      <Macintosh />
      <MacKeyboard />
      {/* The keyboard and the mouse, where a seated reader's hands rest (`Self`). */}
      <DeskMat m={m} />
      <HhkbKeyboard typing={typing ?? seated} />
      <ExgMouse typing={typing ?? seated} />
      {/* The hologram's device. Idle, it projects the reader themselves, turning
          (`HologramSelf`); focused, it projects the self-introduction instead — the text is
          HTML in front of the canvas (`HOLOGRAM_PANEL`), and a cone of light
          joins it to the device. */}
      <Box size={[0.28, 0.08, 0.2]} at={[holoX, 0.815, 0]} color="#2a2d33" />
      <Box size={[0.2, 0.01, 0.12]} at={[holoX, 0.86, 0]} color="#000000" glow="#2fe8ff" glowStrength={3} />
      <HologramSelf at={SUBJECTS.about.local} visible={!projecting} />
      <mesh position={[holoX, (0.865 + beamTop) / 2, SUBJECTS.about.local[2]]}>
        <cylinderGeometry args={[HOLOGRAM_PANEL.width / 2, 0.08, beamTop - 0.865, 32, 1, true]} />
        <meshBasicMaterial
          color="#2fe8ff"
          transparent
          opacity={projecting ? 0.16 : 0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Desk lamp (the "desk light" the lighting requirement switches). */}
      <DeskLamp m={m} bulb={DESK_LAMP_BULB} on={lamp} />
      <Chair />
    </Piece>
  );
}

/**
 * The chair, where the reader sits down at the PC: its back just behind the
 * seated eye. Moved every frame from the reader's held pose
 * (`chairPlacement`): aside while nobody sits on it, brought round behind the
 * reader walking in, under them sitting down, and rolled in with them. Its
 * back stops below the line of sight from the centre to the bottom of the
 * screen — a taller back (the prototype's 1.19 m) blacked out the lower half
 * of the PC's screen at home.
 */
function Chair() {
  const chair = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!chair.current) return;
    const { x, z, yaw } = chairPlacement(bodyNow().held);
    chair.current.position.set(x, 0, z);
    chair.current.rotation.set(0, yaw, 0);
  });
  return (
    <group ref={chair}>
      <Box size={[CHAIR_SEAT.width, 0.06, CHAIR_SEAT.depth]} at={[0, CHAIR_SEAT_TOP - 0.03, -CHAIR_SEAT_FORWARD]} color="#1c1e22" />
      <Box size={[0.48, 0.4, 0.04]} at={[0, CHAIR_BACK_HEIGHT - 0.2, 0]} color="#16181c" />
      <Box size={[0.04, 0.3, 0.04]} at={[0, CHAIR_SEAT_TOP - 0.03 + 0.15, 0]} color="#2a2d33" />
      {/* The gas lift and the five-legged base on its castors. */}
      {/* From the base's hub (7 cm up) to under the cushion. */}
      <mesh position={[0, (0.07 + CHAIR_SEAT_TOP - 0.06) / 2, -CHAIR_SEAT_FORWARD]}>
        <cylinderGeometry args={[0.025, 0.025, CHAIR_SEAT_TOP - 0.06 - 0.07, 10]} />
        <meshStandardMaterial color="#8a8e96" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[0, 0.07, -CHAIR_SEAT_FORWARD]} rotation={[0, a, 0]}>
            <Box size={[0.03, 0.03, 0.3]} at={[0, 0, 0.15]} color="#1c1e22" />
            <mesh position={[0, -0.04, 0.29]}>
              <sphereGeometry args={[0.025, 8, 6]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * One of the owner's gadgets on the shelf, standing for a product
 * (docs/room-migration.md: "各サービスの雰囲気に合ったガジェット"). **Provisional
 * (仮)**: three kinds — a little robot, a rocket, a rover — none of them
 * tied to a particular product yet, and none of them voxels, which is still
 * undecided.
 */
function Gadget({ kind, color }: { kind: number; color: string }) {
  const metal = <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />;
  if (kind === 0)
    return (
      <group>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.1]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.1, 0.08, 0.08]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.19, 0.041]}>
          <boxGeometry args={[0.06, 0.015, 0.002]} />
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
        </mesh>
        <mesh position={[0.03, 0.25, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.06, 4]} />
          {metal}
        </mesh>
      </group>
    );
  if (kind === 1)
    return (
      <group>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.18, 12]} />
          <meshStandardMaterial color="#e8e6e0" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.035, 0.08, 12]} />
          {metal}
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.sin((i * Math.PI * 2) / 3) * 0.04, 0.05, Math.cos((i * Math.PI * 2) / 3) * 0.04]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
            <boxGeometry args={[0.005, 0.06, 0.04]} />
            {metal}
          </mesh>
        ))}
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.1]} />
        {metal}
      </mesh>
      {[-0.07, 0.07].map((x) =>
        [-0.05, 0.05].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ))
      )}
      <mesh position={[0.05, 0.13, 0]}>
        <sphereGeometry args={[0.03, 12, 8]} />
        <meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export function Shelf({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.shelf;
  const gadgets = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        row: Math.floor(i / 3),
        column: i % 3,
        kind: Math.floor(hash01(i + 1) * 3),
        color: ["#9aa4b2", "#c9a86a", "#5aa0c8", "#b8604a", "#7fbf7f"][Math.floor(hash01(i + 101) * 5)],
      })),
    []
  );
  return (
    <Piece name="shelf">
      {/* The back glows in the neon's warm colour, the cabinet lit from inside (reference/4/2.png). */}
      <Box size={[width, 2.0, 0.03]} at={[0, 1.0, -depth / 2]} color="#1a1208" glow={neon.warm} glowStrength={0.1} />
      <Box size={[0.04, 2.0, depth]} at={[-width / 2, 1.0, 0]} color="#3a3d44" />
      <Box size={[0.04, 2.0, depth]} at={[width / 2, 1.0, 0]} color="#3a3d44" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} size={[width, 0.03, depth]} at={[0, 0.05 + i * 0.45, 0]} color="#3a3d44" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} size={[width - 0.1, 0.015, 0.02]} at={[0, 0.47 + i * 0.45, depth / 2 - 0.02]} color="#000000" glow={neon.warm} glowStrength={2.5} />
      ))}
      {gadgets.map(({ row, column, kind, color }) => (
        <group key={`${row}-${column}`} position={[-width / 2 + 0.3 + column * 0.5, 0.065 + row * 0.45, 0]} rotation={[0, (hash01(row * 3 + column + 50) - 0.5) * 0.8, 0]}>
          <Gadget kind={kind} color={color} />
        </group>
      ))}
    </Piece>
  );
}

/**
 * Every book on the bookcase in one draw — about two hundred of them, which
 * as separate meshes were two hundred draws (docs/scene-invariants.md: one
 * model, one draw call).
 */
function Books({ books, depth }: { books: { x: number; y: number; w: number; h: number; color: string }[]; depth: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const placed = new THREE.Object3D();
    const color = new THREE.Color();
    books.forEach((b, i) => {
      placed.position.set(b.x, b.y, 0);
      placed.scale.set(b.w, b.h, depth);
      placed.updateMatrix();
      m.setMatrixAt(i, placed.matrix);
      m.setColorAt(i, color.set(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [books, depth]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, books.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.75} metalness={0.1} />
    </instancedMesh>
  );
}

export function Bookcase() {
  const { width, depth } = PIECES.bookcase;
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; color: string }[] = [];
    let seed = 1;
    for (let row = 0; row < 5; row++) {
      const y = 0.04 + row * 0.41;
      let x = -width / 2 + 0.04;
      while (x < width / 2 - 0.08) {
        const w = 0.03 + hash01(seed++) * 0.035;
        const h = 0.24 + hash01(seed++) * 0.1;
        const color = ["#8b2e2e", "#2e4f8b", "#2e7a5a", "#c9a24a", "#5a4a8b", "#d0d0c8", "#333333"][Math.floor(hash01(seed++) * 7)];
        out.push({ x: x + w / 2, y: y + 0.015 + h / 2, w, h, color });
        x += w + 0.004;
      }
    }
    return out;
  }, [width]);
  return (
    <Piece name="bookcase">
      <Box size={[width, 2.5, 0.03]} at={[0, 1.25, -depth / 2]} color="#4a3a2c" />
      <Box size={[0.04, 2.5, depth]} at={[-width / 2, 1.25, 0]} color="#4a3a2c" />
      <Box size={[0.04, 2.5, depth]} at={[width / 2, 1.25, 0]} color="#4a3a2c" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Box key={i} size={[width, 0.03, depth]} at={[0, 0.04 + i * 0.41, 0]} color="#4a3a2c" />
      ))}
      <Books books={books} depth={depth * 0.8} />
    </Piece>
  );
}

/**
 * The owner's reflection in the porthole's glass — **a faint picture, not a
 * real reflection** (docs/room-migration.md): a real one is the room drawn
 * once more from behind the glass, and a head and shoulders darkening the
 * view is all the glass needs to say someone is standing in the room.
 * Provisional (仮) like the body it stands for; it does not follow the
 * reader round.
 */
function Reflection() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(128, 112, 34, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 256);
    ctx.quadraticCurveTo(56, 168, 128, 160); // shoulders
    ctx.quadraticCurveTo(200, 168, 208, 256);
    ctx.fill();
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0.12, -0.12, 0.004]}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshBasicMaterial map={texture} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function PortholeAndHammock() {
  const city = useMemo(() => makeCityTexture(), []);
  useEffect(() => () => city.dispose(), [city]);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.0, 1.3, -0.2),
        new THREE.Vector3(-0.5, 0.92, 0.1),
        new THREE.Vector3(0, 0.82, 0.2),
        new THREE.Vector3(0.5, 0.92, 0.1),
        new THREE.Vector3(1.0, 1.3, -0.2),
      ]),
    []
  );
  return (
    <Piece name="porthole">
      {/* The window sits on the wall behind the hammock's footprint. */}
      <group position={[0, 1.85, -PIECES.porthole.depth / 2 + 0.02]}>
        <mesh>
          <circleGeometry args={[0.62, 48]} />
          <meshBasicMaterial map={city} toneMapped={false} />
        </mesh>
        <Reflection />
        <mesh position={[0, 0, 0.03]}>
          <torusGeometry args={[0.66, 0.07, 12, 48]} />
          <meshStandardMaterial color="#6a6e76" metalness={0.8} />
        </mesh>
      </group>
      <mesh>
        <tubeGeometry args={[curve, 40, 0.16, 10]} />
        <meshStandardMaterial color="#b9b09a" metalness={0} roughness={1} />
      </mesh>
    </Piece>
  );
}

export function Board() {
  const { width, depth } = PIECES.board;
  const cy = SUBJECTS.experience.local[1];
  const papers = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        x: -width / 2 + 0.2 + hash01(i * 3 + 1) * (width - 0.4),
        y: cy - 0.55 + hash01(i * 3 + 2) * 1.1,
        w: 0.18 + hash01(i * 3 + 3) * 0.2,
        h: 0.14 + hash01(i * 7 + 5) * 0.22,
        color: ["#f2ede0", "#f5e27a", "#f2a7c3", "#9fd3f0", "#dddddd"][Math.floor(hash01(i * 11 + 7) * 5)],
      })),
    [width, cy]
  );
  const strings = useMemo(() => {
    const out: number[] = [];
    papers.forEach((p, i) => {
      for (const step of [3, 7]) {
        const q = papers[(i + step) % papers.length];
        if (hash01(i * 17 + step) > 0.55) out.push(p.x, p.y + p.h / 2 - 0.02, 0, q.x, q.y + q.h / 2 - 0.02, 0);
      }
    });
    return new Float32Array(out);
  }, [papers]);
  return (
    <Piece name="board">
      <Box size={[BOARD_FRAME.width, BOARD_FRAME.height, depth]} at={[0, cy, 0]} color="#3a2a1c" />
      {/* A strip lamp over the board. */}
      <Box size={[1.2, 0.05, 0.12]} at={[0, cy + 0.88, 0.08]} color="#2a2d33" />
      <Box size={[1.1, 0.01, 0.08]} at={[0, cy + 0.85, 0.08]} color="#000000" glow="#ffcf8a" glowStrength={2.2} />
      <Box size={[width, 1.5, depth + 0.01]} at={[0, cy, 0.002]} color="#b08a5a" />
      {papers.map((p, i) => (
        <Box key={i} size={[p.w, p.h, 0.004]} at={[p.x, p.y, depth / 2 + 0.01 + i * 0.0005]} color={p.color} />
      ))}
      {/* Pins, and the red string between them — a detective's wall (reference/3/sousa-board1.png).
          Which notes are joined is decoration for now; the string is meant to
          follow the links from the experience entries to the products. */}
      {papers.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + p.h / 2 - 0.02, depth / 2 + 0.025]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#c0262d" roughness={0.4} />
        </mesh>
      ))}
      <lineSegments position={[0, 0, depth / 2 + 0.03]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[strings, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d0202a" />
      </lineSegments>
    </Piece>
  );
}

export function Comms({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.comms;
  return (
    <Piece name="comms">
      <Box size={[width, 0.95, depth]} at={[0, 0.475, 0]} color="#3d4148" />
      <group position={[0, 1.28, -0.12]} rotation={[-0.25, 0, 0]}>
        <Box size={[0.62, 0.42, 0.05]} at={[0, 0, 0]} color="#1a1c20" />
        <Box size={[0.56, 0.36, 0.01]} at={[0, 0, 0.03]} color="#000000" glow={neon.cool} glowStrength={0.9} />
      </group>
      {/* The radio set: a box of dials and a readout, and a microphone on a stalk. */}
      <Box size={[0.3, 0.16, 0.25]} at={[-0.38, 1.03, 0.05]} color="#55504a" />
      <Box size={[0.12, 0.04, 0.005]} at={[-0.42, 1.07, 0.178]} color="#000000" glow={neon.warm} glowStrength={2} />
      {[-0.48, -0.38, -0.28].map((x) => (
        <mesh key={x} position={[x, 1.0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
          <meshStandardMaterial color="#c8ccd2" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <Box size={[0.02, 0.6, 0.02]} at={[0.45, 1.25, -0.2]} color="#888888" />
      <mesh position={[0.3, 1.1, 0.12]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
        <meshStandardMaterial color="#2a2d33" />
      </mesh>
      <mesh position={[0.3, 1.2, 0.16]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.9} />
      </mesh>
      {/* A row of status lights along the front of the cabinet. */}
      {Array.from({ length: 8 }, (_, i) => (
        <Box
          key={i}
          size={[0.03, 0.015, 0.005]}
          at={[-0.4 + i * 0.11, 0.85, depth / 2 + 0.003]}
          color="#000000"
          glow={hash01(i + 900) > 0.4 ? neon.cool : neon.warm}
          glowStrength={2}
        />
      ))}
    </Piece>
  );
}

export function Door({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.door;
  return (
    <Piece name="door">
      <Box size={[width + 0.16, 2.26, depth]} at={[0, 1.13, -0.01]} color="#2a2d33" />
      <Box size={[width, 2.1, depth]} at={[0, 1.07, 0.01]} color="#5a5e66" />
      <mesh position={[0, 1.1, depth / 2 + 0.04]}>
        <torusGeometry args={[0.18, 0.025, 8, 32]} />
        <meshStandardMaterial color="#8a8e96" metalness={0.8} />
      </mesh>
      <Box size={[0.7, 0.04, 0.03]} at={[0, 2.24, depth / 2 + 0.02]} color="#000000" glow={neon.warm} glowStrength={3} />
      <LightSwitches />
      {/* Wall lamps either side of the door, in the neon's warm colour. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.2), 2.05, 0]}>
          <Box size={[0.16, 0.08, 0.06]} at={[0, 0, 0]} color="#2a2d33" />
          <Box size={[0.13, 0.05, 0.005]} at={[0, 0, 0.032]} color="#000000" glow={neon.warm} glowStrength={2.5} />
        </group>
      ))}
    </Piece>
  );
}

export function Workbench({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.workbench;
  return (
    <Piece name="workbench">
      <Box size={[width, 0.05, depth]} at={[0, 0.9, 0]} color="#6a5a44" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box key={`${sx}${sz}`} size={[0.06, 0.88, 0.06]} at={[sx * (width / 2 - 0.05), 0.44, sz * (depth / 2 - 0.05)]} color="#333333" />
        ))
      )}
      {/* The 3D printer. */}
      <Box size={[0.5, 0.04, 0.45]} at={[0.3, 0.945, -0.05]} color="#222428" />
      <Box size={[0.5, 0.03, 0.45]} at={[0.3, 1.47, -0.05]} color="#cfd4dc" />
      <Box size={[0.08, 0.06, 0.08]} at={[0.3, 1.12, -0.05]} color="#000000" glow={neon.cool} glowStrength={2} />
      <Box size={[0.3, 0.12, 0.2]} at={[-0.35, 0.985, 0.05]} color="#7a8290" />
    </Piece>
  );
}

/** Where the desk lamp's bulb is, in the desk's frame — its light shines from there. */
const DESK_LAMP_BULB: [number, number, number] = [DESK_LAMP_BASE.x, 1.205, -0.06];

/**
 * The switch plate by the door: three buttons, top to bottom the ceiling
 * light, the desk lamp and the neon's colours. Each lights up while its
 * light is on (the neon's shows the pair it is on).
 *
 * The same switches as the header's light menu — both only call
 * `flipLight`. Claims the pointer on the way down (`pointerClaim`), as the
 * markers do: on a phone a tap on empty room pauses it, and a tap on a
 * switch is not empty room.
 */
function LightSwitches() {
  const { lights, flipLight } = useAppState();
  const neon = neonTheme(lights);
  const [hovered, setHovered] = useState<LightSwitch | null>(null);
  useCursor(hovered !== null);
  const { width } = PIECES.door;
  const buttons: { key: LightSwitch; y: number; lit: string; on: boolean }[] = [
    { key: "ceiling", y: 0.07, lit: "#ffe0b8", on: lights.ceiling },
    { key: "desk", y: 0, lit: "#ffcf8a", on: lights.desk },
    { key: "neon", y: -0.07, lit: neon.warm, on: true },
  ];
  return (
    <group position={[width / 2 + 0.2, 1.25, 0]}>
      <Box size={[0.1, 0.22, 0.02]} at={[0, 0, 0]} color="#2a2d33" />
      {buttons.map(({ key, y, lit, on }) => (
        <mesh
          key={key}
          position={[0, y, 0.016]}
          scale={hovered === key ? 1.15 : 1}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(key);
          }}
          onPointerOut={() => setHovered(null)}
          onPointerDown={(e) => {
            e.stopPropagation();
            pointerClaim.claim(e.pointerId);
          }}
          onClick={(e) => {
            e.stopPropagation();
            flipLight(key);
          }}
        >
          <boxGeometry args={[0.06, 0.045, 0.014]} />
          <meshStandardMaterial color="#14161a" emissive={lit} emissiveIntensity={on ? 2.2 : 0.15} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * **Provisional (仮)** strengths of the switchable lights, set by eye
 * against the prototype's look; the exposure (1.75 in `Scene.tsx`) is still
 * the prototype's too. What is not by eye is the floor under them
 * (`AMBIENT_FLOOR`), which is measured.
 */
const CEILING_LIGHT = 4;
const DESK_LAMP_LIGHT = 2.5;

/**
 * The room's lights: a floor of ambient light that is always there, the two
 * switchable lights, and the neon's coloured glow near the things that glow.
 */
export function Lights({ lights }: { lights: RoomLights }) {
  const neon = neonTheme(lights);
  const at = (angle: number, distance: number, y: number): [number, number, number] => {
    const [x, z] = horizontalAt(angle);
    return [x * distance, y, z * distance];
  };
  return (
    <>
      <hemisphereLight args={["#8fa8ff", "#201810", AMBIENT_FLOOR.hemisphere]} />
      <ambientLight intensity={AMBIENT_FLOOR.ambient} />
      <pointLight position={[0, WALL_HEIGHT - 0.3, 0]} color="#ffe6c8" intensity={lights.ceiling ? CEILING_LIGHT : 0} distance={9} decay={2} />
      <pointLight
        position={pieceToWorld(PIECES.desk, DESK_LAMP_BULB)}
        color="#ffcf8a"
        intensity={lights.desk ? DESK_LAMP_LIGHT : 0}
        distance={3}
        decay={2}
      />
      <pointLight position={at(8, 2.0, 1.4)} color={neon.cool} intensity={3} distance={5} decay={2} />
      <pointLight position={at(68, 2.2, 1.2)} color={neon.warm} intensity={2} distance={3.5} decay={2} />
      {/* The window's light is the colony outside, not the room's neon. */}
      <pointLight position={at(165, 2.4, 1.8)} color="#ff4fd8" intensity={1.5} distance={3} decay={2} />
      <pointLight position={at(218, 1.9, 2.3)} color={neon.warm} intensity={2.5} distance={4} decay={2} />
      <pointLight position={at(260, 2.2, 1.4)} color={neon.cool} intensity={1.5} distance={3} decay={2} />
    </>
  );
}

export default function RoomScene() {
  // The lights change only when a switch is flipped, so reading them from
  // the app's state here re-renders the room rarely.
  const { lights } = useAppState();
  const neon = neonTheme(lights);
  return (
    <group>
      <Lights lights={lights} />
      <Shell ceiling={lights.ceiling} neon={neon} />
      <Desk />
      <Shelf neon={neon} />
      <Bookcase />
      <PortholeAndHammock />
      <Board />
      <Comms neon={neon} />
      <Door neon={neon} />
      <Workbench neon={neon} />
      <ScreenHole panel={DESK_SCREEN} />
      <Self />
      {/* After the body: the glass reflects where the body is this frame. */}
      <CurveMirror />
      <SecurityCameraBody />
      <SectionMarkers />
    </group>
  );
}
