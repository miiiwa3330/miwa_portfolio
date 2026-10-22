"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { MAC, MAC_CASE, macPictureCentre, macToDesk } from "../room/layout";
import { macPointer } from "../deskPointer";
import { roundedRectOutline } from "../room/keyboard";

/**
 * The Macintosh: a 128K (2026-10-22, the user; `reference/4/マッキントッシュ1〜6`),
 * 24.4 × 34.5 × 27.6 cm (`MAC`). Read off the photos:
 *
 * - **The front** is a separate plate, a little proud of the case's sides,
 *   its edge rounded broadly. The screen sits at the bottom of a deep recess
 *   with sloping walls, the bottom wall the widest (the tube looks up a
 *   little); the tube's glass bulges. Under it, right of middle, the floppy
 *   slot in a recessed strip with a wider notch at its right end and a pin
 *   hole; at the bottom left, a small badge — rainbow stripes, as the
 *   maker's, but an "M" for Miiiwa in place of the maker's apple (as the
 *   keyboard's "Miiiwa Professional3").
 * - **The base** under the plate, set back (4.png, 6.png): a sunk mark at
 *   its left where the maker's apple is pressed in; at its right the
 *   keyboard's jack beside a small label, and a row of little slots left of
 *   them.
 * - **The top**: two raised rails along the back, left and right, and the
 *   carrying handle sunk between them.
 * - **The sides**, low down: on the left six long slots the depth of the
 *   case, and the programmer's switch near the front (4.png); on the right
 *   seven rows of seven short slots (6.png).
 *
 * Measured in マッキントッシュ2.webp, at 3.5 px to the millimetre across the
 * front (the recess, the glass and the picture are `MAC_CASE`): the slot is
 * 90 mm long, 58 mm right of the middle and
 * 233 mm under the top; the badge is 17 mm, 81 mm left of the middle and
 * 269 mm under the top. Colours are the photos' medians (sRGB): the case
 * `#ccc3ac`, the mean of 4.png's front (`#d9d3bf`), 5.png's (`#d0c4af`) and
 * 6.png's (`#bcb297`) — less yellow than マッキントッシュ2's `#bcae7f`, which
 * was the first value; the glass `#304248`. The picture is a cool white, as
 * the lit screens in 5.png and 6.png. The screen shows a 512 × 342 one-bit picture
 * at the 128K's 72 dpi (180.6 × 120.7 mm) — a desktop, until the games come —
 * and the mouse's arrow over it, where the Mac's mouse puts it (`macPointer`;
 * hidden while the reader's own pointer is on the screen, as the PC's is).
 *
 * **仮**: how far the front stands proud, the recess's depth and how far its
 * inner edge sits up, the tube's bulge, the rails' and the handle's sizes,
 * the slots' spacing, the base's marks.
 *
 * Drawn in the desk's frame, at `MAC` (origin on the desk under its middle,
 * +Z out of the screen).
 */

const { width: W, height: H, depth: D } = MAC;
const FRONT = D / 2;
const { plate: PLATE, plinth: PLINTH, recess: RECESS, glass: GLASS, picture: PICTURE, rail: RAIL } = MAC_CASE;
/** The front plate's height and middle: from the base up to the top. */
const PLATE_H = H - PLINTH.height;
const PLATE_Y = PLINTH.height + PLATE_H / 2;
/** The base's front, set back under the plate. */
const PLINTH_FRONT = FRONT - PLINTH.setBack;
/** The keyboard's jack on the base (`MAC_CASE.jack`). */
const JACK = MAC_CASE.jack;

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
/** The case's top, under the front plate's (which stands proud of it all round). */
const BODY_TOP = H - 2 * PLATE.proud;
/** The case's rounded edges, front and back. */
const BODY_ROUND = 0.006;

const COLOURS = { case: "#ccc3ac", shade: "#a99f86", sunk: "#b7ae96", glass: "#304248", slot: "#1c2619", ink: "#0b0d0b", phosphor: "#e6ece3", tint: "#cfe2e8", label: "#8f8a7c" } as const;

type Ring = { x: number; y: number; nx: number; ny: number }[];

/** A rounded rectangle as a ring in the front's plane (x across, y up), centred at (cx, cy), with outward normals. */
function ring(width: number, height: number, corner: number, cx: number, cy: number): Ring {
  // `roundedRectOutline` is a top view (x, z towards the reader); the front's y is its −z.
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

/** A quarter round swept round a ring: from its wall, `edge` behind `z`, out and in to the face at `z`, `edge` inside the ring. */
function roundEdge(outline: Ring, edge: number, z: number, steps = 5): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let j = 0; j <= steps; j++) {
    const a = (j / steps) * (Math.PI / 2);
    const inward = edge * (1 - Math.cos(a));
    for (const p of outline) positions.push(p.x - p.nx * inward, p.y - p.ny * inward, z - edge + edge * Math.sin(a));
  }
  const n = outline.length;
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
 * The screen's picture: a one-bit desktop at the 128K's 512 × 342 — a grey
 * dither, a menu bar, a disk, and a window of the games to come (step 8 puts
 * real ones here). No maker's marks: a diamond where the maker's apple menu is.
 */
