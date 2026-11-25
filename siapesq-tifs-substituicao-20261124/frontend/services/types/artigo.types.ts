export interface Artigo {
  id_artigo: number;
  artigo: string;
  referencia_texto: string;
  referencia_completa: string;
  link_drive?: string | null;
  id_especie?: string | null;
  nome_especie: string;
  nome_artigo: string;
}

export type CriarArtigoPayload = Omit<Artigo, "id_artigo"> & {
  id_artigo?: number;
};

export type AtualizarArtigoPayload = Partial<
  Omit<Artigo, "id_artigo">
>;

export interface RespostaPaginadaArtigos {
  artigos: Artigo[];
  total?: number;
}
