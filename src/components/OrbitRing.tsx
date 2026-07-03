"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { BodyDefinition } from "@/lib/bodies";
import {
  buildOrbitRibbonGeometry,
  orbitRibbonSegments,
  orbitViewDistance,
} from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

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
  const camera = useThree((state) => state.camera);
  const meshRef = useRef<THREE.Mesh>(null);
  const segmentsRef = useRef(-1);

  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  const eccentricity = body.eccentricity ?? 0;

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [color, opacity],
  );

  const geometry = useMemo(() => {
    const viewDistance = orbitViewDistance(camera, majorAxis);
    const segments = orbitRibbonSegments(
      majorAxis,
      eccentricity,
      viewDistance,
    );
    segmentsRef.current = segments;
    return buildOrbitRibbonGeometry(body, semiMajor, lineWidth, segments);
  }, [body, semiMajor, lineWidth, majorAxis, eccentricity]);

  const replaceGeometry = (segments: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const next = buildOrbitRibbonGeometry(
      body,
      semiMajor,
      lineWidth,
      segments,
    );
    mesh.geometry.dispose();
    mesh.geometry = next;
    segmentsRef.current = segments;
  };

  useFrame(() => {
    const viewDistance = orbitViewDistance(camera, majorAxis);
    const segments = orbitRibbonSegments(
      majorAxis,
      eccentricity,
      viewDistance,
    );
    const current = segmentsRef.current;
    if (current < 0) return;
    if (segments === current) return;
    const delta = Math.abs(segments - current) / current;
    if (delta < 0.18) return;
    replaceGeometry(segments);
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={0}
    />
  );
}