"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { isMobileDevice, isPhoneDevice, skyTextureUploadSize } from "@/lib/device-profile";
import {
  fitTextureToGpuLimit,
  loadImageResized,
  textureFromImageSource,
} from "@/lib/gpu-texture";

function skyAssetUrl(): string {
  if (isPhoneDevice()) return "/stars-2k.jpg";
  if (isMobileDevice()) return "/stars-4k.jpg";
  return "/stars-8k.jpg";
}

export function SkyBackground() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    let texture: THREE.Texture | null = null;

    const applySky = async () => {
      const maxSize = Math.min(
        gl.capabilities.maxTextureSize,
        skyTextureUploadSize(),
      );

      try {
        if (isMobileDevice()) {
          const source = await loadImageResized(skyAssetUrl(), maxSize);
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
              skyAssetUrl(),
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
        texture.anisotropy = 1;
        texture.needsUpdate = true;
        scene.background = texture;
      } catch {
        /* keep solid background on failure */
      }
    };

    const delay = isPhoneDevice() ? 900 : 0;
    const timer = window.setTimeout(() => {
      void applySky();
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      scene.background = null;
      texture?.dispose();
    };
  }, [gl, scene]);

  return null;
}