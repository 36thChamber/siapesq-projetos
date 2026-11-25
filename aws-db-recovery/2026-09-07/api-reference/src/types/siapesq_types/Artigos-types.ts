import artigos from "../../models/siapesq/Artigos";

export type CriarArtigoBody = {
  id_artigo: number;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive?: string;
  id_especie?: string;
  nome_especie: string;
  nome_artigo: string;
};

export type UpdateArtigoBody = {
  id_artigo: number;
  artigo?: string;
  referencia_texto?: string;
  referencia_completa?: string;
  link_drive?: string;
  id_especie?: string;
  nome_especie?: string;
  nome_artigo: string;
};

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

export type ListarArtigosResponse = {
  artigos: artigos[];
  total: number;
};
