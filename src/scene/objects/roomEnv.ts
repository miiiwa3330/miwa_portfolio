import * as THREE from "three";
import type { NeonTheme } from "../room/lighting";

/**
 * Procedural PMREM environment map for the room: places bright warm amber and
 * cool cyan light panels inside a dark cylindrical steel enclosure so metallic
 * furniture, chair legs, monitors, and deck plates catch realistic specular
 * reflections matching the reference mood (`reference/4/2.png`).
 */
export function createRoomEnvironment(renderer: THREE.WebGLRenderer, neon: NeonTheme): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color("#07090e");

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: "#121620", side: THREE.BackSide })
  );
  envScene.add(shell);

  const cards: { pos: [number, number, number]; look: [number, number, number]; size: [number, number]; color: string }[] = [
    // Overhead soft warm pool
    { pos: [0, 2.4, 0], look: [0, 0, 0], size: [2.4, 2.4], color: "#ffd7a6" },
    // Warm amber reflections (shelf, lamp, door, board)
    { pos: [-2.4, 1.3, 1.8], look: [0, 1.2, 0], size: [1.8, 1.4], color: neon.warm },
    { pos: [2.2, 1.4, -1.6], look: [0, 1.2, 0], size: [2.2, 1.2], color: neon.warm },
    { pos: [-1.4, 1.2, -2.5], look: [0, 1.2, 0], size: [1.4, 1.2], color: "#ffbe73" },
    // Cool cyan reflections (PC monitor, hologram, porthole, comms)
    { pos: [0.2, 1.3, -2.8], look: [0, 1.2, 0], size: [2.2, 1.2], color: neon.cool },
    { pos: [2.6, 1.6, 1.2], look: [0, 1.2, 0], size: [1.6, 1.6], color: "#4fe8ff" },
    { pos: [-2.6, 1.2, -0.8], look: [0, 1.2, 0], size: [1.2, 1.0], color: neon.cool },
    // Subtle magenta neon bounce from colony shaft
    { pos: [2.4, 1.7, 1.8], look: [0, 1.4, 0], size: [0.9, 1.1], color: "#d84dff" },
  ];

  const disposable: (THREE.BufferGeometry | THREE.Material)[] = [shell.geometry, shell.material as THREE.Material];
  for (const c of cards) {
    const geom = new THREE.PlaneGeometry(c.size[0], c.size[1]);
    const mat = new THREE.MeshBasicMaterial({ color: c.color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(...c.pos);
    mesh.lookAt(...c.look);
    envScene.add(mesh);
    disposable.push(geom, mat);
  }

  const target = pmrem.fromScene(envScene, 0.04);
  for (const item of disposable) item.dispose();
  pmrem.dispose();
  return target.texture;
}
