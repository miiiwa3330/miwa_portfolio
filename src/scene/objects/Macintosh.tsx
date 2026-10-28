"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MAC, macToDesk } from "../room/layout";
import {
  MAC_BACK,
  MAC_CASE,
  MAC_COLOURS,
  MAC_FACE_LENGTH,
  MAC_HALF_WIDTH,
  MAC_NOTCH_HALF,
  MAC_PROFILE,
  MAC_SIDE_VENTS,
  MAC_TOP,
  MAC_TOP_SLOPE,
  macBodyOutline,
  macNotchWall,
  macPlinthOutline,
  profileRing,
} from "../room/macCase";
import { cursorShown, macPointer } from "../deskPointer";
import { useDeskFocus } from "../deskFocus";
import { onDeskView, setDeskView } from "../deskView";
import { isGameKey, macAdvance, macClose, macKey, macKeyUp, macPoint, macPress } from "../mac/finder";
import { macNow, macPlaying, onMac, setMac } from "../mac/macSession";
import { macScreen } from "./macScreen";
import { playMacSound } from "./macSound";
import { roundedRectOutline } from "../room/keyboard";
import { profilePrism, shapeOf, sideRibbon } from "./caseShapes";

/**
 * The Macintosh: a 128K (2026-10-22, the user; `reference/4/マッキントッシュ1〜12`),
 * its shape `room/macCase.ts`'s. Read off the photos and the drawing:
 *
 * - **The side is a trapezoid** (photo 10, drawing 12): the case is its side
 *   outline stood out across the width — the top falling 4.4° to the back,
 *   the chamfer at its back, the seam under the front plate — its edges
 *   rounded along the sides.
 * - **The front** is a plate leaning back 5.5°, flush with the case's sides,
 *   its face's edge rounded broadly. The screen sits at the bottom of a deep
 *   recess with sloping walls, the bottom wall the widest; the tube's glass
 *   bulges. Under it, right of middle, the floppy slot in a recessed strip
 *   with a wider notch at its right end and a pin hole; at the bottom left, a
 *   small badge — rainbow stripes, as the maker's, but an "M" for Miiiwa in
 *   place of the maker's apple (as the keyboard's "Miiiwa Professional3").
 * - **The base** under the plate, set back 32.6 mm (4.png, 6.png, drawing):
 *   the front's moulding comes down into it, so the seam runs down its sides
 *   behind it. A sunk mark at its left; at its right the keyboard's jack
 *   beside a small label, and a row of little slots left of them.
 * - **The top**: the handle's notch cut from its back (open through the
 *   chamfer, the bar across its front), and either side of it a panel of
 *   slots, with more slots on the chamfer's two halves (photos 8, 11).
 * - **The sides**, low down: on the left three runs of long slots and the
 *   programmer's switch clipped over them at the back (photos 4, 10); on the
 *   right seven runs of short ones (photo 6, the drawing).
 * - **The back** (photo 11): the badge and a nameplate ("Miiiwa" for the
 *   maker's name), the label, the power switch and socket, the ports.
 *
 * Measured in マッキントッシュ2.webp, at 3.5 px to the millimetre across the
 * front (the recess, the glass and the picture are `MAC_CASE`): the slot is
 * 90 mm long, 58 mm right of the middle and 233 mm under the top; the badge
 * is 17 mm, 81 mm left of the middle and 269 mm under the top. Colours are
 * the photos' medians (sRGB): the plastic and its darker tones are
 * `MAC_COLOURS` (photo 7's yellowed beige, shared with the keyboard and the
 * mouse); the glass `#304248`. The picture is
 * a cool white, as the lit screens in 5.png and 6.png. The screen shows a
 * 512 × 342 one-bit picture at the 128K's 72 dpi (180.6 × 120.7 mm) — what
 * the Mac runs (`mac/finder.ts`, drawn by `macScreen`): its desktop, and the
 * game opened from it — and the mouse's arrow over it, where the
 * Mac's mouse puts it (`macPointer`), shown while the Mac is in use — the
 * reader's pointer on its screen (then right under it), or its mouse in
 * their hand — standing in for the real cursor, which is hidden then, as on
 * the PC's (`cursorShown`).
 *
 * **仮**: the recess's depth and how far its inner edge sits up, the tube's
 * bulge, the base's marks, the handle's floor and bar, the back's parts.
 *
 * Drawn in the desk's frame, at `MAC` (origin on the desk under its middle,
 * +Z out of the screen); the front's parts in the face's own frame (a group
 * at its top edge, leaning back), where y is −down the face and z is out of it.
 */

