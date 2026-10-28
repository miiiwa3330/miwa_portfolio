"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import { GRAB, MOUSE_BUTTONS, buttonsHeld, mouseSample, type MouseButton, type TravelMapping } from "../room/mouse";
import { panelPoint, type Panel } from "../room/screens";
import { screenRay } from "../camera/roomCamera";
import { bodyNow, viewNow } from "../camera/viewChannel";
import { withinReach } from "../room/self";
import { isInteractive, pointerClaim } from "../pointerClaim";
import type { Machine } from "../deskFocus";
import type { PointerChannel } from "../deskPointer";
import { playMouse, prefetchKeySound, wakeKeySound } from "./keySound";

/**
 * A desk's mouse and how it is moved, shared by the PC's EX-G (`ExgMouse`)
 * and the Macintosh's M0100 (`MacMouse`). The mouse slides on the desk
 * round where it rests, and its place is the cursor's on its machine's
 * screen (`TravelMapping`): the two always agree, and `channel` carries both
 * to whatever draws the cursor.
 *
 * - **Linked to the reader's own mouse while the mouse is within their
 *   reach and their pointer is on the machine's screen**, and only then
 *   (2026-10-22 and 10-23, the user; `withinReach`, sat or standing): the desk's
 *   mouse goes where the real cursor is, and the drawn cursor stands in for
 *   the real one, right under the pointer (2026-10-23, the user: the real
 *   one is hidden there, `hideRealCursorOverScreens`); the reader's buttons, pressed there, hold down the same buttons
 *   (`MouseEvent.buttons`), and their scrolling there turns a wheel, if the
 *   mouse has one.
 * - **Pressed directly**, with the pointer on the mouse, within reach: a button clicks at
 *   once and stays down until let go; a wheel clicks and turns with a drag up
 *   or down; held still anywhere else for `GRAB.hold`, the mouse is in the
 *   hand (a held button lets go) and slides under the pointer. In the free
 *   view the canvas hears the press (claimed, like the keys, so it neither
 *   grabs the reader's mouse nor turns the view); with the reader's mouse
 *   captured, the press is at the crosshair and the slide follows the
 *   movement. Sitting at the desk the canvas lets pointers through, so the
 *   mouse listens on the window and casts its own ray.
 *
 * The caller draws the mouse in `group` (placed here, in the desk's frame)
 * and moves its buttons in `onPress`, called every frame with how far each
 * is down (0–1 per `MouseButton`).
 */

/** How quickly the mouse follows where it is sent: the fraction of the way it goes in a second's 1/30. */
const FOLLOW_RATE = 30;
/** How quickly a button follows the finger, as the keys do. */
const PRESS_RATE = 40;

export type MousePart = "body" | MouseButton;

