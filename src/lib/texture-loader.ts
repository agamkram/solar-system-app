import * as THREE from "three";

import { isMobileDevice } from "./device-profile";
import {
  maxAssetTextureSize,
  maxConcurrentTextureLoads,
  resizeTexturesDuringDecode,
} from "./device-profile";
import { mobileTextureLoadGapMs } from "./mobile-texture-policy";
import { configureColorMap } from "./texture-config";
import {
  fitTextureToGpuLimit,
  loadImageResized,
  textureFromImageSource,
} from "./gpu-texture";

interface QueueJob {
  url: string;
  bodyId: string;
  gl: THREE.WebGLRenderer;
  resolve: (texture: THREE.Texture) => void;
  reject: (error: unknown) => void;
}

const textureCache = new Map<string, Promise<THREE.Texture>>();
const textureOwners = new Map<string, string>();
const liveTextures = new Map<string, THREE.Texture>();
const queue: QueueJob[] = [];
let activeLoads = 0;
let skyReady = !isMobileDevice();
let pumpScheduled = false;

export function notifySkyLoadStart(): void {
  if (!isMobileDevice()) return;
  skyReady = false;
}

export function notifySkyLoadComplete(): void {
  skyReady = true;
  schedulePump();
}

/** Drop GPU copies for bodies not in view — full-res reloads on next focus. */
export function releaseMobileTextures(keepBodyIds: Set<string>): void {
  if (!isMobileDevice()) return;

  for (const [url, bodyId] of textureOwners) {
    if (keepBodyIds.has(bodyId)) continue;
    const texture = liveTextures.get(url);
    texture?.dispose();
    liveTextures.delete(url);
    textureOwners.delete(url);
    textureCache.delete(url);
  }
}

function schedulePump() {
  if (pumpScheduled) return;
  pumpScheduled = true;
  queueMicrotask(() => {
    pumpScheduled = false;
    pumpQueue();
  });
}

function pumpQueue() {
  if (isMobileDevice() && !skyReady) return;

  while (activeLoads < maxConcurrentTextureLoads() && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;

    activeLoads += 1;
    loadTextureImmediate(job.url, job.gl)
      .then((texture) => {
        liveTextures.set(job.url, texture);
        textureOwners.set(job.url, job.bodyId);
        job.resolve(texture);
      })
      .catch(job.reject)
      .finally(() => {
        activeLoads -= 1;
        if (isMobileDevice() && queue.length > 0) {
          window.setTimeout(schedulePump, mobileTextureLoadGapMs());
        } else {
          schedulePump();
        }
      });
  }
}

async function loadTextureImmediate(
  url: string,
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture> {
  const maxSize = maxAssetTextureSize(gl.capabilities.maxTextureSize);

  if (resizeTexturesDuringDecode()) {
    const source = await loadImageResized(url, maxSize);
    const texture = textureFromImageSource(source, maxSize);
    configureColorMap(texture, gl);
    return texture;
  }

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        fitTextureToGpuLimit(texture, maxSize);
        configureColorMap(texture, gl);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

export function loadTextureQueued(
  url: string,
  gl: THREE.WebGLRenderer,
  bodyId: string,
): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    queue.push({ url, bodyId, gl, resolve, reject });
    schedulePump();
  });

  promise.catch(() => {
    textureCache.delete(url);
    liveTextures.delete(url);
    textureOwners.delete(url);
  });

  textureCache.set(url, promise);
  return promise;
}

export function clearTextureCache(): void {
  for (const texture of liveTextures.values()) {
    texture.dispose();
  }
  liveTextures.clear();
  textureOwners.clear();
  textureCache.clear();
  queue.length = 0;
  activeLoads = 0;
  skyReady = !isMobileDevice();
}