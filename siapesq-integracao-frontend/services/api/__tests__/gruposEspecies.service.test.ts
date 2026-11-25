import { beforeEach, describe, expect, it, vi } from "vitest";

import { get } from "@/services/api/apiClient";
import {
  listarEspeciesDoGrupo,
  listarGruposEspecies,
} from "@/services/api/gruposEspecies.service";

vi.mock("@/services/api/apiClient", () => ({
  get: vi.fn(),
  post: vi.fn(),
}));

const getMock = vi.mocked(get);

describe("listarEspeciesDoGrupo", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("usa o BFF e extrai as espécies da resposta aninhada do backend", async () => {
    getMock.mockResolvedValue({
      grupoEspecie: {
        id_gruposespecies: "grupo-1",
        nome: "Mamíferos",
        criado_em: "2026-01-01T00:00:00.000Z",
        atualizado_em: "2026-01-01T00:00:00.000Z",
        especies: [
          {
            id_especie: "especie-1",
            nome: "Lobo-guará",
            nome_cientifico: "Chrysocyon brachyurus",
          },
        ],
      },
    } as never);

    const especies = await listarEspeciesDoGrupo("grupo-1");

    expect(getMock).toHaveBeenCalledWith("/gruposEspecies/grupo-1/especies");
    expect(especies).toEqual([
      expect.objectContaining({
        id_especie: "especie-1",
        informacoes: [],
        informacoesEspecies: [],
      }),
    ]);
  });
});

describe("listarGruposEspecies", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("extrai a lista completa do JSON devolvido pelo BFF", async () => {
    const grupos = Array.from({ length: 250 }, (_, i) => ({
      id_gruposespecies: String(i),
      nome: `Planta ${i}`,
      quantidade: i,
    }));
    getMock.mockResolvedValue({ gruposEspecies: grupos } as never);

    const resultado = await listarGruposEspecies();

    expect(getMock).toHaveBeenCalledWith("/gruposEspecies");
    expect(resultado).toEqual(grupos);
  });
});
