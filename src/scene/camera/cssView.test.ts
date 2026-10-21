import { describe, expect, it } from "vitest";
import { cssCameraParts, cssPanelMatrix, panelShown } from "./cssView";
import { poseFromView, projectionLiftPx, projectToScreen, toCameraSpace, type RoomPose } from "./roomCamera";
import { DESK_SCREEN, type Panel } from "../room/screens";
import { standardView, zoomView, STANDARD_HFOV } from "../room/layout";

/**
 * What a browser does with the layer, written out from the CSS rules rather
 * than from `cssView.ts` — so that the test can catch the construction being
 * wrong, not just restated:
 *
 * - an element's transform `T` is applied about its `transform-origin` `o`:
 *   translate(o) · T · translate(-o), and `o` is the element's centre;
 * - a `perspective: f` on the layer projects its descendants about the
 *   `perspective-origin` `c`: a point `(x, y, z)` from `c` lands at
 *   `c + (x, y) / (1 - z/f)`;
 * - the panel sits at the camera element's top-left, the camera element at
 *   the layer's.
 */
type M = number[];

const mul = (a: M, b: M): M => {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
};
const translate = (x: number, y: number, z = 0): M => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const apply = (m: M, [x, y, z]: number[]) => [0, 1, 2].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]);
const aboutOrigin = (t: M, ox: number, oy: number) => mul(translate(ox, oy), mul(t, translate(-ox, -oy)));

function cssScreenPoint(pose: RoomPose, panel: Panel, width: number, height: number, qx: number, qy: number) {
  const { focal, dx, view } = cssCameraParts(pose, width);
  const dy = -projectionLiftPx(pose.lift, height);
  const camera = aboutOrigin(
    mul(translate(dx, dy), mul(translate(0, 0, focal), mul(view, translate(width / 2, height / 2)))),
    width / 2,
    height / 2
  );
  const element = aboutOrigin(
    mul(translate(-panel.pxWidth / 2, -panel.pxHeight / 2), cssPanelMatrix(panel)),
    panel.pxWidth / 2,
    panel.pxHeight / 2
  );
  const [x, y, z] = apply(mul(camera, element), [qx, qy, 0]);
  const cx = width / 2 + dx;
  const cy = height / 2 + dy;
  const w = 1 - z / focal;
  return { x: cx + (x - cx) / w, y: cy + (y - cy) / w };
}

/** The world point a px position on the panel's HTML stands for. */
function panelWorld(panel: Panel, qx: number, qy: number): [number, number, number] {
  const u = (qx / panel.pxWidth - 0.5) * panel.width;
  const v = (0.5 - qy / panel.pxHeight) * panel.height;
  return [0, 1, 2].map((i) => panel.centre[i] + panel.right[i] * u + panel.up[i] * v) as [number, number, number];
}

const W = 1600;
const H = 900;
const flat = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };

const poses: [string, RoomPose, number, number][] = [
  ["standing in the middle, card on the left", poseFromView(standardView("desk"), { ...flat, share: 0.22 }), W, H],
  ["seated at the desk", poseFromView(zoomView("desk"), flat), W, H],
  ["turned partway, looking up", poseFromView({ yaw: 20, pitch: 8, forward: 0, eyeHeight: 1.55 }, { ...flat, share: 0.22 }), W, H],
  ["a phone, lifted over the rail", poseFromView(standardView("desk"), { hfov: 41, lens: 1, share: 0, lift: 0.21 }), 390, 844],
];

describe("the CSS layer", () => {
  for (const [name, pose, width, height] of poses) {
    it(`lands the PC screen's corners and centre where WebGL draws them — ${name}`, () => {
      const panel = DESK_SCREEN;
      for (const [qx, qy] of [
        [0, 0],
        [panel.pxWidth, 0],
        [0, panel.pxHeight],
        [panel.pxWidth, panel.pxHeight],
        [panel.pxWidth / 2, panel.pxHeight / 2],
        [100, 600],
      ]) {
        const css = cssScreenPoint(pose, panel, width, height, qx, qy);
        const gl = projectToScreen(toCameraSpace(pose, panelWorld(panel, qx, qy)), pose, width, height)!;
        expect(css.x).toBeCloseTo(gl.x, 4);
        expect(css.y).toBeCloseTo(gl.y, 4);
      }
    });
  }

  it("reads the HTML the right way up and the right way round", () => {
    const pose = poses[1][1];
    const topLeft = cssScreenPoint(pose, DESK_SCREEN, W, H, 0, 0);
    const bottomRight = cssScreenPoint(pose, DESK_SCREEN, W, H, DESK_SCREEN.pxWidth, DESK_SCREEN.pxHeight);
    expect(topLeft.x).toBeLessThan(bottomRight.x);
    expect(topLeft.y).toBeLessThan(bottomRight.y);
  });
});

describe("panelShown", () => {
  it("shows the PC's screen from the middle of the room and from the chair", () => {
    expect(panelShown(DESK_SCREEN, poses[0][1])).toBe(true);
    expect(panelShown(DESK_SCREEN, poses[1][1])).toBe(true);
  });

  it("hides it through the fisheye, which CSS cannot draw", () => {
    expect(panelShown(DESK_SCREEN, { ...poses[0][1], lens: 2, hfov: 161 })).toBe(false);
    expect(panelShown(DESK_SCREEN, { ...poses[0][1], lens: 1.3 })).toBe(false);
  });

  it("hides it once it is behind the reader", () => {
    expect(panelShown(DESK_SCREEN, poseFromView(standardView("experience"), flat))).toBe(false);
  });

  it("hides it seen from behind", () => {
    // Between the screen (about 2.8 m out) and the wall, turned back to face
    // the middle of the room: a negative step along the opposite heading.
    const lookingBack = { ...poses[1][1], yaw: Math.PI, forward: -3.0, pitch: 0 };
    expect(toCameraSpace(lookingBack, DESK_SCREEN.centre)[2]).toBeLessThan(0); // ahead of the camera...
    expect(panelShown(DESK_SCREEN, lookingBack)).toBe(false); // ...but facing away
  });

});
