"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, BODY_BY_ID, type BodyDefinition } from "@/lib/bodies";
import { isMobileDevice } from "@/lib/device-profile";
import {
  appendGpuTrailPoints,
  clearGpuTrail,
  createGpuTrail,
  disposeGpuTrail,
  setGpuTrailColor,
  setGpuTrailPoints,
  setGpuTrailResolution,
} from "@/lib/gpu-trail";
import { trailColor, type TrailColorMode } from "@/lib/trail-colors";

const MAX_TRAIL_POINTS = isMobileDevice() ? 3_500 : 6_000;
/** Max sim-days between recorded trail samples — keeps curves smooth at high speed. */
const MAX_DAYS_PER_SAMPLE = 0.35;
const MAX_SAMPLES_PER_FRAME = isMobileDevice() ? 120 : 220;
const TRAIL_LINE_WIDTH = 0.35;
const TRAIL_OPACITY = 1;

const FOCUS_POS = new THREE.Vector3();
const BODY_POS = new THREE.Vector3();

interface EpicycleTrailsProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
  tracing: boolean;
  dissolve: boolean;
  traceResetKey: number;
  colorMode: TrailColorMode;
}

type TrailBuf = {
  xyz: Float32Array;
  count: number;
};

function traceTargets(focusId: string): BodyDefinition[] {
  return BODIES.filter(
    (body) => body.id !== focusId && body.kind !== "moon",
  );
}

function makeTrail(): TrailBuf {
  return { xyz: new Float32Array(256 * 3), count: 0 };
}

function trailPush(buf: TrailBuf, x: number, y: number, z: number): void {
  if (buf.count * 3 >= buf.xyz.length) {
    const next = new Float32Array(buf.xyz.length * 2);
    next.set(buf.xyz);
    buf.xyz = next;
  }
  const o = buf.count * 3;
  buf.xyz[o] = x;
  buf.xyz[o + 1] = y;
  buf.xyz[o + 2] = z;
  buf.count += 1;
}

function trailKeepLast(buf: TrailBuf, keep: number): boolean {
  if (buf.count <= keep) return false;
  const drop = buf.count - keep;
  buf.xyz.copyWithin(0, drop * 3, buf.count * 3);
  buf.count = keep;
  return true;
}

function appendSample(
  trails: Map<string, TrailBuf>,
  focusId: string,
  targets: BodyDefinition[],
  simDays: number,
  dissolve: boolean,
): boolean {
  const states = getBodyStates(simDays);
  const focusState = states.get(focusId);
  if (!focusState) return false;
  FOCUS_POS.copy(focusState.localPosition);

  let spliced = false;
  for (const body of targets) {
    const bodyState = states.get(body.id);
    if (!bodyState) continue;
    BODY_POS.copy(bodyState.localPosition).sub(FOCUS_POS);

    const trail = trails.get(body.id) ?? makeTrail();
    if (trail.count > 0) {
      const o = (trail.count - 1) * 3;
      const dx = trail.xyz[o] - BODY_POS.x;
      const dy = trail.xyz[o + 1] - BODY_POS.y;
      const dz = trail.xyz[o + 2] - BODY_POS.z;
      if (dx * dx + dy * dy + dz * dz < 1e-10) {
        trails.set(body.id, trail);
        continue;
      }
    }

    trailPush(trail, BODY_POS.x, BODY_POS.y, BODY_POS.z);
    if (dissolve && trailKeepLast(trail, MAX_TRAIL_POINTS)) spliced = true;
    trails.set(body.id, trail);
  }
  return spliced;
}

function appendTrailSegment(
  trails: Map<string, TrailBuf>,
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

  let spliced = false;
  for (let step = 1; step <= steps; step++) {
    const day = fromDays + (delta * step) / steps;
    if (appendSample(trails, focusId, targets, day, dissolve)) spliced = true;
  }
  return spliced;
}

export function EpicycleTrails({
  focusId,
  simDaysRef,
  tracing,
  dissolve,
  traceResetKey,
  colorMode,
}: EpicycleTrailsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const trailsRef = useRef<Map<string, TrailBuf>>(new Map());
  const lastSampledDaysRef = useRef<number | null>(null);
  const lastResKey = useRef("");
  const { camera, size, gl } = useThree();

  const focus = BODY_BY_ID[focusId];
  const targets = useMemo(() => traceTargets(focusId), [focusId]);

  const seedTrails = (days: number) => {
    if (!focus) return;
    const next = new Map<string, TrailBuf>();
    appendSample(next, focusId, targets, days, false);
    trailsRef.current = next;
    lastSampledDaysRef.current = days;
    for (const [id, mesh] of meshesRef.current) {
      const trail = next.get(id);
      if (!trail) {
        clearGpuTrail(mesh);
        continue;
      }
      setGpuTrailPoints(mesh, trail.xyz, trail.count);
    }
  };

  useEffect(() => {
    seedTrails(simDaysRef.current ?? 0);
  }, [focusId, tracing, traceResetKey, targets]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const meshes = new Map<string, THREE.Mesh>();
    for (const body of targets) {
      const mesh = createGpuTrail({
        color: trailColor(body.id, colorMode),
        pixelWidth: TRAIL_LINE_WIDTH,
        opacity: TRAIL_OPACITY,
      });
      group.add(mesh);
      meshes.set(body.id, mesh);
    }
    meshesRef.current = meshes;
    lastResKey.current = "";

    for (const [id, trail] of trailsRef.current) {
      const mesh = meshes.get(id);
      if (mesh) setGpuTrailPoints(mesh, trail.xyz, trail.count);
    }

    return () => {
      for (const mesh of meshes.values()) {
        group.remove(mesh);
        disposeGpuTrail(mesh);
      }
      meshesRef.current = new Map();
    };
  }, [targets]);

  useEffect(() => {
    for (const [id, mesh] of meshesRef.current) {
      setGpuTrailColor(mesh, trailColor(id, colorMode));
    }
  }, [colorMode]);

  useFrame(() => {
    if (!tracing || !focus) return;

    camera.updateMatrixWorld();

    const days = simDaysRef.current ?? 0;
    const last = lastSampledDaysRef.current;
    let spliced = false;
    if (last !== null && days !== last) {
      spliced = appendTrailSegment(
        trailsRef.current,
        focusId,
        targets,
        last,
        days,
        dissolve,
      );
      lastSampledDaysRef.current = days;
    }

    const cssW = Math.max(1, size.width);
    const cssH = Math.max(1, size.height);
    const bufferW = gl.domElement.width || cssW;
    const bufferH = gl.domElement.height || cssH;
    const resKey = `${bufferW}x${bufferH}x${cssW}x${cssH}`;
    const resChanged = lastResKey.current !== resKey;
    if (resChanged) lastResKey.current = resKey;

    for (const body of targets) {
      const mesh = meshesRef.current.get(body.id);
      const trail = trailsRef.current.get(body.id);
      if (!mesh || !trail) continue;

      if (resChanged) {
        setGpuTrailResolution(
          mesh,
          bufferW,
          bufferH,
          cssW,
          cssH,
          TRAIL_LINE_WIDTH,
        );
      }

      const gpuCount = mesh.userData.pointCount as number;
      if (spliced || trail.count < gpuCount) {
        setGpuTrailPoints(mesh, trail.xyz, trail.count);
      } else if (trail.count > gpuCount) {
        appendGpuTrailPoints(mesh, trail.xyz, gpuCount, trail.count);
      }
    }
  });

  return <group ref={groupRef} />;
}
