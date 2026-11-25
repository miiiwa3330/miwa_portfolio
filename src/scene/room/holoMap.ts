/**
 * Pure math and geographic data for the desk's 3D holographic access map:
 * a glowing Earth with animated connection arcs flying from global cities into
 * Japan (Tokyo), driven deterministically by `sceneClock` time.
 *
 * Kept free of three.js and React so every coordinate, arc elevation and
 * pulse wrap can be unit-tested in Node.
 */

export type GeoCoord = {
  lat: number;
  lon: number;
};

export type AccessHub = GeoCoord & {
  id: string;
  /** Offset in `[0, 1)` so arcs do not all pulse in lockstep. */
  phase: number;
};

const DEG = Math.PI / 180;

/** Target hub in Japan (Tokyo). */
export const JAPAN_COORD: GeoCoord = { lat: 35.68, lon: 139.69 };

/** Global cities sending access arcs toward Japan. */
export const ACCESS_HUBS: readonly AccessHub[] = [
  { id: "sf", lat: 37.77, lon: -122.42, phase: 0.05 },
  { id: "la", lat: 34.05, lon: -118.24, phase: 0.42 },
  { id: "ny", lat: 40.71, lon: -74.01, phase: 0.18 },
  { id: "toronto", lat: 43.65, lon: -79.38, phase: 0.71 },
  { id: "saopaulo", lat: -23.55, lon: -46.63, phase: 0.56 },
  { id: "london", lat: 51.51, lon: -0.13, phase: 0.29 },
  { id: "paris", lat: 48.86, lon: 2.35, phase: 0.83 },
  { id: "berlin", lat: 52.52, lon: 13.4, phase: 0.11 },
  { id: "amsterdam", lat: 52.37, lon: 4.9, phase: 0.64 },
  { id: "stockholm", lat: 59.33, lon: 18.07, phase: 0.48 },
  { id: "dubai", lat: 25.2, lon: 55.27, phase: 0.34 },
  { id: "mumbai", lat: 19.08, lon: 72.88, phase: 0.76 },
  { id: "singapore", lat: 1.35, lon: 103.82, phase: 0.23 },
  { id: "sydney", lat: -33.87, lon: 151.21, phase: 0.89 },
  { id: "seoul", lat: 37.57, lon: 126.98, phase: 0.52 },
  { id: "taipei", lat: 25.03, lon: 121.57, phase: 0.94 },
];

/**
 * Simplified continental coastline & interior grid points `(lat, lon)` so the
 * holographic dot cloud clearly reads as Earth without shipping a heavy geojson.
 */
