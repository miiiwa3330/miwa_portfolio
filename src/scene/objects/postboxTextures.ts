import * as THREE from "three";
import { hash01 } from "../hash";
import { POSTBOX_BODY, POSTBOX_RED, POSTBOX_SLOTS } from "../room/postbox";

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function asTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Draw the official Japan Post `〒` mark centered at `(cx, cy)` with overall width `size`.
 */
function drawPostalMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  ctx.fillStyle = color;
  const barH = size * 0.16;
  const gap = size * 0.16;
  const topY = cy - size * 0.42;
  // Upper horizontal bar
  ctx.fillRect(cx - size * 0.48, topY, size * 0.96, barH);
  // Lower horizontal bar
  const midY = topY + barH + gap;
  ctx.fillRect(cx - size * 0.48, midY, size * 0.96, barH);
  // Central vertical stem from lower bar downwards
  ctx.fillRect(cx - barH / 2, midY, barH, size * 0.56);
}

/**
 * High-resolution front face decal texture for the Japan Post Type-13 mailbox:
 * postal red enamel finish, crisp white `〒` mark, `郵便` / `POST` lettering,
 * dual slot labels, and subtle lower service-panel details.
 */
export function makePostboxFrontTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const [c, ctx] = makeCanvas(w, h);

  // Enamel paint base with subtle vertical sheen
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#d4241e");
  bg.addColorStop(0.5, POSTBOX_RED);
  bg.addColorStop(1, "#a91612");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Micro paint wear & city grime
  for (let i = 0; i < 65; i++) {
    const x = hash01(i * 7 + 1) * w;
    const y = hash01(i * 7 + 2) * h;
    const r = 10 + hash01(i * 7 + 3) * 32;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(70,8,6,0.12)");
    g.addColorStop(1, "rgba(70,8,6,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Slot labels mapped directly below the left & right slot positions
  ctx.textAlign = "center";
  for (const slot of POSTBOX_SLOTS) {
    const u = (slot.x / POSTBOX_BODY.width + 0.5) * w;
    const labelY = 238;
    // White-backed crisp label bar like real Type-13 postboxes
    ctx.fillStyle = "#f4f2ec";
    ctx.fillRect(u - 165, labelY - 26, 330, 38);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(slot.id === "left" ? "手紙・はがき" : "その他の郵便物", u, labelY);
  }

  // Large signature white 〒 mark + "郵便" + "POST" across the centre chest
  drawPostalMark(ctx, w / 2 - 145, 435, 118, "#ffffff");

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "bold 76px sans-serif";
  ctx.fillText("郵 便", w / 2 - 42, 430);
  ctx.font = "bold 46px sans-serif";
  ctx.fillText("P O S T", w / 2 - 36, 486);

  // Subtle horizontal parting seam & service inspection badge near bottom
  ctx.strokeStyle = "rgba(65,6,5,0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(72, 560, w - 144, 380);

  // Lower right postbox ID plate (silver metallic sticker)
  ctx.fillStyle = "#dde2e8";
  ctx.fillRect(w - 248, h - 106, 148, 44);
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 2;
  ctx.strokeRect(w - 248, h - 106, 148, 44);
  ctx.fillStyle = "#1c2026";
  ctx.textAlign = "center";
  ctx.font = "bold 22px monospace";
  ctx.fillText("No. 13-04", w - 174, h - 76);

  return asTexture(c);
}

/**
 * Side-mounted Japan Post collection schedule plaque ("取集時刻表") inside
 * an acrylic frame.
 */
export function makePostboxScheduleTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const [c, ctx] = makeCanvas(w, h);

  ctx.fillStyle = "#f5f4ef";
  ctx.fillRect(0, 0, w, h);

  // Header band in postal red
  ctx.fillStyle = POSTBOX_RED;
  ctx.fillRect(0, 0, w, 92);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("取 集 時 刻 表", w / 2, 50);
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("COLLECTION SCHEDULE // 日本郵便", w / 2, 78);

  // Columns header
  const cols = [
    { title: "平 日", x: 112, times: ["09:45", "13:15", "16:30", "18:20"] },
    { title: "土 曜", x: 256, times: ["10:00", "14:20", "17:10", "—"] },
    { title: "日・祝", x: 400, times: ["10:30", "15:40", "—", "—"] },
  ];

  ctx.strokeStyle = "#b8bcc4";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 114, w - 48, 370);
  ctx.fillStyle = "#eceae2";
  ctx.fillRect(24, 114, w - 48, 52);

  for (const col of cols) {
    ctx.fillStyle = col.title === "日・祝" ? "#c81d18" : "#1f242c";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(col.title, col.x, 149);

    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#22262e";
    col.times.forEach((t, idx) => {
      ctx.fillText(t, col.x, 224 + idx * 68);
    });
  }

  for (const x of [184, 328]) {
    ctx.beginPath();
    ctx.moveTo(x, 114);
    ctx.lineTo(x, 484);
    ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    ctx.beginPath();
    ctx.moveTo(24, 166 + row * 68);
    ctx.lineTo(w - 24, 166 + row * 68);
    ctx.stroke();
  }

  // Footer info
  ctx.fillStyle = "#333840";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("ポスト番号  13-04", w / 2, 535);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#555c66";
  ctx.fillText("担当：ロケットコロニー郵便局", w / 2, 574);
  ctx.font = "14px monospace";
  ctx.fillText("CONTACT // MIIIWA.COM", w / 2, 608);

  return asTexture(c);
}

