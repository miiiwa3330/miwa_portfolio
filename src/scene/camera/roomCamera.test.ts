import { describe, expect, it } from "vitest";
import {
  advanceRoomFlight,
  beginRoomFlight,
  toCameraSpace,
  blendRoomPose,
  placeCamera,
  HANDHELD_CARD_LIFT,
  cardLift,
  lensBends,
  pixelsPerUnitAt,
  poseFromView,
  projectToScreen,
  screenRay,
  projectionLiftPx,
  projectionShiftPx,
  verticalFov,
  type RoomPose,
} from "./roomCamera";
import { MAX_FLIGHT_STEP } from "./cameraFlight";
import { EYE_HEIGHT, STANDARD_HFOV, standardView, subjectPoint, zoomView } from "../room/layout";

const DEG = Math.PI / 180;

const FLAT = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };

const pose = (over: Partial<RoomPose> = {}): RoomPose => ({
  yaw: 0,
  pitch: 0,
  forward: 0,
  eyeHeight: EYE_HEIGHT,
  hfov: STANDARD_HFOV,
  lens: 1,
  share: 0,
  lift: 0,
  ...over,
});

describe("placeCamera", () => {
  it("stands at the centre of the room at eye height when not stepped out", () => {
    const { position } = placeCamera(pose({ yaw: 1.3 }));
    expect(position[0]).toBeCloseTo(0, 12);
    expect(position[2]).toBeCloseTo(0, 12);
    expect(position[1]).toBe(EYE_HEIGHT);
  });

  it("looks straight at each stop's subject from the standing view", () => {
    for (const stop of ["desk", "about", "products", "skills", "experience", "contact"] as const) {
      const { position, target } = placeCamera(poseFromView(standardView(stop), FLAT));
      const subject = subjectPoint(stop);
      const ray = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
      const toSubject = [subject[0] - position[0], subject[1] - position[1], subject[2] - position[2]];
      const cos =
        (ray[0] * toSubject[0] + ray[1] * toSubject[1] + ray[2] * toSubject[2]) /
        (Math.hypot(...ray) * Math.hypot(...toSubject));
      expect(cos).toBeCloseTo(1, 9);
    }
  });

  it("steps out towards the subject for a zoom, still looking at it", () => {
    const view = zoomView("products");
    const { position, target } = placeCamera(poseFromView(view, FLAT));
    expect(Math.hypot(position[0], position[2])).toBeCloseTo(view.forward, 9);
    const subject = subjectPoint("products");
    const ray = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const toSubject = [subject[0] - position[0], subject[1] - position[1], subject[2] - position[2]];
    const cos =
      (ray[0] * toSubject[0] + ray[1] * toSubject[1] + ray[2] * toSubject[2]) /
      (Math.hypot(...ray) * Math.hypot(...toSubject));
    expect(cos).toBeCloseTo(1, 9);
  });
});

describe("toCameraSpace", () => {
  it("puts what the camera looks at straight ahead, above it up and to its right right", () => {
    for (const p of [pose({ yaw: 0.4, pitch: 0.1 }), pose({ yaw: -2, pitch: -0.3, forward: 1.2 })]) {
      const { position, target } = placeCamera(p);
      const ahead = toCameraSpace(p, target);
      expect(ahead[0]).toBeCloseTo(0, 9);
      expect(ahead[1]).toBeCloseTo(0, 9);
      expect(ahead[2]).toBeCloseTo(-1, 9);
      // World up, a little above the target: up in the picture.
      expect(toCameraSpace(p, [target[0], target[1] + 0.1, target[2]])[1]).toBeGreaterThan(0);
      // Seen from above, clockwise of the view is to the right (yaw grows clockwise).
      const yawRight = p.yaw + 0.1;
      const side: [number, number, number] = [position[0] + Math.sin(yawRight), target[1], position[2] - Math.cos(yawRight)];
      expect(toCameraSpace(p, side)[0]).toBeGreaterThan(0);
    }
  });
});

