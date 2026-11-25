    import { get, post, put, del } from "./apiClient";
import {
  Artigo,
  AtualizarArtigoPayload,
  CriarArtigoPayload,
  RespostaPaginadaArtigos,
} from "@/services/types/artigo.types";

type ListarArtigosResponse =
  | Artigo[]
  | RespostaPaginadaArtigos
  | { data: Artigo[] };

export async function listarArtigos(): Promise<Artigo[]> {
  const response = await get<ListarArtigosResponse>("/artigos");

  if (Array.isArray(response)) return response;
  if ("data" in response) return response.data;
  return response.artigos;
}

export async function buscarArtigoPorId(
  id: string | number,
): Promise<Artigo> {
  return get<Artigo>(`/artigos/${id}`);
}

export async function criarArtigo(
  data: CriarArtigoPayload,
): Promise<Artigo> {
  return post<Artigo, CriarArtigoPayload>("/artigos", data);
}

export async function atualizarArtigo(
  id: number | string,
  data: AtualizarArtigoPayload,
): Promise<Artigo> {
  return put<Artigo, AtualizarArtigoPayload>(`/artigos/${id}`, data);
}

export async function excluirArtigo(
  id: string | number,
): Promise<void> {
  return del<void>(`/artigos/${id}`);
}
