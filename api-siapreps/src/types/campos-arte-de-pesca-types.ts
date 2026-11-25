import CamposArteDePesca from "../models/CamposArteDePesca";

export type CriarCampoArteDePescaBodyRequest = {
  id_arte_pesca: number;
  nome: string;
  tipo?: string | null;
  obrigatorio?: boolean | null;
  ativo?: boolean;
};

export type AtualizarCampoArteDePescaBodyRequest = {
  id_arte_pesca?: number;
  nome?: string;
  tipo?: string | null;
  obrigatorio?: boolean | null;
  ativo?: boolean;
};

export type CampoArteDePescaResponse = {
  id: number;
  id_arte_pesca: number;
  nome: string;
  tipo: string | null;
  obrigatorio: boolean | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  deletado_em: Date | null;
};

export type CriarCampoArteDePescaResponse = CampoArteDePescaResponse;

export type AtualizarCampoArteDePescaResponse = CampoArteDePescaResponse;

export type GetCampoArteDePescaParamsRequest = {
  id: number;
};

export type ListarCamposArteDePescaQueryRequest = {
  limit: number;
  offset: number;
};

export type ListarCamposArteDePescaResponse = {
  campos: CampoArteDePescaResponse[];
  total: number;
};

export type BuscarCamposPorArteDePescaParamsRequest = {
  id_arte_pesca: number;
};

export type BuscarCamposPorArteDePescaResponse = {
  campos: CampoArteDePescaResponse[];
  total: number;
};

export function toCampoArteDePescaResponse(
  campo: CamposArteDePesca,
): CampoArteDePescaResponse {
  return {
    id: campo.id,
    id_arte_pesca: campo.id_arte_pesca,
    nome: campo.nome,
    tipo: campo.tipo ?? null,
    obrigatorio: campo.obrigatorio ?? null,
    ativo: campo.ativo,
    criado_em: campo.criado_em,
    atualizado_em: campo.atualizado_em,
    deletado_em: campo.deletado_em ?? null,
  };
}