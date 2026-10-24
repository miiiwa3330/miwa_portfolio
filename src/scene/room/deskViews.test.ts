import { describe, expect, it } from "vitest";
import {
  DESK_VIEWS,
  MAC_SEAT_YAW,
  SWIPE,
  deskViewMachine,
  deskViewPose,
  deskViewToward,
  feedSwipe,
  macGamePose,
  macHands,
  macSeatLocal,
  macSeatedPitch,
  nearestDeskView,
  pcSeatLocal,
  swipeWay,
  turnSeatedHead,
  seatWorld,
  type DeskView,
  type SwipeLatch,
} from "./deskViews";
import { MAC, PIECES, STANDARD_HFOV, holoFanPlace, macToDesk, monitorFace, pieceToWorld, viewDirection, zoomView } from "./layout";
import { MAC_CASE, macFace, macPictureCentre } from "./macCase";
import { chairPlacement, seatFacing, seatOnLine, seatShare } from "./seat";
import { bodyJoints, deskHands } from "./self";
import { floorSpot, placeCamera, poseFromView, toCameraSpace, verticalFov, type RoomPose } from "../camera/roomCamera";
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
  });

  it("join the upper screen to the left and the right ones as well, both ways — the right one diagonally, past the fan", () => {
    expect(deskViewToward("mac", "up")).toBe("camera");
    expect(deskViewToward("camera", "left")).toBe("mac");
    expect(deskViewToward("video", "upLeft")).toBe("camera");
    expect(deskViewToward("camera", "downRight")).toBe("video");
  });

  it("reach the hologram fan from the main, the upper and the video screens, the way it is seen, and back", () => {
    expect(deskViewToward("pc", "upRight")).toBe("fan");
    expect(deskViewToward("camera", "right")).toBe("fan");
    expect(deskViewToward("video", "up")).toBe("fan");
    expect(deskViewToward("fan", "downLeft")).toBe("pc");
    expect(deskViewToward("fan", "left")).toBe("camera");
    expect(deskViewToward("fan", "down")).toBe("video");
  });

  it("see the fan where those moves say: right of the upper screen, over the video one, up and right of the main one", () => {
    const fan = pose("fan");
    expect(fan.yaw - pose("camera").yaw).toBeGreaterThan(20 * DEG);
    expect(Math.abs(fan.pitch - pose("camera").pitch)).toBeLessThan(10 * DEG);
    expect(fan.pitch - pose("video").pitch).toBeGreaterThan(15 * DEG);
    expect(Math.abs(fan.yaw - pose("video").yaw)).toBeLessThan(10 * DEG);
    expect(fan.yaw - pose("pc").yaw).toBeGreaterThan(20 * DEG);
    expect(fan.pitch - pose("pc").pitch).toBeGreaterThan(15 * DEG);
  });

  it("take a diagonal with nowhere to go as the straight way it went most", () => {
    expect(deskViewToward("mac", "upRight", "up")).toBe("camera");
    expect(deskViewToward("mac", "upRight", "right")).toBe("pc");
    expect(deskViewToward("mac", "upRight")).toBe("mac");
    // Where the diagonal leads somewhere, it goes there, whichever way it went most.
    expect(deskViewToward("pc", "upRight", "up")).toBe("fan");
  });

  it("go nowhere past the ends, nor below the side screens", () => {
    for (const [view, swipe] of [["mac", "left"], ["mac", "down"], ["video", "right"], ["video", "down"], ["camera", "up"], ["fan", "up"], ["fan", "right"]] as const)
      expect(deskViewToward(view, swipe)).toBe(view);
  });

  it("can always be turned back from: every move has a swipe that returns", () => {
    const swipes = ["left", "right", "up", "down", "upLeft", "upRight", "downLeft", "downRight"] as const;
    for (const view of DESK_VIEWS)
      for (const swipe of swipes) {
        const to = deskViewToward(view, swipe);
        if (to !== view) expect(swipes.some((back) => deskViewToward(to, back) === view)).toBe(true);
      }
  });

  it("type on the machine whose screen is in front", () => {
    expect(DESK_VIEWS.map(deskViewMachine)).toEqual(["pc", "pc", "pc", "mac", "pc"]);
  });

  it("keep the PC's view as it was: the PC's zoom", () => {
    expect(pose("pc")).toEqual(poseFromView(zoomView("desk"), framing));
  });

  it("look at the fan's middle from the PC's seat", () => {
    expect(offAxis(pose("fan"), world(holoFanPlace().centre))).toBeLessThan(0.6);
    const [x, z] = floorSpot(pose("fan"));
    const [sx, sz] = seatWorld(pcSeatLocal());
    expect(Math.hypot(x - sx, z - sz)).toBeLessThan(1e-9);
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

  it("rolls back from the Mac to the PC's seat while looking up to the upper screen, sat all the way", () => {
    const up = seatedMove(pose("mac"), pose("camera"), 1);
    const [ax, az] = seatWorld(macSeatLocal());
    const [bx, bz] = seatWorld(pcSeatLocal());
    for (const t of steps) {
      const p = up.at(t);
      const [x, z] = floorSpot(p);
      expect(Math.abs((x - ax) * (bz - az) - (z - az) * (bx - ax)) / Math.hypot(bx - ax, bz - az)).toBeLessThan(1e-9);
      expect(seatShare(p)).toBe(1);
    }
    expect(up.at(1).pitch).toBeGreaterThan(15 * DEG);
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

describe("a game open on the Mac", () => {
  const game: RoomPose = { ...framing, ...macGamePose() };
  const { picture, recess } = MAC_CASE;
  const down = recess.top + recess.height / 2 - recess.lift;
  const out = -recess.depth + 0.0006;
  const edge = (across: number) => world(macToDesk(macFace(across, down, out)));

  it("zooms to the Mac's picture: its middle straight ahead, 7 tenths of the frame's width", () => {
    expect(offAxis(game, world(macToDesk(macPictureCentre())))).toBeLessThan(0.01);
    const [left, right] = [edge(-picture.width / 2), edge(picture.width / 2)].map((p) => toCameraSpace(game, p));
    const half = Math.tan((game.hfov * DEG) / 2);
    expect((right[0] / -right[2] - left[0] / -left[2]) / (2 * half)).toBeCloseTo(0.7, 3);
    // From the 16% the Mac's view gives it.
    expect(game.hfov).toBeLessThan(STANDARD_HFOV / 3);
  });

  it("keeps the whole picture in a 16:9 frame, and up to a 2:1 one", () => {
    for (const aspect of [16 / 9, 2]) {
      const half = Math.tan((verticalFov(game.hfov, aspect) * DEG) / 2);
      for (const d of [recess.top + recess.height / 2 - recess.lift - picture.height / 2, recess.top + recess.height / 2 - recess.lift + picture.height / 2]) {
        const p = toCameraSpace(game, world(macToDesk(macFace(0, d, out))));
        expect(Math.abs(p[1] / -p[2])).toBeLessThan(half);
      }
    }
  });

  it("only narrows the view: the eye, the chair, the body and the hands stay where they are at the Mac's seat", () => {
    const at = pose("mac");
    const zoom = seatedMove(at, game, 1);
    const rest = bodyJoints(at);
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const p = zoom.at(t);
      const [x, z] = floorSpot(p);
      const [sx, sz] = seatWorld(macSeatLocal());
      expect(Math.hypot(x - sx, z - sz)).toBeLessThan(1e-9);
      expect(p.yaw).toBeCloseTo(at.yaw, 9);
      expect(seatOnLine(p)).toBeCloseTo(1, 9);
      expect(chairPlacement(p).yaw).toBeCloseTo(chairPlacement(at).yaw, 9);
      const j = bodyJoints(p);
      expect(j.yaw).toBeCloseTo(rest.yaw, 9);
      for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) expect(j.hands[i][k]).toBeCloseTo(rest.hands[i][k], 6);
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
    // The way it mostly went, 24° off the straight; 34° off is a diagonal (2026-10-25, for the fan).
    expect(swipe([[20, -45]]).out).toEqual(["down"]);
    expect(swipe([[30, -45]]).out).toEqual(["downLeft"]);
  });

  it("turns once a swipe, when it has added up — not again as the fingers speed up, nor for the momentum after", () => {
    // Fingers, then the trackpad coasting on in deltas that die away.
    const first = swipe([[10, 0], [10, 0], [15, 0], [10, 0], [40, 0], [30, 0], [20, 0], [12, 0], [8, 0], [5, 0], [3, 0]]);
    expect(first.out).toEqual([null, null, null, "left", null, null, null, null, null, null, null]);
    // After a pause, a new one.
    const next = swipe([[60, 0]], first.latch, 11 * 16 + SWIPE.quiet + 10);
    expect(next.out).toEqual(["left"]);
  });

  it("takes a swipe back made before the momentum has died as a swipe of its own", () => {
    const there = swipe([[30, 0], [30, 0], [25, 0], [18, 0], [12, 0]]);
    expect(there.out).toEqual([null, "left", null, null, null]);
    // The fingers come back the other way while it still coasts.
    const back = swipe([[-6, 0], [-20, 0], [-30, 0]], there.latch, 5 * 16);
    expect(back.out).toEqual([null, null, "right"]);
  });

  it("takes the fingers going again the same way, while it still coasts, as a new swipe", () => {
    const there = swipe([[0, 30], [0, 30], [0, 20], [0, 10], [0, 6]]);
    expect(there.out).toEqual([null, "up", null, null, null]);
    const again = swipe([[0, 12], [0, 25], [0, 30]], there.latch, 5 * 16);
    expect(again.out).toEqual([null, null, "up"]);
  });

  it("takes a quick swipe back, while the momentum is still strong, at once", () => {
    const there = swipe([[30, 0], [30, 0], [28, 0]]);
    expect(swipe([[-45, 0]], there.latch, 3 * 16).out).toEqual(["right"]);
  });

  it("does not start counting again for a flicker the other way in strong momentum", () => {
    const there = swipe([[30, 0], [30, 0], [28, 0]]);
    expect(swipe([[-1, 0], [28, 0], [26, 0]], there.latch, 3 * 16).out).toEqual([null, null, null]);
  });

  it("is not a swipe for a tremor in the momentum", () => {
    const there = swipe([[30, 0], [30, 0], [20, 0], [10, 0], [6, 0]]);
    // Smaller than `least`, either way: still the momentum.
    expect(swipe([[-3, 0], [3.5, 0]], there.latch, 5 * 16).out).toEqual([null, null]);
  });

  it("does not turn for a nudge", () => {
    expect(swipe([[SWIPE.threshold - 1, 0]]).out).toEqual([null]);
  });
});

describe("which way a swipe went", () => {
  it("is straight unless it went within 15° of a diagonal", () => {
    // Fingers left scroll right: a positive x is a swipe to the left, a positive y one up.
    expect(swipeWay(100, 0)).toEqual({ swipe: "left", axis: "left" });
    expect(swipeWay(0, -100)).toEqual({ swipe: "down", axis: "down" });
    // 27° off the horizontal: still straight.
    expect(swipeWay(-100, 50)).toEqual({ swipe: "right", axis: "right" });
    // 31° and 45°: diagonal.
    expect(swipeWay(-100, 60)).toEqual({ swipe: "upRight", axis: "right" });
    expect(swipeWay(100, -100).swipe).toBe("downLeft");
    expect(swipeWay(-60, 100)).toEqual({ swipe: "upRight", axis: "up" });
  });
});

describe("looking round with the mouse while sat", () => {
  const sat = pose("pc");

  it("turns the head with the eye kept over the seat", () => {
    for (const [yaw, pitch] of [[0.8, 0.1], [-1.5, 0.4], [3, -0.6]]) {
      const turned = turnSeatedHead(sat, yaw, pitch);
      expect(turned.yaw).toBe(yaw);
      expect(turned.pitch).toBe(pitch);
      const [x, z] = floorSpot(turned);
      const [sx, sz] = floorSpot(sat);
      expect(Math.hypot(x - sx, z - sz)).toBeLessThan(1e-9);
      expect(seatShare(turned)).toBe(1);
    }
  });

  it("goes on from the screen nearest the look", () => {
    for (const view of DESK_VIEWS) expect(nearestDeskView(pose(view).yaw, pose(view).pitch)).toBe(view);
    // A little off the fan, still the fan; straight up from the main screen, the upper one.
    expect(nearestDeskView(pose("fan").yaw + 0.05, pose("fan").pitch - 0.05)).toBe("fan");
    expect(nearestDeskView(pose("pc").yaw, 0.6)).toBe("camera");
  });
});
