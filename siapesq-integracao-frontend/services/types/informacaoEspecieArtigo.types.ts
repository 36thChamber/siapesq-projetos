export interface InformacaoEspecieArtigo {
  id_informacao_especie_artigo: string;
  id_artigo: string;
  id_especie: string;
  campo?: string;
  valor?: string;
  pagina?: number;
  trecho?: string;
  criado_em?: string;
  atualizado_em?: string;
  deletado_em?: string | null;
}

export interface CriarInformacaoEspecieArtigoPayload {
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_completa?: string;
  referencia_texto?: string;
}

export interface AtualizarInformacaoEspecieArtigoPayload {
  id_artigo?: string;
  id_especie?: string;
  campo?: string;
  valor?: string;
  pagina?: number;
  trecho?: string;
}