import type Fundos from "../models/Fundos";

export type CriarFundoBodyRequest = {
  nome: string;
};

export type AtualizarFundoBodyRequest = {
  nome?: string;
  ativo?: boolean;
};

export type GetFundoParamsRequest = {
  id: number;
};

export type ListarFundosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type FundoResponse = {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarFundoResponse = FundoResponse;

export type AtualizarFundoResponse = FundoResponse;

export type GetFundoResponse = FundoResponse;

export type DeleteFundoResponse = FundoResponse;

export type ListarFundosResponse = {
  fundos: FundoResponse[];
  total: number;
};

export function toFundoResponse(
  fundo: Fundos
): FundoResponse {
  return {
    id: fundo.id,
    nome: fundo.nome,
    ativo: fundo.ativo,
    criado_em: fundo.criado_em,
    atualizado_em: fundo.atualizado_em ?? null,
    deletado_em: fundo.deletado_em ?? null,
  };
}