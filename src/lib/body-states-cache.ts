import { BODIES } from "./bodies";
import { computeBodyStates, type BodyState } from "./orbits";

let cachedSimDays = Number.NaN;
let cachedStates: Map<string, BodyState> | null = null;

/** Reuse one body-state map per sim day — avoids duplicate Kepler math each frame. */
export function getBodyStates(simDays: number): Map<string, BodyState> {
  if (cachedStates && cachedSimDays === simDays) {
    return cachedStates;
  }

  cachedSimDays = simDays;
  cachedStates = computeBodyStates(BODIES, simDays);
  return cachedStates;
}