/** Touch-first devices and phones — tuned for stability, not desktop. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

/** Phones need the tightest GPU/CPU budgets. iPad gets a little more headroom. */
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

/** Hard cap on orbit-line samples — prevents phone OOM from ring geometry. */
export function orbitLineDivisionCap(): number {
  if (isPhoneDevice()) return 200;
  if (isMobileDevice()) return 420;
  return 2400;
}