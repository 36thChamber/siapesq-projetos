import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cogExpiry, useCogUrlRefresh } from "./useCogUrlRefresh";
import { useAuth } from "@/context/AuthContext";
import { listarAnalisesDaEspecie, obterUrlTifAnalise } from "@/services/api/analises.service";
import type { AnaliseDaEspecie } from "@/services/types/analise.types";
import type {
  FutureYear,
  FutureVariant,
  PredictionPeriod,
} from "@/services/types/prediction.types";
import { ANNUAL_SCENARIO, FUTURE_SCENARIOS, MONTH_SCENARIOS } from "@/utils/analysisScenarios";
import axios from "axios";
import { datasetKey, datasetOptions as collectDatasets } from "@/utils/analysisDatasets";

export { ANNUAL_SCENARIO, FUTURE_SCENARIOS, MONTH_SCENARIOS } from "@/utils/analysisScenarios";

function errorMessage(error: unknown, resource: "analyses" | "tif"): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401) return "Sua sessão expirou. Entre novamente para acessar a análise.";
  if (status === 403) return "Você não possui acesso a esta análise pelo seu plano ou limite de visualizações.";
  if (status === 404) return resource === "analyses"
    ? "Nenhuma análise de adequabilidade disponível para esta espécie."
    : "Análise não disponível.";
  if (status === 409) return "Esta análise ainda não possui um arquivo válido associado.";
  if (status === 503) return "Não foi possível acessar o arquivo da análise neste momento.";
  return "Não foi possível carregar a análise. Tente novamente.";
}

function hasScenario(analyses: AnaliseDaEspecie[], scenario: string) {
  return analyses.some((analysis) => analysis.cenario === scenario);
}

