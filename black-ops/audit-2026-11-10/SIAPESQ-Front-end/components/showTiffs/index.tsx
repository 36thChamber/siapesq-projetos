import React, { useEffect } from "react";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import parseGeoraster from "georaster";
import { useMap } from "react-leaflet";
import { Especie as Specie } from "@/services/types/especie.types";
import { getSuitabilityColor, getSuitabilityColorForValues } from "@/utils/suitabilityColor";

export const getColorScale = getSuitabilityColor;

type ShowTiffsProps = {
  url: string;
  opacity?: number;
  specie?: Specie | null;
  onError?: () => void;
};

const ShowTiffs: React.FC<ShowTiffsProps> = ({ url, opacity = 1, specie, onError }) => {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let geoRasterLayer: GeoRasterLayer | undefined;

    // Keep the analysis raster above whichever base map is selected.
    const rasterPaneName = "predictionRasterPane";
    const rasterPane = map.getPane(rasterPaneName) ?? map.createPane(rasterPaneName);
    rasterPane.style.zIndex = "450";

    const loadGeoTiff = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Falha ao buscar o arquivo TIFF");

        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);
        if (cancelled) return;

        geoRasterLayer = new GeoRasterLayer({
          georaster,
          noWrap: true,
          opacity,
          pane: rasterPaneName,
          resolution: 128,
          pixelValuesToColorFn: getSuitabilityColorForValues,
        });
        geoRasterLayer.addTo(map);
      } catch (error) {
        if (!cancelled) {
          console.error("Erro ao carregar o TIFF:", error);
          onError?.();
        }
      }
    };

    void loadGeoTiff();
    return () => {
      cancelled = true;
      if (geoRasterLayer) map.removeLayer(geoRasterLayer);
    };
  }, [map, onError, opacity, url]);

  return null; 
};

export default ShowTiffs;
