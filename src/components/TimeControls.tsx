"use client";

import { formatSimDate, SPEED_OPTIONS, speedLabel } from "@/lib/playback";

interface TimeControlsProps {
  simDays: number;
  speedIndex: number;
  onSpeedIndexChange: (index: number) => void;
  onNow: () => void;
  epicycleTracing: boolean;
  trailDissolve: boolean;
  onEpicycleTracing: () => void;
  onTrailDissolve: () => void;
}

export function TimeControls({
  simDays,
  speedIndex,
  onSpeedIndexChange,
  onNow,
  epicycleTracing,
  trailDissolve,
  onEpicycleTracing,
  onTrailDissolve,
}: TimeControlsProps) {
  return (
    <div className="time-controls-card pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-1.5 py-0.5 backdrop-blur-md">
      <div className="time-controls-main">
        <p className="truncate text-[9px] font-medium leading-tight tabular-nums text-white/90">
          {formatSimDate(simDays)}
        </p>

        <div className="time-controls-speed">
          <div className="time-controls-speed-labels flex items-center justify-between gap-1">
            <span className="text-[8px] leading-none text-white/40">Speed</span>
            <span className="w-[3.5rem] shrink-0 truncate text-right text-[8px] leading-none tabular-nums text-sky-200/80">
              {speedLabel(speedIndex)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={SPEED_OPTIONS.length - 1}
            step={1}
            value={speedIndex}
            onChange={(event) => onSpeedIndexChange(Number(event.target.value))}
            className="time-speed-slider time-controls-slider cursor-pointer appearance-none rounded-full accent-sky-400"
            aria-label="Simulation speed"
          />
        </div>
      </div>

      <div className="viewer-action-btns flex shrink-0 flex-col gap-px">
        <button
          type="button"
          onClick={onEpicycleTracing}
          className={`rounded-full border px-2 py-px text-[9px] font-medium leading-tight transition ${
            epicycleTracing
              ? "border-amber-300/70 bg-amber-400/15 text-amber-100"
              : "border-white/15 bg-white/5 text-white/80 hover:border-white/30"
          }`}
        >
          Trace Epicycles
        </button>
        <button
          type="button"
          onClick={onTrailDissolve}
          disabled={!epicycleTracing}
          aria-pressed={epicycleTracing && trailDissolve}
          className={`rounded-full border px-2 py-px text-[9px] font-medium leading-tight transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-white/35 ${
            epicycleTracing && trailDissolve
              ? "border-violet-300/70 bg-violet-400/15 text-violet-100"
              : "border-white/15 bg-white/5 text-white/80 hover:border-white/30"
          }`}
        >
          Dissolve
        </button>
        <button
          type="button"
          onClick={onNow}
          className="rounded-full border border-white/15 bg-white/5 px-2 py-px text-[9px] font-medium leading-tight text-white/80 transition hover:border-sky-300/40 hover:bg-sky-400/10"
        >
          Now
        </button>
      </div>
    </div>
  );
}
