/** Touch-first devices and phones — tuned for stability, not desktop. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const ipad =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ipad) return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /iPhone|iPod|Android/i.test(ua)
  );
}

export function canvasDpr(): number | [number, number] {
  return isMobileDevice() ? 1 : [1, 2];
}

export function sphereSegments(bodyId: string, kind: string): number {
  const mobile = isMobileDevice();
  if (bodyId === "earth") return mobile ? 64 : 96;
  if (kind === "star") return mobile ? 48 : 64;
  return mobile ? 48 : 72;
}

export function maxConcurrentTextureLoads(): number {
  return isMobileDevice() ? 1 : 3;
}

/** Max samples per orbit path for canvas overlay (CPU only, no GPU verts). */
export function orbitLineDivisionCap(): number {
  if (isPhoneDevice()) return 140;
  if (isMobileDevice()) return 220;
  return 600;
}