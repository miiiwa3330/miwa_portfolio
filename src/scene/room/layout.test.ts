import { describe, expect, it } from "vitest";
import { NAV } from "@/hub/nav";
import { HHKB } from "./keyboard";
import {
  EYE_HEIGHT,
  MIN_PIECE_GAP,
  PIECES,
  PIECE_KEYS,
  ROOM_RADIUS,
  SEATED_EYE_HEIGHT,
  STANDARD_HFOV,
  FREE_HFOV,
  STOP_KEYS,
  STOP_ORDER,
  SUBJECTS,
  ZOOM_FILL,
  ZOOM_MIN_CLEARANCE,
  facingStop,
  hfovForZoom,
  markerPoint,
  FISHEYE_HFOV,
  HANDHELD_FISHEYE_HFOV,
  HANDHELD_REFERENCE_ASPECT,
  HANDHELD_STANDARD_HFOV,
  lensForZoom,
  pieceCentreDistance,
  pieceSpan,
  pieceToWorld,
  standardView,
  subjectDistance,
  subjectPoint,
  subjectYaw,
  viewDirection,
  yawDelta,
  yawOf,
  zoomView,
  CHAIR_BACK_HEIGHT,
  HANDHELD_STANDARD_HFOV as PHONE_HFOV,
  MONITORS,
  MONITOR_STANDS,
  monitorFrameMiddle,
  KEYBOARD,
  monitorBottomOverDesk,
  monitorFace,
  monitorToDesk,
  monitorCorners,
  kickstand,
  KICKSTAND,
  armJoints,
  MAC,
  MONITOR_ARM,
  chairBackZ,
  wallRibAngles,
  floorGridLines,
  RIB_STEP,
  HAND_Y,
  DESK_HANDS,
} from "./layout";

const DEG = Math.PI / 180;
const horizontal = (p: readonly number[]) => Math.hypot(p[0], p[2]);

describe("yaw convention", () => {
  it("turning right from the PC is clockwise seen from above", () => {
    // Facing yaw 0, the reader's right hand points along forward × up. A small
    // turn to the right must move the view towards that side.
    const ahead = viewDirection(0, 0);
    const right: [number, number, number] = [-ahead[2], 0, ahead[0]];
    const turned = viewDirection(10, 0);
    expect(turned[0] * right[0] + turned[2] * right[2]).toBeGreaterThan(0);
  });

  it("reads back the yaw it was given", () => {
    for (const yaw of [0, 45, 135, 200, 359]) {
      const [x, , z] = viewDirection(yaw, 20);
      expect(yawOf(x, z)).toBeCloseTo(yaw, 6);
    }
  });
});

describe("furniture", () => {
  const corners = (key: (typeof PIECE_KEYS)[number]) => {
    const p = PIECES[key];
    const w = p.width / 2;
    const d = p.depth / 2;
    return {
      back: [pieceToWorld(p, [-w, 0, -d]), pieceToWorld(p, [w, 0, -d])],
      front: [pieceToWorld(p, [-w, 0, d]), pieceToWorld(p, [w, 0, d])],
    };
  };

  it("never pokes through the wall", () => {
    for (const key of PIECE_KEYS)
      for (const c of [...corners(key).back, ...corners(key).front]) expect(horizontal(c)).toBeLessThan(ROOM_RADIUS);
  });

  it("backs onto the wall rather than floating in front of it", () => {
    // The back corners are what touch a curved wall; within a few centimetres.
    for (const key of PIECE_KEYS) for (const c of corners(key).back) expect(horizontal(c)).toBeGreaterThan(ROOM_RADIUS - 0.05);
  });

  it("puts the front face nearer the centre than the back", () => {
    // The prototype once measured zoom distances to the back face by getting
    // the local +Z sign wrong; this is the spec that would have caught it.
    for (const key of PIECE_KEYS) {
      const { back, front } = corners(key);
      const mid = (pair: number[][]) => horizontal([(pair[0][0] + pair[1][0]) / 2, 0, (pair[0][2] + pair[1][2]) / 2]);
      expect(mid(front)).toBeLessThan(pieceCentreDistance(PIECES[key]));
      expect(mid(back)).toBeGreaterThan(pieceCentreDistance(PIECES[key]));
      expect(mid(back) - mid(front)).toBeCloseTo(PIECES[key].depth, 6);
    }
  });

  it("leaves a clear gap between every pair of neighbours, all the way round", () => {
    // Signed, and across the seam at 360°. Wrapping the gap itself with a
    // modulo once let an overlap of 1.6° (desk and workbench) read as 358.4°.
    const spans = PIECE_KEYS.map((key) => {
      const { from, to } = pieceSpan(PIECES[key]);
      const start = ((from % 360) + 360) % 360;
      return { start, end: start + (to - from) };
    }).sort((a, b) => a.start - b.start);
    for (let i = 0; i < spans.length; i++) {
      const next = i + 1 < spans.length ? spans[i + 1].start : spans[0].start + 360;
      expect(next - spans[i].end).toBeGreaterThanOrEqual(MIN_PIECE_GAP);
    }
  });
});

