import type Lances from "../models/Lances";
import { LanceStatus } from "../models/enums/lance-status.enum";

// Criação: status é definido como 'em_andamento' no service
export type CriarLanceBodyRequest = {
  id_missao: number;
  numero_lance: number;
  recolhido_em?: Date | null; // não deve ser enviado na criação
  lancado_em_observado?: string;
  id_fundo?: number | null;
  id_isca?: number | null;
  latitude_lancamento: string;
  longitude_lancamento: string;
  latitude_recolhimento?: string | null;
  longitude_recolhimento?: string | null;
  dados_especificos?: object | null;
  ativo?: boolean;
  client_record_id?: string;
};

// Atualização: id_missao, lancado_em, status removidos
export type AtualizarLanceBodyRequest = {
  numero_lance?: number;
  recolhido_em?: Date | null; // só via comando recolher, não via PATCH
  id_fundo?: number | null;
  id_isca?: number | null;
  latitude_lancamento?: string;
  longitude_lancamento?: string;
  latitude_recolhimento?: string | null;
  longitude_recolhimento?: string | null;
  dados_especificos?: object | null;
  ativo?: boolean;
};

// Comando recolher
export type RecolherLanceRequest = Record<string, never>;

// Parâmetros
export type GetLanceParamsRequest = { id: number; versaoEsperada?: number };
export type ListarLancesQueryRequest = {
  limit?: number;
  offset?: number;
  updated_after?: string;
  /** Restringe a listagem aos lances de missões deste usuário. */
  id_usuario?: number;
};
export type ListarLancesPorMissaoParamsRequest = { id_missao: number };

// Resposta: inclui status
export type LanceResponse = {
  id: number;
  id_missao: number;
  numero_lance: number;
  lancado_em: Date;
  recolhido_em: Date | null;
  lancado_em_observado: Date | null;
  recolhido_em_observado: Date | null;
  id_fundo: number | null;
  id_isca: number | null;
  latitude_lancamento: string;
  longitude_lancamento: string;
  latitude_recolhimento: string | null;
  longitude_recolhimento: string | null;
  dados_especificos: object | null;
  status: LanceStatus; // novo
  ativo: boolean;
  client_record_id: string;
  versao: number;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarLanceResponse = LanceResponse;
export type AtualizarLanceResponse = LanceResponse;
export type GetLanceResponse = LanceResponse;
export type DeleteLanceResponse = LanceResponse;
export type RecolherLanceResponse = LanceResponse;

export type ListarLancesResponse = {
  lances: LanceResponse[];
  total: number;
};

export function toLanceResponse(lance: Lances): LanceResponse {
  return {
    id: lance.id,
    id_missao: lance.id_missao,
    numero_lance: lance.numero_lance,
    lancado_em: lance.lancado_em,
    recolhido_em: lance.recolhido_em ?? null,
    lancado_em_observado: lance.lancado_em_observado ?? null,
    recolhido_em_observado: lance.recolhido_em_observado ?? null,
    id_fundo: lance.id_fundo ?? null,
    id_isca: lance.id_isca ?? null,
    latitude_lancamento: lance.latitude_lancamento,
    longitude_lancamento: lance.longitude_lancamento,
    latitude_recolhimento: lance.latitude_recolhimento ?? null,
    longitude_recolhimento: lance.longitude_recolhimento ?? null,
    dados_especificos: lance.dados_especificos ?? null,
    status: lance.status as LanceStatus,
    ativo: lance.ativo,
    client_record_id: lance.client_record_id,
    versao: lance.versao,
    criado_em: lance.criado_em,
    atualizado_em: lance.atualizado_em ?? null,
    deletado_em: lance.deletado_em ?? null,
  };
}
