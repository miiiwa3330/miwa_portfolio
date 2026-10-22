"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { MOUSE } from "../room/layout";
import {
  BUTTON,
  GRAB,
  MARKS,
  MOUSE_BUTTONS,
  SLOT_LEAN,
  WHEEL_DRAG_TURN_PER_PX,
  WHEEL_TURN_PER_PX,
  buttonAt,
  buttonsHeld,
  clampCursor,
  clampTravel,
  cursorFromMouse,
  fAt,
  mouseFromCursor,
  mouseParts,
  mouseSample,
  shellNormal,
  shellPoint,
  uAt,
  wheelCentre,
  xOfFrac,
  type MouseButton,
  type Surface,
  type Walls,
} from "../room/mouse";
import { DESK_SCREEN, panelPoint } from "../room/screens";
import { screenRay } from "../camera/roomCamera";
import { viewNow } from "../camera/viewChannel";
import { isInteractive, pointerClaim } from "../pointerClaim";
import { publishDeskPointer } from "../deskPointer";
import { makeMouseTexture, makeWheelTexture } from "./mouseDecal";
import { playMouse, prefetchKeySound, wakeKeySound } from "./keySound";

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
 * mouse).
 *
 * - **Linked to the reader's own mouse while their pointer is on the PC's
 *   screen**, and only then (2026-10-22, the user): the desk's mouse goes
 *   where the real cursor is (and the drawn cursor stands aside for it); the
 *   reader's buttons, pressed there, hold down the same buttons
 *   (`MouseEvent.buttons`), and their scrolling there turns the wheel.
 * - **Pressed directly**, with the pointer on the mouse: a button clicks at
 *   once and stays down until let go; the wheel clicks and turns with a drag
 *   up or down; held still anywhere else for `GRAB.hold`, the mouse is in the
 *   hand (a held button lets go) and slides under the pointer. In the free
 *   view the canvas hears the press (claimed, like the keys, so it neither
 *   grabs the reader's mouse nor turns the view); with the reader's mouse
 *   captured, the press is at the crosshair and the slide follows the
 *   movement. Sitting at the PC the canvas lets pointers through, so the
 *   mouse listens on the window and casts its own ray.
 */

/** How quickly the mouse follows where it is sent: the fraction of the way it goes in a second's 1/30. */
const FOLLOW_RATE = 30;
/** How quickly a button follows the finger, as the keys do. */
const PRESS_RATE = 40;
/** The pieces' colours (sRGB): the side buttons' and the DPI button's gloss, the cuts' walls and the inside (**仮**). */
const COLOURS = { side: "#2e2f35", dpi: "#25262b", wall: "#17181b", inside: "#0b0c0e" } as const;
/** The shell's roughness: matte (6.png). */
const SHELL_ROUGHNESS = 0.62;

type Part = "body" | MouseButton;

type Grip = {
  pointerId: number;
  part: Part;
  /** When the press began (ms, `performance.now`). */
  since: number;
  /** Where the gesture is, in client px; with the reader's mouse captured, the frame's centre plus the movement since. */
  at: { x: number; y: number };
  start: { x: number; y: number };
  moved: boolean;
  /** Where on the mouse it was pressed, in the desk's frame. */
  hit: THREE.Vector3;
  /** Once in the hand: the height it was taken at, and how far that point is from the mouse's middle. */
  hold: null | { height: number; offset: [number, number] };
};

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
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const wheel = useRef<THREE.Mesh>(null);
  const wheelSeat = useRef<THREE.Group>(null);
  const forward = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const dpi = useRef<THREE.Mesh>(null);

  const press = useRef(new Float32Array(5));
  const direct = useRef(new Set<MouseButton>());
  const linked = useRef(0);
  const grip = useRef<Grip | null>(null);
  const target = useRef<[number, number]>([0, 0]);
  const shown = useRef<[number, number]>([0, 0]);
  const overScreen = useRef(false);
  const seated = useRef(typing);
  const spin = useRef({ target: 0, shown: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => {
    seated.current = typing;
  }, [typing]);

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

  const get = useThree((state) => state.get);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Everything below runs from event handlers and frames, reading refs; the
  // functions are made once.
  const api = useMemo(() => {
    const direction = new THREE.Vector3();
    const origin = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();

    /** Aim the raycaster through a point in client px, through the room's lens (as `roomEvents` does). */
    const aim = (clientX: number, clientY: number) => {
      const { camera, gl } = get();
      const rect = gl.domElement.getBoundingClientRect();
      const [x, y, z] = screenRay(clientX - rect.left, clientY - rect.top, viewNow().pose, rect.width, rect.height);
      camera.updateMatrixWorld();
      direction.set(x, y, z).transformDirection(camera.matrixWorld);
      raycaster.set(camera.getWorldPosition(origin), direction);
    };

    const frameCentre = () => {
      const rect = get().gl.domElement.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const partOf = (object: THREE.Object3D, hit: THREE.Vector3): Part => {
      if (object === wheel.current) return 1;
      if (forward.current && object.parent === forward.current) return 4;
      if (back.current && object.parent === back.current) return 3;
      if (object !== shell.current) return "body";
      const f = fAt(hit.z - MOUSE.z - shown.current[1]);
      const side = buttonAt(f, uAt(f, hit.x - MOUSE.x - shown.current[0]));
      return side === "left" ? 0 : side === "right" ? 2 : "body";
    };

    /** Send the mouse (and so the cursor) to `offset` from where it rests. */
    const sendMouse = (offset: [number, number]) => {
      target.current = clampTravel(offset);
    };
    /** Send the cursor (and so the mouse) to a place on the screen. */
    const sendCursor = (cursor: { x: number; y: number }) => {
      target.current = mouseFromCursor(clampCursor(cursor));
    };

    const begin = (pointerId: number, object: THREE.Object3D, worldPoint: THREE.Vector3, clientX: number, clientY: number) => {
      const frame = group.current?.parent;
      if (!frame) return;
      wakeKeySound();
      const hit = frame.worldToLocal(worldPoint.clone());
      const at = document.pointerLockElement ? frameCentre() : { x: clientX, y: clientY };
      const part = partOf(object, hit);
      grip.current = { pointerId, part, since: performance.now(), at, start: { ...at }, moved: false, hit, hold: null };
      if (part !== "body") direct.current.add(part);
    };

    const end = (pointerId: number) => {
      if (grip.current?.pointerId !== pointerId) return;
      if (grip.current.hold) document.body.style.cursor = "";
      grip.current = null;
      direct.current.clear();
    };

    /** Slide the held mouse so the point it was taken by stays under the gesture. */
    const slide = (g: Grip) => {
      const frame = group.current?.parent;
      if (!frame || !g.hold) return;
      aim(g.at.x, g.at.y);
      plane.constant = -frame.localToWorld(point.set(0, g.hold.height, 0)).y;
      if (!raycaster.ray.intersectPlane(plane, point)) return;
      frame.worldToLocal(point);
      sendMouse([point.x - g.hold.offset[0] - MOUSE.x, point.z - g.hold.offset[1] - MOUSE.z]);
    };

    /** The piece of the mouse under a point in client px, if any. */
    const hitAt = (clientX: number, clientY: number) => {
      const objects: THREE.Object3D[] = [shell.current, wheel.current, dpi.current, forward.current, back.current].filter((o): o is NonNullable<typeof o> => !!o);
      aim(clientX, clientY);
      return raycaster.intersectObjects(objects, true)[0] ?? null;
    };

    /** Where the reader's pointer is on the PC's screen, in its px, if it is on it. */
    const onScreen = (clientX: number, clientY: number) => {
      aim(clientX, clientY);
      const { origin: o, direction: d } = raycaster.ray;
      return panelPoint(DESK_SCREEN, [o.x, o.y, o.z], [d.x, d.y, d.z]);
    };

    return { begin, end, slide, hitAt, onScreen, sendCursor };
  }, [get, raycaster]);

  // The gesture that pressed the mouse, wherever it goes next; and otherwise
  // the reader's own pointer, which the desk's mouse follows on the screen.
  useEffect(() => {
    let hovering = false;
    const move = (e: PointerEvent) => {
      const locked = !!document.pointerLockElement;
      const g = grip.current;
      if (g && g.pointerId === e.pointerId) {
        const before = { ...g.at };
        if (locked) {
          g.at.x += e.movementX;
          g.at.y += e.movementY;
        } else {
          g.at = { x: e.clientX, y: e.clientY };
        }
        // The wheel turns under a drag up or down; the rest is taken in the hand.
        if (g.part === 1) spin.current.target += (g.at.y - before.y) * WHEEL_DRAG_TURN_PER_PX;
        if (!g.hold && Math.hypot(g.at.x - g.start.x, g.at.y - g.start.y) > GRAB.slop) g.moved = true;
        if (g.hold) api.slide(g);
        return;
      }
      if (g || e.pointerType !== "mouse") return;
      // A captured mouse has no place on the screen (the browser holds its
      // coordinates where the capture began).
      if (locked) {
        overScreen.current = false;
        return;
      }
      // Only on the PC's screen does the desk's mouse follow: an earlier
      // version followed every movement anywhere, by the distance moved, which
      // was not what was asked.
      const spot = api.onScreen(e.clientX, e.clientY);
      overScreen.current = !!spot;
      if (spot) api.sendCursor(spot);
      if (seated.current) {
        const over = !spot && !isInteractive(e.target) && !!api.hitAt(e.clientX, e.clientY);
        if (over !== hovering) {
          hovering = over;
          document.body.style.cursor = over ? "pointer" : "";
        }
      }
    };
    const up = (e: PointerEvent) => api.end(e.pointerId);
    // Scrolling on the screen turns the wheel.
    const scroll = (e: WheelEvent) => {
      if (!overScreen.current) return;
      spin.current.target += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1) * WHEEL_TURN_PER_PX;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("wheel", scroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("wheel", scroll);
      if (hovering) document.body.style.cursor = "";
    };
  }, [api]);

  // Sitting at the PC: the canvas passes pointers through, so press the mouse
  // from here; and the reader's own buttons hold down the mouse's.
  useEffect(() => {
    if (!typing) return;
    void prefetchKeySound();
    // The reader's own mouse, not a finger, and not on the canvas (in /lab the
    // canvas takes every pointer, and its orbit is not a click on the PC).
    const reader = (e: PointerEvent) => e.pointerType === "mouse" && !(e.target instanceof HTMLCanvasElement);
    const down = (e: PointerEvent) => {
      // Already pressed through the canvas (the lab, where the canvas hears everything).
      if (grip.current) return;
      const hit = isInteractive(e.target) ? null : api.hitAt(e.clientX, e.clientY);
      if (hit) {
        // Not the page's: no text selection starting under the slide.
        e.preventDefault();
        api.begin(e.pointerId, hit.object, hit.point, e.clientX, e.clientY);
        return;
      }
      // The reader's buttons press the desk's only on the screen.
      overScreen.current = !!api.onScreen(e.clientX, e.clientY);
      if (reader(e) && overScreen.current) {
        wakeKeySound();
        linked.current = e.buttons;
      }
    };
    // A gesture on the desk's mouse is that mouse's: its button is not also
    // the reader's. A press begun on the screen holds until it is let go,
    // even if the pointer has left the screen by then.
    const track = (e: PointerEvent) => {
      if (grip.current || !reader(e)) return;
      if (e.buttons === 0) linked.current = 0;
      else if (linked.current) linked.current = e.buttons;
    };
    const clear = () => (linked.current = 0);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", track);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", track);
      window.removeEventListener("blur", clear);
      linked.current = 0;
      overScreen.current = false;
    };
  }, [typing, api]);

  // What was held last frame, to hear a button go down and come back up.
  const wasDown = useRef(new Set<MouseButton>());
  const strikes = useRef([0, 0, 0, 0, 0]);
  useFrame((_, delta) => {
    // Held still long enough: in the hand. Anywhere on the mouse but the
    // wheel (which turns under a drag) — seated, the hand covers the palm and
    // only the buttons are in view — so a held button lets go as the hand
    // takes the mouse.
    const g = grip.current;
    if (g && g.part !== 1 && !g.hold && !g.moved && performance.now() - g.since >= GRAB.hold * 1000) {
      g.hold = { height: g.hit.y, offset: [g.hit.x - MOUSE.x - shown.current[0], g.hit.z - MOUSE.z - shown.current[1]] };
      if (g.part !== "body") direct.current.delete(g.part);
      document.body.style.cursor = "grabbing";
    }

    const down = new Set<MouseButton>(direct.current);
    for (const b of buttonsHeld(linked.current)) down.add(b);
    for (const b of down) if (!wasDown.current.has(b)) playMouse(mouseSample(b, ++strikes.current[b]), "down");
    for (const b of wasDown.current) if (!down.has(b)) playMouse(mouseSample(b, strikes.current[b]), "up");
    wasDown.current = down;

    // Buttons and the mouse move in real time, as the keys do: a paused room still clicks.
    const k = Math.min(1, delta * PRESS_RATE);
    const depth = press.current;
    for (const b of MOUSE_BUTTONS) {
      const to = down.has(b) ? 1 : 0;
      depth[b] += (to - depth[b]) * k;
      if (Math.abs(to - depth[b]) < 1e-3) depth[b] = to;
    }
    materials.uPress.value.set(depth[0], depth[2]);
    if (wheelSeat.current) wheelSeat.current.position.set(wheelAt.x, wheelAt.y - BUTTON.wheelTravel * depth[1], wheelAt.z);
    if (forward.current) forward.current.position.copy(geometries.forward.normal).multiplyScalar(-BUTTON.sideTravel * depth[4]);
    if (back.current) back.current.position.copy(geometries.back.normal).multiplyScalar(-BUTTON.sideTravel * depth[3]);

    const s = spin.current;
    s.shown += (s.target - s.shown) * Math.min(1, delta * 20);
    if (wheel.current) wheel.current.rotation.x = s.shown;

    const follow = Math.min(1, delta * FOLLOW_RATE);
    const [tx, tz] = target.current;
    const at = shown.current;
    at[0] += (tx - at[0]) * follow;
    at[1] += (tz - at[1]) * follow;
    if (Math.abs(tx - at[0]) < 1e-5) at[0] = tx;
    if (Math.abs(tz - at[1]) < 1e-5) at[1] = tz;
    group.current?.position.set(MOUSE.x + at[0], MOUSE.y, MOUSE.z + at[1]);
    publishDeskPointer({ mouse: at, cursor: cursorFromMouse(at), overScreen: overScreen.current });
  });

  return (
    <group
      ref={group}
      position={[MOUSE.x, MOUSE.y, MOUSE.z]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        pointerClaim.claim(e.pointerId);
        api.begin(e.pointerId, e.object, e.point, e.clientX, e.clientY);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
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
