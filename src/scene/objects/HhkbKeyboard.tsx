"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { KEYBOARD } from "../room/layout";
import {
  HHKB,
  KEY_BLOCK,
  KEY_COUNT,
  PLATE_TILT_DEG,
  PRESS_DIRECTION,
  growOutline,
  keyVoice,
  keyWear,
  keyboardKeys,
  keysForCode,
  planeHeightAt,
  plateToBoard,
  trayOutline,
} from "../room/keyboard";
import { keycapMesh, legendAtlas } from "../room/keycaps";
import { isInteractive, pointerClaim } from "../pointerClaim";
import { makeLegendTexture, makeLogoTexture, makeRoughnessTexture } from "./keyboardLegends";
import { playKey, wakeKeySound } from "./keySound";

/**
 * The PC's keyboard, a HHKB Professional2 (`room/keyboard.ts`) with the
 * owner's name on it ("Miiiwa Professional3", `makeLogoTexture`): a white
 * case with a recessed tray and rounded edges, 60 sculpted caps printed with
 * their legends and worn by use (`keyWear`: yellowed, polished, a little
 * grime, the print faded), and the logo on the right blank. **The keys go
 * down, and click** (`keySound`).
 *
 * - **With the mouse**: press a key and it stays down until the button is let
 *   go. In the free view the canvas hears the click (the key claims the
 *   pointer, like the light switches, so it does not also grab the mouse).
 *   Sitting at the PC the canvas lets pointers through to the screen behind
 *   it, so the keyboard listens on the window and casts its own ray — but
 *   not for a press on the page's own controls (`isInteractive`).
 * - **With the reader's own keyboard**, while `typing`: every key held down
 *   holds down the key in the same place; an arrow, F1–F12 and the like hold
 *   down Fn and the key that carries it (`keysForCode`).
 *
 * All 60 caps are one mesh and one draw call (`room/keycaps.ts`). Each vertex
 * knows its key; the shader moves a key's vertices down the plate's normal by
 * the travel times how far that key is pressed (`uPress`), so pressing costs
 * a uniform update, not a mesh rebuild.
 */

/** Colours read off `reference/4/キーボード１.png` (sRGB): lit key tops, the gray keys, the case, the tray between the keys. */
const COLOURS = { alpha: "#dedee3", mod: "#c5ccd9", case: "#e3e3e5", tray: "#9a9da5" } as const;
/**
 * Age (**仮**): what the white plastic drifts towards over the years, how far
 * the case and the least-used cap have gone, and how much further the
 * most-used cap goes (`keyWear`) — skin oil yellows a cap faster than light.
 * The gray caps show it half as much.
 */
const AGED = "#e6dcc4";
const AGE = { case: 0.12, cap: 0.08, worn: 0.22, grayShare: 0.5 } as const;
/** The case's rim stands this far over the plate; the tray's floor lies this far under it (**仮**). */
const RIM = 0.003;
const FLOOR = -0.0025;
/** How round the rim's edges are (**仮**). */
const EDGE = 0.0015;
/** How quickly a cap follows the finger: the fraction of the way it goes in a second's 1/40. */
const PRESS_RATE = 40;

const KEYS = keyboardKeys();
const TILT = (PLATE_TILT_DEG * Math.PI) / 180;

/** A top-view outline as a three.js shape (shape y is −z, so the slab can be stood up by `slab`). */
function outline(points: [number, number][]): THREE.Shape {
  return new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
}

