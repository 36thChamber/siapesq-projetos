"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import BaseMap from "@/components/ui/baseMap";
import { AnalysisPanel } from "@/components/analysisPanel";
import type { Coordinate, MapPoint } from "@/components/coordinateTools";

import MapMeasure from "@/components/map/MapMeasure";
import MapLayerSwitcher from "@/components/MapLayerSwitcher/MapLayerSwitcher";
import { AdequabilityLegend } from "@/components/AdequabilityLegend";
import { LockIcon } from "@/components/icons";

import { useAuth } from "@/context/AuthContext";
import { buscarEspeciePorId } from "@/services/api/especies.service";
import { listarAnalisesDaEspecie, obterUrlTifAnalise } from "@/services/api/analises.service";
import axios from "axios";
import { Especie as Specie } from "@/services/types/especie.types";
import { isDuplicatePoint } from "@/components/coordinateTools/types";
import { getPlatformTheme, PlatformState } from "@/config/platformThemes";
import { evaluateSpeciesAccess, getSpeciesAccessErrorMessage, isSpeciesAccessLimitError } from "@/services/types/plano.types";
import { getAnalysisLabel } from "@/utils/analysisScenarios";
import { useSpeciesOccurrence } from "@/hook/useSpeciesOccurrence";

import { AnaliseGeoRaster, SelectedAnalysis } from "@/components/map/GeoRasterLayer"; 
const GeoRasterLayerDynamic = dynamic(
  () => import("@/components/map/GeoRasterLayer"),
  { ssr: false }
);

const MapMarkersDynamic = dynamic(
  () => import("@/components/coordinateTools/MapMarkers"),
  { ssr: false }
);

const MouseCoordinatesDynamic = dynamic(
  () => import("@/components/coordinateTools/MouseCoordinates"),
  { ssr: false }
);

const MapClickHandlerDynamic = dynamic(
  () => import("@/components/coordinateTools/MapClickHandler"),
  { ssr: false }
);

const MapFocusHandlerDynamic = dynamic(
  () => import("@/components/coordinateTools/MapFocusHandler"),
  { ssr: false }
);

const OccurrenceMarkersDynamic = dynamic(
  () => import("@/components/LeafletMap/OccurrenceMarkers"),
  { ssr: false },
);

interface MapSectionProps {
  mode: "full" | "embedded";
  specie: string;
}

const MAX_SELECTED_ANALYSES = 3;

function analysisErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  switch (status) {
    case 401: return "Sua sessão expirou. Entre novamente para acessar a análise.";
    case 403: return "Você não possui acesso a esta análise pelo seu plano ou limite de visualizações.";
    case 404: return "O arquivo desta análise não está disponível.";
    case 409: return "Esta análise ainda não possui um GeoTIFF disponível.";
    case 503: return "O arquivo está temporariamente indisponível. Tente novamente.";
    default: return "Não foi possível carregar esta análise. Tente novamente.";
  }
}

