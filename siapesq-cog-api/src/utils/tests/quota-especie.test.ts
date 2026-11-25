import { beforeEach, describe, expect, it, vi } from "vitest";

const { findAssinaturaMock, findVisMock, countVisMock, createVisMock } =
  vi.hoisted(() => ({
    findAssinaturaMock: vi.fn(),
    findVisMock: vi.fn(),
    countVisMock: vi.fn(),
    createVisMock: vi.fn(),
  }));

vi.mock("../../models/Assinaturas", () => ({
  default: { findOne: findAssinaturaMock },
}));
vi.mock("../../models/Planos", () => ({ default: {} }));
vi.mock("../../models/VisualizacoesEspecies", () => ({
  default: {
    findOne: findVisMock,
    count: countVisMock,
    create: createVisMock,
  },
}));

import { verificaQuotaEspecie } from "../quota-especie";

const idUsuario = "u1";
const idEspecie = "e1";

describe("verificaQuotaEspecie", () => {
  beforeEach(() => {
    findAssinaturaMock.mockReset();
    findVisMock.mockReset();
    countVisMock.mockReset();
    createVisMock.mockReset();
  });

  it("bloqueia quando não há assinatura ou plano associado", async () => {
    findAssinaturaMock.mockResolvedValueOnce(null);
    await expect(verificaQuotaEspecie(idUsuario, idEspecie)).resolves.toBe(
      "bloqueado_sem_plano",
    );

    findAssinaturaMock.mockResolvedValueOnce({ plano: null });
    await expect(verificaQuotaEspecie(idUsuario, idEspecie)).resolves.toBe(
      "bloqueado_sem_plano",
    );
  });

  it("libera sem consumir quota quando o plano é ilimitado", async () => {
    findAssinaturaMock.mockResolvedValueOnce({
      plano: { especies_ilimitadas: true, especies_disponiveis: 0 },
    });

    await expect(verificaQuotaEspecie(idUsuario, idEspecie)).resolves.toBe(
      "liberado",
    );
    expect(createVisMock).not.toHaveBeenCalled();
  });

  it("libera sem consumir nova quota quando já visualizada", async () => {
    findAssinaturaMock.mockResolvedValueOnce({
      plano: { especies_ilimitadas: false, especies_disponiveis: 3 },
    });
    findVisMock.mockResolvedValueOnce({
      id_usuario: idUsuario,
      id_especie: idEspecie,
    });

    await expect(verificaQuotaEspecie(idUsuario, idEspecie)).resolves.toBe(
      "liberado",
    );
    expect(createVisMock).not.toHaveBeenCalled();
  });

  it("registra nova visualização quando há quota e bloqueia no limite", async () => {
    findAssinaturaMock.mockResolvedValueOnce({
      plano: { especies_ilimitadas: false, especies_disponiveis: 3 },
    });
    findVisMock.mockResolvedValueOnce(null);
    countVisMock.mockResolvedValueOnce(1);
    createVisMock.mockResolvedValueOnce({});

    await expect(verificaQuotaEspecie(idUsuario, idEspecie)).resolves.toBe(
      "liberado",
    );
    expect(createVisMock).toHaveBeenCalledOnce();

    findAssinaturaMock.mockResolvedValueOnce({
      plano: { especies_ilimitadas: false, especies_disponiveis: 3 },
    });
    findVisMock.mockResolvedValueOnce(null);
    countVisMock.mockResolvedValueOnce(3);

    await expect(verificaQuotaEspecie(idUsuario, "e2")).resolves.toBe(
      "bloqueado_limite",
    );
  });
});