"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { KeySample } from "../room/keyboard";
import { isInteractive, pointerClaim } from "../pointerClaim";
import { useDeskFocus, type Machine } from "../deskFocus";
import { playKey, prefetchKeySound, wakeKeySound } from "./keySound";
import { bodyNow } from "../camera/viewChannel";
import { withinReach } from "../room/self";

/** Whether a point on the keys (world) is within the reader's reach: the keys are pressed only from there (`withinReach`). */
const inReach = (point: THREE.Vector3) => withinReach(bodyNow().held, [point.x, point.y, point.z]);

/**
 * Pressing a keyboard's caps, shared by the HHKB (`HhkbKeyboard`) and the
 * Macintosh's M0110 (`MacKeyboard`). The caps are one mesh whose vertices
 * know their key (`aKey`, `room/keycaps.ts`); this keeps how far each key is
 * down (`press`, which `pressableCaps` feeds to the shader) and plays the
 * recorded press as a key goes down and comes back up (`keySound`).
 *
 * - **With the mouse**: press a key and it stays down until the button is let
 *   go. In the free view the canvas hears the click (the key claims the
 *   pointer, like the light switches, so it does not also grab the mouse).
 *   Sitting at the desk the canvas lets pointers through to the screen
 *   behind it, so this listens on the window and casts its own ray — but not
 *   for a press on the page's own controls (`isInteractive`). Only within
 *   reach (`withinReach`, 2026-10-23, the user: 「一定距離に近づかないと操作で
 *   きないように」), sat or standing; from further off a press on them is a
 *   press on the room.
 * - **With the reader's own keyboard**, while seated and while this is the
 *   machine they type on — the one whose screen they are looking at
 *   (`deskFocus`, `deskView`): every key held down holds down the key in the
 *   same place (`keysFor`).
 */

/** The key a face of the caps' mesh belongs to, or −1. */
function keyOf(caps: THREE.Mesh | null, face: THREE.Face | null | undefined): number {
  return face && caps ? caps.geometry.attributes.aKey.getX(face.a) : -1;
}

/** How quickly a cap follows the finger: the fraction of the way it goes in a second's 1/40. */
const PRESS_RATE = 40;

/** Fills `press` (a key's 0–1 depth) from what is held: eased, in real time. */
function stepPress(press: Float32Array, held: Set<number>, delta: number) {
  const k = Math.min(1, delta * PRESS_RATE);
  for (let i = 0; i < press.length; i++) {
    const target = held.has(i) ? 1 : 0;
    press[i] += (target - press[i]) * k;
    if (Math.abs(target - press[i]) < 1e-3) press[i] = target;
  }
}

/**
 * Lets a caps material push each key's vertices along `step` (the travel
 * down the plate's normal) by how far that key is pressed: `press` is the
 * uniform the shader reads, its array filled in place (`onPress`).
 */
export function pressableCaps(material: THREE.MeshStandardMaterial, press: { value: Float32Array }, step: THREE.Vector3, cacheKey: string): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    const values = press.value;
    shader.uniforms.uPress = press;
    shader.uniforms.uPressStep = { value: step };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nattribute float aKey;\nuniform float uPress[${values.length}];\nuniform vec3 uPressStep;`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += uPressStep * uPress[int(aKey + 0.5)];");
  };
  material.customProgramCacheKey = () => cacheKey;
  return material;
}

export function useKeyPresses({
  caps,
  count,
  onPress,
  keysFor,
  sample,
  seated,
  machine,
}: {
  /** The caps' mesh (its vertices carry `aKey`). */
  caps: RefObject<THREE.Mesh | null>;
  count: number;
  /** Every frame, with how far each key is down (0–1). */
  onPress: (press: Readonly<Float32Array>) => void;
  /** The caps that go down for a key on the reader's own keyboard (`KeyboardEvent.code`). */
  keysFor: (code: string) => number[];
  /** Which recording the `strike`-th press of a key plays. */
  sample: (key: number, strike: number) => KeySample;
  /** Sitting at the desk. */
  seated: boolean;
  machine: Machine;
}) {

  const press = useRef(new Float32Array(count));
  const report = useRef(onPress);
  useEffect(() => {
    report.current = onPress;
  });
  const mouseKey = useRef(-1);
  const held = useRef(new Map<string, number[]>());
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const focus = useDeskFocus();
  const typing = seated && focus === machine;


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

  // Sitting at the desk: the canvas passes pointers through, so cast the ray here.
  const get = useThree((state) => state.get);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  useEffect(() => {
    if (!seated) return;
    // Sitting down is the moment to fetch the sound, ahead of the first key.
    void prefetchKeySound();
    const down = (e: PointerEvent) => {
      if (isInteractive(e.target) || !caps.current) return;
      const { camera, gl } = get();
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(caps.current, false)[0];
      if (!hit || !inReach(hit.point)) return;
      wakeKeySound();
      mouseKey.current = keyOf(caps.current, hit.face);
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, [seated, get, raycaster, machine, caps]);

  // The reader's own keyboard, while typing: held codes hold their keys down.
  useEffect(() => {
    if (!typing) return;
    const codes = held.current;
    const down = (e: KeyboardEvent) => {
      const keys = keysFor(e.code);
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
  }, [typing, keysFor]);

  // What was held last frame, to hear a key go down and come back up — the
  // same recorded press both ways, picked afresh for each press.
  const wasDown = useRef(new Set<number>());
  const strikes = useRef(new Uint32Array(count));
  useFrame((_, delta) => {
    const down = new Set<number>();
    if (mouseKey.current >= 0) down.add(mouseKey.current);
    for (const keys of held.current.values()) for (const k of keys) down.add(k);
    for (const k of down) if (!wasDown.current.has(k)) playKey(sample(k, ++strikes.current[k]), "down");
    for (const k of wasDown.current) if (!down.has(k)) playKey(sample(k, strikes.current[k]), "up");
    wasDown.current = down;
    stepPress(press.current, down, delta);
    report.current(press.current);
  });

  const bind = {
    // Out of reach, the keys are just part of the room: the press goes on to it (to look round).
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const key = keyOf(caps.current, e.face);
      if (key < 0 || !inReach(e.point)) return;
      e.stopPropagation();
      pointerClaim.claim(e.pointerId);
      wakeKeySound();
      mouseKey.current = key;
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(inReach(e.point));
    },
    onPointerOut: () => setHovered(false),
  };

  return bind;
}
