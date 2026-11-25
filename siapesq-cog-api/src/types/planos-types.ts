import Planos from "../models/Planos";

export type PlanoResponse = {
  id_plano: string;

  nome: string;
  periodicidade: string;

  especies_disponiveis: number;
  especies_ilimitadas: boolean;

  valor_mensal: number;
  valor_total: number;

  ativo: boolean;

  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};


export type CriarPlanoBodyRequest = {
  nome: string;

  periodicidade: string;

  especies_disponiveis: number;
  especies_ilimitadas: boolean;

  valor_mensal: number;
  valor_total: number;

  ativo?: boolean;
};


export type AtualizarPlanoBodyRequest = {
  nome?: string;

  periodicidade?: string;

  especies_disponiveis?: number;
  especies_ilimitadas?: boolean;

  valor_mensal?: number;
  valor_total?: number;

  ativo?: boolean;
};



export type BuscarPlanoPorIdParamsRequest = {
  id_plano: string;
};


export type DeletarPlanoParamsRequest = {
  id_plano: string;
};



export type ListarPlanosQueryRequest = {
  limit?: number;
  offset?: number;
};



export type CriarPlanoResponse =
  PlanoResponse;


export type AtualizarPlanoResponse =
  PlanoResponse;


export type BuscarPlanoPorIdResponse =
  PlanoResponse;


export type DeletarPlanoResponse =
  PlanoResponse;



export type ListarPlanosResponse = {
  planos: PlanoResponse[];

  total: number;
};



export function toPlanoResponse(
  plano: Planos
): PlanoResponse {

  return {

    id_plano:
      plano.id_plano,

    nome:
      plano.nome,

    periodicidade:
      plano.periodicidade,

    especies_disponiveis:
      plano.especies_disponiveis,

    especies_ilimitadas:
      plano.especies_ilimitadas,

    valor_mensal:
      plano.valor_mensal,

    valor_total:
      plano.valor_total,

    ativo:
      plano.ativo,

    criado_em:
      plano.criado_em,

    atualizado_em:
      plano.atualizado_em ?? null,

    deletado_em:
      plano.deletado_em ?? null,
  };

}