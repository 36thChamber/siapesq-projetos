import type OcorrenciasLance from "../models/OcorrenciasLance";
import { TipoOcorrenciaLance } from "../models/OcorrenciasLance";

export type OcorrenciaLanceBodyRequest = {
  id_lance?: number;
  id_especie: number;
  tipo_ocorrencia: TipoOcorrenciaLance;
  quantidade?: number | null;
  quantidade_vivos?: number | null;
  quantidade_mortos?: number | null;
  peso?: number | null;
  observacao?: string | null;
  client_record_id?: string;
};

export type CriarOcorrenciaLanceBodyRequest =
  OcorrenciaLanceBodyRequest;

export type AtualizarOcorrenciaLanceBodyRequest = Partial<
  Omit<OcorrenciaLanceBodyRequest, "id_lance" | "client_record_id">
>;

export type GetOcorrenciaLanceParamsRequest = {
  id: number;
  versaoEsperada?: number;
};

export type ListarOcorrenciasLanceParamsRequest = {
  id_lance: number;
};

export type ListarOcorrenciasLanceQueryRequest = {
  limit?: number;
  offset?: number;
  tipo_ocorrencia?: TipoOcorrenciaLance;
  updated_after?: string;
};

export type OcorrenciaLanceResponse = {
  id: number;
  id_lance: number;
  id_especie: number;
  tipo_ocorrencia: TipoOcorrenciaLance;
  quantidade: number | null;
  quantidade_vivos: number | null;
  quantidade_mortos: number | null;
  peso: number | null;
  observacao: string | null;
  ativo: boolean;
  client_record_id: string;
  versao: number;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarOcorrenciaLanceResponse =
  OcorrenciaLanceResponse;

export type AtualizarOcorrenciaLanceResponse =
  OcorrenciaLanceResponse;

export type GetOcorrenciaLanceResponse =
  OcorrenciaLanceResponse;

export type DeleteOcorrenciaLanceResponse =
  OcorrenciaLanceResponse;

export type ListarOcorrenciasLanceResponse = {
  ocorrencias: OcorrenciaLanceResponse[];
  total: number;
};

export function toOcorrenciaLanceResponse(
  ocorrencia: OcorrenciasLance
): OcorrenciaLanceResponse {
  return {
    id: ocorrencia.id,
    id_lance: ocorrencia.id_lance,
    id_especie: ocorrencia.id_especie,
    tipo_ocorrencia: ocorrencia.tipo_ocorrencia,
    quantidade: ocorrencia.quantidade ?? null,
    quantidade_vivos: ocorrencia.quantidade_vivos ?? null,
    quantidade_mortos: ocorrencia.quantidade_mortos ?? null,
    peso: ocorrencia.peso ?? null,
    observacao: ocorrencia.observacao ?? null,
    ativo: ocorrencia.ativo,
    client_record_id: ocorrencia.client_record_id,
    versao: ocorrencia.versao,
    criado_em: ocorrencia.criado_em,
    atualizado_em: ocorrencia.atualizado_em ?? null,
    deletado_em: ocorrencia.deletado_em ?? null,
  };
}