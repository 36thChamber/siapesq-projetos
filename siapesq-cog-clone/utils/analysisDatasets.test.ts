import { describe, expect, it } from "vitest";
import { datasetKey, datasetOptions } from "./analysisDatasets";

describe("dataset variants", () => {
  it("keeps same-month rasters in separate named variants and deduplicates scenarios", () => {
    const entries = [
      { variante_dataset: "annual", rotulo_dataset: "Marinho · modelo anual" },
      { variante_dataset: "monthly", rotulo_dataset: "Marinho · modelo mensal" },
      { variante_dataset: "annual", rotulo_dataset: "Marinho · modelo anual" },
    ];
    expect(datasetOptions(entries)).toEqual([
      { value: "annual", label: "Marinho · modelo anual" },
      { value: "monthly", label: "Marinho · modelo mensal" },
    ]);
    expect(entries.filter(entry => datasetKey(entry) === "annual")).toHaveLength(2);
  });
  it("supports the original API contract without variant fields", () => {
    expect(datasetKey({ nome_dataset: "original" })).toBe("original");
    expect(datasetOptions([{}, {}])).toEqual([{ value: "default", label: "Conjunto principal" }]);
  });
});