function roundedRect(width: number, depth: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = width / 2;
  const y = depth / 2;
  s.moveTo(-x + radius, -y);
  s.lineTo(x - radius, -y);
  s.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(x, y - radius);
  s.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(-x + radius, y);
  s.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + radius);
  s.absarc(-x + radius, -y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** A shape stood up between two heights that may slope with depth (`bottom(z)`, `top(z)`). */
function slab(shape: THREE.Shape, bottom: (z: number) => number, top: (z: number) => number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i);
    position.setY(i, position.getY(i) < 0.5 ? bottom(z) : top(z));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Like `slab`, with the top edges rounded by `edge`: three.js bevels both
 * ends of an extrusion and grows the outline by the bevel, so the shape is
 * given `edge` smaller all round and comes out at its full size. The bottom
 * bevel is flattened onto the bottom, where nothing sees it. Vertices are
 * merged so the rounding shades smooth; the walls get a ring of vertices
 * just under the rounding, so the smoothing stays in that thin band instead
 * of tinting the whole wall (it did: the front of the case shaded as two
 * bands).
 */
function roundedSlab(shape: THREE.Shape, bottom: (z: number) => number, top: (z: number) => number, edge: number): THREE.BufferGeometry {
  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: edge,
    bevelSize: edge,
    bevelSegments: 3,
    curveSegments: 6,
    steps: 2,
  });
  extruded.rotateX(-Math.PI / 2);
  const position = extruded.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const z = position.getZ(i);
    // Along the extrusion: 1 + edge is the top, (1, 1 + edge) the rounding, 1 and ½ the wall's top two rings, 0 the bottom.
    position.setY(i, y > 1 ? top(z) - (1 + edge - y) : y > 0.75 ? top(z) - edge : y > 0.25 ? top(z) - edge - 0.0004 : bottom(z));
  }
  extruded.deleteAttribute("normal");
  extruded.deleteAttribute("uv");
  const merged = mergeVertices(extruded, 1e-7);
  extruded.dispose();
  merged.computeVertexNormals();
  return merged;
}

function useCase() {
  const parts = useMemo(() => {
    const floor = (z: number) => planeHeightAt(z, FLOOR);
    const tray = trayOutline();
    // The case's walls are the rim's, from the desk up: one wall, not two
    // meeting at the floor (they overlapped there by a millimetre and fought
    // over the same pixels). The rim is smaller by the rounding, which grows
    // it back; its hole larger by the same, which the rounding closes back.
    const rim = roundedRect(HHKB.width - 2 * EDGE, HHKB.depth - 2 * EDGE, 0.006 - EDGE);
    rim.holes.push(new THREE.Path(growOutline(tray, EDGE).map(([x, z]) => new THREE.Vector2(x, -z))));
    return {
      tray: slab(outline(tray), () => 0, (z) => floor(z)),
      rim: roundedSlab(rim, () => 0, (z) => planeHeightAt(z, RIM), EDGE),
    };
  }, []);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  return parts;
}

/** Fills `press` (a key's 0–1 depth) from what is held: eased, in real time, so a paused room still types. */
function stepPress(press: Float32Array, held: Set<number>, delta: number) {
  const k = Math.min(1, delta * PRESS_RATE);
  for (let i = 0; i < press.length; i++) {
    const target = held.has(i) ? 1 : 0;
    press[i] += (target - press[i]) * k;
    if (Math.abs(target - press[i]) < 1e-3) press[i] = target;
  }
}

