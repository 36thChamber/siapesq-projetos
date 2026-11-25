import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import RasterLayer from "@/lib/cog/CogTileLayer";
import { loadCogRaster } from "@/utils/loadCogRaster";
import { getSuitabilityColorForValues } from "@/utils/suitabilityColor";

export interface AnaliseGeoRaster { id: string; nome: string; cenario?: string; variante_dataset?: string; rotulo_dataset?: string; nome_dataset?: string | null }
export interface SelectedAnalysis extends AnaliseGeoRaster { url?: string; opacity: number; expiresAt?: number; renewAt?: number }
interface GeoRasterLayerProps {
  analyses: SelectedAnalysis[];
  onLoadingChange?: (id: string, isLoading: boolean) => void;
  onLoadError?: (id: string) => void;
}

type Layer = import("@/lib/cog/CogTileLayer").default;
type Active = { layer: Layer; url: string };
type Pending = { token: symbol; url: string; layer?: Layer };

const GeoRasterLayer: React.FC<GeoRasterLayerProps> = ({ analyses, onLoadingChange, onLoadError }) => {
  const map = useMap();
  const active = useRef(new Map<string, Active>());
  const pending = useRef(new Map<string, Pending>());
  const rasters = useRef(new Map<string, { url: string; promise: ReturnType<typeof loadCogRaster> }>());
  const failed = useRef(new Map<string, string>());
  const selection = useRef(new Map<string, SelectedAnalysis>());
  useEffect(() => {
    const pane = map.getPane("analysisRasterPane") ?? map.createPane("analysisRasterPane");
    pane.style.zIndex = "450";
    selection.current = new Map(analyses.filter(a => a.url).map(a => [a.id, a]));
    for (const [id, entry] of pending.current) {
      if (selection.current.get(id)?.url !== entry.url) {
        if (entry.layer) map.removeLayer(entry.layer);
        pending.current.delete(id);
        onLoadingChange?.(id, false);
      }
    }
    for (const [id, entry] of active.current) {
      if (!selection.current.has(id)) { map.removeLayer(entry.layer); active.current.delete(id); }
    }
    for (const id of rasters.current.keys()) if (!selection.current.has(id)) rasters.current.delete(id);
    for (const id of failed.current.keys()) if (!selection.current.has(id)) failed.current.delete(id);

    for (const analysis of analyses) {
      const { id, url } = analysis;
      if (!url || failed.current.get(id) === `${url}:${analysis.renewAt}`) continue;
      const previous = active.current.get(id);
      if (previous?.url === url) {
        previous.layer.setOpacity(analysis.opacity);
        continue;
      }
      const waiting = pending.current.get(id);
      if (waiting?.url === url) {
        waiting.layer?.setOpacity(analysis.opacity);
        continue;
      }
      const entry: Pending = { token: Symbol(id), url };
      pending.current.set(id, entry);
      onLoadingChange?.(id, true);
      const isCurrent = () => pending.current.get(id) === entry && selection.current.get(id)?.url === url;
      const fail = () => {
        if (!isCurrent() && (!entry.layer || active.current.get(id)?.layer !== entry.layer)) return;
        failed.current.set(id, `${url}:${analysis.renewAt}`);
        if (active.current.get(id)?.layer === entry.layer) active.current.delete(id);
        if (entry.layer) map.removeLayer(entry.layer);
        pending.current.delete(id);
        rasters.current.delete(id);
        onLoadingChange?.(id, false);
        onLoadError?.(id);
      };
      void (async () => {
        try {
          let cached = rasters.current.get(id);
          if (cached?.url !== url) {
            cached = { url, promise: loadCogRaster(url) };
            rasters.current.set(id, cached);
          }
          const georaster = await cached.promise;
          if (!isCurrent()) return;
          const layer = new RasterLayer({
            georaster, pane: "analysisRasterPane",
            opacity: selection.current.get(id)?.opacity ?? analysis.opacity,
            pixelValuesToColorFn: getSuitabilityColorForValues,
          });
          entry.layer = layer;
          const swap = () => {
            if (active.current.get(id)?.layer === layer) return;
            if (!isCurrent()) { map.removeLayer(layer); return; }
            const old = active.current.get(id);
            if (old) map.removeLayer(old.layer);
            active.current.set(id, { layer, url });
            failed.current.delete(id);
            pending.current.delete(id);
            onLoadingChange?.(id, false);
          };
          layer.on?.("tileerror", fail);
          if (typeof layer.once === "function") layer.once("load", swap);
          layer.addTo(map);
          if (typeof layer.once !== "function" || layer.isLoading?.() === false) swap();
        } catch { fail(); }
      })();
    }
  }, [analyses, map, onLoadingChange, onLoadError]);

  useEffect(() => () => {
    selection.current.clear(); failed.current.clear();
    for (const entry of active.current.values()) map.removeLayer(entry.layer);
    for (const entry of pending.current.values()) if (entry.layer) map.removeLayer(entry.layer);
    active.current.clear(); pending.current.clear(); rasters.current.clear();
  }, [map]);
  return null;
};
export default GeoRasterLayer;
