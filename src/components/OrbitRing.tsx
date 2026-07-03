"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Line2 } from "three-stdlib";
import type { LineMaterial } from "three-stdlib";
import * as THREE from "three";

import type { BodyDefinition } from "@/lib/bodies";
import { orbitUsesRibbonMesh } from "@/lib/device-profile";
import {
  buildOrbitLinePoints,
  buildOrbitTubeGeometry,
  orbitLineDivisions,
  worldPerPixel,
} from "@/lib/orbits";
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

function useOrbitLod(
  majorAxis: number,
  eccentricity: number,
  ribbon: boolean,
) {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  const lodTimerRef = useRef(0);
  const divisionsRef = useRef(-1);

  const [divisions, setDivisions] = useState(() =>
    orbitLineDivisions(majorAxis, camera, size.height, eccentricity, ribbon),
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
      ribbon,
    );
    divisionsRef.current = next;
    setDivisions(next);
  }, [majorAxis, eccentricity, ribbon, size.height]);

  useFrame((_, delta) => {
    lodTimerRef.current += delta;
    if (lodTimerRef.current < LOD_INTERVAL_SEC) return;
    lodTimerRef.current = 0;

    const next = orbitLineDivisions(
      majorAxis,
      camera,
      size.height,
      eccentricity,
      ribbon,
    );
    const current = divisionsRef.current;
    if (current < 0) return;
    const ratio = next / current;
    if (ratio > 1 / LOD_CHANGE_RATIO && ratio < LOD_CHANGE_RATIO) return;
    divisionsRef.current = next;
    setDivisions(next);
  });

  return { divisions, size, camera };
}

/** Screen-space Line2 — fine on desktop; iOS leaves gaps between segment quads. */
function OrbitLineRing({
  body,
  semiMajor,
  color,
  opacity,
  lineWidth,
  majorAxis,
  eccentricity,
}: OrbitRingProps & { majorAxis: number; eccentricity: number }) {
  const lineRef = useRef<Line2>(null);
  const { divisions, size } = useOrbitLod(majorAxis, eccentricity, false);

  const points = useMemo(
    () => buildOrbitLinePoints(body, semiMajor, divisions),
    [body, semiMajor, divisions],
  );

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

/** Flat tube ribbon — triangles, not GL lines; the iOS-safe path. */
function OrbitRibbonRing({
  body,
  semiMajor,
  color,
  opacity,
  lineWidth,
  majorAxis,
  eccentricity,
}: OrbitRingProps & { majorAxis: number; eccentricity: number }) {
  const { divisions, camera, size } = useOrbitLod(majorAxis, eccentricity, true);

  const geometry = useMemo(() => {
    const wpp = worldPerPixel(camera, size.height);
    return buildOrbitTubeGeometry(
      body,
      semiMajor,
      divisions,
      wpp,
      lineWidth,
    );
  }, [body, semiMajor, divisions, lineWidth, camera, size.height]);

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

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={0}
    />
  );
}

export function OrbitRing(props: OrbitRingProps) {
  const majorAxis =
    props.semiMajor ?? orbitRadiusScene(props.body.distanceAu);
  const eccentricity = props.body.eccentricity ?? 0;
  const shared = { ...props, majorAxis, eccentricity };

  if (orbitUsesRibbonMesh()) {
    return <OrbitRibbonRing {...shared} />;
  }

  return <OrbitLineRing {...shared} />;
}