export const CONTINENT_DOTS: readonly GeoCoord[] = [
  // North America
  { lat: 64, lon: -162 }, { lat: 68, lon: -150 }, { lat: 66, lon: -135 }, { lat: 60, lon: -140 },
  { lat: 56, lon: -132 }, { lat: 50, lon: -126 }, { lat: 46, lon: -124 }, { lat: 40, lon: -124 },
  { lat: 35, lon: -120 }, { lat: 30, lon: -115 }, { lat: 24, lon: -108 }, { lat: 19, lon: -104 },
  { lat: 15, lon: -94 }, { lat: 12, lon: -86 }, { lat: 9, lon: -79 },
  { lat: 62, lon: -120 }, { lat: 55, lon: -115 }, { lat: 48, lon: -112 }, { lat: 42, lon: -110 },
  { lat: 36, lon: -106 }, { lat: 30, lon: -102 }, { lat: 24, lon: -99 },
  { lat: 60, lon: -100 }, { lat: 52, lon: -98 }, { lat: 45, lon: -94 }, { lat: 39, lon: -92 },
  { lat: 33, lon: -94 }, { lat: 28, lon: -96 },
  { lat: 56, lon: -82 }, { lat: 49, lon: -84 }, { lat: 44, lon: -79 }, { lat: 41, lon: -74 },
  { lat: 36, lon: -76 }, { lat: 31, lon: -81 }, { lat: 26, lon: -80 }, { lat: 29, lon: -85 },
  { lat: 47, lon: -68 }, { lat: 45, lon: -64 }, { lat: 52, lon: -60 },
  // Greenland
  { lat: 76, lon: -42 }, { lat: 72, lon: -50 }, { lat: 68, lon: -36 }, { lat: 63, lon: -44 },
  // South America
  { lat: 10, lon: -74 }, { lat: 6, lon: -77 }, { lat: 1, lon: -79 }, { lat: -5, lon: -81 },
  { lat: -12, lon: -77 }, { lat: -18, lon: -71 }, { lat: -26, lon: -71 }, { lat: -35, lon: -72 },
  { lat: -44, lon: -73 }, { lat: -52, lon: -71 },
  { lat: 8, lon: -66 }, { lat: 4, lon: -62 }, { lat: -2, lon: -68 }, { lat: -8, lon: -64 },
  { lat: -15, lon: -62 }, { lat: -22, lon: -64 }, { lat: -30, lon: -64 }, { lat: -38, lon: -62 },
  { lat: -46, lon: -66 },
  { lat: 5, lon: -54 }, { lat: 0, lon: -50 }, { lat: -4, lon: -40 }, { lat: -8, lon: -35 },
  { lat: -15, lon: -39 }, { lat: -22, lon: -42 }, { lat: -28, lon: -49 }, { lat: -34, lon: -54 },
  { lat: -12, lon: -50 }, { lat: -18, lon: -48 },
  // Europe
  { lat: 37, lon: -9 }, { lat: 42, lon: -9 }, { lat: 44, lon: -2 }, { lat: 48, lon: -4 },
  { lat: 51, lon: -3 }, { lat: 55, lon: -4 }, { lat: 58, lon: -4 },
  { lat: 40, lon: -4 }, { lat: 44, lon: 4 }, { lat: 48, lon: 2 }, { lat: 51, lon: 4 },
  { lat: 54, lon: 10 }, { lat: 58, lon: 8 }, { lat: 62, lon: 8 }, { lat: 66, lon: 14 },
  { lat: 69, lon: 22 }, { lat: 64, lon: 24 }, { lat: 59, lon: 18 }, { lat: 55, lon: 16 },
  { lat: 42, lon: 12 }, { lat: 46, lon: 14 }, { lat: 50, lon: 16 }, { lat: 53, lon: 20 },
  { lat: 40, lon: 22 }, { lat: 45, lon: 24 }, { lat: 50, lon: 28 }, { lat: 55, lon: 30 },
  { lat: 58, lon: 36 }, { lat: 52, lon: 38 }, { lat: 47, lon: 36 },
  // Africa
  { lat: 35, lon: -6 }, { lat: 32, lon: -8 }, { lat: 24, lon: -15 }, { lat: 16, lon: -17 },
  { lat: 10, lon: -14 }, { lat: 5, lon: -5 }, { lat: 5, lon: 4 }, { lat: 2, lon: 10 },
  { lat: -6, lon: 12 }, { lat: -14, lon: 13 }, { lat: -22, lon: 14 }, { lat: -32, lon: 18 },
  { lat: -34, lon: 24 }, { lat: -28, lon: 32 }, { lat: -20, lon: 35 }, { lat: -12, lon: 40 },
  { lat: -4, lon: 40 }, { lat: 4, lon: 45 }, { lat: 11, lon: 50 }, { lat: 15, lon: 41 },
  { lat: 22, lon: 36 }, { lat: 30, lon: 32 }, { lat: 33, lon: 22 }, { lat: 36, lon: 10 },
  { lat: 26, lon: 6 }, { lat: 22, lon: 16 }, { lat: 16, lon: 22 }, { lat: 12, lon: 10 },
  { lat: 6, lon: 20 }, { lat: 0, lon: 26 }, { lat: -8, lon: 26 }, { lat: -16, lon: 24 },
  { lat: -24, lon: 24 }, { lat: -18, lon: 47 }, { lat: -23, lon: 45 },
  // Asia
  { lat: 41, lon: 30 }, { lat: 38, lon: 38 }, { lat: 32, lon: 36 }, { lat: 26, lon: 40 },
  { lat: 18, lon: 44 }, { lat: 14, lon: 48 }, { lat: 20, lon: 56 }, { lat: 25, lon: 55 },
  { lat: 30, lon: 48 }, { lat: 36, lon: 50 }, { lat: 34, lon: 62 }, { lat: 26, lon: 66 },
  { lat: 22, lon: 70 }, { lat: 16, lon: 74 }, { lat: 9, lon: 78 }, { lat: 14, lon: 80 },
  { lat: 21, lon: 86 }, { lat: 26, lon: 84 }, { lat: 29, lon: 78 },
  { lat: 42, lon: 56 }, { lat: 48, lon: 64 }, { lat: 55, lon: 62 }, { lat: 62, lon: 68 },
  { lat: 68, lon: 78 }, { lat: 66, lon: 96 }, { lat: 62, lon: 112 }, { lat: 68, lon: 128 },
  { lat: 67, lon: 148 }, { lat: 64, lon: 168 }, { lat: 56, lon: 160 }, { lat: 54, lon: 140 },
  { lat: 55, lon: 84 }, { lat: 50, lon: 92 }, { lat: 46, lon: 82 }, { lat: 42, lon: 76 },
  { lat: 50, lon: 106 }, { lat: 52, lon: 120 }, { lat: 46, lon: 126 }, { lat: 41, lon: 122 },
  { lat: 38, lon: 118 }, { lat: 34, lon: 120 }, { lat: 30, lon: 122 }, { lat: 24, lon: 118 },
  { lat: 21, lon: 110 }, { lat: 16, lon: 108 }, { lat: 10, lon: 106 }, { lat: 13, lon: 100 },
  { lat: 7, lon: 100 }, { lat: 2, lon: 103 },
  { lat: 36, lon: 100 }, { lat: 32, lon: 108 }, { lat: 26, lon: 104 }, { lat: 21, lon: 96 },
  { lat: 39, lon: 127 }, { lat: 35, lon: 128 },
  // Maritime SE Asia
  { lat: 14, lon: 121 }, { lat: 8, lon: 124 }, { lat: 0, lon: 114 }, { lat: -6, lon: 108 },
  { lat: -7, lon: 114 }, { lat: -2, lon: 136 },
  // Japan (dense highlight)
  { lat: 43.06, lon: 141.35 }, { lat: 41.8, lon: 140.7 }, { lat: 39.7, lon: 141.1 },
  { lat: 38.26, lon: 140.87 }, { lat: 36.56, lon: 136.65 }, { lat: 35.68, lon: 139.69 },
  { lat: 35.18, lon: 136.91 }, { lat: 34.69, lon: 135.5 }, { lat: 34.39, lon: 132.46 },
  { lat: 33.59, lon: 130.4 }, { lat: 31.59, lon: 130.56 },
  // Australia & New Zealand
  { lat: -13, lon: 131 }, { lat: -15, lon: 125 }, { lat: -22, lon: 114 }, { lat: -31, lon: 116 },
  { lat: -34, lon: 122 }, { lat: -33, lon: 134 }, { lat: -38, lon: 144 }, { lat: -34, lon: 151 },
  { lat: -27, lon: 153 }, { lat: -19, lon: 147 }, { lat: -12, lon: 142 }, { lat: -24, lon: 134 },
  { lat: -37, lon: 175 }, { lat: -43, lon: 172 },
];

