"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import {
  LETTER_SET,
  POSTBOX_BODY,
  POSTBOX_BODY_CENTER_Y,
  POSTBOX_LEG,
  POSTBOX_LEG_BLACK,
  POSTBOX_RED,
  POSTBOX_SLOT_METAL,
  POSTBOX_SLOTS,
  POSTBOX_TOP_Y,
} from "../room/postbox";
import {
  makeEnvelopeTexture,
  makeLetterPaperTexture,
  makePostboxFrontTexture,
  makePostboxScheduleTexture,
} from "./postboxTextures";

/**
 * Japan Post's standard rectangular red mailbox ("郵便差出箱13号") standing
 * at the Contact area (`PIECES.comms`), topped with stationery paper, a stamped
 * envelope, and a hexagonal pencil ready to write a letter.
 */
export default function Postbox() {
  const frontTex = useMemo(() => makePostboxFrontTexture(), []);
  const scheduleTex = useMemo(() => makePostboxScheduleTexture(), []);
  const paperTex = useMemo(() => makeLetterPaperTexture(), []);
  const envelopeTex = useMemo(() => makeEnvelopeTexture(), []);

  useEffect(
    () => () => {
      frontTex.dispose();
      scheduleTex.dispose();
      paperTex.dispose();
      envelopeTex.dispose();
    },
    [frontTex, scheduleTex, paperTex, envelopeTex]
  );

  const { width, height, depth, cornerRadius } = POSTBOX_BODY;
  const boltOffsets = useMemo(
    () =>
      [-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => [
          sx * (POSTBOX_LEG.baseWidth / 2 - 0.045),
          POSTBOX_LEG.baseHeight + 0.006,
          sz * (POSTBOX_LEG.baseDepth / 2 - 0.045),
        ] as const)
      ),
    []
  );

  return (
    <group>
      {/* Floor mounting base plate, bolts, and heavy black pedestal leg */}
      <RoundedBox
        args={[POSTBOX_LEG.baseWidth, POSTBOX_LEG.baseHeight, POSTBOX_LEG.baseDepth]}
        radius={0.006}
        smoothness={2}
        position={[0, POSTBOX_LEG.baseHeight / 2, 0]}
      >
        <meshStandardMaterial color={POSTBOX_LEG_BLACK} roughness={0.55} metalness={0.68} />
      </RoundedBox>
      {boltOffsets.map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]}>
          <cylinderGeometry args={[0.011, 0.011, 0.012, 6]} />
          <meshStandardMaterial color="#8b929c" metalness={0.88} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, POSTBOX_LEG.height / 2, 0]}>
        <cylinderGeometry args={[POSTBOX_LEG.radius, POSTBOX_LEG.radius, POSTBOX_LEG.height, 28]} />
        <meshStandardMaterial color={POSTBOX_LEG_BLACK} roughness={0.46} metalness={0.62} />
      </mesh>
      {/* Collar flange connecting the pedestal leg to the bottom of the red body */}
      <mesh position={[0, POSTBOX_LEG.height - 0.015, 0]}>
        <cylinderGeometry args={[POSTBOX_LEG.radius + 0.032, POSTBOX_LEG.radius + 0.022, 0.03, 28]} />
        <meshStandardMaterial color="#252930" roughness={0.45} metalness={0.72} />
      </mesh>

      {/* Main Postal Red Type-13 rectangular housing */}
      <RoundedBox
        args={[width, height, depth]}
        radius={cornerRadius}
        smoothness={4}
        position={[0, POSTBOX_BODY_CENTER_Y, 0]}
      >
        <meshStandardMaterial color={POSTBOX_RED} roughness={0.28} metalness={0.16} />
      </RoundedBox>

      {/* Subtle recessed base rim under the body */}
      <mesh position={[0, POSTBOX_LEG.height + 0.008, 0]}>
        <boxGeometry args={[width - 0.04, 0.016, depth - 0.04]} />
        <meshStandardMaterial color="#9e1511" roughness={0.4} metalness={0.22} />
      </mesh>

      {/* Front decal (〒 mark, 郵便 / POST, slot captions, No. plate) */}
      <mesh position={[0, POSTBOX_BODY_CENTER_Y, depth / 2 + 0.0015]}>
        <planeGeometry args={[width - 0.02, height - 0.02]} />
        <meshStandardMaterial map={frontTex} roughness={0.32} metalness={0.12} />
      </mesh>

      {/* Dual stainless-steel mail slots with rain hoods & recessed inner flaps */}
      {POSTBOX_SLOTS.map((slot) => (
        <group key={slot.id} position={[slot.x, slot.y, depth / 2 + 0.004]}>
          {/* Outer stainless frame plate */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[slot.width + 0.036, slot.height + 0.034, 0.01]} />
            <meshStandardMaterial color={POSTBOX_SLOT_METAL} metalness={0.86} roughness={0.26} />
          </mesh>
          {/* Recessed dark mail chute */}
          <mesh position={[0, -0.002, 0.004]}>
            <boxGeometry args={[slot.width, slot.height, 0.008]} />
            <meshStandardMaterial color="#111318" roughness={0.75} metalness={0.3} />
          </mesh>
          {/* Inner hinged metal flap visible inside the chute */}
          <mesh position={[0, -0.003, 0.006]} rotation={[0.28, 0, 0]}>
            <boxGeometry args={[slot.width - 0.014, slot.height - 0.01, 0.004]} />
            <meshStandardMaterial color="#8e95a0" metalness={0.85} roughness={0.32} />
          </mesh>
          {/* Sloped overhead stainless rain hood */}
          <mesh position={[0, slot.height / 2 + 0.012, 0.02]} rotation={[0.32, 0, 0]}>
            <boxGeometry args={[slot.width + 0.042, 0.012, 0.048]} />
            <meshStandardMaterial color={POSTBOX_SLOT_METAL} metalness={0.9} roughness={0.22} />
          </mesh>
        </group>
      ))}

      {/* Lower front lock cylinder & handle clasp */}
      <group position={[0.25, POSTBOX_LEG.height + 0.2, depth / 2 + 0.006]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.02, 0.014, 16]} />
          <meshStandardMaterial color="#cfd5dc" metalness={0.9} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <boxGeometry args={[0.004, 0.014, 0.004]} />
          <meshStandardMaterial color="#181a1e" />
        </mesh>
      </group>

      {/* Right side: acrylic-framed Collection Schedule ("取集時刻表") */}
      <group position={[width / 2 + 0.003, POSTBOX_BODY_CENTER_Y + 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.25, 0.31, 0.008]} />
          <meshStandardMaterial color="#d2d6dc" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[0.225, 0.285]} />
          <meshStandardMaterial map={scheduleTex} roughness={0.35} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0, 0.007]}>
          <planeGeometry args={[0.23, 0.29]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.09} roughness={0.08} metalness={0.2} depthWrite={false} />
        </mesh>
      </group>

      {/* Left side: collection door seam, hinges & lock */}
      <group position={[-width / 2 - 0.002, POSTBOX_BODY_CENTER_Y - 0.04, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[depth - 0.09, height - 0.16, 0.004]} />
          <meshStandardMaterial color="#9e1410" roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.003]}>
          <boxGeometry args={[depth - 0.11, height - 0.18, 0.004]} />
          <meshStandardMaterial color={POSTBOX_RED} roughness={0.28} metalness={0.16} />
        </mesh>
        {[-0.2, 0.2].map((hy) => (
          <mesh key={hy} position={[-(depth - 0.11) / 2, hy, 0.008]}>
            <cylinderGeometry args={[0.009, 0.009, 0.055, 10]} />
            <meshStandardMaterial color="#b4bcc6" metalness={0.88} roughness={0.26} />
          </mesh>
        ))}
        <mesh position={[(depth - 0.11) / 2 - 0.04, 0.02, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.014, 14]} />
          <meshStandardMaterial color="#cfd5dc" metalness={0.9} roughness={0.22} />
        </mesh>
      </group>

      {/* Roof writing set: stacked stationery paper, stamped envelope, and hexagonal pencil */}
      <group position={[0, POSTBOX_TOP_Y, 0]}>
        {/* Blank lower sheet */}
        <mesh
          position={[LETTER_SET.underPaper.x, LETTER_SET.underPaper.thickness / 2, LETTER_SET.underPaper.z]}
          rotation={[0, LETTER_SET.underPaper.yaw, 0]}
        >
          <boxGeometry args={[LETTER_SET.underPaper.width, LETTER_SET.underPaper.thickness, LETTER_SET.underPaper.depth]} />
          <meshStandardMaterial color="#f5f0e1" roughness={0.88} />
        </mesh>

        {/* Top ruled stationery sheet with handwritten ink */}
        <group
          position={[
            LETTER_SET.topPaper.x,
            LETTER_SET.underPaper.thickness + LETTER_SET.topPaper.thickness / 2,
            LETTER_SET.topPaper.z,
          ]}
          rotation={[0, LETTER_SET.topPaper.yaw, 0]}
        >
          <mesh>
            <boxGeometry args={[LETTER_SET.topPaper.width, LETTER_SET.topPaper.thickness, LETTER_SET.topPaper.depth]} />
            <meshStandardMaterial color="#faf5e6" roughness={0.85} />
          </mesh>
          <mesh position={[0, LETTER_SET.topPaper.thickness / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[LETTER_SET.topPaper.width, LETTER_SET.topPaper.depth]} />
            <meshStandardMaterial map={paperTex} roughness={0.85} metalness={0.02} />
          </mesh>
        </group>

        {/* Stamped white envelope resting beside the stationery */}
        <group
          position={[LETTER_SET.envelope.x, LETTER_SET.envelope.thickness / 2, LETTER_SET.envelope.z]}
          rotation={[0, LETTER_SET.envelope.yaw, 0]}
        >
          <mesh>
            <boxGeometry args={[LETTER_SET.envelope.width, LETTER_SET.envelope.thickness, LETTER_SET.envelope.depth]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.85} />
          </mesh>
          <mesh position={[0, LETTER_SET.envelope.thickness / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[LETTER_SET.envelope.width, LETTER_SET.envelope.depth]} />
            <meshStandardMaterial map={envelopeTex} roughness={0.82} metalness={0.02} />
          </mesh>
        </group>

        {/* Detailed hexagonal wooden pencil lying diagonally across the paper */}
        <group
          position={[
            LETTER_SET.pencil.x,
            LETTER_SET.underPaper.thickness + LETTER_SET.topPaper.thickness + LETTER_SET.pencil.radius,
            LETTER_SET.pencil.z,
          ]}
          rotation={[0, LETTER_SET.pencil.yaw, 0]}
        >
          {/* Painted hexagonal barrel (rotated along X) */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[LETTER_SET.pencil.radius, LETTER_SET.pencil.radius, 0.132, 6]} />
            <meshStandardMaterial color="#eab32e" roughness={0.42} metalness={0.08} />
          </mesh>
          {/* Tapered bare wood cone */}
          <mesh position={[0.066 + 0.011, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[LETTER_SET.pencil.radius, 0.022, 12]} />
            <meshStandardMaterial color="#e3c094" roughness={0.78} />
          </mesh>
          {/* Graphite lead tip */}
          <mesh position={[0.066 + 0.022 + 0.003, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.0018, 0.006, 8]} />
            <meshStandardMaterial color="#23262b" roughness={0.35} metalness={0.35} />
          </mesh>
          {/* Brass ferrule sleeve */}
          <mesh position={[-0.066 - 0.007, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[LETTER_SET.pencil.radius * 1.03, LETTER_SET.pencil.radius * 1.03, 0.014, 14]} />
            <meshStandardMaterial color="#d8b44c" metalness={0.88} roughness={0.25} />
          </mesh>
          {/* Pink eraser cap */}
          <mesh position={[-0.066 - 0.0175, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[LETTER_SET.pencil.radius * 0.96, LETTER_SET.pencil.radius * 0.96, 0.008, 12]} />
            <meshStandardMaterial color="#e07b82" roughness={0.82} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
