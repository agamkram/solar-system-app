"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import type { LineMaterial } from "three-stdlib";

import type { BodyDefinition } from "@/lib/bodies";
import { buildOrbitLoopPoints } from "@/lib/orbits";

interface OrbitRingProps {
  body: BodyDefinition;
  semiMajor?: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

export function OrbitRing({
  body,
  semiMajor,
  color = "#ffffff",
  opacity = 0.92,
  lineWidth = 0.6,
}: OrbitRingProps) {
  const size = useThree((state) => state.size);
  const lineRef = useRef<Line2>(null);

  const points = useMemo(
    () => buildOrbitLoopPoints(body, semiMajor),
    [body, semiMajor],
  );

  useLayoutEffect(() => {
    const material = lineRef.current?.material as LineMaterial | undefined;
    if (material) {
      material.resolution.set(size.width, size.height);
      material.needsUpdate = true;
    }
  }, [size.width, size.height]);

  useFrame(() => {
    const material = lineRef.current?.material as LineMaterial | undefined;
    if (!material) return;
    if (
      material.resolution.x !== size.width ||
      material.resolution.y !== size.height
    ) {
      material.resolution.set(size.width, size.height);
      material.needsUpdate = true;
    }
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