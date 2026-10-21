/**
 * The lab's camera, as three numbers round a target: how far round (`az`,
 * degrees; 0 is the target's +Z side), how high (`el`, degrees above the
 * horizon) and how far off (`d`, metres). Kept as numbers rather than a
 * camera pose so a view fits in a URL (`?az=30&el=15&d=1.2`) and the same
 * picture can be asked for again.
 */

export type Vec3 = readonly [number, number, number];
export type OrbitView = { az: number; el: number; d: number };

const DEG = Math.PI / 180;

/** Where the eye is for a view round `target`. */
export function eyeFrom(target: Vec3, view: OrbitView): [number, number, number] {
  const el = view.el * DEG;
  const az = view.az * DEG;
  return [
    target[0] + view.d * Math.cos(el) * Math.sin(az),
    target[1] + view.d * Math.sin(el),
    target[2] + view.d * Math.cos(el) * Math.cos(az),
  ];
}

/** The view that puts the eye at `eye`, looking at `target`: the inverse of `eyeFrom`. */
export function viewFrom(target: Vec3, eye: Vec3): OrbitView {
  const dx = eye[0] - target[0];
  const dy = eye[1] - target[1];
  const dz = eye[2] - target[2];
  const d = Math.hypot(dx, dy, dz);
  if (d === 0) return { az: 0, el: 0, d: 0 };
  return { az: Math.atan2(dx, dz) / DEG, el: Math.asin(dy / d) / DEG, d };
}

/** A number from a URL parameter, or `fallback` for a missing, empty or non-numeric one. */
export function numberParam(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** A view as the URL writes it: rounded, so the address bar stays readable. */
export function viewParams(view: OrbitView): Record<"az" | "el" | "d", string> {
  return { az: view.az.toFixed(1), el: view.el.toFixed(1), d: view.d.toFixed(3) };
}
