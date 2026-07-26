/** Touch-first devices and phones — tuned for stability, not desktop. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIpadDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isPhoneDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (isIpadDevice()) return false;
  const ua = navigator.userAgent;
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

/** GPU upload cap — images are resized during decode on touch devices. */
export function maxTextureUploadSize(): number {
  if (isPhoneDevice()) return 1024;
  if (isMobileDevice()) return 2048;
  return 8192;
}

export function skyTextureUploadSize(): number {
  if (isPhoneDevice()) return 4096;
  // 8k sky OOMs iPad WebGL — 4k asset capped at 4096 is stable.
  if (isIpadDevice()) return 4096;
  return 8192;
}

export function useTextureMipmaps(): boolean {
  return !isPhoneDevice();
}

/** Max samples per orbit path for canvas overlay (CPU only, no GPU verts). */
export function orbitLineDivisionCap(): number {
  if (isPhoneDevice()) return 72;
  if (isMobileDevice()) return 180;
  return 600;
}

/** On phone only load sun + the focused body — others load when selected. */
export function shouldLoadBodyTextureOnPhone(
  bodyId: string,
  focusId: string,
  parentId?: string | null,
): boolean {
  if (!isPhoneDevice()) return true;
  if (bodyId === "sun" || bodyId === focusId) return true;
  // Moons load when their parent planet is focused (Earth's Moon, Titan, etc.)
  if (parentId && parentId === focusId) return true;
  return false;
}