export default function MapSection({ mode, specie }: MapSectionProps) {

  const { user, plano, accessControl, accessDispatch } = useAuth();
  const router = useRouter();

  // Mantém a leitura mais recente de accessControl sem forçar o efeito de
  // carregamento a rodar de novo quando ele muda (o próprio efeito o atualiza).
  const accessControlRef = useRef(accessControl);
  useEffect(() => {
    accessControlRef.current = accessControl;
  }, [accessControl]);

  const [selectedAnalyses, setSelectedAnalyses] = useState<SelectedAnalysis[]>([]);
  const selectedAnalysesRef = useRef<SelectedAnalysis[]>([]);
  const requestTokensRef = useRef(new Map<string, number>());
  const requestCounterRef = useRef(0);
  const [analyses, setAnalyses] = useState<AnaliseGeoRaster[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [analysesError, setAnalysesError] = useState<string | null>(null);
  const [analysesReloadKey, setAnalysesReloadKey] = useState(0);
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [loadingAnalysisIds, setLoadingAnalysisIds] = useState<Set<string>>(new Set());
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    requestTokensRef.current.clear();
    selectedAnalysesRef.current = [];
    setSelectedAnalyses([]);
    setLoadingAnalysisIds(new Set());
    setAnalysisErrors({});
    setAnalyses([]);
  }, [specie]);

  const loadAnalysisUrl = useCallback(async (analysis: AnaliseGeoRaster) => {
    if (requestTokensRef.current.has(analysis.id)) {
      setLoadingAnalysisIds((current) => new Set(current).add(analysis.id));
      return;
    }
    const token = ++requestCounterRef.current;
    requestTokensRef.current.set(analysis.id, token);
    setLoadingAnalysisIds((current) => new Set(current).add(analysis.id));
    setAnalysisErrors((current) => {
      const next = { ...current };
      delete next[analysis.id];
      return next;
    });

    try {
      const result = await obterUrlTifAnalise(analysis.id);
      if (result.id_analise !== analysis.id || !result.url) throw new Error("Resposta de TIFF inválida");
      if (requestTokensRef.current.get(analysis.id) !== token ||
          !selectedAnalysesRef.current.some((item) => item.id === analysis.id)) return;
      const next = selectedAnalysesRef.current.map((item) =>
        item.id === analysis.id ? { ...item, url: result.url } : item,
      );
      selectedAnalysesRef.current = next;
      setSelectedAnalyses(next);
    } catch (error) {
      if (requestTokensRef.current.get(analysis.id) === token &&
          selectedAnalysesRef.current.some((item) => item.id === analysis.id)) {
        setAnalysisErrors((current) => ({ ...current, [analysis.id]: analysisErrorMessage(error) }));
      }
    } finally {
      if (requestTokensRef.current.get(analysis.id) === token) {
        requestTokensRef.current.delete(analysis.id);
        setLoadingAnalysisIds((current) => {
          const next = new Set(current);
          next.delete(analysis.id);
          return next;
        });
      }
    }
  }, []);

  const handleToggleAnalysis = useCallback((analysis: AnaliseGeoRaster) => {
    if (isBlocked) return;
    const current = selectedAnalysesRef.current;
    if (current.some((item) => item.id === analysis.id)) {
      const next = current.filter((item) => item.id !== analysis.id);
      selectedAnalysesRef.current = next;
      setSelectedAnalyses(next);
      setAnalysisErrors((errors) => {
        const updated = { ...errors };
        delete updated[analysis.id];
        return updated;
      });
      setLoadingAnalysisIds((ids) => {
        const updated = new Set(ids);
        updated.delete(analysis.id);
        return updated;
      });
      return;
    }
    if (current.length >= MAX_SELECTED_ANALYSES) return;
    const next = [...current, { ...analysis, opacity: 1 }];
    selectedAnalysesRef.current = next;
    setSelectedAnalyses(next);
    void loadAnalysisUrl(analysis);
  }, [isBlocked, loadAnalysisUrl]);

  const handleClearAnalyses = useCallback(() => {
    selectedAnalysesRef.current.forEach(({ id }) => requestTokensRef.current.delete(id));
    selectedAnalysesRef.current = [];
    setSelectedAnalyses([]);
    setAnalysisErrors({});
    setLoadingAnalysisIds(new Set());
  }, []);

  const handleRetryAnalysis = useCallback((analysis: AnaliseGeoRaster) => {
    if (!isBlocked && selectedAnalysesRef.current.some((item) => item.id === analysis.id)) {
      void loadAnalysisUrl(analysis);
    }
  }, [isBlocked, loadAnalysisUrl]);

  const handleAnalysisLoadError = useCallback((id: string) => {
    if (!selectedAnalysesRef.current.some((item) => item.id === id)) return;
    const next = selectedAnalysesRef.current.map((item) => item.id === id ? { ...item, url: undefined } : item);
    selectedAnalysesRef.current = next;
    setSelectedAnalyses(next);
    setAnalysisErrors((current) => ({ ...current, [id]: "Não foi possível abrir o GeoTIFF. Tente novamente." }));
  }, []);

  const handleUpdateOpacity = useCallback((id: string, opacity: number) => {
    const next = selectedAnalysesRef.current.map((analysis) =>
        analysis.id === id ? { ...analysis, opacity } : analysis,
      );
    selectedAnalysesRef.current = next;
    setSelectedAnalyses(next);
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/group/${encodeURIComponent(specie)}`);
  }, [router, specie]);

  const handleAnalysisLoadingChange = useCallback((id: string, isLoading: boolean) => {
    setLoadingAnalysisIds((prev) => {
      const next = new Set(prev);
      if (isLoading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /*
   * Painel lateral
   */
  const [collapsed, setCollapsed] = useState(false);

  /*
   * Medição de distância
   */
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(0);
  const measureRef = useRef<any>(null);

  /*
   * Dados da espécie
   */
  const [specieDetails, setSpecieDetails] = useState<Specie | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Ferramentas de coordenadas
   */
  const [searchMarker, setSearchMarker] = useState<Coordinate | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [focusTarget, setFocusTarget] = useState<Coordinate | null>(null);
  const [showSpeciesOccurrences, setShowSpeciesOccurrences] = useState(false);
  const { points: speciesOccurrencePoints } = useSpeciesOccurrence(
    isBlocked || !user ? "" : (specieDetails?.id_especie ?? ""),
  );

  /*
   * Mapa-base e Plataforma
   */
  const [baseMap, setBaseMap] = useState<"openstreetmap" | "google">("openstreetmap");
  const [platform, setPlatform] = useState<PlatformState>("RS");

  useEffect(() => {
    const savedState = localStorage.getItem("platformState") as PlatformState | null;
    if (savedState === "RS" || savedState === "ES" || savedState === "MG") {
      setPlatform(savedState);
    }
  }, []);

  const theme = getPlatformTheme(platform);

  /*
   * Carregamento dos dados da espécie com Validação de Paywall
   */
  useEffect(() => {
    // Limpa os dados da espécie anterior antes de avaliar a nova, evitando
    // que o mapa/sidebar continuem mostrando a espécie anterior por baixo
    // do overlay de bloqueio.
    setSpecieDetails(null);
    setError(null);
    setIsBlocked(false);

    if (!specie) {
      setError("Espécie não informada.");
      return;
    }

    if (!user) return;

    const { isBlocked: currentlyBlocked, shouldRegisterView } = evaluateSpeciesAccess(
      accessControlRef.current,
      plano,
      specie,
    );

    setIsBlocked(currentlyBlocked);

    if (currentlyBlocked) {
      setLoading(false);
      return;
    }

    if (shouldRegisterView) {
      accessDispatch({
        type: "attSpecies",
        id: specie,
      });
    }

    let isMounted = true;

    async function loadSpecieData() {
      setLoading(true);
      setError(null);
      try {
        const details = await buscarEspeciePorId(specie);
        if (isMounted) setSpecieDetails(details);
      } catch (err) {
        if (isMounted) {
          setSpecieDetails(null);
          // Contador local liberou a visualização, mas o servidor tem seu
          // próprio limite persistente e rejeitou com 403: trata como
          // bloqueado (mesmo cadeado do bloqueio local) em vez de só exibir
          // uma mensagem de erro solta.
          if (isSpeciesAccessLimitError(err)) {
            setIsBlocked(true);
            setError(getSpeciesAccessErrorMessage(err));
          } else {
            setError(getSpeciesAccessErrorMessage(err));
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSpecieData();

    return () => { isMounted = false; };
    // accessControl é lido via accessControlRef para não reexecutar este
    // efeito quando o próprio dispatch abaixo o atualiza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specie, user, plano, accessDispatch]);

  useEffect(() => {
    if (!specieDetails?.id_especie || isBlocked || !user) return;
    let active = true;
    setLoadingAnalyses(true);
    setAnalysesError(null);
    listarAnalisesDaEspecie(specieDetails.id_especie)
      .then((items) => {
        if (!active) return;
        setAnalyses(items.flatMap((item) => {
          const label = getAnalysisLabel(item.cenario);
          return label ? [{ id: item.id_analise, nome: label, cenario: item.cenario ?? undefined }] : [];
        }));
      })
      .catch((error) => {
        if (!active) return;
        setAnalyses([]);
        setAnalysesError(analysisErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingAnalyses(false);
      });
    return () => { active = false; };
  }, [specieDetails?.id_especie, isBlocked, user, analysesReloadKey]);

  const center: [number, number] = useMemo(() => {
    const latitude = Number(
      specieDetails?.latitude ??
      specieDetails?.lat ??
      specieDetails?.coordenadas?.latitude ??
      specieDetails?.localizacao?.latitude,
    );

    const longitude = Number(
      specieDetails?.longitude ??
      specieDetails?.lng ??
      specieDetails?.lon ??
      specieDetails?.coordenadas?.longitude ??
      specieDetails?.localizacao?.longitude,
    );

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return [latitude, longitude];
    }
    return [-30, -51];
  }, [specieDetails]);

  const zoom = mode === "full" ? 8 : 5;
  const speciesName = specieDetails?.nome ?? specieDetails?.nome_cientifico ?? "Espécie selecionada";

  const handleToggleMeasuring = useCallback(() => {
    setIsMeasuring((previous) => {
      if (previous) {
        measureRef.current?.resetPoints?.();
        setCurrentDistance(0);
      }
      return !previous;
    });
  }, []);

  const handleAddPointFromMap = useCallback((lat: number, lng: number) => {
    if (isBlocked) return;
    setPoints((previous) => {
      if (isDuplicatePoint(previous, lat, lng)) return previous;
      return [...previous, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, lat, lng, source: "manual" as const }];
    });
  }, [isBlocked]);

  const handleFocusPoint = useCallback((lat: number, lng: number) => {
    setFocusTarget({ lat, lng });
  }, []);

  const handleRemovePoint = useCallback((id: string) => {
    setPoints((previous) => previous.filter((point) => point.id !== id));
  }, []);

  const handleUpdatePointLabel = useCallback((id: string, label: string) => {
    setPoints((previous) => previous.map((point) => point.id === id ? { ...point, label } : point));
  }, []);

  return (
    <section className="relative flex h-full min-h-0 w-full overflow-hidden">
      {/* Painel lateral */}
      <aside
        className={`relative z-20 shrink-0 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[40px] border-none bg-transparent shadow-none" : "w-[min(18rem,calc(100vw-3rem))] border-r bg-white shadow-sm"
        }`}
        style={{
          borderColor: theme.colors.gray[200],
          backgroundColor: collapsed ? "transparent" : theme.colors.background,
        }}
      >
        <AnalysisPanel
          collapsed={collapsed}
          onToggle={() => setCollapsed((previous) => !previous)}
          speciesName={speciesName}
          isMeasuring={isMeasuring}
          distanceDisplay={currentDistance.toFixed(2)}
          onToggleMeasuring={handleToggleMeasuring}
          selectedAnalyses={selectedAnalyses}
          analyses={analyses}
          loadingAnalyses={loadingAnalyses}
          analysesError={analysesError}
          onRetryAnalyses={() => setAnalysesReloadKey((key) => key + 1)}
          analysisErrors={analysisErrors}
          onRetryAnalysis={handleRetryAnalysis}
          isBlocked={isBlocked}
          loadingAnalysisIds={loadingAnalysisIds}
          onToggleAnalysis={handleToggleAnalysis}
          onUpdateOpacity={handleUpdateOpacity}
          limitReached={selectedAnalyses.length >= MAX_SELECTED_ANALYSES}
          onClearAnalyses={handleClearAnalyses}
          onGoBack={mode === "full" ? handleBack : undefined}
          searchMarker={searchMarker}
          setSearchMarker={setSearchMarker}
          points={points}
          setPoints={setPoints}
          onFocusPoint={handleFocusPoint}
          showSpeciesOccurrences={showSpeciesOccurrences}
          onToggleSpeciesOccurrences={setShowSpeciesOccurrences}
        />
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        {isBlocked && (
          <div className="absolute inset-0 z-[2000] backdrop-blur-sm bg-[#00000086] flex flex-col justify-center items-center">
            <LockIcon size={40} color="white" />
            <h2 className="text-white text-xl font-bold mt-4 tracking-wide">Área de Monitoramento Bloqueada</h2>
            <p className="text-gray-200 mt-2">
              {error ?? "Você atingiu o limite de visualizações do seu plano."}
            </p>
          </div>
        )}

        {loading && !isBlocked && (
          <div className="absolute left-4 top-4 z-[1100] rounded bg-white px-3 py-2 text-sm text-gray-600 shadow">
            Carregando dados da espécie...
          </div>
        )}

        {error && !isBlocked && (
          <div className="absolute left-4 top-4 z-[1100] rounded bg-white px-3 py-2 text-sm text-red-600 shadow">
            {error}
          </div>
        )}

        <MapLayerSwitcher baseMap={baseMap} setBaseMap={setBaseMap} theme={theme} />

        {selectedAnalyses.some((analysis) => analysis.url) && <AdequabilityLegend />}

        <BaseMap center={center} zoom={zoom} baseMap={baseMap}>
          {!isBlocked && (
            <GeoRasterLayerDynamic 
              analyses={selectedAnalyses} 
              onLoadingChange={handleAnalysisLoadingChange}
              onLoadError={handleAnalysisLoadError}
            />
          )}

          {!isBlocked && showSpeciesOccurrences && <OccurrenceMarkersDynamic points={speciesOccurrencePoints} />}

          <MapMarkersDynamic
            searchMarker={searchMarker}
            points={points}
            onUpdatePointLabel={handleUpdatePointLabel}
            onRemovePoint={handleRemovePoint}
          />

          <MouseCoordinatesDynamic />

          {!isMeasuring && !isBlocked && <MapClickHandlerDynamic onAddPoint={handleAddPointFromMap} />}

          <MapFocusHandlerDynamic target={focusTarget} />

          <MapMeasure ref={measureRef} isActive={isMeasuring} onDistanceChange={setCurrentDistance} />
        </BaseMap>
      </main>
    </section>
  );
}
