import * as THREE from "three";

/**
 * The room owner's face, painted on a canvas at load (no image files, as the
 * room's surfaces in `roomTextures.ts`), after the character sheet
 * (`reference/4/3.png`): eyes a little droopy at the outer corners, soft
 * straight brows, a small mouth. **Provisional (仮)** — one expression
 * (通常) of the sheet's eight; the others can be painted the same way and
 * swapped in.
 *
 * Wrapped round the head as an equirectangular map (three.js's
 * `SphereGeometry` UVs): the face is centred on u = 0.75, where the sphere
 * faces −Z, the way the head looks. Heights are angles off the head's
 * middle, from where the features sit on the figure (`room/figure.ts`).
 */

export const SKIN = "#c08566";

/** Where a point on the head lands on the map: `azimuth` right of the face's middle, `elevation` up, in degrees. */
function at(width: number, height: number, azimuth: number, elevation: number): [number, number] {
  return [width * (0.75 - azimuth / 360), height * (0.5 - elevation / 180)];
}

export function makeFaceTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  ctx.fillStyle = SKIN;
  ctx.fillRect(0, 0, W, H);

  // A little warmth on the cheeks and shade under the fringe.
  const cheek = (az: number) => {
    const [x, y] = at(W, H, az, -22);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
    g.addColorStop(0, "rgba(214,140,120,0.35)");
    g.addColorStop(1, "rgba(214,140,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 40, y - 40, 80, 80);
  };
  cheek(-26);
  cheek(26);
  const [, browY] = at(W, H, 0, 8);
  const shade = ctx.createLinearGradient(0, browY - 40, 0, browY + 6);
  shade.addColorStop(0, "rgba(90,60,50,0.35)");
  shade.addColorStop(1, "rgba(90,60,50,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(W * 0.62, browY - 40, W * 0.26, 46);

  for (const side of [-1, 1]) {
    // The eye: an iris under a heavy upper lid that droops at the outer corner.
    const [ex, ey] = at(W, H, side * 21, -11);
    const w = 30;
    ctx.fillStyle = "#f4ece6";
    ctx.beginPath();
    ctx.ellipse(ex, ey + 2, w / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2722";
    ctx.beginPath();
    ctx.ellipse(ex - side * 1, ey + 2, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#120c0b";
    ctx.beginPath();
    ctx.arc(ex - side * 1, ey + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(ex - side * 1 - 3, ey - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Upper lid: inner corner high, outer corner low (やや垂れ目).
    const inner = ex - side * (w / 2 + 1);
    const outer = ex + side * (w / 2 + 3);
    ctx.strokeStyle = "#1c1412";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(inner, ey - 2);
    ctx.quadraticCurveTo(ex, ey - 11, outer, ey + 4);
    ctx.stroke();
    // The lid's skin over the top of the iris, so the eye reads half closed.
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.moveTo(inner, ey - 2);
    ctx.quadraticCurveTo(ex, ey - 11, outer, ey + 4);
    ctx.quadraticCurveTo(ex, ey - 22, inner, ey - 2);
    ctx.fill();
    // Brow: soft, nearly straight, its outer end a little lower.
    const [bx, by] = at(W, H, side * 21, 4);
    ctx.strokeStyle = "rgba(40,28,24,0.85)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(bx - side * 17, by - 1);
    ctx.quadraticCurveTo(bx, by - 5, bx + side * 18, by + 3);
    ctx.stroke();
  }

  // Nose: a hint of shadow. Mouth: short and level.
  const [nx, ny] = at(W, H, 0, -27);
  ctx.strokeStyle = "rgba(120,80,64,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nx - 4, ny);
  ctx.quadraticCurveTo(nx, ny + 3, nx + 4, ny);
  ctx.stroke();
  const [mx, my] = at(W, H, 0, -44);
  ctx.strokeStyle = "#7a4a3e";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(mx - 10, my);
  ctx.quadraticCurveTo(mx, my + 1.5, mx + 10, my);
  ctx.stroke();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
