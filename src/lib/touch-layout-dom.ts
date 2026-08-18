/** SuperMoon PWA fill — grow the layout viewport; do not JS-lift the dock. */

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function pwaFillHeightPx(): number {
  const iw = window.innerWidth || 0;
  const ih = window.innerHeight || 0;
  const sw = window.screen.width || 0;
  const sh = window.screen.height || 0;
  if (ih >= iw) return Math.max(ih, Math.max(sw, sh));
  return Math.max(ih, Math.min(sw, sh));
}

function readSafeInsetBottom(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return px;
}

function pwaExtraBottomPx(): number {
  const iw = window.innerWidth || 0;
  const ih = window.innerHeight || 0;
  const sw = window.screen.width || 0;
  const sh = window.screen.height || 0;
  const screenMax = Math.max(sw, sh);
  if (Math.min(iw, ih) < 600) return 0;
  if (screenMax >= ih - 10) return 0;
  return Math.max(readSafeInsetBottom(), 20);
}

export function syncPwaFillHeight(): void {
  const root = document.documentElement;
  const standalone = isStandalone();
  root.classList.toggle("pwa-standalone", standalone);

  if (!standalone) {
    root.style.removeProperty("--pwa-fill-h");
    root.style.removeProperty("--pwa-extra-b");
    root.style.removeProperty("height");
    root.style.removeProperty("min-height");
    return;
  }

  const fillH = pwaFillHeightPx();
  const extra = pwaExtraBottomPx();
  root.style.setProperty("--pwa-fill-h", `${fillH}px`);
  root.style.setProperty("--pwa-extra-b", `${extra}px`);
  root.style.height = `${fillH + extra}px`;
  root.style.minHeight = `${fillH + extra}px`;
}

export function clearInlineLayoutStyles(
  root: HTMLElement,
  scene: HTMLElement | null,
  dock: HTMLElement,
): void {
  root.removeAttribute("style");
  if (scene) scene.removeAttribute("style");
  dock.removeAttribute("style");
}
