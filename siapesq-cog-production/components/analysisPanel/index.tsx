"use client";

import { useState } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { AnalysisOpacityControl } from "@/components/AnalysisOpacityControl";
import { AnaliseGeoRaster, SelectedAnalysis } from "@/components/map/GeoRasterLayer";
import CoordinateToolsPanel from "@/components/coordinateTools/CoordinateToolsPanel";
import type { Coordinate, MapPoint } from "@/components/coordinateTools";
import { ANNUAL_SCENARIO, FUTURE_SCENARIOS, MONTH_SCENARIOS } from "@/utils/analysisScenarios";

interface AnalysisPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  speciesName: string;
  isMeasuring: boolean;
  distanceDisplay: string | number;
  onToggleMeasuring: () => void;

  selectedAnalyses?: SelectedAnalysis[];
  analyses: AnaliseGeoRaster[];
  loadingAnalyses?: boolean;
  analysesError?: string | null;
  onRetryAnalyses?: () => void;
  analysisErrors?: Record<string, string>;
  onRetryAnalysis?: (analysis: AnaliseGeoRaster) => void;
  isBlocked?: boolean;
  loadingAnalysisIds?: Set<string>;
  onToggleAnalysis?: (analysis: AnaliseGeoRaster) => void;
  onUpdateOpacity?: (id: string, opacity: number) => void;
  limitReached?: boolean;
  onClearAnalyses?: () => void;
  onGoBack?: () => void;
  searchMarker: Coordinate | null;
  setSearchMarker: (coord: Coordinate | null) => void;
  points: MapPoint[];
  setPoints: (points: MapPoint[]) => void;
  onFocusPoint: (lat: number, lng: number) => void;
  showSpeciesOccurrences: boolean;
  onToggleSpeciesOccurrences: (show: boolean) => void;
}

interface AccordionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  level?: "primary" | "secondary";
}

