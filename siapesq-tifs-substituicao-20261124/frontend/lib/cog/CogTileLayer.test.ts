import { afterEach, describe, expect, it, vi } from "vitest";
import proj4 from "proj4-fully-loaded";
import { latLng, point } from "leaflet";
import CogTileLayer from "./CogTileLayer";
import type { loadCogRaster } from "@/utils/loadCogRaster";

afterEach(() => vi.restoreAllMocks());
const raster = (projection = 4326) => ({
  width: 4, height: 4, projection, xmin: 0, ymin: 0, xmax: 4, ymax: 4,
  pixelWidth: 1, pixelHeight: 1, sourceType: "url", numberOfRasters: 1, noDataValue: -9999,
  getValues: vi.fn(async () => [[[0, 1, 2, 3], [4, NaN, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15]]]),
}) as Awaited<ReturnType<typeof loadCogRaster>>;

describe("COG native sampling", () => {
  it("renders native pixel centers with exact color and transparent NoData", async () => {
    const source = raster();
    let output!: ImageData;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: ImageData) => { output = image; },
    } as unknown as CanvasRenderingContext2D);
    const color = (v: number[]) => Number.isFinite(v[0]) ? `rgba(${v[0]}, 0, 0, 1)` : "transparent";
    const layer = new CogTileLayer({ georaster: source, resolution: 4, pixelValuesToColorFn: color });
    Object.assign(layer, { _map: { unproject: (p: {x: number; y: number}) => latLng(4 - p.y / 64, p.x / 64) } });
    await new Promise<void>((resolve, reject) => layer.createTile(Object.assign(point(0, 0), {z: 0}), error => error ? reject(error) : resolve()));
    expect(source.getValues).toHaveBeenCalledWith({ left: 0, top: 0, right: 4, bottom: 4, width: 4, height: 4 });
    expect(Array.from(output.data).filter((_, i) => i % 4 === 0)).toEqual([0, 1, 2, 3, 4, 0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(output.data[5 * 4 + 3]).toBe(0);
    expect(output.data[15 * 4 + 3]).toBe(255);
  });
  it("chooses sample density per tile and reuses Mercator axes", async () => {
    const source = raster();
    const layer = new CogTileLayer({ georaster: source, pixelValuesToColorFn: () => "transparent" });
    const unproject = vi.fn(() => latLng(40, 40)); // outside the raster; no I/O
    Object.assign(layer, { _map: { options: { crs: { code: "EPSG:3857" } }, unproject } });
    for (const [zoom, samples] of [[5, 64], [9, 192]]) {
      unproject.mockClear();
      const tile = layer.createTile(Object.assign(point(0, 0), { z: zoom }), () => {}) as HTMLCanvasElement;
      expect(tile.width).toBe(samples);
      expect(unproject).toHaveBeenCalledTimes(2 * samples);
    }
    expect(source.getValues).not.toHaveBeenCalled();
  });
  it("samples SIRGAS / UTM pixels in their native grid", async () => {
    const source = { ...raster(31983), xmin: 350000, xmax: 350004, ymin: 7449996, ymax: 7450000 };
    let output!: ImageData;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image: ImageData) => { output = image; },
    } as unknown as CanvasRenderingContext2D);
    const layer = new CogTileLayer({ georaster: source, resolution: 4, pixelValuesToColorFn: v => Number.isFinite(v[0]) ? `rgba(${v[0]},0,0,1)` : "transparent" });
    Object.assign(layer, { _map: { unproject: (p: {x: number; y: number}) => {
      const [lng, lat] = proj4("EPSG:31983", "EPSG:4326", [350000 + p.x / 64, 7450000 - p.y / 64]);
      return latLng(lat, lng);
    } } });
    await new Promise<void>((resolve, reject) => layer.createTile(Object.assign(point(0, 0), {z: 0}), error => error ? reject(error) : resolve()));
    expect(Array.from(output.data).filter((_, i) => i % 4 === 0)).toEqual([0,1,2,3,4,0,6,7,8,9,10,11,12,13,14,15]);
  });
  it("reports window failures through Leaflet tileerror callback", async () => {
    const source = raster(); source.getValues = vi.fn().mockRejectedValue(new Error("Expired"));
    const layer = new CogTileLayer({ georaster: source, resolution: 1, pixelValuesToColorFn: () => "transparent" });
    Object.assign(layer, { _map: { unproject: () => latLng(2, 2) } });
    const error = await new Promise(resolve => layer.createTile(Object.assign(point(0, 0), {z: 0}), error => resolve(error)));
    expect(error).toBeInstanceOf(Error);
  });
  it("supports projected EPSG definitions and rejects unknown CRS", () => {
    expect(new CogTileLayer({georaster:raster(3857),pixelValuesToColorFn:()=>"transparent"}).getBounds().isValid()).toBe(true);
    expect(new CogTileLayer({georaster:raster(31983),pixelValuesToColorFn:()=>"transparent"}).getBounds().isValid()).toBe(true);
    expect(() => new CogTileLayer({georaster:raster(9999999),pixelValuesToColorFn:()=>"transparent"})).toThrow();
  });
});
