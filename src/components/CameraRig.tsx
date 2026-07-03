"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { getBodyStates } from "@/lib/body-states-cache";
import { BODY_BY_ID } from "@/lib/bodies";
import { focusCameraState } from "@/lib/focus-camera";
import { focusMinDistance, godsViewDistance } from "@/lib/scale";

interface CameraRigProps {
  focusId: string;
  simDays: number;
  simDaysRef: React.RefObject<number>;
}

export function CameraRig({ focusId, simDays, simDaysRef }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const fromPosition = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());
  const transitionBlend = useRef(1);
  const focusInitialized = useRef(false);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    const { position, target } = focusCameraState(
      focusId,
      simDaysRef.current ?? simDays,
    );

    if (!focusInitialized.current) {
      focusInitialized.current = true;
      camera.position.copy(position);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
      transitionBlend.current = 1;
      return;
    }

    fromPosition.current.copy(camera.position);
    fromTarget.current.copy(controls?.target ?? new THREE.Vector3());
    transitionBlend.current = 0;
    // Only re-center camera on focus change — not when sim time advances.
  }, [focusId, camera]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = isTouch ? 0.65 : 0.5;
    controls.zoomSpeed = isTouch ? 2.8 : 1.2;
    controls.maxDistance = Infinity;
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const focusBody = BODY_BY_ID[focusId];
    if (!focusBody) return;

    controls.minDistance = focusMinDistance(focusBody);
    controls.maxDistance = Infinity;

    if (transitionBlend.current < 1) {
      const { position: desiredPosition, target } = focusCameraState(
        focusId,
        simDaysRef.current ?? simDays,
      );
      transitionBlend.current = Math.min(1, transitionBlend.current + delta * 3.5);
      const t = 1 - (1 - transitionBlend.current) ** 3;
      camera.position.lerpVectors(fromPosition.current, desiredPosition, t);
      controls.target.lerpVectors(fromTarget.current, target, t);
      controls.update();
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      const viewDistance = camera.position.distanceTo(controls.target);
      camera.fov = 45;
      camera.near = 0.01;
      camera.far = Math.max(godsViewDistance() * 24, viewDistance * 6, 2000);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      target={[0, 0, 0]}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI - 0.15}
    />
  );
}