import fs from "node:fs";
import path from "node:path";
import YAML from "js-yaml";
import { describe, expect, it } from "vitest";

const paths = [
  "docs/openapi.yaml",
  "docs/paths/missoes/iniciar-missao.yaml",
  "docs/paths/missoes/finalizar-missao.yaml",
  "docs/paths/missoes/criar-lance-por-missao.yaml",
  "docs/paths/lances/recolher-lance.yaml",
  "docs/components/schemas/missoes/missao.yaml",
  "docs/components/schemas/lances/lance.yaml",
  "docs/components/schemas/lances/create-lance-request.yaml",
];

describe("OpenAPI de timestamps observados", () => {
  it("carrega os documentos YAML e publica os quatro campos de evento", () => {
    const documents = new Map(paths.map((relativePath) => [
      relativePath,
      YAML.load(fs.readFileSync(path.resolve(relativePath), "utf8")) as any,
    ]));
    const missao = documents.get("docs/components/schemas/missoes/missao.yaml");
    const lance = documents.get("docs/components/schemas/lances/lance.yaml");
    const createLance = documents.get("docs/components/schemas/lances/create-lance-request.yaml");
    const api = documents.get("docs/openapi.yaml");

    expect(missao.properties).toHaveProperty("iniciou_em_observado");
    expect(missao.properties).toHaveProperty("terminou_em_observado");
    expect(lance.properties).toHaveProperty("lancado_em_observado");
    expect(lance.properties).toHaveProperty("recolhido_em_observado");
    expect(createLance.properties.lancado_em_observado.format).toBe("date-time");
    expect(api.paths["/missoes/{id}/iniciar"].patch).toBeDefined();
    expect(api.paths["/missoes/{id}/finalizar"].patch).toBeDefined();
    expect(api.paths["/lances/{id}/recolher"].post).toBeDefined();
    expect(api.components.schemas.CreateLanceRequest).toBeDefined();
    expect(api.components.schemas.LanceResponse).toBeDefined();
  });
});
