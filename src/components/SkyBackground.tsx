"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { isIpadDevice, isMobileDevice, isPhoneDevice } from "@/lib/device-profile";
import { loadSkyTexture, skyMeshTexture } from "@/lib/load-sky-texture";
import { skyTextureCache } from "@/lib/sky-texture-cache";
import { godsViewDistance } from "@/lib/scale";

const SKY_RADIUS = () => godsViewDistance() * 22;

/** Inverted sphere — stable on iOS WebGL during pinch/resize (scene.background is not). */
function SkySphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { camera, gl, scene } = useThree();
  const [map, setMap] = useState<THREE.Texture | null>(() => {
    const cached = skyTextureCache.texture;
    return cached ? skyMeshTexture(cached) : null;
  });

  const applyMap = (texture: THREE.Texture | null) => {
    if (!texture) return;
    setMap(skyMeshTexture(texture));
    if (materialRef.current) {
      materialRef.current.needsUpdate = true;
    }
  };

  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x02040a, 0);

    let cancelled = false;
    const delay = isPhoneDevice() ? 900 : isIpadDevice() ? 500 : 0;
    const timer = window.setTimeout(() => {
      void loadSkyTexture(gl).then((texture) => {
        if (cancelled || !texture) return;
        applyMap(texture);
      });
    }, delay);

    const refreshMap = () => {
      if (skyTextureCache.texture) {
        applyMap(skyTextureCache.texture);
      }
    };

    const onContextRestore = () => {
      void loadSkyTexture(gl).then((texture) => {
        if (!texture) return;
        applyMap(texture);
      });
    };

    window.addEventListener("resize", refreshMap);
    gl.domElement.addEventListener("webglcontextrestored", onContextRestore);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", refreshMap);
      gl.domElement.removeEventListener("webglcontextrestored", onContextRestore);
    };
  }, [gl, scene]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[SKY_RADIUS(), 48, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        map={map}
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        transparent={!map}
        opacity={map ? 1 : 0}
      />
    </mesh>
  );
}

/** Equirectangular scene.background — desktop only. */
function SkySceneBackground() {
  const { gl, scene } = useThree();

  useEffect(() => {
    let cancelled = false;

    void loadSkyTexture(gl).then((texture) => {
      if (cancelled || !texture) return;
      scene.background = texture;
    });

    return () => {
      cancelled = true;
    };
  }, [gl, scene]);

  return null;
}

export function SkyBackground() {
  if (isMobileDevice()) {
    return <SkySphere />;
  }
  return <SkySceneBackground />;
}