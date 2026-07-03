"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

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
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
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