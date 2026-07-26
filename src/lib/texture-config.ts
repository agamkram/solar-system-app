import * as THREE from "three";

import { isMobileDevice, useTextureMipmaps } from "./device-profile";

export function configureColorMap(
  texture: THREE.Texture,
  renderer?: THREE.WebGLRenderer,
): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const mipmaps = useTextureMipmaps();
  texture.minFilter = mipmaps
    ? THREE.LinearMipmapLinearFilter
    : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const maxAniso = renderer?.capabilities.getMaxAnisotropy() ?? 1;
  texture.anisotropy = isMobileDevice() ? 1 : maxAniso;
  texture.generateMipmaps = mipmaps;
  texture.needsUpdate = true;
}