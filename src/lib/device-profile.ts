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

export function canvasDpr(): [number, number] {
  return [1, 2];
}

/** Distant bodies stay cheap; the thing filling the screen gets a round limb. */
export function sphereSegments(
  bodyId: string,
  kind: string,
  close: boolean,
): number {
  const phone = isPhoneDevice();
  const mobile = isMobileDevice();
  if (close) {
    if (kind === "star") return phone ? 128 : 192;
    return phone ? 192 : mobile ? 256 : 320;
  }
  if (bodyId === "earth") return phone ? 48 : mobile ? 64 : 80;
  if (kind === "star") return phone ? 32 : mobile ? 48 : 64;
  return phone ? 32 : mobile ? 48 : 64;
}

export function ringSegments(close: boolean): number {
  if (close) return isPhoneDevice() ? 192 : 320;
  return isPhoneDevice() ? 48 : 96;
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

export function useTextureMipmaps(): boolean {
  return !isPhoneDevice();
}

/** Close-up orbits get dense samples; far orbits stay complete but cheap. */
export function orbitLineDivisionCap(close = false): number {
  if (!close) return isPhoneDevice() ? 160 : 220;
  if (isPhoneDevice()) return 512;
  if (isMobileDevice()) return 768;
  return 1024;
}

/** On phone: sun, the focused body, and the giants visible from the default view. */
export function shouldLoadBodyTextureOnPhone(
  bodyId: string,
  focusId: string,
  parentId?: string | null,
): boolean {
  if (!isPhoneDevice()) return true;
  if (bodyId === "sun" || bodyId === focusId) return true;
  if (bodyId === "jupiter" || bodyId === "saturn") return true;
  // Moons load when their parent planet is focused (Earth's Moon, Titan, etc.)
  if (parentId && parentId === focusId) return true;
  return false;
}