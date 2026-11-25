import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GeoRasterLayer from "./GeoRasterLayer";

const { map, layerInstances, parseRaster } = vi.hoisted(() => ({
  map: { removeLayer: vi.fn(), getPane: vi.fn(() => undefined), createPane: vi.fn(() => ({ style: {} })), getZoom: vi.fn(() => 5), on: vi.fn(), off: vi.fn() },
  layerInstances: [] as Array<{ options: { opacity: number; pane: string; resolution: number }; addTo: ReturnType<typeof vi.fn>; setOpacity: ReturnType<typeof vi.fn> }>,
  parseRaster: vi.fn(),
}));

vi.mock("react-leaflet", () => ({ useMap: () => map }));
vi.mock("georaster", () => ({ default: parseRaster }));
vi.mock("georaster-layer-for-leaflet", () => ({
  default: class {
    options: { opacity: number; pane: string; resolution: number };
    addTo = vi.fn();
    setOpacity = vi.fn();
    constructor(options: { opacity: number; pane: string; resolution: number }) {
      this.options = options;
      layerInstances.push(this);
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  layerInstances.length = 0;
  parseRaster.mockResolvedValue({ raster: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
});

describe("GeoRasterLayer", () => {
  it("busca a URL recebida, atualiza opacidade sem refetch e remove a camada desmarcada", async () => {
    let resolveRaster!: (value: { raster: boolean }) => void;
    parseRaster.mockReturnValue(new Promise((resolve) => { resolveRaster = resolve; }));
    const first = { id: "A", nome: "A", url: "https://s3.test/signed-A", opacity: 1 };
    const { rerender } = render(<GeoRasterLayer analyses={[first]} />);
    rerender(<GeoRasterLayer analyses={[{ ...first, opacity: 0.35 }]} />);
    resolveRaster({ raster: true });
    await waitFor(() => expect(layerInstances).toHaveLength(1));
    expect(layerInstances[0].options.opacity).toBe(0.35);
    expect(layerInstances[0].options.pane).toBe("analysisRasterPane");
    expect(map.createPane).toHaveBeenCalledWith("analysisRasterPane");
    expect(fetch).toHaveBeenCalledWith(first.url);

    rerender(<GeoRasterLayer analyses={[{ ...first, opacity: 0.7 }]} />);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(layerInstances[0].setOpacity).toHaveBeenCalledWith(0.7);

    rerender(<GeoRasterLayer analyses={[]} />);
    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalledWith(layerInstances[0]);
  });

  it("informa falha de download sem adicionar camada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const onLoadError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GeoRasterLayer analyses={[{ id: "A", nome: "A", url: "https://s3.test/signed-A", opacity: 1 }]} onLoadError={onLoadError} />);
    await waitFor(() => expect(onLoadError).toHaveBeenCalledWith("A"));
    expect(layerInstances).toHaveLength(0);
    consoleError.mockRestore();
  });

  it("atualiza a resolução após zoomend sem baixar novamente o TIFF", async () => {
    const analysis = { id: "A", nome: "A", url: "https://s3.test/signed-A", opacity: 0.45 };
    render(<GeoRasterLayer analyses={[analysis]} />);
    await waitFor(() => expect(layerInstances).toHaveLength(1));
    expect(layerInstances[0].options.resolution).toBe(64);

    map.getZoom.mockReturnValue(9);
    const zoomEnd = map.on.mock.calls.find(([event]) => event === "zoomend")?.[1] as (() => void) | undefined;
    zoomEnd?.();
    await waitFor(() => expect(layerInstances).toHaveLength(2), { timeout: 1000 });

    expect(layerInstances[1].options.resolution).toBe(192);
    expect(layerInstances[1].options.opacity).toBe(0.45);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(parseRaster).toHaveBeenCalledTimes(1);
  });
});
