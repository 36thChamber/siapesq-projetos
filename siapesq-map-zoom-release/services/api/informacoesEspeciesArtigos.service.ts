import { get, post, put, del } from "./apiClient";
import {
  InformacaoEspecieArtigo,
  CriarInformacaoEspecieArtigoPayload,
  AtualizarInformacaoEspecieArtigoPayload,
} from "@/services/types/informacaoEspecieArtigo.types";

export async function listarInformacoesEspeciesArtigos(): Promise<InformacaoEspecieArtigo[]> {
  return get<InformacaoEspecieArtigo[]>("/informacoesEspeciesArtigos");
}

export async function buscarInformacaoEspecieArtigoPorId(
  id: string,
): Promise<InformacaoEspecieArtigo> {
  return get<InformacaoEspecieArtigo>(
    `/informacoesEspeciesArtigos/${id}`,
  );
}

export async function criarInformacaoEspecieArtigo(
  data: CriarInformacaoEspecieArtigoPayload,
): Promise<InformacaoEspecieArtigo> {
  return post<InformacaoEspecieArtigo>(
    "/informacoesEspeciesArtigos",
    data,
  );
}

export async function atualizarInformacaoEspecieArtigo(
  id: string,
  data: AtualizarInformacaoEspecieArtigoPayload,
): Promise<InformacaoEspecieArtigo> {
  return put<InformacaoEspecieArtigo>(
    `/informacoesEspeciesArtigos/${id}`,
    data,
  );
}

export async function excluirInformacaoEspecieArtigo(
  id: string,
): Promise<void> {
  return del<void>(`/informacoesEspeciesArtigos/${id}`);
}
