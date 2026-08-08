"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, BODY_BY_ID, type BodyDefinition } from "@/lib/bodies";
import { isMobileDevice } from "@/lib/device-profile";

const TRAIL_COLORS: Record<string, number> = {
  sun: 0xffc107,
  mercury: 0x1b5e20,
  venus: 0x6a1b9a,
  earth: 0x29b6f6,
  mars: 0xe53935,
  jupiter: 0xf57c00,
  saturn: 0xba68c8,
  uranus: 0x558b2f,
  neptune: 0x3949ab,
  pluto: 0xec407a,
};

const MAX_TRAIL_POINTS = isMobileDevice() ? 3_500 : 6_000;
const MAX_DAYS_PER_SAMPLE = 0.35;
const MAX_SAMPLES_PER_FRAME = isMobileDevice() ? 120 : 220;
const TRAIL_OPACITY = 0.9;

interface EpicycleTrailsProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
  tracing: boolean;
  dissolve: boolean;
  traceResetKey: number;
}

function traceTargets(focusId: string): BodyDefinition[] {
  return BODIES.filter(
    (body) => body.id !== focusId && body.kind !== "moon",
  );
}

function appendSample(
  trails: Map<string, THREE.Vector3[]>,
  focusId: string,
  targets: BodyDefinition[],
  simDays: number,
  dissolve: boolean,
) {
  const states = getBodyStates(simDays);
  const focusPos = states.get(focusId)?.localPosition;
  if (!focusPos) return;

  for (const body of targets) {
    const bodyPos = states.get(body.id)?.localPosition;
    if (!bodyPos) continue;

    const rel = bodyPos.clone().sub(focusPos);
    const trail = trails.get(body.id) ?? [];
    const last = trail[trail.length - 1];
    if (last && last.distanceToSquared(rel) < 1e-10) continue;

    trail.push(rel);
    if (dissolve && trail.length > MAX_TRAIL_POINTS) {
      trail.splice(0, trail.length - MAX_TRAIL_POINTS);
    }
    trails.set(body.id, trail);
  }
}

function appendTrailSegment(
  trails: Map<string, THREE.Vector3[]>,
  focusId: string,
  targets: BodyDefinition[],
  fromDays: number,
  toDays: number,
  dissolve: boolean,
) {
  const delta = toDays - fromDays;
  if (Math.abs(delta) < 1e-9) return;

  const steps = Math.min(
    MAX_SAMPLES_PER_FRAME,
    Math.max(1, Math.ceil(Math.abs(delta) / MAX_DAYS_PER_SAMPLE)),
  );

  for (let step = 1; step <= steps; step++) {
    const day = fromDays + (delta * step) / steps;
    appendSample(trails, focusId, targets, day, dissolve);
  }
}

/**
 * Epicycle trails as WebGL lines in camera/focus-relative space.
 * No DOM overlay.
 */
export function EpicycleTrails({
  focusId,
  simDaysRef,
  tracing,
  dissolve,
  traceResetKey,
}: EpicycleTrailsProps) {
  const focus = BODY_BY_ID[focusId];
  const targets = useMemo(() => traceTargets(focusId), [focusId]);

  const trailsRef = useRef<Map<string, THREE.Vector3[]>>(new Map());
  const lastSampledDaysRef = useRef<number | null>(null);
  const linesRef = useRef<Map<string, THREE.Line>>(new Map());
  const groupRef = useRef<THREE.Group>(null);

  // Build / refresh line objects when targets change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Dispose old
    for (const line of linesRef.current.values()) {
      group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    linesRef.current.clear();

    for (const body of targets) {
      const geo = new THREE.BufferGeometry();
      // Placeholder single point until samples arrive
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(6), 3),
      );
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        color: TRAIL_COLORS[body.id] ?? 0xaaaaaa,
        transparent: true,
        opacity: TRAIL_OPACITY,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = -4;
      group.add(line);
      linesRef.current.set(body.id, line);
    }

    return () => {
      for (const line of linesRef.current.values()) {
        group.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
      linesRef.current.clear();
    };
  }, [targets]);

  // Seed trails on focus / reset / enable
  useEffect(() => {
    if (!tracing || !focus) return;
    const days = simDaysRef.current ?? 0;
    const next = new Map<string, THREE.Vector3[]>();
    const states = getBodyStates(days);
    const focusPos = states.get(focusId)?.localPosition;
    if (!focusPos) return;

    for (const body of targets) {
      const bodyPos = states.get(body.id)?.localPosition;
      if (!bodyPos) continue;
      next.set(body.id, [bodyPos.clone().sub(focusPos)]);
    }
    trailsRef.current = next;
    lastSampledDaysRef.current = days;
  }, [focusId, tracing, traceResetKey, targets, focus, simDaysRef]);

  useFrame(() => {
    if (!tracing || !focus) return;

    const days = simDaysRef.current ?? 0;
    const last = lastSampledDaysRef.current;
    if (last !== null && days !== last) {
      appendTrailSegment(
        trailsRef.current,
        focusId,
        targets,
        last,
        days,
        dissolve,
      );
      lastSampledDaysRef.current = days;
    }

    // Trails are focus-relative; group stays at origin (camera targets focus).
    for (const body of targets) {
      const pts = trailsRef.current.get(body.id);
      const line = linesRef.current.get(body.id);
      if (!pts || !line || pts.length < 2) {
        if (line) line.geometry.setDrawRange(0, 0);
        continue;
      }

      // Capacity must be a multiple of 3 floats (one vec3 per vertex).
      // A length like 64 is NOT divisible by 3 → Three reads past the array → NaN.
      const needFloats = pts.length * 3;
      let pos = line.geometry.getAttribute("position") as
        | THREE.BufferAttribute
        | undefined;
      if (!pos || pos.array.length < needFloats) {
        const capVerts = Math.max(pts.length, 32);
        pos = new THREE.BufferAttribute(new Float32Array(capVerts * 3), 3);
        line.geometry.setAttribute("position", pos);
      }

      const arr = pos.array as Float32Array;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const o = i * 3;
        arr[o] = p.x;
        arr[o + 1] = p.y;
        arr[o + 2] = p.z;
      }
      // Zero unused capacity so any full-buffer walk cannot see stale NaNs.
      for (let o = needFloats; o < arr.length; o++) arr[o] = 0;
      pos.needsUpdate = true;
      // Only draw filled verts (capacity may be larger; do not assign pos.count — read-only in types).
      line.geometry.setDrawRange(0, pts.length);
    }
  });

  if (!tracing) return null;

  return <group ref={groupRef} />;
}
