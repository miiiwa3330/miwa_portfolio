import { describe, expect, it } from "vitest";
import { defaultView, partFor, partGroups, PARTS } from "./parts";
import { ROOM_RADIUS, WALL_HEIGHT } from "@/scene/room/layout";
import { eyeFrom } from "./orbit";

const horizontal = (p: readonly number[]) => Math.hypot(p[0], p[2]);

describe("the lab's parts", () => {
  it("have unique ids", () => {
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });

  it("put the eye inside the room and under the ceiling, so nothing is looked at through a wall", () => {
    for (const part of PARTS) {
      expect(horizontal(part.eye), part.id).toBeLessThan(ROOM_RADIUS - 0.05);
      expect(part.eye[1], part.id).toBeGreaterThan(0);
      expect(part.eye[1], part.id).toBeLessThan(WALL_HEIGHT);
    }
  });

  it("look at a point inside the room, off the eye", () => {
    for (const part of PARTS) {
      expect(horizontal(part.target), part.id).toBeLessThan(ROOM_RADIUS);
      expect(part.target[1], part.id).toBeGreaterThan(0);
      expect(part.target[1], part.id).toBeLessThan(WALL_HEIGHT);
      expect(defaultView(part).d, part.id).toBeGreaterThan(0.2);
    }
  });

  it("start from a view that really puts the eye where the part says", () => {
    for (const part of PARTS) {
      const eye = eyeFrom(part.target, defaultView(part));
      expect(eye[0], part.id).toBeCloseTo(part.eye[0], 6);
      expect(eye[1], part.id).toBeCloseTo(part.eye[1], 6);
      expect(eye[2], part.id).toBeCloseTo(part.eye[2], 6);
    }
  });

  it("look at a piece from the room's side, not from behind it (the +Z of its frame faces the centre)", () => {
    // A piece's eye is nearer the middle of the room than the point it looks at.
    for (const part of PARTS.filter((p) => p.piece !== "shell")) {
      expect(horizontal(part.eye), part.id).toBeLessThan(horizontal(part.target));
    }
  });

  it("find a part by id, and take the first for a missing or unknown id", () => {
    expect(partFor("shelf").id).toBe("shelf");
    expect(partFor(null).id).toBe(PARTS[0].id);
    expect(partFor("nonsense").id).toBe(PARTS[0].id);
  });

  it("sit in groups that, put together, are every part once", () => {
    const grouped = partGroups().flatMap((g) => g.parts.map((p) => p.id));
    expect(grouped.sort()).toEqual(PARTS.map((p) => p.id).sort());
  });
});