describe("stops", () => {
  it("starts at the PC, straight ahead", () => {
    expect(STOP_ORDER[0]).toBe("desk");
    expect(Math.abs(yawDelta(0, subjectYaw("desk")))).toBeLessThan(0.5);
  });

  it("turns right through the areas in the header's nav order", () => {
    expect(STOP_ORDER.slice(1)).toEqual(NAV.map((item) => item.section));
  });

  it("puts every subject on its own piece of furniture", () => {
    for (const stop of STOP_KEYS) {
      const { piece, local } = SUBJECTS[stop];
      expect(Math.abs(local[0])).toBeLessThanOrEqual(PIECES[piece].width / 2);
      expect(Math.abs(local[2])).toBeLessThanOrEqual(PIECES[piece].depth / 2);
    }
  });

  it("names whichever stop the reader has turned to, regardless of looking up or down", () => {
    for (const stop of STOP_KEYS) {
      const yaw = subjectYaw(stop);
      expect(facingStop(viewDirection(yaw, 0))).toBe(stop);
      expect(facingStop(viewDirection(yaw + 3, -40))).toBe(stop);
      expect(facingStop(viewDirection(yaw - 3, 40))).toBe(stop);
    }
  });
});

describe("standardView", () => {
  it("stands at the centre at standing height, looking at the subject", () => {
    for (const stop of STOP_KEYS) {
      const view = standardView(stop);
      expect(view.forward).toBe(0);
      expect(view.eyeHeight).toBe(EYE_HEIGHT);
      // The view ray, followed to the subject's distance, arrives at its height.
      const [, y] = subjectPoint(stop);
      expect(EYE_HEIGHT + Math.tan(view.pitch * DEG) * subjectDistance(stop)).toBeCloseTo(y, 6);
    }
  });
});

