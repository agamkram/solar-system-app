"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { canvasDpr, isMobileDevice } from "@/lib/device-profile";
import { focusCameraState } from "@/lib/focus-camera";
import { godsViewDistance } from "@/lib/scale";
import { CameraRig } from "./CameraRig";
import { EpicycleTrails } from "./EpicycleTrails";
import { OrbitLines } from "./OrbitLines";
import { SceneClock } from "./SceneClock";
import { SolarSystemBodies } from "./SolarSystemBodies";
import { Starfield } from "./Starfield";
import { TextureWarmup } from "./TextureWarmup";

interface SolarSystemSceneProps {
  sceneRef?: React.RefObject<HTMLDivElement | null>;
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
      <Starfield />
      <TextureWarmup />
      <CameraRig
        focusId={focusId}
        simDays={simDays}
        simDaysRef={simDaysRef}
      />
      <SolarSystemBodies simDaysRef={simDaysRef} focusId={focusId} />
      {/* Lines live in WebGL with the planets — no DOM canvas overlays */}
      {!epicycleTracing && (
        <OrbitLines focusId={focusId} simDaysRef={simDaysRef} />
      )}
      {epicycleTracing && (
        <EpicycleTrails
          focusId={focusId}
          simDaysRef={simDaysRef}
          tracing={epicycleTracing}
          dissolve={trailDissolve}
          traceResetKey={traceResetKey}
        />
      )}
    </>
  );
}

export function SolarSystemScene({
  sceneRef,
  focusId,
  simDays,
  ...props
}: SolarSystemSceneProps) {
  const far = godsViewDistance() * 24;
  const initialCamera = useMemo(() => focusCameraState(focusId, 0), [focusId]);
  // Client-only; "use client" component — fine for gl options.
  const mobile = typeof window !== "undefined" ? isMobileDevice() : false;

  return (
    <div ref={sceneRef} className="viewer-scene absolute inset-0 bg-[#02040a]">
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
          antialias: !mobile,
          powerPreference: mobile ? "default" : "high-performance",
        }}
        style={{ touchAction: "none" }}
        onCreated={({ camera, gl }) => {
          gl.setClearColor(0x02040a, 1);
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
