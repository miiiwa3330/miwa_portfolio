"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MOUSE } from "../room/layout";
import {
  BUTTON,
  EXG_MAPPING,
  MOUSE_BUTTONS,
  MARKS,
  SLOT_LEAN,
  WHEEL_DRAG_TURN_PER_PX,
  WHEEL_TURN_PER_PX,
  buttonAt,
  fAt,
  mouseParts,
  shellNormal,
  shellPoint,
  uAt,
  wheelCentre,
  xOfFrac,
  type Surface,
  type Walls,
} from "../room/mouse";
import { DESK_SCREEN } from "../room/screens";
import { pcPointer } from "../deskPointer";
import { makeMouseTexture, makeWheelTexture } from "./mouseDecal";
import { useDeskMouse, type MousePart } from "./useDeskMouse";

/**
 * The PC's mouse, an ELECOM EX-G (`room/mouse.ts`), in its real pieces
 * (`mouseParts`): the top shell (the two buttons and the palm), the body
 * with the thumb rest's scoop and wing, the two side buttons, the DPI button
 * in the slot and a ribbed wheel — cut apart, with walls down each cut to a
 * dark inside. The logo is printed (`mouseDecal`). **Its buttons go down and
 * click** (`keySound`: recorded clicks), **its wheel turns, and it slides on
 * the mat, moving the cursor on the PC's screen** — the screen is mapped onto
 * a patch of the mat (`MOUSE_TRAVEL`), so the mouse and the cursor always
 * agree (`deskPointer` carries both, and the seated right hand follows the
 * mouse). How it is moved — linked to the reader's pointer on the PC's
 * screen, pressed and slid directly — is `useDeskMouse`, shared with the
 * Mac's mouse.
 */

/** The pieces' colours (sRGB): the side buttons' and the DPI button's gloss, the cuts' walls and the inside (**仮**). */
const COLOURS = { side: "#2e2f35", dpi: "#25262b", wall: "#17181b", inside: "#0b0c0e" } as const;
/** The shell's roughness: matte (6.png). */
const SHELL_ROUGHNESS = 0.62;

function surfaceGeometry(s: Surface): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(s.positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(s.normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(s.uvs, 2));
  g.setAttribute("aPress", new THREE.Float32BufferAttribute(s.press, 2));
  g.setIndex(s.indices);
  return g;
}

/** A cut's walls: every quad has its own corners, so they shade flat. */
function wallGeometry(w: Walls): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(w.positions, 3));
  g.setAttribute("aPress", new THREE.Float32BufferAttribute(w.press, 2));
  g.setIndex(w.indices);
  g.computeVertexNormals();
  return g;
}

function useGeometries() {
  const geometries = useMemo(() => {
    const parts = mouseParts();
    const { radius, width } = MARKS.wheel;
    const wheel = new THREE.CylinderGeometry(radius, radius, width, 32);
    // The cylinder's axis is its Y: lay it along X, the axle.
    wheel.rotateZ(Math.PI / 2);
    const side = (which: "forward" | "back") => ({
      surface: surfaceGeometry(parts.side[which].surface),
      walls: wallGeometry(parts.side[which].walls),
      normal: new THREE.Vector3(...parts.side[which].normal),
    });
    return {
      shell: surfaceGeometry(parts.shell),
      walls: wallGeometry(parts.walls),
      inside: surfaceGeometry(parts.inside),
      forward: side("forward"),
      back: side("back"),
      dpi: surfaceGeometry(parts.dpi.surface),
      dpiWalls: wallGeometry(parts.dpi.walls),
      wheel,
      light: new THREE.CircleGeometry(0.00045, 12),
    };
  }, []);
  useEffect(
    () => () => {
      const { forward, back, ...rest } = geometries;
      [...Object.values(rest).filter((g): g is THREE.BufferGeometry => g instanceof THREE.BufferGeometry), forward.surface, forward.walls, back.surface, back.walls].forEach((g) => g.dispose());
    },
    [geometries]
  );
  return geometries;
}

/** Lets a material's vertices go down with the buttons' press (`aPress` × `uPress` × travel). */
function pressed(material: THREE.MeshStandardMaterial, uPress: { value: THREE.Vector2 }, key: string) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPress = uPress;
    shader.uniforms.uTravel = { value: BUTTON.travel };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aPress;\nuniform vec2 uPress;\nuniform float uTravel;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y -= uTravel * dot(aPress, uPress);");
  };
  material.customProgramCacheKey = () => key;
  return material;
}

