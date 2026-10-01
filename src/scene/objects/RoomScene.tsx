"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  PIECES,
  ROOM_RADIUS,
  SUBJECTS,
  WALL_HEIGHT,
  horizontalAt,
  pieceCentreDistance,
  type PieceKey,
} from "../room/layout";
import { hash01 } from "../voxel/rng";
import { sceneClock } from "../sceneClock";
import SectionMarkers from "./SectionMarkers";

/**
 * The room the camera stands in — **placeholder shapes** (step 2 of
 * docs/room-migration.md). Where everything stands comes from
 * `scene/room/layout.ts`; what it looks like is boxes and cylinders until the
 * step that builds the furniture properly (step 8). Kept close to
 * `sandbox/room-lab.html`, which the user tuned the room's size and views in.
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

function Shell() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ROOM_RADIUS, 96]} />
        <meshStandardMaterial color="#23262c" roughness={0.45} metalness={0.5} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 128, 1, true]} />
        <meshStandardMaterial color="#353941" roughness={0.8} metalness={0.3} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[ROOM_RADIUS, 96]} />
        <meshStandardMaterial color="#1a1c21" />
      </mesh>
      {[
        [ROOM_RADIUS - 0.25, WALL_HEIGHT - 0.18, 0.06],
        [ROOM_RADIUS - 0.45, WALL_HEIGHT - 0.3, 0.04],
      ].map(([radius, y, tube]) => (
        <mesh key={radius} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, tube, 8, 96]} />
          <meshStandardMaterial color="#3b3f47" />
        </mesh>
      ))}
      <mesh position={[0, WALL_HEIGHT - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 8, 48]} />
        <meshStandardMaterial color="#000000" emissive="#ffe0b8" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function Desk() {
  const { width, depth } = PIECES.desk;
  const pcX = SUBJECTS.desk.local[0];
  const holoX = SUBJECTS.about.local[0];
  const holo = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = sceneClock.time(state.clock.elapsedTime);
    if (holo.current) holo.current.rotation.y = t * 0.6;
  });
  return (
    <Piece name="desk">
      <Box size={[width, 0.05, depth]} at={[0, 0.75, 0]} color="#55504a" />
      <Box size={[0.5, 0.72, depth - 0.05]} at={[-width / 2 + 0.3, 0.36, 0]} color="#3d4148" />
      <Box size={[0.5, 0.72, depth - 0.05]} at={[width / 2 - 0.3, 0.36, 0]} color="#3d4148" />
      {/* Three monitors: video, the PC's own screen, the security camera. */}
      {(
        [
          [-0.7, 0.35, "#c45ad0"],
          [0, 0, "#1f5f9e"],
          [0.7, -0.35, "#3a3d3a"],
        ] as const
      ).map(([dx, yaw, glow]) => (
        <group key={dx} position={[pcX + dx, 1.08, -0.15 + Math.abs(dx) * 0.12]} rotation={[0, yaw, 0]}>
          <Box size={[0.66, 0.42, 0.04]} at={[0, 0, 0]} color="#111318" />
          <Box size={[0.62, 0.38, 0.005]} at={[0, 0, 0.022]} color="#000000" glow={glow} glowStrength={1.2} />
        </group>
      ))}
      <Box size={[0.5, 0.02, 0.18]} at={[pcX, 0.785, 0.15]} color="#1c1e22" />
      {/* The hologram's device, and a placeholder for what it shows. */}
      <Box size={[0.28, 0.08, 0.2]} at={[holoX, 0.815, 0]} color="#2a2d33" />
      <Box size={[0.2, 0.01, 0.12]} at={[holoX, 0.86, 0]} color="#000000" glow="#2fe8ff" glowStrength={3} />
      <mesh ref={holo} position={[holoX, SUBJECTS.about.local[1], SUBJECTS.about.local[2]]}>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshBasicMaterial color="#7bf3ff" wireframe transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Desk lamp (the "desk light" the lighting requirement switches). */}
      <Box size={[0.16, 0.03, 0.16]} at={[pcX - 0.42, 0.79, 0.22]} color="#222428" />
      <Box size={[0.025, 0.5, 0.025]} at={[pcX - 0.42, 1.04, 0.22]} color="#2a2d33" />
      <Box size={[0.14, 0.08, 0.12]} at={[pcX - 0.42, 1.25, -0.06]} color="#3a3d44" />
      <Box size={[0.1, 0.01, 0.08]} at={[pcX - 0.42, 1.205, -0.06]} color="#000000" glow="#ffcf8a" glowStrength={3} />
      {/* The chair, tucked in. Its back stops at 0.98 m: from the centre, the
          line of sight to the bottom of the monitors passes about 1.07 m above
          the floor where the chair stands, so a taller back (the prototype's
          1.19 m) blacked out the lower half of the PC's screen at home. */}
      <group position={[pcX, 0, 0.6]}>
        <Box size={[0.5, 0.06, 0.48]} at={[0, 0.48, -0.25]} color="#1c1e22" />
        <Box size={[0.48, 0.4, 0.06]} at={[0, 0.78, 0]} color="#1c1e22" />
        <Box size={[0.05, 0.45, 0.05]} at={[0, 0.24, -0.25]} color="#2a2d33" />
      </group>
    </Piece>
  );
}