describe("zoomView", () => {
  it("steps in until the subject fills ZOOM_FILL of the frame's width", () => {
    for (const stop of STOP_KEYS) {
      const view = zoomView(stop, STANDARD_HFOV);
      const away = subjectDistance(stop) - view.forward;
      const share = SUBJECTS[stop].frameWidth / 2 / away / Math.tan((STANDARD_HFOV * DEG) / 2);
      if (view.forward === 0) {
        // Too wide to fit even from the centre — the room is only so big — so it
        // stays at the centre and overfills rather than backing into the wall
        // behind. (The 2.9 m board does this at 3.3 m: about 75%.)
        expect(share).toBeGreaterThanOrEqual(ZOOM_FILL);
      } else if (away <= ZOOM_MIN_CLEARANCE + 1e-9) {
        // Small enough to fit from further in than the clearance allows.
        expect(share).toBeLessThanOrEqual(ZOOM_FILL);
      } else {
        expect(share).toBeCloseTo(ZOOM_FILL, 6);
      }
    }
  });

  it("actually steps in towards everything that fits", () => {
    // Guards the branch above from passing vacuously: only the board is too
    // wide for the room.
    const stayed = STOP_KEYS.filter((stop) => zoomView(stop, STANDARD_HFOV).forward === 0);
    expect(stayed).toEqual(["experience"]);
  });

  it("never steps back past the centre, nor right up against the subject", () => {
    for (const stop of STOP_KEYS) {
      const view = zoomView(stop, STANDARD_HFOV);
      expect(view.forward).toBeGreaterThanOrEqual(0);
      expect(subjectDistance(stop) - view.forward).toBeGreaterThanOrEqual(ZOOM_MIN_CLEARANCE - 1e-9);
    }
  });

  it("sits down at the PC, at a height that faces the screen rather than looking down on it", () => {
    // Standing height looked down 29° and keystoned the screen's text. Sat
    // at 1.12 m it was 7°; at the figure's 1.20 m (2026-10-02) it is 12.7°,
    // looking half-way down to the hands on the keyboard.
    const view = zoomView("desk", STANDARD_HFOV);
    expect(view.eyeHeight).toBe(SEATED_EYE_HEIGHT);
    expect(Math.abs(view.pitch)).toBeLessThan(15);
  });

  it("sees both the whole screen and the hands on the keyboard from the seat (16:9)", () => {
    const view = zoomView("desk", STANDARD_HFOV);
    const halfV = Math.atan(Math.tan((STANDARD_HFOV / 2) * DEG) / (16 / 9)) / DEG;
    const desk = pieceCentreDistance(PIECES.desk);
    const angle = (y: number, away: number) => Math.atan2(y - SEATED_EYE_HEIGHT, away) / DEG - view.pitch;
    const screenTop = angle(MONITORS.gui.y + MONITORS.gui.screen.height / 2, subjectDistance("desk") - view.forward);
    // The nearer hand, the one lowest in the frame.
    const hands = angle(HAND_Y, desk - Math.max(DESK_HANDS[0][2], DESK_HANDS[1][2]) - view.forward);
    expect(screenTop).toBeLessThan(halfV - 1);
    expect(hands).toBeGreaterThan(-halfV + 1);
  });

  it("frames the PC's centre monitor, not the whole desk", () => {
    // Framing the desk (2.1 m of monitors) shrank 22px body text to ~6px.
    expect(SUBJECTS.desk.frameWidth).toBeLessThan(1);
  });

  it("sits down in the same seat on any screen", () => {
    // A seat is a place; a phone's narrower view must not sit the reader
    // further back, behind the chair.
    expect(zoomView("desk", PHONE_HFOV).forward).toBeCloseTo(zoomView("desk", STANDARD_HFOV).forward, 12);
    expect(zoomView("desk", PHONE_HFOV).eyeHeight).toBe(SEATED_EYE_HEIGHT);
  });

  it("keeps the camera inside the room", () => {
    for (const stop of STOP_KEYS) expect(zoomView(stop).forward).toBeLessThan(ROOM_RADIUS);
  });
});

describe("markerPoint", () => {
  it("floats above its subject and a little nearer the centre", () => {
    for (const stop of STOP_KEYS) {
      const [mx, my, mz] = markerPoint(stop);
      const [sx, sy, sz] = subjectPoint(stop);
      expect(my).toBeGreaterThan(sy);
      expect(Math.hypot(mx, mz)).toBeLessThan(Math.hypot(sx, sz));
      // Same direction from the centre: the marker is over its own subject.
      expect(Math.abs(yawDelta(yawOf(mx, mz), yawOf(sx, sz)))).toBeLessThan(1e-9);
      expect(my).toBeLessThan(3.4);
    }
  });
});

