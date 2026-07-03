import * as THREE from "three";

import type { BodyDefinition } from "./bodies";
import {
  orbitLineDivisionCap,
  orbitRibbonDivisionCap,
  orbitUsesRibbonMesh,
} from "./device-profile";
import { orbitRadiusScene } from "./scale";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export interface BodyState {
  id: string;
  /** Heliocentric / parent-relative position inside the solar-system group. */
  localPosition: THREE.Vector3;
  orbitRadius: number;
}

function hasKeplerianOrbit(body: BodyDefinition): boolean {
  return body.parentId === "sun" && body.distanceAu > 0;
}

export function worldPerPixel(
  camera: THREE.Camera,
  viewportHeight: number,
): number {
  const perspective = camera as THREE.PerspectiveCamera;
  const dist = Math.max(0.8, camera.position.length());
  const vFov = (perspective.fov ?? 45) * DEG;
  return (2 * dist * Math.tan(vFov / 2)) / Math.max(1, viewportHeight);
}

/**
 * Sample count from projected orbit size in pixels.
 * Ribbons use a wider pixel spacing (GPU fills between verts smoothly).
 */
export function orbitLineDivisions(
  semiMajor: number,
  camera: THREE.Camera,
  viewportHeight: number,
  eccentricity = 0,
  ribbon = orbitUsesRibbonMesh(),
): number {
  const wpp = worldPerPixel(camera, viewportHeight);
  const projectedRadiusPx = semiMajor / wpp;
  const projectedPerimeterPx =
    TAU * projectedRadiusPx * Math.sqrt((1 + eccentricity * eccentricity) / 2);
  const pxSpacing = ribbon ? 1.1 : 0.8;
  const byScreen = Math.ceil(projectedPerimeterPx / pxSpacing);
  const cap = ribbon ? orbitRibbonDivisionCap() : orbitLineDivisionCap();
  return Math.min(cap, Math.max(48, byScreen));
}

/** Reparameterize by arc length so tube verts are evenly spaced along the path. */
class ArcLengthOrbitCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly source: THREE.Curve<THREE.Vector3>) {
    super();
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    return this.source.getPointAt(t, optionalTarget);
  }
}

/** Flat 2-sided tube — continuous mesh that iOS rasterizes smoothly. */
export function buildOrbitTubeGeometry(
  body: BodyDefinition,
  semiMajor: number | undefined,
  divisions: number,
  wpp: number,
  lineWidth = 1,
): THREE.TubeGeometry {
  const curve = new ArcLengthOrbitCurve(createOrbitCurve(body, semiMajor));
  const radius = Math.max(wpp * 0.5 * lineWidth, 0.0002);
  return new THREE.TubeGeometry(curve, divisions, radius, 2, true);
}

function solveKepler(meanAnomaly: number, eccentricity: number): number {
  let eccentricAnomaly = eccentricity > 0.8 ? Math.PI : meanAnomaly;
  for (let i = 0; i < 14; i++) {
    const delta =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-10) break;
  }
  return eccentricAnomaly;
}

function trueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
  const sinHalf = Math.sin(eccentricAnomaly / 2);
  const cosHalf = Math.cos(eccentricAnomaly / 2);
  return (
    2 *
    Math.atan2(
      Math.sqrt(1 + eccentricity) * sinHalf,
      Math.sqrt(1 - eccentricity) * cosHalf,
    )
  );
}

function positionFromTrueAnomaly(
  trueAnomalyRad: number,
  semiMajor: number,
  eccentricity: number,
  inclinationRad: number,
  ascendingNodeRad: number,
  argumentOfPerihelionRad: number,
): THREE.Vector3 {
  const r =
    (semiMajor * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(trueAnomalyRad));

  const cosWpNu = Math.cos(argumentOfPerihelionRad + trueAnomalyRad);
  const sinWpNu = Math.sin(argumentOfPerihelionRad + trueAnomalyRad);
  const cosNode = Math.cos(ascendingNodeRad);
  const sinNode = Math.sin(ascendingNodeRad);
  const cosInc = Math.cos(inclinationRad);
  const sinInc = Math.sin(inclinationRad);

  const xEcl = r * (cosNode * cosWpNu - sinNode * sinWpNu * cosInc);
  const yEcl = r * (sinNode * cosWpNu + cosNode * sinWpNu * cosInc);
  const zEcl = r * sinWpNu * sinInc;

  return new THREE.Vector3(xEcl, zEcl, yEcl);
}

function heliocentricPosition(
  body: BodyDefinition,
  simDays: number,
  semiMajor: number,
): THREE.Vector3 {
  const eccentricity = body.eccentricity ?? 0;
  const inclination = (body.orbitInclinationDeg ?? 0) * DEG;
  const ascendingNode = (body.longitudeOfAscendingNodeDeg ?? 0) * DEG;
  const argumentOfPerihelion = (body.argumentOfPerihelionDeg ?? 0) * DEG;
  const meanAnomaly0 = (body.meanAnomalyAtEpochDeg ?? 0) * DEG;

  const meanMotion = TAU / body.orbitalPeriodDays;
  const meanAnomaly = meanAnomaly0 + meanMotion * simDays;
  const eccentricAnomaly = solveKepler(meanAnomaly, eccentricity);
  const nu = trueAnomaly(eccentricAnomaly, eccentricity);

  return positionFromTrueAnomaly(
    nu,
    semiMajor,
    eccentricity,
    inclination,
    ascendingNode,
    argumentOfPerihelion,
  );
}

