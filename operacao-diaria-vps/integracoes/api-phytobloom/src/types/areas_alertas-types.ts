import AreasAlertas from "../models/AreasAlertas";

export type PosicaoData = {
  latitude: string;
  longitude: string;
};

export type TipoAreaAlerta = "geral" | "automatica" | "customizada";

export type CriarAreaAlertaBodyRequest = {
  id_reservatorio: number;
  nome: string;
  descricao?: string | null;
  tipo?: TipoAreaAlerta | string | null;
  regiao_alerta: PosicaoData[] | Record<string, unknown>;
  prioridade?: number | null;
  ativa?: boolean;
  criada_automaticamente?: boolean;
};

export type AtualizarAreaAlertaBodyRequest = {
  id_reservatorio?: number;
  nome?: string;
  descricao?: string | null;
  tipo?: TipoAreaAlerta | string | null;
  regiao_alerta?: PosicaoData[] | Record<string, unknown>;
  prioridade?: number | null;
  ativa?: boolean;
  criada_automaticamente?: boolean;
};

export type GetAreaAlertaParamsRequest = {
  id: number;
  id_usuario: number; // Adicionado para controle de acesso
};

export type DeleteAreaAlertaParamsRequest = {
  id: number;
};

export type ListarAreasReservatorioQueryRequest = {
  limit?: number;
  offset?: number;
  id_reservatorio?: number;
  tipo?: string;
  ativa?: boolean;
  id_usuario: number; // Adicionado para controle de acesso (obrigatório)
};

export type AreaAlertaResponse = {
  id: number;
  id_reservatorio: number;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  regiao_alerta: PosicaoData[] | Record<string, unknown>;
  prioridade: number | null;
  ativa: boolean;
  criada_automaticamente: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarAreaAlertaResponse = AreaAlertaResponse;
export type AtualizarAreaAlertaResponse = AreaAlertaResponse;
export type GetAreaAlertaResponse = AreaAlertaResponse;
export type DeleteAreaAlertaResponse = AreaAlertaResponse;

export type ListarAreasReservatorioResponse = {
  areas_alertas: AreaAlertaResponse[];
  total: number;
};

export function toAreasAlertasResponse(
  area: AreasAlertas
): AreaAlertaResponse {
  return {
    id: area.id,
    id_reservatorio: area.id_reservatorio,
    nome: area.nome,
    descricao: area.descricao,
    tipo: area.tipo,
    regiao_alerta: area.regiao_alerta as PosicaoData[] | Record<string, unknown>,
    prioridade: area.prioridade,
    ativa: area.ativa,
    criada_automaticamente: area.criada_automaticamente,
    criado_em: area.criado_em,
    atualizado_em: area.atualizado_em,
    deletado_em: area.deletado_em,
  };
}