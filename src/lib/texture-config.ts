import * as THREE from "three";

export function configureColorMap(
  texture: THREE.Texture,
  renderer?: THREE.WebGLRenderer,
): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer
    ? renderer.capabilities.getMaxAnisotropy()
    : texture.anisotropy;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}