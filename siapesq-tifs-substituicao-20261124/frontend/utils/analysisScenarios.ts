import type { FutureVariant, FutureYear } from "@/services/types/prediction.types";

export const ANNUAL_SCENARIO = "anual_2015_2024";

export const MONTH_SCENARIOS = [
  { label: "Janeiro", scenario: "mensal_01_janeiro" },
  { label: "Fevereiro", scenario: "mensal_02_fevereiro" },
  { label: "Março", scenario: "mensal_03_marco" },
  { label: "Abril", scenario: "mensal_04_abril" },
  { label: "Maio", scenario: "mensal_05_maio" },
  { label: "Junho", scenario: "mensal_06_junho" },
  { label: "Julho", scenario: "mensal_07_julho" },
  { label: "Agosto", scenario: "mensal_08_agosto" },
  { label: "Setembro", scenario: "mensal_09_setembro" },
  { label: "Outubro", scenario: "mensal_10_outubro" },
  { label: "Novembro", scenario: "mensal_11_novembro" },
  { label: "Dezembro", scenario: "mensal_12_dezembro" },
] as const;

export const FUTURE_SCENARIOS = [
  { year: 2050, variant: "optimistic", label: "Otimista", scenario: "futuro_2050_ssp245" },
  { year: 2050, variant: "pessimistic", label: "Pessimista", scenario: "futuro_2050_ssp585" },
  { year: 2100, variant: "optimistic", label: "Otimista", scenario: "futuro_2100_ssp245" },
  { year: 2100, variant: "pessimistic", label: "Pessimista", scenario: "futuro_2100_ssp585" },
] as const satisfies ReadonlyArray<{
  year: FutureYear;
  variant: FutureVariant;
  label: string;
  scenario: string;
}>;

export function getAnalysisLabel(scenario: string | null | undefined): string | null {
  if (!scenario) return null;
  if (scenario === ANNUAL_SCENARIO) return "Anual";

  const month = MONTH_SCENARIOS.find((item) => item.scenario === scenario);
  if (month) return month.label;

  const future = FUTURE_SCENARIOS.find((item) => item.scenario === scenario);
  if (future) return `Futuro ${future.year} — ${future.label}`;

  return null;
}
