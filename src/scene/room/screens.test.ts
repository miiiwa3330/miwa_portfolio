import { describe, expect, it } from "vitest";
import { DESK_SCREEN, DESK_SCREEN_PX, HOLOGRAM_PANEL, piecePanel } from "./screens";
import { STANDARD_HFOV, ZOOM_FILL, zoomView, MONITOR_BEZEL, MONITOR_FACE_Z, MONITOR_GLASS, MONITOR_SCREEN, monitorFace, subjectPoint } from "./layout";

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
    const glassFront = MONITOR_GLASS.z + MONITOR_GLASS.thickness / 2;
    expect(glassFront).toBeGreaterThan(MONITOR_BEZEL.depth / 2);
    expect(MONITOR_FACE_Z).toBeGreaterThan(glassFront);
    expect(MONITOR_FACE_Z - glassFront).toBeLessThan(0.002);
  });

  it("is the screen's own size and shape, so the HTML fills it without stretching", () => {
    expect(DESK_SCREEN.width).toBe(MONITOR_SCREEN.width);
    expect(DESK_SCREEN.width / DESK_SCREEN.height).toBeCloseTo(DESK_SCREEN_PX.width / DESK_SCREEN_PX.height, 2);
  });
});

describe("piecePanel", () => {
  it("turns a panel the way a three.js group's rotation.y does", () => {
    // The left monitor is turned +0.35 rad: its face swings round to the right,
    // in towards the chair, as `RoomScene` draws it.
    const left = monitorFace("video");
    const panel = piecePanel("desk", left.centre, left.yaw, MONITOR_SCREEN, DESK_SCREEN_PX);
    expect(panel.normal[0]).toBeCloseTo(Math.sin(left.yaw), 9);
    expect(panel.normal[2]).toBeCloseTo(Math.cos(left.yaw), 9);
    // Still at right angles to its own right-hand edge.
    expect(dot(panel.normal, panel.right)).toBeCloseTo(0, 12);
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
