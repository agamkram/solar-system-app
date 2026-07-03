"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { BodyDefinition } from "@/lib/bodies";
import { createOrbitCurve, orbitTubeTubularSegments } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

interface OrbitRingProps {
  body: BodyDefinition;
  semiMajor?: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

function orbitTubeRadius(majorAxis: number, lineWidth = 0.6): number {
  const scale = 0.00042 * (lineWidth / 0.6);
  return Math.max(0.0009, majorAxis * scale);
}

export function OrbitRing({
  body,
  semiMajor,
  color = "#ffffff",
  opacity = 0.92,
  lineWidth = 0.6,
}: OrbitRingProps) {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);

  const geometry = useMemo(() => {
    const curve = createOrbitCurve(body, semiMajor);
    return new THREE.TubeGeometry(
      curve,
      orbitTubeTubularSegments(),
      orbitTubeRadius(majorAxis, lineWidth),
      12,
      true,
    );
  }, [body, semiMajor, majorAxis, lineWidth]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={0}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}