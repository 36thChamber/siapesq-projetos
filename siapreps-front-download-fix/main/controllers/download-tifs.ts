import fs from "fs";
import path from "path";
import os from "os";
import { createCipheriv, randomBytes, scrypt } from "crypto";
import { Transform } from "stream";
import type { Readable } from "stream";
import { pipeline } from "stream/promises";
import { type_get_response, type_list_analises } from "../../renderer/controllers/types/analises-types";
import { garantirExtensaoTif } from "./nome-arquivo-tif";
import {
  download_analise_csv,
  download_analise_tiff_buffer,
  download_analise_tiff_stream,
  get_list_analises,
  isTransientDownloadError,
  list_analises_bucket,
  retryDelayMs,
  TipoObjetoBucket,
} from "./analisesBucket-controllers";

const CAMPOS_ARQUIVO_ANALISE = [
  "nome_arquivo",
  "nome_arquivo_30",
  "nome_arquivo_nacional",
  "nome_arquivo_otimista",
  "nome_arquivo_pessimista",
  "nome_arquivo_30_otimista",
  "nome_arquivo_30_pessimista",
  "nome_arquivo_rs_otimista",
  "nome_arquivo_rs_pessimista",
] as const;

const SENHA_ARQUIVOS = "thIi4bjhC0";
const MANIFEST_FILE = ".analises-manifest.json";
const DOWNLOAD_CONCURRENCY = 3;
const MAX_DOWNLOAD_ATTEMPTS = 3;

export type DownloadAnaliseSelecionadaInput = {
  nome_pasta: string;
  arquivos: Array<string | null | undefined>;
};

export type DownloadAnaliseSelecionadaResult = {
  success: boolean;
  downloaded: string[];
  failed: string[];
};

export type DownloadProgress = {
  phase: "listing" | "downloading" | "completed" | "completed_with_errors" | "failed";
  done: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
  percent: number;
  bytesTransferred: number;
  bytesTotal: number;
  currentFile?: string;
};

export type DownloadAllResult = {
  success: boolean;
  status: "completed" | "completed_with_errors" | "failed";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  bytesTransferred: number;
  bytesTotal: number;
};

type ManifestEntry = {
  objectKey: string;
  logicalName: string;
  localFile: string;
  size?: number;
  lastModified?: string;
  syncedAt: string;
};

type SyncManifest = {
  version: 1;
  entries: Record<string, ManifestEntry>;
};

type DownloadTask = {
  objectKey: string;
  logicalName: string;
  metadata?: TipoObjetoBucket;
};

type DownloadedEncryptedFile = {
  bytes: number;
  localFile: string;
};

let activeSync: Promise<DownloadAllResult> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function validarNomePastaBucket(nomePasta: string): string {
  const pasta = nomePasta.trim().replace(/\\/g, "/");
  const segmentos = pasta.split("/");

  if (
    !pasta ||
    pasta.startsWith("/") ||
    segmentos.some((segmento) => !segmento || segmento === "." || segmento === "..")
  ) {
    throw new Error("Nome da pasta da analise invalido.");
  }

  return pasta;
}

function validarNomeArquivoTif(nome: string): string {
  const nomeArquivo = garantirExtensaoTif(nome.trim());

  if (!nomeArquivo || path.basename(nomeArquivo) !== nomeArquivo) {
    throw new Error("Nome de arquivo TIFF invalido.");
  }

  return nomeArquivo;
}

function resolverCaminhoSeguro(pastaBase: string, nomeArquivo: string): string {
  const raiz = path.resolve(pastaBase);
  const destino = path.resolve(raiz, nomeArquivo);
  const normalizar = (valor: string) =>
    process.platform === "win32" ? valor.toLowerCase() : valor;
  const raizComSeparador = `${normalizar(raiz)}${path.sep}`;
  const destinoNormalizado = normalizar(destino);

  if (destinoNormalizado !== normalizar(raiz) && !destinoNormalizado.startsWith(raizComSeparador)) {
    throw new Error("O caminho de destino esta fora da pasta permitida.");
  }

  return destino;
}