/**
 * Detailed continental and major-island polygons `(lat, lon)` for rendering a
 * crisp equirectangular holographic world map synchronized 1:1 with `latLonToUnit`.
 */
export const WORLD_POLYGONS: readonly (readonly GeoCoord[])[] = [
  // North America (with Alaska, Hudson Bay, Florida, Mexico & Central America)
  [
    { lat: 71, lon: -156 }, { lat: 70, lon: -140 }, { lat: 69, lon: -133 }, { lat: 71, lon: -125 },
    { lat: 68, lon: -110 }, { lat: 69, lon: -95 }, { lat: 66, lon: -83 }, { lat: 62, lon: -78 },
    { lat: 55, lon: -79 }, { lat: 52, lon: -81 }, { lat: 57, lon: -89 }, { lat: 60, lon: -94 },
    { lat: 63, lon: -92 }, { lat: 67, lon: -86 }, { lat: 63, lon: -74 }, { lat: 60, lon: -65 },
    { lat: 54, lon: -57 }, { lat: 47, lon: -53 }, { lat: 45, lon: -61 }, { lat: 44, lon: -66 },
    { lat: 41, lon: -70 }, { lat: 40, lon: -74 }, { lat: 37, lon: -76 }, { lat: 33, lon: -79 },
    { lat: 26, lon: -80 }, { lat: 25, lon: -82 }, { lat: 29, lon: -83 }, { lat: 30, lon: -88 },
    { lat: 29, lon: -95 }, { lat: 26, lon: -97 }, { lat: 21, lon: -97 }, { lat: 19, lon: -91 },
    { lat: 21, lon: -87 }, { lat: 16, lon: -88 }, { lat: 15, lon: -84 }, { lat: 11, lon: -84 },
    { lat: 9, lon: -79 }, { lat: 8, lon: -82 }, { lat: 11, lon: -86 }, { lat: 14, lon: -92 },
    { lat: 17, lon: -101 }, { lat: 21, lon: -106 }, { lat: 24, lon: -107 }, { lat: 28, lon: -111 },
    { lat: 23, lon: -110 }, { lat: 28, lon: -114 }, { lat: 32, lon: -117 }, { lat: 35, lon: -121 },
    { lat: 40, lon: -124 }, { lat: 48, lon: -125 }, { lat: 54, lon: -131 }, { lat: 59, lon: -139 },
    { lat: 60, lon: -151 }, { lat: 56, lon: -159 }, { lat: 59, lon: -162 }, { lat: 64, lon: -166 },
    { lat: 66, lon: -165 }, { lat: 69, lon: -163 },
  ],
  // Greenland
  [
    { lat: 83, lon: -34 }, { lat: 81, lon: -18 }, { lat: 75, lon: -19 }, { lat: 69, lon: -24 },
    { lat: 60, lon: -44 }, { lat: 64, lon: -52 }, { lat: 71, lon: -55 }, { lat: 77, lon: -68 },
    { lat: 81, lon: -58 },
  ],
  // Cuba & Caribbean
  [
    { lat: 23, lon: -83 }, { lat: 23, lon: -79 }, { lat: 21, lon: -75 }, { lat: 20, lon: -77 }, { lat: 22, lon: -82 },
  ],
  // South America
  [
    { lat: 11, lon: -75 }, { lat: 12, lon: -71 }, { lat: 10, lon: -63 }, { lat: 7, lon: -58 },
    { lat: 4, lon: -52 }, { lat: 0, lon: -50 }, { lat: -3, lon: -41 }, { lat: -6, lon: -35 },
    { lat: -12, lon: -38 }, { lat: -22, lon: -41 }, { lat: -25, lon: -48 }, { lat: -33, lon: -52 },
    { lat: -36, lon: -57 }, { lat: -41, lon: -63 }, { lat: -47, lon: -66 }, { lat: -54, lon: -67 },
    { lat: -55, lon: -71 }, { lat: -47, lon: -75 }, { lat: -38, lon: -74 }, { lat: -28, lon: -71 },
    { lat: -18, lon: -71 }, { lat: -12, lon: -77 }, { lat: -5, lon: -81 }, { lat: 1, lon: -80 },
    { lat: 8, lon: -78 },
  ],
  // Great Britain & Ireland
  [
    { lat: 58, lon: -5 }, { lat: 58, lon: -2 }, { lat: 54, lon: 0 }, { lat: 51, lon: 1 },
    { lat: 50, lon: -5 }, { lat: 54, lon: -4 },
  ],
  [
    { lat: 55, lon: -8 }, { lat: 55, lon: -6 }, { lat: 52, lon: -6 }, { lat: 52, lon: -10 },
  ],
  // Iceland
  [
    { lat: 66, lon: -24 }, { lat: 66, lon: -14 }, { lat: 64, lon: -15 }, { lat: 64, lon: -23 },
  ],
  // Eurasia (Europe + Arabia + India + East & SE Asia + Siberia)
  [
    { lat: 37, lon: -9 }, { lat: 43, lon: -9 }, { lat: 44, lon: -2 }, { lat: 48, lon: -5 },
    { lat: 51, lon: 2 }, { lat: 54, lon: 8 }, { lat: 57, lon: 9 }, { lat: 55, lon: 11 },
    { lat: 59, lon: 11 }, { lat: 62, lon: 5 }, { lat: 68, lon: 15 }, { lat: 71, lon: 26 },
    { lat: 69, lon: 34 }, { lat: 66, lon: 40 }, { lat: 68, lon: 46 }, { lat: 69, lon: 62 },
    { lat: 73, lon: 72 }, { lat: 74, lon: 86 }, { lat: 77, lon: 104 }, { lat: 73, lon: 124 },
    { lat: 71, lon: 142 }, { lat: 69, lon: 162 }, { lat: 66, lon: 178 }, { lat: 62, lon: 176 },
    { lat: 58, lon: 162 }, { lat: 52, lon: 157 }, { lat: 58, lon: 151 }, { lat: 54, lon: 141 },
    { lat: 47, lon: 139 }, { lat: 42, lon: 131 }, { lat: 39, lon: 128 }, { lat: 35, lon: 129 },
    { lat: 35, lon: 126 }, { lat: 39, lon: 124 }, { lat: 40, lon: 120 }, { lat: 37, lon: 122 },
    { lat: 32, lon: 122 }, { lat: 26, lon: 120 }, { lat: 22, lon: 114 }, { lat: 20, lon: 107 },
    { lat: 15, lon: 109 }, { lat: 10, lon: 106 }, { lat: 13, lon: 101 }, { lat: 7, lon: 103 },
    { lat: 2, lon: 104 }, { lat: 3, lon: 101 }, { lat: 10, lon: 98 }, { lat: 16, lon: 97 },
    { lat: 16, lon: 94 }, { lat: 22, lon: 91 }, { lat: 19, lon: 85 }, { lat: 13, lon: 80 },
    { lat: 8, lon: 78 }, { lat: 14, lon: 74 }, { lat: 21, lon: 72 }, { lat: 23, lon: 69 },
    { lat: 25, lon: 63 }, { lat: 26, lon: 57 }, { lat: 30, lon: 49 }, { lat: 25, lon: 52 },
    { lat: 22, lon: 59 }, { lat: 16, lon: 53 }, { lat: 13, lon: 44 }, { lat: 20, lon: 40 },
    { lat: 29, lon: 35 }, { lat: 31, lon: 33 }, { lat: 36, lon: 36 }, { lat: 37, lon: 27 },
    { lat: 41, lon: 29 }, { lat: 42, lon: 28 }, { lat: 46, lon: 33 }, { lat: 45, lon: 38 },
    { lat: 42, lon: 41 }, { lat: 41, lon: 28 }, { lat: 38, lon: 24 }, { lat: 39, lon: 20 },
    { lat: 44, lon: 14 }, { lat: 40, lon: 18 }, { lat: 38, lon: 16 }, { lat: 41, lon: 13 },
    { lat: 44, lon: 9 }, { lat: 42, lon: 3 }, { lat: 38, lon: 0 }, { lat: 36, lon: -6 },
  ],
  // Africa
  [
    { lat: 35, lon: -6 }, { lat: 37, lon: 10 }, { lat: 33, lon: 12 }, { lat: 31, lon: 20 },
    { lat: 32, lon: 32 }, { lat: 26, lon: 35 }, { lat: 16, lon: 40 }, { lat: 12, lon: 44 },
    { lat: 12, lon: 51 }, { lat: 4, lon: 47 }, { lat: -3, lon: 41 }, { lat: -11, lon: 40 },
    { lat: -20, lon: 35 }, { lat: -26, lon: 33 }, { lat: -34, lon: 26 }, { lat: -35, lon: 20 },
    { lat: -33, lon: 18 }, { lat: -23, lon: 14 }, { lat: -15, lon: 12 }, { lat: -6, lon: 12 },
    { lat: 4, lon: 9 }, { lat: 5, lon: 3 }, { lat: 5, lon: -6 }, { lat: 9, lon: -14 },
    { lat: 15, lon: -17 }, { lat: 21, lon: -17 }, { lat: 28, lon: -13 }, { lat: 33, lon: -8 },
  ],
  // Madagascar
  [
    { lat: -12, lon: 49 }, { lat: -16, lon: 50 }, { lat: -25, lon: 47 }, { lat: -25, lon: 44 }, { lat: -16, lon: 45 },
  ],
  // Maritime SE Asia & Taiwan & Philippines & New Guinea
  [
    { lat: 5, lon: 95 }, { lat: 2, lon: 100 }, { lat: -5, lon: 106 }, { lat: -2, lon: 103 },
  ],
  [
    { lat: -6, lon: 106 }, { lat: -7, lon: 114 }, { lat: -8, lon: 114 }, { lat: -7, lon: 106 },
  ],
  [
    { lat: 7, lon: 117 }, { lat: 5, lon: 119 }, { lat: 0, lon: 118 }, { lat: -4, lon: 116 },
    { lat: -3, lon: 110 }, { lat: 2, lon: 109 }, { lat: 5, lon: 115 },
  ],
  [
    { lat: 18, lon: 120 }, { lat: 18, lon: 122 }, { lat: 12, lon: 124 }, { lat: 7, lon: 126 },
    { lat: 7, lon: 122 }, { lat: 14, lon: 120 },
  ],
  [
    { lat: 25, lon: 121.5 }, { lat: 24, lon: 121.8 }, { lat: 22, lon: 120.8 }, { lat: 23.5, lon: 120.2 },
  ],
  [
    { lat: -1, lon: 131 }, { lat: -3, lon: 141 }, { lat: -9, lon: 148 }, { lat: -10, lon: 143 },
    { lat: -6, lon: 136 }, { lat: -3, lon: 132 },
  ],
  // Australia
  [
    { lat: -12, lon: 131 }, { lat: -12, lon: 136 }, { lat: -15, lon: 136 }, { lat: -16, lon: 141 },
    { lat: -11, lon: 142 }, { lat: -19, lon: 147 }, { lat: -27, lon: 153 }, { lat: -37, lon: 150 },
    { lat: -38, lon: 141 }, { lat: -34, lon: 136 }, { lat: -32, lon: 129 }, { lat: -35, lon: 117 },
    { lat: -31, lon: 115 }, { lat: -22, lon: 114 }, { lat: -17, lon: 122 }, { lat: -14, lon: 126 },
  ],
  // New Zealand (North & South Islands)
  [
    { lat: -35, lon: 173 }, { lat: -38, lon: 178 }, { lat: -41, lon: 175 }, { lat: -39, lon: 174 },
  ],
  [
    { lat: -41, lon: 172 }, { lat: -43, lon: 173 }, { lat: -46, lon: 168 }, { lat: -44, lon: 168 },
  ],
  // Antarctica ridge
  [
    { lat: -72, lon: -180 }, { lat: -74, lon: -120 }, { lat: -73, lon: -60 }, { lat: -65, lon: -58 },
    { lat: -71, lon: -30 }, { lat: -70, lon: 20 }, { lat: -68, lon: 75 }, { lat: -67, lon: 135 },
    { lat: -71, lon: 170 }, { lat: -72, lon: 180 }, { lat: -89, lon: 180 }, { lat: -89, lon: -180 },
  ],
];

