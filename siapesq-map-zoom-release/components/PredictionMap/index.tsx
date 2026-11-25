"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { LockIcon, MonitorIcon } from "@/components/icons";
import MapLayerSwitcher from "@/components/MapLayerSwitcher/MapLayerSwitcher";
import type {
  FutureYear,
  FutureVariant,
  PredictionMapProps,
  PredictionPeriod,
} from "@/services/types/prediction.types";
import { ANNUAL_SCENARIO, FUTURE_SCENARIOS, MONTH_SCENARIOS } from "@/hook/usePredictionMap";
import type { OccurrencePoint } from "@/hook/useSpeciesOccurrence";

// ── dynamic leaflet imports (SSR disabled) ───────────────────────────────────

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const ShowTiffs = dynamic(() => import("@/components/showTiffs"), { ssr: false });
const OccurrenceMarkers = dynamic<{ points: OccurrencePoint[] }>(
  () => import("@/components/LeafletMap/OccurrenceMarkers"),
  { ssr: false },
);

// ── constants ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<PredictionPeriod, string> = {
  annual: "Anual",
  monthly: "Mensal",
  future: "Futuro",
};

const LEGEND_GRADIENT =
  "linear-gradient(to right, rgb(36,4,44), rgb(30,78,196), rgb(36,199,232), rgb(88,253,160), rgb(244,242,104), rgb(255,142,39), rgb(250,50,50))";

// Brazil center
const BRAZIL_CENTER: [number, number] = [-14, -51];
const BRAZIL_ZOOM = 4;

// ── sub-components ───────────────────────────────────────────────────────────

interface PeriodTabsProps {
  active: PredictionPeriod;
  accentColor: string;
  disabled?: boolean;
  onChange: (p: PredictionPeriod) => void;
}

