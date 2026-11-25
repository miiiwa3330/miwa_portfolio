"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, useCursor } from "@react-three/drei";
import * as THREE from "three";
import {
  BOARD_FRAME,
  MONITORS,
  monitorGlass,
  lampJoints,
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
import { AMBIENT_FLOOR, neonTheme, type LightSwitch, type NeonTheme, type RoomLights } from "../room/lighting";
import { pointerClaim } from "../pointerClaim";
import {
  makeBoardTexture,
  makeBookSpineTexture,
  makeCityTexture,
  makeDoorDecalTexture,
  makeFabricTexture,
  makeFloorPbrMaps,
  makeFloorTexture,
  makeHoloBeamTexture,
  makeVideo,
  makeWallPbrMaps,
  makeWallTexture,
} from "./roomTextures";
import { createRoomEnvironment } from "./roomEnv";
import { panelShown } from "../camera/cssView";
import { bodyNow, viewNow } from "../camera/viewChannel";
import { chairPlacement } from "../room/seat";
import { SCREEN_HOLE_LAYER } from "../layers";
import { hash01 } from "../hash";
import { sceneClock } from "../sceneClock";
import SectionMarkers from "./SectionMarkers";
import Self from "./Self";
import CurveMirror from "./CurveMirror";
import HologramMap from "./HologramMap";
import Postbox from "./Postbox";
import { SecurityCameraBody, SecurityFeed } from "./SecurityCamera";
import { DeskBody, DeskLamp, DeskMat, DeskMonitor, DeskSmalls, useDeskMaterials } from "./DeskSet";
import DellMonitor from "./DellMonitor";
import MonitorArm from "./MonitorArm";
import HoloFan from "./HoloFan";
import Kickstand from "./Kickstand";
import Macintosh from "./Macintosh";
import MacKeyboard from "./MacKeyboard";
import MacMouse from "./MacMouse";
import { setDeskView } from "../deskView";
import ExgMouse from "./ExgMouse";
import HhkbKeyboard from "./HhkbKeyboard";

/**
 * The room the camera stands in, styled after `reference/4/1.png` and
 * `reference/4/2.png`: weathered riveted steel bulkheads, glossy concentric
 * deck floor catching warm/cool light pools, PMREM environment reflections,
 * real product screenshots on the desk wall & board, and a 3D holographic
 * World-to-Japan access map (`HologramMap`).
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
  roughness?: number;
  metalness?: number;
};

function Box({ size, at, color, glow, glowStrength = 2, rotation, roughness = 0.72, metalness = 0.4 }: BoxProps) {
  return (
    <mesh position={at} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={glow ?? "#000000"}
        emissiveIntensity={glow ? glowStrength : 0}
      />
    </mesh>
  );
}

/** Loads a shipped screenshot under `/images/` on mount and disposes its GPU texture on unmount. */
function useLoadedTexture(url: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (t) => {
        if (cancelled) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        loaded = t;
        setTex(t);
      },
      undefined,
      () => {
        // Ignore missing optional poster textures in headless/offline tests
      }
    );
    return () => {
      cancelled = true;
      if (loaded) loaded.dispose();
    };
  }, [url]);
  return tex;
}

/** A real product screenshot card with a thin photo backing, used on the wall and investigation board. */
function PhotoCard({
  url,
  size,
  at,
  rotation = [0, 0, 0],
  frameColor = "#e8e3d5",
}: {
  url: string;
  size: [number, number];
  at: [number, number, number];
  rotation?: [number, number, number];
  frameColor?: string;
}) {
  const tex = useLoadedTexture(url);
  return (
    <group position={at} rotation={rotation}>
      <Box size={[size[0] + 0.02, size[1] + 0.02, 0.006]} at={[0, 0, 0]} color={frameColor} roughness={0.85} metalness={0.05} />
      <mesh position={[0, 0, 0.0045]}>
        <planeGeometry args={size} />
        {tex ? (
          <meshStandardMaterial
            key={tex.uuid}
            map={tex}
            emissive="#ffffff"
            emissiveMap={tex}
            emissiveIntensity={0.22}
            roughness={0.55}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial key="placeholder" color="#1a2230" roughness={0.7} />
        )}
      </mesh>
    </group>
  );
}

/** Installs the procedural PMREM environment map onto the Three.js scene for realistic metallic reflections. */
function RoomEnvironment({ neon }: { neon: NeonTheme }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { scene } = get();
    const env = createRoomEnvironment(gl, neon);
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = env;
    scene.environmentIntensity = 0.85;
    return () => {
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
      env.dispose();
    };
  }, [gl, get, neon]);
  return null;
}

const RIB_ANGLES = wallRibAngles();

/**
 * The cables slung under the ceiling (`reference/4/2.png`): thick and thin
 * bundles sweeping between the upper wall and ceiling rings.
 */
function useCables(): THREE.TubeGeometry[] {
  const cables = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 360 + hash01(i + 400) * 14;
        const [x, z] = horizontalAt(angle);
        const [ex, ez] = horizontalAt(angle + 28 + hash01(i + 410) * 65);
        const from = new THREE.Vector3(
          x * (ROOM_RADIUS - 0.09),
          WALL_HEIGHT - 0.12 - hash01(i + 420) * 0.28,
          z * (ROOM_RADIUS - 0.09)
        );
        const to = new THREE.Vector3(
          ex * (0.55 + hash01(i + 425) * 1.6),
          WALL_HEIGHT - 0.05,
          ez * (0.55 + hash01(i + 426) * 1.6)
        );
        const mid = from.clone().lerp(to, 0.5);
        mid.y -= 0.18 + hash01(i + 430) * 0.36;
        return new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(from, mid, to),
          20,
          0.01 + hash01(i + 440) * 0.015,
          6
        );
      }),
    []
  );
  useEffect(() => () => cables.forEach((c) => c.dispose()), [cables]);
  return cables;
}