/** Highlighted Japan archipelago polygons (Hokkaido, Honshu, Shikoku, Kyushu). */
export const JAPAN_POLYGONS: readonly (readonly GeoCoord[])[] = [
  // Hokkaido
  [
    { lat: 45.4, lon: 141.9 }, { lat: 44.1, lon: 145.1 }, { lat: 43.0, lon: 144.4 },
    { lat: 41.9, lon: 143.2 }, { lat: 42.3, lon: 141.0 }, { lat: 41.5, lon: 140.1 }, { lat: 43.4, lon: 141.2 },
  ],
  // Honshu
  [
    { lat: 41.4, lon: 140.9 }, { lat: 40.5, lon: 141.6 }, { lat: 38.3, lon: 141.5 },
    { lat: 35.7, lon: 140.9 }, { lat: 35.0, lon: 139.9 }, { lat: 35.4, lon: 139.6 },
    { lat: 34.6, lon: 138.8 }, { lat: 34.4, lon: 136.9 }, { lat: 33.5, lon: 135.8 },
    { lat: 34.6, lon: 135.3 }, { lat: 34.4, lon: 132.4 }, { lat: 34.0, lon: 130.9 },
    { lat: 35.5, lon: 133.2 }, { lat: 35.7, lon: 136.0 }, { lat: 37.3, lon: 136.9 },
    { lat: 37.9, lon: 139.0 }, { lat: 39.8, lon: 140.0 },
  ],
  // Shikoku
  [
    { lat: 34.2, lon: 134.1 }, { lat: 33.8, lon: 134.7 }, { lat: 32.8, lon: 132.9 }, { lat: 33.5, lon: 132.3 },
  ],
  // Kyushu
  [
    { lat: 33.9, lon: 130.9 }, { lat: 33.2, lon: 131.8 }, { lat: 31.4, lon: 131.3 },
    { lat: 31.1, lon: 130.5 }, { lat: 32.8, lon: 129.8 },
  ],
];

