import * as THREE from "three";

import type { BodyDefinition } from "./bodies";

export const FOCUS_ARRIVAL_DISTANCE_MULTIPLIER = 2;

const AU_IN_MILLION_KM = 149.5978707;

/** Kyle Gough / Solar System Scope style scaling — tuned for stable 3D orbits. */
export function bodyRadiusScene(radiusKm: number): number {
  return Math.sqrt(radiusKm) / 500;
}

export function orbitRadiusScene(distanceAu: number): number {
  if (distanceAu <= 0) return 0;
  const millionKm = distanceAu * AU_IN_MILLION_KM;
  return Math.pow(millionKm, 0.4);
}

export function godsViewDistance(): number {
  return orbitRadiusScene(39.5) * 2.2;
}

export function focusCameraDistance(body: BodyDefinition): number {
  const radius = bodyRadiusScene(body.radiusKm);
  if (body.kind === "star") return radius * 4;
  if (body.id === "saturn") return radius * 3.8;
  if (body.kind === "moon") return radius * 4.5;
  return radius * 3.2;
}

export function focusMinDistance(body: BodyDefinition): number {
  const radius = bodyRadiusScene(body.radiusKm);
  return Math.max(radius * 1.4, 0.08);
}

/** Place camera on the sun-facing side so the lit hemisphere is visible on arrival. */
export function focusArrivalCameraPosition(
  body: BodyDefinition,
  bodyLocalPosition: THREE.Vector3,
): THREE.Vector3 {
  const distance = focusCameraDistance(body) * FOCUS_ARRIVAL_DISTANCE_MULTIPLIER;

  if (body.kind === "star" || bodyLocalPosition.lengthSq() < 1e-8) {
    return new THREE.Vector3(distance * 0.25, distance * 0.35, distance);
  }

  const towardSun = bodyLocalPosition.clone().negate().normalize();
  const viewDirection = new THREE.Vector3(
    towardSun.x,
    towardSun.y + 0.2,
    towardSun.z,
  ).normalize();

  return viewDirection.multiplyScalar(distance);
}