async function gerarCaminhoDisponivel(
  pastaDestino: string,
  nomeArquivo: string
): Promise<string> {
  const extensao = path.extname(nomeArquivo);
  const nomeBase = path.basename(nomeArquivo, extensao);
  let indice = 0;

  while (true) {
    const sufixo = indice === 0 ? "" : ` (${indice})`;
    const caminho = resolverCaminhoSeguro(
      pastaDestino,
      `${nomeBase}${sufixo}${extensao}`
    );

    try {
      await fs.promises.access(caminho);
      indice++;
    } catch {
      return caminho;
    }
  }
}

async function criptografarNomeArquivo(nome: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const key = await deriveKey(SENHA_ARQUIVOS, salt);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(nome, "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([salt, iv, encrypted])
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function escreverStreamCriptografado(
  source: Readable,
  partialPath: string
): Promise<number> {
  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const key = await deriveKey(SENHA_ARQUIVOS, salt);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(null, chunk);
    },
  });

  await fs.promises.rm(partialPath, { force: true });
  await fs.promises.writeFile(partialPath, Buffer.concat([salt, iv]), {
    flag: "wx",
  });

  try {
    await pipeline(
      source,
      counter,
      cipher,
      fs.createWriteStream(partialPath, { flags: "a" })
    );
    return bytes;
  } catch (error) {
    await fs.promises.rm(partialPath, { force: true });
    throw error;
  }
}

async function escreverStreamPlano(
  source: Readable,
  partialPath: string
): Promise<number> {
  let bytes = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(null, chunk);
    },
  });

  await fs.promises.rm(partialPath, { force: true });

  try {
    await pipeline(
      source,
      counter,
      fs.createWriteStream(partialPath, { flags: "wx" })
    );
    return bytes;
  } catch (error) {
    await fs.promises.rm(partialPath, { force: true });
    throw error;
  }
}

async function baixarComRetry(
  token: string,
  objectKey: string,
  writer: (source: Readable) => Promise<number>
): Promise<number> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const stream = await download_analise_tiff_stream(token, objectKey);
      return await writer(stream);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < MAX_DOWNLOAD_ATTEMPTS - 1 && isTransientDownloadError(error);

      if (!shouldRetry) throw error;

      const delay = retryDelayMs(attempt);
      console.warn(
        `Download de ${objectKey} falhou; nova tentativa em ${delay} ms.`,
        error
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function baixarArquivoCriptografado(
  token: string,
  task: DownloadTask,
  pastaDestino: string
): Promise<DownloadedEncryptedFile> {
  const nomeCriptografado = await criptografarNomeArquivo(task.logicalName);
  const localFile = `${nomeCriptografado}.enc`;
  const finalPath = resolverCaminhoSeguro(pastaDestino, localFile);
  const partialPath = resolverCaminhoSeguro(pastaDestino, `${localFile}.partial`);

  const bytes = await baixarComRetry(token, task.objectKey, (source) =>
    escreverStreamCriptografado(source, partialPath)
  );

  await fs.promises.rename(partialPath, finalPath);
  return { bytes, localFile };
}

async function baixarArquivoSelecionado(
  token: string,
  objectKey: string,
  finalPath: string
): Promise<number> {
  const partialPath = `${finalPath}.partial`;
  const bytes = await baixarComRetry(token, objectKey, (source) =>
    escreverStreamPlano(source, partialPath)
  );
  await fs.promises.rename(partialPath, finalPath);
  return bytes;
}

function manifestVazio(): SyncManifest {
  return { version: 1, entries: {} };
}

async function carregarManifest(manifestPath: string): Promise<SyncManifest> {
  try {
    const conteudo = await fs.promises.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(conteudo) as Partial<SyncManifest>;

    if (parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== "object") {
      throw new Error("Formato de manifesto invalido.");
    }

    return parsed as SyncManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Manifesto local ignorado; uma sincronizacao completa sera feita.", error);
    }
    return manifestVazio();
  }
}

async function salvarManifest(
  manifestPath: string,
  manifest: SyncManifest
): Promise<void> {
  const partialPath = `${manifestPath}.partial`;
  await fs.promises.rm(partialPath, { force: true });
  await fs.promises.writeFile(partialPath, JSON.stringify(manifest, null, 2), "utf8");
  await fs.promises.rename(partialPath, manifestPath);
}

