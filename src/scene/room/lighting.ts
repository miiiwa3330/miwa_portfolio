/**
 * The room's lights, as the reader switches them (docs/room-migration.md):
 * the ceiling light on or off, the desk lamp on or off, and which pair of
 * colours the neon runs in. The sun the planet had is gone; these are what
 * the reader gets to change instead.
 *
 * **One state, two ways to change it.** The switch plate by the door (a 3D
 * object, `RoomScene`) and the light menu in the header both do nothing but
 * hand `flipLight` a switch to flip; the state lives once, in
 * `AppStateContext`. Switching is rare, so holding it in a context above the
 * `<Canvas>` costs nothing that matters (docs/scene-invariants.md,
 * "React / R3F の境界" — that rule is about values that change every frame).
 */

export type LightSwitch = "ceiling" | "desk" | "neon";

export type RoomLights = {
  ceiling: boolean;
  desk: boolean;
  /** Index into `NEON_THEMES`. */
  neon: number;
};

/**
 * The neon's colour pairs. The mood the room was set in (2026-09-15) is two
 * families of neon, cool and warm — cyan and amber — and that pair is the
 * first. **Provisional (仮):** the other two are picks to show the switch
 * doing something, not chosen against anything.
 */
export type NeonTheme = { key: string; ja: string; en: string; cool: string; warm: string };

export const NEON_THEMES: readonly NeonTheme[] = [
  { key: "cyan-amber", ja: "シアン×琥珀", en: "Cyan × Amber", cool: "#2fe8ff", warm: "#ffb020" },
  { key: "cyan-magenta", ja: "シアン×マゼンタ", en: "Cyan × Magenta", cool: "#2fe8ff", warm: "#ff3fd2" },
  { key: "lime-orange", ja: "ライム×オレンジ", en: "Lime × Orange", cool: "#5cff8a", warm: "#ff6a1a" },
];

/** The room as it is first seen: everything on, in the room's own colours. */
export const DEFAULT_LIGHTS: RoomLights = { ceiling: true, desk: true, neon: 0 };

/** The lights after one switch is flipped. The neon steps round its colour pairs. */
export function flipLight(lights: RoomLights, which: LightSwitch): RoomLights {
  if (which === "neon") return { ...lights, neon: (lights.neon + 1) % NEON_THEMES.length };
  return { ...lights, [which]: !lights[which] };
}

/** The neon's colours right now. */
export function neonTheme(lights: RoomLights): NeonTheme {
  const n = NEON_THEMES.length;
  return NEON_THEMES[((lights.neon % n) + n) % n];
}

/**
 * The light that is always there, whatever is switched off — twice the
 * prototype's (0.6 / 0.25), measured (docs/room-migration.md, step 6).
 *
 * The rule: **with the ceiling light and the desk lamp both off, no area's
 * subject is darker than the darkest one was with everything on** — the
 * bookcase, a mean luma of 43 at the subject. Measured at each of the six
 * standing views, as the mean luma of the box the subject sits in (not the
 * whole frame: the bookcase is 80% dark pixels lit or not, its books are
 * dark — the planet's lesson, "measure a region of one material"):
 *
 * | floor | desk | about | shelf | books | board | comms |
 * | ----- | ---- | ----- | ----- | ----- | ----- | ----- |
 * | ×1    | 45   | 47    | 61    | **31**| 132   | 74    |
 * | ×1.5  | 47   | 49    | 65    | **38**| 141   | 77    |
 * | ×2    | 49   | 52    | 68    | 45    | 148   | 80    |
 *
 * The floor is not what saves the desk: switched off, the desk falls to
 * about half (0.53 of lit) and three times the floor only brings it to 0.63,
 * while the bookcase ends up brighter than when lit (1.30). The desk is kept
 * readable by the neon's cool light beside it.
 */
export const AMBIENT_FLOOR = { hemisphere: 1.2, ambient: 0.5 } as const;

/**
 * The renderer's exposure for the room. The prototype's value for its
 * placeholder lights, not a design value — it means nothing once the
 * lighting is rebuilt. Named so the lab (`src/lab/`) lights a part the way
 * the room does: one number, read by both.
 */
export const ROOM_EXPOSURE = 1.75;
