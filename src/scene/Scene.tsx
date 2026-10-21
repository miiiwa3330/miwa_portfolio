"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, events, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import RoomScene from "./objects/RoomScene";
import LensRenderer from "./LensRenderer";
import { SCREEN_HOLE_LAYER } from "./layers";
import {
  MAX_PITCH,
  dampFraction,
  idleSway,
  mouseLook,
  wrapAngle,
} from "./camera/cameraMotion";
import {
  advanceRoomFlight,
  beginRoomFlight,
  freeFraming,
  zoomFraming,
  lensBends,
  floorSpot,
  frameCentreDirection,
  placeCamera,
  poseFromView,
  projectionLiftPx,
  projectionShiftPx,
  screenRay,
  verticalFov,
  type RoomFlight,
  type RoomPose,
} from "./camera/roomCamera";
import { publishBody, publishView, viewNow } from "./camera/viewChannel";
import { planRoomMove } from "./camera/walkFlight";
import { STANDING, advanceGait, stepBob } from "./room/gait";
import { AT_CENTRE, NO_KEYS, stepFreeWalk, type FreeWalk, type WalkKeys } from "./camera/freeWalk";
import { seatShare } from "./room/seat";
import {
  EYE_HEIGHT,
  facingStop,
  viewDirection,
  yawOf,
  zoomView,
  type ViewZoom,
} from "./room/layout";
import { ROOM_EXPOSURE } from "./room/lighting";
import { ROOM_TOUR, stopU } from "./room/tour";
import { sceneClock } from "./sceneClock";
import { isInteractive, pointerClaim } from "./pointerClaim";
import { useAppState } from "@/state/AppStateContext";
import { useHandheld } from "@/state/useHandheld";
import { useLanguage } from "@/state/LanguageContext";
import { publishFacing } from "@/state/facingChannel";
import type { Focus } from "@/types";
import { twoFingerGesture } from "./viewGesture";

/**
 * The camera inside the room. It stands at the centre and turns on the spot;
 * a focused area steps it out towards that area's subject and back. See
 * docs/room-migration.md for the design, and `camera/roomCamera.ts` /
 * `room/layout.ts` for the arithmetic, which is tested there.
 *
 * What carried over from the planet unchanged, because it was never about the
 * planet: the touch input (drag, two fingers, pinch, tap) and the wheel, the
 * free view's damped chase with its capped return after a drag, the tour as a
 * closed path through the stops, and the one effect that decides every
 * destination. What did not: `camera-controls` (a tool for orbiting a target),
 * the per-building camera roll (the room is always upright), and the focal
 * offset that slid the camera sideways for the card (the projection is shifted
 * instead — see `projectionShiftPx`).
 */

// Rotation sensitivity (kept gentle). The mouse's own is `MOUSE_LOOK_SENSITIVITY`.
const DRAG_SENSITIVITY = 0.002; // radians per px of a finger's drag, both axes
const WHEEL_SENSITIVITY = 0.0004; // radians of turn per unit of wheel deltaY

const DEG = Math.PI / 180;

// How far apart two fingers must move, in px, before a pinch is read as a
// deliberate request to switch the free view's stage — not a continuous dial,
// a single discrete step per gesture (see `ViewZoom` in room/layout.ts).
// Crossed once per two-finger gesture; the fingers have to lift and come back
// down for a second switch, rather than firing repeatedly on a long pinch.
const PINCH_THRESHOLD_PX = 60;

// How far two fingers must travel *together*, in px, before the gesture is
// read as a scroll along the tour rather than a zoom.
//
// **The two are told apart by which moved more, not by which threshold was
// crossed first.** A pinch with one finger anchored moves the midpoint by half
// of whatever the separation changes by, so a plain "first past the post" race
// hands every such pinch to the scroll: 24px of travel arrives while the
// separation has only opened 48 of its 60. Comparing the two distances
// directly is what keeps an anchored pinch a pinch (48 > 24, so nothing
// latches yet) while still catching a two-finger swipe, where the separation
// barely changes at all.
const TWO_FINGER_SCROLL_THRESHOLD_PX = 24;

// A trackpad pinch is not a pointer gesture. Every browser reports it as a
// wheel event with `ctrlKey` set — the same convention it uses for
// zoom-the-page — so on a desktop the two-finger zoom arrives through
// `onWheel` instead of through the pointer handlers, in a stream of small
// deltas rather than as one distance. This is how much of that stream adds up
// to one altitude switch. Smaller than it looks: a deliberate trackpad pinch
// emits deltas of a few units each, tens of times a second.
const PINCH_WHEEL_THRESHOLD = 24;

// How long the wheel must be quiet before a stream that began while the orbit
// was locked is trusted again. Longer than the gaps within a momentum tail,
// shorter than the pause between two deliberate gestures.
const WHEEL_REARM_MS = 220;

/**
 * How long a camera flight lasts, in seconds — at least: a flight the reader
 * walks takes as long as the walk (`camera/walkFlight.ts`), which out to an
 * area is longer than either.
 *
 * Two values, and the one in play is chosen by whether the detail page was
 * covering the canvas when the flight began — not by which control started it.
 * The sheet takes roughly 0.3s to slide off the screen, and a flight underneath
 * it is a flight nobody sees; the longer figure is what leaves most of the
 * pull-back still to come at the moment the diorama is uncovered. With nothing
 * in the way there is nothing to wait for, and the same delay would only read
 * as the camera being slow off the mark.
 */
