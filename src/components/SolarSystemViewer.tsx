"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_FOCUS_ID, PICKER_BODIES } from "@/lib/bodies";
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

  useEffect(() => {
    const mqPhone = window.matchMedia("(max-width: 767px)");

    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone);

    const syncLayout = () => {
      const standalone = isStandalone();
      const phone = mqPhone.matches;
      const phoneBrowser = phone && !standalone;
      const vv = window.visualViewport;

      document.documentElement.classList.toggle("pwa-standalone", standalone);
      document.documentElement.classList.toggle("pwa-phone", standalone && phone);
      document.documentElement.classList.toggle("phone-browser", phoneBrowser);

      if (phoneBrowser && vv) {
        document.documentElement.style.setProperty(
          "--app-height",
          `${vv.height}px`,
        );
        document.documentElement.style.setProperty(
          "--browser-chrome-bottom",
          `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
        );
      } else {
        document.documentElement.style.setProperty(
          "--app-height",
          `${window.innerHeight}px`,
        );
        document.documentElement.style.setProperty(
          "--browser-chrome-bottom",
          "0px",
        );
      }
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    mqPhone.addEventListener("change", syncLayout);
    window.visualViewport?.addEventListener("resize", syncLayout);
    window.visualViewport?.addEventListener("scroll", syncLayout);

    return () => {
      window.removeEventListener("resize", syncLayout);
      mqPhone.removeEventListener("change", syncLayout);
      window.visualViewport?.removeEventListener("resize", syncLayout);
      window.visualViewport?.removeEventListener("scroll", syncLayout);
    };
  }, []);

  const handleNow = useCallback(() => {
    simDaysRef.current = 0;
    setSimDays(0);
    setTraceResetKey((k) => k + 1);
  }, []);

  return (
    <div className="viewer-root relative w-full overflow-hidden bg-[#02040a]">
      <SolarSystemScene
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

        <div className="viewer-orb-dock pointer-events-auto flex w-full justify-start">
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
    </div>
  );
}