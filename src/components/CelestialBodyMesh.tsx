"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { type BodyDefinition } from "@/lib/bodies";
import { bodyRadiusScene } from "@/lib/scale";
import { rotationSpeedRadPerDay } from "@/lib/orbits";
import { createSaturnRingGeometry } from "@/lib/saturn-ring-geometry";
import { configureColorMap } from "@/lib/texture-config";

export interface CelestialBodyMeshProps {
  body: BodyDefinition;
  simDaysRef: React.RefObject<number>;
}

const PLACEHOLDER_COLORS: Record<string, string> = {
  sun: "#ffcc88",
  mercury: "#9a8f84",
  venus: "#c9b07a",
  earth: "#4a7ab8",
  moon: "#9a9a9a",
  mars: "#b85c4a",
  jupiter: "#c9a882",
  saturn: "#d4c4a0",
  uranus: "#8ec8d8",
  neptune: "#4a6eb8",
  pluto: "#c9a882",
};

function sphereDetail(body: BodyDefinition): number {
  if (body.id === "earth") return 96;
  if (body.kind === "star") return 64;
  return 72;
}

function useBodyMotion(
  groupRef: React.RefObject<THREE.Group | null>,
  bodyId: string,
  simDaysRef: React.RefObject<number>,
  spinSpeed: number,
) {
  useFrame(() => {
    if (!groupRef.current) return;
    const days = simDaysRef.current ?? 0;
    const state = getBodyStates(days).get(bodyId);
    if (!state) return;
    groupRef.current.position.copy(state.localPosition);
    groupRef.current.rotation.y = days * spinSpeed;
  });
}

function getTexturePaths(body: BodyDefinition): string[] {
  return [body.texture, body.atmosphereTexture, body.ringTexture].filter(
    Boolean,
  ) as string[];
}

function splitMaps(body: BodyDefinition, mapArray: THREE.Texture[]) {
  let textureIndex = 0;
  const map = body.texture ? mapArray[textureIndex++] : null;
  const atmosphereMap = body.atmosphereTexture
    ? mapArray[textureIndex++]
    : null;
  const ringMap = body.ringTexture ? mapArray[textureIndex++] : null;
  return { map, atmosphereMap, ringMap };
}

interface BodyMeshVisualProps extends CelestialBodyMeshProps {
  map: THREE.Texture | null;
  atmosphereMap: THREE.Texture | null;
  ringMap: THREE.Texture | null;
}

function BodyPlaceholderMesh({ body, simDaysRef }: CelestialBodyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const radius = bodyRadiusScene(body.radiusKm);
  const spinSpeed = rotationSpeedRadPerDay(body.rotationPeriodHours);
  const tiltRad = (body.axialTiltDeg * Math.PI) / 180;
  const color = body.color ?? PLACEHOLDER_COLORS[body.id] ?? "#888888";

  useBodyMotion(groupRef, body.id, simDaysRef, spinSpeed);

  if (body.kind === "star") {
    return (
      <group ref={groupRef}>
        <pointLight intensity={2.4} distance={0} decay={0} color="#fff4e8" />
        <mesh rotation={[tiltRad, 0, 0]}>
          <sphereGeometry args={[radius, 48, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <group rotation={[tiltRad, 0, 0]}>
        <mesh>
          <sphereGeometry args={[radius, 48, 48]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
}

function CelestialBodyVisual({
  body,
  simDaysRef,
  map,
  atmosphereMap,
  ringMap,
}: BodyMeshVisualProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const radius = bodyRadiusScene(body.radiusKm);
  const spinSpeed = rotationSpeedRadPerDay(body.rotationPeriodHours);
  const tiltRad = (body.axialTiltDeg * Math.PI) / 180;
  const segments = sphereDetail(body);
  const placeholderColor =
    body.color ?? PLACEHOLDER_COLORS[body.id] ?? "#888888";

  const ringInner = radius * 1.35;
  const ringOuter = radius * 2.15;
  const ringGeometry = useMemo(
    () =>
      body.ringTexture
        ? createSaturnRingGeometry(ringInner, ringOuter, 128)
        : null,
    [body.ringTexture, ringInner, ringOuter],
  );

  useEffect(() => {
    for (const texture of [map, atmosphereMap, ringMap]) {
      if (texture) configureColorMap(texture, gl);
    }
    if (ringMap) {
      ringMap.wrapS = THREE.ClampToEdgeWrapping;
      ringMap.wrapT = THREE.ClampToEdgeWrapping;
      ringMap.needsUpdate = true;
    }
  }, [gl, map, atmosphereMap, ringMap]);

  useEffect(() => {
    return () => {
      ringGeometry?.dispose();
    };
  }, [ringGeometry]);

  useBodyMotion(groupRef, body.id, simDaysRef, spinSpeed);

  if (body.kind === "star") {
    return (
      <group ref={groupRef}>
        <pointLight intensity={2.4} distance={0} decay={0} color="#fff4e8" />
        <mesh rotation={[tiltRad, 0, 0]}>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshBasicMaterial map={map ?? undefined} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  const useProceduralAtmosphere = body.id === "earth";

  return (
    <group ref={groupRef}>
      <group rotation={[tiltRad, 0, 0]}>
        <mesh>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshPhongMaterial
            map={map ?? undefined}
            color={
              map
                ? body.color
                  ? new THREE.Color(body.color)
                  : "#ffffff"
                : placeholderColor
            }
            shininess={body.id === "earth" ? 12 : 8}
          />
        </mesh>

        {useProceduralAtmosphere && (
          <mesh>
            <sphereGeometry args={[radius * 1.012, segments, segments]} />
            <meshBasicMaterial
              color="#7eb8ff"
              transparent
              opacity={0.14}
              depthWrite={false}
            />
          </mesh>
        )}

        {body.atmosphereTexture && !useProceduralAtmosphere && atmosphereMap && (
          <mesh>
            <sphereGeometry args={[radius * 1.002, 48, 48]} />
            <meshPhongMaterial
              map={atmosphereMap}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        )}

        {body.ringTexture && ringMap && ringGeometry && (
          <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={1}>
            <primitive object={ringGeometry} attach="geometry" />
            <meshBasicMaterial
              map={ringMap}
              transparent
              opacity={1}
              alphaTest={0.02}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function CelestialBodyMesh(props: CelestialBodyMeshProps) {
  const texturePaths = getTexturePaths(props.body);
  const maps = useTexture(
    texturePaths.length > 0 ? texturePaths : ["/textures/mercury.jpg"],
  );
  const mapArray = Array.isArray(maps) ? maps : [maps];
  const { map, atmosphereMap, ringMap } = splitMaps(props.body, mapArray);

  return (
    <CelestialBodyVisual
      {...props}
      map={map}
      atmosphereMap={atmosphereMap}
      ringMap={ringMap}
    />
  );
}

export { BodyPlaceholderMesh as BodyPlaceholder };