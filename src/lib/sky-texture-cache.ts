import type * as THREE from "three";

/** Session cache — survives canvas resizes and component remounts on touch devices. */
export const skyTextureCache: { texture: THREE.Texture | null } = {
  texture: null,
};