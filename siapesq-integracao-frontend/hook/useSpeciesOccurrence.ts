import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { obterUrlCsvOcorrencias } from "@/services/api/analises.service";
import type { UrlCsvOcorrencias } from "@/services/types/analise.types";

export interface OccurrencePoint {
  latitude: number;
  longitude: number;
  description: string;
}

type ParsedCsv = {
  points: OccurrencePoint[];
  hasCoordinateColumns: boolean;
};

const LATITUDE_COLUMNS = ["decimallatitude", "latitude"];
const LONGITUDE_COLUMNS = ["decimallongitude", "longitude"];
const DELIMITERS = [",", ";", "\t"];

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBlankRecord(record: string[]): boolean {
  return record.every((value) => value.trim() === "");
}

function parseDelimitedCsv(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      record.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field);
      if (!isBlankRecord(record)) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  record.push(field);
  if (!isBlankRecord(record)) records.push(record);
  return records;
}

/** Unknown headers yield no points rather than a positional guess. */
export function parseOccurrenceCsv(text: string): ParsedCsv {
  const parsed = DELIMITERS
    .map((delimiter) => parseDelimitedCsv(text, delimiter))
    .sort((left, right) => (right[0]?.length ?? 0) - (left[0]?.length ?? 0))[0] ?? [];
  const [header, ...rows] = parsed;
  if (!header) return { points: [], hasCoordinateColumns: true };

  const headers = header.map(normalizeHeader);
  const latitudeIndex = headers.findIndex((headerName) => LATITUDE_COLUMNS.includes(headerName));
  const longitudeIndex = headers.findIndex((headerName) => LONGITUDE_COLUMNS.includes(headerName));
  if (latitudeIndex < 0 || longitudeIndex < 0) {
    return { points: [], hasCoordinateColumns: false };
  }

  const points = rows.flatMap((row) => {
    const latitudeValue = row[latitudeIndex]?.trim();
    const longitudeValue = row[longitudeIndex]?.trim();
    if (!latitudeValue || !longitudeValue) return [];

    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return [];
    }
    return [{ latitude, longitude, description: "Ocorrência registrada" }];
  });

  return { points, hasCoordinateColumns: true };
}

function occurrenceErrorMessage(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 404) return "Ocorrências ainda não disponíveis.";
  if (status === 401) return "Sua sessão expirou. Entre novamente para acessar as ocorrências.";
  if (status === 403) return "Você não possui acesso às ocorrências desta espécie.";
  return "Não foi possível carregar as ocorrências.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useSpeciesOccurrence(idEspecie: string) {
  const [loading, setLoading] = useState(Boolean(idEspecie));
  const [points, setPoints] = useState<OccurrencePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);
  const csvReference = useRef<(UrlCsvOcorrencias & { expiresAt: number; speciesId: string }) | null>(null);

  const getCurrentCsvReference = useCallback(async () => {
    const current = csvReference.current;
    if (current && current.speciesId === idEspecie && current.expiresAt > Date.now()) return current;

    const next = await obterUrlCsvOcorrencias(idEspecie);
    const reference = {
      ...next,
      expiresAt: Date.now() + next.expiresIn * 1000,
      speciesId: idEspecie,
    };
    csvReference.current = reference;
    return reference;
  }, [idEspecie]);

  const dataKey = `${idEspecie}:${reloadKey}`;
  const [previousDataKey,setPreviousDataKey] = useState(dataKey);
  if(previousDataKey!==dataKey){setPreviousDataKey(dataKey);setPoints([]);setLoading(Boolean(idEspecie));setError(null);setEmpty(false);}
  useEffect(() => {
    const activeRequest = ++requestId.current;
    const controller = new AbortController();
    csvReference.current = null;
    if (!idEspecie) return () => controller.abort();
    async function loadOccurrences() {
      try {
        const csv = await getCurrentCsvReference();
        if (activeRequest !== requestId.current) return;

        const response = await fetch(csv.url, { signal: controller.signal });
        if (!response.ok) throw new Error(`CSV request failed with ${response.status}`);
        const parsed = parseOccurrenceCsv(await response.text());
        if (activeRequest !== requestId.current) return;

        if (!parsed.hasCoordinateColumns) {
          setError("Não foi possível identificar as colunas de coordenadas no CSV.");
          setPoints([]);
          return;
        }

        setPoints(parsed.points);
        setEmpty(parsed.points.length === 0);
      } catch (requestError) {
        if (activeRequest !== requestId.current || isAbortError(requestError)) return;
        setPoints([]);
        setEmpty(false);
        setError(occurrenceErrorMessage(requestError));
      } finally {
        if (activeRequest === requestId.current) setLoading(false);
      }
    }

    void loadOccurrences();
    return () => controller.abort();
  }, [getCurrentCsvReference, idEspecie, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const downloadCsv = useCallback(async () => {
    if (!idEspecie || downloading) return;
    setDownloading(true);
    try {
      const csv = await getCurrentCsvReference();
      const response = await fetch(csv.url);
      if (!response.ok) throw new Error(`CSV request failed with ${response.status}`);

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = csv.nome_arquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (requestError) {
      setError(occurrenceErrorMessage(requestError));
    } finally {
      setDownloading(false);
    }
  }, [downloading, getCurrentCsvReference, idEspecie]);

  return { points, loading, error, empty, downloading, downloadCsv, retry };
}
