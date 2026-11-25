import type Alertas from "../models/Alertas";

export type TipoAlerta = "NDCI" | "TSI" | "ALGAS" | "MACROFITAS";

export type StatusAlerta = "novo" | "visualizado" | "resolvido" | "ignorado";

export type CriarAlertaBodyRequest = {
  id_usuario?: number | null;
  id_reservatorio: number;
  id_area_alerta: number;

  tipo: TipoAlerta;
  nivel?: string | null;

  titulo?: string | null;
  descricao?: string | null;

  data_analise: Date | string;
  data_alerta?: Date | string | null;

  percentual_principal?: number | null;
  total_pixels?: number | null;

  detalhes?: Record<string, unknown> | null;

  status?: StatusAlerta;
  visualizado?: boolean;
};

export type CriarAlertaBulkBodyRequest = {
  alertas: CriarAlertaBodyRequest[];
};

export type AtualizarAlertaBodyRequest = {
  id_usuario?: number | null;
  id_reservatorio?: number;
  id_area_alerta?: number;

  tipo?: TipoAlerta;
  nivel?: string | null;

  titulo?: string | null;
  descricao?: string | null;

  data_analise?: Date | string;
  data_alerta?: Date | string | null;

  percentual_principal?: number | null;
  total_pixels?: number | null;

  detalhes?: Record<string, unknown> | null;

  status?: StatusAlerta;
  visualizado?: boolean;
};

export type AtualizarStatusAlertaBodyRequest = {
  status: StatusAlerta;
};

export type AtualizarVisualizadoAlertaBodyRequest = {
  visualizado: boolean;
};

export type GetAlertaParamsRequest = {
  id: number;
};

export type ListarAlertasQueryRequest = {
  limit?: number;
  offset?: number;

  id_usuario?: number;
  id_reservatorio?: number;
  id_area_alerta?: number;

  tipo?: TipoAlerta;
  nivel?: string;
  status?: StatusAlerta;

  data_inicio?: string | Date;
  data_fim?: string | Date;
};

export type ListarAlertasPorReservatorioParamsRequest = {
  id_reservatorio: number;
};

export type ListarAlertasPorAreaParamsRequest = {
  id_area_alerta: number;
};

export type AlertaResponse = {
  id: number;

  id_usuario: number | null;
  id_reservatorio: number;
  id_area_alerta: number;

  tipo: string;
  nivel: string | null;

  titulo: string | null;
  descricao: string | null;

  data_analise: Date;
  data_alerta: Date | null;

  percentual_principal: number | null;
  total_pixels: number | null;

  detalhes: Record<string, unknown> | null;

  status: string;
  visualizado: boolean;

  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarAlertaResponse = AlertaResponse;

export type CriarAlertaBulkResponse = {
  alertas: AlertaResponse[];
  total: number;
};

export type AtualizarAlertaResponse = AlertaResponse;

export type AtualizarStatusAlertaResponse = AlertaResponse;

export type AtualizarVisualizadoAlertaResponse = AlertaResponse;

export type GetAlertaResponse = AlertaResponse;

export type DeleteAlertaResponse = AlertaResponse;

export type ListarAlertasResponse = {
  alertas: AlertaResponse[];
  total: number;
};

export function toAlertaResponse(alerta: Alertas): AlertaResponse {
  return {
    id: alerta.id,

    id_usuario: alerta.id_usuario,
    id_reservatorio: alerta.id_reservatorio,
    id_area_alerta: alerta.id_area_alerta,

    tipo: alerta.tipo,
    nivel: alerta.nivel,

    titulo: alerta.titulo,
    descricao: alerta.descricao,

    data_analise: alerta.data_analise,
    data_alerta: alerta.data_alerta,

    percentual_principal: alerta.percentual_principal
      ? Number(alerta.percentual_principal)
      : null,

    total_pixels: alerta.total_pixels,

    detalhes: alerta.detalhes,

    status: alerta.status,
    visualizado: alerta.visualizado,

    criado_em: alerta.criado_em,
    atualizado_em: alerta.atualizado_em,
    deletado_em: alerta.deletado_em,
  };
}