const FLIGHT_SECONDS = 1.1;
const RETURN_SECONDS = 1.6;

/** Straight-line distance between two tracked pointers, in screen px. */
function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Keeps a fraction wrapped into [0, 1) — `ROOM_TOUR`'s own convention. */
function wrap01(u: number): number {
  return ((u % 1) + 1) % 1;
}

/** The view direction for a yaw/pitch pair in radians. */
function directionFor(yaw: number, pitch: number) {
  return viewDirection(yaw / DEG, pitch / DEG);
}

/**
 * Only in the free view does the mouse, a drag or the wheel move the camera.
 * Whenever a section is focused — zoomed in, or with its page open — input is
 * locked out; a stray gesture is ignored rather than silently queued up for
 * later. Listeners live on `window` so a gesture anywhere over the canvas
 * works, even though the canvas sits behind the (mostly pointer-events-none)
 * UI overlay.
 *
 * **The mouse aims, the way a first-person game's does** (the user's choice,
 * 2026-10-02, in place of dragging): a click on the room captures the mouse
 * (the Pointer Lock API, on the canvas), the cursor goes, and every move turns
 * the head (`mouseLook`) — at once, not through the damped chase the wheel
 * glides by, since an aim that trails the hand is what a game feels wrong
 * for. Esc gives the cursor back (the browser's own key for it), and so does
 * stepping into an area. A click on a marker or a light switch is that
 * object's, never a capture. While captured, a click is aimed at the
 * crosshair (`roomEvents`). The mouse no longer drags at all.
 *
 * **A finger's drag grabs the room** (the user's choice, 2026-10-01): dragging right
 * pulls the room right, so the view turns left — the way a map or a street
 * view moves under a finger. A first-person game does the opposite. `tourURef`
 * shadows the nearest point on the tour throughout the drag, so a scroll that
 * starts mid-drag continues from nearby rather than reverting.
 *
 * **The wheel turns the reader right.** Scrolling down (a positive `deltaY`)
 * advances the tour, which turns right, which walks the room in the header's
 * nav order (see `room/layout.ts`).
 *
 * A second finger switches the gesture entirely, to one of two things that
 * never overlap: **the separation changing** is a zoom, asking `onPinchZoom`
 * for the free view's other stage — once per gesture, not a dial; **the pair
 * travelling together** is a scroll along the tour, the touch half of what the
 * wheel does, at the drag's own rate.
 *
 * `followTourRef` is the one piece of state a gesture leaves behind: the
 * wheel and the two-finger swipe put the view back on the tour (it follows
 * `tourURef`), and a drag takes it off — **letting go leaves the view where
 * it was let go**, the way a game's camera stays where you looked. Nothing
 * turns the room by itself (the user asked for the idle drift to stop,
 * 2026-10-01), so there is no tour to drift back to.
 */
