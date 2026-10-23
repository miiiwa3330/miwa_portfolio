import { describe, expect, it } from "vitest";
import { CHAIR_SEAT_TOP, REACH, SHOULDER_HALF, TORSO_HALF_WIDTH, HIP_HALF, SEATED_HIPS_Y, SHIN, THIGH, TORSO_DEPTH, bodyJoints, deskHands, seatedShare, withinReach } from "./self";
import { STANDING, advanceGait, footStep, type Gait } from "./gait";
import { EYE_HEIGHT, FREE_HFOV, HANDHELD_STANDARD_HFOV, KEYBOARD, MAC_MOUSE, MOUSE, PIECES, STANDARD_HFOV, STOP_KEYS, macKeyboardPlace, pieceCentreDistance, pieceToWorld, standardView, zoomView } from "./layout";
import { HHKB } from "./keyboard";
import { deskViewPose } from "./deskViews";
import { CHAIR_SEAT_SPAN, chairPlacement } from "./seat";
import { placeCamera, poseFromView, projectToScreen, toCameraSpace } from "../camera/roomCamera";

// The free view: what the reader looks round the room through, the widest standard frame.
const desktop = { hfov: FREE_HFOV, lens: 1, share: 0.22, lift: 0 };
const phone = { hfov: HANDHELD_STANDARD_HFOV, lens: 1, share: 0, lift: 0.21 };

describe("the reader's body", () => {
  it("has its head round the eye, where the camera is", () => {
    for (const stop of STOP_KEYS) {
      const pose = poseFromView(standardView(stop), desktop);
      const eye = placeCamera(pose).position;
      const { head } = bodyJoints(pose);
      expect(Math.hypot(head[0] - eye[0], head[1] - eye[1], head[2] - eye[2])).toBeLessThan(0.1);
    }
  });

  it("stands on the floor", () => {
    const { feet } = bodyJoints(poseFromView(standardView("skills"), desktop));
    for (const foot of feet) expect(foot[1]).toBe(0);
    expect(EYE_HEIGHT).toBeGreaterThan(1.4);
  });

  it("stays out of the reader's own view, looking ahead at any area, on a desktop or a phone", () => {
    // The head is not drawn by the reader's camera at all (a layer); the rest
    // of the body is, so it has to stay below the bottom of the frame.
    for (const [framing, width, height] of [
      [desktop, 1600, 900],
      [phone, 390, 844],
    ] as const) {
      for (const stop of STOP_KEYS) {
        const pose = poseFromView(standardView(stop), framing);
        const j = bodyJoints(pose);
        for (const point of [j.neck, j.hips, ...j.shoulders, ...j.elbows, ...j.hands, ...j.knees, ...j.feet]) {
          const p = projectToScreen(toCameraSpace(pose, point), pose, width, height);
          if (p) expect(p.y).toBeGreaterThan(height);
        }
      }
    }
  });

  it("stays out of view mid-walk too: the swinging arms and the stepping feet", () => {
    for (const [framing, width, height] of [
      [desktop, 1600, 900],
      [phone, 390, 844],
    ] as const) {
      for (const stop of STOP_KEYS) {
        const pose = poseFromView(standardView(stop), framing);
        for (let phase = 0; phase < 1; phase += 0.05) {
          const j = bodyJoints(pose, { ...STANDING, phase, amount: 1 });
          for (const point of [...j.elbows, ...j.hands, ...j.knees, ...j.feet]) {
            const p = projectToScreen(toCameraSpace(pose, point), pose, width, height);
            if (p) expect(p.y).toBeGreaterThan(height);
          }
        }
      }
    }
  });

  it("turns with the reader but never tilts: looking up leaves the body upright", () => {
    const level = bodyJoints(poseFromView({ ...standardView("products"), pitch: 0 }, desktop));
    const up = bodyJoints(poseFromView({ ...standardView("products"), pitch: 40 }, desktop));
    expect(up.hips).toEqual(level.hips);
    expect(up.feet).toEqual(level.feet);
  });
});

