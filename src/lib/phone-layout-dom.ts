function readSafeBottom(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.documentElement.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return value;
}

function isPhoneWidth(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function applyPhoneLayoutDOM(
  root: HTMLElement,
  scene: HTMLElement | null,
  dock: HTMLElement,
  browserChromeBottom = 0,
): void {
  if (!isPhoneWidth()) return;

  const safeBottom = readSafeBottom();
  const screenH = window.innerHeight;
  const dockBottom = browserChromeBottom;

  document.documentElement.style.height = `${screenH}px`;
  document.body.style.height = `${screenH}px`;
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.right = "0";
  root.style.width = "100%";
  root.style.height = `${screenH + safeBottom}px`;
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
  dock.style.bottom = `${dockBottom}px`;
  dock.style.zIndex = "20";
  dock.style.paddingLeft = "calc(0.75rem + env(safe-area-inset-left, 0px))";
  dock.style.paddingRight = "calc(0.75rem + env(safe-area-inset-right, 0px))";
  const dockPad = Math.max(4, safeBottom - 6);
  dock.style.paddingBottom = `${dockPad}px`;
  dock.style.margin = "0";

  window.dispatchEvent(new Event("resize"));
}

export function clearPhoneLayoutDOM(
  root: HTMLElement,
  scene: HTMLElement | null,
  dock: HTMLElement,
): void {
  const clear = (el: HTMLElement) => {
    el.removeAttribute("style");
  };
  document.documentElement.style.removeProperty("height");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("margin");
  document.body.style.removeProperty("overflow");
  clear(root);
  if (scene) clear(scene);
  clear(dock);
}