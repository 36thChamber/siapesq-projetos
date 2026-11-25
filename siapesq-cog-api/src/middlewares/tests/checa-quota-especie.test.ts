import { NextFunction, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verificaMock } = vi.hoisted(() => ({ verificaMock: vi.fn() }));

vi.mock("../../utils/quota-especie", () => ({
  verificaQuotaEspecie: verificaMock,
}));
vi.mock("../../models/Assinaturas", () => ({
  default: { sequelize: { transaction: (cb: any) => cb({}) } },
}));

import checa_quota_especie from "../checa-quota-especie";

function criaResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { json, response: { status } as unknown as Response, status };
}

describe("checa_quota_especie", () => {
  const next = vi.fn() as NextFunction;

  beforeEach(() => {
    verificaMock.mockReset();
    vi.mocked(next).mockReset();
  });

  it("falha com 500 quando o param da rota não bate", async () => {
    const middleware = checa_quota_especie("id");
    const { response, status } = criaResponse();

    await middleware({ params: {}, id_usuario: "u1" } as any, response, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(verificaMock).not.toHaveBeenCalled();
  });

  it("libera admin sem consultar quota", async () => {
    const middleware = checa_quota_especie("id");
    const { response, status } = criaResponse();

    await middleware(
      { params: { id: "e1" }, id_usuario: "u1", tipo_usuario: "ADMIN" } as any,
      response,
      next,
    );

    expect(verificaMock).not.toHaveBeenCalled();
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("devolve 403 nos dois casos de bloqueio", async () => {
    const middleware = checa_quota_especie("id");

    for (const motivo of ["bloqueado_sem_plano", "bloqueado_limite"] as const) {
      verificaMock.mockResolvedValueOnce(motivo);
      const { response, status } = criaResponse();

      await middleware(
        { params: { id: "e1" }, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
        response,
        next,
      );

      expect(status).toHaveBeenCalledWith(403);
    }
    expect(next).not.toHaveBeenCalled();
  });

  it("libera quando a quota autoriza", async () => {
    verificaMock.mockResolvedValueOnce("liberado");
    const middleware = checa_quota_especie("id");
    const { response, status } = criaResponse();

    await middleware(
      { params: { id: "e1" }, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
      response,
      next,
    );

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});