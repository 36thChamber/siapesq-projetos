import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
// @ts-ignore: Ignore missing type declarations for CSS import
import "leaflet/dist/leaflet.css";
import SideBar from "../components/atoms/sideBar";
import {
  GroupButtons,
  GrupoEspecieFront,
} from "../components/molecules/GroupButtons";
import { useSpecies } from "../context/SpeciesContext";
import {
  fetchGruposService,
  fetchEspeciesByGrupoService,
  fetchAnalisesByEspecieService,
  getSelectPlaceholderService,
} from "../services/functions-ecological";
import { SelectDynamic } from "../components/atoms/SelectDynamic/selectDynamic";
import ModalLoading from "../components/atoms/modalLoading";
import ModalWarning from "../components/atoms/modelWarning";
import { CoordinateToolsPanel } from "../components/atoms/coordinateTools";
import type {
  Coordinate,
  ManualPoint,
} from "../components/atoms/coordinateTools";
import { isDuplicatePoint } from "../components/atoms/coordinateTools/types";
import { parseCSVPoints } from "../utils/parseCSV";
import MapLayerSwitcher from "../components/MapLayerSwitcher/MapLayerSwitcher";
import toast from "react-hot-toast";

import type { SelectedAnalysis } from '../context/SpeciesContext';

const getArquivosIncertezaSelecionada = (
  analise: SelectedAnalysis,
): Array<string | null | undefined> => {
  if (analise.modelType?.endsWith('-otimista')) {
    return [
      analise.nacional_ssp245_incerteza,
      analise.rs_ssp245_incerteza,
      analise.poligono_ssp245_incerteza,
    ];
  }

  if (analise.modelType?.endsWith('-pessimista')) {
    return [
      analise.rs_ssp585_incerteza,
      analise.poligono_ssp585_incerteza,
    ];
  }

  return [
    analise.nacional_incerteza,
    analise.rs_incerteza,
    analise.poligono_incerteza,
  ];
};

const MapContainerDynamic = dynamic(
  () =>
    import("react-leaflet").then((module) => ({
      default: module.MapContainer,
    })),
  { ssr: false },
);

const GeoRasterLayerComponent = dynamic(
  () =>
    import("../components/atoms/geoRasterLayer/geoRasterLayerComponent").then(
      (module) => module,
    ),
  { ssr: false },
);

const TileLayerDynamic = dynamic(
  () =>
    import("react-leaflet").then((module) => ({ default: module.TileLayer })),
  { ssr: false },
);

const MapMarkersDynamic = dynamic(
  () =>
    import("../components/atoms/coordinateTools/MapMarkers").then(
      (module) => module,
    ),
  { ssr: false },
);

const MouseCoordinatesDynamic = dynamic(
  () =>
    import("../components/atoms/coordinateTools/MouseCoordinates").then(
      (module) => module,
    ),
  { ssr: false },
);

const MapFocusHandlerDynamic = dynamic(
  () =>
    import("../components/atoms/coordinateTools/MapFocusHandler").then(
      (module) => module,
    ),
  { ssr: false },
);

const MapClickHandlerDynamic = dynamic(
  () =>
    import("../components/atoms/coordinateTools/MapClickHandler").then(
      (module) => module,
    ),
  { ssr: false },
);

const MapMeasureDynamic = dynamic(
  () => import("../components/molecules/MapMeasure"),
  { ssr: false },
);

