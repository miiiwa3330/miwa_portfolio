import { describe, expect, it } from "vitest";
import {
  ACCESS_HUBS,
  CONTINENT_DOTS,
  JAPAN_COORD,
  JAPAN_POLYGONS,
  WORLD_POLYGONS,
  arcPoints,
  latLonToEquirectangular,
  latLonToUnit,
  pulseProgress,
} from "./holoMap";

describe("latLonToUnit", () => {
  it("returns unit-length vectors", () => {
    for (const coord of [JAPAN_COORD, ...ACCESS_HUBS, ...CONTINENT_DOTS]) {
      const [x, y, z] = latLonToUnit(coord.lat, coord.lon);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    }
  });

  it("places North Pole at +Y, South Pole at -Y, and equator at y = 0", () => {
    const [nx, ny, nz] = latLonToUnit(90, 0);
    expect(nx).toBeCloseTo(0, 9);
    expect(ny).toBeCloseTo(1, 9);
    expect(nz).toBeCloseTo(0, 9);

    const [sx, sy, sz] = latLonToUnit(-90, 0);
    expect(sx).toBeCloseTo(0, 9);
    expect(sy).toBeCloseTo(-1, 9);
    expect(sz).toBeCloseTo(0, 9);

    expect(latLonToUnit(0, 45)[1]).toBeCloseTo(0, 9);
  });
});

describe("arcPoints", () => {
  it("starts and ends on the sphere surface and arches strictly outside it at the midpoint", () => {
    const radius = 0.22;
    const steps = 24;
    const pts = arcPoints({ lat: 40.71, lon: -74.01 }, JAPAN_COORD, radius, steps);
    expect(pts).toHaveLength(steps + 1);

    const rStart = Math.hypot(...pts[0]);
    const rEnd = Math.hypot(...pts[pts.length - 1]);
    const rMid = Math.hypot(...pts[steps / 2]);

    expect(rStart).toBeCloseTo(radius, 9);
    expect(rEnd).toBeCloseTo(radius, 9);
    expect(rMid).toBeGreaterThan(radius);

    for (let i = 1; i < pts.length - 1; i++) {
      expect(Math.hypot(...pts[i])).toBeGreaterThan(radius);
    }
  });

  it("rises higher for distant hubs than nearby regional hops", () => {
    const radius = 0.22;
    const seoulArc = arcPoints({ lat: 37.57, lon: 126.98 }, JAPAN_COORD, radius, 20);
    const saoPauloArc = arcPoints({ lat: -23.55, lon: -46.63 }, JAPAN_COORD, radius, 20);

    const seoulMid = Math.hypot(...seoulArc[10]);
    const saoPauloMid = Math.hypot(...saoPauloArc[10]);
    expect(saoPauloMid).toBeGreaterThan(seoulMid);
  });
});

describe("pulseProgress", () => {
  it("stays in [0, 1) across zero, negative, and large timestamps", () => {
    for (const t of [-5.2, 0, 0.37, 2.6, 123.456]) {
      for (const phase of [0, 0.25, 0.99]) {
        const p = pulseProgress(t, phase, 2.6);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      }
    }
  });
});

describe("geographic datasets", () => {
  it("keeps all continent dots and hubs within valid lat/lon bounds", () => {
    expect(CONTINENT_DOTS.length).toBeGreaterThan(150);
    expect(ACCESS_HUBS.length).toBeGreaterThan(10);
    for (const c of [JAPAN_COORD, ...ACCESS_HUBS, ...CONTINENT_DOTS]) {
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThanOrEqual(180);
    }
  });

  it("defines valid closed continent and Japan polygons and maps equirectangular pixels accurately", () => {
    expect(WORLD_POLYGONS.length).toBeGreaterThanOrEqual(12);
    expect(JAPAN_POLYGONS.length).toBe(4);
    for (const poly of [...WORLD_POLYGONS, ...JAPAN_POLYGONS]) {
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        expect(p.lat).toBeGreaterThanOrEqual(-90);
        expect(p.lat).toBeLessThanOrEqual(90);
        expect(p.lon).toBeGreaterThanOrEqual(-180);
        expect(p.lon).toBeLessThanOrEqual(180);
      }
    }
    expect(latLonToEquirectangular(0, 0, 2048, 1024)).toEqual([1024, 512]);
    expect(latLonToEquirectangular(90, -180, 2048, 1024)).toEqual([0, 0]);
    expect(latLonToEquirectangular(-90, 180, 2048, 1024)).toEqual([2048, 1024]);
  });
});
