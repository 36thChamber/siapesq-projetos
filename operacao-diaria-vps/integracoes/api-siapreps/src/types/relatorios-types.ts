import type Relatorios from "../models/Relatorios";

export type CriarRelatorioBodyRequest = {
  id_usuario: number;
  id_embarcacao: number;
  id_missao: number;
  uri: string;
  tipo?: string | null;
};

export type AtualizarRelatorioBodyRequest =
  Partial<CriarRelatorioBodyRequest>;

export type RelatorioIdParamsRequest = {
  id: number;
};

export type RelatorioRelacionamentoParamsRequest = {
  id_usuario?: number;
  id_embarcacao?: number;
  id_missao?: number;
};

export type ListarRelatoriosQueryRequest = {
  limit?: number;
  offset?: number;
};

/**
 * Identidade autorizada da requisição. Vem sempre de `req.auth` (JWT validado),
 * nunca de parâmetros ou body enviados pelo cliente.
 */
export type RelatorioActor = {
  id_usuario: number;
  administracao: boolean;
};

export type RelatorioResponse = {
  id: number;
  id_usuario: number;
  id_embarcacao: number;
  id_missao: number;
  uri: string;
  tipo: string | null;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
};

export type CriarRelatorioResponse = RelatorioResponse;

export type AtualizarRelatorioResponse = RelatorioResponse;

export type GetRelatorioResponse = RelatorioResponse;

export type DeleteRelatorioResponse = RelatorioResponse;

export type ListarRelatoriosResponse = {
  relatorios: RelatorioResponse[];
  total: number;
};

export function toRelatorioResponse(
  relatorio: Relatorios
): RelatorioResponse {
  return {
    id: relatorio.id,
    id_usuario: relatorio.id_usuario,
    id_embarcacao: relatorio.id_embarcacao,
    id_missao: relatorio.id_missao,
    uri: relatorio.uri,
    tipo: relatorio.tipo ?? null,
    criado_em: relatorio.criado_em,
    atualizado_em: relatorio.atualizado_em ?? null,
    deletado_em: relatorio.deletado_em ?? null,
  };
}
