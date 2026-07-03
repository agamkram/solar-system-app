import * as THREE from "three";

import { maxConcurrentTextureLoads } from "./device-profile";
import { configureColorMap } from "./texture-config";

interface QueueJob {
  url: string;
  gl: THREE.WebGLRenderer;
  resolve: (texture: THREE.Texture) => void;
  reject: (error: unknown) => void;
}

const textureCache = new Map<string, Promise<THREE.Texture>>();
const queue: QueueJob[] = [];
let activeLoads = 0;

function pumpQueue() {
  while (activeLoads < maxConcurrentTextureLoads() && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;

    activeLoads += 1;
    loadTextureImmediate(job.url, job.gl)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        activeLoads -= 1;
        pumpQueue();
      });
  }
}

function loadTextureImmediate(
  url: string,
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        configureColorMap(texture, gl);
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/** Full-resolution textures, uploaded sequentially on mobile to avoid GPU OOM. */
export function loadTextureQueued(
  url: string,
  gl: THREE.WebGLRenderer,
): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    queue.push({ url, gl, resolve, reject });
    pumpQueue();
  });

  promise.catch(() => {
    textureCache.delete(url);
  });

  textureCache.set(url, promise);
  return promise;
}