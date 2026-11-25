import type Reservatorios from "../models/Reservatorios";
import {
  AreaAlertaResponse,
  toAreasAlertasResponse,
} from "./areas_alertas-types";

export type PosicaoData = {
  latitude: string;
  longitude: string;
};

export type CriarReservatorioBodyRequest = {
  id_usuario: number;
  nome: string;
  prioridade?: number | null;
  favorito?: boolean;
  posicoes?: PosicaoData[] | null;
};

export type AtualizarReservatorioBodyRequest = {
  id_usuario?: number;
  nome?: string;
  prioridade?: number | null;
  favorito?: boolean;
  posicoes?: PosicaoData[] | null;
};

export type AtualizarPrioridadeReservatorioBodyRequest = {
  prioridade: number;
};

export type AtualizarFavoritoReservatorioBodyRequest = {
  favorito: boolean;
};

export type GetReservatorioParamsRequest = {
  id: number;
};

export type DeleteReservatorioParamsRequest = {
  id: number;
};

export type ListarReservatoriosPorUsuarioQueryRequest =
  ListarReservatoriosQueryRequest & {
    id_usuario: number;
  };

export type ListarReservatoriosQueryRequest = {
  limit?: number;
  offset?: number;
  id_usuario?: number;
  favorito?: boolean;
};

export type ReservatorioResponse = {
  id: number;
  id_usuario: number;
  nome: string;
  prioridade: number | null;
  favorito: boolean;
  posicoes: PosicaoData[] | null;
  areas_alertas: AreaAlertaResponse[];
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarReservatorioResponse = ReservatorioResponse;
export type AtualizarReservatorioResponse = ReservatorioResponse;
export type AtualizarPrioridadeReservatorioResponse = ReservatorioResponse;
export type AtualizarFavoritoReservatorioResponse = ReservatorioResponse;
export type GetReservatorioResponse = ReservatorioResponse;

export type DeleteReservatorioResponse = {
  message: string;
};

export type ListarReservatoriosResponse = {
  reservatorios: ReservatorioResponse[];
  total: number;
};

export function toReservatorioResponse(
  reservatorio: Reservatorios
): ReservatorioResponse {
  return {
    id: reservatorio.id,
    id_usuario: reservatorio.id_usuario,
    nome: reservatorio.nome,
    prioridade: reservatorio.prioridade,
    favorito: reservatorio.favorito,
    posicoes: reservatorio.posicoes,
    areas_alertas: (reservatorio.areas ?? []).map(toAreasAlertasResponse),
    criado_em: reservatorio.criado_em,
    atualizado_em: reservatorio.atualizado_em,
    deletado_em: reservatorio.deletado_em,
  };
}