export function usePredictionMap(specieId: string) {
  const { user } = useAuth();
  const userId = user?.id_usuario;

  const [period, setPeriod] = useState<PredictionPeriod>("annual");
  const [futureYear, setFutureYear] = useState<FutureYear>(2050);
  const [allAnalyses, setAnalyses] = useState<AnaliseDaEspecie[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const datasets = useMemo(() => collectDatasets(allAnalyses), [allAnalyses]);
  const analyses = useMemo(() => allAnalyses.filter(item => datasetKey(item) === (selectedDataset || datasets[0]?.value)), [allAnalyses, datasets, selectedDataset]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [tiffUrl, setTiffUrl] = useState<string | undefined>(undefined);
  const [expiry, setExpiry] = useState<ReturnType<typeof cogExpiry>>();
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const owner = useRef(userId);
  useEffect(() => { owner.current = userId; }, [userId]);
  const [loadingScenarios, setLoadingScenarios] = useState(Boolean(specieId && userId));
  const [loadingMap, setLoadingMap] = useState(false);
  const [errorScenarios, setErrorScenarios] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<string | null>(null);
  const [downloadingTif, setDownloadingTif] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [analysesReloadKey, setAnalysesReloadKey] = useState(0);
  const [tifReloadKey, setTifReloadKey] = useState(0);
  const downloadInFlight = useRef(false);
  const selectedAnalysisIdRef = useRef<string | undefined>(undefined);

  const ownerKey = `${userId || ''}:${specieId}:${analysesReloadKey}`;
  const [previousOwnerKey, setPreviousOwnerKey] = useState(ownerKey);
  if (previousOwnerKey !== ownerKey) {
    setPreviousOwnerKey(ownerKey);setAnalyses([]);setSelectedDataset("");setSelectedScenario("");setPeriod("annual");setFutureYear(2050);
    setTiffUrl(undefined);setExpiry(undefined);setLoadingScenarios(Boolean(specieId && userId));setErrorScenarios(null);setErrorMap(null);
  }
  useEffect(() => {
    if (!specieId || !userId) return;
    let cancelled = false;
    listarAnalisesDaEspecie(specieId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const firstDataset = collectDatasets(list)[0]?.value || "";
        setSelectedDataset(firstDataset);
        setAnalyses(list);
        const first = list.filter(item => datasetKey(item) === firstDataset);
        setSelectedScenario(hasScenario(first, ANNUAL_SCENARIO) ? ANNUAL_SCENARIO : "");
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalyses([]);
          setErrorScenarios(errorMessage(error, "analyses"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingScenarios(false);
      });

    return () => {
      cancelled = true;
    };
  }, [specieId, userId, analysesReloadKey]);

  const selectedAnalysis = useMemo(
    () => analyses.find((analysis) => analysis.cenario === selectedScenario),
    [analyses, selectedScenario],
  );

  useEffect(() => {
    selectedAnalysisIdRef.current = selectedAnalysis?.id_analise;
  }, [selectedAnalysis]);

  const refreshSelected = useCallback(async (id: string) => {
    const requestedOwner = userId;
    try {
      const result = await obterUrlTifAnalise(id);
      if (!alive.current || owner.current !== requestedOwner || selectedAnalysisIdRef.current !== id) return;
      if (result.id_analise !== id || !result.url) throw new Error("Resposta COG inválida");
      setExpiry(cogExpiry(result.expiresIn));
      setErrorMap(null);
      setTiffUrl(result.url);
    } catch (error) {
      if (alive.current && owner.current === requestedOwner && selectedAnalysisIdRef.current === id) setErrorMap(errorMessage(error, "tif"));
      throw error;
    }
  }, [userId]);
  const renewalResources = useMemo(() => selectedAnalysis && tiffUrl ? [{ id: selectedAnalysis.id_analise, url: tiffUrl, ...expiry }] : [], [selectedAnalysis, tiffUrl, expiry]);
  const renewNow = useCogUrlRefresh(renewalResources, refreshSelected, Boolean(userId));

  const selectionKey = `${ownerKey}:${selectedAnalysis?.id_analise || ''}:${tifReloadKey}`;
  const [previousSelectionKey, setPreviousSelectionKey] = useState(selectionKey);
  if (previousSelectionKey !== selectionKey) {
    setPreviousSelectionKey(selectionKey);setTiffUrl(undefined);setExpiry(undefined);setErrorMap(null);setLoadingMap(Boolean(selectedAnalysis && userId));
  }
  useEffect(() => {
    if (!selectedAnalysis || !userId) return;
    let cancelled = false;
    obterUrlTifAnalise(selectedAnalysis.id_analise)
      .then((result) => {
        if (cancelled) return;
        if (result.id_analise !== selectedAnalysis.id_analise || !result.url) throw new Error("Resposta COG inválida");
        setExpiry(cogExpiry(result.expiresIn));
        setTiffUrl(result.url);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMap(errorMessage(error, "tif"));
          setLoadingMap(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAnalysis, userId, tifReloadKey]);

  const handlePeriodChange = useCallback((next: PredictionPeriod) => {
    setPeriod(next);
    if (next === "annual") {
      setSelectedScenario(hasScenario(analyses, ANNUAL_SCENARIO) ? ANNUAL_SCENARIO : "");
      return;
    }
    if (next === "monthly") {
      setSelectedScenario(MONTH_SCENARIOS.find(({ scenario }) => hasScenario(analyses, scenario))?.scenario ?? "");
      return;
    }
    const firstFuture = FUTURE_SCENARIOS.find(({ scenario }) => hasScenario(analyses, scenario));
    setFutureYear(firstFuture?.year ?? 2050);
    setSelectedScenario(firstFuture?.scenario ?? "");
  }, [analyses]);

  const handleScenarioChange = useCallback((next: string) => {
    setSelectedScenario(next);
  }, []);

  const handleFutureYearChange = useCallback((year: FutureYear) => {
    setFutureYear(year);
    const scenario = FUTURE_SCENARIOS.find(
      (item) => item.year === year && hasScenario(analyses, item.scenario),
    );
    setSelectedScenario(scenario?.scenario ?? "");
  }, [analyses]);

  const handleDownloadTif = useCallback(async () => {
    const idAnalise = selectedAnalysis?.id_analise;
    if (!idAnalise || downloadInFlight.current) return;

    downloadInFlight.current = true;
    setDownloadingTif(true);
    setDownloadError(null);

    try {
      // The map URL may expire; download requests always receive a new one.
      const result = await obterUrlTifAnalise(idAnalise);
      if (result.id_analise !== idAnalise || !result.url) throw new Error("Resposta de TIFF inválida");
      if (selectedAnalysisIdRef.current !== idAnalise) return;

      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      setDownloadError("Não foi possível baixar a análise. Tente novamente.");
    } finally {
      downloadInFlight.current = false;
      setDownloadingTif(false);
    }
  }, [selectedAnalysis]);

  const availableScenarios = useMemo(
    () => analyses.flatMap((analysis) => analysis.cenario ? [analysis.cenario] : []),
    [analyses],
  );

  const retryAnalyses = useCallback(() => setAnalysesReloadKey((key) => key + 1), []);
  const retryTif = useCallback(() => setTifReloadKey((key) => key + 1), []);
  const handleTiffRenderError = useCallback(
    () => {
      setLoadingMap(false);
      setErrorMap("Não foi possível abrir o GeoTIFF. Tentando renovar o acesso.");
      const id = selectedAnalysisIdRef.current;
      if (id) void renewNow(id);
    },
    [renewNow],
  );

  const onTiffLoadingChange = useCallback((loading: boolean) => setLoadingMap(loading), []);

  return {
    datasetOptions: datasets,
    selectedDataset: selectedDataset || datasets[0]?.value || "",
    onDatasetChange: (dataset: string) => {
      if (!datasets.some(option => option.value === dataset)) return;
      setSelectedDataset(dataset);
      const first = allAnalyses.filter(item => datasetKey(item) === dataset);
      const scenario = first.some(item => item.cenario === selectedScenario) ? selectedScenario : first[0]?.cenario || "";
      setSelectedScenario(scenario);
      setPeriod(scenario.startsWith("mensal_") ? "monthly" : scenario.startsWith("futuro_") ? "future" : "annual");
      setTiffUrl(undefined);
      setExpiry(undefined);
    },
    period,
    selectedScenario,
    availableScenarios,
    futureYear,
    tiffUrl,
    tiffRenewAt: expiry?.renewAt,
    loadingAnalyses: loadingScenarios,
    loadingTif: loadingMap,
    downloadingTif,
    canDownloadTif: Boolean(selectedAnalysis),
    analysesError: errorScenarios,
    tiffError: errorMap,
    downloadError,
    onPeriodChange: handlePeriodChange,
    onScenarioChange: handleScenarioChange,
    onFutureYearChange: handleFutureYearChange,
    onRetryAnalyses: retryAnalyses,
    onRetryTif: retryTif,
    onTiffRenderError: handleTiffRenderError,
    onTiffLoadingChange,
    onDownloadTif: handleDownloadTif,
  };
}
