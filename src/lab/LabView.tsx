"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useAppState } from "@/state/AppStateContext";
import { neonTheme, ROOM_EXPOSURE } from "@/scene/room/lighting";
import { Board, Bookcase, Comms, Desk, Door, Lights, PortholeAndHammock, Shell, Shelf, Workbench } from "@/scene/objects/RoomScene";
import { eyeFrom, numberParam, viewFrom, viewParams, type OrbitView } from "./orbit";
import { defaultView, partFor, partGroups, type LabPart } from "./parts";

/**
 * The lab: one part of the room at a time, on its own, with an orbiting
 * camera — to look at what is being built without walking the room to it.
 * Development only (`app/lab/page.tsx` returns a 404 in production).
 *
 * The parts are the room's own drawing functions (`RoomScene`), standing
 * where they stand in the room, so what is built here is what the room shows.
 * What is on screen — the part, the lighting, the toggles and the camera — is
 * in the address (`?part=desk-keyboard&light=room&az=30&el=15&d=0.8`), so a
 * view can be asked for again.
 */

type Light = "studio" | "room";

type LabState = { part: string; light: Light; wire: boolean; grid: boolean };

/** The room's own lights, or a plain studio rig to judge a material under. */
function Rig({ light }: { light: Light }) {
  const { lights } = useAppState();
  if (light === "room") return <Lights lights={lights} />;
  return (
    <>
      <hemisphereLight args={["#ffffff", "#3a3a40", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#a8c4ff" />
    </>
  );
}

/** Draws the part under test. */
function Subject({ part }: { part: LabPart }) {
  const { lights } = useAppState();
  const neon = neonTheme(lights);
  switch (part.piece) {
    case "desk":
      // Typing on: the reader's own keys press the HHKB's here too.
      return <Desk typing />;
    case "shelf":
      return <Shelf neon={neon} />;
    case "bookcase":
      return <Bookcase />;
    case "porthole":
      return <PortholeAndHammock />;
    case "board":
      return <Board />;
    case "comms":
      return <Comms neon={neon} />;
    case "door":
      return <Door neon={neon} />;
    case "workbench":
      return <Workbench neon={neon} />;
    case "shell":
      return <Shell ceiling={lights.ceiling} neon={neon} />;
  }
}

/**
 * Everything that writes to the renderer, the scene or the camera, done in a
 * frame callback (the lint rule on hook values forbids it elsewhere): the
 * exposure, the wireframe override, and putting the camera where a view asks.
 */
function Driver({ light, wire, part, view, nonce }: { light: Light; wire: boolean; part: LabPart; view: OrbitView; nonce: number }) {
  const placed = useRef(-1);
  const wireMaterial = useRef<THREE.MeshBasicMaterial | null>(null);
  useFrame((state) => {
    state.gl.toneMappingExposure = light === "room" ? ROOM_EXPOSURE : 1;
    if (wire) {
      wireMaterial.current ??= new THREE.MeshBasicMaterial({ color: "#7fd6ff", wireframe: true });
      state.scene.overrideMaterial = wireMaterial.current;
    } else {
      state.scene.overrideMaterial = null;
    }
    if (placed.current !== nonce) {
      const controls = state.controls as unknown as OrbitControlsImpl | null;
      if (!controls) return;
      const eye = eyeFrom(part.target, view);
      state.camera.position.set(eye[0], eye[1], eye[2]);
      controls.target.set(part.target[0], part.target[1], part.target[2]);
      controls.update();
      placed.current = nonce;
    }
  });
  return null;
}

function Stage({
  state,
  part,
  view,
  nonce,
  onOrbit,
}: {
  state: LabState;
  part: LabPart;
  view: OrbitView;
  nonce: number;
  onOrbit: (view: OrbitView) => void;
}) {
  return (
    <>
      <color attach="background" args={[state.light === "room" ? "#05060a" : "#22252b"]} />
      <Rig light={state.light} />
      <Subject part={part} />
      {state.grid && <gridHelper args={[6, 12, "#4a4f58", "#2c3037"]} position={[part.target[0], 0.001, part.target[2]]} />}
      <OrbitControls
        makeDefault
        enableDamping={false}
        minDistance={0.08}
        maxDistance={9}
        onEnd={(e) => {
          if (!e) return;
          const controls = e.target as unknown as OrbitControlsImpl;
          const t = controls.target;
          const p = controls.object.position;
          onOrbit(viewFrom([t.x, t.y, t.z], [p.x, p.y, p.z]));
        }}
      />
      <Driver light={state.light} wire={state.wire} part={part} view={view} nonce={nonce} />
    </>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        on ? "border-cyan-400 bg-cyan-400/20 text-cyan-100" : "border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Lab() {
  const search = useSearchParams();
  const initial = partFor(search.get("part"));
  const [state, setState] = useState<LabState>({
    part: initial.id,
    light: search.get("light") === "room" ? "room" : "studio",
    wire: search.get("wire") === "1",
    grid: search.get("grid") !== "0",
  });
  const part = partFor(state.part);
  const fallback = defaultView(initial);
  const [view, setView] = useState<OrbitView>({
    az: numberParam(search.get("az"), fallback.az),
    el: numberParam(search.get("el"), fallback.el),
    d: numberParam(search.get("d"), fallback.d),
  });
  const [nonce, setNonce] = useState(0);

  // The address mirrors the screen. `replaceState`, not the router: the camera
  // moves often and nothing in React needs to hear about it.
  const params = useRef(new URLSearchParams(search.toString()));
  const write = useCallback((patch: Record<string, string | null>) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) params.current.delete(key);
      else params.current.set(key, value);
    }
    window.history.replaceState(null, "", `?${params.current.toString()}`);
  }, []);

  const change = (next: Partial<LabState>) => {
    const merged = { ...state, ...next };
    setState(merged);
    write({ part: merged.part, light: merged.light, wire: merged.wire ? "1" : "0", grid: merged.grid ? "1" : "0" });
  };
  const choose = (next: LabPart) => {
    const v = defaultView(next);
    setView(v);
    setNonce((n) => n + 1);
    change({ part: next.id });
    write(viewParams(v));
  };
  const reset = () => {
    const v = defaultView(part);
    setView(v);
    setNonce((n) => n + 1);
    write(viewParams(v));
  };

  return (
    <div className="fixed inset-0 flex bg-neutral-950 text-sm text-neutral-100" data-lab>
      <nav className="w-60 shrink-0 overflow-y-auto border-r border-white/10 p-3" aria-label="部品">
        <p className="mb-3 text-xs leading-relaxed text-neutral-400">開発専用。本番には存在しない。</p>
        {partGroups().map(({ group, parts }) => (
          <section key={group} className="mb-4">
            <h2 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500">{group}</h2>
            <ul className="space-y-0.5">
              {parts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    aria-current={p.id === part.id}
                    className={`w-full rounded px-2 py-1.5 text-left transition-colors ${
                      p.id === part.id ? "bg-cyan-400/20 text-cyan-100" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className="relative min-w-0 flex-1">
        <Canvas camera={{ fov: 40, near: 0.02, far: 80 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <Stage state={state} part={part} view={view} nonce={nonce} onOrbit={(v) => write(viewParams(v))} />
        </Canvas>
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
          <Toggle on={state.light === "room"} onClick={() => change({ light: state.light === "room" ? "studio" : "room" })}>
            照明: {state.light === "room" ? "部屋" : "無地"}
          </Toggle>
          <Toggle on={state.wire} onClick={() => change({ wire: !state.wire })}>
            ワイヤーフレーム
          </Toggle>
          <Toggle on={state.grid} onClick={() => change({ grid: !state.grid })}>
            床の目盛り
          </Toggle>
          <Toggle on={false} onClick={reset}>
            視点を戻す
          </Toggle>
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 font-mono text-xs text-neutral-300">
          {part.id} · 左ドラッグ: 回す / 右ドラッグ: 動かす / ホイール: 寄る
        </p>
      </main>
    </div>
  );
}

export default function LabView() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
