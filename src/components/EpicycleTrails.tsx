"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, BODY_BY_ID, type BodyDefinition } from "@/lib/bodies";

const TRAIL_COLORS: Record<string, string> = {
  sun: "#FFC107",
  mercury: "#1B5E20",
  venus: "#6A1B9A",
  earth: "#29B6F6",
  mars: "#E53935",
  jupiter: "#F57C00",
  saturn: "#BA68C8",
  uranus: "#558B2F",
  neptune: "#3949AB",
  pluto: "#EC407A",
};

const MAX_TRAIL_POINTS = 6_000;
/** Max sim-days between recorded trail samples — keeps curves smooth at high speed. */
const MAX_DAYS_PER_SAMPLE = 0.35;
const MAX_SAMPLES_PER_FRAME = 220;

interface EpicycleTrailsProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
  tracing: boolean;
  dissolve: boolean;
  traceResetKey: number;
}

/** Heliocentric planets + sun only — no moons. */
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
): boolean {
  const delta = toDays - fromDays;
  if (Math.abs(delta) < 1e-9) return false;

  const steps = Math.min(
    MAX_SAMPLES_PER_FRAME,
    Math.max(1, Math.ceil(Math.abs(delta) / MAX_DAYS_PER_SAMPLE)),
  );

  for (let step = 1; step <= steps; step++) {
    const day = fromDays + (delta * step) / steps;
    appendSample(trails, focusId, targets, day, dissolve);
  }

  return true;
}

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
  const [renderTick, setRenderTick] = useState(0);

  const seedTrails = (days: number) => {
    if (!focus) return;
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
  };

  useEffect(() => {
    seedTrails(simDaysRef.current ?? 0);
    setRenderTick((t) => t + 1);
  }, [focusId, tracing, traceResetKey]);

  useFrame(() => {
    if (!tracing || !focus) return;

    const days = simDaysRef.current ?? 0;
    const last = lastSampledDaysRef.current;
    if (last === null || days === last) return;

    const changed = appendTrailSegment(
      trailsRef.current,
      focusId,
      targets,
      last,
      days,
      dissolve,
    );

    lastSampledDaysRef.current = days;
    if (changed) setRenderTick((t) => t + 1);
  });

  if (!tracing || !focus) return null;

  return (
    <group>
      {targets.map((body) => {
        const points = trailsRef.current.get(body.id);
        if (!points || points.length < 2) return null;

        return (
          <Line
            key={`epicycle-${body.id}-${renderTick}`}
            points={points}
            color={TRAIL_COLORS[body.id] ?? "#aaaaaa"}
            lineWidth={0.75}
            transparent
            opacity={0.9}
            depthWrite={false}
            frustumCulled={false}
          />
        );
      })}
    </group>
  );
}