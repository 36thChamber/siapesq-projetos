export type DatasetOption = { value: string; label: string };
export type DatasetAnalysis = { variante_dataset?: string; rotulo_dataset?: string; nome_dataset?: string | null };

export function datasetKey(analysis: DatasetAnalysis): string {
  return analysis.variante_dataset || analysis.nome_dataset || "default";
}

export function datasetOptions(analyses: DatasetAnalysis[]): DatasetOption[] {
  const options = new Map<string, DatasetOption>();
  for (const analysis of analyses) {
    const value = datasetKey(analysis);
    if (!options.has(value)) options.set(value, { value, label: analysis.rotulo_dataset || analysis.nome_dataset || "Conjunto principal" });
  }
  return [...options.values()];
}
