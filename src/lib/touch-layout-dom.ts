function readSafeBottom(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.documentElement.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return value;
}

function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

function isPhoneWidth(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

let lastLayoutKey = "";

export function applyTouchLayoutDOM(
  root: HTMLElement,
  scene: HTMLElement | null,
  dock: HTMLElement,
  browserChromeBottom = 0,
): void {
  if (!isTouchDevice()) return;

  const safeBottom = readSafeBottom();
  const screenH = window.innerHeight;
  const totalH = screenH + safeBottom;
  const layoutKey = `${screenH}|${safeBottom}|${browserChromeBottom}|${window.innerWidth}`;
  if (layoutKey === lastLayoutKey) return;
  lastLayoutKey = layoutKey;

  const phone = isPhoneWidth();
  const dockPad = phone ? Math.max(4, safeBottom - 6) : Math.max(8, safeBottom);

  document.documentElement.style.height = `${totalH}px`;
  document.body.style.height = `${totalH}px`;
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#02040a";

  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.right = "0";
  root.style.bottom = "0";
  root.style.width = "100%";
  root.style.height = `${totalH}px`;
  root.style.minHeight = `${screenH}px`;
  root.style.overflow = "hidden";
  root.style.background = "#02040a";
  root.style.zIndex = "0";

  if (scene) {
    scene.style.position = "absolute";
    scene.style.top = "0";
    scene.style.left = "0";
    scene.style.right = "0";
    scene.style.bottom = "0";
    scene.style.width = "100%";
    scene.style.height = "100%";
  }

  dock.style.position = "fixed";
  dock.style.left = "0";
  dock.style.right = "0";
  dock.style.bottom = `${browserChromeBottom}px`;
  dock.style.zIndex = "20";
  dock.style.paddingLeft = "calc(0.75rem + env(safe-area-inset-left, 0px))";
  dock.style.paddingRight = "calc(0.75rem + env(safe-area-inset-right, 0px))";
  dock.style.paddingBottom = `${dockPad}px`;
  dock.style.margin = "0";
}

export function clearTouchLayoutDOM(
  root: HTMLElement,
  scene: HTMLElement | null,
  dock: HTMLElement,
): void {
  lastLayoutKey = "";
  const clear = (el: HTMLElement) => {
    el.removeAttribute("style");
  };
  document.documentElement.style.removeProperty("height");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("margin");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("background");
  clear(root);
  if (scene) clear(scene);
  clear(dock);
}