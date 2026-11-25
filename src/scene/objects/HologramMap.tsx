"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneClock } from "../sceneClock";
import {
  ACCESS_HUBS,
  CONTINENT_DOTS,
  JAPAN_COORD,
  JAPAN_POLYGONS,
  WORLD_POLYGONS,
  arcPoints,
  latLonToEquirectangular,
  latLonToUnit,
  pulseProgress,
  type GeoCoord,
} from "../room/holoMap";

/**
 * The room's central 3D hologram: a glowing Earth projected between the floor
 * and ceiling emitters, showing a crisp holographic world map, illuminated Japan
 * archipelago, animated access arcs from global hubs, and orbital telemetry
 * rings, driven deterministically by `sceneClock`.
 */

const BASE_RADIUS = 0.39;
const DEFAULT_RADIUS = 0.546;
const TURN_RATE = 0.16;
const ARC_STEPS = 32;
const TRAIL_STEPS = 3;

function tracePolygon(
  ctx: CanvasRenderingContext2D,
  poly: readonly GeoCoord[],
  w: number,
  h: number
) {
  if (poly.length === 0) return;
  ctx.beginPath();
  poly.forEach((pt, idx) => {
    const [x, y] = latLonToEquirectangular(pt.lat, pt.lon, w, h);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/**
 * Render an equirectangular 2048×1024 holographic world map aligned 1:1 with
 * Three.js `SphereGeometry` UVs and `latLonToUnit`.
 */
function makeWorldMapTexture(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, w, h);

  // Graticule grid every 15°, emphasizing equator & prime meridian
  for (let lon = -180; lon <= 180; lon += 15) {
    const [x] = latLonToEquirectangular(0, lon, w, h);
    ctx.strokeStyle = lon === 0 ? "rgba(95,245,255,0.34)" : "rgba(47,232,255,0.12)";
    ctx.lineWidth = lon === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = latLonToEquirectangular(lat, 0, w, h);
    ctx.strokeStyle = lat === 0 ? "rgba(95,245,255,0.38)" : "rgba(47,232,255,0.12)";
    ctx.lineWidth = lat === 0 ? 2.2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Subtle holographic scanlines across land fill via an offscreen pattern
  const patCanvas = document.createElement("canvas");
  patCanvas.width = 8;
  patCanvas.height = 8;
  const pctx = patCanvas.getContext("2d")!;
  pctx.fillStyle = "rgba(38,225,255,0.36)";
  pctx.fillRect(0, 0, 8, 4);
  pctx.fillStyle = "rgba(18,175,215,0.18)";
  pctx.fillRect(0, 4, 8, 4);
  const landPattern = ctx.createPattern(patCanvas, "repeat");

  // World continents: filled holo tint + glowing coastline stroke
  ctx.save();
  ctx.shadowColor = "#2fe8ff";
  ctx.shadowBlur = 10;
  for (const poly of WORLD_POLYGONS) {
    tracePolygon(ctx, poly, w, h);
    ctx.fillStyle = landPattern ?? "rgba(35,215,245,0.34)";
    ctx.fill();
    ctx.strokeStyle = "rgba(145,248,255,0.88)";
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
  ctx.restore();

  // Highlight Japan archipelago in warm amber-gold
  ctx.save();
  ctx.shadowColor = "#ffb020";
  ctx.shadowBlur = 14;
  for (const poly of JAPAN_POLYGONS) {
    tracePolygon(ctx, poly, w, h);
    ctx.fillStyle = "rgba(255,176,32,0.78)";
    ctx.fill();
    ctx.strokeStyle = "#ffe599";
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  ctx.restore();

  // Subtle target rings on each access hub & Tokyo
  for (const hub of ACCESS_HUBS) {
    const [hx, hy] = latLonToEquirectangular(hub.lat, hub.lon, w, h);
    ctx.strokeStyle = "rgba(170,252,255,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  const [tx, ty] = latLonToEquirectangular(JAPAN_COORD.lat, JAPAN_COORD.lon, w, h);
  ctx.strokeStyle = "#ffe394";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tx, ty, 12, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export default function HologramMap({
  at,
  visible,
  radius = DEFAULT_RADIUS,
}: {
  at: readonly [number, number, number];
  visible: boolean;
  radius?: number;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const globeRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const pulseRing1Ref = useRef<THREE.Mesh>(null);
  const pulseRing2Ref = useRef<THREE.Mesh>(null);
  const packetsRef = useRef<THREE.InstancedMesh>(null);
  const mapMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const wireMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const arcsMatRef = useRef<THREE.LineBasicMaterial>(null);

  const worldMapTex = useMemo(() => makeWorldMapTexture(), []);

  const globeData = useMemo(() => {
    const scale = radius / BASE_RADIUS;

    // Accent continent points on top of the textured globe
    const dotPositions = new Float32Array(CONTINENT_DOTS.length * 3);
    const dotColors = new Float32Array(CONTINENT_DOTS.length * 3);
    const cyan = new THREE.Color("#62f6ff");
    const amber = new THREE.Color("#ffbe48");
    CONTINENT_DOTS.forEach((c, i) => {
      const [ux, uy, uz] = latLonToUnit(c.lat, c.lon);
      dotPositions[i * 3] = ux * (radius + 0.002);
      dotPositions[i * 3 + 1] = uy * (radius + 0.002);
      dotPositions[i * 3 + 2] = uz * (radius + 0.002);
      const inJapan = c.lat >= 30 && c.lat <= 45 && c.lon >= 129 && c.lon <= 146;
      const col = inJapan ? amber : cyan;
      dotColors[i * 3] = col.r;
      dotColors[i * 3 + 1] = col.g;
      dotColors[i * 3 + 2] = col.b;
    });
    const dotsGeom = new THREE.BufferGeometry();
    dotsGeom.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotsGeom.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));

    // Hub pins buffer
    const hubPositions = new Float32Array(ACCESS_HUBS.length * 3);
    ACCESS_HUBS.forEach((h, i) => {
      const [ux, uy, uz] = latLonToUnit(h.lat, h.lon);
      hubPositions[i * 3] = ux * (radius + 0.006);
      hubPositions[i * 3 + 1] = uy * (radius + 0.006);
      hubPositions[i * 3 + 2] = uz * (radius + 0.006);
    });
    const hubsGeom = new THREE.BufferGeometry();
    hubsGeom.setAttribute("position", new THREE.BufferAttribute(hubPositions, 3));

    // Trajectory curves + sampled array for traveling packets
    const arcs = ACCESS_HUBS.map((hub) => ({
      hub,
      points: arcPoints(hub, JAPAN_COORD, radius, ARC_STEPS),
    }));
    const lineSegPositions = new Float32Array(arcs.length * ARC_STEPS * 2 * 3);
    let ptr = 0;
    for (const { points } of arcs) {
      for (let s = 0; s < ARC_STEPS; s++) {
        lineSegPositions[ptr++] = points[s][0];
        lineSegPositions[ptr++] = points[s][1];
        lineSegPositions[ptr++] = points[s][2];
        lineSegPositions[ptr++] = points[s + 1][0];
        lineSegPositions[ptr++] = points[s + 1][1];
        lineSegPositions[ptr++] = points[s + 1][2];
      }
    }
    const arcsGeom = new THREE.BufferGeometry();
    arcsGeom.setAttribute("position", new THREE.BufferAttribute(lineSegPositions, 3));

    // Japan beacon transform
    const jpUnit = latLonToUnit(JAPAN_COORD.lat, JAPAN_COORD.lon);
    const jpNormal = new THREE.Vector3(...jpUnit);
    const jpPos = jpNormal.clone().multiplyScalar(radius + 0.008);
    const jpQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), jpNormal);

    return { dotsGeom, hubsGeom, arcsGeom, arcs, jpPos, jpQuat, scale };
  }, [radius]);

  useEffect(
    () => () => {
      worldMapTex.dispose();
      globeData.dotsGeom.dispose();
      globeData.hubsGeom.dispose();
      globeData.arcsGeom.dispose();
    },
    [globeData, worldMapTex]
  );

  // Reusable scratch objects for per-frame instanced packet updates (zero allocations in useFrame)
  const scratch = useMemo(
    () => ({ obj: new THREE.Object3D(), col: new THREE.Color(), center: new THREE.Vector3() }),
    []
  );

  useFrame((state) => {
    if (!visible) return;
    const t = sceneClock.time(state.clock.elapsedTime);

    // Smooth proximity fade so walking right through the room center never fills the camera
    scratch.center.set(at[0], at[1], at[2]);
    const dist = state.camera.position.distanceTo(scratch.center);
    const prox = THREE.MathUtils.clamp((dist - (radius + 0.12)) / 0.24, 0, 1);
    if (rootRef.current) rootRef.current.visible = prox > 0.02;
    if (mapMatRef.current) mapMatRef.current.opacity = 0.94 * prox;
    if (coreMatRef.current) coreMatRef.current.opacity = 0.42 * prox;
    if (wireMatRef.current) wireMatRef.current.opacity = 0.11 * prox;
    if (arcsMatRef.current) arcsMatRef.current.opacity = 0.34 * prox;
    if (prox <= 0.02) return;

    // Continuously rotate slowly while keeping Japan visible right on initial room entry
    if (globeRef.current) globeRef.current.rotation.y = -2.02 + Math.sin(t * TURN_RATE) * 0.65;
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.34;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.24;

    // Pulsing concentric beacon rings over Japan
    for (const [ref, offset] of [
      [pulseRing1Ref, 0],
      [pulseRing2Ref, 0.5],
    ] as const) {
      const m = ref.current;
      if (!m) continue;
      const p = (t * 0.85 + offset) % 1;
      const s = 0.4 + p * 2.5;
      m.scale.set(s, s, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.88 * prox;
    }

    // Animated comet packets flying along every arc toward Japan
    const packets = packetsRef.current;
    if (packets) {
      let idx = 0;
      for (const { hub, points } of globeData.arcs) {
        const p = pulseProgress(t, hub.phase, 2.6);
        for (let k = 0; k < TRAIL_STEPS; k++) {
          const tp = Math.max(0, p - k * 0.035);
          const f = tp * ARC_STEPS;
          const i0 = Math.min(ARC_STEPS - 1, Math.floor(f));
          const frac = f - i0;
          const a = points[i0];
          const b = points[i0 + 1];
          scratch.obj.position.set(
            a[0] + (b[0] - a[0]) * frac,
            a[1] + (b[1] - a[1]) * frac,
            a[2] + (b[2] - a[2]) * frac
          );
          const s = k === 0 ? 1.0 : 0.72 - k * 0.16;
          scratch.obj.scale.setScalar(s);
          scratch.obj.updateMatrix();
          packets.setMatrixAt(idx, scratch.obj.matrix);
          scratch.col.set(tp > 0.78 ? "#ffb020" : k === 0 ? "#d2fdff" : "#2fe8ff");
          packets.setColorAt(idx, scratch.col);
          idx++;
        }
      }
      packets.instanceMatrix.needsUpdate = true;
      if (packets.instanceColor) packets.instanceColor.needsUpdate = true;
    }
  });

  const packetCount = ACCESS_HUBS.length * TRAIL_STEPS;

  return (
    <group position={[at[0], at[1], at[2]]} visible={visible}>
      <group ref={rootRef}>
        {/* Tilted holographic globe */}
        <group rotation={[0.2, 0, -0.1]}>
          <group ref={globeRef}>
            {/* Subtle dark core so front continents read cleanly against the far hemisphere */}
            <mesh>
              <sphereGeometry args={[radius * 0.97, 32, 24]} />
              <meshBasicMaterial ref={coreMatRef} color="#02131d" transparent opacity={0.42} depthWrite={false} />
            </mesh>

            {/* Crisp equirectangular world map layer */}
            <mesh>
              <sphereGeometry args={[radius, 64, 48]} />
              <meshBasicMaterial
                ref={mapMatRef}
                map={worldMapTex}
                transparent
                opacity={0.94}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {/* Faint holographic wireframe shell */}
            <mesh>
              <sphereGeometry args={[radius * 1.005, 24, 16]} />
              <meshBasicMaterial
                ref={wireMatRef}
                color="#2fe8ff"
                wireframe
                transparent
                opacity={0.11}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            {/* Equator highlight ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * 1.012, 0.0022 * globeData.scale, 6, 72]} />
              <meshBasicMaterial color="#4af2ff" transparent opacity={0.48} toneMapped={false} />
            </mesh>

            {/* Accent continent nodes */}
            <points geometry={globeData.dotsGeom}>
              <pointsMaterial
                size={0.011 * globeData.scale}
                vertexColors
                transparent
                opacity={0.65}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                sizeAttenuation
              />
            </points>

            {/* Global access source pins */}
            <points geometry={globeData.hubsGeom}>
              <pointsMaterial
                size={0.019 * globeData.scale}
                color="#a8fbff"
                transparent
                opacity={0.95}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
                sizeAttenuation
              />
            </points>

            {/* Trajectory lines into Japan */}
            <lineSegments geometry={globeData.arcsGeom}>
              <lineBasicMaterial
                ref={arcsMatRef}
                color="#2fe8ff"
                transparent
                opacity={0.34}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </lineSegments>

            {/* Animated data packets traveling toward Japan */}
            <instancedMesh ref={packetsRef} args={[undefined, undefined, packetCount]}>
              <sphereGeometry args={[0.009 * globeData.scale, 8, 6]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.96}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </instancedMesh>

            {/* Japan target beacon & pulsing arrival rings */}
            <group position={globeData.jpPos} quaternion={globeData.jpQuat}>
              <mesh>
                <sphereGeometry args={[0.014 * globeData.scale, 10, 8]} />
                <meshBasicMaterial color="#ff9d2e" toneMapped={false} />
              </mesh>
              <mesh ref={pulseRing1Ref}>
                <ringGeometry args={[0.022 * globeData.scale, 0.029 * globeData.scale, 32]} />
                <meshBasicMaterial
                  color="#ffb020"
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
              <mesh ref={pulseRing2Ref}>
                <ringGeometry args={[0.022 * globeData.scale, 0.029 * globeData.scale, 32]} />
                <meshBasicMaterial
                  color="#2fe8ff"
                  transparent
                  opacity={0.65}
                  side={THREE.DoubleSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          </group>

          {/* Outer orbital telemetry rings */}
          <mesh ref={ring1Ref} rotation={[Math.PI / 2.2, 0.25, 0]}>
            <torusGeometry args={[radius * 1.24, 0.0028 * globeData.scale, 8, 84]} />
            <meshBasicMaterial color="#2fe8ff" transparent opacity={0.48} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh ref={ring2Ref} rotation={[Math.PI / 2.8, -0.45, 0]}>
            <torusGeometry args={[radius * 1.36, 0.002 * globeData.scale, 8, 84]} />
            <meshBasicMaterial color="#ffb020" transparent opacity={0.34} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
