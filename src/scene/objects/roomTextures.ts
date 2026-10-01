import * as THREE from "three";
import { hash01 } from "../voxel/rng";

/**
 * The room's surfaces, painted on canvases at load — no image files, in
 * keeping with building everything procedurally (docs/room-migration.md).
 * **Provisional (仮)** looks, after `reference/4/1.png` and `2.png`: rusted
 * riveted panels on the wall, a floor of concentric plates, the colony's
 * neon shaft outside the porthole, and a looping video for the left monitor.
 *
 * Deterministic: every "random" choice comes from `hash01`, so the room is
 * the same room on every visit and in every screenshot.
 */

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return [c, c.getContext("2d")!];
}

function texture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * The wall: riveted metal panels with seams, rust blooms and the streaks
 * rust leaves running down. One tile is eight panels across and three high,
 * repeated twice round the room — panels about 1.3 m wide.
 */
export function makeWallTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(2048, 512);
  const cols = 8;
  const rows = 3;
  const pw = c.width / cols;
  const ph = c.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const shade = 52 + Math.floor(hash01(r * 31 + k * 7 + 1) * 14);
      ctx.fillStyle = `rgb(${shade - 6},${shade},${shade + 8})`;
      ctx.fillRect(k * pw, r * ph, pw, ph);
    }
  }
  // Rust blooms, mostly low on the panels where water would sit.
  for (let i = 0; i < 70; i++) {
    const x = hash01(i * 3 + 11) * c.width;
    const y = c.height * (0.25 + 0.75 * hash01(i * 3 + 12));
    const radius = 8 + hash01(i * 3 + 13) * 36;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(96,50,26,0.35)");
    g.addColorStop(1, "rgba(96,50,26,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Seams.
  ctx.strokeStyle = "rgba(10,12,16,0.9)";
  ctx.lineWidth = 4;
  for (let k = 0; k <= cols; k++) {
    ctx.beginPath();
    ctx.moveTo(k * pw, 0);
    ctx.lineTo(k * pw, c.height);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ph);
    ctx.lineTo(c.width, r * ph);
    ctx.stroke();
  }
  // Rivets along the seams, and the rust streak each one weeps.
  for (let r = 0; r <= rows; r++) {
    for (let x = 12; x < c.width; x += 32) {
      const y = r * ph + (r === rows ? -8 : 8);
      ctx.fillStyle = "rgba(96,102,112,0.7)";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (hash01(x * 13 + r) > 0.8) {
        const g = ctx.createLinearGradient(0, y, 0, y + 50);
        g.addColorStop(0, "rgba(110,50,20,0.5)");
        g.addColorStop(1, "rgba(110,50,20,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 2, y, 4, 50);
      }
    }
  }
  const t = texture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** The floor: concentric plates, radial seams, and the scuffs of someone pacing the middle. */
export function makeFloorTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 1024);
  const mid = 512;
  ctx.fillStyle = "#2a2d33";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) {
    const x = hash01(i * 5 + 3) * 1024;
    const y = hash01(i * 5 + 4) * 1024;
    const radius = 20 + hash01(i * 5 + 5) * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${hash01(i) > 0.5 ? "90,48,26" : "18,20,24"},0.35)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.strokeStyle = "rgba(8,9,12,0.9)";
  for (const [radius, width] of [
    [120, 6],
    [260, 4],
    [300, 10],
    [420, 4],
    [505, 8],
  ]) {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(mid, mid, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A thin amber inlay in the wide ring, like the one in reference/4/2.png.
  ctx.strokeStyle = "rgba(170,90,40,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mid, mid, 300, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(8,9,12,0.8)";
  ctx.lineWidth = 4;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * 120, mid + Math.sin(a) * 120);
    ctx.lineTo(mid + Math.cos(a) * 512, mid + Math.sin(a) * 512);
    ctx.stroke();
  }
  return texture(c);
}

/**
 * The colony outside the porthole: the shaft of the rocket going down,
 * towers of lit windows and vertical neon signs stacked into the distance
 * (`reference/4/1.png`).
 */
