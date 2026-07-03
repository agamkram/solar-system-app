"use client";

import { useTexture } from "@react-three/drei";

import { BODIES } from "@/lib/bodies";

const ALL_TEXTURE_URLS = [
  ...new Set(
    BODIES.flatMap((body) =>
      [body.texture, body.atmosphereTexture, body.ringTexture].filter(Boolean),
    ),
  ),
] as string[];

useTexture.preload(ALL_TEXTURE_URLS);

export function TextureWarmup() {
  return null;
}