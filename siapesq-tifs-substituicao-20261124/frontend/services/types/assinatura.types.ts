// services/types/assinatura.types.ts

import { Plano } from '@/services/types/plano.types';

export type UserSubscriptionStatus =
  | 'ativa'
  | 'inativa'
  | 'trial'
  | 'cancelada'
  | 'expirada';

export type StatusAssinatura = UserSubscriptionStatus | string;

export interface CriarAssinaturaPayload {
  id_usuario: string;
  id_plano: string;
  status: StatusAssinatura;
  data_inicio: Date | string;
  data_fim: Date | string;
  renovacao_automatica: boolean;
  provedor_pagamento?: string;
  id_assinatura_externa?: string;
}

export type CriarAssinaturaBody = CriarAssinaturaPayload;

export interface AtualizarAssinaturaPayload {
  id_usuario?: string;
  id_plano?: string;
  status?: StatusAssinatura;
  data_inicio?: Date | string;
  data_fim?: Date | string;
  renovacao_automatica?: boolean;
  provedor_pagamento?: string;
  id_assinatura_externa?: string;
}

export type UpdateAssinaturaBody = AtualizarAssinaturaPayload;

export interface Assinatura {
  id_assinatura: string;
  id_usuario: string;
  id_plano: string;
  status: StatusAssinatura;
  data_inicio: Date | string;
  data_fim: Date | string;
  renovacao_automatica: boolean;
  provedor_pagamento?: string;
  id_assinatura_externa?: string;
  criado_em?: Date | string;
  atualizado_em?: Date | string;
  plano?: Plano | null;
}

export type GetAssinaturaResponse = Assinatura;
export type AssinaturaAPI = Assinatura;

export interface UserSubscription {
  planName: string;
  status: UserSubscriptionStatus;
  expiresAt?: string | null;
  price?: string | number;
}
