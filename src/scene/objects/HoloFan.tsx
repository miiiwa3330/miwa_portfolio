"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HOLO_FAN, HOLO_FAN_ARM, holoFanJoints, holoFanPlace } from "../room/layout";
import { BLADES, PICTURE_RINGS, bladeAngle, clockSway, clockText, rollAbout } from "../room/holoFan";
import { sceneClock } from "../sceneClock";
import { fanShowNow, onFanShow, setFanShow } from "../holoFanShow";
import { aboutPlainParagraphs } from "@/hub/about/aboutCopy";
import { useLanguage } from "@/state/LanguageContext";
import { Ball, Plain, Rod, type DeskMaterials } from "./DeskSet";
import { makeFanPicture } from "./holoFanPicture";

/**
 * The hologram fan over the video monitor (`HOLO_FAN`, `holoFanPlace`), on
 * its arm from the upper monitor's (`holoFanJoints`), showing the time
 * (`room/holoFan.ts`) — or, switched from the PC's `自己紹介.holo`
 * (`holoFanShow`), the self-introduction rolling up it, after which it
 * goes back to the time. Drawn in the desk's frame (`Piece`).
 *
 * The blades turn at 800 rpm — 27 sweeps a second for two blades, far more
 * than a frame can show — so they are drawn as they are seen (`BLADES`): a
 * faint dark sweep, the shadow of the bar going round slowly with a smear
 * trailing it, a ring where the tips pass, and the picture a touch brighter
 * just behind the bar, where the LEDs have just been. The picture is drawn
 * in rings out from the middle, the way a fan's pictures are — coarser than
 * the real fan's, so they show from further off (`PICTURE_RINGS`); the rings
 * fade out where they are finer than the screen's pixels, so they do not
 * shimmer from across the room.
 */

/** How often the picture is redrawn (per second): about a fan's own frame rate. */
const PICTURE_RATE = 30;
/** How bright the lit LEDs are, past what the tone mapping would allow (as the screens are). **仮** */
const GLOW = 1.3;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** How far behind the nearest blade a point at angle `a` is (radians), the blades going round anticlockwise from `uAngle`. */
const BEHIND = /* glsl */ `
  uniform float uAngle;
  uniform float uBlades;
  float behind(float a) {
    return mod(uAngle - a, 6.2831853 / uBlades);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uRings;
  uniform float uGlow;
  uniform float uFresh;
  uniform float uFade;
  varying vec2 vUv;
  ${BEHIND}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ring = r * uRings;
    // 1 where the rings are 2.5 pixels apart or more, 0 at 1.2 or less (finer, they would shimmer).
    float sharp = clamp((1.0 / max(fwidth(ring), 1e-4) - 1.2) / 1.3, 0.0, 1.0);
    // Each ring shows the picture at its own LED's radius.
    float centre = (floor(ring) + 0.5) / uRings;
    vec2 q = r > 0.0 ? p * mix(1.0, centre / r, sharp) : p;
    vec3 colour = texture2D(uMap, q * 0.5 + 0.5).rgb;
    // Bright on the LED's path, dark between: the mean stays where it is.
    float lit = 0.5 + 0.5 * cos(6.2831853 * (fract(ring) - 0.5));
    float profile = mix(1.0, (0.12 + 0.88 * lit) / 0.56, sharp);
    // A touch brighter just behind the bar, where the LEDs have just been.
    float fresh = 1.0 - uFresh + uFresh * exp(-behind(atan(p.y, p.x)) / uFade);
    gl_FragColor = vec4(colour * profile * fresh * uGlow, 1.0);
    #include <colorspace_fragment>
  }
`;

/** The blades as they are seen going round: the sweep, the bar's shadow, the smear behind it, and the ring the tips draw. */
const BLADE_FRAGMENT = /* glsl */ `
  uniform float uRadius;
  uniform float uWidth;
  uniform float uSweepOpacity;
  uniform float uBarOpacity;
  uniform float uSmearOpacity;
  uniform float uFade;
  uniform float uTipOpacity;
  varying vec2 vUv;
  ${BEHIND}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float b = behind(atan(p.y, p.x));
    // Off the nearest bar, either way round.
    float off = min(b, 6.2831853 / uBlades - b);
    float halfWidth = asin(min(1.0, 0.5 * uWidth / max(r * uRadius, 1e-4)));
    // A pixel's width in angle there, to soften the bar's edges by.
    float pixel = length(fwidth(p)) / max(r, 1e-4);
    float bar = 1.0 - smoothstep(halfWidth - pixel, halfWidth + pixel, off);
    float smear = exp(-b / uFade);
    float tip = smoothstep(0.955, 0.975, r) * (1.0 - smoothstep(0.99, 1.0, r));
    float alpha = max(max(uSweepOpacity, uBarOpacity * bar), max(uSmearOpacity * smear, uTipOpacity * tip));
    vec3 colour = mix(vec3(0.035, 0.04, 0.05), vec3(0.5, 0.55, 0.6), 0.4 * tip);
    gl_FragColor = vec4(colour, alpha);
    #include <colorspace_fragment>
  }
`;

