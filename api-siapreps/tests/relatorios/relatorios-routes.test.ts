import { Router } from "express";
import { describe, expect, it } from "vitest";

import embarcacoesRelatoriosRouter from "../../src/routes/embarcacoes-relatorios-routes";
import missoesRelatoriosRouter from "../../src/routes/missoes-relatorios-routes";
import relatoriosRouter from "../../src/routes/relatorios-routes";
import router from "../../src/routes/router";
import usuariosRelatoriosRouter from "../../src/routes/usuarios-relatorios-routes";

function routeDefinitions(routeRouter: Router) {
  return (routeRouter as any).stack
    .filter((layer: any) => layer.route)
    .flatMap((layer: any) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`,
      ),
    );
}

describe("Rotas de Relatorios", () => {
  it("expoe o CRUD principal", () => {
    expect(routeDefinitions(relatoriosRouter)).toEqual([
      "GET /",
      "GET /usuario/:id",
      "GET /embarcacao/:id",
      "GET /missao/:id",
      "GET /:id",
      "POST /",
      "PUT /:id",
      "DELETE /:id",
    ]);
  });

  it("expoe a listagem de relatorios por embarcacao", () => {
    expect(routeDefinitions(embarcacoesRelatoriosRouter)).toEqual(["GET /"]);
  });

  it("protege as rotas com middleware de autenticacao", () => {
    const routers = [relatoriosRouter, embarcacoesRelatoriosRouter];

    for (const routeRouter of routers) {
      const routeLayers = (routeRouter as any).stack.filter((layer: any) => layer.route);
      // Cada rota tem, no mínimo, checagem de token + handler.
      expect(routeLayers.every((layer: any) => layer.route.stack.length >= 2)).toBe(true);
    }
  });

  it("aplica checagem de propriedade nas operações sobre relatórios existentes", () => {
    const protegidas = new Map<string, number>([
      ["GET /embarcacao/:id", 3],
      ["GET /missao/:id", 3],
      ["GET /:id", 3],
      ["PUT /:id", 3],
      ["DELETE /:id", 3],
    ]);

    const layers = (relatoriosRouter as any).stack.filter((layer: any) => layer.route);

    for (const layer of layers) {
      const method = Object.keys(layer.route.methods)[0].toUpperCase();
      const chave = `${method} ${layer.route.path}`;
      const esperado = protegidas.get(chave);
      if (esperado !== undefined) {
        expect(layer.route.stack.length, chave).toBe(esperado);
      }
    }
  });

  it("monta todos os routers nos caminhos esperados", () => {
    const layers = (router as any).stack;

    for (const path of [
      "/artes-de-pesca",
      "/embarcacoes",
      "/portos",
      "/especies",
      "/fundos",
      "/iscas",
      "/lances",
      "/ocorrencias-lance",
      "/relatorios",
      "/missoes",
      "/usuarios-ativos",
      "/usuarios",
      "/campos-arte-de-pesca",
    ]) {
      expect(layers.some((layer: any) => layer.regexp.test(path))).toBe(true);
    }
  });
});
