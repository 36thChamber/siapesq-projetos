import { describe, expect, it } from "vitest";

import checa_api_key from "../src/middlewares/checa-api-key";
import requireContaAtiva from "../src/middlewares/require-conta-ativa";
import reservatoriosRouter from "../src/routes/reservatorios-router";
import { toReservatorioResponse } from "../src/types/reservatorios-types";

describe("rotas de reservatorio - autenticacao hibrida (ACOLITE-SYNC-002)", () => {
  it.each(["/", "/:id"])(
    "protege GET %s com checa_api_key (x-api-key com fallback para JWT)",
    (path) => {
      const layer = (reservatoriosRouter as any).stack.find(
        (item: any) => item.route?.path === path && item.route?.methods?.get,
      );

      expect(layer?.route?.stack).toHaveLength(3);
      expect(layer.route.stack[0].handle).toBe(checa_api_key);
      expect(layer.route.stack[1].handle).toBe(requireContaAtiva);
    },
  );
});

describe("toReservatorioResponse - areas_alertas (ACOLITE-SYNC-001)", () => {
  const base = {
    id: 1,
    id_usuario: 2,
    nome: "Reservatorio X",
    prioridade: null,
    favorito: false,
    posicoes: null,
    criado_em: new Date("2026-01-01"),
    atualizado_em: null,
    deletado_em: null,
  };

  it("inclui areas_alertas a partir da associacao 'areas' quando carregada", () => {
    const reservatorio: any = {
      ...base,
      areas: [
        {
          id: 10,
          id_reservatorio: 1,
          nome: "Area 1",
          descricao: null,
          tipo: null,
          regiao_alerta: [{ latitude: "1", longitude: "2" }],
          prioridade: null,
          ativa: true,
          criada_automaticamente: false,
          criado_em: new Date("2026-01-01"),
          atualizado_em: null,
          deletado_em: null,
        },
      ],
    };

    const response = toReservatorioResponse(reservatorio);

    expect(response.areas_alertas).toHaveLength(1);
    expect(response.areas_alertas[0]).toMatchObject({
      id: 10,
      id_reservatorio: 1,
      regiao_alerta: [{ latitude: "1", longitude: "2" }],
    });
  });

  it("retorna areas_alertas vazio quando a associacao nao foi carregada", () => {
    const response = toReservatorioResponse({ ...base } as any);

    expect(response.areas_alertas).toEqual([]);
  });
});
