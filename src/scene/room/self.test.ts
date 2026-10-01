import { describe, expect, it } from "vitest";
import { CHAIR_SEAT_TOP, SEATED_HIPS_Y, TORSO_DEPTH, bodyJoints, deskHands, seatedShare } from "./self";
import { EYE_HEIGHT, HANDHELD_STANDARD_HFOV, STANDARD_HFOV, STOP_KEYS, standardView, zoomView } from "./layout";
import { placeCamera, poseFromView, projectToScreen, toCameraSpace } from "../camera/roomCamera";

const desktop = { hfov: STANDARD_HFOV, lens: 1, share: 0.22, lift: 0 };
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

  it("puts the hips on the chair's seat", () => {
    expect(Math.abs(SEATED_HIPS_Y - CHAIR_SEAT_TOP)).toBeLessThan(0.04);
    expect(seated.hips[1]).toBeCloseTo(SEATED_HIPS_Y, 9);
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