export function Shell({ ceiling, neon }: { ceiling: boolean; neon: NeonTheme }) {
  const wall = useMemo(() => makeWallTexture(), []);
  const wallPbr = useMemo(() => makeWallPbrMaps(), []);
  const floor = useMemo(() => makeFloorTexture(), []);
  const floorPbr = useMemo(() => makeFloorPbrMaps(), []);
  useEffect(
    () => () => {
      wall.dispose();
      wallPbr.bump.dispose();
      wallPbr.roughness.dispose();
      floor.dispose();
      floorPbr.bump.dispose();
      floorPbr.roughness.dispose();
    },
    [wall, wallPbr, floor, floorPbr]
  );
  const cables = useCables();

  return (
    <group>
      {/* Concentric bolted deck floor with glossy roughness modulation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_RADIUS * 2, ROOM_RADIUS * 2, FLOOR_SEGMENTS, FLOOR_SEGMENTS]} />
        <meshStandardMaterial
          map={floor}
          bumpMap={floorPbr.bump}
          bumpScale={0.004}
          roughnessMap={floorPbr.roughness}
          roughness={1}
          metalness={0.65}
        />
      </mesh>

      {/* Weathered riveted bulkhead wall */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[ROOM_RADIUS, ROOM_RADIUS, WALL_HEIGHT, 128, 1, true]} />
        <meshStandardMaterial
          map={wall}
          bumpMap={wallPbr.bump}
          bumpScale={0.005}
          roughnessMap={wallPbr.roughness}
          roughness={1}
          metalness={0.48}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Vertical flanged steel ribs & mounting brackets */}
      {RIB_ANGLES.map((angle) => {
        const [x, z] = horizontalAt(angle);
        return (
          <group
            key={angle}
            position={[x * (ROOM_RADIUS - 0.045), WALL_HEIGHT / 2, z * (ROOM_RADIUS - 0.045)]}
            rotation={[0, -angle * DEG, 0]}
          >
            <Box size={[0.09, WALL_HEIGHT, 0.07]} at={[0, 0, 0]} color="#252930" roughness={0.55} metalness={0.72} />
            <Box size={[0.13, WALL_HEIGHT, 0.02]} at={[0, 0, 0.032]} color="#303640" roughness={0.5} metalness={0.75} />
            {[-1.1, 0, 1.1].map((by) => (
              <Box key={by} size={[0.16, 0.09, 0.04]} at={[0, by, 0.025]} color="#1d2026" roughness={0.6} metalness={0.7} />
            ))}
          </group>
        );
      })}

      {/* Horizontal perimeter conduit pipes along top and bottom of bulkhead */}
      {[0.12, WALL_HEIGHT - 0.28, WALL_HEIGHT - 0.48].map((y, idx) => (
        <mesh key={idx} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ROOM_RADIUS - 0.03, idx === 0 ? 0.032 : 0.018, 8, 96]} />
          <meshStandardMaterial color="#2c313a" roughness={0.48} metalness={0.76} />
        </mesh>
      ))}

      {/* Desk wall details (`reference/4/2.png`): vent grate, junction box, and framed product posters */}
      <Piece name="desk">
        {/* Ventilation grate upper-left of monitor */}
        <group position={[-0.78, 2.02, -0.44]}>
          <Box size={[0.34, 0.22, 0.03]} at={[0, 0, 0]} color="#1c2026" roughness={0.6} metalness={0.7} />
          {[-0.07, -0.035, 0, 0.035, 0.07].map((ly) => (
            <Box key={ly} size={[0.28, 0.012, 0.036]} at={[0, ly, 0.004]} color="#0d0f14" />
          ))}
        </group>
        {/* Electrical junction box right of hologram */}
        <group position={[1.28, 1.48, -0.4]}>
          <Box size={[0.22, 0.34, 0.06]} at={[0, 0, 0]} color="#262b34" roughness={0.5} metalness={0.7} />
          <Box size={[0.02, 0.02, 0.01]} at={[0.06, 0.1, 0.035]} color="#000" glow={neon.cool} glowStrength={2} />
          <Box size={[0.02, 0.02, 0.01]} at={[0.06, 0.06, 0.035]} color="#000" glow={neon.warm} glowStrength={2} />
        </group>
        {/* Framed product posters behind the desk monitors */}
        <PhotoCard url="/images/star_vessel.png" size={[0.34, 0.19]} at={[-0.86, 1.62, -0.43]} rotation={[0, 0.14, 0.03]} />
        <PhotoCard url="/images/coffee.png" size={[0.28, 0.16]} at={[0.56, 1.88, -0.44]} rotation={[0, -0.06, -0.02]} />
        <PhotoCard url="/images/loo100.png" size={[0.26, 0.15]} at={[0.92, 1.9, -0.42]} rotation={[0, -0.14, 0.02]} />
      </Piece>

      {/* Ceiling deck, concentric structural pipe rings, and overhead cables */}
      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_RADIUS * 2, ROOM_RADIUS * 2, FLOOR_SEGMENTS, FLOOR_SEGMENTS]} />
        <meshStandardMaterial color="#12141a" roughness={0.85} metalness={0.4} />
      </mesh>
      {[
        [ROOM_RADIUS - 0.25, WALL_HEIGHT - 0.18, 0.06],
        [ROOM_RADIUS - 0.45, WALL_HEIGHT - 0.3, 0.04],
        [ROOM_RADIUS - 0.33, WALL_HEIGHT - 0.12, 0.03],
        [1.45, WALL_HEIGHT - 0.1, 0.045],
      ].map(([radius, y, tube]) => (
        <mesh key={radius} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, tube, 8, 96]} />
          <meshStandardMaterial color="#323741" roughness={0.45} metalness={0.78} />
        </mesh>
      ))}
      {cables.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial color={i % 4 === 0 ? "#422d1e" : i % 3 === 0 ? "#1a2430" : "#101216"} roughness={0.7} metalness={0.2} />
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
 * rectangle that writes depth, and colour and alpha of zero.
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
      <meshBasicMaterial color="#000000" opacity={0} blending={THREE.NoBlending} toneMapped={false} />
    </mesh>
  );
}