function PeriodTabs({ active, accentColor, disabled, onChange }: PeriodTabsProps) {
  const periods: PredictionPeriod[] = ["annual", "monthly", "future"];
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
      {periods.map((p) => {
        const isActive = p === active;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              isActive
                ? { backgroundColor: accentColor, color: "#FFFFFF" }
                : { color: "#6B7280" }
            }
          >
            {PERIOD_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}

interface ScenarioSelectorProps {
  period: PredictionPeriod;
  selectedScenario: string;
  availableScenarios: string[];
  futureYear: FutureYear;
  accentColor: string;
  disabled?: boolean;
  onScenarioChange: (scenario: string) => void;
  onFutureYearChange: (year: FutureYear) => void;
}

function ScenarioSelector({
  period, selectedScenario, availableScenarios, futureYear, accentColor, disabled,
  onScenarioChange, onFutureYearChange,
}: ScenarioSelectorProps) {
  const available = (scenario: string) => availableScenarios.includes(scenario);
  const buttonStyle = (active: boolean) => active
    ? { backgroundColor: accentColor, color: "#FFFFFF", borderColor: accentColor }
    : { color: "#6B7280", borderColor: "#D1D5DB" };

  if (period === "annual") {
    return available(ANNUAL_SCENARIO) ? null : (
      <p className="mt-2 text-sm text-gray-500">Análise anual ainda não disponível para esta espécie.</p>
    );
  }

  if (period === "monthly") {
    return (
      <div className="flex flex-wrap gap-1.5" aria-label="Meses disponíveis">
        {MONTH_SCENARIOS.map(({ label, scenario }) => (
          <button
            key={scenario}
            type="button"
            disabled={disabled || !available(scenario)}
            onClick={() => onScenarioChange(scenario)}
            className="px-3 py-1.5 rounded-md text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={buttonStyle(selectedScenario === scenario)}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  const variants: FutureVariant[] = ["optimistic", "pessimistic"];
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-gray-600">Ano</p>
        <div className="flex gap-2">
          {([2050, 2100] as const).map((year) => (
            <button key={year} type="button" disabled={disabled} onClick={() => onFutureYearChange(year)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={buttonStyle(futureYear === year)}>
              {year}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-600">Cenário</p>
        <div className="flex gap-2">
          {variants.map((variant) => {
            const item = FUTURE_SCENARIOS.find((option) => option.year === futureYear && option.variant === variant)!;
            return (
              <button key={item.scenario} type="button" disabled={disabled || !available(item.scenario)}
                onClick={() => onScenarioChange(item.scenario)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={buttonStyle(selectedScenario === item.scenario)}>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PredictionLeafletMapProps {
  tiffUrl?: string;
  tiffRenewAt?: number;
  loading?: boolean;
  error?: string | null;
  occurrencePoints: OccurrencePoint[];
  showOccurrences: boolean;
  theme: ReturnType<typeof usePlatformTheme>["theme"];
  onTiffRenderError: () => void;
}

function PredictionLeafletMap({
  tiffUrl,
  tiffRenewAt,
  loading,
  error,
  occurrencePoints,
  showOccurrences,
  theme,
  onTiffRenderError,
}: PredictionLeafletMapProps) {
  const [baseMap, setBaseMap] = useState<"openstreetmap" | "google">("openstreetmap");

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 h-[32rem]">
      <MapLayerSwitcher baseMap={baseMap} setBaseMap={setBaseMap} theme={theme} />
      <MapContainer
        center={BRAZIL_CENTER}
        zoom={BRAZIL_ZOOM}
        className="w-full h-full"
        zoomControl
      >
        {baseMap === "openstreetmap" ? (
          <TileLayer
            key="osm"
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            noWrap
          />
        ) : (
          <TileLayer
            key="google"
            attribution="© Google Maps"
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            maxZoom={20}
            noWrap
          />
        )}
        {tiffUrl ? <ShowTiffs url={tiffUrl} renewAt={tiffRenewAt} opacity={1} onError={onTiffRenderError} /> : null}
        {showOccurrences && occurrencePoints.length > 0 ? <OccurrenceMarkers points={occurrencePoints} /> : null}
      </MapContainer>

      {loading ? (
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-[1000]">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Carregando mapa...</span>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 z-[1000]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="1.5" />
            <path d="M12 7v5M12 16h.01" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-gray-400">Não foi possível carregar o mapa de predição.</span>
        </div>
      ) : null}
    </div>
  );
}

function SuitabilityLegend() {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Adequabilidade ambiental
      </span>
      <div
        className="h-4 w-full rounded-full"
        style={{ background: LEGEND_GRADIENT }}
        aria-label="Escala de adequabilidade: azul escuro (muito baixa) a vermelho (muito alta)"
      />
      <div className="flex justify-between text-[11px] text-gray-400">
        <span>Muito baixa</span>
        <span>Média</span>
        <span>Muito alta</span>
      </div>
    </div>
  );
}

interface DownloadButtonProps {
  disabled: boolean;
  downloading: boolean;
  accentColor: string;
  onDownload: () => Promise<void>;
}

function DownloadButton({ disabled, downloading, accentColor, onDownload }: DownloadButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onDownload()}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: accentColor }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3v13M6 11l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {downloading ? "Baixando..." : "Baixar análise"}
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function PredictionMap({
  period,
  selectedScenario,
  availableScenarios,
  futureYear,
  tiffUrl,
  tiffRenewAt,
  loadingAnalyses,
  loadingTif,
  analysesError,
  tiffError,
  onPeriodChange,
  onScenarioChange,
  onFutureYearChange,
  onRetryAnalyses,
  onRetryTif,
  onTiffRenderError,
  downloadingTif,
  canDownloadTif,
  downloadError,
  onDownloadTif,
  isBlocked = false,
  occurrencePoints = [],
  occurrenceLoading = false,
  occurrenceError = null,
  occurrencesEmpty = false,
  downloadingOccurrences = false,
  onDownloadOccurrences,
  onRetryOccurrences,
  monitoringHref,
}: PredictionMapProps & {
  isBlocked?: boolean;
  occurrencePoints?: OccurrencePoint[];
  occurrenceLoading?: boolean;
  occurrenceError?: string | null;
  occurrencesEmpty?: boolean;
  downloadingOccurrences?: boolean;
  onDownloadOccurrences?: () => Promise<void>;
  onRetryOccurrences?: () => void;
  monitoringHref?: string;
}) {
  const { theme } = usePlatformTheme();
  const accentColor = theme.colors.primary[500];
  const [showOccurrences, setShowOccurrences] = useState(false);

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-5">
      
      {isBlocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-[3px] bg-[#00000086] flex flex-col justify-center items-center rounded-xl">
          <LockIcon size={30} color="white" />
          <p className="text-white font-semibold mt-2">Mapa de Predição Bloqueado</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-semibold" style={{ color: theme.colors.titleColor }}>
          Mapa de Adequabilidade Ambiental
        </h3>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onDownloadOccurrences ? (
              <button
                type="button"
                disabled={isBlocked || occurrenceLoading || downloadingOccurrences}
                onClick={() => void onDownloadOccurrences()}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloadingOccurrences ? "Baixando CSV..." : "Baixar CSV"}
              </button>
            ) : null}
            <DownloadButton
              disabled={isBlocked || !canDownloadTif || downloadingTif}
              downloading={downloadingTif}
              accentColor={accentColor}
              onDownload={onDownloadTif}
            />
          </div>
          {monitoringHref && !isBlocked ? (
            <Link
              href={monitoringHref}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              <span>Ir para área de monitoramento</span>
              <MonitorIcon size={18} color={theme.colors.primary[500]} />
            </Link>
          ) : null}
        </div>
      </div>

      {loadingAnalyses && (
        <p
          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800"
          role="status"
          aria-live="polite"
        >
          Carregando análises...
        </p>
      )}

      {analysesError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {analysesError} <button type="button" className="underline" onClick={onRetryAnalyses}>Tentar novamente</button>
        </p>
      )}

      <PeriodTabs 
        active={period} 
        accentColor={accentColor} 
        onChange={onPeriodChange} 
        disabled={isBlocked || loadingAnalyses || Boolean(analysesError)}
      />

      <ScenarioSelector
        period={period}
        selectedScenario={selectedScenario}
        availableScenarios={availableScenarios}
        futureYear={futureYear}
        accentColor={accentColor}
        onScenarioChange={onScenarioChange}
        onFutureYearChange={onFutureYearChange}
        disabled={isBlocked || loadingAnalyses || Boolean(analysesError)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isBlocked}
          aria-pressed={showOccurrences}
          onClick={() => setShowOccurrences((visible) => !visible)}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={showOccurrences
            ? { borderColor: accentColor, backgroundColor: "#fff", color: accentColor }
            : { borderColor: accentColor, backgroundColor: accentColor, color: "#fff" }}
        >
          {showOccurrences ? "Ocultar pontos de ocorrência" : "Mostrar pontos de ocorrência"}
        </button>
        {showOccurrences && occurrenceLoading ? <span className="text-sm text-gray-500" role="status">Carregando ocorrências...</span> : null}
        {showOccurrences && !occurrenceLoading && !occurrenceError && occurrencesEmpty ? (
          <span className="text-sm text-gray-500" role="status">Nenhuma ocorrência com coordenadas válidas foi encontrada.</span>
        ) : null}
      </div>

      {showOccurrences && occurrenceError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {occurrenceError}{" "}
          {onRetryOccurrences ? <button type="button" className="underline" onClick={onRetryOccurrences}>Tentar novamente</button> : null}
        </p>
      ) : null}

      {tiffError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {tiffError} <button type="button" className="underline" onClick={onRetryTif}>Tentar novamente</button>
        </p>
      )}

      {downloadError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {downloadError}
        </p>
      )}

      {!isBlocked ? (
        <PredictionLeafletMap
          tiffUrl={tiffUrl}
          tiffRenewAt={tiffRenewAt}
          loading={loadingTif}
          error={tiffError}
          occurrencePoints={occurrencePoints}
          showOccurrences={showOccurrences}
          theme={theme}
          onTiffRenderError={onTiffRenderError}
        />
      ) : (
        <div className="w-full rounded-xl border border-gray-200 bg-slate-100 h-[32rem]" />
      )}

      <SuitabilityLegend />
    </div>
  );
}