/**
 * Cream-tinted ruled stationery paper with subtle handwritten ink strokes on top
 * of the postbox.
 */
export function makeLetterPaperTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 640;
  const [c, ctx] = makeCanvas(w, h);

  ctx.fillStyle = "#faf5e6";
  ctx.fillRect(0, 0, w, h);

  // Subtle top airmail/border accent
  ctx.fillStyle = "#c81d18";
  ctx.fillRect(42, 46, w - 84, 5);
  ctx.fillStyle = "#2b4f82";
  ctx.fillRect(42, 56, w - 84, 2);

  // Ruled writing lines
  ctx.strokeStyle = "rgba(120,145,180,0.34)";
  ctx.lineWidth = 2;
  for (let y = 112; y <= 584; y += 34) {
    ctx.beginPath();
    ctx.moveTo(42, y);
    ctx.lineTo(w - 42, y);
    ctx.stroke();
  }

  // Simulated handwritten ink letter strokes
  ctx.strokeStyle = "#202b3d";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.font = "italic 24px Georgia, serif";
  ctx.fillStyle = "#202b3d";
  ctx.fillText("Dear Miiiwa,", 52, 106);

  for (let line = 1; line <= 8; line++) {
    const baseY = 106 + line * 34;
    const endX = line === 8 ? 290 : 445 - (line % 3) * 28;
    ctx.beginPath();
    ctx.moveTo(54, baseY);
    for (let x = 58; x <= endX; x += 12) {
      const jitter = (hash01(line * 41 + x) - 0.5) * 6;
      ctx.lineTo(x, baseY + jitter);
    }
    ctx.stroke();
  }

  ctx.font = "italic 22px Georgia, serif";
  ctx.fillText("Best regards,", 260, 466);
  ctx.fillText("- Visitor", 285, 502);

  return asTexture(c);
}

/**
 * Stamped Japanese-style white envelope with a red postal stamp, wavy
 * postmark, and address lines.
 */
export function makeEnvelopeTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const [c, ctx] = makeCanvas(w, h);

  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#dcd6c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  // Postal code boxes (top right)
  ctx.strokeStyle = "#d44b3e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const gap = i >= 3 ? 10 : 0;
    ctx.strokeRect(236 + i * 24 + gap, 22, 19, 26);
  }

  // Red postage stamp (top left for horizontal envelope look)
  ctx.fillStyle = "#faf8f4";
  ctx.fillRect(28, 22, 64, 78);
  ctx.fillStyle = POSTBOX_RED;
  ctx.fillRect(33, 27, 54, 68);
  drawPostalMark(ctx, 60, 56, 26, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillText("110", 60, 86);

  // Circular postmark cancellation + wavy lines
  ctx.strokeStyle = "rgba(35,38,44,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(98, 66, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const y = 54 + i * 10;
    ctx.beginPath();
    ctx.moveTo(118, y);
    ctx.bezierCurveTo(138, y - 5, 156, y + 5, 178, y);
    ctx.stroke();
  }

  // Recipient address lines
  ctx.textAlign = "left";
  ctx.fillStyle = "#222938";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Miiiwa 様", 156, 138);
  ctx.fillStyle = "#525b6b";
  ctx.fillRect(156, 154, 240, 3);
  ctx.fillRect(156, 174, 190, 3);

  return asTexture(c);
}