const VIDEO_PX_PER_METRE = 600;
function VideoFeed() {
  const { screen, roll } = MONITORS.video;
  const glass = monitorGlass("video");
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

const MONITOR_GLOW: Record<MonitorKey, string> = { video: "#c45ad0", gui: "#1f5f9e", camera: "#3a3d3a" };

/**
 * The desk and the PC. `typing` makes the keyboard and the mouse follow the
 * reader's own keys, pointer and clicks; by default, while the reader sits at
 * the PC.
 */
export function Desk({ typing }: { typing?: boolean }) {
  const holoX = SUBJECTS.about.local[0];
  const { activeSection, lights } = useAppState();
  const projecting = activeSection === "about";
  const seated = activeSection === "desk";
  const lamp = lights.desk;
  useEffect(() => {
    if (!seated) setDeskView("pc");
  }, [seated]);
  const m = useDeskMaterials();
  const beamTop = SUBJECTS.about.local[1] - HOLOGRAM_PANEL.height / 2;

  return (
    <Piece name="desk">
      <DeskBody m={m} />
      <DeskSmalls m={m} />

      {/* Three monitors */}
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
      <Macintosh seated={typing ?? seated} />
      <MacKeyboard typing={typing ?? seated} />
      <MacMouse typing={typing ?? seated} />
      <DeskMat m={m} />
      <HhkbKeyboard typing={typing ?? seated} />
      <ExgMouse typing={typing ?? seated} />

      {/* Upgraded hologram projector housing on the right side of the desk */}
      <group position={[holoX, 0.775, 0]}>
        <RoundedBox args={[0.3, 0.068, 0.22]} radius={0.008} smoothness={3} position={[0, 0.034, 0]}>
          <meshStandardMaterial color="#23272f" roughness={0.45} metalness={0.75} />
        </RoundedBox>
        <RoundedBox args={[0.24, 0.018, 0.16]} radius={0.004} smoothness={2} position={[0, 0.072, 0]}>
          <meshStandardMaterial color="#343b46" roughness={0.4} metalness={0.8} />
        </RoundedBox>
        {/* Glowing emitter ring + core */}
        <mesh position={[0, 0.083, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.048, 0.068, 32]} />
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.044, 24]} />
          <meshBasicMaterial color="#0b3a4a" />
        </mesh>
        {/* Front status LEDs */}
        {[-0.08, -0.05, -0.02].map((lx, idx) => (
          <Box
            key={lx}
            size={[0.016, 0.008, 0.004]}
            at={[lx, 0.035, 0.111]}
            color="#000"
            glow={idx === 2 ? "#ffb020" : "#2fe8ff"}
            glowStrength={2.2}
          />
        ))}
      </group>

      {/* Desk right-side projector: glows brightly when projecting About text */}
      <mesh position={[holoX, (0.865 + beamTop) / 2, SUBJECTS.about.local[2]]}>
        <cylinderGeometry args={[HOLOGRAM_PANEL.width / 2, 0.08, beamTop - 0.865, 32, 1, true]} />
        <meshBasicMaterial
          color="#2fe8ff"
          transparent
          opacity={projecting ? 0.16 : 0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <DeskLamp m={m} on={lamp} />
      <HoloFan m={m} />
      <Chair />
    </Piece>
  );
}

/**
 * The ergonomic office chair, preserving `CHAIR_SEAT_TOP`, `CHAIR_BACK_HEIGHT`,
 * `CHAIR_SEAT_FORWARD`, and `chairPlacement()` invariants exactly.
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
      {/* Contoured seat cushion */}
      <RoundedBox
        args={[CHAIR_SEAT.width, 0.06, CHAIR_SEAT.depth]}
        radius={0.02}
        smoothness={3}
        position={[0, CHAIR_SEAT_TOP - 0.03, -CHAIR_SEAT_FORWARD]}
      >
        <meshStandardMaterial color="#1d2026" roughness={0.82} metalness={0.12} />
      </RoundedBox>
      {/* Under-seat tilt mechanism */}
      <Box size={[0.18, 0.035, 0.2]} at={[0, CHAIR_SEAT_TOP - 0.072, -CHAIR_SEAT_FORWARD]} color="#2c313a" roughness={0.45} metalness={0.8} />

      {/* Ergonomic backrest frame, mesh panel, and lumbar bar */}
      <RoundedBox
        args={[0.48, 0.4, 0.032]}
        radius={0.014}
        smoothness={3}
        position={[0, CHAIR_BACK_HEIGHT - 0.2, 0]}
      >
        <meshStandardMaterial color="#16181d" roughness={0.78} metalness={0.18} />
      </RoundedBox>
      <Box size={[0.42, 0.04, 0.042]} at={[0, CHAIR_BACK_HEIGHT - 0.28, -0.006]} color="#262a32" roughness={0.55} metalness={0.5} />
      <Box size={[0.048, 0.3, 0.038]} at={[0, CHAIR_SEAT_TOP - 0.03 + 0.15, 0.008]} color="#353a44" roughness={0.4} metalness={0.8} />

      {/* Left & right armrests */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box size={[0.028, 0.2, 0.03]} at={[side * 0.255, CHAIR_SEAT_TOP + 0.07, -CHAIR_SEAT_FORWARD + 0.03]} color="#2e323b" roughness={0.4} metalness={0.8} />
          <RoundedBox
            args={[0.065, 0.024, 0.22]}
            radius={0.008}
            smoothness={2}
            position={[side * 0.255, CHAIR_SEAT_TOP + 0.17, -CHAIR_SEAT_FORWARD + 0.01]}
          >
            <meshStandardMaterial color="#181a20" roughness={0.75} metalness={0.15} />
          </RoundedBox>
        </group>
      ))}

      {/* Gas lift cylinder */}
      <mesh position={[0, (0.07 + CHAIR_SEAT_TOP - 0.06) / 2, -CHAIR_SEAT_FORWARD]}>
        <cylinderGeometry args={[0.024, 0.028, CHAIR_SEAT_TOP - 0.06 - 0.07, 12]} />
        <meshStandardMaterial color="#8e949e" metalness={0.88} roughness={0.25} />
      </mesh>
      {/* Five-star base & dual-wheel castors */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[0, 0.07, -CHAIR_SEAT_FORWARD]} rotation={[0, a, 0]}>
            <Box size={[0.032, 0.026, 0.29]} at={[0, 0, 0.145]} color="#282c34" roughness={0.4} metalness={0.8} />
            <mesh position={[0, -0.042, 0.285]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.024, 0.024, 0.026, 12]} />
              <meshStandardMaterial color="#111317" roughness={0.6} metalness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Upgraded shelf collectibles (`reference/4/1.png` & `2.png`): articulated
 * mini-mech, detailed rocket, rover, and glowing core orb.
 */
