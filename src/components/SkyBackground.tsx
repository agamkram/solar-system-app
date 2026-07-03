"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import { fitTextureToGpuLimit } from "@/lib/gpu-texture";

export function SkyBackground() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    loader.load("/stars-8k.jpg", (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }

      fitTextureToGpuLimit(texture, gl.capabilities.maxTextureSize);

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
    });

    return () => {
      cancelled = true;
      scene.background = null;
    };
  }, [gl, scene]);

  return null;
}