/** The fan's materials and its picture, with what moves them: the blades' angle, and the picture's next frame. */
function makeFan() {
  const picture = makeFanPicture();
  const materials = {
    picture: new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: picture.texture },
        uRings: { value: PICTURE_RINGS },
        uGlow: { value: GLOW },
        uAngle: { value: 0 },
        uBlades: { value: BLADES.count },
        uFresh: { value: BLADES.freshLight },
        uFade: { value: BLADES.smearFade },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    blades: new THREE.ShaderMaterial({
      uniforms: {
        uAngle: { value: 0 },
        uBlades: { value: BLADES.count },
        uRadius: { value: HOLO_FAN.sweep / 2 },
        uWidth: { value: BLADES.width },
        uSweepOpacity: { value: BLADES.sweepOpacity },
        uBarOpacity: { value: BLADES.barOpacity },
        uSmearOpacity: { value: BLADES.smearOpacity },
        uFade: { value: BLADES.smearFade },
        uTipOpacity: { value: BLADES.tipOpacity },
      },
      vertexShader: VERTEX,
      fragmentShader: BLADE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    // The blades' tips going round, seen edge-on: a thin dark band as deep as the blades.
    edge: new THREE.MeshBasicMaterial({ color: "#0b0d10", transparent: true, opacity: BLADES.edgeOpacity, depthWrite: false, side: THREE.DoubleSide }),
    hub: new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.45, metalness: 0.4 }),
  };
  return {
    materials,
    picture,
    /** Moves the bar's shadow, and the picture's fresh light behind it. */
    turn(angle: number) {
      materials.blades.uniforms.uAngle.value = angle;
      materials.picture.uniforms.uAngle.value = angle;
    },
    dispose() {
      Object.values(materials).forEach((material) => material.dispose());
      picture.texture.dispose();
    },
  };
}

export default function HoloFan({ m }: { m: DeskMaterials }) {
  const fan = useMemo(() => makeFan(), []);
  useEffect(() => () => fan.dispose(), [fan]);
  const own = fan.materials;
  const place = useMemo(() => holoFanPlace(), []);
  const j = useMemo(() => holoFanJoints(), []);

  // The self-introduction, wrapped in the fan's own font, in the reader's language.
  const { language } = useLanguage();
  const lines = useMemo(() => fan.picture.wrap(aboutPlainParagraphs(language === "ja")), [fan, language]);
  /** Showing the self-introduction: whether it is to start on the next frame, and the room's time it started at. */
  const roll = useRef<{ pending: boolean; start: number } | null>(fanShowNow() === "about" ? { pending: true, start: 0 } : null);
  useEffect(
    () =>
      onFanShow((show) => {
        roll.current = show === "about" ? { pending: true, start: 0 } : null;
      }),
    []
  );

  const last = useRef(-1);
  useFrame((state) => {
    const t = sceneClock.time(state.clock.elapsedTime);
    fan.turn(bladeAngle(t));
    const rolling = roll.current;
    if (rolling?.pending) roll.current = { pending: false, start: t };
    if (Math.abs(t - last.current) < 1 / PICTURE_RATE) return;
    last.current = t;
    if (roll.current) {
      const now = rollAbout(lines.length, t - roll.current.start);
      // Rolled to the end: back to the time.
      if (now.done) setFanShow("clock");
      else fan.picture.drawRoll(lines, now.lines);
      return;
    }
    fan.picture.draw(clockText(new Date()), clockSway(t));
  });

  const r = HOLO_FAN.sweep / 2;
  const half = HOLO_FAN.bladeThickness / 2;
  const { hub } = HOLO_FAN;
  const bar = HOLO_FAN_ARM.bar;
  return (
    <>
      {/* The arm: up from the clamp on the monitor arm's head (the lamp's), right behind the monitor, and down to the fan's back. */}
      <Plain size={[bar, j.riser[1] - j.clamp[1], bar]} at={[j.clamp[0], (j.clamp[1] + j.riser[1]) / 2, j.clamp[2]]} material={m.painted} />
      <Plain size={[j.shoulder[0] - j.riser[0] + bar, bar, bar]} at={[(j.riser[0] + j.shoulder[0]) / 2, j.riser[1], j.riser[2]]} material={m.painted} />
      <Plain size={[0.026, 0.026, 0.026]} at={j.shoulder} material={m.painted} />
      <Rod from={j.shoulder} to={j.ball} radius={0.007} material={m.steel} />
      <Ball at={j.ball} radius={0.014} material={m.steel} />

      <group position={place.centre} rotation={[place.pitch, place.yaw, 0, "YXZ"]}>
        {/* The motor's hub, from the blades' back to the ball joint. */}
        <mesh position={[0, 0, -(half + hub.depth) / 2]} rotation={[Math.PI / 2, 0, 0]} material={own.hub}>
          <cylinderGeometry args={[hub.radius, hub.radius, hub.depth - half, 24]} />
        </mesh>
        {/* No cover: the fan is only as thick as its blades, the LEDs on their front. */}
        <mesh position={[0, 0, -half]} material={own.blades}>
          <planeGeometry args={[HOLO_FAN.sweep, HOLO_FAN.sweep]} />
        </mesh>
        <mesh position={[0, 0, half]} material={own.picture}>
          <planeGeometry args={[HOLO_FAN.sweep, HOLO_FAN.sweep]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={own.edge}>
          <cylinderGeometry args={[r, r, 2 * half, 64, 1, true]} />
        </mesh>
      </group>
    </>
  );
}