const { width: W, depth: D } = MAC;
const P = MAC_PROFILE;
const T = P.thickness;
const L = MAC_FACE_LENGTH;
const TAN_LEAN = Math.tan(P.lean);
const { plate: PLATE, recess: RECESS, glass: GLASS, picture: PICTURE, edge: EDGE } = MAC_CASE;
const JACK = MAC_CASE.jack;
const BACK = -D / 2;
/** The recess's middle on the face, and the glass's (a little up: the bottom wall is the widest). */
const RECESS_Y = -(RECESS.top + RECESS.height / 2);
const GLASS_Y = RECESS_Y + RECESS.lift;

/**
 * How far the tube's glass stands out of its plane at a point of it (x, y
 * from the glass's middle): most in the middle, nothing at its edges, where
 * the recess's walls meet it.
 */
function bulge(x: number, y: number): number {
  const u = Math.min(1, Math.abs(x) / (GLASS.width / 2));
  const v = Math.min(1, Math.abs(y) / (GLASS.height / 2));
  return GLASS.bulge * (1 - u * u) * (1 - v * v);
}

/** A plane `w` × `h` of `nx` × `ny` cells, pushed out by the tube's bulge (and `lift` more), centred on the glass. */
function bulged(w: number, h: number, nx: number, ny: number, lift: number): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(w, h, nx, ny);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setZ(i, bulge(position.getX(i), position.getY(i)) + lift);
  geometry.computeVertexNormals();
  return geometry;
}
const SLOT = { length: 0.09, x: 0.058, down: 0.233 } as const;
const BADGE = { size: 0.017, x: -0.081, down: 0.269 } as const;
/** The seam's line: how far it stands proud of the case, and how wide it is. */
const SEAM = { proud: 0.0004, width: 0.0007 } as const;

const COLOURS = {
  case: MAC_COLOURS.plastic,
  shade: MAC_COLOURS.shade,
  sunk: MAC_COLOURS.sunk,
  seam: MAC_COLOURS.seam,
  glass: "#304248",
  slot: "#1c2619",
  ink: "#0b0d0b",
  phosphor: "#e6ece3",
  tint: "#cfe2e8",
  label: "#8f8a7c",
  sticker: "#e4e1d8",
  metal: "#a7a9aa",
} as const;

type Ring = { x: number; y: number; nx: number; ny: number }[];

/** A rounded rectangle as a ring in the face's plane (x across, y up), centred at (cx, cy), with outward normals. */
function ring(width: number, height: number, corner: number, cx: number, cy: number): Ring {
  // `roundedRectOutline` is a top view (x, z towards the reader); the face's y is its −z.
  return roundedRectOutline(width, height, corner, 6).map((p) => ({ x: cx + p.x, y: cy - p.z, nx: p.nx, ny: -p.nz }));
}

