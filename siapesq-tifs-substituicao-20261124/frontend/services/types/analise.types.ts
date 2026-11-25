export interface Analise {
  id_analise: string;
  id_artigo?: string;
  tipo?: string;
  resultado?: any;
  status?: string;
  observacao?: string;
  criado_em?: string;
  atualizado_em?: string;
  deletado_em?: string | null;
}

export interface CriarAnalisePayload {
  id_artigo?: string;
  tipo?: string;
  resultado?: any;
  status?: string;
  observacao?: string;
}

export interface AtualizarAnalisePayload {
  id_artigo?: string;
  tipo?: string;
  resultado?: any;
  status?: string;
  observacao?: string;
}

/** Resposta de GET /analises/especie/:id_especie. */
export interface AnaliseDaEspecie {
  variante_dataset?: string;
  rotulo_dataset?: string;
  id_analise: string;
  id_especie: string;
  nome_dataset: string | null;
  cenario: string | null;
}

/** Resposta de GET /analises/:id_analise/tif. */
export interface UrlTifAnalise {
  id_analise: string;
  url: string;
  expiresIn: number;
}

/** Resposta de GET /analises/especie/:id_especie/ocorrencias. */
export interface UrlCsvOcorrencias {
  id_especie: string;
  cenario: "anual_2015_2024";
  nome_arquivo: string;
  url: string;
  expiresIn: number;
}
