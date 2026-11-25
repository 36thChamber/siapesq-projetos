import { get, post, put, del } from "./apiClient";
import { 
  Analise, 
  CriarAnalisePayload, 
  AtualizarAnalisePayload 
} from "@/services/types/analise.types";
import type {
  AnaliseDaEspecie,
  UrlCsvOcorrencias,
  UrlTifAnalise,
} from "@/services/types/analise.types";

export async function listarAnalisesDaEspecie(idEspecie: string): Promise<AnaliseDaEspecie[]> {
  return get<AnaliseDaEspecie[]>(`/analises/especie/${encodeURIComponent(idEspecie)}`);
}

export async function obterUrlTifAnalise(idAnalise: string): Promise<UrlTifAnalise> {
  return get<UrlTifAnalise>(`/analises/${encodeURIComponent(idAnalise)}/tif`);
}

export async function obterUrlCsvOcorrencias(
  idEspecie: string,
): Promise<UrlCsvOcorrencias> {
  return get<UrlCsvOcorrencias>(
    `/analises/especie/${encodeURIComponent(idEspecie)}/ocorrencias`,
  );
}

export async function listarAnalises(): Promise<Analise[]> {
  return get<Analise[]>("/analises");
}

export async function buscarAnalisePorId(id: string): Promise<Analise> {
  return get<Analise>(`/analises/${id}`);
}

export async function criarAnalise(data: CriarAnalisePayload): Promise<Analise> {
  return post<Analise>("/analises", data);
}

export async function atualizarAnalise(id: string, data: AtualizarAnalisePayload): Promise<Analise> {
  return put<Analise>(`/analises/${id}`, data);
}

export async function excluirAnalise(id: string): Promise<void> {
  return del<void>(`/analises/${id}`);
}
