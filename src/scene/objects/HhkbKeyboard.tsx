"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { KEYBOARD } from "../room/layout";
import {
  HHKB,
  KEY_BLOCK,
  KEY_COUNT,
  PLATE_TILT_DEG,
  PRESS_DIRECTION,
  roundedRectOutline,
  keySample,
  keyWear,
  keyboardKeys,
  keysForCode,
  planeHeightAt,
  plateToBoard,
  trayOutline,
} from "../room/keyboard";
import { keycapMesh, legendAtlas } from "../room/keycaps";
import { makeLegendTexture, makeLogoTexture, makeRoughnessTexture } from "./keyboardLegends";
import { fillet, shapeOf, slab } from "./caseShapes";
import { pressableCaps, useKeyPresses } from "./useKeyPresses";

/**
 * The PC's keyboard, a HHKB Professional2 (`room/keyboard.ts`) with the
 * owner's name on it ("Miiiwa Professional3", `makeLogoTexture`): a white
 * case with a recessed tray and rounded edges, 60 sculpted caps printed with
 * their legends and worn by use (`keyWear`: yellowed, polished, a little
 * grime, the print faded), and the logo on the right blank. **The keys go
 * down, and sound** (`keySound`: recorded presses of an HHKB).
 *
 * Pressed with the mouse, and with the reader's own keyboard while seated
 * at the PC and typing on it (`useKeyPresses`, shared with the Mac's
 * keyboard); an arrow, F1–F12 and the like hold down Fn and the key that
 * carries it (`keysForCode`).
 *
 * All 60 caps are one mesh and one draw call (`room/keycaps.ts`). Each vertex
 * knows its key; the shader moves a key's vertices down the plate's normal by
 * the travel times how far that key is pressed (`pressableCaps`), so pressing
 * costs a uniform update, not a mesh rebuild.
 */

/**
 * Colours read off `reference/4/キーボード１.png` (sRGB): lit key tops, the
 * gray keys, the case, the tray between the keys. The gray keys are the
 * photo's hue (about 220°) made deeper and more saturated (`#c5ccd9` →
 * `#acbad2`): in the room they washed out to white (2026-10-22, the user:
 * "make the blue-gray keys stand out").
 */
const COLOURS = { alpha: "#dedee3", mod: "#acbad2", case: "#e3e3e5", tray: "#9a9da5" } as const;
/**
 * Age (**仮**): what the white plastic drifts towards over the years, how far
 * the case and the least-used cap have gone, and how much further the
 * most-used cap goes (`keyWear`) — skin oil yellows a cap faster than light.
 * Raised once (2026-10-22, the user: "more yellowing overall"). The gray caps
 * barely show it, so they keep their blue.
 */
const AGED = "#e4d4ad";
const AGE = { case: 0.3, cap: 0.18, worn: 0.22, grayShare: 0.1 } as const;
/** The case's rim stands this far over the plate; the tray's floor lies this far under it (**仮**). */
const RIM = 0.003;
const FLOOR = -0.0025;
/** How round the rim's outer top edge is, and the case's corners seen from above (**仮**). */
const EDGE = 0.0015;
const CORNER = 0.006;

const KEYS = keyboardKeys();
const TILT = (PLATE_TILT_DEG * Math.PI) / 180;

/**
 * The case: the tray's floor, and the rim round it with its outer top edge
 * rounded. **Not with three.js's extrusion bevel**: bevelled with the tray's
 * hole in it, the top was triangulated wrong — two triangles laid across half
 * the tray (150 cm² of its 270), and the gaps between the keys showed the
 * rim's white instead of the floor, split by a diagonal line (2026-10-22,
 * the user). The rim is three plain pieces instead: the rim proper (its
 * outline `EDGE` in from the case's, from the desk to the top), a skirt for
 * the case's outer wall (to `EDGE` under the top), and the rounding swept
 * between them (`fillet`).
 */
function useCase() {
  const parts = useMemo(() => {
    const floor = (z: number) => planeHeightAt(z, FLOOR);
    const top = (z: number) => planeHeightAt(z, RIM);
    const tray = trayOutline().map(([x, z]) => ({ x, z }));
    const outer = roundedRectOutline(HHKB.width, HHKB.depth, CORNER, 6);
    const inner = roundedRectOutline(HHKB.width - 2 * EDGE, HHKB.depth - 2 * EDGE, CORNER - EDGE, 6);
    const rim = shapeOf(inner);
    rim.holes.push(new THREE.Path(tray.map((p) => new THREE.Vector2(p.x, -p.z))));
    const skirt = shapeOf(outer);
    skirt.holes.push(new THREE.Path(inner.map((p) => new THREE.Vector2(p.x, -p.z))));
    return {
      tray: slab(shapeOf(tray), () => 0, floor),
      rim: slab(rim, () => 0, top),
      skirt: slab(skirt, () => 0, (z) => top(z) - EDGE),
      round: fillet(outer, EDGE, top),
    };
  }, []);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  return parts;
}

/** The recorded press a key's `strike`-th press plays. */
const sampleOf = (key: number, strike: number) => keySample(KEYS[key], strike);

export default function HhkbKeyboard({ typing }: { typing: boolean }) {
  const caps = useRef<THREE.Mesh>(null);
  // The shader's copy of how far each key is down, filled in place every frame.
  const press = useMemo(() => ({ value: new Float32Array(KEY_COUNT) }), []);
  const bind = useKeyPresses({ caps, count: KEY_COUNT, onPress: (depth) => press.value.set(depth), keysFor: keysForCode, sample: sampleOf, seated: typing, machine: "pc" });

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
  const material = useMemo(
    () =>
      pressableCaps(
        new THREE.MeshStandardMaterial({ vertexColors: true, map: legends, roughnessMap: polish, roughness: 1, metalness: 0 }),
        press,
        new THREE.Vector3(...PRESS_DIRECTION).multiplyScalar(HHKB.travel),
        "hhkb-keys"
      ),
    [legends, polish, press]
  );
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

  return (
    <group position={[KEYBOARD.x, KEYBOARD.y, KEYBOARD.z]}>
      <mesh geometry={shell.rim} material={caseMaterial} />
      <mesh geometry={shell.skirt} material={caseMaterial} />
      <mesh geometry={shell.round} material={caseMaterial} />
      <mesh geometry={shell.tray} material={trayMaterial} />
      <mesh position={logoPlace.position} rotation={[TILT - Math.PI / 2, 0, 0]}>
        <planeGeometry args={logoPlace.size} />
        <meshStandardMaterial map={logo} transparent roughness={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={caps} geometry={geometry} material={material} {...bind} />
    </group>
  );
}
