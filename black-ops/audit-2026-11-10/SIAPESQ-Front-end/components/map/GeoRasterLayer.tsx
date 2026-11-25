import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import parseGeoraster from "georaster";
import { getSuitabilityColorForValues } from "@/utils/suitabilityColor";
import { getTifQualityByZoom, TIF_QUALITY_CONFIG, TIF_QUALITY_DEBOUNCE_MS } from "@/config/tifQuality";

const ANALYSIS_RASTER_PANE = "analysisRasterPane";
const ANALYSIS_RASTER_Z_INDEX = "450";
const MAX_CACHED_QUALITY_LAYERS = 3;

export interface AnaliseGeoRaster {
  id: string;
  nome: string;
  cenario?: string;
}

export interface SelectedAnalysis extends AnaliseGeoRaster {
  url?: string;
  opacity: number;
}

interface GeoRasterLayerProps {
  analyses: SelectedAnalysis[];
  onLoadingChange?: (id: string, isLoading: boolean) => void;
  onLoadError?: (id: string) => void;
}

const GeoRasterLayer: React.FC<GeoRasterLayerProps> = ({ analyses, onLoadingChange, onLoadError }) => {
  const map = useMap();

  const layersRef = useRef<Map<string, any>>(new Map());
  const layerQualityRef = useRef<Map<string, string>>(new Map());
  const renderedLayerCacheRef = useRef<Map<string, any>>(new Map());
  const rasterCacheRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const selectedUrlsRef = useRef<Map<string, string>>(new Map());
  const opacityRef = useRef<Map<string, number>>(new Map());
  const pendingRef = useRef<Map<string, { token: symbol; url: string; quality: string }>>(new Map());
  const [quality, setQuality] = useState(() => getTifQualityByZoom(map.getZoom()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const updateQuality = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setQuality(getTifQualityByZoom(map.getZoom())), TIF_QUALITY_DEBOUNCE_MS);
    };
    map.on("zoomend", updateQuality);
    return () => {
      map.off("zoomend", updateQuality);
      if (timer) clearTimeout(timer);
    };
  }, [map]);

  useEffect(() => {
    const rasterPane = map.getPane(ANALYSIS_RASTER_PANE) ?? map.createPane(ANALYSIS_RASTER_PANE);
    rasterPane.style.zIndex = ANALYSIS_RASTER_Z_INDEX;

    opacityRef.current = new Map(analyses.map((analysis) => [analysis.id, analysis.opacity]));
    selectedUrlsRef.current = new Map(
      analyses.filter((a): a is SelectedAnalysis & { url: string } => Boolean(a.url)).map((a) => [a.id, a.url]),
    );
    pendingRef.current.forEach((pending, id) => {
      if (selectedUrlsRef.current.get(id) !== pending.url) {
        pendingRef.current.delete(id);
        onLoadingChange?.(id, false);
      }
    });

    layersRef.current.forEach((layer, id) => {
      if (!selectedUrlsRef.current.has(id)) {
        map.removeLayer(layer);
        layersRef.current.delete(id);
        layerQualityRef.current.delete(id);
        for (const cacheKey of renderedLayerCacheRef.current.keys()) {
          if (cacheKey.startsWith(`${id}:`)) renderedLayerCacheRef.current.delete(cacheKey);
        }
        for (const cacheKey of rasterCacheRef.current.keys()) {
          if (cacheKey.startsWith(`${id}:`)) rasterCacheRef.current.delete(cacheKey);
        }
      }
    });

    analyses.forEach((analysis) => {
      if (!analysis.url) return;
      const url = analysis.url;
      const existingLayer = layersRef.current.get(analysis.id);

      if (existingLayer && layerQualityRef.current.get(analysis.id) === quality) {
        existingLayer.setOpacity(analysis.opacity);
        return;
      }
      if (pendingRef.current.has(analysis.id) && pendingRef.current.get(analysis.id)?.url === url && pendingRef.current.get(analysis.id)?.quality === quality) return;
      const requestToken = Symbol(analysis.id);
      pendingRef.current.set(analysis.id, { token: requestToken, url, quality });

      const carregarTiff = async () => {
        onLoadingChange?.(analysis.id, true);
        try {
          const rasterCacheKey = `${analysis.id}:${url}`;
          let rasterPromise = rasterCacheRef.current.get(rasterCacheKey);
          if (!rasterPromise) {
            rasterPromise = fetch(url).then((response) => {
              if (!response.ok) throw new Error("Falha ao buscar o arquivo TIFF");
              return response.arrayBuffer();
            }).then((arrayBuffer) => parseGeoraster(arrayBuffer)).catch((error) => {
              rasterCacheRef.current.delete(rasterCacheKey);
              throw error;
            });
            rasterCacheRef.current.set(`${analysis.id}:${url}`, rasterPromise);
          }
          const georaster = await rasterPromise;

          const { default: GeoRasterLayerForLeaflet } = await import("georaster-layer-for-leaflet");

          if (pendingRef.current.get(analysis.id)?.token !== requestToken || selectedUrlsRef.current.get(analysis.id) !== url) return;

          const previousLayer = layersRef.current.get(analysis.id);
          const qualityCacheKey = `${analysis.id}:${quality}`;
          let layer = renderedLayerCacheRef.current.get(qualityCacheKey);
          if (!layer) {
            layer = new (GeoRasterLayerForLeaflet as any)({
              georaster,
              pane: ANALYSIS_RASTER_PANE,
              opacity: opacityRef.current.get(analysis.id) ?? analysis.opacity,
              resolution: TIF_QUALITY_CONFIG[quality as keyof typeof TIF_QUALITY_CONFIG].resolution,
              pixelValuesToColorFn: getSuitabilityColorForValues,
            });
          } else {
            renderedLayerCacheRef.current.delete(qualityCacheKey);
            layer.setOpacity(opacityRef.current.get(analysis.id) ?? analysis.opacity);
          }

          layer.addTo(map);
          const swapLayer = () => {
            if (selectedUrlsRef.current.get(analysis.id) !== url || getTifQualityByZoom(map.getZoom()) !== quality) {
              map.removeLayer(layer);
              return;
            }
            if (previousLayer) {
              map.removeLayer(previousLayer);
              const previousQuality = layerQualityRef.current.get(analysis.id);
              if (previousQuality) {
                renderedLayerCacheRef.current.set(`${analysis.id}:${previousQuality}`, previousLayer);
                while (renderedLayerCacheRef.current.size > MAX_CACHED_QUALITY_LAYERS) {
                  const oldestCacheKey = renderedLayerCacheRef.current.keys().next().value;
                  if (oldestCacheKey) renderedLayerCacheRef.current.delete(oldestCacheKey);
                }
              }
            }
            layersRef.current.set(analysis.id, layer);
            layerQualityRef.current.set(analysis.id, quality);
            renderedLayerCacheRef.current.delete(qualityCacheKey);
          };
          if (typeof layer.once === "function") layer.once("load", swapLayer);
          else swapLayer();
        } catch (error) {
          console.error(`Erro ao carregar a análise ${analysis.nome}:`, error);
          if (pendingRef.current.get(analysis.id)?.token === requestToken && selectedUrlsRef.current.get(analysis.id) === url && !layersRef.current.has(analysis.id)) {
            onLoadError?.(analysis.id);
          }
        } finally {
          if (pendingRef.current.get(analysis.id)?.token === requestToken) {
            pendingRef.current.delete(analysis.id);
            onLoadingChange?.(analysis.id, false);
          }
        }
      };

      carregarTiff();
    });
  }, [analyses, map, onLoadingChange, onLoadError, quality]);

  useEffect(() => {
    const layers = layersRef.current;
    const layerQualities = layerQualityRef.current;
    const renderedLayers = renderedLayerCacheRef.current;
    const rasterCache = rasterCacheRef.current;
    const pending = pendingRef.current;
    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
      layers.clear();
      pending.clear();
      layerQualities.clear();
      renderedLayers.clear();
      rasterCache.clear();
    };
  }, [map]);

  return null;
};

export default GeoRasterLayer;
