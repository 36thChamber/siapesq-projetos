import type Incidentes from "../models/Incidentes";
import { GrupoIncidente } from "../models/Incidentes";

export type CriarIncidenteBodyRequest = {
  id_lance: number;
  id_especie: number;
  grupo: GrupoIncidente;
  quantidade_vivos: number;
  quantidade_mortos: number;
  observacao?: string | null;
  client_record_id?: string;
};

export type AtualizarIncidenteBodyRequest = {
  grupo?: GrupoIncidente;
  quantidade_vivos?: number;
  quantidade_mortos?: number;
  observacao?: string | null;
};

export type GetIncidenteParamsRequest = { id: number };
export type ListarIncidentesPorMissaoParamsRequest = { id_missao: number };

export type IncidenteResponse = {
  id: number;
  id_missao: number;
  id_lance: number;
  id_especie: number;
  grupo: GrupoIncidente;
  quantidade_vivos: number;
  quantidade_mortos: number;
  observacao: string | null;
  client_record_id: string;
  versao: number;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarIncidenteResponse = IncidenteResponse;
export type AtualizarIncidenteResponse = IncidenteResponse;
export type GetIncidenteResponse = IncidenteResponse;
export function toIncidenteResponse(incidente: Incidentes): IncidenteResponse {
  return {
    id: incidente.id,
    id_missao: incidente.id_missao,
    id_lance: incidente.id_lance,
    id_especie: incidente.id_especie,
    grupo: incidente.grupo,
    quantidade_vivos: incidente.quantidade_vivos,
    quantidade_mortos: incidente.quantidade_mortos,
    observacao: incidente.observacao ?? null,
    client_record_id: incidente.client_record_id,
    versao: incidente.versao,
    criado_em: incidente.criado_em,
    atualizado_em: incidente.atualizado_em ?? null,
    deletado_em: incidente.deletado_em ?? null,
  };
}
