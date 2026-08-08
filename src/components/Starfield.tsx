"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { getStarPointTexture } from "@/lib/point-texture";
import {
  buildStarfieldBuffers,
  STAR_COUNT,
  STAR_RADIUS,
  starPointSize,
} from "@/lib/starfield";

/**
 * SuperMoon-style procedural points starfield.
 * Tracks the camera so free zoom never escapes the shell.
 */
export function Starfield() {
  const groupRef = useRef<Group>(null);
  const starTexture = useMemo(() => getStarPointTexture(), []);
  const { positions, colors } = useMemo(
    () => buildStarfieldBuffers(STAR_COUNT, STAR_RADIUS),
    [],
  );
  const size = useMemo(() => starPointSize(), []);

  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <points frustumCulled={false} renderOrder={-10}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={size}
          sizeAttenuation={false}
          vertexColors
          map={starTexture ?? undefined}
          transparent
          alphaTest={0.01}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
