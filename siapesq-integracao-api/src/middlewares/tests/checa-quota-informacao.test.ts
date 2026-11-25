import { NextFunction, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { verificaMock, findByPkMock } = vi.hoisted(() => ({
  verificaMock: vi.fn(),
  findByPkMock: vi.fn(),
}));

vi.mock("../../utils/quota-especie", () => ({
  verificaQuotaEspecie: verificaMock,
}));
vi.mock("../../models/InformacoesEspecies", () => ({
  default: { findByPk: findByPkMock },
}));
vi.mock("../../models/Assinaturas", () => ({
  default: { sequelize: { transaction: (cb: any) => cb({}) } },
}));

import checa_quota_informacao from "../checa-quota-informacao";

function criaResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { json, response: { status } as unknown as Response, status };
}

describe("checa_quota_informacao", () => {
  const next = vi.fn() as NextFunction;

  beforeEach(() => {
    verificaMock.mockReset();
    findByPkMock.mockReset();
    vi.mocked(next).mockReset();
  });

  it("devolve 400 sem id e 404 quando a informação não existe", async () => {
    const middleware = checa_quota_informacao();

    const r1 = criaResponse();
    await middleware(
      { params: {}, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
      r1.response,
      next,
    );
    expect(r1.status).toHaveBeenCalledWith(400);

    findByPkMock.mockResolvedValueOnce(null);
    const r2 = criaResponse();
    await middleware(
      { params: { id: "i1" }, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
      r2.response,
      next,
    );
    expect(r2.status).toHaveBeenCalledWith(404);
  });

  it("aplica quota usando o id_especie da informação", async () => {
    findByPkMock.mockResolvedValueOnce({ id_especie: "e1" });
    verificaMock.mockResolvedValueOnce("liberado");

    const middleware = checa_quota_informacao();
    const { response } = criaResponse();

    await middleware(
      { params: { id: "i1" }, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
      response,
      next,
    );

    expect(verificaMock).toHaveBeenCalledWith("u1", "e1", expect.anything());
    expect(next).toHaveBeenCalledOnce();
  });

  it("devolve 403 quando o quota bloqueia", async () => {
    findByPkMock.mockResolvedValueOnce({ id_especie: "e1" });
    verificaMock.mockResolvedValueOnce("bloqueado_sem_plano");

    const middleware = checa_quota_informacao();
    const { response, status } = criaResponse();

    await middleware(
      { params: { id: "i1" }, id_usuario: "u1", tipo_usuario: "PADRAO" } as any,
      response,
      next,
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});