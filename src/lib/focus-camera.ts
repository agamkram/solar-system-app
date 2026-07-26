import * as THREE from "three";

import { getBodyStates } from "./body-states-cache";
import { BODY_BY_ID } from "./bodies";
import { focusArrivalCameraPosition } from "./scale";

export function focusCameraState(
  focusId: string,
  simDays: number,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const body = BODY_BY_ID[focusId];
  if (!body) {
    return {
      position: new THREE.Vector3(0, 0, 6),
      target: new THREE.Vector3(),
    };
  }

  const state = getBodyStates(simDays).get(focusId);
  const localPosition = state?.localPosition ?? new THREE.Vector3();

  return {
    position: focusArrivalCameraPosition(body, localPosition),
    target: new THREE.Vector3(0, 0, 0),
  };
}