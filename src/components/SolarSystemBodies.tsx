"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES } from "@/lib/bodies";
import { CelestialBodyMesh } from "./CelestialBodyMesh";
import { EpicycleTrails } from "./EpicycleTrails";
import { OrbitLinesOverlay } from "./OrbitLinesOverlay";

interface SolarSystemBodiesProps {
  simDaysRef: React.RefObject<number>;
  focusId: string;
  epicycleTracing: boolean;
  trailDissolve: boolean;
  traceResetKey: number;
}

export function SolarSystemBodies({
  simDaysRef,
  focusId,
  epicycleTracing,
  trailDissolve,
  traceResetKey,
}: SolarSystemBodiesProps) {
  const systemRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!systemRef.current) return;
    const focusState = getBodyStates(simDaysRef.current ?? 0).get(focusId);
    if (!focusState) return;
    systemRef.current.position.copy(focusState.localPosition).multiplyScalar(-1);
  });

  return (
    <>
      <OrbitLinesOverlay focusId={focusId} simDaysRef={simDaysRef} />

      <group ref={systemRef}>
        {BODIES.map((body) => (
          <CelestialBodyMesh
            key={body.id}
            body={body}
            focusId={focusId}
            simDaysRef={simDaysRef}
          />
        ))}
      </group>

      {epicycleTracing && (
        <EpicycleTrails
          focusId={focusId}
          simDaysRef={simDaysRef}
          tracing={epicycleTracing}
          dissolve={trailDissolve}
          traceResetKey={traceResetKey}
        />
      )}
    </>
  );
}