describe("hfovForZoom", () => {
  const verticalOf = (hfov: number, aspect: number) => (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / aspect) * 180) / Math.PI;

  it("draws the desktop's stages at the user's 67° and 161°", () => {
    expect(hfovForZoom("standard", false)).toBe(FREE_HFOV);
    // Looking round is wider than a zoom, which is drawn for reading.
    expect(FREE_HFOV).toBeGreaterThan(STANDARD_HFOV);
    expect(hfovForZoom("fisheye", false)).toBe(FISHEYE_HFOV);
  });

  it("gives a phone its own, narrower stages", () => {
    // The desktop's width on a portrait phone is ~110° tall (step 2's ceiling).
    expect(hfovForZoom("standard", true)).toBe(HANDHELD_STANDARD_HFOV);
    expect(hfovForZoom("fisheye", true)).toBe(HANDHELD_FISHEYE_HFOV);
    expect(HANDHELD_STANDARD_HFOV).toBeLessThan(STANDARD_HFOV);
    expect(HANDHELD_FISHEYE_HFOV).toBeLessThan(FISHEYE_HFOV);
    expect(HANDHELD_FISHEYE_HFOV).toBeGreaterThan(HANDHELD_STANDARD_HFOV);
  });

  it("keeps a phone's standard view well short of the ceiling-heavy 110° up and down", () => {
    const vertical = verticalOf(HANDHELD_STANDARD_HFOV, HANDHELD_REFERENCE_ASPECT);
    expect(vertical).toBeLessThan(90);
    expect(vertical).toBeGreaterThan(60);
  });

  it("keeps a phone's fisheye from folding past straight up and down", () => {
    // Stereographic: a point r half-widths out is 2·atan(r·tan(H/2)) off-axis.
    // The top edge of a portrait frame is 1/aspect half-widths up.
    const half = (HANDHELD_FISHEYE_HFOV * Math.PI) / 360;
    const top = 2 * Math.atan((1 / HANDHELD_REFERENCE_ASPECT) * Math.tan(half / 2));
    expect(top).toBeLessThan(Math.PI / 2);
  });
});

describe("lensForZoom", () => {
  it("bends only the fisheye", () => {
    expect(lensForZoom("standard")).toBe(1);
    expect(lensForZoom("fisheye")).toBe(2);
  });
});

describe("the chair", () => {
  const deskDistance = pieceCentreDistance(PIECES.desk);
  const backFromCentre = deskDistance - chairBackZ();

  it("stands behind the seated eye, so sitting down does not put its back in front of the reader", () => {
    expect(backFromCentre).toBeLessThan(zoomView("desk").forward);
    expect(backFromCentre).toBeGreaterThan(zoomView("desk").forward - 0.3);
  });

  it("stays below the line of sight from the middle of the room to the bottom of the PC's screen", () => {
    // Step 2's trap: a 1.19 m back blacked out the lower half of the screen at home.
    const screenDistance = subjectDistance("desk");
    const screenBottom = MONITORS.gui.y - MONITORS.gui.screen.height / 2;
    const sightAtChair = EYE_HEIGHT + ((screenBottom - EYE_HEIGHT) * backFromCentre) / screenDistance;
    expect(CHAIR_BACK_HEIGHT).toBeLessThan(sightAtChair);
  });
});

describe("the main monitor (U3223QE)", () => {
  const main = MONITORS.gui;

  it("keeps its screen's surface where the seat was framed from", () => {
    // The first monitor's face, 2.5 cm in front of z −0.15: the seat, the chair
    // and the seated pitch were all measured from it.
    expect(monitorFace("gui").centre[2]).toBeCloseTo(-0.125, 9);
  });

  it("is the maker's panel round the maker's screen, the frame never thinner than the sides", () => {
    const sides = (main.bezel.width - main.screen.width) / 2;
    const over = (main.bezel.height - main.screen.height - main.chin) / 2;
    expect(sides).toBeCloseTo(0.00765, 9);
    expect(over).toBeCloseTo(sides, 9);
    expect(over + main.chin).toBeCloseTo(0.41 - 0.3922 - 0.00765, 9);
  });

  it("has its base on the desk, behind the keyboard", () => {
    const front = main.z + main.bezel.depth / 2;
    const baseBack = front - MONITOR_STANDS.gui.depth;
    const baseFront = front - MONITOR_STANDS.gui.base.setBack;
    expect(baseBack).toBeGreaterThan(-PIECES.desk.depth / 2);
    expect(baseFront).toBeLessThan(KEYBOARD.z - HHKB.depth / 2);
  });
});

describe("the main monitor's stand", () => {
  it("holds the panel's middle where the stand reaches", () => {
    // The stand holds the panel by its middle, half the frame's height over
    // its bottom edge, which the stand can raise from `lowest` by `travel`.
    const stand = MONITOR_STANDS.gui;
    const half = MONITORS.gui.bezel.height / 2;
    const middle = monitorToDesk("gui", monitorFrameMiddle("gui"))[1] - KEYBOARD.y;
    expect(middle).toBeGreaterThanOrEqual(stand.lowest + half);
    expect(middle).toBeLessThanOrEqual(stand.lowest + stand.travel + half);
  });
});

