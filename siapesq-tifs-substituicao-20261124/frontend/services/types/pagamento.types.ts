// services/types/pagamento.types.ts

export type UUID = string;
export type ProvedorPagamento = string;
export type StatusPagamento = string;

export interface CriarPagamentoPayload {
  id_usuario: UUID;
  id_assinatura?: UUID | null;
  provedor_pagamento: ProvedorPagamento;
  id_pagamento_provedor?: string;
  id_fatura_provedor?: string | null;
  valor: number;
  moeda?: string;
  status?: StatusPagamento;
  url_fatura?: string | null;
  data_pagamento?: Date | string | null;
}

export type CriarPagamentoDTO = CriarPagamentoPayload;

export interface Pagamento extends CriarPagamentoPayload {
  id_pagamento: UUID;
}

export type GetPagamentoResponse = Pagamento;