function Gadget({ kind, color }: { kind: number; color: string }) {
  const metal = <meshStandardMaterial color={color} metalness={0.68} roughness={0.35} />;
  const dark = <meshStandardMaterial color="#1c2028" metalness={0.6} roughness={0.5} />;
  if (kind === 0)
    return (
      <group>
        {/* Feet & legs */}
        {[-0.038, 0.038].map((lx) => (
          <group key={lx}>
            <mesh position={[lx, 0.015, 0.008]}>
              <boxGeometry args={[0.042, 0.028, 0.065]} />
              {dark}
            </mesh>
            <mesh position={[lx, 0.055, 0]}>
              <boxGeometry args={[0.034, 0.06, 0.04]} />
              {metal}
            </mesh>
          </group>
        ))}
        {/* Torso & chest core */}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.13, 0.1, 0.09]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.125, 0.047]}>
          <cylinderGeometry args={[0.02, 0.02, 0.008, 12]} />
          <meshBasicMaterial color="#ffb020" toneMapped={false} />
        </mesh>
        {/* Arms */}
        {[-0.085, 0.085].map((ax) => (
          <mesh key={ax} position={[ax, 0.11, 0.01]}>
            <boxGeometry args={[0.03, 0.09, 0.035]} />
            {dark}
          </mesh>
        ))}
        {/* Head + glowing visor + antenna */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.09, 0.065, 0.075]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.205, 0.039]}>
          <boxGeometry args={[0.062, 0.016, 0.004]} />
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
        </mesh>
        <mesh position={[0.032, 0.26, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.06, 6]} />
          {dark}
        </mesh>
      </group>
    );
  if (kind === 1)
    return (
      <group>
        {/* Rocket booster skirt + hull + nosecone + porthole */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.032, 0.042, 0.04, 14]} />
          {dark}
        </mesh>
        <mesh position={[0, 0.125, 0]}>
          <cylinderGeometry args={[0.038, 0.044, 0.17, 16]} />
          <meshStandardMaterial color="#e2e0d8" metalness={0.35} roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.038, 0.085, 16]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.15, 0.039]}>
          <sphereGeometry args={[0.014, 10, 8]} />
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[Math.sin((i * Math.PI) / 2) * 0.044, 0.055, Math.cos((i * Math.PI) / 2) * 0.044]}
            rotation={[0, (i * Math.PI) / 2, 0]}
          >
            <boxGeometry args={[0.006, 0.075, 0.045]} />
            {metal}
          </mesh>
        ))}
      </group>
    );
  if (kind === 2)
    return (
      <group>
        {/* Rover chassis + solar wing + 6 wheels + sensor mast */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.17, 0.048, 0.1]} />
          {metal}
        </mesh>
        <mesh position={[-0.02, 0.098, 0]}>
          <boxGeometry args={[0.11, 0.008, 0.09]} />
          <meshStandardMaterial color="#183258" metalness={0.7} roughness={0.2} />
        </mesh>
        {[-0.065, 0, 0.065].map((x) =>
          [-0.058, 0.058].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.028, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.024, 0.02, 12]} />
              <meshStandardMaterial color="#181a1f" roughness={0.8} />
            </mesh>
          ))
        )}
        <mesh position={[0.055, 0.135, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.085, 8]} />
          {dark}
        </mesh>
        <mesh position={[0.06, 0.18, 0]}>
          <boxGeometry args={[0.034, 0.024, 0.052]} />
          {metal}
        </mesh>
        <mesh position={[0.078, 0.18, 0]}>
          <sphereGeometry args={[0.01, 10, 8]} />
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
        </mesh>
      </group>
    );
  return (
    <group>
      {/* Glowing containment orb on pedestal */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.055, 0.065, 0.044, 16]} />
        {dark}
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshStandardMaterial color="#1a4052" emissive="#2fe8ff" emissiveIntensity={1.4} roughness={0.15} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.11, 0]} rotation={[0.5, 0.3, 0]}>
        <torusGeometry args={[0.072, 0.005, 8, 28]} />
        {metal}
      </mesh>
    </group>
  );
}

export function Shelf({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.shelf;
  const gadgets = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        row: Math.floor(i / 3) + 1, // rows 1..3 (row 0 is the closed lower cabinet)
        column: i % 3,
        kind: (i + Math.floor(hash01(i + 1) * 4)) % 4,
        color: ["#9aa4b2", "#c9a86a", "#5aa0c8", "#c46c4a", "#7fbf7f"][Math.floor(hash01(i + 101) * 5)],
      })),
    []
  );
  return (
    <Piece name="shelf">
      {/* Warm backlit steel panel */}
      <Box size={[width, 2.08, 0.03]} at={[0, 1.04, -depth / 2]} color="#1c150c" glow={neon.warm} glowStrength={0.16} />
      {/* Outer steel uprights + top cornice */}
      <Box size={[0.05, 2.08, depth]} at={[-width / 2, 1.04, 0]} color="#2c3038" roughness={0.5} metalness={0.72} />
      <Box size={[0.05, 2.08, depth]} at={[width / 2, 1.04, 0]} color="#2c3038" roughness={0.5} metalness={0.72} />
      <Box size={[width + 0.06, 0.06, depth + 0.03]} at={[0, 2.09, 0.01]} color="#252830" roughness={0.48} metalness={0.75} />

      {/* Bottom closed storage cabinet (`reference/4/1.png` & `2.png`) */}
      <Box size={[width - 0.04, 0.44, depth - 0.02]} at={[0, 0.24, 0]} color="#2b3038" roughness={0.58} metalness={0.62} />
      {[-width / 4, width / 4].map((dx, i) => (
        <group key={i} position={[dx, 0.24, depth / 2 - 0.005]}>
          <Box size={[width / 2 - 0.06, 0.36, 0.015]} at={[0, 0, 0]} color="#353b45" roughness={0.55} metalness={0.65} />
          <Box size={[0.1, 0.014, 0.022]} at={[0, 0.09, 0.01]} color="#8c94a0" roughness={0.35} metalness={0.85} />
        </group>
      ))}

      {/* Shelf decks + metallic front lip + warm under-shelf LED strips */}
      {[1, 2, 3, 4].map((i) => (
        <group key={i}>
          <Box size={[width - 0.02, 0.034, depth]} at={[0, 0.05 + i * 0.48, 0]} color="#323740" roughness={0.48} metalness={0.72} />
          <Box size={[width - 0.04, 0.014, 0.012]} at={[0, 0.05 + i * 0.48, depth / 2 + 0.004]} color="#6c7380" roughness={0.35} metalness={0.85} />
        </group>
      ))}
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          size={[width - 0.14, 0.014, 0.024]}
          at={[0, 0.026 + (i + 1) * 0.48, depth / 2 - 0.025]}
          color="#000000"
          glow={neon.warm}
          glowStrength={2.8}
        />
      ))}

      {/* Subtle glass front trim */}
      <mesh position={[0, 1.24, depth / 2 + 0.005]}>
        <planeGeometry args={[width - 0.08, 1.54]} />
        <meshStandardMaterial color="#b8d8e8" transparent opacity={0.07} roughness={0.1} metalness={0.2} depthWrite={false} />
      </mesh>

      {/* Upgraded gadgets on the 3 open shelves */}
      {gadgets.map(({ row, column, kind, color }) => (
        <group
          key={`${row}-${column}`}
          position={[-width / 2 + 0.3 + column * 0.5, 0.067 + row * 0.48, 0]}
          rotation={[0, (hash01(row * 3 + column + 50) - 0.5) * 0.7, 0]}
        >
          <Gadget kind={kind} color={color} />
        </group>
      ))}
    </Piece>
  );
}

