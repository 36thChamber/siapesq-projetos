import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readCatalog: vi.fn<() => Promise<string>>(),
  signUrl: vi.fn<(bucket: string, key: string, expiresIn: number) => Promise<string>>(),
}));

vi.mock("../../repositories/aws-s3-repository", () => ({
  default: class {
    ler_objeto_texto() { return mocks.readCatalog(); }
    assinar_leitura_objeto(bucket: string, key: string, expiresIn: number) {
      return mocks.signUrl(bucket, key, expiresIn);
    }
  },
}));
vi.mock("../../middlewares/checa-token", () => ({
  default: (_req: Request, _res: Response, next: () => void) => next(),
}));

import especiesRouter from "../especies-routes";
import errorHandler from "../../middlewares/error-handler";

let server: Server;
let baseUrl: string;
let originalCatalogKey: string | undefined;

const catalog = JSON.stringify({
  species: [{
    slug: "Acromyrmex_crassispinus",
    scientificName: "Acromyrmex crassispinus",
    images: [{
      key: "species-images/gbif/images/Acromyrmex_crassispinus/photo.jpg",
      creator: "Author",
      license: "CC BY 4.0",
      sourceUrl: "https://source.example/photo.jpg",
      occurrenceKey: 123,
      occurrenceUrl: "https://www.gbif.org/occurrence/123",
    }],
  }],
  byUsageKey: { "5219426": "Acromyrmex_crassispinus" },
});

beforeAll(async () => {
  originalCatalogKey = process.env.AWS_SPECIES_IMAGES_CATALOG_KEY;
  const app = express();
  app.use("/especies", especiesRouter);
  app.use(errorHandler);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (originalCatalogKey === undefined) delete process.env.AWS_SPECIES_IMAGES_CATALOG_KEY;
  else process.env.AWS_SPECIES_IMAGES_CATALOG_KEY = originalCatalogKey;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AWS_SPECIES_IMAGES_CATALOG_KEY = `species-images/gbif/catalog-${crypto.randomUUID()}.json`;
  mocks.readCatalog.mockResolvedValue(catalog);
  mocks.signUrl.mockImplementation(async (_bucket, key, expiresIn) =>
    `https://signed.example/${expiresIn}/${key}`);
});

async function requisita(usageKey: string) {
  return fetch(`${baseUrl}/especies/${usageKey}/imagens`);
}

describe("GET /especies/:usageKey/imagens", () => {
  it("retorna URL assinada com os metadados do catálogo", async () => {
    const response = await requisita("5219426");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      usageKey: 5219426,
      images: [{
        creator: "Author",
        license: "CC BY 4.0",
        sourceUrl: "https://source.example/photo.jpg",
        occurrenceKey: 123,
        occurrenceUrl: "https://www.gbif.org/occurrence/123",
        url: "https://signed.example/3600/species-images/gbif/images/Acromyrmex_crassispinus/photo.jpg",
      }],
    });
    expect(mocks.readCatalog).toHaveBeenCalledOnce();
    expect(mocks.signUrl).toHaveBeenCalledOnce();
  });

  it("retorna array vazio para usageKey válido ausente do catálogo", async () => {
    const response = await requisita("999999999");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ usageKey: 999999999, images: [] });
    expect(mocks.signUrl).not.toHaveBeenCalled();
  });

  it("retorna 400 sem acessar o catálogo para usageKey inválido", async () => {
    const response = await requisita("abc");
    expect(response.status).toBe(400);
    expect(mocks.readCatalog).not.toHaveBeenCalled();
  });

  it("usa o handler global com mensagem segura quando o catálogo falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.readCatalog.mockRejectedValue(Object.assign(new Error("secret AWS details"), { name: "AccessDenied" }));
    const response = await requisita("5219426");
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.message).toBe("Falha ao carregar imagens das espécies.");
    expect(JSON.stringify(body)).not.toContain("secret AWS details");
    expect(body.stack).toBeUndefined();
    consoleError.mockRestore();
  });
});
