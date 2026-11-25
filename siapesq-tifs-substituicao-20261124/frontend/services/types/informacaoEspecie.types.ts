// services/types/informacaoEspecie.types.ts

// --- Payloads ---
export interface CriarInformacaoEspeciePayload {
  id_especie: string;
  tipo_informacao: string;
  informacao: string;
  descricao?: string;
  fonte_referencia: string;
  link_fonte: string;
  referencia_texto?: string;
  referencia_completa?: string;
}

export interface AtualizarInformacaoEspeciePayload {
  id_especie?: string;
  tipo_informacao?: string;
  informacao?: string;
  descricao?: string;
  fonte_referencia?: string;
  link_fonte?: string;
  referencia_texto?: string;
  referencia_completa?: string;
}

// --- Entidades ---
export interface InformacaoEspecie {
  id_informacaoespecie: string;
  id_especie?: string;
  tipo_informacao: string;
  informacao: string;
  descricao?: string;
  fonte_referencia?: string;
  link_fonte?: string;
  referencia_texto?: string;
  referencia_completa?: string;
  criado_em?: string;
  atualizado_em?: string | null;
  deletado_em?: string | null;
}

export interface RespostaPaginadaInformacoesEspecies {
  total?: number;
  page?: number;
  limit?: number;
  data: InformacaoEspecie[];
}
