import { describe, expect, it } from "vitest";
import { DESK_SCREEN, DESK_SCREEN_PX, HOLOGRAM_PANEL, MAC_SCREEN, panelPoint, piecePanel } from "./screens";
import { STANDARD_HFOV, ZOOM_FILL, zoomView, MONITORS, PIECES, macToDesk, monitorFace, monitorFaceZ, monitorGlass, pieceToWorld, subjectPoint } from "./layout";
import { MAC_CASE, macFace } from "./macCase";

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe("the PC's screen", () => {
  it("is the middle monitor's face — the point a seated zoom frames", () => {
    const subject = subjectPoint("desk");
    for (let i = 0; i < 3; i++) expect(DESK_SCREEN.centre[i]).toBeCloseTo(subject[i], 12);
  });

  it("faces the middle of the room", () => {
    const [x, , z] = DESK_SCREEN.centre;
    const toCentre = [-x, 0, -z].map((v) => v / Math.hypot(x, z));
    expect(dot(DESK_SCREEN.normal, toCentre)).toBeCloseTo(1, 9);
  });

  it("reads left to right for someone standing in the middle looking at it", () => {
    // The desk is straight ahead at yaw 0 (world -Z); that reader's right is +X.
    expect(dot(DESK_SCREEN.right, [1, 0, 0])).toBeCloseTo(1, 9);
    expect(DESK_SCREEN.up).toEqual([0, 1, 0]);
  });

  it("lies on the lit glass, just in front of it — not behind the bezel, nor floating off it", () => {
    const glass = monitorGlass("gui");
    const glassFront = glass.z + glass.thickness / 2;
    expect(glassFront).toBeGreaterThan(MONITORS.gui.bezel.depth / 2);
    expect(monitorFaceZ("gui")).toBeGreaterThan(glassFront);
    expect(monitorFaceZ("gui") - glassFront).toBeLessThan(0.002);
  });

  it("is the screen's own size and shape, so the HTML fills it without stretching", () => {
    expect(DESK_SCREEN.width).toBe(MONITORS.gui.screen.width);
    expect(DESK_SCREEN.width / DESK_SCREEN.height).toBeCloseTo(DESK_SCREEN_PX.width / DESK_SCREEN_PX.height, 2);
  });
});

describe("piecePanel", () => {
  it("turns a panel the way a three.js group's rotation.y does", () => {
    // The left monitor is turned +0.35 rad: its face swings round to the right,
    // in towards the chair, as `RoomScene` draws it.
    const left = monitorFace("video");
    const panel = piecePanel("desk", left.centre, left.yaw, MONITORS.video.screen, DESK_SCREEN_PX);
    expect(panel.normal[0]).toBeCloseTo(Math.sin(left.yaw), 9);
    expect(panel.normal[2]).toBeCloseTo(Math.cos(left.yaw), 9);
    // Still at right angles to its own right-hand edge.
    expect(dot(panel.normal, panel.right)).toBeCloseTo(0, 12);
  });
});

describe("the Mac's screen", () => {
  // The picture's middle, down the leaning face, and its top and bottom edges in the same plane.
  const { recess, picture } = MAC_CASE;
  const down = recess.top + recess.height / 2 - recess.lift;
  const out = -recess.depth + 0.0006;
  const world = (d: number) => pieceToWorld(PIECES.desk, macToDesk(macFace(0, d, out)));

  it("leans back with the Mac's front: its top and bottom edges are on the face, 5 mm apart in depth", () => {
    const top = world(down - picture.height / 2);
    const bottom = world(down + picture.height / 2);
    for (let i = 0; i < 3; i++) {
      expect(MAC_SCREEN.centre[i] + (MAC_SCREEN.up[i] * picture.height) / 2).toBeCloseTo(top[i], 9);
      expect(MAC_SCREEN.centre[i] - (MAC_SCREEN.up[i] * picture.height) / 2).toBeCloseTo(bottom[i], 9);
    }
    expect(dot(MAC_SCREEN.normal, MAC_SCREEN.up)).toBeCloseTo(0, 12);
    expect(dot(MAC_SCREEN.normal, MAC_SCREEN.right)).toBeCloseTo(0, 12);
    // Looking a little up: its face turns towards the sky.
    expect(MAC_SCREEN.normal[1]).toBeGreaterThan(0.09);
  });

  it("finds the reader's pointer on it where the picture is, looking down at it from the chair", () => {
    // From the seated eye's height over the desk's front, at a point 10 mm under the picture's top edge.
    const target = world(down - picture.height / 2 + 0.01);
    const eye = pieceToWorld(PIECES.desk, [0, 1.2, 0.5]);
    const dir = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]] as [number, number, number];
    const hit = panelPoint(MAC_SCREEN, eye, dir);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(picture.px.width / 2, 6);
    expect(hit!.y).toBeCloseTo((0.01 / picture.height) * picture.px.height, 6);
  });
});

describe("the hologram's text", () => {
  it("stands where the zoom into About looks, facing the middle of the room square on", () => {
    const subject = subjectPoint("about");
    for (let i = 0; i < 3; i++) expect(HOLOGRAM_PANEL.centre[i]).toBeCloseTo(subject[i], 12);
    const [x, , z] = HOLOGRAM_PANEL.centre;
    const toCentre = [-x, 0, -z].map((v) => v / Math.hypot(x, z));
    expect(dot(HOLOGRAM_PANEL.normal, toCentre)).toBeCloseTo(1, 9);
  });

  it("fits the zoomed view: no wider than the framed width, and clear of the header and HOME above and below", () => {
    const view = zoomView("about", STANDARD_HFOV);
    const [x, , z] = HOLOGRAM_PANEL.centre;
    const away = Math.hypot(x, z) - view.forward;
    const halfWidth = away * Math.tan(((STANDARD_HFOV / 2) * Math.PI) / 180);
    // 16:9 frame: the half-height is the half-width over the aspect.
    const halfHeight = halfWidth / (16 / 9);
    expect(HOLOGRAM_PANEL.width / 2).toBeLessThan(halfWidth * ZOOM_FILL);
    expect(HOLOGRAM_PANEL.height / 2).toBeLessThan(halfHeight * 0.8);
  });
});
