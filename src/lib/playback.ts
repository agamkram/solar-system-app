export const DAY_MS = 86_400_000;

export const SIM_EPOCH = new Date("2026-07-02T12:00:00Z");

const MONTH_SPEED_STEPS = Array.from({ length: 10 }, (_, index) => {
  const months = index + 2;
  return { label: `${months} months/s`, value: months * 30 };
});

export const SPEED_OPTIONS = [
  { label: "Pause", value: 0 },
  { label: "1 day/s", value: 1 },
  { label: "1 week/s", value: 7 },
  { label: "1 month/s", value: 30 },
  ...MONTH_SPEED_STEPS,
  { label: "1 year/s", value: 365 },
] as const;

export function formatSimDate(simDays: number): string {
  const ms = SIM_EPOCH.getTime() + simDays * DAY_MS;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function speedIndexToDaysPerSecond(index: number): number {
  const clamped = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, Math.round(index)));
  return SPEED_OPTIONS[clamped].value;
}

export function speedLabel(index: number): string {
  const clamped = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, Math.round(index)));
  return SPEED_OPTIONS[clamped].label;
}