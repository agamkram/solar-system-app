import * as THREE from "three";

/**
 * Fit an image to the GPU's max texture size without changing the source asset.
 * Required on many phones (often 4096px max) for 8k sky backgrounds.
 */
export function fitTextureToGpuLimit(
  texture: THREE.Texture,
  maxTextureSize: number,
): void {
  const image = texture.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | undefined;
  if (!image || !("width" in image) || !("height" in image)) return;

  const width = image.width;
  const height = image.height;
  if (width <= maxTextureSize && height <= maxTextureSize) return;

  const scale = maxTextureSize / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  texture.image = canvas;
  texture.needsUpdate = true;
}