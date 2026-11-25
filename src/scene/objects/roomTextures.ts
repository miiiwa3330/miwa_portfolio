import * as THREE from "three";
import { hash01 } from "../hash";

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
 * The wall: weathered dark steel bulkhead panels (`reference/4/2.png`), aligned
 * 1:1 with `makeWallPbrMaps()` (`cols = 6, rows = 3, repeat(3, 1)`).
 */
export function makeWallTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(2048, 512);
  const cols = 6;
  const rows = 3;
  const pw = c.width / cols;
  const ph = c.height / rows;

  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const shade = 44 + Math.floor(hash01(r * 31 + k * 7 + 1) * 16);
      const grad = ctx.createLinearGradient(k * pw, r * ph, k * pw, (r + 1) * ph);
      grad.addColorStop(0, `rgb(${shade - 4},${shade + 2},${shade + 10})`);
      grad.addColorStop(1, `rgb(${shade - 10},${shade - 4},${shade + 4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(k * pw, r * ph, pw, ph);
    }
  }

  // Fine brushed steel scratches & flaking paint chips
  for (let i = 0; i < 180; i++) {
    const x = hash01(i * 11 + 3) * c.width;
    const y = hash01(i * 11 + 4) * c.height;
    const w = 10 + hash01(i * 11 + 5) * 60;
    const h = 1 + hash01(i * 11 + 6) * 3;
    ctx.fillStyle = hash01(i * 11 + 7) > 0.5 ? "rgba(18,22,28,0.28)" : "rgba(110,122,136,0.12)";
    ctx.fillRect(x, y, w, h);
  }

  // Multi-layered rust blooms & water stains
  for (let i = 0; i < 95; i++) {
    const x = hash01(i * 3 + 11) * c.width;
    const y = c.height * (0.12 + 0.88 * hash01(i * 3 + 12));
    const radius = 10 + hash01(i * 3 + 13) * 44;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(112,52,22,0.48)");
    g.addColorStop(0.55, "rgba(82,38,18,0.25)");
    g.addColorStop(1, "rgba(82,38,18,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Floor & ceiling grime gradients
  const topGrime = ctx.createLinearGradient(0, 0, 0, 80);
  topGrime.addColorStop(0, "rgba(6,8,12,0.55)");
  topGrime.addColorStop(1, "rgba(6,8,12,0)");
  ctx.fillStyle = topGrime;
  ctx.fillRect(0, 0, c.width, 80);

  const botGrime = ctx.createLinearGradient(0, c.height - 90, 0, c.height);
  botGrime.addColorStop(0, "rgba(8,10,14,0)");
  botGrime.addColorStop(1, "rgba(16,12,10,0.62)");
  ctx.fillStyle = botGrime;
  ctx.fillRect(0, c.height - 90, c.width, 90);

  // Subtle industrial stencils & caution accent bands on select panels.
  // Flipped horizontally because the cylinder interior uses BackSide UVs.
  for (const [label, px, py] of [
    ["SEC-04 // HAB", pw * 1 + 140, ph * 1 + 42],
    ["BULKHEAD B-12", pw * 4 + 140, ph * 1 + 42],
    ["DECK-02 // COLONY", pw * 2 + 150, ph * 2 + 42],
  ] as const) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(-1, 1);
    ctx.fillStyle = "rgba(195,210,228,0.28)";
    ctx.font = "bold 14px monospace";
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(218,136,42,0.28)";
  ctx.fillRect(pw * 0 + 18, ph * 2 - 14, pw - 36, 4);
  ctx.fillRect(pw * 3 + 18, ph * 2 - 14, pw - 36, 4);

  // Panel seams + subtle bevel highlight
  for (let k = 0; k <= cols; k++) {
    ctx.strokeStyle = "rgba(8,10,14,0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(k * pw, 0);
    ctx.lineTo(k * pw, c.height);
    ctx.stroke();
    ctx.strokeStyle = "rgba(140,155,175,0.14)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(k * pw + 3, 0);
    ctx.lineTo(k * pw + 3, c.height);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.strokeStyle = "rgba(8,10,14,0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, r * ph);
    ctx.lineTo(c.width, r * ph);
    ctx.stroke();
  }

  // Rivets aligned with `makeWallPbrMaps()` + rust drip streaks
  for (let r = 0; r <= rows; r++) {
    const y = r * ph + (r === rows ? -10 : 10);
    for (let x = 28; x < c.width; x += 56) {
      ctx.fillStyle = "rgba(128,136,148,0.75)";
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (hash01(x * 13 + r) > 0.72) {
        const len = 24 + hash01(x * 7 + r) * 48;
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, "rgba(116,52,20,0.58)");
        g.addColorStop(1, "rgba(116,52,20,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 2, y, 4, len);
      }
    }
  }
  const t = texture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

/**
 * The floor: concentric steel deck plates (`reference/4/1.png` & `2.png`),
 * aligned with `makeFloorPbrMaps()` so seams and rust match bump/roughness.
 */
export function makeFloorTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 1024);
  const mid = 512;
  const base = ctx.createRadialGradient(mid, mid, 20, mid, mid, 512);
  base.addColorStop(0, "#2b3038");
  base.addColorStop(0.55, "#23272e");
  base.addColorStop(1, "#16191f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);

  // Scuffs, rust patches and oil dark spots
  for (let i = 0; i < 60; i++) {
    const x = hash01(i * 9 + 1) * 1024;
    const y = hash01(i * 9 + 2) * 1024;
    const radius = 24 + hash01(i * 9 + 3) * 84;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${hash01(i) > 0.45 ? "98,50,24" : "10,12,16"},0.42)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Fine scuff scratches across the central walking plate
  ctx.strokeStyle = "rgba(180,190,205,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const a = hash01(i * 19 + 1) * Math.PI * 2;
    const r = 40 + hash01(i * 19 + 2) * 340;
    const cx = mid + Math.cos(a) * r;
    const cy = mid + Math.sin(a) * r;
    const len = 10 + hash01(i * 19 + 3) * 28;
    const dir = hash01(i * 19 + 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(dir) * len, cy + Math.sin(dir) * len);
    ctx.stroke();
  }

  // Concentric seams matching `makeFloorPbrMaps()`
  for (const [radius, width] of [
    [130, 5],
    [255, 4],
    [300, 10],
    [420, 4],
    [495, 7],
  ]) {
    ctx.strokeStyle = "rgba(8,9,12,0.92)";
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(mid, mid, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(140,150,165,0.14)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mid, mid, radius + width / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Warm amber-copper inlay ring (reference/4/2.png)
  ctx.strokeStyle = "rgba(195,105,45,0.62)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(mid, mid, 300, 0, Math.PI * 2);
  ctx.stroke();

  // Radial joints + bolt heads along the bolted ring
  ctx.strokeStyle = "rgba(8,9,12,0.85)";
  ctx.lineWidth = 4;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(mid + Math.cos(a) * 130, mid + Math.sin(a) * 130);
    ctx.lineTo(mid + Math.cos(a) * 512, mid + Math.sin(a) * 512);
    ctx.stroke();
  }
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    for (const br of [286, 314]) {
      ctx.fillStyle = "rgba(128,136,148,0.65)";
      ctx.beginPath();
      ctx.arc(mid + Math.cos(a) * br, mid + Math.sin(a) * br, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return texture(c);
}

/**
 * The colony outside the porthole: a deep vertical cyberpunk megacity shaft
 * with volumetric cyan mist, layered steel skyscrapers, dense lit windows,
 * vertical neon signs, and skybridges (`reference/4/1.png`).
 */
export function makeCityTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 1024);
  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, "#090816");
  sky.addColorStop(0.45, "#0b1a34");
  sky.addColorStop(0.82, "#0d354d");
  sky.addColorStop(1, "#185970");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle atmospheric shafts of cyan/magenta light from below
  for (const [cx, col] of [
    [280, "rgba(47,232,255,0.18)"],
    [720, "rgba(255,63,210,0.14)"],
    [512, "rgba(47,232,255,0.14)"],
  ] as const) {
    const glow = ctx.createRadialGradient(cx, 880, 30, cx, 880, 480);
    glow.addColorStop(0, col);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1024, 1024);
  }

  const signs = ["電脳", "宇宙港", "新東京", "SECTOR 7", "ORBIT", "NEXUS", "99", "港区"];
  const neon = ["#2fe8ff", "#ff3fd2", "#ffb020", "#68f0ff"];

  // Three depths of megacity towers
  for (const [depth, count, alpha] of [
    [0, 30, 0.35],
    [1, 20, 0.65],
    [2, 11, 1],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const seed = depth * 100 + i;
      const w = 36 + hash01(seed + 1) * (44 + depth * 56);
      const x = hash01(seed + 2) * 1024 - w / 2;
      const top = 40 + hash01(seed + 3) * 320 - depth * 45;
      const bodyGrad = ctx.createLinearGradient(x, top, x + w, top);
      const baseV = 12 + depth * 7;
      bodyGrad.addColorStop(0, `rgba(${baseV},${baseV + 4},${baseV + 16},${0.75 + depth * 0.1})`);
      bodyGrad.addColorStop(1, `rgba(${baseV + 8},${baseV + 12},${baseV + 24},${0.75 + depth * 0.1})`);
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(x, top, w, 1024 - top);

      // Rooftop antenna / beacon
      if (hash01(seed + 4) > 0.5) {
        ctx.fillStyle = "rgba(80,95,120,0.6)";
        ctx.fillRect(x + w * 0.5, top - 32, 2, 32);
        ctx.fillStyle = hash01(seed + 5) > 0.5 ? "#ff4d6d" : "#2fe8ff";
        ctx.fillRect(x + w * 0.5 - 1, top - 35, 4, 4);
      }

      // Lit window grid
      const stepY = 10 + depth * 4;
      const stepX = 8 + depth * 4;
      for (let y = top + 12; y < 1024; y += stepY) {
        for (let wx = x + 6; wx < x + w - 6; wx += stepX) {
          if (hash01(wx * 7 + y * 13 + seed) > 0.58) {
            ctx.fillStyle =
              hash01(wx + y + seed) > 0.48
                ? `rgba(255,195,115,${alpha})`
                : `rgba(130,225,255,${alpha})`;
            ctx.fillRect(wx, y, 3 + depth * 1.5, 4 + depth * 1.5);
          }
        }
      }

      // Vertical glowing neon signs
      if (hash01(seed + 9) > 0.45 && w > 54) {
        const ncol = neon[Math.floor(hash01(seed + 10) * neon.length)];
        const sx = x + w * (0.2 + 0.5 * hash01(seed + 11));
        const sy = top + 28 + hash01(seed + 12) * 140;
        const sh = 70 + depth * 45;
        ctx.save();
        ctx.fillStyle = "rgba(10,14,24,0.85)";
        ctx.fillRect(sx - 10, sy, 20, sh);
        ctx.strokeStyle = ncol;
        ctx.shadowColor = ncol;
        ctx.shadowBlur = 12 + depth * 8;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 10, sy, 20, sh);
        ctx.fillStyle = ncol;
        ctx.font = `bold ${11 + depth * 2}px sans-serif`;
        ctx.textAlign = "center";
        const label = signs[Math.floor(hash01(seed + 13) * signs.length)];
        for (let ch = 0; ch < Math.min(label.length, 4); ch++) {
          ctx.fillText(label[ch], sx, sy + 18 + ch * (15 + depth * 2));
        }
        ctx.restore();
      }
    }
  }

  // Elevated skybridges & maintenance trusses across the shaft
  for (const [y, h] of [
    [660, 18],
    [820, 24],
  ]) {
    ctx.fillStyle = "rgba(18,22,34,0.96)";
    ctx.fillRect(0, y, 1024, h);
    ctx.fillStyle = "rgba(47,232,255,0.85)";
    for (let x = 12; x < 1024; x += 42) ctx.fillRect(x, y + 5, 12, 3);
  }

  // Rising abyssal mist at bottom
  const mist = ctx.createLinearGradient(0, 740, 0, 1024);
  mist.addColorStop(0, "rgba(25,115,145,0)");
  mist.addColorStop(1, "rgba(38,165,195,0.42)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 740, 1024, 284);

  return texture(c);
}

/**
 * Corkboard base texture for the Investigation Board (`reference/4/1.png`):
 * cork grain, faded world blueprint map, circuit diagrams, and subtle grid charts.
 */
export function makeBoardTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 512);
  ctx.fillStyle = "#9d794f";
  ctx.fillRect(0, 0, 1024, 512);

  // Fine cork texture noise
  for (let i = 0; i < 650; i++) {
    const x = hash01(i * 5 + 1) * 1024;
    const y = hash01(i * 5 + 2) * 512;
    const w = 2 + hash01(i * 5 + 3) * 8;
    const h = 2 + hash01(i * 5 + 4) * 5;
    ctx.fillStyle = hash01(i * 5 + 5) > 0.5 ? "rgba(65,42,22,0.22)" : "rgba(210,175,130,0.16)";
    ctx.fillRect(x, y, w, h);
  }

  // Pinned faded vintage world chart in the center
  ctx.save();
  ctx.fillStyle = "#dfd4b8";
  ctx.fillRect(190, 44, 640, 380);
  ctx.strokeStyle = "rgba(95,78,56,0.28)";
  ctx.lineWidth = 1;
  for (let x = 190; x <= 830; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, 424);
    ctx.stroke();
  }
  for (let y = 44; y <= 424; y += 38) {
    ctx.beginPath();
    ctx.moveTo(190, y);
    ctx.lineTo(830, y);
    ctx.stroke();
  }
  // Simplified stylized continent blobs on the map
  ctx.fillStyle = "rgba(150,126,90,0.45)";
  for (const [mx, my, rx, ry] of [
    [290, 145, 58, 42], // N. America
    [340, 275, 34, 60], // S. America
    [500, 130, 44, 30], // Europe
    [515, 240, 48, 66], // Africa
    [655, 160, 88, 56], // Asia
    [720, 315, 42, 30], // Australia
  ]) {
    ctx.beginPath();
    ctx.ellipse(mx, my, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Pinned blueprint schematic on the left
  ctx.fillStyle = "#16304c";
  ctx.fillRect(36, 60, 138, 178);
  ctx.strokeStyle = "rgba(140,215,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, 76, 114, 146);
  ctx.beginPath();
  ctx.arc(105, 149, 36, 0, Math.PI * 2);
  ctx.moveTo(60, 149);
  ctx.lineTo(150, 149);
  ctx.stroke();

  // Pinned architecture diagram paper on the right
  ctx.fillStyle = "#ece5d3";
  ctx.fillRect(850, 74, 142, 190);
  ctx.strokeStyle = "rgba(40,45,55,0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(866, 94, 48, 34);
  ctx.strokeRect(928, 94, 48, 34);
  ctx.strokeRect(896, 160, 56, 36);
  ctx.beginPath();
  ctx.moveTo(890, 128);
  ctx.lineTo(924, 160);
  ctx.moveTo(952, 128);
  ctx.lineTo(924, 160);
  ctx.stroke();

  return texture(c);
}

/**
 * The left monitor's video: there is no footage yet, so it plays a
 * procedural loop — a neon grid running towards a striped sunset, the
 * look the room's own palette suggests. `draw` paints one frame at time `t`
 * (seconds, on the room's clock).
 */
export function makeVideo(width: number, height: number): { texture: THREE.CanvasTexture; draw: (t: number) => void } {
  const [c, ctx] = canvas(width, height);
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
    // The sun, striped, slowly setting and rising again. Sized by the
    // picture's shorter side, so it is the same sun on end or lying down.
    const k = Math.min(w, h) / 196;
    const r = 40 * k;
    const sunY = horizon - 18 * k - Math.sin(t * 0.2) * 10 * k;
    const sun = ctx.createLinearGradient(0, sunY - r, 0, sunY + r);
    sun.addColorStop(0, "#ffd36b");
    sun.addColorStop(1, "#ff3fa0");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w / 2, sunY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a1050";
    for (let i = 0; i < 5; i++) ctx.fillRect(w / 2 - r - 2 * k, sunY + (6 + i * 7) * k, 2 * r + 4 * k, (2 + i * 0.6) * k);
    // The ground: a grid rushing towards the viewer.
    ctx.fillStyle = "#0a0414";
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.strokeStyle = "#ff3fd2";
    ctx.lineWidth = Math.max(1, k);
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
      ctx.moveTo(w / 2 + i * 6 * k, horizon);
      ctx.lineTo(w / 2 + i * 60 * k, h);
      ctx.stroke();
    }
    t0.needsUpdate = true;
  };
  draw(0);
  return { texture: t0, draw };
}

function dataTexture(c: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/**
 * Procedural bump and roughness maps for the bulkhead wall panels: seams and
 * rivet rows recessed in bump, rust blooms matte (roughness ~0.9) against
 * semi-painted steel (~0.45).
 */
export function makeWallPbrMaps(): { bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const [bc, bctx] = canvas(1024, 512);
  const [rc, rctx] = canvas(1024, 512);
  const cols = 6;
  const rows = 3;
  const pw = bc.width / cols;
  const ph = bc.height / rows;

  bctx.fillStyle = "rgb(140,140,140)";
  bctx.fillRect(0, 0, bc.width, bc.height);
  rctx.fillStyle = "rgb(122,122,122)"; // ~0.48 roughness
  rctx.fillRect(0, 0, rc.width, rc.height);

  // Subtle brushed grain and rust-patch roughness variation
  for (let i = 0; i < 80; i++) {
    const x = hash01(i * 7 + 1) * bc.width;
    const y = hash01(i * 7 + 2) * bc.height;
    const rad = 14 + hash01(i * 7 + 3) * 44;
    const rg = rctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, "rgba(230,230,230,0.65)");
    rg.addColorStop(1, "rgba(230,230,230,0)");
    rctx.fillStyle = rg;
    rctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);

    const bg = bctx.createRadialGradient(x, y, 0, x, y, rad);
    bg.addColorStop(0, "rgba(95,95,95,0.4)");
    bg.addColorStop(1, "rgba(95,95,95,0)");
    bctx.fillStyle = bg;
    bctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Panel seams
  bctx.strokeStyle = "rgb(30,30,30)";
  bctx.lineWidth = 4;
  rctx.strokeStyle = "rgb(225,225,225)";
  rctx.lineWidth = 5;
  for (let k = 0; k <= cols; k++) {
    for (const ctx of [bctx, rctx]) {
      ctx.beginPath();
      ctx.moveTo(k * pw, 0);
      ctx.lineTo(k * pw, bc.height);
      ctx.stroke();
    }
  }
  for (let r = 0; r <= rows; r++) {
    for (const ctx of [bctx, rctx]) {
      ctx.beginPath();
      ctx.moveTo(0, r * ph);
      ctx.lineTo(bc.width, r * ph);
      ctx.stroke();
    }
  }

  // Rivets along seams
  for (let r = 0; r <= rows; r++) {
    const y = r * ph + (r === rows ? -10 : 10);
    for (let x = 14; x < bc.width; x += 28) {
      bctx.fillStyle = "rgb(230,230,230)";
      bctx.beginPath();
      bctx.arc(x, y, 2.5, 0, Math.PI * 2);
      bctx.fill();
      rctx.fillStyle = "rgb(70,70,70)";
      rctx.beginPath();
      rctx.arc(x, y, 2.5, 0, Math.PI * 2);
      rctx.fill();
    }
  }

  return { bump: dataTexture(bc, [3, 1]), roughness: dataTexture(rc, [3, 1]) };
}

/**
 * Procedural bump and roughness maps for the circular steel deck floor:
 * glossy brushed inner rings (~0.24 roughness) catching neon/amber pools,
 * matte panel seams and scuffed patches (~0.85 roughness).
 */
export function makeFloorPbrMaps(): { bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const [bc, bctx] = canvas(1024, 1024);
  const [rc, rctx] = canvas(1024, 1024);
  const mid = 512;

  bctx.fillStyle = "rgb(145,145,145)";
  bctx.fillRect(0, 0, 1024, 1024);
  rctx.fillStyle = "rgb(64,64,64)"; // ~0.25 roughness so reflections pool cleanly
  rctx.fillRect(0, 0, 1024, 1024);

  // Scuffs and matte wear patches
  for (let i = 0; i < 60; i++) {
    const x = hash01(i * 9 + 1) * 1024;
    const y = hash01(i * 9 + 2) * 1024;
    const rad = 24 + hash01(i * 9 + 3) * 84;
    const rg = rctx.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, "rgba(215,215,215,0.55)");
    rg.addColorStop(1, "rgba(215,215,215,0)");
    rctx.fillStyle = rg;
    rctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Concentric seams & radial joints
  bctx.strokeStyle = "rgb(35,35,35)";
  rctx.strokeStyle = "rgb(220,220,220)";
  for (const [radius, width] of [
    [130, 5],
    [255, 4],
    [300, 10],
    [420, 4],
    [495, 7],
  ]) {
    for (const ctx of [bctx, rctx]) {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(mid, mid, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    for (const ctx of [bctx, rctx]) {
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * 130, mid + Math.sin(a) * 130);
      ctx.lineTo(mid + Math.cos(a) * 512, mid + Math.sin(a) * 512);
      ctx.stroke();
    }
  }

  return { bump: dataTexture(bc), roughness: dataTexture(rc) };
}

/** Subtle brushed-steel & edge-wear maps shared by the desk's surfaces. */
export function makeDeskWearMaps(): { bump: THREE.CanvasTexture; roughness: THREE.CanvasTexture } {
  const [bc, bctx] = canvas(512, 512);
  const [rc, rctx] = canvas(512, 512);
  bctx.fillStyle = "rgb(128,128,128)";
  bctx.fillRect(0, 0, 512, 512);
  rctx.fillStyle = "rgb(120,120,120)";
  rctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const v = Math.floor(110 + hash01(y * 17) * 36);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(0, y, 512, 1);
    const rv = Math.floor(96 + hash01(y * 31) * 48);
    rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rctx.fillRect(0, y, 512, 1);
  }
  const bump = dataTexture(bc);
  const roughness = dataTexture(rc);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  return { bump, roughness };
}

/** Book spine detail texture applied once across the whole instanced bookcase mesh. */
export function makeBookSpineTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = "#e8e4da";
  ctx.fillRect(0, 0, 256, 512);
  // Subtle paper/cloth grain
  for (let i = 0; i < 240; i++) {
    const y = hash01(i * 3 + 1) * 512;
    ctx.fillStyle = `rgba(0,0,0,${0.03 + hash01(i * 3 + 2) * 0.06})`;
    ctx.fillRect(0, y, 256, 2);
  }
  // Top and bottom spine bands + title label plate
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillRect(0, 44, 256, 16);
  ctx.fillRect(0, 442, 256, 16);
  ctx.fillStyle = "rgba(24,24,28,0.35)";
  ctx.fillRect(28, 120, 200, 96);
  ctx.fillStyle = "rgba(255,230,170,0.65)";
  ctx.fillRect(52, 148, 152, 12);
  ctx.fillRect(68, 174, 120, 8);
  // Side crease shadow
  const side = ctx.createLinearGradient(0, 0, 256, 0);
  side.addColorStop(0, "rgba(0,0,0,0.35)");
  side.addColorStop(0.15, "rgba(0,0,0,0)");
  side.addColorStop(0.85, "rgba(0,0,0,0)");
  side.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 256, 512);
  return texture(c);
}

/** Stencil & hazard markings for the airlock bulkhead door slab. */
export function makeDoorDecalTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 1024);
  ctx.fillStyle = "#484e58";
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle vertical wear and panel border
  for (let i = 0; i < 45; i++) {
    const x = hash01(i * 5 + 1) * 512;
    const y = hash01(i * 5 + 2) * 1024;
    const rad = 20 + hash01(i * 5 + 3) * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(88,48,26,0.28)");
    g.addColorStop(1, "rgba(88,48,26,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.strokeStyle = "#1c2026";
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, 464, 976);

  // Caution stripe band near the bottom
  ctx.save();
  ctx.beginPath();
  ctx.rect(36, 860, 440, 42);
  ctx.clip();
  ctx.fillStyle = "#1a1c20";
  ctx.fillRect(36, 860, 440, 42);
  ctx.fillStyle = "#c88224";
  for (let x = -40; x < 520; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 902);
    ctx.lineTo(x + 18, 902);
    ctx.lineTo(x + 38, 860);
    ctx.lineTo(x + 20, 860);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Stencil lettering
  ctx.fillStyle = "rgba(220,224,230,0.65)";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("AIRLOCK 04", 256, 150);
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "rgba(235,170,72,0.75)";
  ctx.fillText("PRESSURIZED HABITAT MODULE", 256, 184);
  ctx.fillText("CAUTION // SEAL LOCK", 256, 838);

  return texture(c);
}

/** Woven industrial canvas fabric texture for the hammock sling. */
export function makeFabricTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = "#b8ad95";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? "rgba(72,62,48,0.18)" : "rgba(245,238,220,0.12)";
    ctx.fillRect(0, y, 256, 2);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? "rgba(72,62,48,0.16)" : "rgba(245,238,220,0.1)";
    ctx.fillRect(x, 0, 2, 256);
  }
  // Reinforced side hem stripes
  ctx.fillStyle = "#526378";
  ctx.fillRect(0, 0, 256, 14);
  ctx.fillRect(0, 242, 256, 14);
  const t = texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

/** Soft vertical fade texture for the floor-to-ceiling hologram projection cones. */
export function makeHoloBeamTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(47,232,255,0)");
  g.addColorStop(0.35, "rgba(47,232,255,0.22)");
  g.addColorStop(0.75, "rgba(47,232,255,0.48)");
  g.addColorStop(1, "rgba(120,248,255,0.8)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 6) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, y, 64, 1);
  }
  return texture(c);
}
