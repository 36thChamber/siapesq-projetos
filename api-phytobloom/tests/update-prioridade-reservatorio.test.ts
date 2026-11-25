import { describe, expect, it } from "vitest";

import http_status from "../src/consts/http-status-enum";
import requireContaAtiva from "../src/middlewares/require-conta-ativa";
import reservatoriosRouter from "../src/routes/reservatorios-router";
import UpdatePrioridadeReservatorioUseCase from "../src/use-cases/reservatorios/update-prioridade-reservatorio";

describe("rota de prioridade de reservatorio", () => {
  it("registra o endpoint PATCH /:id/prioridade", () => {
    const layer = (reservatoriosRouter as any).stack.find(
      (item: any) => item.route?.path === "/:id/prioridade",
    );

    expect(layer?.route?.methods?.patch).toBe(true);
    expect(layer?.route?.stack).toHaveLength(3);
    expect(layer?.route?.stack[1].handle).toBe(requireContaAtiva);
  });
});

describe("UpdatePrioridadeReservatorioUseCase.valida", () => {
  it("aceita uma prioridade inteira positiva", async () => {
    await expect(
      UpdatePrioridadeReservatorioUseCase.valida({ prioridade: 2 }),
    ).resolves.toBeUndefined();
  });

  it.each([0, -1, 1.5])("rejeita a prioridade %s", async (prioridade) => {
    await expect(
      UpdatePrioridadeReservatorioUseCase.valida({ prioridade }),
    ).rejects.toMatchObject({
      message: "Prioridade invalida",
      status: http_status.BAD_REQUEST,
    });
  });

  it("rejeita um corpo sem prioridade", async () => {
    await expect(
      UpdatePrioridadeReservatorioUseCase.valida(
        {} as { prioridade: number },
      ),
    ).rejects.toMatchObject({
      message: "Prioridade invalida",
      status: http_status.BAD_REQUEST,
    });
  });

  it("rejeita propriedades adicionais", async () => {
    await expect(
      UpdatePrioridadeReservatorioUseCase.valida({
        prioridade: 2,
        nome: "Nao permitido",
      } as { prioridade: number }),
    ).rejects.toMatchObject({ status: http_status.BAD_REQUEST });
  });
});
