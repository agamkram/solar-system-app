"use client";

/** Preload only the default view bodies — avoids mobile GPU spikes at startup. */
export function TextureWarmup() {
  return null;
}