describe("verticalFov", () => {
  it("keeps the horizontal field of view whatever the frame's shape", () => {
    for (const aspect of [16 / 9, 1, 390 / 844]) {
      const v = verticalFov(STANDARD_HFOV, aspect);
      const backToHorizontal = 2 * Math.atan(Math.tan((v * DEG) / 2) * aspect);
      expect(backToHorizontal / DEG).toBeCloseTo(STANDARD_HFOV, 9);
    }
  });

  it("is taller than the width on a portrait phone", () => {
    // Why the phone will need its own field of view (docs/room-migration.md).
    expect(verticalFov(STANDARD_HFOV, 390 / 844)).toBeGreaterThan(100);
  });
});

describe("projectionShiftPx", () => {
  it("moves the subject right of centre by share of the half-width", () => {
    // A shifted window of `width` px starting at `shift` sees the frame's
    // centre at (width/2 - shift); in ndc that is 1 - 2·(width/2 - shift)/width.
    const width = 1600;
    const share = 0.3;
    const shift = projectionShiftPx(share, width);
    const subjectPx = width / 2 - shift;
    const ndc = (subjectPx / width) * 2 - 1;
    expect(ndc).toBeCloseTo(share, 12);
  });

  it("does nothing with no card to clear", () => {
    expect(projectionShiftPx(0, 1600)).toBeCloseTo(0, 12);
  });
});

describe("projectionLiftPx", () => {
  it("moves the subject up from centre by lift of the half-height", () => {
    // A window `height` px tall starting `lift` px down sees the frame's centre
    // at (height/2 - offset) from its own top; ndc counts up from the bottom.
    const height = 844;
    const lift = 0.2;
    const offset = projectionLiftPx(lift, height);
    const subjectPx = height / 2 - offset;
    const ndc = 1 - (subjectPx / height) * 2;
    expect(ndc).toBeCloseTo(lift, 12);
  });
});

describe("cardLift", () => {
  it("lifts a phone's subject to the middle of the band above the card rail", () => {
    // The rail's top was measured at 664 of 844 px.
    const centrePx = 844 / 2 - projectionLiftPx(cardLift(true), 844);
    expect(centrePx).toBeCloseTo(664 / 2, 9);
    expect(cardLift(true)).toBe(HANDHELD_CARD_LIFT);
  });

  it("leaves a desktop, whose card is beside the subject, alone", () => {
    expect(cardLift(false)).toBe(0);
  });
});

describe("projectToScreen", () => {
  const W = 1600;
  const H = 900;

  it("puts the view axis where the shifted projection's centre is", () => {
    // The same arithmetic as `setViewOffset`: the subject ends up
    // `projectionShiftPx` left of where it would be, i.e. right of centre.
    const framing = { hfov: 67, lens: 1, share: 0.3, lift: 0 };
    const p = projectToScreen([0, 0, -1], framing, W, H)!;
    expect(p.x).toBeCloseTo(W / 2 - projectionShiftPx(0.3, W), 9);
    expect(p.y).toBeCloseTo(H / 2, 9);
  });

  it("lifts the view axis by the lift, through either lens", () => {
    for (const lens of [1, 2]) {
      const p = projectToScreen([0, 0, -1], { hfov: 100, lens, share: 0, lift: 0.2 }, 390, 844)!;
      expect(p.y).toBeCloseTo(844 / 2 - projectionLiftPx(0.2, 844), 9);
    }
  });

  it("puts something up and to the right, up and to the right", () => {
    const p = projectToScreen([0.2, 0.1, -1], FLAT, W, H)!;
    expect(p.x).toBeGreaterThan(W / 2);
    expect(p.y).toBeLessThan(H / 2);
  });

  it("is undone by screenRay, through every lens and shift", () => {
    for (const framing of [FLAT, { hfov: 161, lens: 2, share: 0.22, lift: 0 }, { hfov: 114, lens: 1.5, share: 0, lift: 0.21 }]) {
      for (const [x, y] of [
        [800, 450],
        [100, 80],
        [1500, 820],
      ]) {
        const d = screenRay(x, y, framing, W, H);
        const p = projectToScreen(d, framing, W, H)!;
        expect(p.x).toBeCloseTo(x, 6);
        expect(p.y).toBeCloseTo(y, 6);
      }
    }
  });
});