function useViewInput(
  canvas: HTMLCanvasElement,
  yawRef: React.RefObject<number>,
  pitchRef: React.RefObject<number>,
  yawTargetRef: React.RefObject<number>,
  pitchTargetRef: React.RefObject<number>,
  tourURef: React.RefObject<number>,
  draggingRef: React.RefObject<boolean>,
  followTourRef: React.RefObject<boolean>,
  lockedRef: React.RefObject<boolean>,
  flightRef: React.RefObject<unknown>,
  onPinchZoom: (zoom: ViewZoom) => void
) {
  useEffect(() => {
    let down = false;
    let lastX = 0;
    let lastY = 0;

    // Pointers currently on the glass, keyed by pointerId — what turns a
    // second finger landing mid-drag into a two-finger gesture instead of both
    // fingers' moves being read as one confused single-pointer drag.
    const activePointers = new Map<number, { x: number; y: number }>();

    /** The two-finger gesture in progress, if any; `mode` latches until the fingers lift. */
    let twoFinger: {
      startDist: number;
      startMidY: number;
      lastMidY: number;
      mode: "undecided" | "zoom" | "scroll";
    } | null = null;

    const midpointY = (a: { y: number }, b: { y: number }) => (a.y + b.y) / 2;

    // A camera flight owns the camera outright; gestures during one would be
    // fighting it, and would land as a jump the moment it finished.
    const locked = () => lockedRef.current || flightRef.current !== null;

    const resync = () => {
      tourURef.current = ROOM_TOUR.nearestU(directionFor(yawTargetRef.current, pitchTargetRef.current));
    };

    /**
     * Turn `arc` radians along the tour — the one place the wheel and the
     * two-finger swipe meet, so the two cannot drift apart in sign. Both put
     * the view back on the tour, from wherever a drag left it.
     */
    const advanceTour = (arc: number) => {
      followTourRef.current = true;
      tourURef.current = wrap01(tourURef.current + arc / ROOM_TOUR.length);
    };

    const captured = () => document.pointerLockElement === canvas;

    const onPointerDown = (e: PointerEvent) => {
      if (locked() || isInteractive(e.target)) return;
      if (e.pointerType === "mouse") {
        // A marker or a switch answered this click on the way down.
        if (e.button !== 0 || captured() || pointerClaim.isClaimed(e.pointerId)) return;
        // Refused for a moment after Esc, and on a page without the API —
        // either way the reader just clicks again, so nothing to report.
        Promise.resolve(canvas.requestPointerLock?.()).catch(() => {});
        return;
      }
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2) {
        down = false;
        draggingRef.current = false;
        const [a, b] = [...activePointers.values()];
        const midY = midpointY(a, b);
        twoFinger = { startDist: pointerDistance(a, b), startMidY: midY, lastMidY: midY, mode: "undecided" };
      } else if (activePointers.size === 1) {
        down = true;
        lastX = e.clientX;
        lastY = e.clientY;
        draggingRef.current = true;
        // A hand on the room takes the view off the tour until the wheel
        // brings it back.
        followTourRef.current = false;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (locked()) return;
      if (captured()) {
        // The same turn on the held angles and their targets: the aim moves
        // with the hand, and a wheel's glide still under way carries on.
        const now = mouseLook(yawRef.current, pitchRef.current, e.movementX, e.movementY);
        const aim = mouseLook(yawTargetRef.current, pitchTargetRef.current, e.movementX, e.movementY);
        yawRef.current = now.yaw;
        pitchRef.current = now.pitch;
        yawTargetRef.current = aim.yaw;
        pitchTargetRef.current = aim.pitch;
        followTourRef.current = false;
        resync();
        return;
      }
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (activePointers.size >= 2) {
        if (twoFinger) {
          const [a, b] = [...activePointers.values()];
          const midY = midpointY(a, b);
          const spread = pointerDistance(a, b) - twoFinger.startDist;
          const travel = midY - twoFinger.startMidY;

          if (twoFinger.mode === "undecided") {
            const asked = twoFingerGesture(spread, travel, PINCH_THRESHOLD_PX, TWO_FINGER_SCROLL_THRESHOLD_PX);
            if (asked === "zoom") {
              twoFinger.mode = "zoom";
              // Spreading apart asks for the closer stage (standard); closing
              // asks for the wider one (fisheye). Once per gesture.
              onPinchZoom(spread > 0 ? "standard" : "fisheye");
            } else if (asked === "scroll") {
              twoFinger.mode = "scroll";
              // The travel spent deciding is not also scrolled.
              twoFinger.lastMidY = midY;
            }
          }

          if (twoFinger.mode === "scroll") {
            // Fingers moving up the screen is what a trackpad calls a positive
            // `deltaY`, and both turn the reader the same way.
            advanceTour(-(midY - twoFinger.lastMidY) * DRAG_SENSITIVITY);
            twoFinger.lastMidY = midY;
          }
        }
        return; // a two-finger gesture never also reads as a single-pointer drag
      }

      if (!down) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // Grab the room: dragging right turns the view left (yaw grows to the
      // right), dragging up tips it down (pitch grows upward).
      yawTargetRef.current -= dx * DRAG_SENSITIVITY;
      pitchTargetRef.current = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitchTargetRef.current + dy * DRAG_SENSITIVITY));
      resync();
    };

    const endDrag = (e: PointerEvent) => {
      // Whatever this pointer was, it is over: an object that claimed it (a
      // marker) has had its chance. Keyed by id, so a second finger lifting
      // cannot release the first one's claim.
      pointerClaim.release(e.pointerId);
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) twoFinger = null;
      if (activePointers.size === 0) {
        down = false;
        draggingRef.current = false;
      }
    };

    // A hard flick that dismisses the detail page keeps emitting wheel events
    // for a second or two after the fingers leave the trackpad. A stream that
    // began while locked is refused until the wheel falls quiet: a genuinely
    // new gesture always starts after a pause.
    let lastWheelAt = 0;
    let wheelArmed = true;
    // A trackpad pinch arrives as a stream of small ctrl+wheel deltas, added
    // up until it amounts to a switch and then latched.
    let pinchWheel = 0;
    let pinchWheelConsumed = false;

    const onWheel = (e: WheelEvent) => {
      const sinceLast = e.timeStamp - lastWheelAt;
      lastWheelAt = e.timeStamp;

      // **A pinch on a trackpad is a ctrl+wheel, not a pointer gesture.**
      // Without this branch it would fall through and turn the room instead.
      if (e.ctrlKey) {
        e.preventDefault();
        if (locked()) return;
        if (sinceLast >= WHEEL_REARM_MS) {
          pinchWheel = 0;
          pinchWheelConsumed = false;
        }
        if (pinchWheelConsumed) return;
        pinchWheel += e.deltaY;
        if (Math.abs(pinchWheel) >= PINCH_WHEEL_THRESHOLD) {
          // Spreading apart reports negative deltas — the closer stage.
          onPinchZoom(pinchWheel < 0 ? "standard" : "fisheye");
          pinchWheelConsumed = true;
        }
        return;
      }

      if (locked()) {
        wheelArmed = false;
        return;
      }
      if (!wheelArmed) {
        if (sinceLast < WHEEL_REARM_MS) return; // same stream, still coasting
        wheelArmed = true;
      }

      e.preventDefault();
      advanceTour(e.deltaY * WHEEL_SENSITIVITY);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("wheel", onWheel);
    };
  }, [canvas, yawRef, pitchRef, yawTargetRef, pitchTargetRef, tourURef, draggingRef, followTourRef, lockedRef, flightRef, onPinchZoom]);
}