describe("looking down", () => {
  const pose = poseFromView({ ...standardView("products"), pitch: -70 }, { ...desktop, share: 0 });
  const j = bodyJoints(pose);

  it("brings the feet into a 16:9 frame once the head is tipped down as far as it goes (70°)", () => {
    for (const foot of j.feet) {
      const p = projectToScreen(toCameraSpace(pose, foot), pose, 1600, 900);
      expect(p).not.toBeNull();
      expect(p!.y).toBeLessThan(900);
      expect(p!.y).toBeGreaterThan(0);
    }
  });

  it("sees the feet past the chest, not through it — the head leans forward over the body", () => {
    // The sight line to a foot, at the height of the base of the neck, must
    // pass in front of the chest (the torso's front, TORSO_DEPTH ahead of its axis).
    const eye = placeCamera(pose).position;
    const [fx, , fz] = [Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)];
    const ahead = (p: number[]) => (p[0] - j.neck[0]) * fx + (p[2] - j.neck[2]) * fz;
    for (const foot of j.feet) {
      const t = (eye[1] - j.neck[1]) / (eye[1] - foot[1]);
      const atNeck = [eye[0] + (foot[0] - eye[0]) * t, 0, eye[2] + (foot[2] - eye[2]) * t];
      expect(ahead(atNeck)).toBeGreaterThan(TORSO_DEPTH);
    }
  });
});

describe("sitting down at the PC", () => {
  const seated = bodyJoints(poseFromView(zoomView("desk"), { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 }));

  it("is what the seated zoom is, and standing is not", () => {
    expect(seatedShare(zoomView("desk").eyeHeight)).toBe(1);
    expect(seatedShare(EYE_HEIGHT)).toBe(0);
  });

  it("rests the hips on the cushion: the hip joints a pelvis' depth over it, and over it seen from above", () => {
    expect(seated.hips[1]).toBeCloseTo(SEATED_HIPS_Y, 9);
    const over = seated.hips[1] - CHAIR_SEAT_TOP;
    expect(over).toBeGreaterThan(0.05);
    expect(over).toBeLessThan(0.11);
    // In the desk's frame (+Z towards the centre; the desk stands at yaw 0).
    const chair = chairPlacement(poseFromView(zoomView("desk"), { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 }));
    const intoSeat = chair.z - (seated.hips[2] + pieceCentreDistance(PIECES.desk));
    expect(intoSeat).toBeGreaterThan(CHAIR_SEAT_SPAN.from + 0.05);
    expect(intoSeat).toBeLessThan(CHAIR_SEAT_SPAN.to - 0.05);
  });

  it("rests the hands on the keyboard and the mouse", () => {
    const [left, right] = deskHands();
    expect(seated.hands[0]).toEqual(left);
    expect(seated.hands[1]).toEqual(right);
  });

  it("keeps both feet on the floor, in front of the knees' line", () => {
    for (const foot of seated.feet) expect(foot[1]).toBe(0);
  });
});

describe("the arms", () => {
  it("hang outside the loose T-shirt, not inside it", () => {
    // The arm's middle at or past the shirt's side: 3 cm further in (the
    // first try), the boxy shirt swallowed the arms whole.
    expect(SHOULDER_HALF).toBeGreaterThanOrEqual(TORSO_HALF_WIDTH);
  });
});

