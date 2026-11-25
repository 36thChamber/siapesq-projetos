import { afterEach, expect, it, vi } from "vitest";
import { dailyRasterStorage } from "../src/repositories/daily-raster-storage";

afterEach(() => vi.unstubAllEnvs());

it("rejects partial MinIO configuration before opening the legacy bucket", () => {
  vi.stubEnv("DAILY_RASTER_ENDPOINT", "https://storage.example");
  vi.stubEnv("DAILY_RASTER_BUCKET", "");
  expect(() => dailyRasterStorage("legacy")).toThrow(/incompleta/);
});

it("uses the explicitly configured daily bucket", () => {
  vi.stubEnv("DAILY_RASTER_ENDPOINT", "https://storage.example");
  vi.stubEnv("DAILY_RASTER_BUCKET", "daily");
  vi.stubEnv("DAILY_RASTER_ACCESS_KEY_ID", "test");
  vi.stubEnv("DAILY_RASTER_SECRET_ACCESS_KEY", "test");
  expect(dailyRasterStorage("legacy").bucket).toBe("daily");
});