export function makeCityTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512);
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#1a0f33");
  sky.addColorStop(0.6, "#0b1430");
  sky.addColorStop(1, "#050812");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 512);
  const neon = ["#2fe8ff", "#ff3fd2", "#ffb020", "#7c5cff"];
  // Three depths of towers, the far ones dim and small.
  for (const [depth, count, alpha] of [
    [0, 26, 0.35],
    [1, 18, 0.6],
    [2, 10, 1],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const seed = depth * 100 + i;
      const w = 18 + hash01(seed + 1) * (20 + depth * 30);
      const x = hash01(seed + 2) * 512 - w / 2;
      const top = 40 + hash01(seed + 3) * 200 - depth * 30;
      ctx.fillStyle = `rgba(${12 + depth * 6},${14 + depth * 6},${28 + depth * 8},${0.6 + depth * 0.2})`;
      ctx.fillRect(x, top, w, 512 - top);
      for (let y = top + 6; y < 512; y += 7 + depth * 2) {
        for (let wx = x + 3; wx < x + w - 3; wx += 5 + depth * 2) {
          if (hash01(wx * 7 + y * 13 + seed) > 0.62) {
            ctx.fillStyle = hash01(wx + y + seed) > 0.5 ? `rgba(255,190,110,${alpha})` : `rgba(140,220,255,${alpha})`;
            ctx.fillRect(wx, y, 2 + depth, 2 + depth);
          }
        }
      }
      if (hash01(seed + 9) > 0.55) {
        ctx.fillStyle = neon[Math.floor(hash01(seed + 10) * neon.length)];
        ctx.globalAlpha = alpha;
        ctx.shadowColor = ctx.fillStyle as string;
        ctx.shadowBlur = 8 + depth * 6;
        ctx.fillRect(x + w * 0.4, top + 20, 3 + depth * 2, 30 + depth * 30);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
  }
  // A walkway crossing the shaft.
  ctx.fillStyle = "rgba(30,34,48,0.95)";
  ctx.fillRect(0, 330, 512, 10);
  ctx.fillStyle = "rgba(47,232,255,0.8)";
  for (let x = 6; x < 512; x += 24) ctx.fillRect(x, 332, 6, 2);
  return texture(c);
}

/**
 * The left monitor's video: there is no footage yet, so it plays a
 * procedural loop — a neon grid running towards a striped sunset, the
 * look the room's own palette suggests. `draw` paints one frame at time `t`
 * (seconds, on the room's clock, so the pause button stops it).
 */
export function makeVideo(): { texture: THREE.CanvasTexture; draw: (t: number) => void } {
  const [c, ctx] = canvas(320, 196);
  const t0 = texture(c);
  const draw = (t: number) => {
    const w = c.width;
    const h = c.height;
    const horizon = h * 0.55;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#14062b");
    sky.addColorStop(1, "#5a1a6b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    // The sun, striped, slowly setting and rising again.
    const sunY = horizon - 18 - Math.sin(t * 0.2) * 10;
    const sun = ctx.createLinearGradient(0, sunY - 40, 0, sunY + 40);
    sun.addColorStop(0, "#ffd36b");
    sun.addColorStop(1, "#ff3fa0");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w / 2, sunY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a1050";
    for (let i = 0; i < 5; i++) ctx.fillRect(w / 2 - 42, sunY + 6 + i * 7, 84, 2 + i * 0.6);
    // The ground: a grid rushing towards the viewer.
    ctx.fillStyle = "#0a0414";
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = "#ff3fd2";
    ctx.lineWidth = 1;
    const phase = (t * 0.8) % 1;
    for (let i = 0; i < 12; i++) {
      const z = (i + 1 - phase) / 12;
      const y = horizon + (h - horizon) * z * z;
      ctx.globalAlpha = z;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 6, horizon);
      ctx.lineTo(w / 2 + i * 60, h);
      ctx.stroke();
    }
    t0.needsUpdate = true;
  };
  draw(0);
  return { texture: t0, draw };
}
