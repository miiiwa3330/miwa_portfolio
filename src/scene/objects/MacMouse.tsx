"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { MAC, MAC_MOUSE, macToDesk } from "../room/layout";
import { M0100, M0100_BUTTON, onMacButton } from "../room/macMouse";
import { MAC_SCREEN } from "../room/screens";
import { MAC_MAPPING, macPointer } from "../deskPointer";
import { useDeskMouse, type MousePart } from "./useDeskMouse";
import { shapeOf, slab } from "./caseShapes";
import { roundedRectOutline } from "../room/keyboard";

/**
 * The Macintosh's mouse, an M0100 (`room/macMouse.ts`): a beige box with
 * rounded corners, one wide button across the front of its top in a slightly
 * grayer beige, and its cord out of the front, back to the Mac.
 *
 * **It moves as the PC's mouse does** (`useDeskMouse`, shared with the
 * EX-G): pressed, its button clicks; held still, it is in the hand and
 * slides; and while the reader's pointer is on the Mac's screen it goes
 * where the pointer is, and the reader's buttons press its one button. Its
 * place is the cursor's on the Mac's screen (`macPointer`, drawn by
 * `Macintosh`). The click is the EX-G's recording for now (**仮**).
 *
 * Colours: the case is the Mac's (`#ccc3ac`); the button `#bbab93`, the
 * median of マッキントッシュ4.png's. The body is two shells, the line between
 * them low round its sides (4.png, 6.png).
 */

const COLOURS = { case: "#ccc3ac", button: "#bbab93", gap: "#3a3628", line: "#8f8770", cord: "#c2b99f" } as const;
/** The body's height under the button, and how round its edges are (**仮**). */
const BODY = { height: M0100.height - 0.004, radius: 0.009 } as const;
/** Where the cord meets the Mac: its back, right of the middle, low (the mouse port; **仮**). */
const PORT: [number, number, number] = [0.07, 0.03, -MAC.depth / 2];

export default function MacMouse({ typing }: { typing: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const button = useRef<THREE.Mesh>(null);

  const materials = useMemo(
    () => ({
      case: new THREE.MeshStandardMaterial({ color: COLOURS.case, roughness: 0.6, metalness: 0 }),
      button: new THREE.MeshStandardMaterial({ color: COLOURS.button, roughness: 0.55, metalness: 0 }),
      gap: new THREE.MeshStandardMaterial({ color: COLOURS.gap, roughness: 0.9, metalness: 0 }),
      line: new THREE.MeshStandardMaterial({ color: COLOURS.line, roughness: 0.8, metalness: 0 }),
      cord: new THREE.MeshStandardMaterial({ color: COLOURS.cord, roughness: 0.5, metalness: 0 }),
    }),
    []
  );

  // The line between the shells: a band a hair proud of the body's walls, round its rounded corners.
  const line = useMemo(() => {
    const proud = 0.0003;
    const band = shapeOf(roundedRectOutline(M0100.width + 2 * proud, M0100.length + 2 * proud, BODY.radius + proud, 6));
    band.holes.push(new THREE.Path(roundedRectOutline(M0100.width, M0100.length, BODY.radius, 6).map((p) => new THREE.Vector2(p.x, -p.z))));
    return slab(band, () => 0.0065, () => 0.0077);
  }, []);

  // The cord, in the mouse's own frame: out of its front, across the desk and up the Mac's back.
  const cord = useMemo(() => {
    const port = macToDesk(PORT);
    const toLocal = (p: readonly [number, number, number]) => new THREE.Vector3(p[0] - MAC_MOUSE.x, p[1] - MAC_MOUSE.y, p[2] - MAC_MOUSE.z);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.012, -M0100.length / 2),
      new THREE.Vector3(0, 0.003, -M0100.length / 2 - 0.04),
      toLocal([MAC_MOUSE.x - 0.02, MAC_MOUSE.y + 0.003, MAC_MOUSE.z - 0.25]),
      toLocal([port[0] + 0.05, MAC_MOUSE.y + 0.003, port[2] - 0.05]),
      toLocal([port[0], port[1], port[2] - 0.02]),
      toLocal(port),
    ]);
    return new THREE.TubeGeometry(path, 96, 0.0018, 6, false);
  }, []);
  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
      cord.dispose();
      line.dispose();
    },
    [materials, cord, line]
  );

  const bind = useDeskMouse({
    group,
    machine: "mac",
    rest: MAC_MOUSE,
    mapping: MAC_MAPPING,
    panel: MAC_SCREEN,
    channel: macPointer,
    seated: typing,
    buttons: [0],
    partOf: (_object, local): MousePart => (local.y > BODY.height - 0.002 && onMacButton(local.x, local.z) ? 0 : "body"),
    pieces: () => [body.current, button.current].filter((o): o is THREE.Mesh => !!o),
    onPress: (depth) => {
      if (button.current) button.current.position.y = BODY.height + 0.0015 - M0100_BUTTON.travel * depth[0];
    },
  });

  return (
    <group ref={group} position={[MAC_MOUSE.x, MAC_MOUSE.y, MAC_MOUSE.z]} {...bind}>
      <RoundedBox ref={body} args={[M0100.width, BODY.height, M0100.length]} radius={BODY.radius} smoothness={4} position={[0, BODY.height / 2, 0]} material={materials.case} />
      {/* The line between the two shells, low round the sides. */}
      <mesh geometry={line} material={materials.line} raycast={() => null} />
      {/* The button, sunk in its gap. */}
      <mesh position={[0, BODY.height + 0.0002, M0100_BUTTON.z]} rotation={[-Math.PI / 2, 0, 0]} material={materials.gap} raycast={() => null}>
        <planeGeometry args={[M0100_BUTTON.width + 0.002, M0100_BUTTON.length + 0.002]} />
      </mesh>
      <RoundedBox
        ref={button}
        args={[M0100_BUTTON.width, 0.003, M0100_BUTTON.length]}
        radius={0.0012}
        smoothness={2}
        position={[0, BODY.height + 0.0015, M0100_BUTTON.z]}
        material={materials.button}
      />
      <mesh geometry={cord} material={materials.cord} raycast={() => null} />
    </group>
  );
}
