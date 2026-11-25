declare module "georaster" {
    export type GeoRaster = {
      noDataValue?: number;
      width: number;
      height: number;
      numberOfRasters: number;
      pixelHeight: number;
      pixelWidth: number;
      values: number[][][];
      min: number[];
      max: number[];
    };
  
    export default function parseGeoraster(data: ArrayBuffer | string): Promise<GeoRaster>;
  }
  
  declare module "georaster-layer-for-leaflet" {
    import { GridLayer, GridLayerOptions } from "leaflet";
    import { GeoRaster } from "georaster";
  
    interface GeoRasterLayerOptions extends GridLayerOptions {
      georaster: GeoRaster;
      opacity?: number;
      resolution?: number;
      pixelValuesToColorFn?
    }
  
    class GeoRasterLayer extends GridLayer {
      constructor(options: GeoRasterLayerOptions);
    }
  
    export default GeoRasterLayer;
  }
  