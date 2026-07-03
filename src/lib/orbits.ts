import * as THREE from "three";

import type { BodyDefinition } from "./bodies";
import { isMobileDevice } from "./device-profile";
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

const TMP_TANGENT = new THREE.Vector3();
const TMP_RADIAL = new THREE.Vector3();
const TMP_BINORMAL = new THREE.Vector3();
const TMP_SIDE = new THREE.Vector3();
const TMP_UP = new THREE.Vector3(0, 1, 0);

/** How far the camera is from an orbit ring — drives LOD segment count. */
export function orbitViewDistance(
  camera: THREE.Camera,
  semiMajor: number,
): number {
  const dist = camera.position.length();
  return Math.max(0.35, Math.abs(dist - semiMajor), dist * 0.12);
}

/** Arc-length samples for a smooth orbit ribbon at the current view distance. */
export function orbitRibbonSegments(
  semiMajor: number,
  eccentricity = 0,
  viewDistance = semiMajor,
): number {
  const mobile = isMobileDevice();
  const perimeter =
    TAU * semiMajor * Math.sqrt((1 + eccentricity * eccentricity) / 2);
  const targetChord = Math.max(
    0.0001,
    viewDistance * (mobile ? 0.00012 : 0.000055),
  );
  const byChord = Math.ceil(perimeter / targetChord);
  const minSeg = mobile ? 512 : 1024;
  const maxSeg = mobile ? 6144 : 12288;
  return Math.min(maxSeg, Math.max(minSeg, byChord));
}

/** @deprecated Use orbitRibbonSegments — kept for trail helpers. */
export function orbitLoopSegments(
  semiMajor: number,
  eccentricity = 0,
): number {
  return orbitRibbonSegments(semiMajor, eccentricity, semiMajor);
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

/** Exact parametric orbit curve — no chord sampling artifacts when tubed. */
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

/** Evenly spaced along arc length — avoids long straight chords on ellipses. */
export function buildOrbitSpacedPoints(
  body: BodyDefinition,
  semiMajor?: number,
  segments?: number,
): THREE.Vector3[] {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  const eccentricity = body.eccentricity ?? 0;
  const count =
    segments ?? orbitRibbonSegments(majorAxis, eccentricity, majorAxis);
  return createOrbitCurve(body, semiMajor).getSpacedPoints(count);
}

export function orbitRibbonHalfWidth(
  majorAxis: number,
  lineWidth = 0.6,
): number {
  const scale = 0.00021 * (lineWidth / 0.6);
  return Math.max(0.00045, majorAxis * scale);
}

/** Single continuous ribbon mesh — smooth on iOS, not GL line segments. */
export function buildOrbitRibbonGeometry(
  body: BodyDefinition,
  semiMajor: number | undefined,
  lineWidth: number,
  segments: number,
): THREE.BufferGeometry {
  const majorAxis = semiMajor ?? orbitRadiusScene(body.distanceAu);
  const points = buildOrbitSpacedPoints(body, semiMajor, segments);

  let count = points.length;
  if (count > 2 && points[0].distanceToSquared(points[count - 1]) < 1e-14) {
    count -= 1;
  }

  const half = orbitRibbonHalfWidth(majorAxis, lineWidth);
  const positions = new Float32Array(count * 6);
  const indices = new Uint32Array(count * 6);

  for (let i = 0; i < count; i++) {
    const prev = points[(i - 1 + count) % count];
    const curr = points[i];
    const next = points[(i + 1) % count];

    TMP_TANGENT.subVectors(next, prev);
    if (TMP_TANGENT.lengthSq() < 1e-16) TMP_TANGENT.set(0, 0, 1);
    TMP_TANGENT.normalize();

    TMP_RADIAL.copy(curr);
    if (TMP_RADIAL.lengthSq() < 1e-12) TMP_RADIAL.copy(TMP_UP);
    TMP_RADIAL.normalize();

    TMP_BINORMAL.crossVectors(TMP_RADIAL, TMP_TANGENT);
    if (TMP_BINORMAL.lengthSq() < 1e-12) {
      TMP_BINORMAL.crossVectors(TMP_TANGENT, TMP_UP);
    }
    TMP_BINORMAL.normalize();

    TMP_SIDE.crossVectors(TMP_TANGENT, TMP_BINORMAL).normalize().multiplyScalar(half);

    const vertex = i * 6;
    positions[vertex] = curr.x + TMP_SIDE.x;
    positions[vertex + 1] = curr.y + TMP_SIDE.y;
    positions[vertex + 2] = curr.z + TMP_SIDE.z;
    positions[vertex + 3] = curr.x - TMP_SIDE.x;
    positions[vertex + 4] = curr.y - TMP_SIDE.y;
    positions[vertex + 5] = curr.z - TMP_SIDE.z;
  }

  for (let i = 0; i < count; i++) {
    const edge = i * 6;
    const left = i * 2;
    const right = i * 2 + 1;
    const nextLeft = ((i + 1) % count) * 2;
    const nextRight = ((i + 1) % count) * 2 + 1;
    indices[edge] = left;
    indices[edge + 1] = nextLeft;
    indices[edge + 2] = right;
    indices[edge + 3] = right;
    indices[edge + 4] = nextLeft;
    indices[edge + 5] = nextRight;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

export function buildOrbitLoopPoints(
  body: BodyDefinition,
  semiMajor?: number,
  segments?: number,
): THREE.Vector3[] {
  return buildOrbitSpacedPoints(body, semiMajor, segments);
}

export function rotationSpeedRadPerDay(rotationPeriodHours: number): number {
  if (rotationPeriodHours === 0) return 0;
  const direction = rotationPeriodHours < 0 ? -1 : 1;
  const hours = Math.abs(rotationPeriodHours);
  return direction * (TAU / (hours / 24));
}

