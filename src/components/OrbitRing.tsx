"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { BodyDefinition } from "@/lib/bodies";
import { buildOrbitLoopPoints } from "@/lib/orbits";

interface OrbitRingProps {
  body: BodyDefinition;
  semiMajor?: number;
  color?: string;
  opacity?: number;
  lineWidth?: number;
}

function toLineLoopGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  let count = points.length;
  if (
    count > 1 &&
    points[0].distanceToSquared(points[count - 1]) < 1e-16
  ) {
    count -= 1;
  }

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function OrbitRing({
  body,
  semiMajor,
  color = "#ffffff",
  opacity = 0.92,
}: OrbitRingProps) {
  const line = useMemo(() => {
    const points = buildOrbitLoopPoints(body, semiMajor);
    const geometry = toLineLoopGeometry(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    });
    const loop = new THREE.LineLoop(geometry, material);
    loop.frustumCulled = false;
    loop.renderOrder = 0;
    return loop;
  }, [body, semiMajor, color, opacity]);

  useEffect(() => {
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}