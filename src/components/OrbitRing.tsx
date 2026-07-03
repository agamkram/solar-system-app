"use client";

import { useMemo } from "react";
import { Line } from "@react-three/drei";

import type { BodyDefinition } from "@/lib/bodies";
import { buildOrbitLoopPoints } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

interface OrbitRingProps {
  body: BodyDefinition;
  semiMajor?: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

/** World-space line thickness — scales gently with orbit size. */
function orbitWorldLineWidth(majorAxis: number, lineWidth = 0.6): number {
  const scale = 0.00084 * (lineWidth / 0.6);
  return Math.max(0.0016, majorAxis * scale);
}

export function OrbitRing({
  body,
  semiMajor,
  color = "#ffffff",
  opacity = 0.92,
  lineWidth = 0.6,
}: OrbitRingProps) {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);

  const points = useMemo(
    () => buildOrbitLoopPoints(body, semiMajor),
    [body, semiMajor],
  );

  const worldLineWidth = useMemo(
    () => orbitWorldLineWidth(majorAxis, lineWidth),
    [majorAxis, lineWidth],
  );

  return (
    <Line
      points={points}
      color={color}
      lineWidth={worldLineWidth}
      worldUnits
      transparent
      opacity={opacity}
      depthWrite={false}
      frustumCulled={false}
    />
  );
}