describe("the video monitor (P2422H, on end, on a kickstand)", () => {
  const video = MONITORS.video;
  const corners = monitorCorners("video");
  const k = kickstand();

  it("is the maker's panel round the maker's screen", () => {
    const sides = (video.bezel.width - video.screen.width) / 2;
    expect(sides).toBeCloseTo(0.00538, 9);
    expect(video.bezel.height - video.screen.height - 2 * sides - video.chin).toBeCloseTo(0, 12);
  });

  it("stands on end, leaning back, its lowest corner on the desk", () => {
    expect(monitorBottomOverDesk("video")).toBeCloseTo(0, 12);
    const ys = corners.map((c) => c[1]);
    // On end: the long side is the tall one, shortened only by the lean.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(video.bezel.width * 0.9);
    // Leaning back: its face looks a little up.
    expect(monitorToDesk("video", [0, 0, 1])[1]).toBeGreaterThan(video.y);
  });

  it("has its thicker strip of frame on the left", () => {
    // Turned a quarter clockwise, the bottom of the frame goes to the left.
    const middle = monitorToDesk("video", monitorFrameMiddle("video"));
    const screen = monitorToDesk("video", [0, 0, 0]);
    const across = [Math.cos(video.yaw), 0, -Math.sin(video.yaw)];
    expect((middle[0] - screen[0]) * across[0] + (middle[2] - screen[2]) * across[2]).toBeLessThan(0);
  });

  it("is held up by its kickstand: hinged on the back of its housing, standing on the desk behind it", () => {
    expect(k.foot[1]).toBeCloseTo(KEYBOARD.y, 12);
    // Behind the panel: the foot is on the far side of the panel's back from its face.
    const normal = monitorToDesk("video", [0, 0, 1]).map((v, i) => v - [video.x, video.y, video.z][i]);
    const toFoot = k.foot.map((v, i) => v - k.hinge[i]);
    expect(toFoot[0] * normal[0] + toFoot[1] * normal[1] + toFoot[2] * normal[2]).toBeLessThan(0);
    expect(k.hinge[1]).toBeGreaterThan(KEYBOARD.y + 0.1);
    expect(k.foot[2]).toBeGreaterThan(-PIECES.desk.depth / 2);
  });

  it("stands clear of the main monitor's frame and the arm's post, in front of the arm", () => {
    const mainRight = MONITORS.gui.bezel.width / 2;
    for (const c of corners) expect(c[0]).toBeGreaterThan(mainRight + 0.005);
    // The kickstand's foot, with its width, keeps off the post.
    const [px, , pz] = armJoints().clamp;
    const post = 0.024;
    const footHalf = KICKSTAND.width / 2 + 0.003;
    const apartX = Math.abs(k.foot[0] - px) - footHalf - post;
    const apartZ = Math.abs(k.foot[2] - pz) - 0.008 - post;
    expect(Math.max(apartX, apartZ)).toBeGreaterThan(0.01);
    for (const c of corners) expect(c[2]).toBeGreaterThan(pz + post);
  });

  it("keeps inside the room's wall", () => {
    for (const c of corners) {
      const [x, , z] = pieceToWorld(PIECES.desk, c);
      expect(Math.hypot(x, z)).toBeLessThan(ROOM_RADIUS - 0.05);
    }
  });
});

describe("the Macintosh's place", () => {
  it("is on the desk's left, clear of the main monitor's frame", () => {
    expect(MAC.x + MAC.width / 2).toBeLessThan(-MONITORS.gui.bezel.width / 2 - 0.02);
    expect(MAC.z - MAC.depth / 2).toBeGreaterThan(-PIECES.desk.depth / 2);
  });
});

