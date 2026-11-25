import { describe, expect, it } from "vitest";
import router from "../../src/routes/router";
import embarcacoesRouter from "../../src/routes/embarcacoes-routes";
import ocorrenciasLanceRouter from "../../src/routes/ocorrencias-lance-routes";
import lancesRouter from "../../src/routes/lances-routes";
import App from "../../src/app";

function routeDefinitions(routeRouter: any) {
  return routeRouter.stack
    .filter((layer: any) => layer.route)
    .flatMap((layer: any) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`,
      ),
    );
}

describe("TASK#28 — Roteamento", () => {
  it("expõe a rota /me/embarcacoes no router principal", () => {
    const layers = (router as any).stack;
    const hasMeRoute = layers.some((l: any) => l.route && l.route.path === "/me/embarcacoes");
    expect(hasMeRoute).toBe(true);
  });

  it("embarcacoesRouter expõe a rota /me e exclui a rota ambígua /:id_usuario", () => {
    const routes = routeDefinitions(embarcacoesRouter);
    expect(routes).toContain("GET /me");
    expect(routes).not.toContain("GET /:id_usuario");
  });

  it("ocorrenciasLanceRouter não possui rotas flat (GET / e POST /)", () => {
    const routes = routeDefinitions(ocorrenciasLanceRouter);
    expect(routes).not.toContain("GET /");
    expect(routes).not.toContain("POST /");
    expect(routes).toContain("GET /:id");
    expect(routes).toContain("PATCH /:id");
    expect(routes).toContain("DELETE /:id");
  });

  it("lancesRouter possui rotas aninhadas de ocorrencias por lanceId", () => {
    const routes = routeDefinitions(lancesRouter);
    expect(routes).toContain("GET /:lanceId/ocorrencias");
    expect(routes).toContain("POST /:lanceId/ocorrencias");
  });
});
