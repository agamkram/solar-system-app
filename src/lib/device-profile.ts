/** Touch-first devices and phones — tuned for stability, not desktop. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
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