/** Every book on the bookcase in one draw call, textured with spine bands & labels. */
function Books({ books, depth }: { books: { x: number; y: number; w: number; h: number; color: string }[]; depth: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const spine = useMemo(() => makeBookSpineTexture(), []);
  useEffect(() => () => spine.dispose(), [spine]);
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
      <meshStandardMaterial map={spine} roughness={0.76} metalness={0.08} />
    </instancedMesh>
  );
}

export function Bookcase() {
  const { width, depth } = PIECES.bookcase;
  const books = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; color: string }[] = [];
    let seed = 1;
    for (let row = 0; row < 5; row++) {
      const y = 0.06 + row * 0.42;
      let x = -width / 2 + 0.045;
      while (x < width / 2 - 0.08) {
        const w = 0.028 + hash01(seed++) * 0.036;
        const h = 0.24 + hash01(seed++) * 0.11;
        const color = ["#8b2e2e", "#2e4f8b", "#2e7a5a", "#c9a24a", "#5a4a8b", "#c8c4b8", "#2d3038", "#7a442c"][
          Math.floor(hash01(seed++) * 8)
        ];
        out.push({ x: x + w / 2, y: y + 0.015 + h / 2, w, h, color });
        x += w + 0.004;
      }
    }
    return out;
  }, [width]);
  return (
    <Piece name="bookcase">
      {/* Dark steel-and-oak industrial bookcase */}
      <Box size={[width, 2.5, 0.03]} at={[0, 1.25, -depth / 2]} color="#252220" roughness={0.75} metalness={0.4} />
      <Box size={[0.05, 2.5, depth]} at={[-width / 2, 1.25, 0]} color="#2c2e34" roughness={0.58} metalness={0.65} />
      <Box size={[0.05, 2.5, depth]} at={[width / 2, 1.25, 0]} color="#2c2e34" roughness={0.58} metalness={0.65} />
      <Box size={[width + 0.06, 0.06, depth + 0.03]} at={[0, 2.52, 0.01]} color="#252830" roughness={0.52} metalness={0.7} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Box key={i} size={[width - 0.02, 0.03, depth]} at={[0, 0.06 + i * 0.42, 0]} color="#3c322a" roughness={0.72} metalness={0.35} />
      ))}
      <Books books={books} depth={depth * 0.8} />
      {/* Storage crate on top (`reference/4/1.png`) */}
      <Box size={[0.32, 0.16, 0.24]} at={[0.15, 2.63, 0]} color="#383d46" roughness={0.55} metalness={0.7} />
    </Piece>
  );
}