/** Stands in for an absent `onEmptyTap`; the hook is disabled in that case anyway. */
function noop() {}

/** Movement below this, in px, is a tap rather than the start of a drag. */
const TAP_SLOP_PX = 10;

/**
 * A press held longer than this is not a tap, in ms.
 *
 * There has to be an upper bound as well as a movement one: a finger resting
 * on the glass while the reader decides what to do drifts less than the slop,
 * and lifting it half a second later should not read as having asked for
 * anything. 350ms is the usual figure for the boundary between a tap and a
 * press, and it is comfortably longer than the ~120ms a deliberate tap takes.
 */
const TAP_MAX_MS = 350;

/**
 * A tap on empty sky, which is how a phone pauses the diorama.
 *
 * The pause button is gone on a handheld (see `useHandheld`); this replaces
 * it. "Empty" has three exclusions and each is a different kind of thing:
 *
 *  - **A real control** — the header, the card rail, the terminal. Found by
 *    walking up the DOM from the target (`isInteractive`).
 *  - **An object in the scene** — an area marker. Invisible to the
 *    DOM, since every one of these lands on the same canvas, so they say so
 *    themselves on the way down (`pointerClaim`).
 *  - **A gesture that turned out to be something else** — a drag of the
 *    room, or a second finger arriving for a pinch. Both are ruled out
 *    here rather than negotiated with `useViewInput`: this hook watches the
 *    same events and cancels its own candidate, so the two never need to
 *    agree about anything.
 *
 * Deliberately separate from `useViewInput` rather than another branch inside
 * it. That hook is about where the camera points; this one is about a button
 * that is not there any more, and the only thing they share is the stream of
 * events.
 */
/** The keys that walk: W/A/S/D by where they are on the keyboard, whatever the layout prints on them. */
const WALK_CODES = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

/**
 * W/A/S/D and Space, for walking about the room (`camera/freeWalk.ts`).
 * Keys typed into a field are the field's, and a key with Ctrl, ⌘ or Alt is
 * a shortcut, not a step. Space asks for one jump per press: held down, it
 * does not jump again on landing. Letting go of the window (switching tabs)
 * lets go of every key, so the reader does not walk off on their own.
 */