async function listarTodasAnalises(
  token: string,
  query: type_list_analises
): Promise<type_get_response[]> {
  const pageSize = Math.max(1, Math.min(query.limit || 100, 100));
  let offset = Math.max(0, query.offset || 0);
  const analises: type_get_response[] = [];

  while (true) {
    const response = await get_list_analises(token, { limit: pageSize, offset });
    const pagina = Array.isArray(response.analises) ? response.analises : [];
    analises.push(...pagina);

    if (pagina.length === 0 || analises.length >= response.total) break;
    offset += pagina.length;
  }

  return analises;
}

async function listarMetadadosBucket(
  token: string
): Promise<Map<string, TipoObjetoBucket>> {
  const objetos = new Map<string, TipoObjetoBucket>();
  const tokensVisitados = new Set<string>();
  let paginationtoken: string | undefined;

  do {
    const response = await list_analises_bucket(token, paginationtoken);
    for (const objeto of response.objetos ?? []) {
      if (objeto?.key) objetos.set(objeto.key, objeto);
    }

    const nextToken = response.paginationtoken ?? undefined;
    if (!nextToken) break;
    if (tokensVisitados.has(nextToken)) {
      throw new Error("A paginacao do bucket retornou um token repetido.");
    }
    tokensVisitados.add(nextToken);
    paginationtoken = nextToken;
  } while (paginationtoken);

  return objetos;
}

function montarTarefas(
  analises: type_get_response[],
  metadataByKey: Map<string, TipoObjetoBucket>
): { tasks: DownloadTask[]; invalid: number } {
  const tasksByKey = new Map<string, DownloadTask>();
  let invalid = 0;

  for (const analise of analises) {
    let pasta: string;
    try {
      pasta = validarNomePastaBucket(analise.nome_pasta);
    } catch (error) {
      console.error(`Analise ${analise.id_analise} possui pasta invalida.`, error);
      invalid++;
      continue;
    }

    for (const campo of CAMPOS_ARQUIVO_ANALISE) {
      const valor = (analise as Record<string, unknown>)[campo];
      if (typeof valor !== "string" || !valor.trim()) continue;

      try {
        const logicalName = validarNomeArquivoTif(valor);
        const objectKey = `predictions/${pasta}/${logicalName}`;
        if (!tasksByKey.has(objectKey)) {
          tasksByKey.set(objectKey, {
            objectKey,
            logicalName,
            metadata: metadataByKey.get(objectKey),
          });
        }
      } catch (error) {
        console.error(`Arquivo invalido na analise ${analise.id_analise} (${campo}).`, error);
        invalid++;
      }
    }
  }

  return { tasks: Array.from(tasksByKey.values()), invalid };
}

async function entradaEstaAtualizada(
  entry: ManifestEntry | undefined,
  metadata: TipoObjetoBucket | undefined,
  pastaDestino: string
): Promise<boolean> {
  if (!entry || !metadata) return false;
  if (path.basename(entry.localFile) !== entry.localFile) return false;

  const hasVersion = metadata.size !== undefined || !!metadata.lastModified;
  if (!hasVersion) return false;
  if (metadata.size !== undefined && entry.size !== metadata.size) return false;
  if (metadata.lastModified && entry.lastModified !== metadata.lastModified) return false;

  try {
    const localPath = resolverCaminhoSeguro(pastaDestino, entry.localFile);
    const stat = await fs.promises.stat(localPath);
    return stat.isFile() && stat.size > 32;
  } catch {
    return false;
  }
}

async function executarComConcorrencia<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;
        await worker(items[index]);
      }
    }
  );

  await Promise.all(workers);
}

function criarProgress(
  partial: Omit<DownloadProgress, "done" | "percent">
): DownloadProgress {
  const percent = partial.total === 0
    ? partial.phase === "completed" ? 100 : 0
    : Math.round((partial.processed / partial.total) * 100);

  return {
    ...partial,
    done: partial.processed,
    percent,
  };
}

