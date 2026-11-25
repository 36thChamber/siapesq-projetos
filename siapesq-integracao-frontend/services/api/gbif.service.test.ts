import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import apiClient from "@/services/api/apiClient";
import {
  getGbifImages,
  getImageListOfSpecies,
  speciesList,
} from "@/services/api/gbif.service";

let http: MockAdapter;
let gbifHttp: MockAdapter;

beforeEach(() => {
  http = new MockAdapter(apiClient);
  gbifHttp = new MockAdapter(axios);
});

afterEach(() => {
  http.restore();
  gbifHttp.restore();
});

describe("getGbifImages", () => {
  it("mapeia somente URLs não vazias da API SIAPESQ", async () => {
    http.onGet("/especies/123/imagens").reply(200, {
      usageKey: 123,
      images: [
        { url: "https://image-1" },
        { url: "" },
        { url: "   " },
        { url: "https://image-2" },
      ],
    });

    await expect(getGbifImages(123)).resolves.toEqual([
      "https://image-1",
      "https://image-2",
    ]);
    expect(http.history.get).toHaveLength(1);
    expect(http.history.get[0].url).toBe("/especies/123/imagens");
    expect(http.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it("trata uma lista vazia como resposta válida", async () => {
    http.onGet("/especies/123/imagens").reply(200, {
      usageKey: 123,
      images: [],
    });

    await expect(getGbifImages(123)).resolves.toEqual([]);
  });

  it("propaga falhas HTTP para permitir retry no provider", async () => {
    http.onGet("/especies/123/imagens").reply(503, {
      message: "Falha ao carregar imagens das espécies.",
    });

    await expect(getGbifImages(123)).rejects.toMatchObject({
      response: expect.objectContaining({ status: 503 }),
    });
  });

  it.each([Number.NaN, 0, -1, 1.5])(
    "rejeita usageKey inválido sem fazer request: %s",
    async (usageKey) => {
      await expect(getGbifImages(usageKey)).rejects.toBeInstanceOf(RangeError);
      expect(http.history.get).toHaveLength(0);
    },
  );
});

describe("getImageListOfSpecies", () => {
  it("isola a falha de uma espécie e preserva as demais imagens", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    speciesList.forEach((species, index) => {
      const usageKey = index + 1;
      gbifHttp
        .onGet("https://api.gbif.org/v1/species/match", {
          params: { name: species.nome_cientifico },
        })
        .reply(200, { usageKey });

      if (index === 0) {
        http.onGet(`/especies/${usageKey}/imagens`).reply(503, {
          message: "Catálogo indisponível",
        });
        return;
      }

      http.onGet(`/especies/${usageKey}/imagens`).reply(200, {
        usageKey,
        images: Array.from({ length: species.imageIndex + 1 }, (_, imageIndex) => ({
          url: `https://image-${usageKey}-${imageIndex}`,
        })),
      });
    });

    const result = await getImageListOfSpecies();

    expect(result).toHaveLength(speciesList.length);
    expect(result[0]).toMatchObject({
      nome_cientifico: speciesList[0].nome_cientifico,
      gbifUsageKey: 1,
      gbifImage: null,
    });
    expect(result.slice(1).every((species) => species.gbifImage !== null)).toBe(
      true,
    );
    expect(consoleError).toHaveBeenCalledWith(
      `Erro ao carregar imagens de ${speciesList[0].nome_cientifico}:`,
      expect.anything(),
    );

    consoleError.mockRestore();
  });
});
