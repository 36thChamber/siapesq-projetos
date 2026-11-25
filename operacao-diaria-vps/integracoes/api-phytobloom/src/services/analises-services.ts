import { dailyRasterStorage } from "../repositories/daily-raster-storage";
import Repository from "../repositories/aws-s3-repository";
import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { ListaAnalisesResponse } from "../types/analises-types";
import http_status from "../consts/http-status-enum";

function compararAquisicao(a: string, b: string) {
  const formato = /^\d+_(\d{4}_\d{2}_\d{2})_/;
  const diaA = formato.exec(a)?.[1] || "";
  const diaB = formato.exec(b)?.[1] || "";
  if (diaA !== diaB) return diaA > diaB ? -1 : 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

export default class AnalisesService {
  private static storage() {
    const storage = dailyRasterStorage(process.env.AWS_TIFF_PHYTOBLOOM_BUCKET);
    if (!storage.bucket) throw { status: http_status.INTERNAL_ERROR, message: "AWS_TIFF_PHYTOBLOOM_BUCKET nao definido" };
    return { ...storage, bucket: storage.bucket };
  }

  private static async published(storage: ReturnType<typeof AnalisesService.storage>) {
    if (!process.env.DAILY_RASTER_CATALOG_KEY) return undefined;
    const obj = await storage.repository.download_object(storage.bucket, process.env.DAILY_RASTER_CATALOG_KEY);
    const catalog = JSON.parse(await obj.Body!.transformToString());
    if (catalog.version !== 1 || !Array.isArray(catalog.products)) throw new Error("Catálogo diário inválido");
    const entries = new Map<string, number>();
    for (const entry of catalog.products) {
      if (typeof entry.key !== "string" || !entry.key.endsWith(".tif") ||
          !Number.isSafeInteger(entry.bytes) || entry.bytes < 1) throw new Error("Produto diário inválido");
      entries.set(entry.key, entry.bytes);
    }
    return entries;
  }

  static async list(continuationToken?: string): Promise<ListaAnalisesResponse> {
    const storage = this.storage();
    const published = await this.published(storage);
    const legacyBucket = process.env.AWS_TIFF_PHYTOBLOOM_BUCKET;
    if (published && (!continuationToken || continuationToken.startsWith("daily:"))) {
      const after = continuationToken?.slice(6) || "";
      const names = Array.from(published.keys()).filter(name => !after || compararAquisicao(name, after) > 0).sort(compararAquisicao);
      const analises = names.slice(0, 10).map(nome => ({ nome, tamanho: published.get(nome)! }));
      if (analises.length) return {
        analises, total: analises.length,
        proximo_token: names.length > 10 ? "daily:" + analises[9].nome : legacyBucket ? "archive:first" : undefined,
      };
    }
    const repository = published ? new Repository(process.env.AWS_BUCKET_REGION) : storage.repository;
    const bucket = published ? legacyBucket : storage.bucket;
    if (!bucket) return { analises: [], total: 0 };
    let token = continuationToken === "archive:first" || continuationToken?.startsWith("daily:") ? undefined : continuationToken;
    do {
      const response = await repository.listar_objetos(bucket, token);
      const analises = (response.Contents || []).filter(o => o.Key && !published?.has(o.Key)).map(o => ({
        nome: o.Key!, tamanho: o.Size || 0, ultima_modificacao: o.LastModified, etag: o.ETag,
      }));
      token = response.NextContinuationToken;
      if (analises.length || !token) return { analises, total: analises.length, proximo_token: token };
    } while (token);
    return { analises: [], total: 0 };
  }

  static async listNomes(continuationToken?: string) {
    const lista = await this.list(continuationToken);
    return {
      nomes: lista.analises.map((analise) => analise.nome),
      total: lista.total,
      proximo_token: lista.proximo_token,
    };
  }

  static async download(nome: string, range?: string): Promise<GetObjectCommandOutput> {
    if (!nome || nome.trim().length > 1024) {
      throw { status: http_status.BAD_REQUEST, message: "nome da analise invalido" };
    }

    try {
      const storage = this.storage();
      const published = await this.published(storage);
      if (published && !published.has(nome)) {
        const legacy = process.env.AWS_TIFF_PHYTOBLOOM_BUCKET;
        if (!legacy) throw { status: 404, message: "analise nao encontrada" };
        return await new Repository(process.env.AWS_BUCKET_REGION).download_object(legacy, nome, range);
      }
      return await storage.repository.download_object(storage.bucket, nome, range);
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode === 416) throw { status: 416, message: "Intervalo indisponível" };
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === http_status.NOT_FOUND) {
        throw { status: http_status.NOT_FOUND, message: "analise nao encontrada" };
      }
      throw err;
    }
  }
}
