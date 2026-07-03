"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { BodyDefinition } from "@/lib/bodies";
import { isMobileDevice } from "@/lib/device-profile";
import { buildOrbitLoopPoints } from "@/lib/orbits";
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
    const points = buildOrbitLoopPoints(body, semiMajor);
    if (points.length < 4) return null;

    const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.5);
    const tubularSegments = Math.min(
      4096,
      Math.max(1024, points.length * 2),
    );
    const radialSegments = isMobileDevice() ? 5 : 6;

    return new THREE.TubeGeometry(
      curve,
      tubularSegments,
      orbitTubeRadius(majorAxis, lineWidth),
      radialSegments,
      true,
    );
  }, [body, semiMajor, majorAxis, lineWidth]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

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