export default function EcologicalModelsPage() {
  const [grupos, setGrupos] = useState<GrupoEspecieFront[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [especiesList, setEspeciesList] = useState<any[]>([]);
  const [selectedSpecie, setSelectedSpecie] = useState<any>(null);
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingAnalysis, setDownloadingAnalysis] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);

  const {
    setSelectedSpecies,
    selectedAnalysis,
    setSelectedAnalysis,
    setAnalyses,
  } = useSpecies();

  const mapRef = useRef<any>(null);
  const [minZoom, setMinZoom] = useState(3);
  const [maxZoom, setMaxZoom] = useState(14);
  const [zoom, setZoom] = useState(3);
  const [tile, setTile] = useState(
    "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  );
  const [tifBuffer, setTifBuffer] = useState<{
    principal: string | null;
    arquivo_30: string | null;
    nacional: string | null;
    rs: string | null;
  } | null>(null);
  const [showRoads, setShowRoads] = useState(false);
  const [analysisOpacity, setAnalysisOpacity] = useState(1);
  const [showOpacityControl, setShowOpacityControl] = useState(false);
  const [searchMarker, setSearchMarker] = useState<Coordinate | null>(null);
  const [manualPoints, setManualPoints] = useState<ManualPoint[]>([]);

  const [baseMap, setBaseMap] = useState<"openstreetmap" | "google">(
    "openstreetmap",
  );

  const handleAddPointFromMap = (lat: number, lng: number) => {
    // AQUI: Se estiver medindo, ignoramos o clique do Michelangelo
    if (isMeasuring) return;

    setManualPoints((prev) => {
      if (isDuplicatePoint(prev, lat, lng)) return prev;

      const newPoint: ManualPoint = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        lat,
        lng,
        source: "manual",
      };
      return [...prev, newPoint];
    });
  };

  const [focusTarget, setFocusTarget] = useState<Coordinate | null>(null);

  const handleFocusPoint = (lat: number, lng: number) => {
    setFocusTarget({ lat, lng });
  };

  const handleRemovePoint = (id: string) => {
    setManualPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePointLabel = (id: string, label: string) => {
    setManualPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label } : p)),
    );
  };

  const bottomLeftLat = -54;
  const topRightLat = 40.8;
  const bottomLeftLng = -90;
  const topRightLng = 55;
  const left = -90;
  const bottom = -180;
  const right = 90;
  const top = 180;
  const legendaTexto =
    "A adequabilidade ecológica varia de 0 a 1, onde valores próximos de 0 indicam baixa favorabilidade ambiental e valores próximos de 1 indicam alta favorabilidade à ocorrência da espécie. O gradiente de cores do roxo/azulado ao vermelho representa essa variação espacial.";

  useEffect(() => {
    async function fetchGrupos() {
      try {
        const gruposOrdenados = await fetchGruposService();
        setGrupos(gruposOrdenados);
      } catch (error) {
        console.error("Erro ao buscar grupos", error);
      }
    }
    fetchGrupos();
  }, []);

  useEffect(() => {
    return () => {
      setAnalyses([]);
      setSelectedAnalysis(null);
      setSelectedSpecies(null);
      setTifBuffer(null);
    };
  }, []);

  const handleGroupClick = async (idGrupo: string) => {
    setSelectedGroupId(idGrupo);
    setEspeciesList([]);
    setSelectedSpecie(null);
    setSelectedSpecies(null);
    setAnalyses([]);
    setTifBuffer(null);
    setIsLoadingSpecies(true);

    try {
      const listaFormatada = await fetchEspeciesByGrupoService(idGrupo, grupos);
      setEspeciesList(listaFormatada);
    } catch (error) {
      console.error("Erro ao buscar espécies", error);
    } finally {
      setIsLoadingSpecies(false);
    }
  };

  const handleSpecieChange = async (val: any) => {
    setTifBuffer(null);
    setSelectedAnalysis(null);

    setSelectedSpecie(val);
    setSelectedSpecies({
      id: val.id,
      nome: val.nome,
      grupo: val.grupo,
    });

    try {
      const analises = await fetchAnalisesByEspecieService(val.id);

      setAnalyses(analises);
    } catch (err) {
      console.error("Erro ao buscar análises da espécie", err);
      setAnalyses([]);
    }
  };

  useEffect(() => {
    setTifBuffer(null);
  }, []);

  useEffect(() => {
    const loadTif = async () => {
      if (!selectedAnalysis) {
        setTifBuffer(null);
        return;
      }

      setLoading(true);

      try {
        const result = await window.analisesAPI.searchTifWith30(
          selectedAnalysis.nome_arquivo,
          selectedAnalysis.nome_arquivo_30,
          selectedAnalysis.nome_arquivo_nacional,
          selectedAnalysis.nome_arquivo_rs,
        );

        if (!result || !result.principal) {
          setLoading(false);
          setTifBuffer(null);
          setWarning("Não foi possível carregar o arquivo TIF desta análise.");
          return;
        }

        const buffers = {
          principal: result.principal
            ? `data:image/tiff;base64,${result.principal.base64}`
            : null,
          arquivo_30: result.arquivo_30
            ? `data:image/tiff;base64,${result.arquivo_30.base64}`
            : null,
          nacional: result.nacional
            ? `data:image/tiff;base64,${result.nacional.base64}`
            : null,
          rs: result.rs
            ? `data:image/tiff;base64,${result.rs.base64}`
            : null,
        };

        setTifBuffer(buffers);
      } catch (err) {
        console.error("Erro ao buscar TIF", err);
        setTifBuffer(null);
      } finally {
        setLoading(false);
      }
    };

    loadTif();
  }, [selectedAnalysis, selectedSpecie]);

  useEffect(() => {
    setTile("https://tile.openstreetmap.de/{z}/{x}/{y}.png");
    setMinZoom(3);
    setMaxZoom(14);
    setZoom(3);
  }, []);

  const handleImportCsv = async (file: File) => {
    const content = await file.text();
    const result = parseCSVPoints(content);
    if (result.error) {
      console.error(result.error);
      return;
    }
    const importedPoints: ManualPoint[] = result.points.map((p) => ({
      id: crypto.randomUUID(),
      lat: p.lat,
      lng: p.lng,
      source: "csv",
    }));
    setManualPoints((prev) => [...prev, ...importedPoints]);
    setCsvPointsCount(importedPoints.length);
  };

  const [csvPointsCount, setCsvPointsCount] = useState(0);

  const handleClearCsv = () => {
    setManualPoints((prev) => prev.filter((point) => point.source !== "csv"));
    setCsvPointsCount(0);
  };

  const handleDownloadSelectedAnalysis = async () => {
    if (!selectedAnalysis || downloadingAnalysis) return;

    setDownloadingAnalysis(true);

    try {
      const token = await window.auth.getToken();

      if (!token) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        return;
      }

      const result = await window.analisesAPI.downloadSelected(token, {
        nome_pasta: selectedAnalysis.nome_pasta,
        arquivos: [
          selectedAnalysis.nome_arquivo,
          selectedAnalysis.nome_arquivo_30,
          selectedAnalysis.nome_arquivo_nacional,
          selectedAnalysis.nome_arquivo_rs,
          ...getArquivosIncertezaSelecionada(selectedAnalysis),
        ],
      });

      if (result.success) {
        const quantidade = result.downloaded.length;
        toast.success(
          `${quantidade} ${
            quantidade === 1 ? "arquivo salvo" : "arquivos salvos"
          } na pasta Downloads.`
        );
        return;
      }

      if (result.downloaded.length > 0) {
        toast.error(
          `${result.downloaded.length} arquivo(s) salvo(s), mas ${result.failed.length} falharam.`
        );
        return;
      }

      toast.error("Não foi possível baixar a análise selecionada.");
    } catch (error) {
      console.error("Erro ao baixar análise selecionada", error);
      toast.error("Não foi possível baixar a análise selecionada.");
    } finally {
      setDownloadingAnalysis(false);
    }
  };

  const tileUrl =
    baseMap === "openstreetmap"
      ? "https://tile.openstreetmap.de/{z}/{x}/{y}.png"
      : "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";

  const tileAttribution =
    baseMap === "openstreetmap"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      : "&copy; Google Maps";

  return (
    <div className="flex w-screen h-screen bg-dark_gray overflow-hidden">
      <div className="h-full">
        <SideBar />
      </div>

      <main className="flex-1 h-full overflow-y-auto p-6 flex flex-col gap-6">
        <div className="w-full">
          <GroupButtons
            grupos={grupos}
            selectedId={selectedGroupId}
            onSelect={handleGroupClick}
          />
        </div>
        <div className="flex items-end gap-4">
          <div className="w-[420px] max-w-full">
            <SelectDynamic
              label="Espécies"
              disabled={!selectedGroupId}
              placeholder={
                !selectedGroupId
                  ? "Selecione um grupo primeiro..."
                  : selectedSpecie
                    ? `Selecionada: ${selectedSpecie.nome}`
                    : getSelectPlaceholderService(
                        isLoadingSpecies,
                        especiesList.length,
                      )
              }
              count={especiesList.length}
              triggerIcon="/images/icons/book.svg"
              options={especiesList}
              onChange={handleSpecieChange}
              value={selectedSpecie}
            />
          </div>

          <button
            onClick={() => setShowRoads((prev) => !prev)}
            className="h-[55px] px-6 rounded bg-dark_green text-white whitespace-nowrap hover:bg-dark_green"
          >
            {showRoads ? "Ocultar estradas" : "Adicionar estradas"}
          </button>

          <button
            type="button"
            onClick={handleDownloadSelectedAnalysis}
            disabled={!selectedAnalysis || downloadingAnalysis}
            className="h-[55px] px-6 rounded bg-dark_green text-white whitespace-nowrap enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadingAnalysis ? "Baixando análise..." : "Baixar análise"}
          </button>

          <button
            onClick={() => {
              if (isMeasuring) {
                setIsMeasuring(false);
                setCurrentDistance(0);
              } else {
                setIsMeasuring(true);
              }
            }}
            className={`h-[55px] px-6 rounded text-white ${isMeasuring ? "bg-red-600" : "bg-dark_green"}`}
          >
            {isMeasuring ? "Cancelar Medição" : "Medir Distância"}
          </button>
          {isMeasuring && (
            <div className="h-[55px] flex items-center px-4 bg-white rounded font-bold text-dark_green border">
              {currentDistance.toFixed(2)} km
            </div>
          )}
        </div>

        <div className="flex-1 rounded-lg flex items-center justify-center bg-gray-50 min-h-[500px] z-0 overflow-hidden relative">
          <div className="absolute top-3 left-3 z-[1000]">
            <MapLayerSwitcher baseMap={baseMap} setBaseMap={setBaseMap} />
          </div>

          <div className="absolute top-3 right-3 z-1000">
            <CoordinateToolsPanel
              searchMarker={searchMarker}
              setSearchMarker={setSearchMarker}
              manualPoints={manualPoints}
              setManualPoints={setManualPoints}
              onFocusPoint={handleFocusPoint}
              onImportCsv={handleImportCsv}
              csvPointsCount={csvPointsCount}
              onClearCsv={handleClearCsv}
            />
          </div>
          <div className="h-full w-full">
            <MapContainerDynamic
              ref={mapRef}
              maxBounds={[
                [bottomLeftLat, bottomLeftLng],
                [topRightLat, topRightLng],
              ]}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              bounds={[
                [left, bottom],
                [right, top],
              ]}
              zoomControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayerDynamic
                key={baseMap}
                attribution={tileAttribution}
                url={tileUrl}
                maxZoom={baseMap === "google" ? 20 : maxZoom}
              />
              <GeoRasterLayerComponent
                url={tifBuffer}
                showRoads={showRoads}
                analysisOpacity={analysisOpacity}
                onLayerLoad={() => {}}
                setLoading={(res) => setLoading(res)}
              />
              <MapMarkersDynamic
                searchMarker={searchMarker}
                manualPoints={manualPoints}
                onUpdatePointLabel={handleUpdatePointLabel}
                onRemovePoint={handleRemovePoint}
              />
              <MouseCoordinatesDynamic />

              {!isMeasuring && (
                <MapClickHandlerDynamic onAddPoint={handleAddPointFromMap} />
              )}

              <MapFocusHandlerDynamic target={focusTarget} />

              {isMeasuring && (
                <MapMeasureDynamic
                  isActive
                  onDistanceChange={(d) => setCurrentDistance(d)}
                />
              )}
            </MapContainerDynamic>
          </div>
        </div>
        {/* Controle de opacidade da análise */}
        {tifBuffer && tifBuffer.principal && (
          <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-3">
            {/* Card de transparência */}
            <div className="bg-white rounded-lg shadow-lg p-3 w-56 self-end mr-1">
              {/* Header */}
              <button
                onClick={() => setShowOpacityControl((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm font-medium text-dark_green cursor-pointer"
              >
                Transparência da análise
                <span className="text-xs">
                  {Math.round(analysisOpacity * 100)}%
                </span>
              </button>

              {/* Slider */}
              {showOpacityControl && (
                <div className="mt-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={analysisOpacity}
                    onChange={(e) => setAnalysisOpacity(Number(e.target.value))}
                    className="w-full accent-dark_green"
                  />

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Transparente</span>
                    <span>Opaco</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card da legenda */}
            <div className="w-full rounded-lg">
              <div className="flex flex-col items-end group relative">
                <img
                  src="/images/legenda-adequabilidade.png"
                  alt="Legenda de adequabilidade ecológica"
                  className="w-full cursor-help"
                />

                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-[1100]">
                  <div className="bg-gray-800 text-white text-xs rounded-md p-3 w-64 shadow-lg">
                    {legendaTexto}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && <ModalLoading />}

        {warning && (
          <ModalWarning
            close={() => {
              setWarning("");
            }}
          />
        )}
      </main>
    </div>
  );
}
