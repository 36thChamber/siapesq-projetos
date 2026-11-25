import Analises from "../models/Analises";

export type AnaliseResponse = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_dataset: string | null;
  cenario: string | null;
  nome_arquivo: string;
  nome_arquivo_30: string | null;
};

export type CriarAnaliseBodyRequest = {
  id_especie: string;
  nome_pasta: string;
  nome_dataset?: string | null;
  cenario?: string | null;
  nome_arquivo: string;
  nome_arquivo_30?: string | null;
};

export type AtualizarAnaliseBodyRequest = {
  id_especie: string;
  nome_pasta: string;
  nome_dataset?: string | null;
  cenario?: string | null;
  nome_arquivo: string;
  nome_arquivo_30?: string | null;
};

export type BuscarAnalisePorIdParamsRequest = {
  id_analise: string;
};

export type DeletarAnaliseParamsRequest = {
  id_analise: string;
};

export type ListarAnalisesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarAnaliseResponse = AnaliseResponse;

export type AtualizarAnaliseResponse = AnaliseResponse;

export type BuscarAnalisePorIdResponse = AnaliseResponse;

export type DeletarAnaliseResponse = AnaliseResponse;

export type ListarAnalisesResponse = {
  analises: AnaliseResponse[];
  total: number;
};

export function toAnaliseResponse(analise: Analises): AnaliseResponse {
  return {
    id_analise: analise.id_analise,
    id_especie: analise.id_especie,
    nome_pasta: analise.nome_pasta,
    nome_dataset: analise.nome_dataset ?? null,
    cenario: analise.cenario ?? null,
    nome_arquivo: analise.nome_arquivo,
    nome_arquivo_30: analise.nome_arquivo_30 ?? null,
  };
}