function Accordion({ title, open, onToggle, children, level = "primary" }: AccordionProps) {
  const { theme } = usePlatformTheme();
  return (
    <section className="border-b" style={{ borderColor: theme.colors.gray[200] }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 text-left font-semibold ${level === "primary" ? "py-3 text-sm" : "py-2 text-xs"}`}
        style={{ color: level === "primary" ? theme.colors.primary[900] : theme.colors.gray[700] }}
      >
        <span>{title}</span>
        <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="m5.5 7.5 4.5 4 4.5-4" />
        </svg>
      </button>
      {open ? <div className="pb-3">{children}</div> : null}
    </section>
  );
}

export function AnalysisPanel({
  collapsed,
  onToggle,
  speciesName,
  isMeasuring,
  distanceDisplay,
  onToggleMeasuring,
  selectedAnalyses = [],
  analyses,
  loadingAnalyses = false,
  analysesError = null,
  onRetryAnalyses,
  analysisErrors = {},
  onRetryAnalysis,
  isBlocked = false,
  loadingAnalysisIds = new Set(),
  onToggleAnalysis,
  onUpdateOpacity,
  limitReached = false,
  onClearAnalyses,
  onGoBack,
  searchMarker,
  setSearchMarker,
  points,
  setPoints,
  onFocusPoint,
  showSpeciesOccurrences,
  onToggleSpeciesOccurrences,
}: AnalysisPanelProps) {
  const { theme } = usePlatformTheme();
  const [userPointsOpen, setUserPointsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [annualOpen, setAnnualOpen] = useState(true);
  const [futureOpen, setFutureOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

  const isSelected = (id: string) => selectedAnalyses.some((a) => a.id === id);
  const getOpacity = (id: string) => selectedAnalyses.find((a) => a.id === id)?.opacity ?? 1;

  const renderCheckbox = (analysis: AnaliseGeoRaster) => {
    const selected = isSelected(analysis.id);
    const loading = loadingAnalysisIds.has(analysis.id);
    const disabled = isBlocked || (!selected && limitReached);

    return (
      <div key={analysis.id} className="rounded-md px-1 py-1">
        <label
          className={`flex items-center gap-2 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="checkbox"
            className="rounded"
            checked={selected}
            disabled={disabled}
            aria-label={analysis.nome}
            onChange={() => onToggleAnalysis?.(analysis)}
          />
          <span className="min-w-0 flex-1" style={{ color: theme.colors.gray[700] }}>{analysis.nome}</span>
          {loading && (
            <span
              className="shrink-0 text-[10px] animate-pulse"
              role="status"
              style={{ color: theme.colors.primary[500] }}
            >
              Carregando...
            </span>
          )}
        </label>
      </div>
    );
  };

  const annualAnalyses = analyses.filter((analysis) => analysis.cenario === ANNUAL_SCENARIO);
  const futureAnalyses = analyses.filter((analysis) => FUTURE_SCENARIOS.some(({ scenario }) => scenario === analysis.cenario));
  const monthlyAnalyses = analyses.filter((analysis) => MONTH_SCENARIOS.some(({ scenario }) => scenario === analysis.cenario));

  const activeLayer = (analysis: SelectedAnalysis) => {
    const loading = loadingAnalysisIds.has(analysis.id);
    return (
      <div key={analysis.id} className="rounded-lg border p-2" style={{ borderColor: theme.colors.gray[200] }}>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked
            disabled={isBlocked}
            aria-label={`Remover ${analysis.nome} do mapa`}
            className="mt-0.5 rounded"
            onChange={() => onToggleAnalysis?.(analysis)}
          />
          <span className="min-w-0 flex-1 font-medium" style={{ color: theme.colors.gray[700] }}>{analysis.nome}</span>
          {loading ? <span className="shrink-0 text-[10px] animate-pulse" role="status">Carregando...</span> : null}
        </div>
        {analysisErrors[analysis.id] ? (
          <div className="mt-1 pl-5 text-[11px] text-red-700" role="alert">
            <p>{analysisErrors[analysis.id]}</p>
            <button type="button" className="underline" onClick={() => onRetryAnalysis?.(analysis)} disabled={loading || isBlocked}>
              Tentar novamente
            </button>
          </div>
        ) : null}
        {onUpdateOpacity ? (
          <AnalysisOpacityControl analysisId={analysis.id} analysisName={analysis.nome} label="Transparência" opacity={getOpacity(analysis.id)} onChange={onUpdateOpacity} />
        ) : null}
      </div>
    );
  };

  const optionGrid = (options: AnaliseGeoRaster[], grid = false) => (
    options.length ? (
      <div className={grid ? "grid grid-cols-2 gap-x-2" : "space-y-1"}>
        {options.map((analysis) => renderCheckbox(analysis))}
      </div>
    ) : <p className="px-1 text-xs" style={{ color: theme.colors.gray[500] }}>Nenhuma análise disponível.</p>
  );

  return (
    <div className="flex h-full min-h-0 flex-col text-[13px]" style={{ backgroundColor: theme.colors.background }}>
      <div className={`flex shrink-0 items-center ${collapsed ? "justify-center p-2" : "justify-between border-b px-3 py-3"}`} style={{ borderColor: theme.colors.gray[200] }}>
        {!collapsed ? <h2 className="truncate font-semibold" style={{ color: theme.colors.primary[900] }}>{speciesName}</h2> : null}
        <button type="button" onClick={onToggle} className="p-1" aria-label={collapsed ? "Abrir painel" : "Fechar painel"}>
          <svg className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3">
            <label className="flex cursor-pointer items-center gap-2 border-b py-3 text-sm font-semibold" style={{ borderColor: theme.colors.gray[200], color: theme.colors.primary[900] }}>
              <input
                type="checkbox"
                checked={showSpeciesOccurrences}
                onChange={(event) => onToggleSpeciesOccurrences(event.target.checked)}
                aria-label="Mostrar pontos de ocorrência"
              />
              <span>Mostrar pontos de ocorrência</span>
            </label>

            <Accordion title="Meus pontos" open={userPointsOpen} onToggle={() => setUserPointsOpen((value) => !value)}>
              <CoordinateToolsPanel embedded searchMarker={searchMarker} setSearchMarker={setSearchMarker} points={points} setPoints={setPoints} onFocusPoint={onFocusPoint} />
            </Accordion>

            <Accordion title="Análise ambiental" open={analysisOpen} onToggle={() => setAnalysisOpen((value) => !value)}>
              {loadingAnalyses ? <p className="mb-2 text-xs" role="status">Carregando análises...</p> : null}
              {analysesError ? (
                <p className="mb-2 text-xs text-red-700" role="alert">
                  {analysesError} <button type="button" className="underline" onClick={onRetryAnalyses}>Tentar novamente</button>
                </p>
              ) : null}

              <div className="mb-3 rounded-lg border p-2" style={{ borderColor: theme.colors.gray[200] }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold" style={{ color: theme.colors.primary[900] }}>Camadas ativas ({selectedAnalyses.length}/3)</p>
                  {selectedAnalyses.length > 0 ? <button type="button" className="shrink-0 text-[11px] underline" onClick={onClearAnalyses} disabled={isBlocked}>Limpar tudo</button> : null}
                </div>
                {selectedAnalyses.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAnalyses.map((analysis) => (
                      <span key={analysis.id} className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[11px]" style={{ color: theme.colors.primary[900], backgroundColor: theme.colors.gray[200] }}>
                        <span className="truncate">{analysis.nome}</span>
                        <button type="button" aria-label={`Remover camada ${analysis.nome}`} className="shrink-0 font-bold" onClick={() => onToggleAnalysis?.(analysis)} disabled={isBlocked}>×</button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs" style={{ color: theme.colors.gray[500] }}>Nenhuma camada selecionada.</p>}
              </div>

              <button
                type="button"
                onClick={onToggleMeasuring}
                className="mb-3 w-full rounded-lg border p-2 text-left transition-colors"
                style={{ borderColor: isMeasuring ? "#DC2626" : theme.colors.gray[300], backgroundColor: isMeasuring ? "#FEE2E2" : "transparent" }}
              >
                <span className="block font-medium" style={{ color: isMeasuring ? "#991B1B" : theme.colors.primary[900] }}>{isMeasuring ? "Cancelar medição" : "Medir distância"}</span>
                <span className="text-[10px]" style={{ color: isMeasuring ? "#B91C1C" : theme.colors.gray[500] }}>{isMeasuring ? `${distanceDisplay} km` : "Clique no mapa para medir"}</span>
              </button>

              {limitReached ? <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800" role="status">Você pode visualizar até 3 camadas simultaneamente.</p> : null}

              <div className="mb-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: theme.colors.gray[500] }}>Camadas selecionadas</p>
                {selectedAnalyses.length ? <div className="space-y-2">{selectedAnalyses.map(activeLayer)}</div> : <p className="text-xs" style={{ color: theme.colors.gray[500] }}>Selecione uma análise abaixo.</p>}
              </div>

              <Accordion title="Anual" level="secondary" open={annualOpen} onToggle={() => setAnnualOpen((value) => !value)}>{optionGrid(annualAnalyses)}</Accordion>
              <Accordion title="Futuro" level="secondary" open={futureOpen} onToggle={() => setFutureOpen((value) => !value)}>
                {[2050, 2100].map((year) => (
                  <div key={year} className="mb-2 last:mb-0">
                    <p className="mb-1 px-1 text-[11px] font-semibold" style={{ color: theme.colors.gray[500] }}>{year}</p>
                    {optionGrid(futureAnalyses.filter((analysis) => FUTURE_SCENARIOS.some((item) => item.year === year && item.scenario === analysis.cenario)))}
                  </div>
                ))}
              </Accordion>
              <Accordion title="Mensal" level="secondary" open={monthlyOpen} onToggle={() => setMonthlyOpen((value) => !value)}>{optionGrid(monthlyAnalyses, true)}</Accordion>
              {!loadingAnalyses && !analysesError && analyses.length === 0 ? <p className="mt-2 text-xs" style={{ color: theme.colors.gray[500] }}>Nenhuma análise disponível para esta espécie.</p> : null}
            </Accordion>
          </div>

          {onGoBack ? (
            <div className="shrink-0 border-t p-3" style={{ borderColor: theme.colors.gray[200] }}>
              <button type="button" onClick={onGoBack} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left font-medium hover:bg-black/5" style={{ color: theme.colors.primary[900] }}>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
                <span>Voltar para página anterior</span>
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
