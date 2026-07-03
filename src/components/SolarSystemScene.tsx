"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";

import { canvasDpr, isMobileDevice } from "@/lib/device-profile";
import { focusCameraState } from "@/lib/focus-camera";
import { godsViewDistance } from "@/lib/scale";
import { CameraRig } from "./CameraRig";
import { SceneClock } from "./SceneClock";
import { SolarSystemBodies } from "./SolarSystemBodies";
import { SkyBackground } from "./SkyBackground";
import { TextureWarmup } from "./TextureWarmup";

interface SolarSystemSceneProps {
  focusId: string;
  simDays: number;
  epicycleTracing: boolean;
  trailDissolve: boolean;
  traceResetKey: number;
  simDaysRef: React.RefObject<number>;
  speedDaysPerSecondRef: React.RefObject<number>;
  onSimDaysChange: (simDays: number) => void;
}

function SceneContent({
  focusId,
  simDays,
  epicycleTracing,
  trailDissolve,
  traceResetKey,
  simDaysRef,
  speedDaysPerSecondRef,
  onSimDaysChange,
}: SolarSystemSceneProps) {
  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight
        color="#9ec0ff"
        groundColor="#1a1020"
        intensity={0.3}
      />
      <SceneClock
        speedDaysPerSecondRef={speedDaysPerSecondRef}
        simDaysRef={simDaysRef}
        onTick={onSimDaysChange}
      />
      <TextureWarmup />
      <SkyBackground />
      <SolarSystemBodies
        simDaysRef={simDaysRef}
        focusId={focusId}
        epicycleTracing={epicycleTracing}
        trailDissolve={trailDissolve}
        traceResetKey={traceResetKey}
      />
      <CameraRig
        focusId={focusId}
        simDays={simDays}
        simDaysRef={simDaysRef}
      />
    </>
  );
}

export function SolarSystemScene({
  focusId,
  simDays,
  ...props
}: SolarSystemSceneProps) {
  const far = godsViewDistance() * 24;
  const initialCamera = useMemo(() => focusCameraState(focusId, 0), [focusId]);

  return (
    <div className="viewer-scene absolute inset-0">
      <Canvas
        className="h-full w-full"
        frameloop="always"
        camera={{
          position: [
            initialCamera.position.x,
            initialCamera.position.y,
            initialCamera.position.z,
          ],
          fov: 45,
          near: 0.01,
          far,
        }}
        dpr={canvasDpr()}
        gl={{
          antialias: !isMobileDevice(),
          powerPreference: isMobileDevice() ? "default" : "high-performance",
        }}
        style={{ touchAction: "none" }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(
            initialCamera.target.x,
            initialCamera.target.y,
            initialCamera.target.z,
          );
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
          });
        }}
      >
        <SceneContent focusId={focusId} simDays={simDays} {...props} />
      </Canvas>
    </div>
  );
}