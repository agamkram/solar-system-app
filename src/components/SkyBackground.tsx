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

    const delay = isPhoneDevice() ? 900 : isIpadDevice() ? 500 : 0;
    const timer = window.setTimeout(() => {
      void loadSky();
    }, delay);

    const refreshBackground = () => {
      if (!skyTextureCache.texture) return;
      applySceneBackground(scene, skyTextureCache.texture);
      skyTextureCache.texture.needsUpdate = true;
    };

    window.addEventListener("resize", refreshBackground);

    const onContextRestore = () => {
      void loadSkyTexture(gl).then((texture) => {
        if (!texture) return;
        applySceneBackground(scene, texture);
      });
    };
    gl.domElement.addEventListener("webglcontextrestored", onContextRestore);

    // iPad pinch can drop scene.background — re-apply when the viewport settles.
    const vv = window.visualViewport;
    const onViewportChange = () => refreshBackground();
    if (isIpadDevice() && vv) {
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", refreshBackground);
      gl.domElement.removeEventListener("webglcontextrestored", onContextRestore);
      if (isIpadDevice() && vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
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