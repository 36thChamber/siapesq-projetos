import { afterEach, describe, expect, it, vi } from "vitest";
import AWS_S3_REPOSITORY from "../../src/repositories/aws-s3-repository";
import AnalisesService from "../../src/services/analises-services";

describe("AnalisesService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AWS_TIFF_BUCKET;
    delete process.env.DAILY_RASTER_CATALOG_KEY;
  });

  it("lista somente a rodada publicada e mantém a data científica", async () => {
    process.env.AWS_TIFF_BUCKET = "analises";
    process.env.DAILY_RASTER_CATALOG_KEY = "catalogo/publicado.json";
    const day = "2026-11-17";
    const revision = "a".repeat(64);
    const root = `rodadas/${revision}/`;
    const objects = Array.from({length: 19}, (_, n) => ["mean", "sd"].map(tipo => ({
      key: `${root}predictions/daily/${day}/sp_${n}/sp_${n}_rf_${day}_${tipo}.tif`, bytes: 100,
    }))).flat().concat(["CHL", "depth", "so", "thetao"].map(variable => ({
      key: `${root}predictors/daily/${day}/${variable}.nc`, bytes: 10,
    })));
    vi.spyOn(AWS_S3_REPOSITORY.prototype, "download_object").mockImplementation(async () =>
      new Response(JSON.stringify({version: 1, revision, data_date: day, objects})).body!);
    const scan = vi.spyOn(AWS_S3_REPOSITORY.prototype, "listar_prefixos");
    const api = new AnalisesService();
    const result = await api.listarAnalises();
    expect(result.data_analise).toBe(day);
    expect(result.objetos).toHaveLength(42);
    expect(scan).not.toHaveBeenCalled();
    objects.pop();
    await expect(api.listarAnalises()).rejects.toThrow("Rodada diária incompleta");
  });

  it("retorna o contrato consumido pelo front com TIFF e NetCDF", async () => {
    process.env.AWS_TIFF_BUCKET = "analises";
    vi.spyOn(AWS_S3_REPOSITORY.prototype, "listar_prefixos").mockImplementation(
      async (_bucket, prefix) =>
        prefix === "predictions/daily/"
          ? ["predictions/daily/2026-08-05/"]
          : ["predictors/daily/2026-08-06/"],
    );
    vi.spyOn(
      AWS_S3_REPOSITORY.prototype,
      "listar_todos_objetos",
    ).mockImplementation(async (_bucket, prefix) =>
      prefix.startsWith("predictions/")
        ? [
            {
              Key: "predictions/daily/2026-08-05/Thunnus_albacares/modelo.tif",
              Size: 100,
            },
          ]
        : [
            {
              Key: "predictors/daily/2026-08-06/thetao.nc",
              Size: 200,
            },
          ],
    );

    const resultado = await new AnalisesService().listarAnalises();

    expect(resultado.data_analise).toBe("2026-08-04");
    expect(resultado.objetos).toEqual([
      expect.objectContaining({
        especie: "Thunnus_albacares",
        origem: "predictions",
      }),
      expect.objectContaining({
        especie: "Temperatura",
        origem: "predictors",
      }),
    ]);
  });

  it("aceita e resolve o download de uma chave NetCDF", async () => {
    process.env.AWS_TIFF_BUCKET = "analises";
    vi.spyOn(AWS_S3_REPOSITORY.prototype, "listar_prefixos").mockImplementation(
      async (_bucket, prefix) =>
        prefix === "predictors/daily/"
          ? ["predictors/daily/2026-08-06/"]
          : [],
    );
    vi.spyOn(
      AWS_S3_REPOSITORY.prototype,
      "listar_todos_objetos",
    ).mockResolvedValue([
      { Key: "predictors/daily/2026-08-06/thetao.nc" },
    ]);
    const stream = new ReadableStream();
    const download = vi
      .spyOn(AWS_S3_REPOSITORY.prototype, "abrir_objeto")
      .mockResolvedValue({ $metadata: {httpStatusCode: 206}, Body: {transformToWebStream: () => stream} as any,
        ContentRange: "bytes 0-15/200", ContentLength: 16, AcceptRanges: "bytes" });

    const resultado = await new AnalisesService().downloadAnalise(
      "predictors/daily/2026-08-06/thetao.nc", "bytes=0-15",
    );

    expect(download).toHaveBeenCalledWith(
      "analises",
      "predictors/daily/2026-08-06/thetao.nc", "bytes=0-15",
    );
    expect(resultado.contentRange).toBe("bytes 0-15/200");
    expect(resultado.contentLength).toBe(16);
    expect(resultado.objectName).toBe(
      "predictors/daily/2026-08-06/thetao.nc",
    );
    expect(resultado.readStream).toBe(stream);
  });
});