type Grip = {
  pointerId: number;
  part: MousePart;
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

export type DeskMouseSpec = {
  /** The group the caller draws the mouse in; this places it. */
  group: RefObject<THREE.Group | null>;
  machine: Machine;
  /** Where the mouse rests on the desk (its middle, on the desk's top), in the desk's frame. */
  rest: { x: number; y: number; z: number };
  mapping: TravelMapping;
  /** The screen its cursor is on. */
  panel: Panel;
  channel: PointerChannel;
  /** Sitting at the desk. */
  seated: boolean;
  /** Which part of the mouse a hit is on: `object` the mesh hit, `local` the point from the mouse's middle (desk frame, unturned). */
  partOf: (object: THREE.Object3D, local: THREE.Vector3) => MousePart;
  /** The meshes a ray can press. */
  pieces: () => THREE.Object3D[];
  /**
   * The buttons the mouse has. The reader's own buttons, pressed on the
   * screen, hold down the same ones; a mouse with one button takes any of
   * theirs as its one.
   */
  buttons: readonly MouseButton[];
  /** A wheel: the button it is, turned by a drag (px down) and by scrolling (px) over the screen. */
  wheel?: { button: MouseButton; drag: (dy: number) => void; scroll: (dy: number) => void };
  /** Every frame, after the buttons have moved. */
  onPress: (press: Readonly<Float32Array>) => void;
};

export function useDeskMouse(spec: DeskMouseSpec) {
  const { group } = spec;
  const press = useRef(new Float32Array(5));
  const direct = useRef(new Set<MouseButton>());
  const linked = useRef(0);
  const grip = useRef<Grip | null>(null);
  const target = useRef<[number, number]>([0, 0]);
  const shown = useRef<[number, number]>([0, 0]);
  const overScreen = useRef(false);
  /** Where the reader's pointer is on the screen, while it is: the drawn cursor is put right there, not where the sliding mouse has got to. */
  const spot = useRef<{ x: number; y: number } | null>(null);
  // The spec's callbacks read the caller's refs; keep the latest without re-binding the listeners.
  const latest = useRef(spec);
  useEffect(() => {
    latest.current = spec;
  });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

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

    const partOf = (object: THREE.Object3D, hit: THREE.Vector3): MousePart => {
      const { rest } = latest.current;
      return latest.current.partOf(object, new THREE.Vector3(hit.x - rest.x - shown.current[0], hit.y - rest.y, hit.z - rest.z - shown.current[1]));
    };

    /** Send the mouse (and so the cursor) to `offset` from where it rests. */
    const sendMouse = (offset: [number, number]) => {
      target.current = latest.current.mapping.clampTravel(offset);
    };
    /** Send the cursor (and so the mouse) to a place on the screen. */
    const sendCursor = (cursor: { x: number; y: number }) => {
      const { mapping } = latest.current;
      target.current = mapping.mouseFromCursor(mapping.clampCursor(cursor));
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
      const { rest } = latest.current;
      aim(g.at.x, g.at.y);
      plane.constant = -frame.localToWorld(point.set(0, g.hold.height, 0)).y;
      if (!raycaster.ray.intersectPlane(plane, point)) return;
      frame.worldToLocal(point);
      sendMouse([point.x - g.hold.offset[0] - rest.x, point.z - g.hold.offset[1] - rest.z]);
    };

    /** The piece of the mouse under a point in client px, if any. */
    const hitAt = (clientX: number, clientY: number) => {
      aim(clientX, clientY);
      return raycaster.intersectObjects(latest.current.pieces(), true)[0] ?? null;
    };

    /** Whether a point (world) is within the reader's reach: the machine is used only from there. */
    const reach = (point: THREE.Vector3) => withinReach(bodyNow().held, [point.x, point.y, point.z]);
    /** Whether the mouse itself is within reach. */
    const mouseInReach = () => !!group.current && reach(group.current.getWorldPosition(point));

    /** Where the reader's pointer is on the machine's screen, in its px, if it is on it. */
    const onScreen = (clientX: number, clientY: number) => {
      aim(clientX, clientY);
      const { origin: o, direction: d } = raycaster.ray;
      return panelPoint(latest.current.panel, [o.x, o.y, o.z], [d.x, d.y, d.z]);
    };

    return { begin, end, slide, hitAt, onScreen, sendCursor, reach, mouseInReach };
  }, [get, raycaster, group]);

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
        // A wheel turns under a drag up or down; the rest is taken in the hand.
        const wheel = latest.current.wheel;
        if (wheel && g.part === wheel.button) wheel.drag(g.at.y - before.y);
        if (!g.hold && Math.hypot(g.at.x - g.start.x, g.at.y - g.start.y) > GRAB.slop) g.moved = true;
        if (g.hold) api.slide(g);
        return;
      }
      if (g || e.pointerType !== "mouse") return;
      // A captured mouse has no place on the screen (the browser holds its
      // coordinates where the capture began); and the machine is used only
      // within reach of it (2026-10-23, the user) — from further off, the
      // pointer over the screen is just looking.
      if (locked || !api.mouseInReach()) {
        overScreen.current = false;
        spot.current = null;
        if (hovering) {
          hovering = false;
          document.body.style.cursor = "";
        }
        return;
      }
      // Only on its own screen does the desk's mouse follow: an earlier
      // version followed every movement anywhere, by the distance moved, which
      // was not what was asked.
      const at = api.onScreen(e.clientX, e.clientY);
      overScreen.current = !!at;
      spot.current = at;
      if (at) api.sendCursor(at);
      const over = !at && !isInteractive(e.target) && !!api.hitAt(e.clientX, e.clientY);
      if (over !== hovering) {
        hovering = over;
        document.body.style.cursor = over ? "pointer" : "";
      }
    };
    const up = (e: PointerEvent) => api.end(e.pointerId);
    // Scrolling on the screen turns a wheel.
    const scroll = (e: WheelEvent) => {
      const wheel = latest.current.wheel;
      if (!overScreen.current || !wheel) return;
      wheel.scroll(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1));
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

  // Sitting at the desk: the canvas passes pointers through, so press the
  // mouse from here; and the reader's own buttons hold down the mouse's.
  useEffect(() => {
    if (!spec.seated) return;
    void prefetchKeySound();
    // The reader's own mouse, not a finger, and not on the canvas (in /lab the
    // canvas takes every pointer, and its orbit is not a click on the desk).
    const reader = (e: PointerEvent) => e.pointerType === "mouse" && !(e.target instanceof HTMLCanvasElement);
    const down = (e: PointerEvent) => {
      // Already pressed through the canvas (the lab, where the canvas hears everything).
      if (grip.current) return;
      const hit = isInteractive(e.target) ? null : api.hitAt(e.clientX, e.clientY);
      if (hit && api.reach(hit.point)) {
        // Not the page's: no text selection starting under the slide.
        e.preventDefault();
        api.begin(e.pointerId, hit.object, hit.point, e.clientX, e.clientY);
        return;
      }
      // The reader's buttons press the desk's only on its screen.
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
      spot.current = null;
    };
  }, [spec.seated, api]);

  // What was held last frame, to hear a button go down and come back up.
  const wasDown = useRef(new Set<MouseButton>());
  const strikes = useRef([0, 0, 0, 0, 0]);
  useFrame((_, delta) => {
    const { rest, mapping, channel, wheel } = latest.current;
    // Held still long enough: in the hand. Anywhere on the mouse but a wheel
    // (which turns under a drag) — seated, the hand covers the palm and only
    // the buttons are in view — so a held button lets go as the hand takes
    // the mouse.
    const g = grip.current;
    if (g && g.part !== wheel?.button && !g.hold && !g.moved && performance.now() - g.since >= GRAB.hold * 1000) {
      g.hold = { height: g.hit.y, offset: [g.hit.x - rest.x - shown.current[0], g.hit.z - rest.z - shown.current[1]] };
      if (g.part !== "body") direct.current.delete(g.part);
      document.body.style.cursor = "grabbing";
    }

    const down = new Set<MouseButton>(direct.current);
    const { buttons } = latest.current;
    for (const b of buttonsHeld(linked.current)) {
      if (buttons.includes(b)) down.add(b);
      else if (buttons.length === 1) down.add(buttons[0]);
    }
    for (const b of down) if (!wasDown.current.has(b)) playMouse(mouseSample(b, ++strikes.current[b]), "down");
    for (const b of wasDown.current) if (!down.has(b)) playMouse(mouseSample(b, strikes.current[b]), "up");
    wasDown.current = down;

    // Buttons and the mouse move in real time, as the keys do.
    const k = Math.min(1, delta * PRESS_RATE);
    const depth = press.current;
    for (const b of MOUSE_BUTTONS) {
      const to = down.has(b) ? 1 : 0;
      depth[b] += (to - depth[b]) * k;
      if (Math.abs(to - depth[b]) < 1e-3) depth[b] = to;
    }

    const follow = Math.min(1, delta * FOLLOW_RATE);
    const [tx, tz] = target.current;
    const at = shown.current;
    at[0] += (tx - at[0]) * follow;
    at[1] += (tz - at[1]) * follow;
    if (Math.abs(tx - at[0]) < 1e-5) at[0] = tx;
    if (Math.abs(tz - at[1]) < 1e-5) at[1] = tz;
    group.current?.position.set(rest.x + at[0], rest.y, rest.z + at[1]);
    // On the screen, the cursor is the reader's pointer itself: the mouse eases after it (`FOLLOW_RATE`), and a drawn cursor standing in for the real one cannot lag.
    const cursor = overScreen.current && spot.current ? mapping.clampCursor(spot.current) : mapping.cursorFromMouse(at);
    channel.publish({ mouse: at, cursor, overScreen: overScreen.current, holding: !!grip.current?.hold, pressed: down.size > 0 });
    latest.current.onPress(depth);
  });

  const bind = {
    // Out of reach, the mouse is just part of the room: the press goes on to it (to look round).
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!api.reach(e.point)) return;
      e.stopPropagation();
      pointerClaim.claim(e.pointerId);
      api.begin(e.pointerId, e.object, e.point, e.clientX, e.clientY);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(api.reach(e.point));
    },
    onPointerOut: () => setHovered(false),
  };

  return bind;
}