function makeDesktop(): THREE.CanvasTexture {
  const { width: w, height: h } = PICTURE.px;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const white = COLOURS.phosphor;
  const black = COLOURS.ink;
  ctx.fillStyle = white;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = black;
  for (let y = 20; y < h; y++) for (let x = (y & 1); x < w; x += 2) ctx.fillRect(x, y, 1, 1);
  // The menu bar.
  ctx.fillStyle = white;
  ctx.fillRect(0, 0, w, 19);
  ctx.fillStyle = black;
  ctx.fillRect(0, 19, w, 1);
  ctx.font = "bold 12px Chicago, Geneva, Helvetica, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("◆", 12, 10);
  ["File", "Edit", "View", "Games"].reduce((x, label) => {
    ctx.fillText(label, x, 10);
    return x + ctx.measureText(label).width + 18;
  }, 34);
  // A disk at the top right.
  const icon = (x: number, y: number, label: string) => {
    ctx.fillStyle = white;
    ctx.fillRect(x, y, 32, 26);
    ctx.fillStyle = black;
    ctx.strokeStyle = black;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 31, 25);
    ctx.fillRect(x + 6, y + 18, 20, 2);
    ctx.font = "10px Geneva, Helvetica, Arial, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = white;
    ctx.fillRect(x + 16 - tw / 2 - 2, y + 30, tw + 4, 12);
    ctx.fillStyle = black;
    ctx.fillText(label, x + 16 - tw / 2, y + 36);
  };
  icon(462, 34, "Miiiwa");
  // A window: a striped title bar and three icons.
  const win = { x: 70, y: 52, w: 340, h: 200 };
  ctx.fillStyle = white;
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = black;
  ctx.fillRect(win.x + 2, win.y + win.h, win.w, 2);
  ctx.fillRect(win.x + win.w, win.y + 2, 2, win.h);
  ctx.strokeStyle = black;
  ctx.strokeRect(win.x + 0.5, win.y + 0.5, win.w - 1, win.h - 1);
  for (let y = win.y + 4; y < win.y + 17; y += 2) ctx.fillRect(win.x + 2, y, win.w - 4, 1);
  ctx.fillStyle = white;
  ctx.font = "bold 12px Chicago, Geneva, Helvetica, Arial, sans-serif";
  const title = "Games";
  const tw = ctx.measureText(title).width;
  ctx.fillRect(win.x + win.w / 2 - tw / 2 - 6, win.y + 2, tw + 12, 15);
  ctx.fillStyle = black;
  ctx.fillText(title, win.x + win.w / 2 - tw / 2, win.y + 10);
  ctx.fillRect(win.x, win.y + 19, win.w, 1);
  ["Snake", "Breakout", "Mines"].forEach((label, i) => icon(win.x + 40 + i * 100, win.y + 60, label));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Sharp pixels up close; from further off, mipmaps average the one-pixel
  // dither to gray — without them it beat against the screen's pixels into
  // diagonal stripes.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/** The mouse's arrow, 16 px square as the 128K draws it: black with a white edge, on a clear canvas. */
const ARROW_PX = 16;
const ARROW_SIZE = (ARROW_PX * MAC_CASE.picture.width) / MAC_CASE.picture.px.width;
/** The picture's middle, in the Mac's frame. */
const PICTURE_AT = macPictureCentre();
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

