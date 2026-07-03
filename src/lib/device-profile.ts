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
  const phone = isPhoneDevice();
  const mobile = isMobileDevice();
  if (bodyId === "earth") return phone ? 48 : mobile ? 64 : 96;
  if (kind === "star") return phone ? 32 : mobile ? 48 : 64;
  return phone ? 32 : mobile ? 48 : 72;
}

export function maxConcurrentTextureLoads(): number {
  return isMobileDevice() ? 1 : 3;
}

/** Full asset resolution up to what the GPU supports (never artificially capped). */
export function maxAssetTextureSize(gpuMax: number): number {
  return Math.min(gpuMax, 8192);
}

/** Resize during decode on touch devices — avoids RAM spikes, not lower quality. */
export function resizeTexturesDuringDecode(): boolean {
  return isMobileDevice();
}

export function useTextureMipmaps(): boolean {
  return !isPhoneDevice();
}

/** Phones: fixed low count, no arc-length tables for every ring at once. */
export function orbitLineDivisionCap(): number {
  if (isPhoneDevice()) return 72;
  if (isMobileDevice()) return 180;
  return 600;
}