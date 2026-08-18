export type TrailColorMode = "color" | "gray" | "white";

export const TRAIL_COLOR_MODES: TrailColorMode[] = ["color", "gray", "white"];

export const TRAIL_COLOR_MODE_LABEL: Record<TrailColorMode, string> = {
  color: "Color",
  gray: "Gray",
  white: "White",
};

/** Original epicycle palette — kept, not the active Color mode. */
export const TRAIL_COLORS_ORIGINAL: Record<string, string> = {
  sun: "#FFC107",
  mercury: "#1B5E20",
  venus: "#6A1B9A",
  earth: "#29B6F6",
  mars: "#E53935",
  jupiter: "#F57C00",
  saturn: "#BA68C8",
  uranus: "#558B2F",
  neptune: "#3949AB",
  pluto: "#EC407A",
};

/** Active Color mode — same roles, even brightness. */
export const TRAIL_COLORS: Record<string, string> = {
  sun: "#FFD54F",
  mercury: "#2ECC71",
  venus: "#CE93D8",
  earth: "#4FC3F7",
  mars: "#FF8A65",
  jupiter: "#FFB74D",
  saturn: "#E1BEE7",
  uranus: "#AED581",
  neptune: "#7986CB",
  pluto: "#F48FB1",
};

function hexToGray(hex: string): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const t = 0.38 + y * 0.58;
  const toHex = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(t * 0.92)}${toHex(t * 0.97)}${toHex(t * 1.05)}`;
}

const TRAIL_GRAYS: Record<string, string> = Object.fromEntries(
  Object.entries(TRAIL_COLORS).map(([id, hex]) => [id, hexToGray(hex)]),
);

export function trailColor(bodyId: string, mode: TrailColorMode): string {
  if (mode === "white") return "#FFFFFF";
  if (mode === "gray") return TRAIL_GRAYS[bodyId] ?? "#B0B0B0";
  return TRAIL_COLORS[bodyId] ?? "#aaaaaa";
}

export function nextTrailColorMode(mode: TrailColorMode): TrailColorMode {
  const i = TRAIL_COLOR_MODES.indexOf(mode);
  return TRAIL_COLOR_MODES[(i + 1) % TRAIL_COLOR_MODES.length];
}
