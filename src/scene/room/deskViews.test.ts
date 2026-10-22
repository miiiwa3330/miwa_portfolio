import { describe, expect, it } from "vitest";
import {
  DESK_VIEWS,
  MAC_SEAT_YAW,
  SWIPE,
  deskViewMachine,
  deskViewPose,
  deskViewToward,
  feedSwipe,
  macHands,
  macSeatLocal,
  macSeatedPitch,
  pcSeatLocal,
  seatWorld,
  type DeskView,
  type SwipeLatch,
} from "./deskViews";
import { MAC, PIECES, STANDARD_HFOV, macToDesk, monitorFace, pieceToWorld, viewDirection, zoomView } from "./layout";
import { MAC_CASE, macFace, macPictureCentre } from "./macCase";
import { chairPlacement, seatFacing, seatOnLine, seatShare } from "./seat";
import { bodyJoints, deskHands } from "./self";
import { floorSpot, placeCamera, poseFromView, type RoomPose } from "../camera/roomCamera";
import { seatedMove } from "../camera/walkFlight";

const DEG = Math.PI / 180;
const framing = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };
const pose = (view: DeskView): RoomPose => ({ ...deskViewPose(view), ...framing });
const world = (local: readonly [number, number, number]) => pieceToWorld(PIECES.desk, local);
/** The angle between the view and the way to a point, in degrees. */
function offAxis(p: RoomPose, target: readonly number[]): number {
  const eye = placeCamera(p).position;
  const d = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]];
  const n = Math.hypot(d[0], d[1], d[2]);
  const v = viewDirection(p.yaw / DEG, p.pitch / DEG);
  return Math.acos(Math.min(1, (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / n)) / DEG;
}

describe("the desk's four views", () => {
  it("are a cross: the Mac left of the main screen, the video monitor right, the camera's above", () => {
    expect(deskViewToward("pc", "left")).toBe("mac");
    expect(deskViewToward("pc", "right")).toBe("video");
    expect(deskViewToward("pc", "up")).toBe("camera");
    expect(deskViewToward("pc", "down")).toBe("pc");
    expect(deskViewToward("mac", "right")).toBe("pc");
    expect(deskViewToward("video", "left")).toBe("pc");
    expect(deskViewToward("camera", "down")).toBe("pc");
    // No way on past the ends, nor round the corners.
    for (const [view, swipe] of [["mac", "left"], ["mac", "up"], ["video", "right"], ["video", "up"], ["camera", "up"], ["camera", "left"]] as const)
      expect(deskViewToward(view, swipe)).toBe(view);
  });

  it("type on the machine whose screen is in front", () => {
    expect(DESK_VIEWS.map(deskViewMachine)).toEqual(["pc", "pc", "pc", "mac"]);
  });

  it("keep the PC's view as it was: the PC's zoom", () => {
    expect(pose("pc")).toEqual(poseFromView(zoomView("desk"), framing));
  });

  it("look at the middle of the upper and the right-hand monitors from the PC's seat", () => {
    for (const view of ["camera", "video"] as const) {
      expect(offAxis(pose(view), world(monitorFace(view).centre))).toBeLessThan(0.6);
      const [x, z] = floorSpot(pose(view));
      const [sx, sz] = seatWorld(pcSeatLocal());
      expect(Math.hypot(x - sx, z - sz)).toBeLessThan(1e-9);
    }
    // Up to the one, round to the right to the other.
    expect(pose("camera").pitch).toBeGreaterThan(15 * DEG);
    expect(pose("video").yaw).toBeGreaterThan(25 * DEG);
  });

  it("sits square in front of the Mac, nearer its screen than the PC's seat is, as far from the desk's edge", () => {
    const [x, z] = macSeatLocal();
    // On the line out of the Mac's front through its middle.
    const out = [x - MAC.x, z - MAC.z];
    expect(out[0] * Math.cos(MAC.yaw) - out[1] * Math.sin(MAC.yaw)).toBeCloseTo(0, 12);
    expect(z).toBe(pcSeatLocal()[1]);
    // Its eye over the seat, facing the Mac.
    const [sx, sz] = floorSpot(pose("mac"));
    const [wx, wz] = seatWorld(macSeatLocal());
    expect(Math.hypot(sx - wx, sz - wz)).toBeLessThan(1e-9);
    expect(pose("mac").yaw).toBe(MAC_SEAT_YAW);
    expect(MAC_SEAT_YAW).toBeLessThan(0);
    // Nearer the screen than from the PC's seat.
    const screen = world(macToDesk(macPictureCentre()));
    const distance = (p: RoomPose) => {
      const e = placeCamera(p).position;
      return Math.hypot(screen[0] - e[0], screen[1] - e[1], screen[2] - e[2]);
    };
    expect(distance(pose("mac"))).toBeLessThan(distance(pose("pc")) - 0.1);
  });

  it("frames the Mac's screen and the hands on its keyboard and mouse together", () => {
    const p = pose("mac");
    const top = world(macToDesk(macFace(0, MAC_CASE.recess.top, 0)));
    const eye = placeCamera(p).position;
    const elevation = (t: readonly number[]) => Math.atan2(t[1] - eye[1], Math.hypot(t[0] - eye[0], t[2] - eye[2])) / DEG;
    // A 16:9 frame 67° wide is about 41° tall: both within it.
    expect(elevation(top) - p.pitch / DEG).toBeLessThan(20);
    for (const hand of macHands()) expect(elevation(hand) - p.pitch / DEG).toBeGreaterThan(-20);
    expect(macSeatedPitch()).toBeLessThan(0);
  });
});

