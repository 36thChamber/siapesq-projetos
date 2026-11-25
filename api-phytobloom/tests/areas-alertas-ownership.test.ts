import { afterEach, describe, expect, it, vi } from "vitest";

import http_status from "../src/consts/http-status-enum";
import areasAlertasRouter from "../src/routes/areas-alertas-routes";
import AreasAlertas from "../src/models/AreasAlertas";
import Reservatorios from "../src/models/Reservatorios";
import Alertas from "../src/models/Alertas";

import CriarAreasAlertaUseCase from "../src/use-cases/AreasAlertas/post-area-alerta";
import AtualizarAreasAlertaUseCase from "../src/use-cases/AreasAlertas/update-area-alerta-use-case";
import DeletarAreas_AlertaUseCase from "../src/use-cases/AreasAlertas/delete-area-alerta";
import ListarAreasReservatorioUseCase from "../src/use-cases/AreasAlertas/get-areas-alertas";
import GetAreasAlertaUseCase from "../src/use-cases/AreasAlertas/get-area-alerta-by-id";

const USUARIO_A = 1;
const USUARIO_B = 2;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rotas de areas-alertas exigem autenticacao", () => {
  it("protege GET / com checa_token antes do controller", () => {
    const layer = (areasAlertasRouter as any).stack.find(
      (item: any) =>
        item.route?.path === "/" && item.route?.methods?.get,
    );

    expect(layer?.route?.stack).toHaveLength(3);
  });

  it("protege GET /:id com checa_token antes do controller", () => {
    const layer = (areasAlertasRouter as any).stack.find(
      (item: any) =>
        item.route?.path === "/:id" && item.route?.methods?.get,
    );

    expect(layer?.route?.stack).toHaveLength(3);
  });
});

describe("ListarAreasReservatorioUseCase.executa - ownership do usuario", () => {
  it("filtra as areas por reservatorios do usuario autenticado (join com Reservatorios)", async () => {
    const findAndCountAll = vi
      .spyOn(AreasAlertas, "findAndCountAll")
      .mockResolvedValue({
        rows: [],
        count: 0,
      } as any);

    await ListarAreasReservatorioUseCase.executa({
      limit: 10000,
      offset: 0,
      id_usuario: USUARIO_A,
    });

    expect(findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Reservatorios,
            where: { id_usuario: USUARIO_A },
            required: true,
          }),
        ]),
      }),
    );
  });

  it("nao usa o id de outro usuario para listar as areas", async () => {
    const findAndCountAll = vi
      .spyOn(AreasAlertas, "findAndCountAll")
      .mockResolvedValue({
        rows: [],
        count: 0,
      } as any);

    await ListarAreasReservatorioUseCase.executa({
      limit: 10000,
      offset: 0,
      id_usuario: USUARIO_B,
    });

    expect(findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            where: { id_usuario: USUARIO_B },
          }),
        ]),
      }),
    );

    expect(findAndCountAll).not.toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            where: { id_usuario: USUARIO_A },
          }),
        ]),
      }),
    );
  });
});

describe("GetAreasAlertaUseCase.executa - ownership do usuario", () => {
  it("busca a area por id e valida a propriedade via reservatorio", async () => {
    const area = {
      id: 5,
      id_reservatorio: 10,
      nome: "Area do usuario A",
      descricao: null,
      tipo: "geral",
      regiao_alerta: [
        {
          latitude: "1",
          longitude: "1",
        },
      ],
      prioridade: null,
      ativa: true,
      criada_automaticamente: false,
      criado_em: new Date(),
      atualizado_em: new Date(),
      deletado_em: null,
    } as any;

    const findByPk = vi
      .spyOn(AreasAlertas, "findByPk")
      .mockResolvedValue(area);

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    const resultado = await GetAreasAlertaUseCase.executa({
      id: 5,
      id_usuario: USUARIO_A,
    });

    expect(findByPk).toHaveBeenCalledWith(5);

    expect(resultado).toMatchObject({
      id: 5,
    });
  });

  it("nao permite buscar uma area pertencente a outro usuario", async () => {
    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue({
      id: 5,
      id_reservatorio: 10,
    } as any);

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    await expect(
      GetAreasAlertaUseCase.executa({
        id: 5,
        id_usuario: USUARIO_B,
      }),
    ).rejects.toMatchObject({
      status: http_status.FORBIDDEN,
    });
  });

  it("retorna 404 quando a area nao existe", async () => {
    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue(null);

    await expect(
      GetAreasAlertaUseCase.executa({
        id: 5,
        id_usuario: USUARIO_A,
      }),
    ).rejects.toMatchObject({
      status: http_status.NOT_FOUND,
    });
  });
});

