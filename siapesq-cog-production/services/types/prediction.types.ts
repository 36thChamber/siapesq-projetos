// services/types/prediction.types.ts

export type PredictionPeriod = "annual" | "monthly" | "future";

export type DownloadFormat = "pdf" | "png" | "csv";

export type FutureYear = 2050 | 2100;

export type FutureVariant = "optimistic" | "pessimistic";

/** Legacy type kept while the unrelated prediction download service remains in the codebase. */
export interface ScenarioOption {
  label: string;
  value: string;
}

export interface PredictionMapProps {
  period: PredictionPeriod;
  selectedScenario: string;
  availableScenarios: string[];
  futureYear: FutureYear;
  tiffUrl?: string;
  tiffRenewAt?: number;
  loadingAnalyses: boolean;
  loadingTif: boolean;
  downloadingTif: boolean;
  canDownloadTif: boolean;
  analysesError: string | null;
  tiffError: string | null;
  downloadError: string | null;
  onPeriodChange: (period: PredictionPeriod) => void;
  onScenarioChange: (scenario: string) => void;
  onFutureYearChange: (year: FutureYear) => void;
  onRetryAnalyses: () => void;
  onRetryTif: () => void;
  onTiffRenderError: () => void;
  onDownloadTif: () => Promise<void>;
}
