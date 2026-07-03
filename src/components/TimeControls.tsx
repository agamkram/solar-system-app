"use client";

import { formatSimDate, SPEED_OPTIONS, speedLabel } from "@/lib/playback";

interface TimeControlsProps {
  simDays: number;
  speedIndex: number;
  onSpeedIndexChange: (index: number) => void;
  onNow: () => void;
}

export function TimeControls({
  simDays,
  speedIndex,
  onSpeedIndexChange,
  onNow,
}: TimeControlsProps) {
  return (
    <div className="time-controls-card pointer-events-auto w-[8.25rem] rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-md sm:w-[8.75rem]">
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[9px] font-medium tabular-nums text-white/90">
          {formatSimDate(simDays)}
        </p>
        <button
          type="button"
          onClick={onNow}
          className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[8px] font-medium text-white/80 transition hover:border-sky-300/40 hover:bg-sky-400/10"
        >
          Now
        </button>
      </div>

      <div className="time-controls-speed mt-1.5">
        <div className="time-controls-speed-labels mb-0.5 flex items-center justify-between gap-1">
          <span className="text-[8px] text-white/40">Speed</span>
          <span className="w-[3.75rem] shrink-0 truncate text-right text-[8px] tabular-nums text-sky-200/80">
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
          className="time-speed-slider time-controls-slider h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-sky-400"
          aria-label="Simulation speed"
        />
      </div>
    </div>
  );
}