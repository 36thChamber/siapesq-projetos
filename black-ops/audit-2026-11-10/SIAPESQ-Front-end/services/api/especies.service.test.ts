import { afterEach, beforeEach, describe, expect, it } from "vitest";
import MockAdapter from "axios-mock-adapter";

import apiClient from "@/services/api/apiClient";
import { buscarEspeciePorId } from "@/services/api/especies.service";
import {
  getSpeciesAccessErrorMessage,
  isSpeciesAccessLimitError,
} from "@/services/types/plano.types";

let http: MockAdapter;

beforeEach(() => {
  http = new MockAdapter(apiClient);
});

afterEach(() => {
  http.restore();
});

describe("buscarEspeciePorId", () => {
  it("usa o BFF sem enviar Authorization manual", async () => {
    http.onGet("/especies/especie-1").reply(200, {
      id_especie: "especie-1",
      nome: "Espécie teste",
      nome_cientifico: "Species test",
    });

    await expect(buscarEspeciePorId("especie-1")).resolves.toMatchObject({
      id_especie: "especie-1",
    });

    expect(http.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it("preserva o 403 e a mensagem de quota para tratamento pela interface", async () => {
    const message =
      "Limite de visualizações de espécies do seu plano foi atingido.";
    http.onGet("/especies/especie-2").reply(403, { message });

    let capturedError: unknown;
    try {
      await buscarEspeciePorId("especie-2");
    } catch (error) {
      capturedError = error;
    }

    expect(isSpeciesAccessLimitError(capturedError)).toBe(true);
    expect(getSpeciesAccessErrorMessage(capturedError)).toBe(message);
  });
});
