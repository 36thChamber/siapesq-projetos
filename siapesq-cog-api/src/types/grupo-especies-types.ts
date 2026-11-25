import GrupoEspecies from "../models/GrupoEspecies";

export type GrupoEspecieResponse = {
  id_gruposespecies: string;
  nome: string;
  quantidade: number;
};

export type CriarGrupoEspecieBodyRequest = {
  nome: string;
  quantidade: number;
};

export type AtualizarGrupoEspecieBodyRequest = {
  nome?: string;
  quantidade?: number;
};

export type BuscarGrupoEspeciePorIdParamsRequest = {
  id_gruposespecies: string;
};

export type DeletarGrupoEspecieParamsRequest = {
  id_gruposespecies: string;
};

export type ListarGruposEspeciesQueryRequest = {
  limit?: number;
  offset?: number;
};

export type CriarGrupoEspecieResponse = GrupoEspecieResponse;
export type AtualizarGrupoEspecieResponse = GrupoEspecieResponse;
export type BuscarGrupoEspeciePorIdResponse = GrupoEspecieResponse;
export type DeletarGrupoEspecieResponse = GrupoEspecieResponse;

export type ListarGruposEspeciesResponse = {
  gruposEspecies: GrupoEspecieResponse[];
  total: number;
};

export function toGrupoEspecieResponse(
  grupoEspecie: GrupoEspecies
): GrupoEspecieResponse {
  return {
    id_gruposespecies: grupoEspecie.id_gruposespecies,
    nome: grupoEspecie.nome,
    quantidade: grupoEspecie.quantidade,
  };
}