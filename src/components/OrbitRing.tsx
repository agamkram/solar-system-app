"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";

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
  const points = useMemo(
    () => buildOrbitLoopPoints(body, semiMajor),
    [body, semiMajor],
  );

  return (
    <Line
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