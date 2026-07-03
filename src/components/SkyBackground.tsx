"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { isMobileDevice, maxAssetTextureSize } from "@/lib/device-profile";
import {
  fitTextureToGpuLimit,
  loadImageResized,
  textureFromImageSource,
} from "@/lib/gpu-texture";

export function SkyBackground() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    let texture: THREE.Texture | null = null;

    const applySky = async () => {
      const maxSize = maxAssetTextureSize(gl.capabilities.maxTextureSize);

      try {
        if (isMobileDevice()) {
          const source = await loadImageResized("/stars-8k.jpg", maxSize);
          if (cancelled) {
            if ("close" in source && typeof source.close === "function") {
              source.close();
            }
            return;
          }
          texture = textureFromImageSource(source, maxSize);
        } else {
          texture = await new Promise<THREE.Texture>((resolve, reject) => {
            new THREE.TextureLoader().load(
              "/stars-8k.jpg",
              resolve,
              undefined,
              reject,
            );
          });
          if (cancelled) {
            texture.dispose();
            return;
          }
          fitTextureToGpuLimit(texture, maxSize);
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.anisotropy = Math.min(
          4,
          gl.capabilities.getMaxAnisotropy(),
        );
        texture.needsUpdate = true;
        scene.background = texture;
      } catch {
        /* keep solid background on failure */
      }
    };

    void applySky();

    return () => {
      cancelled = true;
      scene.background = null;
      texture?.dispose();
    };
  }, [gl, scene]);

  return null;
}