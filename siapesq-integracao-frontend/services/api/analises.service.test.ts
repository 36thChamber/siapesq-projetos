import { describe, expect, it, vi } from "vitest";
import {
  listarAnalisesDaEspecie,
  obterUrlCsvOcorrencias,
  obterUrlTifAnalise,
} from "./analises.service";
import { get } from "./apiClient";

vi.mock("./apiClient", () => ({ get: vi.fn() }));

describe("serviço de análises GeoTIFF", () => {
  it("usa os endpoints existentes com o ID da espécie e da análise", async () => {
    vi.mocked(get)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id_analise: "A", url: "https://s3.test/A", expiresIn: 900 })
      .mockResolvedValueOnce({
        id_especie: "especie-id",
        cenario: "anual_2015_2024",
        nome_arquivo: "Occurrence.csv",
        url: "https://s3.test/Occurrence.csv",
        expiresIn: 900,
      });
    await expect(listarAnalisesDaEspecie("especie-id")).resolves.toEqual([]);
    await expect(obterUrlTifAnalise("A")).resolves.toMatchObject({ id_analise: "A" });
    await expect(obterUrlCsvOcorrencias("especie-id")).resolves.toMatchObject({
      nome_arquivo: "Occurrence.csv",
    });
    expect(get).toHaveBeenNthCalledWith(1, "/analises/especie/especie-id");
    expect(get).toHaveBeenNthCalledWith(2, "/analises/A/tif");
    expect(get).toHaveBeenNthCalledWith(3, "/analises/especie/especie-id/ocorrencias");
  });
});