/** Faint reflection silhouette in the porthole's glass (`docs/room-migration.md`). */
function Reflection() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(128, 112, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 256);
    ctx.quadraticCurveTo(56, 168, 128, 160);
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
      <meshBasicMaterial map={texture} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function PortholeAndHammock() {
  const city = useMemo(() => makeCityTexture(), []);
  const fabric = useMemo(() => makeFabricTexture(), []);
  useEffect(() => () => city.dispose(), [city]);
  useEffect(() => () => fabric.dispose(), [fabric]);

  // Curved woven hammock sling built from lateral ribs along the catenary curve
  const hammockGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.98, 1.32, -0.22),
      new THREE.Vector3(-0.52, 0.92, 0.1),
      new THREE.Vector3(0, 0.8, 0.22),
      new THREE.Vector3(0.52, 0.92, 0.1),
      new THREE.Vector3(0.98, 1.32, -0.22),
    ]);
    const segU = 28;
    const segV = 12;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const pts = curve.getPoints(segU);
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const center = pts[i];
      const halfWidth = 0.05 + Math.sin(Math.PI * u) * 0.34;
      for (let j = 0; j <= segV; j++) {
        const vNorm = j / segV;
        const v = vNorm * 2 - 1; // -1..1 across hammock width
        const cup = (v * v - 1) * 0.06 * Math.sin(Math.PI * u);
        positions.push(center.x, center.y + cup, center.z + v * halfWidth);
        uvs.push(u, vNorm);
      }
    }
    for (let i = 0; i < segU; i++) {
      for (let j = 0; j < segV; j++) {
        const a = i * (segV + 1) + j;
        const b = a + segV + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => hammockGeometry.dispose(), [hammockGeometry]);

  const bolts = useMemo(() => Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2), []);

  return (
    <Piece name="porthole">
      {/* Heavy riveted bulkhead circular porthole (`reference/4/1.png`) */}
      <group position={[0, 1.85, -PIECES.porthole.depth / 2 + 0.02]}>
        <mesh>
          <circleGeometry args={[0.64, 48]} />
          <meshBasicMaterial map={city} toneMapped={false} />
        </mesh>
        <Reflection />
        {/* Subtle glass sheen */}
        <mesh position={[0, 0, 0.008]}>
          <circleGeometry args={[0.64, 48]} />
          <meshStandardMaterial color="#80d8ff" transparent opacity={0.08} roughness={0.1} metalness={0.3} depthWrite={false} />
        </mesh>
        {/* Inner beveled flange & main bulkhead frame ring */}
        <mesh position={[0, 0, 0.022]}>
          <torusGeometry args={[0.64, 0.032, 10, 48]} />
          <meshStandardMaterial color="#3c424c" metalness={0.85} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <torusGeometry args={[0.7, 0.065, 14, 48]} />
          <meshStandardMaterial color="#585f6a" metalness={0.82} roughness={0.44} />
        </mesh>
        {bolts.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.095]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.02, 6]} />
            <meshStandardMaterial color="#9aa2ae" metalness={0.9} roughness={0.28} />
          </mesh>
        ))}
      </group>

      {/* Woven hammock sling, cushion pillow, and wall anchor ropes */}
      <mesh geometry={hammockGeometry}>
        <meshStandardMaterial map={fabric} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <RoundedBox args={[0.32, 0.09, 0.22]} radius={0.03} smoothness={3} position={[-0.45, 0.96, 0.08]} rotation={[0.1, 0.2, -0.35]}>
        <meshStandardMaterial color="#3c4f66" roughness={0.88} metalness={0.05} />
      </RoundedBox>
      {/* Suspension ropes to wall anchors */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.05, 1.42, -0.28]} rotation={[0.45, 0, side * -0.55]}>
            <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
            <meshStandardMaterial color="#6e6556" roughness={0.9} />
          </mesh>
          <Box size={[0.06, 0.06, 0.04]} at={[side * 1.12, 1.52, -0.35]} color="#3a404a" roughness={0.5} metalness={0.8} />
        </group>
      ))}
      {/* Cargo crate beside the hammock (`reference/4/1.png`) */}
      <Box size={[0.32, 0.26, 0.24]} at={[0.88, 0.13, -0.18]} color="#383e46" roughness={0.62} metalness={0.65} />
      <Box size={[0.26, 0.02, 0.18]} at={[0.88, 0.27, -0.18]} color="#252930" roughness={0.5} metalness={0.7} />
    </Piece>
  );
}

const BOARD_PHOTOS = [
  { url: "/images/star_vessel.png", x: -0.76, y: 0.36, w: 0.39, h: 0.22, tilt: 0.05 },
  { url: "/images/coffee.png", x: -0.26, y: -0.32, w: 0.36, h: 0.21, tilt: -0.04 },
  { url: "/images/loo100.png", x: 0.24, y: 0.38, w: 0.39, h: 0.22, tilt: -0.05 },
  { url: "/images/bukka_now.png", x: 0.78, y: 0.28, w: 0.36, h: 0.21, tilt: 0.04 },
  { url: "/images/imadoko.png", x: -0.76, y: -0.34, w: 0.34, h: 0.2, tilt: -0.03 },
  { url: "/images/michaw.png", x: 0.28, y: -0.36, w: 0.36, h: 0.21, tilt: 0.03 },
  { url: "/images/synesthesium.png", x: 0.78, y: -0.32, w: 0.34, h: 0.2, tilt: -0.06 },
  { url: "/images/goto.png", x: -0.24, y: 0.38, w: 0.34, h: 0.2, tilt: 0.03 },
] as const;

export function Board() {
  const { width, depth } = PIECES.board;
  const cy = SUBJECTS.experience.local[1];
  const boardTex = useMemo(() => makeBoardTexture(), []);
  useEffect(() => () => boardTex.dispose(), [boardTex]);

  const notes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: -width / 2 + 0.18 + hash01(i * 3 + 1) * (width - 0.36),
        y: cy - 0.56 + hash01(i * 3 + 2) * 1.12,
        w: 0.13 + hash01(i * 3 + 3) * 0.11,
        h: 0.11 + hash01(i * 7 + 5) * 0.12,
        tilt: (hash01(i * 13 + 2) - 0.5) * 0.14,
        color: ["#f5e27a", "#f2ede0", "#f2a7c3", "#9fd3f0", "#e6d8b5"][Math.floor(hash01(i * 11 + 7) * 5)],
      })),
    [width, cy]
  );

  const pins = useMemo(
    () => [
      ...BOARD_PHOTOS.map((p) => ({ x: p.x, y: cy + p.y + p.h / 2 - 0.015 })),
      ...notes.slice(0, 8).map((n) => ({ x: n.x, y: n.y + n.h / 2 - 0.015 })),
    ],
    [cy, notes]
  );

  const strings = useMemo(() => {
    const out: number[] = [];
    pins.forEach((p, i) => {
      for (const step of [2, 5]) {
        const q = pins[(i + step) % pins.length];
        if (hash01(i * 17 + step) > 0.45) out.push(p.x, p.y, 0, q.x, q.y, 0);
      }
    });
    return new Float32Array(out);
  }, [pins]);

  return (
    <Piece name="board">
      {/* Heavy wood-and-steel frame */}
      <Box size={[BOARD_FRAME.width, BOARD_FRAME.height, depth]} at={[0, cy, 0]} color="#34261a" roughness={0.75} metalness={0.2} />
      {/* Dual work lamps over the board */}
      {[-0.65, 0.65].map((lx) => (
        <group key={lx} position={[lx, cy + 0.88, 0.08]}>
          <Box size={[0.56, 0.05, 0.12]} at={[0, 0, 0]} color="#252932" roughness={0.5} metalness={0.75} />
          <Box size={[0.48, 0.012, 0.08]} at={[0, -0.025, 0]} color="#000000" glow="#ffcf8a" glowStrength={2.5} />
        </group>
      ))}
      {/* Textured cork + world chart / blueprint backing */}
      <mesh position={[0, cy, depth / 2 + 0.004]}>
        <planeGeometry args={[width, 1.5]} />
        <meshStandardMaterial map={boardTex} roughness={0.92} metalness={0.04} />
      </mesh>

      {/* Sticky notes */}
      {notes.map((p, i) => (
        <Box
          key={i}
          size={[p.w, p.h, 0.004]}
          at={[p.x, p.y, depth / 2 + 0.008 + i * 0.0004]}
          rotation={[0, 0, p.tilt]}
          color={p.color}
          roughness={0.9}
          metalness={0}
        />
      ))}

      {/* Real product screenshot cards pinned onto the board */}
      {BOARD_PHOTOS.map((p, i) => (
        <PhotoCard
          key={p.url}
          url={p.url}
          size={[p.w, p.h]}
          at={[p.x, cy + p.y, depth / 2 + 0.016 + i * 0.0004]}
          rotation={[0, 0, p.tilt]}
        />
      ))}

      {/* Red pushpins & detective yarn strings */}
      {pins.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, depth / 2 + 0.028]}>
          <sphereGeometry args={[0.013, 8, 6]} />
          <meshStandardMaterial color="#c8242c" roughness={0.35} />
        </mesh>
      ))}
      <lineSegments position={[0, 0, depth / 2 + 0.032]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[strings, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#d4242e" />
      </lineSegments>
    </Piece>
  );
}

