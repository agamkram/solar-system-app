/** Read safe-area insets in px (iOS PWA / notch devices). */
export function readSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

export interface PhoneLayoutTargets {
  root: HTMLElement;
  scene: HTMLElement | null;
  dock: HTMLElement;
}

export function applyPhoneLayout(
  targets: PhoneLayoutTargets,
  browserChromeBottom: number,
): void {
  const { root, scene, dock } = targets;
  const layoutHeight = window.innerHeight;
  const safe = readSafeAreaInsets();
  const dockBottom = browserChromeBottom + safe.bottom;

  document.documentElement.style.height = `${layoutHeight}px`;
  document.body.style.height = `${layoutHeight}px`;
  document.body.style.minHeight = `${layoutHeight}px`;
  document.body.style.maxHeight = "none";
  document.body.style.overflow = "hidden";

  root.style.position = "fixed";
  root.style.top = "0";
  root.style.left = "0";
  root.style.right = "0";
  root.style.width = "100%";
  root.style.height = `${layoutHeight}px`;
  root.style.minHeight = `${layoutHeight}px`;
  root.style.overflow = "visible";

  if (scene) {
    scene.style.top = "0";
    scene.style.left = "0";
    scene.style.right = "0";
    scene.style.bottom = `${-safe.bottom}px`;
    scene.style.height = `${layoutHeight + safe.bottom}px`;
  }

  dock.style.position = "fixed";
  dock.style.left = `${safe.left}px`;
  dock.style.right = `${safe.right}px`;
  dock.style.bottom = `${dockBottom}px`;
  dock.style.zIndex = "10";
  dock.style.paddingLeft = "0.75rem";
  dock.style.paddingRight = "0.75rem";
  dock.style.paddingBottom = "0";
}

export function clearPhoneLayout(targets: PhoneLayoutTargets): void {
  const { root, scene, dock } = targets;
  const clear = (el: HTMLElement, props: string[]) => {
    for (const prop of props) el.style.removeProperty(prop);
  };

  document.documentElement.style.removeProperty("height");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("min-height");
  document.body.style.removeProperty("max-height");
  document.body.style.removeProperty("overflow");

  clear(root, [
    "position",
    "top",
    "left",
    "right",
    "width",
    "height",
    "min-height",
    "overflow",
  ]);

  if (scene) {
    clear(scene, ["top", "left", "right", "bottom", "height"]);
  }

  clear(dock, [
    "position",
    "left",
    "right",
    "bottom",
    "z-index",
    "padding-left",
    "padding-right",
    "padding-bottom",
  ]);
}