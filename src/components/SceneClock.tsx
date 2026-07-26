"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface SceneClockProps {
  speedDaysPerSecondRef: React.RefObject<number>;
  simDaysRef: React.RefObject<number>;
  onTick: (simDays: number) => void;
}

export function SceneClock({
  speedDaysPerSecondRef,
  simDaysRef,
  onTick,
}: SceneClockProps) {
  const uiAccumulator = useRef(0);

  useFrame((_, delta) => {
    const speed = speedDaysPerSecondRef.current ?? 0;
    if (speed <= 0) return;
    simDaysRef.current += speed * delta;
    uiAccumulator.current += delta;
    if (uiAccumulator.current >= 0.12) {
      uiAccumulator.current = 0;
      onTick(simDaysRef.current);
    }
  });

  return null;
}