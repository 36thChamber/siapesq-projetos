import analises from "../../models/siapesq/Analises";

export type CriarAnaliseBody = {
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string | null;
};

export type CriarAnaliseResponse = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30: string | null;
};

export type GetAnaliseParamsRequest = {
  id_analise: string;
};

export type GetAnaliseResponse = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30: string | null;
};

export type UpdateAnaliseBody = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string | null;
};

export type UpdateAnaliseResponse = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30: string | null;
};

export type DeleteAnaliseBody = {
  id_analise: string;
};

export type DeleteAnaliseResponse = {
  id_analise: string;
};

export type ListarAnalisesQueryRequest = {
  limit: number;
  offset: number;
};

export type ListarAnalisesResponse = {
  analises: analises[];
  total: number;
};
