"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { DEFAULT_FOCUS_ID, PICKER_BODIES } from "@/lib/bodies";
import {
  applyTouchLayoutDOM,
  clearTouchLayoutDOM,
} from "@/lib/touch-layout-dom";
import { speedIndexToDaysPerSecond } from "@/lib/playback";
import { SolarSystemScene } from "./SolarSystemScene";
import { TimeControls } from "./TimeControls";

export function SolarSystemViewer() {
  const [focusId, setFocusId] = useState(DEFAULT_FOCUS_ID);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [simDays, setSimDays] = useState(0);
  const [epicycleTracing, setEpicycleTracing] = useState(false);
  const [trailDissolve, setTrailDissolve] = useState(false);
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
    const mqPhone = window.matchMedia("(max-width: 767px)");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone);
    const phone = mqPhone.matches;
    const phoneBrowser = phone && !standalone;
    const vv = window.visualViewport;
    const browserChromeBottom =
      phoneBrowser && vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;

    document.documentElement.classList.toggle("pwa-standalone", standalone);
    document.documentElement.classList.toggle("pwa-phone", standalone && phone);
    document.documentElement.classList.toggle("phone-browser", phoneBrowser);

    const touch = window.matchMedia("(pointer: coarse)").matches;
    const root = rootRef.current;
    const scene = sceneRef.current;
    const dock = dockRef.current;

    if (touch && root && dock) {
      applyTouchLayoutDOM(root, scene, dock, browserChromeBottom);
    } else if (root && dock) {
      clearTouchLayoutDOM(root, scene, dock);
    }
  }, []);

  useLayoutEffect(() => {
    syncLayout();
  }, [syncLayout]);

  useEffect(() => {
    const mqPhone = window.matchMedia("(max-width: 767px)");

    window.addEventListener("resize", syncLayout);
    mqPhone.addEventListener("change", syncLayout);

    // Only phone Safari needs visualViewport — pinch on iPad must not relayout.
    const onViewportChange = () => syncLayout();
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.visualViewport?.addEventListener("resize", onViewportChange);
      window.visualViewport?.addEventListener("scroll", onViewportChange);
    }

    return () => {
      window.removeEventListener("resize", syncLayout);
      mqPhone.removeEventListener("change", syncLayout);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, [syncLayout]);

  const handleNow = useCallback(() => {
    simDaysRef.current = 0;
    setSimDays(0);
    setTraceResetKey((k) => k + 1);
  }, []);

  return (
    <div ref={rootRef} className="viewer-root relative w-full bg-[#02040a]">
      <SolarSystemScene
        sceneRef={sceneRef}
        focusId={focusId}
        simDays={simDays}
        epicycleTracing={epicycleTracing}
        trailDissolve={trailDissolve}
        traceResetKey={traceResetKey}
        simDaysRef={simDaysRef}
        speedDaysPerSecondRef={speedDaysPerSecondRef}
        onSimDaysChange={setSimDays}
      />

      <div className="viewer-ui-overlay pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-none flex items-start justify-between gap-3">
          <TimeControls
            simDays={simDays}
            speedIndex={speedIndex}
            onSpeedIndexChange={setSpeedIndex}
            onNow={handleNow}
          />
          <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleEpicycleTracing}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                epicycleTracing
                  ? "border-amber-300/70 bg-amber-400/15 text-amber-100"
                  : "border-white/15 bg-black/35 text-white/80 hover:border-white/30"
              }`}
            >
              Trace Epicycles
            </button>
            <button
              type="button"
              onClick={() => setTrailDissolve((on) => !on)}
              disabled={!epicycleTracing}
              aria-pressed={epicycleTracing && trailDissolve}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-black/35 disabled:text-white/50 ${
                epicycleTracing && trailDissolve
                  ? "border-violet-300/70 bg-violet-400/15 text-violet-100"
                  : "border-white/15 bg-black/35 text-white/80 hover:border-white/30"
              }`}
            >
              Dissolve
            </button>
          </div>
        </header>
      </div>

      <div
        ref={dockRef}
        className="viewer-orb-dock pointer-events-auto flex w-full justify-start"
      >
        <div className="orb-picker-panel w-full rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md">
          <div className="orb-picker">
            {PICKER_BODIES.map((body) => {
              const active = focusId === body.id;
              return (
                <button
                  key={body.id}
                  type="button"
                  onClick={() => handleFocus(body.id)}
                  className={`orb-btn rounded-full font-medium transition ${
                    active
                      ? "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/50"
                      : "bg-white/5 text-white/75 hover:bg-white/10"
                  }`}
                >
                  {body.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}