export default function HhkbKeyboard({ typing }: { typing: boolean }) {
  const caps = useRef<THREE.Mesh>(null);
  const press = useRef(new Float32Array(KEY_COUNT));
  const mouseKey = useRef(-1);
  const held = useRef(new Map<string, number[]>());
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const atlas = useMemo(() => legendAtlas(KEYS), []);
  const geometry = useMemo(() => {
    const mesh = keycapMesh(KEYS, atlas);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
    g.setAttribute("aKey", new THREE.BufferAttribute(mesh.keys, 1));
    // Each cap's colour, aged by how much it is used.
    const aged = new THREE.Color(AGED);
    const capColour = KEYS.map((key) => {
      const share = key.mod ? AGE.grayShare : 1;
      return new THREE.Color(key.mod ? COLOURS.mod : COLOURS.alpha).lerp(aged, share * (AGE.cap + AGE.worn * keyWear(key)));
    });
    const colours = new Float32Array(mesh.keys.length * 3);
    mesh.keys.forEach((k, i) => capColour[k].toArray(colours, i * 3));
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [atlas]);
  const legends = useMemo(() => makeLegendTexture(KEYS, atlas), [atlas]);
  const polish = useMemo(() => makeRoughnessTexture(KEYS, atlas), [atlas]);
  const logo = useMemo(() => makeLogoTexture(), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: legends, roughnessMap: polish, roughness: 1, metalness: 0 });
    const values = press.current;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uPress = { value: values };
      shader.uniforms.uPressStep = { value: new THREE.Vector3(...PRESS_DIRECTION).multiplyScalar(HHKB.travel) };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nattribute float aKey;\nuniform float uPress[${KEY_COUNT}];\nuniform vec3 uPressStep;`)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += uPressStep * uPress[int(aKey + 0.5)];");
    };
    m.customProgramCacheKey = () => "hhkb-keys";
    return m;
  }, [legends, polish]);
  const shell = useCase();
  const caseMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOURS.case).lerp(new THREE.Color(AGED), AGE.case), roughness: 0.55, metalness: 0 }),
    []
  );
  const trayMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: COLOURS.tray, roughness: 0.75, metalness: 0 }), []);
  useEffect(
    () => () => {
      [geometry, legends, polish, logo, material, caseMaterial, trayMaterial].forEach((x) => x.dispose());
    },
    [geometry, legends, polish, logo, material, caseMaterial, trayMaterial]
  );

  // The logo, on the right blank of the bottom row, lying on the rim.
  const logoPlace = useMemo(() => {
    const p = HHKB.pitch;
    const right = KEY_BLOCK.width / 2;
    const bottomRow = -HHKB.depth / 2 + KEY_BLOCK.back + 4.5 * p;
    return {
      position: plateToBoard([right - 1.25 * p, RIM + 0.0002, bottomRow]),
      size: [2.2 * p, 1.1 * p] as [number, number],
    };
  }, []);

  const keyOf = (face: THREE.Face | null | undefined): number => (face ? geometry.attributes.aKey.getX(face.a) : -1);

  // Whatever the mouse is holding goes up when the button is let go, wherever that happens.
  useEffect(() => {
    const release = () => (mouseKey.current = -1);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  // Sitting at the PC: the canvas passes pointers through, so cast the ray here.
  const get = useThree((state) => state.get);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  useEffect(() => {
    if (!typing) return;
    const down = (e: PointerEvent) => {
      if (isInteractive(e.target) || !caps.current) return;
      const { camera, gl } = get();
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(caps.current, false)[0];
      if (!hit) return;
      wakeKeySound();
      mouseKey.current = keyOf(hit.face);
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
    // keyOf reads `geometry`, which never changes after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, get, raycaster]);

  // The reader's own keyboard, while typing: held codes hold their keys down.
  useEffect(() => {
    if (!typing) return;
    const codes = held.current;
    const down = (e: KeyboardEvent) => {
      const keys = keysForCode(e.code);
      if (!keys.length) return;
      wakeKeySound();
      codes.set(e.code, keys);
    };
    const up = (e: KeyboardEvent) => codes.delete(e.code);
    const clear = () => codes.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      codes.clear();
    };
  }, [typing]);

  // What was held last frame, to hear a key go down or come up.
  const wasDown = useRef(new Set<number>());
  useFrame((_, delta) => {
    const down = new Set<number>();
    if (mouseKey.current >= 0) down.add(mouseKey.current);
    for (const keys of held.current.values()) for (const k of keys) down.add(k);
    for (const k of down) if (!wasDown.current.has(k)) playKey(keyVoice(KEYS[k]), true);
    for (const k of wasDown.current) if (!down.has(k)) playKey(keyVoice(KEYS[k]), false);
    wasDown.current = down;
    stepPress(press.current, down, delta);
  });

  return (
    <group position={[KEYBOARD.x, KEYBOARD.y, KEYBOARD.z]}>
      <mesh geometry={shell.rim} material={caseMaterial} />
      <mesh geometry={shell.tray} material={trayMaterial} />
      <mesh position={logoPlace.position} rotation={[TILT - Math.PI / 2, 0, 0]}>
        <planeGeometry args={logoPlace.size} />
        <meshStandardMaterial map={logo} transparent roughness={0.55} depthWrite={false} />
      </mesh>
      <mesh
        ref={caps}
        geometry={geometry}
        material={material}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          const key = keyOf(e.face);
          if (key < 0) return;
          e.stopPropagation();
          pointerClaim.claim(e.pointerId);
          wakeKeySound();
          mouseKey.current = key;
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