function useWalkKeys(): { read: () => WalkKeys } {
  const held = useRef(new Set<string>());
  const jump = useRef(false);
  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && (el.isContentEditable || !!el.closest?.("input, textarea, select"));
    };
    const pressable = (target: EventTarget | null) =>
      !!(target as HTMLElement | null)?.closest?.("button, a[href], summary, [role='button'], [role='link']");
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (WALK_CODES.has(e.code)) held.current.add(e.code);
      // Space jumps — unless a button or a link has the focus, which Space
      // presses for a keyboard reader. Jumping, it does not scroll the page.
      if (e.code === "Space" && !pressable(e.target)) {
        e.preventDefault();
        if (!e.repeat) jump.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      held.current.delete(e.code);
    };
    const release = () => {
      held.current.clear();
      jump.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    };
  }, []);
  return {
    read: () => {
      const keys = held.current;
      const asked = jump.current;
      jump.current = false;
      return {
        forward: (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
        right: (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
        jump: asked,
      };
    },
  };
}

function useTapGesture(enabled: boolean, flightRef: React.RefObject<unknown>, onTap: () => void) {
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  useEffect(() => {
    if (!enabled) return;

    let candidate: { id: number; x: number; y: number; at: number } | null = null;
    let pointersDown = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointersDown += 1;
      // A second finger means a pinch. The first finger's candidate goes with
      // it — lifting out of a pinch is not a tap, however still the fingers
      // were.
      if (pointersDown > 1) {
        candidate = null;
        return;
      }
      if (isInteractive(e.target)) return;
      if (pointerClaim.isClaimed(e.pointerId)) return;
      // A flight owns the camera; a tap landing mid-flight is someone trying
      // to interrupt it, and pausing the town is not what they asked for.
      if (flightRef.current !== null) return;
      candidate = { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!candidate || e.pointerId !== candidate.id) return;
      if (Math.hypot(e.clientX - candidate.x, e.clientY - candidate.y) > TAP_SLOP_PX) {
        candidate = null; // it became a drag
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      pointersDown = Math.max(0, pointersDown - 1);
      const tap = candidate;
      candidate = null;
      if (!tap || e.pointerId !== tap.id) return;
      if (e.timeStamp - tap.at > TAP_MAX_MS) return;
      // Checked again on the way up as well as on every move: a pointer can
      // land and lift with no `pointermove` in between and still have
      // travelled, and a coarse pointer reports its position generously.
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP_PX) return;
      onTapRef.current();
    };

    const onPointerCancel = () => {
      pointersDown = Math.max(0, pointersDown - 1);
      candidate = null;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enabled, flightRef]);
}

/**
 * While the detail page covers the canvas there is nothing to look at, so the
 * render loop is switched to on-demand and nudged about once a second instead
 * of running at 60fps behind an opaque panel. Rendering the room for an
 * audience of nobody competes for the same main thread the sheet animation and
 * the section mount are using.
 */
const OBSCURED_HEARTBEAT_MS = 1000;

function IdleHeartbeat({ obscured }: { obscured: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!obscured) return;
    const id = setInterval(invalidate, OBSCURED_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [obscured, invalidate]);

  return null;
}

/**
 * Hands the pause button's state to the diorama's clock, from inside the
 * Canvas where the renderer's own clock lives.
 */
function ScenePause() {
  const { paused } = useAppState();
  const clock = useThree((state) => state.clock);

  useEffect(() => {
    // The `elapsedTime` property, not getElapsedTime(): the getter advances the
    // clock as a side effect, and would eat the delta the next frame is owed.
    // Being up to one frame (16ms) behind at the moment of the press is not
    // something anyone can see; a swallowed frame is.
    sceneClock.setPaused(paused, clock.elapsedTime);
  }, [paused, clock]);

  return null;
}

/** Yaw and pitch, in radians, of the tour at `u`. */
function tourAngles(u: number): { yaw: number; pitch: number } {
  const d = ROOM_TOUR.direction(u);
  return { yaw: yawOf(d[0], d[2]) * DEG, pitch: Math.asin(Math.max(-1, Math.min(1, d[1]))) };
}

function CameraController({ onEmptyTap }: { onEmptyTap?: () => void }) {
  const { activeSection, pageOpen, homeNonce, turnRequest, viewZoom, setViewZoom } = useAppState();

  // Whether the card is the strip along the bottom rather than the panel on
  // the left — which decides whether the subject has to be slid clear of it.
  // Asked here rather than passed in: it is the same question `Hub` asks to
  // decide which card to render, and the two must never disagree about it.
  const handheld = useHandheld();

  const home = tourAngles(0);
  // Read fresh each render, for `useFrame`'s closure (recreated every render).
  // How the free view is drawn at its current stage, and how a zoom is: a
  // zoom is always through the standard view's perspective, since the HTML
  // placed in the room can only be drawn through one.
  const free = freeFraming(viewZoom, handheld);

  // The free view's true state. The targets jump the instant a gesture or the
  // tour asks for something new; `yawRef`/`pitchRef` are what is drawn,
  // damped towards them every frame. Nothing is read back off the camera.
  const yawTargetRef = useRef(home.yaw);
  const pitchTargetRef = useRef(home.pitch);
  const yawRef = useRef(home.yaw);
  const pitchRef = useRef(home.pitch);
  // Where along the tour the camera is — meaningful while the free view is
  // driving the camera, shadowed during a drag or while a section is focused.
  const tourURef = useRef(0);

  const draggingRef = useRef(false);
  /**
   * Whether the free view follows the tour (`tourURef`): after the wheel, a
   * two-finger swipe, a card's step or coming back from an area. A drag
   * turns it off, and the view stays where the drag left it.
   */
  const followTourRef = useRef(true);
  /** This frame's idle sway, added to every pose as it is drawn (`applyPose`). */
  const swayRef = useRef({ yaw: 0, pitch: 0, height: 0 });
  /** How much of the sway is in play: eased to 0 while reading at the desk or the hologram. */
  const swayGainRef = useRef(1);
  /** The reader's walk, worked out each frame from how the held eye moved (`room/gait.ts`). */
  const gaitRef = useRef(STANDING);
  /** The reader's "reduce motion" setting: no sway at all. */
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => {
      reducedMotionRef.current = query.matches;
    };
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  const prevSectionRef = useRef<Focus>(null);
  const prevNonceRef = useRef(homeNonce);
  const prevZoomRef = useRef(viewZoom);
  const prevPageOpenRef = useRef(pageOpen);

  /** The flight in progress, if any. The record and its step are in `camera/roomCamera.ts`. */
  const flightRef = useRef<RoomFlight | null>(null);
  /** What the camera is holding right now — every flight starts from here. */
  const poseRef = useRef<RoomPose>({
    x: 0,
    z: 0,
    yaw: home.yaw,
    pitch: home.pitch,
    forward: 0,
    eyeHeight: EYE_HEIGHT,
    ...free,
  });

  // Turning only makes sense in the free view — lock out drag/wheel input
  // whenever a section is focused, so stray gestures can't accumulate.
  const lockedRef = useRef(pageOpen || !!activeSection);
  useEffect(() => {
    lockedRef.current = pageOpen || !!activeSection;
    // Stepping into an area hands the cursor back: what is there — the card,
    // the PC's screen, the page — is read and clicked with it.
    if (lockedRef.current && document.pointerLockElement) document.exitPointerLock();
  }, [pageOpen, activeSection]);

  const canvas = useThree((state) => state.gl.domElement);
  useViewInput(canvas, yawRef, pitchRef, yawTargetRef, pitchTargetRef, tourURef, draggingRef, followTourRef, lockedRef, flightRef, setViewZoom);

  /** Where the keys have walked the reader, and their jump: the free view's place on the floor. */
  const walkRef = useRef<FreeWalk>(AT_CENTRE);
  const walkKeys = useWalkKeys();

  // The tap that replaces the pause button. Off while the detail sheet covers
  // the canvas, during About, where a tap beside the text is not asking for
  // the room to freeze, and at the desk, where a tap is on the PC's screen.
  useTapGesture(
    !!onEmptyTap && !pageOpen && activeSection !== "about" && activeSection !== "desk",
    flightRef,
    onEmptyTap ?? noop
  );

  const freePose = (yaw: number, pitch: number): RoomPose => ({
    x: walkRef.current.x,
    z: walkRef.current.z,
    yaw,
    pitch,
    forward: 0,
    eyeHeight: EYE_HEIGHT,
    ...free,
  });

  /**
   * Put the camera where `pose` says. Up is always world +Y. The field of view
   * is re-derived from the frame's aspect every time, and the card's share is a
   * shift of the projection rather than of the camera — both are fractions of
   * the frame, so a resize needs nothing of its own.
   *
   * Through a bent lens the camera itself only carries the position and the
   * direction: `LensRenderer` draws the frame from a cube map, shifting it in
   * its own shader, so the camera's projection is left unshifted.
   *
   * Only ever called from the frame loop, with the frame's own camera: the
   * camera is three.js state that the frame loop owns, not a value of this
   * component's render.
   *
   * The idle sway is added here, to what is drawn and published — so the
   * markers, the dotted line and the HTML in the room sway with the picture —
   * and not to `poseRef`, which every flight starts from. So is the dip of
   * each step: the walk is worked out here from how far the held eye moved
   * since the last frame, whatever moved it.
   */
  const applyPose = (camera: THREE.PerspectiveCamera, size: { width: number; height: number }, held: RoomPose, delta: number) => {
    poseRef.current = held;
    const sat = seatShare(held);
    const [sx, sz] = floorSpot(held);
    const gait = advanceGait(gaitRef.current, sx, sz, held.yaw, delta, sat);
    gaitRef.current = gait;
    publishBody(gait, held);
    // In the air there is no step to dip into.
    const jump = walkRef.current.height;
    const bob = reducedMotionRef.current || jump > 0 ? 0 : stepBob(gait) * (1 - sat);
    const sway = swayRef.current;
    const pose: RoomPose = { ...held, yaw: held.yaw + sway.yaw, pitch: held.pitch + sway.pitch, eyeHeight: held.eyeHeight + sway.height + bob + jump };
    const { position, target } = placeCamera(pose);
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);
    camera.fov = verticalFov(pose.hfov, camera.aspect);
    const shift = projectionShiftPx(pose.share, size.width);
    const lift = projectionLiftPx(pose.lift, size.height);
    if (!lensBends(pose.lens) && (Math.abs(shift) > 0.01 || Math.abs(lift) > 0.01)) {
      camera.setViewOffset(size.width, size.height, shift, lift, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
    // Matrices up to date now, not at the next render: the markers project
    // through this camera in the same frame.
    camera.updateMatrixWorld();
    publishView(pose, size.width, size.height);
  };

  /** Fly to `to`, walking whatever distance the reader covers on foot (`camera/walkFlight.ts`). */
  const startFlight = (to: RoomPose, duration: number, land: RoomFlight["land"]) => {
    flightRef.current = beginRoomFlight(planRoomMove(poseRef.current, to, duration), land);
  };

  // Swiping the card asks for a stop. Steering tourURef is all it takes — the
  // frame loop turns the camera round, and the card follows because it reads
  // the direction rather than being set.
  useEffect(() => {
    if (!turnRequest) return;
    tourURef.current = stopU(turnRequest.section);
    followTourRef.current = true;
  }, [turnRequest]);

  // Every camera destination is decided here, in one place, so the several
  // ways of arriving cannot disagree about where the camera should end up.
  useEffect(() => {
    const cameFrom = prevSectionRef.current;
    prevSectionRef.current = activeSection;
    const wasReset = homeNonce !== prevNonceRef.current;
    prevNonceRef.current = homeNonce;
    const wasZoomChange = viewZoom !== prevZoomRef.current;
    prevZoomRef.current = viewZoom;

    // Longer when the detail page was covering the canvas as the flight was
    // asked for — most of a short flight would happen behind the sheet.
    const duration = prevPageOpenRef.current ? RETURN_SECONDS : FLIGHT_SECONDS;

    /** Turn the free view to `yaw`/`pitch` and fly there, at the current stage. */
    const flyToFree = (yaw: number, pitch: number) => {
      // Unwrapped onto the side of the turn the free view is already on, so
      // the damp after landing has no extra lap to unwind.
      const landYaw = yawRef.current + wrapAngle(yaw - yawRef.current);
      yawTargetRef.current = landYaw;
      pitchTargetRef.current = pitch;
      startFlight(freePose(landYaw, pitch), duration, { yaw: landYaw, pitch });
    };

    // 1. A section was focused: step out towards its subject. About is no
    //    longer a case of its own — its subject is the hologram on the desk.
    if (activeSection) {
      const framing = zoomFraming(activeSection, handheld);
      startFlight(poseFromView(zoomView(activeSection, framing.hfov), framing), duration, null);
      return;
    }

    // 2. A deliberate reset (logo / HOME) with no section to leave: the start
    //    of the tour, the desk.
    if (wasReset && !cameFrom) {
      // Home is the middle of the room, wherever the keys had walked to.
      walkRef.current = AT_CENTRE;
      tourURef.current = 0;
      followTourRef.current = true;
      flyToFree(home.yaw, home.pitch);
      return;
    }

    // 3. Left a section — by scrolling off its page, by HOME, or by reading
    //    About to the end. Back to the centre, turned to the stop just left,
    //    and the tour resumes from there.
    if (cameFrom) {
      const u = stopU(cameFrom);
      tourURef.current = u;
      followTourRef.current = true;
      const { yaw, pitch } = tourAngles(u);
      flyToFree(yaw, pitch);
      return;
    }

    // 4. The free view's stage changed (a pinch, or the zoom control) while
    //    already in the free view: same direction, new field of view.
    if (wasZoomChange) {
      flyToFree(yawRef.current, pitchRef.current);
      return;
    }

    // 5. First mount: already at home — the refs start there, and the first
    //    frame draws them (nothing is damping, so nothing moves).
    yawTargetRef.current = home.yaw;
    pitchTargetRef.current = home.pitch;
    yawRef.current = home.yaw;
    pitchRef.current = home.pitch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, homeNonce, viewZoom]);

  // Declared after the effect above so that effect always reads the previous value.
  useEffect(() => {
    prevPageOpenRef.current = pageOpen;
  }, [pageOpen]);

  // Ahead of every other frame callback (a negative priority still leaves
  // the rendering to R3F): the markers project through this camera, and if
  // they ran first they would publish where the marker was a frame ago while
  // the render drew it where it is now — the dotted line trailing the bolt
  // by a frame whenever the camera turns. Mounted after the room, this used
  // to run after the markers.
  useFrame((state, delta) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const size = state.size;

    // The idle sway, on the room's clock so the pause button holds it still.
    // Eased out while reading the PC's screen or the hologram — text that
    // sways is harder to read — and off for a reader who asked for less motion.
    const reading = activeSection === "desk" || activeSection === "about";
    const gainTarget = reading || reducedMotionRef.current ? 0 : 1;
    swayGainRef.current += (gainTarget - swayGainRef.current) * dampFraction(delta);
    const sway = idleSway(sceneClock.time(state.clock.elapsedTime));
    const gain = swayGainRef.current;
    swayRef.current = { yaw: sway.yaw * gain, pitch: sway.pitch * gain, height: sway.height * gain };

    // Only the free view walks: anywhere else, the keys asked nothing and a jump in the air is over.
    if (flightRef.current || activeSection) {
      walkKeys.read();
      if (walkRef.current.height > 0 || walkRef.current.vx || walkRef.current.vz) walkRef.current = { ...walkRef.current, vx: 0, vz: 0, height: 0, rise: 0 };
    }

    // A flight owns the camera outright while it runs. Real delta, not the
    // room's clock: the pause button freezes the room, not the reader.
    const flight = flightRef.current;
    if (flight) {
      const step = advanceRoomFlight(flight, delta);
      applyPose(camera, size, step.pose, delta);
      // Hand the free view the angles this flight actually finished on — see
      // `RoomFlight.land` for what skipping this costs.
      if (step.landed) {
        yawRef.current = step.landed.yaw;
        pitchRef.current = step.landed.pitch;
        yawTargetRef.current = step.landed.yaw;
        pitchTargetRef.current = step.landed.pitch;
      }
      if (step.done) flightRef.current = null;
      return;
    }

    // A focused section holds the camera where its flight parked it. Re-applied
    // rather than left alone, so a resize re-derives the field of view.
    if (activeSection) {
      applyPose(camera, size, poseRef.current, delta);
      return;
    }

    // Nothing turns the room by itself. The tour is where the wheel, a
    // two-finger swipe or a card's step asked the view to be; a drag sets the
    // targets directly instead, and the view stays there once let go.
    if (followTourRef.current && !draggingRef.current) {
      const { yaw, pitch } = tourAngles(tourURef.current);
      yawTargetRef.current += wrapAngle(yaw - yawTargetRef.current);
      pitchTargetRef.current = pitch;
    }

    // Chase the targets — one fraction of the gap for both angles, in real
    // time: pausing the room does not stop the reader turning round in it.
    const current = yawRef.current;
    const target = current + wrapAngle(yawTargetRef.current - current);
    yawTargetRef.current = target;
    const fraction = dampFraction(delta);
    yawRef.current = current + (target - current) * fraction;
    pitchRef.current = pitchRef.current + (pitchTargetRef.current - pitchRef.current) * fraction;

    // Walking on the keys: where the reader is looking, stopped by the walls and the furniture.
    walkRef.current = stepFreeWalk(walkRef.current, lockedRef.current ? NO_KEYS : walkKeys.read(), yawRef.current, delta);

    const held = freePose(yawRef.current, pitchRef.current);
    applyPose(camera, size, held, delta);

    // Publish which stop is in front. A subscription rather than a setState,
    // because this runs every frame and everything above the canvas is a
    // consumer — see `facingChannel`. While the mouse is captured, "in front"
    // is where the crosshair is: the frame's centre, which the card's shift
    // has put about 12° left of the view's axis.
    const captured = document.pointerLockElement === state.gl.domElement;
    publishFacing(facingStop(captured ? frameCentreDirection(held, size.width, size.height) : directionFor(yawRef.current, pitchRef.current)));
  }, -1);

  return null;
}

const rayDirection = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();

/**
 * R3F's pointer events, aimed through the room's lens.
 *
 * The stock `compute` asks the camera's projection which way a pixel looks,
 * and through the fisheye the camera's projection is not what is on screen
 * (`LensRenderer` draws it from a cube map) — a click on a marker would be
 * tested along a ray some way off it. `screenRay` is the same lens and the
 * same shifts the markers are placed with, so the two cannot disagree; for
 * the plain perspective it is exactly what the stock one does.
 */
function roomEvents(store: Parameters<typeof events>[0]) {
  const manager = events(store);
  return {
    ...manager,
    compute(event: { offsetX: number; offsetY: number }, state: ReturnType<typeof store.getState>) {
      const { width, height } = state.size;
      const pose = viewNow().pose;
      // A captured mouse has no position (the browser holds the event's
      // coordinates where the capture began): it is aimed at the crosshair,
      // the frame's centre.
      const captured = !!document.pointerLockElement;
      const px = captured ? width / 2 : event.offsetX;
      const py = captured ? height / 2 : event.offsetY;
      state.pointer.set((px / width) * 2 - 1, -(py / height) * 2 + 1);
      const camera = state.camera;
      camera.updateMatrixWorld();
      const [x, y, z] = screenRay(px, py, pose, width, height);
      rayDirection.set(x, y, z).transformDirection(camera.matrixWorld);
      state.raycaster.set(camera.getWorldPosition(rayOrigin), rayDirection);
      // Sprites read the camera off the raycaster to face it.
      state.raycaster.camera = camera;
    },
  };
}

/** How long the "Esc for the cursor" note stays under the crosshair once the mouse is captured, in ms. */
const CAPTURE_HINT_MS = 2500;

/**
 * The crosshair, while the room has the mouse: a ring at the frame's centre
 * (the user's choice, 2026-10-02), where a captured click is aimed
 * (`roomEvents`). A DOM element over the canvas rather than something in the
 * scene: it is part of the frame, not the room, and never sways.
 *
 * **Not on the view's axis.** The free view on a desktop shifts its
 * projection to clear the card (`ORBIT_CARD_SHARE`), which puts the axis at
 * 61% of the width; the crosshair aims about 12° left of it, and while it
 * is up the card's "in front" (`facingStop`) goes by the crosshair too.
 */
function Crosshair() {
  const { language } = useLanguage();
  const [captured, setCaptured] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const read = () => {
      const now = document.pointerLockElement instanceof HTMLCanvasElement;
      setCaptured(now);
      setHint(now);
    };
    document.addEventListener("pointerlockchange", read);
    return () => document.removeEventListener("pointerlockchange", read);
  }, []);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), CAPTURE_HINT_MS);
    return () => clearTimeout(id);
  }, [hint]);

  if (!captured) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      <div className="absolute -left-[9px] -top-[9px] h-[18px] w-[18px] rounded-full border-2 border-white/90 ring-1 ring-black/40" />
      <div
        className={`absolute left-0 top-5 -translate-x-1/2 whitespace-nowrap rounded bg-black/50 px-2 py-0.5 text-xs text-white transition-opacity duration-500 ${hint ? "opacity-100" : "opacity-0"}`}
      >
        {language === "ja" ? "Esc でカーソルを戻す" : "Esc to get the cursor back"}
      </div>
    </div>
  );
}

