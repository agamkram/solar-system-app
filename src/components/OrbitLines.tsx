"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, BODY_BY_ID, type BodyDefinition } from "@/lib/bodies";
import { buildOrbitLinePoints, orbitLineDivisions } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";
import {
  createHairline,
  disposeHairline,
  setHairlinePoints,
  updateHairlineStrip,
} from "@/lib/screen-line";

interface OrbitPathDef {
  body: BodyDefinition;
  parentId: string | null;
  opacity: number;
}

interface OrbitLinesProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
}

function shouldRebuildDivisions(prev: number, next: number): boolean {
  if (prev <= 0) return true;
  return Math.abs(next - prev) >= Math.max(12, prev * 0.1);
}

function isCloseOrbit(body: BodyDefinition, focusId: string): boolean {
  if (body.id === focusId) return true;
  if (body.parentId === focusId) return true;
  const focus = BODY_BY_ID[focusId];
  if (!focus) return false;
  if (focus.parentId === body.id) return true;
  if (
    focus.parentId &&
    body.parentId === focus.parentId &&
    body.kind === "moon"
  ) {
    return true;
  }
  return false;
}

/**
 * Screen-space hairlines — full loops, no Line2 endcap beads.
 */
export function OrbitLines({ focusId, simDaysRef }: OrbitLinesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const moonAnchorsRef = useRef<Map<string, THREE.Group>>(new Map());
  const linesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const divisionsRef = useRef<Map<string, number>>(new Map());
  const lastCamDistRef = useRef(-1);
  const lastSizeRef = useRef(0);
  const lastFocusRef = useRef(focusId);
  const lastCamPos = useRef(new THREE.Vector3(Number.NaN, 0, 0));
  const lastCamQuat = useRef(new THREE.Quaternion());
  const lastGroupPos = useRef(new THREE.Vector3(Number.NaN, 0, 0));
  const { camera, size } = useThree();

  const paths = useMemo<OrbitPathDef[]>(() => {
    const defs: OrbitPathDef[] = [];
    for (const body of BODIES) {
      if (body.parentId === "sun" && body.distanceAu > 0) {
        defs.push({ body, parentId: null, opacity: 0.55 });
      }
    }
    for (const body of BODIES) {
      if (body.kind !== "moon") continue;
      defs.push({
        body,
        parentId: body.parentId ?? "sun",
        opacity: 0.4,
      });
    }
    return defs;
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const created: THREE.Object3D[] = [];
    const lines = new Map<string, THREE.Mesh>();

    for (const path of paths) {
      const line = createHairline({
        color: 0xffffff,
        opacity: path.opacity,
      });
      line.renderOrder = -5;
      lines.set(path.body.id, line);
      if (path.parentId) {
        const anchor = new THREE.Group();
        anchor.userData.parentId = path.parentId;
        anchor.add(line);
        group.add(anchor);
        moonAnchorsRef.current.set(path.body.id, anchor);
        created.push(anchor);
      } else {
        group.add(line);
        created.push(line);
      }
    }
    linesRef.current = lines;
    divisionsRef.current.clear();
    lastCamDistRef.current = -1;

    return () => {
      for (const obj of created) group.remove(obj);
      for (const line of lines.values()) disposeHairline(line);
      linesRef.current = new Map();
      moonAnchorsRef.current.clear();
    };
  }, [paths]);

  useFrame(() => {
    const group = groupRef.current;
    const lines = linesRef.current;
    if (!group || lines.size === 0) return;

    if (lastFocusRef.current !== focusId) {
      lastFocusRef.current = focusId;
      divisionsRef.current.clear();
      lastCamDistRef.current = -1;
    }

    const camDist = camera.position.length();
    const sizeKey = size.width * 10_000 + size.height;
    const distChanged =
      lastCamDistRef.current < 0 ||
      Math.abs(camDist - lastCamDistRef.current) >
        Math.max(0.03, lastCamDistRef.current * 0.08);
    const sizeChanged = sizeKey !== lastSizeRef.current;

    const states = getBodyStates(simDaysRef.current ?? 0);
    const focus = states.get(focusId);
    if (focus) {
      group.position.copy(focus.localPosition).multiplyScalar(-1);
    } else {
      group.position.set(0, 0, 0);
    }

    for (const [, anchor] of moonAnchorsRef.current) {
      const parentId = anchor.userData.parentId as string | undefined;
      if (!parentId) continue;
      const parent = states.get(parentId);
      if (parent) anchor.position.copy(parent.localPosition);
    }

    let rebuilt = false;
    if (distChanged || sizeChanged) {
      lastCamDistRef.current = camDist;
      lastSizeRef.current = sizeKey;

      for (const path of paths) {
        const close = isCloseOrbit(path.body, focusId);
        const semi = orbitRadiusScene(path.body.distanceAu);
        const desired = orbitLineDivisions(
          semi,
          camera,
          size.height,
          path.body.eccentricity ?? 0,
          close,
        );
        const prev = divisionsRef.current.get(path.body.id) ?? 0;
        const line = lines.get(path.body.id);
        if (!line) continue;
        if (!shouldRebuildDivisions(prev, desired)) continue;

        divisionsRef.current.set(path.body.id, desired);
        const pts = buildOrbitLinePoints(path.body, semi, desired);
        setHairlinePoints(line, pts, true);
        rebuilt = true;
      }
    }

    const camMoved =
      !lastCamPos.current.equals(camera.position) ||
      !lastCamQuat.current.equals(camera.quaternion);
    const groupMoved = !lastGroupPos.current.equals(group.position);
    if (rebuilt || camMoved || groupMoved || sizeChanged) {
      lastCamPos.current.copy(camera.position);
      lastCamQuat.current.copy(camera.quaternion);
      lastGroupPos.current.copy(group.position);
      for (const line of lines.values()) {
        updateHairlineStrip(line, camera, size.width, size.height);
      }
    }
  });

  return <group ref={groupRef} />;
}
