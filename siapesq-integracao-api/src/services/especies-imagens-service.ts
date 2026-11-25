import Joi from "joi";

import httpStatus from "../consts/http-status-enum";
import type {
  CatalogEntry,
  CatalogImage,
  SpeciesImage,
  SpeciesImagesCatalog,
  SpeciesImagesResponse,
} from "../types/especies-imagens-types";

export type SpeciesImagesRepository = {
  ler_objeto_texto(bucket: string, key: string): Promise<string>;
  assinar_leitura_objeto(bucket: string, key: string, expiresIn: number): Promise<string>;
};

export type SpeciesImagesConfig = {
  bucket: string;
  catalogKey: string;
  signedUrlExpiresIn: number;
  catalogTtlMs?: number;
};

export class SpeciesImagesServiceError extends Error {
  readonly status = 503;
  readonly awsErrorName?: string;
  readonly awsStatusCode?: number;
  readonly awsRequestId?: string;

  constructor(error?: unknown) {
    super("Falha ao carregar imagens das espécies.");
    this.name = "SpeciesImagesServiceError";
    this.stack = undefined;
    if (error && typeof error === "object") {
      const awsError = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number; requestId?: string };
      };
      this.awsErrorName = awsError.name;
      this.awsStatusCode = awsError.$metadata?.httpStatusCode;
      this.awsRequestId = awsError.$metadata?.requestId;
    }
  }
}

type CachedCatalog = { catalog: SpeciesImagesCatalog; expiresAt: number; cacheKey: string };

function slugValido(slug: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug);
}

function usageKeyValido(rawUsageKey: string): number | undefined {
  const { error, value } = Joi.number()
    .integer()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .required()
    .validate(rawUsageKey);
  return error ? undefined : value as number;
}

function catalogoValido(value: unknown): value is SpeciesImagesCatalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<SpeciesImagesCatalog>;
  return (
    Array.isArray(catalog.species) &&
    !!catalog.byUsageKey &&
    typeof catalog.byUsageKey === "object" &&
    !Array.isArray(catalog.byUsageKey) &&
    catalog.species.every((entry) =>
      !!entry &&
      typeof entry === "object" &&
      typeof entry.slug === "string" &&
      slugValido(entry.slug) &&
      Array.isArray(entry.images),
    )
  );
}

function imagemValida(imagem: CatalogImage, slug: string): boolean {
  if (!slugValido(slug)) return false;
  const prefix = `species-images/gbif/images/${slug}/`;
  return (
    typeof imagem.key === "string" &&
    imagem.key.startsWith(prefix) &&
    !imagem.key.includes("..") &&
    !imagem.key.includes("\\") &&
    !imagem.key.slice(prefix.length).includes("/") &&
    imagem.key.length > prefix.length
  );
}

function imagemComUrl(imagem: CatalogImage, url: string): SpeciesImage {
  const { key: _internalKey, ...metadata } = imagem;
  return { ...metadata, url };
}

export default class SpeciesImagesService {
  private cachedCatalog?: CachedCatalog;
  private pendingCatalog?: { cacheKey: string; promise: Promise<SpeciesImagesCatalog> };

  constructor(
    private readonly repository: SpeciesImagesRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async listar(
    rawUsageKey: string,
    config: SpeciesImagesConfig = {
      bucket: process.env.SCIENTIFIC_MEDIA_BUCKET || process.env.AWS_SPECIES_IMAGES_BUCKET || "example-bucket",
      catalogKey: process.env.AWS_SPECIES_IMAGES_CATALOG_KEY || "species-images/gbif/catalog.json",
      signedUrlExpiresIn: Number(process.env.AWS_SPECIES_IMAGES_SIGNED_URL_EXPIRES_IN || 3600),
      catalogTtlMs: 5 * 60 * 1000,
    },
  ): Promise<SpeciesImagesResponse> {
    const usageKey = usageKeyValido(rawUsageKey);
    if (usageKey === undefined) {
      throw { status: httpStatus.BAD_REQUEST, message: "usageKey deve ser um inteiro positivo." };
    }
    if (
      !Number.isInteger(config.signedUrlExpiresIn) ||
      config.signedUrlExpiresIn < 1 ||
      config.signedUrlExpiresIn > 604800
    ) {
      throw new Error("Configuração de expiração de URL assinada inválida.");
    }

    try {
      const catalog = await this.obterCatalogo(config);
      const slug = catalog.byUsageKey[String(usageKey)];
      if (!slug) return { usageKey, images: [] };

      const especie: CatalogEntry | undefined = catalog.species.find((entry) => entry.slug === slug);
      if (!especie) throw new Error("Catálogo inconsistente.");

      const imagens = especie.images.filter((imagem) => imagemValida(imagem, slug));
      const images = await Promise.all(imagens.map(async (imagem) => {
        const url = await this.repository.assinar_leitura_objeto(
          config.bucket,
          imagem.key,
          config.signedUrlExpiresIn,
        );
        return imagemComUrl(imagem, url);
      }));
      return { usageKey, images };
    } catch (error) {
      if (error instanceof SpeciesImagesServiceError) throw error;
      throw new SpeciesImagesServiceError(error);
    }
  }

  private async obterCatalogo(config: SpeciesImagesConfig): Promise<SpeciesImagesCatalog> {
    const cacheKey = `${config.bucket}:${config.catalogKey}`;
    if (this.cachedCatalog?.cacheKey === cacheKey && this.cachedCatalog.expiresAt > this.now()) {
      return this.cachedCatalog.catalog;
    }
    if (this.pendingCatalog?.cacheKey === cacheKey) return this.pendingCatalog.promise;

    const promise = (async () => {
      const json = await this.repository.ler_objeto_texto(config.bucket, config.catalogKey);
      const parsed: unknown = JSON.parse(json);
      if (!catalogoValido(parsed)) throw new Error("Formato de catálogo inválido.");
      this.cachedCatalog = {
        catalog: parsed,
        expiresAt: this.now() + (config.catalogTtlMs ?? 5 * 60 * 1000),
        cacheKey,
      };
      return parsed;
    })();
    this.pendingCatalog = { cacheKey, promise };

    try {
      return await promise;
    } finally {
      if (this.pendingCatalog?.promise === promise) this.pendingCatalog = undefined;
    }
  }
}
