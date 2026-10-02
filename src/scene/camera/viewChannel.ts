import { EYE_HEIGHT, FREE_HFOV } from "../room/layout";
import type { RoomPose } from "./roomCamera";
import { STANDING, type Gait } from "../room/gait";

/**
 * Where the camera is and how it is drawing right now — its whole pose,
 * lens and shifts included — and the size of the frame.
 *
 * The camera's controller writes it every frame, first thing; the fisheye
 * renderer, the markers and the click test read it later in the same frame,
 * and the HTML placed in the room (`hub/room/RoomHtml.tsx`) is moved by it.
 * A plain module value rather than React state, for the reason
 * `markerScreen.ts` and `state/facingChannel.ts` give: a per-frame value in a
 * context above the `<Canvas>` re-renders the whole three.js tree each time
 * it changes.
 */
export type ViewState = { pose: RoomPose; width: number; height: number };

const current: ViewState = {
  pose: { x: 0, z: 0, yaw: 0, pitch: 0, forward: 0, eyeHeight: EYE_HEIGHT, hfov: FREE_HFOV, lens: 1, share: 0, lift: 0 },
  width: 1,
  height: 1,
};
const listeners = new Set<(view: Readonly<ViewState>) => void>();

/** The view right now. Safe to call from a frame, an effect or an event handler. */
export function viewNow(): Readonly<ViewState> {
  return current;
}

function samePose(a: RoomPose, b: RoomPose): boolean {
  return (
    a.x === b.x &&
    a.z === b.z &&
    a.yaw === b.yaw &&
    a.pitch === b.pitch &&
    a.forward === b.forward &&
    a.eyeHeight === b.eyeHeight &&
    a.hfov === b.hfov &&
    a.lens === b.lens &&
    a.share === b.share &&
    a.lift === b.lift
  );
}

/** Called by the camera each frame. A no-op when nothing changed. */
export function publishView(pose: RoomPose, width: number, height: number): void {
  if (samePose(current.pose, pose) && current.width === width && current.height === height) return;
  current.pose = { ...pose };
  current.width = width;
  current.height = height;
  for (const listener of listeners) listener(current);
}

/** Subscribe to the view changing. Delivers the current value at once; returns an unsubscribe. */
export function onView(listener: (view: Readonly<ViewState>) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The body under the eye, for the frame being drawn: the walk
 * (`room/gait.ts`) and the pose the camera is holding before the sway and
 * the step are added — what sitting down and the chair are worked out from
 * (`room/seat.ts`), so neither bobs with the head. Written by the camera
 * alongside the view; read by the body and the chair. Not delivered to
 * listeners — nothing outside the canvas needs it.
 */
export type BodyState = { gait: Gait; held: RoomPose };

const body: BodyState = { gait: STANDING, held: current.pose };

export function publishBody(gait: Gait, held: RoomPose): void {
  body.gait = gait;
  body.held = held;
}

export function bodyNow(): Readonly<BodyState> {
  return body;
}