export function Comms() {
  return (
    <Piece name="comms">
      <Postbox />
    </Piece>
  );
}

export function Door({ neon }: { neon: NeonTheme }) {
  const { width, depth } = PIECES.door;
  const doorTex = useMemo(() => makeDoorDecalTexture(), []);
  useEffect(() => () => doorTex.dispose(), [doorTex]);

  return (
    <Piece name="door">
      {/* Thick outer & inner bulkhead airlock frames (staggered in Z to prevent Z-fighting) */}
      <Box size={[width + 0.24, 2.34, depth + 0.02]} at={[0, 1.17, -0.005]} color="#252930" roughness={0.55} metalness={0.72} />
      <Box size={[width + 0.08, 2.18, depth + 0.012]} at={[0, 1.11, 0.002]} color="#16191f" roughness={0.65} metalness={0.65} />

      {/* Recessed door slab with stencil & caution stripes (`reference/4/1.png` & `2.png`) */}
      <Box size={[width, 2.1, depth]} at={[0, 1.07, 0.014]} color="#484e58" roughness={0.62} metalness={0.65} />
      <mesh position={[0, 1.07, depth / 2 + 0.016]}>
        <planeGeometry args={[width - 0.04, 2.04]} />
        <meshStandardMaterial map={doorTex} roughness={0.65} metalness={0.55} />
      </mesh>

      {/* 6-spoke handwheel lock + central hub */}
      <group position={[0.18, 1.08, depth / 2 + 0.055]}>
        <mesh>
          <torusGeometry args={[0.17, 0.022, 10, 32]} />
          <meshStandardMaterial color="#8e949e" metalness={0.88} roughness={0.28} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.04, 12]} />
          <meshStandardMaterial color="#6e747e" metalness={0.85} roughness={0.32} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <cylinderGeometry args={[0.012, 0.012, 0.34, 8]} />
            <meshStandardMaterial color="#7d838e" metalness={0.85} roughness={0.32} />
          </mesh>
        ))}
      </group>

      {/* Heavy side hinges */}
      {[0.38, 1.08, 1.78].map((hy) => (
        <Box key={hy} size={[0.06, 0.14, 0.05]} at={[-width / 2 + 0.02, hy, depth / 2 + 0.024]} color="#353a44" roughness={0.48} metalness={0.8} />
      ))}

      {/* Caged warm bulkhead overhead lamp */}
      <group position={[0, 2.26, depth / 2 + 0.03]}>
        <Box size={[0.74, 0.08, 0.06]} at={[0, 0, 0]} color="#22262e" roughness={0.5} metalness={0.75} />
        <Box size={[0.64, 0.04, 0.03]} at={[0, 0, 0.024]} color="#000000" glow={neon.warm} glowStrength={3} />
      </group>

      {/* Flanking vertical conduits & junction plates */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.2), 0, 0]}>
          <mesh position={[0, 1.2, -0.02]}>
            <cylinderGeometry args={[0.018, 0.018, 2.4, 10]} />
            <meshStandardMaterial color="#343942" metalness={0.8} roughness={0.4} />
          </mesh>
          <Box size={[0.16, 0.09, 0.06]} at={[0, 2.05, 0.01]} color="#2a2d33" roughness={0.55} metalness={0.7} />
          <Box size={[0.12, 0.05, 0.008]} at={[0, 2.05, 0.042]} color="#000000" glow={neon.warm} glowStrength={2.5} />
        </group>
      ))}
      <LightSwitches />
    </Piece>
  );
}

/**
 * Central room hologram unit: synchronized floor & ceiling projectors casting
 * dual additive light cones into the hovering 3D world-map Earth at the centre.
 */
