import { BODIES } from "./bodies";
import { isMobileDevice } from "./device-profile";

/** Body IDs whose textures may sit on the GPU at once (mobile/iPad). */
export function mobileGpuBodyIds(focusId: string): Set<string> {
  const keep = new Set<string>(["sun", focusId]);
  for (const body of BODIES) {
    if (body.kind === "moon" && body.parentId === focusId) {
      keep.add(body.id);
    }
  }
  return keep;
}

export function shouldGpuLoadBodyTextures(
  bodyId: string,
  focusId: string,
): boolean {
  if (!isMobileDevice()) return true;
  return mobileGpuBodyIds(focusId).has(bodyId);
}

export function mobileTextureLoadGapMs(): number {
  return 180;
}