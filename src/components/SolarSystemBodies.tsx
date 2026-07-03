"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES } from "@/lib/bodies";
import { orbitRadiusScene } from "@/lib/scale";
import { BodyPlaceholder, CelestialBodyMesh } from "./CelestialBodyMesh";
import { EpicycleTrails } from "./EpicycleTrails";
import { OrbitRing } from "./OrbitRing";

interface SolarSystemBodiesProps {
  simDaysRef: React.RefObject<number>;
  focusId: string;
  epicycleTracing: boolean;
  trailDissolve: boolean;
  traceResetKey: number;
}

function MoonOrbitAnchor({
  parentId,
  simDaysRef,
  children,
}: {
  parentId: string;
  simDaysRef: React.RefObject<number>;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const parentPos = getBodyStates(simDaysRef.current ?? 0).get(parentId)
      ?.localPosition;
    if (parentPos) groupRef.current.position.copy(parentPos);
  });

  return <group ref={groupRef}>{children}</group>;
}

export function SolarSystemBodies({
  simDaysRef,
  focusId,
  epicycleTracing,
  trailDissolve,
  traceResetKey,
}: SolarSystemBodiesProps) {
  const systemRef = useRef<THREE.Group>(null);

  const planetOrbits = useMemo(
    () =>
      BODIES.filter((body) => body.parentId === "sun" && body.distanceAu > 0).map(
        (body) => ({
          body,
          radius: orbitRadiusScene(body.distanceAu),
        }),
      ),
    [],
  );

  const moons = useMemo(
    () => BODIES.filter((body) => body.kind === "moon"),
    [],
  );

  useFrame(() => {
    if (!systemRef.current) return;
    const focusState = getBodyStates(simDaysRef.current ?? 0).get(focusId);
    if (!focusState) return;
    systemRef.current.position.copy(focusState.localPosition).multiplyScalar(-1);
  });

  return (
    <>
      <group ref={systemRef}>
        {planetOrbits.map(({ body, radius }) => (
          <OrbitRing
            key={`orbit-${body.id}`}
            body={body}
            semiMajor={radius}
            color="#ffffff"
            opacity={0.9}
            lineWidth={0.65}
          />
        ))}

        {moons.map((moon) => {
          const radius = orbitRadiusScene(moon.distanceAu);
          return (
            <MoonOrbitAnchor
              key={`moon-orbit-${moon.id}`}
              parentId={moon.parentId ?? "sun"}
              simDaysRef={simDaysRef}
            >
              <OrbitRing
                body={moon}
                semiMajor={radius}
                color="#ffffff"
                opacity={0.55}
                lineWidth={0.45}
              />
            </MoonOrbitAnchor>
          );
        })}

        {BODIES.map((body) => (
          <Suspense
            key={body.id}
            fallback={<BodyPlaceholder body={body} simDaysRef={simDaysRef} />}
          >
            <CelestialBodyMesh body={body} simDaysRef={simDaysRef} />
          </Suspense>
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