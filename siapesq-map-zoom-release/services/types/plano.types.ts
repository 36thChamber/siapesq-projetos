// services/types/plano.types.ts

export type PeriodicidadePlano = 'mensal' | 'anual';

export interface PlanAPI {
  id_plano: string;
  nome: string;
  periodicidade: PeriodicidadePlano | string;
  especies_disponiveis: number;
  especies_ilimitadas: boolean;
  valor_mensal: number;
  valor_total: number;
  ativo: boolean;
  criado_em?: Date | string;
  atualizado_em?: Date | string;
  deletado_em?: Date | string | null;
}

export type Plano = PlanAPI;
export type GetPlanoResponse = PlanAPI;

export interface CriarPlanoPayload {
  nome: string;
  periodicidade: string;
  especies_disponiveis: number;
  especies_ilimitadas: boolean;
  valor_mensal: number;
  valor_total: number;
  ativo?: boolean;
}

export type CriarPlanoBody = CriarPlanoPayload;

export interface AtualizarPlanoPayload {
  nome?: string;
  periodicidade?: string;
  especies_disponiveis?: number;
  especies_ilimitadas?: boolean;
  valor_mensal?: number;
  valor_total?: number;
  ativo?: boolean;
}

export type UpdatePlanoBody = AtualizarPlanoPayload;

export interface PlanUI {
  id: string;
  name: string;
  price: string;
  periodicity: PeriodicidadePlano | string;
  features: string[];
  isRecommended?: boolean;
  isCurrent?: boolean;
}

export type ContainerAccess = {
  views: number;
  viewedIds: string[];
};

// Aqui o segredo: permite null ou undefined explicitamente
export type PlanoSpeciesLimit = {
  especies_ilimitadas?: boolean;
  especies_disponiveis?: number;
} | null | undefined;

export type SpeciesAccessResult = {
  isBlocked: boolean;
  shouldRegisterView: boolean;
};

/**
 * Avalia se a visualização de uma espécie deve ser bloqueada pelo limite do
 * plano do usuário, e se essa visualização deve ser contabilizada.
 */
export function evaluateSpeciesAccess(
  accessControl: AccessControl,
  plano: PlanoSpeciesLimit,
  specieId: string,
  tipoUsuario?: string | null,
): SpeciesAccessResult {
  // Usuário ADMIN tem acesso total e irrestrito (com ou sem plano),
  // nunca entra na regra Free e nunca consome cota local de visualizações.
  if (tipoUsuario?.toUpperCase() === 'ADMIN') {
    return { isBlocked: false, shouldRegisterView: false };
  }

  // Proteção extra: se accessControl não existir (bug de estado), não bloqueia imediatamente
  if (!accessControl || !accessControl.Species) {
      return { isBlocked: false, shouldRegisterView: false };
  }

  const isAlreadyViewed = accessControl.Species.viewedIds.includes(specieId);

  // Se já viu esta espécie, tá liberado e não gasta visualização nova
  if (isAlreadyViewed) {
    return { isBlocked: false, shouldRegisterView: false };
  }

  // Se o plano for null/undefined, significa que o usuário é FREE (404 na busca de assinaturas)
  // Usuários FREE têm limite padrão (ex: 3)
  if (!plano) {
      const DEFAULT_FREE_VIEWS = 3;
      const isBlocked = accessControl.Species.views >= DEFAULT_FREE_VIEWS;
      return { isBlocked, shouldRegisterView: !isBlocked };
  }

  // Daqui pra baixo, o usuário tem um plano pago válido
  const isUnlimited = Boolean(plano.especies_ilimitadas);
  if (isUnlimited) {
    return { isBlocked: false, shouldRegisterView: false };
  }

  const hasLimitDefined = plano.especies_disponiveis !== undefined && plano.especies_disponiveis !== null;
  if (!hasLimitDefined) {
    return { isBlocked: false, shouldRegisterView: false }; // Na dúvida, libera
  }

  const isBlocked = accessControl.Species.views >= (plano.especies_disponiveis as number);
  return { isBlocked, shouldRegisterView: !isBlocked };
}

export function isSpeciesAccessLimitError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 403;
}

export function getSpeciesAccessErrorMessage(error: unknown): string {
  if (isSpeciesAccessLimitError(error)) {
    return (
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ??
      "Você atingiu o limite de visualizações de espécies do seu plano. Atualize para ver mais."
    );
  }

  return "Não foi possível carregar os dados da espécie.";
}

export type AccessControl = Record<"Species" | "Categories", ContainerAccess>;

type ActionTypes =
  | "attSpecies"
  | "attCategories"
  | "resetSpecies"
  | "resetCategories";

export type AccessAction = {
  type: ActionTypes;
  id: string;
};

export const accessReducer = (
  state: AccessControl,
  action: AccessAction,
): AccessControl => {
  switch (action.type) {
    case "attSpecies": {
      // Proteção de estado
      if (!state || !state.Species) return state;
      
      const current = state.Species;
      const alreadySeen = current.viewedIds.includes(action.id);

      return {
        ...state,
        Species: {
          views: alreadySeen ? current.views : current.views + 1,
          viewedIds: alreadySeen
            ? current.viewedIds
            : [...current.viewedIds, action.id],
        },
      };
    }

    case "attCategories": {
       // Proteção de estado
      if (!state || !state.Categories) return state;

      const current = state.Categories;
      const alreadySeen = current.viewedIds.includes(action.id);

      return {
        ...state,
        Categories: {
          views: alreadySeen ? current.views : current.views + 1,
          viewedIds: alreadySeen
            ? current.viewedIds
            : [...current.viewedIds, action.id],
        },
      };
    }

    case "resetSpecies": {
      return {
        ...state,
        Species: { views: 0, viewedIds: [] },
      };
    }

    case "resetCategories": {
      return {
        ...state,
        Categories: { views: 0, viewedIds: [] },
      };
    }

    default:
      return { ...state };
  }
};