function CenterHologram({ neon }: { neon: NeonTheme }) {
  const beamTex = useMemo(() => makeHoloBeamTexture(), []);
  useEffect(() => () => beamTex.dispose(), [beamTex]);

  const scanTopRef = useRef<THREE.Mesh>(null);
  const scanBotRef = useRef<THREE.Mesh>(null);
  const emitterBolts = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);

  useFrame((state) => {
    const t = sceneClock.time(state.clock.elapsedTime);
    if (scanTopRef.current) {
      const y = 2.6 + Math.sin(t * 0.7) * 0.42;
      const r = 0.075 + ((3.3 - y) / 1.86) * (0.36 - 0.075);
      scanTopRef.current.position.y = y;
      scanTopRef.current.scale.set(r / 0.36, r / 0.36, 1);
    }
    if (scanBotRef.current) {
      const y = 0.44 + Math.cos(t * 0.7) * 0.24;
      const r = 0.078 + ((y - 0.04) / 1.22) * (0.36 - 0.078);
      scanBotRef.current.position.y = y;
      scanBotRef.current.scale.set(r / 0.36, r / 0.36, 1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Compact floor emitter pad with narrow aperture lens */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.03, 48]} />
          <meshStandardMaterial color="#1f242c" roughness={0.42} metalness={0.82} />
        </mesh>
        <mesh position={[0, 0.038, 0]}>
          <cylinderGeometry args={[0.14, 0.17, 0.018, 48]} />
          <meshStandardMaterial color="#2e3540" roughness={0.36} metalness={0.88} />
        </mesh>
        <mesh position={[0, 0.048, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.075, 0.095, 48]} />
          <meshBasicMaterial color={neon.cool} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.074, 36]} />
          <meshBasicMaterial color="#093647" transparent opacity={0.95} />
        </mesh>
        {emitterBolts.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.23, 0.034, Math.sin(a) * 0.23]}>
            <cylinderGeometry args={[0.01, 0.01, 0.01, 6]} />
            <meshStandardMaterial color="#8f97a4" metalness={0.9} roughness={0.28} />
          </mesh>
        ))}
      </group>

      {/* Compact ceiling emitter rig directly above */}
      <group position={[0, WALL_HEIGHT, 0]}>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.3, 0.25, 0.06, 48]} />
          <meshStandardMaterial color="#1f242c" roughness={0.42} metalness={0.82} />
        </mesh>
        <mesh position={[0, -0.078, 0]}>
          <cylinderGeometry args={[0.16, 0.12, 0.04, 48]} />
          <meshStandardMaterial color="#2e3540" roughness={0.36} metalness={0.88} />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.072, 0.092, 48]} />
          <meshBasicMaterial color={neon.cool} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.099, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.07, 36]} />
          <meshBasicMaterial color="#093647" transparent opacity={0.95} />
        </mesh>
        {emitterBolts.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * 0.22, -0.064, Math.sin(a) * 0.22]}>
            <cylinderGeometry args={[0.01, 0.01, 0.01, 6]} />
            <meshStandardMaterial color="#8f97a4" metalness={0.9} roughness={0.28} />
          </mesh>
        ))}
      </group>

      {/* Dual focused projection cones + slender core beams: floor -> globe & ceiling -> globe */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.36, 0.078, 1.22, 48, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          color={neon.cool}
          transparent
          opacity={0.26}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <cylinderGeometry args={[0.11, 0.026, 1.14, 32, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          color={neon.cool}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - 1.03, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.075, 1.86, 48, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          color={neon.cool}
          transparent
          opacity={0.26}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - 0.99, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.025, 1.78, 32, 1, true]} />
        <meshBasicMaterial
          map={beamTex}
          color={neon.cool}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Slowly drifting holographic scan rings scaled to match the tapered cone */}
      <mesh ref={scanTopRef} position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.004, 6, 72]} />
        <meshBasicMaterial color={neon.cool} transparent opacity={0.4} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={scanBotRef} position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.004, 6, 72]} />
        <meshBasicMaterial color={neon.cool} transparent opacity={0.4} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Core glowing Earth + global-to-Japan arcs */}
      <HologramMap at={[0, 1.32, 0]} radius={0.546} visible />
      <pointLight position={[0, 1.32, 0]} color={neon.cool} intensity={1.35} distance={4.8} decay={2} />
    </group>
  );
}

const DESK_LAMP_BULB = lampJoints().bulb;

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

const CEILING_LIGHT = 3.2;
const DESK_LAMP_LIGHT = 3.2;

/**
 * The room's lights: ambient floor preserving lights-off visibility, switchable
 * ceiling & desk lamps, and rich warm/cool pools reflecting off the steel deck.
 */
export function Lights({ lights }: { lights: RoomLights }) {
  const neon = neonTheme(lights);
  const at = (angle: number, distance: number, y: number): [number, number, number] => {
    const [x, z] = horizontalAt(angle);
    return [x * distance, y, z * distance];
  };
  return (
    <>
      <hemisphereLight args={["#6884c8", "#1a120a", AMBIENT_FLOOR.hemisphere]} />
      <ambientLight intensity={AMBIENT_FLOOR.ambient} />
      <pointLight position={[0, WALL_HEIGHT - 0.3, 0]} color="#ffe6c8" intensity={lights.ceiling ? CEILING_LIGHT : 0} distance={9} decay={2} />
      <pointLight
        position={pieceToWorld(PIECES.desk, DESK_LAMP_BULB)}
        color="#ffcf8a"
        intensity={lights.desk ? DESK_LAMP_LIGHT : 0}
        distance={3.6}
        decay={2}
      />
      {/* Desk / Hologram cool cyan pool */}
      <pointLight position={at(10, 1.95, 1.35)} color={neon.cool} intensity={3.6} distance={5.5} decay={2} />
      {/* Shelf warm showcase glow */}
      <pointLight position={at(68, 2.15, 1.25)} color={neon.warm} intensity={2.8} distance={4.0} decay={2} />
      {/* Porthole cyberpunk colony glow */}
      <pointLight position={at(165, 2.4, 1.8)} color="#45d8ff" intensity={2.0} distance={3.8} decay={2} />
      {/* Investigation board warm worklight */}
      <pointLight position={at(218, 1.9, 2.3)} color={neon.warm} intensity={2.8} distance={4.2} decay={2} />
      {/* Postbox / Contact warm neutral light so postal red and stationery read clearly */}
      <pointLight position={at(272, 1.45, 2.05)} color="#fff0d8" intensity={2.6} distance={3.8} decay={2} />
      {/* Door bulkhead warm accent */}
      <pointLight position={at(300, 2.15, 2.0)} color={neon.warm} intensity={1.8} distance={3.4} decay={2} />
    </>
  );
}

export default function RoomScene() {
  const { lights } = useAppState();
  const neon = neonTheme(lights);
  return (
    <group>
      <RoomEnvironment neon={neon} />
      <Lights lights={lights} />
      <Shell ceiling={lights.ceiling} neon={neon} />
      <Desk />
      <Shelf neon={neon} />
      <Bookcase />
      <PortholeAndHammock />
      <Board />
      <Comms />
      <Door neon={neon} />
      <CenterHologram neon={neon} />
      <ScreenHole panel={DESK_SCREEN} />
      <Self />
      {/* After the body: the glass reflects where the body is this frame. */}
      <CurveMirror />
      <SecurityCameraBody />
      <SectionMarkers />
    </group>
  );
}
