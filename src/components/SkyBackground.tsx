"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  isIpadDevice,
  isMobileDevice,
  isPhoneDevice,
  skyTextureUploadSize,
} from "@/lib/device-profile";
import {
  fitTextureToGpuLimit,
  loadPhoneSkyImage,
  loadSkyImageResized,
  textureFromImageSource,
} from "@/lib/gpu-texture";
import { skyTextureCache } from "@/lib/sky-texture-cache";

function skyAssetUrl(): string {
  if (isPhoneDevice()) return "/stars-phone.jpg?v=3";
  return "/stars-8k.jpg";
}

function applySkyTexture(scene: THREE.Scene, texture: THREE.Texture): void {
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  skyTextureCache.texture = texture;
  scene.background = texture;
}

export function SkyBackground() {
  const { gl, scene } = useThree();
  const loadingRef = useRef(false);

  useEffect(() => {
    if (skyTextureCache.texture) {
      scene.background = skyTextureCache.texture;
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    let cancelled = false;

    const loadSky = async () => {
      const phone = isPhoneDevice();
      const maxSize = Math.min(
        gl.capabilities.maxTextureSize,
        skyTextureUploadSize(),
      );

      try {
        let texture: THREE.Texture;
        if (isMobileDevice()) {
          const source = phone
            ? await loadPhoneSkyImage(skyAssetUrl())
            : await loadSkyImageResized(skyAssetUrl(), maxSize);
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

        if (cancelled) {
          texture.dispose();
          return;
        }

        applySkyTexture(scene, texture);
      } catch {
        /* solid color fallback from Canvas onCreated */
      } finally {
        loadingRef.current = false;
      }
    };

    const delay = isPhoneDevice() ? 900 : isIpadDevice() ? 500 : 0;
    const timer = window.setTimeout(() => {
      void loadSky();
    }, delay);

    const onResize = () => {
      if (skyTextureCache.texture) {
        scene.background = skyTextureCache.texture;
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [gl, scene]);

  // Re-apply if another system (resize, R3F reconcile) clears scene.background.
  useFrame(() => {
    if (
      skyTextureCache.texture &&
      scene.background !== skyTextureCache.texture
    ) {
      scene.background = skyTextureCache.texture;
    }
  });

  return null;
}