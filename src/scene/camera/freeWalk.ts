import { horizontalAt } from "../room/layout";
import { keepOnFloor } from "../room/floor";
import { WALK_SPEED } from "./walkFlight";

/**
 * Walking about the room on the keys — W/A/S/D — and jumping on Space (the
 * user, 2026-10-02; Shift first, then moved to Space at their word). The reader walks where they are looking, at the room's
 * walking pace (`WALK_SPEED`, the same as a flight walks), getting up to it
 * and stopping over a fraction of a second; the walls and the furniture stop
 * them (`room/floor.ts`). The steps and the dip of each step follow by
 * themselves (`room/gait.ts` reads the place the walk leaves).
 *
 * The jump is the camera's own height over the eye (`height`): the body
 * goes up with it, its feet leaving the floor. One jump at a time — from the
 * floor, not in the air.
 */

/** **Provisional (仮).** How high a jump lifts the eye, in metres. */
export const JUMP_HEIGHT = 0.45;
export const GRAVITY = 9.8;
/** The speed a jump leaves the floor at, to reach `JUMP_HEIGHT`. */
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
/** How quickly the walk gets up to pace and stops, per second. */
const PICK_UP = 10;
/** The longest step one frame may take, in seconds: a stalled frame does not throw the reader through a wall. */
const MAX_STEP = 1 / 10;

export type FreeWalk = { x: number; z: number; vx: number; vz: number; height: number; rise: number };
export const AT_CENTRE: FreeWalk = { x: 0, z: 0, vx: 0, vz: 0, height: 0, rise: 0 };

/** What the keys ask for: `forward` and `right` each −1, 0 or 1, and whether a jump was asked for since the last frame. */
export type WalkKeys = { forward: number; right: number; jump: boolean };
export const NO_KEYS: WalkKeys = { forward: 0, right: 0, jump: false };

const DEG = Math.PI / 180;

/** One frame of walking, looking along `yaw` (radians). */
export function stepFreeWalk(walk: FreeWalk, keys: WalkKeys, yaw: number, dt: number): FreeWalk {
  const step = Math.min(Math.max(dt, 0), MAX_STEP);
  if (step === 0) return walk;
  // Diagonally no faster than straight on.
  const length = Math.hypot(keys.forward, keys.right);
  const f = length > 1 ? keys.forward / length : keys.forward;
  const r = length > 1 ? keys.right / length : keys.right;
  const [fx, fz] = horizontalAt(yaw / DEG);
  const targetX = (fx * f - fz * r) * WALK_SPEED;
  const targetZ = (fz * f + fx * r) * WALK_SPEED;
  const fraction = 1 - Math.exp(-PICK_UP * step);
  const vx = walk.vx + (targetX - walk.vx) * fraction;
  const vz = walk.vz + (targetZ - walk.vz) * fraction;
  const [x, z] = keepOnFloor(walk.x + vx * step, walk.z + vz * step);

  let rise = walk.rise;
  let height = walk.height;
  if (keys.jump && height === 0 && rise === 0) rise = JUMP_SPEED;
  if (height > 0 || rise > 0) {
    // Exactly, for a constant pull: stepping the speed first and then the
    // height with it came up 2.5 cm short of the jump's 45 at sixty frames.
    height += rise * step - 0.5 * GRAVITY * step * step;
    rise -= GRAVITY * step;
    if (height <= 0) {
      height = 0;
      rise = 0;
    }
  }
  // Against a wall the reader stops, rather than pressing on into it at speed.
  return { x, z, vx: (x - walk.x) / step, vz: (z - walk.z) / step, height, rise };
}
