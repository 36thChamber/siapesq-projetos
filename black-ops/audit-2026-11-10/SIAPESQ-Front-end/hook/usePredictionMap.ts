import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const [analyses, setAnalyses] = useState<AnaliseDaEspecie[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [tiffUrl, setTiffUrl] = useState<string | undefined>(undefined);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [errorScenarios, setErrorScenarios] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<string | null>(null);
  const [downloadingTif, setDownloadingTif] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [analysesReloadKey, setAnalysesReloadKey] = useState(0);
  const [tifReloadKey, setTifReloadKey] = useState(0);
  const downloadInFlight = useRef(false);
  const selectedAnalysisIdRef = useRef<string | undefined>(undefined);

  // fetch scenarios when period or subPeriod changes
  useEffect(() => {
    if (!specieId || !userId) {
      setAnalyses([]);
      setSelectedScenario("");
      setTiffUrl(undefined);
      return;
    }

    let cancelled = false;
    setLoadingScenarios(true);
    setErrorScenarios(null);
    setAnalyses([]);
    setPeriod("annual");
    setFutureYear(2050);
    setSelectedScenario("");
    setTiffUrl(undefined);

    listarAnalisesDaEspecie(specieId)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];

        console.log("Analyses fetched:", list);
        setAnalyses(list);
        setSelectedScenario(hasScenario(list, ANNUAL_SCENARIO) ? ANNUAL_SCENARIO : "");
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

  // Fetch the signed URL only for the analysis selected from the API response.
  useEffect(() => {
    if (!selectedAnalysis || !userId) {
      setTiffUrl(undefined);
      setLoadingMap(false);
      return;
    }

    let cancelled = false;
    setLoadingMap(true);
    setErrorMap(null);
    setTiffUrl(undefined);

    obterUrlTifAnalise(selectedAnalysis.id_analise)
      .then((result) => {
        if (cancelled || result.id_analise !== selectedAnalysis.id_analise || !result.url) return;
        setTiffUrl(result.url);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMap(errorMessage(error, "tif"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMap(false);
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
    () => setErrorMap("Não foi possível abrir o GeoTIFF. Tente novamente."),
    [],
  );

  return {
    period,
    selectedScenario,
    availableScenarios,
    futureYear,
    tiffUrl,
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
    onDownloadTif: handleDownloadTif,
  };
}
