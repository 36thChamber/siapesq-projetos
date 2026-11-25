import type Iscas from "../models/Iscas";

export type CriarIscaBodyRequest = {
  nome: string;
};

export type AtualizarIscaBodyRequest = {
  nome?: string;
  ativo?: boolean;
};

export type GetIscaParamsRequest = {
  id: number;
};

export type ListarIscasQueryRequest = {
  limit?: number;
  offset?: number;
};

export type IscaResponse = {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarIscaResponse = IscaResponse;

export type AtualizarIscaResponse = IscaResponse;

export type GetIscaResponse = IscaResponse;

export type DeleteIscaResponse = IscaResponse;

export type ListarIscasResponse = {
  iscas: IscaResponse[];
  total: number;
};

export function toIscaResponse(
  isca: Iscas
): IscaResponse {
  return {
    id: isca.id,
    nome: isca.nome,
    ativo: isca.ativo,
    criado_em: isca.criado_em,
    atualizado_em: isca.atualizado_em ?? null,
    deletado_em: isca.deletado_em ?? null,
  };
}