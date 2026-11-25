import type Portos from "../models/Portos";

export type CriarPortoBodyRequest = {
  nome: string;
};

export type AtualizarPortoBodyRequest = {
  nome?: string;
  ativo?: boolean;
};

export type GetPortoParamsRequest = {
  id: number;
};

export type ListarPortosQueryRequest = {
  limit?: number;
  offset?: number;
};

export type PortoResponse = {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarPortoResponse = PortoResponse;

export type AtualizarPortoResponse = PortoResponse;

export type GetPortoResponse = PortoResponse;

export type DeletePortoResponse = PortoResponse;

export type ListarPortosResponse = {
  portos: PortoResponse[];
  total: number;
};

export function toPortoResponse(
  porto: Portos
): PortoResponse {
  return {
    id: porto.id,
    nome: porto.nome,
    ativo: porto.ativo,
    criado_em: porto.criado_em,
    atualizado_em: porto.atualizado_em ?? null,
    deletado_em: porto.deletado_em ?? null,
  };
}