/** Two rings with the same number of points joined by quads (the walls between them), each ring at its own depth. */
function loft(a: Ring, za: number, b: Ring, zb: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const p of a) positions.push(p.x, p.y, za);
  for (const p of b) positions.push(p.x, p.y, zb);
  const n = a.length;
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    indices.push(i, n + i, n + j, i, n + j, j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A quarter round from one ring, `edge` behind `z`, out and in to another on
 * the face at `z` (point i of one to point i of the other): the plate's
 * face's edge, which is rounder than the plate's corners.
 */
function roundBetween(outer: Ring, inner: Ring, edge: number, z: number, steps = 5): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = (j / steps) * (Math.PI / 2);
    const f = 1 - Math.cos(a);
    outer.forEach((p, i) => positions.push(p.x + (inner[i].x - p.x) * f, p.y + (inner[i].y - p.y) * f, z - edge + edge * Math.sin(a)));
  }
  const n = outer.length;
  const indices: number[] = [];
  for (let j = 0; j < steps; j++)
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = (j + 1) * n + i;
      const c = (j + 1) * n + ((i + 1) % n);
      const d = j * n + ((i + 1) % n);
      indices.push(a, b, c, a, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A ring as a three.js path, for a shape or a hole. */
function path(r: Ring, shape: THREE.Path | THREE.Shape) {
  r.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
  shape.closePath();
  return shape;
}

/**
 * The front plate's outline in the face's plane, `out` of it (≤ 0): its foot
 * is level, not square to the leaning face (the drawing's underside is
 * horizontal), so further back the plate is a little shorter.
 */
function plateRing(out: number): Ring {
  const length = L + out * TAN_LEAN;
  return ring(W, length, PLATE.corner, 0, -length / 2);
}

/** A rounded band, `band` wide inside a `width` × `length` outline, lying flat (shape y is −z). */
function band(width: number, length: number, corner: number, inset: number): THREE.ShapeGeometry {
  const shape = shapeOf(roundedRectOutline(width, length, corner, 6));
  shape.holes.push(new THREE.Path(roundedRectOutline(width - 2 * inset, length - 2 * inset, Math.max(0.0005, corner - inset), 6).map((p) => new THREE.Vector2(p.x, -p.z))));
  return new THREE.ShapeGeometry(shape, 6);
}

/** The mouse's arrow, 16 px square as the 128K draws it: black with a white edge, on a clear canvas. */
const ARROW_PX = 16;
const ARROW_SIZE = (ARROW_PX * PICTURE.width) / PICTURE.px.width;
/** The picture's middle, in the face's frame; and how far the picture stands off the bulged glass there. */
const PICTURE_AT: [number, number, number] = [0, GLASS_Y, -RECESS.depth + 0.0006];
const PICTURE_LIFT = 0.0006;
function makeArrow(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ARROW_PX;
  canvas.height = ARROW_PX;
  const ctx = canvas.getContext("2d")!;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(1, 13);
    ctx.lineTo(4, 10);
    ctx.lineTo(7, 15);
    ctx.lineTo(9, 14);
    ctx.lineTo(6, 9);
    ctx.lineTo(10, 9);
    ctx.closePath();
  };
  ctx.fillStyle = COLOURS.phosphor;
  ctx.strokeStyle = COLOURS.phosphor;
  ctx.lineWidth = 2;
  shape();
  ctx.stroke();
  ctx.fillStyle = COLOURS.ink;
  shape();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

/** The badge: rainbow stripes behind an "M", on a small silver plate. */
function makeBadge(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  // The letter on a clear canvas, the stripes painted only where it is...
  const letter = document.createElement("canvas");
  letter.width = 64;
  letter.height = 64;
  const lx = letter.getContext("2d")!;
  lx.font = "bold 46px Helvetica, Arial, sans-serif";
  lx.textAlign = "center";
  lx.textBaseline = "middle";
  lx.fillStyle = "#000";
  lx.fillText("M", 32, 34);
  lx.globalCompositeOperation = "source-atop";
  ["#61bb46", "#fdb827", "#f5821f", "#e03a3e", "#963d97", "#009ddc"].forEach((colour, i) => {
    lx.fillStyle = colour;
    lx.fillRect(0, 12 + i * 7, 64, 7);
  });
  // ...then laid on the silver plate.
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c9cbcc";
  ctx.fillRect(0, 0, 64, 64);
  ctx.drawImage(letter, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The back's nameplate: the name in outlined serif capitals on silver, where the maker's is ("Macintosh"); here "Miiiwa". */
function makeNameplate(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 82;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#b9bbbc";
  ctx.fillRect(0, 0, 256, 82);
  ctx.font = "54px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#f2f2f0";
  ctx.strokeText("Miiiwa", 128, 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The back's label: grey lines of small print on a white sticker, a model line at its top (no maker's name). */
function makeLabel(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLOURS.sticker;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = "#6c6a64";
  ctx.font = "bold 11px Helvetica, Arial, sans-serif";
  ctx.fillText("Miiiwa 128K", 10, 20);
  ctx.font = "8px Helvetica, Arial, sans-serif";
  ctx.fillText("Model M0001", 10, 34);
  for (let y = 48; y < 240; y += 9) {
    if (y % 54 === 30) continue;
    ctx.fillRect(10, y, 40 + ((y * 37) % 60), 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A length from the back, level, as a length along the top from its back corner. */
const alongTop = (fromBack: number) => (fromBack - (P.topBack[0] - BACK)) / Math.cos(MAC_TOP_SLOPE);
/** The middle of each half of the top (and of its vents), across. */
const HALF_MIDDLE = (MAC_HALF_WIDTH + MAC_NOTCH_HALF) / 2;
/** The chamfer: its middle, its length up its slope, and the turn of a group lying on it (its +Z out of it). */
const CHAMFER = (() => {
  const dz = P.topBack[0] - BACK;
  const dy = P.topBack[1] - P.chamferFoot;
  // Turned about X by `turn`, a group's +Z is (0, −sin, cos): out of the chamfer, back and up.
  return { z: BACK + dz / 2, y: P.chamferFoot + dy / 2, turn: Math.atan2(-dz, -dy) };
})();

export default function Macintosh({ seated }: { seated: boolean }) {
  const parts = useMemo(() => {
    // The case: two halves either side of the handle's notch, and the middle with the notch cut from it.
    const full = profileRing(macBodyOutline(false));
    const notched = profileRing(macBodyOutline(true));
    const a = MAC_NOTCH_HALF;
    // The halves' inner sides only where they are the notch's walls: elsewhere they are inside the case, and would cut across the screen's recess.
    const wall = macNotchWall();
    const left = profilePrism(full, -W / 2, -a, { round: [true, false], cap: [true, wall] });
    const right = profilePrism(full, a, W / 2, { round: [false, true], cap: [wall, true] });
    const middle = profilePrism(notched, -a, a, { round: [false, false], cap: [false, false] });
    // The base under the plate.
    const plinth = profilePrism(profileRing(macPlinthOutline()), -W / 2, W / 2, { round: [true, true], cap: [true, true] });
    // The seam on the sides: up the base's back, forward under the case, up the plate's back to where the case's edge starts to round.
    const seamPath = full.filter((p) => p.seam && p.y <= P.topSeam[1] - EDGE + 1e-6);
    const seams = ([-1, 1] as const).map((sign) => sideRibbon(seamPath, sign * (W / 2 + SEAM.proud), sign, SEAM.width));

    // The front plate, in the face's frame.
    const faceRing = ring(W - 2 * PLATE.edge, L - 2 * PLATE.edge, Math.max(0.002, PLATE.corner - PLATE.edge), 0, -L / 2);
    const recessRing = ring(RECESS.width, RECESS.height, RECESS.corner, 0, RECESS_Y);
    const glassRing = ring(GLASS.width, GLASS.height, GLASS.corner, 0, GLASS_Y);
    const face = new THREE.Shape();
    path(faceRing, face);
    face.holes.push(path(recessRing, new THREE.Path()));
    // The seam across the top, round the plate's top corners and a little way down its sides
    // (to where the side's line takes over), stopping short of the screen's recess, which goes through it.
    const seamTop = new THREE.Shape();
    path(ring(W + 2 * SEAM.proud, 0.012, PLATE.corner + SEAM.proud, 0, SEAM.proud - 0.006), seamTop);
    const seamTopGeometry = new THREE.ExtrudeGeometry(seamTop, { depth: SEAM.width, bevelEnabled: false, curveSegments: 6 });
    seamTopGeometry.translate(0, 0, -T - SEAM.width / 2);
    const glassGeometry = bulged(GLASS.width, GLASS.height, 24, 18, 0);
    glassGeometry.translate(0, GLASS_Y, -RECESS.depth);

    // The top's vents: their panels' borders, lying on it.
    const grille = band(MAC_TOP.grille.width, (MAC_TOP.grille.to - MAC_TOP.grille.from) / Math.cos(MAC_TOP_SLOPE), MAC_TOP.grille.corner, 0.0008);
    return {
      left,
      right,
      middle,
      plinth,
      seams,
      seamTop: seamTopGeometry,
      plateSide: loft(plateRing(-T), -T, plateRing(-PLATE.edge), -PLATE.edge),
      plateEdge: roundBetween(plateRing(-PLATE.edge), faceRing, PLATE.edge, 0),
      face: new THREE.ShapeGeometry(face, 8),
      recess: loft(recessRing, 0, glassRing, -RECESS.depth),
      glass: glassGeometry,
      picture: bulged(PICTURE.width, PICTURE.height, 32, 22, PICTURE_LIFT),
      grille,
    };
  }, []);

  const screen = useMemo(() => macScreen(), []);
  const textures = useMemo(() => ({ desktop: screen.texture, badge: makeBadge(), arrow: makeArrow(), nameplate: makeNameplate(), label: makeLabel() }), [screen]);
  const materials = useMemo(
    () => ({
      case: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }),
      shade: new THREE.MeshStandardMaterial({ color: COLOURS.shade, roughness: 0.7, metalness: 0 }),
      seam: new THREE.MeshStandardMaterial({ color: COLOURS.seam, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }),
      glass: new THREE.MeshStandardMaterial({ color: COLOURS.glass, roughness: 0.12, metalness: 0.1 }),
      slot: new THREE.MeshStandardMaterial({ color: COLOURS.slot, roughness: 0.8, metalness: 0 }),
      screen: new THREE.MeshBasicMaterial({ map: textures.desktop, color: COLOURS.tint, toneMapped: false }),
      arrow: new THREE.MeshBasicMaterial({ map: textures.arrow, color: COLOURS.tint, transparent: true, toneMapped: false }),
      sunk: new THREE.MeshStandardMaterial({ color: COLOURS.sunk, roughness: 0.7, metalness: 0 }),
      label: new THREE.MeshStandardMaterial({ color: COLOURS.label, roughness: 0.5, metalness: 0.1 }),
      badge: new THREE.MeshStandardMaterial({ map: textures.badge, roughness: 0.35, metalness: 0.2 }),
      plate: new THREE.MeshStandardMaterial({ color: "#c9cbcc", roughness: 0.35, metalness: 0.2 }),
      nameplate: new THREE.MeshStandardMaterial({ map: textures.nameplate, roughness: 0.35, metalness: 0.2 }),
      sticker: new THREE.MeshStandardMaterial({ map: textures.label, roughness: 0.8, metalness: 0 }),
      metal: new THREE.MeshStandardMaterial({ color: COLOURS.metal, roughness: 0.4, metalness: 0.6 }),
    }),
    [textures]
  );
  useEffect(
    () => () => {
      Object.values(parts)
        .flat()
        .forEach((p) => p.dispose());
      Object.values(textures).forEach((t) => t.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [parts, textures, materials]
  );

  // The arrow follows the Mac's mouse: its tip (the canvas's top left) at the cursor's place on the picture.
  const arrow = useRef<THREE.Mesh>(null);
  const picture = PICTURE_AT;
  const arrowSize = ARROW_SIZE;
  useEffect(
    () =>
      macPointer.on((pointer) => {
        const mesh = arrow.current;
        if (!mesh) return;
        const { cursor } = pointer;
        const x = (cursor.x / PICTURE.px.width - 0.5) * PICTURE.width + arrowSize / 2;
        const y = (0.5 - cursor.y / PICTURE.px.height) * PICTURE.height - arrowSize / 2;
        // In front of the picture, which stands its own lift (`PICTURE_LIFT`) off the bulge: at 0.3 mm the arrow was behind it, and never showed.
        mesh.position.set(x, picture[1] + y, picture[2] + bulge(x, y) + PICTURE_LIFT + 0.0004);
        mesh.visible = cursorShown(pointer);
      }),
    [picture, arrowSize]
  );

  // What the Mac runs (`mac/finder.ts`): drawn whenever what it shows changes —
  // not at every frame a game's clock moves; and its sounds played, once each.
  useEffect(() => {
    let shown: ReturnType<typeof macNow> | null = null;
    let heard = macNow().sounds;
    return onMac((state) => {
      if (state.sounds !== heard) {
        heard = state.sounds;
        for (const sound of state.sounds) playMacSound(sound);
      }
      if (
        shown &&
        shown.open === state.open &&
        shown.selected === state.selected &&
        shown.snake === state.snake &&
        shown.breakout === state.breakout &&
        shown.mines === state.mines &&
        shown.best === state.best
      )
        return;
      shown = state;
      screen.paint(state);
    });
  }, [screen]);
  useEffect(() => screen.paint(macNow()), [screen]);

  // ⌘ or Option held on the reader's keyboard: a click flags a cell of Mines
  // (the M0100 has one button). Kept from the keys themselves, as a click
  // reaches the Mac through its mouse, not as the reader's own event.
  const flagging = useRef(false);
  useEffect(() => {
    const read = (e: KeyboardEvent) => (flagging.current = e.metaKey || e.altKey);
    const clear = () => (flagging.current = false);
    window.addEventListener("keydown", read);
    window.addEventListener("keyup", read);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", read);
      window.removeEventListener("keyup", read);
      window.removeEventListener("blur", clear);
    };
  }, []);

  // A click is the mouse's button going down, at the cursor — however it was
  // pressed: the reader's button on the screen, or the M0100's own. Opening a
  // game turns to the Mac (and so zooms to its screen, `Scene`). The cursor
  // moving moves Breakout's paddle.
  const seatedRef = useRef(seated);
  useEffect(() => {
    seatedRef.current = seated;
  }, [seated]);
  useEffect(() => {
    let was = macPointer.now().pressed;
    let x = macPointer.now().cursor.x;
    return macPointer.on((pointer) => {
      if (pointer.cursor.x !== x) {
        x = pointer.cursor.x;
        setMac(macPoint(macNow(), pointer.cursor));
      }
      const down = pointer.pressed && !was;
      was = pointer.pressed;
      if (!down) return;
      const before = macNow();
      setMac(macPress(before, pointer.cursor, performance.now(), seatedRef.current, Math.random, flagging.current));
      if (!before.open && macPlaying()) setDeskView("mac");
    });
  }, []);
  // Turned away from the Mac (getting up turns back to the PC): the game closes.
  useEffect(
    () =>
      onDeskView((view) => {
        if (view !== "mac") setMac(macClose(macNow()));
      }),
    []
  );

  // The reader's keys, while they type on the Mac and a game is open: the
  // games' keys are theirs alone (an arrow or Space would scroll the page).
  // Let go, they stop Breakout's paddle; so does leaving the window.
  const typing = useDeskFocus() === "mac" && seated;
  useEffect(() => {
    if (!typing) return;
    const down = (e: KeyboardEvent) => {
      if (!macPlaying() || e.ctrlKey || e.metaKey || e.altKey || !isGameKey(e.code)) return;
      e.preventDefault();
      if (!e.repeat) setMac(macKey(macNow(), e.code, Math.random));
    };
    const up = (e: KeyboardEvent) => setMac(macKeyUp(macNow(), e.code));
    const blur = () => ["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].forEach((code) => setMac(macKeyUp(macNow(), code)));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      blur();
    };
  }, [typing]);
  // A game's clock: real time, as the keys go.
  useFrame((_, delta) => {
    if (macPlaying()) setMac(macAdvance(macNow(), delta, Math.random));
  });

  const at = macToDesk([0, 0, 0]);
  const side = W / 2;
  const vents = MAC_SIDE_VENTS;
  const { grille, slots, handle } = MAC_TOP;
  const grilleMiddle = alongTop((grille.from + grille.to) / 2);
  const sw = vents.switch;

  return (
    <group position={at} rotation={[0, MAC.yaw, 0]}>
      {/* The case behind the front: its two halves, the notched middle, the base, and the seam round them. */}
      <mesh geometry={parts.left} material={materials.case} />
      <mesh geometry={parts.right} material={materials.case} />
      <mesh geometry={parts.middle} material={materials.case} />
      <mesh geometry={parts.plinth} material={materials.case} />
      {parts.seams.map((g, i) => (
        <mesh key={i} geometry={g} material={materials.seam} raycast={() => null} />
      ))}

      {/* The front plate, leaning back: its face, the recess, the tube, the floppy slot and the badge. */}
      <group position={[0, P.faceTop[1], P.faceTop[0]]} rotation={[-P.lean, 0, 0]}>
        <mesh geometry={parts.plateSide} material={materials.case} />
        <mesh geometry={parts.plateEdge} material={materials.case} />
        <mesh geometry={parts.face} material={materials.case} />
        <mesh geometry={parts.recess} material={materials.case} />
        <mesh geometry={parts.glass} material={materials.glass} />
        <mesh geometry={parts.picture} position={picture} material={materials.screen} />
        <mesh geometry={parts.seamTop} material={materials.seam} raycast={() => null} />
        <mesh ref={arrow} material={materials.arrow} raycast={() => null}>
          <planeGeometry args={[arrowSize, arrowSize]} />
        </mesh>
        <mesh position={[SLOT.x, -SLOT.down, 0.0002]} material={materials.shade}>
          <planeGeometry args={[SLOT.length + 0.012, 0.016]} />
        </mesh>
        <mesh position={[SLOT.x + SLOT.length / 2 - 0.012, -SLOT.down + 0.001, 0.0003]} material={materials.shade}>
          <planeGeometry args={[0.03, 0.024]} />
        </mesh>
        <mesh position={[SLOT.x, -SLOT.down - 0.001, 0.0005]} material={materials.slot}>
          <planeGeometry args={[SLOT.length, 0.0035]} />
        </mesh>
        <mesh position={[SLOT.x + SLOT.length / 2 + 0.012, -SLOT.down + 0.004, 0.0005]} material={materials.slot}>
          <circleGeometry args={[0.0009, 8]} />
        </mesh>
        {/* The badge: a small plate, its print on a plane over it (drei's rounded box maps its texture in metres, so the print goes on a plane). */}
        <RoundedBox args={[BADGE.size, BADGE.size * 1.08, 0.002]} radius={0.0008} smoothness={2} position={[BADGE.x, -BADGE.down, 0.001]} material={materials.plate} />
        <mesh position={[BADGE.x, -BADGE.down, 0.0021]} material={materials.badge}>
          <planeGeometry args={[BADGE.size - 0.001, BADGE.size * 1.08 - 0.001]} />
        </mesh>
      </group>

      {/* The base: the sunk mark at its left, the row of little slots, the label and the keyboard's jack at its right. */}
      <RoundedBox args={[0.016, 0.016, 0.001]} radius={0.003} smoothness={2} position={[-0.08, 0.024, P.plinthFront + 0.0002]} material={materials.sunk} />
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.022 + i * 0.0045, 0.034, P.plinthFront + 0.0003]} material={materials.slot}>
          <planeGeometry args={[0.0022, 0.0035]} />
        </mesh>
      ))}
      <mesh position={[JACK.x - 0.017, JACK.y, P.plinthFront + 0.0004]} material={materials.label}>
        <planeGeometry args={[0.02, 0.011]} />
      </mesh>
      <mesh position={[JACK.x, JACK.y, P.plinthFront + 0.0004]} material={materials.slot}>
        <planeGeometry args={[0.008, 0.01]} />
      </mesh>

      {/* The top, lying on its slope from its back corner: the vents' panels and slots either side, and the handle's bar across the notch. */}
      <group position={[0, P.topBack[1], P.topBack[0]]} rotation={[-MAC_TOP_SLOPE, 0, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * HALF_MIDDLE, 0.0002, grilleMiddle]}>
            <mesh geometry={parts.grille} rotation={[-Math.PI / 2, 0, 0]} material={materials.shade} />
            {Array.from({ length: slots.count }, (_, k) => (
              <mesh key={k} position={[0, 0.0001, (k - (slots.count - 1) / 2) * (slots.pitch / Math.cos(MAC_TOP_SLOPE))]} rotation={[-Math.PI / 2, 0, 0]} material={materials.slot}>
                <planeGeometry args={[slots.length, slots.width]} />
              </mesh>
            ))}
          </group>
        ))}
        <RoundedBox
          args={[2 * MAC_NOTCH_HALF - 0.0004, handle.thickness, alongTop(handle.to) - alongTop(handle.from)]}
          radius={0.002}
          smoothness={2}
          position={[0, -handle.drop - handle.thickness / 2, (alongTop(handle.from) + alongTop(handle.to)) / 2]}
          material={materials.case}
        />
      </group>

      {/* The chamfer's slots, on its two halves. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * HALF_MIDDLE, CHAMFER.y, CHAMFER.z]} rotation={[CHAMFER.turn, 0, 0]}>
          {Array.from({ length: MAC_TOP.chamferSlots }, (_, k) => (
            <mesh key={k} position={[0, (k - (MAC_TOP.chamferSlots - 1) / 2) * slots.pitch, 0.0002]} material={materials.slot}>
              <planeGeometry args={[slots.length, slots.width]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* The left side: three runs of long slots, and the programmer's switch over them at the back. */}
      {vents.rows.map((y) =>
        vents.left.map(([from, to]) => (
          <mesh key={`l${y}${from}`} position={[-side - 0.0002, y, BACK + (from + to) / 2]} rotation={[0, -Math.PI / 2, 0]} material={materials.slot}>
            <planeGeometry args={[to - from, vents.slot]} />
          </mesh>
        ))
      )}
      <RoundedBox args={[sw.out, sw.height, sw.length]} radius={0.0015} smoothness={2} position={[-side - sw.out / 2 + 0.0005, sw.y, BACK + sw.z]} material={materials.case} />
      {/* The right side: seven runs of short slots. */}
      {vents.rows.map((y) =>
        vents.right.map(([from, to]) => (
          <mesh key={`r${y}${from}`} position={[side + 0.0002, y, BACK + (from + to) / 2]} rotation={[0, Math.PI / 2, 0]} material={materials.slot}>
            <planeGeometry args={[to - from, vents.slot]} />
          </mesh>
        ))
      )}

      {/* The back: the badge and nameplate, the label, the power switch and socket, the ports, a slot and a recessed strip. */}
      <group position={[0, 0, BACK - 0.0002]} rotation={[0, Math.PI, 0]}>
        {/* Turned to face the back, +X here is the Mac's −X: the parts' x are negated. */}
        <mesh position={[-MAC_BACK.badge.x, MAC_BACK.badge.y, 0.0003]} material={materials.badge}>
          <planeGeometry args={[MAC_BACK.badge.size, MAC_BACK.badge.size]} />
        </mesh>
        <mesh position={[-MAC_BACK.nameplate.x, MAC_BACK.nameplate.y, 0.0003]} material={materials.nameplate}>
          <planeGeometry args={[MAC_BACK.nameplate.width, MAC_BACK.nameplate.height]} />
        </mesh>
        <mesh position={[-MAC_BACK.label.x, MAC_BACK.label.y, 0.0001]} material={materials.sticker}>
          <planeGeometry args={[MAC_BACK.label.width, MAC_BACK.label.height]} />
        </mesh>
        <mesh position={[-MAC_BACK.socket.x, MAC_BACK.socket.y, 0.0002]} material={materials.slot}>
          <planeGeometry args={[MAC_BACK.socket.width, MAC_BACK.socket.height]} />
        </mesh>
        <RoundedBox args={[MAC_BACK.switch.width, MAC_BACK.switch.height, 0.006]} radius={0.0015} smoothness={2} position={[-MAC_BACK.switch.x, MAC_BACK.switch.y, 0.002]} material={materials.shade} />
        {MAC_BACK.ports.at.map((x, i) => (
          <group key={x} position={[-x, MAC_BACK.ports.y, 0]}>
            <mesh position={[0, 0, 0.0002]} material={materials.metal}>
              <planeGeometry args={[MAC_BACK.ports.widths[i], MAC_BACK.ports.height]} />
            </mesh>
            <mesh position={[0, 0, 0.0004]} material={materials.slot}>
              <planeGeometry args={[MAC_BACK.ports.widths[i] - 0.004, MAC_BACK.ports.height - 0.004]} />
            </mesh>
          </group>
        ))}
        <mesh position={[-MAC_BACK.slot.x, MAC_BACK.slot.y, 0.0002]} material={materials.slot}>
          <planeGeometry args={[MAC_BACK.slot.width, MAC_BACK.slot.height]} />
        </mesh>
        <mesh position={[-MAC_BACK.strip.x, MAC_BACK.strip.y, 0.0001]} material={materials.shade}>
          <planeGeometry args={[MAC_BACK.strip.width, MAC_BACK.strip.height]} />
        </mesh>
      </group>
    </group>
  );
}