describe("the legs", () => {
  /** A walk at pace along the desk's line, `seconds` in. */
  function walking(seconds: number): Gait {
    let gait = STANDING;
    for (let i = 0; i < seconds * 60; i++) gait = advanceGait(gait, 0, -(i * 1.5) / 60, 0, 1 / 60);
    return gait;
  }
  const hipJoint = (j: ReturnType<typeof bodyJoints>, i: number) => {
    const right = [Math.cos(j.yaw), 0, Math.sin(j.yaw)];
    return j.hips.map((h, n) => h + right[n] * (i === 0 ? -HIP_HALF : HIP_HALF));
  };
  const length = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const ahead = (j: ReturnType<typeof bodyJoints>, from: number[], to: number[]) =>
    (to[0] - from[0]) * Math.sin(j.yaw) - (to[2] - from[2]) * Math.cos(j.yaw);
  /** A full walk, at every twentieth of a stride: the ends of each step are where a leg is out furthest. */
  const strides = Array.from({ length: 20 }, (_, k) =>
    bodyJoints(poseFromView(standardView("desk"), desktop), { ...STANDING, phase: k / 20, amount: 1 })
  );
  const cases: [string, ReturnType<typeof bodyJoints>[]][] = [
    ["standing", [bodyJoints(poseFromView(standardView("skills"), desktop))]],
    ["walking", strides],
    ["at the hologram", [bodyJoints(poseFromView(zoomView("about"), desktop))]],
    ["sat at the PC", [bodyJoints(poseFromView(zoomView("desk"), desktop))]],
  ];

  for (const [name, bodies] of cases) {
    it(`keeps the thigh and the shin their own lengths, ${name}`, () => {
      for (const j of bodies) {
        for (const i of [0, 1]) {
          expect(length(hipJoint(j, i), j.knees[i])).toBeCloseTo(THIGH, 6);
          expect(length(j.knees[i], j.feet[i])).toBeCloseTo(SHIN, 6);
        }
      }
    });

    it(`bends the knees forward, never back, ${name}`, () => {
      for (const j of bodies) {
        for (const i of [0, 1]) {
          // The knee's way off the straight line from hip to foot (none at all for a leg out straight).
          const hip = hipJoint(j, i);
          const leg = j.feet[i].map((f, n) => f - hip[n]);
          const toKnee = j.knees[i].map((k, n) => k - hip[n]);
          const along = (toKnee[0] * leg[0] + toKnee[1] * leg[1] + toKnee[2] * leg[2]) / (leg[0] ** 2 + leg[1] ** 2 + leg[2] ** 2);
          const off = toKnee.map((k, n) => k - leg[n] * along);
          expect(ahead(j, [0, 0, 0], off)).toBeGreaterThanOrEqual(-1e-9);
          if (Math.hypot(...off) > 1e-6) expect(ahead(j, [0, 0, 0], off)).toBeGreaterThan(0);
        }
      }
    });
  }

  it("swings each arm against its own leg: the left hand back as the left foot comes forward", () => {
    for (const j of strides) {
      for (const i of [0, 1]) {
        const foot = ahead(j, hipJoint(j, i), j.feet[i]);
        const hand = ahead(j, j.shoulders[i], j.hands[i]);
        // Relative to where each hangs at rest: the feet 5 cm ahead of the hips walking, the hands 4 cm ahead of the shoulders.
        if (Math.abs(foot - 0.05) > 0.1) expect(Math.sign(hand - 0.04)).toBe(-Math.sign(foot - 0.05));
      }
    }
  });

  it("keeps a planted foot on the floor mid-walk, and lifts the other off it", () => {
    const gait = walking(1.3);
    const j = bodyJoints(poseFromView(standardView("desk"), desktop), gait);
    const planted = footStep(gait, 0).lift === 0 ? 0 : 1;
    // Reaching for the end of a step, a straight leg may stop just short of the floor.
    expect(j.feet[planted][1]).toBeLessThan(0.02);
    expect(j.feet[1 - planted][1]).toBeGreaterThan(0.02);
  });

  it("leaves the hands hanging at the hologram — its zoom lowers the eye, but nobody sits there", () => {
    const j = bodyJoints(poseFromView(zoomView("about"), desktop));
    const [left, right] = deskHands();
    expect(length(j.hands[0], left)).toBeGreaterThan(0.3);
    expect(length(j.hands[1], right)).toBeGreaterThan(0.3);
    for (const hand of j.hands) expect(hand[1]).toBeLessThan(0.8);
  });
});

describe("the reader's reach (the desk's machines are used only within it)", () => {
  const world = (x: number, z: number) => pieceToWorld(PIECES.desk, [x, 0.8, z]);
  const pcMouse = world(MOUSE.x, MOUSE.z);
  const macMouse = world(MAC_MOUSE.x, MAC_MOUSE.z);
  const board = macKeyboardPlace();
  const framing = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };
  const at = (view: "pc" | "mac") => ({ ...deskViewPose(view), ...framing });

  it("takes in the PC's mouse and the HHKB's farthest keys from the PC's seat, and the Mac's from the Mac's", () => {
    const seat = at("pc");
    expect(withinReach(seat, pcMouse)).toBe(true);
    for (const x of [-HHKB.width / 2, HHKB.width / 2]) expect(withinReach(seat, world(KEYBOARD.x + x, KEYBOARD.z - HHKB.depth / 2))).toBe(true);
    expect(withinReach(at("mac"), macMouse)).toBe(true);
    expect(withinReach(at("mac"), world(board.x, board.z))).toBe(true);
  });

  it("does not reach the desk from the middle of the room, nor from a step back from it", () => {
    const middle = poseFromView(standardView("desk"), framing);
    expect(withinReach(middle, pcMouse)).toBe(false);
    expect(withinReach(middle, world(KEYBOARD.x, KEYBOARD.z))).toBe(false);
    // Standing half a metre behind the PC's seat: out of reach.
    const back = { ...at("pc"), forward: at("pc").forward - 0.5 };
    expect(withinReach(back, pcMouse)).toBe(false);
  });

  it("is about an arm and a lean: under a metre", () => {
    expect(REACH).toBeGreaterThan(0.74);
    expect(REACH).toBeLessThan(1);
  });
});