/**
 * Project `(lat, lon)` onto equirectangular canvas pixels aligned 1:1 with
 * Three.js `SphereGeometry` UV mapping (`flipY = true`, `lon = -180..+180` across `0..width`,
 * `lat = +90..-90` down `0..height`).
 */
export function latLonToEquirectangular(
  lat: number,
  lon: number,
  width: number,
  height: number
): [number, number] {
  return [((lon + 180) / 360) * width, ((90 - lat) / 180) * height];
}

/**
 * Convert geographic latitude / longitude (degrees) into a unit-sphere vector
 * with +Y at the North Pole and +X / +Z spanning the equator.
 */
export function latLonToUnit(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  const sinPhi = Math.sin(phi);
  return [
    -sinPhi * Math.cos(theta),
    Math.cos(phi),
    sinPhi * Math.sin(theta),
  ];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Build a smooth elevated 3D arc over a sphere of `radius` between two coords.
 * Peak height scales with the great-circle angle so long trans-oceanic routes
 * arch cleanly above shorter regional hops.
 */
export function arcPoints(
  from: GeoCoord,
  to: GeoCoord,
  radius: number,
  steps = 36
): [number, number, number][] {
  const a = latLonToUnit(from.lat, from.lon);
  const b = latLonToUnit(to.lat, to.lon);
  const cosAngle = Math.max(-1, Math.min(1, dot(a, b)));
  const angle = Math.acos(cosAngle);
  const maxLift = radius * (0.14 + 0.32 * (angle / Math.PI));

  const points: [number, number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let dir: [number, number, number];
    if (angle < 1e-4) {
      dir = a;
    } else if (angle > Math.PI - 1e-3) {
      // Nearly antipodal: fall back to linear blend nudged through +Y.
      dir = normalize([
        a[0] * (1 - t) + b[0] * t,
        a[1] * (1 - t) + b[1] * t + Math.sin(Math.PI * t) * 0.25,
        a[2] * (1 - t) + b[2] * t,
      ]);
    } else {
      const sinA = Math.sin(angle);
      const wa = Math.sin((1 - t) * angle) / sinA;
      const wb = Math.sin(t * angle) / sinA;
      dir = normalize([
        a[0] * wa + b[0] * wb,
        a[1] * wa + b[1] * wb,
        a[2] * wa + b[2] * wb,
      ]);
    }
    const r = radius + Math.sin(Math.PI * t) * maxLift;
    points.push([dir[0] * r, dir[1] * r, dir[2] * r]);
  }
  return points;
}

/** Deterministic `[0, 1)` progress along an arc for a given clock `time` (seconds). */
export function pulseProgress(time: number, phase: number, period = 2.6): number {
  if (period <= 0) return 0;
  const raw = (time / period + phase) % 1;
  return raw < 0 ? raw + 1 : raw;
}