export default function Macintosh() {
  const parts = useMemo(() => {
    const plateRing = ring(W, PLATE_H, PLATE.corner, 0, PLATE_Y);
    const plateFace = ring(W - 2 * PLATE.edge, PLATE_H - 2 * PLATE.edge, PLATE.corner - PLATE.edge, 0, PLATE_Y);
    const recessY = H - RECESS.top - RECESS.height / 2;
    const recessRing = ring(RECESS.width, RECESS.height, RECESS.corner, 0, recessY);
    const glassRing = ring(GLASS.width, GLASS.height, GLASS.corner, 0, recessY + RECESS.lift);
    const back = FRONT - PLATE.thickness;
    const face = new THREE.Shape();
    path(plateFace, face);
    face.holes.push(path(recessRing, new THREE.Path()));
    const faceGeometry = new THREE.ShapeGeometry(face, 8);
    faceGeometry.translate(0, 0, FRONT);
    // The case behind the front plate, a little inside it all round.
    // Its outline is drawn the bevel's width smaller, because the bevel grows it back.
    const body = new THREE.Shape();
    const b = BODY_ROUND;
    path(ring(W - 2 * PLATE.proud - 2 * b, BODY_TOP - 2 * b, PLATE.corner - PLATE.proud - b, 0, BODY_TOP / 2), body);
    const bodyGeometry = new THREE.ExtrudeGeometry(body, { depth: D - PLATE.thickness - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 8 });
    bodyGeometry.translate(0, 0, -D / 2 + b);
    // The glass, bulged; its square corners stay behind the recess's walls.
    const glassGeometry = bulged(GLASS.width, GLASS.height, 24, 18, 0);
    glassGeometry.translate(0, recessY + RECESS.lift, FRONT - RECESS.depth);
    // The picture on it, following the bulge.
    const pictureGeometry = bulged(PICTURE.width, PICTURE.height, 32, 22, 0.0006);
    // The base, under the plate and set back from it.
    const plinth = new THREE.BoxGeometry(W - 2 * PLATE.proud, PLINTH.height, PLINTH_FRONT - back + 0.01);
    plinth.translate(0, PLINTH.height / 2, (PLINTH_FRONT + back - 0.01) / 2);
    return {
      // The plate's side wall, from its back to where the edge starts to round.
      plateSide: loft(plateRing, back, plateRing, FRONT - PLATE.edge),
      plateEdge: roundEdge(plateRing, PLATE.edge, FRONT),
      face: faceGeometry,
      recess: loft(recessRing, FRONT, glassRing, FRONT - RECESS.depth),
      glass: glassGeometry,
      picture: pictureGeometry,
      plinth,
      body: bodyGeometry,
    };
  }, []);

  const textures = useMemo(() => ({ desktop: makeDesktop(), badge: makeBadge(), arrow: makeArrow() }), []);
  const materials = useMemo(
    () => ({
      case: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.62, metalness: 0, side: THREE.DoubleSide }),
      shade: new THREE.MeshStandardMaterial({ color: COLOURS.shade, roughness: 0.7, metalness: 0 }),
      glass: new THREE.MeshStandardMaterial({ color: COLOURS.glass, roughness: 0.12, metalness: 0.1 }),
      slot: new THREE.MeshStandardMaterial({ color: COLOURS.slot, roughness: 0.8, metalness: 0 }),
      screen: new THREE.MeshBasicMaterial({ map: textures.desktop, color: COLOURS.tint, toneMapped: false }),
      arrow: new THREE.MeshBasicMaterial({ map: textures.arrow, color: COLOURS.tint, transparent: true, toneMapped: false }),
      sunk: new THREE.MeshStandardMaterial({ color: COLOURS.sunk, roughness: 0.7, metalness: 0 }),
      label: new THREE.MeshStandardMaterial({ color: COLOURS.label, roughness: 0.5, metalness: 0.1 }),
      badge: new THREE.MeshStandardMaterial({ map: textures.badge, roughness: 0.35, metalness: 0.2 }),
      plate: new THREE.MeshStandardMaterial({ color: "#c9cbcc", roughness: 0.35, metalness: 0.2 }),
    }),
    [textures]
  );
  useEffect(
    () => () => {
      Object.values(parts).forEach((p) => typeof p === "object" && "dispose" in p && p.dispose());
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
      macPointer.on(({ cursor, overScreen }) => {
        const mesh = arrow.current;
        if (!mesh) return;
        const x = (cursor.x / PICTURE.px.width - 0.5) * PICTURE.width + arrowSize / 2;
        const y = (0.5 - cursor.y / PICTURE.px.height) * PICTURE.height - arrowSize / 2;
        mesh.position.set(x, picture[1] + y, picture[2] + bulge(x, y) + 0.0003);
        mesh.visible = !overScreen;
      }),
    [picture, arrowSize]
  );

  const at = macToDesk([0, 0, 0]);
  const slotY = H - SLOT.down;
  const badgeY = H - BADGE.down;
  const side = W / 2 - PLATE.proud;
  // The left side's six long slots, the right side's seven rows of seven short ones.
  const leftSlots = Array.from({ length: 6 }, (_, i) => 0.026 + i * 0.0095);
  const rightRows = Array.from({ length: 7 }, (_, i) => 0.018 + i * 0.0052);
  const rightColumns = Array.from({ length: 7 }, (_, i) => FRONT - PLATE.thickness - 0.035 - i * 0.03);

  return (
    <group position={at} rotation={[0, MAC.yaw, 0]}>
      <mesh geometry={parts.body} material={materials.case} />
      <mesh geometry={parts.plateSide} material={materials.case} />
      <mesh geometry={parts.plateEdge} material={materials.case} />
      <mesh geometry={parts.face} material={materials.case} />
      <mesh geometry={parts.recess} material={materials.case} />
      <mesh geometry={parts.glass} material={materials.glass} />
      <mesh geometry={parts.picture} position={picture} material={materials.screen} />

      {/* The base: the sunk mark at its left, the row of little slots, the label and the keyboard's jack at its right. */}
      <mesh geometry={parts.plinth} material={materials.case} />
      <RoundedBox args={[0.016, 0.016, 0.001]} radius={0.003} smoothness={2} position={[-0.08, 0.024, PLINTH_FRONT + 0.0002]} material={materials.sunk} />
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.022 + i * 0.0045, 0.034, PLINTH_FRONT + 0.0003]} material={materials.slot}>
          <planeGeometry args={[0.0022, 0.0035]} />
        </mesh>
      ))}
      <mesh position={[JACK.x - 0.017, JACK.y, PLINTH_FRONT + 0.0004]} material={materials.label}>
        <planeGeometry args={[0.02, 0.011]} />
      </mesh>
      <mesh position={[JACK.x, JACK.y, PLINTH_FRONT + 0.0004]} material={materials.slot}>
        <planeGeometry args={[0.008, 0.01]} />
      </mesh>
      <mesh ref={arrow} material={materials.arrow} raycast={() => null}>
        <planeGeometry args={[arrowSize, arrowSize]} />
      </mesh>

      {/* The floppy slot: its recessed strip, the notch at its right end, the slot and the pin hole. */}
      <mesh position={[SLOT.x, slotY, FRONT + 0.0002]} material={materials.shade}>
        <planeGeometry args={[SLOT.length + 0.012, 0.016]} />
      </mesh>
      <mesh position={[SLOT.x + SLOT.length / 2 - 0.012, slotY + 0.001, FRONT + 0.0003]} material={materials.shade}>
        <planeGeometry args={[0.03, 0.024]} />
      </mesh>
      <mesh position={[SLOT.x, slotY - 0.001, FRONT + 0.0005]} material={materials.slot}>
        <planeGeometry args={[SLOT.length, 0.0035]} />
      </mesh>
      <mesh position={[SLOT.x + SLOT.length / 2 + 0.012, slotY + 0.004, FRONT + 0.0005]} material={materials.slot}>
        <circleGeometry args={[0.0009, 8]} />
      </mesh>

      {/* The badge: a small plate, its print on a plane over it (drei's rounded box maps its texture in metres, so the print goes on a plane). */}
      <RoundedBox args={[BADGE.size, BADGE.size * 1.08, 0.002]} radius={0.0008} smoothness={2} position={[BADGE.x, badgeY, FRONT + 0.001]} material={materials.plate} />
      <mesh position={[BADGE.x, badgeY, FRONT + 0.0021]} material={materials.badge}>
        <planeGeometry args={[BADGE.size - 0.001, BADGE.size * 1.08 - 0.001]} />
      </mesh>

      {/* The top: two rails along the back, the handle sunk between them. */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[RAIL.width, RAIL.height, D - PLATE.thickness - RAIL.front]}
          radius={0.004}
          smoothness={3}
          position={[side * (W / 2 - PLATE.proud - RAIL.width / 2), BODY_TOP + RAIL.height / 2 - 0.004, -D / 2 + (D - PLATE.thickness - RAIL.front) / 2]}
          material={materials.case}
        />
      ))}
      <mesh position={[0, BODY_TOP + 0.0005, -D / 2 + 0.06]} rotation={[-Math.PI / 2, 0, 0]} material={materials.shade}>
        <planeGeometry args={[W - 2 * RAIL.width - 2 * PLATE.proud - 0.01, 0.09]} />
      </mesh>

      {/* The left side: six long slots, and the programmer's switch near the front. */}
      {leftSlots.map((y) => (
        <mesh key={`l${y}`} position={[-side - 0.0004, y, FRONT - PLATE.thickness - 0.12]} rotation={[0, -Math.PI / 2, 0]} material={materials.slot}>
          <planeGeometry args={[0.2, 0.0024]} />
        </mesh>
      ))}
      <RoundedBox args={[0.004, 0.012, 0.026]} radius={0.0012} smoothness={2} position={[-side - 0.0015, 0.048, FRONT - PLATE.thickness - 0.012]} material={materials.case} />
      {/* The right side: seven rows of seven short slots. */}
      {rightRows.map((y) =>
        rightColumns.map((z) => (
          <mesh key={`r${y}${z}`} position={[side + 0.0004, y, z]} rotation={[0, Math.PI / 2, 0]} material={materials.slot}>
            <planeGeometry args={[0.024, 0.0022]} />
          </mesh>
        ))
      )}
    </group>
  );
}
