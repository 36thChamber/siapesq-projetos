import fs from "fs";
import path from "path";

import yaml from "js-yaml";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import App from "../../src/app";
import Missoes from "../../src/models/Missoes";
import incidentesRouter from "../../src/routes/incidentes-routes";
import missoesRouter from "../../src/routes/missoes-routes";

function routeDefinitions(routeRouter: any) {
  return routeRouter.stack
    .filter((layer: any) => layer.route)
    .flatMap((layer: any) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`,
      ),
    );
}

function routeLayer(routeRouter: any, method: string, routePath: string) {
  return routeRouter.stack.find(
    (layer: any) =>
      layer.route?.path === routePath && layer.route.methods[method],
  );
}

function responseMock() {
  const response: any = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe("SIAP-SEC-003 — rotas de incidentes", () => {
  it("não expõe GET /incidentes e preserva PATCH /incidentes/:id", () => {
    const routes = routeDefinitions(incidentesRouter);

    expect(routes).not.toContain("GET /");
    expect(routes).toContain("PATCH /:id");
  });

  it("responde 404 para GET /incidentes no servidor HTTP", async () => {
    const response = await request(new App().server).get("/incidentes");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Rota não encontrada",
      },
    });
  });

  it("preserva GET/POST de incidentes aninhados por missão", () => {
    const routes = routeDefinitions(missoesRouter);

    expect(routes).toContain("GET /:missaoId/incidentes");
    expect(routes).toContain("POST /:missaoId/incidentes");
  });

  it("bloqueia com 404 a listagem aninhada de missão de terceiro", async () => {
    vi.spyOn(Missoes, "findByPk").mockResolvedValue({
      id: 23,
      id_usuario: 2,
    } as any);
    const layer = routeLayer(
      missoesRouter,
      "get",
      "/:missaoId/incidentes",
    );
    const ownership = layer.route.stack[1].handle;
    const req: any = {
      params: { missaoId: "23" },
      auth: { id_usuario: 1, administracao: false },
    };
    const res = responseMock();
    const next = vi.fn();

    await ownership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "recurso não encontrado",
    });
  });

  it("permite que o dono prossiga na listagem aninhada", async () => {
    vi.spyOn(Missoes, "findByPk").mockResolvedValue({
      id: 23,
      id_usuario: 1,
    } as any);
    const layer = routeLayer(
      missoesRouter,
      "get",
      "/:missaoId/incidentes",
    );
    const ownership = layer.route.stack[1].handle;
    const req: any = {
      params: { missaoId: "23" },
      auth: { id_usuario: 1, administracao: false },
    };
    const res = responseMock();
    const next = vi.fn();

    await ownership(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("mantém GET /incidentes ausente do OpenAPI fonte e do bundle servido", () => {
    for (const file of ["docs/openapi.yaml", "docs/openapi-bundled.yaml"]) {
      const document = yaml.load(
        fs.readFileSync(path.join(process.cwd(), file), "utf8"),
      ) as { paths?: Record<string, unknown> };

      expect(document.paths).not.toHaveProperty("/incidentes");
      expect(document.paths).toHaveProperty(
        "/missoes/{missaoId}/incidentes",
      );
    }
  });
});
