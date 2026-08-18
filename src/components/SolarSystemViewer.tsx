"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { DEFAULT_FOCUS_ID, PICKER_BODIES } from "@/lib/bodies";
import {
  clearInlineLayoutStyles,
  syncPwaFillHeight,
} from "@/lib/touch-layout-dom";
import { speedIndexToDaysPerSecond } from "@/lib/playback";
import {
  nextTrailColorMode,
  TRAIL_COLOR_MODE_LABEL,
  type TrailColorMode,
} from "@/lib/trail-colors";
import { SolarSystemScene } from "./SolarSystemScene";
import { TimeControls } from "./TimeControls";

export function SolarSystemViewer() {
  const [focusId, setFocusId] = useState(DEFAULT_FOCUS_ID);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [simDays, setSimDays] = useState(0);
  const [epicycleTracing, setEpicycleTracing] = useState(false);
  const [trailDissolve, setTrailDissolve] = useState(false);
  const [trailColorMode, setTrailColorMode] =
    useState<TrailColorMode>("color");
  const [traceResetKey, setTraceResetKey] = useState(0);

  const simDaysRef = useRef(0);
  const speedDaysPerSecondRef = useRef(speedIndexToDaysPerSecond(speedIndex));
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  speedDaysPerSecondRef.current = speedIndexToDaysPerSecond(speedIndex);

  const handleFocus = useCallback((id: string) => {
    setFocusId(id);
  }, []);

  const handleEpicycleTracing = useCallback(() => {
    if (epicycleTracing) {
      setTrailDissolve(false);
    }
    setEpicycleTracing((on) => !on);
  }, [epicycleTracing]);

  const syncLayout = useCallback(() => {
    syncPwaFillHeight();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const scene = sceneRef.current;
    const dock = dockRef.current;
    if (root && dock) {
      clearInlineLayoutStyles(root, scene, dock);
    }
    syncLayout();
  }, [syncLayout]);

  useEffect(() => {
    const onResize = () => syncLayout();
    window.addEventListener("resize", onResize);
    window.addEventListener("pageshow", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    const later = window.setTimeout(onResize, 100);
    const later2 = window.setTimeout(onResize, 400);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.clearTimeout(later);
      window.clearTimeout(later2);
    };
  }, [syncLayout]);

  const handleNow = useCallback(() => {
    simDaysRef.current = 0;
    setSimDays(0);
    setTraceResetKey((k) => k + 1);
  }, []);

  const focusIndex = Math.max(
    0,
    PICKER_BODIES.findIndex((body) => body.id === focusId),
  );
  const focusName = PICKER_BODIES[focusIndex]?.name ?? focusId;

  // Portal title to <body> so it is not trapped under the WebGL stack.
  const [titleReady, setTitleReady] = useState(false);
  useEffect(() => {
    setTitleReady(true);
    const blockCallout = (event: Event) => event.preventDefault();
    document.addEventListener("contextmenu", blockCallout);
    document.addEventListener("selectstart", blockCallout);
    return () => {
      document.removeEventListener("contextmenu", blockCallout);
      document.removeEventListener("selectstart", blockCallout);
    };
  }, []);

  const titleChrome =
    titleReady &&
    createPortal(
      <header className="app-chrome" aria-label="SolarSystem">
        <h1 className="app-title">SolarSystem</h1>
      </header>,
      document.body,
    );

  return (
    <div ref={rootRef} className="viewer-root bg-[#02040a]">
      {titleChrome}

      <SolarSystemScene
        sceneRef={sceneRef}
        focusId={focusId}
        simDays={simDays}
        epicycleTracing={epicycleTracing}
        trailDissolve={trailDissolve}
        trailColorMode={trailColorMode}
        traceResetKey={traceResetKey}
        simDaysRef={simDaysRef}
        speedDaysPerSecondRef={speedDaysPerSecondRef}
        onSimDaysChange={setSimDays}
      />

      <div ref={dockRef} className="viewer-orb-dock">
        {/* DOM order = Mac/iPad row order: planets left, time right.
            Phone uses column-reverse so time stays above planets. */}
        <div className="orb-picker-panel pointer-events-auto rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
          <div className="orb-picker">
            <p className="orb-picker-name">{focusName}</p>
            <input
              type="range"
              min={0}
              max={PICKER_BODIES.length - 1}
              step={1}
              value={focusIndex}
              onChange={(event) => {
                const next = PICKER_BODIES[Number(event.target.value)];
                if (next) handleFocus(next.id);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                try {
                  event.currentTarget.setPointerCapture(event.pointerId);
                } catch {
                  /* older Safari */
                }
              }}
              onTouchStart={(event) => {
                event.stopPropagation();
              }}
              className="time-speed-slider dock-slider orb-picker-slider cursor-pointer appearance-none rounded-full accent-sky-400"
              aria-label="Focus body"
              aria-valuetext={focusName}
            />
            <button
              type="button"
              onClick={() => setTrailColorMode(nextTrailColorMode)}
              onPointerDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
              className="orb-picker-tone"
              aria-label={`Trail colors: ${TRAIL_COLOR_MODE_LABEL[trailColorMode]}. Tap to change.`}
            >
              {TRAIL_COLOR_MODE_LABEL[trailColorMode]}
            </button>
          </div>
        </div>

        <TimeControls
          simDays={simDays}
          speedIndex={speedIndex}
          onSpeedIndexChange={setSpeedIndex}
          onNow={handleNow}
          epicycleTracing={epicycleTracing}
          trailDissolve={trailDissolve}
          onEpicycleTracing={handleEpicycleTracing}
          onTrailDissolve={() => setTrailDissolve((on) => !on)}
        />
      </div>
    </div>
  );
}