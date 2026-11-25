import { describe, expect, it } from "vitest";

import http_status from "../src/consts/http-status-enum";
import requireContaAtiva from "../src/middlewares/require-conta-ativa";
import reservatoriosRouter from "../src/routes/reservatorios-router";
import UpdateFavoritoReservatorioUseCase from "../src/use-cases/reservatorios/update-favorito-reservatorio";

describe("rota de favorito de reservatorio", () => {
  it("registra o endpoint PATCH /:id/favorito", () => {
    const layer = (reservatoriosRouter as any).stack.find(
      (item: any) => item.route?.path === "/:id/favorito",
    );

    expect(layer?.route?.methods?.patch).toBe(true);
    expect(layer?.route?.stack).toHaveLength(3);
    expect(layer?.route?.stack[1].handle).toBe(requireContaAtiva);
  });
});

describe("UpdateFavoritoReservatorioUseCase.valida", () => {
  it.each([true, false])("aceita favorito igual a %s", async (favorito) => {
    await expect(
      UpdateFavoritoReservatorioUseCase.valida({ favorito }),
    ).resolves.toBeUndefined();
  });

  it("rejeita favorito ausente ou invalido", async () => {
    await expect(
      UpdateFavoritoReservatorioUseCase.valida(
        {} as { favorito: boolean },
      ),
    ).rejects.toMatchObject({
      message: "Favorito invalido",
      status: http_status.BAD_REQUEST,
    });

    await expect(
      UpdateFavoritoReservatorioUseCase.valida({ favorito: "sim" } as any),
    ).rejects.toMatchObject({
      message: "Favorito invalido",
      status: http_status.BAD_REQUEST,
    });
  });
});
