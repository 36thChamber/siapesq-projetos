import { afterEach, describe, expect, it, vi } from "vitest";

import Embarcacoes from "../../src/models/Embarcacoes";
import Missoes from "../../src/models/Missoes";
import Relatorios from "../../src/models/Relatorios";
import Usuarios from "../../src/models/Usuarios";
import RelatoriosServices from "../../src/services/relatorios-services";
import type { RelatorioActor } from "../../src/types/relatorios-types";

const DONO = 2;
const TERCEIRO = 7;

const dono: RelatorioActor = { id_usuario: DONO, administracao: false };
const admin: RelatorioActor = { id_usuario: 1, administracao: true };

function relatorioFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    id_usuario: DONO,
    id_embarcacao: 3,
    id_missao: 4,
    uri: "s3://relatorios/relatorio.pdf",
    tipo: "pdf",
    criado_em: new Date("2026-01-01T00:00:00.000Z"),
    atualizado_em: new Date("2026-01-01T00:00:00.000Z"),
    deletado_em: null,
    update: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Relatorios;
}

function mockRelacionamentosProprios() {
  vi.spyOn(Usuarios, "findByPk").mockResolvedValue({ id: DONO } as Usuarios);
  vi.spyOn(Embarcacoes, "findByPk").mockResolvedValue({
    id: 3,
    id_mestre: DONO,
  } as unknown as Embarcacoes);
  vi.spyOn(Missoes, "findByPk").mockResolvedValue({
    id: 4,
    id_usuario: DONO,
    deletado_em: null,
  } as unknown as Missoes);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelatoriosServices", () => {
  it("cria um relatório válido", async () => {
    const relatorio = relatorioFixture();
    mockRelacionamentosProprios();
    const create = vi.spyOn(Relatorios, "create").mockResolvedValue(relatorio);

    const result = await RelatoriosServices.create(
      {
        id_usuario: DONO,
        id_embarcacao: 3,
        id_missao: 4,
        uri: "s3://relatorios/relatorio.pdf",
        tipo: "pdf",
      },
      dono,
    );

    expect(create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      id: 1,
      id_usuario: DONO,
      id_embarcacao: 3,
      id_missao: 4,
      tipo: "pdf",
    });
  });

  it("força a titularidade do ator ao criar sem administração", async () => {
    const relatorio = relatorioFixture({ id_usuario: DONO });
    mockRelacionamentosProprios();
    const create = vi.spyOn(Relatorios, "create").mockResolvedValue(relatorio);

    await RelatoriosServices.create(
      {
        id_usuario: TERCEIRO,
        id_embarcacao: 3,
        id_missao: 4,
        uri: "s3://relatorios/relatorio.pdf",
      },
      dono,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ id_usuario: DONO }),
    );
  });

  it("rejeita criação vinculada a embarcação de terceiro", async () => {
    vi.spyOn(Usuarios, "findByPk").mockResolvedValue({ id: DONO } as Usuarios);
    vi.spyOn(Embarcacoes, "findByPk").mockResolvedValue({
      id: 3,
      id_mestre: TERCEIRO,
    } as unknown as Embarcacoes);
    const create = vi.spyOn(Relatorios, "create");

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 3,
          id_missao: 4,
          uri: "s3://relatorios/relatorio.pdf",
        },
        dono,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Embarcação 3 não encontrada",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejeita criação vinculada a missão de terceiro", async () => {
    mockRelacionamentosProprios();
    vi.spyOn(Missoes, "findByPk").mockResolvedValue({
      id: 4,
      id_usuario: TERCEIRO,
      deletado_em: null,
    } as unknown as Missoes);
    const create = vi.spyOn(Relatorios, "create");

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 3,
          id_missao: 4,
          uri: "s3://relatorios/relatorio.pdf",
        },
        dono,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Missão 4 não encontrada",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejeita criação para usuário inexistente", async () => {
    vi.spyOn(Usuarios, "findByPk").mockResolvedValue(null);

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: 999,
          id_embarcacao: 3,
          id_missao: 4,
          uri: "s3://relatorios/relatorio.pdf",
        },
        admin,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Usuário 999 não encontrado",
    });
  });

  it("rejeita criação para embarcação inexistente", async () => {
    vi.spyOn(Usuarios, "findByPk").mockResolvedValue({} as Usuarios);
    vi.spyOn(Embarcacoes, "findByPk").mockResolvedValue(null);

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 999,
          id_missao: 4,
          uri: "s3://relatorios/relatorio.pdf",
        },
        admin,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Embarcação 999 não encontrada",
    });
  });

  it("rejeita criação para missão inexistente", async () => {
    vi.spyOn(Usuarios, "findByPk").mockResolvedValue({} as Usuarios);
    vi.spyOn(Embarcacoes, "findByPk").mockResolvedValue({} as Embarcacoes);
    vi.spyOn(Missoes, "findByPk").mockResolvedValue(null);

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 3,
          id_missao: 999,
          uri: "s3://relatorios/relatorio.pdf",
        },
        admin,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Missão 999 não encontrada",
    });
  });

  it("rejeita criação para missão removida", async () => {
    vi.spyOn(Usuarios, "findByPk").mockResolvedValue({} as Usuarios);
    vi.spyOn(Embarcacoes, "findByPk").mockResolvedValue({} as Embarcacoes);
    vi.spyOn(Missoes, "findByPk").mockResolvedValue({
      deletado_em: new Date("2026-01-01T00:00:00.000Z"),
    } as Missoes);

    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 3,
          id_missao: 4,
          uri: "s3://relatorios/relatorio.pdf",
        },
        admin,
      ),
    ).rejects.toMatchObject({
      status: 404,
      message: "Missão 4 não encontrada",
    });
  });

  it("rejeita criação sem uri", async () => {
    await expect(
      RelatoriosServices.create(
        {
          id_usuario: DONO,
          id_embarcacao: 3,
          id_missao: 4,
        } as any,
        admin,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Dados do relatório inválidos",
    });
  });

  it("lista relatórios por missão com paginação", async () => {
    const relatorio = relatorioFixture();
    const findAndCountAll = vi.spyOn(Relatorios, "findAndCountAll").mockResolvedValue({
      rows: [relatorio],
      count: 1,
    } as any);

    const result = await RelatoriosServices.listByMissao(
      { id_missao: 4 },
      { limit: 10, offset: 0 },
      dono,
    );

    expect(findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_missao: 4, id_usuario: DONO },
        limit: 10,
        offset: 0,
      }),
    );
    expect(result.total).toBe(1);
  });

  it("lista sem filtro de proprietário para administração", async () => {
    const findAndCountAll = vi.spyOn(Relatorios, "findAndCountAll").mockResolvedValue({
      rows: [],
      count: 0,
    } as any);

    await RelatoriosServices.listByMissao(
      { id_missao: 4 },
      { limit: 10, offset: 0 },
      admin,
    );

    expect(findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_missao: 4 } }),
    );
  });

  it("retorna 404 ao buscar relatório inexistente", async () => {
    vi.spyOn(Relatorios, "findByPk").mockResolvedValue(null);

    await expect(RelatoriosServices.get({ id: 999 })).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Relatório 999 não encontrado",
    });
  });

  it("atualiza somente os campos informados", async () => {
    const relatorio = relatorioFixture();
    vi.spyOn(Relatorios, "findByPk").mockResolvedValue(relatorio);

    await RelatoriosServices.update({ id: 1 }, { tipo: "csv" }, dono);

    expect(relatorio.update).toHaveBeenCalledWith({ tipo: "csv" });
  });

  it("remove a titularidade do corpo de atualização para não-admin", async () => {
    const relatorio = relatorioFixture();
    vi.spyOn(Relatorios, "findByPk").mockResolvedValue(relatorio);

    await RelatoriosServices.update(
      { id: 1 },
      { tipo: "csv", id_usuario: TERCEIRO },
      dono,
    );

    expect(relatorio.update).toHaveBeenCalledWith({ tipo: "csv" });
  });

  it("remove o relatório logicamente", async () => {
    const relatorio = relatorioFixture();
    vi.spyOn(Relatorios, "findByPk").mockResolvedValue(relatorio);

    await RelatoriosServices.delete({ id: 1 });

    expect(relatorio.destroy).toHaveBeenCalledOnce();
  });

  it("rejeita paginação fora dos limites", async () => {
    await expect(
      RelatoriosServices.list({ limit: 101, offset: 0 }, dono),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Parâmetros de paginação inválidos",
    });
  });
});
