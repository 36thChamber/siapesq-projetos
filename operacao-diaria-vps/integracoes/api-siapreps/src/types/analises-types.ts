import type Analises from "../models/Analises";

export type CriarAnaliseBodyRequest = {
  nome_padrao: string;
  nome_cientifico: string;
};

export type AtualizarAnaliseBodyRequest = {
  nome_padrao?: string;
  nome_cientifico?: string;
};

export type GetAnaliseParamsRequest = {
  id: number;
};

export type ListarAnalisesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type AnaliseResponse = {
  id: number;
  nome_padrao: string;
  nome_cientifico: string;
};

export type CriarAnaliseResponse = AnaliseResponse;
export type AtualizarAnaliseResponse = AnaliseResponse;
export type GetAnaliseResponse = AnaliseResponse;
export type DeleteAnaliseResponse = AnaliseResponse;

export type ListarAnalisesResponse = {
  analises: AnaliseResponse[];
  total: number;
};

export function toAnaliseResponse(
  analise: Analises
): AnaliseResponse {
  return {
    id: analise.id,
    nome_padrao: analise.nome_padrao,
    nome_cientifico: analise.nome_cientifico,
  };
}