export default function ExgMouse({ typing }: { typing: boolean }) {
  const shell = useRef<THREE.Mesh>(null);
  const wheel = useRef<THREE.Mesh>(null);
  const wheelSeat = useRef<THREE.Group>(null);
  const forward = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const dpi = useRef<THREE.Mesh>(null);
  const spin = useRef({ target: 0, shown: 0 });
  const group = useRef<THREE.Group>(null);


  const geometries = useGeometries();
  const textures = useMemo(() => ({ shell: makeMouseTexture(), wheel: makeWheelTexture() }), []);
  const materials = useMemo(() => {
    const uPress = { value: new THREE.Vector2() };
    return {
      uPress,
      shell: pressed(new THREE.MeshStandardMaterial({ map: textures.shell, roughness: SHELL_ROUGHNESS, metalness: 0 }), uPress, "exg-shell"),
      walls: pressed(new THREE.MeshStandardMaterial({ color: COLOURS.wall, roughness: 0.8, metalness: 0 }), uPress, "exg-walls"),
      inside: new THREE.MeshStandardMaterial({ color: COLOURS.inside, roughness: 0.9, metalness: 0 }),
      side: new THREE.MeshStandardMaterial({ color: COLOURS.side, roughness: 0.3, metalness: 0 }),
      dpi: new THREE.MeshStandardMaterial({ color: COLOURS.dpi, roughness: 0.3, metalness: 0 }),
      light: new THREE.MeshStandardMaterial({ color: COLOURS.inside, roughness: 0.2, metalness: 0 }),
      wheel: new THREE.MeshStandardMaterial({ map: textures.wheel, roughness: 0.85, metalness: 0 }),
    };
  }, [textures]);
  useEffect(
    () => () => {
      const { shell, walls, inside, side, dpi, light, wheel } = materials;
      [textures.shell, textures.wheel, shell, walls, inside, side, dpi, light, wheel].forEach((x) => x.dispose());
    },
    [textures, materials]
  );
  const wheelAt = useMemo(() => new THREE.Vector3(...wheelCentre()), []);
  // The DPI button's light, a pinhole on its face.
  const light = useMemo(() => {
    const f = MARKS.light.f;
    const u = uAt(f, xOfFrac(MARKS.light.xFrac));
    const p = new THREE.Vector3(...shellPoint(f, u));
    const n = new THREE.Vector3(...shellNormal(f, u));
    p.addScaledVector(n, -MARKS.dpi.sink + 0.00005);
    return { position: p, quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n) };
  }, []);

  const bind = useDeskMouse({
    group,
    machine: "pc",
    rest: MOUSE,
    mapping: EXG_MAPPING,
    panel: DESK_SCREEN,
    channel: pcPointer,
    buttons: MOUSE_BUTTONS,
    seated: typing,
    partOf: (object, local): MousePart => {
      if (object === wheel.current) return 1;
      if (forward.current && object.parent === forward.current) return 4;
      if (back.current && object.parent === back.current) return 3;
      if (object !== shell.current) return "body";
      const f = fAt(local.z);
      const side = buttonAt(f, uAt(f, local.x));
      return side === "left" ? 0 : side === "right" ? 2 : "body";
    },
    pieces: () => [shell.current, wheel.current, dpi.current, forward.current, back.current].filter((o): o is NonNullable<typeof o> => !!o),
    wheel: {
      button: 1,
      drag: (dy) => (spin.current.target += dy * WHEEL_DRAG_TURN_PER_PX),
      scroll: (dy) => (spin.current.target += dy * WHEEL_TURN_PER_PX),
    },
    // The buttons go down with how far each is pressed.
    onPress: (depth) => {
      materials.uPress.value.set(depth[0], depth[2]);
      if (wheelSeat.current) wheelSeat.current.position.set(wheelAt.x, wheelAt.y - BUTTON.wheelTravel * depth[1], wheelAt.z);
      if (forward.current) forward.current.position.copy(geometries.forward.normal).multiplyScalar(-BUTTON.sideTravel * depth[4]);
      if (back.current) back.current.position.copy(geometries.back.normal).multiplyScalar(-BUTTON.sideTravel * depth[3]);
    },
  });

  // The wheel turns towards where it was sent.
  useFrame((_, delta) => {
    const s = spin.current;
    s.shown += (s.target - s.shown) * Math.min(1, delta * 20);
    if (wheel.current) wheel.current.rotation.x = s.shown;
  });

  return (
    <group ref={group} position={[MOUSE.x, MOUSE.y, MOUSE.z]} {...bind}>
      <mesh ref={shell} geometry={geometries.shell} material={materials.shell} />
      <mesh geometry={geometries.walls} material={materials.walls} raycast={() => null} />
      <mesh geometry={geometries.inside} material={materials.inside} raycast={() => null} />
      <group ref={forward}>
        <mesh geometry={geometries.forward.surface} material={materials.side} />
        <mesh geometry={geometries.forward.walls} material={materials.side} />
      </group>
      <group ref={back}>
        <mesh geometry={geometries.back.surface} material={materials.side} />
        <mesh geometry={geometries.back.walls} material={materials.side} />
      </group>
      <mesh ref={dpi} geometry={geometries.dpi} material={materials.dpi} />
      <mesh geometry={geometries.dpiWalls} material={materials.dpi} raycast={() => null} />
      <mesh geometry={geometries.light} material={materials.light} position={light.position} quaternion={light.quaternion} raycast={() => null} />
      {/* The wheel, its axle across the leaning slot; it turns about the axle. */}
      <group ref={wheelSeat} position={wheelAt} rotation={[0, SLOT_LEAN, 0]}>
        <mesh ref={wheel} geometry={geometries.wheel} material={materials.wheel} />
      </group>
    </group>
  );
}
