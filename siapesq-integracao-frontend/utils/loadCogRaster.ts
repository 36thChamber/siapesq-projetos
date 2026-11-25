import { fromUrl } from "geotiff";

/** Leaflet adapter: metadata first, pixel windows/overviews only when requested. */
export async function loadCogRaster(url: string) {
  const sourceOptions = { allowFullFile: false, blockSize: 256 * 1024, cacheSize: 64 };
  const tiff = await fromUrl(url, sourceOptions);
  const image = await tiff.getImage();
  const keys = image.getGeoKeys();
  const projection = keys?.ProjectedCSTypeGeoKey || keys?.GeographicTypeGeoKey;
  const [dx, dy] = image.getResolution();
  if (!projection || dx <= 0 || dy >= 0 || image.getFileDirectory().hasTag("ModelTransformation")) {
    throw new Error("COG requer CRS EPSG e grade north-up sem rotação.");
  }
  if (!image.isTiled) throw new Error("Arquivo não possui tiles; converta para COG.");
  const [xmin, ymin, xmax, ymax] = image.getBoundingBox();
  const nodata = image.getGDALNoData();
  return {
    sourceType: "url",
    projection,
    width: image.getWidth(), height: image.getHeight(),
    pixelWidth: dx, pixelHeight: -dy,
    xmin, ymin, xmax, ymax,
    noDataValue: image.getGDALNoData(),
    numberOfRasters: image.getSamplesPerPixel(),
    async getValues({ left, top, right, bottom, width, height }: {
      left: number; top: number; right: number; bottom: number; width: number; height: number;
    }) {
      const rasters = await tiff.readRasters({
        window: [left, top, right, bottom], width, height, interleave: false,
        resampleMethod: "nearest",
      });
      return Array.from(rasters as unknown as ArrayLike<ArrayLike<number>>, band =>
        Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => (band[row * width + col] === nodata ? NaN : band[row * width + col]))),
      );
    },
  };
}
