import Pagamentos from "../models/Pagamentos";

import { ProvedorPagamento } from "../models/enums/provedorPagamentoEnum";
import { StatusPagamento } from "../models/enums/statusPagamentosEnum";

export type UUID = string;


export type PagamentoResponse = {
  id_pagamento: UUID;

  id_usuario: UUID;
  id_assinatura: UUID | null;

  provedor_pagamento: ProvedorPagamento;

  id_pagamento_provedor: string;
  id_fatura_provedor: string | null;

  valor: number;
  moeda: string;

  status: StatusPagamento;

  url_fatura: string | null;

  data_pagamento: Date | null;

  criado_em: Date;
  atualizado_em: Date | null;
};



export type CriarPagamentoBodyRequest = {
  id_usuario: UUID;

  id_assinatura?: UUID | null;

  provedor_pagamento: ProvedorPagamento;

  id_pagamento_provedor: string;

  id_fatura_provedor?: string | null;

  valor: number;

  moeda?: string;

  status?: StatusPagamento;

  url_fatura?: string | null;

  data_pagamento?: Date | string | null;
};


export type ConfirmarPagamentoBodyRequest = {
  url_fatura?: string | null;

  id_fatura_provedor?: string | null;

  data_pagamento?: Date | string | null;
};


export type FalharPagamentoBodyRequest = {};

export type ReembolsarPagamentoBodyRequest = {};



export type BuscarPagamentoPorIdParamsRequest = {
  id_pagamento: UUID;
};


export type BuscarPagamentosPorUsuarioParamsRequest = {
  id_usuario: UUID;
};


export type BuscarPagamentosPorAssinaturaParamsRequest = {
  id_assinatura: UUID;
};


export type ListarPagamentosQueryRequest = {
  limit?: number;
  offset?: number;
};



export type CriarPagamentoResponse =
  PagamentoResponse;

export type ConfirmarPagamentoResponse =
  PagamentoResponse;

export type FalharPagamentoResponse =
  PagamentoResponse;

export type ReembolsarPagamentoResponse =
  PagamentoResponse;

export type BuscarPagamentoPorIdResponse =
  PagamentoResponse;



export type ListarPagamentosResponse = {
  pagamentos: PagamentoResponse[];

  total: number;
};


export type ErroPadraoResponse = {
  status: number;
  message: string;
};



export function toPagamentoResponse(
  pagamento: Pagamentos
): PagamentoResponse {

  return {
    id_pagamento: pagamento.id_pagamento,

    id_usuario: pagamento.id_usuario,

    id_assinatura:
      pagamento.id_assinatura ?? null,

    provedor_pagamento:
      pagamento.provedor_pagamento,

    id_pagamento_provedor:
      pagamento.id_pagamento_provedor,

    id_fatura_provedor:
      pagamento.id_fatura_provedor ?? null,

    valor:
      pagamento.valor,

    moeda:
      pagamento.moeda,

    status:
      pagamento.status,

    url_fatura:
      pagamento.url_fatura ?? null,

    data_pagamento:
      pagamento.data_pagamento ?? null,

    criado_em:
      pagamento.criado_em,

    atualizado_em:
      pagamento.atualizado_em ?? null,

  };

}