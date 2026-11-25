import type ArtesDePesca from "../models/ArtesDePesca";

export type CriarArteDePescaBodyRequest = {
  nome: string;
};

export type AtualizarArteDePescaBodyRequest = {
  nome?: string;
  ativo?: boolean;
};

export type GetArteDePescaParamsRequest = {
  id: number;
};

export type ListarArtesDePescaQueryRequest = {
  limit?: number;
  offset?: number;
};

export type ArteDePescaResponse = {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarArteDePescaResponse = ArteDePescaResponse;

export type AtualizarArteDePescaResponse = ArteDePescaResponse;

export type GetArteDePescaResponse = ArteDePescaResponse;

export type DeleteArteDePescaResponse = ArteDePescaResponse;

export type ListarArtesDePescaResponse = {
  artesDePesca: ArteDePescaResponse[];
  total: number;
};

export function toArteDePescaResponse(
  arteDePesca: ArtesDePesca
): ArteDePescaResponse {
  return {
    id: arteDePesca.id,
    nome: arteDePesca.nome,
    ativo: arteDePesca.ativo,
    criado_em: arteDePesca.criado_em,
    atualizado_em: arteDePesca.atualizado_em,
    deletado_em: arteDePesca.deletado_em,
  };
}