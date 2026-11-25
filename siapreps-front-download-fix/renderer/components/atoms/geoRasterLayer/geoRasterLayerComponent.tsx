"use client";

import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { getColorScale } from "./paleta_cor";

type GeoRasterUrls = {
  principal: string | null;
  arquivo_30?: string | null;
  nacional?: string | null;
  /** Recorte regional (RS, 250m) do cenário futuro selecionado */
  rs?: string | null;
};

type GeoRasterLayerComponentProps = {
  url: GeoRasterUrls | null;
  showRoads?: boolean;
  analysisOpacity?: number;
  onLayerLoad?: () => void;
  setLoading?: (res: boolean) => void;
};

const ESTRADA_URL = "/tifs/estrada_lagoa.tif";

const GeoRasterLayerComponent: React.FC<GeoRasterLayerComponentProps> = ({
  url,
  showRoads = false,
  analysisOpacity = 1,
  onLayerLoad,
  setLoading,
}) => {
  const map = useMap();

  const analysisMainRef = useRef<any>(null);
  const analysisRecorteRef = useRef<any>(null);
  const analysisNacionalRef = useRef<any>(null);
  const analysisRsRef = useRef<any>(null);
  const roadRef = useRef<any>(null);

  /**
   * Cria panes (uma vez só)
   */
  useEffect(() => {
    if (!map.getPane("analysisNacionalPane")) {
      map.createPane("analysisNacionalPane");
      map.getPane("analysisNacionalPane")!.style.zIndex = "380";
    }

    if (!map.getPane("analysisPane")) {
      map.createPane("analysisPane");
      map.getPane("analysisPane")!.style.zIndex = "400";
    }

    if (!map.getPane("analysisRecortePane")) {
      map.createPane("analysisRecortePane");
      map.getPane("analysisRecortePane")!.style.zIndex = "450";
    }

    if (!map.getPane("analysisRsPane")) {
      map.createPane("analysisRsPane");
      map.getPane("analysisRsPane")!.style.zIndex = "460";
    }

    if (!map.getPane("roadPane")) {
      map.createPane("roadPane");
      map.getPane("roadPane")!.style.zIndex = "500";
    }
  }, [map]);

  /**
   * Atualiza opacidade
   */
  useEffect(() => {
    if (analysisMainRef.current) {
      analysisMainRef.current.setOpacity(analysisOpacity);
    }
    if (analysisRecorteRef.current) {
      analysisRecorteRef.current.setOpacity(analysisOpacity);
    }
    if (analysisNacionalRef.current) {
      analysisNacionalRef.current.setOpacity(analysisOpacity);
    }
    if (analysisRsRef.current) {
      analysisRsRef.current.setOpacity(analysisOpacity);
    }
  }, [analysisOpacity]);

  /**
   * =====================
   * ANALISE (PRINCIPAL + RECORTE)
   * =====================
   */
useEffect(() => {
  // 🔥 CLEANUP SEMPRE QUE MUDA A URL
  if (analysisMainRef.current) {
    map.removeLayer(analysisMainRef.current);
    analysisMainRef.current = null;
  }

  if (analysisRecorteRef.current) {
    map.removeLayer(analysisRecorteRef.current);
    analysisRecorteRef.current = null;
  }

  if (analysisNacionalRef.current) {
    map.removeLayer(analysisNacionalRef.current);
    analysisNacionalRef.current = null;
  }

  if (analysisRsRef.current) {
    map.removeLayer(analysisRsRef.current);
    analysisRsRef.current = null;
  }

  if (!url) return;

  let cancelled = false;

  const loadRaster = async (
    rasterUrl: string,
    pane: string,
    ref: React.MutableRefObject<any>,
    opacity: number
  ) => {
    const response = await fetch(rasterUrl);
    const buffer = await response.arrayBuffer();
    if (cancelled) return;

    const raster = await parseGeoraster(buffer);
    if (cancelled) return;

    const layer = new GeoRasterLayer({
      georaster: raster,
      pane,
      opacity,
      resolution: 128,
      pixelValuesToColorFn: (values: number[]) =>
        getColorScale(values[0]),
    });

    layer.addTo(map);
    ref.current = layer;
  };

  const loadAll = async () => {
    try {
      setLoading?.(true);

      // ⚠️ SÓ cria o nacional se existir (fica embaixo das outras camadas)
      if (url.nacional) {
        await loadRaster(
          url.nacional,
          "analysisNacionalPane",
          analysisNacionalRef,
          analysisOpacity
        );
      }

      if (url.principal) {
        await loadRaster(
          url.principal,
          "analysisPane",
          analysisMainRef,
          analysisOpacity
        );
      }

      // ⚠️ SÓ cria o recorte se existir
      if (url.arquivo_30) {
        await loadRaster(
          url.arquivo_30,
          "analysisRecortePane",
          analysisRecorteRef,
          analysisOpacity
        );
      }

      // ⚠️ SÓ cria o recorte RS (cenário futuro) se existir
      if (url.rs) {
        await loadRaster(
          url.rs,
          "analysisRsPane",
          analysisRsRef,
          analysisOpacity
        );
      }

      onLayerLoad?.();
    } catch (e) {
      console.error("[GeoRaster] Erro ao carregar análise:", e);
    } finally {
      setLoading?.(false);
    }
  };

  loadAll();

  return () => {
    cancelled = true;
  };
}, [url]);


  /**
   * =====================
   * ESTRADA
   * =====================
   */
  useEffect(() => {
    if (!showRoads) {
      if (roadRef.current) {
        map.removeLayer(roadRef.current);
        roadRef.current = null;
      }
      return;
    }

    if (roadRef.current) return;

    let cancelled = false;

    const loadRoads = async () => {
      try {
        const response = await fetch(ESTRADA_URL);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const raster = await parseGeoraster(buffer);
        const noData = raster.noDataValue;

        const roadLayer = new GeoRasterLayer({
          georaster: raster,
          pane: "roadPane",
          opacity: 1,
          resolution: 128,
          pixelValuesToColorFn: (values: number[]) => {
            const v = values[0];
            if (
              v === null ||
              v === undefined ||
              Number.isNaN(v) ||
              v === noData
            ) {
              return null;
            }
            if (v < 160) return "rgba(0,0,0,1)";
            return null;
          },
        });

        roadLayer.addTo(map);
        roadRef.current = roadLayer;
      } catch (e) {
        console.error("[GeoRaster] Erro ao carregar estrada:", e);
      }
    };

    loadRoads();

    return () => {
      cancelled = true;
    };
  }, [showRoads]);

  return null;
};

export default GeoRasterLayerComponent;
