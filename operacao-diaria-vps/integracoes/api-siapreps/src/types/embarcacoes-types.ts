import type Embarcacoes from "../models/Embarcacoes";

export type CriarEmbarcacaoBodyRequest = {
  nome: string;
  RGP: string;
  id_mestre: number;
  tamanho?: string | null;
  capacidade_estocagem?: number | null;
  velocidade_pesca?: number | null;
  velocidade_cruzeiro?: number | null;
  modalidade_pesca?: string | null;
  area_pesca?: string | null;
  imagem?: string | null;
};

export type AtualizarEmbarcacaoBodyRequest = {
  nome?: string;
  RGP?: string;
  id_mestre?: number;
  tamanho?: string | null;
  capacidade_estocagem?: number | null;
  velocidade_pesca?: number | null;
  velocidade_cruzeiro?: number | null;
  modalidade_pesca?: string | null;
  area_pesca?: string | null;
  imagem?: string | null;
  ativo?: boolean;
};

export type GetEmbarcacaoParamsRequest = {
  id: number;
};

export type ListarEmbarcacoesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type ListarEmbarcacoesPorMestreParamsRequest = {
  id_mestre: number;
};

export type EmbarcacaoResponse = {
  id: number;
  nome: string;
  RGP: string;
  id_mestre: number;
  tamanho: string | null;
  capacidade_estocagem: number | null;
  velocidade_pesca: number | null;
  velocidade_cruzeiro: number | null;
  modalidade_pesca: string | null;
  area_pesca: string | null;
  imagem: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarEmbarcacaoResponse = EmbarcacaoResponse;
export type AtualizarEmbarcacaoResponse = EmbarcacaoResponse;
export type GetEmbarcacaoResponse = EmbarcacaoResponse;
export type DeleteEmbarcacaoResponse = EmbarcacaoResponse;

export type ListarEmbarcacoesResponse = {
  embarcacoes: EmbarcacaoResponse[];
  total: number;
};

export function toEmbarcacaoResponse(
  embarcacao: Embarcacoes
): EmbarcacaoResponse {
  return {
    id: embarcacao.id,
    nome: embarcacao.nome,
    RGP: embarcacao.RGP,
    id_mestre: embarcacao.id_mestre,
    tamanho: embarcacao.tamanho,
    capacidade_estocagem: embarcacao.capacidade_estocagem,
    velocidade_pesca: embarcacao.velocidade_pesca,
    velocidade_cruzeiro: embarcacao.velocidade_cruzeiro,
    modalidade_pesca: embarcacao.modalidade_pesca,
    area_pesca: embarcacao.area_pesca,
    imagem: embarcacao.imagem,
    ativo: embarcacao.ativo,
    criado_em: embarcacao.criado_em,
    atualizado_em: embarcacao.atualizado_em,
    deletado_em: embarcacao.deletado_em,
  };
}