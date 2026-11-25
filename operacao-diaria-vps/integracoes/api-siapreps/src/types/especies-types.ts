import type Especies from "../models/Especies";

export type CriarEspecieBodyRequest = {
  nome: string;
  imagem: string;
};

export type AtualizarEspecieBodyRequest = {
  nome?: string;
  imagem?: string;
  ativo?: boolean;
};

export type GetEspecieParamsRequest = {
  id: number;
};

export type ListarEspeciesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type EspecieResponse = {
  id: number;
  nome: string;
  imagem: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarEspecieResponse = EspecieResponse;

export type AtualizarEspecieResponse = EspecieResponse;

export type GetEspecieResponse = EspecieResponse;

export type DeleteEspecieResponse = EspecieResponse;

export type ListarEspeciesResponse = {
  especies: EspecieResponse[];
  total: number;
};

export function toEspecieResponse(
  especie: Especies
): EspecieResponse {
  return {
    id: especie.id,
    nome: especie.nome,
    imagem: especie.imagem,
    ativo: especie.ativo,
    criado_em: especie.criado_em,
    atualizado_em: especie.atualizado_em,
    deletado_em: especie.deletado_em ?? null,
  };
}