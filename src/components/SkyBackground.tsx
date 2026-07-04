"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { isIpadDevice, isPhoneDevice } from "@/lib/device-profile";
import { loadSkyTexture } from "@/lib/load-sky-texture";
import { skyTextureCache } from "@/lib/sky-texture-cache";

function applySceneBackground(scene: THREE.Scene, texture: THREE.Texture): void {
  scene.background = texture;
}

export function SkyBackground() {
  const { gl, scene } = useThree();
  const loadingRef = useRef(false);

  useEffect(() => {
    if (skyTextureCache.texture) {
      applySceneBackground(scene, skyTextureCache.texture);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    let cancelled = false;

    const loadSky = async () => {
      try {
        const texture = await loadSkyTexture(gl);
        if (cancelled || !texture) return;
        applySceneBackground(scene, texture);
      } catch {
        /* solid color fallback from Canvas onCreated */
      } finally {
        loadingRef.current = false;
      }
    };

    // iPad: wait for planet textures (queued, one at a time) before uploading sky.
    const delay = isPhoneDevice() ? 900 : isIpadDevice() ? 1400 : 0;
    const timer = window.setTimeout(() => {
      void loadSky();
    }, delay);

    let resizeTimer = 0;
    const refreshBackground = () => {
      if (!skyTextureCache.texture) return;
      applySceneBackground(scene, skyTextureCache.texture);
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshBackground, 200);
    };

    window.addEventListener("resize", onResize);

    const onContextRestore = () => {
      void loadSkyTexture(gl).then((texture) => {
        if (!texture) return;
        applySceneBackground(scene, texture);
      });
    };
    gl.domElement.addEventListener("webglcontextrestored", onContextRestore);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      gl.domElement.removeEventListener("webglcontextrestored", onContextRestore);
    };
  }, [gl, scene]);

  useFrame(() => {
    if (
      skyTextureCache.texture &&
      scene.background !== skyTextureCache.texture
    ) {
      applySceneBackground(scene, skyTextureCache.texture);
    }
  });

  return null;
}