function circularOrbitPosition(
  radius: number,
  periodDays: number,
  epochLongitudeDeg: number,
  simDays: number,
): THREE.Vector3 {
  const angle = (epochLongitudeDeg * DEG + (simDays / periodDays) * TAU) % TAU;
  return new THREE.Vector3(
    Math.sin(angle) * radius,
    0,
    Math.cos(angle) * radius,
  );
}

export function computeBodyStates(
  bodies: BodyDefinition[],
  simDays: number,
): Map<string, BodyState> {
  const byId = Object.fromEntries(bodies.map((body) => [body.id, body])) as Record<
    string,
    BodyDefinition
  >;
  const states = new Map<string, BodyState>();

  function resolveLocalPosition(body: BodyDefinition): THREE.Vector3 {
    const cached = states.get(body.id);
    if (cached) return cached.localPosition;

    if (!body.parentId || body.parentId === "sun") {
      const semiMajor = orbitRadiusScene(body.distanceAu);
      const position = hasKeplerianOrbit(body)
        ? heliocentricPosition(body, simDays, semiMajor)
        : new THREE.Vector3(0, 0, 0);
      states.set(body.id, {
        id: body.id,
        localPosition: position,
        orbitRadius: semiMajor,
      });
      return position;
    }

    const parent = byId[body.parentId];
    const parentPos = resolveLocalPosition(parent);
    const radius = orbitRadiusScene(body.distanceAu);
    const localOffset = circularOrbitPosition(
      radius,
      body.orbitalPeriodDays,
      body.epochLongitudeDeg,
      simDays,
    );
    const position = parentPos.clone().add(localOffset);
    states.set(body.id, { id: body.id, localPosition: position, orbitRadius: radius });
    return position;
  }

  states.set("sun", {
    id: "sun",
    localPosition: new THREE.Vector3(0, 0, 0),
    orbitRadius: 0,
  });

  for (const body of bodies) {
    if (body.id === "sun") continue;
    resolveLocalPosition(body);
  }

  return states;
}

class CircularOrbitCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly radius: number) {
    super();
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const theta = t * TAU;
    return optionalTarget.set(
      Math.sin(theta) * this.radius,
      0,
      Math.cos(theta) * this.radius,
    );
  }
}

class KeplerOrbitCurve extends THREE.Curve<THREE.Vector3> {
  private readonly eccentricity: number;
  private readonly inclination: number;
  private readonly ascendingNode: number;
  private readonly argumentOfPerihelion: number;

  constructor(
    private readonly semiMajor: number,
    body: BodyDefinition,
  ) {
    super();
    this.eccentricity = body.eccentricity ?? 0;
    this.inclination = (body.orbitInclinationDeg ?? 0) * DEG;
    this.ascendingNode = (body.longitudeOfAscendingNodeDeg ?? 0) * DEG;
    this.argumentOfPerihelion = (body.argumentOfPerihelionDeg ?? 0) * DEG;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const meanAnomaly = t * TAU;
    const eccentricAnomaly = solveKepler(meanAnomaly, this.eccentricity);
    const nu = trueAnomaly(eccentricAnomaly, this.eccentricity);
    const point = positionFromTrueAnomaly(
      nu,
      this.semiMajor,
      this.eccentricity,
      this.inclination,
      this.ascendingNode,
      this.argumentOfPerihelion,
    );
    return optionalTarget.copy(point);
  }
}

export function createOrbitCurve(
  body: BodyDefinition,
  semiMajor?: number,
): THREE.Curve<THREE.Vector3> {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  if (hasKeplerianOrbit(body)) {
    return new KeplerOrbitCurve(majorAxis, body);
  }
  return new CircularOrbitCurve(majorAxis);
}

/** Arc-length uniform samples — equal spacing along the orbital path. */
export function buildOrbitLinePoints(
  body: BodyDefinition,
  semiMajor: number | undefined,
  divisions: number,
): THREE.Vector3[] {
  return createOrbitCurve(body, semiMajor).getSpacedPoints(divisions);
}

export function buildOrbitLoopPoints(
  body: BodyDefinition,
  semiMajor?: number,
  divisions?: number,
): THREE.Vector3[] {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  const count = divisions ?? Math.min(orbitLineDivisionCap(), 256);
  return buildOrbitLinePoints(body, semiMajor, count);
}

export function rotationSpeedRadPerDay(rotationPeriodHours: number): number {
  if (rotationPeriodHours === 0) return 0;
  const direction = rotationPeriodHours < 0 ? -1 : 1;
  const hours = Math.abs(rotationPeriodHours);
  return direction * (TAU / (hours / 24));
}