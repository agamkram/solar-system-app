"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, BODY_BY_ID, type BodyDefinition } from "@/lib/bodies";
import { isMobileDevice, isPhoneDevice } from "@/lib/device-profile";

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

const MAX_TRAIL_POINTS = isMobileDevice() ? 3_500 : 6_000;
/** Max sim-days between recorded trail samples — keeps curves smooth at high speed. */
const MAX_DAYS_PER_SAMPLE = 0.35;
const MAX_SAMPLES_PER_FRAME = isMobileDevice() ? 120 : 220;
const TRAIL_LINE_WIDTH = 1.25;
const TRAIL_OPACITY = 0.9;

const PROJ = new THREE.Vector3();

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

function strokeTrail(
  ctx: CanvasRenderingContext2D,
  points: THREE.Vector3[],
  camera: THREE.Camera,
  width: number,
  height: number,
  color: string,
) {
  let drawing = false;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    PROJ.copy(points[i]).project(camera);

    if (PROJ.z > 1) {
      drawing = false;
      continue;
    }

    const x = (PROJ.x * 0.5 + 0.5) * width;
    const y = (-PROJ.y * 0.5 + 0.5) * height;

    if (!drawing) {
      ctx.moveTo(x, y);
      drawing = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  if (!drawing || points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.globalAlpha = TRAIL_OPACITY;
  ctx.lineWidth = TRAIL_LINE_WIDTH;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function EpicycleTrails({
  focusId,
  simDaysRef,
  tracing,
  dissolve,
  traceResetKey,
}: EpicycleTrailsProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const phone = isPhoneDevice();

  const focus = BODY_BY_ID[focusId];
  const targets = useMemo(() => traceTargets(focusId), [focusId]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailsRef = useRef<Map<string, THREE.Vector3[]>>(new Map());
  const lastSampledDaysRef = useRef<number | null>(null);

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
  }, [focusId, tracing, traceResetKey]);

  useEffect(() => {
    if (!tracing) return;

    const parent = gl.domElement.parentElement;
    if (!parent) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "pointer-events-none absolute inset-0 z-[2]";
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      canvas.remove();
      canvasRef.current = null;
    };
  }, [gl, tracing]);

  useFrame(() => {
    if (!tracing || !focus) return;

    camera.updateMatrixWorld();

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

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = phone ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const bitmapW = Math.round(size.width * dpr);
    const bitmapH = Math.round(size.height * dpr);
    if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
      canvas.width = bitmapW;
      canvas.height = bitmapH;
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    for (const body of targets) {
      const points = trailsRef.current.get(body.id);
      if (!points || points.length < 2) continue;

      strokeTrail(
        ctx,
        points,
        camera,
        size.width,
        size.height,
        TRAIL_COLORS[body.id] ?? "#aaaaaa",
      );
    }
  }, 1);

  return null;
}