"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODIES, type BodyDefinition } from "@/lib/bodies";
import { isPhoneDevice, orbitLineDivisionCap } from "@/lib/device-profile";
import { buildOrbitLinePoints, orbitLineDivisions } from "@/lib/orbits";
import { orbitRadiusScene } from "@/lib/scale";

const WORLD = new THREE.Vector3();
const PROJ = new THREE.Vector3();
const ZERO = new THREE.Vector3();
const GROUP_OFFSET = new THREE.Vector3();

const LOD_INTERVAL_SEC = 0.5;
const LOD_CHANGE_RATIO = 1.5;
const PLANET_LINE_WIDTH = 0.5;
const MOON_LINE_WIDTH = 0.4;

interface OrbitPathDef {
  body: BodyDefinition;
  semiMajor: number;
  parentId: string | null;
  opacity: number;
  lineWidth: number;
}

function strokeOrbit(
  ctx: CanvasRenderingContext2D,
  points: THREE.Vector3[],
  groupOffset: THREE.Vector3,
  anchor: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  opacity: number,
  lineWidth: number,
) {
  let drawing = false;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    WORLD.copy(points[i]).add(anchor).add(groupOffset);
    PROJ.copy(WORLD).project(camera);

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

  WORLD.copy(points[0]).add(anchor).add(groupOffset);
  PROJ.copy(WORLD).project(camera);
  if (PROJ.z <= 1) {
    const x = (PROJ.x * 0.5 + 0.5) * width;
    const y = (-PROJ.y * 0.5 + 0.5) * height;
    ctx.lineTo(x, y);
  }

  ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

interface OrbitLinesOverlayProps {
  focusId: string;
  simDaysRef: React.RefObject<number>;
}

export function OrbitLinesOverlay({
  focusId,
  simDaysRef,
}: OrbitLinesOverlayProps) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const phone = isPhoneDevice();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<Map<string, THREE.Vector3[]>>(new Map());
  const lodTimerRef = useRef(0);
  const sampleKeyRef = useRef("");
  const buildQueueRef = useRef(0);

  const paths = useMemo<OrbitPathDef[]>(() => {
    const defs: OrbitPathDef[] = [];

    for (const body of BODIES) {
      if (body.parentId === "sun" && body.distanceAu > 0) {
        defs.push({
          body,
          semiMajor: orbitRadiusScene(body.distanceAu),
          parentId: null,
          opacity: 0.9,
          lineWidth: PLANET_LINE_WIDTH,
        });
      }
    }

    for (const body of BODIES) {
      if (body.kind !== "moon") continue;
      defs.push({
        body,
        semiMajor: orbitRadiusScene(body.distanceAu),
        parentId: body.parentId ?? "sun",
        opacity: 0.55,
        lineWidth: MOON_LINE_WIDTH,
      });
    }

    return defs;
  }, []);

  const divisionsForPath = (path: OrbitPathDef) => {
    if (phone) return orbitLineDivisionCap();
    return orbitLineDivisions(
      path.semiMajor,
      camera,
      size.height,
      path.body.eccentricity ?? 0,
    );
  };

  const rebuildOne = (index: number) => {
    const path = paths[index];
    if (!path) return;
    const divisions = divisionsForPath(path);
    pointsRef.current.set(
      path.body.id,
      buildOrbitLinePoints(path.body, path.semiMajor, divisions),
    );
    const parts = paths.map((p) => `${p.body.id}:${divisionsForPath(p)}`);
    sampleKeyRef.current = parts.join("|");
  };

  const rebuildAll = () => {
    const next = new Map<string, THREE.Vector3[]>();
    const parts: string[] = [];
    for (const path of paths) {
      const divisions = divisionsForPath(path);
      parts.push(`${path.body.id}:${divisions}`);
      next.set(
        path.body.id,
        buildOrbitLinePoints(path.body, path.semiMajor, divisions),
      );
    }
    pointsRef.current = next;
    sampleKeyRef.current = parts.join("|");
  };

  useEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "pointer-events-none absolute inset-0 z-[1]";
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(canvas);
    canvasRef.current = canvas;

    if (phone) {
      buildQueueRef.current = 0;
      rebuildOne(0);
    } else {
      rebuildAll();
    }

    return () => {
      canvas.remove();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [gl]);

  useEffect(() => {
    if (!phone) rebuildAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paths list is static
  }, [paths, size.height, phone]);

  useFrame((_, delta) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (phone && buildQueueRef.current < paths.length) {
      rebuildOne(buildQueueRef.current);
      buildQueueRef.current += 1;
    }

    if (!phone) {
      lodTimerRef.current += delta;
      if (lodTimerRef.current >= LOD_INTERVAL_SEC) {
        lodTimerRef.current = 0;
        const parts = paths.map(
          (path) => `${path.body.id}:${divisionsForPath(path)}`,
        );
        const prevParts = sampleKeyRef.current.split("|");
        let changed = prevParts.length !== parts.length;
        if (!changed) {
          for (let i = 0; i < parts.length; i++) {
            const [, divA] = parts[i].split(":");
            const [, divB] = prevParts[i]?.split(":") ?? [];
            if (!divB) continue;
            const ratio = Number(divA) / Number(divB);
            if (ratio < 1 / LOD_CHANGE_RATIO || ratio > LOD_CHANGE_RATIO) {
              changed = true;
              break;
            }
          }
        }
        if (changed) rebuildAll();
      }
    }

    const dpr = phone ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(size.width * dpr)) {
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    const states = getBodyStates(simDaysRef.current ?? 0);
    const focus = states.get(focusId);
    if (focus) {
      GROUP_OFFSET.copy(focus.localPosition).multiplyScalar(-1);
    } else {
      GROUP_OFFSET.set(0, 0, 0);
    }

    for (const path of paths) {
      const points = pointsRef.current.get(path.body.id);
      if (!points || points.length < 2) continue;

      const anchor =
        path.parentId === null
          ? ZERO
          : (states.get(path.parentId)?.localPosition ?? ZERO);

      strokeOrbit(
        ctx,
        points,
        GROUP_OFFSET,
        anchor,
        camera,
        size.width,
        size.height,
        path.opacity,
        path.lineWidth,
      );
    }
  });

  return null;
}