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
  // Keep app shell under portaled title (z-index 100000), above page chrome only.
  root.style.zIndex = "1";

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
  // Safari iPad: left+right with width:auto shrink-wraps to content — force full bleed.
  dock.style.width = "100%";
  dock.style.boxSizing = "border-box";
  dock.style.bottom = `${browserChromeBottom}px`;
  dock.style.top = "auto";
  dock.style.height = "auto";
  dock.style.zIndex = "20";
  dock.style.margin = "0";
  dock.style.pointerEvents = "none";
  dock.style.paddingLeft = "calc(0.75rem + env(safe-area-inset-left, 0px))";
  dock.style.paddingRight = "calc(0.75rem + env(safe-area-inset-right, 0px))";
  dock.style.paddingBottom = `${dockPad}px`;

  // Phone: column-reverse (time above planets). iPad: equal-width grid columns.
  if (phone) {
    dock.style.display = "flex";
    dock.style.flexDirection = "column-reverse";
    dock.style.alignItems = "stretch";
    dock.style.gap = "0.3rem";
    dock.style.removeProperty("grid-template-columns");
  } else {
    dock.style.display = "grid";
    dock.style.gridTemplateColumns = "minmax(0, 1fr) minmax(0, 1fr)";
    dock.style.alignItems = "stretch";
    dock.style.gap = "0.5rem";
    dock.style.removeProperty("flex-direction");
    dock.style.removeProperty("flex-wrap");
  }
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