describe("rolling over to the Mac", () => {
  const steps = Array.from({ length: 11 }, (_, i) => i / 10);
  const move = seatedMove(pose("pc"), pose("mac"), 1);

  it("goes straight from seat to seat, sat all the way, the chair under the reader", () => {
    const [ax, az] = seatWorld(pcSeatLocal());
    const [bx, bz] = seatWorld(macSeatLocal());
    for (const t of steps) {
      const p = move.at(t);
      const [x, z] = floorSpot(p);
      // Off the line between the seats by nothing.
      const off = Math.abs((x - ax) * (bz - az) - (z - az) * (bx - ax)) / Math.hypot(bx - ax, bz - az);
      expect(off).toBeLessThan(1e-9);
      expect(seatShare(p)).toBe(1);
    }
    expect(seatOnLine(move.at(0))).toBe(0);
    expect(seatOnLine(move.at(1))).toBeCloseTo(1, 9);
  });

  it("turns the chair and the body to the Mac, and puts the hands on its keyboard and mouse", () => {
    const at = pose("mac");
    expect(chairPlacement(at).yaw).toBeCloseTo(MAC.yaw, 9);
    const j = bodyJoints(at);
    expect(j.yaw).toBeCloseTo(MAC_SEAT_YAW, 9);
    const target = macHands();
    // The hands reach for them (within the arms' slack).
    for (let i = 0; i < 2; i++) expect(Math.hypot(...([0, 1, 2].map((k) => j.hands[i][k] - target[i][k]) as [number, number, number]))).toBeLessThan(0.02);
  });

  it("keeps the chair's back behind the eye, the way the seat faces", () => {
    for (const t of steps) {
      const p = move.at(t);
      const chair = chairPlacement(p);
      const [x, z] = floorSpot(p);
      const eye = [x, z + pieceToWorld(PIECES.desk, [0, 0, 0])[2] * -1];
      const behind = [chair.x - eye[0], chair.z - eye[1]];
      // Straight behind: along the seat's facing, backwards.
      const facing = seatFacing(seatOnLine(p));
      const ahead = [Math.sin(facing), -Math.cos(facing)];
      expect(behind[0] * ahead[1] - behind[1] * ahead[0]).toBeCloseTo(0, 9);
      expect(behind[0] * ahead[0] + behind[1] * ahead[1]).toBeLessThan(0);
    }
  });
});

describe("turning the head at the PC's seat", () => {
  it("does not move the eye over the floor, nor the body, nor the hands", () => {
    const rest = bodyJoints(pose("pc"));
    for (const view of ["camera", "video"] as const) {
      const move = seatedMove(pose("pc"), pose(view), 1);
      for (const t of [0.25, 0.5, 0.75, 1]) {
        const p = move.at(t);
        const [x, z] = floorSpot(p);
        const [sx, sz] = seatWorld(pcSeatLocal());
        expect(Math.hypot(x - sx, z - sz)).toBeLessThan(1e-9);
        const j = bodyJoints(p);
        expect(j.yaw).toBeCloseTo(0, 9);
        expect(j.headYaw).toBe(p.yaw);
        for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) expect(j.hands[i][k]).toBeCloseTo(rest.hands[i][k], 9);
      }
    }
    expect(deskHands()[0][0]).toBeLessThan(deskHands()[1][0]);
  });
});

describe("a two-finger swipe", () => {
  const swipe = (deltas: [number, number][], from: SwipeLatch | null = null, start = 0) => {
    let latch = from;
    const out: (string | null)[] = [];
    deltas.forEach(([dx, dy], i) => {
      const fed = feedSwipe(latch, dx, dy, start + i * 16);
      latch = fed.latch;
      out.push(fed.swipe);
    });
    return { out, latch };
  };

  it("looks the way the fingers go, with the trackpad's natural scrolling", () => {
    // Fingers left scroll right (deltaX > 0); fingers up scroll down (deltaY > 0).
    expect(swipe([[50, 0]]).out).toEqual(["left"]);
    expect(swipe([[-50, 0]]).out).toEqual(["right"]);
    expect(swipe([[0, 50]]).out).toEqual(["up"]);
    expect(swipe([[0, -50]]).out).toEqual(["down"]);
    // The way it mostly went.
    expect(swipe([[30, -45]]).out).toEqual(["down"]);
  });

  it("turns once a stream, when it has added up, and again only after a pause", () => {
    const first = swipe([[10, 0], [10, 0], [15, 0], [10, 0], [40, 0], [-80, 0]]);
    expect(first.out).toEqual([null, null, null, "left", null, null]);
    // Coasting on within the pause: still the same swipe.
    const coasting = swipe([[60, 0]], first.latch, 5 * 16 + SWIPE.quiet - 1);
    expect(coasting.out).toEqual([null]);
    // After a pause: a new one.
    const next = swipe([[-60, 0]], coasting.latch, 5 * 16 + 2 * SWIPE.quiet + 10);
    expect(next.out).toEqual(["right"]);
    // A nudge is not a swipe.
    expect(swipe([[SWIPE.threshold - 1, 0]]).out).toEqual([null]);
  });
});