export default function Scene({
  obscured = false,
  interactive = true,
  onEmptyTap,
}: {
  obscured?: boolean;
  /**
   * Called when a handheld reader taps empty space — the gesture that replaces
   * the pause button there (see `useTapGesture`). Absent on a desktop.
   *
   * **Must be stable.** It is handed across the `<Canvas>` boundary, and a new
   * identity every render would rebind the listeners.
   */
  onEmptyTap?: () => void;
  /**
   * Whether the canvas should accept pointer events right now. `<Canvas>`'s
   * own outermost div sets an inline `pointerEvents` style, which beats any
   * CSS trying to turn it off from an ancestor; the `style` prop below is the
   * one place it can be overridden.
   */
  interactive?: boolean;
}) {
  return (
    <>
      <Canvas
        camera={{ position: [0, EYE_HEIGHT, 0], fov: 45, near: 0.05, far: 60 }}
        dpr={[1, 2]}
        frameloop={obscured ? "demand" : "always"}
        events={roomEvents}
        style={interactive ? undefined : { pointerEvents: "none" }}
        // The prototype's exposure, for its placeholder lights. Not a design
        // value — it means nothing once the lighting is rebuilt (step 6).
        onCreated={({ gl, camera }) => {
          gl.toneMappingExposure = ROOM_EXPOSURE;
          // The reader's eye is the one camera that draws the screen cut-outs.
          camera.layers.enable(SCREEN_HOLE_LAYER);
        }}
      >
        <RoomScene />
        <CameraController onEmptyTap={onEmptyTap} />
        <LensRenderer />
        <ScenePause />
        <IdleHeartbeat obscured={obscured} />
      </Canvas>
      <Crosshair />
    </>
  );
}
