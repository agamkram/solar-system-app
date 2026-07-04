import * as THREE from "three";

import {
  isMobileDevice,
  isPhoneDevice,
  skyTextureUploadSize,
} from "@/lib/device-profile";
import {
  fitTextureToGpuLimit,
  loadPhoneSkyImage,
  loadSkyImageResized,
  textureFromImageSource,
} from "@/lib/gpu-texture";
import { skyTextureCache } from "@/lib/sky-texture-cache";

function skyAssetUrl(): string {
  if (isPhoneDevice()) return "/stars-phone.jpg?v=3";
  return "/stars-8k.jpg";
}

function applySkySampler(texture: THREE.Texture): THREE.Texture {
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

export function configureSkyTexture(texture: THREE.Texture): THREE.Texture {
  applySkySampler(texture);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  skyTextureCache.texture = texture;
  return texture;
}

export async function loadSkyTexture(
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture | null> {
  if (skyTextureCache.texture) {
    return skyTextureCache.texture;
  }

  const phone = isPhoneDevice();
  const maxSize = Math.min(
    gl.capabilities.maxTextureSize,
    skyTextureUploadSize(),
  );

  try {
    let texture: THREE.Texture;
    if (isMobileDevice()) {
      const source = phone
        ? await loadPhoneSkyImage(skyAssetUrl())
        : await loadSkyImageResized(skyAssetUrl(), maxSize);
      texture = textureFromImageSource(source, maxSize);
    } else {
      texture = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(
          skyAssetUrl(),
          resolve,
          undefined,
          reject,
        );
      });
      fitTextureToGpuLimit(texture, maxSize);
    }
    return configureSkyTexture(texture);
  } catch {
    return null;
  }
}