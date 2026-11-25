import { describe, expect, it } from "vitest";
import { getTifQualityByZoom, TIF_QUALITY_CONFIG } from "./tifQuality";

describe("getTifQualityByZoom", () => {
  it.each([
    [0, "low"], [5, "low"], [5.99, "low"],
    [6, "medium"], [8.99, "medium"],
    [9, "high"], [11.99, "high"],
    [12, "full"], [18, "full"],
  ] as const)("maps zoom %s to %s", (zoom, quality) => {
    expect(getTifQualityByZoom(zoom)).toBe(quality);
  });

  it("uses progressively higher tile resolutions", () => {
    expect(TIF_QUALITY_CONFIG.low.resolution).toBeLessThan(TIF_QUALITY_CONFIG.medium.resolution);
    expect(TIF_QUALITY_CONFIG.medium.resolution).toBeLessThan(TIF_QUALITY_CONFIG.high.resolution);
    expect(TIF_QUALITY_CONFIG.high.resolution).toBeLessThan(TIF_QUALITY_CONFIG.full.resolution);
  });
});
