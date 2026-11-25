import { GridLayer, latLngBounds, point, type Coords, type DoneCallback, type GridLayerOptions, type LatLngBounds } from "leaflet";
import { getTifQualityByZoom, TIF_QUALITY_CONFIG } from "@/config/tifQuality";
import proj4 from "proj4-fully-loaded";
import type { Converter } from "proj4";
import type { loadCogRaster } from "@/utils/loadCogRaster";

type Raster = Awaited<ReturnType<typeof loadCogRaster>>;
export type CogTileOptions = GridLayerOptions & {
  georaster: Raster;
  resolution?: number;
  pixelValuesToColorFn: (values: number[]) => string;
};

/** Browser-only Leaflet grid. No GeoRaster parser, worker-loader or Webpack runtime. */
export default class CogTileLayer extends GridLayer {
  private readonly raster: Raster;
  private readonly resolution?: number;
  private readonly project: Converter;
  private readonly color: CogTileOptions["pixelValuesToColorFn"];
  private readonly extent: LatLngBounds;
  private readonly colors = new Map<string, number[]>();

  constructor({ georaster, resolution, pixelValuesToColorFn, ...options }: CogTileOptions) {
    const project = proj4("EPSG:4326", `EPSG:${georaster.projection}`);
    // Densify all four edges so non-geographic extents retain curved edges.
    const edge: [number, number][] = [];
    for (let i = 0; i <= 32; i++) {
      const x = georaster.xmin + (georaster.xmax - georaster.xmin) * i / 32;
      const y = georaster.ymin + (georaster.ymax - georaster.ymin) * i / 32;
      for (const xy of [[x, georaster.ymin], [x, georaster.ymax], [georaster.xmin, y], [georaster.xmax, y]]) {
        const [lng, lat] = project.inverse(xy);
        if (Number.isFinite(lng) && Number.isFinite(lat)) edge.push([lat, lng]);
      }
    }
    if (!edge.length) throw new Error("Não foi possível projetar a extensão COG.");
    const extent = latLngBounds(edge);
    super({ className: "cog-raster-layer", noWrap: true, bounds: extent, updateWhenIdle: true, keepBuffer: 1, ...options });
    this.raster = georaster;
    this.resolution = resolution === undefined ? undefined : Math.min(256, Math.max(1, Math.round(resolution)));
    this.project = project;
    this.color = pixelValuesToColorFn;
    this.extent = extent;
  }

  getBounds() { return this.extent; }

  createTile(coords: Coords, done: DoneCallback): HTMLElement {
    const tile = document.createElement("canvas");
    tile.width = tile.height = this.resolution ?? TIF_QUALITY_CONFIG[getTifQualityByZoom(coords.z)].resolution;
    tile.style.imageRendering = "pixelated";
    // Leaflet sets display dimensions to tileSize; internal resolution stays bounded.
    void this.draw(tile, coords).then(() => done(undefined, tile), () => done(new Error("Falha ao ler um bloco COG."), tile));
    return tile;
  }

  private rgba(values: number[]) {
    const color = this.color(values);
    if (color === "transparent") return [0, 0, 0, 0];
    let rgba = this.colors.get(color);
    if (!rgba) {
      const parts = color.match(/[\d.]+/g)?.map(Number);
      if (!parts || parts.length < 3) throw new Error("Escala COG requer rgb/rgba.");
      rgba = [parts[0], parts[1], parts[2], Math.round((parts[3] ?? 1) * 255)];
      // The suitability palette is bounded; avoid retaining arbitrary custom palettes.
      if (this.colors.size >= 2048) this.colors.clear();
      this.colors.set(color, rgba);
    }
    return rgba;
  }

  private async draw(tile: HTMLCanvasElement, coords: Coords) {
    const map = this._map;
    if (!map) return;
    const n = tile.width;
    const size = this.getTileSize();
    const raster = this.raster;
    const positions: Array<[number, number] | undefined> = new Array(n * n);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    // Leaflet Web Mercator longitude and latitude are separable along screen axes.
    const mercator = map.options?.crs?.code === "EPSG:3857";
    const center = (tileIndex: number, sample: number, length: number) =>
      (tileIndex + (sample + 0.5) / n) * length;
    const longitude = mercator ? Array.from({ length: n }, (_, col) =>
      map.unproject(point(center(coords.x, col, size.x), coords.y * size.y), coords.z).lng) : [];
    const latitude = mercator ? Array.from({ length: n }, (_, row) =>
      map.unproject(point(coords.x * size.x, center(coords.y, row, size.y)), coords.z).lat) : [];
    // Transform screen-pixel centers into the native grid. This also handles UTM.
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const ll = mercator ? undefined : map.unproject(point(center(coords.x, col, size.x), center(coords.y, row, size.y)), coords.z);
      const lng = ll?.lng ?? longitude[col], lat = ll?.lat ?? latitude[row];
      const [x, y] = raster.projection === 4326 ? [lng, lat] : this.project.forward([lng, lat]);
      const px = (x - raster.xmin) / raster.pixelWidth;
      const py = (raster.ymax - y) / raster.pixelHeight;
      if (!Number.isFinite(px) || !Number.isFinite(py) || px < 0 || py < 0 || px >= raster.width || py >= raster.height) continue;
      positions[row * n + col] = [px, py];
      left = Math.min(left, Math.floor(px)); top = Math.min(top, Math.floor(py));
      right = Math.max(right, Math.floor(px) + 1); bottom = Math.max(bottom, Math.floor(py) + 1);
    }
    if (!Number.isFinite(left)) return;
    // At native zoom read exact pixels; at overview zoom sample a bounded window.
    const width = Math.min(right - left, n), height = Math.min(bottom - top, n);
    const bands = await raster.getValues({ left, top, right, bottom, width, height });
    if (this._map !== map) return;
    const context = tile.getContext("2d");
    if (!context) throw new Error("Canvas indisponível.");
    const output = context.createImageData(n, n);
    positions.forEach((position, i) => {
      if (!position) return;
      const col = Math.min(width - 1, Math.floor((position[0] - left) * width / (right - left)));
      const row = Math.min(height - 1, Math.floor((position[1] - top) * height / (bottom - top)));
      const values = bands.map(band => band[row][col]);
      output.data.set(this.rgba(values), i * 4);
    });
    context.putImageData(output, 0, 0);
  }
}
