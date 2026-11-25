import { StatusAssinatura } from "../models/enums/statusAssinaturasEnum";
import Assinaturas from "../models/Assinaturas";

export type AssinaturaResponse = {
  id_assinatura: string;
  id_usuario: string;
  id_plano: string;

  status: StatusAssinatura;

  data_inicio: Date;
  data_fim: Date;

  renovacao_automatica: boolean;

  provedor_pagamento?: string;
  id_assinatura_externa?: string;

  criado_em?: Date;
  atualizado_em?: Date;

  plano?: {
    id_plano: string;
    nome: string;
    periodicidade: string;
    especies_disponiveis: number;
    especies_ilimitadas: boolean;
    valor_mensal: number;
    valor_total: number;
    ativo: boolean;
  } | null;
};

export type CriarAssinaturaBodyRequest = {
  id_usuario: string;
  id_plano: string;

  status: StatusAssinatura;

  data_inicio: Date;
  data_fim: Date;

  renovacao_automatica: boolean;

  provedor_pagamento?: string;
  id_assinatura_externa?: string;
};

export type AtualizarAssinaturaBodyRequest = {
  id_usuario?: string;
  id_plano?: string;

  status?: StatusAssinatura;

  data_inicio?: Date;
  data_fim?: Date;

  renovacao_automatica?: boolean;

  provedor_pagamento?: string;
  id_assinatura_externa?: string;
};

export type BuscarAssinaturaPorIdParamsRequest = {
  id_assinatura: string;
};

export type DeletarAssinaturaParamsRequest = {
  id_assinatura: string;
};

export type ListarAssinaturasQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarAssinaturaResponse = AssinaturaResponse;

export type AtualizarAssinaturaResponse = AssinaturaResponse;

export type BuscarAssinaturaPorIdResponse = AssinaturaResponse;

export type DeletarAssinaturaResponse = AssinaturaResponse;

export type ListarAssinaturasResponse = {
  assinaturas: AssinaturaResponse[];
  total: number;
};

export function toAssinaturaResponse(
  assinatura: Assinaturas
): AssinaturaResponse {
  return {
    id_assinatura: assinatura.id_assinatura,
    id_usuario: assinatura.id_usuario,
    id_plano: assinatura.id_plano,

    status: assinatura.status,

    data_inicio: assinatura.data_inicio,
    data_fim: assinatura.data_fim,

    renovacao_automatica: assinatura.renovacao_automatica,

    provedor_pagamento: assinatura.provedor_pagamento,
    id_assinatura_externa: assinatura.id_assinatura_externa,

    criado_em: assinatura.criado_em,
    atualizado_em: assinatura.atualizado_em,

    plano: assinatura.plano ?? null,
  };
}