describe("the upper monitor and its arm", () => {
  const upper = MONITORS.camera;
  const j = armJoints();

  it("turns a monitor's frame yaw first, then pitch, the way its \"YXZ\" group does", () => {
    // The main monitor is neither turned nor tipped: its frame is the desk's, moved.
    expect(monitorToDesk("gui", [0.1, 0.2, 0.3])).toEqual([0.1, MONITORS.gui.y + 0.2, MONITORS.gui.z + 0.3]);
    // The video one is turned in to the left and leans back: its face swings
    // round towards −X by the yaw, shortened by the lean.
    const { x, y, yaw, pitch } = MONITORS.video;
    const out = monitorToDesk("video", [0, 0, 1]);
    expect(out[0] - x).toBeCloseTo(Math.sin(yaw) * Math.cos(pitch), 12);
    expect(out[1] - y).toBeCloseTo(-Math.sin(pitch), 12);
    // The upper one tips its face down, towards the seat.
    const face = monitorToDesk("camera", [0, 0, 1]);
    expect(face[1] - upper.y).toBeCloseTo(-Math.sin(upper.pitch), 12);
    expect(face[2] - upper.z).toBeCloseTo(Math.cos(upper.pitch), 12);
  });

  it("stands clear above the main monitor, every corner of its frame", () => {
    const mainTop = MONITORS.gui.y + (MONITORS.gui.bezel.height - MONITORS.gui.chin) / 2;
    const { width, height, depth } = upper.bezel;
    for (const x of [-width / 2, width / 2])
      for (const z of [-depth / 2, depth / 2]) expect(monitorToDesk("camera", [x, -height / 2, z])[1]).toBeGreaterThan(mainTop + 0.02);
  });

  it("is a reversed 「く」 seen from the front: out to the right at the elbow, back in to the monitor", () => {
    expect(j.elbow[0]).toBeGreaterThan(j.shoulder[0]);
    expect(j.elbow[0]).toBeGreaterThan(j.wrist[0]);
    expect(j.elbow[1]).toBeGreaterThan(j.shoulder[1]);
    expect(j.elbow[1]).toBeLessThan(j.wrist[1]);
    expect(j.wrist[0]).toBeGreaterThan(j.head[0]);
  });

  it("is clamped to the desk's back edge, on its right", () => {
    expect(j.clamp[0]).toBeGreaterThan(MONITORS.gui.bezel.width / 2);
    expect(j.clamp[2]).toBeGreaterThan(-PIECES.desk.depth / 2);
    expect(j.clamp[2]).toBeLessThan(-PIECES.desk.depth / 2 + 0.05);
  });

  it("holds the monitor from behind: the head is behind its back plate, the beams behind the head", () => {
    const plateBack = MONITOR_ARM.plate.z - MONITOR_ARM.plate.thickness / 2;
    expect(MONITOR_ARM.head[2]).toBeLessThan(plateBack);
    expect(j.wrist[2]).toBeLessThan(j.head[2]);
    expect(j.elbow[2]).toBeLessThan(j.wrist[2]);
  });
});

describe("wallRibAngles", () => {
  it("keeps every rib off the door and the porthole", () => {
    for (const angle of wallRibAngles()) {
      for (const key of ["door", "porthole"] as const) {
        const { from, to } = pieceSpan(PIECES[key]);
        // Signed, across the seam at 0°/360° — not `% 360` (step 1's trap).
        expect(Math.abs(yawDelta((from + to) / 2, angle))).toBeGreaterThan((to - from) / 2);
      }
    }
  });

  it("leaves out only the ribs those two would have cut through", () => {
    // 16 seams round the room; the door and the porthole each lose one or two.
    const ribs = wallRibAngles();
    expect(ribs.length).toBeGreaterThanOrEqual(360 / RIB_STEP - 4);
    expect(ribs.length).toBeLessThan(360 / RIB_STEP);
  });
});

describe("the floor's grid", () => {
  it("puts no vertex straight under the camera, on the cube cameras' planes", () => {
    // The fisheye's cube cameras look along the axes from the centre; a vertex
    // on x = 0 or z = 0 under the camera sits on their camera planes (w = 0),
    // and the floor's triangles came out in front of the desk (2026-10-01).
    for (const line of floorGridLines()) expect(Math.abs(line)).toBeGreaterThan(0.1);
  });

  it("still reaches the wall all round", () => {
    const lines = floorGridLines();
    expect(lines[0]).toBeLessThanOrEqual(-ROOM_RADIUS);
    expect(lines[lines.length - 1]).toBeGreaterThanOrEqual(ROOM_RADIUS);
  });
});
