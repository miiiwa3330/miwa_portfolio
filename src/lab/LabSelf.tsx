"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { FigureModel, poseFigure } from "@/scene/objects/Self";
import { bodyJoints } from "@/scene/room/self";
import { FIGURE } from "@/scene/room/figure";
import { STANDING } from "@/scene/room/gait";
import type { RoomPose } from "@/scene/camera/roomCamera";
import { deskViewPose } from "@/scene/room/deskViews";

/**
 * The room owner's body, standing at the room's middle facing +Z (towards the
 * lab camera's first spot) — for looking at the figure itself. The room's
 * `Self` follows the reader's camera and keeps its head off that camera
 * (`HEAD_LAYER`); here nothing follows and the head is drawn, so the face and
 * the hair can be looked at from every side. `seated` sits it at the PC's
 * seat instead (the lab draws the desk with it), its hands on the keyboard
 * and the mouse.
 */
const POSE: RoomPose = {
  x: 0,
  z: 0,
  yaw: Math.PI,
  pitch: 0,
  forward: 0,
  eyeHeight: FIGURE.eye,
  hfov: 90,
  share: 0,
  lift: 0,
};

const SEATED: RoomPose = { ...POSE, ...deskViewPose("pc") };

export default function LabSelf({ seated = false }: { seated?: boolean }) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    poseFigure(body.current, seated ? bodyJoints(SEATED) : bodyJoints(POSE, STANDING, 0), seated ? SEATED.pitch : 0);
  });
  return <FigureModel ref={body} />;
}
