import Artigos from "../models/Artigos";

export type ArtigoResponse = {
  id_artigo: number;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive: string | null;
  id_especie: string | null;
  nome_especie: string;
  nome_artigo: string;
};

export type CriarArtigoBodyRequest = {
  id_artigo: number;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive?: string;
  id_especie?: string;
  nome_especie: string;
  nome_artigo: string;
};

export type AtualizarArtigoBodyRequest = {
  artigo?: string;
  referencia_texto?: string;
  referencia_completa?: string;
  link_drive?: string;
  id_especie?: string;
  nome_especie?: string;
  nome_artigo?: string;
};

export type BuscarArtigoPorIdParamsRequest = {
  id_artigo: number;
};

export type DeletarArtigoParamsRequest = {
  id_artigo: number;
};

export type ListarArtigosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarArtigoResponse = ArtigoResponse;

export type AtualizarArtigoResponse = ArtigoResponse;

export type BuscarArtigoPorIdResponse = ArtigoResponse;

export type DeletarArtigoResponse = ArtigoResponse;

export type ListarArtigosResponse = {
  artigos: ArtigoResponse[];
  total: number;
};

export function toArtigoResponse(artigo: Artigos): ArtigoResponse {
  return {
    id_artigo: artigo.id_artigo,
    artigo: artigo.artigo,
    referencia_texto: artigo.referencia_texto,
    referencia_completa: artigo.referencia_completa,
    link_drive: artigo.link_drive ?? null,
    id_especie: artigo.id_especie ?? null,
    nome_especie: artigo.nome_especie,
    nome_artigo: artigo.nome_artigo,
  };
}