import { readFileSync } from "node:fs";
import { isIsolatedStaging } from "./staging-isolation";

type Storage = { id_analise?: string; nome_dataset: string | null; nome_pasta: string | null; cenario: string | null; nome_arquivo: string | null };
type Entry = Storage & { id_analise: string; source_key: string };
type SpeciesMetadata = { gbifUsageKey?: number; fontes?: { titulo: string; url: string }[]; is_aggregate?: boolean };
type ExtendedEntry = Entry & { variante_dataset?: string; rotulo_dataset?: string };
let catalog: Map<string, ExtendedEntry> | undefined;
let aliases: Record<string, string> = {};
let species: Record<string, SpeciesMetadata> = {};

function loadCatalog() {
  if (catalog) return;
  if (!process.env.STAGING_CATALOG_PATH) throw new Error("Staging catalog missing");
  const parsed = JSON.parse(readFileSync(process.env.STAGING_CATALOG_PATH, "utf8"));
  if (![1, 2].includes(parsed.schema) || !Array.isArray(parsed.analyses)) throw new Error("Invalid staging catalog");
  const entries = new Map<string, ExtendedEntry>();
  for (const entry of parsed.analyses as ExtendedEntry[]) {
    if (!/^[0-9a-f-]{36}$/.test(entry.id_analise) || entries.has(entry.id_analise) ||
        !/^(predicoes_cenarios|predictions)\/[A-Za-z0-9._/-]+_adequabilidade\.tif$/.test(entry.source_key) ||
        entry.source_key.split("/").some(part => !part || part.includes(".."))) throw new Error("Invalid staging mapping");
    entries.set(entry.id_analise, entry);
  }
  aliases = parsed.aliases || {};
  species = Object.fromEntries((parsed.species || []).map((item: SpeciesMetadata & { id_especie: string }) => [item.id_especie, item]));
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (!/^[0-9a-f-]{36}$/.test(alias) || !species[canonical] || aliases[canonical]) throw new Error("Invalid species alias");
  }
  catalog = entries;
}

export function canonicalStagingSpeciesId(id: string): string {
  if (!isIsolatedStaging()) return id;
  loadCatalog();
  return aliases[id] || id;
}

export function stagingSpeciesMetadata(id: string): SpeciesMetadata {
  if (!isIsolatedStaging()) return {};
  loadCatalog();
  const item = species[aliases[id] || id];
  return item ? { gbifUsageKey: item.gbifUsageKey, fontes: item.fontes, is_aggregate: item.is_aggregate } : {};
}

export function stagingAnalysisMetadata(id: string) {
  if (!isIsolatedStaging()) return {};
  loadCatalog();
  const item = catalog!.get(id);
  return item ? { variante_dataset: item.variante_dataset, rotulo_dataset: item.rotulo_dataset } : {};
}

/** Server-owned mapping also covers historical predictions/ paths in the clone. */
export function stagingSourceKey(analysis: Storage): string | undefined {
  if (!isIsolatedStaging()) return undefined;
  loadCatalog();
  const entry = analysis.id_analise ? catalog!.get(analysis.id_analise) : undefined;
  if (!entry || (["nome_dataset", "nome_pasta", "cenario", "nome_arquivo"] as const).some(key => analysis[key] !== entry[key])) {
    throw new Error("Analysis absent from server-owned staging catalog");
  }
  return entry.source_key;
}
