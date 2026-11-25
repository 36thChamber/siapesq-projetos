export type TifQuality = "low" | "medium" | "high" | "full";

export const TIF_QUALITY_CONFIG: Record<TifQuality, { minZoom: number; resolution: number }> = {
  low: { minZoom: 0, resolution: 64 },
  medium: { minZoom: 6, resolution: 128 },
  high: { minZoom: 9, resolution: 192 },
  full: { minZoom: 12, resolution: 256 },
};

export const TIF_QUALITY_DEBOUNCE_MS = 200;

export function getTifQualityByZoom(zoom: number): TifQuality {
  if (zoom >= TIF_QUALITY_CONFIG.full.minZoom) return "full";
  if (zoom >= TIF_QUALITY_CONFIG.high.minZoom) return "high";
  if (zoom >= TIF_QUALITY_CONFIG.medium.minZoom) return "medium";
  return "low";
}