describe("pixelsPerUnitAt", () => {
  it("is focal length over depth through a perspective, as three.js sizes a sprite", () => {
    const W = 1600;
    const focal = W / 2 / Math.tan((67 / 2) * DEG);
    const dir: [number, number, number] = [0.3, -0.1, -1];
    const distance = 2.5;
    const depth = (distance * 1) / Math.hypot(...dir);
    expect(pixelsPerUnitAt(dir, distance, FLAT, W)).toBeCloseTo(focal / depth, 6);
  });
});

describe("lensBends", () => {
  it("draws the plain perspective straight, and anything bent at all through the cube", () => {
    expect(lensBends(1)).toBe(false);
    expect(lensBends(1.01)).toBe(true);
    expect(lensBends(2)).toBe(true);
  });
});

describe("blendRoomPose", () => {
  it("bends the lens and widens the view together, over the whole flight", () => {
    const from = pose({ hfov: 67, lens: 1 });
    const to = pose({ hfov: 161, lens: 2 });
    const mid = blendRoomPose(from, to, 0.5);
    expect(mid.lens).toBeCloseTo(1.5, 12);
    expect(mid.hfov).toBeCloseTo(114, 12);
    // Already bending just after it leaves: no lens swap at the end.
    expect(lensBends(blendRoomPose(from, to, 0.05).lens)).toBe(true);
  });

  it("turns the short way round across ±π", () => {
    const from = pose({ yaw: 170 * DEG });
    const to = pose({ yaw: -170 * DEG });
    const mid = blendRoomPose(from, to, 0.5);
    // Half way the short way is 180°, not 0°.
    expect(Math.abs(Math.cos(mid.yaw) - -1)).toBeLessThan(1e-9);
  });

  it("arrives exactly at both ends", () => {
    const from = pose({ yaw: 0.2, pitch: -0.1, forward: 0, eyeHeight: 1.55, hfov: 161, lens: 2, share: 0.22, lift: 0.2 });
    const to = pose({ yaw: 1.1, pitch: 0.05, forward: 1.8, eyeHeight: 1.12, hfov: 67, lens: 1, share: 0.3, lift: 0 });
    expect(blendRoomPose(from, to, 0)).toEqual(from);
    const end = blendRoomPose(from, to, 1);
    for (const key of Object.keys(to) as (keyof RoomPose)[]) expect(end[key]).toBeCloseTo(to[key], 12);
  });
});

describe("advanceRoomFlight", () => {
  it("charges no time on its first frame", () => {
    const flight = beginRoomFlight(pose(), pose({ yaw: 1 }), 1, null);
    const first = advanceRoomFlight(flight, 1);
    expect(first.pose.yaw).toBe(0);
    expect(first.done).toBe(false);
  });

  it("never advances more than MAX_FLIGHT_STEP in one frame", () => {
    const flight = beginRoomFlight(pose(), pose({ yaw: 1 }), 1, null);
    advanceRoomFlight(flight, 0);
    advanceRoomFlight(flight, 5);
    expect(flight.elapsed).toBeCloseTo(MAX_FLIGHT_STEP, 12);
  });

  it("hands back the free view's angles on the landing frame, and only then", () => {
    const land = { yaw: 0.7, pitch: -0.05 };
    const flight = beginRoomFlight(pose(), pose({ yaw: 0.7, pitch: -0.05 }), 0.2, land);
    expect(advanceRoomFlight(flight, 0).landed).toBeNull();
    expect(advanceRoomFlight(flight, 0.1).landed).toBeNull();
    const last = advanceRoomFlight(flight, 0.1);
    expect(last.done).toBe(true);
    expect(last.landed).toEqual(land);
  });

  it("lands nowhere for a flight that parks the camera", () => {
    const flight = beginRoomFlight(pose(), pose({ forward: 1 }), 0.1, null);
    advanceRoomFlight(flight, 0);
    const last = advanceRoomFlight(flight, 0.1);
    expect(last.done).toBe(true);
    expect(last.landed).toBeNull();
  });
});