describe("CriarAreasAlertaUseCase.executa - ownership do reservatorio", () => {
  it("rejeita com 403 quando o reservatorio nao pertence ao usuario autenticado", async () => {
    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    await expect(
      CriarAreasAlertaUseCase.executa(
        {
          id_reservatorio: 10,
          nome: "Area maliciosa",
          regiao_alerta: [{ latitude: "1", longitude: "1" }],
        } as any,
        USUARIO_B,
      ),
    ).rejects.toMatchObject({
      status: http_status.FORBIDDEN,
    });
  });

  it("permite a criacao quando o reservatorio pertence ao usuario autenticado", async () => {
    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    vi.spyOn(AreasAlertas, "findOne").mockResolvedValue(null as any);

    vi.spyOn(AreasAlertas, "create").mockResolvedValue({
      id: 99,
      id_reservatorio: 10,
      nome: "Area valida",
      descricao: null,
      tipo: null,
      regiao_alerta: [{ latitude: "1", longitude: "1" }],
      prioridade: null,
      ativa: true,
      criada_automaticamente: false,
      criado_em: new Date(),
      atualizado_em: new Date(),
      deletado_em: null,
    } as any);

    await expect(
      CriarAreasAlertaUseCase.executa(
        {
          id_reservatorio: 10,
          nome: "Area valida",
          regiao_alerta: [{ latitude: "1", longitude: "1" }],
        } as any,
        USUARIO_A,
      ),
    ).resolves.toMatchObject({
      id: 99,
    });
  });
});

describe("AtualizarAreasAlertaUseCase.executa - ownership do reservatorio pai", () => {
  function mockArea() {
    return {
      id: 5,
      id_reservatorio: 10,
      nome: "Area existente",
      update: vi.fn().mockImplementation(function (
        this: any,
        dados: any,
      ) {
        Object.assign(this, dados);
        return Promise.resolve(this);
      }),
    } as any;
  }

  it("rejeita com 403 quando o reservatorio pai nao pertence ao usuario autenticado", async () => {
    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue(mockArea());

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    await expect(
      AtualizarAreasAlertaUseCase.executa(
        {
          id: 5,
          nome: "Tentativa de alteracao",
        } as any,
        USUARIO_B,
      ),
    ).rejects.toMatchObject({
      status: http_status.FORBIDDEN,
    });
  });

  it("permite a atualizacao quando o reservatorio pai pertence ao usuario autenticado", async () => {
    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue(mockArea());

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    vi.spyOn(AreasAlertas, "findOne").mockResolvedValue(null as any);

    await expect(
      AtualizarAreasAlertaUseCase.executa(
        {
          id: 5,
          nome: "Nome atualizado",
        } as any,
        USUARIO_A,
      ),
    ).resolves.toMatchObject({
      nome: "Nome atualizado",
    });
  });
});

describe("DeletarAreas_AlertaUseCase.executa - ownership do reservatorio pai", () => {
  function mockArea() {
    return {
      id: 5,
      id_reservatorio: 10,
      destroy: vi.fn().mockResolvedValue(undefined),
    } as any;
  }

  it("rejeita com 403 quando o reservatorio pai nao pertence ao usuario autenticado", async () => {
    const area = mockArea();

    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue(area);

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    await expect(
      DeletarAreas_AlertaUseCase.executa(
        { id: 5 },
        USUARIO_B,
      ),
    ).rejects.toMatchObject({
      status: http_status.FORBIDDEN,
    });

    expect(area.destroy).not.toHaveBeenCalled();
  });

  it("permite a exclusao quando o reservatorio pai pertence ao usuario autenticado", async () => {
    const area = mockArea();

    vi.spyOn(AreasAlertas, "findByPk").mockResolvedValue(area);

    vi.spyOn(Reservatorios, "findByPk").mockResolvedValue({
      id: 10,
      id_usuario: USUARIO_A,
    } as any);

    vi.spyOn(Alertas, "count").mockResolvedValue(0 as any);

    await expect(
      DeletarAreas_AlertaUseCase.executa(
        { id: 5 },
        USUARIO_A,
      ),
    ).resolves.toBeUndefined();

    expect(area.destroy).toHaveBeenCalledOnce();
  });
});