async function executarSincronizacao(
  token: string,
  query: type_list_analises,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadAllResult> {
  onProgress?.(criarProgress({
    phase: "listing",
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    bytesTransferred: 0,
    bytesTotal: 0,
  }));

  const analises = await listarTodasAnalises(token, query);
  if (analises.length === 0) {
    throw new Error("Nenhuma analise encontrada.");
  }

  let metadataByKey = new Map<string, TipoObjetoBucket>();
  try {
    metadataByKey = await listarMetadadosBucket(token);
  } catch (error) {
    console.warn(
      "Nao foi possivel consultar metadados do bucket; os arquivos serao atualizados integralmente.",
      error
    );
  }

  const diretorioRaizUsuario = os.homedir();
  const pastaDestino = path.join(diretorioRaizUsuario, "siapesq");
  await fs.promises.mkdir(pastaDestino, { recursive: true });
  const manifestPath = resolverCaminhoSeguro(pastaDestino, MANIFEST_FILE);
  const manifest = await carregarManifest(manifestPath);
  const { tasks, invalid } = montarTarefas(analises, metadataByKey);

  const tasksToDownload: DownloadTask[] = [];
  let skipped = 0;
  for (const task of tasks) {
    if (await entradaEstaAtualizada(manifest.entries[task.objectKey], task.metadata, pastaDestino)) {
      skipped++;
    } else {
      tasksToDownload.push(task);
    }
  }

  const total = tasks.length + invalid;
  const bytesTotal = tasksToDownload.reduce(
    (sum, task) => sum + (task.metadata?.size ?? 0),
    0
  );
  let processed = skipped + invalid;
  let succeeded = 0;
  let failed = invalid;
  let bytesTransferred = 0;
  const oldFiles = new Set<string>();

  const emit = (phase: DownloadProgress["phase"], currentFile?: string) => {
    onProgress?.(criarProgress({
      phase,
      processed,
      succeeded,
      failed,
      skipped,
      total,
      bytesTransferred,
      bytesTotal,
      currentFile,
    }));
  };

  emit("downloading");

  await executarComConcorrencia(tasksToDownload, DOWNLOAD_CONCURRENCY, async (task) => {
    try {
      const previousEntry = manifest.entries[task.objectKey];
      const downloaded = await baixarArquivoCriptografado(token, task, pastaDestino);
      bytesTransferred += downloaded.bytes;
      succeeded++;

      manifest.entries[task.objectKey] = {
        objectKey: task.objectKey,
        logicalName: task.logicalName,
        localFile: downloaded.localFile,
        size: task.metadata?.size,
        lastModified: task.metadata?.lastModified,
        syncedAt: new Date().toISOString(),
      };

      if (previousEntry?.localFile && previousEntry.localFile !== downloaded.localFile) {
        oldFiles.add(previousEntry.localFile);
      }
    } catch (error) {
      failed++;
      console.error(`Falha ao sincronizar ${task.objectKey}.`, error);
    } finally {
      processed++;
      emit("downloading", task.logicalName);
    }
  });

  await salvarManifest(manifestPath, manifest);

  const referencedFiles = new Set(
    Object.values(manifest.entries).map((entry) => entry.localFile)
  );
  await Promise.all(
    Array.from(oldFiles)
      .filter((file) => path.basename(file) === file && !referencedFiles.has(file))
      .map(async (file) => {
        try {
          await fs.promises.rm(resolverCaminhoSeguro(pastaDestino, file), { force: true });
        } catch (error) {
          console.warn(`Nao foi possivel remover a versao antiga ${file}.`, error);
        }
      })
  );

  const status = failed > 0 ? "completed_with_errors" : "completed";
  emit(status);

  return {
    success: failed === 0,
    status,
    total,
    processed,
    succeeded,
    failed,
    skipped,
    bytesTransferred,
    bytesTotal,
  };
}

export async function getAllAnalises(
  token: string,
  query: type_list_analises = { limit: 100, offset: 0 },
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadAllResult> {
  if (activeSync) return activeSync;

  const syncPromise = executarSincronizacao(token, query, onProgress).catch((error) => {
    console.error("Erro ao sincronizar analises.", error);
    const result: DownloadAllResult = {
      success: false,
      status: "failed",
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 1,
      skipped: 0,
      bytesTransferred: 0,
      bytesTotal: 0,
    };
    onProgress?.(criarProgress({
      phase: "failed",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
      total: result.total,
      bytesTransferred: result.bytesTransferred,
      bytesTotal: result.bytesTotal,
    }));
    return result;
  });

  activeSync = syncPromise;
  try {
    return await syncPromise;
  } finally {
    if (activeSync === syncPromise) activeSync = null;
  }
}

export async function downloadAnaliseSelecionada(
  token: string,
  analise: DownloadAnaliseSelecionadaInput,
  pastaDestino: string
): Promise<DownloadAnaliseSelecionadaResult> {
  const downloaded: string[] = [];
  const failed: string[] = [];

  try {
    const nomePasta = validarNomePastaBucket(analise.nome_pasta);
    const nomesArquivos = Array.from(
      new Set(
        analise.arquivos
          .filter((nome): nome is string => typeof nome === "string" && !!nome.trim())
          .map(validarNomeArquivoTif)
      )
    );

    await fs.promises.mkdir(pastaDestino, { recursive: true });
    await executarComConcorrencia(nomesArquivos, DOWNLOAD_CONCURRENCY, async (nomeArquivo) => {
      const objectKey = `predictions/${nomePasta}/${nomeArquivo}`;
      try {
        const finalPath = await gerarCaminhoDisponivel(pastaDestino, nomeArquivo);
        await baixarArquivoSelecionado(token, objectKey, finalPath);
        downloaded.push(finalPath);
      } catch (error) {
        console.error(`Erro ao baixar arquivo selecionado ${objectKey}.`, error);
        failed.push(nomeArquivo);
      }
    });
  } catch (error) {
    console.error("Erro ao baixar analise selecionada.", error);
    failed.push(...analise.arquivos.filter((nome): nome is string => !!nome));
  }

  return {
    success: downloaded.length > 0 && failed.length === 0,
    downloaded,
    failed: Array.from(new Set(failed)),
  };
}

export async function downloadAnaliseTifSemCriptografia(
  token: string,
  analise: type_get_response,
  pastaDestino: string
): Promise<boolean> {
  const nomeArquivo = validarNomeArquivoTif(analise.nome_arquivo);
  const nomePasta = validarNomePastaBucket(analise.nome_pasta);
  const objectname = `predictions/${nomePasta}/${nomeArquivo}`;
  const filePath = resolverCaminhoSeguro(pastaDestino, nomeArquivo);
  const partialPath = `${filePath}.partial`;

  try {
    await fs.promises.mkdir(pastaDestino, { recursive: true });
    const tiffBuffer = await download_analise_tiff_buffer(token, objectname);
    if (!tiffBuffer?.length) return false;
    await fs.promises.writeFile(partialPath, tiffBuffer);
    await fs.promises.rename(partialPath, filePath);
    return true;
  } catch (error) {
    await fs.promises.rm(partialPath, { force: true });
    console.error(`Erro ao baixar analise ${analise.id_analise} ${objectname}.`, error);
    return false;
  }
}

export async function downloadAnalisesCsv(
  token: string,
  nomeArquivo: string,
  pastaDestino: string
): Promise<boolean> {
  const nomeBase = nomeArquivo.trim();
  if (!nomeBase || path.basename(nomeBase) !== nomeBase) return false;

  const objectname = `species-table/${nomeBase}.csv`;
  const filePath = resolverCaminhoSeguro(pastaDestino, `${nomeBase}.csv`);
  const partialPath = `${filePath}.partial`;

  try {
    await fs.promises.mkdir(pastaDestino, { recursive: true });
    const csvBuffer = await download_analise_csv(token, objectname);
    if (!csvBuffer?.length) return false;
    await fs.promises.writeFile(partialPath, csvBuffer);
    await fs.promises.rename(partialPath, filePath);
    return true;
  } catch (error) {
    await fs.promises.rm(partialPath, { force: true });
    console.error(`Erro ao baixar CSV ${objectname}.`, error);
    return false;
  }
}
