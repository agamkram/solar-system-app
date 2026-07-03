"use client";

import { useCallback, useRef, useState } from "react";

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

  const handleNow = useCallback(() => {
    simDaysRef.current = 0;
    setSimDays(0);
    setTraceResetKey((k) => k + 1);
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#02040a]">
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

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
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

        <div className="pointer-events-auto flex justify-start">
          <div className="orb-picker-panel max-w-[min(100%,20rem)] rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur-md sm:max-w-[22rem]">
            <div className="orb-picker flex flex-wrap gap-1.5">
              {PICKER_BODIES.map((body) => {
                const active = focusId === body.id;
                return (
                  <button
                    key={body.id}
                    type="button"
                    onClick={() => handleFocus(body.id)}
                    className={`orb-btn shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
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