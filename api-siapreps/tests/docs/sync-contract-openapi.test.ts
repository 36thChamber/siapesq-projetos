import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const parse = (relativePath: string) => yaml.load(readFileSync(path.join(root, relativePath), "utf8")) as any;

describe("OpenAPI contract de sincronização", () => {
  it("define reconciliação autenticada e chave nos comandos que a exigem", () => {
    const api = parse("docs/openapi.yaml");
    expect(api.paths["/sync/reconciliation/{entity}/{client_record_id}"].get.security).toEqual([{ BearerAuth: [] }]);
    expect(api.paths["/sync/reconciliation/{entity}/{client_record_id}"].get.responses["404"]).toBeDefined();
    expect(api.components.parameters.IdempotencyKey).toMatchObject({ in: "header", required: true, name: "Idempotency-Key" });

    for (const file of [
      "docs/paths/missoes/missoes.yaml",
      "docs/paths/embarcacoes/criar-missao-por-embarcacao.yaml",
      "docs/paths/missoes/criar-lance-por-missao.yaml",
      "docs/paths/incidentes/incidentes-por-missao.yaml",
      "docs/paths/missoes/iniciar-missao.yaml",
      "docs/paths/missoes/finalizar-missao.yaml",
      "docs/paths/lances/recolher-lance.yaml",
    ]) {
      const operation = parse(file);
      const method = file.includes("missoes.yaml") || file.includes("incidentes-por-missao") ? "post" : undefined;
      const candidate = method ? operation[method] : operation;
      expect(JSON.stringify(candidate.parameters)).toContain("IdempotencyKey");
    }
    expect(api.components.schemas.CreateSyncIncidenteRequest).toBeDefined();
    expect(api.components.schemas.CreateOcorrenciaLanceRequest).toBeDefined();
  });
});
