import * as THREE from "three";

let starTexture: THREE.CanvasTexture | null | undefined;

/** Tiny nearest-filter sprite — same as SuperMoon / OrbitalView. */
export function getStarPointTexture(): THREE.CanvasTexture | null {
  if (starTexture !== undefined) return starTexture;

  if (typeof document === "undefined") {
    starTexture = null;
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    starTexture = null;
    return null;
  }

  ctx.clearRect(0, 0, 8, 8);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(3, 3, 2, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  starTexture = texture;
  return texture;
}
