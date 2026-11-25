const TURBO_PALETTE: [number, number, number][] = [
  [36, 4, 44],
  [30, 78, 196],
  [36, 199, 232],
  [88, 253, 160],
  [244, 242, 104],
  [255, 142, 39],
  [250, 50, 50],
];

const interpolateColor = (
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number,
): [number, number, number] => [
  Math.round(color1[0] + factor * (color2[0] - color1[0])),
  Math.round(color1[1] + factor * (color2[1] - color1[1])),
  Math.round(color1[2] + factor * (color2[2] - color1[2])),
];

export const getSuitabilityColor = (value: number, darkenFactor = 0.85): string => {
  if (!Number.isFinite(value)) return "transparent";

  const normalizedValue = Math.max(0, Math.min(1, value));
  const scaledValue = normalizedValue * (TURBO_PALETTE.length - 1);
  const leftIndex = Math.floor(scaledValue);
  const rightIndex = Math.min(leftIndex + 1, TURBO_PALETTE.length - 1);
  const color = interpolateColor(
    TURBO_PALETTE[leftIndex],
    TURBO_PALETTE[rightIndex],
    scaledValue - leftIndex,
  ).map((component) => Math.round(component * darkenFactor));

  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
};

export const getSuitabilityColorForValues = (values: number[]): string => {
  if (values.some((value) => !Number.isFinite(value))) return "transparent";
  return getSuitabilityColor(values[0]);
};
