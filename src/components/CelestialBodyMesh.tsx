"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { type BodyDefinition } from "@/lib/bodies";
import {
  isPhoneDevice,
  loadMoonTexturesOnPhone,
  shouldLoadBodyTextureOnPhone,
  sphereSegments,
} from "@/lib/device-profile";
import { bodyRadiusScene } from "@/lib/scale";
import { rotationSpeedRadPerDay } from "@/lib/orbits";
import { createSaturnRingGeometry } from "@/lib/saturn-ring-geometry";
import { configureColorMap } from "@/lib/texture-config";
import { loadTextureQueued } from "@/lib/texture-loader";

export interface CelestialBodyMeshProps {
  body: BodyDefinition;
  focusId: string;
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

function getTexturePaths(body: BodyDefinition, focusId: string): string[] {
  if (!shouldLoadBodyTextureOnPhone(body.id, focusId)) {
    return [];
  }
  if (
    isPhoneDevice() &&
    !loadMoonTexturesOnPhone() &&
    body.kind === "moon"
  ) {
    return [];
  }
  return [body.texture, body.atmosphereTexture, body.ringTexture].filter(
    Boolean,
  ) as string[];
}

function useQueuedBodyTextures(paths: string[]): (THREE.Texture | null)[] {
  const { gl } = useThree();
  const [textures, setTextures] = useState<(THREE.Texture | null)[]>(() =>
    paths.map(() => null),
  );

  useEffect(() => {
    if (paths.length === 0) return;

    let active = true;
    paths.forEach((path, index) => {
      loadTextureQueued(path, gl)
        .then((texture) => {
          if (!active) return;
          setTextures((current) => {
            if (current[index] === texture) return current;
            const next = [...current];
            next[index] = texture;
            return next;
          });
        })
        .catch(() => {
          /* keep placeholder on failure */
        });
    });

    return () => {
      active = false;
    };
  }, [paths.join("|"), gl]);

  return textures;
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
  const segments = sphereSegments(body.id, body.kind);
  const color = body.color ?? PLACEHOLDER_COLORS[body.id] ?? "#888888";

  useBodyMotion(groupRef, body.id, simDaysRef, spinSpeed);

  if (body.kind === "star") {
    return (
      <group ref={groupRef}>
        <pointLight intensity={2.4} distance={0} decay={0} color="#fff4e8" />
        <mesh rotation={[tiltRad, 0, 0]}>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <group rotation={[tiltRad, 0, 0]}>
        <mesh>
          <sphereGeometry args={[radius, segments, segments]} />
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
  const segments = sphereSegments(body.id, body.kind);
  const placeholderColor =
    body.color ?? PLACEHOLDER_COLORS[body.id] ?? "#888888";

  const ringInner = radius * 1.35;
  const ringOuter = radius * 2.15;
  const ringGeometry = useMemo(
    () =>
      body.ringTexture
        ? createSaturnRingGeometry(
            ringInner,
            ringOuter,
            isPhoneDevice() ? 48 : 128,
          )
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
  const texturePaths = getTexturePaths(props.body, props.focusId);
  const loadedTextures = useQueuedBodyTextures(texturePaths);

  let textureIndex = 0;
  const map = props.body.texture ? loadedTextures[textureIndex++] : null;
  const atmosphereMap = props.body.atmosphereTexture
    ? loadedTextures[textureIndex++]
    : null;
  const ringMap = props.body.ringTexture ? loadedTextures[textureIndex++] : null;

  const texturesReady =
    texturePaths.length === 0 ||
    (loadedTextures.length === texturePaths.length &&
      loadedTextures.every((texture) => texture !== null));

  if (!texturesReady) {
    return <BodyPlaceholderMesh {...props} />;
  }

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