function Shelf() {
  const { width, depth } = PIECES.shelf;
  const gadgets = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        row: Math.floor(i / 4),
        column: i % 4,
        kind: Math.floor(hash01(i + 1) * 3),
        color: ["#9aa4b2", "#c9a86a", "#5aa0c8", "#b8604a", "#7fbf7f"][Math.floor(hash01(i + 101) * 5)],
      })),
    []
  );
  return (
    <Piece name="shelf">
      <Box size={[width, 2.0, 0.03]} at={[0, 1.0, -depth / 2]} color="#3a3d44" />
      <Box size={[0.04, 2.0, depth]} at={[-width / 2, 1.0, 0]} color="#3a3d44" />
      <Box size={[0.04, 2.0, depth]} at={[width / 2, 1.0, 0]} color="#3a3d44" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} size={[width, 0.03, depth]} at={[0, 0.05 + i * 0.45, 0]} color="#3a3d44" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} size={[width - 0.1, 0.015, 0.02]} at={[0, 0.47 + i * 0.45, depth / 2 - 0.02]} color="#000000" glow="#ffb020" glowStrength={2.5} />
      ))}
      {gadgets.map(({ row, column, kind, color }) => (
        <mesh key={`${row}-${column}`} position={[-width / 2 + 0.25 + column * 0.37, 0.19 + row * 0.45, 0]}>
          {kind === 0 ? <boxGeometry args={[0.16, 0.2, 0.16]} /> : kind === 1 ? <sphereGeometry args={[0.1, 16, 12]} /> : <coneGeometry args={[0.08, 0.28, 12]} />}
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </Piece>
  );
}

function Bookcase() {
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
      {books.map((b, i) => (
        <Box key={i} size={[b.w, b.h, depth * 0.8]} at={[b.x, b.y, 0]} color={b.color} />
      ))}
    </Piece>
  );
}

function PortholeAndHammock() {
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
          <meshBasicMaterial color="#5a2a8a" toneMapped={false} />
        </mesh>
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

function Board() {
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
  return (
    <Piece name="board">
      <Box size={[width + 0.1, 1.6, depth]} at={[0, cy, 0]} color="#3a2a1c" />
      <Box size={[width, 1.5, depth + 0.01]} at={[0, cy, 0.002]} color="#b08a5a" />
      {papers.map((p, i) => (
        <Box key={i} size={[p.w, p.h, 0.004]} at={[p.x, p.y, depth / 2 + 0.01 + i * 0.0005]} color={p.color} />
      ))}
    </Piece>
  );
}

function Comms() {
  const { width, depth } = PIECES.comms;
  return (
    <Piece name="comms">
      <Box size={[width, 0.95, depth]} at={[0, 0.475, 0]} color="#3d4148" />
      <group position={[0, 1.28, -0.12]} rotation={[-0.25, 0, 0]}>
        <Box size={[0.62, 0.42, 0.05]} at={[0, 0, 0]} color="#1a1c20" />
        <Box size={[0.56, 0.36, 0.01]} at={[0, 0, 0.03]} color="#000000" glow="#3fffd0" glowStrength={2.5} />
      </group>
      <Box size={[0.3, 0.16, 0.25]} at={[-0.38, 1.03, 0.05]} color="#55504a" />
      <Box size={[0.02, 0.6, 0.02]} at={[0.45, 1.25, -0.2]} color="#888888" />
    </Piece>
  );
}

function Door() {
  const { width, depth } = PIECES.door;
  return (
    <Piece name="door">
      <Box size={[width + 0.16, 2.26, depth]} at={[0, 1.13, -0.01]} color="#2a2d33" />
      <Box size={[width, 2.1, depth]} at={[0, 1.07, 0.01]} color="#5a5e66" />
      <mesh position={[0, 1.1, depth / 2 + 0.04]}>
        <torusGeometry args={[0.18, 0.025, 8, 32]} />
        <meshStandardMaterial color="#8a8e96" metalness={0.8} />
      </mesh>
      <Box size={[0.7, 0.04, 0.03]} at={[0, 2.24, depth / 2 + 0.02]} color="#000000" glow="#ffb020" glowStrength={3} />
    </Piece>
  );
}

function Workbench() {
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
      <Box size={[0.08, 0.06, 0.08]} at={[0.3, 1.12, -0.05]} color="#000000" glow="#2fe8ff" glowStrength={2} />
      <Box size={[0.3, 0.12, 0.2]} at={[-0.35, 0.985, 0.05]} color="#7a8290" />
    </Piece>
  );
}

/**
 * Placeholder lighting, as in the prototype — a ceiling light, a cool fill,
 * and a few coloured lamps near the things that glow. The real lighting
 * (switchable ceiling light, desk light and neon colours) is step 6.
 */
function RoomLights() {
  const at = (angle: number, distance: number, y: number): [number, number, number] => {
    const [x, z] = horizontalAt(angle);
    return [x * distance, y, z * distance];
  };
  return (
    <>
      <hemisphereLight args={["#8fa8ff", "#201810", 0.6]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, WALL_HEIGHT - 0.3, 0]} color="#ffe6c8" intensity={4} distance={9} decay={2} />
      <pointLight position={at(8, 2.0, 1.4)} color="#5fd8ff" intensity={3} distance={5} decay={2} />
      <pointLight position={at(68, 2.2, 1.2)} color="#ffb45a" intensity={2} distance={3.5} decay={2} />
      <pointLight position={at(165, 2.4, 1.8)} color="#ff4fd8" intensity={1.5} distance={3} decay={2} />
      <pointLight position={at(218, 1.9, 2.3)} color="#ffc070" intensity={2.5} distance={4} decay={2} />
      <pointLight position={at(260, 2.2, 1.4)} color="#3fffd0" intensity={1.5} distance={3} decay={2} />
    </>
  );
}

export default function RoomScene() {
  return (
    <group>
      <RoomLights />
      <Shell />
      <Desk />
      <Shelf />
      <Bookcase />
      <PortholeAndHammock />
      <Board />
      <Comms />
      <Door />
      <Workbench />
      <SectionMarkers />
    </group>
  );
}
