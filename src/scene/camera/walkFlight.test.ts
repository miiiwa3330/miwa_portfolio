import { describe, expect, it } from "vitest";
import { WALK_SPEED, planRoomMove, walkTime, walkedBy } from "./walkFlight";
import { easedMove, poseFromView, type RoomPose } from "./roomCamera";
import { EYE_HEIGHT, SEATED_EYE_HEIGHT, STANDARD_HFOV, horizontalAt, standardView, zoomView } from "../room/layout";
import { seatShare, standForward } from "../room/seat";

const DEG = Math.PI / 180;
const framing = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };
const centre = (yawDeg: number): RoomPose => poseFromView({ ...standardView("desk"), yaw: yawDeg }, framing);
const desk = poseFromView(zoomView("desk"), framing);

/** The move sampled every 1/120 s, end included. */
function samples(from: RoomPose, to: RoomPose, minDuration = 1.1): RoomPose[] {
  const move = planRoomMove(from, to, minDuration);
  const out: RoomPose[] = [];
  for (let t = 0; t < move.duration; t += 1 / 120) out.push(move.at(t));
  out.push(move.at(move.duration));
  return out;
}

const floor = (p: RoomPose) => {
  const [x, z] = horizontalAt(p.yaw / DEG);
  return [x * p.forward, z * p.forward];
};

describe("walkedBy", () => {
  it("starts and ends standing, and never goes faster than the pace", () => {
    for (const distance of [0.2, 1, 2.5]) {
      const total = walkTime(distance);
      expect(walkedBy(distance, 0)).toBe(0);
      expect(walkedBy(distance, total)).toBe(distance);
      let last = 0;
      for (let t = 0.01; t <= total; t += 0.01) {
        const now = walkedBy(distance, t);
        expect(now).toBeGreaterThanOrEqual(last);
        expect((now - last) / 0.01).toBeLessThanOrEqual(WALK_SPEED + 1e-9);
        last = now;
      }
    }
  });

  it("cruises at the pace on a long walk", () => {
    const total = walkTime(3);
    expect((walkedBy(3, total / 2 + 0.05) - walkedBy(3, total / 2 - 0.05)) / 0.1).toBeCloseTo(WALK_SPEED, 6);
  });
});

describe("walking to the PC and sitting down", () => {
  const way = samples(centre(0), desk);

  it("ends sat at the PC, exactly where its zoom is", () => {
    const end = way[way.length - 1];
    for (const key of Object.keys(desk) as (keyof RoomPose)[]) expect(end[key]).toBeCloseTo(desk[key], 9);
  });

  it("stays on its feet until it reaches the chair, then sits, then rolls in", () => {
    for (const pose of way) {
      if (pose.forward < standForward() - 1e-9) expect(pose.eyeHeight).toBe(EYE_HEIGHT);
      if (pose.forward > standForward() + 1e-9) expect(pose.eyeHeight).toBe(SEATED_EYE_HEIGHT);
    }
  });

  it("never steps back on the way in", () => {
    for (let i = 1; i < way.length; i++) expect(way[i].forward).toBeGreaterThanOrEqual(way[i - 1].forward - 1e-12);
  });

  it("walks no faster than the pace", () => {
    for (let i = 1; i < way.length; i++) {
      const [ax, az] = floor(way[i - 1]);
      const [bx, bz] = floor(way[i]);
      if (way[i].eyeHeight === EYE_HEIGHT) expect(Math.hypot(bx - ax, bz - az) * 120).toBeLessThan(WALK_SPEED * 1.02);
    }
  });

  it("takes longer than a glide, as a walk across the room would", () => {
    expect(planRoomMove(centre(0), desk, 1.1).duration).toBeGreaterThan(2);
  });
});

describe("getting up from the PC and walking back", () => {
  const way = samples(desk, centre(0));

  it("rolls out and stands up before walking, and never goes back towards the desk", () => {
    for (const pose of way) {
      if (pose.forward < standForward() - 1e-9) expect(pose.eyeHeight).toBe(EYE_HEIGHT);
    }
    for (let i = 1; i < way.length; i++) expect(way[i].forward).toBeLessThanOrEqual(way[i - 1].forward + 1e-12);
  });

  it("ends standing at the centre", () => {
    const end = way[way.length - 1];
    expect(end.forward).toBeCloseTo(0, 9);
    expect(end.eyeHeight).toBe(EYE_HEIGHT);
  });
});

describe("where nothing walks", () => {
  it("turns on the spot as the plain glide, in the time asked for", () => {
    const from = centre(0);
    const to = centre(120);
    const move = planRoomMove(from, to, 1.1);
    const glide = easedMove(from, to, 1.1);
    expect(move.duration).toBe(1.1);
    for (const t of [0, 0.3, 0.55, 0.9, 1.1]) expect(move.at(t)).toEqual(glide.at(t));
  });

  it("slows a short walk to the time asked for, rather than arriving early", () => {
    const from = centre(68);
    const to = poseFromView({ ...zoomView("products"), forward: 0.3 }, framing);
    const move = planRoomMove(from, to, 1.6);
    expect(move.duration).toBeCloseTo(1.6, 9);
  });
});

describe("at the hologram", () => {
  it("bends down to look without sitting anywhere on the way", () => {
    const hologram = poseFromView(zoomView("about"), framing);
    for (const pose of samples(centre(0), hologram)) expect(seatShare(pose)).toBe(0);
    for (const pose of samples(desk, hologram)) {
      if (pose.forward < standForward() - 0.25) expect(seatShare(pose)).toBe(0);
    }
  });
});
