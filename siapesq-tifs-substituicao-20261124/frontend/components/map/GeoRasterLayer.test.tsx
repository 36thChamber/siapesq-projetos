import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GeoRasterLayer from "./GeoRasterLayer";

const { map, layerInstances, parseRaster, eventMode } = vi.hoisted(() => ({
  map: { removeLayer: vi.fn(), getPane: vi.fn(() => undefined), createPane: vi.fn(() => ({ style: {} })), getZoom: vi.fn(() => 5), on: vi.fn(), off: vi.fn() },
  layerInstances: [] as Array<{ options: { opacity: number; pane: string; resolution: number }; addTo: ReturnType<typeof vi.fn>; setOpacity: ReturnType<typeof vi.fn> }>,
  parseRaster: vi.fn(),
  eventMode: { enabled: false },
}));

vi.mock("react-leaflet", () => ({ useMap: () => map }));
vi.mock("@/utils/loadCogRaster", () => ({ loadCogRaster: parseRaster }));
vi.mock("@/lib/cog/CogTileLayer", () => ({
  default: class {
    options: { opacity: number; pane: string; resolution: number };
    addTo = vi.fn();
    setOpacity = vi.fn();
    once?: (event: string, callback: () => void) => void;
    isLoading?: () => boolean;
    fireLoad?: () => void;
    constructor(options: { opacity: number; pane: string; resolution: number }) {
      if (eventMode.enabled) { this.once = (_event, fn) => { this.fireLoad = fn; }; this.isLoading = () => false; }
      this.options = options;
      layerInstances.push(this);
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  layerInstances.length = 0;
  eventMode.enabled = false;
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
    expect(parseRaster).toHaveBeenCalledWith(first.url);

    rerender(<GeoRasterLayer analyses={[{ ...first, opacity: 0.7 }]} />);
    expect(parseRaster).toHaveBeenCalledTimes(1);
    expect(layerInstances[0].setOpacity).toHaveBeenCalledWith(0.7);

    rerender(<GeoRasterLayer analyses={[]} />);
    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalledWith(layerInstances[0]);
  });

  it("informa falha de download sem adicionar camada", async () => {
    parseRaster.mockRejectedValue(new Error("Range indisponível"));
    const onLoadError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GeoRasterLayer analyses={[{ id: "A", nome: "A", url: "https://s3.test/signed-A", opacity: 1 }]} onLoadError={onLoadError} />);
    await waitFor(() => expect(onLoadError).toHaveBeenCalledWith("A"));
    expect(layerInstances).toHaveLength(0);
    consoleError.mockRestore();
  });

  it("mantém a camada e a leitura abertas ao mudar o zoom", async () => {
    const analysis = { id: "A", nome: "A", url: "https://s3.test/signed-A", opacity: 0.45 };
    const view = render(<GeoRasterLayer analyses={[analysis]} />);
    await waitFor(() => expect(layerInstances).toHaveLength(1));
    map.getZoom.mockReturnValue(9);
    view.rerender(<GeoRasterLayer analyses={[analysis]} />);
    expect(layerInstances).toHaveLength(1);
    expect(parseRaster).toHaveBeenCalledTimes(1);
  });
});

it("troca a camada ao renovar a URL da mesma análise", async () => {
  const analysis = { id: "A", nome: "A", url: "https://s3.test/old", opacity: 1 };
  const { rerender } = render(<GeoRasterLayer analyses={[analysis]} />);
  await waitFor(() => expect(layerInstances).toHaveLength(1));
  rerender(<GeoRasterLayer analyses={[{ ...analysis, url: "https://s3.test/new" }]} />);
  await waitFor(() => expect(layerInstances).toHaveLength(2));
  expect(parseRaster).toHaveBeenLastCalledWith("https://s3.test/new");
  expect(map.removeLayer).toHaveBeenCalledWith(layerInstances[0]);
});

it("permite nova tentativa com a mesma URL e validade renovada", async () => {
  parseRaster.mockRejectedValueOnce(new Error("transient"));
  const analysis = { id: "A", nome: "A", url: "https://s3.test/same", renewAt: 1000, opacity: 1 };
  const onLoadError = vi.fn();
  const view = render(<GeoRasterLayer analyses={[analysis]} onLoadError={onLoadError} />);
  await waitFor(() => expect(onLoadError).toHaveBeenCalled());
  view.rerender(<GeoRasterLayer analyses={[{ ...analysis, renewAt: 2000 }]} onLoadError={onLoadError} />);
  await waitFor(() => expect(layerInstances).toHaveLength(1));
  expect(parseRaster).toHaveBeenCalledTimes(2);
});

it("ignora falha tardia de uma leitura cancelada ao desmontar", async () => {
  let reject!: (error: Error) => void;
  parseRaster.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  const onLoadError = vi.fn();
  const view = render(<GeoRasterLayer analyses={[{ id: "A", nome: "A", url: "old", opacity: 1 }]} onLoadError={onLoadError} />);
  view.unmount();
  reject(new Error("late failure"));
  await Promise.resolve(); await Promise.resolve();
  expect(onLoadError).not.toHaveBeenCalled();
});

it("não remove uma camada ativa ao receber load depois de iniciar fora do viewport", async () => {
  eventMode.enabled = true;
  render(<GeoRasterLayer analyses={[{ id: "A", nome: "A", url: "test", opacity: 1 }]} />);
  await waitFor(() => expect(layerInstances).toHaveLength(1));
  const layer = layerInstances[0] as unknown as { fireLoad: () => void };
  layer.fireLoad();
  expect(map.removeLayer).not.toHaveBeenCalled();
});
