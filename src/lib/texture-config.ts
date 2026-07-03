import * as THREE from "three";

import { isMobileDevice } from "./device-profile";

export function configureColorMap(
  texture: THREE.Texture,
  renderer?: THREE.WebGLRenderer,
): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const maxAniso = renderer?.capabilities.getMaxAnisotropy() ?? 1;
  texture.anisotropy = isMobileDevice()
    ? Math.min(4, maxAniso)
    : maxAniso;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}