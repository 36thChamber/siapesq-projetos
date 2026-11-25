// services/api/predictions.service.ts
import apiClient from "@/services/api/apiClient";
import type {
  DownloadFormat,
  PredictionPeriod,
  ScenarioOption,
} from "@/services/types/prediction.types";

export async function getPredictionScenarios(
  specieId: string,
  period: PredictionPeriod,
  subPeriod: string | null,
): Promise<ScenarioOption[]> {
  const config = {
    params: { period, ...(subPeriod ? { subPeriod } : {}) },
  };
  const response = await apiClient.get(
    `/predictions/${specieId}/scenarios`,
    config,
  );
  return response.data;
}

export async function getPredictionTiffUrl(
  specieId: string,
  period: PredictionPeriod,
  subPeriod: string | null,
  scenario: string,
): Promise<string> {
  const config = {
    params: { period, ...(subPeriod ? { subPeriod } : {}), scenario },
  };
  const response = await apiClient.get(
    `/predictions/${specieId}/map`,
    config,
  );
  return response.data.url as string;
}

export async function downloadPrediction(
  specieId: string,
  period: PredictionPeriod,
  subPeriod: string | null,
  scenario: string,
  format: DownloadFormat,
): Promise<Blob> {
  const config = {
    params: { period, ...(subPeriod ? { subPeriod } : {}), scenario, format },
    responseType: "blob" as const,
  };
  const response = await apiClient.get(
    `/predictions/${specieId}/download`,
    config,
  );
  return response.data as Blob;
}
