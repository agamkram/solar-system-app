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
    | ImageBitmap
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
  if ("close" in image && typeof image.close === "function") {
    image.close();
  }
  texture.image = canvas;
  texture.needsUpdate = true;
}

/** Decode and downscale in one step — avoids a full-res 8k/4k RAM spike on phone. */
export async function loadImageResized(
  url: string,
  maxSize: number,
): Promise<ImageBitmap | HTMLCanvasElement> {
  const response = await fetch(url);
  const blob = await response.blob();

  try {
    return await createImageBitmap(blob, {
      resizeWidth: maxSize,
      resizeQuality: "high",
    });
  } catch {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = maxSize / Math.max(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(img.width * scale));
        canvas.height = Math.max(1, Math.floor(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas 2d unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`failed to load ${url}`));
      };
      img.src = objectUrl;
    });
  }
}

export function textureFromImageSource(
  source: ImageBitmap | HTMLCanvasElement,
  maxSize: number,
): THREE.Texture {
  const texture = new THREE.Texture(source);
  fitTextureToGpuLimit(texture, maxSize);
  // ImageBitmap is top-left origin; canvas matches TextureLoader (flipY true).
  texture.flipY = texture.image instanceof HTMLCanvasElement;
  return texture;
}