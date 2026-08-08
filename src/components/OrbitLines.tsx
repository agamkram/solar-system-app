"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, type BodyDefinition } from "@/lib/bodies";
import { isPhoneDevice, orbitLineDivisionCap } from "@/lib/device-profile";
import { buildOrbitLinePoints } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

interface OrbitPathDef {
  body: BodyDefinition;
  parentId: string | null;
  opacity: number;
  divisions: number;
}

interface OrbitLinesProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
}

/**
 * Orbit paths as WebGL lines (same scene as planets).
 * No DOM canvas overlay — avoids Safari compositing fights.
 */
export function OrbitLines({ focusId, simDaysRef }: OrbitLinesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const moonAnchorsRef = useRef<Map<string, THREE.Group>>(new Map());
  const phone = isPhoneDevice();

  const paths = useMemo<OrbitPathDef[]>(() => {
    const div = phone ? orbitLineDivisionCap() : Math.min(orbitLineDivisionCap(), 256);
    const defs: OrbitPathDef[] = [];

    for (const body of BODIES) {
      if (body.parentId === "sun" && body.distanceAu > 0) {
        defs.push({
          body,
          parentId: null,
          opacity: 0.55,
          divisions: div,
        });
      }
    }
    for (const body of BODIES) {
      if (body.kind !== "moon") continue;
      defs.push({
        body,
        parentId: body.parentId ?? "sun",
        opacity: 0.4,
        divisions: Math.min(div, 96),
      });
    }
    return defs;
  }, [phone]);

  const lineObjects = useMemo(() => {
    const items: {
      id: string;
      parentId: string | null;
      line: THREE.Line;
    }[] = [];

    for (const path of paths) {
      const semi = orbitRadiusScene(path.body.distanceAu);
      const pts = buildOrbitLinePoints(path.body, semi, path.divisions);
      // Close the loop
      if (pts.length > 1) pts.push(pts[0].clone());

      const positions = new Float32Array(pts.length * 3);
      for (let i = 0; i < pts.length; i++) {
        positions[i * 3] = pts[i].x;
        positions[i * 3 + 1] = pts[i].y;
        positions[i * 3 + 2] = pts[i].z;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: path.opacity,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = -5;
      items.push({ id: path.body.id, parentId: path.parentId, line });
    }

    return items;
  }, [paths]);

  useEffect(() => {
    return () => {
      for (const item of lineObjects) {
        item.line.geometry.dispose();
        (item.line.material as THREE.Material).dispose();
      }
    };
  }, [lineObjects]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const states = getBodyStates(simDaysRef.current ?? 0);
    const focus = states.get(focusId);
    if (focus) {
      group.position.copy(focus.localPosition).multiplyScalar(-1);
    } else {
      group.position.set(0, 0, 0);
    }

    // Moon orbits ride with their parent planet.
    for (const [bodyId, anchor] of moonAnchorsRef.current) {
      const path = paths.find((p) => p.body.id === bodyId);
      if (!path?.parentId) continue;
      const parent = states.get(path.parentId);
      if (parent) anchor.position.copy(parent.localPosition);
    }
  });

  return (
    <group ref={groupRef}>
      {lineObjects.map((item) => {
        if (item.parentId) {
          return (
            <group
              key={item.id}
              ref={(node) => {
                if (node) moonAnchorsRef.current.set(item.id, node);
                else moonAnchorsRef.current.delete(item.id);
              }}
            >
              <primitive object={item.line} />
            </group>
          );
        }
        return <primitive key={item.id} object={item.line} />;
      })}
    </group>
  );
}
