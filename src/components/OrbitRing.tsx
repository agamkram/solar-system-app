"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import type { LineMaterial } from "three-stdlib";

import type { BodyDefinition } from "@/lib/bodies";
import { buildOrbitLinePoints, orbitLineDivisions } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

interface OrbitRingProps {
  body: BodyDefinition;
  semiMajor?: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

const LOD_INTERVAL_SEC = 0.45;
const LOD_CHANGE_RATIO = 1.45;

export function OrbitRing({
  body,
  semiMajor,
  color = "#ffffff",
  opacity = 0.92,
  lineWidth = 1,
}: OrbitRingProps) {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const lineRef = useRef<Line2>(null);
  const lodTimerRef = useRef(0);
  const divisionsRef = useRef(-1);

  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  const eccentricity = body.eccentricity ?? 0;

  const [divisions, setDivisions] = useState(() =>
    orbitLineDivisions(majorAxis, camera, size.height, eccentricity),
  );

  const points = useMemo(
    () => buildOrbitLinePoints(body, semiMajor, divisions),
    [body, semiMajor, divisions],
  );

  useEffect(() => {
    divisionsRef.current = divisions;
  }, [divisions]);

  useEffect(() => {
    const next = orbitLineDivisions(
      majorAxis,
      camera,
      size.height,
      eccentricity,
    );
    divisionsRef.current = next;
    setDivisions(next);
  }, [body, semiMajor, majorAxis, eccentricity, size.height]);

  useFrame((_, delta) => {
    const material = lineRef.current?.material as LineMaterial | undefined;
    if (material) {
      if (
        material.resolution.x !== size.width ||
        material.resolution.y !== size.height
      ) {
        material.resolution.set(size.width, size.height);
        material.needsUpdate = true;
      }
    }

    lodTimerRef.current += delta;
    if (lodTimerRef.current < LOD_INTERVAL_SEC) return;
    lodTimerRef.current = 0;

    const next = orbitLineDivisions(
      majorAxis,
      camera,
      size.height,
      eccentricity,
    );
    const current = divisionsRef.current;
    if (current < 0) return;
    const ratio = next / current;
    if (ratio > 1 / LOD_CHANGE_RATIO && ratio < LOD_CHANGE_RATIO) return;
    divisionsRef.current = next;
    setDivisions(next);
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      depthWrite={false}
      frustumCulled={false}
    />
  );
}