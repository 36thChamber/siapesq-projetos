import axios, { AxiosError } from "axios";
import type { Readable } from "stream";
import { BASE_API } from "../../resources/BASE_API";

export type TipoObjetoBucket = {
  key: string;
  lastModified?: string;
  size?: number;
};

export type ListaAnalisesBucketResponse = {
  objetos: TipoObjetoBucket[];
  paginationtoken?: string | null;
};

type type_register_analise_response = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string;
  nome_arquivo_nacional?: string | null;
  nome_arquivo_otimista?: string | null;
  nome_arquivo_pessimista?: string | null;
  nome_arquivo_30_otimista?: string | null;
  nome_arquivo_30_pessimista?: string | null;
  nome_arquivo_rs_otimista?: string | null;
  nome_arquivo_rs_pessimista?: string | null;
  nacional_incerteza?: string | null;
  nacional_ssp245_incerteza?: string | null;
  rs_ssp245_incerteza?: string | null;
  rs_ssp585_incerteza?: string | null;
  poligono_ssp245_incerteza?: string | null;
  poligono_ssp585_incerteza?: string | null;
  rs_incerteza?: string | null;
  poligono_incerteza?: string | null;
};

type type_list_analises_response = {
  analises: type_register_analise_response[];
  total: number;
};

type type_list_analises = {
  limit: number;
  offset: number;
};

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_REQUEST_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientDownloadError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return ["ECONNRESET", "ETIMEDOUT", "EPIPE", "ENETUNREACH"].includes(
      code ?? ""
    );
  }

  const status = error.response?.status;
  if (status !== undefined) {
    return status === 408 || status === 429 || status >= 500;
  }

  return [
    AxiosError.ERR_NETWORK,
    AxiosError.ECONNABORTED,
    AxiosError.ETIMEDOUT,
    "ECONNRESET",
  ].includes(error.code ?? "");
}

export function retryDelayMs(attempt: number): number {
  const exponential = 500 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 250);
  return exponential + jitter;
}

async function requestWithRetry<T>(
  operation: () => Promise<T>,
  description: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry =
        attempt < MAX_REQUEST_ATTEMPTS - 1 &&
        isTransientDownloadError(error);

      if (!shouldRetry) throw error;

      const delay = retryDelayMs(attempt);
      console.warn(
        `${description} falhou; nova tentativa em ${delay} ms.`,
        error
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function list_analises_bucket(
  token: string,
  paginationtoken?: string
): Promise<ListaAnalisesBucketResponse> {
  return requestWithRetry(async () => {
    const response = await axios.get<ListaAnalisesBucketResponse>(
      `${BASE_API}/siapesq/analisesBucket`,
      {
        params: paginationtoken ? { paginationtoken } : undefined,
        headers: { Authorization: `Bearer ${token}` },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    return response.data;
  }, "Listagem do bucket");
}

export async function download_analise_tiff_stream(
  token: string,
  objectname: string
): Promise<Readable> {
  const response = await axios.get<Readable>(
    `${BASE_API}/siapesq/analisesBucket/download`,
    {
      params: { object_name: objectname },
      headers: { Authorization: `Bearer ${token}` },
      responseType: "stream",
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  return response.data;
}

export async function download_analise_tiff_buffer(
  token: string,
  objectname: string
): Promise<Buffer> {
  return requestWithRetry(async () => {
    const response = await axios.get<ArrayBuffer>(
      `${BASE_API}/siapesq/analisesBucket/download`,
      {
        params: { object_name: objectname },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    return Buffer.from(response.data);
  }, `Download do TIFF ${objectname}`);
}

export async function download_analise_csv(
  token: string,
  objectname: string
): Promise<Buffer> {
  return requestWithRetry(async () => {
    const response = await axios.get<ArrayBuffer>(
      `${BASE_API}/siapesq/analisesBucket/downloadCsv`,
      {
        params: { object_name: objectname },
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    return Buffer.from(response.data);
  }, `Download do CSV ${objectname}`);
}

export async function get_list_analises(
  token: string,
  query: type_list_analises
): Promise<type_list_analises_response> {
  return requestWithRetry(async () => {
    const response = await axios.get<type_list_analises_response>(
      `${BASE_API}/siapesq/analises`,
      {
        params: query,
        headers: { Authorization: `Bearer ${token}` },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    return response.data;
  }, `Listagem de analises (offset ${query.offset})`);
}
