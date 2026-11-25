import { describe, expect, it } from "vitest";
import { getAnalysisLabel, MONTH_SCENARIOS } from "./analysisScenarios";

const labelCases: Array<[string, string]> = [
  ["anual_2015_2024", "Anual"],
  ["futuro_2050_ssp245", "Futuro 2050 — Otimista"],
  ["futuro_2050_ssp585", "Futuro 2050 — Pessimista"],
  ["futuro_2100_ssp245", "Futuro 2100 — Otimista"],
  ["futuro_2100_ssp585", "Futuro 2100 — Pessimista"],
  ...MONTH_SCENARIOS.map(({ scenario, label }): [string, string] => [scenario, label]),
];

describe("getAnalysisLabel", () => {
  it.each(labelCases)("translates %s to %s", (scenario, label) => {
    expect(getAnalysisLabel(scenario)).toBe(label);
  });

  it("does not expose unknown technical identifiers as labels", () => {
    expect(getAnalysisLabel("comuns-rs-es")).toBeNull();
    expect(getAnalysisLabel(null)).toBeNull();
  });
});
